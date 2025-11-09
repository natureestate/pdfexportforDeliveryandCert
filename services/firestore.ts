// Firestore Service - บริการสำหรับจัดการข้อมูลใน Firestore
// ไฟล์นี้รวมฟังก์ชันสำหรับ CRUD operations กับ Firestore

import { 
    collection, 
    doc, 
    getDoc, 
    getDocs, 
    setDoc, 
    updateDoc, 
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    Timestamp,
    QueryConstraint
} from "firebase/firestore";
import { db, auth } from "../firebase.config";
import { DeliveryNoteData, WarrantyData, InvoiceData, ReceiptData } from "../types";

// Collection names
const DELIVERY_NOTES_COLLECTION = "deliveryNotes";
const WARRANTY_CARDS_COLLECTION = "warrantyCards";
const INVOICES_COLLECTION = "invoices";
const RECEIPTS_COLLECTION = "receipts";

/**
 * สร้าง Document ID ที่อ่านง่าย สำหรับใบส่งมอบงาน
 * รูปแบบ: YYMMDD_DN-XXXX (เช่น 250930_DN-2025-001)
 */
const generateDeliveryNoteId = (docNumber: string): string => {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    
    // ลบ "DN-" ออกจาก docNumber ถ้ามี แล้วใส่กลับในรูปแบบที่ต้องการ
    const cleanDocNumber = docNumber.replace(/^DN-/i, '');
    return `${yy}${mm}${dd}_DN-${cleanDocNumber}`;
};

/**
 * สร้าง Document ID ที่อ่านง่าย สำหรับใบแจ้งหนี้
 * รูปแบบ: YYMMDD_IN-XXXX (เช่น 251010_IN-2025-001)
 */
const generateInvoiceId = (invoiceNumber: string): string => {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    
    // ลบ "IN-" ออกจาก invoiceNumber ถ้ามี แล้วใส่กลับในรูปแบบที่ต้องการ
    const cleanInvoiceNumber = invoiceNumber.replace(/^IN-/i, '');
    return `${yy}${mm}${dd}_IN-${cleanInvoiceNumber}`;
};

/**
 * สร้าง Document ID ที่อ่านง่าย สำหรับใบเสร็จ
 * รูปแบบ: YYMMDD_RC-XXXX (เช่น 251010_RC-2025-001)
 */
const generateReceiptId = (receiptNumber: string): string => {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    
    // ลบ "RC-" ออกจาก receiptNumber ถ้ามี แล้วใส่กลับในรูปแบบที่ต้องการ
    const cleanReceiptNumber = receiptNumber.replace(/^RC-/i, '');
    return `${yy}${mm}${dd}_RC-${cleanReceiptNumber}`;
};

// Interface สำหรับเอกสารที่บันทึกใน Firestore
export interface FirestoreDocument {
    id?: string;
    createdAt?: Date;
    updatedAt?: Date;
    isDeleted?: boolean;      // สำหรับ soft delete
    deletedAt?: Date | null;  // วันที่ลบ (soft delete)
}

export interface DeliveryNoteDocument extends DeliveryNoteData, FirestoreDocument {}
export interface WarrantyDocument extends WarrantyData, FirestoreDocument {}
export interface InvoiceDocument extends InvoiceData, FirestoreDocument {}
export interface ReceiptDocument extends ReceiptData, FirestoreDocument {}

// ==================== Delivery Notes Functions ====================

/**
 * บันทึกใบส่งมอบงานใหม่ลง Firestore
 * @param data - ข้อมูลใบส่งมอบงาน
 * @param companyId - ID ของบริษัท (optional)
 */
export const saveDeliveryNote = async (data: DeliveryNoteData, companyId?: string): Promise<string> => {
    try {
        // ตรวจสอบว่า user login แล้วหรือยัง
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error("กรุณา Login ก่อนบันทึกข้อมูล");
        }
        
        // สร้าง Document ID ที่อ่านง่าย
        const docId = generateDeliveryNoteId(data.docNumber);
        const docRef = doc(db, DELIVERY_NOTES_COLLECTION, docId);
        
        // เตรียมข้อมูลสำหรับบันทึก - ไม่บันทึก Base64 ถ้ามี logoUrl
        const dataToSave = {
            ...data,
            // ถ้ามี logoUrl (อัปโหลดไปยัง Storage แล้ว) ให้ลบ Base64 ออก
            logo: data.logoUrl ? null : data.logo,
            userId: currentUser.uid, // เพิ่ม userId
            companyId: companyId || null, // เพิ่ม companyId
            isDeleted: false, // ตั้งค่า isDeleted เป็น false สำหรับเอกสารใหม่
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        };
        
        await setDoc(docRef, dataToSave);
        
        return docId;
    } catch (error) {
        console.error("Error saving delivery note:", error);
        throw new Error("ไม่สามารถบันทึกใบส่งมอบงานได้");
    }
};

/**
 * ดึงข้อมูลใบส่งมอบงานตาม ID
 */
export const getDeliveryNote = async (id: string): Promise<DeliveryNoteDocument | null> => {
    try {
        const docRef = doc(db, DELIVERY_NOTES_COLLECTION, id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            // ถ้าเอกสารถูกลบ (soft delete) ให้ return null
            if (data.isDeleted) {
                return null;
            }
            return {
                id: docSnap.id,
                ...data,
                date: data.date?.toDate() || null,
                createdAt: data.createdAt?.toDate(),
                updatedAt: data.updatedAt?.toDate(),
                deletedAt: data.deletedAt?.toDate() || null,
            } as DeliveryNoteDocument;
        }
        return null;
    } catch (error) {
        console.error("Error getting delivery note:", error);
        throw new Error("ไม่สามารถดึงข้อมูลใบส่งมอบงานได้");
    }
};

