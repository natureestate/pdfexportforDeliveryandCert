// Share Link Service - บริการสำหรับสร้างและจัดการลิงก์แชร์เอกสาร
// ฟีเจอร์: สร้างลิงก์แชร์, ดึงข้อมูลจากลิงก์, ยกเลิกลิงก์

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
    Timestamp 
} from "firebase/firestore";
import { db, auth } from "../firebase.config";
import { DocType } from "../utils/documentRegistry";

// ============================================================
// Types
// ============================================================

// Interface สำหรับ Share Link
export interface ShareLink {
    id: string;
    documentId: string;
    documentType: DocType;
    documentNumber: string;
    shareToken: string;          // UUID สำหรับ URL
    createdAt: Date;
    createdBy: string;
    creatorName?: string;
    creatorEmail?: string;
    companyId?: string;
    expiresAt?: Date | null;     // หมดอายุเมื่อไหร่ (null = ไม่หมดอายุ)
    isActive: boolean;
    accessCount: number;         // นับจำนวนครั้งที่เข้าดู
    lastAccessedAt?: Date | null;
    permissions: {
        canView: boolean;
        canDownload: boolean;
    };
    note?: string;               // หมายเหตุเพิ่มเติม
}

// Interface สำหรับข้อมูลเอกสารที่แชร์ (Public)
export interface SharedDocumentData {
    documentType: string;
    documentNumber: string;
    companyName?: string;
    customerName?: string;
    projectName?: string;
    documentDate?: Date;
    total?: number;
    createdAt?: Date;
    canDownload: boolean;
    // ข้อมูลเพิ่มเติมตาม doc type
    additionalData?: Record<string, any>;
}

// ============================================================
// Configuration
// ============================================================

const SHARE_LINKS_COLLECTION = "shareLinks";

// Base URL สำหรับ Share Page
const SHARE_BASE_URL = 'https://ecertonline-29a67.web.app';

// Mapping ระหว่าง DocType และ Collection Name
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

// Mapping ภาษาไทย
const DOC_TYPE_NAMES: Record<DocType, string> = {
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
 * สร้าง UUID สำหรับ Share Token
 */
function generateShareToken(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// ============================================================
// Create Share Link
// ============================================================

/**
 * สร้างลิงก์แชร์เอกสาร
 * @param documentId - ID ของเอกสาร
 * @param documentType - ประเภทเอกสาร
 * @param documentNumber - เลขที่เอกสาร
 * @param options - ตัวเลือกเพิ่มเติม
 * @returns ผลลัพธ์การสร้างลิงก์
 */
export async function createShareLink(
    documentId: string,
    documentType: DocType,
    documentNumber: string,
    options?: {
        expiresInDays?: number;     // หมดอายุใน X วัน (ถ้าไม่ระบุ = ไม่หมดอายุ)
        canDownload?: boolean;      // อนุญาตให้ดาวน์โหลด PDF หรือไม่
        note?: string;              // หมายเหตุ
        companyId?: string;
    }
): Promise<{ success: boolean; shareLink?: ShareLink; shareUrl?: string; error?: string }> {
    try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            return { success: false, error: 'กรุณาเข้าสู่ระบบก่อนสร้างลิงก์แชร์' };
        }

        // สร้าง Share Token (UUID)
        const shareToken = generateShareToken();
        const shareId = `${documentType}_${shareToken}`;
        
        // คำนวณวันหมดอายุ
        let expiresAt: Date | null = null;
        if (options?.expiresInDays && options.expiresInDays > 0) {
            expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + options.expiresInDays);
        }

        // สร้างข้อมูล Share Link
        const shareLinkData: Omit<ShareLink, 'id'> = {
            documentId,
            documentType,
            documentNumber,
            shareToken,
            createdAt: new Date(),
            createdBy: currentUser.uid,
            creatorName: currentUser.displayName || undefined,
            creatorEmail: currentUser.email || undefined,
            companyId: options?.companyId,
            expiresAt,
            isActive: true,
            accessCount: 0,
            lastAccessedAt: null,
            permissions: {
                canView: true,
                canDownload: options?.canDownload ?? true,
            },
            note: options?.note,
        };

        // สร้างข้อมูลสำหรับบันทึก (ลบ undefined fields)
        const dataToSave: Record<string, any> = {
            documentId,
            documentType,
            documentNumber,
            shareToken,
            createdAt: Timestamp.fromDate(shareLinkData.createdAt),
            createdBy: currentUser.uid,
            expiresAt: expiresAt ? Timestamp.fromDate(expiresAt) : null,
            isActive: true,
            accessCount: 0,
            lastAccessedAt: null,
            permissions: {
                canView: true,
                canDownload: options?.canDownload ?? true,
            },
        };

        // เพิ่ม optional fields เฉพาะที่มีค่า (ไม่ใช่ undefined)
        if (currentUser.displayName) {
            dataToSave.creatorName = currentUser.displayName;
        }
        if (currentUser.email) {
            dataToSave.creatorEmail = currentUser.email;
        }
        if (options?.companyId) {
            dataToSave.companyId = options.companyId;
        }
        if (options?.note) {
            dataToSave.note = options.note;
        }

        // บันทึกลง Firestore
        const docRef = doc(db, SHARE_LINKS_COLLECTION, shareId);
        await setDoc(docRef, dataToSave);

        // สร้าง URL
        const shareUrl = `${SHARE_BASE_URL}/share/${shareToken}`;

        console.log(`✅ [ShareLink] Created share link: ${shareUrl}`);
        
        return { 
            success: true, 
            shareLink: { id: shareId, ...shareLinkData },
            shareUrl 
        };
    } catch (error) {
        console.error('❌ [ShareLink] Error creating share link:', error);
        return { success: false, error: 'ไม่สามารถสร้างลิงก์แชร์ได้' };
    }
}

