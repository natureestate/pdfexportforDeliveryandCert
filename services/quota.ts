/**
 * Quota Service
 * บริการจัดการโควตาและแผนการใช้งานของบริษัท
 */

import { db } from '../firebase.config';
import {
    collection,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    query,
    where,
    getDocs,
    Timestamp,
} from 'firebase/firestore';
import { CompanyQuota, SubscriptionPlan, SubscriptionStatus } from '../types';
import { getPlanTemplate, getAllPlanTemplates } from './planTemplates';

// Collection name
const QUOTAS_COLLECTION = 'companyQuotas';

/**
 * Default quotas สำหรับแต่ละแผน
 */
const DEFAULT_QUOTAS: Record<SubscriptionPlan, Omit<CompanyQuota, 'startDate' | 'createdAt' | 'updatedAt'>> = {
    free: {
        plan: 'free',
        status: 'active',
        maxCompanies: 1,             // สร้างได้แค่ 1 องค์กร
        currentCompanies: 0,
        maxUsers: 3,                 // สูงสุด 3 คน
        currentUsers: 0,
        maxDocuments: 50,            // 50 เอกสาร/เดือน
        currentDocuments: 0,
        maxLogos: 1,                 // 1 โลโก้
        currentLogos: 0,
        allowCustomLogo: false,      // ไม่อนุญาตให้ใช้โลโก้กำหนดเอง
        maxStorageMB: 100,           // 100 MB
        currentStorageMB: 0,
        features: {
            multipleProfiles: false,
            apiAccess: false,
            customDomain: false,
            prioritySupport: false,
            exportPDF: true,             // ✅ Free plan สามารถ Export PDF ได้
            exportExcel: false,
            advancedReports: false,
            customTemplates: false,
        },
    },
    basic: {
        plan: 'basic',
        status: 'active',
        maxCompanies: 3,             // สร้างได้สูงสุด 3 องค์กร
        currentCompanies: 0,
        maxUsers: 10,                // สูงสุด 10 คน
        currentUsers: 0,
        maxDocuments: 200,           // 200 เอกสาร/เดือน
        currentDocuments: 0,
        maxLogos: 5,                 // 5 โลโก้
        currentLogos: 0,
        allowCustomLogo: true,       // อนุญาตให้ใช้โลโก้กำหนดเอง
        maxStorageMB: 500,           // 500 MB
        currentStorageMB: 0,
        features: {
            multipleProfiles: true,
            apiAccess: false,
            customDomain: false,
            prioritySupport: false,
            exportPDF: true,
            exportExcel: true,
            advancedReports: false,
            customTemplates: true,
        },
        paymentAmount: 299,          // 299 บาท/เดือน
        currency: 'THB',
    },
    premium: {
        plan: 'premium',
        status: 'active',
        maxCompanies: 10,            // สร้างได้สูงสุด 10 องค์กร
        currentCompanies: 0,
        maxUsers: 50,                // สูงสุด 50 คน
        currentUsers: 0,
        maxDocuments: 1000,          // 1000 เอกสาร/เดือน
        currentDocuments: 0,
        maxLogos: 20,                // 20 โลโก้
        currentLogos: 0,
        allowCustomLogo: true,
        maxStorageMB: 2000,          // 2 GB
        currentStorageMB: 0,
        features: {
            multipleProfiles: true,
            apiAccess: true,
            customDomain: false,
            prioritySupport: true,
            exportPDF: true,
            exportExcel: true,
            advancedReports: true,
            customTemplates: true,
        },
        paymentAmount: 999,          // 999 บาท/เดือน
        currency: 'THB',
    },
    enterprise: {
        plan: 'enterprise',
        status: 'active',
        maxCompanies: -1,            // ไม่จำกัด
        currentCompanies: 0,
        maxUsers: -1,                // ไม่จำกัด
        currentUsers: 0,
        maxDocuments: -1,            // ไม่จำกัด
        currentDocuments: 0,
        maxLogos: -1,                // ไม่จำกัด
        currentLogos: 0,
        allowCustomLogo: true,
        maxStorageMB: -1,            // ไม่จำกัด
        currentStorageMB: 0,
        features: {
            multipleProfiles: true,
            apiAccess: true,
            customDomain: true,
            prioritySupport: true,
            exportPDF: true,
            exportExcel: true,
            advancedReports: true,
            customTemplates: true,
        },
        paymentAmount: 2999,         // 2999 บาท/เดือน
        currency: 'THB',
    },
};

