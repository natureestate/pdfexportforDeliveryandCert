/**
 * Signature Service - บริการสำหรับระบบเซ็นชื่อยืนยันรับมอบงานผ่าน QR Code
 * 
 * ฟีเจอร์หลัก:
 * 1. สร้าง Sign Token (UUID v4) สำหรับเซ็นชื่อ
 * 2. ดึงข้อมูลเอกสารจาก Sign Token (Public Access)
 * 3. ส่ง OTP ไปยังเบอร์โทรศัพท์ผู้รับ
 * 4. ยืนยัน OTP และบันทึกลายเซ็น
 * 5. อัปเดตสถานะเอกสาร
 */

import { 
    collection, 
    doc, 
    getDoc, 
    getDocs, 
    setDoc,
    updateDoc,
    query,
    where,
    Timestamp,
    serverTimestamp
} from "firebase/firestore";
import { 
    RecaptchaVerifier, 
    signInWithPhoneNumber,
    ConfirmationResult
} from "firebase/auth";
import { db, auth } from "../firebase.config";
import { 
    DocumentSignature, 
    PublicSigningData, 
    SignatureStatus, 
    SignatureType,
    SignerRole 
} from "../types";

// ============================================================
// Configuration
// ============================================================

// Base URL สำหรับ Sign Page
// ใช้ Firebase Hosting domain ปัจจุบัน
const SIGN_BASE_URL = 'https://ecertonline-29a67.web.app';

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
 * สร้าง UUID v4 สำหรับ Sign Token
 * ใช้ crypto.randomUUID() ถ้ามี หรือ fallback เป็น manual generation
 */
export function generateSignToken(): string {
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
// Sign URL Generator
// ============================================================

/**
 * สร้าง URL สำหรับ QR Code Sign
 * @param docType - ประเภทเอกสาร (delivery, invoice, etc.)
 * @param token - Sign Token (UUID)
 * @returns URL สำหรับเซ็นชื่อ
 */
export function generateSignUrl(docType: string, token: string): string {
    return `${SIGN_BASE_URL}/sign/${docType}/${token}`;
}

/**
 * ดึง Base URL สำหรับ Sign Page
 */
export function getSignBaseUrl(): string {
    return SIGN_BASE_URL;
}

// ============================================================
// Public Document Signing - ดึงข้อมูลเอกสาร
// ============================================================

/**
 * ดึงข้อมูลเอกสารจาก Sign Token (Public Access - ไม่ต้อง Login)
 * @param docType - ประเภทเอกสาร
 * @param token - Sign Token
 * @returns ข้อมูลเอกสารสำหรับแสดงในหน้า Sign
 */
export async function getDocumentForSigning(
    docType: string, 
    token: string
): Promise<{ success: boolean; data?: PublicSigningData; documentId?: string; error?: string }> {
    try {
        // ตรวจสอบว่า docType ถูกต้อง
        const collectionName = DOC_TYPE_TO_COLLECTION[docType];
        if (!collectionName) {
            return { success: false, error: 'ประเภทเอกสารไม่ถูกต้อง' };
        }

        // ค้นหาเอกสารจาก signToken
        const q = query(
            collection(db, collectionName),
            where('signToken', '==', token)
        );
        
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            return { success: false, error: 'ไม่พบเอกสาร หรือ Token ไม่ถูกต้อง' };
        }

        // ดึงข้อมูลเอกสาร
        const docSnapshot = querySnapshot.docs[0];
        const docData = docSnapshot.data();
        const documentId = docSnapshot.id;
        const numberField = DOC_TYPE_TO_NUMBER_FIELD[docType];
        const dateField = DOC_TYPE_TO_DATE_FIELD[docType];

        // แปลง Timestamp เป็น Date
        const documentDate = docData[dateField] instanceof Timestamp 
            ? docData[dateField].toDate() 
            : docData[dateField];
        
        const signedAt = docData.signedAt instanceof Timestamp
            ? docData.signedAt.toDate()
            : docData.signedAt;

        // ดึงรายการงาน (สำหรับ Delivery Note)
        let items: Array<{ description: string; quantity: number; unit: string }> | undefined;
        if (docData.items && Array.isArray(docData.items)) {
            items = docData.items.map((item: any) => ({
                description: item.description || '',
                quantity: item.quantity || 0,
                unit: item.unit || '',
            }));
        }

        // สร้างข้อมูลสำหรับแสดงผล
        const signingData: PublicSigningData = {
            documentType: DOC_TYPE_TO_THAI_NAME[docType] || docType,
            documentNumber: docData[numberField] || '-',
            documentDate: documentDate || null,
            companyName: docData.companyName || docData.fromCompany || '-',
            companyPhone: docData.companyPhone || docData.fromPhone || undefined,
            customerName: docData.customerName || docData.toCompany || undefined,
            projectName: docData.projectName || docData.project || undefined,
            items: items,
            signatureStatus: (docData.signatureStatus as SignatureStatus) || 'pending',
            signedBy: docData.signedBy || undefined,
            signedAt: signedAt || undefined,
        };

        return { success: true, data: signingData, documentId };
    } catch (error) {
        console.error('❌ [SignatureService] Error getting document for signing:', error);
        return { success: false, error: 'เกิดข้อผิดพลาดในการดึงข้อมูลเอกสาร' };
    }
}

