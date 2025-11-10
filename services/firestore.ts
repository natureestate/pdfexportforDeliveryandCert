// Firestore Service - บริการสำหรับจัดการข้อมูลใน Firestore
// ไฟล์นี้รวมฟังก์ชันสำหรับ CRUD operations กับ Firestore
// Refactored: ใช้ Generic Document Service เพื่อลด code duplication

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
    limit,
    Timestamp,
    QueryConstraint
} from "firebase/firestore";
import { db, auth } from "../firebase.config";
import { DeliveryNoteData, WarrantyData, InvoiceData, ReceiptData, QuotationData, PurchaseOrderData, TaxInvoiceData } from "../types";
import { createDocumentService, createIdGenerator, FirestoreDocument } from "./documentService";

// Collection names
const DELIVERY_NOTES_COLLECTION = "deliveryNotes";
const WARRANTY_CARDS_COLLECTION = "warrantyCards";
const INVOICES_COLLECTION = "invoices";
const RECEIPTS_COLLECTION = "receipts";
const TAX_INVOICES_COLLECTION = "taxInvoices";
const QUOTATIONS_COLLECTION = "quotations";
const PURCHASE_ORDERS_COLLECTION = "purchaseOrders";

// Re-export FirestoreDocument interface from documentService
export type { FirestoreDocument };

// ==================== Document Services (ใช้ Generic Service) ====================

// Delivery Notes Service
const deliveryNoteService = createDocumentService<DeliveryNoteData>({
    collection: DELIVERY_NOTES_COLLECTION,
    prefix: 'DN',
    documentNumberField: 'docNumber',
    generateId: createIdGenerator('DN'),
    dateFields: ['date'],
    errorMessages: {
        save: 'ไม่สามารถบันทึกใบส่งมอบงานได้',
        get: 'ไม่สามารถดึงข้อมูลใบส่งมอบงานได้',
        getAll: 'ไม่สามารถดึงรายการใบส่งมอบงานได้',
        update: 'ไม่สามารถอัปเดตใบส่งมอบงานได้',
        delete: 'ไม่สามารถลบใบส่งมอบงานได้',
        search: 'ไม่สามารถค้นหาใบส่งมอบงานได้',
    },
});

// Warranty Cards Service (ใช้ houseModel แทน document number สำหรับ ID generation)
const generateWarrantyCardId = (houseModel: string): string => {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const cleanHouseModel = houseModel.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
    return `${yy}${mm}${dd}_WR-${cleanHouseModel}`;
};

const warrantyCardService = createDocumentService<WarrantyData>({
    collection: WARRANTY_CARDS_COLLECTION,
    prefix: 'WR',
    documentNumberField: 'warrantyNumber',
    generateId: (warrantyNumber: string) => {
        // สำหรับ warranty card ใช้ houseModel แทน warrantyNumber ถ้ามี
        // แต่เนื่องจาก generic service ต้องการ documentNumberField เราจะใช้ warrantyNumber
        // และ override ใน save function ถ้าจำเป็น
        return createIdGenerator('WR')(warrantyNumber);
    },
    dateFields: ['purchaseDate', 'warrantyEndDate', 'issueDate'],
    errorMessages: {
        save: 'ไม่สามารถบันทึกใบรับประกันสินค้าได้',
        get: 'ไม่สามารถดึงข้อมูลใบรับประกันสินค้าได้',
        getAll: 'ไม่สามารถดึงรายการใบรับประกันสินค้าได้',
        update: 'ไม่สามารถอัปเดตใบรับประกันสินค้าได้',
        delete: 'ไม่สามารถลบใบรับประกันสินค้าได้',
        search: 'ไม่สามารถค้นหาใบรับประกันสินค้าได้',
    },
});

