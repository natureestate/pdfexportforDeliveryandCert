import React, { useEffect, useState, useCallback, useRef } from 'react';
import type { DeliveryNoteDocument, WarrantyDocument, InvoiceDocument, ReceiptDocument, QuotationDocument, PurchaseOrderDocument, MemoDocument, VariationOrderDocument, SubcontractDocument, TaxInvoiceDocument } from '../services/firestore';
import { useCompany } from '../contexts/CompanyContext';
import { generatePdf } from '../services/pdfGenerator';
import { generatePdfFilename as generatePdfFilenameFromRegistry, type DocType, type DocumentDocument } from '../utils/documentRegistry';
import { useDocumentList } from '../hooks/useDocumentList';
import { cancelDocument, restoreDocument } from '../services/verification';
import DocumentPreview from './DocumentPreview';
import WarrantyPreview from './WarrantyPreview';
import InvoicePreview from './InvoicePreview';
import ReceiptPreview from './ReceiptPreview';
import QuotationPreview from './QuotationPreview';
import PurchaseOrderPreview from './PurchaseOrderPreview';
import MemoPreview from './MemoPreview';
import VariationOrderPreview from './VariationOrderPreview';
import SubcontractPreview from './SubcontractPreview';
import DocumentActions from './DocumentActions';
import type { DeliveryNoteData, WarrantyData, InvoiceData, ReceiptData, QuotationData, PurchaseOrderData, MemoData, VariationOrderData, SubcontractData } from '../types';

// Type alias สำหรับข้อมูลเอกสารทั้งหมด
type DocumentDataType = DeliveryNoteData | WarrantyData | InvoiceData | ReceiptData | QuotationData | PurchaseOrderData | MemoData | VariationOrderData | SubcontractData;
type AllDocumentDocument = DeliveryNoteDocument | WarrantyDocument | InvoiceDocument | ReceiptDocument | QuotationDocument | PurchaseOrderDocument | MemoDocument | VariationOrderDocument | SubcontractDocument | TaxInvoiceDocument;

interface HistoryListProps {
    activeDocType: DocType;
    onLoadDocument: (doc: DocumentDocument) => void;
}

