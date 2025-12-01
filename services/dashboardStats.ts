/**
 * Dashboard Statistics Service
 * บริการสำหรับดึงข้อมูลสถิติเอกสารเพื่อแสดงใน Dashboard
 */

import { 
    collection, 
    getDocs, 
    query, 
    where, 
    orderBy,
    Timestamp,
    limit as firestoreLimit
} from "firebase/firestore";
import { db, auth } from "../firebase.config";
import { DocType } from "../utils/documentRegistry";

// ชื่อ Collection ทั้งหมด
const COLLECTIONS: Record<DocType, string> = {
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

// ชื่อเอกสารภาษาไทย
export const DOC_TYPE_NAMES: Record<DocType, string> = {
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

// Interface สำหรับสถิติเอกสารแต่ละประเภท
export interface DocumentTypeStats {
    docType: DocType;
    name: string;
    total: number;
    thisMonth: number;
    lastMonth: number;
    cancelled: number;
    growthPercent: number; // เปอร์เซ็นต์การเติบโตจากเดือนที่แล้ว
}

// Interface สำหรับสถิติรวมทั้งหมด
export interface DashboardStats {
    totalDocuments: number;           // จำนวนเอกสารทั้งหมด
    totalThisMonth: number;           // จำนวนเอกสารเดือนนี้
    totalLastMonth: number;           // จำนวนเอกสารเดือนที่แล้ว
    totalCancelled: number;           // จำนวนเอกสารที่ยกเลิก
    growthPercent: number;            // เปอร์เซ็นต์การเติบโต
    byDocType: DocumentTypeStats[];   // สถิติแยกตามประเภทเอกสาร
    recentActivity: RecentActivity[]; // กิจกรรมล่าสุด (deprecated - use recentActivities)
    recentActivities: RecentActivity[]; // กิจกรรมล่าสุด
    monthlyTrend: MonthlyTrend[];     // แนวโน้มรายเดือน (deprecated - use monthlyTrends)
    monthlyTrends: ExtendedMonthlyTrend[];  // แนวโน้มรายเดือนแบบละเอียด
    totalRevenue: number;             // ยอดรวมรายได้ (จาก invoice, receipt, quotation)
    totalExpense: number;             // ยอดรวมรายจ่าย (จาก purchase-order, subcontract)
    // New features
    topCustomers: TopCustomer[];      // Top 5 ลูกค้าที่ออกเอกสารบ่อย
    expiringDocuments: ExpiringDocument[]; // เอกสารที่ใกล้หมดอายุ
    pendingPayments: PendingPayment[]; // ใบแจ้งหนี้ค้างชำระ
}

// Interface สำหรับกิจกรรมล่าสุด
export interface RecentActivity {
    id: string;
    docType: DocType;
    docTypeName: string;
    docNumber: string;
    customerName?: string;
    total?: number;
    amount?: number;         // alias for total
    createdAt: Date;
    status: 'active' | 'cancelled';
}

// Interface สำหรับแนวโน้มรายเดือน
export interface MonthlyTrend {
    month: string;           // เช่น "ม.ค. 68"
    monthKey: string;        // เช่น "2025-01"
    count: number;           // จำนวนเอกสาร
    revenue: number;         // รายได้
}

// Extended Monthly Trend สำหรับ Reports
export interface ExtendedMonthlyTrend {
    month: number;           // 1-12
    year: number;            // เช่น 2025
    monthKey: string;        // เช่น "2025-01"
    monthName: string;       // เช่น "ม.ค. 68"
    totalDocuments: number;
    totalRevenue: number;
    totalExpense: number;
    byDocType: Record<DocType, number>;
}

// Interface สำหรับ Top Customer
export interface TopCustomer {
    customerName: string;
    documentCount: number;
    totalAmount: number;
    lastDocumentDate: Date;
}

// Interface สำหรับเอกสารที่ใกล้หมดอายุ
export interface ExpiringDocument {
    id: string;
    docType: DocType;
    docNumber: string;
    customerName?: string;
    expiryDate: Date;
    daysUntilExpiry: number;
}

// Interface สำหรับใบแจ้งหนี้ค้างชำระ
export interface PendingPayment {
    id: string;
    docType: DocType;
    docNumber: string;
    customerName?: string;
    amount: number;
    dueDate: Date;
    daysOverdue: number;
    status: 'pending' | 'overdue';
}

/**
 * ดึงวันที่เริ่มต้นของเดือนปัจจุบัน
 */
const getStartOfMonth = (date: Date = new Date()): Date => {
    return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
};

/**
 * ดึงวันที่เริ่มต้นของเดือนที่แล้ว
 */
const getStartOfLastMonth = (): Date => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
};

/**
 * ดึงวันที่สิ้นสุดของเดือนที่แล้ว
 */
const getEndOfLastMonth = (): Date => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
};

