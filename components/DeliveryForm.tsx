import React, { useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { DeliveryNoteData, WorkItem, LogoType, EndCustomerProject } from '../types';
import CustomerSelector from './CustomerSelector';
import DatePicker from './DatePicker';
import { generateDocumentNumber } from '../services/documentNumber';
import { INPUT_LIMITS, NUMBER_LIMITS } from '../utils/inputValidation';
import { parseNumberInput } from '../utils/numberInput';

export interface DeliveryFormProps {
    data: DeliveryNoteData;
    setData: React.Dispatch<React.SetStateAction<DeliveryNoteData>>;
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
            <div className="w-full border-t border-gray-300 dark:border-slate-600" />
        </div>
        <div className="relative flex justify-start">
            <span className="bg-white dark:bg-slate-800 pr-3 text-lg font-medium text-gray-900 dark:text-gray-100">{title}</span>
        </div>
    </div>
);

const DeliveryForm: React.FC<DeliveryFormProps> = ({ 
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
    const { t } = useTranslation();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [itemToRemove, setItemToRemove] = useState<number | null>(null);
    const [isGeneratingNumber, setIsGeneratingNumber] = useState(false); // สถานะกำลังสร้างเลขเอกสาร
    const hasGeneratedNumberRef = useRef(false); // Track ว่า generate เลขแล้วหรือยัง

    const handleDataChange = <K extends keyof DeliveryNoteData,>(key: K, value: DeliveryNoteData[K]) => {
        setData(prev => ({ ...prev, [key]: value }));
    };
    
    const handleItemChange = (index: number, field: keyof WorkItem, value: string | number) => {
        const newItems = [...data.items];
        const item = newItems[index];
        (item[field] as any) = value; // Type assertion to assign value
        handleDataChange('items', newItems);
    };

    const addItem = () => {
        setData(prev => ({
            ...prev,
            items: [...prev.items, { description: '', quantity: 1, unit: 'งาน', notes: '' }]
        }));
    };

    const removeItem = (index: number) => {
        setData(prev => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index)
        }));
        setIsConfirmModalOpen(false);
        setItemToRemove(null);
    };
    
    const openConfirmModal = (index: number) => {
        setItemToRemove(index);
        setIsConfirmModalOpen(true);
    };

    /**
     * จัดการการเปลี่ยนแปลงโลโก้จาก LogoManager component
     */
    const handleLogoChange = (logo: string | null, logoUrl: string | null, logoType: LogoType) => {
        // ใช้ onLogoChange ถ้ามี (Shared Logo) มิฉะนั้นใช้ setData (แบบเดิม)
        if (onLogoChange) {
            onLogoChange(logo, logoUrl, logoType);
        } else {
            setData(prev => ({
                ...prev,
                logo,
                logoUrl,
                logoType,
            }));
        }
    };

    /**
     * สร้างเลขที่เอกสารอัตโนมัติ
     * @param force - บังคับสร้างเลขใหม่แม้จะมีเลขอยู่แล้ว
     */
    const handleGenerateDocNumber = async (force: boolean = false) => {
        // ป้องกัน double generate
        if (hasGeneratedNumberRef.current && !force) {
            return;
        }
        
        try {
            setIsGeneratingNumber(true);
            const newDocNumber = await generateDocumentNumber('delivery');
            handleDataChange('docNumber', newDocNumber);
            hasGeneratedNumberRef.current = true;
        } catch (error) {
            console.error('Error generating document number:', error);
        } finally {
            setIsGeneratingNumber(false);
        }
    };

    /**
     * Auto-generate เลขที่เอกสารเมื่อฟอร์มว่างหรือเป็นค่า default
     * - ข้าม generate ถ้ากำลังแก้ไขเอกสารเดิม (isEditing = true)
     * - ข้าม generate ถ้ามีเลขเอกสารที่ valid อยู่แล้ว
     * - ใช้ sessionStorage เก็บเลขที่ generate ไว้ป้องกันการ generate ซ้ำเมื่อ refresh
     */
    useEffect(() => {
        const SESSION_KEY = 'delivery_docNumber';
        
        // ถ้ากำลังแก้ไขเอกสารเดิม ไม่ต้อง generate เลขใหม่
        if (isEditing) {
            hasGeneratedNumberRef.current = true;
            // ล้าง sessionStorage เมื่อเข้า edit mode
            sessionStorage.removeItem(SESSION_KEY);
            return;
        }
        
        // ตรวจสอบว่ามีเลขเอกสารที่ valid อยู่แล้วหรือไม่ (รูปแบบใหม่: DN-YYMMDDXX)
        const hasValidNumber = data.docNumber && data.docNumber.match(/^DN-\d{6}\d{2}$/);
        
        if (hasValidNumber) {
            hasGeneratedNumberRef.current = true;
            // บันทึกเลขที่ valid ลง sessionStorage
            sessionStorage.setItem(SESSION_KEY, data.docNumber);
            return;
        }
        
        // ตรวจสอบ sessionStorage ว่ามีเลขที่ generate ไว้แล้วหรือไม่
        const savedDocNumber = sessionStorage.getItem(SESSION_KEY);
        if (savedDocNumber && savedDocNumber.match(/^DN-\d{6}\d{2}$/)) {
            // ใช้เลขที่บันทึกไว้
            handleDataChange('docNumber', savedDocNumber);
            hasGeneratedNumberRef.current = true;
            return;
        }
        
        // ตรวจสอบว่าเลขที่เอกสารเป็นค่า default หรือว่าง
        const isDefaultOrEmpty = !data.docNumber || 
                                  data.docNumber.match(/^DN-\d{4}-\d{3}$/) || // รูปแบบเก่า: DN-2025-001
                                  data.docNumber === '';
        
        if (isDefaultOrEmpty && !hasGeneratedNumberRef.current && !isGeneratingNumber) {
            handleGenerateDocNumber();
        }
    }, [isEditing, data.docNumber]);
    
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
                            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100 mt-2">{t('form.confirmDelete')}</h3>
                            <div className="mt-2 px-7 py-3">
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {t('form.confirmDeleteMessage')}
                                </p>
                            </div>
                            <div className="items-center px-4 py-3 space-x-2">
                                <button
                                    onClick={() => removeItem(itemToRemove)}
                                    className="px-4 py-2 bg-red-500 text-white text-base font-medium rounded-md w-auto shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                >
                                    {t('app.delete')}
                                </button>
                                <button
                                    onClick={() => setIsConfirmModalOpen(false)}
                                    className="px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-gray-200 text-base font-medium rounded-md w-auto shadow-sm hover:bg-gray-300 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                                >
                                    {t('app.cancel')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Form Fields */}
            <div className="space-y-6">
                {/* เลขที่เอกสาร - แสดงด้านบนสุด */}
                <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-medium">{t('form.documentNumber')}:</span> <span className="font-mono">{data.docNumber || t('app.loading')}</span>
                </div>
                
                {/* ส่วนที่ 1: ข้อมูลผู้รับมอบ */}
                <FormDivider title={t('customer.customerInfo')} />
                <div className="space-y-4">
                    {/* CustomerSelector - ระบบจัดการลูกค้าแบบครบวงจร */}
                    <CustomerSelector
                        label={t('customer.customerName')}
                        onSelect={(customer) => {
                            handleDataChange('toCompany', customer.customerName);
                            // รวมที่อยู่ทั้งหมด: ที่อยู่หลัก + ตำบล/แขวง + อำเภอ/เขต + จังหวัด + รหัสไปรษณีย์
                            const fullAddress = [
                                customer.address,
                                customer.district ? `ต.${customer.district}` : '',
                                customer.amphoe ? `อ.${customer.amphoe}` : '',
                                customer.province,
                                customer.postalCode
                            ].filter(Boolean).join(' ');
                            handleDataChange('toAddress', fullAddress);
                            if (customer.projectName) {
                                handleDataChange('project', customer.projectName);
                            }
                            if (customer.email) {
                                handleDataChange('toEmail', customer.email);
                            }
                            // ข้อมูลสาขา (สำหรับนิติบุคคล)
                            if (customer.branchCode) {
                                handleDataChange('toBranchCode', customer.branchCode);
                            }
                            if (customer.branchName) {
                                handleDataChange('toBranchName', customer.branchName);
                            }
                            // ข้อมูลโครงการลูกค้าปลายทาง (End Customer Project)
                            if (customer.hasEndCustomerProject && customer.endCustomerProject) {
                                handleDataChange('hasEndCustomerProject', true);
                                handleDataChange('endCustomerProject', customer.endCustomerProject);
                                handleDataChange('showEndCustomerInPdf', true); // ค่าเริ่มต้นให้แสดงใน PDF
                            } else {
                                handleDataChange('hasEndCustomerProject', false);
                                handleDataChange('endCustomerProject', undefined);
                                handleDataChange('showEndCustomerInPdf', false);
                            }
                        }}
                        currentCustomer={{
                            customerName: data.toCompany,
                            address: data.toAddress,
                            projectName: data.project,
                        }}
                        showSaveButton={true}
                    />

                    <div>
                        <label htmlFor="toCompany" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200">ชื่อบริษัท/ผู้รับ</label>
                        <input type="text" id="toCompany" value={data.toCompany} onChange={(e) => handleDataChange('toCompany', e.target.value)} maxLength={INPUT_LIMITS.customerName} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100 dark:border-slate-600" />
                    </div>
                    <div>
                        <label htmlFor="toAddress" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200">ที่อยู่</label>
                        <textarea id="toAddress" value={data.toAddress} onChange={(e) => handleDataChange('toAddress', e.target.value)} rows={3} maxLength={INPUT_LIMITS.companyAddress} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100 dark:border-slate-600" />
                    </div>
                    <div>
                        <label htmlFor="toEmail" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200">อีเมลผู้รับ</label>
                        <input type="email" id="toEmail" value={data.toEmail || ''} onChange={(e) => handleDataChange('toEmail', e.target.value)} maxLength={INPUT_LIMITS.email} inputMode="email" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100 dark:border-slate-600" placeholder="เช่น customer@example.com" />
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
                                        maxLength={INPUT_LIMITS.projectName}
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
                                        maxLength={INPUT_LIMITS.projectAddress}
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
                                        maxLength={INPUT_LIMITS.contactPerson}
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                        <label htmlFor="date" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200">วันที่</label>
                        <DatePicker
                            id="date"
                            value={data.date}
                            onChange={(date) => handleDataChange('date', date)}
                            placeholder="เลือกวันที่"
                            className="mt-1"
                        />
                    </div>
                    <div>
                        <label htmlFor="project" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200">โครงการ/เรื่อง</label>
                        <input type="text" id="project" value={data.project} onChange={(e) => handleDataChange('project', e.target.value)} maxLength={INPUT_LIMITS.projectName} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100 dark:border-slate-600" />
                    </div>
                </div>

                {/* ส่วนที่ 3: รายการส่งมอบ */}
                <FormDivider title="ส่วนที่ 3: รายการส่งมอบ" />
                <div className="overflow-x-auto -mx-3 sm:mx-0">
                    <table className="min-w-full divide-y divide-gray-200 text-xs sm:text-sm">
                        <thead className="bg-gray-50 dark:bg-slate-700">
                            <tr>
                                <th scope="col" className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-2/5">รายละเอียด</th>
                                <th scope="col" className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-1/5">จำนวน</th>
                                <th scope="col" className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-1/5">หน่วย</th>
                                <th scope="col" className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-1/5">หมายเหตุ</th>
                                <th scope="col" className="relative px-2 sm:px-3 py-1.5 sm:py-2 w-10 sm:w-12"><span className="sr-only">ลบ</span></th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {data.items.map((item, index) => (
                                <tr key={index}>
                                    <td className="px-1 sm:px-2 py-1 whitespace-nowrap">
                                        <textarea value={item.description} onChange={(e) => handleItemChange(index, 'description', e.target.value)} rows={2} maxLength={INPUT_LIMITS.itemDescription} className="w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-300 focus:ring-indigo-200 focus:ring-opacity-50 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-gray-100"></textarea>
                                    </td>
                                    <td className="px-1 sm:px-2 py-1 whitespace-nowrap">
                                        <input type="number" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', parseNumberInput(e.target.value))} inputMode="decimal" min={NUMBER_LIMITS.quantity.min} max={NUMBER_LIMITS.quantity.max} step={NUMBER_LIMITS.quantity.step} className="w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-300 focus:ring-indigo-200 focus:ring-opacity-50 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-gray-100" />
                                    </td>
                                    <td className="px-1 sm:px-2 py-1 whitespace-nowrap">
                                        <input type="text" value={item.unit} onChange={(e) => handleItemChange(index, 'unit', e.target.value)} maxLength={INPUT_LIMITS.unit} className="w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-300 focus:ring-indigo-200 focus:ring-opacity-50 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-gray-100" />
                                    </td>
                                    <td className="px-1 sm:px-2 py-1 whitespace-nowrap">
                                         <input type="text" value={item.notes} onChange={(e) => handleItemChange(index, 'notes', e.target.value)} maxLength={INPUT_LIMITS.itemNotes} className="w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-300 focus:ring-indigo-200 focus:ring-opacity-50 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-gray-100" />
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
                    <svg className="-ml-0.5 mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    เพิ่มรายการ
                </button>
            </div>
            
            {/* ส่วนที่ 4: ข้อมูลผู้ลงนาม */}
            <FormDivider title="ส่วนที่ 4: ข้อมูลผู้ลงนาม" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                <div>
                    <label htmlFor="senderName" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200">ชื่อผู้ส่งมอบ</label>
                    <input type="text" id="senderName" value={data.senderName} onChange={(e) => handleDataChange('senderName', e.target.value)} maxLength={INPUT_LIMITS.signerName} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100 dark:border-slate-600" />
                </div>
                <div>
                    <label htmlFor="receiverName" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200">ชื่อผู้รับมอบ</label>
                    <input type="text" id="receiverName" value={data.receiverName} onChange={(e) => handleDataChange('receiverName', e.target.value)} maxLength={INPUT_LIMITS.signerName} placeholder="เว้นว่างไว้เพื่อลงนาม" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100 dark:border-slate-600" />
                </div>
            </div>
        </div>
    );
};

export default DeliveryForm;