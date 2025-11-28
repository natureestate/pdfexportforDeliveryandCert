/**
 * Menu Settings Service
 * บริการจัดการการตั้งค่าเมนูของบริษัท
 * - Admin สามารถกำหนดเมนูที่แสดง/ซ่อน และลำดับได้
 * - แยกการตั้งค่าตาม role (admin/member)
 * - รองรับการตั้งค่ารายบุคคล (per-user)
 */

import { db, auth } from '../firebase.config';
import {
    collection,
    doc,
    getDoc,
    setDoc,
    getDocs,
    deleteDoc,
    query,
    where,
    Timestamp,
} from 'firebase/firestore';
import { 
    CompanyMenuSettings, 
    RoleMenuSettings, 
    MenuItemConfig, 
    DEFAULT_MENU_CONFIG,
    UserRole,
    MenuDocType,
    UserMenuSettings,
    MemberWithMenuSettings,
    CompanyMember
} from '../types';
import { checkIsAdmin, getCompanyMembers } from './companyMembers';

// Collection names
const MENU_SETTINGS_COLLECTION = 'menuSettings';
const USER_MENU_SETTINGS_COLLECTION = 'userMenuSettings';

/**
 * ดึงการตั้งค่าเมนูของบริษัท
 * @param companyId - ID ของบริษัท
 * @returns CompanyMenuSettings หรือ null ถ้ายังไม่มีการตั้งค่า
 */
export const getMenuSettings = async (companyId: string): Promise<CompanyMenuSettings | null> => {
    try {
        const docRef = doc(db, MENU_SETTINGS_COLLECTION, companyId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            console.log('ℹ️ ยังไม่มีการตั้งค่าเมนูสำหรับบริษัทนี้, ใช้ค่า default');
            return null;
        }

        const data = docSnap.data();
        return {
            id: docSnap.id,
            companyId: data.companyId,
            settings: data.settings,
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate(),
            updatedBy: data.updatedBy,
        };
    } catch (error) {
        console.error('❌ ดึงการตั้งค่าเมนูล้มเหลว:', error);
        return null;
    }
};

/**
 * ดึงการตั้งค่าเมนูสำหรับ role ที่กำหนด
 * @param companyId - ID ของบริษัท
 * @param role - บทบาทของ user (admin หรือ member)
 * @returns Array ของ MenuItemConfig ที่จัดเรียงแล้ว
 */
export const getMenusForRole = async (
    companyId: string, 
    role: UserRole
): Promise<MenuItemConfig[]> => {
    try {
        const settings = await getMenuSettings(companyId);
        
        if (!settings) {
            // ใช้ค่า default ถ้ายังไม่มีการตั้งค่า
            return [...DEFAULT_MENU_CONFIG];
        }

        // หาการตั้งค่าสำหรับ role นี้
        const roleSettings = settings.settings.find(s => s.role === role);
        
        if (!roleSettings) {
            // ถ้าไม่มีการตั้งค่าสำหรับ role นี้ ใช้ค่า default
            return [...DEFAULT_MENU_CONFIG];
        }

        // จัดเรียงตาม order และ filter เฉพาะที่ visible
        return roleSettings.menus
            .filter(menu => menu.visible)
            .sort((a, b) => a.order - b.order);
    } catch (error) {
        console.error('❌ ดึงเมนูสำหรับ role ล้มเหลว:', error);
        return [...DEFAULT_MENU_CONFIG];
    }
};

/**
 * ดึงการตั้งค่าเมนูทั้งหมดสำหรับ role (รวมที่ซ่อนด้วย)
 * ใช้สำหรับหน้าตั้งค่า
 * @param companyId - ID ของบริษัท
 * @param role - บทบาทของ user
 * @returns Array ของ MenuItemConfig ทั้งหมด
 */