/**
 * คำนวณเปอร์เซ็นต์การเติบโต
 */
const calculateGrowthPercent = (current: number, previous: number): number => {
    if (previous === 0) {
        return current > 0 ? 100 : 0;
    }
    return Math.round(((current - previous) / previous) * 100);
};

/**
 * ดึงสถิติเอกสารแต่ละประเภท
 */
const getDocTypeStats = async (
    docType: DocType, 
    companyId?: string
): Promise<DocumentTypeStats> => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
        throw new Error("กรุณา Login ก่อนดูสถิติ");
    }

    const collectionName = COLLECTIONS[docType];
    const startOfMonth = getStartOfMonth();
    const startOfLastMonth = getStartOfLastMonth();
    const endOfLastMonth = getEndOfLastMonth();

    // Query constraints พื้นฐาน
    const baseConstraints = [
        where("userId", "==", currentUser.uid),
        where("isDeleted", "==", false),
    ];

    if (companyId) {
        baseConstraints.push(where("companyId", "==", companyId));
    }

    try {
        // ดึงเอกสารทั้งหมด
        const allDocsQuery = query(collection(db, collectionName), ...baseConstraints);
        const allDocsSnapshot = await getDocs(allDocsQuery);
        
        let total = 0;
        let thisMonth = 0;
        let lastMonth = 0;
        let cancelled = 0;

        allDocsSnapshot.docs.forEach(doc => {
            const data = doc.data();
            total++;

            // ตรวจสอบสถานะยกเลิก
            if (data.documentStatus === 'cancelled') {
                cancelled++;
            }

            // ตรวจสอบวันที่สร้าง
            const createdAt = data.createdAt?.toDate();
            if (createdAt) {
                if (createdAt >= startOfMonth) {
                    thisMonth++;
                } else if (createdAt >= startOfLastMonth && createdAt <= endOfLastMonth) {
                    lastMonth++;
                }
            }
        });

        return {
            docType,
            name: DOC_TYPE_NAMES[docType],
            total,
            thisMonth,
            lastMonth,
            cancelled,
            growthPercent: calculateGrowthPercent(thisMonth, lastMonth),
        };
    } catch (error) {
        console.error(`Error getting stats for ${docType}:`, error);
        return {
            docType,
            name: DOC_TYPE_NAMES[docType],
            total: 0,
            thisMonth: 0,
            lastMonth: 0,
            cancelled: 0,
            growthPercent: 0,
        };
    }
};

/**
 * ดึงกิจกรรมล่าสุด (10 รายการ)
 */