/**
 * ดึงรายการใบส่งมอบงานทั้งหมด (มีการ limit) - เฉพาะของ user และ company ที่เลือก
 * @param limitCount - จำนวนเอกสารที่ต้องการดึง
 * @param companyId - ID ของบริษัท (optional) ถ้าไม่ระบุจะดึงทั้งหมด
 */
export const getDeliveryNotes = async (limitCount: number = 50, companyId?: string): Promise<DeliveryNoteDocument[]> => {
    try {
        // ตรวจสอบว่า user login แล้วหรือยัง
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error("กรุณา Login ก่อนดูข้อมูล");
        }
        
        // สร้าง query constraints
        const constraints: QueryConstraint[] = [
            where("userId", "==", currentUser.uid), // กรองเฉพาะของ user นี้
        ];
        
        // ถ้ามี companyId ให้กรองเฉพาะบริษัทนั้น
        if (companyId) {
            constraints.push(where("companyId", "==", companyId));
        }
        
        // กรองเฉพาะเอกสารที่ยังไม่ถูกลบ (isDeleted != true)
        // ใช้ where("isDeleted", "==", false) เพื่อกรองเอกสารที่ isDeleted เป็น false หรือไม่มี field
        // หมายเหตุ: Firestore จะรวมเอกสารที่ไม่มี field isDeleted ด้วย
        constraints.push(where("isDeleted", "==", false));
        
        constraints.push(orderBy("createdAt", "desc"));
        constraints.push(limit(limitCount));
        
        const q = query(collection(db, DELIVERY_NOTES_COLLECTION), ...constraints);
        
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs
            .map(doc => {
                const data = doc.data();
                // ตรวจสอบอีกครั้งที่ client-side เพื่อความแน่ใจ
                if (data.isDeleted === true) {
                    return null;
                }
                return {
                    id: doc.id,
                    ...data,
                    date: data.date?.toDate() || null,
                    createdAt: data.createdAt?.toDate(),
                    updatedAt: data.updatedAt?.toDate(),
                    deletedAt: data.deletedAt?.toDate() || null,
                } as DeliveryNoteDocument;
            })
            .filter((doc): doc is DeliveryNoteDocument => doc !== null && !doc.isDeleted); // กรองเอกสารที่ถูกลบ (soft delete) ออก
    } catch (error) {
        console.error("Error getting delivery notes:", error);
        throw new Error("ไม่สามารถดึงรายการใบส่งมอบงานได้");
    }
};

/**
 * อัปเดตใบส่งมอบงาน
 * @param id - Document ID ของเอกสารที่ต้องการอัปเดต
 * @param data - ข้อมูลที่ต้องการอัปเดต
 */
export const updateDeliveryNote = async (id: string, data: Partial<DeliveryNoteData>): Promise<void> => {
    try {
        // ตรวจสอบว่า user login แล้วหรือยัง
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error("กรุณา Login ก่อนอัปเดตข้อมูล");
        }

        // ตรวจสอบว่าเอกสารมีอยู่จริงและ user มีสิทธิ์แก้ไข
        const docRef = doc(db, DELIVERY_NOTES_COLLECTION, id);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
            throw new Error("ไม่พบเอกสารที่ต้องการอัปเดต");
        }

        const existingData = docSnap.data();
        
        // ตรวจสอบสิทธิ์: ต้องเป็นเจ้าของหรือเป็น Super Admin (ตรวจสอบที่ Firestore Rules)
        if (existingData.userId !== currentUser.uid && existingData.companyId == null) {
            throw new Error("คุณไม่มีสิทธิ์แก้ไขเอกสารนี้");
        }

        // เตรียมข้อมูลสำหรับอัปเดต
        const dataToUpdate: any = {
            ...data,
            updatedAt: Timestamp.now(),
        };

        // จัดการ logo: ถ้ามี logoUrl ให้ลบ Base64 ออก
        if (data.logoUrl !== undefined) {
            dataToUpdate.logo = data.logoUrl ? null : data.logo;
        }

        // แปลง Date เป็น Timestamp ถ้ามี
        if (data.date instanceof Date) {
            dataToUpdate.date = Timestamp.fromDate(data.date);
        }

        await updateDoc(docRef, dataToUpdate);
    } catch (error) {
        console.error("Error updating delivery note:", error);
        throw error instanceof Error ? error : new Error("ไม่สามารถอัปเดตใบส่งมอบงานได้");
    }
};

/**
 * ลบใบส่งมอบงาน (Soft Delete) - ตั้งค่า isDeleted = true แทนการลบจริง
 * @param id - Document ID ของเอกสารที่ต้องการลบ
 */
export const deleteDeliveryNote = async (id: string): Promise<void> => {
    try {
        // ตรวจสอบว่า user login แล้วหรือยัง
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error("กรุณา Login ก่อนลบข้อมูล");
        }

        // ตรวจสอบว่าเอกสารมีอยู่จริงและ user มีสิทธิ์ลบ
        const docRef = doc(db, DELIVERY_NOTES_COLLECTION, id);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
            throw new Error("ไม่พบเอกสารที่ต้องการลบ");
        }

        const existingData = docSnap.data();
        
        // ตรวจสอบสิทธิ์: ต้องเป็นเจ้าของหรือเป็น Super Admin (ตรวจสอบที่ Firestore Rules)
        if (existingData.userId !== currentUser.uid && existingData.companyId == null) {
            throw new Error("คุณไม่มีสิทธิ์ลบเอกสารนี้");
        }

        // ใช้ soft delete แทนการลบจริง - ตั้งค่า isDeleted = true และ deletedAt
        await updateDoc(docRef, {
            isDeleted: true,
            deletedAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        });
        console.log(`✅ Soft delete delivery note สำเร็จ: ${id}`);
    } catch (error) {
        console.error("Error deleting delivery note:", error);
        throw error instanceof Error ? error : new Error("ไม่สามารถลบใบส่งมอบงานได้");
    }
};