/**
 * สร้าง quota ใหม่สำหรับบริษัท (ใช้ Plan Template แบบ Dynamic)
 * @param companyId - ID ของบริษัท
 * @param plan - แผนที่ต้องการ (default: free)
 * @returns Quota ID
 */
export const createQuota = async (
    companyId: string,
    plan: SubscriptionPlan = 'free'
): Promise<string> => {
    try {
        const quotaRef = doc(db, QUOTAS_COLLECTION, companyId);
        
        // ดึง Plan Template จาก Firestore
        const planTemplate = await getPlanTemplate(plan);
        
        if (!planTemplate) {
            console.warn(`⚠️  ไม่พบ Plan Template: ${plan}, ใช้ default fallback`);
            // Fallback ไปใช้ default หากไม่มี template
            const defaultQuota = DEFAULT_QUOTAS[plan];
            const now = new Date();
            const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
            
            const quotaData: CompanyQuota = {
                ...defaultQuota,
                startDate: now,
                documentResetDate: nextMonth,
                createdAt: now,
                updatedAt: now,
            };

            await setDoc(quotaRef, {
                ...quotaData,
                startDate: Timestamp.fromDate(quotaData.startDate),
                documentResetDate: Timestamp.fromDate(quotaData.documentResetDate!),
                createdAt: Timestamp.fromDate(quotaData.createdAt!),
                updatedAt: Timestamp.fromDate(quotaData.updatedAt!),
            });

            console.log('✅ สร้าง quota สำเร็จ (fallback):', companyId, 'แผน:', plan);
            return companyId;
        }
        
        // สร้าง quota จาก Plan Template
        const now = new Date();
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        
        const quotaData: CompanyQuota = {
            plan: plan,
            status: 'active',
            maxCompanies: planTemplate.maxCompanies ?? DEFAULT_QUOTAS[plan].maxCompanies,  // ใช้จาก template หรือ fallback
            currentCompanies: 0,
            maxUsers: planTemplate.maxUsers,
            currentUsers: 0,
            maxDocuments: planTemplate.maxDocuments,
            currentDocuments: 0,
            documentResetDate: nextMonth,
            maxLogos: planTemplate.maxLogos,
            currentLogos: 0,
            allowCustomLogo: planTemplate.allowCustomLogo,
            maxStorageMB: planTemplate.maxStorageMB,
            currentStorageMB: 0,
            features: planTemplate.features,
            startDate: now,
            createdAt: now,
            updatedAt: now,
        };

        // เพิ่มข้อมูลราคาถ้ามี
        if (planTemplate.price > 0) {
            quotaData.paymentAmount = planTemplate.price;
            quotaData.currency = planTemplate.currency;
        }

        await setDoc(quotaRef, {
            ...quotaData,
            startDate: Timestamp.fromDate(quotaData.startDate),
            documentResetDate: Timestamp.fromDate(quotaData.documentResetDate!),
            createdAt: Timestamp.fromDate(quotaData.createdAt!),
            updatedAt: Timestamp.fromDate(quotaData.updatedAt!),
        });

        console.log('✅ สร้าง quota สำเร็จ:', companyId, 'แผน:', planTemplate.name);
        return companyId;
    } catch (error) {
        console.error('❌ สร้าง quota ล้มเหลว:', error);
        throw new Error('ไม่สามารถสร้าง quota ได้');
    }
};

