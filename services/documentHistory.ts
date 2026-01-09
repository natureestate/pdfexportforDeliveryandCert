// Document History Service - บริการสำหรับจัดการประวัติการเปลี่ยนแปลงเอกสาร
// ฟีเจอร์: บันทึกประวัติการสร้าง, แก้ไข, lock, archive, cancel

import { 
    collection, 
    doc, 
    getDoc, 
    getDocs, 
    addDoc,
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

// ประเภทของ action ที่บันทึกได้
export type DocumentHistoryAction = 
    | 'create' 
    | 'update' 
    | 'lock' 
    | 'unlock' 
    | 'archive' 
    | 'unarchive'
    | 'cancel' 
    | 'restore'
    | 'copy'
    | 'share'
    | 'version_create';

// Interface สำหรับ Document History Entry
export interface DocumentHistoryEntry {
    id?: string;
    documentId: string;          // ID ของเอกสารหลัก
    documentType: DocType;       // ประเภทเอกสาร
    documentNumber?: string;     // เลขที่เอกสาร
    action: DocumentHistoryAction;
    timestamp: Date;
    userId: string;
    userName?: string;
    userEmail?: string;
    companyId?: string;
    // ข้อมูลเพิ่มเติมสำหรับ action บางประเภท
    changes?: Record<string, { old: any; new: any }>;  // สำหรับ update
    description?: string;        // คำอธิบายเพิ่มเติม
    metadata?: Record<string, any>;  // ข้อมูลเพิ่มเติม
}

// Collection name
const DOCUMENT_HISTORY_COLLECTION = "documentHistory";

// Mapping ภาษาไทยสำหรับ actions
export const ACTION_LABELS: Record<DocumentHistoryAction, string> = {
    'create': 'สร้างเอกสาร',
    'update': 'แก้ไขเอกสาร',
    'lock': 'ล็อกเอกสาร',
    'unlock': 'ปลดล็อกเอกสาร',
    'archive': 'จัดเก็บเอกสาร',
    'unarchive': 'นำกลับจากการจัดเก็บ',
    'cancel': 'ยกเลิกเอกสาร',
    'restore': 'กู้คืนเอกสาร',
    'copy': 'คัดลอกเอกสาร',
    'share': 'แชร์เอกสาร',
    'version_create': 'สร้างเวอร์ชันใหม่',
};

// ============================================================
// Create History Entry
// ============================================================

/**
 * บันทึกประวัติการเปลี่ยนแปลงเอกสาร
 * @param entry - ข้อมูลประวัติที่จะบันทึก
 * @returns ID ของ history entry ที่สร้าง
 */
export async function addDocumentHistory(
    entry: Omit<DocumentHistoryEntry, 'id' | 'timestamp' | 'userId' | 'userName' | 'userEmail'>
): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            return { success: false, error: 'กรุณาเข้าสู่ระบบก่อนบันทึกประวัติ' };
        }

        const historyData = {
            ...entry,
            timestamp: Timestamp.now(),
            userId: currentUser.uid,
            userName: currentUser.displayName || null,
            userEmail: currentUser.email || null,
        };

        const docRef = await addDoc(collection(db, DOCUMENT_HISTORY_COLLECTION), historyData);
        
        console.log(`✅ [DocumentHistory] Added history entry: ${entry.action} for ${entry.documentId}`);
        return { success: true, id: docRef.id };
    } catch (error) {
        console.error('❌ [DocumentHistory] Error adding history entry:', error);
        return { success: false, error: 'ไม่สามารถบันทึกประวัติเอกสารได้' };
    }
}

// ============================================================
// Get History Entries
// ============================================================

/**
 * ดึงประวัติการเปลี่ยนแปลงเอกสาร
 * @param documentId - ID ของเอกสาร
 * @param documentType - ประเภทเอกสาร
 * @param limitCount - จำนวนรายการที่ต้องการดึง (default: 50)
 * @returns รายการประวัติเอกสาร
 */
export async function getDocumentHistory(
    documentId: string,
    documentType: DocType,
    limitCount: number = 50
): Promise<{ success: boolean; data?: DocumentHistoryEntry[]; error?: string }> {
    try {
        const q = query(
            collection(db, DOCUMENT_HISTORY_COLLECTION),
            where('documentId', '==', documentId),
            where('documentType', '==', documentType),
            orderBy('timestamp', 'desc'),
            limit(limitCount)
        );

        const querySnapshot = await getDocs(q);
        
        const entries: DocumentHistoryEntry[] = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                documentId: data.documentId,
                documentType: data.documentType,
                documentNumber: data.documentNumber,
                action: data.action,
                timestamp: data.timestamp?.toDate() || new Date(),
                userId: data.userId,
                userName: data.userName,
                userEmail: data.userEmail,
                companyId: data.companyId,
                changes: data.changes,
                description: data.description,
                metadata: data.metadata,
            };
        });

        return { success: true, data: entries };
    } catch (error) {
        console.error('❌ [DocumentHistory] Error getting history:', error);
        return { success: false, error: 'ไม่สามารถดึงประวัติเอกสารได้' };
    }
}

/**
 * ดึงประวัติล่าสุดของผู้ใช้
 * @param limitCount - จำนวนรายการที่ต้องการดึง
 * @returns รายการประวัติล่าสุด
 */