// ============================================================
// OTP Verification - ส่งและยืนยัน OTP
// ============================================================

/**
 * สร้าง RecaptchaVerifier สำหรับ Sign Page
 * @param containerId - ID ของ element ที่จะแสดง reCAPTCHA
 * @returns RecaptchaVerifier instance
 */
export function createSignRecaptchaVerifier(containerId: string): RecaptchaVerifier {
    return new RecaptchaVerifier(auth, containerId, {
        'size': 'invisible',
        'callback': () => {
            console.log('✅ [SignatureService] reCAPTCHA verified');
        },
        'expired-callback': () => {
            console.log('⚠️ [SignatureService] reCAPTCHA expired');
        }
    });
}

/**
 * ส่ง OTP ไปยังเบอร์โทรศัพท์ผู้รับ
 * @param phoneNumber - เบอร์โทรศัพท์ในรูปแบบ +66XXXXXXXXX
 * @param recaptchaVerifier - RecaptchaVerifier instance
 * @returns ConfirmationResult สำหรับยืนยัน OTP
 */
export async function sendSigningOTP(
    phoneNumber: string,
    recaptchaVerifier: RecaptchaVerifier
): Promise<ConfirmationResult> {
    try {
        console.log('📱 [SignatureService] กำลังส่ง OTP ไปยัง:', phoneNumber);
        
        const confirmationResult = await signInWithPhoneNumber(
            auth,
            phoneNumber,
            recaptchaVerifier
        );
        
        console.log('✅ [SignatureService] ส่ง OTP สำเร็จ');
        return confirmationResult;
    } catch (error: any) {
        console.error('❌ [SignatureService] ส่ง OTP ล้มเหลว:', error);
        
        // แปล error message เป็นภาษาไทย
        const errorCode = error.code;
        let thaiErrorMessage = 'ไม่สามารถส่ง OTP ได้';
        
        switch (errorCode) {
            case 'auth/invalid-phone-number':
                thaiErrorMessage = 'หมายเลขโทรศัพท์ไม่ถูกต้อง';
                break;
            case 'auth/too-many-requests':
                thaiErrorMessage = 'ส่ง OTP บ่อยเกินไป กรุณารอสักครู่';
                break;
            case 'auth/quota-exceeded':
                thaiErrorMessage = 'เกินโควต้าการส่ง OTP กรุณาลองใหม่ภายหลัง';
                break;
            case 'auth/captcha-check-failed':
                thaiErrorMessage = 'การตรวจสอบ reCAPTCHA ล้มเหลว กรุณาลองใหม่';
                break;
            default:
                thaiErrorMessage = error.message || 'ไม่สามารถส่ง OTP ได้';
        }
        
        throw new Error(thaiErrorMessage);
    }
}

/**
 * ยืนยัน OTP
 * @param confirmationResult - ผลจากการส่ง OTP
 * @param otp - รหัส OTP 6 หลัก
 * @returns Promise<boolean> - true ถ้ายืนยันสำเร็จ
 */
export async function verifySigningOTP(
    confirmationResult: ConfirmationResult,
    otp: string
): Promise<boolean> {
    try {
        console.log('🔐 [SignatureService] กำลังยืนยัน OTP...');
        
        await confirmationResult.confirm(otp);
        
        console.log('✅ [SignatureService] ยืนยัน OTP สำเร็จ');
        return true;
    } catch (error: any) {
        console.error('❌ [SignatureService] ยืนยัน OTP ล้มเหลว:', error);
        
        // แปล error message เป็นภาษาไทย
        const errorCode = error.code;
        let thaiErrorMessage = 'ไม่สามารถยืนยัน OTP ได้';
        
        switch (errorCode) {
            case 'auth/invalid-verification-code':
                thaiErrorMessage = 'รหัส OTP ไม่ถูกต้อง';
                break;
            case 'auth/code-expired':
                thaiErrorMessage = 'รหัส OTP หมดอายุแล้ว กรุณาขอรหัสใหม่';
                break;
            case 'auth/missing-verification-code':
                thaiErrorMessage = 'กรุณากรอกรหัส OTP';
                break;
            case 'auth/session-expired':
                thaiErrorMessage = 'Session หมดอายุ กรุณาขอรหัส OTP ใหม่';
                break;
            default:
                thaiErrorMessage = error.message || 'ไม่สามารถยืนยัน OTP ได้';
        }
        
        throw new Error(thaiErrorMessage);
    }
}

