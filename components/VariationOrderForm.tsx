import React, { useRef, useState, useEffect } from 'react';
import { VariationOrderData, VariationOrderItem, LogoType, EndCustomerProject } from '../types';
import { formatDateForInput } from '../utils/dateUtils';
import CustomerSelector from './CustomerSelector';
import EndCustomerProjectSection from './EndCustomerProjectSection';
import { generateDocumentNumber } from '../services/documentNumber';
import { useCompany } from '../contexts/CompanyContext';
import { INPUT_LIMITS, NUMBER_LIMITS } from '../utils/inputValidation';

export interface VariationOrderFormProps {
    data: VariationOrderData;
    setData: React.Dispatch<React.SetStateAction<VariationOrderData>>;
    sharedLogo?: string | null;
    sharedLogoUrl?: string | null;
    sharedLogoType?: LogoType;
    companyDefaultLogoUrl?: string | null;
    onLogoChange?: (logo: string | null, logoUrl: string | null, logoType: LogoType) => void;
    onSetDefaultLogo?: (logoUrl: string) => Promise<void>;
    /** true = กำลังแก้ไขเอกสารเดิม หรือ copy เอกสาร (ไม่ต้อง auto-generate เลขใหม่) */
    isEditing?: boolean;
}

const FormDivider: React.FC<{ title: string }> = ({ title }) => (
    <div className="relative">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-gray-300 dark:border-gray-600" />
        </div>
        <div className="relative flex justify-start">
            <span className="bg-white dark:bg-slate-800 pr-3 text-lg font-medium text-gray-900 dark:text-gray-100">{title}</span>
        </div>
    </div>
);

