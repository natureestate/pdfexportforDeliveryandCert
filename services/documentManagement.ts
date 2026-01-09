// Document Management Service - บริการสำหรับจัดการเอกสารครบวงจร
// ฟีเจอร์: Copy, Lock/Unlock, Archive/Unarchive

import { 
    doc, 
    getDoc, 
    updateDoc,
    Timestamp 
} from "firebase/firestore";
import { db, auth } from "../firebase.config";
import { DocType } from "../utils/documentRegistry";
import { generateDocumentNumber, DocumentType } from "./documentNumber";

// ============================================================
// Configuration - Mapping ระหว่าง DocType และ Collection Name
// ============================================================

const DOC_TYPE_TO_COLLECTION: Record<DocType, string> = {
    'delivery': 'deliveryNotes',
    'warranty': 'warrantyCards',
    'invoice': 'invoices',
    'receipt': 'receipts',
    'tax-invoice': 'taxInvoices',
    'quotation': 'quotations',
    'purchase-order': 'purchaseOrders',
    'memo': 'memos',
    'variation-order': 'variationOrders',
    'subcontract': 'subcontracts',
};

// Mapping ระหว่าง DocType และ Document Number Field
const DOC_TYPE_TO_NUMBER_FIELD: Record<DocType, string> = {
    'delivery': 'docNumber',
    'warranty': 'warrantyNumber',
    'invoice': 'invoiceNumber',
    'receipt': 'receiptNumber',
    'tax-invoice': 'taxInvoiceNumber',
    'quotation': 'quotationNumber',
    'purchase-order': 'purchaseOrderNumber',
    'memo': 'memoNumber',
    'variation-order': 'voNumber',
    'subcontract': 'contractNumber',
};

// ============================================================
// Copy Document Functions
// ============================================================

/**
 * เตรียมข้อมูลสำหรับ copy เอกสาร
 * - ดึงข้อมูลเอกสารต้นฉบับ
 * - สร้างเลขที่เอกสารใหม่อัตโนมัติ
 * - ล้าง fields ที่ไม่ควร copy (id, createdAt, verificationToken, etc.)
 * 
 * @param docId - ID ของเอกสารต้นฉบับ
 * @param docType - ประเภทเอกสาร
 * @returns ข้อมูลเอกสารที่พร้อมสำหรับสร้างใหม่
 */
