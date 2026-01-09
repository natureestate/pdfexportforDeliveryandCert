// Document Version Service - บริการสำหรับจัดการเวอร์ชันของเอกสาร
// ฟีเจอร์: สร้างเวอร์ชันใหม่, ดึงรายการเวอร์ชัน, Restore เวอร์ชันเก่า

import { 
    collection, 
    doc, 
    getDoc, 
    getDocs, 
    setDoc,
    updateDoc,
    query,
    where,
    orderBy,
    limit,
    Timestamp 
} from "firebase/firestore";
import { db, auth } from "../firebase.config";
import { DocType } from "../utils/documentRegistry";

// ============================================================
// Types
// ============================================================

// Interface สำหรับ Document Version
export interface DocumentVersion {
    id: string;
    documentId: string;
    documentType: DocType;
    documentNumber: string;
    versionNumber: number;       // 1, 2, 3, ...
    data: any;                   // snapshot ของเอกสารทั้งหมด
    createdAt: Date;
    createdBy: string;
    creatorName?: string;
    creatorEmail?: string;
    companyId?: string;
    note?: string;               // หมายเหตุเวอร์ชัน
    isCurrent: boolean;          // เป็นเวอร์ชันปัจจุบันหรือไม่
    changesSummary?: string;     // สรุปการเปลี่ยนแปลง
}

// ============================================================
// Configuration
// ============================================================

const DOCUMENT_VERSIONS_COLLECTION = "documentVersions";

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

// ============================================================
// Create Version
// ============================================================

/**
 * สร้างเวอร์ชันใหม่ของเอกสาร
 * @param documentId - ID ของเอกสาร
 * @param documentType - ประเภทเอกสาร
 * @param documentNumber - เลขที่เอกสาร
 * @param documentData - ข้อมูลเอกสาร (snapshot)
 * @param options - ตัวเลือกเพิ่มเติม
 * @returns ผลลัพธ์การสร้างเวอร์ชัน
 */
export async function createDocumentVersion(
    documentId: string,
    documentType: DocType,
    documentNumber: string,
    documentData: any,
    options?: {
        note?: string;
        changesSummary?: string;
        companyId?: string;
    }
): Promise<{ success: boolean; version?: DocumentVersion; error?: string }> {
    try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            return { success: false, error: 'กรุณาเข้าสู่ระบบก่อนสร้างเวอร์ชัน' };
        }

        // ดึงเวอร์ชันล่าสุด
        const latestVersion = await getLatestVersionNumber(documentId, documentType);
        const newVersionNumber = latestVersion + 1;

        // สร้าง ID สำหรับเวอร์ชันใหม่
        const versionId = `${documentType}_${documentId}_v${newVersionNumber}`;

        // ลบ fields ที่ไม่ควรเก็บใน version
        const cleanedData = cleanDocumentData(documentData);

        // สร้างข้อมูลเวอร์ชัน
        const versionData: Omit<DocumentVersion, 'id'> = {
            documentId,
            documentType,
            documentNumber,
            versionNumber: newVersionNumber,
            data: cleanedData,
            createdAt: new Date(),
            createdBy: currentUser.uid,
            creatorName: currentUser.displayName || undefined,
            creatorEmail: currentUser.email || undefined,
            companyId: options?.companyId,
            note: options?.note,
            isCurrent: true,
            changesSummary: options?.changesSummary,
        };

        // อัพเดทเวอร์ชันเก่าให้ไม่เป็น current
        await markPreviousVersionsAsNotCurrent(documentId, documentType);

        // บันทึกเวอร์ชันใหม่
        const docRef = doc(db, DOCUMENT_VERSIONS_COLLECTION, versionId);
        await setDoc(docRef, {
            ...versionData,
            createdAt: Timestamp.fromDate(versionData.createdAt),
        });

        console.log(`✅ [DocumentVersion] Created version ${newVersionNumber} for ${documentId}`);

        return { 
            success: true, 
            version: { id: versionId, ...versionData }
        };
    } catch (error) {
        console.error('❌ [DocumentVersion] Error creating version:', error);
        return { success: false, error: 'ไม่สามารถสร้างเวอร์ชันได้' };
    }
}

// ============================================================
// Get Versions
// ============================================================

/**
 * ดึงรายการเวอร์ชันทั้งหมดของเอกสาร
 * @param documentId - ID ของเอกสาร
 * @param documentType - ประเภทเอกสาร
 * @returns รายการเวอร์ชัน
 */
