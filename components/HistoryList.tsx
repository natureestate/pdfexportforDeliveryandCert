import React, { useEffect, useState, useCallback, useRef } from 'react';
import type { DeliveryNoteDocument, WarrantyDocument, InvoiceDocument, ReceiptDocument, QuotationDocument, PurchaseOrderDocument, MemoDocument, VariationOrderDocument, SubcontractDocument, TaxInvoiceDocument } from '../services/firestore';
import { useCompany } from '../contexts/CompanyContext';
import { generatePdf, generatePng } from '../services/pdfGenerator';
import { generatePdfFilename as generatePdfFilenameFromRegistry, type DocType, type DocumentDocument } from '../utils/documentRegistry';
import { useDocumentList } from '../hooks/useDocumentList';
import { cancelDocument, restoreDocument } from '../services/verification';
import { 
    prepareDocumentForCopy, 
    lockDocument, 
    unlockDocument, 
    archiveDocument, 
    unarchiveDocument 
} from '../services/documentManagement';
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
import TaxInvoicePreview from './TaxInvoicePreview';
import DocumentHistoryModal from './DocumentHistoryModal';
import ShareLinkModal from './ShareLinkModal';
import VersionHistoryModal from './VersionHistoryModal';
import type { DeliveryNoteData, WarrantyData, InvoiceData, ReceiptData, TaxInvoiceData, QuotationData, PurchaseOrderData, MemoData, VariationOrderData, SubcontractData } from '../types';

// Type alias สำหรับข้อมูลเอกสารทั้งหมด
type DocumentDataType = DeliveryNoteData | WarrantyData | InvoiceData | ReceiptData | TaxInvoiceData | QuotationData | PurchaseOrderData | MemoData | VariationOrderData | SubcontractData;
type AllDocumentDocument = DeliveryNoteDocument | WarrantyDocument | InvoiceDocument | ReceiptDocument | QuotationDocument | PurchaseOrderDocument | MemoDocument | VariationOrderDocument | SubcontractDocument | TaxInvoiceDocument;

interface HistoryListProps {
    activeDocType: DocType;
    onLoadDocument: (doc: DocumentDocument) => void;
    onCopyDocument?: (copiedData: DocumentDocument, newDocNumber: string) => void; // Callback เมื่อ copy เอกสาร
}

