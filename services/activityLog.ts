/**
 * Activity Log Service - บริการบันทึก log การดำเนินการทั้งหมดใน app
 * 
 * ฟีเจอร์:
 * - บันทึกทุกกิจกรรม: สร้าง, แก้ไข, ลบ, อัปเดต เอกสาร/ลูกค้า/ผู้รับเหมา
 * - เก็บข้อมูลผู้ดำเนินการ (ใคร), การกระทำ (ทำอะไร), เวลา (เมื่อไหร่)
 * - รองรับการ query แยกวัน/เดือน/ปี
 * - รองรับการ filter ตามประเภทกิจกรรม
 */

import {
    collection,
    doc,
    getDocs,
    addDoc,
    query,
    where,
    orderBy,
    limit,
    Timestamp,
    startAfter,
    DocumentSnapshot,
    getDoc,
} from "firebase/firestore";
import { db, auth } from "../firebase.config";

// ============================================================
// Types - ประเภทข้อมูลสำหรับ Activity Log
// ============================================================

/** ประเภทของ resource ที่ถูกดำเนินการ */
export type ActivityResourceType =
    | 'document'        // เอกสารทุกประเภท
    | 'customer'        // ลูกค้า
    | 'contractor'      // ผู้รับเหมา
    | 'endCustomer'     // ลูกค้าปลายทาง
    | 'company'         // บริษัท
    | 'member'          // สมาชิก
    | 'invitation'      // คำเชิญ
    | 'settings'        // การตั้งค่า
    | 'shareLink'       // ลิงก์แชร์
    | 'signature'       // ลายเซ็น
    | 'subscription';   // แพ็กเกจ

/** ประเภทของ action ที่ดำเนินการ */
export type ActivityAction =
    | 'create'          // สร้างใหม่
    | 'update'          // แก้ไข/อัปเดต
    | 'delete'          // ลบ
    | 'restore'         // กู้คืน
    | 'lock'            // ล็อก
    | 'unlock'          // ปลดล็อก
    | 'archive'         // จัดเก็บ
    | 'unarchive'       // นำกลับจากการจัดเก็บ
    | 'cancel'          // ยกเลิก
    | 'copy'            // คัดลอก
    | 'share'           // แชร์
    | 'export'          // ส่งออก (PDF, PNG)
    | 'sign'            // เซ็นชื่อ
    | 'approve'         // อนุมัติ
    | 'reject'          // ปฏิเสธ
    | 'invite'          // เชิญสมาชิก
    | 'join'            // เข้าร่วม
    | 'leave'           // ออกจากทีม
    | 'login'           // เข้าสู่ระบบ
    | 'logout';         // ออกจากระบบ

/** Interface หลักสำหรับ Activity Log Entry */
export interface ActivityLogEntry {
    id?: string;
    // ข้อมูลผู้ดำเนินการ
    userId: string;                     // User ID ที่ดำเนินการ
    userName?: string;                  // ชื่อผู้ดำเนินการ
    userEmail?: string;                 // อีเมลผู้ดำเนินการ
    userPhotoURL?: string;              // รูปโปรไฟล์ผู้ดำเนินการ
    // ข้อมูลกิจกรรม
    action: ActivityAction;             // ประเภท action
    resourceType: ActivityResourceType; // ประเภท resource
    resourceId?: string;                // ID ของ resource ที่ถูกดำเนินการ
    resourceName?: string;              // ชื่อ/หมายเลขของ resource
    subType?: string;                   // ชื่อย่อยของ resource (เช่น 'delivery', 'invoice')
    // ข้อมูลเพิ่มเติม
    description: string;                // คำอธิบายกิจกรรม (ภาษาไทย)
    changes?: Record<string, { old: any; new: any }>;  // รายละเอียดการเปลี่ยนแปลง
    metadata?: Record<string, any>;     // ข้อมูลเพิ่มเติมอื่นๆ
    // บริษัท
    companyId: string;                  // ID ของบริษัท
    // เวลา
    timestamp: Date;                    // เวลาที่ดำเนินการ
    // สำหรับ query แยกวัน/เดือน/ปี (จัดเก็บเป็น field เพื่อ query ง่าย)
    year: number;                       // ปี (เช่น 2026)
    month: number;                      // เดือน (1-12)
    day: number;                        // วัน (1-31)
}

