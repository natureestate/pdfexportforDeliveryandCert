// SharedDocumentPage - หน้าแสดง Preview เอกสารสำหรับ Public Link
// ไม่ต้อง Login สามารถเข้าดูได้ผ่าน Share Link

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { getSharedDocument, getShareLinkByToken, SharedDocumentData, ShareLink } from '../services/shareLink';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase.config';
import { generatePdf } from '../services/pdfGenerator';

// Import Preview Components
import DocumentPreview from './DocumentPreview';
import WarrantyPreview from './WarrantyPreview';
import InvoicePreview from './InvoicePreview';
import ReceiptPreview from './ReceiptPreview';
import TaxInvoicePreview from './TaxInvoicePreview';
import QuotationPreview from './QuotationPreview';
import PurchaseOrderPreview from './PurchaseOrderPreview';
import MemoPreview from './MemoPreview';
import VariationOrderPreview from './VariationOrderPreview';
import SubcontractPreview from './SubcontractPreview';

// Import Types
import type { 
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
import { DocType } from '../utils/documentRegistry';

// Mapping ระหว่าง DocType และ Collection Name
const DOC_TYPE_TO_COLLECTION: Record<DocType, string> = {
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

// Mapping ภาษาไทย
const DOC_TYPE_NAMES: Record<DocType, string> = {
    'delivery': 'ใบส่งมอบงาน',
    'warranty': 'ใบรับประกัน',
    'invoice': 'ใบแจ้งหนี้',
    'receipt': 'ใบเสร็จรับเงิน',
    'tax-invoice': 'ใบกำกับภาษี',
    'quotation': 'ใบเสนอราคา',
    'purchase-order': 'ใบสั่งซื้อ',
    'memo': 'บันทึกข้อความ',
    'variation-order': 'ใบส่วนต่าง',
    'subcontract': 'สัญญาจ้างเหมา',
};

// ฟังก์ชันแปลงวันที่
const formatDate = (date: Date | null | undefined): string => {
    if (!date) return '-';
    return new Intl.DateTimeFormat('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    }).format(date);
};

// ฟังก์ชันแปลง Timestamp เป็น Date
const convertTimestampToDate = (value: any): any => {
    if (!value) return value;
    if (value instanceof Timestamp) {
        return value.toDate();
    }
    if (value?.toDate && typeof value.toDate === 'function') {
        return value.toDate();
    }
    if (typeof value === 'object' && value !== null) {
        // ถ้าเป็น object ให้ loop แปลงทุก field
        const converted: any = Array.isArray(value) ? [] : {};
        for (const key in value) {
            converted[key] = convertTimestampToDate(value[key]);
        }
        return converted;
    }
    return value;
};

const SharedDocumentPage: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const printableAreaRef = useRef<HTMLDivElement>(null);
    
    // State
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [shareLink, setShareLink] = useState<ShareLink | null>(null);
    const [documentData, setDocumentData] = useState<any>(null);
    const [downloading, setDownloading] = useState(false);

    // ดึงข้อมูลเอกสารเมื่อโหลดหน้า
    useEffect(() => {
        if (token) {
            fetchSharedDocument();
        } else {
            setError('ไม่พบ Token สำหรับเข้าถึงเอกสาร');
            setLoading(false);
        }
    }, [token]);

    const fetchSharedDocument = async () => {
        setLoading(true);
        setError(null);

        try {
            // ดึงข้อมูล Share Link ก่อน
            const shareLinkResult = await getShareLinkByToken(token!);
            if (!shareLinkResult.success || !shareLinkResult.shareLink) {
                setError(shareLinkResult.error || 'ไม่พบลิงก์แชร์');
                setLoading(false);
                return;
            }

            const link = shareLinkResult.shareLink;
            setShareLink(link);

            // ดึงข้อมูลเอกสารจริงจาก Firestore
            const collectionName = DOC_TYPE_TO_COLLECTION[link.documentType];
            if (!collectionName) {
                setError('ประเภทเอกสารไม่ถูกต้อง');
                setLoading(false);
                return;
            }

            const docRef = doc(db, collectionName, link.documentId);
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) {
                setError('ไม่พบเอกสาร');
                setLoading(false);
                return;
            }

            // แปลง Timestamp เป็น Date
            const rawData = docSnap.data();
            const convertedData = convertTimestampToDate(rawData);
            
            setDocumentData(convertedData);
        } catch (err) {
            console.error('Error fetching shared document:', err);
            setError('เกิดข้อผิดพลาดในการโหลดเอกสาร');
        } finally {
            setLoading(false);
        }
    };

    // ดาวน์โหลด PDF
    const handleDownloadPdf = async () => {
        if (!shareLink?.permissions.canDownload) {
            alert('ลิงก์นี้ไม่อนุญาตให้ดาวน์โหลด');
            return;
        }

        if (!printableAreaRef.current || !documentData) {
            alert('ไม่สามารถดาวน์โหลดได้');
            return;
        }

        setDownloading(true);
        try {
            const filename = `${DOC_TYPE_NAMES[shareLink.documentType]}_${shareLink.documentNumber}.pdf`;
            await generatePdf(printableAreaRef.current, filename);
        } catch (err) {
            console.error('Error downloading PDF:', err);
            alert('เกิดข้อผิดพลาดในการดาวน์โหลด PDF');
        } finally {
            setDownloading(false);
        }
    };

    // Render Preview Component ตาม Document Type
    const renderPreview = () => {
        if (!shareLink || !documentData) return null;

        switch (shareLink.documentType) {
            case 'delivery':
                return <DocumentPreview ref={printableAreaRef} data={documentData as DeliveryNoteData} />;
            case 'warranty':
                return <WarrantyPreview ref={printableAreaRef} data={documentData as WarrantyData} />;
            case 'invoice':
                return <InvoicePreview ref={printableAreaRef} data={documentData as InvoiceData} />;
            case 'receipt':
                return <ReceiptPreview ref={printableAreaRef} data={documentData as ReceiptData} />;
            case 'tax-invoice':
                return <TaxInvoicePreview ref={printableAreaRef} data={documentData as TaxInvoiceData} />;
            case 'quotation':
                return <QuotationPreview ref={printableAreaRef} data={documentData as QuotationData} />;
            case 'purchase-order':
                return <PurchaseOrderPreview ref={printableAreaRef} data={documentData as PurchaseOrderData} />;
            case 'memo':
                return <MemoPreview ref={printableAreaRef} data={documentData as MemoData} />;
            case 'variation-order':
                return <VariationOrderPreview ref={printableAreaRef} data={documentData as VariationOrderData} />;
            case 'subcontract':
                return <SubcontractPreview ref={printableAreaRef} data={documentData as SubcontractData} />;
            default:
                return <div className="text-center text-gray-500">ไม่รองรับประเภทเอกสารนี้</div>;
        }
    };

    // Loading State
    if (loading) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600 text-lg">กำลังโหลดเอกสาร...</p>
                </div>
            </div>
        );
    }

    // Error State
    if (error) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-800 mb-2">ไม่สามารถเข้าถึงเอกสารได้</h1>
                    <p className="text-gray-600 mb-6">{error}</p>
                    <div className="text-sm text-gray-500">
                        <p>สาเหตุที่เป็นไปได้:</p>
                        <ul className="mt-2 text-left list-disc list-inside">
                            <li>ลิงก์ไม่ถูกต้องหรือหมดอายุ</li>
                            <li>ลิงก์ถูกปิดการใช้งาน</li>
                            <li>เอกสารถูกลบแล้ว</li>
                        </ul>
                    </div>
                </div>
            </div>
        );
    }

    // Success State - แสดง Preview
    return (
        <div className="min-h-screen bg-gray-100">
            {/* Header */}
            <header className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="px-3 py-1 text-sm font-medium bg-indigo-100 text-indigo-700 rounded-full">
                                    {DOC_TYPE_NAMES[shareLink?.documentType || 'delivery']}
                                </span>
                                <span className="text-gray-500 text-sm">
                                    แชร์โดย {shareLink?.creatorName || shareLink?.creatorEmail || 'ไม่ระบุ'}
                                </span>
                            </div>
                            <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mt-1">
                                {shareLink?.documentNumber}
                            </h1>
                        </div>
                        <div className="flex items-center gap-3">
                            {shareLink?.permissions.canDownload && (
                                <button
                                    onClick={handleDownloadPdf}
                                    disabled={downloading}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    {downloading ? (
                                        <>
                                            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            กำลังดาวน์โหลด...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            ดาวน์โหลด PDF
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Document Preview */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                    {/* Info Bar */}
                    <div className="bg-gray-50 border-b border-gray-200 px-6 py-3">
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                <span>ดูเอกสารเท่านั้น</span>
                            </div>
                            {shareLink?.expiresAt && (
                                <div className="flex items-center gap-1">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span>หมดอายุ: {formatDate(shareLink.expiresAt)}</span>
                                </div>
                            )}
                            {shareLink?.permissions.canDownload && (
                                <div className="flex items-center gap-1 text-green-600">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    <span>อนุญาตให้ดาวน์โหลด</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Preview Content */}
                    <div className="p-4 sm:p-6 lg:p-8 overflow-auto">
                        <div className="max-w-4xl mx-auto">
                            {renderPreview()}
                        </div>
                    </div>
                </div>

                {/* Footer Info */}
                <div className="mt-6 text-center text-sm text-gray-500">
                    <p>เอกสารนี้ถูกแชร์ผ่านระบบ NE Doc Form</p>
                    <p className="mt-1">
                        <a 
                            href="https://ecertonline-29a67.web.app" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:text-indigo-800"
                        >
                            เข้าสู่ระบบเพื่อสร้างเอกสารของคุณ →
                        </a>
                    </p>
                </div>
            </main>
        </div>
    );
};

export default SharedDocumentPage;
