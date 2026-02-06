/**
 * Notification Service
 * บริการแจ้งเตือนเมื่อมีเอกสารใหม่ถูกสร้างในองค์กร
 * ใช้ Firestore collection "notifications" สำหรับเก็บข้อมูลการแจ้งเตือน
 */

import {
    collection,
    doc,
    addDoc,
    query,
    where,
    orderBy,
    limit,
    onSnapshot,
    updateDoc,
    Timestamp,
    getDocs,
    writeBatch,
    Unsubscribe,
} from "firebase/firestore";
import { db } from "../firebase.config";

// ============================================================
// Types
// ============================================================

/** ประเภทเอกสารที่รองรับการแจ้งเตือน */
export type NotificationDocType =
    | 'delivery'
    | 'warranty'
    | 'invoice'
    | 'receipt'
    | 'tax-invoice'
    | 'quotation'
    | 'purchase-order'
    | 'memo'
    | 'variation-order'
    | 'subcontract';

/** ข้อมูลการแจ้งเตือน */
export interface NotificationItem {
    id?: string;
    /** รหัสบริษัท */
    companyId: string;
    /** ประเภทเอกสาร */
    docType: NotificationDocType;
    /** ชื่อเอกสาร เช่น เลขที่เอกสาร */
    docTitle: string;
    /** ID ของเอกสารใน Firestore */
    docId: string;
    /** UID ของผู้สร้างเอกสาร */
    createdByUid: string;
    /** ชื่อผู้สร้างเอกสาร */
    createdByName: string;
    /** วันที่สร้าง */
    createdAt: Date;
    /** รายชื่อ UID ที่อ่านแล้ว */
    readBy: string[];
}

// ============================================================
// Constants - ชื่อเมนูภาษาไทย
// ============================================================

/** แมปชื่อประเภทเอกสาร => ชื่อไทย */
export const DOC_TYPE_LABELS: Record<NotificationDocType, string> = {
    'delivery': 'ใบส่งมอบงาน',
    'warranty': 'ใบรับประกัน',
    'invoice': 'ใบแจ้งหนี้',
    'receipt': 'ใบเสร็จ',
    'tax-invoice': 'ใบกำกับภาษี',
    'quotation': 'ใบเสนอราคา',
    'purchase-order': 'ใบสั่งซื้อ',
    'memo': 'บันทึก',
    'variation-order': 'ใบส่วนต่าง',
    'subcontract': 'สัญญาช่าง',
};

/** แมป collection name => NotificationDocType */
export const COLLECTION_TO_DOC_TYPE: Record<string, NotificationDocType> = {
    'deliveryNotes': 'delivery',
    'warrantyCards': 'warranty',
    'invoices': 'invoice',
    'receipts': 'receipt',
    'taxInvoices': 'tax-invoice',
    'quotations': 'quotation',
    'purchaseOrders': 'purchase-order',
    'memos': 'memo',
    'variationOrders': 'variation-order',
    'subcontracts': 'subcontract',
};

const NOTIFICATIONS_COLLECTION = "notifications";

// ============================================================
// Functions
// ============================================================

/**
 * สร้างการแจ้งเตือนใหม่เมื่อมีเอกสารถูกสร้าง
 * เรียกใช้จาก documentService.save()
 */
export const createNotification = async (
    companyId: string,
    docType: NotificationDocType,
    docTitle: string,
    docId: string,
    createdByUid: string,
    createdByName: string,
): Promise<void> => {
    try {
        // ไม่สร้าง notification ถ้าไม่มี companyId (เอกสารส่วนตัว)
        if (!companyId) return;

        await addDoc(collection(db, NOTIFICATIONS_COLLECTION), {
            companyId,
            docType,
            docTitle: docTitle || 'เอกสารใหม่',
            docId,
            createdByUid,
            createdByName: createdByName || 'ไม่ทราบชื่อ',
            createdAt: Timestamp.now(),
            readBy: [], // ยังไม่มีใครอ่าน
        });

        console.log(`🔔 [Notification] สร้างแจ้งเตือน: ${DOC_TYPE_LABELS[docType]} - ${docTitle}`);
    } catch (error) {
        // ไม่ throw error เพราะ notification ไม่ใช่ critical path
        console.error('❌ [Notification] สร้างแจ้งเตือนล้มเหลว:', error);
    }
};