// Collection name สำหรับ Activity Log
const ACTIVITY_LOG_COLLECTION = "activityLogs";

// ============================================================
// Mapping ภาษาไทยสำหรับ Action Labels
// ============================================================

/** แปลง action เป็นข้อความภาษาไทย */
export const ACTIVITY_ACTION_LABELS: Record<ActivityAction, string> = {
    'create': 'สร้าง',
    'update': 'แก้ไข',
    'delete': 'ลบ',
    'restore': 'กู้คืน',
    'lock': 'ล็อก',
    'unlock': 'ปลดล็อก',
    'archive': 'จัดเก็บ',
    'unarchive': 'นำกลับ',
    'cancel': 'ยกเลิก',
    'copy': 'คัดลอก',
    'share': 'แชร์',
    'export': 'ส่งออก',
    'sign': 'เซ็นชื่อ',
    'approve': 'อนุมัติ',
    'reject': 'ปฏิเสธ',
    'invite': 'เชิญสมาชิก',
    'join': 'เข้าร่วม',
    'leave': 'ออกจากทีม',
    'login': 'เข้าสู่ระบบ',
    'logout': 'ออกจากระบบ',
};

/** แปลง resource type เป็นข้อความภาษาไทย */
export const ACTIVITY_RESOURCE_LABELS: Record<ActivityResourceType, string> = {
    'document': 'เอกสาร',
    'customer': 'ลูกค้า',
    'contractor': 'ผู้รับเหมา',
    'endCustomer': 'ลูกค้าปลายทาง',
    'company': 'บริษัท',
    'member': 'สมาชิก',
    'invitation': 'คำเชิญ',
    'settings': 'การตั้งค่า',
    'shareLink': 'ลิงก์แชร์',
    'signature': 'ลายเซ็น',
    'subscription': 'แพ็กเกจ',
};

/** แปลง action เป็น icon/emoji สำหรับแสดงใน UI */
export const ACTIVITY_ACTION_ICONS: Record<ActivityAction, string> = {
    'create': '➕',
    'update': '✏️',
    'delete': '🗑️',
    'restore': '♻️',
    'lock': '🔒',
    'unlock': '🔓',
    'archive': '📦',
    'unarchive': '📤',
    'cancel': '❌',
    'copy': '📋',
    'share': '🔗',
    'export': '📄',
    'sign': '✍️',
    'approve': '✅',
    'reject': '🚫',
    'invite': '📨',
    'join': '👋',
    'leave': '🚪',
    'login': '🔑',
    'logout': '🔓',
};

