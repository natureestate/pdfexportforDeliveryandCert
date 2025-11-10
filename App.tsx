import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { DeliveryNoteData, WarrantyData, InvoiceData, ReceiptData, TaxInvoiceData, QuotationData, PurchaseOrderData, MemoData, LogoType } from './types';
import { AuthProvider } from './contexts/AuthContext';
import { CompanyProvider, useCompany } from './contexts/CompanyContext';
import ProtectedRoute from './components/ProtectedRoute';
import Header from './components/Header';
import DeliveryForm from './components/DeliveryForm';
import DocumentPreview from './components/DocumentPreview';
import WarrantyForm from './components/WarrantyForm';
import WarrantyPreview from './components/WarrantyPreview';
import InvoiceForm from './components/InvoiceForm';
import InvoicePreview from './components/InvoicePreview';
import ReceiptForm from './components/ReceiptForm';
import ReceiptPreview from './components/ReceiptPreview';
import TaxInvoiceForm from './components/TaxInvoiceForm';
import TaxInvoicePreview from './components/TaxInvoicePreview';
import QuotationForm from './components/QuotationForm';
import QuotationPreview from './components/QuotationPreview';
import PurchaseOrderForm from './components/PurchaseOrderForm';
import PurchaseOrderPreview from './components/PurchaseOrderPreview';
import MemoForm from './components/MemoForm';
import MemoPreview from './components/MemoPreview';
import HistoryList from './components/HistoryList';
import AcceptInvitationPage from './components/AcceptInvitationPage';
import SuperAdminDashboard from './components/SuperAdminDashboard';
import CookieConsentModal from './components/CookieConsentModal';
import { generatePdf } from './services/pdfGenerator';
import { saveDeliveryNote, saveWarrantyCard, saveInvoice, saveReceipt, saveTaxInvoice, saveQuotation, savePurchaseOrder } from './services/firestore';
import type { DeliveryNoteDocument, WarrantyDocument, InvoiceDocument, ReceiptDocument, TaxInvoiceDocument, QuotationDocument, PurchaseOrderDocument, MemoDocument } from './services/firestore';
import { DOCUMENT_REGISTRY, generatePdfFilename as generatePdfFilenameFromRegistry, saveOrUpdateDocument, type DocType } from './utils/documentRegistry';

const getInitialDeliveryData = (): DeliveryNoteData => ({
    logo: null,
    fromCompany: '',
    fromAddress: '',
    toCompany: '',
    toAddress: '',
    docNumber: '', // จะถูก auto-generate ใน DeliveryForm
    date: new Date(),
    project: '',
    items: [
        { description: '', quantity: 1, unit: 'งาน', notes: '' },
    ],
    senderName: '',
    receiverName: '',
});

const initialDeliveryData = getInitialDeliveryData();

const initialWarrantyData: WarrantyData = {
    logo: null,
    // ข้อมูลบริษัท
    companyName: '',
    companyAddress: '',
    companyPhone: '',
    companyEmail: '',
    companyWebsite: '',
    // ข้อมูลลูกค้า/โครงการ
    projectName: '',
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    // ข้อมูลสินค้า/บริการ
    serviceName: '',
    productDetail: '',
    houseModel: '',
    batchNo: '',
    showBatchNo: false, // เพิ่มฟิลด์ใหม่: ไม่แสดง Batch No. โดย default
    purchaseDate: new Date(),
    // การรับประกัน
    warrantyPeriod: '',
    warrantyEndDate: null,
    terms: '',
    // การรับประกันแบบงานรับสร้างบ้าน
    useMultipleWarrantyTypes: false, // เพิ่มฟิลด์ใหม่: ไม่ใช้การรับประกันหลายประเภทโดย default
    warrantyGeneral: false,
    warrantyRoof: false,
    warrantyStructure: false,
    // ข้อมูลเอกสาร
    warrantyNumber: '',
    issueDate: new Date(),
    issuedBy: ''
};

const initialInvoiceData: InvoiceData = {
    logo: null,
    // ข้อมูลบริษัทผู้ขาย
    companyName: '',
    companyAddress: '',
    companyPhone: '',
    companyEmail: '',
    companyWebsite: '',
    companyTaxId: '',
    // ข้อมูลลูกค้า/ผู้ซื้อ
    customerName: '',
    customerAddress: '',
    customerPhone: '',
    customerEmail: '',
    customerTaxId: '',
    // ข้อมูลเอกสาร
    invoiceNumber: '', // จะถูก auto-generate ใน InvoiceForm
    invoiceDate: new Date(),
    dueDate: null,
    referenceNumber: '',
    // รายการสินค้า/บริการ
    items: [
        { description: '', quantity: 1, unit: 'ชิ้น', unitPrice: 0, amount: 0, notes: '' },
    ],
    // ข้อมูลการชำระเงิน
    subtotal: 0,
    taxRate: 7, // Default 7%
    taxAmount: 0,
    discount: 0,
    total: 0,
    // ข้อมูลเพิ่มเติม
    paymentTerms: '',
    notes: '',
    issuedBy: '',
};