const getRecentActivity = async (companyId?: string): Promise<RecentActivity[]> => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
        return [];
    }

    const activities: RecentActivity[] = [];
    const docTypes: DocType[] = ['delivery', 'warranty', 'invoice', 'receipt', 'quotation', 'purchase-order'];

    for (const docType of docTypes) {
        const collectionName = COLLECTIONS[docType];
        
        try {
            const constraints = [
                where("userId", "==", currentUser.uid),
                where("isDeleted", "==", false),
            ];

            if (companyId) {
                constraints.push(where("companyId", "==", companyId));
            }

            const q = query(
                collection(db, collectionName),
                ...constraints,
                orderBy("createdAt", "desc"),
                firestoreLimit(5)
            );

            const snapshot = await getDocs(q);
            
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                
                // ดึงเลขที่เอกสารตามประเภท
                let docNumber = '';
                let customerName = '';
                let total: number | undefined;

                switch (docType) {
                    case 'delivery':
                        docNumber = data.docNumber || '';
                        customerName = data.toCompany || '';
                        break;
                    case 'warranty':
                        docNumber = data.warrantyNumber || '';
                        customerName = data.customerName || '';
                        break;
                    case 'invoice':
                        docNumber = data.invoiceNumber || '';
                        customerName = data.customerName || '';
                        total = data.total;
                        break;
                    case 'receipt':
                        docNumber = data.receiptNumber || '';
                        customerName = data.customerName || '';
                        total = data.total;
                        break;
                    case 'quotation':
                        docNumber = data.quotationNumber || '';
                        customerName = data.customerName || '';
                        total = data.total;
                        break;
                    case 'purchase-order':
                        docNumber = data.purchaseOrderNumber || '';
                        customerName = data.supplierName || '';
                        total = data.total;
                        break;
                }

                activities.push({
                    id: doc.id,
                    docType,
                    docTypeName: DOC_TYPE_NAMES[docType],
                    docNumber,
                    customerName,
                    total,
                    createdAt: data.createdAt?.toDate() || new Date(),
                    status: data.documentStatus === 'cancelled' ? 'cancelled' : 'active',
                });
            });
        } catch (error) {
            console.error(`Error getting recent activity for ${docType}:`, error);
        }
    }

    // เรียงตามวันที่สร้างล่าสุดและจำกัด 10 รายการ
    return activities
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 10);
};

/**
 * ดึงแนวโน้มรายเดือน (6 เดือนย้อนหลัง)
 */