export async function getDocumentVersions(
    documentId: string,
    documentType: DocType
): Promise<{ success: boolean; versions?: DocumentVersion[]; error?: string }> {
    try {
        const q = query(
            collection(db, DOCUMENT_VERSIONS_COLLECTION),
            where('documentId', '==', documentId),
            where('documentType', '==', documentType),
            orderBy('versionNumber', 'desc')
        );
        
        const querySnapshot = await getDocs(q);
        
        const versions: DocumentVersion[] = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                documentId: data.documentId,
                documentType: data.documentType,
                documentNumber: data.documentNumber,
                versionNumber: data.versionNumber,
                data: data.data,
                createdAt: data.createdAt?.toDate() || new Date(),
                createdBy: data.createdBy,
                creatorName: data.creatorName,
                creatorEmail: data.creatorEmail,
                companyId: data.companyId,
                note: data.note,
                isCurrent: data.isCurrent || false,
                changesSummary: data.changesSummary,
            };
        });

        return { success: true, versions };
    } catch (error) {
        console.error('❌ [DocumentVersion] Error getting versions:', error);
        return { success: false, error: 'ไม่สามารถดึงรายการเวอร์ชันได้' };
    }
}

/**
 * ดึงเวอร์ชันเฉพาะตาม ID
 * @param versionId - ID ของเวอร์ชัน
 * @returns ข้อมูลเวอร์ชัน
 */
export async function getDocumentVersion(
    versionId: string
): Promise<{ success: boolean; version?: DocumentVersion; error?: string }> {
    try {
        const docRef = doc(db, DOCUMENT_VERSIONS_COLLECTION, versionId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            return { success: false, error: 'ไม่พบเวอร์ชันที่ต้องการ' };
        }

        const data = docSnap.data();
        const version: DocumentVersion = {
            id: docSnap.id,
            documentId: data.documentId,
            documentType: data.documentType,
            documentNumber: data.documentNumber,
            versionNumber: data.versionNumber,
            data: data.data,
            createdAt: data.createdAt?.toDate() || new Date(),
            createdBy: data.createdBy,
            creatorName: data.creatorName,
            creatorEmail: data.creatorEmail,
            companyId: data.companyId,
            note: data.note,
            isCurrent: data.isCurrent || false,
            changesSummary: data.changesSummary,
        };

        return { success: true, version };
    } catch (error) {
        console.error('❌ [DocumentVersion] Error getting version:', error);
        return { success: false, error: 'ไม่สามารถดึงข้อมูลเวอร์ชันได้' };
    }
}

/**
 * ดึงเวอร์ชันปัจจุบัน
 * @param documentId - ID ของเอกสาร
 * @param documentType - ประเภทเอกสาร
 * @returns เวอร์ชันปัจจุบัน
 */
export async function getCurrentVersion(
    documentId: string,
    documentType: DocType
): Promise<{ success: boolean; version?: DocumentVersion; error?: string }> {
    try {
        const q = query(
            collection(db, DOCUMENT_VERSIONS_COLLECTION),
            where('documentId', '==', documentId),
            where('documentType', '==', documentType),
            where('isCurrent', '==', true),
            limit(1)
        );
        
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            return { success: false, error: 'ไม่พบเวอร์ชันปัจจุบัน' };
        }

        const docData = querySnapshot.docs[0].data();
        const version: DocumentVersion = {
            id: querySnapshot.docs[0].id,
            documentId: docData.documentId,
            documentType: docData.documentType,
            documentNumber: docData.documentNumber,
            versionNumber: docData.versionNumber,
            data: docData.data,
            createdAt: docData.createdAt?.toDate() || new Date(),
            createdBy: docData.createdBy,
            creatorName: docData.creatorName,
            creatorEmail: docData.creatorEmail,
            companyId: docData.companyId,
            note: docData.note,
            isCurrent: true,
            changesSummary: docData.changesSummary,
        };

        return { success: true, version };
    } catch (error) {
        console.error('❌ [DocumentVersion] Error getting current version:', error);
        return { success: false, error: 'ไม่สามารถดึงเวอร์ชันปัจจุบันได้' };
    }
}

// ============================================================
// Restore Version
// ============================================================

/**
 * Restore เอกสารกลับไปใช้เวอร์ชันเก่า
 * @param versionId - ID ของเวอร์ชันที่ต้องการ restore
 * @returns ผลลัพธ์การ restore
 */
