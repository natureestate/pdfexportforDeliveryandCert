/**
 * Quota Service
 * บริการจัดการโควตาและแผนการใช้งานของบริษัท
 * 
 * อัปเดต: รองรับ Pricing Plan ใหม่ 4 ระดับ
 * - Free (ทดลองใช้)
 * - Starter (199 บาท/เดือน)
 * - Business (499 บาท/เดือน)
 * - Enterprise (ติดต่อฝ่ายขาย)
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
import { CompanyQuota, SubscriptionPlan, SubscriptionStatus, BillingCycle, DocumentAccessLevel } from '../types';
import { getPlanTemplate, getAllPlanTemplates } from './planTemplates';

// Collection name
const QUOTAS_COLLECTION = 'companyQuotas';

/**
 * Default quotas สำหรับแต่ละแผน (ตาม Pricing Plan ใหม่)
 * 
 * Free: 1 user, 15 docs/เดือน, เอกสารพื้นฐาน, มีลายน้ำ, CRM 10, ช่าง 2, PDF 20 ครั้ง, ประวัติ 7 วัน
 * Starter: 1 user, docs ไม่จำกัด, ครบทุกประเภท, ไม่มีลายน้ำ, CRM 100, ช่าง 20, PDF ไม่จำกัด, ประวัติ 1 ปี
 * Business: 5 users, docs ไม่จำกัด, ครบทุกประเภท, ไม่มีลายน้ำ, CRM ไม่จำกัด, ช่าง ไม่จำกัด, PDF ไม่จำกัด, ประวัติ 3 ปี
 * Enterprise: ไม่จำกัดทุกอย่าง, Audit Log
 */
const DEFAULT_QUOTAS: Record<SubscriptionPlan, Omit<CompanyQuota, 'startDate' | 'createdAt' | 'updatedAt'>> = {
    free: {
        plan: 'free',
        status: 'active',
        maxCompanies: 1,
        currentCompanies: 0,
        maxUsers: 1,
        currentUsers: 0,
        maxDocuments: 15,
        currentDocuments: 0,
        maxLogos: 1,
        currentLogos: 0,
        allowCustomLogo: false,
        maxStorageMB: 50,
        currentStorageMB: 0,
        maxCustomers: 10,
        currentCustomers: 0,
        maxContractors: 2,
        currentContractors: 0,
        maxPdfExports: 20,
        currentPdfExports: 0,
        historyRetentionDays: 7,
        features: {
            multipleProfiles: false,
            apiAccess: false,
            customDomain: false,
            prioritySupport: false,
            exportPDF: true,
            exportExcel: false,
            advancedReports: false,
            customTemplates: false,
            documentAccess: 'basic' as DocumentAccessLevel,
            hasWatermark: true,
            lineNotification: false,
            dedicatedSupport: false,
            auditLog: false,
        },
    },
    starter: {
        plan: 'starter',
        status: 'active',
        maxCompanies: 1,
        currentCompanies: 0,
        maxUsers: 1,
        currentUsers: 0,
        maxDocuments: -1,           // ไม่จำกัด
        currentDocuments: 0,
        maxLogos: 5,
        currentLogos: 0,
        allowCustomLogo: true,
        maxStorageMB: 500,
        currentStorageMB: 0,
        maxCustomers: 100,
        currentCustomers: 0,
        maxContractors: 20,
        currentContractors: 0,
        maxPdfExports: -1,          // ไม่จำกัด
        currentPdfExports: 0,
        historyRetentionDays: 365,  // 1 ปี
        features: {
            multipleProfiles: false,
            apiAccess: false,
            customDomain: false,
            prioritySupport: false,
            exportPDF: true,
            exportExcel: true,
            advancedReports: false,
            customTemplates: true,
            documentAccess: 'full' as DocumentAccessLevel,
            hasWatermark: false,
            lineNotification: false,
            dedicatedSupport: false,
            auditLog: false,
        },
        paymentAmount: 199,
        currency: 'THB',
    },
    business: {
        plan: 'business',
        status: 'active',
        maxCompanies: 3,
        currentCompanies: 0,
        maxUsers: 5,
        currentUsers: 0,
        maxDocuments: -1,           // ไม่จำกัด
        currentDocuments: 0,
        maxLogos: 20,
        currentLogos: 0,
        allowCustomLogo: true,
        maxStorageMB: 2000,
        currentStorageMB: 0,
        maxCustomers: -1,           // ไม่จำกัด
        currentCustomers: 0,
        maxContractors: -1,         // ไม่จำกัด
        currentContractors: 0,
        maxPdfExports: -1,          // ไม่จำกัด
        currentPdfExports: 0,
        historyRetentionDays: 1095, // 3 ปี
        features: {
            multipleProfiles: true,
            apiAccess: false,
            customDomain: false,
            prioritySupport: true,
            exportPDF: true,
            exportExcel: true,
            advancedReports: true,
            customTemplates: true,
            documentAccess: 'full' as DocumentAccessLevel,
            hasWatermark: false,
            lineNotification: true,
            dedicatedSupport: false,
            auditLog: false,
        },
        paymentAmount: 499,
        currency: 'THB',
    },
    enterprise: {
        plan: 'enterprise',
        status: 'active',
        maxCompanies: -1,           // ไม่จำกัด
        currentCompanies: 0,
        maxUsers: -1,               // ไม่จำกัด
        currentUsers: 0,
        maxDocuments: -1,           // ไม่จำกัด
        currentDocuments: 0,
        maxLogos: -1,               // ไม่จำกัด
        currentLogos: 0,
        allowCustomLogo: true,
        maxStorageMB: -1,           // ไม่จำกัด
        currentStorageMB: 0,
        maxCustomers: -1,           // ไม่จำกัด
        currentCustomers: 0,
        maxContractors: -1,         // ไม่จำกัด
        currentContractors: 0,
        maxPdfExports: -1,          // ไม่จำกัด
        currentPdfExports: 0,
        historyRetentionDays: -1,   // Audit Log (ไม่จำกัด)
        features: {
            multipleProfiles: true,
            apiAccess: true,
            customDomain: true,
            prioritySupport: true,
            exportPDF: true,
            exportExcel: true,
            advancedReports: true,
            customTemplates: true,
            documentAccess: 'full' as DocumentAccessLevel,
            hasWatermark: false,
            lineNotification: true,
            dedicatedSupport: true,
            auditLog: true,
        },
        paymentAmount: -1,          // ติดต่อฝ่ายขาย
        currency: 'THB',
    },
};

