/**
 * End Customer Management Service
 * บริการจัดการข้อมูลลูกค้าปลายทาง (End Customer) - แยก Entity จาก Customer
 * หนึ่ง Customer สามารถมีหลาย End Customer ได้
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

// Collection name สำหรับ End Customers
const END_CUSTOMERS_COLLECTION = 'endCustomers';

/**
 * Interface สำหรับ End Customer
 * End Customer คือลูกค้าปลายทางของลูกค้า (Customer) ของเรา
 * ตัวอย่าง: บริษัทของเรา → ลูกค้า (ผู้รับเหมา) → End Customer (เจ้าของบ้าน)
 */
export interface EndCustomer {
    id?: string;
    customerId: string;          // ID ของ Customer ที่ End Customer นี้เป็นของ
    companyId: string;           // ID ของบริษัทที่สร้าง End Customer นี้
    userId: string;              // User ที่สร้าง End Customer นี้
    
    // ข้อมูลโครงการ End Customer
    projectName: string;         // ชื่อโครงการลูกค้าปลายทาง
    projectAddress?: string;     // ที่ตั้งโครงการ
    
    // ข้อมูลผู้ติดต่อ
    contactName?: string;        // ชื่อผู้ติดต่อที่โครงการ
    contactPhone?: string;       // เบอร์โทรผู้ติดต่อ
    contactEmail?: string;       // อีเมลผู้ติดต่อ
    
    // หมายเหตุ
    notes?: string;              // หมายเหตุเพิ่มเติม
    
    // Metadata
    lastUsedAt?: Date;           // ใช้ล่าสุดเมื่อไร
    usageCount?: number;         // จำนวนครั้งที่ใช้
    createdAt?: Date;
    updatedAt?: Date;
}

/**
 * ลบฟิลด์ที่มีค่า undefined ออกจาก object (สำหรับ setDoc)
 * Firebase ไม่ยอมรับค่า undefined ใน setDoc() และ updateDoc()
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
 * บันทึก End Customer ใหม่
 * @param endCustomer - ข้อมูล End Customer ที่ต้องการบันทึก
 * @param companyId - ID ของบริษัท
 * @returns ID ของ End Customer ที่บันทึก
 */
export const saveEndCustomer = async (
    endCustomer: Omit<EndCustomer, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'usageCount'>,
    companyId?: string
): Promise<string> => {
    try {
        // ตรวจสอบว่า user login แล้วหรือยัง
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error('กรุณา Login ก่อนบันทึกข้อมูล End Customer');
        }
        
        // สร้าง ID สำหรับ End Customer
        const docId = `endcustomer_${Date.now()}_${endCustomer.projectName.replace(/\s+/g, '_').toLowerCase()}`;
        const docRef = doc(db, END_CUSTOMERS_COLLECTION, docId);

        // ลบฟิลด์ที่มีค่า undefined ออก
        const cleanedEndCustomer = cleanUndefinedFields(endCustomer as Record<string, unknown>);

        await setDoc(docRef, {
            ...cleanedEndCustomer,
            userId: currentUser.uid,
            companyId: companyId || endCustomer.companyId,
            usageCount: 0,
            lastUsedAt: null,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        });

        console.log('✅ บันทึกข้อมูล End Customer สำเร็จ:', docId);
        return docId;
    } catch (error) {
        console.error('❌ Error saving end customer:', error);
        throw new Error('ไม่สามารถบันทึกข้อมูล End Customer ได้');
    }
};

/**
 * ดึงรายการ End Customer ทั้งหมดของบริษัท
 * @param companyId - ID ของบริษัท
 * @returns รายการ End Customer ทั้งหมด
 */