export async function prepareDocumentForCopy<T>(
    docId: string,
    docType: DocType
): Promise<{ success: boolean; data?: T; newDocNumber?: string; error?: string }> {
    try {
        // ตรวจสอบว่า user login แล้ว
        const currentUser = auth.currentUser;
        if (!currentUser) {
            return { success: false, error: 'กรุณาเข้าสู่ระบบก่อน copy เอกสาร' };
        }

        // ดึงชื่อ collection
        const collectionName = DOC_TYPE_TO_COLLECTION[docType];
        if (!collectionName) {
            return { success: false, error: 'ประเภทเอกสารไม่ถูกต้อง' };
        }

        // ดึงข้อมูลเอกสารต้นฉบับ
        const docRef = doc(db, collectionName, docId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            return { success: false, error: 'ไม่พบเอกสารต้นฉบับ' };
        }

        const originalData = docSnap.data();

        // สร้างเลขที่เอกสารใหม่อัตโนมัติ
        const newDocNumber = await generateDocumentNumber(docType as DocumentType);
        
        // ดึงชื่อ field ของ document number
        const numberField = DOC_TYPE_TO_NUMBER_FIELD[docType];

        // เตรียมข้อมูลสำหรับ copy - ลบ fields ที่ไม่ควร copy
        const copiedData = { ...originalData };
        
        // ลบ fields ที่ไม่ควร copy
        delete copiedData.id;
        delete copiedData.createdAt;
        delete copiedData.updatedAt;
        delete copiedData.deletedAt;
        delete copiedData.isDeleted;
        delete copiedData.verificationToken;
        delete copiedData.documentStatus;
        delete copiedData.cancelledAt;
        delete copiedData.cancelledBy;
        delete copiedData.cancelledReason;
        delete copiedData.isLocked;
        delete copiedData.lockedAt;
        delete copiedData.lockedBy;
        delete copiedData.lockReason;
        delete copiedData.isArchived;
        delete copiedData.archivedAt;
        delete copiedData.archivedBy;
        
        // อัพเดทเลขที่เอกสารใหม่
        copiedData[numberField] = newDocNumber;
        
        // อัพเดทวันที่เป็นวันปัจจุบัน (ถ้ามี date field)
        const dateFieldsMap: Record<DocType, string[]> = {
            'delivery': ['date'],
            'warranty': ['purchaseDate', 'issueDate'],
            'invoice': ['invoiceDate'],
            'receipt': ['receiptDate'],
            'tax-invoice': ['taxInvoiceDate'],
            'quotation': ['quotationDate'],
            'purchase-order': ['purchaseOrderDate'],
            'memo': ['date'],
            'variation-order': ['date'],
            'subcontract': ['contractDate'],
        };
        
        const dateFields = dateFieldsMap[docType] || [];
        const now = new Date();
        dateFields.forEach(field => {
            if (field in copiedData) {
                copiedData[field] = now;
            }
        });

        // แปลง Timestamp เป็น Date สำหรับ fields อื่นๆ
        Object.keys(copiedData).forEach(key => {
            if (copiedData[key] instanceof Timestamp) {
                copiedData[key] = copiedData[key].toDate();
            }
        });

        console.log(`✅ [DocumentManagement] Prepared document copy with new number: ${newDocNumber}`);
        
        return { 
            success: true, 
            data: copiedData as T,
            newDocNumber 
        };
    } catch (error) {
        console.error('❌ [DocumentManagement] Error preparing document for copy:', error);
        return { success: false, error: 'เกิดข้อผิดพลาดในการเตรียมข้อมูล copy เอกสาร' };
    }
}

// ============================================================
// Lock Document Functions
// ============================================================

/**
 * Lock เอกสาร (ป้องกันการแก้ไข)
 * @param docId - Document ID
 * @param docType - ประเภทเอกสาร
 * @param reason - เหตุผลในการ lock (optional)
 * @returns ผลลัพธ์การ lock
 */
export async function lockDocument(
    docId: string,
    docType: DocType,
    reason?: string
): Promise<{ success: boolean; error?: string }> {
    try {
        // ตรวจสอบว่า user login แล้ว
        const currentUser = auth.currentUser;
        if (!currentUser) {
            return { success: false, error: 'กรุณาเข้าสู่ระบบก่อน lock เอกสาร' };
        }

        // ดึงชื่อ collection
        const collectionName = DOC_TYPE_TO_COLLECTION[docType];
        if (!collectionName) {
            return { success: false, error: 'ประเภทเอกสารไม่ถูกต้อง' };
        }

        // ตรวจสอบเอกสาร
        const docRef = doc(db, collectionName, docId);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
            return { success: false, error: 'ไม่พบเอกสาร' };
        }

        const docData = docSnap.data();
        
        // ตรวจสอบสิทธิ์ (ต้องเป็นเจ้าของเอกสาร)
        if (docData.userId !== currentUser.uid) {
            return { success: false, error: 'คุณไม่มีสิทธิ์ lock เอกสารนี้' };
        }

        // ตรวจสอบว่า lock อยู่แล้วหรือไม่
        if (docData.isLocked) {
            return { success: false, error: 'เอกสารถูก lock อยู่แล้ว' };
        }

        // อัปเดตสถานะ lock
        await updateDoc(docRef, {
            isLocked: true,
            lockedAt: Timestamp.now(),
            lockedBy: currentUser.uid,
            lockReason: reason || 'เอกสารถูก lock โดยผู้ใช้',
            updatedAt: Timestamp.now(),
        });

        console.log(`✅ [DocumentManagement] Document ${docId} locked successfully`);
        return { success: true };
    } catch (error) {
        console.error('❌ [DocumentManagement] Error locking document:', error);
        return { success: false, error: 'เกิดข้อผิดพลาดในการ lock เอกสาร' };
    }
}