const getMonthlyTrend = async (companyId?: string): Promise<MonthlyTrend[]> => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
        return [];
    }

    const trends: MonthlyTrend[] = [];
    const now = new Date();

    // สร้างข้อมูล 6 เดือนย้อนหลัง
    for (let i = 5; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
        
        // ชื่อเดือนภาษาไทยแบบย่อ
        const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
        const thaiYear = (monthDate.getFullYear() + 543) % 100; // ปี พ.ศ. แบบ 2 หลัก
        const monthName = `${thaiMonths[monthDate.getMonth()]} ${thaiYear}`;

        trends.push({
            month: monthName,
            monthKey,
            count: 0,
            revenue: 0,
        });
    }

    // Collections ที่มียอดเงิน (สำหรับคำนวณรายได้)
    const revenueCollections: DocType[] = ['invoice', 'receipt', 'quotation'];

    // ดึงข้อมูลจากแต่ละ collection
    const allDocTypes: DocType[] = Object.keys(COLLECTIONS) as DocType[];
    
    for (const docType of allDocTypes) {
        const collectionName = COLLECTIONS[docType];
        
        try {
            const constraints = [
                where("userId", "==", currentUser.uid),
                where("isDeleted", "==", false),
            ];

            if (companyId) {
                constraints.push(where("companyId", "==", companyId));
            }

            // ดึงเอกสาร 6 เดือนย้อนหลัง
            const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
            constraints.push(where("createdAt", ">=", Timestamp.fromDate(sixMonthsAgo)));

            const q = query(collection(db, collectionName), ...constraints);
            const snapshot = await getDocs(q);

            snapshot.docs.forEach(doc => {
                const data = doc.data();
                const createdAt = data.createdAt?.toDate();
                
                if (createdAt) {
                    const monthKey = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}`;
                    const trend = trends.find(t => t.monthKey === monthKey);
                    
                    if (trend) {
                        trend.count++;
                        
                        // เพิ่มรายได้ถ้าเป็น collection ที่มียอดเงิน
                        if (revenueCollections.includes(docType) && data.total) {
                            trend.revenue += data.total;
                        }
                    }
                }
            });
        } catch (error) {
            console.error(`Error getting monthly trend for ${docType}:`, error);
        }
    }

    return trends;
};

/**
 * คำนวณยอดรวมรายได้และรายจ่าย
 */
const getFinancialSummary = async (companyId?: string): Promise<{ revenue: number; expense: number }> => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
        return { revenue: 0, expense: 0 };
    }

    let revenue = 0;
    let expense = 0;

    const startOfMonth = getStartOfMonth();

    // Collections สำหรับรายได้
    const revenueCollections = ['invoices', 'receipts'];
    // Collections สำหรับรายจ่าย
    const expenseCollections = ['purchaseOrders', 'subcontracts'];

    // คำนวณรายได้
    for (const collectionName of revenueCollections) {
        try {
            const constraints = [
                where("userId", "==", currentUser.uid),
                where("isDeleted", "==", false),
                where("createdAt", ">=", Timestamp.fromDate(startOfMonth)),
            ];

            if (companyId) {
                constraints.push(where("companyId", "==", companyId));
            }

            const q = query(collection(db, collectionName), ...constraints);
            const snapshot = await getDocs(q);

            snapshot.docs.forEach(doc => {
                const data = doc.data();
                if (data.total && data.documentStatus !== 'cancelled') {
                    revenue += data.total;
                }
            });
        } catch (error) {
            console.error(`Error calculating revenue from ${collectionName}:`, error);
        }
    }

    // คำนวณรายจ่าย
    for (const collectionName of expenseCollections) {
        try {
            const constraints = [
                where("userId", "==", currentUser.uid),
                where("isDeleted", "==", false),
                where("createdAt", ">=", Timestamp.fromDate(startOfMonth)),
            ];

            if (companyId) {
                constraints.push(where("companyId", "==", companyId));
            }

            const q = query(collection(db, collectionName), ...constraints);
            const snapshot = await getDocs(q);

            snapshot.docs.forEach(doc => {
                const data = doc.data();
                // สำหรับ subcontract ใช้ totalContractAmount
                const amount = data.total || data.totalContractAmount || 0;
                if (amount && data.documentStatus !== 'cancelled') {
                    expense += amount;
                }
            });
        } catch (error) {
            console.error(`Error calculating expense from ${collectionName}:`, error);
        }
    }

    return { revenue, expense };
};

/**
 * ดึง Top Customers
 */
const getTopCustomers = async (companyId?: string): Promise<TopCustomer[]> => {
    const currentUser = auth.currentUser;
    if (!currentUser) return [];

    const customerMap = new Map<string, TopCustomer>();
    const revenueCollections: DocType[] = ['invoice', 'receipt', 'quotation'];

    for (const docType of revenueCollections) {
        const collectionName = COLLECTIONS[docType];
        try {
            const constraints = [
                where("userId", "==", currentUser.uid),
                where("isDeleted", "==", false),
            ];
            if (companyId) constraints.push(where("companyId", "==", companyId));

            const q = query(collection(db, collectionName), ...constraints);
            const snapshot = await getDocs(q);

            snapshot.docs.forEach(doc => {
                const data = doc.data();
                const customerName = data.customerName || data.toCompany || 'ไม่ระบุ';
                if (!customerName || customerName === 'ไม่ระบุ') return;

                const existing = customerMap.get(customerName);
                const createdAt = data.createdAt?.toDate() || new Date();
                const amount = data.total || 0;

                if (existing) {
                    existing.documentCount++;
                    existing.totalAmount += amount;
                    if (createdAt > existing.lastDocumentDate) {
                        existing.lastDocumentDate = createdAt;
                    }
                } else {
                    customerMap.set(customerName, {
                        customerName,
                        documentCount: 1,
                        totalAmount: amount,
                        lastDocumentDate: createdAt,
                    });
                }
            });
        } catch (error) {
            console.error(`Error getting top customers from ${docType}:`, error);
        }
    }

    return Array.from(customerMap.values())
        .sort((a, b) => b.documentCount - a.documentCount)
        .slice(0, 5);
};

/**
 * ดึงเอกสารที่ใกล้หมดอายุ
 */
const getExpiringDocuments = async (companyId?: string): Promise<ExpiringDocument[]> => {
    const currentUser = auth.currentUser;
    if (!currentUser) return [];

    const expiringDocs: ExpiringDocument[] = [];
    const now = new Date();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // ตรวจสอบ Quotation (validUntilDate)
    try {
        const constraints = [
            where("userId", "==", currentUser.uid),
            where("isDeleted", "==", false),
        ];
        if (companyId) constraints.push(where("companyId", "==", companyId));

        const q = query(collection(db, 'quotations'), ...constraints);
        const snapshot = await getDocs(q);

        snapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.documentStatus === 'cancelled') return;
            
            const validUntil = data.validUntilDate?.toDate();
            if (validUntil && validUntil >= now && validUntil <= thirtyDaysLater) {
                const daysUntil = Math.ceil((validUntil.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
                expiringDocs.push({
                    id: doc.id,
                    docType: 'quotation',
                    docNumber: data.quotationNumber || '',
                    customerName: data.customerName,
                    expiryDate: validUntil,
                    daysUntilExpiry: daysUntil,
                });
            }
        });
    } catch (error) {
        console.error('Error getting expiring quotations:', error);
    }

    // ตรวจสอบ Warranty (warrantyEndDate)
    try {
        const constraints = [
            where("userId", "==", currentUser.uid),
            where("isDeleted", "==", false),
        ];
        if (companyId) constraints.push(where("companyId", "==", companyId));

        const q = query(collection(db, 'warrantyCards'), ...constraints);
        const snapshot = await getDocs(q);

        snapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.documentStatus === 'cancelled') return;
            
            const warrantyEnd = data.warrantyEndDate?.toDate();
            if (warrantyEnd && warrantyEnd >= now && warrantyEnd <= thirtyDaysLater) {
                const daysUntil = Math.ceil((warrantyEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
                expiringDocs.push({
                    id: doc.id,
                    docType: 'warranty',
                    docNumber: data.warrantyNumber || '',
                    customerName: data.customerName,
                    expiryDate: warrantyEnd,
                    daysUntilExpiry: daysUntil,
                });
            }
        });
    } catch (error) {
        console.error('Error getting expiring warranties:', error);
    }

    return expiringDocs.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
};

/**
 * ดึงใบแจ้งหนี้ค้างชำระ
 */
const getPendingPayments = async (companyId?: string): Promise<PendingPayment[]> => {
    const currentUser = auth.currentUser;
    if (!currentUser) return [];

    const pendingPayments: PendingPayment[] = [];
    const now = new Date();

    try {
        const constraints = [
            where("userId", "==", currentUser.uid),
            where("isDeleted", "==", false),
        ];
        if (companyId) constraints.push(where("companyId", "==", companyId));

        const q = query(collection(db, 'invoices'), ...constraints);
        const snapshot = await getDocs(q);

        snapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.documentStatus === 'cancelled' || data.paymentStatus === 'paid') return;
            
            const dueDate = data.dueDate?.toDate();
            if (!dueDate) return;

            const daysOverdue = Math.ceil((now.getTime() - dueDate.getTime()) / (24 * 60 * 60 * 1000));
            
            pendingPayments.push({
                id: doc.id,
                docType: 'invoice',
                docNumber: data.invoiceNumber || '',
                customerName: data.customerName,
                amount: data.total || 0,
                dueDate,
                daysOverdue: Math.max(0, daysOverdue),
                status: daysOverdue > 0 ? 'overdue' : 'pending',
            });
        });
    } catch (error) {
        console.error('Error getting pending payments:', error);
    }

    return pendingPayments.sort((a, b) => b.daysOverdue - a.daysOverdue);
};

/**
 * ดึงแนวโน้มรายเดือนแบบละเอียด (12 เดือน)
 */
const getExtendedMonthlyTrends = async (companyId?: string): Promise<ExtendedMonthlyTrend[]> => {
    const currentUser = auth.currentUser;
    if (!currentUser) return [];

    const trends: ExtendedMonthlyTrend[] = [];
    const now = new Date();

    // สร้างข้อมูล 12 เดือนย้อนหลัง
    for (let i = 11; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
        const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
        const thaiYear = (monthDate.getFullYear() + 543) % 100;

        const byDocType: Record<DocType, number> = {} as Record<DocType, number>;
        (Object.keys(COLLECTIONS) as DocType[]).forEach(dt => { byDocType[dt] = 0; });

        trends.push({
            month: monthDate.getMonth() + 1,
            year: monthDate.getFullYear(),
            monthKey,
            monthName: `${thaiMonths[monthDate.getMonth()]} ${thaiYear}`,
            totalDocuments: 0,
            totalRevenue: 0,
            totalExpense: 0,
            byDocType,
        });
    }

    const revenueCollections: DocType[] = ['invoice', 'receipt', 'quotation'];
    const expenseCollections: DocType[] = ['purchase-order', 'subcontract'];
    const allDocTypes: DocType[] = Object.keys(COLLECTIONS) as DocType[];
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    for (const docType of allDocTypes) {
        const collectionName = COLLECTIONS[docType];
        try {
            const constraints = [
                where("userId", "==", currentUser.uid),
                where("isDeleted", "==", false),
                where("createdAt", ">=", Timestamp.fromDate(twelveMonthsAgo)),
            ];
            if (companyId) constraints.push(where("companyId", "==", companyId));

            const q = query(collection(db, collectionName), ...constraints);
            const snapshot = await getDocs(q);

            snapshot.docs.forEach(doc => {
                const data = doc.data();
                if (data.documentStatus === 'cancelled') return;
                
                const createdAt = data.createdAt?.toDate();
                if (!createdAt) return;

                const monthKey = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}`;
                const trend = trends.find(t => t.monthKey === monthKey);
                if (!trend) return;

                trend.totalDocuments++;
                trend.byDocType[docType]++;

                const amount = data.total || data.totalContractAmount || 0;
                if (revenueCollections.includes(docType)) {
                    trend.totalRevenue += amount;
                } else if (expenseCollections.includes(docType)) {
                    trend.totalExpense += amount;
                }
            });
        } catch (error) {
            console.error(`Error getting extended trends for ${docType}:`, error);
        }
    }

    return trends;
};

