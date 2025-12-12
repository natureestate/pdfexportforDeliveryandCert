import React, { useRef, useState, useEffect } from 'react';
import { MemoData, LogoType } from '../types';
import { formatDateForInput } from '../utils/dateUtils';
import CustomerSelector from './CustomerSelector';
import { generateDocumentNumber } from '../services/documentNumber';
import { useCompany } from '../contexts/CompanyContext';

export interface MemoFormProps {
    data: MemoData;
    setData: React.Dispatch<React.SetStateAction<MemoData>>;
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

const MemoForm: React.FC<MemoFormProps> = ({ 
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
    const hasSyncedCompanyRef = useRef<string | undefined>(undefined);

    const handleDataChange = <K extends keyof MemoData,>(key: K, value: MemoData[K]) => {
        setData(prev => ({ ...prev, [key]: value }));
    };

    /**
     * สร้างเลขที่เอกสารอัตโนมัติ
     */
    const handleGenerateMemoNumber = async () => {
        try {
            const newMemoNumber = await generateDocumentNumber('memo');
            handleDataChange('memoNumber', newMemoNumber);
        } catch (error) {
            console.error('Error generating memo number:', error);
            alert('ไม่สามารถสร้างเลขที่เอกสารได้ กรุณาลองใหม่อีกครั้ง');
        }
    };

    /**
     * Auto-generate เลขที่เอกสารเมื่อฟอร์มว่างหรือเป็นค่า default
     */
    useEffect(() => {
        const isDefaultOrEmpty = !data.memoNumber || 
                                  data.memoNumber.match(/^MEMO-\d{4}-\d{3}$/) || 
                                  data.memoNumber === '';
        
        if (isDefaultOrEmpty) {
            handleGenerateMemoNumber();
        }
    }, []); // เรียกครั้งเดียวตอน mount

    /**
     * Sync ข้อมูลบริษัทจาก currentCompany ไปยัง form data
     */
    useEffect(() => {
        if (currentCompany && currentCompany.id !== hasSyncedCompanyRef.current) {
            const isCompanyDataEmpty = !data.companyName && !data.companyAddress && !data.companyPhone;
            
            if (isCompanyDataEmpty || 
                (data.companyName === currentCompany.name && 
                 data.companyAddress === currentCompany.address &&
                 data.companyPhone === currentCompany.phone)) {
                
                setData(prev => ({
                    ...prev,
                    companyName: currentCompany.name || prev.companyName,
                    companyAddress: currentCompany.address || prev.companyAddress,
                    companyPhone: currentCompany.phone || prev.companyPhone,
                    companyEmail: currentCompany.email || prev.companyEmail,
                    companyWebsite: currentCompany.website || prev.companyWebsite,
                }));
                
                hasSyncedCompanyRef.current = currentCompany.id;
            }
        }
    }, [currentCompany?.id]);

    return (
        <div className="space-y-8 pt-4">
            {/* Form Fields */}
            <div className="space-y-6">
                {/* เลขที่เอกสาร - แสดงด้านบนสุด */}
                <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-medium">เลขที่เอกสาร:</span> <span className="font-mono">{data.memoNumber || 'กำลังสร้าง...'}</span>
                </div>
                
                {/* ส่วนที่ 1: หัวกระดาษ (Header) */}
                <FormDivider title="ส่วนที่ 1: หัวกระดาษ" />
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                        <div>
                            <label htmlFor="date" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">วันที่ออกเอกสาร *</label>
                            <input 
                                type="date" 
                                id="date" 
                                value={formatDateForInput(data.date)} 
                                onChange={(e) => handleDataChange('date', e.target.value ? new Date(e.target.value) : null)} 
                                className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100" 
                            />
                        </div>
                        <div>
                            <label htmlFor="subject" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">เรื่อง *</label>
                            <input 
                                type="text" 
                                id="subject" 
                                value={data.subject} 
                                onChange={(e) => handleDataChange('subject', e.target.value)} 
                                placeholder="เช่น: แจ้งเปลี่ยนแปลงวัสดุกระเบื้องห้องน้ำชั้น 2"
                                className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100" 
                            />
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                        <div>
                            <label htmlFor="fromName" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">จาก (ชื่อ) *</label>
                            <input 
                                type="text" 
                                id="fromName" 
                                value={data.fromName} 
                                onChange={(e) => handleDataChange('fromName', e.target.value)} 
                                className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100" 
                            />
                        </div>
                        <div>
                            <label htmlFor="fromPosition" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">ตำแหน่ง/ฝ่าย</label>
                            <input 
                                type="text" 
                                id="fromPosition" 
                                value={data.fromPosition || ''} 
                                onChange={(e) => handleDataChange('fromPosition', e.target.value)} 
                                placeholder="เช่น: ผู้จัดการโครงการ"
                                className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100" 
                            />
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                        <div>
                            <label htmlFor="toName" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">ถึง (ชื่อผู้รับ) *</label>
                            <input 
                                type="text" 
                                id="toName" 
                                value={data.toName} 
                                onChange={(e) => handleDataChange('toName', e.target.value)} 
                                className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100" 
                            />
                        </div>
                        <div>
                            <label htmlFor="toPosition" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">ตำแหน่งผู้รับ</label>
                            <input 
                                type="text" 
                                id="toPosition" 
                                value={data.toPosition || ''} 
                                onChange={(e) => handleDataChange('toPosition', e.target.value)} 
                                className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100" 
                            />
                        </div>
                    </div>
                    
                    <div>
                        <label htmlFor="cc" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">สำเนาถึง (คั่นด้วย comma)</label>
                        <input 
                            type="text" 
                            id="cc" 
                            value={data.cc || ''} 
                            onChange={(e) => handleDataChange('cc', e.target.value)} 
                            placeholder="เช่น: บัญชี, ผู้บริหาร"
                            className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100" 
                        />
                    </div>
                </div>

                {/* ส่วนที่ 2: การอ้างอิงโครงการ */}
                <FormDivider title="ส่วนที่ 2: การอ้างอิงโครงการ" />
                <div className="space-y-4">
                    <CustomerSelector
                        label="เลือกข้อมูลโครงการ/ลูกค้า"
                        onSelect={(customer) => {
                            handleDataChange('projectName', customer.projectName || customer.customerName);
                        }}
                        currentCustomer={{
                            customerName: data.projectName || '',
                            address: '',
                            projectName: data.projectName || '',
                        }}
                        showSaveButton={true}
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                        <div>
                            <label htmlFor="projectName" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">ชื่อโครงการ / ลูกค้า</label>
                            <input 
                                type="text" 
                                id="projectName" 
                                value={data.projectName || ''} 
                                onChange={(e) => handleDataChange('projectName', e.target.value)} 
                                placeholder="เช่น: โครงการคุณสมชาย"
                                className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100" 
                            />
                        </div>
                        <div>
                            <label htmlFor="projectId" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">รหัสโครงการ</label>
                            <input 
                                type="text" 
                                id="projectId" 
                                value={data.projectId || ''} 
                                onChange={(e) => handleDataChange('projectId', e.target.value)} 
                                className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100" 
                            />
                        </div>
                    </div>
                    
                    <div>
                        <label htmlFor="referenceDocument" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">อ้างอิงถึงเอกสารเดิม</label>
                        <input 
                            type="text" 
                            id="referenceDocument" 
                            value={data.referenceDocument || ''} 
                            onChange={(e) => handleDataChange('referenceDocument', e.target.value)} 
                            placeholder="เช่น: ตามใบเสนอราคาที่ QT-2025-001"
                            className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100" 
                        />
                    </div>
                </div>

                {/* ส่วนที่ 3: เนื้อหา */}
                <FormDivider title="ส่วนที่ 3: เนื้อหา" />
                <div className="space-y-4">
                    <div>
                        <label htmlFor="purpose" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">วัตถุประสงค์ *</label>
                        <select
                            id="purpose"
                            value={data.purpose}
                            onChange={(e) => handleDataChange('purpose', e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100"
                        >
                            <option value="">เลือกวัตถุประสงค์</option>
                            <option value="เพื่อแจ้งให้ทราบ">เพื่อแจ้งให้ทราบ</option>
                            <option value="เพื่อขออนุมัติ">เพื่อขออนุมัติ</option>
                            <option value="เพื่อยืนยันคำสั่ง">เพื่อยืนยันคำสั่ง</option>
                            <option value="เพื่อสั่งการ">เพื่อสั่งการ</option>
                        </select>
                    </div>
                    
                    <div>
                        <label htmlFor="details" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">รายละเอียด *</label>
                        <textarea 
                            id="details" 
                            value={data.details} 
                            onChange={(e) => handleDataChange('details', e.target.value)} 
                            rows={6}
                            placeholder="เกิดอะไรขึ้น? มีอะไรเปลี่ยนแปลง? ข้อมูลคืออะไร? (ควรเขียนเป็นข้อๆ ถ้ามีหลายประเด็น)"
                            className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100" 
                        />
                    </div>
                    
                    <div>
                        <label htmlFor="reason" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">เหตุผล</label>
                        <textarea 
                            id="reason" 
                            value={data.reason || ''} 
                            onChange={(e) => handleDataChange('reason', e.target.value)} 
                            rows={3}
                            placeholder="ทำไมถึงต้องทำ/เปลี่ยน (ถ้าจำเป็นต้องอธิบาย)"
                            className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100" 
                        />
                    </div>
                </div>

                {/* ส่วนที่ 4: การดำเนินการ */}
                <FormDivider title="ส่วนที่ 4: การดำเนินการ" />
                <div className="space-y-4">
                    <div>
                        <label htmlFor="actionRequired" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">สิ่งที่ต้องดำเนินการ *</label>
                        <textarea 
                            id="actionRequired" 
                            value={data.actionRequired} 
                            onChange={(e) => handleDataChange('actionRequired', e.target.value)} 
                            rows={3}
                            placeholder="เช่น: โปรดลงนามอนุมัติ, โปรดตรวจสอบสต็อก, ให้เริ่มงานส่วนนี้ได้"
                            className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100" 
                        />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                        <div>
                            <label htmlFor="deadline" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">กำหนดเสร็จ</label>
                            <input 
                                type="date" 
                                id="deadline" 
                                value={formatDateForInput(data.deadline)} 
                                onChange={(e) => handleDataChange('deadline', e.target.value ? new Date(e.target.value) : null)} 
                                className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100" 
                            />
                        </div>
                        <div>
                            <label htmlFor="contactPerson" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">ผู้ประสานงาน (ชื่อ)</label>
                            <input 
                                type="text" 
                                id="contactPerson" 
                                value={data.contactPerson || ''} 
                                onChange={(e) => handleDataChange('contactPerson', e.target.value)} 
                                className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100" 
                            />
                        </div>
                    </div>
                    
                    <div>
                        <label htmlFor="contactPhone" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">เบอร์โทรผู้ประสานงาน</label>
                        <input 
                            type="text" 
                            id="contactPhone" 
                            value={data.contactPhone || ''} 
                            onChange={(e) => handleDataChange('contactPhone', e.target.value)} 
                            className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100" 
                        />
                    </div>
                </div>

                {/* ส่วนที่ 5: การลงนาม */}
                <FormDivider title="ส่วนที่ 5: การลงนาม" />
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                        <div>
                            <label htmlFor="issuedByName" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">ชื่อ-นามสกุลผู้ออก Memo *</label>
                            <input 
                                type="text" 
                                id="issuedByName" 
                                value={data.issuedByName} 
                                onChange={(e) => handleDataChange('issuedByName', e.target.value)} 
                                className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100" 
                            />
                        </div>
                        <div>
                            <label htmlFor="issuedByPosition" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">ตำแหน่งผู้ออก Memo *</label>
                            <input 
                                type="text" 
                                id="issuedByPosition" 
                                value={data.issuedByPosition} 
                                onChange={(e) => handleDataChange('issuedByPosition', e.target.value)} 
                                className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100" 
                            />
                        </div>
                    </div>
                    
                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            id="requireResponse"
                            checked={data.requireResponse || false}
                            onChange={(e) => handleDataChange('requireResponse', e.target.checked)}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-slate-600 rounded"
                        />
                        <label htmlFor="requireResponse" className="ml-2 block text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                            ต้องการการตอบกลับจากผู้รับ
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MemoForm;

