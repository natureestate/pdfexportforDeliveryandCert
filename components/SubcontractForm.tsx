/**
 * SubcontractForm Component
 * ฟอร์มสัญญาจ้างเหมาช่วง (Sub-contractor Agreement)
 */
import React, { useRef, useState, useEffect } from 'react';
import { SubcontractData, SubcontractWorkItem, SubcontractPaymentMilestone, LogoType } from '../types';
import { formatDateForInput } from '../utils/dateUtils';
import CustomerSelector from './CustomerSelector';
import ContractorSelector from './ContractorSelector';
import { Customer } from '../services/customers';
import { Contractor } from '../services/contractors';
import { generateDocumentNumber, DocumentType } from '../services/documentNumber';
import { useCompany } from '../contexts/CompanyContext';
import { numberToThaiText } from '../utils/numberToThaiText';

export interface SubcontractFormProps {
    data: SubcontractData;
    setData: React.Dispatch<React.SetStateAction<SubcontractData>>;
    sharedLogo?: string | null;
    sharedLogoUrl?: string | null;
    sharedLogoType?: LogoType;
    companyDefaultLogoUrl?: string | null;
    onLogoChange?: (logo: string | null, logoUrl: string | null, logoType: LogoType) => void;
    onSetDefaultLogo?: (logoUrl: string) => Promise<void>;
}

// FormDivider Component - แบ่งส่วนของฟอร์ม
const FormDivider: React.FC<{ title: string }> = ({ title }) => (
    <div className="relative">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-start">
            <span className="bg-white pr-3 text-lg font-medium text-gray-900">{title}</span>
        </div>
    </div>
);

