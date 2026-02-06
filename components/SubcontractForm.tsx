/**
 * SubcontractForm Component
 * ฟอร์มสัญญาจ้างเหมาช่วง (Sub-contractor Agreement)
 */
import React, { useRef, useState, useEffect } from 'react';
import { SubcontractData, SubcontractWorkItem, SubcontractPaymentMilestone, LogoType, EndCustomerProject } from '../types';
import CustomerSelector from './CustomerSelector';
import ContractorSelector from './ContractorSelector';
import EndCustomerSelector from './EndCustomerSelector';
import DatePicker from './DatePicker';
import { Customer } from '../services/customers';
import { Contractor } from '../services/contractors';
import { EndCustomer } from '../services/endCustomers';
import { generateDocumentNumber, DocumentType } from '../services/documentNumber';
import { useCompany } from '../contexts/CompanyContext';
import { numberToThaiText } from '../utils/numberToThaiText';
import { INPUT_LIMITS, NUMBER_LIMITS } from '../utils/inputValidation';
import { parseNumberInput, parseIntInput } from '../utils/numberInput';
import FormDivider from './shared/FormDivider';

export interface SubcontractFormProps {
    data: SubcontractData;
    setData: React.Dispatch<React.SetStateAction<SubcontractData>>;
    sharedLogo?: string | null;
    sharedLogoUrl?: string | null;
    sharedLogoType?: LogoType;
    companyDefaultLogoUrl?: string | null;
    onLogoChange?: (logo: string | null, logoUrl: string | null, logoType: LogoType) => void;
    onSetDefaultLogo?: (logoUrl: string) => Promise<void>;
    /** true = กำลังแก้ไขเอกสารเดิม หรือ copy เอกสาร (ไม่ต้อง auto-generate เลขใหม่) */
    isEditing?: boolean;
}