/**
 * Unlock เอกสาร (อนุญาตให้แก้ไขได้)
 * @param docId - Document ID
 * @param docType - ประเภทเอกสาร
 * @returns ผลลัพธ์การ unlock
 */
export async function unlockDocument(
    docId: string,
    docType: DocType
): Promise<{ success: boolean; error?: string }> {
    try {
        // ตรวจสอบว่า user login แล้ว
        const currentUser = auth.currentUser;
        if (!currentUser) {
            return { success: false, error: 'กรุณาเข้าสู่ระบบก่อน unlock เอกสาร' };
        }

        // ดึงชื่อ collection
        const collectionName = DOC_TYPE_TO_COLLECTION[docType];
        if (!collectionName) {
            return { success: false, error: 'ประเภทเอกสารไม่ถูกต้อง' };
        }

        // ตรวจสอบเอกสาร
        const docRef = doc(db, collectionName, docId);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
            return { success: false, error: 'ไม่พบเอกสาร' };
        }

        const docData = docSnap.data();
        
        // ตรวจสอบสิทธิ์ (ต้องเป็นเจ้าของเอกสารหรือคนที่ lock)
        if (docData.userId !== currentUser.uid && docData.lockedBy !== currentUser.uid) {
            return { success: false, error: 'คุณไม่มีสิทธิ์ unlock เอกสารนี้' };
        }

        // ตรวจสอบว่ายังไม่ได้ lock หรือไม่
        if (!docData.isLocked) {
            return { success: false, error: 'เอกสารไม่ได้ถูก lock' };
        }

        // อัปเดตสถานะ unlock
        await updateDoc(docRef, {
            isLocked: false,
            lockedAt: null,
            lockedBy: null,
            lockReason: null,
            updatedAt: Timestamp.now(),
        });

        console.log(`✅ [DocumentManagement] Document ${docId} unlocked successfully`);
        return { success: true };
    } catch (error) {
        console.error('❌ [DocumentManagement] Error unlocking document:', error);
        return { success: false, error: 'เกิดข้อผิดพลาดในการ unlock เอกสาร' };
    }
}

/**
 * ตรวจสอบว่าเอกสาร locked หรือไม่
 * @param docId - Document ID  
 * @param docType - ประเภทเอกสาร
 * @returns สถานะการ lock
 */
export async function isDocumentLocked(
    docId: string,
    docType: DocType
): Promise<{ isLocked: boolean; lockedBy?: string; lockReason?: string }> {
    try {
        const collectionName = DOC_TYPE_TO_COLLECTION[docType];
        if (!collectionName) {
            return { isLocked: false };
        }

        const docRef = doc(db, collectionName, docId);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
            return { isLocked: false };
        }

        const docData = docSnap.data();
        return {
            isLocked: docData.isLocked || false,
            lockedBy: docData.lockedBy,
            lockReason: docData.lockReason,
        };
    } catch (error) {
        console.error('❌ [DocumentManagement] Error checking document lock status:', error);
        return { isLocked: false };
    }
}

// ============================================================
// Archive Document Functions
// ============================================================

/**
 * Archive เอกสาร (ย้ายไปเก็บถาวร)
 * @param docId - Document ID
 * @param docType - ประเภทเอกสาร
 * @returns ผลลัพธ์การ archive
 */
