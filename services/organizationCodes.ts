/**
 * Organization Codes Service
 * บริการจัดการ Join Code สำหรับเข้าร่วมองค์กร
 * 
 * ระบบนี้ช่วยให้ Admin สร้าง code แล้วแชร์ให้ user ใหม่ใช้เข้าร่วมได้โดยไม่ต้องรอคำเชิญ
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
    increment,
} from 'firebase/firestore';
import { OrganizationCode, OrganizationCodeUsage, UserRole } from '../types';
import { checkIsAdmin } from './companyMembers';
import { addMemberFromInvitation } from './companyMembers';

// Collection names
const CODES_COLLECTION = 'organizationCodes';
const CODE_USAGE_COLLECTION = 'organizationCodeUsages';
const COMPANIES_COLLECTION = 'companies';

/**
 * สร้าง Code แบบสุ่ม (8 ตัวอักษร ตัวพิมพ์ใหญ่และตัวเลข)
 * ไม่ใช้ตัวอักษรที่สับสนเช่น 0, O, I, L, 1
 * @returns รหัส 8 ตัวอักษร
 */
const generateCode = (): string => {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
};

/**
 * ตรวจสอบว่า code ซ้ำในระบบหรือไม่
 * @param code - รหัสที่ต้องการตรวจสอบ
 * @returns true ถ้าซ้ำ
 */
const isCodeDuplicate = async (code: string): Promise<boolean> => {
    const q = query(
        collection(db, CODES_COLLECTION),
        where('code', '==', code.toUpperCase())
    );
    const snapshot = await getDocs(q);
    return !snapshot.empty;
};

/**
 * สร้าง Organization Code ใหม่
 * @param companyId - ID ขององค์กร
 * @param options - ตัวเลือกเพิ่มเติม
 * @returns OrganizationCode object
 */
export const createOrganizationCode = async (
    companyId: string,
    options?: {
        role?: UserRole;           // บทบาทเริ่มต้น (default: member)
        maxUses?: number;          // จำนวนครั้งสูงสุด (-1 = ไม่จำกัด)
        expiresInDays?: number;    // หมดอายุในกี่วัน (null = ไม่หมดอายุ)
        description?: string;      // คำอธิบาย
    }
): Promise<OrganizationCode> => {
    try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error('กรุณา Login ก่อนสร้าง Join Code');
        }

        // ตรวจสอบว่าเป็น Admin หรือไม่
        const isAdmin = await checkIsAdmin(companyId, currentUser.uid);
        if (!isAdmin) {
            throw new Error('เฉพาะ Admin เท่านั้นที่สามารถสร้าง Join Code ได้');
        }

        // ดึงข้อมูลบริษัท
        const companyDoc = await getDoc(doc(db, COMPANIES_COLLECTION, companyId));
        if (!companyDoc.exists()) {
            throw new Error('ไม่พบข้อมูลองค์กร');
        }
        const companyData = companyDoc.data();

        // สร้าง code ที่ไม่ซ้ำ
        let code = generateCode();
        let attempts = 0;
        while (await isCodeDuplicate(code) && attempts < 10) {
            code = generateCode();
            attempts++;
        }
        if (attempts >= 10) {
            throw new Error('ไม่สามารถสร้าง code ได้ กรุณาลองใหม่');
        }

        // กำหนดวันหมดอายุ (ถ้ามี)
        let expiresAt: Date | undefined;
        if (options?.expiresInDays && options.expiresInDays > 0) {
            expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + options.expiresInDays);
        }

        // สร้าง Document
        const docRef = doc(collection(db, CODES_COLLECTION));
        const codeId = docRef.id;

        const codeData: any = {
            code: code.toUpperCase(),
            companyId,
            companyName: companyData.name,
            role: options?.role || 'member',
            maxUses: options?.maxUses ?? -1, // -1 = ไม่จำกัด
            usedCount: 0,
            isActive: true,
            createdBy: currentUser.uid,
            createdByName: currentUser.displayName || currentUser.email,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        };

        // เพิ่ม optional fields
        if (expiresAt) {
            codeData.expiresAt = Timestamp.fromDate(expiresAt);
        }
        if (options?.description) {
            codeData.description = options.description;
        }

        // บันทึกข้อมูล
        await setDoc(docRef, codeData);

        return {
            id: codeId,
            ...codeData,
            expiresAt,
            createdAt: new Date(),
            updatedAt: new Date(),
        } as OrganizationCode;
    } catch (error) {
        throw error;
    }
};

/**
 * ดึง Organization Code ตามรหัส
 * @param code - รหัส Join Code
 * @returns OrganizationCode object หรือ null
 */
