import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { DeliveryNoteData, WarrantyData, InvoiceData, ReceiptData, LogoType } from './types';
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
import HistoryList from './components/HistoryList';
import AcceptInvitationPage from './components/AcceptInvitationPage';
import SuperAdminDashboard from './components/SuperAdminDashboard';
import CookieConsentModal from './components/CookieConsentModal';
import { generatePdf } from './services/pdfGenerator';
import { saveDeliveryNote, saveWarrantyCard, saveInvoice, saveReceipt } from './services/firestore';
import type { DeliveryNoteDocument, WarrantyDocument, InvoiceDocument, ReceiptDocument } from './services/firestore';

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

type DocType = 'delivery' | 'warranty' | 'invoice' | 'receipt';
type ViewMode = 'form' | 'history';
type Notification = { show: boolean; message: string; type: 'success' | 'info' | 'error' };

// Main Content Component ที่ใช้ useCompany hook
const AppContent: React.FC = () => {
    const { currentCompany } = useCompany(); // ใช้ CompanyContext
    const [deliveryData, setDeliveryData] = useState<DeliveryNoteData>(initialDeliveryData);
    const [warrantyData, setWarrantyData] = useState<WarrantyData>(initialWarrantyData);
    const [invoiceData, setInvoiceData] = useState<InvoiceData>(initialInvoiceData);
    const [receiptData, setReceiptData] = useState<ReceiptData>(initialReceiptData);
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
    
    // Sync shared logo กับ delivery, warranty และ invoice data
    useEffect(() => {
        setDeliveryData(prev => ({
            ...prev,
            logo: sharedLogo,
            logoUrl: sharedLogoUrl,
            logoType: sharedLogoType,
        }));
        setWarrantyData(prev => ({
            ...prev,
            logo: sharedLogo,
            logoUrl: sharedLogoUrl,
            logoType: sharedLogoType,
        }));
        setInvoiceData(prev => ({
            ...prev,
            logo: sharedLogo,
            logoUrl: sharedLogoUrl,
            logoType: sharedLogoType,
        }));
        setReceiptData(prev => ({
            ...prev,
            logo: sharedLogo,
            logoUrl: sharedLogoUrl,
            logoType: sharedLogoType,
        }));
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

    // ฟังก์ชันบันทึกข้อมูลลง Firestore พร้อม companyId (รองรับทั้ง create และ update)
    const handleSaveToFirestore = useCallback(async () => {
        setIsSaving(true);
        
        const isEditMode = !!editingDocumentId;
        showToast(isEditMode ? 'กำลังอัปเดตเอกสาร...' : 'กำลังบันทึกเอกสารใหม่...', 'info');

        try {
            const companyId = currentCompany?.id; // ดึง companyId จาก context
            
            if (activeTab === 'delivery') {
                if (isEditMode) {
                    // อัปเดตเอกสารเดิม
                    const { updateDeliveryNote } = await import('./services/firestore');
                    await updateDeliveryNote(editingDocumentId, deliveryData);
                    showToast(`อัปเดตใบส่งมอบงานสำเร็จ`, 'success');
                } else {
                    // สร้างเอกสารใหม่
                    const id = await saveDeliveryNote(deliveryData, companyId);
                    showToast(`บันทึกใบส่งมอบงานสำเร็จ (ID: ${id})`, 'success');
                    setEditingDocumentId(id); // เปลี่ยนเป็น edit mode
                }
            } else if (activeTab === 'warranty') {
                if (isEditMode) {
                    // อัปเดตเอกสารเดิม
                    const { updateWarrantyCard } = await import('./services/firestore');
                    await updateWarrantyCard(editingDocumentId, warrantyData);
                    showToast(`อัปเดตใบรับประกันสำเร็จ`, 'success');
                } else {
                    // สร้างเอกสารใหม่
                    const id = await saveWarrantyCard(warrantyData, companyId);
                    showToast(`บันทึกใบรับประกันสำเร็จ (ID: ${id})`, 'success');
                    setEditingDocumentId(id); // เปลี่ยนเป็น edit mode
                }
            } else if (activeTab === 'invoice') {
                if (isEditMode) {
                    // อัปเดตเอกสารเดิม
                    const { updateInvoice } = await import('./services/firestore');
                    await updateInvoice(editingDocumentId, invoiceData);
                    showToast(`อัปเดตใบแจ้งหนี้สำเร็จ`, 'success');
                } else {
                    // สร้างเอกสารใหม่
                    const id = await saveInvoice(invoiceData, companyId);
                    showToast(`บันทึกใบแจ้งหนี้สำเร็จ (ID: ${id})`, 'success');
                    setEditingDocumentId(id); // เปลี่ยนเป็น edit mode
                }
            } else if (activeTab === 'receipt') {
                if (isEditMode) {
                    // อัปเดตเอกสารเดิม
                    const { updateReceipt } = await import('./services/firestore');
                    await updateReceipt(editingDocumentId, receiptData);
                    showToast(`อัปเดตใบเสร็จสำเร็จ`, 'success');
                } else {
                    // สร้างเอกสารใหม่
                    const id = await saveReceipt(receiptData, companyId);
                    showToast(`บันทึกใบเสร็จสำเร็จ (ID: ${id})`, 'success');
                    setEditingDocumentId(id); // เปลี่ยนเป็น edit mode
                }
            }
        } catch (error) {
            console.error('Failed to save to Firestore:', error);
            showToast('ไม่สามารถบันทึกข้อมูลได้', 'error');
        } finally {
            setIsSaving(false);
        }
    }, [activeTab, deliveryData, warrantyData, invoiceData, receiptData, currentCompany, editingDocumentId]);

    /**
     * สร้างชื่อไฟล์ PDF ตามรูปแบบ: prefix + ลูกค้า + Create date (YYMMDD) + UUID
     * @param type - ประเภทเอกสาร ('delivery' | 'warranty')
     * @param data - ข้อมูลเอกสาร
     * @returns ชื่อไฟล์ PDF
     */
    const generatePdfFilename = useCallback((type: 'delivery' | 'warranty' | 'invoice' | 'receipt', data: DeliveryNoteData | WarrantyData | InvoiceData | ReceiptData): string => {
        // สร้าง UUID (ใช้ crypto.randomUUID() หรือ fallback)
        const generateUUID = (): string => {
            if (typeof crypto !== 'undefined' && crypto.randomUUID) {
                return crypto.randomUUID();
            }
            // Fallback สำหรับ browser เก่า
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
                const r = Math.random() * 16 | 0;
                const v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        };

        // ทำความสะอาดชื่อลูกค้า (ลบอักขระพิเศษ เหลือแค่ a-z, A-Z, 0-9, และ _)
        const cleanCustomerName = (name: string): string => {
            return name
                .replace(/[^a-zA-Z0-9ก-๙]/g, '_') // แทนที่อักขระพิเศษด้วย _
                .replace(/_+/g, '_') // รวม _ หลายตัวเป็นตัวเดียว
                .replace(/^_|_$/g, '') // ลบ _ ที่ต้นและท้าย
                .substring(0, 50) // จำกัดความยาวไม่เกิน 50 ตัวอักษร
                || 'Customer'; // ถ้าไม่มีชื่อให้ใช้ 'Customer'
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

        if (type === 'delivery') {
            const deliveryData = data as DeliveryNoteData;
            const prefix = 'DN';
            const customerName = cleanCustomerName(deliveryData.toCompany || 'Customer');
            const dateStr = formatDateToYYMMDD(deliveryData.date);
            const uuid = generateUUID().substring(0, 8); // ใช้แค่ 8 ตัวแรกของ UUID
            
            return `${prefix}_${customerName}_${dateStr}_${uuid}.pdf`;
        } else if (type === 'warranty') {
            const warrantyData = data as WarrantyData;
            const prefix = 'WR';
            const customerName = cleanCustomerName(warrantyData.customerName || 'Customer');
            const dateStr = formatDateToYYMMDD(warrantyData.purchaseDate);
            const uuid = generateUUID().substring(0, 8); // ใช้แค่ 8 ตัวแรกของ UUID
            
            return `${prefix}_${customerName}_${dateStr}_${uuid}.pdf`;
        } else if (type === 'invoice') {
            const invoiceData = data as InvoiceData;
            const prefix = 'IN';
            const customerName = cleanCustomerName(invoiceData.customerName || 'Customer');
            const dateStr = formatDateToYYMMDD(invoiceData.invoiceDate);
            const uuid = generateUUID().substring(0, 8); // ใช้แค่ 8 ตัวแรกของ UUID
            
            return `${prefix}_${customerName}_${dateStr}_${uuid}.pdf`;
        } else {
            const receiptData = data as ReceiptData;
            const prefix = 'RC';
            const customerName = cleanCustomerName(receiptData.customerName || 'Customer');
            const dateStr = formatDateToYYMMDD(receiptData.receiptDate);
            const uuid = generateUUID().substring(0, 8); // ใช้แค่ 8 ตัวแรกของ UUID
            
            return `${prefix}_${customerName}_${dateStr}_${uuid}.pdf`;
        }
    }, []);

    // ฟังก์ชัน Export PDF
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
        const filename = generatePdfFilename(activeTab, activeTab === 'delivery' ? deliveryData : activeTab === 'warranty' ? warrantyData : activeTab === 'invoice' ? invoiceData : receiptData);

        try {
            await generatePdf(printableAreaRef.current, filename);
            showToast('สร้างไฟล์ PDF เรียบร้อยแล้ว', 'success');
        } catch (error) {
            console.error('Failed to generate PDF:', error);
            showToast('ไม่สามารถสร้างไฟล์ PDF ได้', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [activeTab, deliveryData, warrantyData, invoiceData, receiptData, currentCompany, generatePdfFilename]);

    // ฟังก์ชันโหลดเอกสารจาก History (สำหรับ Edit)
    const handleLoadDocument = useCallback((doc: DeliveryNoteDocument | WarrantyDocument | InvoiceDocument | ReceiptDocument) => {
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
        } else {
            // เป็น ReceiptDocument
            setReceiptData({
                ...doc,
                receiptDate: doc.receiptDate || null,
            });
            setActiveTab('receipt');
        }
        setViewMode('form');
        showToast('โหลดเอกสารสำเร็จ - โหมดแก้ไข', 'info');
    }, []);

    // ฟังก์ชันสร้างฟอร์มใหม่
    const handleCreateNewForm = useCallback(() => {
        // Clear edit mode
        setEditingDocumentId(null);
        
        if (activeTab === 'delivery') {
            setDeliveryData(getInitialDeliveryData());
        } else if (activeTab === 'warranty') {
            setWarrantyData({
                logo: sharedLogo,
                logoUrl: sharedLogoUrl,
                logoType: sharedLogoType,
                companyName: '',
                companyAddress: '',
                companyPhone: '',
                companyEmail: '',
                companyWebsite: '',
                projectName: '',
                customerName: '',
                customerPhone: '',
                customerAddress: '',
                serviceName: '',
                productDetail: '',
                houseModel: '',
                batchNo: '',
                showBatchNo: false,
                purchaseDate: new Date(),
                warrantyPeriod: '',
                warrantyEndDate: null,
                terms: '',
                useMultipleWarrantyTypes: false,
                warrantyGeneral: false,
                warrantyRoof: false,
                warrantyStructure: false,
                warrantyNumber: '',
                issueDate: new Date(),
                issuedBy: ''
            });
        } else if (activeTab === 'invoice') {
            setInvoiceData({
                ...initialInvoiceData,
                logo: sharedLogo,
                logoUrl: sharedLogoUrl,
                logoType: sharedLogoType,
            });
        } else {
            setReceiptData({
                ...initialReceiptData,
                logo: sharedLogo,
                logoUrl: sharedLogoUrl,
                logoType: sharedLogoType,
            });
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
                <div className={`fixed top-5 right-5 ${notificationColors[notification.type]} text-white py-2 px-4 rounded-lg shadow-lg z-50 animate-fade-in-down`}>
                    {notification.message}
                </div>
            )}
            <Header />
            <main className="p-4 md:p-8 max-w-7xl mx-auto">
                {/* View Mode Selector */}
                <div className="mb-6 flex justify-center">
                    <div className="inline-flex rounded-md shadow-sm" role="group">
                        <button
                            onClick={() => setViewMode('form')}
                            className={`px-6 py-2 text-sm font-medium rounded-l-lg border ${
                                viewMode === 'form'
                                    ? 'bg-indigo-600 text-white border-indigo-600'
                                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                            }`}
                        >
                            📝 สร้างเอกสาร
                        </button>
                        <button
                            onClick={() => setViewMode('history')}
                            className={`px-6 py-2 text-sm font-medium rounded-r-lg border-t border-r border-b ${
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
                    <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-8">
                        {/* Form Section */}
                        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg mb-8 lg:mb-0">
                            {/* Edit Mode Indicator */}
                            {editingDocumentId && (
                                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
                                    <div className="flex items-center">
                                        <span className="text-amber-700 font-medium">✏️ โหมดแก้ไข</span>
                                        <span className="ml-2 text-sm text-amber-600">กำลังแก้ไขเอกสาร: {editingDocumentId}</span>
                                    </div>
                                    <button
                                        onClick={handleCreateNewForm}
                                        className="text-sm px-3 py-1 bg-white border border-amber-300 rounded hover:bg-amber-50 text-amber-700"
                                    >
                                        🆕 สร้างเอกสารใหม่
                                    </button>
                                </div>
                            )}
                            
                            <div className="border-b border-gray-200">
                                <nav className="-mb-px flex space-x-4" aria-label="Tabs">
                                    <button
                                        onClick={() => setActiveTab('delivery')}
                                        className={`${activeTab === 'delivery' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
                                    >
                                        ใบส่งมอบงาน
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('warranty')}
                                        className={`${activeTab === 'warranty' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
                                    >
                                        ใบรับประกันสินค้า
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('invoice')}
                                        className={`${activeTab === 'invoice' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
                                    >
                                        ใบแจ้งหนี้
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('receipt')}
                                        className={`${activeTab === 'receipt' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
                                    >
                                        ใบเสร็จ
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
                            ) : (
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
                            )}
                        </div>
                        
                        {/* Preview Section */}
                        <div>
                            <div className="sticky top-8">
                                <div className="flex justify-between items-center mb-4 gap-2">
                                    <h2 className="text-xl font-semibold text-slate-700">ตัวอย่างเอกสาร</h2>
                                    <div className="flex gap-2 flex-wrap">
                                        <button
                                            type="button"
                                            onClick={handleCreateNewForm}
                                            className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                                            </svg>
                                            ฟอร์มใหม่
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleSaveToFirestore}
                                            disabled={isSaving}
                                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-green-300 disabled:cursor-not-allowed"
                                        >
                                            {isSaving ? (
                                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                                    <path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h5a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h5v5.586l-1.293-1.293zM9 4a1 1 0 012 0v2H9V4z" />
                                                </svg>
                                            )}
                                            {isSaving ? 'กำลังบันทึก...' : (editingDocumentId ? '💾 อัปเดต' : '💾 บันทึก')}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleExportPdf}
                                            disabled={isLoading}
                                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300 disabled:cursor-not-allowed"
                                        >
                                            {isLoading ? (
                                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
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
                                    ) : (
                                        <ReceiptPreview ref={printableAreaRef} data={receiptData} />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    // History View
                    <div className="bg-white p-6 rounded-lg shadow-lg">
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