/**
 * ดึงข้อมูล quota ของบริษัท
 * @param companyId - ID ของบริษัท
 * @returns CompanyQuota หรือ null ถ้าไม่พบ
 */
export const getQuota = async (companyId: string): Promise<CompanyQuota | null> => {
    try {
        const quotaRef = doc(db, QUOTAS_COLLECTION, companyId);
        const quotaSnap = await getDoc(quotaRef);

        if (!quotaSnap.exists()) {
            console.warn('⚠️ ไม่พบ quota สำหรับบริษัท:', companyId);
            return null;
        }

        const data = quotaSnap.data();
        
        // ดึง maxCompanies จาก template หรือใช้ default จาก DEFAULT_QUOTAS
        let maxCompanies = data.maxCompanies;
        if (maxCompanies === undefined || maxCompanies === null) {
            // ถ้าไม่มีใน quota document ให้ดึงจาก template หรือ DEFAULT_QUOTAS
            const planTemplate = await getPlanTemplate(data.plan);
            if (planTemplate && planTemplate.maxCompanies !== undefined) {
                maxCompanies = planTemplate.maxCompanies;
            } else {
                maxCompanies = DEFAULT_QUOTAS[data.plan as SubscriptionPlan]?.maxCompanies ?? 1;
            }
        }
        
        return {
            plan: data.plan,
            status: data.status,
            maxCompanies: maxCompanies,
            currentCompanies: data.currentCompanies ?? 0,
            maxUsers: data.maxUsers,
            currentUsers: data.currentUsers,
            maxDocuments: data.maxDocuments,
            currentDocuments: data.currentDocuments,
            documentResetDate: data.documentResetDate?.toDate(),
            maxLogos: data.maxLogos,
            currentLogos: data.currentLogos,
            allowCustomLogo: data.allowCustomLogo,
            maxStorageMB: data.maxStorageMB,
            currentStorageMB: data.currentStorageMB,
            features: data.features,
            startDate: data.startDate?.toDate(),
            endDate: data.endDate?.toDate(),
            trialEndDate: data.trialEndDate?.toDate(),
            lastPaymentDate: data.lastPaymentDate?.toDate(),
            nextPaymentDate: data.nextPaymentDate?.toDate(),
            paymentAmount: data.paymentAmount,
            currency: data.currency,
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate(),
            updatedBy: data.updatedBy,
            notes: data.notes,
        } as CompanyQuota;
    } catch (error) {
        console.error('❌ ดึงข้อมูล quota ล้มเหลว:', error);
        throw new Error('ไม่สามารถดึงข้อมูล quota ได้');
    }
};

/**
 * อัปเดต quota
 * @param companyId - ID ของบริษัท
 * @param updates - ข้อมูลที่ต้องการอัปเดต
 * @param updatedBy - User ID ของผู้อัปเดต
 */
export const updateQuota = async (
    companyId: string,
    updates: Partial<CompanyQuota>,
    updatedBy?: string
): Promise<void> => {
    try {
        const quotaRef = doc(db, QUOTAS_COLLECTION, companyId);
        
        const updateData: any = {
            ...updates,
            updatedAt: Timestamp.now(),
        };

        if (updatedBy) {
            updateData.updatedBy = updatedBy;
        }

        // แปลง Date เป็น Timestamp
        if (updates.startDate) updateData.startDate = Timestamp.fromDate(updates.startDate);
        if (updates.endDate) updateData.endDate = Timestamp.fromDate(updates.endDate);
        if (updates.trialEndDate) updateData.trialEndDate = Timestamp.fromDate(updates.trialEndDate);
        if (updates.documentResetDate) updateData.documentResetDate = Timestamp.fromDate(updates.documentResetDate);
        if (updates.lastPaymentDate) updateData.lastPaymentDate = Timestamp.fromDate(updates.lastPaymentDate);
        if (updates.nextPaymentDate) updateData.nextPaymentDate = Timestamp.fromDate(updates.nextPaymentDate);

        await updateDoc(quotaRef, updateData);

        console.log('✅ อัปเดต quota สำเร็จ:', companyId);
    } catch (error) {
        console.error('❌ อัปเดต quota ล้มเหลว:', error);
        throw new Error('ไม่สามารถอัปเดต quota ได้');
    }
};