export const getOrganizationCodeByCode = async (code: string): Promise<OrganizationCode | null> => {
    try {
        const q = query(
            collection(db, CODES_COLLECTION),
            where('code', '==', code.toUpperCase())
        );

        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            return null;
        }

        const docSnap = snapshot.docs[0];
        const data = docSnap.data();

        return {
            id: docSnap.id,
            code: data.code,
            companyId: data.companyId,
            companyName: data.companyName,
            role: data.role,
            maxUses: data.maxUses,
            usedCount: data.usedCount,
            expiresAt: data.expiresAt?.toDate(),
            isActive: data.isActive,
            description: data.description,
            createdBy: data.createdBy,
            createdByName: data.createdByName,
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate(),
        } as OrganizationCode;
    } catch (error) {
        throw error;
    }
};

/**
 * ตรวจสอบความถูกต้องของ Join Code
 * @param code - รหัส Join Code
 * @returns { valid: boolean, message?: string, codeData?: OrganizationCode }
 */
export const validateOrganizationCode = async (
    code: string
): Promise<{ valid: boolean; message?: string; codeData?: OrganizationCode }> => {
    try {
        const codeData = await getOrganizationCodeByCode(code);

        if (!codeData) {
            return { valid: false, message: 'ไม่พบ Join Code นี้ในระบบ' };
        }

        if (!codeData.isActive) {
            return { valid: false, message: 'Join Code นี้ถูกปิดใช้งานแล้ว' };
        }

        // ตรวจสอบจำนวนการใช้งาน
        if (codeData.maxUses !== -1 && codeData.usedCount >= codeData.maxUses) {
            return { valid: false, message: 'Join Code นี้ถูกใช้งานครบจำนวนแล้ว' };
        }

        // ตรวจสอบวันหมดอายุ
        if (codeData.expiresAt && codeData.expiresAt < new Date()) {
            return { valid: false, message: 'Join Code นี้หมดอายุแล้ว' };
        }

        return { valid: true, codeData };
    } catch (error) {
        return { valid: false, message: 'เกิดข้อผิดพลาดในการตรวจสอบ' };
    }
};

/**
 * ใช้ Join Code เข้าร่วมองค์กร
 * @param code - รหัส Join Code
 * @returns OrganizationCodeUsage object
 */
export const joinByCode = async (code: string): Promise<OrganizationCodeUsage> => {
    try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error('กรุณา Login ก่อนใช้ Join Code');
        }

        // ตรวจสอบ code
        const validation = await validateOrganizationCode(code);
        if (!validation.valid || !validation.codeData) {
            throw new Error(validation.message || 'Join Code ไม่ถูกต้อง');
        }

        const codeData = validation.codeData;

        // เพิ่มสมาชิกเข้าองค์กร
        await addMemberFromInvitation(
            codeData.companyId,
            currentUser.uid,
            currentUser.email || '',
            codeData.role,
            currentUser.phoneNumber || undefined,
            currentUser.displayName || undefined
        );

        // อัปเดตจำนวนการใช้งาน code
        const codeRef = doc(db, CODES_COLLECTION, codeData.id!);
        await updateDoc(codeRef, {
            usedCount: increment(1),
            updatedAt: Timestamp.now(),
        });

        // บันทึกประวัติการใช้งาน
        const usageRef = doc(collection(db, CODE_USAGE_COLLECTION));
        const usageData: OrganizationCodeUsage = {
            id: usageRef.id,
            codeId: codeData.id!,
            code: codeData.code,
            userId: currentUser.uid,
            userEmail: currentUser.email || undefined,
            userName: currentUser.displayName || undefined,
            companyId: codeData.companyId,
            joinedAt: new Date(),
        };

        await setDoc(usageRef, {
            ...usageData,
            joinedAt: Timestamp.now(),
        });

        // หมายเหตุ: ไม่ต้อง updateMemberCount เพราะ user ใหม่ไม่มีสิทธิ์อัปเดต companies
        // จำนวนสมาชิกจะถูกอัปเดตตอน Admin ดูหน้าสมาชิก หรือ background job

        return usageData;
    } catch (error) {
        throw error;
    }
};

/**
 * ดึงรายการ Join Codes ทั้งหมดขององค์กร
 * @param companyId - ID ขององค์กร
 * @returns Array ของ OrganizationCode
 */
export const getCompanyOrganizationCodes = async (companyId: string): Promise<OrganizationCode[]> => {
    try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error('กรุณา Login ก่อนดู Join Codes');
        }

        // ตรวจสอบว่าเป็น Admin หรือไม่
        const isAdmin = await checkIsAdmin(companyId, currentUser.uid);
        if (!isAdmin) {
            throw new Error('เฉพาะ Admin เท่านั้นที่สามารถดู Join Codes ได้');
        }

        const q = query(
            collection(db, CODES_COLLECTION),
            where('companyId', '==', companyId),
            orderBy('createdAt', 'desc')
        );

        const snapshot = await getDocs(q);
        const codes = snapshot.docs.map(docSnap => {
            const data = docSnap.data();
            return {
                id: docSnap.id,
                code: data.code,
                companyId: data.companyId,
                companyName: data.companyName,
                role: data.role,
                maxUses: data.maxUses,
                usedCount: data.usedCount,
                expiresAt: data.expiresAt?.toDate(),
                isActive: data.isActive,
                description: data.description,
                createdBy: data.createdBy,
                createdByName: data.createdByName,
                createdAt: data.createdAt?.toDate(),
                updatedAt: data.updatedAt?.toDate(),
            } as OrganizationCode;
        });

        return codes;
    } catch (error) {
        throw error;
    }
};