const HistoryList: React.FC<HistoryListProps> = ({ activeDocType, onLoadDocument, onCopyDocument }) => {
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
    
    const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'delivery' | 'warranty' | 'invoice' | 'receipt' | 'tax-invoice' | 'quotation' | 'purchase-order' | 'memo' | 'variation-order' | 'subcontract', id: string } | null>(null);
    const [downloadingPdfId, setDownloadingPdfId] = useState<string | null>(null); // เก็บ ID ของเอกสารที่กำลัง download
    
    // State สำหรับยกเลิก/กู้คืนเอกสาร
    const [cancelConfirm, setCancelConfirm] = useState<{ id: string; docNumber: string } | null>(null);
    const [cancelReason, setCancelReason] = useState<string>('');
    const [cancellingId, setCancellingId] = useState<string | null>(null);
    const [restoringId, setRestoringId] = useState<string | null>(null);
    const previewRef = useRef<HTMLDivElement>(null); // Ref สำหรับ preview component ที่ซ่อนอยู่
    const [previewData, setPreviewData] = useState<DeliveryNoteData | WarrantyData | InvoiceData | ReceiptData | TaxInvoiceData | QuotationData | PurchaseOrderData | MemoData | VariationOrderData | SubcontractData | null>(null); // ข้อมูลสำหรับ preview
    const [showPreviewModal, setShowPreviewModal] = useState(false); // แสดง preview modal หรือไม่
    const [previewDoc, setPreviewDoc] = useState<AllDocumentDocument | null>(null); // เอกสารที่กำลัง preview
    const previewModalRef = useRef<HTMLDivElement>(null); // Ref สำหรับ preview component ใน modal
    
    // State สำหรับ filter และ pagination
    const [searchTerm, setSearchTerm] = useState<string>(''); // คำค้นหาสำหรับ filter
    const [currentPage, setCurrentPage] = useState<number>(1); // หน้าปัจจุบัน
    const itemsPerPage = 10; // จำนวนรายการต่อหน้า
    
    // State สำหรับ Document Management features
    const [copyingId, setCopyingId] = useState<string | null>(null); // กำลัง copy เอกสาร
    const [lockingId, setLockingId] = useState<string | null>(null); // กำลัง lock เอกสาร
    const [unlockingId, setUnlockingId] = useState<string | null>(null); // กำลัง unlock เอกสาร
    const [archivingId, setArchivingId] = useState<string | null>(null); // กำลัง archive เอกสาร
    const [unarchivingId, setUnarchivingId] = useState<string | null>(null); // กำลัง unarchive เอกสาร
    const [showArchived, setShowArchived] = useState<boolean>(false); // แสดงเอกสารที่ archive หรือไม่
    
    // State สำหรับ Document History Modal
    const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
    const [historyDocId, setHistoryDocId] = useState<string>('');
    const [historyDocNumber, setHistoryDocNumber] = useState<string>('');
    
    // State สำหรับ Share Link Modal
    const [showShareModal, setShowShareModal] = useState<boolean>(false);
    const [shareDocId, setShareDocId] = useState<string>('');
    const [shareDocNumber, setShareDocNumber] = useState<string>('');
    
    // State สำหรับ Version History Modal
    const [showVersionModal, setShowVersionModal] = useState<boolean>(false);
    const [versionDocId, setVersionDocId] = useState<string>('');
    const [versionDocNumber, setVersionDocNumber] = useState<string>('');

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

    // ============================================================
    // Document Management Functions - Copy, Lock, Archive
    // ============================================================

    // ฟังก์ชัน Copy เอกสาร
    const handleCopyDocument = useCallback(async (docId: string) => {
        try {
            setCopyingId(docId);
            const result = await prepareDocumentForCopy<DocumentDocument>(docId, activeDocType);
            
            if (result.success && result.data && result.newDocNumber) {
                console.log(`✅ เตรียมข้อมูล copy เอกสารสำเร็จ เลขที่ใหม่: ${result.newDocNumber}`);
                
                // เรียก callback เพื่อโหลดข้อมูลที่ copy มาลงฟอร์ม
                if (onCopyDocument) {
                    onCopyDocument(result.data, result.newDocNumber);
                } else {
                    // ถ้าไม่มี callback ให้ใช้ onLoadDocument แทน
                    onLoadDocument(result.data);
                }
                
                alert(`✅ Copy เอกสารสำเร็จ! เลขที่เอกสารใหม่: ${result.newDocNumber}\nกรุณาตรวจสอบและบันทึกเอกสาร`);
            } else {
                alert(`❌ ${result.error || 'ไม่สามารถ copy เอกสารได้'}`);
            }
        } catch (err) {
            console.error('❌ Error copying document:', err);
            alert('ไม่สามารถ copy เอกสารได้: ' + (err instanceof Error ? err.message : 'Unknown error'));
        } finally {
            setCopyingId(null);
        }
    }, [activeDocType, onCopyDocument, onLoadDocument]);

    // ฟังก์ชัน Lock เอกสาร
    const handleLockDocument = useCallback(async (docId: string) => {
        try {
            setLockingId(docId);
            const result = await lockDocument(docId, activeDocType, 'ล็อกโดยผู้ใช้');
            
            if (result.success) {
                console.log(`✅ Lock เอกสารสำเร็จ`);
                alert('✅ Lock เอกสารสำเร็จ');
                fetchData(); // รีเฟรชรายการ
            } else {
                alert(`❌ ${result.error}`);
            }
        } catch (err) {
            console.error('❌ Error locking document:', err);
            alert('ไม่สามารถ lock เอกสารได้: ' + (err instanceof Error ? err.message : 'Unknown error'));
        } finally {
            setLockingId(null);
        }
    }, [activeDocType, fetchData]);

    // ฟังก์ชัน Unlock เอกสาร
    const handleUnlockDocument = useCallback(async (docId: string) => {
        try {
            setUnlockingId(docId);
            const result = await unlockDocument(docId, activeDocType);
            
            if (result.success) {
                console.log(`✅ Unlock เอกสารสำเร็จ`);
                alert('✅ Unlock เอกสารสำเร็จ');
                fetchData(); // รีเฟรชรายการ
            } else {
                alert(`❌ ${result.error}`);
            }
        } catch (err) {
            console.error('❌ Error unlocking document:', err);
            alert('ไม่สามารถ unlock เอกสารได้: ' + (err instanceof Error ? err.message : 'Unknown error'));
        } finally {
            setUnlockingId(null);
        }
    }, [activeDocType, fetchData]);

    // ฟังก์ชัน Archive เอกสาร
    const handleArchiveDocument = useCallback(async (docId: string) => {
        try {
            setArchivingId(docId);
            const result = await archiveDocument(docId, activeDocType);
            
            if (result.success) {
                console.log(`✅ Archive เอกสารสำเร็จ`);
                alert('✅ Archive เอกสารสำเร็จ');
                fetchData(); // รีเฟรชรายการ
            } else {
                alert(`❌ ${result.error}`);
            }
        } catch (err) {
            console.error('❌ Error archiving document:', err);
            alert('ไม่สามารถ archive เอกสารได้: ' + (err instanceof Error ? err.message : 'Unknown error'));
        } finally {
            setArchivingId(null);
        }
    }, [activeDocType, fetchData]);

    // ฟังก์ชัน Unarchive เอกสาร
    const handleUnarchiveDocument = useCallback(async (docId: string) => {
        try {
            setUnarchivingId(docId);
            const result = await unarchiveDocument(docId, activeDocType);
            
            if (result.success) {
                console.log(`✅ Unarchive เอกสารสำเร็จ`);
                alert('✅ Unarchive เอกสารสำเร็จ');
                fetchData(); // รีเฟรชรายการ
            } else {
                alert(`❌ ${result.error}`);
            }
        } catch (err) {
            console.error('❌ Error unarchiving document:', err);
            alert('ไม่สามารถ unarchive เอกสารได้: ' + (err instanceof Error ? err.message : 'Unknown error'));
        } finally {
            setUnarchivingId(null);
        }
    }, [activeDocType, fetchData]);

    // ฟังก์ชันเปิด History Modal
    const handleShowHistory = useCallback((docId: string, docNumber: string) => {
        setHistoryDocId(docId);
        setHistoryDocNumber(docNumber);
        setShowHistoryModal(true);
    }, []);

    // ฟังก์ชันปิด History Modal
    const handleCloseHistoryModal = useCallback(() => {
        setShowHistoryModal(false);
        setHistoryDocId('');
        setHistoryDocNumber('');
    }, []);

    // ฟังก์ชันเปิด Share Modal
    const handleShowShare = useCallback((docId: string, docNumber: string) => {
        setShareDocId(docId);
        setShareDocNumber(docNumber);
        setShowShareModal(true);
    }, []);

    // ฟังก์ชันปิด Share Modal
    const handleCloseShareModal = useCallback(() => {
        setShowShareModal(false);
        setShareDocId('');
        setShareDocNumber('');
    }, []);

    // ฟังก์ชันเปิด Version Modal
    const handleShowVersions = useCallback((docId: string, docNumber: string) => {
        setVersionDocId(docId);
        setVersionDocNumber(docNumber);
        setShowVersionModal(true);
    }, []);

    // ฟังก์ชันปิด Version Modal
    const handleCloseVersionModal = useCallback(() => {
        setShowVersionModal(false);
        setVersionDocId('');
        setVersionDocNumber('');
    }, []);

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

    // ฟังก์ชันดาวน์โหลด PNG จาก preview modal
    const handleDownloadPngFromPreview = useCallback(async () => {
        if (!previewDoc) return;
        
        try {
            setDownloadingPdfId(previewDoc.id || null);
            
            // ตรวจสอบ quota ก่อน export (ถ้ามี)
            if (currentCompany?.id) {
                try {
                    const { getQuota } = await import('../services/quota');
                    const quota = await getQuota(currentCompany.id);
                    
                    // ตรวจสอบว่า Free plan สามารถ export ได้หรือไม่
                    if (!quota.features.exportPDF) {
                        alert('❌ Free plan ไม่สามารถ Export ได้ กรุณาอัพเกรดแผน');
                        setDownloadingPdfId(null);
                        return;
                    }
                } catch (error) {
                    console.error('Failed to check quota:', error);
                }
            }

            // รอให้ React render preview component ใน modal และ ref พร้อม
            let attempts = 0;
            const maxAttempts = 20;
            while (attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 100));
                if (previewModalRef.current) {
                    break;
                }
                attempts++;
            }
            
            if (!previewModalRef.current) {
                throw new Error('ไม่พบ preview element กรุณาลองใหม่อีกครั้ง');
            }

            // สร้างชื่อไฟล์
            const filename = generatePdfFilename(activeDocType, previewDoc as DocumentDataType);
            
            // สร้าง PNG
            await generatePng(previewModalRef.current, filename);
            
            console.log('✅ PNG downloaded successfully');
        } catch (error) {
            console.error('❌ Error downloading PNG:', error);
            alert('ไม่สามารถดาวน์โหลด PNG ได้: ' + (error instanceof Error ? error.message : 'Unknown error'));
        } finally {
            setDownloadingPdfId(null);
        }
    }, [activeDocType, currentCompany, previewDoc]);

    // ฟังก์ชันดาวน์โหลด PNG (จากรายการ)
    const handleDownloadPng = useCallback(async (doc: DocumentDocument) => {
        try {
            setDownloadingPdfId(doc.id || null);
            
            // ตรวจสอบ quota ก่อน export (ถ้ามี)
            if (currentCompany?.id) {
                try {
                    const { getQuota } = await import('../services/quota');
                    const quota = await getQuota(currentCompany.id);
                    
                    if (!quota.features.exportPDF) {
                        alert('❌ Free plan ไม่สามารถ Export ได้ กรุณาอัพเกรดแผน');
                        setDownloadingPdfId(null);
                        return;
                    }
                } catch (error) {
                    console.error('Failed to check quota:', error);
                }
            }

            // ตั้งค่าข้อมูลสำหรับ preview
            setPreviewData(doc as DocumentDataType);
            
            // รอให้ React render preview component และ ref พร้อม
            let attempts = 0;
            const maxAttempts = 20;
            while (attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 100));
                if (previewRef.current) {
                    break;
                }
                attempts++;
            }
            
            if (!previewRef.current) {
                throw new Error('ไม่พบ preview element กรุณาลองใหม่อีกครั้ง');
            }

            // สร้างชื่อไฟล์
            const filename = generatePdfFilename(activeDocType, doc as DocumentDataType);
            
            // สร้าง PNG
            await generatePng(previewRef.current, filename);
            
            console.log('✅ PNG downloaded successfully');
        } catch (error) {
            console.error('❌ Error downloading PNG:', error);
            alert('ไม่สามารถดาวน์โหลด PNG ได้: ' + (error instanceof Error ? error.message : 'Unknown error'));
        } finally {
            setDownloadingPdfId(null);
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

    // Filter เอกสารตาม archive status
    const currentList = documents.filter((item) => {
        const itemData = item as any;
        if (showArchived) {
            // แสดงเฉพาะเอกสารที่ archive
            return itemData.isArchived === true;
        } else {
            // แสดงเฉพาะเอกสารที่ยังไม่ archive
            return itemData.isArchived !== true;
        }
    });

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
        } else if (activeDocType === 'tax-invoice') {
            // ฟิลเตอร์สำหรับใบกำกับภาษี
            const taxInvoice = item as TaxInvoiceDocument;
            return (
                (taxInvoice.taxInvoiceNumber || '').toLowerCase().includes(searchLower) ||
                (taxInvoice.customerName || '').toLowerCase().includes(searchLower) ||
                (taxInvoice.companyName || '').toLowerCase().includes(searchLower) ||
                (taxInvoice.total ? taxInvoice.total.toString().includes(searchLower) : false) ||
                (taxInvoice.taxInvoiceDate ? formatDate(taxInvoice.taxInvoiceDate).toLowerCase().includes(searchLower) : false)
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
        } else if (activeDocType === 'memo') {
            const memo = item as MemoDocument;
            return (
                (memo.memoNumber || '').toLowerCase().includes(searchLower) ||
                (memo.subject || '').toLowerCase().includes(searchLower) ||
                (memo.fromName || '').toLowerCase().includes(searchLower) ||
                (memo.toName || '').toLowerCase().includes(searchLower) ||
                (memo.projectName || '').toLowerCase().includes(searchLower) ||
                (memo.date ? formatDate(memo.date).toLowerCase().includes(searchLower) : false)
            );
        } else if (activeDocType === 'variation-order') {
            const vo = item as VariationOrderDocument;
            return (
                (vo.voNumber || '').toLowerCase().includes(searchLower) ||
                (vo.subject || '').toLowerCase().includes(searchLower) ||
                (vo.customerName || '').toLowerCase().includes(searchLower) ||
                (vo.projectName || '').toLowerCase().includes(searchLower) ||
                (vo.date ? formatDate(vo.date).toLowerCase().includes(searchLower) : false)
            );
        } else if (activeDocType === 'subcontract') {
            // ฟิลเตอร์สำหรับสัญญาจ้างเหมาช่วง
            const subcontract = item as SubcontractDocument;
            return (
                (subcontract.contractNumber || '').toLowerCase().includes(searchLower) ||
                (subcontract.contractorName || '').toLowerCase().includes(searchLower) ||
                (subcontract.projectName || '').toLowerCase().includes(searchLower) ||
                (subcontract.companyName || '').toLowerCase().includes(searchLower) ||
                (subcontract.scopeOfWork || '').toLowerCase().includes(searchLower) ||
                (subcontract.contractDate ? formatDate(subcontract.contractDate).toLowerCase().includes(searchLower) : false)
            );
        } else {
            return true;
        }
    });

    // คำนวณ pagination
    const totalPages = Math.ceil(filteredList.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedList = filteredList.slice(startIndex, endIndex);

    // แสดงเมื่อไม่มีข้อมูล - แยก empty state สำหรับ tab ทั้งหมด และ Archive
    if (currentList.length === 0) {
        return (
            <div className="space-y-4">
                {/* Header พร้อม Tab Toggle แม้ไม่มีเอกสาร */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-4">
                    <div className="flex items-center gap-3">
                        <h2 className="text-lg sm:text-xl font-semibold text-slate-700 dark:text-slate-200">
                            ประวัติ{documentTypeName}
                        </h2>
                        {/* Tab Toggle: ทั้งหมด / Archive */}
                        <div className="flex items-center bg-gray-100 dark:bg-slate-700 rounded-lg p-0.5">
                            <button
                                onClick={() => setShowArchived(false)}
                                className={`px-3 py-1 text-xs sm:text-sm rounded-md transition-colors ${
                                    !showArchived 
                                        ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                                }`}
                            >
                                ทั้งหมด
                            </button>
                            <button
                                onClick={() => setShowArchived(true)}
                                className={`px-3 py-1 text-xs sm:text-sm rounded-md transition-colors flex items-center gap-1 ${
                                    showArchived 
                                        ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                                }`}
                            >
                                <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                                </svg>
                                Archive
                            </button>
                        </div>
                    </div>
                </div>
                
                {/* Empty State - แยกตาม tab ที่เลือก */}
                <div className="bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg p-8 text-center">
                    {showArchived ? (
                        // Empty state สำหรับ Archive tab
                        <>
                            <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                            </svg>
                            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">ไม่มีเอกสารที่ Archive</h3>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                เอกสารที่คุณ Archive จะแสดงที่นี่
                            </p>
                            <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                                💡 คุณสามารถ Archive เอกสารได้โดยกดปุ่ม "Archive" ที่เมนูของเอกสารใน tab "ทั้งหมด"
                            </p>
                            <button
                                onClick={() => setShowArchived(false)}
                                className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                                กลับไปดูเอกสารทั้งหมด
                            </button>
                        </>
                    ) : (
                        // Empty state สำหรับ tab ทั้งหมด
                        <>
                            <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">ไม่มีเอกสาร</h3>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                เริ่มต้นโดยการสร้าง{documentTypeName}ใหม่
                            </p>
                        </>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Document History Modal */}
            <DocumentHistoryModal
                isOpen={showHistoryModal}
                onClose={handleCloseHistoryModal}
                documentId={historyDocId}
                documentType={activeDocType}
                documentNumber={historyDocNumber}
            />

            {/* Share Link Modal */}
            <ShareLinkModal
                isOpen={showShareModal}
                onClose={handleCloseShareModal}
                documentId={shareDocId}
                documentType={activeDocType}
                documentNumber={shareDocNumber}
                companyId={currentCompany?.id}
            />

            {/* Version History Modal */}
            <VersionHistoryModal
                isOpen={showVersionModal}
                onClose={handleCloseVersionModal}
                documentId={versionDocId}
                documentType={activeDocType}
                documentNumber={versionDocNumber}
                onVersionRestored={fetchData}
            />

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
                        {activeDocType === 'tax-invoice' && (
                            <TaxInvoicePreview ref={previewRef} data={previewData as TaxInvoiceData} />
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
                        {activeDocType === 'variation-order' && (
                            <VariationOrderPreview ref={previewRef} data={previewData as VariationOrderData} />
                        )}
                        {activeDocType === 'subcontract' && (
                            <SubcontractPreview ref={previewRef} data={previewData as SubcontractData} />
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
                                            PDF
                                        </>
                                    )}
                                </button>
                                {/* ปุ่ม PNG */}
                                <button
                                    onClick={handleDownloadPngFromPreview}
                                    disabled={downloadingPdfId === previewDoc.id}
                                    className="px-4 py-2 bg-emerald-600 text-white text-sm rounded hover:bg-emerald-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="ดาวน์โหลด PNG"
                                >
                                    {downloadingPdfId === previewDoc.id ? (
                                        <>
                                            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            กำลังสร้าง...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                                            </svg>
                                            PNG
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
                                ) : activeDocType === 'tax-invoice' ? (
                                    <TaxInvoicePreview ref={previewModalRef} data={previewData as TaxInvoiceData} />
                                ) : activeDocType === 'quotation' ? (
                                    <QuotationPreview ref={previewModalRef} data={previewData as QuotationData} />
                                ) : activeDocType === 'purchase-order' ? (
                                    <PurchaseOrderPreview ref={previewModalRef} data={previewData as PurchaseOrderData} />
                                ) : activeDocType === 'memo' ? (
                                    <MemoPreview ref={previewModalRef} data={previewData as MemoData} />
                                ) : activeDocType === 'variation-order' ? (
                                    <VariationOrderPreview ref={previewModalRef} data={previewData as VariationOrderData} />
                                ) : activeDocType === 'subcontract' ? (
                                    <SubcontractPreview ref={previewModalRef} data={previewData as SubcontractData} />
                                ) : null}
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
                <div className="flex items-center gap-3">
                    <h2 className="text-lg sm:text-xl font-semibold text-slate-700 dark:text-slate-200">
                        ประวัติ{documentTypeName}
                    </h2>
                    {/* Tab Toggle: ทั้งหมด / Archive */}
                    <div className="flex items-center bg-gray-100 dark:bg-slate-700 rounded-lg p-0.5">
                        <button
                            onClick={() => setShowArchived(false)}
                            className={`px-3 py-1 text-xs sm:text-sm rounded-md transition-colors ${
                                !showArchived 
                                    ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                            }`}
                        >
                            ทั้งหมด
                        </button>
                        <button
                            onClick={() => setShowArchived(true)}
                            className={`px-3 py-1 text-xs sm:text-sm rounded-md transition-colors flex items-center gap-1 ${
                                showArchived 
                                    ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                            }`}
                        >
                            <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                            </svg>
                            Archive
                        </button>
                    </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    {/* Search/Filter Input */}
                    <div className="flex-1 sm:flex-none relative">
                        <input
                            type="text"
                            placeholder={`ค้นหา${activeDocType === 'delivery' ? 'เลขที่, โครงการ, จาก, ถึง' : activeDocType === 'warranty' ? 'หมายเลข, สินค้า, ลูกค้า' : activeDocType === 'invoice' ? 'เลขที่, ลูกค้า, ยอดรวม' : activeDocType === 'receipt' ? 'เลขที่, ลูกค้า, ยอดรวม, วิธีการชำระเงิน' : activeDocType === 'tax-invoice' ? 'เลขที่, ลูกค้า, ยอดรวม' : activeDocType === 'quotation' ? 'เลขที่, ลูกค้า, ยอดรวม' : activeDocType === 'purchase-order' ? 'เลขที่, ผู้ขาย, ยอดรวม' : activeDocType === 'variation-order' ? 'เลขที่, เรื่อง, ลูกค้า, โครงการ' : activeDocType === 'subcontract' ? 'เลขที่, เรื่อง, จาก, ถึง, โครงการ' : 'เลขที่, เรื่อง, จาก, ถึง, โครงการ'}`}
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
                                    onDownloadPng={() => handleDownloadPng(noteItem)}
                                    onCancel={() => setCancelConfirm({ id: noteItem.id!, docNumber: noteItem.docNumber })}
                                    onRestore={() => handleRestoreDocument(noteItem.id!)}
                                    onDelete={() => setDeleteConfirm({ type: 'delivery', id: noteItem.id! })}
                                    onPreview={() => handleShowPreview(noteItem)}
                                    // ฟีเจอร์ใหม่: Copy, Lock, Archive
                                    onCopy={() => handleCopyDocument(noteItem.id!)}
                                    onLock={() => handleLockDocument(noteItem.id!)}
                                    onUnlock={() => handleUnlockDocument(noteItem.id!)}
                                    onArchive={() => handleArchiveDocument(noteItem.id!)}
                                    onUnarchive={() => handleUnarchiveDocument(noteItem.id!)}
                                    onShowHistory={() => handleShowHistory(noteItem.id!, noteItem.docNumber)}
                                    onShare={() => handleShowShare(noteItem.id!, noteItem.docNumber)}
                                    onShowVersions={() => handleShowVersions(noteItem.id!, noteItem.docNumber)}
                                    // สถานะ
                                    isCancelled={isCancelled}
                                    isDownloading={downloadingPdfId === noteItem.id}
                                    isCancelling={cancellingId === noteItem.id}
                                    isRestoring={restoringId === noteItem.id}
                                    // สถานะฟีเจอร์ใหม่
                                    isCopying={copyingId === noteItem.id}
                                    isLocked={(noteItem as any).isLocked || false}
                                    isLocking={lockingId === noteItem.id}
                                    isUnlocking={unlockingId === noteItem.id}
                                    isArchived={(noteItem as any).isArchived || false}
                                    isArchiving={archivingId === noteItem.id}
                                    isUnarchiving={unarchivingId === noteItem.id}
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
                                    onDownloadPng={() => handleDownloadPng(cardItem)}
                                    onDelete={() => setDeleteConfirm({ type: 'warranty', id: cardItem.id! })}
                                    onPreview={() => handleShowPreview(cardItem)}
                                    // ฟีเจอร์ใหม่: Copy, Lock, Archive
                                    onCopy={() => handleCopyDocument(cardItem.id!)}
                                    onLock={() => handleLockDocument(cardItem.id!)}
                                    onUnlock={() => handleUnlockDocument(cardItem.id!)}
                                    onArchive={() => handleArchiveDocument(cardItem.id!)}
                                    onUnarchive={() => handleUnarchiveDocument(cardItem.id!)}
                                    onShowHistory={() => handleShowHistory(cardItem.id!, cardItem.warrantyNumber || '')}
                                    onShare={() => handleShowShare(cardItem.id!, cardItem.warrantyNumber || '')}
                                    onShowVersions={() => handleShowVersions(cardItem.id!, cardItem.warrantyNumber || '')}
                                    // สถานะฟีเจอร์ใหม่
                                    isCopying={copyingId === cardItem.id}
                                    isLocked={(cardItem as any).isLocked || false}
                                    isLocking={lockingId === cardItem.id}
                                    isUnlocking={unlockingId === cardItem.id}
                                    isArchived={(cardItem as any).isArchived || false}
                                    isArchiving={archivingId === cardItem.id}
                                    isUnarchiving={unarchivingId === cardItem.id}
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
                                    onDownloadPng={() => handleDownloadPng(invoiceItem)}
                                    onCancel={() => setCancelConfirm({ id: invoiceItem.id!, docNumber: invoiceItem.invoiceNumber })}
                                    onRestore={() => handleRestoreDocument(invoiceItem.id!)}
                                    onDelete={() => setDeleteConfirm({ type: 'invoice', id: invoiceItem.id! })}
                                    onPreview={() => handleShowPreview(invoiceItem)}
                                    // ฟีเจอร์ใหม่
                                    onCopy={() => handleCopyDocument(invoiceItem.id!)}
                                    onLock={() => handleLockDocument(invoiceItem.id!)}
                                    onUnlock={() => handleUnlockDocument(invoiceItem.id!)}
                                    onArchive={() => handleArchiveDocument(invoiceItem.id!)}
                                    onUnarchive={() => handleUnarchiveDocument(invoiceItem.id!)}
                                    onShowHistory={() => handleShowHistory(invoiceItem.id!, invoiceItem.invoiceNumber)}
                                    onShare={() => handleShowShare(invoiceItem.id!, invoiceItem.invoiceNumber)}
                                    onShowVersions={() => handleShowVersions(invoiceItem.id!, invoiceItem.invoiceNumber)}
                                    isCancelled={isCancelled}
                                    isDownloading={downloadingPdfId === invoiceItem.id}
                                    isCancelling={cancellingId === invoiceItem.id}
                                    isRestoring={restoringId === invoiceItem.id}
                                    isCopying={copyingId === invoiceItem.id}
                                    isLocked={(invoiceItem as any).isLocked || false}
                                    isLocking={lockingId === invoiceItem.id}
                                    isUnlocking={unlockingId === invoiceItem.id}
                                    isArchived={(invoiceItem as any).isArchived || false}
                                    isArchiving={archivingId === invoiceItem.id}
                                    isUnarchiving={unarchivingId === invoiceItem.id}
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
                                    onDownloadPng={() => handleDownloadPng(receiptItem)}
                                    onDelete={() => setDeleteConfirm({ type: 'receipt', id: receiptItem.id! })}
                                    onPreview={() => handleShowPreview(receiptItem)}
                                    // ฟีเจอร์ใหม่
                                    onCopy={() => handleCopyDocument(receiptItem.id!)}
                                    onLock={() => handleLockDocument(receiptItem.id!)}
                                    onUnlock={() => handleUnlockDocument(receiptItem.id!)}
                                    onArchive={() => handleArchiveDocument(receiptItem.id!)}
                                    onUnarchive={() => handleUnarchiveDocument(receiptItem.id!)}
                                    onShowHistory={() => handleShowHistory(receiptItem.id!, receiptItem.receiptNumber)}
                                    onShare={() => handleShowShare(receiptItem.id!, receiptItem.receiptNumber)}
                                    onShowVersions={() => handleShowVersions(receiptItem.id!, receiptItem.receiptNumber)}
                                    isDownloading={downloadingPdfId === receiptItem.id}
                                    isCopying={copyingId === receiptItem.id}
                                    isLocked={(receiptItem as any).isLocked || false}
                                    isLocking={lockingId === receiptItem.id}
                                    isUnlocking={unlockingId === receiptItem.id}
                                    isArchived={(receiptItem as any).isArchived || false}
                                    isArchiving={archivingId === receiptItem.id}
                                    isUnarchiving={unarchivingId === receiptItem.id}
                                    showPreview={true}
                                    showOnHover={true}
                                />
                            </div>
                        </div>
                    );
                    })
                ) : activeDocType === 'tax-invoice' ? (
                    // รายการใบกำกับภาษี
                    paginatedList.map((taxInvoice) => {
                        const taxInvoiceItem = taxInvoice as TaxInvoiceDocument;
                        const isCancelled = (taxInvoiceItem as any).documentStatus === 'cancelled';
                        return (
                        <div key={taxInvoiceItem.id} className={`group bg-white dark:bg-slate-800 border rounded-lg p-3 sm:p-4 hover:shadow-md transition-shadow ${isCancelled ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20' : 'border-gray-200 dark:border-slate-700'}`}>
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
                                    <h3 className={`text-base sm:text-lg font-semibold break-words ${isCancelled ? 'text-gray-500 dark:text-gray-400 line-through' : 'text-gray-900 dark:text-gray-100'}`}>{taxInvoiceItem.customerName || 'ไม่ระบุลูกค้า'}</h3>
                                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                                        <div>
                                            <span className="font-medium">เลขที่:</span>{' '}
                                            <button
                                                onClick={() => handleShowPreview(taxInvoiceItem)}
                                                className={`hover:underline cursor-pointer break-all ${isCancelled ? 'text-gray-500' : 'text-blue-600 hover:text-blue-800'}`}
                                                title="คลิกเพื่อดูตัวอย่าง"
                                            >
                                                {taxInvoiceItem.taxInvoiceNumber}
                                            </button>
                                        </div>
                                        <div>
                                            <span className="font-medium">วันที่ออก:</span> {taxInvoiceItem.taxInvoiceDate ? formatDate(taxInvoiceItem.taxInvoiceDate) : 'ไม่ระบุ'}
                                        </div>
                                        <div>
                                            <span className="font-medium">ผู้ขาย:</span> <span className="break-words">{taxInvoiceItem.companyName || 'ไม่ระบุ'}</span>
                                        </div>
                                        <div>
                                            <span className="font-medium">ยอดรวม:</span> <span className={`font-bold ${isCancelled ? 'text-gray-500' : 'text-green-600'}`}>{(taxInvoiceItem.total ?? 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท</span>
                                        </div>
                                        <div>
                                            <span className="font-medium">ภาษี:</span> <span className={`${isCancelled ? 'text-gray-500' : 'text-orange-600'}`}>{(taxInvoiceItem.taxAmount ?? 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท</span>
                                        </div>
                                    </div>
                                    <div className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                                        บันทึกเมื่อ: {formatDate(taxInvoiceItem.createdAt)}
                                    </div>
                                </div>
                                {/* ปุ่ม Actions - ใช้ DocumentActions component */}
                                <DocumentActions
                                    onEdit={() => onLoadDocument(taxInvoiceItem)}
                                    onDownload={() => handleDownloadPdf(taxInvoiceItem)}
                                    onDownloadPng={() => handleDownloadPng(taxInvoiceItem)}
                                    onCancel={() => setCancelConfirm({ id: taxInvoiceItem.id!, docNumber: taxInvoiceItem.taxInvoiceNumber })}
                                    onRestore={() => handleRestoreDocument(taxInvoiceItem.id!)}
                                    onDelete={() => setDeleteConfirm({ type: 'tax-invoice', id: taxInvoiceItem.id! })}
                                    onPreview={() => handleShowPreview(taxInvoiceItem)}
                                    // ฟีเจอร์ใหม่
                                    onCopy={() => handleCopyDocument(taxInvoiceItem.id!)}
                                    onLock={() => handleLockDocument(taxInvoiceItem.id!)}
                                    onUnlock={() => handleUnlockDocument(taxInvoiceItem.id!)}
                                    onArchive={() => handleArchiveDocument(taxInvoiceItem.id!)}
                                    onUnarchive={() => handleUnarchiveDocument(taxInvoiceItem.id!)}
                                    onShowHistory={() => handleShowHistory(taxInvoiceItem.id!, taxInvoiceItem.taxInvoiceNumber)}
                                    onShare={() => handleShowShare(taxInvoiceItem.id!, taxInvoiceItem.taxInvoiceNumber)}
                                    onShowVersions={() => handleShowVersions(taxInvoiceItem.id!, taxInvoiceItem.taxInvoiceNumber)}
                                    isCancelled={isCancelled}
                                    isDownloading={downloadingPdfId === taxInvoiceItem.id}
                                    isCancelling={cancellingId === taxInvoiceItem.id}
                                    isRestoring={restoringId === taxInvoiceItem.id}
                                    isCopying={copyingId === taxInvoiceItem.id}
                                    isLocked={(taxInvoiceItem as any).isLocked || false}
                                    isLocking={lockingId === taxInvoiceItem.id}
                                    isUnlocking={unlockingId === taxInvoiceItem.id}
                                    isArchived={(taxInvoiceItem as any).isArchived || false}
                                    isArchiving={archivingId === taxInvoiceItem.id}
                                    isUnarchiving={unarchivingId === taxInvoiceItem.id}
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
                                    onDownloadPng={() => handleDownloadPng(quotationItem)}
                                    onDelete={() => setDeleteConfirm({ type: 'quotation', id: quotationItem.id! })}
                                    onPreview={() => handleShowPreview(quotationItem)}
                                    // ฟีเจอร์ใหม่
                                    onCopy={() => handleCopyDocument(quotationItem.id!)}
                                    onLock={() => handleLockDocument(quotationItem.id!)}
                                    onUnlock={() => handleUnlockDocument(quotationItem.id!)}
                                    onArchive={() => handleArchiveDocument(quotationItem.id!)}
                                    onUnarchive={() => handleUnarchiveDocument(quotationItem.id!)}
                                    onShowHistory={() => handleShowHistory(quotationItem.id!, quotationItem.quotationNumber)}
                                    onShare={() => handleShowShare(quotationItem.id!, quotationItem.quotationNumber)}
                                    onShowVersions={() => handleShowVersions(quotationItem.id!, quotationItem.quotationNumber)}
                                    isDownloading={downloadingPdfId === quotationItem.id}
                                    isCopying={copyingId === quotationItem.id}
                                    isLocked={(quotationItem as any).isLocked || false}
                                    isLocking={lockingId === quotationItem.id}
                                    isUnlocking={unlockingId === quotationItem.id}
                                    isArchived={(quotationItem as any).isArchived || false}
                                    isArchiving={archivingId === quotationItem.id}
                                    isUnarchiving={unarchivingId === quotationItem.id}
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
                                    onDownloadPng={() => handleDownloadPng(poItem)}
                                    onDelete={() => setDeleteConfirm({ type: 'purchase-order', id: poItem.id! })}
                                    onPreview={() => handleShowPreview(poItem)}
                                    // ฟีเจอร์ใหม่
                                    onCopy={() => handleCopyDocument(poItem.id!)}
                                    onLock={() => handleLockDocument(poItem.id!)}
                                    onUnlock={() => handleUnlockDocument(poItem.id!)}
                                    onArchive={() => handleArchiveDocument(poItem.id!)}
                                    onUnarchive={() => handleUnarchiveDocument(poItem.id!)}
                                    onShowHistory={() => handleShowHistory(poItem.id!, poItem.purchaseOrderNumber)}
                                    onShare={() => handleShowShare(poItem.id!, poItem.purchaseOrderNumber)}
                                    onShowVersions={() => handleShowVersions(poItem.id!, poItem.purchaseOrderNumber)}
                                    isDownloading={downloadingPdfId === poItem.id}
                                    isCopying={copyingId === poItem.id}
                                    isLocked={(poItem as any).isLocked || false}
                                    isLocking={lockingId === poItem.id}
                                    isUnlocking={unlockingId === poItem.id}
                                    isArchived={(poItem as any).isArchived || false}
                                    isArchiving={archivingId === poItem.id}
                                    isUnarchiving={unarchivingId === poItem.id}
                                    showPreview={true}
                                    showOnHover={true}
                                />
                            </div>
                        </div>
                    );
                    })
                ) : activeDocType === 'memo' ? (
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
                                    onDownloadPng={() => handleDownloadPng(memoItem)}
                                    onDelete={() => setDeleteConfirm({ type: 'memo', id: memoItem.id! })}
                                    onPreview={() => handleShowPreview(memoItem)}
                                    // ฟีเจอร์ใหม่
                                    onCopy={() => handleCopyDocument(memoItem.id!)}
                                    onLock={() => handleLockDocument(memoItem.id!)}
                                    onUnlock={() => handleUnlockDocument(memoItem.id!)}
                                    onArchive={() => handleArchiveDocument(memoItem.id!)}
                                    onUnarchive={() => handleUnarchiveDocument(memoItem.id!)}
                                    onShowHistory={() => handleShowHistory(memoItem.id!, memoItem.memoNumber)}
                                    onShare={() => handleShowShare(memoItem.id!, memoItem.memoNumber)}
                                    onShowVersions={() => handleShowVersions(memoItem.id!, memoItem.memoNumber)}
                                    isDownloading={downloadingPdfId === memoItem.id}
                                    isCopying={copyingId === memoItem.id}
                                    isLocked={(memoItem as any).isLocked || false}
                                    isLocking={lockingId === memoItem.id}
                                    isUnlocking={unlockingId === memoItem.id}
                                    isArchived={(memoItem as any).isArchived || false}
                                    isArchiving={archivingId === memoItem.id}
                                    isUnarchiving={unarchivingId === memoItem.id}
                                    showPreview={true}
                                    showOnHover={true}
                                />
                            </div>
                        </div>
                    );
                    })
                ) : activeDocType === 'variation-order' ? (
                    // รายการใบส่วนต่าง
                    paginatedList.map((vo) => {
                        const voItem = vo as VariationOrderDocument;
                        return (
                        <div key={voItem.id} className="group bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-3 sm:p-4 hover:shadow-md transition-shadow">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 break-words">{voItem.subject || 'ไม่ระบุเรื่อง'}</h3>
                                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                                        <div>
                                            <span className="font-medium">เลขที่:</span>{' '}
                                            <button
                                                onClick={() => handleShowPreview(voItem)}
                                                className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer break-all"
                                                title="คลิกเพื่อดูตัวอย่าง"
                                            >
                                                {voItem.voNumber}
                                            </button>
                                        </div>
                                        <div>
                                            <span className="font-medium">วันที่ออก:</span> {voItem.date ? formatDate(voItem.date) : 'ไม่ระบุ'}
                                        </div>
                                        <div>
                                            <span className="font-medium">ลูกค้า:</span> <span className="break-words">{voItem.customerName || 'ไม่ระบุ'}</span>
                                        </div>
                                        <div>
                                            <span className="font-medium">โครงการ:</span> <span className="break-words">{voItem.projectName || 'ไม่ระบุ'}</span>
                                        </div>
                                        <div>
                                            <span className="font-medium">ยอดสุทธิ:</span>{' '}
                                            <span className={`font-bold ${(voItem.netDifference ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {(voItem.netDifference ?? 0) >= 0 ? '+' : ''}{(voItem.netDifference ?? 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท
                                            </span>
                                        </div>
                                    </div>
                                    <div className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                                        บันทึกเมื่อ: {formatDate(voItem.createdAt)}
                                    </div>
                                </div>
                                {/* ปุ่ม Actions - ใช้ DocumentActions component */}
                                <DocumentActions
                                    onEdit={() => onLoadDocument(voItem)}
                                    onDownload={() => handleDownloadPdf(voItem)}
                                    onDownloadPng={() => handleDownloadPng(voItem)}
                                    onDelete={() => setDeleteConfirm({ type: 'variation-order', id: voItem.id! })}
                                    onPreview={() => handleShowPreview(voItem)}
                                    // ฟีเจอร์ใหม่
                                    onCopy={() => handleCopyDocument(voItem.id!)}
                                    onLock={() => handleLockDocument(voItem.id!)}
                                    onUnlock={() => handleUnlockDocument(voItem.id!)}
                                    onArchive={() => handleArchiveDocument(voItem.id!)}
                                    onUnarchive={() => handleUnarchiveDocument(voItem.id!)}
                                    onShowHistory={() => handleShowHistory(voItem.id!, voItem.voNumber)}
                                    onShare={() => handleShowShare(voItem.id!, voItem.voNumber)}
                                    onShowVersions={() => handleShowVersions(voItem.id!, voItem.voNumber)}
                                    isDownloading={downloadingPdfId === voItem.id}
                                    isCopying={copyingId === voItem.id}
                                    isLocked={(voItem as any).isLocked || false}
                                    isLocking={lockingId === voItem.id}
                                    isUnlocking={unlockingId === voItem.id}
                                    isArchived={(voItem as any).isArchived || false}
                                    isArchiving={archivingId === voItem.id}
                                    isUnarchiving={unarchivingId === voItem.id}
                                    showPreview={true}
                                    showOnHover={true}
                                />
                            </div>
                        </div>
                    );
                    })
                ) : activeDocType === 'subcontract' ? (
                    // รายการสัญญาจ้างเหมาช่วง (สัญญาช่าง)
                    paginatedList.map((contract) => {
                        const contractItem = contract as SubcontractDocument;
                        const isCancelled = (contractItem as any).documentStatus === 'cancelled';
                        return (
                        <div key={contractItem.id} className={`group bg-white dark:bg-slate-800 border rounded-lg p-3 sm:p-4 hover:shadow-md transition-shadow ${isCancelled ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20' : 'border-gray-200 dark:border-slate-700'}`}>
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
                                    <h3 className={`text-base sm:text-lg font-semibold break-words ${isCancelled ? 'text-gray-500 dark:text-gray-400 line-through' : 'text-gray-900 dark:text-gray-100'}`}>
                                        {contractItem.scopeOfWork || contractItem.projectName || 'ไม่ระบุเรื่อง'}
                                    </h3>
                                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                                        <div>
                                            <span className="font-medium">เลขที่:</span>{' '}
                                            <button
                                                onClick={() => handleShowPreview(contractItem)}
                                                className={`hover:underline cursor-pointer break-all ${isCancelled ? 'text-gray-500' : 'text-blue-600 hover:text-blue-800'}`}
                                                title="คลิกเพื่อดูตัวอย่าง"
                                            >
                                                {contractItem.contractNumber || 'ไม่ระบุ'}
                                            </button>
                                        </div>
                                        <div>
                                            <span className="font-medium">วันที่ออก:</span> {contractItem.contractDate ? formatDate(contractItem.contractDate) : 'ไม่ระบุ'}
                                        </div>
                                        <div>
                                            <span className="font-medium">จาก:</span> <span className="break-words">{contractItem.companyName || 'ไม่ระบุ'}</span>
                                        </div>
                                        <div>
                                            <span className="font-medium">ถึง:</span> <span className="break-words">{contractItem.contractorName || 'ไม่ระบุ'}</span>
                                        </div>
                                        <div>
                                            <span className="font-medium">โครงการ:</span> <span className="break-words">{contractItem.projectName || 'ไม่ระบุ'}</span>
                                        </div>
                                        <div>
                                            <span className="font-medium">ค่าจ้างรวม:</span>{' '}
                                            <span className={`font-bold ${isCancelled ? 'text-gray-500' : 'text-indigo-600'}`}>
                                                {(contractItem.totalContractAmount ?? 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท
                                            </span>
                                        </div>
                                    </div>
                                    <div className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                                        บันทึกเมื่อ: {formatDate(contractItem.createdAt)}
                                    </div>
                                </div>
                                {/* ปุ่ม Actions - ใช้ DocumentActions component */}
                                <DocumentActions
                                    onEdit={() => onLoadDocument(contractItem)}
                                    onDownload={() => handleDownloadPdf(contractItem)}
                                    onDownloadPng={() => handleDownloadPng(contractItem)}
                                    onCancel={() => setCancelConfirm({ id: contractItem.id!, docNumber: contractItem.contractNumber || '' })}
                                    onRestore={() => handleRestoreDocument(contractItem.id!)}
                                    onDelete={() => setDeleteConfirm({ type: 'subcontract', id: contractItem.id! })}
                                    onPreview={() => handleShowPreview(contractItem)}
                                    // ฟีเจอร์ใหม่
                                    onCopy={() => handleCopyDocument(contractItem.id!)}
                                    onLock={() => handleLockDocument(contractItem.id!)}
                                    onUnlock={() => handleUnlockDocument(contractItem.id!)}
                                    onArchive={() => handleArchiveDocument(contractItem.id!)}
                                    onUnarchive={() => handleUnarchiveDocument(contractItem.id!)}
                                    onShowHistory={() => handleShowHistory(contractItem.id!, contractItem.contractNumber || '')}
                                    onShare={() => handleShowShare(contractItem.id!, contractItem.contractNumber || '')}
                                    onShowVersions={() => handleShowVersions(contractItem.id!, contractItem.contractNumber || '')}
                                    isCancelled={isCancelled}
                                    isDownloading={downloadingPdfId === contractItem.id}
                                    isCancelling={cancellingId === contractItem.id}
                                    isRestoring={restoringId === contractItem.id}
                                    isCopying={copyingId === contractItem.id}
                                    isLocked={(contractItem as any).isLocked || false}
                                    isLocking={lockingId === contractItem.id}
                                    isUnlocking={unlockingId === contractItem.id}
                                    isArchived={(contractItem as any).isArchived || false}
                                    isArchiving={archivingId === contractItem.id}
                                    isUnarchiving={unarchivingId === contractItem.id}
                                    showPreview={true}
                                    showOnHover={true}
                                />
                            </div>
                        </div>
                    );
                    })
                ) : null}
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