export const getAllMenusForRole = async (
    companyId: string, 
    role: UserRole
): Promise<MenuItemConfig[]> => {
    try {
        const settings = await getMenuSettings(companyId);
        
        if (!settings) {
            return [...DEFAULT_MENU_CONFIG];
        }

        const roleSettings = settings.settings.find(s => s.role === role);
        
        if (!roleSettings) {
            return [...DEFAULT_MENU_CONFIG];
        }

        // จัดเรียงตาม order แต่ไม่ filter visible
        return roleSettings.menus.sort((a, b) => a.order - b.order);
    } catch (error) {
        console.error('❌ ดึงเมนูทั้งหมดสำหรับ role ล้มเหลว:', error);
        return [...DEFAULT_MENU_CONFIG];
    }
};

/**
 * บันทึกการตั้งค่าเมนูสำหรับ role
 * เฉพาะ Admin เท่านั้นที่สามารถตั้งค่าได้
 * @param companyId - ID ของบริษัท
 * @param role - บทบาทที่จะตั้งค่า
 * @param menus - รายการเมนูพร้อมการตั้งค่า
 */
export const saveMenuSettingsForRole = async (
    companyId: string,
    role: UserRole,
    menus: MenuItemConfig[]
): Promise<void> => {
    try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error('กรุณา Login ก่อนตั้งค่าเมนู');
        }

        // ตรวจสอบว่าเป็น Admin หรือไม่
        const isAdmin = await checkIsAdmin(companyId, currentUser.uid);
        if (!isAdmin) {
            throw new Error('เฉพาะ Admin เท่านั้นที่สามารถตั้งค่าเมนูได้');
        }

        // ดึงการตั้งค่าเดิม
        const existingSettings = await getMenuSettings(companyId);

        // เตรียมข้อมูลการตั้งค่าใหม่
        const newRoleSettings: RoleMenuSettings = {
            role,
            menus,
        };

        let updatedSettings: RoleMenuSettings[];

        if (existingSettings) {
            // อัปเดตการตั้งค่าสำหรับ role นี้
            const otherRoleSettings = existingSettings.settings.filter(s => s.role !== role);
            updatedSettings = [...otherRoleSettings, newRoleSettings];
        } else {
            // สร้างใหม่
            updatedSettings = [newRoleSettings];
        }

        // บันทึกลง Firestore
        const docRef = doc(db, MENU_SETTINGS_COLLECTION, companyId);
        await setDoc(docRef, {
            companyId,
            settings: updatedSettings,
            createdAt: existingSettings?.createdAt ? Timestamp.fromDate(existingSettings.createdAt) : Timestamp.now(),
            updatedAt: Timestamp.now(),
            updatedBy: currentUser.uid,
        });

        console.log('✅ บันทึกการตั้งค่าเมนูสำเร็จ:', companyId, 'role:', role);
    } catch (error) {
        console.error('❌ บันทึกการตั้งค่าเมนูล้มเหลว:', error);
        throw error;
    }
};

/**
 * รีเซ็ตการตั้งค่าเมนูกลับเป็นค่า default
 * @param companyId - ID ของบริษัท
 * @param role - บทบาทที่จะรีเซ็ต (optional, ถ้าไม่ระบุจะรีเซ็ตทั้งหมด)
 */
export const resetMenuSettings = async (
    companyId: string,
    role?: UserRole
): Promise<void> => {
    try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error('กรุณา Login ก่อนรีเซ็ตการตั้งค่า');
        }

        // ตรวจสอบว่าเป็น Admin หรือไม่
        const isAdmin = await checkIsAdmin(companyId, currentUser.uid);
        if (!isAdmin) {
            throw new Error('เฉพาะ Admin เท่านั้นที่สามารถรีเซ็ตการตั้งค่าได้');
        }

        if (role) {
            // รีเซ็ตเฉพาะ role ที่กำหนด
            await saveMenuSettingsForRole(companyId, role, [...DEFAULT_MENU_CONFIG]);
        } else {
            // รีเซ็ตทั้งหมด - ลบ document
            const docRef = doc(db, MENU_SETTINGS_COLLECTION, companyId);
            await setDoc(docRef, {
                companyId,
                settings: [
                    { role: 'admin' as UserRole, menus: [...DEFAULT_MENU_CONFIG] },
                    { role: 'member' as UserRole, menus: [...DEFAULT_MENU_CONFIG] },
                ],
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
                updatedBy: currentUser.uid,
            });
        }

        console.log('✅ รีเซ็ตการตั้งค่าเมนูสำเร็จ:', companyId);
    } catch (error) {
        console.error('❌ รีเซ็ตการตั้งค่าเมนูล้มเหลว:', error);
        throw error;
    }
};

