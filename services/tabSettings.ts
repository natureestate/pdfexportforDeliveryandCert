/**
 * Tab Settings Service
 * บริการจัดการสิทธิ์การเข้าถึง Tab Menu (ViewMode)
 */

import { db, auth } from '../firebase.config';
import {
    collection,
    doc,
    getDoc,
    setDoc,
    Timestamp,
} from 'firebase/firestore';
import { 
    TabConfig, 
    TabType,
    UserRole, 
    RoleTabSettings,
    CompanyTabSettings,
    UserTabSettings,
    DEFAULT_TAB_CONFIG 
} from '../types';
import { checkIsAdmin } from './companyMembers';

const TAB_SETTINGS_COLLECTION = 'tabSettings';
const USER_TAB_SETTINGS_COLLECTION = 'userTabSettings';

/**
 * ดึงการตั้งค่า Tab ของบริษัท
 */
export const getTabSettings = async (companyId: string): Promise<CompanyTabSettings | null> => {
    try {
        const docRef = doc(db, TAB_SETTINGS_COLLECTION, companyId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            return {
                id: docSnap.id,
                companyId: data.companyId,
                settings: data.settings || [],
                createdAt: data.createdAt?.toDate(),
                updatedAt: data.updatedAt?.toDate(),
                updatedBy: data.updatedBy,
            };
        }
        return null;
    } catch {
        return null;
    }
};

/**
 * ดึง Tab สำหรับ role ที่กำหนด
 */
export const getTabsForRole = async (
    companyId: string,
    role: UserRole
): Promise<TabConfig[]> => {
    try {
        const settings = await getTabSettings(companyId);

        if (!settings) {
            // ใช้ค่า default ถ้ายังไม่มีการตั้งค่า
            return getDefaultTabsForRole(role);
        }

        // หาการตั้งค่าสำหรับ role นี้
        const roleSettings = settings.settings.find(s => s.role === role);

        if (!roleSettings) {
            return getDefaultTabsForRole(role);
        }

        // จัดเรียงตาม order และ filter เฉพาะที่ visible
        return roleSettings.tabs
            .filter(tab => tab.visible)
            .sort((a, b) => a.order - b.order);
    } catch {
        return getDefaultTabsForRole(role);
    }
};

/**
 * ดึง Tab ทั้งหมดสำหรับ role (รวมที่ซ่อนด้วย) - สำหรับหน้าตั้งค่า
 */
export const getAllTabsForRole = async (
    companyId: string,
    role: UserRole
): Promise<TabConfig[]> => {
    try {
        const settings = await getTabSettings(companyId);

        if (!settings) {
            return getDefaultTabsForRole(role, true);
        }

        const roleSettings = settings.settings.find(s => s.role === role);

        if (!roleSettings) {
            return getDefaultTabsForRole(role, true);
        }

        return roleSettings.tabs.sort((a, b) => a.order - b.order);
    } catch {
        return getDefaultTabsForRole(role, true);
    }
};

/**
 * ดึงค่า default tabs สำหรับ role
 * @param role - บทบาทของ user
 * @param includeHidden - รวม tabs ที่ซ่อนด้วยหรือไม่
 */
export const getDefaultTabsForRole = (role: UserRole, includeHidden: boolean = false): TabConfig[] => {
    const tabs = DEFAULT_TAB_CONFIG.map(tab => ({
        ...tab,
        // ถ้าเป็น member และ tab เป็น adminOnly ให้ซ่อน
        visible: role === 'admin' ? tab.visible : (tab.visible && !tab.adminOnly),
    }));

    if (includeHidden) {
        return tabs.sort((a, b) => a.order - b.order);
    }

    return tabs.filter(tab => tab.visible).sort((a, b) => a.order - b.order);
};

/**
 * บันทึกการตั้งค่า Tab สำหรับ role
 */
export const saveTabSettingsForRole = async (
    companyId: string,
    role: UserRole,
    tabs: TabConfig[]
): Promise<void> => {
    try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error('กรุณา Login ก่อนตั้งค่า Tab');
        }

        // ตรวจสอบว่าเป็น Admin หรือไม่
        const isAdmin = await checkIsAdmin(companyId, currentUser.uid);
        if (!isAdmin) {
            throw new Error('เฉพาะ Admin เท่านั้นที่สามารถตั้งค่า Tab ได้');
        }

        // ดึงการตั้งค่าเดิม
        const existingSettings = await getTabSettings(companyId);

        // เตรียมข้อมูลการตั้งค่าใหม่
        const newRoleSettings: RoleTabSettings = {
            role,
            tabs,
        };

        let updatedSettings: RoleTabSettings[];

        if (existingSettings) {
            // อัปเดตการตั้งค่าสำหรับ role นี้
            const otherRoleSettings = existingSettings.settings.filter(s => s.role !== role);
            updatedSettings = [...otherRoleSettings, newRoleSettings];
        } else {
            // สร้างใหม่
            updatedSettings = [newRoleSettings];
        }

        // บันทึกลง Firestore
        const docRef = doc(db, TAB_SETTINGS_COLLECTION, companyId);
        await setDoc(docRef, {
            companyId,
            settings: updatedSettings,
            updatedAt: Timestamp.now(),
            updatedBy: currentUser.uid,
        }, { merge: true });
    } catch (error) {
        throw error;
    }
};