export async function archiveDocument(
    docId: string,
    docType: DocType
): Promise<{ success: boolean; error?: string }> {
    try {
        // ตรวจสอบว่า user login แล้ว
        const currentUser = auth.currentUser;
        if (!currentUser) {
            return { success: false, error: 'กรุณาเข้าสู่ระบบก่อน archive เอกสาร' };
        }

        // ดึงชื่อ collection
        const collectionName = DOC_TYPE_TO_COLLECTION[docType];
        if (!collectionName) {
            return { success: false, error: 'ประเภทเอกสารไม่ถูกต้อง' };
        }

        // ตรวจสอบเอกสาร
        const docRef = doc(db, collectionName, docId);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
            return { success: false, error: 'ไม่พบเอกสาร' };
        }

        const docData = docSnap.data();
        
        // ตรวจสอบสิทธิ์ (ต้องเป็นเจ้าของเอกสาร)
        if (docData.userId !== currentUser.uid) {
            return { success: false, error: 'คุณไม่มีสิทธิ์ archive เอกสารนี้' };
        }

        // ตรวจสอบว่า archive อยู่แล้วหรือไม่
        if (docData.isArchived) {
            return { success: false, error: 'เอกสารถูก archive อยู่แล้ว' };
        }

        // อัปเดตสถานะ archive
        await updateDoc(docRef, {
            isArchived: true,
            archivedAt: Timestamp.now(),
            archivedBy: currentUser.uid,
            updatedAt: Timestamp.now(),
        });

        console.log(`✅ [DocumentManagement] Document ${docId} archived successfully`);
        return { success: true };
    } catch (error) {
        console.error('❌ [DocumentManagement] Error archiving document:', error);
        return { success: false, error: 'เกิดข้อผิดพลาดในการ archive เอกสาร' };
    }
}

/**
 * Unarchive เอกสาร (นำกลับมาใช้งาน)
 * @param docId - Document ID
 * @param docType - ประเภทเอกสาร
 * @returns ผลลัพธ์การ unarchive
 */
export async function unarchiveDocument(
    docId: string,
    docType: DocType
): Promise<{ success: boolean; error?: string }> {
    try {
        // ตรวจสอบว่า user login แล้ว
        const currentUser = auth.currentUser;
        if (!currentUser) {
            return { success: false, error: 'กรุณาเข้าสู่ระบบก่อน unarchive เอกสาร' };
        }

        // ดึงชื่อ collection
        const collectionName = DOC_TYPE_TO_COLLECTION[docType];
        if (!collectionName) {
            return { success: false, error: 'ประเภทเอกสารไม่ถูกต้อง' };
        }

        // ตรวจสอบเอกสาร
        const docRef = doc(db, collectionName, docId);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
            return { success: false, error: 'ไม่พบเอกสาร' };
        }

        const docData = docSnap.data();
        
        // ตรวจสอบสิทธิ์ (ต้องเป็นเจ้าของเอกสาร)
        if (docData.userId !== currentUser.uid) {
            return { success: false, error: 'คุณไม่มีสิทธิ์ unarchive เอกสารนี้' };
        }

        // ตรวจสอบว่ายังไม่ได้ archive หรือไม่
        if (!docData.isArchived) {
            return { success: false, error: 'เอกสารไม่ได้ถูก archive' };
        }

        // อัปเดตสถานะ unarchive
        await updateDoc(docRef, {
            isArchived: false,
            archivedAt: null,
            archivedBy: null,
            updatedAt: Timestamp.now(),
        });

        console.log(`✅ [DocumentManagement] Document ${docId} unarchived successfully`);
        return { success: true };
    } catch (error) {
        console.error('❌ [DocumentManagement] Error unarchiving document:', error);
        return { success: false, error: 'เกิดข้อผิดพลาดในการ unarchive เอกสาร' };
    }
}

// ============================================================
// Helper Functions
// ============================================================

/**
 * ดึงชื่อ Collection จาก DocType
 */
export function getCollectionName(docType: DocType): string | null {
    return DOC_TYPE_TO_COLLECTION[docType] || null;
}

/**
 * ดึงชื่อ Field ของเลขที่เอกสาร
 */
export function getDocumentNumberField(docType: DocType): string | null {
    return DOC_TYPE_TO_NUMBER_FIELD[docType] || null;
}
