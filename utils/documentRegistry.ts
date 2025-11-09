// Document Registry - Configuration สำหรับแต่ละ Document Type
// ลด code duplication โดยใช้ Registry Pattern

import { 
    DeliveryNoteData, 
    WarrantyData, 
    InvoiceData, 
    ReceiptData, 
    QuotationData, 
    PurchaseOrderData 
} from '../types';
import {
    saveDeliveryNote,
    updateDeliveryNote,
    saveWarrantyCard,
    updateWarrantyCard,
    saveInvoice,
    updateInvoice,
    saveReceipt,
    updateReceipt,
    saveQuotation,
    updateQuotation,
    savePurchaseOrder,
    updatePurchaseOrder,
} from '../services/firestore';
import type {
    DeliveryNoteDocument,
    WarrantyDocument,
    InvoiceDocument,
    ReceiptDocument,
    QuotationDocument,
    PurchaseOrderDocument,
} from '../services/firestore';

export type DocType = 'delivery' | 'warranty' | 'invoice' | 'receipt' | 'quotation' | 'purchase-order';

// Union type สำหรับ document data
export type DocumentData = 
    | DeliveryNoteData 
    | WarrantyData 
    | InvoiceData 
    | ReceiptData 
    | QuotationData 
    | PurchaseOrderData;

// Union type สำหรับ document documents
export type DocumentDocument = 
    | DeliveryNoteDocument
    | WarrantyDocument
    | InvoiceDocument
    | ReceiptDocument
    | QuotationDocument
    | PurchaseOrderDocument;

// Helper function สำหรับดึงชื่อลูกค้า/ผู้ขายจาก document data
type CustomerNameGetter<T extends DocumentData> = (data: T) => string;
type DateGetter<T extends DocumentData> = (data: T) => Date | null | undefined;

// Configuration สำหรับแต่ละ Document Type
interface DocumentConfig<T extends DocumentData> {
    prefix: string;                                    // Prefix สำหรับ PDF filename (เช่น 'DN', 'IN')
    saveFn: (data: T, companyId?: string) => Promise<string>;  // Function สำหรับ save
    updateFn: (id: string, data: Partial<T>) => Promise<void>; // Function สำหรับ update
    getCustomerName: CustomerNameGetter<T>;           // Function สำหรับดึงชื่อลูกค้า/ผู้ขาย
    getDate: DateGetter<T>;                           // Function สำหรับดึงวันที่
    successMessages: {
        save: string;                                  // Success message เมื่อ save สำเร็จ
        update: string;                               // Success message เมื่อ update สำเร็จ
    };
}