// Invoice Service
const invoiceService = createDocumentService<InvoiceData>({
    collection: INVOICES_COLLECTION,
    prefix: 'IN',
    documentNumberField: 'invoiceNumber',
    generateId: createIdGenerator('IN'),
    dateFields: ['invoiceDate', 'dueDate'],
    errorMessages: {
        save: 'ไม่สามารถบันทึกใบแจ้งหนี้ได้',
        get: 'ไม่สามารถดึงข้อมูลใบแจ้งหนี้ได้',
        getAll: 'ไม่สามารถดึงรายการใบแจ้งหนี้ได้',
        update: 'ไม่สามารถอัปเดตใบแจ้งหนี้ได้',
        delete: 'ไม่สามารถลบใบแจ้งหนี้ได้',
        search: 'ไม่สามารถค้นหาใบแจ้งหนี้ได้',
    },
});

// Receipt Service
const receiptService = createDocumentService<ReceiptData>({
    collection: RECEIPTS_COLLECTION,
    prefix: 'RC',
    documentNumberField: 'receiptNumber',
    generateId: createIdGenerator('RC'),
    dateFields: ['receiptDate'],
    errorMessages: {
        save: 'ไม่สามารถบันทึกใบเสร็จได้',
        get: 'ไม่สามารถดึงข้อมูลใบเสร็จได้',
        getAll: 'ไม่สามารถดึงรายการใบเสร็จได้',
        update: 'ไม่สามารถอัปเดตใบเสร็จได้',
        delete: 'ไม่สามารถลบใบเสร็จได้',
        search: 'ไม่สามารถค้นหาใบเสร็จได้',
    },
});

// Tax Invoice Service
const taxInvoiceService = createDocumentService<TaxInvoiceData>({
    collection: TAX_INVOICES_COLLECTION,
    prefix: 'TI',
    documentNumberField: 'taxInvoiceNumber',
    generateId: createIdGenerator('TI'),
    dateFields: ['taxInvoiceDate'],
    errorMessages: {
        save: 'ไม่สามารถบันทึกใบกำกับภาษีได้',
        get: 'ไม่สามารถดึงข้อมูลใบกำกับภาษีได้',
        getAll: 'ไม่สามารถดึงรายการใบกำกับภาษีได้',
        update: 'ไม่สามารถอัปเดตใบกำกับภาษีได้',
        delete: 'ไม่สามารถลบใบกำกับภาษีได้',
        search: 'ไม่สามารถค้นหาใบกำกับภาษีได้',
    },
});

// Quotation Service
const quotationService = createDocumentService<QuotationData>({
    collection: QUOTATIONS_COLLECTION,
    prefix: 'QT',
    documentNumberField: 'quotationNumber',
    generateId: createIdGenerator('QT'),
    dateFields: ['quotationDate', 'validUntilDate'],
    errorMessages: {
        save: 'ไม่สามารถบันทึกใบเสนอราคาได้',
        get: 'ไม่สามารถดึงข้อมูลใบเสนอราคาได้',
        getAll: 'ไม่สามารถดึงรายการใบเสนอราคาได้',
        update: 'ไม่สามารถอัปเดตใบเสนอราคาได้',
        delete: 'ไม่สามารถลบใบเสนอราคาได้',
        search: 'ไม่สามารถค้นหาใบเสนอราคาได้',
    },
});

// Purchase Order Service
const purchaseOrderService = createDocumentService<PurchaseOrderData>({
    collection: PURCHASE_ORDERS_COLLECTION,
    prefix: 'PO',
    documentNumberField: 'purchaseOrderNumber',
    generateId: createIdGenerator('PO'),
    dateFields: ['purchaseOrderDate', 'expectedDeliveryDate'],
    errorMessages: {
        save: 'ไม่สามารถบันทึกใบสั่งซื้อได้',
        get: 'ไม่สามารถดึงข้อมูลใบสั่งซื้อได้',
        getAll: 'ไม่สามารถดึงรายการใบสั่งซื้อได้',
        update: 'ไม่สามารถอัปเดตใบสั่งซื้อได้',
        delete: 'ไม่สามารถลบใบสั่งซื้อได้',
        search: 'ไม่สามารถค้นหาใบสั่งซื้อได้',
    },
});