/**
 * ค้นหาใบส่งมอบงานตามเลขที่เอกสาร
 * @param docNumber - เลขที่เอกสารที่ต้องการค้นหา
 * @param companyId - ID ของบริษัท (optional) ถ้าไม่ระบุจะค้นหาทั้งหมดของ user
 */
export const searchDeliveryNoteByDocNumber = async (docNumber: string, companyId?: string): Promise<DeliveryNoteDocument[]> => {
    try {
        // ตรวจสอบว่า user login แล้วหรือยัง
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error("กรุณา Login ก่อนค้นหาข้อมูล");
        }

        // สร้าง query constraints
        const constraints: QueryConstraint[] = [
            where("docNumber", "==", docNumber),
            where("userId", "==", currentUser.uid), // กรองเฉพาะของ user นี้
            where("isDeleted", "==", false), // กรองเฉพาะเอกสารที่ยังไม่ถูกลบ
        ];

        // ถ้ามี companyId ให้กรองเฉพาะบริษัทนั้น
        if (companyId) {
            constraints.push(where("companyId", "==", companyId));
        }

        const q = query(collection(db, DELIVERY_NOTES_COLLECTION), ...constraints);
        
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs
            .map(doc => {
                const data = doc.data();
                // ตรวจสอบอีกครั้งที่ client-side เพื่อความแน่ใจ
                if (data.isDeleted === true) {
                    return null;
                }
                return {
                    id: doc.id,
                    ...data,
                    date: data.date?.toDate() || null,
                    createdAt: data.createdAt?.toDate(),
                    updatedAt: data.updatedAt?.toDate(),
                    deletedAt: data.deletedAt?.toDate() || null,
                } as DeliveryNoteDocument;
            })
            .filter((doc): doc is DeliveryNoteDocument => doc !== null && !doc.isDeleted); // กรองเอกสารที่ถูกลบ (soft delete) ออก
    } catch (error) {
        console.error("Error searching delivery note:", error);
        throw new Error("ไม่สามารถค้นหาใบส่งมอบงานได้");
    }
};

// ==================== Warranty Cards Functions ====================

/**
 * บันทึกใบรับประกันสินค้าใหม่ลง Firestore
 * @param data - ข้อมูลใบรับประกัน
 * @param companyId - ID ของบริษัท (optional)
 */
export const saveWarrantyCard = async (data: WarrantyData, companyId?: string): Promise<string> => {
    try {
        // ตรวจสอบว่า user login แล้วหรือยัง
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error("กรุณา Login ก่อนบันทึกข้อมูล");
        }
        
        // สร้าง Document ID ที่อ่านง่าย
        const docId = generateWarrantyCardId(data.houseModel);
        const docRef = doc(db, WARRANTY_CARDS_COLLECTION, docId);
        
        // เตรียมข้อมูลสำหรับบันทึก - ไม่บันทึก Base64 ถ้ามี logoUrl
        const dataToSave = {
            ...data,
            // ถ้ามี logoUrl (อัปโหลดไปยัง Storage แล้ว) ให้ลบ Base64 ออก
            logo: data.logoUrl ? null : data.logo,
            userId: currentUser.uid, // เพิ่ม userId
            companyId: companyId || null, // เพิ่ม companyId
            isDeleted: false, // ตั้งค่า isDeleted เป็น false สำหรับเอกสารใหม่
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        };
        
        await setDoc(docRef, dataToSave);
        
        return docId;
    } catch (error) {
        console.error("Error saving warranty card:", error);
        throw new Error("ไม่สามารถบันทึกใบรับประกันสินค้าได้");
    }
};

/**
 * ดึงข้อมูลใบรับประกันสินค้าตาม ID
 */
export const getWarrantyCard = async (id: string): Promise<WarrantyDocument | null> => {
    try {
        const docRef = doc(db, WARRANTY_CARDS_COLLECTION, id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            // ถ้าเอกสารถูกลบ (soft delete) ให้ return null
            if (data.isDeleted) {
                return null;
            }
            return {
                id: docSnap.id,
                ...data,
                purchaseDate: data.purchaseDate?.toDate() || null,
                createdAt: data.createdAt?.toDate(),
                updatedAt: data.updatedAt?.toDate(),
                deletedAt: data.deletedAt?.toDate() || null,
            } as WarrantyDocument;
        }
        return null;
    } catch (error) {
        console.error("Error getting warranty card:", error);
        throw new Error("ไม่สามารถดึงข้อมูลใบรับประกันสินค้าได้");
    }
};

/**
 * ดึงรายการใบรับประกันสินค้าทั้งหมด (มีการ limit) - เฉพาะของ user และ company ที่เลือก
 * @param limitCount - จำนวนเอกสารที่ต้องการดึง
 * @param companyId - ID ของบริษัท (optional) ถ้าไม่ระบุจะดึงทั้งหมด
 */
