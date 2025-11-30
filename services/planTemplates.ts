/**
 * Plan Templates Service
 * บริการจัดการ Template แผนการใช้งาน (แก้ไขได้แบบ Dynamic)
 * 
 * อัปเดต: รองรับ Pricing Plan ใหม่ 4 ระดับ
 * - Free (ทดลองใช้)
 * - Starter (199 บาท/เดือน) - สำหรับผู้เริ่มทำธุรกิจ
 * - Business (499 บาท/เดือน) - สำหรับ SME/ทีมงาน
 * - Enterprise (ติดต่อฝ่ายขาย) - สำหรับองค์กรใหญ่
 */

import { db } from '../firebase.config';
import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    deleteDoc,
    Timestamp,
} from 'firebase/firestore';
import { SubscriptionPlan, BillingCycle, DocumentAccessLevel } from '../types';

// Collection name
const PLAN_TEMPLATES_COLLECTION = 'planTemplates';

/**
 * Plan Template Interface
 * อัปเดต: เพิ่ม fields ใหม่สำหรับ pricing plan ใหม่
 */
export interface PlanTemplate {
    id?: string;                      // Plan ID (free, starter, business, enterprise)
    name: string;                     // ชื่อแผน (แสดงใน UI)
    nameTh: string;                   // ชื่อแผนภาษาไทย
    description: string;              // คำอธิบายแผน
    descriptionTh: string;            // คำอธิบายภาษาไทย
    
    // โควตา
    maxCompanies: number;             // จำนวนองค์กรสูงสุดที่สร้างได้ (-1 = ไม่จำกัด)
    maxUsers: number;                 // จำนวนผู้ใช้สูงสุด (-1 = ไม่จำกัด)
    maxDocuments: number;             // จำนวนเอกสารต่อเดือน (-1 = ไม่จำกัด)
    maxLogos: number;                 // จำนวนโลโก้ (-1 = ไม่จำกัด)
    maxStorageMB: number;             // Storage ใน MB (-1 = ไม่จำกัด)
    allowCustomLogo: boolean;         // อนุญาตโลโก้กำหนดเอง
    
    // โควตาใหม่ตาม Pricing Plan
    maxCustomers: number;             // จำนวนลูกค้า CRM สูงสุด (-1 = ไม่จำกัด)
    maxContractors: number;           // จำนวนช่าง/ผู้รับเหมาสูงสุด (-1 = ไม่จำกัด)
    maxPdfExports: number;            // จำนวน export PDF ต่อเดือน (-1 = ไม่จำกัด)
    historyRetentionDays: number;     // จำนวนวันที่เก็บประวัติเอกสาร (-1 = Audit Log)
    
    // Features
    features: {
        multipleProfiles: boolean;
        apiAccess: boolean;
        customDomain: boolean;
        prioritySupport: boolean;
        exportPDF: boolean;
        exportExcel: boolean;
        advancedReports: boolean;
        customTemplates: boolean;
        documentAccess: DocumentAccessLevel;  // 'basic' หรือ 'full'
        hasWatermark: boolean;                // มีลายน้ำหรือไม่
        lineNotification: boolean;            // แจ้งเตือนผ่าน Line
        dedicatedSupport: boolean;            // ผู้ดูแลส่วนตัว
        auditLog: boolean;                    // Audit Log เต็มรูปแบบ
    };
    
    // ราคา
    priceMonthly: number;             // ราคารายเดือน (0 = ฟรี, -1 = ติดต่อฝ่ายขาย)
    priceYearly: number;              // ราคารายปี (ลด 30%)
    price: number;                    // ราคาเริ่มต้น (สำหรับ backward compatibility)
    currency: string;                 // สกุลเงิน
    
    // Stripe IDs
    stripeProductId?: string;         // Stripe Product ID
    stripePriceMonthlyId?: string;    // Stripe Price ID (รายเดือน)
    stripePriceYearlyId?: string;     // Stripe Price ID (รายปี)
    
    // การแสดงผล
    displayOrder: number;             // ลำดับการแสดง
    isActive: boolean;                // เปิดใช้งานหรือไม่
    isPopular: boolean;               // แผนยอดนิยม
    color: string;                    // สีของแผน (สำหรับ UI)
    badge?: string;                   // Badge พิเศษ (เช่น "ยอดนิยม", "คุ้มค่า")
    