export interface DeliveryNoteDocument extends DeliveryNoteData, FirestoreDocument {}
export interface WarrantyDocument extends WarrantyData, FirestoreDocument {}
export interface InvoiceDocument extends InvoiceData, FirestoreDocument {}
export interface ReceiptDocument extends ReceiptData, FirestoreDocument {}
export interface TaxInvoiceDocument extends TaxInvoiceData, FirestoreDocument {}
export interface QuotationDocument extends QuotationData, FirestoreDocument {}
export interface PurchaseOrderDocument extends PurchaseOrderData, FirestoreDocument {}

// ==================== Delivery Notes Functions ====================
// Refactored: ใช้ Generic Document Service

/**
 * บันทึกใบส่งมอบงานใหม่ลง Firestore
 * @param data - ข้อมูลใบส่งมอบงาน
 * @param companyId - ID ของบริษัท (optional)
 */
export const saveDeliveryNote = async (data: DeliveryNoteData, companyId?: string): Promise<string> => {
    return deliveryNoteService.save(data, companyId);
};

/**
 * ดึงข้อมูลใบส่งมอบงานตาม ID
 */
export const getDeliveryNote = async (id: string): Promise<DeliveryNoteDocument | null> => {
    return deliveryNoteService.get(id) as Promise<DeliveryNoteDocument | null>;
};

/**
 * ดึงรายการใบส่งมอบงานทั้งหมด (มีการ limit) - เฉพาะของ user และ company ที่เลือก
 * @param limitCount - จำนวนเอกสารที่ต้องการดึง
 * @param companyId - ID ของบริษัท (optional) ถ้าไม่ระบุจะดึงทั้งหมด
 */
export const getDeliveryNotes = async (limitCount: number = 50, companyId?: string): Promise<DeliveryNoteDocument[]> => {
    return deliveryNoteService.getAll(limitCount, companyId) as Promise<DeliveryNoteDocument[]>;
};

/**
 * อัปเดตใบส่งมอบงาน
 * @param id - Document ID ของเอกสารที่ต้องการอัปเดต
 * @param data - ข้อมูลที่ต้องการอัปเดต
 */
export const updateDeliveryNote = async (id: string, data: Partial<DeliveryNoteData>): Promise<void> => {
    return deliveryNoteService.update(id, data);
};

/**
 * ลบใบส่งมอบงาน (Soft Delete) - ตั้งค่า isDeleted = true แทนการลบจริง
 * @param id - Document ID ของเอกสารที่ต้องการลบ
 */
export const deleteDeliveryNote = async (id: string): Promise<void> => {
    return deliveryNoteService.delete(id);
};

/**
 * ค้นหาใบส่งมอบงานตามเลขที่เอกสาร
 * @param docNumber - เลขที่เอกสารที่ต้องการค้นหา
 * @param companyId - ID ของบริษัท (optional) ถ้าไม่ระบุจะค้นหาทั้งหมดของ user
 */
export const searchDeliveryNoteByDocNumber = async (docNumber: string, companyId?: string): Promise<DeliveryNoteDocument[]> => {
    return deliveryNoteService.searchByDocumentNumber(docNumber, companyId) as Promise<DeliveryNoteDocument[]>;
};

// ==================== Warranty Cards Functions ====================
// Refactored: ใช้ Generic Document Service (แต่ต้อง override save เพื่อใช้ houseModel สำหรับ ID)

/**
 * บันทึกใบรับประกันสินค้าใหม่ลง Firestore
 * @param data - ข้อมูลใบรับประกัน
 * @param companyId - ID ของบริษัท (optional)
 */
export const saveWarrantyCard = async (data: WarrantyData, companyId?: string): Promise<string> => {
    // Warranty Card ใช้ houseModel แทน warrantyNumber สำหรับ generate ID
    // Override save function เพื่อใช้ houseModel
    try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error("กรุณา Login ก่อนบันทึกข้อมูล");
        }
        
        const docId = generateWarrantyCardId(data.houseModel || data.warrantyNumber || 'WR');
        const docRef = doc(db, WARRANTY_CARDS_COLLECTION, docId);
        
        const dataToSave = {
            ...data,
            logo: data.logoUrl ? null : data.logo,
            userId: currentUser.uid,
            companyId: companyId || null,
            isDeleted: false,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        };
        
        await setDoc(docRef, dataToSave);
        return docId;
    } catch (error) {
        console.error("Error saving warranty card:", error);
        throw new Error("ไม่สามารถบันทึกใบรับประกันสินค้าได้");
    }
};

