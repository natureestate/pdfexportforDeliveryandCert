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

        return memberId;
    } catch (error) {
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
        // สร้าง ID ตามรูปแบบ {userId}_{companyId} เพื่อให้ตรงกับ Firestore Rules
        const memberId = `${userId}_${companyId}`;
        const docRef = doc(db, MEMBERS_COLLECTION, memberId);

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

        return memberId;
    } catch (error) {
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
            return existingByUserId.id!;
        }

        const existingByEmail = await getMemberByEmail(companyId, invitedEmail);
        if (existingByEmail && existingByEmail.status === 'active') {
            return existingByEmail.id!;
        }

        // สร้าง ID ตามรูปแบบ {userId}_{companyId} เพื่อให้ตรงกับ Firestore Rules
        const memberId = `${userId}_${companyId}`;
        const docRef = doc(db, MEMBERS_COLLECTION, memberId);

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

        // หมายเหตุ: ไม่อัปเดตจำนวนสมาชิกที่นี่เพราะ user ใหม่อาจไม่มีสิทธิ์อัปเดต companies
        // จำนวนสมาชิกจะถูกอัปเดตตอน Admin ดูหน้าสมาชิก

        return memberId;
    } catch (error) {
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

        return members;
    } catch (error) {
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

        return memberships;
    } catch (error) {
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
            } else {
                // ถ้าเป็นสมาชิกอยู่แล้ว ให้ลบ pending membership ออก
                batch.delete(docSnapshot.ref);
            }
        }

        await batch.commit();

        if (activatedCount > 0) {
            // อัปเดตจำนวนสมาชิกในแต่ละองค์กร
            const companyIds = new Set(querySnapshot.docs.map(doc => doc.data().companyId));
            for (const companyId of companyIds) {
                await updateMemberCount(companyId);
            }
        }

        return activatedCount;
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
        // ไม่ต้องทำอะไร เป็นการอัปเดตข้อมูลเสริม
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
    } catch (error) {
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

        return memberId;
    } catch (error) {
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
        return null;
    }
};

/**
 * ค้นหาสมาชิกตามเบอร์โทรศัพท์
 * @param companyId - ID ขององค์กร
 * @param phoneNumber - เบอร์โทรศัพท์ของสมาชิก
 * @returns CompanyMember object หรือ null
 */
