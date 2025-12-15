// Document Registry - Configuration สำหรับแต่ละ Document Type
// ลด code duplication โดยใช้ Registry Pattern

import { 
    DeliveryNoteData, 
    WarrantyData, 
    InvoiceData, 
    ReceiptData, 
    TaxInvoiceData,
    QuotationData, 
    PurchaseOrderData,
    MemoData,
    VariationOrderData,
    SubcontractData
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
    saveTaxInvoice,
    updateTaxInvoice,
    saveQuotation,
    updateQuotation,
    savePurchaseOrder,
    updatePurchaseOrder,
    saveMemo,
    updateMemo,
    saveVariationOrder,
    updateVariationOrder,
    saveSubcontract,
    updateSubcontract,
} from '../services/firestore';
import type {
    DeliveryNoteDocument,
    WarrantyDocument,
    InvoiceDocument,
    ReceiptDocument,
    TaxInvoiceDocument,
    QuotationDocument,
    PurchaseOrderDocument,
    MemoDocument,
    VariationOrderDocument,
    SubcontractDocument,
} from '../services/firestore';

export type DocType = 'delivery' | 'warranty' | 'invoice' | 'receipt' | 'tax-invoice' | 'quotation' | 'purchase-order' | 'memo' | 'variation-order' | 'subcontract';

// Union type สำหรับ document data
export type DocumentData = 
    | DeliveryNoteData 
    | WarrantyData 
    | InvoiceData 
    | ReceiptData 
    | TaxInvoiceData
    | QuotationData 
    | PurchaseOrderData
    | MemoData
    | VariationOrderData
    | SubcontractData;

// Union type สำหรับ document documents
export type DocumentDocument = 
    | DeliveryNoteDocument
    | WarrantyDocument
    | InvoiceDocument
    | ReceiptDocument
    | TaxInvoiceDocument
    | QuotationDocument
    | PurchaseOrderDocument
    | MemoDocument
    | VariationOrderDocument
    | SubcontractDocument;

// Helper function สำหรับดึงชื่อลูกค้า/ผู้ขายจาก document data
type CustomerNameGetter<T extends DocumentData> = (data: T) => string;
type DateGetter<T extends DocumentData> = (data: T) => Date | null | undefined;
type ProjectNameGetter<T extends DocumentData> = (data: T) => string;
type CompanyNameGetter<T extends DocumentData> = (data: T) => string;

// Configuration สำหรับแต่ละ Document Type
interface DocumentConfig<T extends DocumentData> {
    prefix: string;                                    // Prefix สำหรับ PDF filename (เช่น 'DN', 'IN')
    saveFn: (data: T, companyId?: string) => Promise<string>;  // Function สำหรับ save
    updateFn: (id: string, data: Partial<T>) => Promise<void>; // Function สำหรับ update
    getCustomerName: CustomerNameGetter<T>;           // Function สำหรับดึงชื่อลูกค้า/ผู้ขาย
    getProjectName: ProjectNameGetter<T>;             // Function สำหรับดึงชื่อโครงการ
    getCompanyName: CompanyNameGetter<T>;             // Function สำหรับดึงชื่อองค์กร/บริษัท
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
        getCustomerName: (data: DeliveryNoteData) => data.toCompany || '',
        getProjectName: (data: DeliveryNoteData) => data.projectName || '',
        getCompanyName: (data: DeliveryNoteData) => data.fromCompany || '',
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
        getCustomerName: (data: WarrantyData) => data.customerName || '',
        getProjectName: (data: WarrantyData) => data.projectName || '',
        getCompanyName: (data: WarrantyData) => data.companyName || '',
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
        getCustomerName: (data: InvoiceData) => data.customerName || '',
        getProjectName: (data: InvoiceData) => data.projectName || '',
        getCompanyName: (data: InvoiceData) => data.companyName || '',
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
        getCustomerName: (data: ReceiptData) => data.customerName || '',
        getProjectName: (data: ReceiptData) => data.projectName || '',
        getCompanyName: (data: ReceiptData) => data.companyName || '',
        getDate: (data: ReceiptData) => data.receiptDate,
        successMessages: {
            save: 'บันทึกใบเสร็จสำเร็จ',
            update: 'อัปเดตใบเสร็จสำเร็จ',
        },
    } as DocumentConfig<ReceiptData>,
    
    'tax-invoice': {
        prefix: 'TI',
        saveFn: saveTaxInvoice,
        updateFn: updateTaxInvoice,
        getCustomerName: (data: TaxInvoiceData) => data.customerName || '',
        getProjectName: (data: TaxInvoiceData) => data.projectName || '',
        getCompanyName: (data: TaxInvoiceData) => data.companyName || '',
        getDate: (data: TaxInvoiceData) => data.taxInvoiceDate,
        successMessages: {
            save: 'บันทึกใบกำกับภาษีสำเร็จ',
            update: 'อัปเดตใบกำกับภาษีสำเร็จ',
        },
    } as DocumentConfig<TaxInvoiceData>,
    
    'quotation': {
        prefix: 'QT',
        saveFn: saveQuotation,
        updateFn: updateQuotation,
        getCustomerName: (data: QuotationData) => data.customerName || '',
        getProjectName: (data: QuotationData) => data.projectName || '',
        getCompanyName: (data: QuotationData) => data.companyName || '',
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
        getCustomerName: (data: PurchaseOrderData) => data.supplierName || '',
        getProjectName: (data: PurchaseOrderData) => data.projectName || '',
        getCompanyName: (data: PurchaseOrderData) => data.companyName || '',
        getDate: (data: PurchaseOrderData) => data.purchaseOrderDate,
        successMessages: {
            save: 'บันทึกใบสั่งซื้อสำเร็จ',
            update: 'อัปเดตใบสั่งซื้อสำเร็จ',
        },
    } as DocumentConfig<PurchaseOrderData>,
    
    'memo': {
        prefix: 'MEMO',
        saveFn: saveMemo,
        updateFn: updateMemo,
        getCustomerName: (data: MemoData) => data.toName || '',
        getProjectName: (data: MemoData) => data.projectName || '',
        getCompanyName: (data: MemoData) => data.fromName || '',
        getDate: (data: MemoData) => data.date,
        successMessages: {
            save: 'บันทึกใบบันทึกสำเร็จ',
            update: 'อัปเดตใบบันทึกสำเร็จ',
        },
    } as DocumentConfig<MemoData>,
    
    'variation-order': {
        prefix: 'VO',
        saveFn: saveVariationOrder,
        updateFn: updateVariationOrder,
        getCustomerName: (data: VariationOrderData) => data.customerName || '',
        getProjectName: (data: VariationOrderData) => data.projectName || '',
        getCompanyName: (data: VariationOrderData) => data.companyName || '',
        getDate: (data: VariationOrderData) => data.date,
        successMessages: {
            save: 'บันทึกใบส่วนต่างสำเร็จ',
            update: 'อัปเดตใบส่วนต่างสำเร็จ',
        },
    } as DocumentConfig<VariationOrderData>,
    
    'subcontract': {
        prefix: 'SC',
        saveFn: saveSubcontract,
        updateFn: updateSubcontract,
        getCustomerName: (data: SubcontractData) => data.contractorName || '',
        getProjectName: (data: SubcontractData) => data.projectName || '',
        getCompanyName: (data: SubcontractData) => data.companyName || '',
        getDate: (data: SubcontractData) => data.contractDate,
        successMessages: {
            save: 'บันทึกสัญญาจ้างเหมาช่วงสำเร็จ',
            update: 'อัปเดตสัญญาจ้างเหมาช่วงสำเร็จ',
        },
    } as DocumentConfig<SubcontractData>,
} as const;