/**
 * สร้าง quota ใหม่สำหรับบริษัท (ใช้ Plan Template แบบ Dynamic)
 * @param companyId - ID ของบริษัท
 * @param plan - แผนที่ต้องการ (default: free)
 * @param billingCycle - รอบการเรียกเก็บเงิน (default: monthly)
 * @returns Quota ID
 */
export const createQuota = async (
    companyId: string,
    plan: SubscriptionPlan = 'free',
    billingCycle: BillingCycle = 'monthly'
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
                billingCycle,
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
            billingCycle,
            maxCompanies: planTemplate.maxCompanies ?? DEFAULT_QUOTAS[plan].maxCompanies,
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
            maxCustomers: planTemplate.maxCustomers ?? 10,
            currentCustomers: 0,
            maxContractors: planTemplate.maxContractors ?? 2,
            currentContractors: 0,
            maxPdfExports: planTemplate.maxPdfExports ?? 20,
            currentPdfExports: 0,
            historyRetentionDays: planTemplate.historyRetentionDays ?? 7,
            features: {
                ...planTemplate.features,
                documentAccess: planTemplate.features.documentAccess ?? 'basic',
                hasWatermark: planTemplate.features.hasWatermark ?? true,
                lineNotification: planTemplate.features.lineNotification ?? false,
                dedicatedSupport: planTemplate.features.dedicatedSupport ?? false,
                auditLog: planTemplate.features.auditLog ?? false,
            },
            startDate: now,
            createdAt: now,
            updatedAt: now,
        };

        // เพิ่มข้อมูลราคาถ้ามี
        if (planTemplate.priceMonthly > 0) {
            quotaData.paymentAmount = billingCycle === 'yearly' 
                ? planTemplate.priceYearly 
                : planTemplate.priceMonthly;
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
            billingCycle: data.billingCycle,
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
            maxCustomers: data.maxCustomers ?? 10,
            currentCustomers: data.currentCustomers ?? 0,
            maxContractors: data.maxContractors ?? 2,
            currentContractors: data.currentContractors ?? 0,
            maxPdfExports: data.maxPdfExports ?? 20,
            currentPdfExports: data.currentPdfExports ?? 0,
            historyRetentionDays: data.historyRetentionDays ?? 7,
            features: {
                multipleProfiles: data.features?.multipleProfiles ?? false,
                apiAccess: data.features?.apiAccess ?? false,
                customDomain: data.features?.customDomain ?? false,
                prioritySupport: data.features?.prioritySupport ?? false,
                exportPDF: data.features?.exportPDF ?? true,
                exportExcel: data.features?.exportExcel ?? false,
                advancedReports: data.features?.advancedReports ?? false,
                customTemplates: data.features?.customTemplates ?? false,
                documentAccess: data.features?.documentAccess ?? 'basic',
                hasWatermark: data.features?.hasWatermark ?? true,
                lineNotification: data.features?.lineNotification ?? false,
                dedicatedSupport: data.features?.dedicatedSupport ?? false,
                auditLog: data.features?.auditLog ?? false,
            },
            startDate: data.startDate?.toDate(),
            endDate: data.endDate?.toDate(),
            trialEndDate: data.trialEndDate?.toDate(),
            lastPaymentDate: data.lastPaymentDate?.toDate(),
            nextPaymentDate: data.nextPaymentDate?.toDate(),
            paymentAmount: data.paymentAmount,
            currency: data.currency,
            stripeCustomerId: data.stripeCustomerId,
            stripeSubscriptionId: data.stripeSubscriptionId,
            stripePriceId: data.stripePriceId,
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
 * @param billingCycle - รอบการเรียกเก็บเงิน
 * @param updatedBy - User ID ของผู้อัปเดต
 */
export const changePlan = async (
    companyId: string,
    newPlan: SubscriptionPlan,
    billingCycle: BillingCycle = 'monthly',
    updatedBy?: string
): Promise<void> => {
    try {
        const newQuotaDefaults = DEFAULT_QUOTAS[newPlan];
        const currentQuota = await getQuota(companyId);

        if (!currentQuota) {
            throw new Error('ไม่พบ quota ของบริษัทนี้');
        }

        // ดึง Plan Template
        const planTemplate = await getPlanTemplate(newPlan);

        const updates: Partial<CompanyQuota> = {
            plan: newPlan,
            status: 'active',
            billingCycle,
            maxCompanies: planTemplate?.maxCompanies ?? newQuotaDefaults.maxCompanies,
            maxUsers: planTemplate?.maxUsers ?? newQuotaDefaults.maxUsers,
            maxDocuments: planTemplate?.maxDocuments ?? newQuotaDefaults.maxDocuments,
            maxLogos: planTemplate?.maxLogos ?? newQuotaDefaults.maxLogos,
            allowCustomLogo: planTemplate?.allowCustomLogo ?? newQuotaDefaults.allowCustomLogo,
            maxStorageMB: planTemplate?.maxStorageMB ?? newQuotaDefaults.maxStorageMB,
            maxCustomers: planTemplate?.maxCustomers ?? newQuotaDefaults.maxCustomers,
            maxContractors: planTemplate?.maxContractors ?? newQuotaDefaults.maxContractors,
            maxPdfExports: planTemplate?.maxPdfExports ?? newQuotaDefaults.maxPdfExports,
            historyRetentionDays: planTemplate?.historyRetentionDays ?? newQuotaDefaults.historyRetentionDays,
            features: planTemplate?.features ?? newQuotaDefaults.features,
            startDate: new Date(),
        };

        // เพิ่มข้อมูลราคาถ้าไม่ใช่ Free plan
        if (newPlan !== 'free' && planTemplate) {
            updates.paymentAmount = billingCycle === 'yearly' 
                ? planTemplate.priceYearly 
                : planTemplate.priceMonthly;
            updates.currency = planTemplate.currency;
            
            // ตั้งค่าวันหมดอายุ
            const endDate = new Date();
            if (billingCycle === 'yearly') {
                endDate.setFullYear(endDate.getFullYear() + 1);
            } else {
                endDate.setMonth(endDate.getMonth() + 1);
            }
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
 * @param quotaType - ประเภทโควตา
 * @returns true ถ้าเกินโควตา, false ถ้ายังไม่เกิน
 */
export const checkQuotaExceeded = async (
    companyId: string,
    quotaType: 'users' | 'documents' | 'logos' | 'storage' | 'customers' | 'contractors' | 'pdfExports'
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
            case 'customers':
                return quota.maxCustomers !== -1 && quota.currentCustomers >= quota.maxCustomers;
            case 'contractors':
                return quota.maxContractors !== -1 && quota.currentContractors >= quota.maxContractors;
            case 'pdfExports':
                return quota.maxPdfExports !== -1 && quota.currentPdfExports >= quota.maxPdfExports;
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
    quotaType: 'users' | 'documents' | 'logos' | 'storage' | 'customers' | 'contractors' | 'pdfExports',
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
            case 'customers':
                updates.currentCustomers = (quota.currentCustomers || 0) + amount;
                break;
            case 'contractors':
                updates.currentContractors = (quota.currentContractors || 0) + amount;
                break;
            case 'pdfExports':
                updates.currentPdfExports = (quota.currentPdfExports || 0) + amount;
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
    quotaType: 'users' | 'documents' | 'logos' | 'storage' | 'customers' | 'contractors' | 'pdfExports',
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
            case 'customers':
                updates.currentCustomers = Math.max(0, (quota.currentCustomers || 0) - amount);
                break;
            case 'contractors':
                updates.currentContractors = Math.max(0, (quota.currentContractors || 0) - amount);
                break;
            case 'pdfExports':
                updates.currentPdfExports = Math.max(0, (quota.currentPdfExports || 0) - amount);
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
 * รีเซ็ตจำนวนเอกสารและ PDF exports รายเดือน
 * @param companyId - ID ของบริษัท
 */
export const resetMonthlyQuotas = async (companyId: string): Promise<void> => {
    try {
        const now = new Date();
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

        await updateQuota(companyId, {
            currentDocuments: 0,
            currentPdfExports: 0,
            documentResetDate: nextMonth,
        });

        console.log('✅ รีเซ็ตโควตารายเดือนสำเร็จ:', companyId);
    } catch (error) {
        console.error('❌ รีเซ็ตโควตารายเดือนล้มเหลว:', error);
        throw new Error('ไม่สามารถรีเซ็ตโควตารายเดือนได้');
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

        for (const docSnap of querySnapshot.docs) {
            const data = docSnap.data();
            quotas.push({
                companyId: docSnap.id,
                plan: data.plan,
                status: data.status,
                billingCycle: data.billingCycle,
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
                maxCustomers: data.maxCustomers ?? 10,
                currentCustomers: data.currentCustomers ?? 0,
                maxContractors: data.maxContractors ?? 2,
                currentContractors: data.currentContractors ?? 0,
                maxPdfExports: data.maxPdfExports ?? 20,
                currentPdfExports: data.currentPdfExports ?? 0,
                historyRetentionDays: data.historyRetentionDays ?? 7,
                features: data.features ?? DEFAULT_QUOTAS.free.features,
                startDate: data.startDate?.toDate(),
                endDate: data.endDate?.toDate(),
                trialEndDate: data.trialEndDate?.toDate(),
                lastPaymentDate: data.lastPaymentDate?.toDate(),
                nextPaymentDate: data.nextPaymentDate?.toDate(),
                paymentAmount: data.paymentAmount,
                currency: data.currency,
                stripeCustomerId: data.stripeCustomerId,
                stripeSubscriptionId: data.stripeSubscriptionId,
                stripePriceId: data.stripePriceId,
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
 * ตรวจสอบว่าสามารถใช้ประเภทเอกสารได้หรือไม่
 * @param companyId - ID ของบริษัท
 * @param documentType - ประเภทเอกสาร
 * @returns boolean
 */
export const canUseDocumentType = async (
    companyId: string,
    documentType: string
): Promise<boolean> => {
    try {
        const quota = await getQuota(companyId);
        
        if (!quota) {
            return false;
        }
        
        // ถ้าเป็น full access ใช้ได้ทุกประเภท
        if (quota.features.documentAccess === 'full') {
            return true;
        }
        
        // ถ้าเป็น basic access ใช้ได้เฉพาะ quotation และ receipt
        const basicDocTypes = ['quotation', 'receipt', 'invoice'];
        return basicDocTypes.includes(documentType);
    } catch (error) {
        console.error('❌ ตรวจสอบสิทธิ์เอกสารล้มเหลว:', error);
        return false;
    }
};

/**
 * ตรวจสอบว่าสามารถ export PDF ได้หรือไม่
 * @param companyId - ID ของบริษัท
 * @returns { canExport: boolean, remaining: number }
 */
export const canExportPdf = async (companyId: string): Promise<{
    canExport: boolean;
    remaining: number;
}> => {
    try {
        const quota = await getQuota(companyId);
        
        if (!quota) {
            return { canExport: false, remaining: 0 };
        }
        
        // ถ้าไม่จำกัด
        if (quota.maxPdfExports === -1) {
            return { canExport: true, remaining: -1 };
        }
        
        const remaining = quota.maxPdfExports - quota.currentPdfExports;
        return {
            canExport: remaining > 0,
            remaining: Math.max(0, remaining),
        };
    } catch (error) {
        console.error('❌ ตรวจสอบสิทธิ์ export PDF ล้มเหลว:', error);
        return { canExport: false, remaining: 0 };
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

// Export DEFAULT_QUOTAS สำหรับใช้ในที่อื่น
export { DEFAULT_QUOTAS };