// ============================================================
// Get Share Link
// ============================================================

/**
 * ดึงข้อมูล Share Link จาก Token (Public - ไม่ต้อง Login)
 * @param shareToken - Share Token (UUID)
 * @returns ข้อมูล Share Link
 */
export async function getShareLinkByToken(
    shareToken: string
): Promise<{ success: boolean; shareLink?: ShareLink; error?: string }> {
    try {
        // ค้นหา Share Link จาก token
        const q = query(
            collection(db, SHARE_LINKS_COLLECTION),
            where('shareToken', '==', shareToken)
        );
        
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            return { success: false, error: 'ไม่พบลิงก์แชร์ หรือลิงก์ไม่ถูกต้อง' };
        }

        const docData = querySnapshot.docs[0].data();
        
        // ตรวจสอบว่า active หรือไม่
        if (!docData.isActive) {
            return { success: false, error: 'ลิงก์แชร์นี้ถูกปิดการใช้งานแล้ว' };
        }

        // ตรวจสอบวันหมดอายุ
        if (docData.expiresAt) {
            const expiresAt = docData.expiresAt.toDate();
            if (expiresAt < new Date()) {
                return { success: false, error: 'ลิงก์แชร์นี้หมดอายุแล้ว' };
            }
        }

        const shareLink: ShareLink = {
            id: querySnapshot.docs[0].id,
            documentId: docData.documentId,
            documentType: docData.documentType,
            documentNumber: docData.documentNumber,
            shareToken: docData.shareToken,
            createdAt: docData.createdAt?.toDate() || new Date(),
            createdBy: docData.createdBy,
            creatorName: docData.creatorName,
            creatorEmail: docData.creatorEmail,
            companyId: docData.companyId,
            expiresAt: docData.expiresAt?.toDate() || null,
            isActive: docData.isActive,
            accessCount: docData.accessCount || 0,
            lastAccessedAt: docData.lastAccessedAt?.toDate() || null,
            permissions: docData.permissions || { canView: true, canDownload: true },
            note: docData.note,
        };

        return { success: true, shareLink };
    } catch (error) {
        console.error('❌ [ShareLink] Error getting share link:', error);
        return { success: false, error: 'ไม่สามารถดึงข้อมูลลิงก์แชร์ได้' };
    }
}

/**
 * ดึงข้อมูลเอกสารจาก Share Link (Public - ไม่ต้อง Login)
 * @param shareToken - Share Token
 * @returns ข้อมูลเอกสาร
 */
