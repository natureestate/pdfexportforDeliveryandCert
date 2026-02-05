/**
 * Companies Service
 * บริการจัดการบริษัทของ User (รองรับ Multi-user)
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
    orderBy,
    Timestamp,
    updateDoc,
    where,
} from 'firebase/firestore';
import { Company } from '../types';
import { addFirstAdmin, getUserMemberships, updateMemberCount } from './companyMembers';
import { createQuota } from './quota';

// Collection name
const COMPANIES_COLLECTION = 'companies';

/**
 * สร้างบริษัทใหม่ (พร้อมเพิ่มผู้สร้างเป็น Admin อัตโนมัติ)
 * @param company - ข้อมูลบริษัท
 * @returns ID ของบริษัทที่สร้าง
 */
export const createCompany = async (
    company: Omit<Company, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
    try {
        // ตรวจสอบว่า user login แล้วหรือยัง
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error('กรุณา Login ก่อนสร้างบริษัท');
        }

        // สร้าง ID
        const docRef = doc(collection(db, COMPANIES_COLLECTION));
        const companyId = docRef.id;

        // เตรียมข้อมูลสำหรับบันทึก - ลบ undefined fields
        const dataToSave: any = {
            name: company.name,
            userId: currentUser.uid, // Admin คนแรก (คนที่สร้างบริษัท)
            memberCount: 1, // เริ่มต้นมี 1 คน (Admin)
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        };

        // เพิ่ม optional fields เฉพาะที่มีค่า
        if (company.address) {
            dataToSave.address = company.address;
        }
        if (company.phone) {
            dataToSave.phone = company.phone;
        }
        if (company.email) {
            dataToSave.email = company.email;
        }
        if (company.website) {
            dataToSave.website = company.website;
        }
        if (company.taxId) {
            dataToSave.taxId = company.taxId;
        }
        if (company.logoUrl !== undefined) {
            dataToSave.logoUrl = company.logoUrl;
        }
        if (company.logoType) {
            dataToSave.logoType = company.logoType;
        }

        // บันทึกข้อมูลบริษัท
        await setDoc(docRef, dataToSave);

        // เพิ่มผู้สร้างเป็น Admin คนแรกอัตโนมัติ
        await addFirstAdmin(
            companyId,
            currentUser.uid,
            currentUser.email || '',
            currentUser.phoneNumber || undefined,
            currentUser.displayName || undefined
        );

        // สร้าง quota เริ่มต้น (Free Plan) สำหรับบริษัทใหม่
        try {
            await createQuota(companyId, 'free');
        } catch {
            // สร้าง quota ล้มเหลว - ไม่กระทบการสร้างบริษัท
        }

        return companyId;
    } catch {
        throw new Error('ไม่สามารถสร้างบริษัทได้');
    }
};

/**
 * ดึงรายการบริษัทที่ User เป็นสมาชิก (Multi-user Support + Backward Compatible)
 * @returns Array ของ Company
 */
export const getUserCompanies = async (): Promise<Company[]> => {
    try {
        // ตรวจสอบว่า user login แล้วหรือยัง
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error('กรุณา Login ก่อนดูข้อมูล');
        }

        const companies: Company[] = [];
        const companyIds = new Set<string>(); // ป้องกันซ้ำ

        // 1. ดึงรายการองค์กรที่ User เป็นสมาชิก (ระบบใหม่)
        try {
            const memberships = await getUserMemberships(currentUser.uid);
            
            for (const membership of memberships) {
                const company = await getCompanyById(membership.companyId);
                if (company && !companyIds.has(company.id!)) {
                    companies.push(company);
                    companyIds.add(company.id!);
                }
            }
            
        } catch {
            // ไม่สามารถดึง memberships - อาจเป็น user ใหม่
        }

        // 2. Fallback: ดึงองค์กรเก่าที่ User เป็นเจ้าของ (Backward Compatible)
        try {
            const q = query(
                collection(db, COMPANIES_COLLECTION),
                where('userId', '==', currentUser.uid),
                orderBy('createdAt', 'desc')
            );

            const querySnapshot = await getDocs(q);
            
            for (const doc of querySnapshot.docs) {
                if (!companyIds.has(doc.id)) {
                    const data = doc.data();
                    const company: Company = {
                        id: doc.id,
                        name: data.name,
                        address: data.address,
                        phone: data.phone,
                        email: data.email,
                        website: data.website,
                        taxId: data.taxId,
                        userId: data.userId,
                        logoUrl: data.logoUrl,
                        logoType: data.logoType,
                        defaultLogoUrl: data.defaultLogoUrl,
                        organizationLogoUrl: data.organizationLogoUrl, // โลโก้องค์กรสำหรับ Header
                        memberCount: data.memberCount || 0,
                        createdAt: data.createdAt?.toDate(),
                        updatedAt: data.updatedAt?.toDate(),
                    };
                    companies.push(company);
                    companyIds.add(doc.id);
                }
            }
            
        } catch {
            // ไม่สามารถดึงบริษัทเก่า - อาจไม่มีสิทธิ์
        }

        return companies;
    } catch {
        throw new Error('ไม่สามารถดึงรายการบริษัทได้');
    }
};