const initialReceiptData: ReceiptData = {
    logo: null,
    // ข้อมูลบริษัทผู้ขาย
    companyName: '',
    companyAddress: '',
    companyPhone: '',
    companyEmail: '',
    companyWebsite: '',
    companyTaxId: '',
    // ข้อมูลลูกค้า/ผู้ซื้อ
    customerName: '',
    customerAddress: '',
    customerPhone: '',
    customerEmail: '',
    customerTaxId: '',
    // ข้อมูลเอกสาร
    receiptNumber: '', // จะถูก auto-generate ใน ReceiptForm
    receiptDate: new Date(),
    referenceNumber: '',
    // รายการสินค้า/บริการ
    items: [
        { description: '', quantity: 1, unit: 'ชิ้น', unitPrice: 0, amount: 0, notes: '' },
    ],
    // ข้อมูลการชำระเงิน
    subtotal: 0,
    taxRate: 7, // Default 7%
    taxAmount: 0,
    discount: 0,
    total: 0,
    // ข้อมูลการรับเงิน
    paymentMethod: '',
    paidAmount: 0,
    changeAmount: 0,
    // ข้อมูลเพิ่มเติม
    notes: '',
    issuedBy: '',
};

const initialTaxInvoiceData: TaxInvoiceData = {
    logo: null,
    // ข้อมูลบริษัทผู้ขาย
    companyName: '',
    companyAddress: '',
    companyPhone: '',
    companyEmail: '',
    companyWebsite: '',
    companyTaxId: '',
    // ข้อมูลลูกค้า/ผู้ซื้อ
    customerName: '',
    customerAddress: '',
    customerPhone: '',
    customerEmail: '',
    customerTaxId: '',
    // ข้อมูลเอกสาร
    taxInvoiceNumber: '', // จะถูก auto-generate ใน TaxInvoiceForm
    taxInvoiceDate: new Date(),
    referenceNumber: '',
    // รายการสินค้า/บริการ
    items: [
        { description: '', quantity: 1, unit: 'ชิ้น', unitPrice: 0, amount: 0, notes: '' },
    ],
    // ข้อมูลการชำระเงิน
    subtotal: 0,
    taxRate: 7, // Default 7%
    taxAmount: 0,
    discount: 0,
    total: 0,
    // ข้อมูลการรับเงิน
    paymentMethod: '',
    paidAmount: 0,
    changeAmount: 0,
    // ข้อมูลเพิ่มเติม
    notes: '',
    issuedBy: '',
};

const initialQuotationData: QuotationData = {
    logo: null,
    // ข้อมูลบริษัทผู้เสนอราคา
    companyName: '',
    companyAddress: '',
    companyPhone: '',
    companyEmail: '',
    companyWebsite: '',
    companyTaxId: '',
    // ข้อมูลลูกค้า/ผู้รับเสนอราคา
    customerName: '',
    customerAddress: '',
    customerPhone: '',
    customerEmail: '',
    customerTaxId: '',
    // ข้อมูลเอกสาร
    quotationNumber: '', // จะถูก auto-generate ใน QuotationForm
    quotationDate: new Date(),
    validUntilDate: null,
    referenceNumber: '',
    // รายการสินค้า/บริการ
    items: [
        { description: '', quantity: 1, unit: 'ชิ้น', unitPrice: 0, amount: 0, notes: '' },
    ],
    // ข้อมูลการเสนอราคา
    subtotal: 0,
    taxRate: 7, // Default 7%
    taxAmount: 0,
    discount: 0,
    total: 0,
    // ข้อมูลเพิ่มเติม
    paymentTerms: '',
    deliveryTerms: '',
    notes: '',
    issuedBy: '',
};

const initialPurchaseOrderData: PurchaseOrderData = {
    logo: null,
    // ข้อมูลบริษัทผู้สั่งซื้อ
    companyName: '',
    companyAddress: '',
    companyPhone: '',
    companyEmail: '',
    companyWebsite: '',
    companyTaxId: '',
    // ข้อมูลผู้ขาย/ผู้จำหน่าย
    supplierName: '',
    supplierAddress: '',
    supplierPhone: '',
    supplierEmail: '',
    supplierTaxId: '',
    // ข้อมูลเอกสาร
    purchaseOrderNumber: '', // จะถูก auto-generate ใน PurchaseOrderForm
    purchaseOrderDate: new Date(),
    expectedDeliveryDate: null,
    referenceNumber: '',
    // รายการสินค้า/บริการ
    items: [
        { description: '', quantity: 1, unit: 'ชิ้น', unitPrice: 0, amount: 0, notes: '' },
    ],
    // ข้อมูลการสั่งซื้อ
    subtotal: 0,
    taxRate: 7, // Default 7%
    taxAmount: 0,
    discount: 0,
    total: 0,
    // ข้อมูลเพิ่มเติม
    paymentTerms: '',
    deliveryTerms: '',
    notes: '',
    issuedBy: '',
};

const initialMemoData: MemoData = {
    logo: null,
    // ข้อมูลบริษัทผู้ออกเอกสาร
    companyName: '',
    companyAddress: '',
    companyPhone: '',
    companyEmail: '',
    companyWebsite: '',
    // ส่วนที่ 1: หัวกระดาษ
    memoNumber: '', // จะถูก auto-generate ใน MemoForm
    date: new Date(),
    fromName: '',
    fromPosition: '',
    toName: '',
    toPosition: '',
    cc: '',
    subject: '',
    // ส่วนที่ 2: การอ้างอิงโครงการ
    projectName: '',
    projectId: '',
    referenceDocument: '',
    // ส่วนที่ 3: เนื้อหา
    purpose: '',
    details: '',
    reason: '',
    // ส่วนที่ 4: การดำเนินการ
    actionRequired: '',
    deadline: null,
    contactPerson: '',
    contactPhone: '',
    // ส่วนที่ 5: การลงนาม
    issuedByName: '',
    issuedByPosition: '',
    // ส่วนสำหรับผู้รับ
    requireResponse: false,
    responseReceived: false,
};