const HistoryList: React.FC<HistoryListProps> = ({ activeDocType, onLoadDocument }) => {
    const { currentCompany } = useCompany(); // ใช้ CompanyContext
    
    // ใช้ hook สำหรับจัดการ document list
    const {
        documents,
        loading,
        error,
        fetchData,
        handleDelete: handleDeleteDocument,
        documentTypeName,
    } = useDocumentList<DocumentDocument>({
        docType: activeDocType,
        limit: 50,
    });
    
    const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'delivery' | 'warranty' | 'invoice' | 'receipt' | 'quotation' | 'purchase-order' | 'memo', id: string } | null>(null);
    const [downloadingPdfId, setDownloadingPdfId] = useState<string | null>(null); // เก็บ ID ของเอกสารที่กำลัง download
    
    // State สำหรับยกเลิก/กู้คืนเอกสาร
    const [cancelConfirm, setCancelConfirm] = useState<{ id: string; docNumber: string } | null>(null);
    const [cancelReason, setCancelReason] = useState<string>('');
    const [cancellingId, setCancellingId] = useState<string | null>(null);
    const [restoringId, setRestoringId] = useState<string | null>(null);
    const previewRef = useRef<HTMLDivElement>(null); // Ref สำหรับ preview component ที่ซ่อนอยู่
    const [previewData, setPreviewData] = useState<DeliveryNoteData | WarrantyData | InvoiceData | ReceiptData | QuotationData | PurchaseOrderData | MemoData | VariationOrderData | SubcontractData | null>(null); // ข้อมูลสำหรับ preview
    const [showPreviewModal, setShowPreviewModal] = useState(false); // แสดง preview modal หรือไม่
    const [previewDoc, setPreviewDoc] = useState<AllDocumentDocument | null>(null); // เอกสารที่กำลัง preview
    const previewModalRef = useRef<HTMLDivElement>(null); // Ref สำหรับ preview component ใน modal
    
    // State สำหรับ filter และ pagination
    const [searchTerm, setSearchTerm] = useState<string>(''); // คำค้นหาสำหรับ filter
    const [currentPage, setCurrentPage] = useState<number>(1); // หน้าปัจจุบัน
    const itemsPerPage = 10; // จำนวนรายการต่อหน้า

    // Reset หน้าเป็น 1 เมื่อเปลี่ยน search term หรือ doc type
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, activeDocType]);

    // ฟังก์ชันลบเอกสาร - Refactored: ใช้ hook function
    const handleDelete = async (type: DocType, id: string) => {
        try {
            console.log(`🗑️ กำลังลบ ${documentTypeName} ID:`, id);
            await handleDeleteDocument(id);
            console.log(`✅ ลบ${documentTypeName}สำเร็จ`);
            setDeleteConfirm(null);
        } catch (err) {
            console.error('❌ Error deleting document:', err);
            alert('ไม่สามารถลบเอกสารได้: ' + (err instanceof Error ? err.message : 'Unknown error'));
        }
    };

    // ฟังก์ชันยกเลิกเอกสาร (Cancel Document)
    const handleCancelDocument = async () => {
        if (!cancelConfirm) return;
        
        try {
            setCancellingId(cancelConfirm.id);
            const result = await cancelDocument(cancelConfirm.id, activeDocType, cancelReason || undefined);
            
            if (result.success) {
                console.log(`✅ ยกเลิกเอกสาร ${cancelConfirm.docNumber} สำเร็จ`);
                alert(`✅ ยกเลิกเอกสาร ${cancelConfirm.docNumber} สำเร็จ`);
                setCancelConfirm(null);
                setCancelReason('');
                fetchData(); // รีเฟรชรายการ
            } else {
                alert(`❌ ${result.error}`);
            }
        } catch (err) {
            console.error('❌ Error cancelling document:', err);
            alert('ไม่สามารถยกเลิกเอกสารได้: ' + (err instanceof Error ? err.message : 'Unknown error'));
        } finally {
            setCancellingId(null);
        }
    };

    // ฟังก์ชันกู้คืนเอกสาร (Restore Document)
    const handleRestoreDocument = async (docId: string) => {
        try {
            setRestoringId(docId);
            const result = await restoreDocument(docId, activeDocType);
            
            if (result.success) {
                console.log(`✅ กู้คืนเอกสารสำเร็จ`);
                alert('✅ กู้คืนเอกสารสำเร็จ');
                fetchData(); // รีเฟรชรายการ
            } else {
                alert(`❌ ${result.error}`);
            }
        } catch (err) {
            console.error('❌ Error restoring document:', err);
            alert('ไม่สามารถกู้คืนเอกสารได้: ' + (err instanceof Error ? err.message : 'Unknown error'));
        } finally {
            setRestoringId(null);
        }
    };

    // ฟอร์แมตวันที่
    const formatDate = (date: Date | undefined) => {
        if (!date) return 'ไม่ระบุ';
        return new Intl.DateTimeFormat('th-TH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(date);
    };

    // ฟังก์ชันสร้างชื่อไฟล์ PDF - Refactored: ใช้ Document Registry
    const generatePdfFilename = (type: DocType, data: DocumentDataType): string => {
        return generatePdfFilenameFromRegistry(type, data);
    };

    // ฟังก์ชันเปิด preview modal
    const handleShowPreview = useCallback((doc: DocumentDocument) => {
        setPreviewDoc(doc as AllDocumentDocument);
        setPreviewData(doc as DocumentDataType);
        setShowPreviewModal(true);
    }, []);

    // ฟังก์ชันปิด preview modal
    const handleClosePreview = useCallback(() => {
        setShowPreviewModal(false);
        setPreviewDoc(null);
        setPreviewData(null);
    }, []);

    // ฟังก์ชันดาวน์โหลด PDF จาก preview modal
    const handleDownloadPdfFromPreview = useCallback(async () => {
        if (!previewDoc) return;
        
        try {
            setDownloadingPdfId(previewDoc.id || null);
            
            // ตรวจสอบ quota ก่อน export (ถ้ามี)
            if (currentCompany?.id) {
                try {
                    const { getQuota } = await import('../services/quota');
                    const quota = await getQuota(currentCompany.id);
                    
                    // ตรวจสอบว่า Free plan สามารถ export PDF ได้หรือไม่
                    if (!quota.features.exportPDF) {
                        alert('❌ Free plan ไม่สามารถ Export PDF ได้ กรุณาอัพเกรดแผน');
                        setDownloadingPdfId(null);
                        return;
                    }
                } catch (error) {
                    console.error('Failed to check quota:', error);
                    // ถ้าเช็ค quota ไม่ได้ ให้ดำเนินการต่อ (เพื่อไม่ให้ระบบหยุดทำงาน)
                }
            }

            // รอให้ React render preview component ใน modal และ ref พร้อม
            // ใช้ polling เพื่อรอให้ ref พร้อม (รอสูงสุด 2 วินาที)
            let attempts = 0;
            const maxAttempts = 20; // 20 * 100ms = 2 seconds
            while (attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 100));
                if (previewModalRef.current) {
                    break;
                }
                attempts++;
            }
            
            // ตรวจสอบว่า preview element พร้อมแล้ว
            if (!previewModalRef.current) {
                throw new Error('ไม่พบ preview element กรุณาลองใหม่อีกครั้ง');
            }

            // สร้างชื่อไฟล์
            const filename = generatePdfFilename(activeDocType, previewDoc as DocumentDataType);
            
            // สร้าง PDF
            await generatePdf(previewModalRef.current, filename);
            
            console.log('✅ PDF downloaded successfully');
        } catch (error) {
            console.error('❌ Error downloading PDF:', error);
            alert('ไม่สามารถดาวน์โหลด PDF ได้: ' + (error instanceof Error ? error.message : 'Unknown error'));
        } finally {
            setDownloadingPdfId(null);
        }
    }, [activeDocType, currentCompany, previewDoc]);

    // ฟังก์ชันดาวน์โหลด PDF
    const handleDownloadPdf = useCallback(async (doc: DocumentDocument) => {
        try {
            setDownloadingPdfId(doc.id || null);
            
            // ตรวจสอบ quota ก่อน export (ถ้ามี)
            if (currentCompany?.id) {
                try {
                    const { getQuota } = await import('../services/quota');
                    const quota = await getQuota(currentCompany.id);
                    
                    // ตรวจสอบว่า Free plan สามารถ export PDF ได้หรือไม่
                    if (!quota.features.exportPDF) {
                        alert('❌ Free plan ไม่สามารถ Export PDF ได้ กรุณาอัพเกรดแผน');
                        setDownloadingPdfId(null);
                        return;
                    }
                } catch (error) {
                    console.error('Failed to check quota:', error);
                    // ถ้าเช็ค quota ไม่ได้ ให้ดำเนินการต่อ (เพื่อไม่ให้ระบบหยุดทำงาน)
                }
            }

            // ตั้งค่าข้อมูลสำหรับ preview
            setPreviewData(doc as DocumentDataType);
            
            // รอให้ React render preview component และ ref พร้อม
            // ใช้ polling เพื่อรอให้ ref พร้อม (รอสูงสุด 2 วินาที)
            let attempts = 0;
            const maxAttempts = 20; // 20 * 100ms = 2 seconds
            while (attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 100));
                if (previewRef.current) {
                    break;
                }
                attempts++;
            }
            
            // ตรวจสอบว่า preview element พร้อมแล้ว
            if (!previewRef.current) {
                throw new Error('ไม่พบ preview element กรุณาลองใหม่อีกครั้ง');
            }

            // สร้างชื่อไฟล์
            const filename = generatePdfFilename(activeDocType, doc as DocumentDataType);
            
            // สร้าง PDF
            await generatePdf(previewRef.current, filename);
            
            console.log('✅ PDF downloaded successfully');
        } catch (error) {
            console.error('❌ Error downloading PDF:', error);
            alert('ไม่สามารถดาวน์โหลด PDF ได้: ' + (error instanceof Error ? error.message : 'Unknown error'));
        } finally {
            setDownloadingPdfId(null);
            // ล้างข้อมูล preview หลังจาก download เสร็จ (รอสักครู่เพื่อให้ PDF สร้างเสร็จ)
            setTimeout(() => {
                setPreviewData(null);
            }, 500);
        }
    }, [activeDocType, currentCompany, generatePdfFilename]);

    // แสดง Loading
    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
            </div>
        );
    }

    // แสดง Error
    if (error) {
        return (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 text-center">
                <p className="text-red-600 dark:text-red-300">{error}</p>
                <button 
                    onClick={() => fetchData()}
                    className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                    ลองใหม่
                </button>
            </div>
        );
    }

    const currentList = documents;

    // ฟังก์ชัน filter รายการตาม search term
    const filteredList = currentList.filter((item) => {
        if (!searchTerm.trim()) return true;
        
        const searchLower = searchTerm.toLowerCase();
        
        if (activeDocType === 'delivery') {
            const note = item as DeliveryNoteDocument;
            return (
                (note.docNumber || '').toLowerCase().includes(searchLower) ||
                (note.project || '').toLowerCase().includes(searchLower) ||
                (note.fromCompany || '').toLowerCase().includes(searchLower) ||
                (note.toCompany || '').toLowerCase().includes(searchLower) ||
                (note.date ? formatDate(note.date).toLowerCase().includes(searchLower) : false)
            );
        } else if (activeDocType === 'warranty') {
            const card = item as WarrantyDocument;
            return (
                (card.warrantyNumber || '').toLowerCase().includes(searchLower) ||
                (card.serviceName || '').toLowerCase().includes(searchLower) ||
                (card.projectName || '').toLowerCase().includes(searchLower) ||
                (card.customerName || '').toLowerCase().includes(searchLower) ||
                (card.warrantyPeriod || '').toLowerCase().includes(searchLower) ||
                (card.purchaseDate ? formatDate(card.purchaseDate).toLowerCase().includes(searchLower) : false)
            );
        } else if (activeDocType === 'invoice') {
            const invoice = item as InvoiceDocument;
            return (
                (invoice.invoiceNumber || '').toLowerCase().includes(searchLower) ||
                (invoice.customerName || '').toLowerCase().includes(searchLower) ||
                (invoice.companyName || '').toLowerCase().includes(searchLower) ||
                (invoice.total ? invoice.total.toString().includes(searchLower) : false) ||
                (invoice.invoiceDate ? formatDate(invoice.invoiceDate).toLowerCase().includes(searchLower) : false)
            );
        } else if (activeDocType === 'receipt') {
            const receipt = item as ReceiptDocument;
            return (
                (receipt.receiptNumber || '').toLowerCase().includes(searchLower) ||
                (receipt.customerName || '').toLowerCase().includes(searchLower) ||
                (receipt.companyName || '').toLowerCase().includes(searchLower) ||
                (receipt.total ? receipt.total.toString().includes(searchLower) : false) ||
                (receipt.paymentMethod || '').toLowerCase().includes(searchLower) ||
                (receipt.receiptDate ? formatDate(receipt.receiptDate).toLowerCase().includes(searchLower) : false)
            );
        } else if (activeDocType === 'quotation') {
            const quotation = item as QuotationDocument;
            return (
                (quotation.quotationNumber || '').toLowerCase().includes(searchLower) ||
                (quotation.customerName || '').toLowerCase().includes(searchLower) ||
                (quotation.companyName || '').toLowerCase().includes(searchLower) ||
                (quotation.total ? quotation.total.toString().includes(searchLower) : false) ||
                (quotation.quotationDate ? formatDate(quotation.quotationDate).toLowerCase().includes(searchLower) : false)
            );
        } else if (activeDocType === 'purchase-order') {
            const purchaseOrder = item as PurchaseOrderDocument;
            return (
                (purchaseOrder.purchaseOrderNumber || '').toLowerCase().includes(searchLower) ||
                (purchaseOrder.supplierName || '').toLowerCase().includes(searchLower) ||
                (purchaseOrder.companyName || '').toLowerCase().includes(searchLower) ||
                (purchaseOrder.total ? purchaseOrder.total.toString().includes(searchLower) : false) ||
                (purchaseOrder.purchaseOrderDate ? formatDate(purchaseOrder.purchaseOrderDate).toLowerCase().includes(searchLower) : false)
            );
        } else {
            const memo = item as MemoDocument;
            return (
                (memo.memoNumber || '').toLowerCase().includes(searchLower) ||
                (memo.subject || '').toLowerCase().includes(searchLower) ||
                (memo.fromName || '').toLowerCase().includes(searchLower) ||
                (memo.toName || '').toLowerCase().includes(searchLower) ||
                (memo.projectName || '').toLowerCase().includes(searchLower) ||
                (memo.date ? formatDate(memo.date).toLowerCase().includes(searchLower) : false)
            );
        }
    });

    // คำนวณ pagination
    const totalPages = Math.ceil(filteredList.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedList = filteredList.slice(startIndex, endIndex);

    // แสดงเมื่อไม่มีข้อมูล
    if (currentList.length === 0) {
        return (
            <div className="bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg p-8 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">ไม่มีเอกสาร</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    เริ่มต้นโดยการสร้าง{documentTypeName}ใหม่
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Hidden Preview Component สำหรับสร้าง PDF */}
            <div className="fixed -left-[9999px] -top-[9999px] opacity-0 pointer-events-none">
                {previewData && !showPreviewModal && (
                    <>
                        {activeDocType === 'delivery' && (
                            <DocumentPreview ref={previewRef} data={previewData as DeliveryNoteData} />
                        )}
                        {activeDocType === 'warranty' && (
                            <WarrantyPreview ref={previewRef} data={previewData as WarrantyData} />
                        )}
                        {activeDocType === 'invoice' && (
                            <InvoicePreview ref={previewRef} data={previewData as InvoiceData} />
                        )}
                        {activeDocType === 'receipt' && (
                            <ReceiptPreview ref={previewRef} data={previewData as ReceiptData} />
                        )}
                        {activeDocType === 'quotation' && (
                            <QuotationPreview ref={previewRef} data={previewData as QuotationData} />
                        )}
                        {activeDocType === 'purchase-order' && (
                            <PurchaseOrderPreview ref={previewRef} data={previewData as PurchaseOrderData} />
                        )}
                        {activeDocType === 'memo' && (
                            <MemoPreview ref={previewRef} data={previewData as MemoData} />
                        )}
                    </>
                )}
            </div>

            {/* Modal Preview เอกสาร */}
            {showPreviewModal && previewData && previewDoc && (
                <div className="fixed inset-0 bg-gray-900 bg-opacity-75 dark:bg-black dark:bg-opacity-80 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
                    <div className="relative bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
                        {/* Header */}
                        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-slate-700">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                                ตัวอย่าง{documentTypeName}
                            </h2>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleDownloadPdfFromPreview}
                                    disabled={downloadingPdfId === previewDoc.id}
                                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {downloadingPdfId === previewDoc.id ? (
                                        <>
                                            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            กำลังสร้าง PDF...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            ดาวน์โหลด PDF
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={handleClosePreview}
                                    className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                                    title="ปิด"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                        
                        {/* Preview Content */}
                        <div className="flex-1 overflow-auto p-4 bg-gray-50">
                            <div className="flex justify-center">
                                {activeDocType === 'delivery' ? (
                                    <DocumentPreview ref={previewModalRef} data={previewData as DeliveryNoteData} />
                                ) : activeDocType === 'warranty' ? (
                                    <WarrantyPreview ref={previewModalRef} data={previewData as WarrantyData} />
                                ) : activeDocType === 'invoice' ? (
                                    <InvoicePreview ref={previewModalRef} data={previewData as InvoiceData} />
                                ) : activeDocType === 'receipt' ? (
                                    <ReceiptPreview ref={previewModalRef} data={previewData as ReceiptData} />
                                ) : activeDocType === 'quotation' ? (
                                    <QuotationPreview ref={previewModalRef} data={previewData as QuotationData} />
                                ) : activeDocType === 'purchase-order' ? (
                                    <PurchaseOrderPreview ref={previewModalRef} data={previewData as PurchaseOrderData} />
                                ) : (
                                    <MemoPreview ref={previewModalRef} data={previewData as MemoData} />
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal ยืนยันการลบ */}
            {deleteConfirm && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 dark:bg-black dark:bg-opacity-60 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
                    <div className="relative mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-slate-800 dark:border-slate-700">
                        <div className="mt-3 text-center">
                            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30">
                                <svg className="h-6 w-6 text-red-600 dark:text-red-400" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100 mt-2">ยืนยันการลบ</h3>
                            <div className="mt-2 px-7 py-3">
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    คุณแน่ใจหรือไม่ว่าต้องการลบเอกสารนี้? การกระทำนี้ไม่สามารถย้อนกลับได้
                                </p>
                            </div>
                            <div className="items-center px-4 py-3 space-x-2">
                                <button
                                    onClick={() => handleDelete(deleteConfirm.type, deleteConfirm.id)}
                                    className="px-4 py-2 bg-red-500 text-white text-base font-medium rounded-md w-auto shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                >
                                    ลบ
                                </button>
                                <button
                                    onClick={() => setDeleteConfirm(null)}
                                    className="px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-gray-200 text-base font-medium rounded-md w-auto shadow-sm hover:bg-gray-300 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                                >
                                    ยกเลิก
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal ยืนยันการยกเลิกเอกสาร (Cancel Document) */}
            {cancelConfirm && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 dark:bg-black dark:bg-opacity-60 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
                    <div className="relative mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-slate-800 dark:border-slate-700">
                        <div className="mt-3 text-center">
                            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-orange-100 dark:bg-orange-900/30">
                                <svg className="h-6 w-6 text-orange-600 dark:text-orange-400" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                </svg>
                            </div>
                            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100 mt-2">ยืนยันการยกเลิกเอกสาร</h3>
                            <div className="mt-2 px-4 py-3">
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                                    คุณต้องการยกเลิกเอกสารเลขที่ <strong className="text-gray-700 dark:text-gray-200">{cancelConfirm.docNumber}</strong> หรือไม่?
                                </p>
                                <p className="text-xs text-orange-600 dark:text-orange-400 mb-3">
                                    ⚠️ เอกสารที่ถูกยกเลิกจะแสดงสถานะ "ยกเลิก" เมื่อสแกน QR Code
                                </p>
                                <div className="text-left">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                                        เหตุผลในการยกเลิก (ไม่บังคับ):
                                    </label>
                                    <textarea
                                        value={cancelReason}
                                        onChange={(e) => setCancelReason(e.target.value)}
                                        placeholder="ระบุเหตุผล เช่น ข้อมูลผิดพลาด, ออกเอกสารใหม่แทน"
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-slate-700 text-gray-800 dark:text-gray-100"
                                        rows={2}
                                    />
                                </div>
                            </div>
                            <div className="items-center px-4 py-3 space-x-2">
                                <button
                                    onClick={handleCancelDocument}
                                    disabled={cancellingId === cancelConfirm.id}
                                    className="px-4 py-2 bg-orange-500 text-white text-base font-medium rounded-md w-auto shadow-sm hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {cancellingId === cancelConfirm.id ? 'กำลังยกเลิก...' : 'ยืนยันยกเลิก'}
                                </button>
                                <button
                                    onClick={() => {
                                        setCancelConfirm(null);
                                        setCancelReason('');
                                    }}
                                    disabled={cancellingId === cancelConfirm.id}
                                    className="px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-gray-200 text-base font-medium rounded-md w-auto shadow-sm hover:bg-gray-300 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
                                >
                                    ปิด
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-4">
                <h2 className="text-lg sm:text-xl font-semibold text-slate-700 dark:text-slate-200">
                    ประวัติ{documentTypeName}
                </h2>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    {/* Search/Filter Input */}
                    <div className="flex-1 sm:flex-none relative">
                        <input
                            type="text"
                            placeholder={`ค้นหา${activeDocType === 'delivery' ? 'เลขที่, โครงการ, จาก, ถึง' : activeDocType === 'warranty' ? 'หมายเลข, สินค้า, ลูกค้า' : activeDocType === 'invoice' ? 'เลขที่, ลูกค้า, ยอดรวม' : activeDocType === 'receipt' ? 'เลขที่, ลูกค้า, ยอดรวม, วิธีการชำระเงิน' : activeDocType === 'quotation' ? 'เลขที่, ลูกค้า, ยอดรวม' : activeDocType === 'purchase-order' ? 'เลขที่, ผู้ขาย, ยอดรวม' : 'เลขที่, เรื่อง, จาก, ถึง, โครงการ'}`}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full sm:w-64 px-3 sm:px-4 py-2 pl-9 sm:pl-10 text-xs sm:text-sm border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-800 dark:text-gray-100"
                        />
                        <svg 
                            className="absolute left-2.5 sm:left-3 top-2.5 h-4 w-4 sm:h-5 sm:w-5 text-gray-400 dark:text-gray-500" 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute right-2.5 sm:right-3 top-2.5 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                                title="ล้างการค้นหา"
                            >
                                <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        )}
                    </div>
                    <button
                        onClick={() => fetchData()}
                        className="px-2 sm:px-3 py-2 text-xs sm:text-sm bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md hover:bg-gray-50 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-200 flex items-center gap-1 sm:gap-2"
                    >
                        <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span className="hidden sm:inline">รีเฟรช</span>
                    </button>
                </div>
            </div>

            {/* แสดงจำนวนผลลัพธ์ */}
            {searchTerm && (
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    พบ {filteredList.length} รายการ จากทั้งหมด {currentList.length} รายการ
                </div>
            )}

            {/* แสดงเมื่อไม่มีผลลัพธ์จากการค้นหา */}
            {filteredList.length === 0 && currentList.length > 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 text-center">
                    <p className="text-yellow-800 dark:text-yellow-200">ไม่พบผลลัพธ์ที่ตรงกับการค้นหา "{searchTerm}"</p>
                    <button
                        onClick={() => setSearchTerm('')}
                        className="mt-2 text-sm text-yellow-600 hover:text-yellow-800 dark:text-yellow-400 dark:hover:text-yellow-200 underline"
                    >
                        ล้างการค้นหา
                    </button>
                </div>
            )}

            {/* รายการเอกสาร */}
            <div className="grid grid-cols-1 gap-4">
                {activeDocType === 'delivery' ? (
                    // รายการใบส่งมอบงาน
                    paginatedList.map((note) => {
                        const noteItem = note as DeliveryNoteDocument;
                        const isCancelled = (noteItem as any).documentStatus === 'cancelled';
                        return (
                        <div key={noteItem.id} className={`group bg-white dark:bg-slate-800 border rounded-lg p-3 sm:p-4 hover:shadow-md transition-shadow ${isCancelled ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20' : 'border-gray-200 dark:border-slate-700'}`}>
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                                <div className="flex-1 min-w-0">
                                    {/* แสดงสถานะเอกสาร */}
                                    {isCancelled && (
                                        <div className="mb-2">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                                ❌ ยกเลิกแล้ว
                                            </span>
                                        </div>
                                    )}
                                    <h3 className={`text-base sm:text-lg font-semibold break-words ${isCancelled ? 'text-gray-500 dark:text-gray-400 line-through' : 'text-gray-900 dark:text-gray-100'}`}>{noteItem.project || 'ไม่ระบุโครงการ'}</h3>
                                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                                        <div>
                                            <span className="font-medium">เลขที่:</span>{' '}
                                            <button
                                                onClick={() => handleShowPreview(noteItem)}
                                                className={`hover:underline cursor-pointer break-all ${isCancelled ? 'text-gray-500' : 'text-blue-600 hover:text-blue-800'}`}
                                                title="คลิกเพื่อดูตัวอย่าง"
                                            >
                                                {noteItem.docNumber}
                                            </button>
                                        </div>
                                        <div>
                                            <span className="font-medium">วันที่:</span> {noteItem.date ? formatDate(noteItem.date) : 'ไม่ระบุ'}
                                        </div>
                                        <div>
                                            <span className="font-medium">จาก:</span> <span className="break-words">{noteItem.fromCompany}</span>
                                        </div>
                                        <div>
                                            <span className="font-medium">ถึง:</span> <span className="break-words">{noteItem.toCompany}</span>
                                        </div>
                                    </div>
                                    <div className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                                        บันทึกเมื่อ: {formatDate(noteItem.createdAt)}
                                    </div>
                                </div>
                                {/* ปุ่ม Actions - ใช้ DocumentActions component (แสดงเมื่อ hover) */}
                                <DocumentActions
                                    onEdit={() => onLoadDocument(noteItem)}
                                    onDownload={() => handleDownloadPdf(noteItem)}
                                    onCancel={() => setCancelConfirm({ id: noteItem.id!, docNumber: noteItem.docNumber })}
                                    onRestore={() => handleRestoreDocument(noteItem.id!)}
                                    onDelete={() => setDeleteConfirm({ type: 'delivery', id: noteItem.id! })}
                                    onPreview={() => handleShowPreview(noteItem)}
                                    isCancelled={isCancelled}
                                    isDownloading={downloadingPdfId === noteItem.id}
                                    isCancelling={cancellingId === noteItem.id}
                                    isRestoring={restoringId === noteItem.id}
                                    showPreview={true}
                                    showOnHover={true}
                                />
                            </div>
                        </div>
                    );
                    })
                ) : activeDocType === 'warranty' ? (
                    // รายการใบรับประกันสินค้า
                    paginatedList.map((card) => {
                        const cardItem = card as WarrantyDocument;
                        return (
                        <div key={cardItem.id} className="group bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-3 sm:p-4 hover:shadow-md transition-shadow">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 break-words">{cardItem.serviceName || cardItem.projectName || 'ไม่ระบุสินค้า'}</h3>
                                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                                        <div>
                                            <span className="font-medium">หมายเลข:</span>{' '}
                                            {cardItem.warrantyNumber ? (
                                                <button
                                                    onClick={() => handleShowPreview(cardItem)}
                                                    className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer break-all"
                                                    title="คลิกเพื่อดูตัวอย่าง"
                                                >
                                                    {cardItem.warrantyNumber}
                                                </button>
                                            ) : (
                                                'ไม่ระบุ'
                                            )}
                                        </div>
                                        <div>
                                            <span className="font-medium">ลูกค้า:</span> <span className="break-words">{cardItem.customerName || 'ไม่ระบุ'}</span>
                                        </div>
                                        <div>
                                            <span className="font-medium">วันซื้อ:</span> {cardItem.purchaseDate ? formatDate(cardItem.purchaseDate) : 'ไม่ระบุ'}
                                        </div>
                                        <div>
                                            <span className="font-medium">รับประกัน:</span> {cardItem.warrantyPeriod || 'ไม่ระบุ'}
                                        </div>
                                    </div>
                                    <div className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                                        บันทึกเมื่อ: {formatDate(cardItem.createdAt)}
                                    </div>
                                </div>
                                {/* ปุ่ม Actions - ใช้ DocumentActions component */}
                                <DocumentActions
                                    onEdit={() => onLoadDocument(cardItem)}
                                    onDownload={() => handleDownloadPdf(cardItem)}
                                    onDelete={() => setDeleteConfirm({ type: 'warranty', id: cardItem.id! })}
                                    onPreview={() => handleShowPreview(cardItem)}
                                    isDownloading={downloadingPdfId === cardItem.id}
                                    showPreview={true}
                                    showOnHover={true}
                                />
                            </div>
                        </div>
                    );
                    })
                ) : activeDocType === 'invoice' ? (
                    // รายการใบแจ้งหนี้
                    paginatedList.map((invoice) => {
                        const invoiceItem = invoice as InvoiceDocument;
                        const isCancelled = (invoiceItem as any).documentStatus === 'cancelled';
                        return (
                        <div key={invoiceItem.id} className={`group bg-white dark:bg-slate-800 border rounded-lg p-3 sm:p-4 hover:shadow-md transition-shadow ${isCancelled ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20' : 'border-gray-200 dark:border-slate-700'}`}>
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                                <div className="flex-1 min-w-0">
                                    {/* แสดงสถานะเอกสาร */}
                                    {isCancelled && (
                                        <div className="mb-2">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                                ❌ ยกเลิกแล้ว
                                            </span>
                                        </div>
                                    )}
                                    <h3 className={`text-base sm:text-lg font-semibold break-words ${isCancelled ? 'text-gray-500 dark:text-gray-400 line-through' : 'text-gray-900 dark:text-gray-100'}`}>{invoiceItem.customerName || 'ไม่ระบุลูกค้า'}</h3>
                                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                                        <div>
                                            <span className="font-medium">เลขที่:</span>{' '}
                                            <button
                                                onClick={() => handleShowPreview(invoiceItem)}
                                                className={`hover:underline cursor-pointer break-all ${isCancelled ? 'text-gray-500' : 'text-blue-600 hover:text-blue-800'}`}
                                                title="คลิกเพื่อดูตัวอย่าง"
                                            >
                                                {invoiceItem.invoiceNumber}
                                            </button>
                                        </div>
                                        <div>
                                            <span className="font-medium">วันที่ออก:</span> {invoiceItem.invoiceDate ? formatDate(invoiceItem.invoiceDate) : 'ไม่ระบุ'}
                                        </div>
                                        <div>
                                            <span className="font-medium">ผู้ขาย:</span> <span className="break-words">{invoiceItem.companyName || 'ไม่ระบุ'}</span>
                                        </div>
                                        <div>
                                            <span className="font-medium">ยอดรวม:</span> <span className={`font-bold ${isCancelled ? 'text-gray-500' : 'text-indigo-600'}`}>{(invoiceItem.total ?? 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท</span>
                                        </div>
                                    </div>
                                    <div className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                                        บันทึกเมื่อ: {formatDate(invoiceItem.createdAt)}
                                    </div>
                                </div>
                                {/* ปุ่ม Actions - ใช้ DocumentActions component */}
                                <DocumentActions
                                    onEdit={() => onLoadDocument(invoiceItem)}
                                    onDownload={() => handleDownloadPdf(invoiceItem)}
                                    onCancel={() => setCancelConfirm({ id: invoiceItem.id!, docNumber: invoiceItem.invoiceNumber })}
                                    onRestore={() => handleRestoreDocument(invoiceItem.id!)}
                                    onDelete={() => setDeleteConfirm({ type: 'invoice', id: invoiceItem.id! })}
                                    onPreview={() => handleShowPreview(invoiceItem)}
                                    isCancelled={isCancelled}
                                    isDownloading={downloadingPdfId === invoiceItem.id}
                                    isCancelling={cancellingId === invoiceItem.id}
                                    isRestoring={restoringId === invoiceItem.id}
                                    showPreview={true}
                                    showOnHover={true}
                                />
                            </div>
                        </div>
                    );
                    })
                ) : activeDocType === 'receipt' ? (
                    // รายการใบเสร็จ
                    paginatedList.map((receipt) => {
                        const receiptItem = receipt as ReceiptDocument;
                        return (
                        <div key={receiptItem.id} className="group bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-3 sm:p-4 hover:shadow-md transition-shadow">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 break-words">{receiptItem.customerName || 'ไม่ระบุลูกค้า'}</h3>
                                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                                        <div>
                                            <span className="font-medium">เลขที่:</span>{' '}
                                            <button
                                                onClick={() => handleShowPreview(receiptItem)}
                                                className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer break-all"
                                                title="คลิกเพื่อดูตัวอย่าง"
                                            >
                                                {receiptItem.receiptNumber}
                                            </button>
                                        </div>
                                        <div>
                                            <span className="font-medium">วันที่ออก:</span> {receiptItem.receiptDate ? formatDate(receiptItem.receiptDate) : 'ไม่ระบุ'}
                                        </div>
                                        <div>
                                            <span className="font-medium">ผู้ขาย:</span> <span className="break-words">{receiptItem.companyName || 'ไม่ระบุ'}</span>
                                        </div>
                                        <div>
                                            <span className="font-medium">ยอดรวม:</span> <span className="font-bold text-green-600">{(receiptItem.total ?? 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท</span>
                                        </div>
                                        {receiptItem.paymentMethod && (
                                            <div className="col-span-2">
                                                <span className="font-medium">วิธีการชำระเงิน:</span> {receiptItem.paymentMethod}
                                            </div>
                                        )}
                                    </div>
                                    <div className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                                        บันทึกเมื่อ: {formatDate(receiptItem.createdAt)}
                                    </div>
                                </div>
                                {/* ปุ่ม Actions - ใช้ DocumentActions component */}
                                <DocumentActions
                                    onEdit={() => onLoadDocument(receiptItem)}
                                    onDownload={() => handleDownloadPdf(receiptItem)}
                                    onDelete={() => setDeleteConfirm({ type: 'receipt', id: receiptItem.id! })}
                                    onPreview={() => handleShowPreview(receiptItem)}
                                    isDownloading={downloadingPdfId === receiptItem.id}
                                    showPreview={true}
                                    showOnHover={true}
                                />
                            </div>
                        </div>
                    );
                    })
                ) : activeDocType === 'quotation' ? (
                    // รายการใบเสนอราคา
                    paginatedList.map((quotation) => {
                        const quotationItem = quotation as QuotationDocument;
                        return (
                        <div key={quotationItem.id} className="group bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-3 sm:p-4 hover:shadow-md transition-shadow">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 break-words">{quotationItem.customerName || 'ไม่ระบุลูกค้า'}</h3>
                                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                                        <div>
                                            <span className="font-medium">เลขที่:</span>{' '}
                                            <button
                                                onClick={() => handleShowPreview(quotationItem)}
                                                className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer break-all"
                                                title="คลิกเพื่อดูตัวอย่าง"
                                            >
                                                {quotationItem.quotationNumber}
                                            </button>
                                        </div>
                                        <div>
                                            <span className="font-medium">วันที่ออก:</span> {quotationItem.quotationDate ? formatDate(quotationItem.quotationDate) : 'ไม่ระบุ'}
                                        </div>
                                        <div>
                                            <span className="font-medium">ผู้เสนอราคา:</span> <span className="break-words">{quotationItem.companyName || 'ไม่ระบุ'}</span>
                                        </div>
                                        <div>
                                            <span className="font-medium">ยอดรวม:</span> <span className="font-bold text-green-600">{(quotationItem.total ?? 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท</span>
                                        </div>
                                        {quotationItem.validUntilDate && (
                                            <div className="col-span-1 sm:col-span-2">
                                                <span className="font-medium">วันที่หมดอายุ:</span> {formatDate(quotationItem.validUntilDate)}
                                            </div>
                                        )}
                                    </div>
                                    <div className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                                        บันทึกเมื่อ: {formatDate(quotationItem.createdAt)}
                                    </div>
                                </div>
                                {/* ปุ่ม Actions - ใช้ DocumentActions component */}
                                <DocumentActions
                                    onEdit={() => onLoadDocument(quotationItem)}
                                    onDownload={() => handleDownloadPdf(quotationItem)}
                                    onDelete={() => setDeleteConfirm({ type: 'quotation', id: quotationItem.id! })}
                                    onPreview={() => handleShowPreview(quotationItem)}
                                    isDownloading={downloadingPdfId === quotationItem.id}
                                    showPreview={true}
                                    showOnHover={true}
                                />
                            </div>
                        </div>
                    );
                    })
                ) : activeDocType === 'purchase-order' ? (
                    // รายการใบสั่งซื้อ
                    paginatedList.map((po) => {
                        const poItem = po as PurchaseOrderDocument;
                        return (
                        <div key={poItem.id} className="group bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-3 sm:p-4 hover:shadow-md transition-shadow">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 break-words">{poItem.supplierName || 'ไม่ระบุผู้ขาย'}</h3>
                                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                                        <div>
                                            <span className="font-medium">เลขที่:</span>{' '}
                                            <button
                                                onClick={() => handleShowPreview(poItem)}
                                                className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer break-all"
                                                title="คลิกเพื่อดูตัวอย่าง"
                                            >
                                                {poItem.purchaseOrderNumber}
                                            </button>
                                        </div>
                                        <div>
                                            <span className="font-medium">วันที่ออก:</span> {poItem.purchaseOrderDate ? formatDate(poItem.purchaseOrderDate) : 'ไม่ระบุ'}
                                        </div>
                                        <div>
                                            <span className="font-medium">ผู้สั่งซื้อ:</span> <span className="break-words">{poItem.companyName || 'ไม่ระบุ'}</span>
                                        </div>
                                        <div>
                                            <span className="font-medium">ยอดรวม:</span> <span className="font-bold text-indigo-600">{(poItem.total ?? 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท</span>
                                        </div>
                                        {poItem.expectedDeliveryDate && (
                                            <div className="col-span-1 sm:col-span-2">
                                                <span className="font-medium">วันที่ต้องการรับสินค้า:</span> {formatDate(poItem.expectedDeliveryDate)}
                                            </div>
                                        )}
                                    </div>
                                    <div className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                                        บันทึกเมื่อ: {formatDate(poItem.createdAt)}
                                    </div>
                                </div>
                                {/* ปุ่ม Actions - ใช้ DocumentActions component */}
                                <DocumentActions
                                    onEdit={() => onLoadDocument(poItem)}
                                    onDownload={() => handleDownloadPdf(poItem)}
                                    onDelete={() => setDeleteConfirm({ type: 'purchase-order', id: poItem.id! })}
                                    onPreview={() => handleShowPreview(poItem)}
                                    isDownloading={downloadingPdfId === poItem.id}
                                    showPreview={true}
                                    showOnHover={true}
                                />
                            </div>
                        </div>
                    );
                    })
                ) : (
                    // รายการใบบันทึก
                    paginatedList.map((memo) => {
                        const memoItem = memo as MemoDocument;
                        return (
                        <div key={memoItem.id} className="group bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-3 sm:p-4 hover:shadow-md transition-shadow">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 break-words">{memoItem.subject || 'ไม่ระบุเรื่อง'}</h3>
                                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                                        <div>
                                            <span className="font-medium">เลขที่:</span>{' '}
                                            <button
                                                onClick={() => handleShowPreview(memoItem)}
                                                className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer break-all"
                                                title="คลิกเพื่อดูตัวอย่าง"
                                            >
                                                {memoItem.memoNumber}
                                            </button>
                                        </div>
                                        <div>
                                            <span className="font-medium">วันที่ออก:</span> {memoItem.date ? formatDate(memoItem.date) : 'ไม่ระบุ'}
                                        </div>
                                        <div>
                                            <span className="font-medium">จาก:</span> <span className="break-words">{memoItem.fromName || 'ไม่ระบุ'}</span>
                                        </div>
                                        <div>
                                            <span className="font-medium">ถึง:</span> <span className="break-words">{memoItem.toName || 'ไม่ระบุ'}</span>
                                        </div>
                                        {memoItem.projectName && (
                                            <div className="col-span-1 sm:col-span-2">
                                                <span className="font-medium">โครงการ:</span> {memoItem.projectName}
                                            </div>
                                        )}
                                    </div>
                                    <div className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                                        บันทึกเมื่อ: {formatDate(memoItem.createdAt)}
                                    </div>
                                </div>
                                {/* ปุ่ม Actions - ใช้ DocumentActions component */}
                                <DocumentActions
                                    onEdit={() => onLoadDocument(memoItem)}
                                    onDownload={() => handleDownloadPdf(memoItem)}
                                    onDelete={() => setDeleteConfirm({ type: 'memo', id: memoItem.id! })}
                                    onPreview={() => handleShowPreview(memoItem)}
                                    isDownloading={downloadingPdfId === memoItem.id}
                                    showPreview={true}
                                    showOnHover={true}
                                />
                            </div>
                        </div>
                    );
                    })
                )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4 mt-4 sm:mt-6 pt-4 border-t border-gray-200 dark:border-slate-700">
                    <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                        แสดง {startIndex + 1}-{Math.min(endIndex, filteredList.length)} จาก {filteredList.length} รายการ
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2">
                        {/* ปุ่มไปหน้าหลัง */}
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md hover:bg-gray-50 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                        >
                            <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            <span className="hidden sm:inline">ก่อนหน้า</span>
                        </button>

                        {/* หมายเลขหน้า */}
                        <div className="flex items-center gap-1">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                                // แสดงเฉพาะหน้าที่ใกล้เคียงกับหน้าปัจจุบัน
                                if (
                                    page === 1 ||
                                    page === totalPages ||
                                    (page >= currentPage - 1 && page <= currentPage + 1)
                                ) {
                                    return (
                                        <button
                                            key={page}
                                            onClick={() => setCurrentPage(page)}
                                            className={`px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm rounded-md ${
                                                currentPage === page
                                                    ? 'bg-indigo-600 text-white'
                                                    : 'bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-600'
                                            }`}
                                        >
                                            {page}
                                        </button>
                                    );
                                } else if (
                                    page === currentPage - 2 ||
                                    page === currentPage + 2
                                ) {
                                    return (
                                        <span key={page} className="px-1 sm:px-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                                            ...
                                        </span>
                                    );
                                }
                                return null;
                            })}
                        </div>

                        {/* ปุ่มไปหน้าถัดไป */}
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            className="px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md hover:bg-gray-50 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                        >
                            <span className="hidden sm:inline">ถัดไป</span>
                            <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HistoryList;