export async function getRecentHistory(
    limitCount: number = 20
): Promise<{ success: boolean; data?: DocumentHistoryEntry[]; error?: string }> {
    try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            return { success: false, error: 'กรุณาเข้าสู่ระบบ' };
        }

        const q = query(
            collection(db, DOCUMENT_HISTORY_COLLECTION),
            where('userId', '==', currentUser.uid),
            orderBy('timestamp', 'desc'),
            limit(limitCount)
        );

        const querySnapshot = await getDocs(q);
        
        const entries: DocumentHistoryEntry[] = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                documentId: data.documentId,
                documentType: data.documentType,
                documentNumber: data.documentNumber,
                action: data.action,
                timestamp: data.timestamp?.toDate() || new Date(),
                userId: data.userId,
                userName: data.userName,
                userEmail: data.userEmail,
                companyId: data.companyId,
                changes: data.changes,
                description: data.description,
                metadata: data.metadata,
            };
        });

        return { success: true, data: entries };
    } catch (error) {
        console.error('❌ [DocumentHistory] Error getting recent history:', error);
        return { success: false, error: 'ไม่สามารถดึงประวัติล่าสุดได้' };
    }
}

// ============================================================
// Helper Functions for Common Actions
// ============================================================

/**
 * บันทึกประวัติเมื่อสร้างเอกสาร
 */
export async function logDocumentCreated(
    documentId: string,
    documentType: DocType,
    documentNumber: string,
    companyId?: string
): Promise<void> {
    await addDocumentHistory({
        documentId,
        documentType,
        documentNumber,
        action: 'create',
        companyId,
        description: `สร้างเอกสารเลขที่ ${documentNumber}`,
    });
}

/**
 * บันทึกประวัติเมื่อแก้ไขเอกสาร
 */
export async function logDocumentUpdated(
    documentId: string,
    documentType: DocType,
    documentNumber: string,
    changes?: Record<string, { old: any; new: any }>,
    companyId?: string
): Promise<void> {
    const changeCount = changes ? Object.keys(changes).length : 0;
    await addDocumentHistory({
        documentId,
        documentType,
        documentNumber,
        action: 'update',
        changes,
        companyId,
        description: `แก้ไขเอกสาร ${changeCount} รายการ`,
    });
}

/**
 * บันทึกประวัติเมื่อ lock เอกสาร
 */
export async function logDocumentLocked(
    documentId: string,
    documentType: DocType,
    documentNumber: string,
    reason?: string,
    companyId?: string
): Promise<void> {
    await addDocumentHistory({
        documentId,
        documentType,
        documentNumber,
        action: 'lock',
        companyId,
        description: reason || 'ล็อกเอกสาร',
        metadata: { reason },
    });
}

/**
 * บันทึกประวัติเมื่อ unlock เอกสาร
 */
export async function logDocumentUnlocked(
    documentId: string,
    documentType: DocType,
    documentNumber: string,
    companyId?: string
): Promise<void> {
    await addDocumentHistory({
        documentId,
        documentType,
        documentNumber,
        action: 'unlock',
        companyId,
        description: 'ปลดล็อกเอกสาร',
    });
}

/**
 * บันทึกประวัติเมื่อ archive เอกสาร
 */
export async function logDocumentArchived(
    documentId: string,
    documentType: DocType,
    documentNumber: string,
    companyId?: string
): Promise<void> {
    await addDocumentHistory({
        documentId,
        documentType,
        documentNumber,
        action: 'archive',
        companyId,
        description: 'จัดเก็บเอกสาร',
    });
}

/**
 * บันทึกประวัติเมื่อ unarchive เอกสาร
 */
export async function logDocumentUnarchived(
    documentId: string,
    documentType: DocType,
    documentNumber: string,
    companyId?: string
): Promise<void> {
    await addDocumentHistory({
        documentId,
        documentType,
        documentNumber,
        action: 'unarchive',
        companyId,
        description: 'นำเอกสารกลับจากการจัดเก็บ',
    });
}

/**
 * บันทึกประวัติเมื่อ copy เอกสาร
 */
export async function logDocumentCopied(
    originalDocumentId: string,
    newDocumentId: string,
    documentType: DocType,
    originalDocNumber: string,
    newDocNumber: string,
    companyId?: string
): Promise<void> {
    await addDocumentHistory({
        documentId: newDocumentId,
        documentType,
        documentNumber: newDocNumber,
        action: 'copy',
        companyId,
        description: `คัดลอกจากเอกสาร ${originalDocNumber}`,
        metadata: { 
            originalDocumentId, 
            originalDocNumber 
        },
    });
}

/**
 * บันทึกประวัติเมื่อ cancel เอกสาร
 */
export async function logDocumentCancelled(
    documentId: string,
    documentType: DocType,
    documentNumber: string,
    reason?: string,
    companyId?: string
): Promise<void> {
    await addDocumentHistory({
        documentId,
        documentType,
        documentNumber,
        action: 'cancel',
        companyId,
        description: reason || 'ยกเลิกเอกสาร',
        metadata: { reason },
    });
}

/**
 * บันทึกประวัติเมื่อ restore เอกสาร
 */
export async function logDocumentRestored(
    documentId: string,
    documentType: DocType,
    documentNumber: string,
    companyId?: string
): Promise<void> {
    await addDocumentHistory({
        documentId,
        documentType,
        documentNumber,
        action: 'restore',
        companyId,
        description: 'กู้คืนเอกสาร',
    });
}

// ============================================================
// Format Helpers
// ============================================================

/**
 * แปลง action เป็นข้อความภาษาไทย
 */
export function getActionLabel(action: DocumentHistoryAction): string {
    return ACTION_LABELS[action] || action;
}

/**
 * แปลง action เป็น icon/emoji
 */
export function getActionIcon(action: DocumentHistoryAction): string {
    const icons: Record<DocumentHistoryAction, string> = {
        'create': '📄',
        'update': '✏️',
        'lock': '🔒',
        'unlock': '🔓',
        'archive': '📦',
        'unarchive': '📤',
        'cancel': '❌',
        'restore': '♻️',
        'copy': '📋',
        'share': '🔗',
        'version_create': '📑',
    };
    return icons[action] || '📝';
}
