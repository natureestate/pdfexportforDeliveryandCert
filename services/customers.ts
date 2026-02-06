/**
 * Customer Management Service
 * บริการจัดการข้อมูลลูกค้าแบบครบวงจร - ลดการกรอกข้อมูลซ้ำ
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
import { logCustomerAction } from './activityLog';

// Collection name
const CUSTOMERS_COLLECTION = 'customers';

// Interface สำหรับโครงการลูกค้าปลายทาง (End Customer Project)
// รองรับหลายโครงการต่อลูกค้า 1 ราย
export interface EndCustomerProject {
    id?: string;                  // ID สำหรับระบุโครงการ (auto-generate)
    projectName: string;          // ชื่อโครงการลูกค้าปลายทาง
    projectAddress?: string;      // ที่ตั้งโครงการ
    contactName?: string;         // ชื่อผู้ติดต่อที่โครงการ
    contactPhone?: string;        // เบอร์โทรผู้ติดต่อ
    notes?: string;               // หมายเหตุเพิ่มเติม
    createdAt?: Date;             // วันที่สร้าง
}

// Interface สำหรับ Customer
export interface Customer {
    id?: string;
    companyId: string;          // ID ของบริษัทที่สร้างลูกค้านี้
    userId: string;             // User ที่สร้างลูกค้านี้
    
    // ข้อมูลลูกค้าหลัก
    customerName: string;       // ชื่อลูกค้า/บริษัท
    customerType: 'individual' | 'company';  // ประเภท: บุคคล หรือ นิติบุคคล
    
    // ข้อมูลติดต่อ
    phone: string;              // เบอร์โทรศัพท์หลัก
    alternatePhone?: string;    // เบอร์สำรอง
    email?: string;             // อีเมล
    lineId?: string;            // Line ID
    
    // ที่อยู่
    address: string;            // ที่อยู่หลัก
    district?: string;          // ตำบล/แขวง
    amphoe?: string;            // อำเภอ/เขต
    province?: string;          // จังหวัด
    postalCode?: string;        // รหัสไปรษณีย์
    
    // ข้อมูลโครงการ (สำหรับธุรกิจก่อสร้าง/อสังหา)
    projectName?: string;       // ชื่อโครงการ (ถ้ามี)
    houseNumber?: string;       // บ้านเลขที่/ห้องเลขที่
    
    // ข้อมูลภาษี
    taxId?: string;             // เลขประจำตัวผู้เสียภาษี (สำหรับนิติบุคคล)
    
    // ข้อมูลสาขา (ตามประกาศอธิบดีกรมสรรพากร ฉบับที่ 200)
    branchCode?: string;        // รหัสสาขา (5 หลัก เช่น 00000 สำหรับสำนักงานใหญ่)
    branchName?: string;        // ชื่อสาขา (เช่น สำนักงานใหญ่, สาขาลาดพร้าว)
    
    // Tags และหมายเหตุ
    tags?: string[];            // Tags สำหรับจัดกลุ่ม เช่น ['VIP', 'ลูกค้าประจำ']
    notes?: string;             // หมายเหตุเพิ่มเติม
    
    // ข้อมูลโครงการลูกค้าปลายทาง (End Customer Projects) - รองรับหลายโครงการ
    hasEndCustomerProjects?: boolean;           // มีโครงการลูกค้าปลายทางหรือไม่
    endCustomerProjects?: EndCustomerProject[]; // รายการโครงการลูกค้าปลายทาง (หลายโครงการ)
    
    // Legacy fields - สำหรับ backward compatibility (deprecated)
    endCustomerProject?: EndCustomerProject;   // @deprecated - ใช้ endCustomerProjects แทน
    hasEndCustomerProject?: boolean;           // @deprecated - ใช้ hasEndCustomerProjects แทน
    
    // Metadata
    lastUsedAt?: Date;          // ใช้ล่าสุดเมื่อไร (สำหรับ sorting)
    usageCount?: number;        // จำนวนครั้งที่ใช้ (สำหรับ suggestion)
    createdAt?: Date;
    updatedAt?: Date;
}

/**
 * ลบฟิลด์ที่มีค่า undefined ออกจาก object (สำหรับ setDoc)
 * Firebase ไม่ยอมรับค่า undefined ใน setDoc() และ updateDoc()
 * @param obj - object ที่ต้องการลบฟิลด์ undefined
 * @returns object ที่ไม่มีฟิลด์ undefined
 */