/**
 * สลับการแสดง/ซ่อนเมนู
 * @param companyId - ID ของบริษัท
 * @param role - บทบาท
 * @param menuId - ID ของเมนู
 */
export const toggleMenuVisibility = async (
    companyId: string,
    role: UserRole,
    menuId: MenuDocType
): Promise<void> => {
    try {
        const menus = await getAllMenusForRole(companyId, role);
        const updatedMenus = menus.map(menu => 
            menu.id === menuId 
                ? { ...menu, visible: !menu.visible }
                : menu
        );
        
        await saveMenuSettingsForRole(companyId, role, updatedMenus);
        console.log('✅ สลับการแสดงเมนูสำเร็จ:', menuId);
    } catch (error) {
        console.error('❌ สลับการแสดงเมนูล้มเหลว:', error);
        throw error;
    }
};

/**
 * เปลี่ยนลำดับเมนู (ย้ายขึ้น/ลง)
 * @param companyId - ID ของบริษัท
 * @param role - บทบาท
 * @param menuId - ID ของเมนูที่จะย้าย
 * @param direction - ทิศทาง ('up' หรือ 'down')
 */
export const moveMenu = async (
    companyId: string,
    role: UserRole,
    menuId: MenuDocType,
    direction: 'up' | 'down'
): Promise<void> => {
    try {
        const menus = await getAllMenusForRole(companyId, role);
        const currentIndex = menus.findIndex(m => m.id === menuId);
        
        if (currentIndex === -1) {
            throw new Error('ไม่พบเมนูที่ต้องการย้าย');
        }

        const newIndex = direction === 'up' 
            ? Math.max(0, currentIndex - 1)
            : Math.min(menus.length - 1, currentIndex + 1);

        if (currentIndex === newIndex) {
            // ไม่มีการเปลี่ยนแปลง
            return;
        }

        // สลับตำแหน่ง
        const [movedMenu] = menus.splice(currentIndex, 1);
        menus.splice(newIndex, 0, movedMenu);

        // อัปเดต order
        const updatedMenus = menus.map((menu, index) => ({
            ...menu,
            order: index,
        }));

        await saveMenuSettingsForRole(companyId, role, updatedMenus);
        console.log('✅ ย้ายเมนูสำเร็จ:', menuId, direction);
    } catch (error) {
        console.error('❌ ย้ายเมนูล้มเหลว:', error);
        throw error;
    }
};

/**
 * จัดเรียงเมนูใหม่ทั้งหมด (Drag & Drop)
 * @param companyId - ID ของบริษัท
 * @param role - บทบาท
 * @param orderedMenuIds - Array ของ menuId ตามลำดับใหม่
 */
export const reorderMenus = async (
    companyId: string,
    role: UserRole,
    orderedMenuIds: MenuDocType[]
): Promise<void> => {
    try {
        const menus = await getAllMenusForRole(companyId, role);
        
        // สร้าง map สำหรับ lookup
        const menuMap = new Map(menus.map(m => [m.id, m]));
        
        // จัดเรียงใหม่ตาม orderedMenuIds
        const reorderedMenus: MenuItemConfig[] = [];
        let order = 0;
        
        for (const menuId of orderedMenuIds) {
            const menu = menuMap.get(menuId);
            if (menu) {
                reorderedMenus.push({ ...menu, order });
                menuMap.delete(menuId);
                order++;
            }
        }
        
        // เพิ่มเมนูที่ไม่อยู่ใน orderedMenuIds (ถ้ามี)
        for (const [, menu] of menuMap) {
            reorderedMenus.push({ ...menu, order });
            order++;
        }

        await saveMenuSettingsForRole(companyId, role, reorderedMenus);
        console.log('✅ จัดเรียงเมนูใหม่สำเร็จ');
    } catch (error) {
        console.error('❌ จัดเรียงเมนูใหม่ล้มเหลว:', error);
        throw error;
    }
};

