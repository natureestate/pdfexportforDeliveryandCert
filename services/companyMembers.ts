/**
 * Company Members Service
 * บริการจัดการสมาชิกในองค์กร (Multi-user Management)
 */

import { db, auth } from '../firebase.config';
import {
    collection,
    doc,
    getDocs,
    getDoc,
    setDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    Timestamp,
    updateDoc,
    writeBatch,
} from 'firebase/firestore';
import { CompanyMember, UserRole, MemberStatus } from '../types';

// Collection name
const MEMBERS_COLLECTION = 'companyMembers';
const COMPANIES_COLLECTION = 'companies';

/**
 * เพิ่มสมาชิกใหม่เข้าองค์กร
 * @param companyId - ID ขององค์กร
 * @param email - อีเมลของสมาชิก
 * @param role - บทบาท (admin หรือ member)
 * @returns ID ของสมาชิกที่เพิ่ม
 */
export const addCompanyMember = async (
    companyId: string,
    email: string,
    role: UserRole = 'member'
): Promise<string> => {
    try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error('กรุณา Login ก่อนเพิ่มสมาชิก');
        }

        // ตรวจสอบว่าเป็น Admin หรือไม่
        const isAdmin = await checkIsAdmin(companyId, currentUser.uid);
        if (!isAdmin) {
            throw new Error('เฉพาะ Admin เท่านั้นที่สามารถเพิ่มสมาชิกได้');
        }

        // สร้าง ID
        const docRef = doc(collection(db, MEMBERS_COLLECTION));
        const memberId = docRef.id;

        // เตรียมข้อมูลสมาชิก
        const memberData = {
            companyId,
            userId: '', // จะอัปเดตเมื่อ user login
            email: email.toLowerCase(),
            role,
            status: 'pending' as MemberStatus, // รอ user login เพื่อยืนยัน
            invitedBy: currentUser.uid,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        };

        // บันทึกข้อมูล
        await setDoc(docRef, memberData);

        console.log('✅ เพิ่มสมาชิกสำเร็จ:', memberId, '(Email:', email, ')');
        return memberId;
    } catch (error) {
        console.error('❌ เพิ่มสมาชิกล้มเหลว:', error);
        throw error;
    }
};

/**
 * เพิ่มสมาชิกแรก (Admin) เมื่อสร้างองค์กรใหม่
 * @param companyId - ID ขององค์กร
 * @param userId - User ID ของ Admin
 * @param email - อีเมลของ Admin
 * @param phoneNumber - เบอร์โทรศัพท์ (optional)
 * @param displayName - ชื่อแสดง (optional)
 * @returns ID ของสมาชิกที่เพิ่ม
 */
export const addFirstAdmin = async (
    companyId: string,
    userId: string,
    email: string,
    phoneNumber?: string,
    displayName?: string
): Promise<string> => {
    try {
        // สร้าง ID
        const docRef = doc(collection(db, MEMBERS_COLLECTION));
        const memberId = docRef.id;

        // เตรียมข้อมูล Admin คนแรก
        const memberData: any = {
            companyId,
            userId,
            email: email.toLowerCase(),
            role: 'admin' as UserRole,
            status: 'active' as MemberStatus,
            joinedAt: Timestamp.now(),
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        };

        // เพิ่ม optional fields
        if (phoneNumber) memberData.phoneNumber = phoneNumber;
        if (displayName) memberData.displayName = displayName;

        // บันทึกข้อมูล
        await setDoc(docRef, memberData);

        console.log('✅ เพิ่ม Admin คนแรกสำเร็จ:', memberId);
        return memberId;
    } catch (error) {
        console.error('❌ เพิ่ม Admin คนแรกล้มเหลว:', error);
        throw error;
    }
};

/**
 * เพิ่มสมาชิกจากคำเชิญ (รองรับกรณีอีเมลไม่ตรงกัน)
 * @param companyId - ID ขององค์กร
 * @param userId - User ID ของสมาชิก
 * @param invitedEmail - อีเมลที่ถูกเชิญ (จากคำเชิญ)
 * @param role - บทบาท
 * @param phoneNumber - เบอร์โทรศัพท์ (optional)
 * @param displayName - ชื่อแสดง (optional)
 * @param actualEmail - อีเมลจริงที่ใช้ login (optional, ถ้าต่างจาก invitedEmail)
 * @returns ID ของสมาชิกที่เพิ่ม
 */
