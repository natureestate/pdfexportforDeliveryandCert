import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Package, Shield, FileText, Receipt, FileCheck, DollarSign, ShoppingCart, StickyNote, PlusCircle, FilePlus, History, Save, HardHat, Settings, LayoutDashboard, Users, BarChart2, Calendar } from 'lucide-react';
import { DeliveryNoteData, WarrantyData, InvoiceData, ReceiptData, TaxInvoiceData, QuotationData, PurchaseOrderData, MemoData, VariationOrderData, SubcontractData, LogoType, MenuItemConfig } from './types';
import { AuthProvider } from './contexts/AuthContext';
import { CompanyProvider, useCompany } from './contexts/CompanyContext';
import { MenuProvider, useMenu } from './contexts/MenuContext';
import { TabProvider, useTab } from './contexts/TabContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { TabConfig, TabType } from './types';
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
import VariationOrderForm from './components/VariationOrderForm';
import VariationOrderPreview from './components/VariationOrderPreview';
import SubcontractForm from './components/SubcontractForm';
import SubcontractPreview from './components/SubcontractPreview';
import HistoryList from './components/HistoryList';
import AcceptInvitationPage from './components/AcceptInvitationPage';
import SuperAdminDashboard from './components/SuperAdminDashboard';
import OnboardingPage from './components/OnboardingPage';
import CookieConsentModal from './components/CookieConsentModal';
import MenuSettingsModal from './components/MenuSettingsModal';
import VerificationPage from './components/VerificationPage';
import SignApprovalPage from './components/SignApprovalPage';
import UserMenuSettingsModal from './components/UserMenuSettingsModal';
import PricingPage from './components/PricingPage';
import SubscriptionManager from './components/SubscriptionManager';
import Dashboard from './components/Dashboard';
import CRMPage from './components/CRMPage';
import ReportsPage from './components/ReportsPage';
import CalendarPage from './components/CalendarPage';
import { generatePdf } from './services/pdfGenerator';
import { saveDeliveryNote, saveWarrantyCard, saveInvoice, saveReceipt, saveTaxInvoice, saveQuotation, savePurchaseOrder } from './services/firestore';
import type { DeliveryNoteDocument, WarrantyDocument, InvoiceDocument, ReceiptDocument, TaxInvoiceDocument, QuotationDocument, PurchaseOrderDocument, MemoDocument, VariationOrderDocument, SubcontractDocument } from './services/firestore';
import { DOCUMENT_REGISTRY, generatePdfFilename as generatePdfFilenameFromRegistry, saveOrUpdateDocument, type DocType, type DocumentData } from './utils/documentRegistry';
import { generateVerificationToken } from './services/verification';
import { generateSignToken } from './services/signatureService';