/**
 * คัดลอกการตั้งค่าเมนูจาก role หนึ่งไปยังอีก role หนึ่ง
 * @param companyId - ID ของบริษัท
 * @param fromRole - role ต้นทาง
 * @param toRole - role ปลายทาง
 */
export const copyMenuSettings = async (
    companyId: string,
    fromRole: UserRole,
    toRole: UserRole
): Promise<void> => {
    try {
        const sourceMenus = await getAllMenusForRole(companyId, fromRole);
        await saveMenuSettingsForRole(companyId, toRole, sourceMenus);
        console.log('✅ คัดลอกการตั้งค่าเมนูสำเร็จ:', fromRole, '→', toRole);
    } catch (error) {
        console.error('❌ คัดลอกการตั้งค่าเมนูล้มเหลว:', error);
        throw error;
    }
};

// ============================================================
// User-specific Menu Settings (การตั้งค่าเมนูรายบุคคล)
// ============================================================

/**
 * สร้าง Document ID สำหรับ User Menu Settings
 * @param companyId - ID ของบริษัท
 * @param userId - User ID
 * @returns Document ID format: {companyId}_{userId}
 */
const getUserMenuSettingsDocId = (companyId: string, userId: string): string => {
    return `${companyId}_${userId}`;
};

/**
 * ดึงการตั้งค่าเมนูเฉพาะ user
 * @param companyId - ID ของบริษัท
 * @param userId - User ID
 * @returns UserMenuSettings หรือ null ถ้าไม่มีการตั้งค่าเฉพาะ
 */
export const getUserMenuSettings = async (
    companyId: string,
    userId: string
): Promise<UserMenuSettings | null> => {
    try {
        const docId = getUserMenuSettingsDocId(companyId, userId);
        const docRef = doc(db, USER_MENU_SETTINGS_COLLECTION, docId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            return null;
        }

        const data = docSnap.data();
        return {
            id: docSnap.id,
            companyId: data.companyId,
            userId: data.userId,
            userEmail: data.userEmail,
            userDisplayName: data.userDisplayName,
            useCustomSettings: data.useCustomSettings,
            menus: data.menus || [],
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate(),
            updatedBy: data.updatedBy,
        };
    } catch (error) {
        console.error('❌ ดึงการตั้งค่าเมนูของ user ล้มเหลว:', error);
        return null;
    }
};

/**
 * ดึงเมนูสำหรับ user (รวม user-specific settings)
 * ลำดับความสำคัญ: User-specific > Role-based > Default
 * @param companyId - ID ของบริษัท
 * @param userId - User ID
 * @param role - บทบาทของ user
 * @returns Array ของ MenuItemConfig ที่แสดง
 */
export const getMenusForUser = async (
    companyId: string,
    userId: string,
    role: UserRole
): Promise<MenuItemConfig[]> => {
    try {
        // 1. ตรวจสอบว่ามีการตั้งค่าเฉพาะ user หรือไม่
        const userSettings = await getUserMenuSettings(companyId, userId);
        
        if (userSettings && userSettings.useCustomSettings && userSettings.menus.length > 0) {
            // ใช้การตั้งค่าเฉพาะ user
            console.log('📋 [MenuSettings] ใช้การตั้งค่าเฉพาะ user:', userId);
            return userSettings.menus
                .filter(menu => menu.visible)
                .sort((a, b) => a.order - b.order);
        }

        // 2. ถ้าไม่มีการตั้งค่าเฉพาะ user ใช้ค่าจาก role
        console.log('📋 [MenuSettings] ใช้การตั้งค่าจาก role:', role);
        return await getMenusForRole(companyId, role);
    } catch (error) {
        console.error('❌ ดึงเมนูสำหรับ user ล้มเหลว:', error);
        return [...DEFAULT_MENU_CONFIG];
    }
};