    // จุดเด่นของแผน (สำหรับแสดงใน Pricing Page)
    highlights: string[];             // จุดเด่นของแผน
    
    // Metadata
    createdAt?: Date;
    updatedAt?: Date;
    updatedBy?: string;
}

/**
 * Default Plan Templates ตาม Pricing Plan ใหม่
 * 
 * Free (ทดลองใช้):
 * - 1 ผู้ใช้, 15 เอกสาร/เดือน, เอกสารพื้นฐาน, มีลายน้ำ
 * - CRM 10 ราย, ช่าง 2 ราย, Export PDF 20 ครั้ง, ประวัติ 7 วัน
 * 
 * Starter (199 บาท/เดือน, รายปี 1,690 บาท):
 * - 1 ผู้ใช้, เอกสารไม่จำกัด, ครบทุกประเภท, ไม่มีลายน้ำ
 * - CRM 100 ราย, ช่าง 20 ราย, Export PDF ไม่จำกัด, ประวัติ 1 ปี
 * 
 * Business (499 บาท/เดือน, รายปี 4,190 บาท):
 * - 5 ผู้ใช้, เอกสารไม่จำกัด, ครบทุกประเภท, ไม่มีลายน้ำ
 * - CRM ไม่จำกัด, ช่าง ไม่จำกัด, Export PDF ไม่จำกัด, ประวัติ 3 ปี
 * 
 * Enterprise (ติดต่อฝ่ายขาย):
 * - ผู้ใช้ไม่จำกัด, ทุกอย่างไม่จำกัด, Audit Log เต็มรูปแบบ
 */