/**
 * Helper function สำหรับ generate PDF filename
 * รูปแบบ: PREFIX_ลูกค้า_โครงการ_องค์กร_YYMMDD_UUID.pdf
 * ถ้าข้อมูลใดไม่มี จะข้ามไป (ไม่แสดงส่วนนั้น)
 */
export const generatePdfFilename = (
    type: DocType,
    data: DocumentData
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

    // ทำความสะอาดชื่อ (ลบอักขระพิเศษ, จำกัดความยาว)
    const cleanName = (name: string, maxLength: number = 30): string => {
        if (!name || name.trim() === '') return '';
        return name
            .replace(/[^a-zA-Z0-9ก-๙\s]/g, '') // ลบอักขระพิเศษ (เก็บช่องว่าง)
            .replace(/\s+/g, '_')               // แปลงช่องว่างเป็น _
            .replace(/_+/g, '_')                // ลด _ ซ้ำ
            .replace(/^_|_$/g, '')              // ลบ _ หน้า/หลัง
            .substring(0, maxLength)
            .replace(/_$/g, '');                // ลบ _ ท้ายหลังตัด
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

    // ดึงข้อมูลจาก config (ใช้ type assertion เพราะ TypeScript ไม่สามารถ infer ได้)
    const customerName = cleanName((config.getCustomerName as (data: unknown) => string)(data), 25);
    const projectName = cleanName((config.getProjectName as (data: unknown) => string)(data), 25);
    const companyName = cleanName((config.getCompanyName as (data: unknown) => string)(data), 20);
    const dateStr = formatDateToYYMMDD((config.getDate as (data: unknown) => Date | null | undefined)(data));
    const uuid = generateUUID().substring(0, 8);

    // สร้างชื่อไฟล์โดยรวมเฉพาะส่วนที่มีข้อมูล
    // รูปแบบ: PREFIX_ลูกค้า_โครงการ_องค์กร_YYMMDD_UUID.pdf
    const parts: string[] = [config.prefix];
    
    // เพิ่มชื่อลูกค้า (หรือ Supplier/Contractor ตาม type)
    if (customerName) {
        parts.push(customerName);
    }
    
    // เพิ่มชื่อโครงการ
    if (projectName) {
        parts.push(projectName);
    }
    
    // เพิ่มชื่อองค์กร/บริษัท
    if (companyName) {
        parts.push(companyName);
    }
    
    // ถ้าไม่มีข้อมูลใดๆ เลย ให้ใส่ค่า default
    if (parts.length === 1) {
        parts.push(type === 'purchase-order' ? 'Supplier' : 'Document');
    }
    
    // เพิ่มวันที่และ UUID
    parts.push(dateStr);
    parts.push(uuid);

    return `${parts.join('_')}.pdf`;
};

/**
 * Helper function สำหรับ save หรือ update document
 */
export const saveOrUpdateDocument = async (
    type: DocType,
    data: DocumentData,
    documentId: string | null,
    companyId?: string
): Promise<{ id: string; message: string }> => {
    const config = DOCUMENT_REGISTRY[type];
    const isEditMode = !!documentId;

    if (isEditMode) {
        // ใช้ type assertion เพราะ TypeScript ไม่สามารถ infer ได้ว่า data ตรงกับ config
        await (config.updateFn as (id: string, data: unknown) => Promise<void>)(documentId, data);
        return {
            id: documentId,
            message: config.successMessages.update,
        };
    } else {
        // ใช้ type assertion เพราะ TypeScript ไม่สามารถ infer ได้ว่า data ตรงกับ config
        const id = await (config.saveFn as (data: unknown, companyId?: string) => Promise<string>)(data, companyId);
        return {
            id,
            message: `${config.successMessages.save} (ID: ${id})`,
        };
    }
};