/**
 * ดึงข้อมูลบริษัทตาม ID
 * @param companyId - ID ของบริษัท
 * @returns Company หรือ null ถ้าไม่พบ
 */
export const getCompanyById = async (companyId: string): Promise<Company | null> => {
    try {
        const docRef = doc(db, COMPANIES_COLLECTION, companyId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            return null;
        }

        const data = docSnap.data();
        return {
            id: docSnap.id,
            name: data.name,
            address: data.address,
            phone: data.phone,
            email: data.email,
            website: data.website,
            taxId: data.taxId,
            userId: data.userId,
            logoUrl: data.logoUrl,
            logoType: data.logoType,
            defaultLogoUrl: data.defaultLogoUrl,
            organizationLogoUrl: data.organizationLogoUrl, // โลโก้องค์กรสำหรับ Header
            memberCount: data.memberCount || 0,
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate(),
        } as Company;
    } catch {
        throw new Error('ไม่สามารถดึงข้อมูลบริษัทได้');
    }
};

/**
 * อัปเดตข้อมูลบริษัท
 * @param companyId - ID ของบริษัท
 * @param updates - ข้อมูลที่ต้องการอัปเดต
 */
export const updateCompany = async (
    companyId: string,
    updates: Partial<Omit<Company, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
): Promise<void> => {
    try {
        const docRef = doc(db, COMPANIES_COLLECTION, companyId);
        
        // กรอง undefined values ออก เพราะ Firestore ไม่รองรับ undefined
        const cleanedUpdates: any = {};
        Object.entries(updates).forEach(([key, value]) => {
            if (value !== undefined) {
                cleanedUpdates[key] = value;
            }
        });
        
        // เพิ่ม updatedAt
        cleanedUpdates.updatedAt = Timestamp.now();
        
        await updateDoc(docRef, cleanedUpdates);
    } catch {
        throw new Error('ไม่สามารถอัปเดตบริษัทได้');
    }
};

/**
 * ตั้งค่า default logo ของบริษัท
 * @param companyId - ID ของบริษัท
 * @param defaultLogoUrl - URL ของ default logo ที่ต้องการตั้งค่า
 */
export const setCompanyDefaultLogo = async (
    companyId: string,
    defaultLogoUrl: string
): Promise<void> => {
    try {
        const docRef = doc(db, COMPANIES_COLLECTION, companyId);
        await updateDoc(docRef, {
            defaultLogoUrl: defaultLogoUrl,
            updatedAt: Timestamp.now(),
        });
    } catch {
        throw new Error('ไม่สามารถตั้งค่า default logo ได้');
    }
};

/**
 * ลบบริษัท (เฉพาะ Admin เท่านั้น)
 * @param companyId - ID ของบริษัท
 */
export const deleteCompany = async (companyId: string): Promise<void> => {
    try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error('กรุณา Login ก่อนลบบริษัท');
        }

        // ตรวจสอบว่าเป็น Admin หรือไม่
        const company = await getCompanyById(companyId);
        if (!company) {
            throw new Error('ไม่พบบริษัทนี้');
        }

        if (company.userId !== currentUser.uid) {
            throw new Error('เฉพาะ Admin คนแรกเท่านั้นที่สามารถลบบริษัทได้');
        }

        const docRef = doc(db, COMPANIES_COLLECTION, companyId);
        await deleteDoc(docRef);
    } catch (error) {
        throw error;
    }
};