const cleanUndefinedFields = <T extends Record<string, unknown>>(obj: T): T => {
    const result = {} as T;
    for (const key in obj) {
        if (obj[key] !== undefined) {
            result[key] = obj[key];
        }
    }
    return result;
};

/**
 * บันทึกลูกค้าใหม่
 */
export const saveCustomer = async (
    customer: Omit<Customer, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'usageCount'>,
    companyId?: string
): Promise<string> => {
    try {
        // ตรวจสอบว่า user login แล้วหรือยัง
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error('กรุณา Login ก่อนบันทึกข้อมูลลูกค้า');
        }
        
        // สร้าง ID
        const docId = `customer_${Date.now()}_${customer.customerName.replace(/\s+/g, '_').toLowerCase()}`;
        const docRef = doc(db, CUSTOMERS_COLLECTION, docId);

        // ลบฟิลด์ที่มีค่า undefined ออก เพราะ Firebase ไม่ยอมรับค่า undefined
        const cleanedCustomer = cleanUndefinedFields(customer as Record<string, unknown>);

        await setDoc(docRef, {
            ...cleanedCustomer,
            userId: currentUser.uid,
            companyId: companyId || customer.companyId,
            usageCount: 0, // เริ่มต้นที่ 0
            lastUsedAt: null, // เริ่มต้นที่ null เพื่อให้ query orderBy ทำงานได้
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        });

        console.log('✅ บันทึกข้อมูลลูกค้าสำเร็จ:', docId);
        
        // บันทึก Activity Log
        try {
            await logCustomerAction(companyId || customer.companyId, 'create', customer.customerName, docId);
        } catch (e) { /* ไม่ให้ error จาก log กระทบ flow หลัก */ }
        
        return docId;
    } catch (error) {
        console.error('❌ Error saving customer:', error);
        throw new Error('ไม่สามารถบันทึกข้อมูลลูกค้าได้');
    }
};

/**
 * ดึงรายการลูกค้าทั้งหมด - เฉพาะของ company ที่เลือก
 * @param companyId - ID ของบริษัท (required)
 */
export const getCustomers = async (companyId: string): Promise<Customer[]> => {
    try {
        console.log('🔍 [getCustomers] เริ่มดึงข้อมูลลูกค้า, companyId:', companyId);
        
        // ตรวจสอบว่า user login แล้วหรือยัง
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error('กรุณา Login ก่อนดูข้อมูลลูกค้า');
        }
        
        if (!companyId) {
            throw new Error('กรุณาเลือกบริษัทก่อน');
        }
        
        console.log('🔍 [getCustomers] กำลัง query...');
        
        // Query: กรองเฉพาะบริษัทที่เลือก และเรียงตาม lastUsedAt
        const q = query(
            collection(db, CUSTOMERS_COLLECTION),
            where('companyId', '==', companyId),
            orderBy('lastUsedAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        console.log('🔍 [getCustomers] Query เสร็จ, จำนวน docs:', querySnapshot.size);
        const customers: Customer[] = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                companyId: data.companyId,
                userId: data.userId,
                customerName: data.customerName,
                customerType: data.customerType,
                phone: data.phone,
                alternatePhone: data.alternatePhone,
                email: data.email,
                lineId: data.lineId,
                address: data.address,
                district: data.district,
                amphoe: data.amphoe,
                province: data.province,
                postalCode: data.postalCode,
                projectName: data.projectName,
                houseNumber: data.houseNumber,
                taxId: data.taxId,
                branchCode: data.branchCode,
                branchName: data.branchName,
                tags: data.tags || [],
                notes: data.notes,
                // รองรับทั้งแบบเก่า (single) และแบบใหม่ (array)
                hasEndCustomerProjects: data.hasEndCustomerProjects || data.hasEndCustomerProject || false,
                endCustomerProjects: data.endCustomerProjects || (data.endCustomerProject ? [data.endCustomerProject] : []),
                // Legacy fields สำหรับ backward compatibility
                hasEndCustomerProject: data.hasEndCustomerProject || false,
                endCustomerProject: data.endCustomerProject || undefined,
                lastUsedAt: data.lastUsedAt?.toDate(),
                usageCount: data.usageCount || 0,
                createdAt: data.createdAt?.toDate(),
                updatedAt: data.updatedAt?.toDate(),
            } as Customer;
        });

        console.log(`📋 พบลูกค้า ${customers.length} รายการ ในบริษัท ${companyId}`);
        return customers;
    } catch (error) {
        console.error('❌ Error getting customers:', error);
        throw new Error('ไม่สามารถดึงรายการลูกค้าได้');
    }
};