type ViewMode = 'form' | 'history';
type Notification = { show: boolean; message: string; type: 'success' | 'info' | 'error' };

// Main Content Component ที่ใช้ useCompany hook
const AppContent: React.FC = () => {
    const { currentCompany } = useCompany(); // ใช้ CompanyContext
    const [deliveryData, setDeliveryData] = useState<DeliveryNoteData>(initialDeliveryData);
    const [warrantyData, setWarrantyData] = useState<WarrantyData>(initialWarrantyData);
    const [invoiceData, setInvoiceData] = useState<InvoiceData>(initialInvoiceData);
    const [receiptData, setReceiptData] = useState<ReceiptData>(initialReceiptData);
    const [taxInvoiceData, setTaxInvoiceData] = useState<TaxInvoiceData>(initialTaxInvoiceData);
    const [quotationData, setQuotationData] = useState<QuotationData>(initialQuotationData);
    const [purchaseOrderData, setPurchaseOrderData] = useState<PurchaseOrderData>(initialPurchaseOrderData);
    const [memoData, setMemoData] = useState<MemoData>(initialMemoData);
    const [activeTab, setActiveTab] = useState<DocType>('delivery');
    const [viewMode, setViewMode] = useState<ViewMode>('form');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [notification, setNotification] = useState<Notification>({ show: false, message: '', type: 'info' });
    const printableAreaRef = useRef<HTMLDivElement>(null);
    
    // Edit Mode - track ว่ากำลัง edit document เดิมหรือสร้างใหม่
    const [editingDocumentId, setEditingDocumentId] = useState<string | null>(null);
    
    // Shared Logo State - ใช้ร่วมกันระหว่างทั้ง 2 แท็บ
    const [sharedLogo, setSharedLogo] = useState<string | null>(null);
    const [sharedLogoUrl, setSharedLogoUrl] = useState<string | null>(null);
    const [sharedLogoType, setSharedLogoType] = useState<LogoType>('default');
    
    // Sync shared logo กับ document data ทั้งหมด
    // Refactored: ใช้ loop แทนการเขียนซ้ำ
    useEffect(() => {
        const updateLogo = (prev: any) => ({
            ...prev,
            logo: sharedLogo,
            logoUrl: sharedLogoUrl,
            logoType: sharedLogoType,
        });
        
        setDeliveryData(updateLogo);
        setWarrantyData(updateLogo);
        setInvoiceData(updateLogo);
        setReceiptData(updateLogo);
        setTaxInvoiceData(updateLogo);
        setQuotationData(updateLogo);
        setPurchaseOrderData(updateLogo);
        setMemoData(updateLogo);
    }, [sharedLogo, sharedLogoUrl, sharedLogoType]);

    // Sync ข้อมูลบริษัทจาก currentCompany ไปยัง form data
    useEffect(() => {
        if (currentCompany) {
            console.log('📝 [App] Syncing company data to forms:', currentCompany);
            
            // Sync ไปยัง DeliveryForm (ข้อมูลผู้ส่ง)
            setDeliveryData(prev => ({
                ...prev,
                fromCompany: currentCompany.name,
                fromAddress: currentCompany.address || '',
                fromPhone: currentCompany.phone || '',
                fromEmail: currentCompany.email || '',
                fromWebsite: currentCompany.website || '',
            }));

            // Sync ไปยัง WarrantyForm (ข้อมูลบริษัท)
            setWarrantyData(prev => ({
                ...prev,
                companyName: currentCompany.name,
                companyAddress: currentCompany.address || '',
                companyPhone: currentCompany.phone || '',
                companyEmail: currentCompany.email || '',
                companyWebsite: currentCompany.website || '',
            }));

            // Sync ไปยัง InvoiceForm (ข้อมูลบริษัทผู้ขาย)
            setInvoiceData(prev => ({
                ...prev,
                companyName: currentCompany.name,
                companyAddress: currentCompany.address || '',
                companyPhone: currentCompany.phone || '',
                companyEmail: currentCompany.email || '',
                companyWebsite: currentCompany.website || '',
            }));

            // Sync ไปยัง ReceiptForm (ข้อมูลบริษัทผู้ขาย)
            setReceiptData(prev => ({
                ...prev,
                companyName: currentCompany.name,
                companyAddress: currentCompany.address || '',
                companyPhone: currentCompany.phone || '',
                companyEmail: currentCompany.email || '',
                companyWebsite: currentCompany.website || '',
            }));

            // Sync ไปยัง TaxInvoiceForm (ข้อมูลบริษัทผู้ขาย)
            setTaxInvoiceData(prev => ({
                ...prev,
                companyName: currentCompany.name,
                companyAddress: currentCompany.address || '',
                companyPhone: currentCompany.phone || '',
                companyEmail: currentCompany.email || '',
                companyWebsite: currentCompany.website || '',
            }));

            // Sync ไปยัง QuotationForm (ข้อมูลบริษัทผู้เสนอราคา)
            setQuotationData(prev => ({
                ...prev,
                companyName: currentCompany.name,
                companyAddress: currentCompany.address || '',
                companyPhone: currentCompany.phone || '',
                companyEmail: currentCompany.email || '',
                companyWebsite: currentCompany.website || '',
            }));

            // Sync ไปยัง PurchaseOrderForm (ข้อมูลบริษัทผู้สั่งซื้อ)
            setPurchaseOrderData(prev => ({
                ...prev,
                companyName: currentCompany.name,
                companyAddress: currentCompany.address || '',
                companyPhone: currentCompany.phone || '',
                companyEmail: currentCompany.email || '',
                companyWebsite: currentCompany.website || '',
            }));

            // Sync ไปยัง MemoForm (ข้อมูลบริษัทผู้ออกเอกสาร)
            setMemoData(prev => ({
                ...prev,
                companyName: currentCompany.name,
                companyAddress: currentCompany.address || '',
                companyPhone: currentCompany.phone || '',
                companyEmail: currentCompany.email || '',
                companyWebsite: currentCompany.website || '',
            }));
        }
    }, [currentCompany]);

    // 🔥 Sync logo จาก currentCompany เมื่อเปลี่ยนบริษัท
    useEffect(() => {
        const loadCompanyLogo = async () => {
            if (currentCompany) {
                console.log('🎨 [App] Loading company logo:', {
                    logoUrl: currentCompany.logoUrl,
                    logoType: currentCompany.logoType,
                    defaultLogoUrl: currentCompany.defaultLogoUrl
                });

                // ถ้าบริษัทมี logo ที่อัปโหลดไว้ ให้โหลดมาใช้
                if (currentCompany.logoUrl && currentCompany.logoType === 'uploaded') {
                    try {
                        // แปลง Storage URL เป็น Base64 เพื่อหลีกเลี่ยงปัญหา CORS
                        const { convertStorageUrlToBase64 } = await import('./services/logoStorage');
                        const base64Logo = await convertStorageUrlToBase64(currentCompany.logoUrl);
                        
                        if (base64Logo) {
                            console.log('✅ [App] โหลด logo จาก Storage สำเร็จ');
                            setSharedLogo(base64Logo);
                            setSharedLogoUrl(currentCompany.logoUrl);
                            setSharedLogoType('uploaded');
                        } else {
                            console.warn('⚠️  [App] แปลง logo เป็น Base64 ไม่สำเร็จ, ใช้ default logo');
                            setSharedLogo(null);
                            setSharedLogoUrl(null);
                            setSharedLogoType('default');
                        }
                    } catch (error) {
                        console.error('❌ [App] โหลด logo ล้มเหลว:', error);
                        setSharedLogo(null);
                        setSharedLogoUrl(null);
                        setSharedLogoType('default');
                    }
                } else {
                    // ถ้าไม่มี logo หรือใช้ default ให้รีเซ็ตเป็น default
                    console.log('📝 [App] ใช้ default logo');
                    setSharedLogo(null);
                    setSharedLogoUrl(null);
                    setSharedLogoType('default');
                }
            }
        };

        loadCompanyLogo();
    }, [currentCompany]);

    /**
     * ตั้งค่า default logo ของ company
     */
    const handleSetDefaultLogo = async (logoUrl: string) => {
        if (!currentCompany?.id) {
            throw new Error('ไม่พบข้อมูลบริษัท');
        }

        const { setCompanyDefaultLogo } = await import('./services/companies');
        await setCompanyDefaultLogo(currentCompany.id, logoUrl);
        
        // รีเฟรช company context เพื่อให้ได้ defaultLogoUrl ใหม่
        // (ในอนาคตอาจต้องเพิ่ม refreshCompanies ใน CompanyContext)
        showToast('ตั้งค่า default logo สำเร็จ', 'success');
    };
    
    useEffect(() => {
        if (notification.show) {
            const timer = setTimeout(() => {
                setNotification({ ...notification, show: false });
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    const showToast = (message: string, type: 'success' | 'info' | 'error') => {
        setNotification({ show: true, message, type });
    };

    // Helper function สำหรับดึงข้อมูลตาม activeTab
    // ต้องประกาศก่อน handleSaveToFirestore เพื่อให้สามารถใช้งานได้
    const getCurrentData = useCallback((): DocumentData => {
        switch (activeTab) {
            case 'delivery':
                return deliveryData;
            case 'warranty':
                return warrantyData;
            case 'invoice':
                return invoiceData;
            case 'receipt':
                return receiptData;
            case 'tax-invoice':
                return taxInvoiceData;
            case 'quotation':
                return quotationData;
            case 'purchase-order':
                return purchaseOrderData;
            case 'memo':
                return memoData;
        }
    }, [activeTab, deliveryData, warrantyData, invoiceData, receiptData, taxInvoiceData, quotationData, purchaseOrderData, memoData]);

    // ฟังก์ชันบันทึกข้อมูลลง Firestore พร้อม companyId (รองรับทั้ง create และ update)
    // Refactored: ใช้ Document Registry Pattern
    const handleSaveToFirestore = useCallback(async () => {
        setIsSaving(true);
        
        const isEditMode = !!editingDocumentId;
        showToast(isEditMode ? 'กำลังอัปเดตเอกสาร...' : 'กำลังบันทึกเอกสารใหม่...', 'info');

        try {
            const companyId = currentCompany?.id;
            
            // ดึงข้อมูลตาม activeTab และใช้ Document Registry เพื่อ save หรือ update
            const data = getCurrentData();
            const result = await saveOrUpdateDocument(activeTab, data, editingDocumentId, companyId);
            showToast(result.message, 'success');
            
            // ถ้าเป็น create mode ให้ set editingDocumentId
            if (!isEditMode) {
                setEditingDocumentId(result.id);
            }
        } catch (error) {
            console.error('Failed to save to Firestore:', error);
            showToast('ไม่สามารถบันทึกข้อมูลได้', 'error');
        } finally {
            setIsSaving(false);
        }
    }, [activeTab, getCurrentData, currentCompany, editingDocumentId]);

    /**
     * สร้างชื่อไฟล์ PDF ตามรูปแบบ: prefix + ลูกค้า + Create date (YYMMDD) + UUID
     * Refactored: ใช้ Document Registry
     */
    const generatePdfFilename = useCallback((type: DocType, data: DocumentData): string => {
        return generatePdfFilenameFromRegistry(type, data);
    }, []);

    // ฟังก์ชัน Export PDF
    // Refactored: ใช้ helper function
    const handleExportPdf = useCallback(async () => {
        if (!printableAreaRef.current) return;
        
        // ตรวจสอบ quota ก่อน export
        if (currentCompany?.id) {
            try {
                const { getQuota } = await import('./services/quota');
                const quota = await getQuota(currentCompany.id);
                
                // ตรวจสอบว่า Free plan สามารถ export PDF ได้หรือไม่
                if (!quota.features.exportPDF) {
                    showToast('❌ Free plan ไม่สามารถ Export PDF ได้ กรุณาอัพเกรดแผน', 'error');
                    return;
                }
            } catch (error) {
                console.error('Failed to check quota:', error);
                // ถ้าเช็ค quota ไม่ได้ ให้ดำเนินการต่อ (เพื่อไม่ให้ระบบหยุดทำงาน)
            }
        }
        
        setIsLoading(true);
        showToast('กำลังสร้าง PDF...', 'info');

        // สร้างชื่อไฟล์ตามรูปแบบใหม่: prefix + ลูกค้า + Create date (YYMMDD) + UUID
        // Refactored: ใช้ Document Registry และ helper function
        const data = getCurrentData();
        const filename = generatePdfFilename(activeTab, data);

        try {
            await generatePdf(printableAreaRef.current, filename);
            showToast('สร้างไฟล์ PDF เรียบร้อยแล้ว', 'success');
        } catch (error) {
            console.error('Failed to generate PDF:', error);
            showToast('ไม่สามารถสร้างไฟล์ PDF ได้', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [activeTab, getCurrentData, currentCompany, generatePdfFilename]);

    // ฟังก์ชันโหลดเอกสารจาก History (สำหรับ Edit)
    const handleLoadDocument = useCallback((doc: DeliveryNoteDocument | WarrantyDocument | InvoiceDocument | ReceiptDocument | TaxInvoiceDocument | QuotationDocument | PurchaseOrderDocument | MemoDocument) => {
        // โหลด logo จากเอกสาร
        if (doc.logoUrl || doc.logo) {
            setSharedLogo(doc.logo || null);
            setSharedLogoUrl(doc.logoUrl || null);
            setSharedLogoType(doc.logoType || 'default');
        }

        // Track document ID สำหรับ edit mode
        setEditingDocumentId(doc.id || null);

        if ('project' in doc) {
            // เป็น DeliveryNoteDocument
            setDeliveryData({
                ...doc,
                date: doc.date || null,
            });
            setActiveTab('delivery');
        } else if ('warrantyNumber' in doc) {
            // เป็น WarrantyDocument
            setWarrantyData({
                ...doc,
                purchaseDate: doc.purchaseDate || null,
            });
            setActiveTab('warranty');
        } else if ('invoiceNumber' in doc) {
            // เป็น InvoiceDocument
            setInvoiceData({
                ...doc,
                invoiceDate: doc.invoiceDate || null,
                dueDate: doc.dueDate || null,
            });
            setActiveTab('invoice');
        } else if ('receiptNumber' in doc) {
            // เป็น ReceiptDocument
            setReceiptData({
                ...doc,
                receiptDate: doc.receiptDate || null,
            });
            setActiveTab('receipt');
        } else if ('taxInvoiceNumber' in doc) {
            // เป็น TaxInvoiceDocument
            setTaxInvoiceData({
                ...doc,
                taxInvoiceDate: doc.taxInvoiceDate || null,
            });
            setActiveTab('tax-invoice');
        } else if ('quotationNumber' in doc) {
            // เป็น QuotationDocument
            setQuotationData({
                ...doc,
                quotationDate: doc.quotationDate || null,
                validUntilDate: doc.validUntilDate || null,
            });
            setActiveTab('quotation');
        } else if ('purchaseOrderNumber' in doc) {
            // เป็น PurchaseOrderDocument
            setPurchaseOrderData({
                ...doc,
                purchaseOrderDate: doc.purchaseOrderDate || null,
                expectedDeliveryDate: doc.expectedDeliveryDate || null,
            });
            setActiveTab('purchase-order');
        } else if ('memoNumber' in doc) {
            // เป็น MemoDocument
            setMemoData({
                ...doc,
                date: doc.date || null,
                deadline: doc.deadline || null,
                responseDate: doc.responseDate || null,
            });
            setActiveTab('memo');
        }
        setViewMode('form');
        showToast('โหลดเอกสารสำเร็จ - โหมดแก้ไข', 'info');
    }, []);

    // ฟังก์ชันสร้างฟอร์มใหม่
    // Refactored: ลด code duplication โดยใช้ helper function
    const handleCreateNewForm = useCallback(() => {
        // Clear edit mode
        setEditingDocumentId(null);
        
        // Helper function สำหรับเพิ่ม logo ให้กับ initial data
        const withLogo = <T extends { logo?: string | null; logoUrl?: string | null; logoType?: LogoType }>(data: T): T => ({
            ...data,
            logo: sharedLogo,
            logoUrl: sharedLogoUrl,
            logoType: sharedLogoType,
        });
        
        switch (activeTab) {
            case 'delivery':
                setDeliveryData(getInitialDeliveryData());
                break;
            case 'warranty':
                setWarrantyData({
                    ...initialWarrantyData,
                    ...withLogo({}),
                });
                break;
            case 'invoice':
                setInvoiceData(withLogo(initialInvoiceData));
                break;
            case 'receipt':
                setReceiptData(withLogo(initialReceiptData));
                break;
            case 'tax-invoice':
                setTaxInvoiceData(withLogo(initialTaxInvoiceData));
                break;
            case 'quotation':
                setQuotationData(withLogo(initialQuotationData));
                break;
            case 'purchase-order':
                setPurchaseOrderData(withLogo(initialPurchaseOrderData));
                break;
            case 'memo':
                setMemoData(withLogo(initialMemoData));
                break;
        }
        showToast('สร้างฟอร์มใหม่สำเร็จ', 'success');
    }, [activeTab, sharedLogo, sharedLogoUrl, sharedLogoType]);
    
    const notificationColors = {
        info: 'bg-blue-500',
        success: 'bg-green-500',
        error: 'bg-red-500',
    };

    return (
        <div className="bg-slate-100 min-h-screen text-slate-800">
            {notification.show && (
                <div className={`fixed top-5 right-2 sm:right-5 ${notificationColors[notification.type]} text-white py-2 px-3 sm:px-4 rounded-lg shadow-lg z-50 animate-fade-in-down text-sm sm:text-base max-w-[calc(100vw-1rem)] sm:max-w-none`}>
                    {notification.message}
                </div>
            )}
            <Header />
            <main className="p-3 sm:p-4 md:p-8 max-w-7xl mx-auto">
                {/* View Mode Selector */}
                <div className="mb-4 sm:mb-6 flex justify-center">
                    <div className="inline-flex rounded-md shadow-sm w-full sm:w-auto" role="group">
                        <button
                            onClick={() => setViewMode('form')}
                            className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 text-xs sm:text-sm font-medium rounded-l-lg border ${
                                viewMode === 'form'
                                    ? 'bg-indigo-600 text-white border-indigo-600'
                                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                            }`}
                        >
                            📝 สร้างเอกสาร
                        </button>
                        <button
                            onClick={() => setViewMode('history')}
                            className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 text-xs sm:text-sm font-medium rounded-r-lg border-t border-r border-b ${
                                viewMode === 'history'
                                    ? 'bg-indigo-600 text-white border-indigo-600'
                                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                            }`}
                        >
                            📋 ประวัติเอกสาร
                        </button>
                    </div>
                </div>

                {viewMode === 'form' ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-6 xl:gap-8">
                        {/* Form Section */}
                        <div className="bg-white p-3 sm:p-4 md:p-6 rounded-lg shadow-lg mb-6 lg:mb-0">
                            {/* Edit Mode Indicator */}
                            {editingDocumentId && (
                                <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-amber-50 border border-amber-200 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                    <div className="flex flex-col sm:flex-row sm:items-center min-w-0">
                                        <span className="text-amber-700 font-medium text-sm">✏️ โหมดแก้ไข</span>
                                        <span className="ml-0 sm:ml-2 text-xs sm:text-sm text-amber-600 truncate">กำลังแก้ไขเอกสาร: {editingDocumentId}</span>
                                    </div>
                                    <button
                                        onClick={handleCreateNewForm}
                                        className="text-xs sm:text-sm px-2 sm:px-3 py-1 bg-white border border-amber-300 rounded hover:bg-amber-50 text-amber-700 whitespace-nowrap"
                                    >
                                        🆕 สร้างเอกสารใหม่
                                    </button>
                                </div>
                            )}
                            
                            <div className="border-b border-gray-200 overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0 tab-menu-scroll">
                                <nav className="-mb-px flex space-x-2 sm:space-x-4 min-w-max" aria-label="Tabs">
                                    <button
                                        onClick={() => setActiveTab('delivery')}
                                        className={`${activeTab === 'delivery' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-3 sm:py-4 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors flex-shrink-0`}
                                    >
                                        ใบส่งมอบงาน
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('warranty')}
                                        className={`${activeTab === 'warranty' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-3 sm:py-4 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors flex-shrink-0`}
                                    >
                                        ใบรับประกันสินค้า
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('invoice')}
                                        className={`${activeTab === 'invoice' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-3 sm:py-4 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors flex-shrink-0`}
                                    >
                                        ใบแจ้งหนี้
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('receipt')}
                                        className={`${activeTab === 'receipt' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-3 sm:py-4 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors flex-shrink-0`}
                                    >
                                        ใบเสร็จ
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('tax-invoice')}
                                        className={`${activeTab === 'tax-invoice' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-3 sm:py-4 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors flex-shrink-0`}
                                    >
                                        ใบกำกับภาษี
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('quotation')}
                                        className={`${activeTab === 'quotation' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-3 sm:py-4 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors flex-shrink-0`}
                                    >
                                        ใบเสนอราคา
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('purchase-order')}
                                        className={`${activeTab === 'purchase-order' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-3 sm:py-4 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors flex-shrink-0`}
                                    >
                                        ใบสั่งซื้อ
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('memo')}
                                        className={`${activeTab === 'memo' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-3 sm:py-4 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors flex-shrink-0`}
                                    >
                                        ใบบันทึก
                                    </button>
                                </nav>
                            </div>
                            
                            {activeTab === 'delivery' ? (
                                <DeliveryForm
                                    data={deliveryData}
                                    setData={setDeliveryData}
                                    sharedLogo={sharedLogo}
                                    sharedLogoUrl={sharedLogoUrl}
                                    sharedLogoType={sharedLogoType}
                                    companyDefaultLogoUrl={currentCompany?.defaultLogoUrl}
                                    onLogoChange={(logo, logoUrl, logoType) => {
                                        setSharedLogo(logo);
                                        setSharedLogoUrl(logoUrl);
                                        setSharedLogoType(logoType);
                                    }}
                                    onSetDefaultLogo={handleSetDefaultLogo}
                                />
                            ) : activeTab === 'warranty' ? (
                                <WarrantyForm
                                    data={warrantyData}
                                    setData={setWarrantyData}
                                    sharedLogo={sharedLogo}
                                    sharedLogoUrl={sharedLogoUrl}
                                    sharedLogoType={sharedLogoType}
                                    companyDefaultLogoUrl={currentCompany?.defaultLogoUrl}
                                    onLogoChange={(logo, logoUrl, logoType) => {
                                        setSharedLogo(logo);
                                        setSharedLogoUrl(logoUrl);
                                        setSharedLogoType(logoType);
                                    }}
                                    onSetDefaultLogo={handleSetDefaultLogo}
                                />
                            ) : activeTab === 'invoice' ? (
                                <InvoiceForm
                                    data={invoiceData}
                                    setData={setInvoiceData}
                                    sharedLogo={sharedLogo}
                                    sharedLogoUrl={sharedLogoUrl}
                                    sharedLogoType={sharedLogoType}
                                    companyDefaultLogoUrl={currentCompany?.defaultLogoUrl}
                                    onLogoChange={(logo, logoUrl, logoType) => {
                                        setSharedLogo(logo);
                                        setSharedLogoUrl(logoUrl);
                                        setSharedLogoType(logoType);
                                    }}
                                    onSetDefaultLogo={handleSetDefaultLogo}
                                />
                            ) : activeTab === 'receipt' ? (
                                <ReceiptForm
                                    data={receiptData}
                                    setData={setReceiptData}
                                    sharedLogo={sharedLogo}
                                    sharedLogoUrl={sharedLogoUrl}
                                    sharedLogoType={sharedLogoType}
                                    companyDefaultLogoUrl={currentCompany?.defaultLogoUrl}
                                    onLogoChange={(logo, logoUrl, logoType) => {
                                        setSharedLogo(logo);
                                        setSharedLogoUrl(logoUrl);
                                        setSharedLogoType(logoType);
                                    }}
                                    onSetDefaultLogo={handleSetDefaultLogo}
                                />
                            ) : activeTab === 'tax-invoice' ? (
                                <TaxInvoiceForm
                                    data={taxInvoiceData}
                                    setData={setTaxInvoiceData}
                                    sharedLogo={sharedLogo}
                                    sharedLogoUrl={sharedLogoUrl}
                                    sharedLogoType={sharedLogoType}
                                    companyDefaultLogoUrl={currentCompany?.defaultLogoUrl}
                                    onLogoChange={(logo, logoUrl, logoType) => {
                                        setSharedLogo(logo);
                                        setSharedLogoUrl(logoUrl);
                                        setSharedLogoType(logoType);
                                    }}
                                    onSetDefaultLogo={handleSetDefaultLogo}
                                />
                            ) : activeTab === 'quotation' ? (
                                <QuotationForm
                                    data={quotationData}
                                    setData={setQuotationData}
                                    sharedLogo={sharedLogo}
                                    sharedLogoUrl={sharedLogoUrl}
                                    sharedLogoType={sharedLogoType}
                                    companyDefaultLogoUrl={currentCompany?.defaultLogoUrl}
                                    onLogoChange={(logo, logoUrl, logoType) => {
                                        setSharedLogo(logo);
                                        setSharedLogoUrl(logoUrl);
                                        setSharedLogoType(logoType);
                                    }}
                                    onSetDefaultLogo={handleSetDefaultLogo}
                                />
                            ) : activeTab === 'purchase-order' ? (
                                <PurchaseOrderForm
                                    data={purchaseOrderData}
                                    setData={setPurchaseOrderData}
                                    sharedLogo={sharedLogo}
                                    sharedLogoUrl={sharedLogoUrl}
                                    sharedLogoType={sharedLogoType}
                                    companyDefaultLogoUrl={currentCompany?.defaultLogoUrl}
                                    onLogoChange={(logo, logoUrl, logoType) => {
                                        setSharedLogo(logo);
                                        setSharedLogoUrl(logoUrl);
                                        setSharedLogoType(logoType);
                                    }}
                                    onSetDefaultLogo={handleSetDefaultLogo}
                                />
                            ) : (
                                <MemoForm
                                    data={memoData}
                                    setData={setMemoData}
                                    sharedLogo={sharedLogo}
                                    sharedLogoUrl={sharedLogoUrl}
                                    sharedLogoType={sharedLogoType}
                                    companyDefaultLogoUrl={currentCompany?.defaultLogoUrl}
                                    onLogoChange={(logo, logoUrl, logoType) => {
                                        setSharedLogo(logo);
                                        setSharedLogoUrl(logoUrl);
                                        setSharedLogoType(logoType);
                                    }}
                                    onSetDefaultLogo={handleSetDefaultLogo}
                                />
                            )}
                        </div>
                        
                        {/* Preview Section */}
                        <div>
                            <div className="sticky top-4 lg:top-8">
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3 sm:mb-4 gap-2 sm:gap-2">
                                    <h2 className="text-lg sm:text-xl font-semibold text-slate-700">ตัวอย่างเอกสาร</h2>
                                    <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
                                        <button
                                            type="button"
                                            onClick={handleCreateNewForm}
                                            className="inline-flex items-center justify-center px-3 py-2 border border-gray-300 text-xs sm:text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 sm:mr-2" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                                            </svg>
                                            ฟอร์มใหม่
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleSaveToFirestore}
                                            disabled={isSaving}
                                            className="inline-flex items-center justify-center px-3 sm:px-4 py-2 border border-transparent text-xs sm:text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-green-300 disabled:cursor-not-allowed"
                                        >
                                            {isSaving ? (
                                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 sm:mr-2" viewBox="0 0 20 20" fill="currentColor">
                                                    <path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h5a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h5v5.586l-1.293-1.293zM9 4a1 1 0 012 0v2H9V4z" />
                                                </svg>
                                            )}
                                            {isSaving ? 'กำลังบันทึก...' : (editingDocumentId ? '💾 อัปเดต' : '💾 บันทึก')}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleExportPdf}
                                            disabled={isLoading}
                                            className="inline-flex items-center justify-center px-3 sm:px-4 py-2 border border-transparent text-xs sm:text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300 disabled:cursor-not-allowed"
                                        >
                                            {isLoading ? (
                                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 sm:mr-2" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                                                </svg>
                                            )}
                                            {isLoading ? 'กำลังสร้าง...' : 'PDF'}
                                        </button>
                                    </div>
                                </div>
                                <div className="bg-white p-1 rounded-lg shadow-lg">
                                    {activeTab === 'delivery' ? (
                                        <DocumentPreview ref={printableAreaRef} data={deliveryData} />
                                    ) : activeTab === 'warranty' ? (
                                        <WarrantyPreview ref={printableAreaRef} data={warrantyData} />
                                    ) : activeTab === 'invoice' ? (
                                        <InvoicePreview ref={printableAreaRef} data={invoiceData} />
                                    ) : activeTab === 'receipt' ? (
                                        <ReceiptPreview ref={printableAreaRef} data={receiptData} />
                                    ) : activeTab === 'tax-invoice' ? (
                                        <TaxInvoicePreview ref={printableAreaRef} data={taxInvoiceData} />
                                    ) : activeTab === 'quotation' ? (
                                        <QuotationPreview ref={printableAreaRef} data={quotationData} />
                                    ) : activeTab === 'purchase-order' ? (
                                        <PurchaseOrderPreview ref={printableAreaRef} data={purchaseOrderData} />
                                    ) : (
                                        <MemoPreview ref={printableAreaRef} data={memoData} />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    // History View
                    <div className="bg-white p-3 sm:p-4 md:p-6 rounded-lg shadow-lg">
                        <HistoryList 
                            activeDocType={activeTab} 
                            onLoadDocument={handleLoadDocument}
                        />
                    </div>
                )}
            </main>
        </div>
    );
};