export async function getSharedDocument(
    shareToken: string
): Promise<{ success: boolean; data?: SharedDocumentData; shareLink?: ShareLink; error?: string }> {
    try {
        // ดึงข้อมูล Share Link ก่อน
        const shareLinkResult = await getShareLinkByToken(shareToken);
        if (!shareLinkResult.success || !shareLinkResult.shareLink) {
            return { success: false, error: shareLinkResult.error };
        }

        const shareLink = shareLinkResult.shareLink;

        // ดึงข้อมูลเอกสาร
        const collectionName = DOC_TYPE_TO_COLLECTION[shareLink.documentType];
        if (!collectionName) {
            return { success: false, error: 'ประเภทเอกสารไม่ถูกต้อง' };
        }

        const docRef = doc(db, collectionName, shareLink.documentId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            return { success: false, error: 'ไม่พบเอกสาร' };
        }

        const docData = docSnap.data();

        // อัพเดท access count
        await incrementAccessCount(shareLink.id);

        // สร้างข้อมูลสำหรับแสดง
        const sharedData: SharedDocumentData = {
            documentType: DOC_TYPE_NAMES[shareLink.documentType] || shareLink.documentType,
            documentNumber: shareLink.documentNumber,
            companyName: docData.companyName || docData.fromCompany,
            customerName: docData.customerName || docData.toCompany,
            projectName: docData.projectName || docData.project,
            documentDate: getDocumentDate(docData, shareLink.documentType),
            total: docData.total || docData.totalAmount || docData.totalContractAmount,
            createdAt: docData.createdAt?.toDate(),
            canDownload: shareLink.permissions.canDownload,
            additionalData: {
                // ข้อมูลเพิ่มเติมตาม doc type
                ...filterDocumentData(docData, shareLink.documentType),
            },
        };

        return { success: true, data: sharedData, shareLink };
    } catch (error) {
        console.error('❌ [ShareLink] Error getting shared document:', error);
        return { success: false, error: 'ไม่สามารถดึงข้อมูลเอกสารได้' };
    }
}

/**
 * ดึงรายการ Share Links ทั้งหมดของเอกสาร
 * @param documentId - ID ของเอกสาร
 * @param documentType - ประเภทเอกสาร
 * @returns รายการ Share Links
 */
export async function getShareLinksForDocument(
    documentId: string,
    documentType: DocType
): Promise<{ success: boolean; shareLinks?: ShareLink[]; error?: string }> {
    try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            return { success: false, error: 'กรุณาเข้าสู่ระบบ' };
        }

        const q = query(
            collection(db, SHARE_LINKS_COLLECTION),
            where('documentId', '==', documentId),
            where('documentType', '==', documentType),
            orderBy('createdAt', 'desc')
        );
        
        const querySnapshot = await getDocs(q);
        
        const shareLinks: ShareLink[] = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                documentId: data.documentId,
                documentType: data.documentType,
                documentNumber: data.documentNumber,
                shareToken: data.shareToken,
                createdAt: data.createdAt?.toDate() || new Date(),
                createdBy: data.createdBy,
                creatorName: data.creatorName,
                creatorEmail: data.creatorEmail,
                companyId: data.companyId,
                expiresAt: data.expiresAt?.toDate() || null,
                isActive: data.isActive,
                accessCount: data.accessCount || 0,
                lastAccessedAt: data.lastAccessedAt?.toDate() || null,
                permissions: data.permissions || { canView: true, canDownload: true },
                note: data.note,
            };
        });

        return { success: true, shareLinks };
    } catch (error) {
        console.error('❌ [ShareLink] Error getting share links:', error);
        return { success: false, error: 'ไม่สามารถดึงรายการลิงก์แชร์ได้' };
    }
}

// ============================================================
// Update / Delete Share Link
// ============================================================

/**
 * ปิดการใช้งาน Share Link
 * @param shareLinkId - ID ของ Share Link
 * @returns ผลลัพธ์
 */
