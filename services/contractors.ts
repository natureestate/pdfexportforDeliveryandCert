/**
 * Contractor Management Service
 * บริการจัดการข้อมูลช่าง/ผู้รับจ้างแบบครบวงจร - ลดการกรอกข้อมูลซ้ำ
 */

import { db, auth } from '../firebase.config';
import {
    collection,
    doc,
    getDocs,
    setDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    Timestamp,
    updateDoc,
} from 'firebase/firestore';

// Collection name
const CONTRACTORS_COLLECTION = 'contractors';

// Interface สำหรับ Contractor
export interface Contractor {
    id?: string;
    companyId: string;             // ID ของบริษัทที่สร้างข้อมูลช่างนี้
    userId: string;                // User ที่สร้างข้อมูลช่างนี้
    
    // ข้อมูลช่างหลัก
    contractorName: string;        // ชื่อช่าง/หัวหน้าชุดช่าง
    contractorType: 'individual' | 'company';  // ประเภท: บุคคล หรือ นิติบุคคล
    
    // ข้อมูลติดต่อ
    phone: string;                 // เบอร์โทรศัพท์หลัก
    alternatePhone?: string;       // เบอร์สำรอง
    email?: string;                // อีเมล
    lineId?: string;               // Line ID
    
    // ที่อยู่
    address: string;               // ที่อยู่หลัก
    district?: string;             // ตำบล/แขวง
    amphoe?: string;               // อำเภอ/เขต
    province?: string;             // จังหวัด
    postalCode?: string;           // รหัสไปรษณีย์
    
    // ข้อมูลภาษี
    idCard?: string;               // เลขบัตรประชาชน
    taxId?: string;                // เลขประจำตัวผู้เสียภาษี (สำหรับนิติบุคคล)
    
    // ข้อมูลความเชี่ยวชาญ
    specialties?: string[];        // ความเชี่ยวชาญ เช่น ['งานปูกระเบื้อง', 'งานไฟฟ้า', 'งานประปา']
    
    // Tags และหมายเหตุ
    tags?: string[];               // Tags สำหรับจัดกลุ่ม เช่น ['ช่างประจำ', 'ช่างเก่ง']
    notes?: string;                // หมายเหตุเพิ่มเติม
    
    // Metadata
    lastUsedAt?: Date;             // ใช้ล่าสุดเมื่อไร (สำหรับ sorting)
    usageCount?: number;           // จำนวนครั้งที่ใช้ (สำหรับ suggestion)
    createdAt?: Date;
    updatedAt?: Date;
}

/**
 * บันทึกช่างใหม่
 */
export const saveContractor = async (
    contractor: Omit<Contractor, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'usageCount'>,
    companyId?: string
): Promise<string> => {
    try {
        // ตรวจสอบว่า user login แล้วหรือยัง
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error('กรุณา Login ก่อนบันทึกข้อมูลช่าง');
        }
        
        // สร้าง ID
        const docId = `contractor_${Date.now()}_${contractor.contractorName.replace(/\s+/g, '_').toLowerCase()}`;
        const docRef = doc(db, CONTRACTORS_COLLECTION, docId);

        await setDoc(docRef, {
            ...contractor,
            userId: currentUser.uid,
            companyId: companyId || contractor.companyId,
            usageCount: 0, // เริ่มต้นที่ 0
            lastUsedAt: null, // เริ่มต้นที่ null เพื่อให้ query orderBy ทำงานได้
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        });

        console.log('✅ บันทึกข้อมูลช่างสำเร็จ:', docId);
        return docId;
    } catch (error) {
        console.error('❌ Error saving contractor:', error);
        throw new Error('ไม่สามารถบันทึกข้อมูลช่างได้');
    }
};

/**
 * ดึงรายการช่างทั้งหมด - เฉพาะของ company ที่เลือก
 * @param companyId - ID ของบริษัท (required)
 */