/**
 * ค้นหาลูกค้า
 */
export const searchCustomers = async (companyId: string, searchText: string): Promise<Customer[]> => {
    try {
        const allCustomers = await getCustomers(companyId);
        
        // Filter ด้วย JavaScript
        const searchLower = searchText.toLowerCase();
        const filtered = allCustomers.filter(customer => 
            customer.customerName.toLowerCase().includes(searchLower) ||
            customer.phone.includes(searchText) ||
            (customer.projectName && customer.projectName.toLowerCase().includes(searchLower)) ||
            (customer.email && customer.email.toLowerCase().includes(searchLower))
        );

        console.log(`🔍 พบ ${filtered.length} รายการจากการค้นหา "${searchText}"`);
        return filtered;
    } catch (error) {
        console.error('❌ Error searching customers:', error);
        throw new Error('ไม่สามารถค้นหาลูกค้าได้');
    }
};

/**
 * ลบฟิลด์ที่มีค่า undefined ออกจาก object
 * Firebase ไม่ยอมรับค่า undefined ใน updateDoc()
 * @param obj - object ที่ต้องการลบฟิลด์ undefined
 * @returns object ที่ไม่มีฟิลด์ undefined
 */
const removeUndefinedFields = <T extends Record<string, unknown>>(obj: T): Partial<T> => {
    const result: Partial<T> = {};
    for (const key in obj) {
        if (obj[key] !== undefined) {
            result[key] = obj[key];
        }
    }
    return result;
};

/**
 * อัปเดตข้อมูลลูกค้า
 */
export const updateCustomer = async (
    id: string,
    updates: Partial<Omit<Customer, 'id' | 'userId' | 'companyId' | 'createdAt' | 'updatedAt'>>
): Promise<void> => {
    try {
        const docRef = doc(db, CUSTOMERS_COLLECTION, id);
        
        // ลบฟิลด์ที่มีค่า undefined ออก เพราะ Firebase ไม่ยอมรับค่า undefined
        const cleanedUpdates = removeUndefinedFields(updates as Record<string, unknown>);
        
        await updateDoc(docRef, {
            ...cleanedUpdates,
            updatedAt: Timestamp.now(),
        });
        
        console.log('✅ อัปเดตข้อมูลลูกค้าสำเร็จ:', id);
        
        // บันทึก Activity Log
        try {
            const customerName = (updates as any).customerName || id;
            await logCustomerAction('', 'update', customerName, id);
        } catch (e) { /* ไม่ให้ error จาก log กระทบ flow หลัก */ }
    } catch (error) {
        console.error('❌ Error updating customer:', error);
        throw new Error('ไม่สามารถอัปเดตข้อมูลลูกค้าได้');
    }
};

/**
 * ลบลูกค้า
 */