const SubcontractForm: React.FC<SubcontractFormProps> = ({ 
    data, 
    setData,
    sharedLogo,
    sharedLogoUrl,
    sharedLogoType,
    companyDefaultLogoUrl,
    onLogoChange,
    onSetDefaultLogo
}) => {
    const { currentCompany } = useCompany();
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [itemToRemove, setItemToRemove] = useState<number | null>(null);
    const [milestoneToRemove, setMilestoneToRemove] = useState<number | null>(null);
    const hasSyncedCompanyRef = useRef<string | undefined>(undefined);

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
        setData(prev => ({
            ...prev,
            contractorName: contractor.contractorName,
            contractorPhone: contractor.phone,
            contractorIdCard: contractor.idCard || contractor.taxId || '',
            contractorAddress: contractor.address || '',
        }));
    };
    
    // Handler สำหรับเลือกลูกค้าจากฐานข้อมูล
    const handleSelectCustomer = (customer: Customer) => {
        setData(prev => ({
            ...prev,
            projectName: customer.projectName || customer.customerName,
            projectLocation: customer.address || '',
        }));
    };

    // สร้างเลขที่สัญญาอัตโนมัติ
    useEffect(() => {
        const generateNumber = async () => {
            if (!data.contractNumber && currentCompany?.id) {
                try {
                    const docNumber = await generateDocumentNumber('subcontract' as DocumentType);
                    handleDataChange('contractNumber', docNumber);
                } catch (error) {
                    console.error('❌ สร้างเลขที่สัญญาล้มเหลว:', error);
                }
            }
        };
        generateNumber();
    }, [currentCompany?.id]);

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
                    <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">ยืนยันการลบ</h3>
                        <p className="text-gray-600 mb-6">คุณต้องการลบรายการนี้หรือไม่?</p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setIsConfirmModalOpen(false)}
                                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
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
                <div className="text-xs sm:text-sm text-gray-600">
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
                        <label htmlFor="contractorName" className="block text-xs sm:text-sm font-medium text-slate-700">ชื่อช่าง/หัวหน้าชุดช่าง *</label>
                        <input type="text" id="contractorName" value={data.contractorName} onChange={(e) => handleDataChange('contractorName', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50" placeholder="นายสมชาย ช่างเก่ง" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                        <div>
                            <label htmlFor="contractorIdCard" className="block text-xs sm:text-sm font-medium text-slate-700">เลขบัตรประชาชน/เลขผู้เสียภาษี</label>
                            <input type="text" id="contractorIdCard" value={data.contractorIdCard || ''} onChange={(e) => handleDataChange('contractorIdCard', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50" placeholder="1-2345-67890-12-3" />
                        </div>
                        <div>
                            <label htmlFor="contractorPhone" className="block text-xs sm:text-sm font-medium text-slate-700">เบอร์โทรศัพท์ *</label>
                            <input type="text" id="contractorPhone" value={data.contractorPhone} onChange={(e) => handleDataChange('contractorPhone', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50" placeholder="08X-XXX-XXXX" />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="contractorAddress" className="block text-xs sm:text-sm font-medium text-slate-700">ที่อยู่ผู้รับจ้าง</label>
                        <textarea id="contractorAddress" value={data.contractorAddress || ''} onChange={(e) => handleDataChange('contractorAddress', e.target.value)} rows={2} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50" placeholder="ที่อยู่ผู้รับจ้าง (ถ้ามี)" />
                    </div>
                </div>

                {/* ส่วนที่ 2: ข้อมูลสัญญาและสถานที่ */}
                <FormDivider title="ส่วนที่ 2: ข้อมูลสัญญาและสถานที่" />
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                        <div>
                            <label htmlFor="contractLocation" className="block text-xs sm:text-sm font-medium text-slate-700">ทำที่ (สถานที่ทำสัญญา)</label>
                            <div className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-xs sm:text-sm bg-gray-100 px-3 py-2 text-gray-700">
                                {data.contractLocation || currentCompany?.name || 'กำลังโหลดข้อมูลบริษัท...'}
                            </div>
                            <p className="mt-1 text-xs text-gray-500">* ใช้ข้อมูลจากบริษัทที่เลือกอัตโนมัติ</p>
                        </div>
                        <div>
                            <label htmlFor="contractDate" className="block text-xs sm:text-sm font-medium text-slate-700">วันที่ทำสัญญา</label>
                            <input type="date" id="contractDate" value={formatDateForInput(data.contractDate)} onChange={(e) => handleDataChange('contractDate', e.target.value ? new Date(e.target.value) : null)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50" />
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
                        <label htmlFor="projectName" className="block text-xs sm:text-sm font-medium text-slate-700">ชื่อโครงการ/บ้านลูกค้า *</label>
                        <input type="text" id="projectName" value={data.projectName} onChange={(e) => handleDataChange('projectName', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50" placeholder="บ้านคุณสมศรี โครงการ ABC" />
                    </div>
                    <div>
                        <label htmlFor="projectLocation" className="block text-xs sm:text-sm font-medium text-slate-700">สถานที่ก่อสร้าง *</label>
                        <textarea id="projectLocation" value={data.projectLocation} onChange={(e) => handleDataChange('projectLocation', e.target.value)} rows={2} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50" placeholder="123/45 หมู่บ้าน ABC ถ.พระราม 2 แขวง... เขต... กรุงเทพฯ 10150" />
                    </div>
                </div>

                {/* ส่วนที่ 3: ลักษณะงานที่จ้าง (Scope of Work) */}
                <FormDivider title="ส่วนที่ 3: ลักษณะงานที่จ้าง (Scope of Work)" />
                <div className="space-y-4">
                    <div>
                        <label htmlFor="scopeOfWork" className="block text-xs sm:text-sm font-medium text-slate-700">รายละเอียดงานที่จ้าง *</label>
                        <textarea id="scopeOfWork" value={data.scopeOfWork} onChange={(e) => handleDataChange('scopeOfWork', e.target.value)} rows={3} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50" placeholder="เช่น งานปูกระเบื้องห้องน้ำ 2 ห้อง, งานทาสีภายนอก ฯลฯ" />
                    </div>
                    
                    {/* ตารางรายการงาน */}
                    <div className="overflow-x-auto -mx-3 sm:mx-0">
                        <table className="min-w-full divide-y divide-gray-200 text-xs sm:text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ลำดับ</th>
                                    <th scope="col" className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-2/5">รายการงาน</th>
                                    <th scope="col" className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ปริมาณ</th>
                                    <th scope="col" className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">หน่วย</th>
                                    <th scope="col" className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ราคา/หน่วย</th>
                                    <th scope="col" className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">รวม (บาท)</th>
                                    <th scope="col" className="relative px-2 sm:px-3 py-1.5 sm:py-2 w-10 sm:w-12"><span className="sr-only">ลบ</span></th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {data.items.map((item, index) => (
                                    <tr key={index}>
                                        <td className="px-2 sm:px-3 py-1 text-center text-gray-500">{index + 1}</td>
                                        <td className="px-1 sm:px-2 py-1 whitespace-nowrap">
                                            <textarea value={item.description} onChange={(e) => handleItemChange(index, 'description', e.target.value)} rows={2} className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring-indigo-200 focus:ring-opacity-50 text-xs sm:text-sm bg-gray-50 text-gray-900" placeholder="รายละเอียดงาน"></textarea>
                                        </td>
                                        <td className="px-1 sm:px-2 py-1 whitespace-nowrap">
                                            <input type="number" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)} className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring-indigo-200 focus:ring-opacity-50 text-xs sm:text-sm bg-gray-50 text-gray-900" />
                                        </td>
                                        <td className="px-1 sm:px-2 py-1 whitespace-nowrap">
                                            <input type="text" value={item.unit} onChange={(e) => handleItemChange(index, 'unit', e.target.value)} className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring-indigo-200 focus:ring-opacity-50 text-xs sm:text-sm bg-gray-50 text-gray-900" />
                                        </td>
                                        <td className="px-1 sm:px-2 py-1 whitespace-nowrap">
                                            <input type="number" step="0.01" value={item.unitPrice} onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)} className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring-indigo-200 focus:ring-opacity-50 text-xs sm:text-sm bg-gray-50 text-gray-900" />
                                        </td>
                                        <td className="px-1 sm:px-2 py-1 whitespace-nowrap">
                                            <input type="number" step="0.01" value={item.amount} readOnly className="w-full rounded-md border-gray-300 shadow-sm text-xs sm:text-sm bg-gray-100 text-gray-900 font-medium" />
                                        </td>
                                        <td className="px-1 sm:px-2 py-1 whitespace-nowrap text-center">
                                            <button type="button" onClick={() => openConfirmModal(index, 'item')} className="text-red-600 hover:text-red-900 p-1 rounded-full hover:bg-red-100">
                                                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-gray-50">
                                <tr>
                                    <td colSpan={5} className="px-2 sm:px-3 py-2 text-right font-semibold text-gray-700">รวมทั้งสิ้น:</td>
                                    <td className="px-2 sm:px-3 py-2 font-bold text-indigo-600">{data.totalWorkAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                    <button type="button" onClick={addItem} className="mt-3 sm:mt-4 inline-flex items-center px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 shadow-sm text-xs sm:text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                        <svg className="-ml-0.5 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                        </svg>
                        เพิ่มรายการงาน
                    </button>
                    
                    <div>
                        <label htmlFor="materialNote" className="block text-xs sm:text-sm font-medium text-slate-700">หมายเหตุเรื่องวัสดุ</label>
                        <input type="text" id="materialNote" value={data.materialNote || ''} onChange={(e) => handleDataChange('materialNote', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50" placeholder="เช่น ค่าวัสดุผู้ว่าจ้างเป็นผู้จัดหา" />
                    </div>
                </div>

                {/* ส่วนที่ 4: ระยะเวลาการทำงาน */}
                <FormDivider title="ส่วนที่ 4: ระยะเวลาการทำงาน" />
                <div className="space-y-4">
                    <div className="flex items-center">
                        <input type="checkbox" id="showWorkPeriod" checked={data.showWorkPeriod} onChange={(e) => handleDataChange('showWorkPeriod', e.target.checked)} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" />
                        <label htmlFor="showWorkPeriod" className="ml-2 block text-sm text-gray-700">แสดงข้อนี้ในสัญญา</label>
                    </div>
                    {data.showWorkPeriod && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                            <div>
                                <label htmlFor="startDate" className="block text-xs sm:text-sm font-medium text-slate-700">วันที่เริ่มทำงาน</label>
                                <input type="date" id="startDate" value={formatDateForInput(data.startDate)} onChange={(e) => handleDataChange('startDate', e.target.value ? new Date(e.target.value) : null)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50" />
                            </div>
                            <div>
                                <label htmlFor="endDate" className="block text-xs sm:text-sm font-medium text-slate-700">วันที่แล้วเสร็จ</label>
                                <input type="date" id="endDate" value={formatDateForInput(data.endDate)} onChange={(e) => handleDataChange('endDate', e.target.value ? new Date(e.target.value) : null)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50" />
                            </div>
                        </div>
                    )}
                </div>

                {/* ส่วนที่ 5: การชำระเงินและการแบ่งงวดงาน */}
                <FormDivider title="ส่วนที่ 5: การชำระเงินและการแบ่งงวดงาน" />
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                        <div>
                            <label htmlFor="totalContractAmount" className="block text-xs sm:text-sm font-medium text-slate-700">ค่าจ้างรวมทั้งสิ้น (บาท)</label>
                            <input type="number" id="totalContractAmount" value={data.totalContractAmount} onChange={(e) => handleDataChange('totalContractAmount', parseFloat(e.target.value) || 0)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50" />
                        </div>
                        <div>
                            <label htmlFor="totalContractAmountText" className="block text-xs sm:text-sm font-medium text-slate-700">ค่าจ้างเป็นตัวอักษร (คำนวณอัตโนมัติ)</label>
                            <input type="text" id="totalContractAmountText" value={data.totalContractAmountText} readOnly className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-xs sm:text-sm bg-gray-100 text-gray-700 font-medium" placeholder="แสดงอัตโนมัติเมื่อกรอกค่าจ้าง" />
                        </div>
                    </div>
                    
                    {/* ตารางงวดงาน */}
                    <div className="overflow-x-auto -mx-3 sm:mx-0">
                        <table className="min-w-full divide-y divide-gray-200 text-xs sm:text-sm">
                            <thead className="bg-green-50">
                                <tr>
                                    <th scope="col" className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">งวดที่</th>
                                    <th scope="col" className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-2/5">รายละเอียดงานที่ต้องแล้วเสร็จ</th>
                                    <th scope="col" className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">% ของยอด</th>
                                    <th scope="col" className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">จำนวนเงิน (บาท)</th>
                                    <th scope="col" className="relative px-2 sm:px-3 py-1.5 sm:py-2 w-10 sm:w-12"><span className="sr-only">ลบ</span></th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {data.paymentMilestones.map((milestone, index) => (
                                    <tr key={index}>
                                        <td className="px-2 sm:px-3 py-1 text-center font-medium text-gray-700">{milestone.milestone}</td>
                                        <td className="px-1 sm:px-2 py-1 whitespace-nowrap">
                                            <textarea value={milestone.description} onChange={(e) => handleMilestoneChange(index, 'description', e.target.value)} rows={2} className="w-full rounded-md border-gray-300 shadow-sm focus:border-green-300 focus:ring-green-200 focus:ring-opacity-50 text-xs sm:text-sm bg-gray-50 text-gray-900" placeholder="เช่น เบิกเงินล่วงหน้า / เมื่อดำเนินการ...เสร็จสิ้น"></textarea>
                                        </td>
                                        <td className="px-1 sm:px-2 py-1 whitespace-nowrap">
                                            <input type="number" value={milestone.percentage} onChange={(e) => handleMilestoneChange(index, 'percentage', parseFloat(e.target.value) || 0)} className="w-full rounded-md border-gray-300 shadow-sm focus:border-green-300 focus:ring-green-200 focus:ring-opacity-50 text-xs sm:text-sm bg-gray-50 text-gray-900" />
                                        </td>
                                        <td className="px-1 sm:px-2 py-1 whitespace-nowrap">
                                            <input type="number" step="0.01" value={milestone.amount} readOnly className="w-full rounded-md border-gray-300 shadow-sm text-xs sm:text-sm bg-gray-100 text-gray-900 font-medium" />
                                        </td>
                                        <td className="px-1 sm:px-2 py-1 whitespace-nowrap text-center">
                                            <button type="button" onClick={() => openConfirmModal(index, 'milestone')} className="text-red-600 hover:text-red-900 p-1 rounded-full hover:bg-red-100">
                                                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <button type="button" onClick={addMilestone} className="mt-3 sm:mt-4 inline-flex items-center px-2 sm:px-3 py-1.5 sm:py-2 border border-green-300 shadow-sm text-xs sm:text-sm leading-4 font-medium rounded-md text-green-700 bg-white hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
                        <svg className="-ml-0.5 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                        </svg>
                        เพิ่มงวดงาน
                    </button>
                    <p className="text-xs text-gray-500 italic">* การจ่ายเงินจะกระทำเมื่อผู้ว่าจ้างได้ตรวจรับงานในงวดนั้นๆ ว่าถูกต้องเรียบร้อยแล้วเท่านั้น</p>
                </div>

                {/* ส่วนที่ 6: เครื่องมือและวัสดุอุปกรณ์ */}
                <FormDivider title="ส่วนที่ 6: เครื่องมือและวัสดุอุปกรณ์" />
                <div className="space-y-4">
                    <div className="flex items-center">
                        <input type="checkbox" id="showToolsSection" checked={data.showToolsSection} onChange={(e) => handleDataChange('showToolsSection', e.target.checked)} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" />
                        <label htmlFor="showToolsSection" className="ml-2 block text-sm text-gray-700">แสดงข้อนี้ในสัญญา</label>
                    </div>
                    {data.showToolsSection && (
                        <div>
                            <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-2">วัสดุสิ้นเปลือง (เช่น ตะปู ใบตัด ลวดเชื่อม) ให้ถือเป็นความรับผิดชอบของ:</label>
                            <div className="flex gap-4">
                                <label className="inline-flex items-center">
                                    <input type="radio" name="consumableResponsibility" value="employer" checked={data.consumableResponsibility === 'employer'} onChange={(e) => handleDataChange('consumableResponsibility', 'employer')} className="form-radio h-4 w-4 text-indigo-600" />
                                    <span className="ml-2 text-sm text-gray-700">ผู้ว่าจ้าง</span>
                                </label>
                                <label className="inline-flex items-center">
                                    <input type="radio" name="consumableResponsibility" value="contractor" checked={data.consumableResponsibility === 'contractor'} onChange={(e) => handleDataChange('consumableResponsibility', 'contractor')} className="form-radio h-4 w-4 text-indigo-600" />
                                    <span className="ml-2 text-sm text-gray-700">ผู้รับจ้าง</span>
                                </label>
                            </div>
                        </div>
                    )}
                </div>

                {/* ส่วนที่ 7: มาตรฐานงานและการรับประกัน */}
                <FormDivider title="ส่วนที่ 7: มาตรฐานงานและการรับประกัน" />
                <div className="space-y-4">
                    <div className="flex items-center">
                        <input type="checkbox" id="showWarrantySection" checked={data.showWarrantySection} onChange={(e) => handleDataChange('showWarrantySection', e.target.checked)} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" />
                        <label htmlFor="showWarrantySection" className="ml-2 block text-sm text-gray-700">แสดงข้อนี้ในสัญญา</label>
                    </div>
                    {data.showWarrantySection && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                            <div>
                                <label htmlFor="defectFixDays" className="block text-xs sm:text-sm font-medium text-slate-700">แก้ไขงานบกพร่องภายใน (วัน)</label>
                                <input type="number" id="defectFixDays" value={data.defectFixDays} onChange={(e) => handleDataChange('defectFixDays', parseInt(e.target.value) || 0)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50" />
                            </div>
                            <div>
                                <label htmlFor="warrantyMonths" className="block text-xs sm:text-sm font-medium text-slate-700">รับประกันผลงาน (เดือน)</label>
                                <input type="number" id="warrantyMonths" value={data.warrantyMonths} onChange={(e) => handleDataChange('warrantyMonths', parseInt(e.target.value) || 0)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50" />
                            </div>
                        </div>
                    )}
                </div>

                {/* ส่วนที่ 8: การทิ้งงานและการปรับ */}
                <FormDivider title="ส่วนที่ 8: การทิ้งงานและการปรับ" />
                <div className="space-y-4">
                    <div className="flex items-center">
                        <input type="checkbox" id="showPenaltySection" checked={data.showPenaltySection} onChange={(e) => handleDataChange('showPenaltySection', e.target.checked)} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" />
                        <label htmlFor="showPenaltySection" className="ml-2 block text-sm text-gray-700">แสดงข้อนี้ในสัญญา</label>
                    </div>
                    {data.showPenaltySection && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                            <div>
                                <label htmlFor="abandonDays" className="block text-xs sm:text-sm font-medium text-slate-700">ไม่เข้าทำงานติดต่อกันเกิน (วัน)</label>
                                <input type="number" id="abandonDays" value={data.abandonDays} onChange={(e) => handleDataChange('abandonDays', parseInt(e.target.value) || 0)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50" />
                            </div>
                            <div>
                                <label htmlFor="penaltyPerDay" className="block text-xs sm:text-sm font-medium text-slate-700">ปรับเป็นรายวัน วันละ (บาท)</label>
                                <input type="number" id="penaltyPerDay" value={data.penaltyPerDay} onChange={(e) => handleDataChange('penaltyPerDay', parseInt(e.target.value) || 0)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50" />
                            </div>
                        </div>
                    )}
                </div>

                {/* ส่วนที่ 9: ส่วนลงนาม */}
                <FormDivider title="ส่วนที่ 9: ส่วนลงนาม" />
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                        <div>
                            <label htmlFor="employerSignName" className="block text-xs sm:text-sm font-medium text-slate-700">ชื่อผู้ว่าจ้าง (ลงนาม)</label>
                            <input type="text" id="employerSignName" value={data.employerSignName} onChange={(e) => handleDataChange('employerSignName', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50" />
                        </div>
                        <div>
                            <label htmlFor="contractorSignName" className="block text-xs sm:text-sm font-medium text-slate-700">ชื่อผู้รับจ้าง (ลงนาม)</label>
                            <input type="text" id="contractorSignName" value={data.contractorSignName} onChange={(e) => handleDataChange('contractorSignName', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50" />
                        </div>
                        <div>
                            <label htmlFor="witnessName" className="block text-xs sm:text-sm font-medium text-slate-700">ชื่อพยาน (ถ้ามี)</label>
                            <input type="text" id="witnessName" value={data.witnessName || ''} onChange={(e) => handleDataChange('witnessName', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50" />
                        </div>
                    </div>
                </div>

                {/* ส่วนที่ 10: ข้อมูลเพิ่มเติม */}
                <FormDivider title="ส่วนที่ 10: ข้อมูลเพิ่มเติม" />
                <div className="space-y-4">
                    <div>
                        <label htmlFor="notes" className="block text-xs sm:text-sm font-medium text-slate-700">หมายเหตุเพิ่มเติม</label>
                        <textarea id="notes" value={data.notes || ''} onChange={(e) => handleDataChange('notes', e.target.value)} rows={3} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50" placeholder="หมายเหตุหรือเงื่อนไขเพิ่มเติม..." />
                    </div>
                    <div>
                        <label htmlFor="issuedBy" className="block text-xs sm:text-sm font-medium text-slate-700">ผู้ออกเอกสาร</label>
                        <input type="text" id="issuedBy" value={data.issuedBy || ''} onChange={(e) => handleDataChange('issuedBy', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SubcontractForm;