/**
 * ดึงข้อมูลใบรับประกันสินค้าตาม ID
 */
export const getWarrantyCard = async (id: string): Promise<WarrantyDocument | null> => {
    return warrantyCardService.get(id) as Promise<WarrantyDocument | null>;
};

/**
 * ดึงรายการใบรับประกันสินค้าทั้งหมด (มีการ limit) - เฉพาะของ user และ company ที่เลือก
 * @param limitCount - จำนวนเอกสารที่ต้องการดึง
 * @param companyId - ID ของบริษัท (optional) ถ้าไม่ระบุจะดึงทั้งหมด
 */
export const getWarrantyCards = async (limitCount: number = 50, companyId?: string): Promise<WarrantyDocument[]> => {
    return warrantyCardService.getAll(limitCount, companyId) as Promise<WarrantyDocument[]>;
};

/**
 * อัปเดตใบรับประกันสินค้า
 * @param id - Document ID ของเอกสารที่ต้องการอัปเดต
 * @param data - ข้อมูลที่ต้องการอัปเดต
 */
export const updateWarrantyCard = async (id: string, data: Partial<WarrantyData>): Promise<void> => {
    return warrantyCardService.update(id, data);
};

/**
 * ลบใบรับประกันสินค้า (Soft Delete) - ตั้งค่า isDeleted = true แทนการลบจริง
 * @param id - Document ID ของเอกสารที่ต้องการลบ
 */
export const deleteWarrantyCard = async (id: string): Promise<void> => {
    return warrantyCardService.delete(id);
};

/**
 * ค้นหาใบรับประกันสินค้าตามแบบบ้าน
 * @param houseModel - แบบบ้านที่ต้องการค้นหา
 * @param companyId - ID ของบริษัท (optional) ถ้าไม่ระบุจะค้นหาทั้งหมดของ user
 */
export const searchWarrantyCardByHouseModel = async (houseModel: string, companyId?: string): Promise<WarrantyDocument[]> => {
    try {
        // ตรวจสอบว่า user login แล้วหรือยัง
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error("กรุณา Login ก่อนค้นหาข้อมูล");
        }

        // สร้าง query constraints
        const constraints: QueryConstraint[] = [
            where("houseModel", "==", houseModel),
            where("userId", "==", currentUser.uid), // กรองเฉพาะของ user นี้
            where("isDeleted", "==", false), // กรองเฉพาะเอกสารที่ยังไม่ถูกลบ
        ];

        // ถ้ามี companyId ให้กรองเฉพาะบริษัทนั้น
        if (companyId) {
            constraints.push(where("companyId", "==", companyId));
        }

        const q = query(collection(db, WARRANTY_CARDS_COLLECTION), ...constraints);
        
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs
            .map(doc => {
                const data = doc.data();
                // ตรวจสอบอีกครั้งที่ client-side เพื่อความแน่ใจ
                if (data.isDeleted === true) {
                    return null;
                }
                return {
                    id: doc.id,
                    ...data,
                    purchaseDate: data.purchaseDate?.toDate() || null,
                    warrantyEndDate: data.warrantyEndDate?.toDate() || null,
                    issueDate: data.issueDate?.toDate() || null,
                    createdAt: data.createdAt?.toDate(),
                    updatedAt: data.updatedAt?.toDate(),
                    deletedAt: data.deletedAt?.toDate() || null,
                } as WarrantyDocument;
            })
            .filter((doc): doc is WarrantyDocument => doc !== null && !doc.isDeleted); // กรองเอกสารที่ถูกลบ (soft delete) ออก
    } catch (error) {
        console.error("Error searching warranty card:", error);
        throw new Error("ไม่สามารถค้นหาใบรับประกันสินค้าได้");
    }
};

// Export ชื่อเดิมเพื่อ backward compatibility
export const searchWarrantyCardBySerialNumber = searchWarrantyCardByHouseModel;

// ==================== Invoice Functions ====================

