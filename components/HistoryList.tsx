import React, { useEffect, useState, useCallback, useRef } from 'react';
import { getDeliveryNotes, getWarrantyCards, getInvoices, getReceipts, getQuotations, deleteDeliveryNote, deleteWarrantyCard, deleteInvoice, deleteReceipt, deleteQuotation } from '../services/firestore';
import type { DeliveryNoteDocument, WarrantyDocument, InvoiceDocument, ReceiptDocument, QuotationDocument } from '../services/firestore';
import { useCompany } from '../contexts/CompanyContext';
import { generatePdf } from '../services/pdfGenerator';
import DocumentPreview from './DocumentPreview';
import WarrantyPreview from './WarrantyPreview';
import InvoicePreview from './InvoicePreview';
import ReceiptPreview from './ReceiptPreview';
import QuotationPreview from './QuotationPreview';
import type { DeliveryNoteData, WarrantyData, InvoiceData, ReceiptData, QuotationData } from '../types';

interface HistoryListProps {
    activeDocType: 'delivery' | 'warranty' | 'invoice' | 'receipt' | 'quotation';
    onLoadDocument: (doc: DeliveryNoteDocument | WarrantyDocument | InvoiceDocument | ReceiptDocument | QuotationDocument) => void;
}

const HistoryList: React.FC<HistoryListProps> = ({ activeDocType, onLoadDocument }) => {
    const { currentCompany } = useCompany(); // ใช้ CompanyContext
    const [deliveryNotes, setDeliveryNotes] = useState<DeliveryNoteDocument[]>([]);
    const [warrantyCards, setWarrantyCards] = useState<WarrantyDocument[]>([]);
    const [invoices, setInvoices] = useState<InvoiceDocument[]>([]);
    const [receipts, setReceipts] = useState<ReceiptDocument[]>([]);
    const [quotations, setQuotations] = useState<QuotationDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'delivery' | 'warranty' | 'invoice' | 'receipt' | 'quotation', id: string } | null>(null);
    const [downloadingPdfId, setDownloadingPdfId] = useState<string | null>(null); // เก็บ ID ของเอกสารที่กำลัง download
    const previewRef = useRef<HTMLDivElement>(null); // Ref สำหรับ preview component ที่ซ่อนอยู่
    const [previewData, setPreviewData] = useState<DeliveryNoteData | WarrantyData | InvoiceData | ReceiptData | QuotationData | null>(null); // ข้อมูลสำหรับ preview
    const [showPreviewModal, setShowPreviewModal] = useState(false); // แสดง preview modal หรือไม่
    const [previewDoc, setPreviewDoc] = useState<DeliveryNoteDocument | WarrantyDocument | InvoiceDocument | ReceiptDocument | QuotationDocument | null>(null); // เอกสารที่กำลัง preview
    const previewModalRef = useRef<HTMLDivElement>(null); // Ref สำหรับ preview component ใน modal
    
    // State สำหรับ filter และ pagination
    const [searchTerm, setSearchTerm] = useState<string>(''); // คำค้นหาสำหรับ filter
    const [currentPage, setCurrentPage] = useState<number>(1); // หน้าปัจจุบัน
    const itemsPerPage = 10; // จำนวนรายการต่อหน้า

    // โหลดข้อมูลจาก Firestore กรองตาม companyId
    const fetchData = useCallback(async (showLoading: boolean = true) => {
        if (showLoading) {
            setLoading(true);
        }
        setError(null);
        
        try {
            const companyId = currentCompany?.id; // ดึง companyId จาก context
            
            if (activeDocType === 'delivery') {
                const notes = await getDeliveryNotes(50, companyId);
                setDeliveryNotes(notes);
            } else if (activeDocType === 'warranty') {
                const cards = await getWarrantyCards(50, companyId);
                setWarrantyCards(cards);
            } else if (activeDocType === 'invoice') {
                const invoiceList = await getInvoices(50, companyId);
                setInvoices(invoiceList);
            } else if (activeDocType === 'receipt') {
                const receiptList = await getReceipts(50, companyId);
                setReceipts(receiptList);
            } else {
                const quotationList = await getQuotations(50, companyId);
                setQuotations(quotationList);
            }
        } catch (err) {
            console.error('Error fetching data:', err);
            setError('ไม่สามารถโหลดข้อมูลได้');
        } finally {
            if (showLoading) {
                setLoading(false);
            }
        }
    }, [activeDocType, currentCompany]); // เพิ่ม dependencies

    useEffect(() => {
        fetchData();
    }, [fetchData]); // ใช้ fetchData เป็น dependency

    // Reset หน้าเป็น 1 เมื่อเปลี่ยน search term หรือ doc type
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, activeDocType]);

    // ฟังก์ชันลบเอกสาร
    const handleDelete = async (type: 'delivery' | 'warranty' | 'invoice' | 'receipt', id: string) => {
        try {
            console.log(`🗑️ กำลังลบ ${type === 'delivery' ? 'ใบส่งมอบงาน' : type === 'warranty' ? 'ใบรับประกันสินค้า' : type === 'invoice' ? 'ใบแจ้งหนี้' : 'ใบเสร็จ'} ID:`, id);
            
            if (type === 'delivery') {
                await deleteDeliveryNote(id);
                console.log('✅ ลบใบส่งมอบงานสำเร็จ');
                setDeliveryNotes(prev => prev.filter(note => note.id !== id));
            } else if (type === 'warranty') {
                await deleteWarrantyCard(id);
                console.log('✅ ลบใบรับประกันสินค้าสำเร็จ');
                setWarrantyCards(prev => prev.filter(card => card.id !== id));
            } else if (type === 'invoice') {
                await deleteInvoice(id);
                console.log('✅ ลบใบแจ้งหนี้สำเร็จ');
                setInvoices(prev => prev.filter(invoice => invoice.id !== id));
            } else if (type === 'receipt') {
                await deleteReceipt(id);
                console.log('✅ ลบใบเสร็จสำเร็จ');
                setReceipts(prev => prev.filter(receipt => receipt.id !== id));
            } else {
                await deleteQuotation(id);
                console.log('✅ ลบใบเสนอราคาสำเร็จ');
                setQuotations(prev => prev.filter(quotation => quotation.id !== id));
            }
            
            setDeleteConfirm(null);
            
            // รอสักครู่เพื่อให้ Firestore sync เสร็จก่อนรีเฟรช
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // รีเฟรชข้อมูลใหม่จาก Firestore โดยไม่แสดง loading เพื่อให้แน่ใจว่าข้อมูลตรงกัน
            await fetchData(false);
            console.log('✅ รีเฟรชข้อมูลสำเร็จ');
        } catch (err) {
            console.error('❌ Error deleting document:', err);
            alert('ไม่สามารถลบเอกสารได้: ' + (err instanceof Error ? err.message : 'Unknown error'));
            // ถ้าลบไม่สำเร็จ ให้รีเฟรชข้อมูลเพื่อให้แน่ใจว่าข้อมูลตรงกัน
            await fetchData(false);
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

    // ฟังก์ชันสร้างชื่อไฟล์ PDF
    const generatePdfFilename = (type: 'delivery' | 'warranty' | 'invoice' | 'receipt' | 'quotation', data: DeliveryNoteData | WarrantyData | InvoiceData | ReceiptData | QuotationData): string => {
        const now = new Date();
        const yy = String(now.getFullYear()).slice(-2);
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        
        if (type === 'delivery') {
            const deliveryData = data as DeliveryNoteData;
            const customerName = deliveryData.toCompany || 'Unknown';
            const cleanName = customerName.replace(/[^a-zA-Z0-9ก-๙]/g, '').substring(0, 20);
            return `DN_${cleanName}_${yy}${mm}${dd}.pdf`;
        } else if (type === 'warranty') {
            const warrantyData = data as WarrantyData;
            const customerName = warrantyData.customerName || 'Unknown';
            const cleanName = customerName.replace(/[^a-zA-Z0-9ก-๙]/g, '').substring(0, 20);
            return `WR_${cleanName}_${yy}${mm}${dd}.pdf`;
        } else if (type === 'invoice') {
            const invoiceData = data as InvoiceData;
            const customerName = invoiceData.customerName || 'Unknown';
            const cleanName = customerName.replace(/[^a-zA-Z0-9ก-๙]/g, '').substring(0, 20);
            return `IN_${cleanName}_${yy}${mm}${dd}.pdf`;
        } else if (type === 'receipt') {
            const receiptData = data as ReceiptData;
            const customerName = receiptData.customerName || 'Unknown';
            const cleanName = customerName.replace(/[^a-zA-Z0-9ก-๙]/g, '').substring(0, 20);
            return `RC_${cleanName}_${yy}${mm}${dd}.pdf`;
        } else {
            const quotationData = data as QuotationData;
            const customerName = quotationData.customerName || 'Unknown';
            const cleanName = customerName.replace(/[^a-zA-Z0-9ก-๙]/g, '').substring(0, 20);
            return `QT_${cleanName}_${yy}${mm}${dd}.pdf`;
        }
    };

    // ฟังก์ชันเปิด preview modal
    const handleShowPreview = useCallback((doc: DeliveryNoteDocument | WarrantyDocument | InvoiceDocument | ReceiptDocument | QuotationDocument) => {
        setPreviewDoc(doc);
        setPreviewData(doc as DeliveryNoteData | WarrantyData | InvoiceData | ReceiptData | QuotationData);
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
            const filename = generatePdfFilename(activeDocType, previewDoc as DeliveryNoteData | WarrantyData | InvoiceData | ReceiptData | QuotationData);
            
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
    const handleDownloadPdf = useCallback(async (doc: DeliveryNoteDocument | WarrantyDocument | InvoiceDocument | ReceiptDocument | QuotationDocument) => {
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
            setPreviewData(doc as DeliveryNoteData | WarrantyData | InvoiceData | ReceiptData | QuotationData);
            
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
            const filename = generatePdfFilename(activeDocType, doc as DeliveryNoteData | WarrantyData | InvoiceData | ReceiptData | QuotationData);
            
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
    }, [activeDocType, currentCompany]);

    // แสดง Loading
    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    // แสดง Error
    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                <p className="text-red-600">{error}</p>
                <button 
                    onClick={fetchData}
                    className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                    ลองใหม่
                </button>
            </div>
        );
    }

    const currentList = activeDocType === 'delivery' ? deliveryNotes : activeDocType === 'warranty' ? warrantyCards : activeDocType === 'invoice' ? invoices : activeDocType === 'receipt' ? receipts : quotations;

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
        } else {
            const quotation = item as QuotationDocument;
            return (
                (quotation.quotationNumber || '').toLowerCase().includes(searchLower) ||
                (quotation.customerName || '').toLowerCase().includes(searchLower) ||
                (quotation.companyName || '').toLowerCase().includes(searchLower) ||
                (quotation.total ? quotation.total.toString().includes(searchLower) : false) ||
                (quotation.quotationDate ? formatDate(quotation.quotationDate).toLowerCase().includes(searchLower) : false)
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
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">ไม่มีเอกสาร</h3>
                <p className="mt-1 text-sm text-gray-500">
                    เริ่มต้นโดยการสร้าง{activeDocType === 'delivery' ? 'ใบส่งมอบงาน' : activeDocType === 'warranty' ? 'ใบรับประกันสินค้า' : activeDocType === 'invoice' ? 'ใบแจ้งหนี้' : 'ใบเสร็จ'}ใหม่
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
                    </>
                )}
            </div>

            {/* Modal Preview เอกสาร */}
            {showPreviewModal && previewData && previewDoc && (
                <div className="fixed inset-0 bg-gray-900 bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
                    <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
                        {/* Header */}
                        <div className="flex justify-between items-center p-4 border-b border-gray-200">
                            <h2 className="text-xl font-semibold text-gray-900">
                                {activeDocType === 'delivery' ? 'ตัวอย่างใบส่งมอบงาน' : activeDocType === 'warranty' ? 'ตัวอย่างใบรับประกันสินค้า' : activeDocType === 'invoice' ? 'ตัวอย่างใบแจ้งหนี้' : activeDocType === 'receipt' ? 'ตัวอย่างใบเสร็จ' : 'ตัวอย่างใบเสนอราคา'}
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
                                ) : (
                                    <QuotationPreview ref={previewModalRef} data={previewData as QuotationData} />
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal ยืนยันการลบ */}
            {deleteConfirm && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
                    <div className="relative mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                        <div className="mt-3 text-center">
                            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                                <svg className="h-6 w-6 text-red-600" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <h3 className="text-lg leading-6 font-medium text-gray-900 mt-2">ยืนยันการลบ</h3>
                            <div className="mt-2 px-7 py-3">
                                <p className="text-sm text-gray-500">
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
                                    className="px-4 py-2 bg-gray-200 text-gray-800 text-base font-medium rounded-md w-auto shadow-sm hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                                >
                                    ยกเลิก
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <h2 className="text-xl font-semibold text-slate-700">
                    ประวัติ{activeDocType === 'delivery' ? 'ใบส่งมอบงาน' : activeDocType === 'warranty' ? 'ใบรับประกันสินค้า' : activeDocType === 'invoice' ? 'ใบแจ้งหนี้' : 'ใบเสร็จ'}
                </h2>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    {/* Search/Filter Input */}
                    <div className="flex-1 sm:flex-none relative">
                        <input
                            type="text"
                            placeholder={`ค้นหา${activeDocType === 'delivery' ? 'เลขที่, โครงการ, จาก, ถึง' : activeDocType === 'warranty' ? 'หมายเลข, สินค้า, ลูกค้า' : activeDocType === 'invoice' ? 'เลขที่, ลูกค้า, ยอดรวม' : 'เลขที่, ลูกค้า, ยอดรวม, วิธีการชำระเงิน'}`}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full sm:w-64 px-4 py-2 pl-10 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                        <svg 
                            className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                                title="ล้างการค้นหา"
                            >
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        )}
                    </div>
                    <button
                        onClick={fetchData}
                        className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        รีเฟรช
                    </button>
                </div>
            </div>

            {/* แสดงจำนวนผลลัพธ์ */}
            {searchTerm && (
                <div className="text-sm text-gray-600 mb-2">
                    พบ {filteredList.length} รายการ จากทั้งหมด {currentList.length} รายการ
                </div>
            )}

            {/* แสดงเมื่อไม่มีผลลัพธ์จากการค้นหา */}
            {filteredList.length === 0 && currentList.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                    <p className="text-yellow-800">ไม่พบผลลัพธ์ที่ตรงกับการค้นหา "{searchTerm}"</p>
                    <button
                        onClick={() => setSearchTerm('')}
                        className="mt-2 text-sm text-yellow-600 hover:text-yellow-800 underline"
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
                        return (
                        <div key={noteItem.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-gray-900">{noteItem.project || 'ไม่ระบุโครงการ'}</h3>
                                    <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-gray-600">
                                        <div>
                                            <span className="font-medium">เลขที่:</span>{' '}
                                            <button
                                                onClick={() => handleShowPreview(noteItem)}
                                                className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                                                title="คลิกเพื่อดูตัวอย่าง"
                                            >
                                                {noteItem.docNumber}
                                            </button>
                                        </div>
                                        <div>
                                            <span className="font-medium">วันที่:</span> {noteItem.date ? formatDate(noteItem.date) : 'ไม่ระบุ'}
                                        </div>
                                        <div>
                                            <span className="font-medium">จาก:</span> {noteItem.fromCompany}
                                        </div>
                                        <div>
                                            <span className="font-medium">ถึง:</span> {noteItem.toCompany}
                                        </div>
                                    </div>
                                    <div className="mt-2 text-xs text-gray-400">
                                        บันทึกเมื่อ: {formatDate(noteItem.createdAt)}
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2 ml-4">
                                    <button
                                        onClick={() => onLoadDocument(noteItem)}
                                        className="px-3 py-1 bg-amber-600 text-white text-sm rounded hover:bg-amber-700 flex items-center gap-1"
                                        title="โหลดเอกสารเพื่อแก้ไข"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                        ✏️ แก้ไข
                                    </button>
                                    <button
                                        onClick={() => handleDownloadPdf(noteItem)}
                                        disabled={downloadingPdfId === noteItem.id}
                                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="ดาวน์โหลด PDF"
                                    >
                                        {downloadingPdfId === noteItem.id ? (
                                            <>
                                                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                กำลังสร้าง...
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
                                        onClick={() => setDeleteConfirm({ type: 'delivery', id: noteItem.id! })}
                                        className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 flex items-center gap-1"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                        ลบ
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                    })
                ) : activeDocType === 'warranty' ? (
                    // รายการใบรับประกันสินค้า
                    paginatedList.map((card) => {
                        const cardItem = card as WarrantyDocument;
                        return (
                        <div key={cardItem.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-gray-900">{cardItem.serviceName || cardItem.projectName || 'ไม่ระบุสินค้า'}</h3>
                                    <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-gray-600">
                                        <div>
                                            <span className="font-medium">หมายเลข:</span>{' '}
                                            {cardItem.warrantyNumber ? (
                                                <button
                                                    onClick={() => handleShowPreview(cardItem)}
                                                    className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                                                    title="คลิกเพื่อดูตัวอย่าง"
                                                >
                                                    {cardItem.warrantyNumber}
                                                </button>
                                            ) : (
                                                'ไม่ระบุ'
                                            )}
                                        </div>
                                        <div>
                                            <span className="font-medium">ลูกค้า:</span> {cardItem.customerName || 'ไม่ระบุ'}
                                        </div>
                                        <div>
                                            <span className="font-medium">วันซื้อ:</span> {cardItem.purchaseDate ? formatDate(cardItem.purchaseDate) : 'ไม่ระบุ'}
                                        </div>
                                        <div>
                                            <span className="font-medium">รับประกัน:</span> {cardItem.warrantyPeriod || 'ไม่ระบุ'}
                                        </div>
                                    </div>
                                    <div className="mt-2 text-xs text-gray-400">
                                        บันทึกเมื่อ: {formatDate(cardItem.createdAt)}
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2 ml-4">
                                    <button
                                        onClick={() => onLoadDocument(cardItem)}
                                        className="px-3 py-1 bg-amber-600 text-white text-sm rounded hover:bg-amber-700 flex items-center gap-1"
                                        title="โหลดเอกสารเพื่อแก้ไข"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                        ✏️ แก้ไข
                                    </button>
                                    <button
                                        onClick={() => handleDownloadPdf(cardItem)}
                                        disabled={downloadingPdfId === cardItem.id}
                                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="ดาวน์โหลด PDF"
                                    >
                                        {downloadingPdfId === cardItem.id ? (
                                            <>
                                                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                กำลังสร้าง...
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
                                        onClick={() => setDeleteConfirm({ type: 'warranty', id: cardItem.id! })}
                                        className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 flex items-center gap-1"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                        ลบ
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                    })
                ) : activeDocType === 'invoice' ? (
                    // รายการใบแจ้งหนี้
                    paginatedList.map((invoice) => {
                        const invoiceItem = invoice as InvoiceDocument;
                        return (
                        <div key={invoiceItem.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-gray-900">{invoiceItem.customerName || 'ไม่ระบุลูกค้า'}</h3>
                                    <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-gray-600">
                                        <div>
                                            <span className="font-medium">เลขที่:</span>{' '}
                                            <button
                                                onClick={() => handleShowPreview(invoiceItem)}
                                                className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                                                title="คลิกเพื่อดูตัวอย่าง"
                                            >
                                                {invoiceItem.invoiceNumber}
                                            </button>
                                        </div>
                                        <div>
                                            <span className="font-medium">วันที่ออก:</span> {invoiceItem.invoiceDate ? formatDate(invoiceItem.invoiceDate) : 'ไม่ระบุ'}
                                        </div>
                                        <div>
                                            <span className="font-medium">ผู้ขาย:</span> {invoiceItem.companyName || 'ไม่ระบุ'}
                                        </div>
                                        <div>
                                            <span className="font-medium">ยอดรวม:</span> <span className="font-bold text-indigo-600">{invoiceItem.total.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท</span>
                                        </div>
                                    </div>
                                    <div className="mt-2 text-xs text-gray-400">
                                        บันทึกเมื่อ: {formatDate(invoiceItem.createdAt)}
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2 ml-4">
                                    <button
                                        onClick={() => onLoadDocument(invoiceItem)}
                                        className="px-3 py-1 bg-amber-600 text-white text-sm rounded hover:bg-amber-700 flex items-center gap-1"
                                        title="โหลดเอกสารเพื่อแก้ไข"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                        ✏️ แก้ไข
                                    </button>
                                    <button
                                        onClick={() => handleDownloadPdf(invoiceItem)}
                                        disabled={downloadingPdfId === invoiceItem.id}
                                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="ดาวน์โหลด PDF"
                                    >
                                        {downloadingPdfId === invoiceItem.id ? (
                                            <>
                                                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                กำลังสร้าง...
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
                                        onClick={() => setDeleteConfirm({ type: 'invoice', id: invoiceItem.id! })}
                                        className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 flex items-center gap-1"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                        ลบ
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                    })
                ) : activeDocType === 'receipt' ? (
                    // รายการใบเสร็จ
                    paginatedList.map((receipt) => {
                        const receiptItem = receipt as ReceiptDocument;
                        return (
                        <div key={receiptItem.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-gray-900">{receiptItem.customerName || 'ไม่ระบุลูกค้า'}</h3>
                                    <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-gray-600">
                                        <div>
                                            <span className="font-medium">เลขที่:</span>{' '}
                                            <button
                                                onClick={() => handleShowPreview(receiptItem)}
                                                className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                                                title="คลิกเพื่อดูตัวอย่าง"
                                            >
                                                {receiptItem.receiptNumber}
                                            </button>
                                        </div>
                                        <div>
                                            <span className="font-medium">วันที่ออก:</span> {receiptItem.receiptDate ? formatDate(receiptItem.receiptDate) : 'ไม่ระบุ'}
                                        </div>
                                        <div>
                                            <span className="font-medium">ผู้ขาย:</span> {receiptItem.companyName || 'ไม่ระบุ'}
                                        </div>
                                        <div>
                                            <span className="font-medium">ยอดรวม:</span> <span className="font-bold text-green-600">{receiptItem.total.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท</span>
                                        </div>
                                        {receiptItem.paymentMethod && (
                                            <div className="col-span-2">
                                                <span className="font-medium">วิธีการชำระเงิน:</span> {receiptItem.paymentMethod}
                                            </div>
                                        )}
                                    </div>
                                    <div className="mt-2 text-xs text-gray-400">
                                        บันทึกเมื่อ: {formatDate(receiptItem.createdAt)}
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2 ml-4">
                                    <button
                                        onClick={() => onLoadDocument(receiptItem)}
                                        className="px-3 py-1 bg-amber-600 text-white text-sm rounded hover:bg-amber-700 flex items-center gap-1"
                                        title="โหลดเอกสารเพื่อแก้ไข"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                        ✏️ แก้ไข
                                    </button>
                                    <button
                                        onClick={() => handleDownloadPdf(receiptItem)}
                                        disabled={downloadingPdfId === receiptItem.id}
                                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="ดาวน์โหลด PDF"
                                    >
                                        {downloadingPdfId === receiptItem.id ? (
                                            <>
                                                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                กำลังสร้าง...
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
                                        onClick={() => setDeleteConfirm({ type: 'receipt', id: receiptItem.id! })}
                                        className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 flex items-center gap-1"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                        ลบ
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                    })
                ) : (
                    // รายการใบเสนอราคา
                    paginatedList.map((quotation) => {
                        const quotationItem = quotation as QuotationDocument;
                        return (
                        <div key={quotationItem.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-gray-900">{quotationItem.customerName || 'ไม่ระบุลูกค้า'}</h3>
                                    <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-gray-600">
                                        <div>
                                            <span className="font-medium">เลขที่:</span>{' '}
                                            <button
                                                onClick={() => handleShowPreview(quotationItem)}
                                                className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                                                title="คลิกเพื่อดูตัวอย่าง"
                                            >
                                                {quotationItem.quotationNumber}
                                            </button>
                                        </div>
                                        <div>
                                            <span className="font-medium">วันที่ออก:</span> {quotationItem.quotationDate ? formatDate(quotationItem.quotationDate) : 'ไม่ระบุ'}
                                        </div>
                                        <div>
                                            <span className="font-medium">ผู้เสนอราคา:</span> {quotationItem.companyName || 'ไม่ระบุ'}
                                        </div>
                                        <div>
                                            <span className="font-medium">ยอดรวม:</span> <span className="font-bold text-green-600">{quotationItem.total.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท</span>
                                        </div>
                                        {quotationItem.validUntilDate && (
                                            <div className="col-span-2">
                                                <span className="font-medium">วันที่หมดอายุ:</span> {formatDate(quotationItem.validUntilDate)}
                                            </div>
                                        )}
                                    </div>
                                    <div className="mt-2 text-xs text-gray-400">
                                        บันทึกเมื่อ: {formatDate(quotationItem.createdAt)}
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2 ml-4">
                                    <button
                                        onClick={() => onLoadDocument(quotationItem)}
                                        className="px-3 py-1 bg-amber-600 text-white text-sm rounded hover:bg-amber-700 flex items-center gap-1"
                                        title="โหลดเอกสารเพื่อแก้ไข"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                        ✏️ แก้ไข
                                    </button>
                                    <button
                                        onClick={() => handleDownloadPdf(quotationItem)}
                                        disabled={downloadingPdfId === quotationItem.id}
                                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="ดาวน์โหลด PDF"
                                    >
                                        {downloadingPdfId === quotationItem.id ? (
                                            <>
                                                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                กำลังสร้าง...
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
                                        onClick={() => setDeleteConfirm({ type: 'quotation', id: quotationItem.id! })}
                                        className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 flex items-center gap-1"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                        ลบ
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                    })
                )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 pt-4 border-t border-gray-200">
                    <div className="text-sm text-gray-600">
                        แสดง {startIndex + 1}-{Math.min(endIndex, filteredList.length)} จาก {filteredList.length} รายการ
                    </div>
                    <div className="flex items-center gap-2">
                        {/* ปุ่มไปหน้าหลัง */}
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            ก่อนหน้า
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
                                            className={`px-3 py-2 text-sm rounded-md ${
                                                currentPage === page
                                                    ? 'bg-indigo-600 text-white'
                                                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
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
                                        <span key={page} className="px-2 text-gray-400">
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
                            className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                        >
                            ถัดไป
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