/**
 * เปลี่ยนแผนการใช้งาน
 * @param companyId - ID ของบริษัท
 * @param newPlan - แผนใหม่
 * @param updatedBy - User ID ของผู้อัปเดต
 */
export const changePlan = async (
    companyId: string,
    newPlan: SubscriptionPlan,
    updatedBy?: string
): Promise<void> => {
    try {
        const newQuotaDefaults = DEFAULT_QUOTAS[newPlan];
        const currentQuota = await getQuota(companyId);

        if (!currentQuota) {
            throw new Error('ไม่พบ quota ของบริษัทนี้');
        }

        const updates: Partial<CompanyQuota> = {
            plan: newPlan,
            status: 'active',
            maxCompanies: newQuotaDefaults.maxCompanies,  // อัปเดต maxCompanies ด้วย
            maxUsers: newQuotaDefaults.maxUsers,
            maxDocuments: newQuotaDefaults.maxDocuments,
            maxLogos: newQuotaDefaults.maxLogos,
            allowCustomLogo: newQuotaDefaults.allowCustomLogo,
            maxStorageMB: newQuotaDefaults.maxStorageMB,
            features: newQuotaDefaults.features,
            startDate: new Date(),
            paymentAmount: newQuotaDefaults.paymentAmount,
            currency: newQuotaDefaults.currency,
        };

        // ถ้าเป็นแผนที่ต้องจ่ายเงิน ตั้งค่าวันหมดอายุ (30 วัน)
        if (newPlan !== 'free') {
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + 30);
            updates.endDate = endDate;
        }

        await updateQuota(companyId, updates, updatedBy);

        console.log('✅ เปลี่ยนแผนสำเร็จ:', companyId, 'เป็นแผน:', newPlan);
    } catch (error) {
        console.error('❌ เปลี่ยนแผนล้มเหลว:', error);
        throw new Error('ไม่สามารถเปลี่ยนแผนได้');
    }
};

/**
 * ตรวจสอบว่าเกินโควตาหรือไม่
 * @param companyId - ID ของบริษัท
 * @param quotaType - ประเภทโควตา (users, documents, logos, storage)
 * @returns true ถ้าเกินโควตา, false ถ้ายังไม่เกิน
 */
export const checkQuotaExceeded = async (
    companyId: string,
    quotaType: 'users' | 'documents' | 'logos' | 'storage'
): Promise<boolean> => {
    try {
        const quota = await getQuota(companyId);

        if (!quota) {
            console.warn('⚠️ ไม่พบ quota สำหรับบริษัท:', companyId);
            return false;
        }

        switch (quotaType) {
            case 'users':
                return quota.maxUsers !== -1 && quota.currentUsers >= quota.maxUsers;
            case 'documents':
                return quota.maxDocuments !== -1 && quota.currentDocuments >= quota.maxDocuments;
            case 'logos':
                return quota.maxLogos !== -1 && quota.currentLogos >= quota.maxLogos;
            case 'storage':
                return quota.maxStorageMB !== -1 && quota.currentStorageMB >= quota.maxStorageMB;
            default:
                return false;
        }
    } catch (error) {
        console.error('❌ ตรวจสอบโควตาล้มเหลว:', error);
        return false;
    }
};

/**
 * เพิ่มจำนวนการใช้งาน
 * @param companyId - ID ของบริษัท
 * @param quotaType - ประเภทโควตา
 * @param amount - จำนวนที่ต้องการเพิ่ม (default: 1)
 */