/** สีพื้นหลังสำหรับแต่ละ action (Tailwind classes) */
export const ACTIVITY_ACTION_COLORS: Record<ActivityAction, { bg: string; text: string; darkBg: string; darkText: string }> = {
    'create': { bg: 'bg-green-100', text: 'text-green-700', darkBg: 'dark:bg-green-900/30', darkText: 'dark:text-green-300' },
    'update': { bg: 'bg-blue-100', text: 'text-blue-700', darkBg: 'dark:bg-blue-900/30', darkText: 'dark:text-blue-300' },
    'delete': { bg: 'bg-red-100', text: 'text-red-700', darkBg: 'dark:bg-red-900/30', darkText: 'dark:text-red-300' },
    'restore': { bg: 'bg-emerald-100', text: 'text-emerald-700', darkBg: 'dark:bg-emerald-900/30', darkText: 'dark:text-emerald-300' },
    'lock': { bg: 'bg-yellow-100', text: 'text-yellow-700', darkBg: 'dark:bg-yellow-900/30', darkText: 'dark:text-yellow-300' },
    'unlock': { bg: 'bg-yellow-100', text: 'text-yellow-700', darkBg: 'dark:bg-yellow-900/30', darkText: 'dark:text-yellow-300' },
    'archive': { bg: 'bg-gray-100', text: 'text-gray-700', darkBg: 'dark:bg-gray-800', darkText: 'dark:text-gray-300' },
    'unarchive': { bg: 'bg-gray-100', text: 'text-gray-700', darkBg: 'dark:bg-gray-800', darkText: 'dark:text-gray-300' },
    'cancel': { bg: 'bg-red-100', text: 'text-red-700', darkBg: 'dark:bg-red-900/30', darkText: 'dark:text-red-300' },
    'copy': { bg: 'bg-indigo-100', text: 'text-indigo-700', darkBg: 'dark:bg-indigo-900/30', darkText: 'dark:text-indigo-300' },
    'share': { bg: 'bg-purple-100', text: 'text-purple-700', darkBg: 'dark:bg-purple-900/30', darkText: 'dark:text-purple-300' },
    'export': { bg: 'bg-cyan-100', text: 'text-cyan-700', darkBg: 'dark:bg-cyan-900/30', darkText: 'dark:text-cyan-300' },
    'sign': { bg: 'bg-amber-100', text: 'text-amber-700', darkBg: 'dark:bg-amber-900/30', darkText: 'dark:text-amber-300' },
    'approve': { bg: 'bg-green-100', text: 'text-green-700', darkBg: 'dark:bg-green-900/30', darkText: 'dark:text-green-300' },
    'reject': { bg: 'bg-red-100', text: 'text-red-700', darkBg: 'dark:bg-red-900/30', darkText: 'dark:text-red-300' },
    'invite': { bg: 'bg-violet-100', text: 'text-violet-700', darkBg: 'dark:bg-violet-900/30', darkText: 'dark:text-violet-300' },
    'join': { bg: 'bg-teal-100', text: 'text-teal-700', darkBg: 'dark:bg-teal-900/30', darkText: 'dark:text-teal-300' },
    'leave': { bg: 'bg-orange-100', text: 'text-orange-700', darkBg: 'dark:bg-orange-900/30', darkText: 'dark:text-orange-300' },
    'login': { bg: 'bg-sky-100', text: 'text-sky-700', darkBg: 'dark:bg-sky-900/30', darkText: 'dark:text-sky-300' },
    'logout': { bg: 'bg-slate-100', text: 'text-slate-700', darkBg: 'dark:bg-slate-800', darkText: 'dark:text-slate-300' },
};

// ============================================================
// บันทึก Activity Log
// ============================================================

/**
 * บันทึก Activity Log entry ใหม่
 * @param entry - ข้อมูลกิจกรรมที่จะบันทึก (ไม่ต้องส่ง userId/userName/timestamp - จะดึงจาก auth)
 * @returns ผลลัพธ์การบันทึก
 */
export async function logActivity(
    entry: Omit<ActivityLogEntry, 'id' | 'userId' | 'userName' | 'userEmail' | 'userPhotoURL' | 'timestamp' | 'year' | 'month' | 'day'>
): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            console.warn('⚠️ [ActivityLog] ไม่มี user ที่ login อยู่ ข้ามการบันทึก log');
            return { success: false, error: 'ไม่มีผู้ใช้ที่เข้าสู่ระบบ' };
        }

        const now = new Date();

        const logData = {
            ...entry,
            userId: currentUser.uid,
            userName: currentUser.displayName || 'ไม่ระบุชื่อ',
            userEmail: currentUser.email || null,
            userPhotoURL: currentUser.photoURL || null,
            timestamp: Timestamp.now(),
            // เก็บ year/month/day แยกสำหรับ query ที่มีประสิทธิภาพ
            year: now.getFullYear(),
            month: now.getMonth() + 1,
            day: now.getDate(),
        };

        const docRef = await addDoc(collection(db, ACTIVITY_LOG_COLLECTION), logData);

        console.log(`✅ [ActivityLog] บันทึกกิจกรรม: ${entry.action} ${entry.resourceType} - ${entry.description}`);
        return { success: true, id: docRef.id };
    } catch (error) {
        console.error('❌ [ActivityLog] เกิดข้อผิดพลาดในการบันทึก:', error);
        return { success: false, error: 'ไม่สามารถบันทึก Activity Log ได้' };
    }
}

// ============================================================
// ดึงข้อมูล Activity Log
// ============================================================

