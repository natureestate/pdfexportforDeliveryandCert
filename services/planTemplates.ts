/**
 * Plan Templates Service
 * บริการจัดการ Template แผนการใช้งาน (แก้ไขได้แบบ Dynamic)
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
import { SubscriptionPlan } from '../types';

// Collection name
const PLAN_TEMPLATES_COLLECTION = 'planTemplates';

/**
 * Plan Template Interface
 */
export interface PlanTemplate {
    id?: string;                      // Plan ID (free, basic, premium, enterprise)
    name: string;                     // ชื่อแผน (แสดงใน UI)
    description: string;              // คำอธิบายแผน
    
    // โควตา
    maxCompanies: number;             // จำนวนองค์กรสูงสุดที่สร้างได้ (-1 = ไม่จำกัด)
    maxUsers: number;                 // จำนวนผู้ใช้สูงสุด (-1 = ไม่จำกัด)
    maxDocuments: number;             // จำนวนเอกสารต่อเดือน (-1 = ไม่จำกัด)
    maxLogos: number;                 // จำนวนโลโก้ (-1 = ไม่จำกัด)
    maxStorageMB: number;             // Storage ใน MB (-1 = ไม่จำกัด)
    allowCustomLogo: boolean;         // อนุญาตโลโก้กำหนดเอง
    
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
    };
    
    // ราคา
    price: number;                    // ราคาต่อเดือน (0 = ฟรี)
    currency: string;                 // สกุลเงิน
    
    // การแสดงผล
    displayOrder: number;             // ลำดับการแสดง
    isActive: boolean;                // เปิดใช้งานหรือไม่
    isPopular: boolean;               // แผนยอดนิยม
    color: string;                    // สีของแผน (สำหรับ UI)
    
    // Metadata
    createdAt?: Date;
    updatedAt?: Date;
    updatedBy?: string;
}

/**
 * Default Plan Templates (สำหรับ Initialize ครั้งแรก)
 */
const DEFAULT_PLAN_TEMPLATES: Record<SubscriptionPlan, Omit<PlanTemplate, 'createdAt' | 'updatedAt'>> = {
    free: {
        id: 'free',
        name: '🆓 Free',
        description: 'สำหรับเริ่มต้นใช้งาน (1 องค์กร)',
        maxCompanies: 1,              // สร้างได้แค่ 1 องค์กร
        maxUsers: 3,
        maxDocuments: 50,
        maxLogos: 1,
        maxStorageMB: 100,
        allowCustomLogo: false,
        features: {
            multipleProfiles: false,
            apiAccess: false,
            customDomain: false,
            prioritySupport: false,
            exportPDF: false,  // ❌ Free plan ไม่สามารถ Export PDF
            exportExcel: false,
            advancedReports: false,
            customTemplates: false,
        },
        price: 0,
        currency: 'THB',
        displayOrder: 1,
        isActive: true,
        isPopular: false,
        color: '#9CA3AF',
    },
    basic: {
        id: 'basic',
        name: '💼 Basic',
        description: 'สำหรับธุรกิจขนาดเล็ก',
        maxCompanies: 3,              // สร้างได้สูงสุด 3 องค์กร
        maxUsers: 10,
        maxDocuments: 200,
        maxLogos: 5,
        maxStorageMB: 500,
        allowCustomLogo: true,
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
        price: 299,
        currency: 'THB',
        displayOrder: 2,
        isActive: true,
        isPopular: false,
        color: '#3B82F6',
    },
    premium: {
        id: 'premium',
        name: '💎 Premium',
        description: 'สำหรับธุรกิจขนาดกลาง',
        maxCompanies: 10,             // สร้างได้สูงสุด 10 องค์กร
        maxUsers: 50,
        maxDocuments: 1000,
        maxLogos: 20,
        maxStorageMB: 2000,
        allowCustomLogo: true,
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
        price: 999,
        currency: 'THB',
        displayOrder: 3,
        isActive: true,
        isPopular: true,
        color: '#F59E0B',
    },
    enterprise: {
        id: 'enterprise',
        name: '🏢 Enterprise',
        description: 'สำหรับองค์กรขนาดใหญ่',
        maxCompanies: -1,             // ไม่จำกัด
        maxUsers: -1,
        maxDocuments: -1,
        maxLogos: -1,
        maxStorageMB: -1,
        allowCustomLogo: true,
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
        price: 2999,
        currency: 'THB',
        displayOrder: 4,
        isActive: true,
        isPopular: false,
        color: '#8B5CF6',
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

        for (const doc of querySnapshot.docs) {
            const data = doc.data();
            templates.push({
                id: doc.id,
                name: data.name,
                description: data.description,
                maxCompanies: data.maxCompanies ?? 1,  // Default 1 ถ้าไม่มีข้อมูล
                maxUsers: data.maxUsers,
                maxDocuments: data.maxDocuments,
                maxLogos: data.maxLogos,
                maxStorageMB: data.maxStorageMB,
                allowCustomLogo: data.allowCustomLogo,
                features: data.features,
                price: data.price,
                currency: data.currency,
                displayOrder: data.displayOrder,
                isActive: data.isActive,
                isPopular: data.isPopular,
                color: data.color,
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
            description: data.description,
            maxCompanies: data.maxCompanies ?? 1,  // Default 1 ถ้าไม่มีข้อมูล
            maxUsers: data.maxUsers,
            maxDocuments: data.maxDocuments,
            maxLogos: data.maxLogos,
            maxStorageMB: data.maxStorageMB,
            allowCustomLogo: data.allowCustomLogo,
            features: data.features,
            price: data.price,
            currency: data.currency,
            displayOrder: data.displayOrder,
            isActive: data.isActive,
            isPopular: data.isPopular,
            color: data.color,
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
 * Export Default Templates สำหรับใช้ใน quota.ts
 */
export { DEFAULT_PLAN_TEMPLATES };

