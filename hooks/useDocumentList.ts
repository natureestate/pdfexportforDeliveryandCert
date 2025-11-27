// Generic Document List Hook - สำหรับจัดการ document list state และ operations
// ลด code duplication ใน HistoryList.tsx

import { useState, useCallback, useEffect } from 'react';
import { useCompany } from '../contexts/CompanyContext';
import type { DocType, DocumentDocument, DocumentData } from '../utils/documentRegistry';
import {
    getDeliveryNotes,
    getWarrantyCards,
    getInvoices,
    getReceipts,
    getTaxInvoices,
    getQuotations,
    getPurchaseOrders,
    getMemos,
    getVariationOrders,
    getSubcontracts,
    deleteDeliveryNote,
    deleteWarrantyCard,
    deleteInvoice,
    deleteReceipt,
    deleteTaxInvoice,
    deleteQuotation,
    deletePurchaseOrder,
    deleteMemo,
    deleteVariationOrder,
    deleteSubcontract,
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

// Registry สำหรับ fetch และ delete functions
const FETCH_FUNCTIONS = {
    'delivery': getDeliveryNotes,
    'warranty': getWarrantyCards,
    'invoice': getInvoices,
    'receipt': getReceipts,
    'tax-invoice': getTaxInvoices,
    'quotation': getQuotations,
    'purchase-order': getPurchaseOrders,
    'memo': getMemos,
    'variation-order': getVariationOrders,
    'subcontract': getSubcontracts,
} as const;

const DELETE_FUNCTIONS = {
    'delivery': deleteDeliveryNote,
    'warranty': deleteWarrantyCard,
    'invoice': deleteInvoice,
    'receipt': deleteReceipt,
    'tax-invoice': deleteTaxInvoice,
    'quotation': deleteQuotation,
    'purchase-order': deletePurchaseOrder,
    'memo': deleteMemo,
    'variation-order': deleteVariationOrder,
    'subcontract': deleteSubcontract,
} as const;

// Document type names สำหรับแสดงผล
const DOCUMENT_TYPE_NAMES = {
    'delivery': 'ใบส่งมอบงาน',
    'warranty': 'ใบรับประกันสินค้า',
    'invoice': 'ใบแจ้งหนี้',
    'receipt': 'ใบเสร็จ',
    'tax-invoice': 'ใบกำกับภาษี',
    'quotation': 'ใบเสนอราคา',
    'purchase-order': 'ใบสั่งซื้อ',
    'memo': 'ใบบันทึก',
    'variation-order': 'ใบส่วนต่าง',
    'subcontract': 'สัญญาจ้างเหมาช่วง',
} as const;

interface UseDocumentListOptions {
    docType: DocType;
    limit?: number;
}

interface UseDocumentListReturn<T extends DocumentDocument> {
    documents: T[];
    loading: boolean;
    error: string | null;
    fetchData: (showLoading?: boolean) => Promise<void>;
    handleDelete: (id: string) => Promise<void>;
    documentTypeName: string;
}

/**
 * Generic Hook สำหรับจัดการ document list
 */
export const useDocumentList = <T extends DocumentDocument>(
    options: UseDocumentListOptions
): UseDocumentListReturn<T> => {
    const { docType, limit = 50 } = options;
    const { currentCompany } = useCompany();
    
    const [documents, setDocuments] = useState<T[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch data function
    const fetchData = useCallback(async (showLoading: boolean = true) => {
        if (showLoading) {
            setLoading(true);
        }
        setError(null);

        try {
            const companyId = currentCompany?.id;
            const fetchFn = FETCH_FUNCTIONS[docType];
            const data = await fetchFn(limit, companyId);
            setDocuments(data as T[]);
        } catch (err) {
            console.error(`Error fetching ${docType}:`, err);
            setError('ไม่สามารถโหลดข้อมูลได้');
        } finally {
            if (showLoading) {
                setLoading(false);
            }
        }
    }, [docType, limit, currentCompany]);

    // Delete function
    const handleDelete = useCallback(async (id: string) => {
        try {
            const deleteFn = DELETE_FUNCTIONS[docType];
            await deleteFn(id);
            
            // Update local state
            setDocuments(prev => prev.filter(doc => doc.id !== id));
            
            // Refresh data after a short delay
            await new Promise(resolve => setTimeout(resolve, 500));
            await fetchData(false);
        } catch (err) {
            console.error(`Error deleting ${docType}:`, err);
            throw err;
        }
    }, [docType, fetchData]);

    // Fetch data on mount and when dependencies change
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return {
        documents,
        loading,
        error,
        fetchData,
        handleDelete,
        documentTypeName: DOCUMENT_TYPE_NAMES[docType],
    };
};