// Main App Component with Providers and Routing
const App: React.FC = () => {
    const [cookieConsent, setCookieConsent] = useState<string | null>(null);

    useEffect(() => {
        // ตรวจสอบ cookie consent เมื่อ app โหลด
        const consent = localStorage.getItem('pdpa-cookie-consent');
        setCookieConsent(consent);
    }, []);

    const handleCookieAccept = () => {
        setCookieConsent('accepted');
        console.log('✅ User accepted PDPA cookie consent');
    };

    const handleCookieDecline = () => {
        setCookieConsent('declined');
        console.log('⚠️ User declined PDPA cookie consent');
    };

    return (
        <AuthProvider>
            {/* Cookie Consent Modal */}
            {!cookieConsent && (
                <CookieConsentModal 
                    onAccept={handleCookieAccept}
                    onDecline={handleCookieDecline}
                />
            )}
            
            <Routes>
                {/* หน้ายอมรับคำเชิญ - ไม่ต้อง login ก่อน */}
                <Route path="/accept-invitation" element={<AcceptInvitationPage />} />
                
                {/* หน้า Super Admin - ต้อง login และเป็น Super Admin (ไม่ต้องมี CompanyProvider) */}
                <Route 
                    path="/superadmin/*" 
                    element={
                        <ProtectedRoute>
                            <SuperAdminDashboard />
                        </ProtectedRoute>
                    } 
                />
                
                {/* หน้าหลัก - ต้อง login และมี CompanyProvider */}
                <Route
                    path="*"
                    element={
                        <CompanyProvider>
                            <ProtectedRoute>
                                <AppContent />
                            </ProtectedRoute>
                        </CompanyProvider>
                    }
                />
            </Routes>
        </AuthProvider>
    );
};

export default App;