/**
 * ฟัง (subscribe) การแจ้งเตือนใหม่แบบ realtime
 * คืนค่า unsubscribe function สำหรับยกเลิกการฟัง
 */
export const subscribeToNotifications = (
    companyId: string,
    callback: (notifications: NotificationItem[]) => void,
    limitCount: number = 20,
): Unsubscribe => {
    if (!companyId) {
        callback([]);
        return () => {};
    }

    // ดึงเฉพาะ notification ของบริษัทนี้ เรียงตามวันที่สร้าง (ใหม่สุดก่อน)
    const q = query(
        collection(db, NOTIFICATIONS_COLLECTION),
        where("companyId", "==", companyId),
        orderBy("createdAt", "desc"),
        limit(limitCount),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const notifications: NotificationItem[] = snapshot.docs.map((docSnap) => {
            const data = docSnap.data();
            return {
                id: docSnap.id,
                companyId: data.companyId,
                docType: data.docType,
                docTitle: data.docTitle,
                docId: data.docId,
                createdByUid: data.createdByUid,
                createdByName: data.createdByName,
                createdAt: data.createdAt?.toDate?.() || new Date(),
                readBy: data.readBy || [],
            };
        });

        callback(notifications);
    }, (error) => {
        console.error('❌ [Notification] subscribe error:', error);
        callback([]);
    });

    return unsubscribe;
};

/**
 * ทำเครื่องหมายว่าอ่านแล้ว (เพิ่ม uid เข้า readBy array)
 */
export const markNotificationAsRead = async (
    notificationId: string,
    userId: string,
): Promise<void> => {
    try {
        const docRef = doc(db, NOTIFICATIONS_COLLECTION, notificationId);
        // ใช้ arrayUnion เพื่อเพิ่ม uid โดยไม่ซ้ำ
        const { arrayUnion } = await import("firebase/firestore");
        await updateDoc(docRef, {
            readBy: arrayUnion(userId),
        });
    } catch (error) {
        console.error('❌ [Notification] markAsRead error:', error);
    }
};

/**
 * ทำเครื่องหมายว่าอ่านทั้งหมดแล้ว
 */
export const markAllNotificationsAsRead = async (
    companyId: string,
    userId: string,
): Promise<void> => {
    try {
        const q = query(
            collection(db, NOTIFICATIONS_COLLECTION),
            where("companyId", "==", companyId),
        );

        const snapshot = await getDocs(q);
        const batch = writeBatch(db);
        const { arrayUnion } = await import("firebase/firestore");

        snapshot.docs.forEach((docSnap) => {
            const data = docSnap.data();
            if (!data.readBy?.includes(userId)) {
                batch.update(docSnap.ref, {
                    readBy: arrayUnion(userId),
                });
            }
        });

        await batch.commit();
        console.log('✅ [Notification] ทำเครื่องหมายอ่านทั้งหมดแล้ว');
    } catch (error) {
        console.error('❌ [Notification] markAllAsRead error:', error);
    }
};

/**
 * คำนวณจำนวนแจ้งเตือนที่ยังไม่อ่าน
 */
export const getUnreadCount = (
    notifications: NotificationItem[],
    userId: string,
): number => {
    return notifications.filter(n => !n.readBy.includes(userId)).length;
};

/**
 * จัดรูปแบบเวลาที่ผ่านไป เช่น "5 นาทีที่แล้ว", "2 ชั่วโมงที่แล้ว"
 */
export const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return 'เมื่อสักครู่';
    if (diffMin < 60) return `${diffMin} นาทีที่แล้ว`;
    if (diffHour < 24) return `${diffHour} ชั่วโมงที่แล้ว`;
    if (diffDay < 7) return `${diffDay} วันที่แล้ว`;
    
    return date.toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
};