export const incrementQuota = async (
    companyId: string,
    quotaType: 'users' | 'documents' | 'logos' | 'storage',
    amount: number = 1
): Promise<void> => {
    try {
        const quota = await getQuota(companyId);

        if (!quota) {
            throw new Error('ไม่พบ quota ของบริษัทนี้');
        }

        const updates: Partial<CompanyQuota> = {};

        switch (quotaType) {
            case 'users':
                updates.currentUsers = quota.currentUsers + amount;
                break;
            case 'documents':
                updates.currentDocuments = quota.currentDocuments + amount;
                break;
            case 'logos':
                updates.currentLogos = quota.currentLogos + amount;
                break;
            case 'storage':
                updates.currentStorageMB = quota.currentStorageMB + amount;
                break;
        }

        await updateQuota(companyId, updates);

        console.log('✅ เพิ่มการใช้งาน', quotaType, 'สำเร็จ:', companyId);
    } catch (error) {
        console.error('❌ เพิ่มการใช้งานล้มเหลว:', error);
        throw new Error('ไม่สามารถเพิ่มการใช้งานได้');
    }
};

/**
 * ลดจำนวนการใช้งาน
 * @param companyId - ID ของบริษัท
 * @param quotaType - ประเภทโควตา
 * @param amount - จำนวนที่ต้องการลด (default: 1)
 */
export const decrementQuota = async (
    companyId: string,
    quotaType: 'users' | 'documents' | 'logos' | 'storage',
    amount: number = 1
): Promise<void> => {
    try {
        const quota = await getQuota(companyId);

        if (!quota) {
            throw new Error('ไม่พบ quota ของบริษัทนี้');
        }

        const updates: Partial<CompanyQuota> = {};

        switch (quotaType) {
            case 'users':
                updates.currentUsers = Math.max(0, quota.currentUsers - amount);
                break;
            case 'documents':
                updates.currentDocuments = Math.max(0, quota.currentDocuments - amount);
                break;
            case 'logos':
                updates.currentLogos = Math.max(0, quota.currentLogos - amount);
                break;
            case 'storage':
                updates.currentStorageMB = Math.max(0, quota.currentStorageMB - amount);
                break;
        }

        await updateQuota(companyId, updates);

        console.log('✅ ลดการใช้งาน', quotaType, 'สำเร็จ:', companyId);
    } catch (error) {
        console.error('❌ ลดการใช้งานล้มเหลว:', error);
        throw new Error('ไม่สามารถลดการใช้งานได้');
    }
};

/**
 * รีเซ็ตจำนวนเอกสารรายเดือน
 * @param companyId - ID ของบริษัท
 */
export const resetMonthlyDocuments = async (companyId: string): Promise<void> => {
    try {
        const now = new Date();
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

        await updateQuota(companyId, {
            currentDocuments: 0,
            documentResetDate: nextMonth,
        });

        console.log('✅ รีเซ็ตจำนวนเอกสารสำเร็จ:', companyId);
    } catch (error) {
        console.error('❌ รีเซ็ตจำนวนเอกสารล้มเหลว:', error);
        throw new Error('ไม่สามารถรีเซ็ตจำนวนเอกสารได้');
    }
};

/**
 * ดึงรายการบริษัททั้งหมดพร้อม quota (สำหรับ Super Admin)
 * @returns Array ของ CompanyQuota พร้อม companyId
 */