export const getEndCustomers = async (companyId: string): Promise<EndCustomer[]> => {
    try {
        console.log('🔍 [getEndCustomers] เริ่มดึงข้อมูล End Customer, companyId:', companyId);
        
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error('กรุณา Login ก่อนดูข้อมูล End Customer');
        }
        
        if (!companyId) {
            throw new Error('กรุณาเลือกบริษัทก่อน');
        }
        
        // Query: กรองเฉพาะบริษัทที่เลือก และเรียงตาม lastUsedAt
        const q = query(
            collection(db, END_CUSTOMERS_COLLECTION),
            where('companyId', '==', companyId),
            orderBy('lastUsedAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const endCustomers: EndCustomer[] = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                customerId: data.customerId,
                companyId: data.companyId,
                userId: data.userId,
                projectName: data.projectName,
                projectAddress: data.projectAddress,
                contactName: data.contactName,
                contactPhone: data.contactPhone,
                contactEmail: data.contactEmail,
                notes: data.notes,
                lastUsedAt: data.lastUsedAt?.toDate(),
                usageCount: data.usageCount || 0,
                createdAt: data.createdAt?.toDate(),
                updatedAt: data.updatedAt?.toDate(),
            } as EndCustomer;
        });

        console.log(`📋 พบ End Customer ${endCustomers.length} รายการ ในบริษัท ${companyId}`);
        return endCustomers;
    } catch (error) {
        console.error('❌ Error getting end customers:', error);
        throw new Error('ไม่สามารถดึงรายการ End Customer ได้');
    }
};

/**
 * ดึงรายการ End Customer ตาม Customer ID
 * @param companyId - ID ของบริษัท
 * @param customerId - ID ของ Customer ที่ต้องการดู End Customer
 * @returns รายการ End Customer ของ Customer นั้น
 */
export const getEndCustomersByCustomer = async (companyId: string, customerId: string): Promise<EndCustomer[]> => {
    try {
        console.log('🔍 [getEndCustomersByCustomer] customerId:', customerId);
        
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error('กรุณา Login ก่อนดูข้อมูล End Customer');
        }
        
        if (!companyId || !customerId) {
            throw new Error('กรุณาระบุ companyId และ customerId');
        }
        
        // Query: กรองเฉพาะ Customer ที่ระบุ
        const q = query(
            collection(db, END_CUSTOMERS_COLLECTION),
            where('companyId', '==', companyId),
            where('customerId', '==', customerId),
            orderBy('lastUsedAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const endCustomers: EndCustomer[] = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                customerId: data.customerId,
                companyId: data.companyId,
                userId: data.userId,
                projectName: data.projectName,
                projectAddress: data.projectAddress,
                contactName: data.contactName,
                contactPhone: data.contactPhone,
                contactEmail: data.contactEmail,
                notes: data.notes,
                lastUsedAt: data.lastUsedAt?.toDate(),
                usageCount: data.usageCount || 0,
                createdAt: data.createdAt?.toDate(),
                updatedAt: data.updatedAt?.toDate(),
            } as EndCustomer;
        });

        console.log(`📋 พบ End Customer ${endCustomers.length} รายการ ของ Customer ${customerId}`);
        return endCustomers;
    } catch (error) {
        console.error('❌ Error getting end customers by customer:', error);
        throw new Error('ไม่สามารถดึงรายการ End Customer ได้');
    }
};

/**
 * ค้นหา End Customer
 * @param companyId - ID ของบริษัท
 * @param searchText - ข้อความค้นหา
 * @param customerId - (optional) กรองตาม Customer ID
 * @returns รายการ End Customer ที่ตรงกับการค้นหา
 */
export const searchEndCustomers = async (
    companyId: string, 
    searchText: string, 
    customerId?: string
): Promise<EndCustomer[]> => {
    try {
        // ดึงข้อมูลทั้งหมดก่อน (ตาม customerId ถ้ามี)
        const allEndCustomers = customerId 
            ? await getEndCustomersByCustomer(companyId, customerId)
            : await getEndCustomers(companyId);
        
        // Filter ด้วย JavaScript
        const searchLower = searchText.toLowerCase();
        const filtered = allEndCustomers.filter(ec => 
            ec.projectName.toLowerCase().includes(searchLower) ||
            (ec.projectAddress && ec.projectAddress.toLowerCase().includes(searchLower)) ||
            (ec.contactName && ec.contactName.toLowerCase().includes(searchLower)) ||
            (ec.contactPhone && ec.contactPhone.includes(searchText))
        );

        console.log(`🔍 พบ ${filtered.length} รายการจากการค้นหา "${searchText}"`);
        return filtered;
    } catch (error) {
        console.error('❌ Error searching end customers:', error);
        throw new Error('ไม่สามารถค้นหา End Customer ได้');
    }
};