export const getMemberByPhoneNumber = async (
    companyId: string,
    phoneNumber: string
): Promise<CompanyMember | null> => {
    try {
        // Normalize phone number (ลบ + ออกเพื่อค้นหา)
        const normalizedPhone = phoneNumber.replace(/^\+/, '');
        
        const q = query(
            collection(db, MEMBERS_COLLECTION),
            where('companyId', '==', companyId),
            where('phoneNumber', '==', phoneNumber)
        );

        const querySnapshot = await getDocs(q);

        // ถ้าไม่พบ ลองค้นหาแบบไม่มี +
        if (querySnapshot.empty) {
            const q2 = query(
                collection(db, MEMBERS_COLLECTION),
                where('companyId', '==', companyId),
                where('phoneNumber', '==', normalizedPhone)
            );
            
            const querySnapshot2 = await getDocs(q2);
            
            if (querySnapshot2.empty) {
                return null;
            }
            
            const docSnap = querySnapshot2.docs[0];
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
        return null;
    }
};

/**
 * Activate pending memberships เมื่อ user login ด้วยเบอร์โทรศัพท์
 * ใช้สำหรับกรณีที่ Admin เพิ่มสมาชิกโดยตรงด้วยเบอร์โทร และ user login เข้ามาทีหลัง
 * @param phoneNumber - เบอร์โทรศัพท์ของ user ที่ login
 * @param userId - User ID ของ user ที่ login
 * @param displayName - ชื่อแสดง (optional)
 * @param email - อีเมล (optional, ถ้ามี)
 * @returns จำนวน memberships ที่ถูก activate
 */
export const activatePendingMembershipsByPhone = async (
    phoneNumber: string,
    userId: string,
    displayName?: string,
    email?: string
): Promise<number> => {
    try {
        // Normalize phone number
        const normalizedPhone = phoneNumber.replace(/^\+/, '');
        
        // ค้นหา pending memberships ที่ตรงกับเบอร์โทร (ทั้งแบบมี + และไม่มี)
        const q1 = query(
            collection(db, MEMBERS_COLLECTION),
            where('phoneNumber', '==', phoneNumber),
            where('status', '==', 'pending')
        );
        
        const q2 = query(
            collection(db, MEMBERS_COLLECTION),
            where('phoneNumber', '==', normalizedPhone),
            where('status', '==', 'pending')
        );

        const [querySnapshot1, querySnapshot2] = await Promise.all([
            getDocs(q1),
            getDocs(q2)
        ]);

        // รวม results และกรอง duplicates
        const allDocs = [...querySnapshot1.docs, ...querySnapshot2.docs];
        const uniqueDocs = allDocs.filter((doc, index, self) =>
            index === self.findIndex(d => d.id === doc.id)
        );

        if (uniqueDocs.length === 0) {
            return 0;
        }

        // อัปเดตทุก pending membership
        const batch = writeBatch(db);
        let activatedCount = 0;

        for (const docSnapshot of uniqueDocs) {
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
                if (email) updateData.email = email.toLowerCase();

                batch.update(docSnapshot.ref, updateData);
                activatedCount++;
            } else {
                // ถ้าเป็นสมาชิกอยู่แล้ว ให้ลบ pending membership ออก
                batch.delete(docSnapshot.ref);
            }
        }

        await batch.commit();

        if (activatedCount > 0) {
            // อัปเดตจำนวนสมาชิกในแต่ละองค์กร
            const companyIds = new Set(uniqueDocs.map(doc => doc.data().companyId));
            for (const companyId of companyIds) {
                await updateMemberCount(companyId);
            }
        }

        return activatedCount;
    } catch (error) {
        return 0;
    }
};

/**
 * ค้นหา pending memberships ทั้งหมดที่ตรงกับ email หรือ phoneNumber
 * ใช้สำหรับแสดงแจ้งเตือนให้ user link account
 * @param email - อีเมล (optional)
 * @param phoneNumber - เบอร์โทรศัพท์ (optional)
 * @returns Array ของ CompanyMember ที่เป็น pending
 */
export const findPendingMemberships = async (
    email?: string,
    phoneNumber?: string
): Promise<CompanyMember[]> => {
    try {
        const results: CompanyMember[] = [];
        
        // ค้นหาด้วย email
        if (email) {
            const qEmail = query(
                collection(db, MEMBERS_COLLECTION),
                where('email', '==', email.toLowerCase()),
                where('status', '==', 'pending')
            );
            
            const emailSnapshot = await getDocs(qEmail);
            emailSnapshot.docs.forEach(doc => {
                const data = doc.data();
                results.push({
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
                } as CompanyMember);
            });
        }
        
        // ค้นหาด้วย phoneNumber
        if (phoneNumber) {
            const normalizedPhone = phoneNumber.replace(/^\+/, '');
            
            const qPhone1 = query(
                collection(db, MEMBERS_COLLECTION),
                where('phoneNumber', '==', phoneNumber),
                where('status', '==', 'pending')
            );
            
            const qPhone2 = query(
                collection(db, MEMBERS_COLLECTION),
                where('phoneNumber', '==', normalizedPhone),
                where('status', '==', 'pending')
            );
            
            const [phoneSnapshot1, phoneSnapshot2] = await Promise.all([
                getDocs(qPhone1),
                getDocs(qPhone2)
            ]);
            
            const allPhoneDocs = [...phoneSnapshot1.docs, ...phoneSnapshot2.docs];
            const uniquePhoneDocs = allPhoneDocs.filter((doc, index, self) =>
                index === self.findIndex(d => d.id === doc.id)
            );
            
            uniquePhoneDocs.forEach(doc => {
                // ตรวจสอบว่ายังไม่มีใน results
                if (!results.find(r => r.id === doc.id)) {
                    const data = doc.data();
                    results.push({
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
                    } as CompanyMember);
                }
            });
        }

        return results;
    } catch (error) {
        return [];
    }
};