export const deleteCustomer = async (id: string): Promise<void> => {
    try {
        const docRef = doc(db, CUSTOMERS_COLLECTION, id);
        await deleteDoc(docRef);
        
        console.log('✅ ลบข้อมูลลูกค้าสำเร็จ:', id);
        
        // บันทึก Activity Log
        try {
            await logCustomerAction('', 'delete', id, id);
        } catch (e) { /* ไม่ให้ error จาก log กระทบ flow หลัก */ }
    } catch (error) {
        console.error('❌ Error deleting customer:', error);
        throw new Error('ไม่สามารถลบข้อมูลลูกค้าได้');
    }
};

/**
 * อัปเดตการใช้งานลูกค้า (เรียกทุกครั้งที่เลือกใช้ลูกค้า)
 * เพื่อเก็บสถิติและแสดง suggestion ที่แม่นยำ
 * ใช้ Firestore increment() เพื่อเพิ่ม usageCount โดยไม่ต้องดึงข้อมูลก่อน
 */
export const updateCustomerUsage = async (id: string): Promise<void> => {
    try {
        const docRef = doc(db, CUSTOMERS_COLLECTION, id);
        
        // ใช้ Firestore FieldValue.increment() เพื่อเพิ่ม usageCount โดยไม่ต้องดึงข้อมูลก่อน
        // วิธีนี้มีประสิทธิภาพกว่าและไม่ต้องรู้ companyId
        const { increment } = await import('firebase/firestore');
        
        await updateDoc(docRef, {
            lastUsedAt: Timestamp.now(),
            usageCount: increment(1),
            updatedAt: Timestamp.now(),
        });
        
        console.log('✅ อัปเดตการใช้งานลูกค้าสำเร็จ:', id);
    } catch (error) {
        console.error('❌ Error updating customer usage:', error);
        // ไม่ throw error เพื่อไม่ให้กระทบการทำงานหลัก
    }
};

/**
 * ดึงลูกค้าที่ใช้บ่อย (Top 10)
 */
export const getFrequentCustomers = async (companyId: string, limit: number = 10): Promise<Customer[]> => {
    try {
        const allCustomers = await getCustomers(companyId);
        
        // เรียงตาม usageCount จากมากไปน้อย
        const sorted = allCustomers
            .filter(c => (c.usageCount || 0) > 0)
            .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
            .slice(0, limit);

        console.log(`⭐ พบลูกค้าที่ใช้บ่อย ${sorted.length} รายการ`);
        return sorted;
    } catch (error) {
        console.error('❌ Error getting frequent customers:', error);
        return [];
    }
};

/**
 * ดึงลูกค้าที่ใช้ล่าสุด (Recent 10)
 */
export const getRecentCustomers = async (companyId: string, limit: number = 10): Promise<Customer[]> => {
    try {
        const allCustomers = await getCustomers(companyId);
        
        // เรียงตาม lastUsedAt จากใหม่ไปเก่า
        const sorted = allCustomers
            .filter(c => c.lastUsedAt)
            .sort((a, b) => {
                const dateA = a.lastUsedAt?.getTime() || 0;
                const dateB = b.lastUsedAt?.getTime() || 0;
                return dateB - dateA;
            })
            .slice(0, limit);

        console.log(`🕒 พบลูกค้าที่ใช้ล่าสุด ${sorted.length} รายการ`);
        return sorted;
    } catch (error) {
        console.error('❌ Error getting recent customers:', error);
        return [];
    }
};

/**
 * ดึงลูกค้าตาม tags
 */
export const getCustomersByTags = async (companyId: string, tags: string[]): Promise<Customer[]> => {
    try {
        const allCustomers = await getCustomers(companyId);
        
        // กรองลูกค้าที่มี tags ที่ระบุ
        const filtered = allCustomers.filter(customer => 
            customer.tags && customer.tags.some(tag => tags.includes(tag))
        );

        console.log(`🏷️ พบลูกค้าที่มี tags ${tags.join(', ')}: ${filtered.length} รายการ`);
        return filtered;
    } catch (error) {
        console.error('❌ Error getting customers by tags:', error);
        return [];
    }
};