/**
 * ดึงเมนูทั้งหมดสำหรับ user (รวมที่ซ่อน) - สำหรับหน้าตั้งค่า
 * @param companyId - ID ของบริษัท
 * @param userId - User ID
 * @param role - บทบาทของ user
 * @returns Array ของ MenuItemConfig ทั้งหมด
 */
export const getAllMenusForUser = async (
    companyId: string,
    userId: string,
    role: UserRole
): Promise<MenuItemConfig[]> => {
    try {
        const userSettings = await getUserMenuSettings(companyId, userId);
        
        if (userSettings && userSettings.useCustomSettings && userSettings.menus.length > 0) {
            return userSettings.menus.sort((a, b) => a.order - b.order);
        }

        return await getAllMenusForRole(companyId, role);
    } catch (error) {
        console.error('❌ ดึงเมนูทั้งหมดสำหรับ user ล้มเหลว:', error);
        return [...DEFAULT_MENU_CONFIG];
    }
};

/**
 * บันทึกการตั้งค่าเมนูสำหรับ user เฉพาะ
 * เฉพาะ Admin เท่านั้นที่สามารถตั้งค่าได้
 * @param companyId - ID ของบริษัท
 * @param targetUserId - User ID ที่จะตั้งค่า
 * @param menus - รายการเมนูพร้อมการตั้งค่า
 * @param userEmail - Email ของ user (สำหรับแสดงผล)
 * @param userDisplayName - ชื่อของ user (สำหรับแสดงผล)
 */
export const saveUserMenuSettings = async (
    companyId: string,
    targetUserId: string,
    menus: MenuItemConfig[],
    userEmail?: string,
    userDisplayName?: string
): Promise<void> => {
    try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error('กรุณา Login ก่อนตั้งค่าเมนู');
        }

        // ตรวจสอบว่าเป็น Admin หรือไม่
        const isAdmin = await checkIsAdmin(companyId, currentUser.uid);
        if (!isAdmin) {
            throw new Error('เฉพาะ Admin เท่านั้นที่สามารถตั้งค่าเมนูของ user ได้');
        }

        const docId = getUserMenuSettingsDocId(companyId, targetUserId);
        const docRef = doc(db, USER_MENU_SETTINGS_COLLECTION, docId);
        
        // ดึงข้อมูลเดิม (ถ้ามี)
        const existingDoc = await getDoc(docRef);
        const existingData = existingDoc.exists() ? existingDoc.data() : null;

        await setDoc(docRef, {
            companyId,
            userId: targetUserId,
            userEmail: userEmail || existingData?.userEmail || '',
            userDisplayName: userDisplayName || existingData?.userDisplayName || '',
            useCustomSettings: true,
            menus,
            createdAt: existingData?.createdAt || Timestamp.now(),
            updatedAt: Timestamp.now(),
            updatedBy: currentUser.uid,
        });

        console.log('✅ บันทึกการตั้งค่าเมนูของ user สำเร็จ:', targetUserId);
    } catch (error) {
        console.error('❌ บันทึกการตั้งค่าเมนูของ user ล้มเหลว:', error);
        throw error;
    }
};

/**
 * ลบการตั้งค่าเมนูเฉพาะ user (กลับไปใช้ค่าจาก role)
 * @param companyId - ID ของบริษัท
 * @param targetUserId - User ID ที่จะลบการตั้งค่า
 */
