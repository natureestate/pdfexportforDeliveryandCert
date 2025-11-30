/**
 * Verification Service - บริการสำหรับระบบตรวจสอบเอกสารผ่าน QR Code
 * 
 * ฟีเจอร์หลัก:
 * 1. สร้าง Verification Token (UUID v4)
 * 2. ดึงข้อมูลเอกสารจาก Token (Public Access)
 * 3. ยกเลิกเอกสาร (Cancel Document)
 * 4. สร้าง Verification URL สำหรับ QR Code
 */

import { 
    collection, 
    doc, 
    getDoc, 
    getDocs, 
    updateDoc,
    query,
    where,
    Timestamp
} from "firebase/firestore";
import { db, auth } from "../firebase.config";
import { DocumentStatus, PublicVerificationData } from "../types";

// ============================================================
// Configuration
// ============================================================

// Base URL สำหรับ Verification Page
// ใช้ Firebase Hosting domain ปัจจุบัน
const VERIFICATION_BASE_URL = 'https://ecertonline-29a67.web.app';

// Mapping ระหว่าง DocType และ Collection Name
const DOC_TYPE_TO_COLLECTION: Record<string, string> = {
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
const DOC_TYPE_TO_NUMBER_FIELD: Record<string, string> = {
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

// Mapping ระหว่าง DocType และ Date Field
const DOC_TYPE_TO_DATE_FIELD: Record<string, string> = {
    'delivery': 'date',
    'warranty': 'issueDate',
    'invoice': 'invoiceDate',
    'receipt': 'receiptDate',
    'tax-invoice': 'taxInvoiceDate',
    'quotation': 'quotationDate',
    'purchase-order': 'purchaseOrderDate',
    'memo': 'date',
    'variation-order': 'date',
    'subcontract': 'contractDate',
};

// Mapping ระหว่าง DocType และชื่อภาษาไทย
export const DOC_TYPE_TO_THAI_NAME: Record<string, string> = {
    'delivery': 'ใบส่งมอบงาน',
    'warranty': 'ใบรับประกัน',
    'invoice': 'ใบแจ้งหนี้',
    'receipt': 'ใบเสร็จรับเงิน',
    'tax-invoice': 'ใบกำกับภาษี',
    'quotation': 'ใบเสนอราคา',
    'purchase-order': 'ใบสั่งซื้อ',
    'memo': 'บันทึกข้อความ',
    'variation-order': 'ใบส่วนต่าง',
    'subcontract': 'สัญญาจ้างเหมา',
};

// ============================================================
// UUID Generator
// ============================================================

/**
 * สร้าง UUID v4 สำหรับ Verification Token
 * ใช้ crypto.randomUUID() ถ้ามี หรือ fallback เป็น manual generation
 */
export function generateVerificationToken(): string {
    // ใช้ crypto.randomUUID() ถ้า browser รองรับ
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    
    // Fallback: สร้าง UUID v4 แบบ manual
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// ============================================================
// Verification URL Generator
// ============================================================

/**
 * สร้าง URL สำหรับ QR Code Verification
 * @param docType - ประเภทเอกสาร (delivery, invoice, etc.)
 * @param token - Verification Token (UUID)
 * @returns URL สำหรับตรวจสอบเอกสาร
 */
export function generateVerificationUrl(docType: string, token: string): string {
    return `${VERIFICATION_BASE_URL}/verify/${docType}/${token}`;
}

/**
 * ดึง Base URL สำหรับ Verification
 * (สำหรับใช้ในกรณีที่ต้องการ customize URL)
 */
export function getVerificationBaseUrl(): string {
    return VERIFICATION_BASE_URL;
}

// ============================================================
// Public Document Verification
// ============================================================

/**
 * ดึงข้อมูลเอกสารจาก Verification Token (Public Access - ไม่ต้อง Login)
 * @param docType - ประเภทเอกสาร
 * @param token - Verification Token
 * @returns ข้อมูลเอกสารสำหรับแสดงในหน้า Verification
 */
export async function getDocumentByToken(
    docType: string, 
    token: string
): Promise<{ success: boolean; data?: PublicVerificationData; error?: string }> {
    try {
        // ตรวจสอบว่า docType ถูกต้อง
        const collectionName = DOC_TYPE_TO_COLLECTION[docType];
        if (!collectionName) {
            return { success: false, error: 'ประเภทเอกสารไม่ถูกต้อง' };
        }

        // ค้นหาเอกสารจาก verificationToken
        const q = query(
            collection(db, collectionName),
            where('verificationToken', '==', token)
        );
        
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            return { success: false, error: 'ไม่พบเอกสาร หรือ Token ไม่ถูกต้อง' };
        }

        // ดึงข้อมูลเอกสาร
        const docData = querySnapshot.docs[0].data();
        const numberField = DOC_TYPE_TO_NUMBER_FIELD[docType];
        const dateField = DOC_TYPE_TO_DATE_FIELD[docType];

        // แปลง Timestamp เป็น Date
        const documentDate = docData[dateField] instanceof Timestamp 
            ? docData[dateField].toDate() 
            : docData[dateField];
        
        const cancelledAt = docData.cancelledAt instanceof Timestamp
            ? docData.cancelledAt.toDate()
            : docData.cancelledAt;

        const createdAt = docData.createdAt instanceof Timestamp
            ? docData.createdAt.toDate()
            : docData.createdAt;

        // สร้างข้อมูลสำหรับแสดงผล
        const verificationData: PublicVerificationData = {
            documentType: DOC_TYPE_TO_THAI_NAME[docType] || docType,
            documentNumber: docData[numberField] || '-',
            documentDate: documentDate || null,
            companyName: docData.companyName || docData.fromCompany || '-',
            customerName: docData.customerName || docData.toCompany || undefined,
            totalAmount: docData.total || docData.totalAmount || docData.totalContractAmount || undefined,
            documentStatus: (docData.documentStatus as DocumentStatus) || 'active',
            cancelledAt: cancelledAt,
            createdAt: createdAt,
        };

        return { success: true, data: verificationData };
    } catch (error) {
        console.error('❌ [Verification] Error getting document by token:', error);
        return { success: false, error: 'เกิดข้อผิดพลาดในการดึงข้อมูลเอกสาร' };
    }
}

// ============================================================
// Document Cancellation
// ============================================================

/**
 * ยกเลิกเอกสาร (Cancel Document)
 * @param docId - Document ID
 * @param docType - ประเภทเอกสาร
 * @param reason - เหตุผลในการยกเลิก (optional)
 * @returns ผลลัพธ์การยกเลิก
 */
export async function cancelDocument(
    docId: string,
    docType: string,
    reason?: string
): Promise<{ success: boolean; error?: string }> {
    try {
        // ตรวจสอบว่า user login แล้ว
        const currentUser = auth.currentUser;
        if (!currentUser) {
            return { success: false, error: 'กรุณาเข้าสู่ระบบก่อนยกเลิกเอกสาร' };
        }

        // ตรวจสอบว่า docType ถูกต้อง
        const collectionName = DOC_TYPE_TO_COLLECTION[docType];
        if (!collectionName) {
            return { success: false, error: 'ประเภทเอกสารไม่ถูกต้อง' };
        }

        // อัปเดตสถานะเอกสาร
        const docRef = doc(db, collectionName, docId);
        await updateDoc(docRef, {
            documentStatus: 'cancelled' as DocumentStatus,
            cancelledAt: Timestamp.now(),
            cancelledBy: currentUser.uid,
            cancelledReason: reason || 'ยกเลิกโดยผู้ใช้',
            updatedAt: Timestamp.now(),
        });

        console.log(`✅ [Verification] Document ${docId} cancelled successfully`);
        return { success: true };
    } catch (error) {
        console.error('❌ [Verification] Error cancelling document:', error);
        return { success: false, error: 'เกิดข้อผิดพลาดในการยกเลิกเอกสาร' };
    }
}

/**
 * ยกเลิกการยกเลิกเอกสาร (Restore Document)
 * @param docId - Document ID
 * @param docType - ประเภทเอกสาร
 * @returns ผลลัพธ์การกู้คืน
 */
export async function restoreDocument(
    docId: string,
    docType: string
): Promise<{ success: boolean; error?: string }> {
    try {
        // ตรวจสอบว่า user login แล้ว
        const currentUser = auth.currentUser;
        if (!currentUser) {
            return { success: false, error: 'กรุณาเข้าสู่ระบบก่อนกู้คืนเอกสาร' };
        }

        // ตรวจสอบว่า docType ถูกต้อง
        const collectionName = DOC_TYPE_TO_COLLECTION[docType];
        if (!collectionName) {
            return { success: false, error: 'ประเภทเอกสารไม่ถูกต้อง' };
        }

        // อัปเดตสถานะเอกสาร
        const docRef = doc(db, collectionName, docId);
        await updateDoc(docRef, {
            documentStatus: 'active' as DocumentStatus,
            cancelledAt: null,
            cancelledBy: null,
            cancelledReason: null,
            updatedAt: Timestamp.now(),
        });

        console.log(`✅ [Verification] Document ${docId} restored successfully`);
        return { success: true };
    } catch (error) {
        console.error('❌ [Verification] Error restoring document:', error);
        return { success: false, error: 'เกิดข้อผิดพลาดในการกู้คืนเอกสาร' };
    }
}

// ============================================================
// Helper Functions
// ============================================================

/**
 * ตรวจสอบว่า docType ถูกต้องหรือไม่
 */
export function isValidDocType(docType: string): boolean {
    return docType in DOC_TYPE_TO_COLLECTION;
}

/**
 * ดึงชื่อ Collection จาก DocType
 */
export function getCollectionName(docType: string): string | null {
    return DOC_TYPE_TO_COLLECTION[docType] || null;
}

/**
 * ดึงชื่อภาษาไทยของประเภทเอกสาร
 */
export function getDocTypeName(docType: string): string {
    return DOC_TYPE_TO_THAI_NAME[docType] || docType;
}