export const addMemberFromInvitation = async (
    companyId: string,
    userId: string,
    invitedEmail: string,
    role: UserRole,
    phoneNumber?: string,
    displayName?: string,
    actualEmail?: string
): Promise<string> => {
    try {
        // ตรวจสอบว่ามีสมาชิกอยู่แล้วหรือไม่ (ตรวจสอบทั้ง userId และ invitedEmail)
        const existingByUserId = await getMemberByUserId(companyId, userId);
        if (existingByUserId) {
            console.log('ℹ️ สมาชิก userId นี้มีอยู่แล้ว:', existingByUserId.id);
            return existingByUserId.id!;
        }

        const existingByEmail = await getMemberByEmail(companyId, invitedEmail);
        if (existingByEmail && existingByEmail.status === 'active') {
            console.log('ℹ️ สมาชิก email นี้มีอยู่แล้ว:', existingByEmail.id);
            return existingByEmail.id!;
        }

        // สร้าง ID
        const docRef = doc(collection(db, MEMBERS_COLLECTION));
        const memberId = docRef.id;

        // เตรียมข้อมูลสมาชิก
        const memberData: any = {
            companyId,
            userId,
            email: invitedEmail.toLowerCase(), // ใช้อีเมลจากคำเชิญ
            role,
            status: 'active' as MemberStatus,
            joinedAt: Timestamp.now(),
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        };

        // เพิ่ม optional fields
        if (phoneNumber) memberData.phoneNumber = phoneNumber;
        if (displayName) memberData.displayName = displayName;
        
        // บันทึกอีเมลจริงที่ใช้ login (ถ้าต่างจากอีเมลที่ถูกเชิญ)
        if (actualEmail && actualEmail.toLowerCase() !== invitedEmail.toLowerCase()) {
            memberData.actualEmail = actualEmail.toLowerCase();
            memberData.note = `Login ด้วย ${actualEmail} แต่ถูกเชิญด้วย ${invitedEmail}`;
        }

        // บันทึกข้อมูล
        await setDoc(docRef, memberData);

        // อัปเดตจำนวนสมาชิก
        await updateMemberCount(companyId);

        console.log('✅ เพิ่มสมาชิกจากคำเชิญสำเร็จ:', memberId, '(Email:', invitedEmail, ')');
        return memberId;
    } catch (error) {
        console.error('❌ เพิ่มสมาชิกจากคำเชิญล้มเหลว:', error);
        throw error;
    }
};

/**
 * ค้นหาสมาชิกตาม User ID
 * @param companyId - ID ขององค์กร
 * @param userId - User ID
 * @returns CompanyMember object หรือ null
 */
export const getMemberByUserId = async (
    companyId: string,
    userId: string
): Promise<CompanyMember | null> => {
    try {
        const q = query(
            collection(db, MEMBERS_COLLECTION),
            where('companyId', '==', companyId),
            where('userId', '==', userId)
        );

        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return null;
        }

        const docSnap = querySnapshot.docs[0];
        const data = docSnap.data();

        return {
            id: docSnap.id,
            companyId: data.companyId,
            userId: data.userId,
            email: data.email,
            phoneNumber: data.phoneNumber,
            displayName: data.displayName,
            role: data.role,
            status: data.status,
            joinedAt: data.joinedAt?.toDate(),
            invitedBy: data.invitedBy,
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate(),
        } as CompanyMember;
    } catch (error) {
        console.error('❌ ค้นหาสมาชิกตาม userId ล้มเหลว:', error);
        return null;
    }
};

/**
 * ดึงรายการสมาชิกทั้งหมดในองค์กร
 * @param companyId - ID ขององค์กร
 * @returns Array ของ CompanyMember
 */