export const getWarrantyCards = async (limitCount: number = 50, companyId?: string): Promise<WarrantyDocument[]> => {
    try {
        // ตรวจสอบว่า user login แล้วหรือยัง
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error("กรุณา Login ก่อนดูข้อมูล");
        }
        
        // สร้าง query constraints
        const constraints: QueryConstraint[] = [
            where("userId", "==", currentUser.uid), // กรองเฉพาะของ user นี้
        ];
        
        // ถ้ามี companyId ให้กรองเฉพาะบริษัทนั้น
        if (companyId) {
            constraints.push(where("companyId", "==", companyId));
        }
        
        // กรองเฉพาะเอกสารที่ยังไม่ถูกลบ (isDeleted != true)
        // ใช้ where("isDeleted", "==", false) เพื่อกรองเอกสารที่ isDeleted เป็น false หรือไม่มี field
        // หมายเหตุ: Firestore จะรวมเอกสารที่ไม่มี field isDeleted ด้วย
        constraints.push(where("isDeleted", "==", false));
        
        constraints.push(orderBy("createdAt", "desc"));
        constraints.push(limit(limitCount));
        
        const q = query(collection(db, WARRANTY_CARDS_COLLECTION), ...constraints);
        
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs
            .map(doc => {
                const data = doc.data();
                // ตรวจสอบอีกครั้งที่ client-side เพื่อความแน่ใจ
                if (data.isDeleted === true) {
                    return null;
                }
                return {
                    id: doc.id,
                    ...data,
                    purchaseDate: data.purchaseDate?.toDate() || null,
                    warrantyEndDate: data.warrantyEndDate?.toDate() || null,
                    issueDate: data.issueDate?.toDate() || null,
                    createdAt: data.createdAt?.toDate(),
                    updatedAt: data.updatedAt?.toDate(),
                    deletedAt: data.deletedAt?.toDate() || null,
                } as WarrantyDocument;
            })
            .filter((doc): doc is WarrantyDocument => doc !== null && !doc.isDeleted); // กรองเอกสารที่ถูกลบ (soft delete) ออก
    } catch (error) {
        console.error("Error getting warranty cards:", error);
        throw new Error("ไม่สามารถดึงรายการใบรับประกันสินค้าได้");
    }
};

/**
 * อัปเดตใบรับประกันสินค้า
 * @param id - Document ID ของเอกสารที่ต้องการอัปเดต
 * @param data - ข้อมูลที่ต้องการอัปเดต
 */
export const updateWarrantyCard = async (id: string, data: Partial<WarrantyData>): Promise<void> => {
    try {
        // ตรวจสอบว่า user login แล้วหรือยัง
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error("กรุณา Login ก่อนอัปเดตข้อมูล");
        }

        // ตรวจสอบว่าเอกสารมีอยู่จริงและ user มีสิทธิ์แก้ไข
        const docRef = doc(db, WARRANTY_CARDS_COLLECTION, id);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
            throw new Error("ไม่พบเอกสารที่ต้องการอัปเดต");
        }

        const existingData = docSnap.data();
        
        // ตรวจสอบสิทธิ์: ต้องเป็นเจ้าของหรือเป็น Super Admin (ตรวจสอบที่ Firestore Rules)
        if (existingData.userId !== currentUser.uid && existingData.companyId == null) {
            throw new Error("คุณไม่มีสิทธิ์แก้ไขเอกสารนี้");
        }

        // เตรียมข้อมูลสำหรับอัปเดต
        const dataToUpdate: any = {
            ...data,
            updatedAt: Timestamp.now(),
        };

        // จัดการ logo: ถ้ามี logoUrl ให้ลบ Base64 ออก
        if (data.logoUrl !== undefined) {
            dataToUpdate.logo = data.logoUrl ? null : data.logo;
        }

        // แปลง Date เป็น Timestamp ถ้ามี
        if (data.purchaseDate instanceof Date) {
            dataToUpdate.purchaseDate = Timestamp.fromDate(data.purchaseDate);
        }
        if (data.warrantyEndDate instanceof Date) {
            dataToUpdate.warrantyEndDate = Timestamp.fromDate(data.warrantyEndDate);
        }
        if (data.issueDate instanceof Date) {
            dataToUpdate.issueDate = Timestamp.fromDate(data.issueDate);
        }

        await updateDoc(docRef, dataToUpdate);
    } catch (error) {
        console.error("Error updating warranty card:", error);
        throw error instanceof Error ? error : new Error("ไม่สามารถอัปเดตใบรับประกันสินค้าได้");
    }
};

/**
 * ลบใบรับประกันสินค้า (Soft Delete) - ตั้งค่า isDeleted = true แทนการลบจริง
 * @param id - Document ID ของเอกสารที่ต้องการลบ
 */
export const deleteWarrantyCard = async (id: string): Promise<void> => {
    try {
        // ตรวจสอบว่า user login แล้วหรือยัง
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error("กรุณา Login ก่อนลบข้อมูล");
        }

        // ตรวจสอบว่าเอกสารมีอยู่จริงและ user มีสิทธิ์ลบ
        const docRef = doc(db, WARRANTY_CARDS_COLLECTION, id);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
            throw new Error("ไม่พบเอกสารที่ต้องการลบ");
        }

        const existingData = docSnap.data();
        
        // ตรวจสอบสิทธิ์: ต้องเป็นเจ้าของหรือเป็น Super Admin (ตรวจสอบที่ Firestore Rules)
        if (existingData.userId !== currentUser.uid && existingData.companyId == null) {
            throw new Error("คุณไม่มีสิทธิ์ลบเอกสารนี้");
        }

        // ใช้ soft delete แทนการลบจริง - ตั้งค่า isDeleted = true และ deletedAt
        await updateDoc(docRef, {
            isDeleted: true,
            deletedAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        });
        console.log(`✅ Soft delete warranty card สำเร็จ: ${id}`);
    } catch (error) {
        console.error("Error deleting warranty card:", error);
        throw error instanceof Error ? error : new Error("ไม่สามารถลบใบรับประกันสินค้าได้");
    }
};

/**
 * ค้นหาใบรับประกันสินค้าตามแบบบ้าน
 * @param houseModel - แบบบ้านที่ต้องการค้นหา
 * @param companyId - ID ของบริษัท (optional) ถ้าไม่ระบุจะค้นหาทั้งหมดของ user
 */