export const getContractors = async (companyId: string): Promise<Contractor[]> => {
    try {
        console.log('🔍 [getContractors] เริ่มดึงข้อมูลช่าง, companyId:', companyId);
        
        // ตรวจสอบว่า user login แล้วหรือยัง
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error('กรุณา Login ก่อนดูข้อมูลช่าง');
        }
        
        if (!companyId) {
            throw new Error('กรุณาเลือกบริษัทก่อน');
        }
        
        console.log('🔍 [getContractors] กำลัง query...');
        
        // Query: กรองเฉพาะบริษัทที่เลือก และเรียงตาม lastUsedAt
        const q = query(
            collection(db, CONTRACTORS_COLLECTION),
            where('companyId', '==', companyId),
            orderBy('lastUsedAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        console.log('🔍 [getContractors] Query เสร็จ, จำนวน docs:', querySnapshot.size);
        const contractors: Contractor[] = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                companyId: data.companyId,
                userId: data.userId,
                contractorName: data.contractorName,
                contractorType: data.contractorType,
                phone: data.phone,
                alternatePhone: data.alternatePhone,
                email: data.email,
                lineId: data.lineId,
                address: data.address,
                district: data.district,
                amphoe: data.amphoe,
                province: data.province,
                postalCode: data.postalCode,
                idCard: data.idCard,
                taxId: data.taxId,
                specialties: data.specialties || [],
                tags: data.tags || [],
                notes: data.notes,
                lastUsedAt: data.lastUsedAt?.toDate(),
                usageCount: data.usageCount || 0,
                createdAt: data.createdAt?.toDate(),
                updatedAt: data.updatedAt?.toDate(),
            } as Contractor;
        });

        console.log(`📋 พบช่าง ${contractors.length} รายการ ในบริษัท ${companyId}`);
        return contractors;
    } catch (error) {
        console.error('❌ Error getting contractors:', error);
        throw new Error('ไม่สามารถดึงรายการช่างได้');
    }
};

/**
 * ค้นหาช่าง
 */
export const searchContractors = async (companyId: string, searchText: string): Promise<Contractor[]> => {
    try {
        const allContractors = await getContractors(companyId);
        
        // Filter ด้วย JavaScript
        const searchLower = searchText.toLowerCase();
        const filtered = allContractors.filter(contractor => 
            contractor.contractorName.toLowerCase().includes(searchLower) ||
            contractor.phone.includes(searchText) ||
            (contractor.email && contractor.email.toLowerCase().includes(searchLower)) ||
            (contractor.specialties && contractor.specialties.some(s => s.toLowerCase().includes(searchLower)))
        );

        console.log(`🔍 พบ ${filtered.length} รายการจากการค้นหา "${searchText}"`);
        return filtered;
    } catch (error) {
        console.error('❌ Error searching contractors:', error);
        throw new Error('ไม่สามารถค้นหาช่างได้');
    }
};

/**
 * อัปเดตข้อมูลช่าง
 */
export const updateContractor = async (
    id: string,
    updates: Partial<Omit<Contractor, 'id' | 'userId' | 'companyId' | 'createdAt' | 'updatedAt'>>
): Promise<void> => {
    try {
        const docRef = doc(db, CONTRACTORS_COLLECTION, id);
        await updateDoc(docRef, {
            ...updates,
            updatedAt: Timestamp.now(),
        });
        
        console.log('✅ อัปเดตข้อมูลช่างสำเร็จ:', id);
    } catch (error) {
        console.error('❌ Error updating contractor:', error);
        throw new Error('ไม่สามารถอัปเดตข้อมูลช่างได้');
    }
};

/**
 * ลบช่าง
 */
export const deleteContractor = async (id: string): Promise<void> => {
    try {
        const docRef = doc(db, CONTRACTORS_COLLECTION, id);
        await deleteDoc(docRef);
        
        console.log('✅ ลบข้อมูลช่างสำเร็จ:', id);
    } catch (error) {
        console.error('❌ Error deleting contractor:', error);
        throw new Error('ไม่สามารถลบข้อมูลช่างได้');
    }
};