/** ตัวเลือกสำหรับการ query Activity Log */
export interface ActivityLogQueryOptions {
    companyId: string;
    /** กรอง action (เช่น ['create', 'update']) */
    actions?: ActivityAction[];
    /** กรอง resource type (เช่น ['document', 'customer']) */
    resourceTypes?: ActivityResourceType[];
    /** กรองตาม userId */
    userId?: string;
    /** กรองตามปี */
    year?: number;
    /** กรองตามเดือน (1-12) */
    month?: number;
    /** กรองตามวัน (1-31) */
    day?: number;
    /** จำนวนรายการต่อหน้า */
    pageSize?: number;
    /** cursor สำหรับ pagination (DocumentSnapshot ตัวสุดท้ายของหน้าก่อน) */
    lastDoc?: DocumentSnapshot;
}

/**
 * ดึง Activity Log ตามเงื่อนไข พร้อม pagination
 * @param options - ตัวเลือกการ query
 * @returns รายการ Activity Log
 */
export async function getActivityLogs(
    options: ActivityLogQueryOptions
): Promise<{ success: boolean; data?: ActivityLogEntry[]; lastDoc?: DocumentSnapshot; hasMore?: boolean; error?: string }> {
    try {
        const {
            companyId,
            actions,
            resourceTypes,
            userId,
            year,
            month,
            day,
            pageSize = 50,
            lastDoc,
        } = options;

        // สร้าง query constraints
        const constraints: any[] = [
            where('companyId', '==', companyId),
            orderBy('timestamp', 'desc'),
        ];

        // กรองตาม action (ใช้ in operator ถ้ามีหลายค่า, max 30 ค่า)
        if (actions && actions.length > 0 && actions.length <= 30) {
            constraints.push(where('action', 'in', actions));
        }

        // กรองตาม resource type
        if (resourceTypes && resourceTypes.length === 1) {
            constraints.push(where('resourceType', '==', resourceTypes[0]));
        }

        // กรองตาม userId
        if (userId) {
            constraints.push(where('userId', '==', userId));
        }

        // กรองตามปี
        if (year) {
            constraints.push(where('year', '==', year));
        }

        // กรองตามเดือน
        if (month) {
            constraints.push(where('month', '==', month));
        }

        // กรองตามวัน
        if (day) {
            constraints.push(where('day', '==', day));
        }

        // Pagination
        if (lastDoc) {
            constraints.push(startAfter(lastDoc));
        }

        constraints.push(limit(pageSize + 1)); // ดึงเพิ่ม 1 เพื่อเช็คว่ามีหน้าถัดไปหรือไม่

        const q = query(collection(db, ACTIVITY_LOG_COLLECTION), ...constraints);
        const querySnapshot = await getDocs(q);

        const entries: ActivityLogEntry[] = [];
        let lastDocSnapshot: DocumentSnapshot | undefined;

        querySnapshot.docs.forEach((docSnap, index) => {
            if (index < pageSize) {
                const data = docSnap.data();
                entries.push({
                    id: docSnap.id,
                    userId: data.userId,
                    userName: data.userName,
                    userEmail: data.userEmail,
                    userPhotoURL: data.userPhotoURL,
                    action: data.action,
                    resourceType: data.resourceType,
                    resourceId: data.resourceId,
                    resourceName: data.resourceName,
                    subType: data.subType,
                    description: data.description,
                    changes: data.changes,
                    metadata: data.metadata,
                    companyId: data.companyId,
                    timestamp: data.timestamp?.toDate() || new Date(),
                    year: data.year,
                    month: data.month,
                    day: data.day,
                });
                lastDocSnapshot = docSnap;
            }
        });

        const hasMore = querySnapshot.docs.length > pageSize;

        return {
            success: true,
            data: entries,
            lastDoc: lastDocSnapshot,
            hasMore,
        };
    } catch (error) {
        console.error('❌ [ActivityLog] เกิดข้อผิดพลาดในการดึงข้อมูล:', error);
        return { success: false, error: 'ไม่สามารถดึง Activity Log ได้' };
    }
}

/**
 * ดึงสรุปจำนวนกิจกรรมแยกตามวันในเดือนที่ระบุ
 * @param companyId - ID ของบริษัท
 * @param year - ปี
 * @param month - เดือน (1-12)
 * @returns สรุปจำนวนกิจกรรมแต่ละวัน
 */