/**
 * บันทึกใบแจ้งหนี้ใหม่ลง Firestore
 * @param data - ข้อมูลใบแจ้งหนี้
 * @param companyId - ID ของบริษัท (optional)
 */
export const saveInvoice = async (data: InvoiceData, companyId?: string): Promise<string> => {
    return invoiceService.save(data, companyId);
};

/**
 * ดึงข้อมูลใบแจ้งหนี้ตาม ID
 */
export const getInvoice = async (id: string): Promise<InvoiceDocument | null> => {
    return invoiceService.get(id) as Promise<InvoiceDocument | null>;
};

/**
 * ดึงรายการใบแจ้งหนี้ทั้งหมด (มีการ limit) - เฉพาะของ user และ company ที่เลือก
 * @param limitCount - จำนวนเอกสารที่ต้องการดึง
 * @param companyId - ID ของบริษัท (optional) ถ้าไม่ระบุจะดึงทั้งหมด
 */
export const getInvoices = async (limitCount: number = 50, companyId?: string): Promise<InvoiceDocument[]> => {
    return invoiceService.getAll(limitCount, companyId) as Promise<InvoiceDocument[]>;
};

/**
 * อัปเดตใบแจ้งหนี้
 * @param id - Document ID ของเอกสารที่ต้องการอัปเดต
 * @param data - ข้อมูลที่ต้องการอัปเดต
 */
export const updateInvoice = async (id: string, data: Partial<InvoiceData>): Promise<void> => {
    return invoiceService.update(id, data);
};

/**
 * ลบใบแจ้งหนี้ (Soft Delete) - ตั้งค่า isDeleted = true แทนการลบจริง
 * @param id - Document ID ของเอกสารที่ต้องการลบ
 */
export const deleteInvoice = async (id: string): Promise<void> => {
    return invoiceService.delete(id);
};

/**
 * ค้นหาใบแจ้งหนี้ตามเลขที่เอกสาร
 * @param invoiceNumber - เลขที่ใบแจ้งหนี้ที่ต้องการค้นหา
 * @param companyId - ID ของบริษัท (optional) ถ้าไม่ระบุจะค้นหาทั้งหมดของ user
 */
export const searchInvoiceByInvoiceNumber = async (invoiceNumber: string, companyId?: string): Promise<InvoiceDocument[]> => {
    return invoiceService.searchByDocumentNumber(invoiceNumber, companyId) as Promise<InvoiceDocument[]>;
};

// ==================== Receipt Functions ====================
// Refactored: ใช้ Generic Document Service

export const saveReceipt = async (data: ReceiptData, companyId?: string): Promise<string> => {
    return receiptService.save(data, companyId);
};

export const getReceipt = async (id: string): Promise<ReceiptDocument | null> => {
    return receiptService.get(id) as Promise<ReceiptDocument | null>;
};

export const getReceipts = async (limitCount: number = 50, companyId?: string): Promise<ReceiptDocument[]> => {
    return receiptService.getAll(limitCount, companyId) as Promise<ReceiptDocument[]>;
};

export const updateReceipt = async (id: string, data: Partial<ReceiptData>): Promise<void> => {
    return receiptService.update(id, data);
};

export const deleteReceipt = async (id: string): Promise<void> => {
    return receiptService.delete(id);
};

export const searchReceiptByReceiptNumber = async (receiptNumber: string, companyId?: string): Promise<ReceiptDocument[]> => {
    return receiptService.searchByDocumentNumber(receiptNumber, companyId) as Promise<ReceiptDocument[]>;
};

// ==================== Tax Invoice Functions ====================
// Refactored: ใช้ Generic Document Service

/**
 * บันทึกใบกำกับภาษีใหม่ลง Firestore
 * @param data - ข้อมูลใบกำกับภาษี
 * @param companyId - ID ของบริษัท (optional)
 */
export const saveTaxInvoice = async (data: TaxInvoiceData, companyId?: string): Promise<string> => {
    return taxInvoiceService.save(data, companyId);
};

/**
 * ดึงข้อมูลใบกำกับภาษีตาม ID
 */