/**
 * ปิดใช้งาน Join Code
 * @param codeId - ID ของ OrganizationCode
 */
export const deactivateOrganizationCode = async (codeId: string): Promise<void> => {
    try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error('กรุณา Login ก่อนปิดใช้งาน Join Code');
        }

        // ดึงข้อมูล code
        const codeRef = doc(db, CODES_COLLECTION, codeId);
        const codeDoc = await getDoc(codeRef);

        if (!codeDoc.exists()) {
            throw new Error('ไม่พบ Join Code นี้');
        }

        const codeData = codeDoc.data();

        // ตรวจสอบว่าเป็น Admin หรือไม่
        const isAdmin = await checkIsAdmin(codeData.companyId, currentUser.uid);
        if (!isAdmin) {
            throw new Error('เฉพาะ Admin เท่านั้นที่สามารถปิดใช้งาน Join Code ได้');
        }

        // ปิดใช้งาน
        await updateDoc(codeRef, {
            isActive: false,
            updatedAt: Timestamp.now(),
        });
    } catch (error) {
        throw error;
    }
};

/**
 * เปิดใช้งาน Join Code
 * @param codeId - ID ของ OrganizationCode
 */
export const activateOrganizationCode = async (codeId: string): Promise<void> => {
    try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error('กรุณา Login ก่อนเปิดใช้งาน Join Code');
        }

        // ดึงข้อมูล code
        const codeRef = doc(db, CODES_COLLECTION, codeId);
        const codeDoc = await getDoc(codeRef);

        if (!codeDoc.exists()) {
            throw new Error('ไม่พบ Join Code นี้');
        }

        const codeData = codeDoc.data();

        // ตรวจสอบว่าเป็น Admin หรือไม่
        const isAdmin = await checkIsAdmin(codeData.companyId, currentUser.uid);
        if (!isAdmin) {
            throw new Error('เฉพาะ Admin เท่านั้นที่สามารถเปิดใช้งาน Join Code ได้');
        }

        // เปิดใช้งาน
        await updateDoc(codeRef, {
            isActive: true,
            updatedAt: Timestamp.now(),
        });
    } catch (error) {
        throw error;
    }
};

/**
 * ลบ Join Code
 * @param codeId - ID ของ OrganizationCode
 */
export const deleteOrganizationCode = async (codeId: string): Promise<void> => {
    try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error('กรุณา Login ก่อนลบ Join Code');
        }

        // ดึงข้อมูล code
        const codeRef = doc(db, CODES_COLLECTION, codeId);
        const codeDoc = await getDoc(codeRef);

        if (!codeDoc.exists()) {
            throw new Error('ไม่พบ Join Code นี้');
        }

        const codeData = codeDoc.data();

        // ตรวจสอบว่าเป็น Admin หรือไม่
        const isAdmin = await checkIsAdmin(codeData.companyId, currentUser.uid);
        if (!isAdmin) {
            throw new Error('เฉพาะ Admin เท่านั้นที่สามารถลบ Join Code ได้');
        }

        // ลบ code
        await deleteDoc(codeRef);
    } catch (error) {
        throw error;
    }
};

/**
 * ดึงประวัติการใช้งาน Join Code
 * @param codeId - ID ของ OrganizationCode
 * @returns Array ของ OrganizationCodeUsage
 */
export const getCodeUsageHistory = async (codeId: string): Promise<OrganizationCodeUsage[]> => {
    try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error('กรุณา Login ก่อนดูประวัติการใช้งาน');
        }

        // ดึงข้อมูล code เพื่อตรวจสอบสิทธิ์
        const codeRef = doc(db, CODES_COLLECTION, codeId);
        const codeDoc = await getDoc(codeRef);

        if (!codeDoc.exists()) {
            throw new Error('ไม่พบ Join Code นี้');
        }

        const codeData = codeDoc.data();

        // ตรวจสอบว่าเป็น Admin หรือไม่
        const isAdmin = await checkIsAdmin(codeData.companyId, currentUser.uid);
        if (!isAdmin) {
            throw new Error('เฉพาะ Admin เท่านั้นที่สามารถดูประวัติการใช้งานได้');
        }

        const q = query(
            collection(db, CODE_USAGE_COLLECTION),
            where('codeId', '==', codeId),
            orderBy('joinedAt', 'desc')
        );

        const snapshot = await getDocs(q);
        const usages = snapshot.docs.map(docSnap => {
            const data = docSnap.data();
            return {
                id: docSnap.id,
                codeId: data.codeId,
                code: data.code,
                userId: data.userId,
                userEmail: data.userEmail,
                userName: data.userName,
                companyId: data.companyId,
                joinedAt: data.joinedAt?.toDate(),
            } as OrganizationCodeUsage;
        });

        return usages;
    } catch (error) {
        throw error;
    }
};