export async function getActivitySummaryByMonth(
    companyId: string,
    year: number,
    month: number
): Promise<{ success: boolean; data?: Record<number, number>; total?: number; error?: string }> {
    try {
        const q = query(
            collection(db, ACTIVITY_LOG_COLLECTION),
            where('companyId', '==', companyId),
            where('year', '==', year),
            where('month', '==', month),
            orderBy('timestamp', 'desc'),
        );

        const querySnapshot = await getDocs(q);

        // นับจำนวนกิจกรรมแต่ละวัน
        const dayCounts: Record<number, number> = {};
        querySnapshot.docs.forEach(doc => {
            const day = doc.data().day;
            dayCounts[day] = (dayCounts[day] || 0) + 1;
        });

        return {
            success: true,
            data: dayCounts,
            total: querySnapshot.docs.length,
        };
    } catch (error) {
        console.error('❌ [ActivityLog] เกิดข้อผิดพลาดในการดึงสรุป:', error);
        return { success: false, error: 'ไม่สามารถดึงสรุป Activity Log ได้' };
    }
}

// ============================================================
// Helper Functions - ฟังก์ชันช่วยบันทึก log สำหรับแต่ละประเภท
// ============================================================

/** ชื่อประเภทเอกสารภาษาไทย */
const DOC_TYPE_NAMES: Record<string, string> = {
    'delivery': 'ใบส่งมอบงาน',
    'warranty': 'ใบรับประกัน',
    'invoice': 'ใบแจ้งหนี้',
    'receipt': 'ใบเสร็จ',
    'tax-invoice': 'ใบกำกับภาษี',
    'quotation': 'ใบเสนอราคา',
    'purchase-order': 'ใบสั่งซื้อ',
    'memo': 'ใบบันทึก',
    'variation-order': 'ใบส่วนต่าง',
    'subcontract': 'สัญญาจ้างเหมาช่วง',
};

/**
 * บันทึก log เมื่อสร้างเอกสาร
 */
export async function logDocumentCreate(
    companyId: string,
    docType: string,
    docNumber: string,
    documentId?: string
): Promise<void> {
    const typeName = DOC_TYPE_NAMES[docType] || docType;
    await logActivity({
        action: 'create',
        resourceType: 'document',
        resourceId: documentId,
        resourceName: docNumber,
        subType: docType,
        companyId,
        description: `สร้าง${typeName} เลขที่ ${docNumber}`,
    });
}

/**
 * บันทึก log เมื่อแก้ไขเอกสาร
 */
export async function logDocumentUpdate(
    companyId: string,
    docType: string,
    docNumber: string,
    documentId?: string,
    changes?: Record<string, { old: any; new: any }>
): Promise<void> {
    const typeName = DOC_TYPE_NAMES[docType] || docType;
    const changeCount = changes ? Object.keys(changes).length : 0;
    await logActivity({
        action: 'update',
        resourceType: 'document',
        resourceId: documentId,
        resourceName: docNumber,
        subType: docType,
        companyId,
        description: `แก้ไข${typeName} เลขที่ ${docNumber}${changeCount > 0 ? ` (${changeCount} รายการ)` : ''}`,
        changes,
    });
}

/**
 * บันทึก log เมื่อลบเอกสาร
 */
export async function logDocumentDelete(
    companyId: string,
    docType: string,
    docNumber: string,
    documentId?: string
): Promise<void> {
    const typeName = DOC_TYPE_NAMES[docType] || docType;
    await logActivity({
        action: 'delete',
        resourceType: 'document',
        resourceId: documentId,
        resourceName: docNumber,
        subType: docType,
        companyId,
        description: `ลบ${typeName} เลขที่ ${docNumber}`,
    });
}

/**
 * บันทึก log เมื่อส่งออก PDF/PNG
 */
export async function logDocumentExport(
    companyId: string,
    docType: string,
    docNumber: string,
    exportFormat: 'pdf' | 'png',
    documentId?: string
): Promise<void> {
    const typeName = DOC_TYPE_NAMES[docType] || docType;
    await logActivity({
        action: 'export',
        resourceType: 'document',
        resourceId: documentId,
        resourceName: docNumber,
        subType: docType,
        companyId,
        description: `ส่งออก${typeName} เลขที่ ${docNumber} เป็น ${exportFormat.toUpperCase()}`,
        metadata: { exportFormat },
    });
}