export const getCompanyMembers = async (companyId: string): Promise<CompanyMember[]> => {
    try {
        const q = query(
            collection(db, MEMBERS_COLLECTION),
            where('companyId', '==', companyId),
            orderBy('createdAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const members = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                companyId: data.companyId,
                userId: data.userId,
                email: data.email,
                phoneNumber: data.phoneNumber,
                displayName: data.displayName,
                role: data.role,
                status: data.status,
                joinedAt: data.joinedAt?.toDate(),
                invitedBy: data.invitedBy,
                createdAt: data.createdAt?.toDate(),
                updatedAt: data.updatedAt?.toDate(),
            } as CompanyMember;
        });

        console.log(`📋 ดึงสมาชิกในองค์กร ${companyId}: ${members.length} คน`);
        return members;
    } catch (error) {
        console.error('❌ ดึงรายการสมาชิกล้มเหลว:', error);
        throw error;
    }
};

/**
 * ดึงรายการองค์กรที่ User เป็นสมาชิก
 * @param userId - User ID
 * @returns Array ของ CompanyMember
 */
export const getUserMemberships = async (userId: string): Promise<CompanyMember[]> => {
    try {
        const q = query(
            collection(db, MEMBERS_COLLECTION),
            where('userId', '==', userId),
            where('status', '==', 'active'),
            orderBy('createdAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const memberships = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                companyId: data.companyId,
                userId: data.userId,
                email: data.email,
                phoneNumber: data.phoneNumber,
                displayName: data.displayName,
                role: data.role,
                status: data.status,
                joinedAt: data.joinedAt?.toDate(),
                invitedBy: data.invitedBy,
                createdAt: data.createdAt?.toDate(),
                updatedAt: data.updatedAt?.toDate(),
            } as CompanyMember;
        });

        console.log(`📋 ดึงองค์กรของ User ${userId}: ${memberships.length} องค์กร`);
        return memberships;
    } catch (error) {
        console.error('❌ ดึงรายการองค์กรล้มเหลว:', error);
        throw error;
    }
};

/**
 * ตรวจสอบว่า User เป็น Admin ขององค์กรหรือไม่
 * @param companyId - ID ขององค์กร
 * @param userId - User ID
 * @returns true ถ้าเป็น Admin
 */
export const checkIsAdmin = async (companyId: string, userId: string): Promise<boolean> => {
    try {
        const q = query(
            collection(db, MEMBERS_COLLECTION),
            where('companyId', '==', companyId),
            where('userId', '==', userId),
            where('role', '==', 'admin'),
            where('status', '==', 'active')
        );

        const querySnapshot = await getDocs(q);
        return !querySnapshot.empty;
    } catch (error) {
        console.error('❌ ตรวจสอบสิทธิ์ Admin ล้มเหลว:', error);
        return false;
    }
};

/**
 * ตรวจสอบว่า User เป็นสมาชิกขององค์กรหรือไม่
 * @param companyId - ID ขององค์กร
 * @param userId - User ID
 * @returns true ถ้าเป็นสมาชิก
 */
export const checkIsMember = async (companyId: string, userId: string): Promise<boolean> => {
    try {
        const q = query(
            collection(db, MEMBERS_COLLECTION),
            where('companyId', '==', companyId),
            where('userId', '==', userId),
            where('status', '==', 'active')
        );

        const querySnapshot = await getDocs(q);
        return !querySnapshot.empty;
    } catch (error) {
        console.error('❌ ตรวจสอบสมาชิกล้มเหลว:', error);
        return false;
    }
};

/**
 * Activate pending memberships เมื่อ user login
 * ใช้สำหรับกรณีที่ Admin เพิ่มสมาชิกโดยตรงด้วยอีเมล และ user login เข้ามาทีหลัง
 * @param email - อีเมลของ user ที่ login
 * @param userId - User ID ของ user ที่ login
 * @param displayName - ชื่อแสดง (optional)
 * @param phoneNumber - เบอร์โทรศัพท์ (optional)
 * @returns จำนวน memberships ที่ถูก activate
 */