const DEFAULT_PLAN_TEMPLATES: Record<SubscriptionPlan, Omit<PlanTemplate, 'createdAt' | 'updatedAt'>> = {
    free: {
        id: 'free',
        name: 'Free',
        nameTh: 'ทดลองใช้',
        description: 'Perfect for trying out our service',
        descriptionTh: 'เหมาะสำหรับทดลองใช้งานระบบ',
        
        // โควตา
        maxCompanies: 1,
        maxUsers: 1,
        maxDocuments: 15,
        maxLogos: 1,
        maxStorageMB: 50,
        allowCustomLogo: false,
        maxCustomers: 10,
        maxContractors: 2,
        maxPdfExports: 20,
        historyRetentionDays: 7,
        
        // Features
        features: {
            multipleProfiles: false,
            apiAccess: false,
            customDomain: false,
            prioritySupport: false,
            exportPDF: true,
            exportExcel: false,
            advancedReports: false,
            customTemplates: false,
            documentAccess: 'basic',        // เฉพาะใบเสนอราคา, ใบเสร็จ
            hasWatermark: true,             // มีลายน้ำ App
            lineNotification: false,
            dedicatedSupport: false,
            auditLog: false,
        },
        
        // ราคา
        priceMonthly: 0,
        priceYearly: 0,
        price: 0,
        currency: 'THB',
        
        // การแสดงผล
        displayOrder: 1,
        isActive: true,
        isPopular: false,
        color: '#6B7280',  // Gray
        
        // จุดเด่น
        highlights: [
            'ทดลองใช้ฟรี',
            'เอกสารพื้นฐาน (ใบเสนอราคา, ใบเสร็จ)',
            'สร้างเอกสารได้ 15 ใบ/เดือน',
            'ลูกค้า 10 ราย, ช่าง 2 ราย',
        ],
    },
    
    starter: {
        id: 'starter',
        name: 'Starter',
        nameTh: 'ผู้เริ่มทำธุรกิจ',
        description: 'For freelancers and small contractors',
        descriptionTh: 'สำหรับฟรีแลนซ์และช่างรายย่อย',
        
        // โควตา
        maxCompanies: 1,
        maxUsers: 1,
        maxDocuments: -1,               // ไม่จำกัด
        maxLogos: 5,
        maxStorageMB: 500,
        allowCustomLogo: true,
        maxCustomers: 100,
        maxContractors: 20,
        maxPdfExports: -1,              // ไม่จำกัด
        historyRetentionDays: 365,      // 1 ปี
        
        // Features
        features: {
            multipleProfiles: false,
            apiAccess: false,
            customDomain: false,
            prioritySupport: false,
            exportPDF: true,
            exportExcel: true,
            advancedReports: false,
            customTemplates: true,
            documentAccess: 'full',         // ครบทุกประเภท
            hasWatermark: false,            // ไม่มีลายน้ำ
            lineNotification: false,
            dedicatedSupport: false,
            auditLog: false,
        },
        
        // ราคา (199 บาท/เดือน, รายปี 1,690 บาท = 140 บ./เดือน)
        priceMonthly: 199,
        priceYearly: 1690,              // ลด 30% จาก 199*12 = 2,388
        price: 199,
        currency: 'THB',
        
        // การแสดงผล
        displayOrder: 2,
        isActive: true,
        isPopular: false,
        color: '#3B82F6',  // Blue
        badge: 'คุ้มค่า',
        
        // จุดเด่น
        highlights: [
            'เอกสารไม่จำกัด',
            'ครบทุกประเภท (รวมสัญญาช่าง, ส่งมอบงาน)',
            'ไม่มีลายน้ำ',
            'Custom Logo',
            'ลูกค้า 100 ราย, ช่าง 20 ราย',
            'ประวัติเอกสาร 1 ปี',
        ],
    },
    
    business: {
        id: 'business',
        name: 'Business',
        nameTh: 'SME/ทีมงาน',
        description: 'For small and medium businesses',
        descriptionTh: 'สำหรับธุรกิจขนาดเล็ก-กลางและทีมงาน',
        
        // โควตา
        maxCompanies: 3,
        maxUsers: 5,
        maxDocuments: -1,               // ไม่จำกัด
        maxLogos: 20,
        maxStorageMB: 2000,
        allowCustomLogo: true,
        maxCustomers: -1,               // ไม่จำกัด
        maxContractors: -1,             // ไม่จำกัด
        maxPdfExports: -1,              // ไม่จำกัด
        historyRetentionDays: 1095,     // 3 ปี
        
        // Features
        features: {
            multipleProfiles: true,
            apiAccess: false,
            customDomain: false,
            prioritySupport: true,
            exportPDF: true,
            exportExcel: true,
            advancedReports: true,
            customTemplates: true,
            documentAccess: 'full',
            hasWatermark: false,
            lineNotification: true,         // ส่ง Link + แจ้งเตือน Line
            dedicatedSupport: false,
            auditLog: false,
        },
        
        // ราคา (499 บาท/เดือน, รายปี 4,190 บาท = 349 บ./เดือน)
        priceMonthly: 499,
        priceYearly: 4190,              // ลด 30% จาก 499*12 = 5,988
        price: 499,
        currency: 'THB',
        
        // การแสดงผล
        displayOrder: 3,
        isActive: true,
        isPopular: true,
        color: '#F59E0B',  // Amber
        badge: 'ยอดนิยม',
        
        // จุดเด่น
        highlights: [
            '5 ผู้ใช้งาน (เฉลี่ย 100 บ./คน/เดือน)',
            'เอกสารไม่จำกัด ครบทุกประเภท',
            'ลูกค้าและช่างไม่จำกัด',
            'สรุปยอดขาย แยกตามลูกค้า',
            'ส่ง Link + แจ้งเตือน Line',
            'ประวัติเอกสาร 3 ปี',
            'Email + Line OA Support',
        ],
    },
    
    enterprise: {
        id: 'enterprise',
        name: 'Enterprise',
        nameTh: 'องค์กรใหญ่',
        description: 'For large organizations',
        descriptionTh: 'สำหรับองค์กรขนาดใหญ่',
        
        // โควตา - ไม่จำกัดทุกอย่าง
        maxCompanies: -1,
        maxUsers: -1,
        maxDocuments: -1,
        maxLogos: -1,
        maxStorageMB: -1,
        allowCustomLogo: true,
        maxCustomers: -1,
        maxContractors: -1,
        maxPdfExports: -1,
        historyRetentionDays: -1,       // Audit Log เต็มรูปแบบ
        
        // Features - เปิดทุกอย่าง
        features: {
            multipleProfiles: true,
            apiAccess: true,
            customDomain: true,
            prioritySupport: true,
            exportPDF: true,
            exportExcel: true,
            advancedReports: true,
            customTemplates: true,
            documentAccess: 'full',
            hasWatermark: false,
            lineNotification: true,
            dedicatedSupport: true,         // ผู้ดูแลส่วนตัว
            auditLog: true,                 // Audit Log เต็มรูปแบบ
        },
        
        // ราคา (ติดต่อฝ่ายขาย)
        priceMonthly: -1,               // -1 = ติดต่อฝ่ายขาย
        priceYearly: -1,
        price: -1,
        currency: 'THB',
        
        // การแสดงผล
        displayOrder: 4,
        isActive: true,
        isPopular: false,
        color: '#8B5CF6',  // Purple
        
        // จุดเด่น
        highlights: [
            'ผู้ใช้งานไม่จำกัด',
            'ทุกอย่างไม่จำกัด',
            'เชื่อมต่อ API',
            'Custom Report',
            'Audit Log เต็มรูปแบบ',
            'ผู้ดูแลส่วนตัว (Dedicated)',
            'ราคาพิเศษสำหรับองค์กร',
        ],
    },
};