export const searchWarrantyCardByHouseModel = async (houseModel: string, companyId?: string): Promise<WarrantyDocument[]> => {
    try {
        // ตรวจสอบว่า user login แล้วหรือยัง
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error("กรุณา Login ก่อนค้นหาข้อมูล");
        }

        // สร้าง query constraints
        const constraints: QueryConstraint[] = [
            where("houseModel", "==", houseModel),
            where("userId", "==", currentUser.uid), // กรองเฉพาะของ user นี้
            where("isDeleted", "==", false), // กรองเฉพาะเอกสารที่ยังไม่ถูกลบ
        ];

        // ถ้ามี companyId ให้กรองเฉพาะบริษัทนั้น
        if (companyId) {
            constraints.push(where("companyId", "==", companyId));
        }

        const q = query(collection(db, WARRANTY_CARDS_COLLECTION), ...constraints);
        
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs
            .map(doc => {
                const data = doc.data();
                // ตรวจสอบอีกครั้งที่ client-side เพื่อความแน่ใจ
                if (data.isDeleted === true) {
                    return null;
                }
                return {
                    id: doc.id,
                    ...data,
                    purchaseDate: data.purchaseDate?.toDate() || null,
                    warrantyEndDate: data.warrantyEndDate?.toDate() || null,
                    issueDate: data.issueDate?.toDate() || null,
                    createdAt: data.createdAt?.toDate(),
                    updatedAt: data.updatedAt?.toDate(),
                    deletedAt: data.deletedAt?.toDate() || null,
                } as WarrantyDocument;
            })
            .filter((doc): doc is WarrantyDocument => doc !== null && !doc.isDeleted); // กรองเอกสารที่ถูกลบ (soft delete) ออก
    } catch (error) {
        console.error("Error searching warranty card:", error);
        throw new Error("ไม่สามารถค้นหาใบรับประกันสินค้าได้");
    }
};

// Export ชื่อเดิมเพื่อ backward compatibility
export const searchWarrantyCardBySerialNumber = searchWarrantyCardByHouseModel;

// ==================== Invoice Functions ====================

/**
 * บันทึกใบแจ้งหนี้ใหม่ลง Firestore
 * @param data - ข้อมูลใบแจ้งหนี้
 * @param companyId - ID ของบริษัท (optional)
 */
export const saveInvoice = async (data: InvoiceData, companyId?: string): Promise<string> => {
    try {
        // ตรวจสอบว่า user login แล้วหรือยัง
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error("กรุณา Login ก่อนบันทึกข้อมูล");
        }
        
        // สร้าง Document ID ที่อ่านง่าย
        const docId = generateInvoiceId(data.invoiceNumber);
        const docRef = doc(db, INVOICES_COLLECTION, docId);
        
        // เตรียมข้อมูลสำหรับบันทึก - ไม่บันทึก Base64 ถ้ามี logoUrl
        const dataToSave = {
            ...data,
            // ถ้ามี logoUrl (อัปโหลดไปยัง Storage แล้ว) ให้ลบ Base64 ออก
            logo: data.logoUrl ? null : data.logo,
            userId: currentUser.uid, // เพิ่ม userId
            companyId: companyId || null, // เพิ่ม companyId
            isDeleted: false, // ตั้งค่า isDeleted เป็น false สำหรับเอกสารใหม่
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        };
        
        // แปลง Date เป็น Timestamp
        if (data.invoiceDate instanceof Date) {
            dataToSave.invoiceDate = Timestamp.fromDate(data.invoiceDate);
        }
        if (data.dueDate instanceof Date) {
            dataToSave.dueDate = Timestamp.fromDate(data.dueDate);
        }
        
        await setDoc(docRef, dataToSave);
        
        return docId;
    } catch (error) {
        console.error("Error saving invoice:", error);
        throw new Error("ไม่สามารถบันทึกใบแจ้งหนี้ได้");
    }
};

/**
 * ดึงข้อมูลใบแจ้งหนี้ตาม ID
 */
export const getInvoice = async (id: string): Promise<InvoiceDocument | null> => {
    try {
        const docRef = doc(db, INVOICES_COLLECTION, id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            // ถ้าเอกสารถูกลบ (soft delete) ให้ return null
            if (data.isDeleted) {
                return null;
            }
            return {
                id: docSnap.id,
                ...data,
                invoiceDate: data.invoiceDate?.toDate() || null,
                dueDate: data.dueDate?.toDate() || null,
                createdAt: data.createdAt?.toDate(),
                updatedAt: data.updatedAt?.toDate(),
                deletedAt: data.deletedAt?.toDate() || null,
            } as InvoiceDocument;
        }
        return null;
    } catch (error) {
        console.error("Error getting invoice:", error);
        throw new Error("ไม่สามารถดึงข้อมูลใบแจ้งหนี้ได้");
    }
};

/**
 * ดึงรายการใบแจ้งหนี้ทั้งหมด (มีการ limit) - เฉพาะของ user และ company ที่เลือก
 * @param limitCount - จำนวนเอกสารที่ต้องการดึง
 * @param companyId - ID ของบริษัท (optional) ถ้าไม่ระบุจะดึงทั้งหมด
 */