export const activatePendingMemberships = async (
    email: string,
    userId: string,
    displayName?: string,
    phoneNumber?: string
): Promise<number> => {
    try {
        // ค้นหา pending memberships ที่ตรงกับอีเมล
        const q = query(
            collection(db, MEMBERS_COLLECTION),
            where('email', '==', email.toLowerCase()),
            where('status', '==', 'pending')
        );

        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            // ไม่มี pending memberships
            return 0;
        }

        console.log(`🔍 พบ ${querySnapshot.docs.length} pending memberships สำหรับ ${email}`);

        // อัปเดตทุก pending membership
        const batch = writeBatch(db);
        let activatedCount = 0;

        for (const docSnapshot of querySnapshot.docs) {
            const data = docSnapshot.data();
            
            // ตรวจสอบว่า user นี้ยังไม่ได้เป็นสมาชิกขององค์กรนี้อยู่แล้ว
            const isAlreadyMember = await checkIsMember(data.companyId, userId);
            
            if (!isAlreadyMember) {
                const updateData: any = {
                    userId,
                    status: 'active' as MemberStatus,
                    joinedAt: Timestamp.now(),
                    updatedAt: Timestamp.now(),
                };

                if (displayName) updateData.displayName = displayName;
                if (phoneNumber) updateData.phoneNumber = phoneNumber;

                batch.update(docSnapshot.ref, updateData);
                activatedCount++;

                console.log(`✅ Activating membership: ${docSnapshot.id} (Company: ${data.companyId})`);
            } else {
                // ถ้าเป็นสมาชิกอยู่แล้ว ให้ลบ pending membership ออก
                batch.delete(docSnapshot.ref);
                console.log(`🗑️ Removing duplicate pending membership: ${docSnapshot.id}`);
            }
        }

        await batch.commit();

        if (activatedCount > 0) {
            console.log(`✅ Activated ${activatedCount} memberships สำหรับ ${email}`);
            
            // อัปเดตจำนวนสมาชิกในแต่ละองค์กร
            const companyIds = new Set(querySnapshot.docs.map(doc => doc.data().companyId));
            for (const companyId of companyIds) {
                await updateMemberCount(companyId);
            }
        }

        return activatedCount;
    } catch (error) {
        console.error('❌ Activate pending memberships ล้มเหลว:', error);
        return 0;
    }
};

/**
 * อัปเดตบทบาทของสมาชิก
 * @param memberId - ID ของสมาชิก
 * @param role - บทบาทใหม่
 */
export const updateMemberRole = async (memberId: string, role: UserRole): Promise<void> => {
    try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error('กรุณา Login ก่อนแก้ไขบทบาท');
        }

        // ดึงข้อมูลสมาชิกที่จะแก้ไข
        const memberRef = doc(db, MEMBERS_COLLECTION, memberId);
        const memberDoc = await getDoc(memberRef);

        if (!memberDoc.exists()) {
            throw new Error('ไม่พบสมาชิกนี้');
        }

        const memberData = memberDoc.data();

        // ตรวจสอบว่าเป็น Admin หรือไม่
        const isAdmin = await checkIsAdmin(memberData.companyId, currentUser.uid);
        if (!isAdmin) {
            throw new Error('เฉพาะ Admin เท่านั้นที่สามารถแก้ไขบทบาทได้');
        }

        // อัปเดตบทบาท
        await updateDoc(memberRef, {
            role,
            updatedAt: Timestamp.now(),
        });

        console.log('✅ อัปเดตบทบาทสำเร็จ:', memberId, '→', role);
    } catch (error) {
        console.error('❌ อัปเดตบทบาทล้มเหลว:', error);
        throw error;
    }
};

/**
 * ลบสมาชิกออกจากองค์กร
 * @param memberId - ID ของสมาชิก
 */
export const removeMember = async (memberId: string): Promise<void> => {
    try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error('กรุณา Login ก่อนลบสมาชิก');
        }

        // ดึงข้อมูลสมาชิกที่จะลบ
        const memberRef = doc(db, MEMBERS_COLLECTION, memberId);
        const memberDoc = await getDoc(memberRef);

        if (!memberDoc.exists()) {
            throw new Error('ไม่พบสมาชิกนี้');
        }

        const memberData = memberDoc.data();

        // ตรวจสอบว่าเป็น Admin หรือไม่
        const isAdmin = await checkIsAdmin(memberData.companyId, currentUser.uid);
        if (!isAdmin) {
            throw new Error('เฉพาะ Admin เท่านั้นที่สามารถลบสมาชิกได้');
        }

        // ห้ามลบตัวเองถ้าเป็น Admin คนเดียว
        const members = await getCompanyMembers(memberData.companyId);
        const admins = members.filter(m => m.role === 'admin' && m.status === 'active');
        
        if (admins.length === 1 && memberData.userId === currentUser.uid) {
            throw new Error('ไม่สามารถลบ Admin คนเดียวได้ กรุณาเพิ่ม Admin คนอื่นก่อน');
        }

        // ลบสมาชิก
        await deleteDoc(memberRef);

        console.log('✅ ลบสมาชิกสำเร็จ:', memberId);
    } catch (error) {
        console.error('❌ ลบสมาชิกล้มเหลว:', error);
        throw error;
    }
};