// Document Registry
export const DOCUMENT_REGISTRY = {
    'delivery': {
        prefix: 'DN',
        saveFn: saveDeliveryNote,
        updateFn: updateDeliveryNote,
        getCustomerName: (data: DeliveryNoteData) => data.toCompany || 'Customer',
        getDate: (data: DeliveryNoteData) => data.date,
        successMessages: {
            save: 'บันทึกใบส่งมอบงานสำเร็จ',
            update: 'อัปเดตใบส่งมอบงานสำเร็จ',
        },
    } as DocumentConfig<DeliveryNoteData>,
    
    'warranty': {
        prefix: 'WR',
        saveFn: saveWarrantyCard,
        updateFn: updateWarrantyCard,
        getCustomerName: (data: WarrantyData) => data.customerName || 'Customer',
        getDate: (data: WarrantyData) => data.purchaseDate,
        successMessages: {
            save: 'บันทึกใบรับประกันสำเร็จ',
            update: 'อัปเดตใบรับประกันสำเร็จ',
        },
    } as DocumentConfig<WarrantyData>,
    
    'invoice': {
        prefix: 'IN',
        saveFn: saveInvoice,
        updateFn: updateInvoice,
        getCustomerName: (data: InvoiceData) => data.customerName || 'Customer',
        getDate: (data: InvoiceData) => data.invoiceDate,
        successMessages: {
            save: 'บันทึกใบแจ้งหนี้สำเร็จ',
            update: 'อัปเดตใบแจ้งหนี้สำเร็จ',
        },
    } as DocumentConfig<InvoiceData>,
    
    'receipt': {
        prefix: 'RC',
        saveFn: saveReceipt,
        updateFn: updateReceipt,
        getCustomerName: (data: ReceiptData) => data.customerName || 'Customer',
        getDate: (data: ReceiptData) => data.receiptDate,
        successMessages: {
            save: 'บันทึกใบเสร็จสำเร็จ',
            update: 'อัปเดตใบเสร็จสำเร็จ',
        },
    } as DocumentConfig<ReceiptData>,
    
    'quotation': {
        prefix: 'QT',
        saveFn: saveQuotation,
        updateFn: updateQuotation,
        getCustomerName: (data: QuotationData) => data.customerName || 'Customer',
        getDate: (data: QuotationData) => data.quotationDate,
        successMessages: {
            save: 'บันทึกใบเสนอราคาสำเร็จ',
            update: 'อัปเดตใบเสนอราคาสำเร็จ',
        },
    } as DocumentConfig<QuotationData>,
    
    'purchase-order': {
        prefix: 'PO',
        saveFn: savePurchaseOrder,
        updateFn: updatePurchaseOrder,
        getCustomerName: (data: PurchaseOrderData) => data.supplierName || 'Supplier',
        getDate: (data: PurchaseOrderData) => data.purchaseOrderDate,
        successMessages: {
            save: 'บันทึกใบสั่งซื้อสำเร็จ',
            update: 'อัปเดตใบสั่งซื้อสำเร็จ',
        },
    } as DocumentConfig<PurchaseOrderData>,
} as const;

/**
 * Helper function สำหรับ generate PDF filename
 */
export const generatePdfFilename = <T extends DocumentData>(
    type: DocType,
    data: T
): string => {
    const config = DOCUMENT_REGISTRY[type];
    
    // สร้าง UUID
    const generateUUID = (): string => {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    };

    // ทำความสะอาดชื่อลูกค้า
    const cleanCustomerName = (name: string): string => {
        return name
            .replace(/[^a-zA-Z0-9ก-๙]/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '')
            .substring(0, 50)
            || (type === 'purchase-order' ? 'Supplier' : 'Customer');
    };

    // แปลงวันที่เป็น YYMMDD
    const formatDateToYYMMDD = (date: Date | null | undefined): string => {
        if (!date) {
            const now = new Date();
            const yy = String(now.getFullYear()).slice(-2);
            const mm = String(now.getMonth() + 1).padStart(2, '0');
            const dd = String(now.getDate()).padStart(2, '0');
            return `${yy}${mm}${dd}`;
        }
        const d = date instanceof Date ? date : new Date(date);
        const yy = String(d.getFullYear()).slice(-2);
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yy}${mm}${dd}`;
    };

    const customerName = cleanCustomerName(config.getCustomerName(data));
    const dateStr = formatDateToYYMMDD(config.getDate(data));
    const uuid = generateUUID().substring(0, 8);

    return `${config.prefix}_${customerName}_${dateStr}_${uuid}.pdf`;
};

/**
 * Helper function สำหรับ save หรือ update document
 */
export const saveOrUpdateDocument = async <T extends DocumentData>(
    type: DocType,
    data: T,
    documentId: string | null,
    companyId?: string
): Promise<{ id: string; message: string }> => {
    const config = DOCUMENT_REGISTRY[type];
    const isEditMode = !!documentId;

    if (isEditMode) {
        await config.updateFn(documentId, data);
        return {
            id: documentId,
            message: config.successMessages.update,
        };
    } else {
        const id = await config.saveFn(data, companyId);
        return {
            id,
            message: `${config.successMessages.save} (ID: ${id})`,
        };
    }
};