export const removeUserMenuSettings = async (
    companyId: string,
    targetUserId: string
): Promise<void> => {
    try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error('กรุณา Login ก่อนลบการตั้งค่า');
        }

        // ตรวจสอบว่าเป็น Admin หรือไม่
        const isAdmin = await checkIsAdmin(companyId, currentUser.uid);
        if (!isAdmin) {
            throw new Error('เฉพาะ Admin เท่านั้นที่สามารถลบการตั้งค่าเมนูของ user ได้');
        }

        const docId = getUserMenuSettingsDocId(companyId, targetUserId);
        const docRef = doc(db, USER_MENU_SETTINGS_COLLECTION, docId);
        
        await deleteDoc(docRef);

        console.log('✅ ลบการตั้งค่าเมนูของ user สำเร็จ:', targetUserId);
    } catch (error) {
        console.error('❌ ลบการตั้งค่าเมนูของ user ล้มเหลว:', error);
        throw error;
    }
};

/**
 * ดึงรายการสมาชิกทั้งหมดพร้อมสถานะการตั้งค่าเมนู
 * @param companyId - ID ของบริษัท
 * @returns Array ของ MemberWithMenuSettings
 */
export const getMembersWithMenuSettings = async (
    companyId: string
): Promise<MemberWithMenuSettings[]> => {
    try {
        // ดึงรายการสมาชิกทั้งหมด
        const members = await getCompanyMembers(companyId);
        
        // ดึงการตั้งค่าเมนูของทุก user ในบริษัท
        const q = query(
            collection(db, USER_MENU_SETTINGS_COLLECTION),
            where('companyId', '==', companyId)
        );
        const querySnapshot = await getDocs(q);
        
        // สร้าง map ของ user settings
        const userSettingsMap = new Map<string, UserMenuSettings>();
        querySnapshot.docs.forEach(doc => {
            const data = doc.data();
            userSettingsMap.set(data.userId, {
                id: doc.id,
                companyId: data.companyId,
                userId: data.userId,
                userEmail: data.userEmail,
                userDisplayName: data.userDisplayName,
                useCustomSettings: data.useCustomSettings,
                menus: data.menus || [],
                createdAt: data.createdAt?.toDate(),
                updatedAt: data.updatedAt?.toDate(),
                updatedBy: data.updatedBy,
            });
        });

        // รวมข้อมูลสมาชิกกับการตั้งค่าเมนู
        const result: MemberWithMenuSettings[] = members.map(member => {
            const userSettings = userSettingsMap.get(member.userId);
            return {
                memberId: member.id || '',
                userId: member.userId,
                email: member.email,
                displayName: member.displayName,
                role: member.role,
                status: member.status,
                hasCustomMenuSettings: !!userSettings?.useCustomSettings,
                menuSettings: userSettings,
            };
        });

        console.log('📋 ดึงสมาชิกพร้อมการตั้งค่าเมนูสำเร็จ:', result.length, 'คน');
        return result;
    } catch (error) {
        console.error('❌ ดึงสมาชิกพร้อมการตั้งค่าเมนูล้มเหลว:', error);
        return [];
    }
};

/**
 * คัดลอกการตั้งค่าเมนูจาก role ไปยัง user
 * @param companyId - ID ของบริษัท
 * @param role - role ต้นทาง
 * @param targetUserId - User ID ปลายทาง
 * @param userEmail - Email ของ user
 * @param userDisplayName - ชื่อของ user
 */
export const copyRoleSettingsToUser = async (
    companyId: string,
    role: UserRole,
    targetUserId: string,
    userEmail?: string,
    userDisplayName?: string
): Promise<void> => {
    try {
        const roleMenus = await getAllMenusForRole(companyId, role);
        await saveUserMenuSettings(companyId, targetUserId, roleMenus, userEmail, userDisplayName);
        console.log('✅ คัดลอกการตั้งค่าจาก role ไปยัง user สำเร็จ:', role, '→', targetUserId);
    } catch (error) {
        console.error('❌ คัดลอกการตั้งค่าจาก role ไปยัง user ล้มเหลว:', error);
        throw error;
    }
};