/**
 * บันทึก log เมื่อสร้าง/แก้ไข/ลบ ลูกค้า
 */
export async function logCustomerAction(
    companyId: string,
    action: ActivityAction,
    customerName: string,
    customerId?: string
): Promise<void> {
    const actionLabel = ACTIVITY_ACTION_LABELS[action];
    await logActivity({
        action,
        resourceType: 'customer',
        resourceId: customerId,
        resourceName: customerName,
        companyId,
        description: `${actionLabel}ลูกค้า "${customerName}"`,
    });
}

/**
 * บันทึก log เมื่อสร้าง/แก้ไข/ลบ ผู้รับเหมา
 */
export async function logContractorAction(
    companyId: string,
    action: ActivityAction,
    contractorName: string,
    contractorId?: string
): Promise<void> {
    const actionLabel = ACTIVITY_ACTION_LABELS[action];
    await logActivity({
        action,
        resourceType: 'contractor',
        resourceId: contractorId,
        resourceName: contractorName,
        companyId,
        description: `${actionLabel}ผู้รับเหมา "${contractorName}"`,
    });
}

/**
 * บันทึก log สำหรับสมาชิก (เชิญ, เข้าร่วม, ออก)
 */
export async function logMemberAction(
    companyId: string,
    action: ActivityAction,
    memberName: string,
    memberId?: string
): Promise<void> {
    const actionLabel = ACTIVITY_ACTION_LABELS[action];
    await logActivity({
        action,
        resourceType: 'member',
        resourceId: memberId,
        resourceName: memberName,
        companyId,
        description: `${actionLabel} "${memberName}"`,
    });
}

/**
 * บันทึก log ทั่วไป (สำหรับกรณีที่ไม่มี helper เฉพาะ)
 */
export async function logGenericAction(
    companyId: string,
    action: ActivityAction,
    resourceType: ActivityResourceType,
    description: string,
    resourceId?: string,
    resourceName?: string,
    metadata?: Record<string, any>
): Promise<void> {
    await logActivity({
        action,
        resourceType,
        resourceId,
        resourceName,
        companyId,
        description,
        metadata,
    });
}

// ============================================================
// Utility Functions - ฟังก์ชันช่วยจัดรูปแบบการแสดงผล
// ============================================================

/**
 * จัดกลุ่ม Activity Log ตามวันที่
 * @param entries - รายการ Activity Log
 * @returns กลุ่มตามวันที่ (key = "YYYY-MM-DD")
 */
export function groupActivitiesByDate(
    entries: ActivityLogEntry[]
): Record<string, ActivityLogEntry[]> {
    const groups: Record<string, ActivityLogEntry[]> = {};

    entries.forEach(entry => {
        const dateKey = `${entry.year}-${String(entry.month).padStart(2, '0')}-${String(entry.day).padStart(2, '0')}`;
        if (!groups[dateKey]) {
            groups[dateKey] = [];
        }
        groups[dateKey].push(entry);
    });

    return groups;
}

/**
 * แปลงวันที่เป็นข้อความภาษาไทยที่เป็นมิตร
 * @param dateKey - key ในรูปแบบ "YYYY-MM-DD"
 * @returns ข้อความภาษาไทย (เช่น "วันนี้", "เมื่อวาน", "6 กุมภาพันธ์ 2569")
 */
export function formatDateLabel(dateKey: string): string {
    const [yearStr, monthStr, dayStr] = dateKey.split('-');
    const targetDate = new Date(parseInt(yearStr), parseInt(monthStr) - 1, parseInt(dayStr));
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (targetDate.getTime() === today.getTime()) {
        return 'วันนี้';
    } else if (targetDate.getTime() === yesterday.getTime()) {
        return 'เมื่อวาน';
    }

    const thaiMonths = [
        'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
        'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];

    const day = parseInt(dayStr);
    const month = thaiMonths[parseInt(monthStr) - 1];
    const buddhistYear = parseInt(yearStr) + 543;

    return `${day} ${month} ${buddhistYear}`;
}

/**
 * แปลงเวลาเป็นรูปแบบ HH:mm
 */
export function formatTime(date: Date): string {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}