export async function deactivateShareLink(
    shareLinkId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            return { success: false, error: 'กรุณาเข้าสู่ระบบ' };
        }

        const docRef = doc(db, SHARE_LINKS_COLLECTION, shareLinkId);
        await updateDoc(docRef, {
            isActive: false,
            updatedAt: Timestamp.now(),
        });

        console.log(`✅ [ShareLink] Deactivated share link: ${shareLinkId}`);
        return { success: true };
    } catch (error) {
        console.error('❌ [ShareLink] Error deactivating share link:', error);
        return { success: false, error: 'ไม่สามารถปิดการใช้งานลิงก์แชร์ได้' };
    }
}

/**
 * เปิดการใช้งาน Share Link
 * @param shareLinkId - ID ของ Share Link
 * @returns ผลลัพธ์
 */
export async function activateShareLink(
    shareLinkId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            return { success: false, error: 'กรุณาเข้าสู่ระบบ' };
        }

        const docRef = doc(db, SHARE_LINKS_COLLECTION, shareLinkId);
        await updateDoc(docRef, {
            isActive: true,
            updatedAt: Timestamp.now(),
        });

        console.log(`✅ [ShareLink] Activated share link: ${shareLinkId}`);
        return { success: true };
    } catch (error) {
        console.error('❌ [ShareLink] Error activating share link:', error);
        return { success: false, error: 'ไม่สามารถเปิดการใช้งานลิงก์แชร์ได้' };
    }
}

/**
 * ลบ Share Link
 * @param shareLinkId - ID ของ Share Link
 * @returns ผลลัพธ์
 */
export async function deleteShareLink(
    shareLinkId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            return { success: false, error: 'กรุณาเข้าสู่ระบบ' };
        }

        const docRef = doc(db, SHARE_LINKS_COLLECTION, shareLinkId);
        await deleteDoc(docRef);

        console.log(`✅ [ShareLink] Deleted share link: ${shareLinkId}`);
        return { success: true };
    } catch (error) {
        console.error('❌ [ShareLink] Error deleting share link:', error);
        return { success: false, error: 'ไม่สามารถลบลิงก์แชร์ได้' };
    }
}

// ============================================================
// Helper Functions
// ============================================================

/**
 * เพิ่ม access count
 */
async function incrementAccessCount(shareLinkId: string): Promise<void> {
    try {
        const docRef = doc(db, SHARE_LINKS_COLLECTION, shareLinkId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const currentCount = docSnap.data().accessCount || 0;
            await updateDoc(docRef, {
                accessCount: currentCount + 1,
                lastAccessedAt: Timestamp.now(),
            });
        }
    } catch (error) {
        console.error('❌ [ShareLink] Error incrementing access count:', error);
    }
}

/**
 * ดึงวันที่ของเอกสาร
 */
function getDocumentDate(docData: any, docType: DocType): Date | undefined {
    const dateFields: Record<DocType, string> = {
        'delivery': 'date',
        'warranty': 'purchaseDate',
        'invoice': 'invoiceDate',
        'receipt': 'receiptDate',
        'tax-invoice': 'taxInvoiceDate',
        'quotation': 'quotationDate',
        'purchase-order': 'purchaseOrderDate',
        'memo': 'date',
        'variation-order': 'date',
        'subcontract': 'contractDate',
    };

    const field = dateFields[docType];
    return docData[field]?.toDate?.() || docData[field];
}

/**
 * กรองข้อมูลเอกสารสำหรับแสดง (ไม่แสดงข้อมูลที่ sensitive)
 */
function filterDocumentData(docData: any, docType: DocType): Record<string, any> {
    // ลบ fields ที่ไม่ควรแสดง
    const { 
        userId, 
        companyId, 
        verificationToken,
        logo,
        logoUrl,
        ...filteredData 
    } = docData;

    // แปลง Timestamp เป็น Date
    Object.keys(filteredData).forEach(key => {
        if (filteredData[key]?.toDate) {
            filteredData[key] = filteredData[key].toDate();
        }
    });

    return filteredData;
}

/**
 * สร้าง Share URL
 */
export function generateShareUrl(shareToken: string): string {
    return `${SHARE_BASE_URL}/share/${shareToken}`;
}

/**
 * ดึง Base URL
 */
export function getShareBaseUrl(): string {
    return SHARE_BASE_URL;
}