/**
 * อัปเดตการใช้งานช่าง (เรียกทุกครั้งที่เลือกใช้ช่าง)
 * เพื่อเก็บสถิติและแสดง suggestion ที่แม่นยำ
 */
export const updateContractorUsage = async (id: string): Promise<void> => {
    try {
        const docRef = doc(db, CONTRACTORS_COLLECTION, id);
        
        // ดึงข้อมูลปัจจุบันผ่าน getDoc
        const { getDoc } = await import('firebase/firestore');
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
            throw new Error('ไม่พบข้อมูลช่าง');
        }
        
        const currentData = docSnap.data();
        
        await updateDoc(docRef, {
            lastUsedAt: Timestamp.now(),
            usageCount: (currentData.usageCount || 0) + 1,
            updatedAt: Timestamp.now(),
        });
        
        console.log('✅ อัปเดตการใช้งานช่างสำเร็จ:', id);
    } catch (error) {
        console.error('❌ Error updating contractor usage:', error);
        // ไม่ throw error เพื่อไม่ให้กระทบการทำงานหลัก
    }
};

/**
 * ดึงช่างที่ใช้บ่อย (Top 10)
 */
export const getFrequentContractors = async (companyId: string, limit: number = 10): Promise<Contractor[]> => {
    try {
        const allContractors = await getContractors(companyId);
        
        // เรียงตาม usageCount จากมากไปน้อย
        const sorted = allContractors
            .filter(c => (c.usageCount || 0) > 0)
            .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
            .slice(0, limit);

        console.log(`⭐ พบช่างที่ใช้บ่อย ${sorted.length} รายการ`);
        return sorted;
    } catch (error) {
        console.error('❌ Error getting frequent contractors:', error);
        return [];
    }
};

/**
 * ดึงช่างที่ใช้ล่าสุด (Recent 10)
 */
export const getRecentContractors = async (companyId: string, limit: number = 10): Promise<Contractor[]> => {
    try {
        const allContractors = await getContractors(companyId);
        
        // เรียงตาม lastUsedAt จากใหม่ไปเก่า
        const sorted = allContractors
            .filter(c => c.lastUsedAt)
            .sort((a, b) => {
                const dateA = a.lastUsedAt?.getTime() || 0;
                const dateB = b.lastUsedAt?.getTime() || 0;
                return dateB - dateA;
            })
            .slice(0, limit);

        console.log(`🕒 พบช่างที่ใช้ล่าสุด ${sorted.length} รายการ`);
        return sorted;
    } catch (error) {
        console.error('❌ Error getting recent contractors:', error);
        return [];
    }
};

/**
 * ดึงช่างตาม tags
 */
export const getContractorsByTags = async (companyId: string, tags: string[]): Promise<Contractor[]> => {
    try {
        const allContractors = await getContractors(companyId);
        
        // กรองช่างที่มี tags ที่ระบุ
        const filtered = allContractors.filter(contractor => 
            contractor.tags && contractor.tags.some(tag => tags.includes(tag))
        );

        console.log(`🏷️ พบช่างที่มี tags ${tags.join(', ')}: ${filtered.length} รายการ`);
        return filtered;
    } catch (error) {
        console.error('❌ Error getting contractors by tags:', error);
        return [];
    }
};

/**
 * ดึงช่างตามความเชี่ยวชาญ
 */
export const getContractorsBySpecialty = async (companyId: string, specialty: string): Promise<Contractor[]> => {
    try {
        const allContractors = await getContractors(companyId);
        
        // กรองช่างที่มีความเชี่ยวชาญที่ระบุ
        const filtered = allContractors.filter(contractor => 
            contractor.specialties && contractor.specialties.some(s => 
                s.toLowerCase().includes(specialty.toLowerCase())
            )
        );

        console.log(`🔧 พบช่างที่เชี่ยวชาญ "${specialty}": ${filtered.length} รายการ`);
        return filtered;
    } catch (error) {
        console.error('❌ Error getting contractors by specialty:', error);
        return [];
    }
};