/**
 * อัปเดตข้อมูล End Customer
 * @param id - ID ของ End Customer
 * @param updates - ข้อมูลที่ต้องการอัปเดต
 */
export const updateEndCustomer = async (
    id: string,
    updates: Partial<Omit<EndCustomer, 'id' | 'userId' | 'companyId' | 'customerId' | 'createdAt' | 'updatedAt'>>
): Promise<void> => {
    try {
        const docRef = doc(db, END_CUSTOMERS_COLLECTION, id);
        
        // ลบฟิลด์ที่มีค่า undefined ออก
        const cleanedUpdates = cleanUndefinedFields(updates as Record<string, unknown>);
        
        await updateDoc(docRef, {
            ...cleanedUpdates,
            updatedAt: Timestamp.now(),
        });
        
        console.log('✅ อัปเดตข้อมูล End Customer สำเร็จ:', id);
    } catch (error) {
        console.error('❌ Error updating end customer:', error);
        throw new Error('ไม่สามารถอัปเดตข้อมูล End Customer ได้');
    }
};

/**
 * ลบ End Customer
 * @param id - ID ของ End Customer ที่ต้องการลบ
 */
export const deleteEndCustomer = async (id: string): Promise<void> => {
    try {
        const docRef = doc(db, END_CUSTOMERS_COLLECTION, id);
        await deleteDoc(docRef);
        
        console.log('✅ ลบข้อมูล End Customer สำเร็จ:', id);
    } catch (error) {
        console.error('❌ Error deleting end customer:', error);
        throw new Error('ไม่สามารถลบข้อมูล End Customer ได้');
    }
};

/**
 * อัปเดตการใช้งาน End Customer
 * เรียกทุกครั้งที่เลือกใช้ End Customer เพื่อเก็บสถิติ
 * @param id - ID ของ End Customer
 */
export const updateEndCustomerUsage = async (id: string): Promise<void> => {
    try {
        const docRef = doc(db, END_CUSTOMERS_COLLECTION, id);
        
        const { increment } = await import('firebase/firestore');
        
        await updateDoc(docRef, {
            lastUsedAt: Timestamp.now(),
            usageCount: increment(1),
            updatedAt: Timestamp.now(),
        });
        
        console.log('✅ อัปเดตการใช้งาน End Customer สำเร็จ:', id);
    } catch (error) {
        console.error('❌ Error updating end customer usage:', error);
        // ไม่ throw error เพื่อไม่ให้กระทบการทำงานหลัก
    }
};

/**
 * ดึง End Customer ที่ใช้ล่าสุด
 * @param companyId - ID ของบริษัท
 * @param limit - จำนวนรายการที่ต้องการ
 * @returns รายการ End Customer ที่ใช้ล่าสุด
 */
export const getRecentEndCustomers = async (companyId: string, limit: number = 10): Promise<EndCustomer[]> => {
    try {
        const allEndCustomers = await getEndCustomers(companyId);
        
        // เรียงตาม lastUsedAt จากใหม่ไปเก่า
        const sorted = allEndCustomers
            .filter(ec => ec.lastUsedAt)
            .sort((a, b) => {
                const dateA = a.lastUsedAt?.getTime() || 0;
                const dateB = b.lastUsedAt?.getTime() || 0;
                return dateB - dateA;
            })
            .slice(0, limit);

        console.log(`🕒 พบ End Customer ที่ใช้ล่าสุด ${sorted.length} รายการ`);
        return sorted;
    } catch (error) {
        console.error('❌ Error getting recent end customers:', error);
        return [];
    }
};