export const getInvoices = async (limitCount: number = 50, companyId?: string): Promise<InvoiceDocument[]> => {
    try {
        // ตรวจสอบว่า user login แล้วหรือยัง
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error("กรุณา Login ก่อนดูข้อมูล");
        }
        
        // สร้าง query constraints
        const constraints: QueryConstraint[] = [
            where("userId", "==", currentUser.uid), // กรองเฉพาะของ user นี้
        ];
        
        // ถ้ามี companyId ให้กรองเฉพาะบริษัทนั้น
        if (companyId) {
            constraints.push(where("companyId", "==", companyId));
        }
        
        // กรองเฉพาะเอกสารที่ยังไม่ถูกลบ (isDeleted != true)
        constraints.push(where("isDeleted", "==", false));
        
        constraints.push(orderBy("createdAt", "desc"));
        constraints.push(limit(limitCount));
        
        const q = query(collection(db, INVOICES_COLLECTION), ...constraints);
        
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs
            .map(doc => {
                const data = doc.data();
                // ตรวจสอบอีกครั้งที่ client-side เพื่อความแน่ใจ
                if (data.isDeleted === true) {
                    return null;
                }
                return {
                    id: doc.id,
                    ...data,
                    invoiceDate: data.invoiceDate?.toDate() || null,
                    dueDate: data.dueDate?.toDate() || null,
                    createdAt: data.createdAt?.toDate(),
                    updatedAt: data.updatedAt?.toDate(),
                    deletedAt: data.deletedAt?.toDate() || null,
                } as InvoiceDocument;
            })
            .filter((doc): doc is InvoiceDocument => doc !== null && !doc.isDeleted); // กรองเอกสารที่ถูกลบ (soft delete) ออก
    } catch (error) {
        console.error("Error getting invoices:", error);
        throw new Error("ไม่สามารถดึงรายการใบแจ้งหนี้ได้");
    }
};

/**
 * อัปเดตใบแจ้งหนี้
 * @param id - Document ID ของเอกสารที่ต้องการอัปเดต
 * @param data - ข้อมูลที่ต้องการอัปเดต
 */
export const updateInvoice = async (id: string, data: Partial<InvoiceData>): Promise<void> => {
    try {
        // ตรวจสอบว่า user login แล้วหรือยัง
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error("กรุณา Login ก่อนอัปเดตข้อมูล");
        }

        // ตรวจสอบว่าเอกสารมีอยู่จริงและ user มีสิทธิ์แก้ไข
        const docRef = doc(db, INVOICES_COLLECTION, id);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
            throw new Error("ไม่พบเอกสารที่ต้องการอัปเดต");
        }

        const existingData = docSnap.data();
        
        // ตรวจสอบสิทธิ์: ต้องเป็นเจ้าของหรือเป็น Super Admin (ตรวจสอบที่ Firestore Rules)
        if (existingData.userId !== currentUser.uid && existingData.companyId == null) {
            throw new Error("คุณไม่มีสิทธิ์แก้ไขเอกสารนี้");
        }

        // เตรียมข้อมูลสำหรับอัปเดต
        const dataToUpdate: any = {
            ...data,
            updatedAt: Timestamp.now(),
        };

        // จัดการ logo: ถ้ามี logoUrl ให้ลบ Base64 ออก
        if (data.logoUrl !== undefined) {
            dataToUpdate.logo = data.logoUrl ? null : data.logo;
        }

        // แปลง Date เป็น Timestamp ถ้ามี
        if (data.invoiceDate instanceof Date) {
            dataToUpdate.invoiceDate = Timestamp.fromDate(data.invoiceDate);
        }
        if (data.dueDate instanceof Date) {
            dataToUpdate.dueDate = Timestamp.fromDate(data.dueDate);
        }

        await updateDoc(docRef, dataToUpdate);
    } catch (error) {
        console.error("Error updating invoice:", error);
        throw error instanceof Error ? error : new Error("ไม่สามารถอัปเดตใบแจ้งหนี้ได้");
    }
};

/**
 * ลบใบแจ้งหนี้ (Soft Delete) - ตั้งค่า isDeleted = true แทนการลบจริง
 * @param id - Document ID ของเอกสารที่ต้องการลบ
 */
export const deleteInvoice = async (id: string): Promise<void> => {
    try {
        // ตรวจสอบว่า user login แล้วหรือยัง
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error("กรุณา Login ก่อนลบข้อมูล");
        }

        // ตรวจสอบว่าเอกสารมีอยู่จริงและ user มีสิทธิ์ลบ
        const docRef = doc(db, INVOICES_COLLECTION, id);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
            throw new Error("ไม่พบเอกสารที่ต้องการลบ");
        }

        const existingData = docSnap.data();
        
        // ตรวจสอบสิทธิ์: ต้องเป็นเจ้าของหรือเป็น Super Admin (ตรวจสอบที่ Firestore Rules)
        if (existingData.userId !== currentUser.uid && existingData.companyId == null) {
            throw new Error("คุณไม่มีสิทธิ์ลบเอกสารนี้");
        }

        // ใช้ soft delete แทนการลบจริง - ตั้งค่า isDeleted = true และ deletedAt
        await updateDoc(docRef, {
            isDeleted: true,
            deletedAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        });
        console.log(`✅ Soft delete invoice สำเร็จ: ${id}`);
    } catch (error) {
        console.error("Error deleting invoice:", error);
        throw error instanceof Error ? error : new Error("ไม่สามารถลบใบแจ้งหนี้ได้");
    }
};

/**
 * ค้นหาใบแจ้งหนี้ตามเลขที่เอกสาร
 * @param invoiceNumber - เลขที่ใบแจ้งหนี้ที่ต้องการค้นหา
 * @param companyId - ID ของบริษัท (optional) ถ้าไม่ระบุจะค้นหาทั้งหมดของ user
 */