/**
 * ดึงสถิติ Dashboard ทั้งหมด
 */
export const getDashboardStats = async (companyId?: string): Promise<DashboardStats> => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
        throw new Error("กรุณา Login ก่อนดูสถิติ");
    }

    // ดึงสถิติแต่ละประเภทเอกสารแบบ parallel
    const docTypes: DocType[] = Object.keys(COLLECTIONS) as DocType[];
    const statsPromises = docTypes.map(docType => getDocTypeStats(docType, companyId));
    
    const [byDocType, recentActivity, monthlyTrend, financialSummary, topCustomers, expiringDocuments, pendingPayments, monthlyTrends] = await Promise.all([
        Promise.all(statsPromises),
        getRecentActivity(companyId),
        getMonthlyTrend(companyId),
        getFinancialSummary(companyId),
        getTopCustomers(companyId),
        getExpiringDocuments(companyId),
        getPendingPayments(companyId),
        getExtendedMonthlyTrends(companyId),
    ]);

    // คำนวณสถิติรวม
    const totalDocuments = byDocType.reduce((sum, stat) => sum + stat.total, 0);
    const totalThisMonth = byDocType.reduce((sum, stat) => sum + stat.thisMonth, 0);
    const totalLastMonth = byDocType.reduce((sum, stat) => sum + stat.lastMonth, 0);
    const totalCancelled = byDocType.reduce((sum, stat) => sum + stat.cancelled, 0);
    const growthPercent = calculateGrowthPercent(totalThisMonth, totalLastMonth);

    // Add amount alias to recent activities
    const recentActivities = recentActivity.map(a => ({ ...a, amount: a.total }));

    return {
        totalDocuments,
        totalThisMonth,
        totalLastMonth,
        totalCancelled,
        growthPercent,
        byDocType,
        recentActivity,
        recentActivities,
        monthlyTrend,
        monthlyTrends,
        totalRevenue: financialSummary.revenue,
        totalExpense: financialSummary.expense,
        topCustomers,
        expiringDocuments,
        pendingPayments,
    };
};

export default getDashboardStats;