const getInitialDeliveryData = (): DeliveryNoteData => ({
    logo: null,
    fromCompany: '',
    fromAddress: '',
    toCompany: '',
    toAddress: '',
    toEmail: '',
    docNumber: '', // จะถูก auto-generate ใน DeliveryForm
    date: new Date(),
    project: '',
    items: [
        { description: '', quantity: 1, unit: 'งาน', notes: '' },
    ],
    senderName: '',
    receiverName: '',
    // Signature fields (QR Scan to Sign/Approve)
    signToken: generateSignToken(), // สร้าง Token สำหรับเซ็นชื่อรับมอบ
    signatureStatus: 'pending',     // สถานะการเซ็น: pending, signed, rejected
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
    customerEmail: '',
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

const initialVariationOrderData: VariationOrderData = {
    logo: null,
    // ข้อมูลบริษัทผู้ออกเอกสาร
    companyName: '',
    companyAddress: '',
    companyPhone: '',
    companyEmail: '',
    companyWebsite: '',
    companyTaxId: '',
    // ข้อมูลลูกค้า/โครงการ
    customerName: '',
    customerAddress: '',
    customerPhone: '',
    customerEmail: '',
    customerTaxId: '',
    // ส่วนหัวและข้อมูลอ้างอิง
    voNumber: '', // จะถูก auto-generate ใน VariationOrderForm
    date: new Date(),
    projectName: '',
    location: '',
    contractNumber: '',
    requestedBy: 'customer',
    // รายละเอียดการเปลี่ยนแปลง
    subject: '',
    originalScope: '',
    newScope: '',
    reasonForChange: '',
    // รายการงาน
    items: [],
    // สรุปผลกระทบด้านราคา
    newItemsSubtotal: 0,
    deductItemsSubtotal: 0,
    netDifference: 0,
    taxRate: 7,
    taxAmount: 0,
    totalAmount: 0,
    paymentNote: '',
    // สรุปผลกระทบด้านระยะเวลา
    hasTimeImpact: false,
    timeImpactDays: 0,
    timeImpactReason: '',
    // ส่วนอนุมัติ
    terms: '',
    customerApproverName: '',
    customerApproverDate: null,
    companyApproverName: '',
    companyApproverDate: null,
    // ข้อมูลเพิ่มเติม
    notes: '',
    issuedBy: '',
};

const initialSubcontractData: SubcontractData = {
    logo: null,
    // ข้อมูลผู้ว่าจ้าง (บริษัท)
    companyName: '',
    companyAddress: '',
    companyPhone: '',
    companyEmail: '',
    companyTaxId: '',
    // ข้อมูลผู้รับจ้าง (ช่าง)
    contractorName: '',
    contractorIdCard: '',
    contractorPhone: '',
    contractorAddress: '',
    // ข้อมูลเอกสารและสถานที่
    contractNumber: '', // จะถูก auto-generate ใน SubcontractForm
    contractDate: new Date(),
    contractLocation: '',
    projectName: '',
    projectLocation: '',
    // ข้อ 1: ลักษณะงานที่จ้าง
    scopeOfWork: '',
    items: [],
    materialNote: '',
    totalWorkAmount: 0,
    // ข้อ 2: ระยะเวลาการทำงาน
    showWorkPeriod: false, // Default เป็น off (ส่วนที่ 4)
    startDate: null,
    endDate: null,
    // ข้อ 3: การชำระเงินและการแบ่งงวดงาน
    totalContractAmount: 0,
    totalContractAmountText: '',
    paymentMilestones: [
        { milestone: 1, description: 'เบิกเงินล่วงหน้า (Advance) / เริ่มเข้าหน้างาน', percentage: 20, amount: 0 },
        { milestone: 2, description: 'เมื่อดำเนินการ 50% เสร็จสิ้น', percentage: 30, amount: 0 },
        { milestone: 3, description: 'เมื่อส่งมอบงานทั้งหมด และผ่านการตรวจรับ', percentage: 50, amount: 0 },
    ],
    // ข้อ 4: เครื่องมือและวัสดุอุปกรณ์
    showToolsSection: false, // Default เป็น off (ส่วนที่ 6)
    consumableResponsibility: 'contractor',
    // ข้อ 5: มาตรฐานงานและการรับประกัน
    showWarrantySection: false, // Default เป็น off (ส่วนที่ 7)
    defectFixDays: 7,
    warrantyMonths: 6,
    // ข้อ 6: การทิ้งงานและการปรับ
    showPenaltySection: false, // Default เป็น off (ส่วนที่ 8)
    abandonDays: 3,
    penaltyPerDay: 500,
    // ส่วนลงนาม
    employerSignName: '',
    contractorSignName: '',
    witnessName: '',
    // ข้อมูลเพิ่มเติม
    notes: '',
    issuedBy: '',
};

type ViewMode = 'form' | 'history' | 'dashboard' | 'crm' | 'reports' | 'calendar';
type Notification = { show: boolean; message: string; type: 'success' | 'info' | 'error' };

// Icon mapping สำหรับ dynamic menu rendering
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    Package,
    Shield,
    FileText,
    Receipt,
    FileCheck,
    DollarSign,
    ShoppingCart,
    StickyNote,
    PlusCircle,
    HardHat,
};

// Main Content Component ที่ใช้ useCompany hook
// Icon map สำหรับ Tab Menu - แมป icon name กับ component
const tabIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    LayoutDashboard,
    FilePlus,
    History,
    Users,
    BarChart2,
    Calendar,
};