// ============================================================
// Save Signature - บันทึกลายเซ็น
// ============================================================

/**
 * บันทึกลายเซ็นและอัปเดตสถานะเอกสาร
 * @param params - ข้อมูลลายเซ็น
 * @returns ผลลัพธ์การบันทึก
 */
export async function saveSignature(params: {
    documentId: string;
    docType: string;
    signToken: string;
    companyId?: string;
    signerName: string;
    signerPhone: string;
    signerRole?: SignerRole;
    signatureType: SignatureType;
    signatureData: string;
    otpVerifiedAt: Date;
}): Promise<{ success: boolean; signatureId?: string; error?: string }> {
    try {
        const {
            documentId,
            docType,
            signToken,
            companyId,
            signerName,
            signerPhone,
            signerRole = 'receiver',
            signatureType,
            signatureData,
            otpVerifiedAt,
        } = params;

        // ตรวจสอบว่า docType ถูกต้อง
        const collectionName = DOC_TYPE_TO_COLLECTION[docType];
        if (!collectionName) {
            return { success: false, error: 'ประเภทเอกสารไม่ถูกต้อง' };
        }

        // ตรวจสอบว่าเอกสารยังไม่ถูกเซ็น
        const docRef = doc(db, collectionName, documentId);
        const docSnapshot = await getDoc(docRef);
        
        if (!docSnapshot.exists()) {
            return { success: false, error: 'ไม่พบเอกสาร' };
        }
        
        const docData = docSnapshot.data();
        if (docData.signatureStatus === 'signed') {
            return { success: false, error: 'เอกสารนี้ถูกเซ็นแล้ว' };
        }

        // สร้าง Signature ID
        const signatureId = generateSignToken();
        const signedAt = new Date();

        // สร้างข้อมูลลายเซ็น
        const signatureDoc: DocumentSignature = {
            id: signatureId,
            documentId,
            docType,
            signToken,
            companyId: companyId || docData.companyId,
            signerName,
            signerPhone,
            signerRole,
            signatureType,
            signatureData,
            status: 'signed',
            signedAt,
            otpVerifiedAt,
            otpPhone: signerPhone,
            // Audit Trail
            ipAddress: typeof window !== 'undefined' ? '' : '', // จะถูก set ใน component
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
            createdAt: signedAt,
            updatedAt: signedAt,
        };

        // บันทึกลายเซ็นลง signatures collection
        await setDoc(doc(db, 'signatures', signatureId), {
            ...signatureDoc,
            signedAt: Timestamp.fromDate(signedAt),
            otpVerifiedAt: Timestamp.fromDate(otpVerifiedAt),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });

        // อัปเดตเอกสารต้นทาง (รวมถึง signatureImageUrl สำหรับแสดงลายเซ็นบนเอกสาร)
        await updateDoc(docRef, {
            signatureStatus: 'signed' as SignatureStatus,
            signedBy: signerName,
            signedAt: Timestamp.fromDate(signedAt),
            signatureId: signatureId,
            // เพิ่ม signatureImageUrl สำหรับแสดงลายเซ็นบนเอกสาร
            // ถ้าเป็นแบบ draw จะเป็น Base64 data URL, ถ้าเป็นแบบ type จะสร้างเป็น text
            signatureImageUrl: signatureType === 'draw' ? signatureData : null,
            signerPhoneNumber: signerPhone,
            updatedAt: serverTimestamp(),
        });

        console.log(`✅ [SignatureService] บันทึกลายเซ็นสำเร็จ: ${signatureId}`);
        return { success: true, signatureId };
    } catch (error) {
        console.error('❌ [SignatureService] บันทึกลายเซ็นล้มเหลว:', error);
        return { success: false, error: 'เกิดข้อผิดพลาดในการบันทึกลายเซ็น' };
    }
}

// ============================================================
// Get Signature History - ดูประวัติการเซ็น
// ============================================================