export const searchInvoiceByInvoiceNumber = async (invoiceNumber: string, companyId?: string): Promise<InvoiceDocument[]> => {
    try {
        // ตรวจสอบว่า user login แล้วหรือยัง
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error("กรุณา Login ก่อนค้นหาข้อมูล");
        }

        // สร้าง query constraints
        const constraints: QueryConstraint[] = [
            where("invoiceNumber", "==", invoiceNumber),
            where("userId", "==", currentUser.uid), // กรองเฉพาะของ user นี้
            where("isDeleted", "==", false), // กรองเฉพาะเอกสารที่ยังไม่ถูกลบ
        ];

        // ถ้ามี companyId ให้กรองเฉพาะบริษัทนั้น
        if (companyId) {
            constraints.push(where("companyId", "==", companyId));
        }

        const q = query(collection(db, INVOICES_COLLECTION), ...constraints);
        
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs
            .map(doc => {
                const data = doc.data();
                // ตรวจสอบอีกครั้งที่ client-side เพื่อความแน่ใจ
                if (data.isDeleted === true) {
                    return null;
                }
                return {
                    id: doc.id,
                    ...data,
                    invoiceDate: data.invoiceDate?.toDate() || null,
                    dueDate: data.dueDate?.toDate() || null,
                    createdAt: data.createdAt?.toDate(),
                    updatedAt: data.updatedAt?.toDate(),
                    deletedAt: data.deletedAt?.toDate() || null,
                } as InvoiceDocument;
            })
            .filter((doc): doc is InvoiceDocument => doc !== null && !doc.isDeleted); // กรองเอกสารที่ถูกลบ (soft delete) ออก
    } catch (error) {
        console.error("Error searching invoice:", error);
        throw new Error("ไม่สามารถค้นหาใบแจ้งหนี้ได้");
    }
};

// ==================== Receipt Functions ====================

/**
 * บันทึกใบเสร็จใหม่ลง Firestore
 * @param data - ข้อมูลใบเสร็จ
 * @param companyId - ID ของบริษัท (optional)
 */
export const saveReceipt = async (data: ReceiptData, companyId?: string): Promise<string> => {
    try {
        // ตรวจสอบว่า user login แล้วหรือยัง
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error("กรุณา Login ก่อนบันทึกข้อมูล");
        }
        
        // สร้าง Document ID ที่อ่านง่าย
        const docId = generateReceiptId(data.receiptNumber);
        const docRef = doc(db, RECEIPTS_COLLECTION, docId);
        
        // เตรียมข้อมูลสำหรับบันทึก - ไม่บันทึก Base64 ถ้ามี logoUrl
        const dataToSave = {
            ...data,
            // ถ้ามี logoUrl (อัปโหลดไปยัง Storage แล้ว) ให้ลบ Base64 ออก
            logo: data.logoUrl ? null : data.logo,
            userId: currentUser.uid, // เพิ่ม userId
            companyId: companyId || null, // เพิ่ม companyId
            isDeleted: false, // ตั้งค่า isDeleted เป็น false สำหรับเอกสารใหม่
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        };
        
        // แปลง Date เป็น Timestamp
        if (data.receiptDate instanceof Date) {
            dataToSave.receiptDate = Timestamp.fromDate(data.receiptDate);
        }
        
        await setDoc(docRef, dataToSave);
        
        return docId;
    } catch (error) {
        console.error("Error saving receipt:", error);
        throw new Error("ไม่สามารถบันทึกใบเสร็จได้");
    }
};

/**
 * ดึงข้อมูลใบเสร็จตาม ID
 */
export const getReceipt = async (id: string): Promise<ReceiptDocument | null> => {
    try {
        const docRef = doc(db, RECEIPTS_COLLECTION, id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            // ถ้าเอกสารถูกลบ (soft delete) ให้ return null
            if (data.isDeleted) {
                return null;
            }
            return {
                id: docSnap.id,
                ...data,
                receiptDate: data.receiptDate?.toDate() || null,
                createdAt: data.createdAt?.toDate(),
                updatedAt: data.updatedAt?.toDate(),
                deletedAt: data.deletedAt?.toDate() || null,
            } as ReceiptDocument;
        }
        return null;
    } catch (error) {
        console.error("Error getting receipt:", error);
        throw new Error("ไม่สามารถดึงข้อมูลใบเสร็จได้");
    }
};

/**
 * ดึงรายการใบเสร็จทั้งหมด (มีการ limit) - เฉพาะของ user และ company ที่เลือก
 * @param limitCount - จำนวนเอกสารที่ต้องการดึง
 * @param companyId - ID ของบริษัท (optional) ถ้าไม่ระบุจะดึงทั้งหมด
 */
export const getReceipts = async (limitCount: number = 50, companyId?: string): Promise<ReceiptDocument[]> => {
    try {
        // ตรวจสอบว่า user login แล้วหรือยัง
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error("กรุณา Login ก่อนดูข้อมูล");
        }
        
        // สร้าง query constraints
        const constraints: QueryConstraint[] = [
            where("userId", "==", currentUser.uid), // กรองเฉพาะของ user นี้
        ];
        
        // ถ้ามี companyId ให้กรองเฉพาะบริษัทนั้น
        if (companyId) {
            constraints.push(where("companyId", "==", companyId));
        }
        
        // กรองเฉพาะเอกสารที่ยังไม่ถูกลบ (isDeleted != true)
        constraints.push(where("isDeleted", "==", false));
        
        constraints.push(orderBy("createdAt", "desc"));
        constraints.push(limit(limitCount));
        
        const q = query(collection(db, RECEIPTS_COLLECTION), ...constraints);
        
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs
            .map(doc => {
                const data = doc.data();
                // ตรวจสอบอีกครั้งที่ client-side เพื่อความแน่ใจ
                if (data.isDeleted === true) {
                    return null;
                }
                return {
                    id: doc.id,
                    ...data,
                    receiptDate: data.receiptDate?.toDate() || null,
                    createdAt: data.createdAt?.toDate(),
                    updatedAt: data.updatedAt?.toDate(),
                    deletedAt: data.deletedAt?.toDate() || null,
                } as ReceiptDocument;
            })
            .filter((doc): doc is ReceiptDocument => doc !== null && !doc.isDeleted); // กรองเอกสารที่ถูกลบ (soft delete) ออก
    } catch (error) {
        console.error("Error getting receipts:", error);
        throw new Error("ไม่สามารถดึงรายการใบเสร็จได้");
    }
};