const AppContent: React.FC = () => {
    const { t } = useTranslation(); // ใช้ i18n translations
    const { currentCompany } = useCompany(); // ใช้ CompanyContext
    const { visibleMenus, isAdmin: isMenuAdmin, refreshMenus } = useMenu(); // ใช้ MenuContext
    const { visibleTabs, isAdmin, canAccess, refreshTabs } = useTab(); // ใช้ TabContext
    const [deliveryData, setDeliveryData] = useState<DeliveryNoteData>(initialDeliveryData);
    const [warrantyData, setWarrantyData] = useState<WarrantyData>(initialWarrantyData);
    const [invoiceData, setInvoiceData] = useState<InvoiceData>(initialInvoiceData);
    const [receiptData, setReceiptData] = useState<ReceiptData>(initialReceiptData);
    const [taxInvoiceData, setTaxInvoiceData] = useState<TaxInvoiceData>(initialTaxInvoiceData);
    const [quotationData, setQuotationData] = useState<QuotationData>(initialQuotationData);
    const [purchaseOrderData, setPurchaseOrderData] = useState<PurchaseOrderData>(initialPurchaseOrderData);
    const [memoData, setMemoData] = useState<MemoData>(initialMemoData);
    const [variationOrderData, setVariationOrderData] = useState<VariationOrderData>(initialVariationOrderData);
    const [subcontractData, setSubcontractData] = useState<SubcontractData>(initialSubcontractData);
    const [activeTab, setActiveTab] = useState<DocType>('delivery');
    const [viewMode, setViewMode] = useState<ViewMode>('form');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [notification, setNotification] = useState<Notification>({ show: false, message: '', type: 'info' });
    const printableAreaRef = useRef<HTMLDivElement>(null);
    
    // Edit Mode - track ว่ากำลัง edit document เดิมหรือสร้างใหม่
    const [editingDocumentId, setEditingDocumentId] = useState<string | null>(null);
    
    // ตรวจสอบว่าเอกสารปัจจุบันถูกเซ็นแล้วหรือยัง (สำหรับ Lock Edit)
    const isCurrentDocumentSigned = activeTab === 'delivery' && deliveryData.signatureStatus === 'signed';
    
    // Menu Settings Modal
    const [showMenuSettings, setShowMenuSettings] = useState(false);
    const [showUserMenuSettings, setShowUserMenuSettings] = useState(false);
    
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
        setVariationOrderData(updateLogo);
        setSubcontractData(updateLogo);
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

            // Sync ไปยัง VariationOrderForm (ข้อมูลบริษัทผู้ออกเอกสาร)
            setVariationOrderData(prev => ({
                ...prev,
                companyName: currentCompany.name,
                companyAddress: currentCompany.address || '',
                companyPhone: currentCompany.phone || '',
                companyEmail: currentCompany.email || '',
                companyWebsite: currentCompany.website || '',
                companyTaxId: currentCompany.taxId || '',
            }));

            // Sync ไปยัง SubcontractForm (ข้อมูลผู้ว่าจ้าง)
            setSubcontractData(prev => ({
                ...prev,
                companyName: currentCompany.name,
                companyAddress: currentCompany.address || '',
                companyPhone: currentCompany.phone || '',
                companyEmail: currentCompany.email || '',
                companyTaxId: currentCompany.taxId || '',
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
            case 'variation-order':
                return variationOrderData;
            case 'subcontract':
                return subcontractData;
        }
    }, [activeTab, deliveryData, warrantyData, invoiceData, receiptData, taxInvoiceData, quotationData, purchaseOrderData, memoData, variationOrderData, subcontractData]);

    // ฟังก์ชันบันทึกข้อมูลลง Firestore พร้อม companyId (รองรับทั้ง create และ update)
    // Refactored: ใช้ Document Registry Pattern
    const handleSaveToFirestore = useCallback(async () => {
        setIsSaving(true);
        
        const isEditMode = !!editingDocumentId;
        showToast(isEditMode ? t('notifications.updatingDocument') : t('notifications.savingDocument'), 'info');

        try {
            const companyId = currentCompany?.id;
            
            // ดึงข้อมูลตาม activeTab
            let data = getCurrentData();
            
            // ถ้าเป็น create mode และยังไม่มี verificationToken ให้สร้างใหม่
            let newToken: string | null = null;
            if (!isEditMode && !(data as any).verificationToken) {
                newToken = generateVerificationToken();
                data = { ...data, verificationToken: newToken } as typeof data;
            }
            
            // ใช้ Document Registry เพื่อ save หรือ update
            const result = await saveOrUpdateDocument(activeTab, data, editingDocumentId, companyId);
            showToast(result.message, 'success');
            
            // ถ้าเป็น create mode ให้ set editingDocumentId และอัปเดต form state ด้วย verificationToken
            if (!isEditMode) {
                setEditingDocumentId(result.id);
                
                // อัปเดต form state ด้วย verificationToken เพื่อให้ QR Code แสดงทันที
                if (newToken) {
                    switch (activeTab) {
                        case 'delivery':
                            setDeliveryData(prev => ({ ...prev, verificationToken: newToken! }));
                            break;
                        case 'warranty':
                            setWarrantyData(prev => ({ ...prev, verificationToken: newToken! }));
                            break;
                        case 'invoice':
                            setInvoiceData(prev => ({ ...prev, verificationToken: newToken! }));
                            break;
                        case 'receipt':
                            setReceiptData(prev => ({ ...prev, verificationToken: newToken! }));
                            break;
                        case 'tax-invoice':
                            setTaxInvoiceData(prev => ({ ...prev, verificationToken: newToken! }));
                            break;
                        case 'quotation':
                            setQuotationData(prev => ({ ...prev, verificationToken: newToken! }));
                            break;
                        case 'purchase-order':
                            setPurchaseOrderData(prev => ({ ...prev, verificationToken: newToken! }));
                            break;
                        case 'memo':
                            setMemoData(prev => ({ ...prev, verificationToken: newToken! }));
                            break;
                        case 'variation-order':
                            setVariationOrderData(prev => ({ ...prev, verificationToken: newToken! }));
                            break;
                        case 'subcontract':
                            setSubcontractData(prev => ({ ...prev, verificationToken: newToken! }));
                            break;
                    }
                }
            }
        } catch (error) {
            console.error('Failed to save to Firestore:', error);
            showToast(t('notifications.saveError'), 'error');
        } finally {
            setIsSaving(false);
        }
    }, [activeTab, getCurrentData, currentCompany, editingDocumentId, t]);

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
                    showToast(`❌ ${t('notifications.freePlanNoPdf')}`, 'error');
                    return;
                }
            } catch (error) {
                console.error('Failed to check quota:', error);
                // ถ้าเช็ค quota ไม่ได้ ให้ดำเนินการต่อ (เพื่อไม่ให้ระบบหยุดทำงาน)
            }
        }
        
        setIsLoading(true);
        showToast(t('notifications.creatingPdf'), 'info');

        // สร้างชื่อไฟล์ตามรูปแบบใหม่: prefix + ลูกค้า + Create date (YYMMDD) + UUID
        // Refactored: ใช้ Document Registry และ helper function
        const data = getCurrentData();
        const filename = generatePdfFilename(activeTab, data);

        try {
            await generatePdf(printableAreaRef.current, filename);
            showToast(t('notifications.pdfCreated'), 'success');
        } catch (error) {
            console.error('Failed to generate PDF:', error);
            showToast(t('notifications.pdfError'), 'error');
        } finally {
            setIsLoading(false);
        }
    }, [activeTab, getCurrentData, currentCompany, generatePdfFilename, t]);

    // ฟังก์ชันโหลดเอกสารจาก History (สำหรับ Edit)
    const handleLoadDocument = useCallback((doc: DeliveryNoteDocument | WarrantyDocument | InvoiceDocument | ReceiptDocument | TaxInvoiceDocument | QuotationDocument | PurchaseOrderDocument | MemoDocument | VariationOrderDocument | SubcontractDocument) => {
        // ตรวจสอบว่าเอกสารถูกเซ็นแล้วหรือไม่ - ถ้าเซ็นแล้วให้โหลดแบบ View Only
        const isDocSigned = 'signatureStatus' in doc && doc.signatureStatus === 'signed';
        
        // โหลด logo จากเอกสาร
        if (doc.logoUrl || doc.logo) {
            setSharedLogo(doc.logo || null);
            setSharedLogoUrl(doc.logoUrl || null);
            setSharedLogoType(doc.logoType || 'default');
        }

        // Track document ID สำหรับ edit mode
        // ถ้าเอกสารเซ็นแล้ว ไม่ set editingDocumentId เพื่อป้องกันการ edit
        setEditingDocumentId(isDocSigned ? null : (doc.id || null));

        if ('project' in doc) {
            // เป็น DeliveryNoteDocument
            setDeliveryData({
                ...doc,
                date: doc.date || null,
            });
            setActiveTab('delivery');
            
            // แจ้งเตือนถ้าเอกสารถูกเซ็นแล้ว
            if (isDocSigned) {
                showToast('⚠️ เอกสารนี้ถูกเซ็นรับมอบแล้ว ไม่สามารถแก้ไขได้', 'warning');
                setViewMode('form'); // ไปหน้า form แต่เป็น view only mode
                return; // return ก่อนเพื่อไม่แสดง toast documentLoaded
            }
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
        } else if ('voNumber' in doc) {
            // เป็น VariationOrderDocument
            setVariationOrderData({
                ...doc,
                date: doc.date || null,
                customerApproverDate: doc.customerApproverDate || null,
                companyApproverDate: doc.companyApproverDate || null,
            });
            setActiveTab('variation-order');
        } else if ('contractNumber' in doc && 'contractorName' in doc) {
            // เป็น SubcontractDocument
            setSubcontractData({
                ...doc,
                contractDate: doc.contractDate || null,
                startDate: doc.startDate || null,
                endDate: doc.endDate || null,
            });
            setActiveTab('subcontract');
        }
        setViewMode('form');
        showToast(t('history.documentLoaded'), 'info');
    }, [t]);

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
            case 'variation-order':
                setVariationOrderData(withLogo(initialVariationOrderData));
                break;
            case 'subcontract':
                setSubcontractData(withLogo(initialSubcontractData));
                break;
        }
        showToast(t('notifications.newFormCreated'), 'success');
    }, [activeTab, sharedLogo, sharedLogoUrl, sharedLogoType, t]);
    
    const notificationColors = {
        info: 'bg-blue-500',
        success: 'bg-green-500',
        error: 'bg-red-500',
    };

    return (
        <div className="bg-slate-100 dark:bg-slate-900 min-h-screen text-slate-800 dark:text-slate-100 transition-colors duration-300">
            {notification.show && (
                <div className={`fixed top-5 right-2 sm:right-5 ${notificationColors[notification.type]} text-white py-2 px-3 sm:px-4 rounded-lg shadow-lg z-50 animate-fade-in-down text-sm sm:text-base max-w-[calc(100vw-1rem)] sm:max-w-none`}>
                    {notification.message}
                </div>
            )}
            <Header />
            <main className="p-3 sm:p-4 md:p-8 max-w-7xl mx-auto">
                {/* View Mode Selector - Dynamic Tab Rendering ตามสิทธิ์ */}
                <div className="mb-4 sm:mb-6 flex justify-center">
                    <div className="relative w-full sm:w-auto">
                        {/* Fade indicator ด้านซ้าย (mobile) */}
                        <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-slate-100 dark:from-slate-900 to-transparent z-10 pointer-events-none sm:hidden"></div>
                        
                        <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0 scrollbar-hide">
                            <div className="inline-flex rounded-md shadow-sm min-w-max" role="group">
                                {/* Dynamic Tab Rendering - แสดง tabs ตามสิทธิ์ของ user */}
                                {visibleTabs.map((tab, index) => {
                                    const TabIcon = tabIconMap[tab.icon];
                                    const isFirst = index === 0;
                                    const isLast = index === visibleTabs.length - 1;
                                    const isActive = viewMode === tab.id;
                                    
                                    return (
                                        <button
                                            key={tab.id}
                                            onClick={() => setViewMode(tab.id as ViewMode)}
                                            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium flex items-center justify-center gap-1.5 ${
                                                isFirst ? 'rounded-l-lg border' : isLast ? 'rounded-r-lg border' : 'border-t border-b'
                                            } ${
                                                isActive
                                                    ? 'bg-indigo-600 text-white border-indigo-600'
                                                    : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700'
                                            }`}
                                        >
                                            {TabIcon && <TabIcon className="w-4 h-4" />}
                                            <span className="hidden sm:inline">{tab.label}</span>
                                            <span className="sm:hidden">{tab.shortLabel}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        
                        {/* Fade indicator ด้านขวา (mobile) */}
                        <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-slate-100 dark:from-slate-900 to-transparent z-10 pointer-events-none sm:hidden"></div>
                    </div>
                </div>

                {viewMode === 'dashboard' ? (
                    // Dashboard View
                    <div className="bg-white dark:bg-slate-800 p-3 sm:p-4 md:p-6 rounded-lg shadow-lg transition-colors">
                        <Dashboard 
                            onNavigateToDocType={(docType) => {
                                setActiveTab(docType);
                                setViewMode('history');
                            }}
                            onQuickAction={(docType) => {
                                setActiveTab(docType);
                                setViewMode('form');
                            }}
                        />
                    </div>
                ) : viewMode === 'form' ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-6 xl:gap-8">
                        {/* Form Section */}
                        <div className="bg-white dark:bg-slate-800 p-3 sm:p-4 md:p-6 rounded-lg shadow-lg mb-6 lg:mb-0 transition-colors">
                            {/* Edit Mode Indicator */}
                            {/* Locked Document Indicator - แสดงเมื่อเอกสารถูกเซ็นแล้ว */}
                            {isCurrentDocumentSigned && (
                                <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                    <div className="flex flex-col sm:flex-row sm:items-center min-w-0">
                                        <span className="text-red-700 dark:text-red-400 font-medium text-sm">🔒 เอกสารถูก Lock</span>
                                        <span className="ml-0 sm:ml-2 text-xs sm:text-sm text-red-600 dark:text-red-300">เอกสารนี้ถูกเซ็นรับมอบแล้ว ไม่สามารถแก้ไขได้</span>
                                    </div>
                                    <button
                                        onClick={handleCreateNewForm}
                                        className="text-xs sm:text-sm px-2 sm:px-3 py-1 bg-white dark:bg-slate-700 border border-red-300 dark:border-red-600 rounded hover:bg-red-50 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 whitespace-nowrap"
                                    >
                                        🆕 สร้างเอกสารใหม่
                                    </button>
                                </div>
                            )}
                            
                            {/* Edit Mode Indicator */}
                            {editingDocumentId && !isCurrentDocumentSigned && (
                                <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                    <div className="flex flex-col sm:flex-row sm:items-center min-w-0">
                                        <span className="text-amber-700 dark:text-amber-400 font-medium text-sm">✏️ {t('form.editMode')}</span>
                                        <span className="ml-0 sm:ml-2 text-xs sm:text-sm text-amber-600 dark:text-amber-300 truncate">{t('form.editingDocument')}: {editingDocumentId}</span>
                                    </div>
                                    <button
                                        onClick={handleCreateNewForm}
                                        className="text-xs sm:text-sm px-2 sm:px-3 py-1 bg-white dark:bg-slate-700 border border-amber-300 dark:border-amber-600 rounded hover:bg-amber-50 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-400 whitespace-nowrap"
                                    >
                                        🆕 {t('form.createNewDocument')}
                                    </button>
                                </div>
                            )}
                            
{/* Tab Menu Container พร้อม Fade Indicator */}
                                            <div className="relative border-b border-gray-200 dark:border-slate-600">
                                                {/* Fade indicator ด้านซ้าย */}
                                                <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-white dark:from-slate-800 to-transparent z-10 pointer-events-none sm:hidden"></div>
                                                
                                                {/* Tab Menu */}
                                                <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0 tab-menu-scroll overscroll-x-contain touch-pan-x">
                                                    <nav className="-mb-px flex space-x-1 sm:space-x-2 min-w-max" aria-label="Tabs">
                                                        {/* Dynamic Menu Rendering - แสดงเมนูตามการตั้งค่า */}
                                                        {visibleMenus.map((menu) => {
                                                            const IconComponent = iconMap[menu.icon];
                                                            return (
                                                                <button
                                                                    key={menu.id}
                                                                    onClick={() => setActiveTab(menu.id as DocType)}
                                                                    className={`${activeTab === menu.id ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300'} whitespace-nowrap py-2.5 sm:py-3 px-3 sm:px-4 border-b-2 font-medium text-xs sm:text-sm transition-all flex-shrink-0 rounded-t-lg flex items-center gap-1.5`}
                                                                >
                                                                    {IconComponent && <IconComponent className="w-4 h-4" />}
                                                                    <span className="hidden sm:inline">{menu.label}</span>
                                                                </button>
                                                            );
                                                        })}
                                                        
                                                        {/* ปุ่มตั้งค่าเมนู - แสดงเฉพาะ Admin */}
                                                        {isAdmin && (
                                                            <button
                                                                onClick={() => setShowMenuSettings(true)}
                                                                className="whitespace-nowrap py-2.5 sm:py-3 px-3 sm:px-4 border-b-2 border-transparent text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 font-medium text-xs sm:text-sm transition-all flex-shrink-0 rounded-t-lg flex items-center gap-1.5"
                                                                title="ตั้งค่าเมนู"
                                                            >
                                                                <Settings className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </nav>
                                                </div>
                                                
                                                {/* Fade indicator ด้านขวา */}
                                                <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none sm:hidden"></div>
                                            </div>
                                            
                                            {/* Menu Settings Modal */}
                                            <MenuSettingsModal
                                                isOpen={showMenuSettings}
                                                onClose={() => setShowMenuSettings(false)}
                                                onSave={() => {
                                                    refreshMenus();
                                                    setShowMenuSettings(false);
                                                }}
                                                onOpenUserSettings={() => setShowUserMenuSettings(true)}
                                            />
                                            
                                            {/* User Menu Settings Modal */}
                                            <UserMenuSettingsModal
                                                isOpen={showUserMenuSettings}
                                                onClose={() => setShowUserMenuSettings(false)}
                                                onSave={() => {
                                                    refreshMenus();
                                                }}
                                            />
                            
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
                            ) : activeTab === 'memo' ? (
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
                            ) : activeTab === 'variation-order' ? (
                                <VariationOrderForm
                                    data={variationOrderData}
                                    setData={setVariationOrderData}
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
                                <SubcontractForm
                                    data={subcontractData}
                                    setData={setSubcontractData}
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
                                    <h2 className="text-lg sm:text-xl font-semibold text-slate-700 dark:text-slate-200">{t('form.documentPreview')}</h2>
                                    <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
                                        <button
                                            type="button"
                                            onClick={handleCreateNewForm}
                                            className="inline-flex items-center justify-center px-3 py-2 border border-gray-300 dark:border-slate-600 text-xs sm:text-sm font-medium rounded-md shadow-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 sm:mr-2" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                                            </svg>
                                            {t('form.newForm')}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleSaveToFirestore}
                                            disabled={isSaving || isCurrentDocumentSigned}
                                            title={isCurrentDocumentSigned ? 'เอกสารถูกเซ็นรับมอบแล้ว ไม่สามารถแก้ไขได้' : undefined}
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
                                            {isSaving ? t('form.saving') : (editingDocumentId ? <><Save className="w-4 h-4 inline mr-1" />{t('app.update')}</> : <><Save className="w-4 h-4 inline mr-1" />{t('app.save')}</>)}
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
                                            {isLoading ? t('form.creatingPdf') : t('form.pdf')}
                                        </button>
                                    </div>
                                </div>
                                <div className="bg-white p-1 rounded-lg shadow-lg dark:shadow-slate-900/50 dark:ring-1 dark:ring-slate-700">
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
                                    ) : activeTab === 'memo' ? (
                                        <MemoPreview ref={printableAreaRef} data={memoData} />
                                    ) : activeTab === 'variation-order' ? (
                                        <VariationOrderPreview ref={printableAreaRef} data={variationOrderData} />
                                    ) : (
                                        <SubcontractPreview ref={printableAreaRef} data={subcontractData} />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : viewMode === 'history' ? (
                    // History View
                    <div className="bg-white dark:bg-slate-800 p-3 sm:p-4 md:p-6 rounded-lg shadow-lg transition-colors">
                        {/* Tab Menu สำหรับเลือกประเภทเอกสารใน History View */}
                        <div className="relative border-b border-gray-200 dark:border-slate-600 mb-4">
                            {/* Fade indicator ด้านซ้าย */}
                            <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-white dark:from-slate-800 to-transparent z-10 pointer-events-none sm:hidden"></div>
                            
                            {/* Tab Menu */}
                            <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0 tab-menu-scroll overscroll-x-contain touch-pan-x">
                                <nav className="-mb-px flex space-x-1 sm:space-x-2 min-w-max" aria-label="Document Type Tabs">
                                    {/* Dynamic Menu Rendering - แสดงเมนูตามการตั้งค่า */}
                                    {visibleMenus.map((menu) => {
                                        const IconComponent = iconMap[menu.icon];
                                        return (
                                            <button
                                                key={menu.id}
                                                onClick={() => setActiveTab(menu.id as DocType)}
                                                className={`${activeTab === menu.id ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300'} whitespace-nowrap py-2 sm:py-2.5 px-2.5 sm:px-3 border-b-2 font-medium text-xs sm:text-sm transition-all flex-shrink-0 rounded-t-lg flex items-center gap-1.5`}
                                            >
                                                {IconComponent && <IconComponent className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                                                <span className="hidden sm:inline">{menu.label}</span>
                                                <span className="sm:hidden">{menu.shortLabel || menu.label}</span>
                                            </button>
                                        );
                                    })}
                                </nav>
                            </div>
                            
                            {/* Fade indicator ด้านขวา */}
                            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white dark:from-slate-800 to-transparent z-10 pointer-events-none sm:hidden"></div>
                        </div>
                        
                        <HistoryList 
                            activeDocType={activeTab} 
                            onLoadDocument={handleLoadDocument}
                        />
                    </div>
                ) : viewMode === 'crm' ? (
                    // CRM View
                    <div className="bg-white dark:bg-slate-800 p-3 sm:p-4 md:p-6 rounded-lg shadow-lg transition-colors">
                        <CRMPage />
                    </div>
                ) : viewMode === 'reports' ? (
                    // Reports View
                    <div className="bg-white dark:bg-slate-800 p-3 sm:p-4 md:p-6 rounded-lg shadow-lg transition-colors">
                        <ReportsPage />
                    </div>
                ) : viewMode === 'calendar' ? (
                    // Calendar View
                    <div className="bg-white dark:bg-slate-800 p-3 sm:p-4 md:p-6 rounded-lg shadow-lg transition-colors">
                        <CalendarPage />
                    </div>
                ) : null}
            </main>
        </div>
    );
};

/**
 * Wrapper Component ที่ตรวจสอบว่าต้องไปหน้า Onboarding หรือไม่
 * ถ้า User ยังไม่มีองค์กร จะ redirect ไปหน้า Onboarding
 */
const AppContentWithOnboardingCheck: React.FC = () => {
    const { needsOnboarding, loading } = useCompany();
    
    // ถ้ากำลังโหลดข้อมูล ให้แสดง Loading
    if (loading) {
        return (
            <div className="min-h-screen bg-slate-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">กำลังโหลด...</p>
                </div>
            </div>
        );
    }
    
    // ถ้าต้องไปหน้า Onboarding (User login แล้วแต่ยังไม่มีองค์กร)
    if (needsOnboarding) {
        return <Navigate to="/onboarding" replace />;
    }
    
    // ถ้ามีองค์กรแล้ว แสดงหน้าหลัก
    return <AppContent />;
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
        <ThemeProvider>
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
                
                {/* หน้าตรวจสอบเอกสาร QR Code - Public Access (ไม่ต้อง login) */}
                <Route path="/verify/:docType/:token" element={<VerificationPage />} />
                
                {/* หน้าเซ็นชื่อยืนยันรับมอบ - Public Access (ไม่ต้อง login, ต้อง verify OTP) */}
                <Route path="/sign/:docType/:token" element={<SignApprovalPage />} />
                
                {/* หน้า Super Admin - ต้อง login และเป็น Super Admin (ไม่ต้องมี CompanyProvider) */}
                <Route 
                    path="/superadmin/*" 
                    element={
                        <ProtectedRoute>
                            <SuperAdminDashboard />
                        </ProtectedRoute>
                    } 
                />
                
                {/* หน้า Pricing - แสดงแผนราคาและซื้อ package */}
                <Route
                    path="/pricing"
                    element={
                        <CompanyProvider>
                            <MenuProvider>
                                <TabProvider>
                                    <ProtectedRoute>
                                        <PricingPage />
                                    </ProtectedRoute>
                                </TabProvider>
                            </MenuProvider>
                        </CompanyProvider>
                    }
                />
                
                {/* หน้า Subscription - จัดการ subscription ปัจจุบัน */}
                <Route
                    path="/subscription"
                    element={
                        <CompanyProvider>
                            <MenuProvider>
                                <TabProvider>
                                    <ProtectedRoute>
                                        <SubscriptionManager />
                                    </ProtectedRoute>
                                </TabProvider>
                            </MenuProvider>
                        </CompanyProvider>
                    }
                />
                
                {/* หน้า Onboarding - สำหรับ User ใหม่ที่ยังไม่มีองค์กร */}
                <Route
                    path="/onboarding"
                    element={
                        <CompanyProvider>
                            <ProtectedRoute>
                                <OnboardingPage />
                            </ProtectedRoute>
                        </CompanyProvider>
                    }
                />
                
                {/* หน้าหลัก - ต้อง login และมี CompanyProvider + MenuProvider + TabProvider */}
                <Route
                    path="*"
                    element={
                        <CompanyProvider>
                            <MenuProvider>
                                <TabProvider>
                                    <ProtectedRoute>
                                        <AppContentWithOnboardingCheck />
                                    </ProtectedRoute>
                                </TabProvider>
                            </MenuProvider>
                        </CompanyProvider>
                    }
                />
                </Routes>
            </AuthProvider>
        </ThemeProvider>
    );
};

export default App;