/**
 * ยืนยันการเข้าร่วมองค์กร (เมื่อ User login ครั้งแรก)
 * @param email - อีเมลของ User
 * @param userId - User ID
 * @param phoneNumber - เบอร์โทรศัพท์ (optional)
 * @param displayName - ชื่อแสดง (optional)
 */
export const confirmMembership = async (
    email: string,
    userId: string,
    phoneNumber?: string,
    displayName?: string
): Promise<void> => {
    try {
        // ค้นหา pending membership ที่ตรงกับอีเมล
        const q = query(
            collection(db, MEMBERS_COLLECTION),
            where('email', '==', email.toLowerCase()),
            where('status', '==', 'pending')
        );

        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            console.log('ℹ️ ไม่พบคำเชิญเข้าองค์กรสำหรับอีเมลนี้');
            return;
        }

        // อัปเดตทุก pending membership
        const batch = writeBatch(db);

        querySnapshot.docs.forEach(doc => {
            const updateData: any = {
                userId,
                status: 'active' as MemberStatus,
                joinedAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            };

            if (phoneNumber) updateData.phoneNumber = phoneNumber;
            if (displayName) updateData.displayName = displayName;

            batch.update(doc.ref, updateData);
        });

        await batch.commit();

        console.log('✅ ยืนยันการเข้าร่วมองค์กรสำเร็จ:', querySnapshot.docs.length, 'องค์กร');
    } catch (error) {
        console.error('❌ ยืนยันการเข้าร่วมองค์กรล้มเหลว:', error);
        throw error;
    }
};

/**
 * อัปเดตจำนวนสมาชิกในองค์กร
 * @param companyId - ID ขององค์กร
 */
export const updateMemberCount = async (companyId: string): Promise<void> => {
    try {
        const members = await getCompanyMembers(companyId);
        const activeMembers = members.filter(m => m.status === 'active');

        const companyRef = doc(db, COMPANIES_COLLECTION, companyId);
        await updateDoc(companyRef, {
            memberCount: activeMembers.length,
            updatedAt: Timestamp.now(),
        });

        console.log('✅ อัปเดตจำนวนสมาชิกสำเร็จ:', companyId, '→', activeMembers.length, 'คน');
    } catch (error) {
        console.error('❌ อัปเดตจำนวนสมาชิกล้มเหลว:', error);
    }
};

/**
 * อัปเดตข้อมูลสมาชิก (displayName, phoneNumber, role)
 * @param memberId - ID ของสมาชิก
 * @param data - ข้อมูลที่ต้องการอัปเดต
 */
export const updateMemberInfo = async (
    memberId: string,
    data: {
        displayName?: string;
        phoneNumber?: string;
        role?: UserRole;
    }
): Promise<void> => {
    try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error('กรุณา Login ก่อนแก้ไขข้อมูล');
        }

        // ดึงข้อมูลสมาชิกที่จะแก้ไข
        const memberRef = doc(db, MEMBERS_COLLECTION, memberId);
        const memberDoc = await getDoc(memberRef);

        if (!memberDoc.exists()) {
            throw new Error('ไม่พบสมาชิกนี้');
        }

        const memberData = memberDoc.data();

        // ตรวจสอบว่าเป็น Admin หรือไม่
        const isAdmin = await checkIsAdmin(memberData.companyId, currentUser.uid);
        if (!isAdmin) {
            throw new Error('เฉพาะ Admin เท่านั้นที่สามารถแก้ไขข้อมูลสมาชิกได้');
        }

        // เตรียมข้อมูลที่จะอัปเดต
        const updateData: any = {
            updatedAt: Timestamp.now(),
        };

        if (data.displayName !== undefined) {
            updateData.displayName = data.displayName;
        }
        if (data.phoneNumber !== undefined) {
            updateData.phoneNumber = data.phoneNumber;
        }
        if (data.role !== undefined) {
            updateData.role = data.role;
        }

        // อัปเดตข้อมูล
        await updateDoc(memberRef, updateData);

        console.log('✅ อัปเดตข้อมูลสมาชิกสำเร็จ:', memberId);
    } catch (error) {
        console.error('❌ อัปเดตข้อมูลสมาชิกล้มเหลว:', error);
        throw error;
    }
};