export const getAllQuotas = async (): Promise<(CompanyQuota & { companyId: string })[]> => {
    try {
        const quotasRef = collection(db, QUOTAS_COLLECTION);
        const querySnapshot = await getDocs(quotasRef);

        const quotas: (CompanyQuota & { companyId: string })[] = [];

        for (const doc of querySnapshot.docs) {
            const data = doc.data();
            quotas.push({
                companyId: doc.id,
                plan: data.plan,
                status: data.status,
                maxCompanies: data.maxCompanies ?? 1,
                currentCompanies: data.currentCompanies ?? 0,
                maxUsers: data.maxUsers,
                currentUsers: data.currentUsers,
                maxDocuments: data.maxDocuments,
                currentDocuments: data.currentDocuments,
                documentResetDate: data.documentResetDate?.toDate(),
                maxLogos: data.maxLogos,
                currentLogos: data.currentLogos,
                allowCustomLogo: data.allowCustomLogo,
                maxStorageMB: data.maxStorageMB,
                currentStorageMB: data.currentStorageMB,
                features: data.features,
                startDate: data.startDate?.toDate(),
                endDate: data.endDate?.toDate(),
                trialEndDate: data.trialEndDate?.toDate(),
                lastPaymentDate: data.lastPaymentDate?.toDate(),
                nextPaymentDate: data.nextPaymentDate?.toDate(),
                paymentAmount: data.paymentAmount,
                currency: data.currency,
                createdAt: data.createdAt?.toDate(),
                updatedAt: data.updatedAt?.toDate(),
                updatedBy: data.updatedBy,
                notes: data.notes,
            });
        }

        console.log('✅ ดึงรายการ quotas ทั้งหมดสำเร็จ:', quotas.length);
        return quotas;
    } catch (error) {
        console.error('❌ ดึงรายการ quotas ล้มเหลว:', error);
        throw new Error('ไม่สามารถดึงรายการ quotas ได้');
    }
};

/**
 * ดึงรายการบริษัทที่หมดอายุ
 * @returns Array ของ companyId ที่หมดอายุ
 */
export const getExpiredQuotas = async (): Promise<string[]> => {
    try {
        const quotasRef = collection(db, QUOTAS_COLLECTION);
        const q = query(
            quotasRef,
            where('status', '==', 'expired')
        );

        const querySnapshot = await getDocs(q);
        const expiredIds = querySnapshot.docs.map(doc => doc.id);

        console.log('✅ ดึงรายการที่หมดอายุสำเร็จ:', expiredIds.length);
        return expiredIds;
    } catch (error) {
        console.error('❌ ดึงรายการที่หมดอายุล้มเหลว:', error);
        throw new Error('ไม่สามารถดึงรายการที่หมดอายุได้');
    }
};

/**
 * ตรวจสอบว่า user สามารถสร้างบริษัทใหม่ได้หรือไม่
 * @param userId - User ID
 * @returns { canCreate: boolean, reason?: string, currentCount: number, maxCount: number }
 */
export const canCreateCompany = async (userId: string): Promise<{
    canCreate: boolean;
    reason?: string;
    currentCount: number;
    maxCount: number;
    plan?: string;
}> => {
    try {
        // ดึงรายการบริษัททั้งหมดของ user
        const companiesRef = collection(db, 'companies');
        const q = query(companiesRef, where('userId', '==', userId));
        const companiesSnapshot = await getDocs(q);
        const currentCount = companiesSnapshot.size;

        console.log(`📊 [canCreateCompany] User ${userId} มีบริษัท: ${currentCount} บริษัท`);

        // ถ้ายังไม่มีบริษัทเลย อนุญาตให้สร้างได้เสมอ (บริษัทแรก)
        if (currentCount === 0) {
            console.log('✅ [canCreateCompany] อนุญาตให้สร้างบริษัทแรก');
            return {
                canCreate: true,
                currentCount: 0,
                maxCount: 1,
            };
        }

        // ดึง quota ของบริษัทแรก (ใช้ quota ของบริษัทแรกเป็นตัวกำหนด)
        const firstCompanyId = companiesSnapshot.docs[0].id;
        const quota = await getQuota(firstCompanyId);

        if (!quota) {
            console.warn('⚠️ [canCreateCompany] ไม่พบ quota สำหรับบริษัท:', firstCompanyId);
            // ถ้าไม่มี quota ให้อนุญาตสร้างได้ 1 บริษัท (Free Plan default)
            if (currentCount >= 1) {
                return {
                    canCreate: false,
                    reason: 'Free Plan สามารถสร้างได้แค่ 1 องค์กร กรุณาอัปเกรดแผนเพื่อสร้างองค์กรเพิ่มเติม',
                    currentCount,
                    maxCount: 1,
                    plan: 'free',
                };
            }
            return {
                canCreate: true,
                currentCount,
                maxCount: 1,
            };
        }

        const maxCompanies = quota.maxCompanies;
        const plan = quota.plan;

        console.log(`📊 [canCreateCompany] แผน: ${plan}, สร้างได้สูงสุด: ${maxCompanies === -1 ? 'ไม่จำกัด' : maxCompanies}`);

        // ตรวจสอบว่าเกินโควตาหรือไม่
        if (maxCompanies === -1) {
            // ไม่จำกัด (Enterprise)
            console.log('✅ [canCreateCompany] แผน Enterprise - ไม่จำกัดจำนวนองค์กร');
            return {
                canCreate: true,
                currentCount,
                maxCount: -1,
                plan,
            };
        }

        if (currentCount >= maxCompanies) {
            console.log(`❌ [canCreateCompany] เกินโควตา: ${currentCount}/${maxCompanies}`);
            return {
                canCreate: false,
                reason: `แผน ${plan.toUpperCase()} สามารถสร้างได้สูงสุด ${maxCompanies} องค์กร (ปัจจุบันมี ${currentCount} องค์กร) กรุณาอัปเกรดแผนเพื่อสร้างองค์กรเพิ่มเติม`,
                currentCount,
                maxCount: maxCompanies,
                plan,
            };
        }

        console.log(`✅ [canCreateCompany] สามารถสร้างได้: ${currentCount}/${maxCompanies}`);
        return {
            canCreate: true,
            currentCount,
            maxCount: maxCompanies,
            plan,
        };

    } catch (error) {
        console.error('❌ ตรวจสอบสิทธิ์สร้างบริษัทล้มเหลว:', error);
        throw new Error('ไม่สามารถตรวจสอบสิทธิ์สร้างบริษัทได้');
    }
};