export async function restoreDocumentVersion(
    versionId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            return { success: false, error: 'กรุณาเข้าสู่ระบบก่อน restore เวอร์ชัน' };
        }

        // ดึงข้อมูลเวอร์ชันที่ต้องการ restore
        const versionResult = await getDocumentVersion(versionId);
        if (!versionResult.success || !versionResult.version) {
            return { success: false, error: versionResult.error || 'ไม่พบเวอร์ชัน' };
        }

        const version = versionResult.version;

        // ดึงข้อมูลเอกสารปัจจุบัน
        const collectionName = DOC_TYPE_TO_COLLECTION[version.documentType];
        if (!collectionName) {
            return { success: false, error: 'ประเภทเอกสารไม่ถูกต้อง' };
        }

        const docRef = doc(db, collectionName, version.documentId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            return { success: false, error: 'ไม่พบเอกสาร' };
        }

        const currentData = docSnap.data();

        // ตรวจสอบสิทธิ์
        if (currentData.userId !== currentUser.uid) {
            return { success: false, error: 'คุณไม่มีสิทธิ์ restore เอกสารนี้' };
        }

        // สร้างเวอร์ชันใหม่จากข้อมูลปัจจุบัน (สำรองก่อน restore)
        await createDocumentVersion(
            version.documentId,
            version.documentType,
            version.documentNumber,
            currentData,
            {
                note: `สำรองก่อน restore ไป v${version.versionNumber}`,
                companyId: currentData.companyId,
            }
        );

        // Restore: อัพเดทเอกสารด้วยข้อมูลจากเวอร์ชันเก่า
        const restoredData = {
            ...version.data,
            updatedAt: Timestamp.now(),
        };

        await updateDoc(docRef, restoredData);

        console.log(`✅ [DocumentVersion] Restored document ${version.documentId} to version ${version.versionNumber}`);

        return { success: true };
    } catch (error) {
        console.error('❌ [DocumentVersion] Error restoring version:', error);
        return { success: false, error: 'ไม่สามารถ restore เวอร์ชันได้' };
    }
}

// ============================================================
// Helper Functions
// ============================================================

/**
 * ดึงเลขเวอร์ชันล่าสุด
 */
async function getLatestVersionNumber(
    documentId: string,
    documentType: DocType
): Promise<number> {
    try {
        const q = query(
            collection(db, DOCUMENT_VERSIONS_COLLECTION),
            where('documentId', '==', documentId),
            where('documentType', '==', documentType),
            orderBy('versionNumber', 'desc'),
            limit(1)
        );
        
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            return 0;
        }

        return querySnapshot.docs[0].data().versionNumber || 0;
    } catch (error) {
        console.error('❌ [DocumentVersion] Error getting latest version number:', error);
        return 0;
    }
}

/**
 * อัพเดทเวอร์ชันเก่าให้ไม่เป็น current
 */
async function markPreviousVersionsAsNotCurrent(
    documentId: string,
    documentType: DocType
): Promise<void> {
    try {
        const q = query(
            collection(db, DOCUMENT_VERSIONS_COLLECTION),
            where('documentId', '==', documentId),
            where('documentType', '==', documentType),
            where('isCurrent', '==', true)
        );
        
        const querySnapshot = await getDocs(q);
        
        const updatePromises = querySnapshot.docs.map(docSnap => 
            updateDoc(doc(db, DOCUMENT_VERSIONS_COLLECTION, docSnap.id), {
                isCurrent: false,
            })
        );

        await Promise.all(updatePromises);
    } catch (error) {
        console.error('❌ [DocumentVersion] Error marking previous versions:', error);
    }
}

/**
 * ลบ fields ที่ไม่ควรเก็บใน version
 */
function cleanDocumentData(data: any): any {
    const {
        id,
        createdAt,
        updatedAt,
        deletedAt,
        // เก็บ fields เหล่านี้ไว้สำหรับ restore
        ...cleanedData
    } = data;

    // แปลง Timestamp เป็น serializable format
    Object.keys(cleanedData).forEach(key => {
        if (cleanedData[key]?.toDate) {
            cleanedData[key] = cleanedData[key].toDate().toISOString();
        } else if (cleanedData[key] instanceof Date) {
            cleanedData[key] = cleanedData[key].toISOString();
        }
    });

    return cleanedData;
}

/**
 * เปรียบเทียบความแตกต่างระหว่างสองเวอร์ชัน
 */
export function compareVersions(
    oldVersion: DocumentVersion,
    newVersion: DocumentVersion
): Record<string, { old: any; new: any }> {
    const changes: Record<string, { old: any; new: any }> = {};
    const allKeys = new Set([
        ...Object.keys(oldVersion.data || {}),
        ...Object.keys(newVersion.data || {}),
    ]);

    allKeys.forEach(key => {
        const oldValue = oldVersion.data?.[key];
        const newValue = newVersion.data?.[key];
        
        if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
            changes[key] = { old: oldValue, new: newValue };
        }
    });

    return changes;
}