export const getTaxInvoice = async (id: string): Promise<TaxInvoiceDocument | null> => {
    return taxInvoiceService.get(id) as Promise<TaxInvoiceDocument | null>;
};

/**
 * ดึงรายการใบกำกับภาษีทั้งหมด (มีการ limit) - เฉพาะของ user และ company ที่เลือก
 * @param limitCount - จำนวนเอกสารที่ต้องการดึง
 * @param companyId - ID ของบริษัท (optional) ถ้าไม่ระบุจะดึงทั้งหมด
 */
export const getTaxInvoices = async (limitCount: number = 50, companyId?: string): Promise<TaxInvoiceDocument[]> => {
    return taxInvoiceService.getAll(limitCount, companyId) as Promise<TaxInvoiceDocument[]>;
};

/**
 * อัปเดตใบกำกับภาษี
 * @param id - Document ID ของเอกสารที่ต้องการอัปเดต
 * @param data - ข้อมูลที่ต้องการอัปเดต
 */
export const updateTaxInvoice = async (id: string, data: Partial<TaxInvoiceData>): Promise<void> => {
    return taxInvoiceService.update(id, data);
};

/**
 * ลบใบกำกับภาษี (Soft Delete) - ตั้งค่า isDeleted = true แทนการลบจริง
 * @param id - Document ID ของเอกสารที่ต้องการลบ
 */
export const deleteTaxInvoice = async (id: string): Promise<void> => {
    return taxInvoiceService.delete(id);
};

/**
 * ค้นหาใบกำกับภาษีตามเลขที่เอกสาร
 * @param taxInvoiceNumber - เลขที่ใบกำกับภาษีที่ต้องการค้นหา
 * @param companyId - ID ของบริษัท (optional) ถ้าไม่ระบุจะค้นหาทั้งหมดของ user
 */
export const searchTaxInvoiceByTaxInvoiceNumber = async (taxInvoiceNumber: string, companyId?: string): Promise<TaxInvoiceDocument[]> => {
    return taxInvoiceService.searchByDocumentNumber(taxInvoiceNumber, companyId) as Promise<TaxInvoiceDocument[]>;
};

// ==================== Quotations Functions ====================
// Refactored: ใช้ Generic Document Service

export const saveQuotation = async (data: QuotationData, companyId?: string): Promise<string> => {
    return quotationService.save(data, companyId);
};

export const getQuotation = async (id: string): Promise<QuotationDocument | null> => {
    return quotationService.get(id) as Promise<QuotationDocument | null>;
};

export const getQuotations = async (limitCount: number = 50, companyId?: string): Promise<QuotationDocument[]> => {
    return quotationService.getAll(limitCount, companyId) as Promise<QuotationDocument[]>;
};

export const updateQuotation = async (id: string, data: Partial<QuotationData>): Promise<void> => {
    return quotationService.update(id, data);
};

export const deleteQuotation = async (id: string): Promise<void> => {
    return quotationService.delete(id);
};

export const searchQuotationByQuotationNumber = async (quotationNumber: string, companyId?: string): Promise<QuotationDocument[]> => {
    return quotationService.searchByDocumentNumber(quotationNumber, companyId) as Promise<QuotationDocument[]>;
};

// ==================== Purchase Orders Functions ====================
// Refactored: ใช้ Generic Document Service

export const savePurchaseOrder = async (data: PurchaseOrderData, companyId?: string): Promise<string> => {
    return purchaseOrderService.save(data, companyId);
};

export const getPurchaseOrder = async (id: string): Promise<PurchaseOrderDocument | null> => {
    return purchaseOrderService.get(id) as Promise<PurchaseOrderDocument | null>;
};

export const getPurchaseOrders = async (limitCount: number = 50, companyId?: string): Promise<PurchaseOrderDocument[]> => {
    return purchaseOrderService.getAll(limitCount, companyId) as Promise<PurchaseOrderDocument[]>;
};

export const updatePurchaseOrder = async (id: string, data: Partial<PurchaseOrderData>): Promise<void> => {
    return purchaseOrderService.update(id, data);
};

export const deletePurchaseOrder = async (id: string): Promise<void> => {
    return purchaseOrderService.delete(id);
};