/**
 * เพิ่มจำนวนบริษัทปัจจุบันใน quota
 * @param companyId - ID ของบริษัท
 */
export const incrementCompanyCount = async (companyId: string): Promise<void> => {
    try {
        const quotaRef = doc(db, QUOTAS_COLLECTION, companyId);
        const quotaSnap = await getDoc(quotaRef);

        if (!quotaSnap.exists()) {
            console.warn('⚠️ ไม่พบ quota สำหรับบริษัท:', companyId);
            return;
        }

        const currentCount = quotaSnap.data().currentCompanies ?? 0;
        await updateDoc(quotaRef, {
            currentCompanies: currentCount + 1,
            updatedAt: Timestamp.now(),
        });

        console.log(`✅ เพิ่มจำนวนบริษัทสำเร็จ: ${currentCount} -> ${currentCount + 1}`);
    } catch (error) {
        console.error('❌ เพิ่มจำนวนบริษัทล้มเหลว:', error);
        throw new Error('ไม่สามารถเพิ่มจำนวนบริษัทได้');
    }
};

/**
 * ลดจำนวนบริษัทปัจจุบันใน quota
 * @param companyId - ID ของบริษัท
 */
export const decrementCompanyCount = async (companyId: string): Promise<void> => {
    try {
        const quotaRef = doc(db, QUOTAS_COLLECTION, companyId);
        const quotaSnap = await getDoc(quotaRef);

        if (!quotaSnap.exists()) {
            console.warn('⚠️ ไม่พบ quota สำหรับบริษัท:', companyId);
            return;
        }

        const currentCount = quotaSnap.data().currentCompanies ?? 0;
        const newCount = Math.max(0, currentCount - 1); // ป้องกันติดลบ

        await updateDoc(quotaRef, {
            currentCompanies: newCount,
            updatedAt: Timestamp.now(),
        });

        console.log(`✅ ลดจำนวนบริษัทสำเร็จ: ${currentCount} -> ${newCount}`);
    } catch (error) {
        console.error('❌ ลดจำนวนบริษัทล้มเหลว:', error);
        throw new Error('ไม่สามารถลดจำนวนบริษัทได้');
    }
};