/**
 * ดึงการตั้งค่า Tab สำหรับ user
 */
export const getUserTabSettings = async (
    companyId: string,
    userId: string
): Promise<UserTabSettings | null> => {
    try {
        const docId = `${companyId}_${userId}_tabs`;
        const docRef = doc(db, USER_TAB_SETTINGS_COLLECTION, docId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            return {
                id: docSnap.id,
                companyId: data.companyId,
                userId: data.userId,
                useCustomSettings: data.useCustomSettings || false,
                tabs: data.tabs || [],
                createdAt: data.createdAt?.toDate(),
                updatedAt: data.updatedAt?.toDate(),
                updatedBy: data.updatedBy,
            };
        }
        return null;
    } catch {
        return null;
    }
};

/**
 * บันทึกการตั้งค่า Tab สำหรับ user
 */
export const saveUserTabSettings = async (
    companyId: string,
    userId: string,
    useCustomSettings: boolean,
    tabs: TabConfig[]
): Promise<void> => {
    try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error('กรุณา Login ก่อน');
        }

        // ตรวจสอบว่าเป็น Admin หรือไม่
        const isAdmin = await checkIsAdmin(companyId, currentUser.uid);
        if (!isAdmin) {
            throw new Error('เฉพาะ Admin เท่านั้นที่สามารถตั้งค่า Tab ให้ user ได้');
        }

        const docId = `${companyId}_${userId}_tabs`;
        const docRef = doc(db, USER_TAB_SETTINGS_COLLECTION, docId);

        await setDoc(docRef, {
            companyId,
            userId,
            useCustomSettings,
            tabs,
            updatedAt: Timestamp.now(),
            updatedBy: currentUser.uid,
        }, { merge: true });
    } catch (error) {
        throw error;
    }
};

/**
 * ดึง Tab สำหรับ user (รวม user-specific settings)
 * ลำดับความสำคัญ: User-specific > Role-based > Default
 */
export const getTabsForUser = async (
    companyId: string,
    userId: string,
    role: UserRole
): Promise<TabConfig[]> => {
    try {
        // 1. ตรวจสอบว่ามีการตั้งค่าเฉพาะ user หรือไม่
        const userSettings = await getUserTabSettings(companyId, userId);

        if (userSettings && userSettings.useCustomSettings && userSettings.tabs.length > 0) {
            // ใช้การตั้งค่าเฉพาะ user
            return userSettings.tabs
                .filter(tab => tab.visible)
                .sort((a, b) => a.order - b.order);
        }

        // 2. ถ้าไม่มีการตั้งค่าเฉพาะ user ใช้ค่าจาก role
        return await getTabsForRole(companyId, role);
    } catch {
        return getDefaultTabsForRole(role);
    }
};

/**
 * ดึง Tab ทั้งหมดสำหรับ user (รวมที่ซ่อน) - สำหรับหน้าตั้งค่า
 */
export const getAllTabsForUser = async (
    companyId: string,
    userId: string,
    role: UserRole
): Promise<TabConfig[]> => {
    try {
        const userSettings = await getUserTabSettings(companyId, userId);

        if (userSettings && userSettings.useCustomSettings && userSettings.tabs.length > 0) {
            return userSettings.tabs.sort((a, b) => a.order - b.order);
        }

        return await getAllTabsForRole(companyId, role);
    } catch {
        return getDefaultTabsForRole(role, true);
    }
};

/**
 * ตรวจสอบว่า user มีสิทธิ์เข้าถึง Tab หรือไม่
 */
export const canAccessTab = async (
    companyId: string,
    userId: string,
    role: UserRole,
    tabId: TabType
): Promise<boolean> => {
    try {
        const visibleTabs = await getTabsForUser(companyId, userId, role);
        return visibleTabs.some(tab => tab.id === tabId && tab.visible);
    } catch {
        // Default: ให้เข้าถึงได้เฉพาะ tabs พื้นฐาน
        const basicTabs: TabType[] = ['dashboard', 'form', 'history'];
        return basicTabs.includes(tabId);
    }
};