/**
 * อัปเดตใบเสร็จ
 * @param id - Document ID ของเอกสารที่ต้องการอัปเดต
 * @param data - ข้อมูลที่ต้องการอัปเดต
 */
export const updateReceipt = async (id: string, data: Partial<ReceiptData>): Promise<void> => {
    try {
        // ตรวจสอบว่า user login แล้วหรือยัง
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error("กรุณา Login ก่อนอัปเดตข้อมูล");
        }

        // ตรวจสอบว่าเอกสารมีอยู่จริงและ user มีสิทธิ์แก้ไข
        const docRef = doc(db, RECEIPTS_COLLECTION, id);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
            throw new Error("ไม่พบเอกสารที่ต้องการอัปเดต");
        }

        const existingData = docSnap.data();
        
        // ตรวจสอบสิทธิ์: ต้องเป็นเจ้าของหรือเป็น Super Admin (ตรวจสอบที่ Firestore Rules)
        if (existingData.userId !== currentUser.uid && existingData.companyId == null) {
            throw new Error("คุณไม่มีสิทธิ์แก้ไขเอกสารนี้");
        }

        // เตรียมข้อมูลสำหรับอัปเดต
        const dataToUpdate: any = {
            ...data,
            updatedAt: Timestamp.now(),
        };

        // ถ้ามี logoUrl (อัปโหลดไปยัง Storage แล้ว) ให้ลบ Base64 ออก
        if (data.logoUrl) {
            dataToUpdate.logo = null;
        }

        // แปลง Date เป็น Timestamp
        if (data.receiptDate instanceof Date) {
            dataToUpdate.receiptDate = Timestamp.fromDate(data.receiptDate);
        }

        await updateDoc(docRef, dataToUpdate);
    } catch (error) {
        console.error("Error updating receipt:", error);
        throw error instanceof Error ? error : new Error("ไม่สามารถอัปเดตใบเสร็จได้");
    }
};

/**
 * ลบใบเสร็จ (Soft Delete) - ตั้งค่า isDeleted = true แทนการลบจริง
 * @param id - Document ID ของเอกสารที่ต้องการลบ
 */
export const deleteReceipt = async (id: string): Promise<void> => {
    try {
        // ตรวจสอบว่า user login แล้วหรือยัง
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error("กรุณา Login ก่อนลบข้อมูล");
        }

        // ตรวจสอบว่าเอกสารมีอยู่จริงและ user มีสิทธิ์ลบ
        const docRef = doc(db, RECEIPTS_COLLECTION, id);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
            throw new Error("ไม่พบเอกสารที่ต้องการลบ");
        }

        const existingData = docSnap.data();
        
        // ตรวจสอบสิทธิ์: ต้องเป็นเจ้าของหรือเป็น Super Admin (ตรวจสอบที่ Firestore Rules)
        if (existingData.userId !== currentUser.uid && existingData.companyId == null) {
            throw new Error("คุณไม่มีสิทธิ์ลบเอกสารนี้");
        }

        // ใช้ soft delete แทนการลบจริง - ตั้งค่า isDeleted = true และ deletedAt
        await updateDoc(docRef, {
            isDeleted: true,
            deletedAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        });
        console.log(`✅ Soft delete receipt สำเร็จ: ${id}`);
    } catch (error) {
        console.error("Error deleting receipt:", error);
        throw error instanceof Error ? error : new Error("ไม่สามารถลบใบเสร็จได้");
    }
};

/**
 * ค้นหาใบเสร็จตามเลขที่เอกสาร
 * @param receiptNumber - เลขที่ใบเสร็จที่ต้องการค้นหา
 * @param companyId - ID ของบริษัท (optional) ถ้าไม่ระบุจะค้นหาทั้งหมดของ user
 */
export const searchReceiptByReceiptNumber = async (receiptNumber: string, companyId?: string): Promise<ReceiptDocument[]> => {
    try {
        // ตรวจสอบว่า user login แล้วหรือยัง
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error("กรุณา Login ก่อนค้นหาข้อมูล");
        }

        // สร้าง query constraints
        const constraints: QueryConstraint[] = [
            where("receiptNumber", "==", receiptNumber),
            where("userId", "==", currentUser.uid), // กรองเฉพาะของ user นี้
            where("isDeleted", "==", false), // กรองเฉพาะเอกสารที่ยังไม่ถูกลบ
        ];

        // ถ้ามี companyId ให้กรองเฉพาะบริษัทนั้น
        if (companyId) {
            constraints.push(where("companyId", "==", companyId));
        }

        const q = query(collection(db, RECEIPTS_COLLECTION), ...constraints);
        
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs
            .map(doc => {
                const data = doc.data();
                // ตรวจสอบอีกครั้งที่ client-side เพื่อความแน่ใจ
                if (data.isDeleted === true) {
                    return null;
                }
                return {
                    id: doc.id,
                    ...data,
                    receiptDate: data.receiptDate?.toDate() || null,
                    createdAt: data.createdAt?.toDate(),
                    updatedAt: data.updatedAt?.toDate(),
                    deletedAt: data.deletedAt?.toDate() || null,
                } as ReceiptDocument;
            })
            .filter((doc): doc is ReceiptDocument => doc !== null && !doc.isDeleted); // กรองเอกสารที่ถูกลบ (soft delete) ออก
    } catch (error) {
        console.error("Error searching receipt:", error);
        throw new Error("ไม่สามารถค้นหาใบเสร็จได้");
    }
};
