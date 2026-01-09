import React, { useRef, useState, useEffect } from 'react';
import { QuotationData, QuotationItem, LogoType, EndCustomerProject } from '../types';
import { formatDateForInput } from '../utils/dateUtils';
import CustomerSelector from './CustomerSelector';
import { generateDocumentNumber } from '../services/documentNumber';
import { useCompany } from '../contexts/CompanyContext';
import { numberToThaiText } from '../utils/numberToThaiText';

export interface QuotationFormProps {
    data: QuotationData;
    setData: React.Dispatch<React.SetStateAction<QuotationData>>;
    sharedLogo?: string | null;
    sharedLogoUrl?: string | null;
    sharedLogoType?: LogoType;
    companyDefaultLogoUrl?: string | null;
    onLogoChange?: (logo: string | null, logoUrl: string | null, logoType: LogoType) => void;
    onSetDefaultLogo?: (logoUrl: string) => Promise<void>;
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

const QuotationForm: React.FC<QuotationFormProps> = ({ 
    data, 
    setData,
    sharedLogo,
    sharedLogoUrl,
    sharedLogoType,
    companyDefaultLogoUrl,
    onLogoChange,
    onSetDefaultLogo
}) => {
    const { currentCompany } = useCompany(); // ดึงข้อมูลบริษัทจาก context
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [itemToRemove, setItemToRemove] = useState<number | null>(null);
    const hasSyncedCompanyRef = useRef<string | undefined>(undefined); // Track ว่า sync แล้วหรือยัง

    const handleDataChange = <K extends keyof QuotationData,>(key: K, value: QuotationData[K]) => {
        setData(prev => ({ ...prev, [key]: value }));
    };
    
    const handleItemChange = (index: number, field: keyof QuotationItem, value: string | number) => {
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

    // คำนวณยอดรวมทั้งหมด
    const calculateTotals = (items: QuotationItem[] = data.items) => {
        const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
        const taxAmount = (subtotal * data.taxRate) / 100;
        const total = subtotal + taxAmount - data.discount;
        
        setData(prev => ({
            ...prev,
            subtotal,
            taxAmount,
            total,
        }));
    };

    const addItem = () => {
        const newItem: QuotationItem = {
            description: '',
            quantity: 1,
            unit: 'ชิ้น',
            unitPrice: 0,
            amount: 0,
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
     */
    const handleGenerateQuotationNumber = async () => {
        try {
            const newQuotationNumber = await generateDocumentNumber('quotation');
            handleDataChange('quotationNumber', newQuotationNumber);
        } catch (error) {
            console.error('Error generating quotation number:', error);
            alert('ไม่สามารถสร้างเลขที่เอกสารได้ กรุณาลองใหม่อีกครั้ง');
        }
    };

    /**
     * Auto-generate เลขที่เอกสารเมื่อฟอร์มว่างหรือเป็นค่า default
     */
    useEffect(() => {
        const isDefaultOrEmpty = !data.quotationNumber || 
                                  data.quotationNumber.match(/^QT-\d{4}-\d{3}$/) || // รูปแบบเก่า
                                  data.quotationNumber === '';
        
        if (isDefaultOrEmpty) {
            handleGenerateQuotationNumber();
        }
    }, []); // เรียกครั้งเดียวตอน mount

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

    // คำนวณ totals เมื่อ items, taxRate, หรือ discount เปลี่ยน
    useEffect(() => {
        calculateTotals();
    }, [data.taxRate, data.discount]);

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
                    <span className="font-medium">เลขที่ใบเสนอราคา:</span> <span className="font-mono">{data.quotationNumber || 'กำลังสร้าง...'}</span>
                </div>
                
                {/* ส่วนที่ 1: ข้อมูลลูกค้า */}
                <FormDivider title="ส่วนที่ 1: ข้อมูลลูกค้า/ผู้รับเสนอราคา" />
                <div className="space-y-4">
                    {/* CustomerSelector */}
                    <CustomerSelector
                        label="เลือกข้อมูลลูกค้า"
                        onSelect={(customer) => {
                            handleDataChange('customerName', customer.customerName);
                            handleDataChange('customerAddress', customer.address);
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
                            projectName: '',
                        }}
                        showSaveButton={true}
                    />

                    <div>
                        <label htmlFor="customerName" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">ชื่อลูกค้า/บริษัท</label>
                        <input type="text" id="customerName" value={data.customerName} onChange={(e) => handleDataChange('customerName', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100 dark:border-slate-600" />
                    </div>
                    <div>
                        <label htmlFor="customerAddress" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">ที่อยู่</label>
                        <textarea id="customerAddress" value={data.customerAddress} onChange={(e) => handleDataChange('customerAddress', e.target.value)} rows={3} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100 dark:border-slate-600" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                        <div>
                            <label htmlFor="customerPhone" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">เบอร์โทรศัพท์</label>
                            <input type="text" id="customerPhone" value={data.customerPhone || ''} onChange={(e) => handleDataChange('customerPhone', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100 dark:border-slate-600" />
                        </div>
                        <div>
                            <label htmlFor="customerEmail" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">อีเมล</label>
                            <input type="email" id="customerEmail" value={data.customerEmail || ''} onChange={(e) => handleDataChange('customerEmail', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100 dark:border-slate-600" />
                        </div>
                        <div>
                            <label htmlFor="customerTaxId" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">เลขประจำตัวผู้เสียภาษี</label>
                            <input type="text" id="customerTaxId" value={data.customerTaxId || ''} onChange={(e) => handleDataChange('customerTaxId', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100 dark:border-slate-600" />
                        </div>
                    </div>
                    
                    {/* ส่วนโครงการลูกค้าปลายทาง (End Customer Project) */}
                    <div className="border-t border-gray-200 dark:border-slate-600 pt-4 mt-4">
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
                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                            />
                            <label htmlFor="hasEndCustomerProject" className="ml-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                                มีโครงการลูกค้าปลายทาง (End Customer)
                            </label>
                        </div>
                        
                        {data.hasEndCustomerProject && (
                            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-700 space-y-3">
                                <p className="text-xs font-medium text-purple-700 dark:text-purple-300 mb-2">
                                    🏠 ข้อมูลโครงการลูกค้าปลายทาง
                                </p>
                                <div>
                                    <label className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                                        ชื่อโครงการลูกค้าปลายทาง
                                    </label>
                                    <input
                                        type="text"
                                        value={data.endCustomerProject?.projectName || ''}
                                        onChange={(e) => handleDataChange('endCustomerProject', {
                                            ...data.endCustomerProject,
                                            projectName: e.target.value
                                        } as EndCustomerProject)}
                                        className="w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm px-3 py-2 bg-white dark:bg-slate-700 dark:text-gray-100"
                                        placeholder="เช่น บ้านคุณสมศักดิ์"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                                        ที่ตั้งโครงการ
                                    </label>
                                    <textarea
                                        value={data.endCustomerProject?.projectAddress || ''}
                                        onChange={(e) => handleDataChange('endCustomerProject', {
                                            ...data.endCustomerProject,
                                            projectAddress: e.target.value
                                        } as EndCustomerProject)}
                                        rows={2}
                                        className="w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm px-3 py-2 bg-white dark:bg-slate-700 dark:text-gray-100"
                                        placeholder="เช่น 123 หมู่ 5 ต.แวง อ.แกดำ จ.มหาสารคาม"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                                        ชื่อผู้ติดต่อที่โครงการ
                                    </label>
                                    <input
                                        type="text"
                                        value={data.endCustomerProject?.contactName || ''}
                                        onChange={(e) => handleDataChange('endCustomerProject', {
                                            ...data.endCustomerProject,
                                            contactName: e.target.value
                                        } as EndCustomerProject)}
                                        className="w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm px-3 py-2 bg-white dark:bg-slate-700 dark:text-gray-100"
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
                                        className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                                    />
                                    <label htmlFor="showEndCustomerInPdf" className="ml-2 block text-sm font-medium text-purple-700 dark:text-purple-300">
                                        แสดงข้อมูลโครงการลูกค้าปลายทางในเอกสาร PDF
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ส่วนที่ 2: รายละเอียดเอกสาร */}
                <FormDivider title="ส่วนที่ 2: รายละเอียดเอกสาร" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                    <div>
                        <label htmlFor="quotationDate" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">วันที่ออกใบเสนอราคา</label>
                        <input type="date" id="quotationDate" value={formatDateForInput(data.quotationDate)} onChange={(e) => handleDataChange('quotationDate', e.target.value ? new Date(e.target.value) : null)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100 dark:border-slate-600" />
                    </div>
                    <div>
                        <label htmlFor="validUntilDate" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">วันที่หมดอายุใบเสนอราคา</label>
                        <input type="date" id="validUntilDate" value={formatDateForInput(data.validUntilDate)} onChange={(e) => handleDataChange('validUntilDate', e.target.value ? new Date(e.target.value) : null)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100 dark:border-slate-600" />
                    </div>
                    <div>
                        <label htmlFor="referenceNumber" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">เลขที่อ้างอิง</label>
                        <input type="text" id="referenceNumber" value={data.referenceNumber || ''} onChange={(e) => handleDataChange('referenceNumber', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100 dark:border-slate-600" />
                    </div>
                </div>

                {/* ส่วนที่ 3: รายการสินค้า/บริการ */}
                <FormDivider title="ส่วนที่ 3: รายการสินค้า/บริการ" />
                <div className="overflow-x-auto -mx-3 sm:mx-0">
                    <table className="min-w-full divide-y divide-gray-200 text-xs sm:text-sm">
                        <thead className="bg-gray-50 dark:bg-slate-700">
                            <tr>
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
                                <tr key={index}>
                                    <td className="px-1 sm:px-2 py-1 whitespace-nowrap">
                                        <textarea value={item.description} onChange={(e) => handleItemChange(index, 'description', e.target.value)} rows={2} className="w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-300 focus:ring-indigo-200 focus:ring-opacity-50 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-gray-100"></textarea>
                                    </td>
                                    <td className="px-1 sm:px-2 py-1 whitespace-nowrap">
                                        <input type="number" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)} className="w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-300 focus:ring-indigo-200 focus:ring-opacity-50 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-gray-100" />
                                    </td>
                                    <td className="px-1 sm:px-2 py-1 whitespace-nowrap">
                                        <input type="text" value={item.unit} onChange={(e) => handleItemChange(index, 'unit', e.target.value)} className="w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-300 focus:ring-indigo-200 focus:ring-opacity-50 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-gray-100" />
                                    </td>
                                    <td className="px-1 sm:px-2 py-1 whitespace-nowrap">
                                        <input type="number" step="0.01" value={item.unitPrice} onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)} className="w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-300 focus:ring-indigo-200 focus:ring-opacity-50 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-gray-100" />
                                    </td>
                                    <td className="px-1 sm:px-2 py-1 whitespace-nowrap">
                                        <input type="number" step="0.01" value={item.amount} readOnly className="w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm text-xs sm:text-sm bg-gray-100 dark:bg-slate-600 text-gray-900 dark:text-gray-100 font-medium" />
                                    </td>
                                    <td className="px-1 sm:px-2 py-1 whitespace-nowrap text-center">
                                        <button type="button" onClick={() => openConfirmModal(index)} className="text-red-600 hover:text-red-900 p-1 rounded-full hover:bg-red-100">
                                            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <button type="button" onClick={addItem} className="mt-3 sm:mt-4 inline-flex items-center px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 dark:border-slate-600 shadow-sm text-xs sm:text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                    <svg className="-ml-0.5 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    เพิ่มรายการ
                </button>

                {/* ส่วนที่ 4: สรุปยอดเงิน */}
                <FormDivider title="ส่วนที่ 4: สรุปยอดเงิน" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-3 sm:space-y-4">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                            <label htmlFor="taxRate" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">อัตราภาษีมูลค่าเพิ่ม (%)</label>
                            <input type="number" id="taxRate" value={data.taxRate} onChange={(e) => handleDataChange('taxRate', parseFloat(e.target.value) || 0)} step="0.01" className="w-full sm:w-24 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100 dark:border-slate-600" />
                        </div>
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                            <label htmlFor="discount" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">ส่วนลด (บาท)</label>
                            <input type="number" id="discount" value={data.discount} onChange={(e) => handleDataChange('discount', parseFloat(e.target.value) || 0)} step="0.01" className="w-full sm:w-32 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100 dark:border-slate-600" />
                        </div>
                    </div>
                    <div className="space-y-2 bg-gray-50 dark:bg-slate-700 p-4 rounded-lg">
                        <div className="flex justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-400">ยอดรวมก่อนภาษี:</span>
                            <span className="text-sm font-medium dark:text-gray-200">{data.subtotal.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-400">ภาษีมูลค่าเพิ่ม ({data.taxRate}%):</span>
                            <span className="text-sm font-medium dark:text-gray-200">{data.taxAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท</span>
                        </div>
                        {data.discount > 0 && (
                            <div className="flex justify-between text-red-600 dark:text-red-400">
                                <span className="text-sm">ส่วนลด:</span>
                                <span className="text-sm font-medium">-{data.discount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท</span>
                            </div>
                        )}
                        <div className="flex justify-between pt-2 border-t border-gray-300 dark:border-gray-600">
                            <span className="text-base font-semibold text-gray-900 dark:text-gray-100">ยอดรวมทั้งสิ้น:</span>
                            <span className="text-base font-bold text-indigo-600 dark:text-indigo-400">{data.total.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท</span>
                        </div>
                        {/* แสดงยอดรวมเป็นตัวอักษรภาษาไทย */}
                        {data.total > 0 && (
                            <div className="pt-2 text-center">
                                <span className="text-sm text-gray-600 dark:text-gray-400 italic">({numberToThaiText(data.total)})</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* ส่วนที่ 5: ข้อมูลเพิ่มเติม */}
                <FormDivider title="ส่วนที่ 5: ข้อมูลเพิ่มเติม" />
                <div className="space-y-3 sm:space-y-4">
                    <div>
                        <label htmlFor="paymentTerms" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">เงื่อนไขการชำระเงิน</label>
                        <textarea id="paymentTerms" value={data.paymentTerms || ''} onChange={(e) => handleDataChange('paymentTerms', e.target.value)} rows={2} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100 dark:border-slate-600" placeholder="เช่น ชำระภายใน 30 วัน, ชำระเงินสด" />
                    </div>
                    <div>
                        <label htmlFor="deliveryTerms" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">เงื่อนไขการส่งมอบ</label>
                        <textarea id="deliveryTerms" value={data.deliveryTerms || ''} onChange={(e) => handleDataChange('deliveryTerms', e.target.value)} rows={2} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100 dark:border-slate-600" placeholder="เช่น ส่งมอบภายใน 15 วัน, ส่งมอบที่สถานที่ก่อสร้าง" />
                    </div>
                    <div>
                        <label htmlFor="notes" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">หมายเหตุ</label>
                        <textarea id="notes" value={data.notes || ''} onChange={(e) => handleDataChange('notes', e.target.value)} rows={3} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100 dark:border-slate-600" />
                    </div>
                    <div>
                        <label htmlFor="issuedBy" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">ผู้ออกเอกสาร</label>
                        <input type="text" id="issuedBy" value={data.issuedBy || ''} onChange={(e) => handleDataChange('issuedBy', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100 dark:border-slate-600" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QuotationForm;