/**
 * ดึงประวัติการเซ็นของเอกสาร
 * @param documentId - ID ของเอกสาร
 * @param docType - ประเภทเอกสาร
 * @returns รายการลายเซ็น
 */
export async function getSignatureHistory(
    documentId: string,
    docType: string
): Promise<{ success: boolean; signatures?: DocumentSignature[]; error?: string }> {
    try {
        const q = query(
            collection(db, 'signatures'),
            where('documentId', '==', documentId),
            where('docType', '==', docType)
        );
        
        const querySnapshot = await getDocs(q);
        
        const signatures: DocumentSignature[] = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                documentId: data.documentId,
                docType: data.docType,
                signToken: data.signToken,
                companyId: data.companyId,
                signerName: data.signerName,
                signerPhone: data.signerPhone,
                signerRole: data.signerRole,
                signatureType: data.signatureType,
                signatureData: data.signatureData,
                status: data.status,
                signedAt: data.signedAt instanceof Timestamp ? data.signedAt.toDate() : data.signedAt,
                otpVerifiedAt: data.otpVerifiedAt instanceof Timestamp ? data.otpVerifiedAt.toDate() : data.otpVerifiedAt,
                otpPhone: data.otpPhone,
                ipAddress: data.ipAddress,
                userAgent: data.userAgent,
                createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt,
                updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : data.updatedAt,
            };
        });

        return { success: true, signatures };
    } catch (error) {
        console.error('❌ [SignatureService] ดึงประวัติการเซ็นล้มเหลว:', error);
        return { success: false, error: 'เกิดข้อผิดพลาดในการดึงประวัติการเซ็น' };
    }
}

// ============================================================
// Get Signature by ID - ดึงข้อมูลลายเซ็น
// ============================================================

/**
 * ดึงข้อมูลลายเซ็นจาก Signature ID
 * @param signatureId - ID ของลายเซ็น
 * @returns ข้อมูลลายเซ็น
 */
export async function getSignatureById(
    signatureId: string
): Promise<{ success: boolean; signature?: DocumentSignature; error?: string }> {
    try {
        const docRef = doc(db, 'signatures', signatureId);
        const docSnapshot = await getDoc(docRef);
        
        if (!docSnapshot.exists()) {
            return { success: false, error: 'ไม่พบข้อมูลลายเซ็น' };
        }

        const data = docSnapshot.data();
        const signature: DocumentSignature = {
            id: docSnapshot.id,
            documentId: data.documentId,
            docType: data.docType,
            signToken: data.signToken,
            companyId: data.companyId,
            signerName: data.signerName,
            signerPhone: data.signerPhone,
            signerRole: data.signerRole,
            signatureType: data.signatureType,
            signatureData: data.signatureData,
            status: data.status,
            signedAt: data.signedAt instanceof Timestamp ? data.signedAt.toDate() : data.signedAt,
            otpVerifiedAt: data.otpVerifiedAt instanceof Timestamp ? data.otpVerifiedAt.toDate() : data.otpVerifiedAt,
            otpPhone: data.otpPhone,
            ipAddress: data.ipAddress,
            userAgent: data.userAgent,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt,
            updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : data.updatedAt,
        };

        return { success: true, signature };
    } catch (error) {
        console.error('❌ [SignatureService] ดึงข้อมูลลายเซ็นล้มเหลว:', error);
        return { success: false, error: 'เกิดข้อผิดพลาดในการดึงข้อมูลลายเซ็น' };
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

/**
 * Format เบอร์โทรศัพท์ให้เป็นรูปแบบ +66
 * @param phone - เบอร์โทรศัพท์ (0812345678)
 * @returns เบอร์โทรในรูปแบบ +66812345678
 */
export function formatPhoneToE164(phone: string): string {
    // ลบ spaces, dashes และอื่นๆ
    const cleaned = phone.replace(/[\s\-\(\)]/g, '');
    
    // ถ้าขึ้นต้นด้วย 0 ให้เปลี่ยนเป็น +66
    if (cleaned.startsWith('0')) {
        return '+66' + cleaned.slice(1);
    }
    
    // ถ้าขึ้นต้นด้วย 66 ให้เติม +
    if (cleaned.startsWith('66')) {
        return '+' + cleaned;
    }
    
    // ถ้าขึ้นต้นด้วย +66 แล้ว ใช้เลย
    if (cleaned.startsWith('+66')) {
        return cleaned;
    }
    
    // Default: ถือว่าเป็นเบอร์ไทย
    return '+66' + cleaned;
}