/**
 * Initialize Plan Templates (รันครั้งแรกเพื่อสร้าง templates)
 */
export const initializePlanTemplates = async (): Promise<void> => {
    try {
        console.log('🚀 กำลัง Initialize Plan Templates...');

        for (const [planId, template] of Object.entries(DEFAULT_PLAN_TEMPLATES)) {
            const templateRef = doc(db, PLAN_TEMPLATES_COLLECTION, planId);
            
            // ตรวจสอบว่ามีอยู่แล้วหรือไม่
            const templateSnap = await getDoc(templateRef);
            
            if (!templateSnap.exists()) {
                await setDoc(templateRef, {
                    ...template,
                    createdAt: Timestamp.now(),
                    updatedAt: Timestamp.now(),
                });
                console.log(`✅ สร้าง template: ${template.name}`);
            } else {
                console.log(`⏭️  ข้าม: ${template.name} (มีอยู่แล้ว)`);
            }
        }

        console.log('✅ Initialize Plan Templates เสร็จสิ้น');
    } catch (error) {
        console.error('❌ Initialize Plan Templates ล้มเหลว:', error);
        throw error;
    }
};

/**
 * Force Update Plan Templates (อัปเดตทั้งหมดแม้มีอยู่แล้ว)
 * ใช้สำหรับ migrate ไปใช้ pricing ใหม่
 */
export const forceUpdatePlanTemplates = async (): Promise<void> => {
    try {
        console.log('🔄 กำลัง Force Update Plan Templates...');

        for (const [planId, template] of Object.entries(DEFAULT_PLAN_TEMPLATES)) {
            const templateRef = doc(db, PLAN_TEMPLATES_COLLECTION, planId);
            
            await setDoc(templateRef, {
                ...template,
                updatedAt: Timestamp.now(),
            }, { merge: true });
            
            console.log(`✅ อัปเดต template: ${template.name}`);
        }

        console.log('✅ Force Update Plan Templates เสร็จสิ้น');
    } catch (error) {
        console.error('❌ Force Update Plan Templates ล้มเหลว:', error);
        throw error;
    }
};

/**
 * ดึงข้อมูล Plan Template ทั้งหมด
 */