/**
 * เพิ่มสมาชิกโดยตรง (Direct Add) - ไม่ต้องส่งคำเชิญ
 * @param companyId - ID ขององค์กร
 * @param email - อีเมลของสมาชิก
 * @param role - บทบาท (admin หรือ member)
 * @param displayName - ชื่อแสดง (optional)
 * @param phoneNumber - เบอร์โทรศัพท์ (optional)
 * @returns ID ของสมาชิกที่เพิ่ม
 */
export const addMemberDirect = async (
    companyId: string,
    email: string,
    role: UserRole = 'member',
    displayName?: string,
    phoneNumber?: string
): Promise<string> => {
    try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error('กรุณา Login ก่อนเพิ่มสมาชิก');
        }

        // ตรวจสอบว่าเป็น Admin หรือไม่
        const isAdmin = await checkIsAdmin(companyId, currentUser.uid);
        if (!isAdmin) {
            throw new Error('เฉพาะ Admin เท่านั้นที่สามารถเพิ่มสมาชิกได้');
        }

        // ตรวจสอบว่าอีเมลนี้มีในองค์กรแล้วหรือไม่
        const existingMember = await getMemberByEmail(companyId, email);
        if (existingMember) {
            throw new Error('อีเมลนี้เป็นสมาชิกขององค์กรอยู่แล้ว');
        }

        // สร้าง ID
        const docRef = doc(collection(db, MEMBERS_COLLECTION));
        const memberId = docRef.id;

        // เตรียมข้อมูลสมาชิก
        const memberData: any = {
            companyId,
            userId: '', // จะอัปเดตเมื่อ user login
            email: email.toLowerCase(),
            role,
            status: 'pending' as MemberStatus, // รอ user login เพื่อยืนยัน
            invitedBy: currentUser.uid,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        };

        // เพิ่ม optional fields
        if (displayName) memberData.displayName = displayName;
        if (phoneNumber) memberData.phoneNumber = phoneNumber;

        // บันทึกข้อมูล
        await setDoc(docRef, memberData);

        // อัปเดตจำนวนสมาชิก
        await updateMemberCount(companyId);

        console.log('✅ เพิ่มสมาชิกโดยตรงสำเร็จ:', memberId, '(Email:', email, ')');
        return memberId;
    } catch (error) {
        console.error('❌ เพิ่มสมาชิกโดยตรงล้มเหลว:', error);
        throw error;
    }
};

/**
 * ค้นหาสมาชิกตามอีเมล
 * @param companyId - ID ขององค์กร
 * @param email - อีเมลของสมาชิก
 * @returns CompanyMember object หรือ null
 */
export const getMemberByEmail = async (
    companyId: string,
    email: string
): Promise<CompanyMember | null> => {
    try {
        const q = query(
            collection(db, MEMBERS_COLLECTION),
            where('companyId', '==', companyId),
            where('email', '==', email.toLowerCase())
        );

        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return null;
        }

        const docSnap = querySnapshot.docs[0];
        const data = docSnap.data();

        return {
            id: docSnap.id,
            companyId: data.companyId,
            userId: data.userId,
            email: data.email,
            phoneNumber: data.phoneNumber,
            displayName: data.displayName,
            role: data.role,
            status: data.status,
            joinedAt: data.joinedAt?.toDate(),
            invitedBy: data.invitedBy,
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate(),
        } as CompanyMember;
    } catch (error) {
        console.error('❌ ค้นหาสมาชิกล้มเหลว:', error);
        return null;
    }
};