const VariationOrderForm: React.FC<VariationOrderFormProps> = ({ 
    data, 
    setData,
    sharedLogo,
    sharedLogoUrl,
    sharedLogoType,
    companyDefaultLogoUrl,
    onLogoChange,
    onSetDefaultLogo,
    isEditing = false
}) => {
    const { currentCompany } = useCompany(); // ดึงข้อมูลบริษัทจาก context
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [itemToRemove, setItemToRemove] = useState<number | null>(null);
    const [isGeneratingNumber, setIsGeneratingNumber] = useState(false); // สถานะกำลังสร้างเลขเอกสาร
    const hasSyncedCompanyRef = useRef<string | undefined>(undefined); // Track ว่า sync แล้วหรือยัง
    const hasGeneratedNumberRef = useRef(false); // Track ว่า generate เลขแล้วหรือยัง (ป้องกัน double generate)

    const handleDataChange = <K extends keyof VariationOrderData,>(key: K, value: VariationOrderData[K]) => {
        setData(prev => ({ ...prev, [key]: value }));
    };
    
    const handleItemChange = (index: number, field: keyof VariationOrderItem, value: string | number) => {
        const newItems = [...data.items];
        const item = newItems[index];
        (item[field] as any) = value;
        
        // คำนวณ amount อัตโนมัติเมื่อ quantity หรือ unitPrice เปลี่ยน
        if (field === 'quantity' || field === 'unitPrice') {
            item.amount = item.quantity * item.unitPrice;
        }
        
        handleDataChange('items', newItems);
        calculateTotals(newItems);
    };

    // คำนวณยอดรวมทั้งหมด (แยกงานใหม่/งานเดิม)
    const calculateTotals = (items: VariationOrderItem[] = data.items) => {
        // แยกงานใหม่และงานเดิม
        const newItems = items.filter(item => item.itemType === 'new');
        const deductItems = items.filter(item => item.itemType === 'deduct');
        
        const newItemsSubtotal = newItems.reduce((sum, item) => sum + item.amount, 0);
        const deductItemsSubtotal = deductItems.reduce((sum, item) => sum + item.amount, 0);
        const netDifference = newItemsSubtotal - deductItemsSubtotal;
        const taxAmount = (netDifference * data.taxRate) / 100;
        const totalAmount = netDifference + taxAmount;
        
        setData(prev => ({
            ...prev,
            newItemsSubtotal,
            deductItemsSubtotal,
            netDifference,
            taxAmount,
            totalAmount,
        }));
    };

    const addItem = (itemType: 'new' | 'deduct' = 'new') => {
        const newItem: VariationOrderItem = {
            description: '',
            quantity: 1,
            unit: 'ตร.ม.',
            unitPrice: 0,
            amount: 0,
            itemType,
            notes: '',
        };
        setData(prev => ({
            ...prev,
            items: [...prev.items, newItem]
        }));
    };

    const removeItem = (index: number) => {
        const newItems = data.items.filter((_, i) => i !== index);
        handleDataChange('items', newItems);
        calculateTotals(newItems);
        setIsConfirmModalOpen(false);
        setItemToRemove(null);
    };
    
    const openConfirmModal = (index: number) => {
        setItemToRemove(index);
        setIsConfirmModalOpen(true);
    };

    /**
     * สร้างเลขที่เอกสารอัตโนมัติ
     * @param force - บังคับสร้างเลขใหม่แม้จะมีเลขอยู่แล้ว (สำหรับปุ่ม manual)
     */
    const handleGenerateVoNumber = async (force: boolean = false) => {
        // ป้องกัน double generate
        if (hasGeneratedNumberRef.current && !force) {
            console.log('⏭️ [VO] Skip generate - already generated');
            return;
        }
        
        try {
            setIsGeneratingNumber(true);
            const newVoNumber = await generateDocumentNumber('variation-order');
            handleDataChange('voNumber', newVoNumber);
            hasGeneratedNumberRef.current = true;
            console.log('✅ [VO] Generated new document number:', newVoNumber);
        } catch (error) {
            console.error('❌ [VO] Error generating VO number:', error);
            alert('ไม่สามารถสร้างเลขที่เอกสารได้ กรุณาลองใหม่อีกครั้ง');
        } finally {
            setIsGeneratingNumber(false);
        }
    };

    /**
     * Auto-generate เลขที่เอกสารเมื่อฟอร์มว่างหรือเป็นค่า default
     * - ข้าม generate ถ้ากำลังแก้ไขเอกสารเดิม (isEditing = true)
     * - ข้าม generate ถ้ามีเลขเอกสารที่ valid อยู่แล้ว (จาก copy หรือ load)
     */
    useEffect(() => {
        // ถ้ากำลังแก้ไขเอกสารเดิม ไม่ต้อง generate เลขใหม่
        if (isEditing) {
            console.log('⏭️ [VO] Skip auto-generate - isEditing mode');
            hasGeneratedNumberRef.current = true; // mark ว่าไม่ต้อง generate
            return;
        }
        
        // ตรวจสอบว่ามีเลขเอกสารที่ valid อยู่แล้วหรือไม่
        // รูปแบบใหม่: VO-YYMMDDXX (เช่น VO-26012301)
        const hasValidNumber = data.voNumber && 
                               data.voNumber.match(/^VO-\d{6}\d{2}$/);
        
        if (hasValidNumber) {
            console.log('⏭️ [VO] Skip auto-generate - already has valid number:', data.voNumber);
            hasGeneratedNumberRef.current = true;
            return;
        }
        
        // ตรวจสอบว่าเลขเอกสารว่างหรือเป็นรูปแบบเก่า
        const isDefaultOrEmpty = !data.voNumber || 
                                  data.voNumber.match(/^VO-\d{4}-\d{3}$/) || // รูปแบบเก่า
                                  data.voNumber === '';
        
        // ถ้า voNumber ว่างเปล่า ให้ reset flag เพื่อให้สามารถสร้างเลขใหม่ได้
        if (isDefaultOrEmpty) {
            hasGeneratedNumberRef.current = false;
        }
        
        if (isDefaultOrEmpty && !hasGeneratedNumberRef.current && !isGeneratingNumber) {
            console.log('🔄 [VO] Auto-generating new document number...');
            handleGenerateVoNumber();
        }
    }, [isEditing, data.voNumber]); // เรียกเมื่อ isEditing หรือ voNumber เปลี่ยน

    /**
     * Sync ข้อมูลบริษัทจาก currentCompany ไปยัง form data
     * อัปเดตเมื่อ currentCompany เปลี่ยน หรือเมื่อฟอร์มว่าง
     */
    useEffect(() => {
        if (currentCompany && currentCompany.id !== hasSyncedCompanyRef.current) {
            // ตรวจสอบว่าข้อมูลบริษัทใน form ว่างหรือไม่
            const isCompanyDataEmpty = !data.companyName && !data.companyAddress && !data.companyPhone && !data.companyEmail && !data.companyWebsite;
            
            // ถ้าข้อมูลว่าง หรือข้อมูลตรงกับ currentCompany ให้ sync
            if (isCompanyDataEmpty || 
                (data.companyName === currentCompany.name && 
                 data.companyAddress === currentCompany.address &&
                 data.companyPhone === currentCompany.phone &&
                 data.companyEmail === currentCompany.email &&
                 data.companyWebsite === currentCompany.website)) {
                
                setData(prev => ({
                    ...prev,
                    companyName: currentCompany.name || prev.companyName,
                    companyAddress: currentCompany.address || prev.companyAddress,
                    companyPhone: currentCompany.phone || prev.companyPhone,
                    companyEmail: currentCompany.email || prev.companyEmail,
                    companyWebsite: currentCompany.website || prev.companyWebsite,
                    companyTaxId: currentCompany.taxId || prev.companyTaxId,
                }));
                
                hasSyncedCompanyRef.current = currentCompany.id;
            }
        }
    }, [currentCompany?.id]); // อัปเดตเมื่อ currentCompany.id เปลี่ยน

    // คำนวณ totals เมื่อ items หรือ taxRate เปลี่ยน
    useEffect(() => {
        calculateTotals();
    }, [data.taxRate]);

    return (
        <div className="space-y-8 pt-4">
            {/* Confirmation Modal */}
            {isConfirmModalOpen && itemToRemove !== null && (
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
                                    คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้?
                                </p>
                            </div>
                            <div className="items-center px-4 py-3 space-x-2">
                                <button
                                    onClick={() => removeItem(itemToRemove)}
                                    className="px-4 py-2 bg-red-500 text-white text-base font-medium rounded-md w-auto shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                >
                                    ลบ
                                </button>
                                <button
                                    onClick={() => setIsConfirmModalOpen(false)}
                                    className="px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-gray-200 text-base font-medium rounded-md w-auto shadow-sm hover:bg-gray-300 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                                >
                                    ยกเลิก
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Form Fields */}
            <div className="space-y-6">
                {/* เลขที่เอกสาร */}
                <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-medium">เลขที่ใบส่วนต่าง:</span>{' '}
                    {isGeneratingNumber ? (
                        <span className="font-mono text-amber-600 dark:text-amber-400 animate-pulse">กำลังสร้างเลขที่...</span>
                    ) : (
                        <span className="font-mono">{data.voNumber || 'ยังไม่มีเลขที่'}</span>
                    )}
                </div>
                
                {/* ส่วนที่ 1: ข้อมูลลูกค้า */}
                <FormDivider title="ส่วนที่ 1: ข้อมูลลูกค้า/โครงการ" />
                <div className="space-y-4">
                    {/* CustomerSelector */}
                    <CustomerSelector
                        label="เลือกข้อมูลลูกค้า"
                        onSelect={(customer) => {
                            handleDataChange('customerName', customer.customerName);
                            // รวมที่อยู่ทั้งหมด: ที่อยู่หลัก + ตำบล/แขวง + อำเภอ/เขต + จังหวัด + รหัสไปรษณีย์
                            const fullAddress = [
                                customer.address,
                                customer.district ? `ต.${customer.district}` : '',
                                customer.amphoe ? `อ.${customer.amphoe}` : '',
                                customer.province,
                                customer.postalCode
                            ].filter(Boolean).join(' ');
                            handleDataChange('customerAddress', fullAddress);
                            if (customer.phone) {
                                handleDataChange('customerPhone', customer.phone);
                            }
                            if (customer.email) {
                                handleDataChange('customerEmail', customer.email);
                            }
                            if (customer.taxId) {
                                handleDataChange('customerTaxId', customer.taxId);
                            }
                            // ข้อมูลสาขา (สำหรับนิติบุคคล)
                            if (customer.branchCode) {
                                handleDataChange('customerBranchCode', customer.branchCode);
                            }
                            if (customer.branchName) {
                                handleDataChange('customerBranchName', customer.branchName);
                            }
                            // ข้อมูลโครงการลูกค้าปลายทาง (End Customer Project)
                            if (customer.hasEndCustomerProject && customer.endCustomerProject) {
                                handleDataChange('hasEndCustomerProject', true);
                                handleDataChange('endCustomerProject', customer.endCustomerProject);
                                handleDataChange('showEndCustomerInPdf', true);
                            } else {
                                handleDataChange('hasEndCustomerProject', false);
                                handleDataChange('endCustomerProject', undefined);
                                handleDataChange('showEndCustomerInPdf', false);
                            }
                        }}
                        currentCustomer={{
                            customerName: data.customerName,
                            address: data.customerAddress,
                            phone: data.customerPhone,
                            projectName: data.projectName,
                        }}
                        showSaveButton={true}
                    />

                    <div>
                        <label htmlFor="customerName" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">ชื่อลูกค้า/บริษัท</label>
                        <input type="text" id="customerName" value={data.customerName} onChange={(e) => handleDataChange('customerName', e.target.value)} maxLength={INPUT_LIMITS.customerName} className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100" />
                    </div>
                    <div>
                        <label htmlFor="customerAddress" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">ที่อยู่</label>
                        <textarea id="customerAddress" value={data.customerAddress} onChange={(e) => handleDataChange('customerAddress', e.target.value)} rows={3} maxLength={INPUT_LIMITS.companyAddress} className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                        <div>
                            <label htmlFor="customerPhone" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">เบอร์โทรศัพท์</label>
                            <input type="tel" id="customerPhone" value={data.customerPhone || ''} onChange={(e) => handleDataChange('customerPhone', e.target.value)} maxLength={INPUT_LIMITS.phone} inputMode="tel" className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100" />
                        </div>
                        <div>
                            <label htmlFor="customerEmail" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">อีเมล</label>
                            <input type="email" id="customerEmail" value={data.customerEmail || ''} onChange={(e) => handleDataChange('customerEmail', e.target.value)} maxLength={INPUT_LIMITS.email} inputMode="email" className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100" />
                        </div>
                        <div>
                            <label htmlFor="customerTaxId" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">เลขประจำตัวผู้เสียภาษี</label>
                            <input type="text" id="customerTaxId" value={data.customerTaxId || ''} onChange={(e) => handleDataChange('customerTaxId', e.target.value)} maxLength={INPUT_LIMITS.taxId} inputMode="numeric" pattern="[0-9]*" className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100" />
                        </div>
                    </div>
                    
                    {/* ส่วนโครงการลูกค้าปลายทาง (End Customer Project) */}
                    <EndCustomerProjectSection
                        hasEndCustomerProject={data.hasEndCustomerProject || false}
                        endCustomerProject={data.endCustomerProject}
                        showEndCustomerInPdf={data.showEndCustomerInPdf || false}
                        onHasEndCustomerChange={(value) => handleDataChange('hasEndCustomerProject', value)}
                        onEndCustomerProjectChange={(value) => handleDataChange('endCustomerProject', value)}
                        onShowEndCustomerInPdfChange={(value) => handleDataChange('showEndCustomerInPdf', value)}
                    />
                </div>

                {/* ส่วนที่ 2: ข้อมูลอ้างอิง */}
                <FormDivider title="ส่วนที่ 2: ข้อมูลอ้างอิง" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                        <label htmlFor="date" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">วันที่ออกเอกสาร</label>
                        <input type="date" id="date" value={formatDateForInput(data.date)} onChange={(e) => handleDataChange('date', e.target.value ? new Date(e.target.value) : null)} className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100" />
                    </div>
                    <div>
                        <label htmlFor="projectName" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">โครงการ / ลูกค้า</label>
                        <input type="text" id="projectName" value={data.projectName} onChange={(e) => handleDataChange('projectName', e.target.value)} maxLength={INPUT_LIMITS.projectName} className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100" />
                    </div>
                    <div>
                        <label htmlFor="location" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">สถานที่</label>
                        <input type="text" id="location" value={data.location} onChange={(e) => handleDataChange('location', e.target.value)} maxLength={INPUT_LIMITS.projectAddress} className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100" />
                    </div>
                    <div>
                        <label htmlFor="contractNumber" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">อ้างอิงสัญญาเลขที่</label>
                        <input type="text" id="contractNumber" value={data.contractNumber || ''} onChange={(e) => handleDataChange('contractNumber', e.target.value)} maxLength={INPUT_LIMITS.referenceNumber} className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100" />
                    </div>
                    <div>
                        <label htmlFor="requestedBy" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">ผู้ร้องขอ</label>
                        <select id="requestedBy" value={data.requestedBy} onChange={(e) => handleDataChange('requestedBy', e.target.value as 'customer' | 'company' | 'designer')} className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100">
                            <option value="customer">ลูกค้า</option>
                            <option value="company">บริษัท</option>
                            <option value="designer">ผู้ออกแบบ</option>
                        </select>
                    </div>
                </div>

                {/* ส่วนที่ 3: รายละเอียดการเปลี่ยนแปลง */}
                <FormDivider title="ส่วนที่ 3: รายละเอียดการเปลี่ยนแปลง" />
                <div className="space-y-4">
                    <div>
                        <label htmlFor="subject" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">เรื่อง</label>
                        <input type="text" id="subject" value={data.subject} onChange={(e) => handleDataChange('subject', e.target.value)} maxLength={INPUT_LIMITS.projectName} className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100" placeholder="เช่น ขอเปลี่ยนแปลงสเปคกระเบื้องห้องน้ำชั้น 2" />
                    </div>
                    <div>
                        <label htmlFor="originalScope" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">รายละเอียดงานเดิม (Original Scope / Spec)</label>
                        <textarea id="originalScope" value={data.originalScope} onChange={(e) => handleDataChange('originalScope', e.target.value)} rows={3} maxLength={INPUT_LIMITS.notes} className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100" />
                    </div>
                    <div>
                        <label htmlFor="newScope" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">รายละเอียดงานใหม่ (New Scope / Spec)</label>
                        <textarea id="newScope" value={data.newScope} onChange={(e) => handleDataChange('newScope', e.target.value)} rows={3} maxLength={INPUT_LIMITS.notes} className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100" />
                    </div>
                    <div>
                        <label htmlFor="reasonForChange" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">เหตุผลในการเปลี่ยนแปลง</label>
                        <textarea id="reasonForChange" value={data.reasonForChange} onChange={(e) => handleDataChange('reasonForChange', e.target.value)} rows={2} maxLength={INPUT_LIMITS.notes} className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100" />
                    </div>
                </div>

                {/* ส่วนที่ 4: รายการงาน */}
                <FormDivider title="ส่วนที่ 4: รายการงาน (แยกงานใหม่/งานเดิม)" />
                <div className="mb-3 flex gap-2">
                    <button type="button" onClick={() => addItem('new')} className="inline-flex items-center px-3 py-2 border border-green-300 shadow-sm text-xs sm:text-sm leading-4 font-medium rounded-md text-green-700 bg-green-50 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
                        <svg className="-ml-0.5 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                        </svg>
                        เพิ่มงานใหม่/งานเพิ่ม
                    </button>
                    <button type="button" onClick={() => addItem('deduct')} className="inline-flex items-center px-3 py-2 border border-red-300 shadow-sm text-xs sm:text-sm leading-4 font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
                        <svg className="-ml-0.5 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                        </svg>
                        เพิ่มงานเดิม/งานลด
                    </button>
                </div>
                <div className="overflow-x-auto -mx-3 sm:mx-0">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-xs sm:text-sm">
                        <thead className="bg-gray-50 dark:bg-slate-700">
                            <tr>
                                <th scope="col" className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-1/12">ประเภท</th>
                                <th scope="col" className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-2/5">รายละเอียด</th>
                                <th scope="col" className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-1/6">จำนวน</th>
                                <th scope="col" className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-1/6">หน่วย</th>
                                <th scope="col" className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-1/6">ราคาต่อหน่วย</th>
                                <th scope="col" className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-1/6">จำนวนเงิน</th>
                                <th scope="col" className="relative px-2 sm:px-3 py-1.5 sm:py-2 w-10 sm:w-12"><span className="sr-only">ลบ</span></th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {data.items.map((item, index) => (
                                <tr key={index} className={item.itemType === 'new' ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}>
                                    <td className="px-1 sm:px-2 py-1 whitespace-nowrap">
                                        <span className={`px-2 py-1 text-xs font-medium rounded ${item.itemType === 'new' ? 'bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200' : 'bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200'}`}>
                                            {item.itemType === 'new' ? 'งานใหม่' : 'งานเดิม'}
                                        </span>
                                    </td>
                                    <td className="px-1 sm:px-2 py-1 whitespace-nowrap">
                                        <textarea value={item.description} onChange={(e) => handleItemChange(index, 'description', e.target.value)} rows={2} maxLength={INPUT_LIMITS.itemDescription} className="w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-300 focus:ring-indigo-200 focus:ring-opacity-50 text-xs sm:text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"></textarea>
                                    </td>
                                    <td className="px-1 sm:px-2 py-1 whitespace-nowrap">
                                        <input type="number" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)} inputMode="decimal" min={NUMBER_LIMITS.quantity.min} max={NUMBER_LIMITS.quantity.max} step={NUMBER_LIMITS.quantity.step} className="w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-300 focus:ring-indigo-200 focus:ring-opacity-50 text-xs sm:text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100" />
                                    </td>
                                    <td className="px-1 sm:px-2 py-1 whitespace-nowrap">
                                        <input type="text" value={item.unit} onChange={(e) => handleItemChange(index, 'unit', e.target.value)} maxLength={INPUT_LIMITS.unit} className="w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-300 focus:ring-indigo-200 focus:ring-opacity-50 text-xs sm:text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100" />
                                    </td>
                                    <td className="px-1 sm:px-2 py-1 whitespace-nowrap">
                                        <input type="number" step="0.01" value={item.unitPrice} onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)} inputMode="decimal" min={NUMBER_LIMITS.price.min} max={NUMBER_LIMITS.price.max} className="w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-300 focus:ring-indigo-200 focus:ring-opacity-50 text-xs sm:text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100" />
                                    </td>
                                    <td className="px-1 sm:px-2 py-1 whitespace-nowrap">
                                        <input type="number" step="0.01" value={item.amount} readOnly className={`w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm text-xs sm:text-sm font-medium ${item.itemType === 'new' ? 'bg-green-100 dark:bg-green-900/40 text-green-900 dark:text-green-200' : 'bg-red-100 dark:bg-red-900/40 text-red-900 dark:text-red-200'}`} />
                                    </td>
                                    <td className="px-1 sm:px-2 py-1 whitespace-nowrap text-center">
                                        <button type="button" onClick={() => openConfirmModal(index)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30">
                                            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* ส่วนที่ 5: สรุปผลกระทบด้านราคา */}
                <FormDivider title="ส่วนที่ 5: สรุปผลกระทบด้านราคา (Cost Impact)" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-3 sm:space-y-4">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                            <label htmlFor="taxRate" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">อัตราภาษีมูลค่าเพิ่ม (%)</label>
                            <input type="number" id="taxRate" value={data.taxRate} onChange={(e) => handleDataChange('taxRate', parseFloat(e.target.value) || 0)} inputMode="decimal" min={NUMBER_LIMITS.percentage.min} max={NUMBER_LIMITS.percentage.max} step={NUMBER_LIMITS.percentage.step} className="w-full sm:w-24 rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100" />
                        </div>
                        <div>
                            <label htmlFor="paymentNote" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">หมายเหตุการชำระเงิน</label>
                            <input type="text" id="paymentNote" value={data.paymentNote || ''} onChange={(e) => handleDataChange('paymentNote', e.target.value)} maxLength={INPUT_LIMITS.itemNotes} className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100" placeholder="เช่น หักจากงวดที่ 10" />
                        </div>
                    </div>
                    <div className="space-y-2 bg-gray-50 dark:bg-slate-700 p-4 rounded-lg">
                        <div className="flex justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-400">ยอดรวมงานใหม่/งานเพิ่ม:</span>
                            <span className="text-sm font-medium text-green-600 dark:text-green-400">{data.newItemsSubtotal.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-400">ยอดรวมงานเดิม/งานลด:</span>
                            <span className="text-sm font-medium text-red-600 dark:text-red-400">-{data.deductItemsSubtotal.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-gray-300 dark:border-gray-600">
                            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">ยอดรวมส่วนต่าง (สุทธิ):</span>
                            <span className={`text-sm font-bold ${data.netDifference >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                {data.netDifference.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-400">ภาษีมูลค่าเพิ่ม ({data.taxRate}%):</span>
                            <span className="text-sm font-medium dark:text-gray-200">{data.taxAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-gray-300 dark:border-gray-600">
                            <span className="text-base font-semibold text-gray-900 dark:text-gray-100">ยอดรวมที่ต้องชำระเพิ่ม/หัก:</span>
                            <span className={`text-base font-bold ${data.totalAmount >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-red-600 dark:text-red-400'}`}>
                                {data.totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท
                            </span>
                        </div>
                    </div>
                </div>

                {/* ส่วนที่ 6: สรุปผลกระทบด้านระยะเวลา */}
                <FormDivider title="ส่วนที่ 6: สรุปผลกระทบด้านระยะเวลา (Time Impact)" />
                <div className="space-y-4">
                    <div className="flex items-center">
                        <input type="checkbox" id="hasTimeImpact" checked={data.hasTimeImpact} onChange={(e) => handleDataChange('hasTimeImpact', e.target.checked)} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-slate-600 rounded" />
                        <label htmlFor="hasTimeImpact" className="ml-2 block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">มีผลกระทบต่อระยะเวลาโครงการ</label>
                    </div>
                    {data.hasTimeImpact && (
                        <>
                            <div>
                                <label htmlFor="timeImpactDays" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">จำนวนวันที่ขยายออกไป (วันทำการ)</label>
                                <input type="number" id="timeImpactDays" value={data.timeImpactDays || 0} onChange={(e) => handleDataChange('timeImpactDays', parseFloat(e.target.value) || 0)} inputMode="numeric" min={0} max={9999} className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100" />
                            </div>
                            <div>
                                <label htmlFor="timeImpactReason" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">เหตุผล</label>
                                <textarea id="timeImpactReason" value={data.timeImpactReason || ''} onChange={(e) => handleDataChange('timeImpactReason', e.target.value)} rows={2} maxLength={INPUT_LIMITS.notes} className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100" />
                            </div>
                        </>
                    )}
                </div>

                {/* ส่วนที่ 7: ส่วนอนุมัติ */}
                <FormDivider title="ส่วนที่ 7: ส่วนอนุมัติ" />
                <div className="space-y-4">
                    <div>
                        <label htmlFor="terms" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">เงื่อนไข</label>
                        <textarea id="terms" value={data.terms || ''} onChange={(e) => handleDataChange('terms', e.target.value)} rows={2} maxLength={INPUT_LIMITS.terms} className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100" placeholder="เช่น ราคานี้มีผลยืนยันภายใน 7 วัน" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                        <div>
                            <label htmlFor="customerApproverName" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">ชื่อผู้อนุมัติ (ลูกค้า)</label>
                            <input type="text" id="customerApproverName" value={data.customerApproverName || ''} onChange={(e) => handleDataChange('customerApproverName', e.target.value)} maxLength={INPUT_LIMITS.signerName} className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100" />
                        </div>
                        <div>
                            <label htmlFor="customerApproverDate" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">วันที่อนุมัติ (ลูกค้า)</label>
                            <input type="date" id="customerApproverDate" value={formatDateForInput(data.customerApproverDate)} onChange={(e) => handleDataChange('customerApproverDate', e.target.value ? new Date(e.target.value) : null)} className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100" />
                        </div>
                        <div>
                            <label htmlFor="companyApproverName" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">ชื่อผู้เสนอ (บริษัท)</label>
                            <input type="text" id="companyApproverName" value={data.companyApproverName || ''} onChange={(e) => handleDataChange('companyApproverName', e.target.value)} maxLength={INPUT_LIMITS.signerName} className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100" />
                        </div>
                        <div>
                            <label htmlFor="companyApproverDate" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">วันที่เสนอ (บริษัท)</label>
                            <input type="date" id="companyApproverDate" value={formatDateForInput(data.companyApproverDate)} onChange={(e) => handleDataChange('companyApproverDate', e.target.value ? new Date(e.target.value) : null)} className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100" />
                        </div>
                    </div>
                </div>

                {/* ส่วนที่ 8: ข้อมูลเพิ่มเติม */}
                <FormDivider title="ส่วนที่ 8: ข้อมูลเพิ่มเติม" />
                <div className="space-y-3 sm:space-y-4">
                    <div>
                        <label htmlFor="notes" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">หมายเหตุ</label>
                        <textarea id="notes" value={data.notes || ''} onChange={(e) => handleDataChange('notes', e.target.value)} rows={3} maxLength={INPUT_LIMITS.notes} className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100" />
                    </div>
                    <div>
                        <label htmlFor="issuedBy" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">ผู้ออกเอกสาร</label>
                        <input type="text" id="issuedBy" value={data.issuedBy || ''} onChange={(e) => handleDataChange('issuedBy', e.target.value)} maxLength={INPUT_LIMITS.signerName} className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VariationOrderForm;