export const getAllPlanTemplates = async (): Promise<PlanTemplate[]> => {
    try {
        const templatesRef = collection(db, PLAN_TEMPLATES_COLLECTION);
        const querySnapshot = await getDocs(templatesRef);

        if (querySnapshot.empty) {
            console.warn('⚠️  ไม่พบ Plan Templates, กำลัง Initialize...');
            await initializePlanTemplates();
            return await getAllPlanTemplates();
        }

        const templates: PlanTemplate[] = [];

        for (const docSnap of querySnapshot.docs) {
            const data = docSnap.data();
            templates.push({
                id: docSnap.id,
                name: data.name,
                nameTh: data.nameTh || data.name,
                description: data.description,
                descriptionTh: data.descriptionTh || data.description,
                maxCompanies: data.maxCompanies ?? 1,
                maxUsers: data.maxUsers,
                maxDocuments: data.maxDocuments,
                maxLogos: data.maxLogos,
                maxStorageMB: data.maxStorageMB,
                allowCustomLogo: data.allowCustomLogo,
                maxCustomers: data.maxCustomers ?? 10,
                maxContractors: data.maxContractors ?? 2,
                maxPdfExports: data.maxPdfExports ?? 20,
                historyRetentionDays: data.historyRetentionDays ?? 7,
                features: {
                    ...data.features,
                    documentAccess: data.features?.documentAccess ?? 'basic',
                    hasWatermark: data.features?.hasWatermark ?? true,
                    lineNotification: data.features?.lineNotification ?? false,
                    dedicatedSupport: data.features?.dedicatedSupport ?? false,
                    auditLog: data.features?.auditLog ?? false,
                },
                priceMonthly: data.priceMonthly ?? data.price ?? 0,
                priceYearly: data.priceYearly ?? (data.price ? Math.round(data.price * 12 * 0.7) : 0),
                price: data.price ?? data.priceMonthly ?? 0,
                currency: data.currency,
                stripeProductId: data.stripeProductId,
                stripePriceMonthlyId: data.stripePriceMonthlyId,
                stripePriceYearlyId: data.stripePriceYearlyId,
                displayOrder: data.displayOrder,
                isActive: data.isActive,
                isPopular: data.isPopular,
                color: data.color,
                badge: data.badge,
                highlights: data.highlights ?? [],
                createdAt: data.createdAt?.toDate(),
                updatedAt: data.updatedAt?.toDate(),
                updatedBy: data.updatedBy,
            });
        }

        // เรียงตาม displayOrder
        templates.sort((a, b) => a.displayOrder - b.displayOrder);

        return templates;
    } catch (error) {
        console.error('❌ ดึง Plan Templates ล้มเหลว:', error);
        throw error;
    }
};

/**
 * ดึงข้อมูล Plan Template เฉพาะแผน
 */
export const getPlanTemplate = async (planId: string): Promise<PlanTemplate | null> => {
    try {
        const templateRef = doc(db, PLAN_TEMPLATES_COLLECTION, planId);
        const templateSnap = await getDoc(templateRef);

        if (!templateSnap.exists()) {
            return null;
        }

        const data = templateSnap.data();
        return {
            id: templateSnap.id,
            name: data.name,
            nameTh: data.nameTh || data.name,
            description: data.description,
            descriptionTh: data.descriptionTh || data.description,
            maxCompanies: data.maxCompanies ?? 1,
            maxUsers: data.maxUsers,
            maxDocuments: data.maxDocuments,
            maxLogos: data.maxLogos,
            maxStorageMB: data.maxStorageMB,
            allowCustomLogo: data.allowCustomLogo,
            maxCustomers: data.maxCustomers ?? 10,
            maxContractors: data.maxContractors ?? 2,
            maxPdfExports: data.maxPdfExports ?? 20,
            historyRetentionDays: data.historyRetentionDays ?? 7,
            features: {
                ...data.features,
                documentAccess: data.features?.documentAccess ?? 'basic',
                hasWatermark: data.features?.hasWatermark ?? true,
                lineNotification: data.features?.lineNotification ?? false,
                dedicatedSupport: data.features?.dedicatedSupport ?? false,
                auditLog: data.features?.auditLog ?? false,
            },
            priceMonthly: data.priceMonthly ?? data.price ?? 0,
            priceYearly: data.priceYearly ?? (data.price ? Math.round(data.price * 12 * 0.7) : 0),
            price: data.price ?? data.priceMonthly ?? 0,
            currency: data.currency,
            stripeProductId: data.stripeProductId,
            stripePriceMonthlyId: data.stripePriceMonthlyId,
            stripePriceYearlyId: data.stripePriceYearlyId,
            displayOrder: data.displayOrder,
            isActive: data.isActive,
            isPopular: data.isPopular,
            color: data.color,
            badge: data.badge,
            highlights: data.highlights ?? [],
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate(),
            updatedBy: data.updatedBy,
        };
    } catch (error) {
        console.error('❌ ดึง Plan Template ล้มเหลว:', error);
        throw error;
    }
};