const SubcontractForm: React.FC<SubcontractFormProps> = ({ 
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
    const { currentCompany } = useCompany();
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [itemToRemove, setItemToRemove] = useState<number | null>(null);
    const [milestoneToRemove, setMilestoneToRemove] = useState<number | null>(null);
    const [isGeneratingNumber, setIsGeneratingNumber] = useState(false);
    const hasSyncedCompanyRef = useRef<string | undefined>(undefined);
    const hasGeneratedNumberRef = useRef(false);
    
    // State สำหรับเก็บ Customer ID ที่เลือก (ใช้สำหรับ End Customer)
    const [selectedCustomerId, setSelectedCustomerId] = useState<string | undefined>(undefined);
    const [selectedCustomerName, setSelectedCustomerName] = useState<string | undefined>(undefined);

    // Handler สำหรับเปลี่ยนค่าใน data
    const handleDataChange = <K extends keyof SubcontractData,>(key: K, value: SubcontractData[K]) => {
        setData(prev => ({ ...prev, [key]: value }));
    };
    
    // Handler สำหรับเปลี่ยนค่าใน work items
    const handleItemChange = (index: number, field: keyof SubcontractWorkItem, value: string | number) => {
        const newItems = [...data.items];
        const item = newItems[index];
        (item[field] as any) = value;
        
        // คำนวณ amount อัตโนมัติเมื่อ quantity หรือ unitPrice เปลี่ยน
        if (field === 'quantity' || field === 'unitPrice') {
            item.amount = item.quantity * item.unitPrice;
        }
        
        handleDataChange('items', newItems);
        calculateTotalWorkAmount(newItems);
    };

    // คำนวณยอดรวมรายการงาน
    const calculateTotalWorkAmount = (items: SubcontractWorkItem[] = data.items) => {
        const total = items.reduce((sum, item) => sum + item.amount, 0);
        setData(prev => ({
            ...prev,
            totalWorkAmount: total,
            totalContractAmount: total,
        }));
    };

    // เพิ่มรายการงาน
    const addItem = () => {
        const newItem: SubcontractWorkItem = {
            description: '',
            quantity: 1,
            unit: 'งาน',
            unitPrice: 0,
            amount: 0,
            notes: '',
        };
        setData(prev => ({
            ...prev,
            items: [...prev.items, newItem]
        }));
    };

    // ลบรายการงาน
    const removeItem = (index: number) => {
        const newItems = data.items.filter((_, i) => i !== index);
        handleDataChange('items', newItems);
        calculateTotalWorkAmount(newItems);
    };

    // Handler สำหรับเปลี่ยนค่าใน payment milestones
    const handleMilestoneChange = (index: number, field: keyof SubcontractPaymentMilestone, value: string | number) => {
        const newMilestones = [...data.paymentMilestones];
        const milestone = newMilestones[index];
        (milestone[field] as any) = value;
        
        // คำนวณ amount อัตโนมัติเมื่อ percentage เปลี่ยน
        if (field === 'percentage') {
            milestone.amount = (data.totalContractAmount * (value as number)) / 100;
        }
        
        handleDataChange('paymentMilestones', newMilestones);
    };

    // เพิ่มงวดงาน
    const addMilestone = () => {
        const newMilestone: SubcontractPaymentMilestone = {
            milestone: data.paymentMilestones.length + 1,
            description: '',
            percentage: 0,
            amount: 0,
        };
        setData(prev => ({
            ...prev,
            paymentMilestones: [...prev.paymentMilestones, newMilestone]
        }));
    };

    // ลบงวดงาน
    const removeMilestone = (index: number) => {
        const newMilestones = data.paymentMilestones.filter((_, i) => i !== index);
        // อัปเดตเลขงวดใหม่
        newMilestones.forEach((m, i) => m.milestone = i + 1);
        handleDataChange('paymentMilestones', newMilestones);
    };

    // Sync ข้อมูลบริษัทจาก context และตั้งค่าสถานที่ทำสัญญาอัตโนมัติ
    useEffect(() => {
        if (currentCompany && currentCompany.id !== hasSyncedCompanyRef.current) {
            hasSyncedCompanyRef.current = currentCompany.id;
            
            // สร้างสถานที่ทำสัญญาจากข้อมูลบริษัท
            const contractLocation = currentCompany.address 
                ? `${currentCompany.name || ''} ${currentCompany.address}`.trim()
                : currentCompany.name || '';
            
            setData(prev => ({
                ...prev,
                companyName: currentCompany.name || prev.companyName,
                companyAddress: currentCompany.address || prev.companyAddress,
                companyPhone: currentCompany.phone || prev.companyPhone,
                companyEmail: currentCompany.email || prev.companyEmail,
                companyTaxId: currentCompany.taxId || prev.companyTaxId,
                // ตั้งค่าสถานที่ทำสัญญาอัตโนมัติจากข้อมูลบริษัท
                contractLocation: prev.contractLocation || contractLocation,
            }));
        }
    }, [currentCompany, setData]);
    
    // Handler สำหรับเลือกช่างจากฐานข้อมูล
    const handleSelectContractor = (contractor: Contractor) => {
        // รวมที่อยู่ทั้งหมด: ที่อยู่หลัก + ตำบล/แขวง + อำเภอ/เขต + จังหวัด + รหัสไปรษณีย์
        const fullAddress = [
            contractor.address,
            contractor.district ? `ต.${contractor.district}` : '',
            contractor.amphoe ? `อ.${contractor.amphoe}` : '',
            contractor.province,
            contractor.postalCode
        ].filter(Boolean).join(' ');
        
        setData(prev => ({
            ...prev,
            contractorName: contractor.contractorName,
            contractorPhone: contractor.phone,
            contractorIdCard: contractor.idCard || contractor.taxId || '',
            contractorAddress: fullAddress || '',
            // ข้อมูลสาขา (สำหรับนิติบุคคล)
            contractorBranchCode: contractor.branchCode || '',
            contractorBranchName: contractor.branchName || '',
        }));
    };
    
    // Handler สำหรับเลือกลูกค้าจากฐานข้อมูล
    const handleSelectCustomer = (customer: Customer) => {
        // เก็บ Customer ID และชื่อสำหรับ End Customer Selector
        setSelectedCustomerId(customer.id);
        setSelectedCustomerName(customer.customerName);
        
        setData(prev => ({
            ...prev,
            projectName: customer.projectName || customer.customerName,
            projectLocation: customer.address || '',
            // ถ้าลูกค้ามี End Customer Project อยู่แล้ว ให้ดึงมาด้วย
            hasEndCustomerProject: customer.hasEndCustomerProject || false,
            endCustomerProject: customer.endCustomerProject,
            showEndCustomerInPdf: customer.hasEndCustomerProject || false,
        }));
    };
    
    // Handler สำหรับเลือก End Customer จาก EndCustomerSelector
    const handleSelectEndCustomer = (endCustomer: EndCustomer) => {
        setData(prev => ({
            ...prev,
            hasEndCustomerProject: true,
            endCustomerProject: {
                projectName: endCustomer.projectName,
                projectAddress: endCustomer.projectAddress,
                contactName: endCustomer.contactName,
            } as EndCustomerProject,
            showEndCustomerInPdf: true,
        }));
    };

    // สร้างเลขที่สัญญาอัตโนมัติ
    // ใช้ sessionStorage เก็บเลขที่ generate ไว้ป้องกันการ generate ซ้ำเมื่อ refresh
    useEffect(() => {
        const SESSION_KEY = 'subcontract_docNumber';
        
        const generateNumber = async () => {
            // ถ้ากำลังแก้ไขเอกสารเดิม ไม่ต้อง generate เลขใหม่
            if (isEditing) {
                console.log('⏭️ [SC] Skip auto-generate - isEditing mode');
                hasGeneratedNumberRef.current = true;
                sessionStorage.removeItem(SESSION_KEY);
                return;
            }
            
            // ตรวจสอบว่ามีเลขเอกสารที่ valid อยู่แล้วหรือไม่
            const hasValidNumber = data.contractNumber && data.contractNumber.match(/^SC-\d{6}\d{2}$/);
            if (hasValidNumber) {
                console.log('⏭️ [SC] Skip auto-generate - already has valid number:', data.contractNumber);
                hasGeneratedNumberRef.current = true;
                sessionStorage.setItem(SESSION_KEY, data.contractNumber);
                return;
            }
            
            // ตรวจสอบ sessionStorage ว่ามีเลขที่ generate ไว้แล้วหรือไม่
            const savedDocNumber = sessionStorage.getItem(SESSION_KEY);
            if (savedDocNumber && savedDocNumber.match(/^SC-\d{6}\d{2}$/)) {
                handleDataChange('contractNumber', savedDocNumber);
                hasGeneratedNumberRef.current = true;
                return;
            }
            
            if (!data.contractNumber && currentCompany?.id && !hasGeneratedNumberRef.current && !isGeneratingNumber) {
                try {
                    setIsGeneratingNumber(true);
                    console.log('🔄 [SC] Auto-generating new document number...');
                    const docNumber = await generateDocumentNumber('subcontract' as DocumentType);
                    handleDataChange('contractNumber', docNumber);
                    hasGeneratedNumberRef.current = true;
                    // บันทึกเลขที่ใหม่ลง sessionStorage
                    sessionStorage.setItem(SESSION_KEY, docNumber);
                    console.log('✅ [SC] Generated new document number:', docNumber);
                } catch (error) {
                    console.error('❌ [SC] สร้างเลขที่สัญญาล้มเหลว:', error);
                } finally {
                    setIsGeneratingNumber(false);
                }
            }
        };
        generateNumber();
    }, [currentCompany?.id, isEditing, data.contractNumber]);

    // คำนวณ amount ของงวดงานเมื่อ totalContractAmount เปลี่ยน
    // และแปลงตัวเลขเป็นตัวอักษรภาษาไทยอัตโนมัติ
    useEffect(() => {
        if (data.totalContractAmount > 0) {
            const newMilestones = data.paymentMilestones.map(m => ({
                ...m,
                amount: (data.totalContractAmount * m.percentage) / 100
            }));
            handleDataChange('paymentMilestones', newMilestones);
            
            // แปลงตัวเลขเป็นตัวอักษรภาษาไทยอัตโนมัติ
            const thaiText = numberToThaiText(data.totalContractAmount);
            handleDataChange('totalContractAmountText', thaiText);
        } else {
            // ถ้าเป็น 0 ให้ล้างข้อความ
            handleDataChange('totalContractAmountText', '');
        }
    }, [data.totalContractAmount]);

    // Modal ยืนยันการลบ
    const openConfirmModal = (index: number, type: 'item' | 'milestone') => {
        if (type === 'item') {
            setItemToRemove(index);
        } else {
            setMilestoneToRemove(index);
        }
        setIsConfirmModalOpen(true);
    };

    const handleConfirmDelete = () => {
        if (itemToRemove !== null) {
            removeItem(itemToRemove);
            setItemToRemove(null);
        }
        if (milestoneToRemove !== null) {
            removeMilestone(milestoneToRemove);
            setMilestoneToRemove(null);
        }
        setIsConfirmModalOpen(false);
    };

    return (
        <div className="space-y-4 sm:space-y-6 p-3 sm:p-4">
            {/* Modal ยืนยันการลบ */}
            {isConfirmModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-sm w-full mx-4">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">ยืนยันการลบ</h3>
                        <p className="text-gray-600 dark:text-gray-300 mb-6">คุณต้องการลบรายการนี้หรือไม่?</p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setIsConfirmModalOpen(false)}
                                className="px-4 py-2 text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-slate-700 rounded-md hover:bg-gray-200 dark:hover:bg-slate-600"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={handleConfirmDelete}
                                className="px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700"
                            >
                                ลบ
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Form Fields */}
            <div className="space-y-6">
                {/* เลขที่สัญญา */}
                <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-medium">เลขที่สัญญา:</span> <span className="font-mono">{data.contractNumber || 'กำลังสร้าง...'}</span>
                </div>

                {/* ส่วนที่ 1: ข้อมูลผู้รับจ้าง (ช่าง) */}
                <FormDivider title="ส่วนที่ 1: ข้อมูลผู้รับจ้าง (ช่าง)" />
                <div className="space-y-4">
                    {/* Contractor Selector - เลือกช่างจากฐานข้อมูล */}
                    <ContractorSelector
                        label="เลือกข้อมูลช่าง"
                        onSelect={handleSelectContractor}
                        currentContractor={{
                            contractorName: data.contractorName,
                            phone: data.contractorPhone,
                            address: data.contractorAddress || '',
                            idCard: data.contractorIdCard || '',
                        }}
                        showSaveButton={true}
                    />
                    
                    <div>
                        <label htmlFor="contractorName" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">ชื่อช่าง/หัวหน้าชุดช่าง *</label>
                        <input type="text" id="contractorName" value={data.contractorName} onChange={(e) => handleDataChange('contractorName', e.target.value)} maxLength={INPUT_LIMITS.customerName} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100 dark:placeholder-gray-400" placeholder="นายสมชาย ช่างเก่ง" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                        <div>
                            <label htmlFor="contractorIdCard" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">เลขบัตรประชาชน/เลขผู้เสียภาษี</label>
                            <input type="text" id="contractorIdCard" value={data.contractorIdCard || ''} onChange={(e) => handleDataChange('contractorIdCard', e.target.value)} maxLength={INPUT_LIMITS.taxId} inputMode="numeric" pattern="[0-9]*" className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100 dark:placeholder-gray-400" placeholder="1234567890123" />
                        </div>
                        <div>
                            <label htmlFor="contractorPhone" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">เบอร์โทรศัพท์ *</label>
                            <input type="tel" id="contractorPhone" value={data.contractorPhone} onChange={(e) => handleDataChange('contractorPhone', e.target.value)} maxLength={INPUT_LIMITS.phone} inputMode="tel" className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100 dark:placeholder-gray-400" placeholder="08X-XXX-XXXX" />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="contractorAddress" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">ที่อยู่ผู้รับจ้าง</label>
                        <textarea id="contractorAddress" value={data.contractorAddress || ''} onChange={(e) => handleDataChange('contractorAddress', e.target.value)} rows={2} maxLength={INPUT_LIMITS.companyAddress} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100 dark:placeholder-gray-400" placeholder="ที่อยู่ผู้รับจ้าง (ถ้ามี)" />
                    </div>
                </div>

                {/* ส่วนที่ 2: ข้อมูลสัญญาและสถานที่ */}
                <FormDivider title="ส่วนที่ 2: ข้อมูลสัญญาและสถานที่" />
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                        <div>
                            <label htmlFor="contractLocation" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">ทำที่ (สถานที่ทำสัญญา)</label>
                            <div className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm text-xs sm:text-sm bg-gray-100 dark:bg-slate-700 px-3 py-2 text-gray-700 dark:text-gray-200">
                                {data.contractLocation || currentCompany?.name || 'กำลังโหลดข้อมูลบริษัท...'}
                            </div>
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">* ใช้ข้อมูลจากบริษัทที่เลือกอัตโนมัติ</p>
                        </div>
                        <div>
                            <label htmlFor="contractDate" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">วันที่ทำสัญญา</label>
                            <DatePicker
                                id="contractDate"
                                value={data.contractDate}
                                onChange={(date) => handleDataChange('contractDate', date)}
                                placeholder="เลือกวันที่"
                                className="mt-1"
                            />
                        </div>
                    </div>
                    
                    {/* Customer Selector - เลือกลูกค้าจากฐานข้อมูล */}
                    <CustomerSelector
                        label="เลือกข้อมูลลูกค้า/โครงการ"
                        onSelect={handleSelectCustomer}
                        currentCustomer={{
                            customerName: data.projectName,
                            phone: '',
                            address: data.projectLocation,
                            projectName: data.projectName,
                        }}
                        showSaveButton={false}
                    />
                    
                    <div>
                        <label htmlFor="projectName" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">ชื่อโครงการ/บ้านลูกค้า *</label>
                        <input type="text" id="projectName" value={data.projectName} onChange={(e) => handleDataChange('projectName', e.target.value)} maxLength={INPUT_LIMITS.projectName} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100 dark:placeholder-gray-400" placeholder="บ้านคุณสมศรี โครงการ ABC" />
                    </div>
                    <div>
                        <label htmlFor="projectLocation" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">สถานที่ก่อสร้าง *</label>
                        <textarea id="projectLocation" value={data.projectLocation} onChange={(e) => handleDataChange('projectLocation', e.target.value)} rows={2} maxLength={INPUT_LIMITS.projectAddress} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100 dark:placeholder-gray-400" placeholder="123/45 หมู่บ้าน ABC ถ.พระราม 2 แขวง... เขต... กรุงเทพฯ 10150" />
                    </div>
                    
                    {/* ส่วน End Customer - โครงการลูกค้าปลายทาง */}
                    <div className="border-t border-gray-200 dark:border-slate-600 pt-4 mt-4">
                        {/* Checkbox เปิด/ปิด End Customer */}
                        <div className="flex items-center mb-3">
                            <input
                                type="checkbox"
                                id="hasEndCustomerProject"
                                checked={data.hasEndCustomerProject || false}
                                onChange={(e) => {
                                    handleDataChange('hasEndCustomerProject', e.target.checked);
                                    if (!e.target.checked) {
                                        handleDataChange('endCustomerProject', undefined);
                                        handleDataChange('showEndCustomerInPdf', false);
                                    } else {
                                        handleDataChange('endCustomerProject', { projectName: '' });
                                        handleDataChange('showEndCustomerInPdf', true);
                                    }
                                }}
                                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 dark:border-gray-600 rounded dark:bg-slate-700"
                            />
                            <label htmlFor="hasEndCustomerProject" className="ml-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                                มีโครงการลูกค้าปลายทาง (End Customer)
                            </label>
                        </div>
                        
                        {/* แสดง End Customer Selector และฟอร์มเมื่อเปิดใช้งาน */}
                        {data.hasEndCustomerProject && (
                            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-700 space-y-3">
                                <p className="text-xs font-medium text-purple-700 dark:text-purple-300 mb-2">
                                    🏠 ข้อมูลโครงการลูกค้าปลายทาง
                                </p>
                                
                                {/* End Customer Selector - เลือกจากฐานข้อมูล */}
                                <EndCustomerSelector
                                    label="เลือก End Customer"
                                    onSelect={handleSelectEndCustomer}
                                    customerId={selectedCustomerId}
                                    customerName={selectedCustomerName}
                                    currentEndCustomer={data.endCustomerProject}
                                    showSaveButton={true}
                                />
                                
                                {/* ชื่อโครงการลูกค้าปลายทาง */}
                                <div>
                                    <label className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                                        ชื่อโครงการลูกค้าปลายทาง
                                    </label>
                                    <input
                                        type="text"
                                        value={data.endCustomerProject?.projectName || ''}
                                        onChange={(e) => handleDataChange('endCustomerProject', {
                                            ...data.endCustomerProject,
                                            projectName: e.target.value,
                                        } as EndCustomerProject)}
                                        maxLength={INPUT_LIMITS.projectName}
                                        className="w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-xs sm:text-sm px-3 py-2 bg-white dark:bg-slate-700 dark:text-gray-100"
                                        placeholder="เช่น บ้านคุณสมศักดิ์"
                                    />
                                </div>
                                
                                {/* ที่ตั้งโครงการ */}
                                <div>
                                    <label className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                                        ที่ตั้งโครงการ
                                    </label>
                                    <textarea
                                        value={data.endCustomerProject?.projectAddress || ''}
                                        onChange={(e) => handleDataChange('endCustomerProject', {
                                            ...data.endCustomerProject,
                                            projectAddress: e.target.value,
                                        } as EndCustomerProject)}
                                        rows={2}
                                        maxLength={INPUT_LIMITS.projectAddress}
                                        className="w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-xs sm:text-sm px-3 py-2 bg-white dark:bg-slate-700 dark:text-gray-100"
                                        placeholder="เช่น 123 หมู่ 5 ต.แวง อ.แกดำ จ.มหาสารคาม"
                                    />
                                </div>
                                
                                {/* ชื่อผู้ติดต่อที่โครงการ */}
                                <div>
                                    <label className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                                        ชื่อผู้ติดต่อที่โครงการ
                                    </label>
                                    <input
                                        type="text"
                                        value={data.endCustomerProject?.contactName || ''}
                                        onChange={(e) => handleDataChange('endCustomerProject', {
                                            ...data.endCustomerProject,
                                            contactName: e.target.value,
                                        } as EndCustomerProject)}
                                        maxLength={INPUT_LIMITS.contactPerson}
                                        className="w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-xs sm:text-sm px-3 py-2 bg-white dark:bg-slate-700 dark:text-gray-100"
                                        placeholder="เช่น คุณสมศรี"
                                    />
                                </div>
                                
                                {/* Checkbox แสดงใน PDF */}
                                <div className="flex items-center mt-3 pt-3 border-t border-purple-200 dark:border-purple-700">
                                    <input
                                        type="checkbox"
                                        id="showEndCustomerInPdf"
                                        checked={data.showEndCustomerInPdf || false}
                                        onChange={(e) => handleDataChange('showEndCustomerInPdf', e.target.checked)}
                                        className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 dark:border-gray-600 rounded dark:bg-slate-700"
                                    />
                                    <label htmlFor="showEndCustomerInPdf" className="ml-2 block text-sm font-medium text-purple-700 dark:text-purple-300">
                                        แสดงข้อมูลโครงการลูกค้าปลายทางในเอกสาร PDF
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ส่วนที่ 3: ลักษณะงานที่จ้าง (Scope of Work) */}
                <FormDivider title="ส่วนที่ 3: ลักษณะงานที่จ้าง (Scope of Work)" />
                <div className="space-y-4">
                    <div>
                        <label htmlFor="scopeOfWork" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">รายละเอียดงานที่จ้าง *</label>
                        <textarea id="scopeOfWork" value={data.scopeOfWork} onChange={(e) => handleDataChange('scopeOfWork', e.target.value)} rows={3} maxLength={INPUT_LIMITS.workScope} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100 dark:placeholder-gray-400" placeholder="เช่น งานปูกระเบื้องห้องน้ำ 2 ห้อง, งานทาสีภายนอก ฯลฯ" />
                    </div>
                    
                    {/* ตารางรายการงาน */}
                    <div className="overflow-x-auto -mx-3 sm:mx-0">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600 text-xs sm:text-sm" style={{ tableLayout: 'fixed' }}>
                            <thead className="bg-gray-50 dark:bg-slate-700">
                                <tr>
                                    <th scope="col" className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider" style={{ width: '6%' }}>ลำดับ</th>
                                    <th scope="col" className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider" style={{ width: '28%' }}>รายการงาน</th>
                                    <th scope="col" className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider" style={{ width: '14%' }}>ปริมาณ</th>
                                    <th scope="col" className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider" style={{ width: '12%' }}>หน่วย</th>
                                    <th scope="col" className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider" style={{ width: '16%' }}>ราคา/หน่วย</th>
                                    <th scope="col" className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider" style={{ width: '16%' }}>รวม (บาท)</th>
                                    <th scope="col" className="relative px-2 sm:px-3 py-1.5 sm:py-2" style={{ width: '8%' }}><span className="sr-only">ลบ</span></th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-gray-600">
                                {data.items.map((item, index) => (
                                    <tr key={index}>
                                        <td className="px-2 sm:px-3 py-1 text-center text-gray-500 dark:text-gray-400">{index + 1}</td>
                                        <td className="px-1 sm:px-2 py-1">
                                            <textarea value={item.description} onChange={(e) => handleItemChange(index, 'description', e.target.value)} rows={2} maxLength={INPUT_LIMITS.itemDescription} className="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-300 focus:ring-indigo-200 focus:ring-opacity-50 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-gray-100 dark:placeholder-gray-400" placeholder="รายละเอียดงาน"></textarea>
                                        </td>
                                        <td className="px-1 sm:px-2 py-1">
                                            <input type="number" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', parseNumberInput(e.target.value))} inputMode="decimal" min={NUMBER_LIMITS.quantity.min} max={NUMBER_LIMITS.quantity.max} step={NUMBER_LIMITS.quantity.step} className="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-300 focus:ring-indigo-200 focus:ring-opacity-50 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-gray-100 px-1.5 sm:px-2" />
                                        </td>
                                        <td className="px-1 sm:px-2 py-1">
                                            <input type="text" value={item.unit} onChange={(e) => handleItemChange(index, 'unit', e.target.value)} maxLength={INPUT_LIMITS.unit} className="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-300 focus:ring-indigo-200 focus:ring-opacity-50 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-gray-100 px-1.5 sm:px-2" />
                                        </td>
                                        <td className="px-1 sm:px-2 py-1">
                                            <input type="number" step="0.01" value={item.unitPrice} onChange={(e) => handleItemChange(index, 'unitPrice', parseNumberInput(e.target.value))} inputMode="decimal" min={NUMBER_LIMITS.price.min} max={NUMBER_LIMITS.price.max} className="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-300 focus:ring-indigo-200 focus:ring-opacity-50 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-gray-100 px-1.5 sm:px-2" />
                                        </td>
                                        <td className="px-1 sm:px-2 py-1">
                                            <input type="number" step="0.01" value={item.amount} readOnly className="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm text-xs sm:text-sm bg-gray-100 dark:bg-slate-600 text-gray-900 dark:text-gray-100 font-medium px-1.5 sm:px-2" />
                                        </td>
                                        <td className="px-1 sm:px-2 py-1 text-center">
                                            <button type="button" onClick={() => openConfirmModal(index, 'item')} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30">
                                                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-gray-50 dark:bg-slate-700">
                                <tr>
                                    <td colSpan={5} className="px-2 sm:px-3 py-2 text-right font-semibold text-gray-700 dark:text-gray-200">รวมทั้งสิ้น:</td>
                                    <td className="px-2 sm:px-3 py-2 font-bold text-indigo-600 dark:text-indigo-400">{data.totalWorkAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                    <button type="button" onClick={addItem} className="mt-3 sm:mt-4 inline-flex items-center px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-xs sm:text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                        <svg className="-ml-0.5 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                        </svg>
                        เพิ่มรายการงาน
                    </button>
                    
                    <div>
                        <label htmlFor="materialNote" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">หมายเหตุเรื่องวัสดุ</label>
                        <input type="text" id="materialNote" value={data.materialNote || ''} onChange={(e) => handleDataChange('materialNote', e.target.value)} maxLength={INPUT_LIMITS.notes} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100 dark:placeholder-gray-400" placeholder="เช่น ค่าวัสดุผู้ว่าจ้างเป็นผู้จัดหา" />
                    </div>
                </div>

                {/* ส่วนที่ 4: ระยะเวลาการทำงาน */}
                <FormDivider title="ส่วนที่ 4: ระยะเวลาการทำงาน" />
                <div className="space-y-4">
                    <div className="flex items-center">
                        <input type="checkbox" id="showWorkPeriod" checked={data.showWorkPeriod} onChange={(e) => handleDataChange('showWorkPeriod', e.target.checked)} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded dark:bg-slate-700" />
                        <label htmlFor="showWorkPeriod" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">แสดงข้อนี้ในสัญญา</label>
                    </div>
                    {data.showWorkPeriod && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                            <div>
                                <label htmlFor="startDate" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">วันที่เริ่มทำงาน</label>
                                <DatePicker
                                    id="startDate"
                                    value={data.startDate}
                                    onChange={(date) => handleDataChange('startDate', date)}
                                    placeholder="เลือกวันที่"
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <label htmlFor="endDate" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">วันที่แล้วเสร็จ</label>
                                <DatePicker
                                    id="endDate"
                                    value={data.endDate}
                                    onChange={(date) => handleDataChange('endDate', date)}
                                    placeholder="เลือกวันที่"
                                    className="mt-1"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* ส่วนที่ 5: การชำระเงินและการแบ่งงวดงาน */}
                <FormDivider title="ส่วนที่ 5: การชำระเงินและการแบ่งงวดงาน" />
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                        <div>
                            <label htmlFor="totalContractAmount" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">ค่าจ้างรวมทั้งสิ้น (บาท)</label>
                            <input type="number" id="totalContractAmount" value={data.totalContractAmount} onChange={(e) => handleDataChange('totalContractAmount', parseNumberInput(e.target.value))} inputMode="decimal" min={NUMBER_LIMITS.price.min} max={NUMBER_LIMITS.price.max} step={NUMBER_LIMITS.price.step} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100" />
                        </div>
                        <div>
                            <label htmlFor="totalContractAmountText" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">ค่าจ้างเป็นตัวอักษร (คำนวณอัตโนมัติ)</label>
                            <input type="text" id="totalContractAmountText" value={data.totalContractAmountText} readOnly className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm text-xs sm:text-sm bg-gray-100 dark:bg-slate-600 text-gray-700 dark:text-gray-200 font-medium" placeholder="แสดงอัตโนมัติเมื่อกรอกค่าจ้าง" />
                        </div>
                    </div>
                    
                    {/* ตารางงวดงาน */}
                    <div className="overflow-x-auto -mx-3 sm:mx-0">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600 text-xs sm:text-sm" style={{ tableLayout: 'fixed' }}>
                            <thead className="bg-green-50 dark:bg-green-900/30">
                                <tr>
                                    <th scope="col" className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider" style={{ width: '8%' }}>งวดที่</th>
                                    <th scope="col" className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider" style={{ width: '38%' }}>รายละเอียดงานที่ต้องแล้วเสร็จ</th>
                                    <th scope="col" className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider" style={{ width: '18%' }}>% ของยอด</th>
                                    <th scope="col" className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider" style={{ width: '26%' }}>จำนวนเงิน (บาท)</th>
                                    <th scope="col" className="relative px-2 sm:px-3 py-1.5 sm:py-2" style={{ width: '10%' }}><span className="sr-only">ลบ</span></th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-gray-600">
                                {data.paymentMilestones.map((milestone, index) => (
                                    <tr key={index}>
                                        <td className="px-2 sm:px-3 py-1 text-center font-medium text-gray-700 dark:text-gray-200">{milestone.milestone}</td>
                                        <td className="px-1 sm:px-2 py-1">
                                            <textarea value={milestone.description} onChange={(e) => handleMilestoneChange(index, 'description', e.target.value)} rows={2} maxLength={INPUT_LIMITS.itemDescription} className="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-green-300 focus:ring-green-200 focus:ring-opacity-50 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-gray-100 dark:placeholder-gray-400" placeholder="เช่น เบิกเงินล่วงหน้า / เมื่อดำเนินการ...เสร็จสิ้น"></textarea>
                                        </td>
                                        <td className="px-1 sm:px-2 py-1">
                                            <input type="number" value={milestone.percentage} onChange={(e) => handleMilestoneChange(index, 'percentage', parseNumberInput(e.target.value))} inputMode="decimal" min={NUMBER_LIMITS.percentage.min} max={NUMBER_LIMITS.percentage.max} step={NUMBER_LIMITS.percentage.step} className="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-green-300 focus:ring-green-200 focus:ring-opacity-50 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-gray-100 px-1.5 sm:px-2" />
                                        </td>
                                        <td className="px-1 sm:px-2 py-1">
                                            <input type="number" step="0.01" value={milestone.amount} readOnly className="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm text-xs sm:text-sm bg-gray-100 dark:bg-slate-600 text-gray-900 dark:text-gray-100 font-medium px-1.5 sm:px-2" />
                                        </td>
                                        <td className="px-1 sm:px-2 py-1 text-center">
                                            <button type="button" onClick={() => openConfirmModal(index, 'milestone')} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30">
                                                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <button type="button" onClick={addMilestone} className="mt-3 sm:mt-4 inline-flex items-center px-2 sm:px-3 py-1.5 sm:py-2 border border-green-300 dark:border-green-600 shadow-sm text-xs sm:text-sm leading-4 font-medium rounded-md text-green-700 dark:text-green-400 bg-white dark:bg-slate-700 hover:bg-green-50 dark:hover:bg-green-900/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
                        <svg className="-ml-0.5 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                        </svg>
                        เพิ่มงวดงาน
                    </button>
                    <p className="text-xs text-gray-500 dark:text-gray-400 italic">* การจ่ายเงินจะกระทำเมื่อผู้ว่าจ้างได้ตรวจรับงานในงวดนั้นๆ ว่าถูกต้องเรียบร้อยแล้วเท่านั้น</p>
                </div>

                {/* ส่วนที่ 6: เครื่องมือและวัสดุอุปกรณ์ */}
                <FormDivider title="ส่วนที่ 6: เครื่องมือและวัสดุอุปกรณ์" />
                <div className="space-y-4">
                    <div className="flex items-center">
                        <input type="checkbox" id="showToolsSection" checked={data.showToolsSection} onChange={(e) => handleDataChange('showToolsSection', e.target.checked)} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded dark:bg-slate-700" />
                        <label htmlFor="showToolsSection" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">แสดงข้อนี้ในสัญญา</label>
                    </div>
                    {data.showToolsSection && (
                        <div>
                            <label className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">วัสดุสิ้นเปลือง (เช่น ตะปู ใบตัด ลวดเชื่อม) ให้ถือเป็นความรับผิดชอบของ:</label>
                            <div className="flex gap-4">
                                <label className="inline-flex items-center">
                                    <input type="radio" name="consumableResponsibility" value="employer" checked={data.consumableResponsibility === 'employer'} onChange={(e) => handleDataChange('consumableResponsibility', 'employer')} className="form-radio h-4 w-4 text-indigo-600 dark:bg-slate-700 dark:border-gray-600" />
                                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">ผู้ว่าจ้าง</span>
                                </label>
                                <label className="inline-flex items-center">
                                    <input type="radio" name="consumableResponsibility" value="contractor" checked={data.consumableResponsibility === 'contractor'} onChange={(e) => handleDataChange('consumableResponsibility', 'contractor')} className="form-radio h-4 w-4 text-indigo-600 dark:bg-slate-700 dark:border-gray-600" />
                                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">ผู้รับจ้าง</span>
                                </label>
                            </div>
                        </div>
                    )}
                </div>

                {/* ส่วนที่ 7: มาตรฐานงานและการรับประกัน */}
                <FormDivider title="ส่วนที่ 7: มาตรฐานงานและการรับประกัน" />
                <div className="space-y-4">
                    <div className="flex items-center">
                        <input type="checkbox" id="showWarrantySection" checked={data.showWarrantySection} onChange={(e) => handleDataChange('showWarrantySection', e.target.checked)} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded dark:bg-slate-700" />
                        <label htmlFor="showWarrantySection" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">แสดงข้อนี้ในสัญญา</label>
                    </div>
                    {data.showWarrantySection && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                            <div>
                                <label htmlFor="defectFixDays" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">แก้ไขงานบกพร่องภายใน (วัน)</label>
                                <input type="number" id="defectFixDays" value={data.defectFixDays} onChange={(e) => handleDataChange('defectFixDays', parseIntInput(e.target.value))} inputMode="numeric" min={NUMBER_LIMITS.days.min} max={NUMBER_LIMITS.days.max} step={NUMBER_LIMITS.days.step} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100" />
                            </div>
                            <div>
                                <label htmlFor="warrantyMonths" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">รับประกันผลงาน (เดือน)</label>
                                <input type="number" id="warrantyMonths" value={data.warrantyMonths} onChange={(e) => handleDataChange('warrantyMonths', parseIntInput(e.target.value))} inputMode="numeric" min={NUMBER_LIMITS.days.min} max={NUMBER_LIMITS.days.max} step={NUMBER_LIMITS.days.step} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100" />
                            </div>
                        </div>
                    )}
                </div>

                {/* ส่วนที่ 8: การทิ้งงานและการปรับ */}
                <FormDivider title="ส่วนที่ 8: การทิ้งงานและการปรับ" />
                <div className="space-y-4">
                    <div className="flex items-center">
                        <input type="checkbox" id="showPenaltySection" checked={data.showPenaltySection} onChange={(e) => handleDataChange('showPenaltySection', e.target.checked)} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded dark:bg-slate-700" />
                        <label htmlFor="showPenaltySection" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">แสดงข้อนี้ในสัญญา</label>
                    </div>
                    {data.showPenaltySection && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                            <div>
                                <label htmlFor="abandonDays" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">ไม่เข้าทำงานติดต่อกันเกิน (วัน)</label>
                                <input type="number" id="abandonDays" value={data.abandonDays} onChange={(e) => handleDataChange('abandonDays', parseIntInput(e.target.value))} inputMode="numeric" min={NUMBER_LIMITS.days.min} max={NUMBER_LIMITS.days.max} step={NUMBER_LIMITS.days.step} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100" />
                            </div>
                            <div>
                                <label htmlFor="penaltyPerDay" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">ปรับเป็นรายวัน วันละ (บาท)</label>
                                <input type="number" id="penaltyPerDay" value={data.penaltyPerDay} onChange={(e) => handleDataChange('penaltyPerDay', parseIntInput(e.target.value))} inputMode="decimal" min={NUMBER_LIMITS.price.min} max={NUMBER_LIMITS.price.max} step={NUMBER_LIMITS.price.step} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100" />
                            </div>
                        </div>
                    )}
                </div>

                {/* ส่วนที่ 9: ส่วนลงนาม */}
                <FormDivider title="ส่วนที่ 9: ส่วนลงนาม" />
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                        <div>
                            <label htmlFor="employerSignName" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">ชื่อผู้ว่าจ้าง (ลงนาม)</label>
                            <input type="text" id="employerSignName" value={data.employerSignName} onChange={(e) => handleDataChange('employerSignName', e.target.value)} maxLength={INPUT_LIMITS.signerName} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100" />
                        </div>
                        <div>
                            <label htmlFor="contractorSignName" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">ชื่อผู้รับจ้าง (ลงนาม)</label>
                            <input type="text" id="contractorSignName" value={data.contractorSignName} onChange={(e) => handleDataChange('contractorSignName', e.target.value)} maxLength={INPUT_LIMITS.signerName} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100" />
                        </div>
                        <div>
                            <label htmlFor="witnessName" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">ชื่อพยาน (ถ้ามี)</label>
                            <input type="text" id="witnessName" value={data.witnessName || ''} onChange={(e) => handleDataChange('witnessName', e.target.value)} maxLength={INPUT_LIMITS.witnessName} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100" />
                        </div>
                    </div>
                </div>

                {/* ส่วนที่ 10: ข้อมูลเพิ่มเติม */}
                <FormDivider title="ส่วนที่ 10: ข้อมูลเพิ่มเติม" />
                <div className="space-y-4">
                    <div>
                        <label htmlFor="notes" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">หมายเหตุเพิ่มเติม</label>
                        <textarea id="notes" value={data.notes || ''} onChange={(e) => handleDataChange('notes', e.target.value)} rows={3} maxLength={INPUT_LIMITS.notes} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100 dark:placeholder-gray-400" placeholder="หมายเหตุหรือเงื่อนไขเพิ่มเติม..." />
                    </div>
                    <div>
                        <label htmlFor="issuedBy" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">ผู้ออกเอกสาร</label>
                        <input type="text" id="issuedBy" value={data.issuedBy || ''} onChange={(e) => handleDataChange('issuedBy', e.target.value)} maxLength={INPUT_LIMITS.signerName} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SubcontractForm;