/**
 * อัปเดต Plan Template
 */
export const updatePlanTemplate = async (
    planId: string,
    updates: Partial<Omit<PlanTemplate, 'id' | 'createdAt' | 'updatedAt'>>,
    updatedBy?: string
): Promise<void> => {
    try {
        const templateRef = doc(db, PLAN_TEMPLATES_COLLECTION, planId);

        const updateData: any = {
            ...updates,
            updatedAt: Timestamp.now(),
        };

        if (updatedBy) {
            updateData.updatedBy = updatedBy;
        }

        await updateDoc(templateRef, updateData);

        console.log('✅ อัปเดต Plan Template สำเร็จ:', planId);
    } catch (error) {
        console.error('❌ อัปเดต Plan Template ล้มเหลว:', error);
        throw error;
    }
};

/**
 * อัปเดต Stripe IDs ใน Plan Template
 */
export const updatePlanStripeIds = async (
    planId: string,
    stripeProductId: string,
    stripePriceMonthlyId?: string,
    stripePriceYearlyId?: string
): Promise<void> => {
    try {
        const templateRef = doc(db, PLAN_TEMPLATES_COLLECTION, planId);

        const updateData: any = {
            stripeProductId,
            updatedAt: Timestamp.now(),
        };

        if (stripePriceMonthlyId) {
            updateData.stripePriceMonthlyId = stripePriceMonthlyId;
        }
        if (stripePriceYearlyId) {
            updateData.stripePriceYearlyId = stripePriceYearlyId;
        }

        await updateDoc(templateRef, updateData);

        console.log('✅ อัปเดต Stripe IDs สำเร็จ:', planId);
    } catch (error) {
        console.error('❌ อัปเดต Stripe IDs ล้มเหลว:', error);
        throw error;
    }
};

/**
 * ลบ Plan Template
 */
export const deletePlanTemplate = async (planId: string): Promise<void> => {
    try {
        const templateRef = doc(db, PLAN_TEMPLATES_COLLECTION, planId);
        await deleteDoc(templateRef);

        console.log('✅ ลบ Plan Template สำเร็จ:', planId);
    } catch (error) {
        console.error('❌ ลบ Plan Template ล้มเหลว:', error);
        throw error;
    }
};

/**
 * คำนวณราคาตาม billing cycle
 * @param plan - Plan Template
 * @param billingCycle - รอบการเรียกเก็บเงิน (monthly/yearly)
 * @returns ราคาที่ต้องจ่าย
 */
export const calculatePrice = (plan: PlanTemplate, billingCycle: BillingCycle): number => {
    if (plan.priceMonthly === 0) return 0;  // Free plan
    if (plan.priceMonthly === -1) return -1; // Contact sales
    
    if (billingCycle === 'yearly') {
        return plan.priceYearly;
    }
    return plan.priceMonthly;
};

/**
 * คำนวณส่วนลดเมื่อจ่ายรายปี
 * @param plan - Plan Template
 * @returns เปอร์เซ็นต์ส่วนลด
 */
export const calculateYearlyDiscount = (plan: PlanTemplate): number => {
    if (plan.priceMonthly <= 0) return 0;
    
    const monthlyTotal = plan.priceMonthly * 12;
    const yearlyTotal = plan.priceYearly;
    
    if (monthlyTotal === 0) return 0;
    
    return Math.round(((monthlyTotal - yearlyTotal) / monthlyTotal) * 100);
};

/**
 * ดึง Plan Templates ที่ active เท่านั้น (สำหรับ Pricing Page)
 */
export const getActivePlanTemplates = async (): Promise<PlanTemplate[]> => {
    const allTemplates = await getAllPlanTemplates();
    return allTemplates.filter(t => t.isActive);
};

/**
 * Export Default Templates สำหรับใช้ใน quota.ts
 */
export { DEFAULT_PLAN_TEMPLATES };
