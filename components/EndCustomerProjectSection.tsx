/**
 * End Customer Project Section Component
 * Component ที่ใช้ซ้ำได้สำหรับแสดง/แก้ไขข้อมูลโครงการลูกค้าปลายทาง
 * ใช้ใน Form ต่างๆ เช่น DeliveryForm, QuotationForm, InvoiceForm เป็นต้น
 */

import React from 'react';
import { EndCustomerProject } from '../types';

interface EndCustomerProjectSectionProps {
    // ข้อมูล
    hasEndCustomerProject: boolean;
    endCustomerProject?: EndCustomerProject;
    showEndCustomerInPdf: boolean;
    
    // Callbacks
    onHasEndCustomerChange: (value: boolean) => void;
    onEndCustomerProjectChange: (value: EndCustomerProject | undefined) => void;
    onShowEndCustomerInPdfChange: (value: boolean) => void;
}

/**
 * Component แสดงส่วน End Customer Project
 * แสดง Checkbox สำหรับเปิด/ปิด และฟอร์มกรอกข้อมูลโครงการลูกค้าปลายทาง
 */
const EndCustomerProjectSection: React.FC<EndCustomerProjectSectionProps> = ({
    hasEndCustomerProject,
    endCustomerProject,
    showEndCustomerInPdf,
    onHasEndCustomerChange,
    onEndCustomerProjectChange,
    onShowEndCustomerInPdfChange,
}) => {
    // จัดการการเปลี่ยนแปลง checkbox หลัก (มี/ไม่มีโครงการลูกค้าปลายทาง)
    const handleToggleEndCustomer = (checked: boolean) => {
        onHasEndCustomerChange(checked);
        if (!checked) {
            onEndCustomerProjectChange(undefined);
            onShowEndCustomerInPdfChange(false);
        } else {
            onEndCustomerProjectChange({ projectName: '' });
            onShowEndCustomerInPdfChange(true);
        }
    };

    // จัดการการเปลี่ยนแปลงฟิลด์ข้อมูลโครงการ
    const handleFieldChange = (field: keyof EndCustomerProject, value: string) => {
        onEndCustomerProjectChange({
            ...endCustomerProject,
            [field]: value,
        } as EndCustomerProject);
    };

    return (
        <div className="border-t border-gray-200 dark:border-slate-600 pt-4 mt-4">
            {/* Checkbox หลัก: มีโครงการลูกค้าปลายทางหรือไม่ */}
            <div className="flex items-center mb-3">
                <input
                    type="checkbox"
                    id="hasEndCustomerProject"
                    checked={hasEndCustomerProject}
                    onChange={(e) => handleToggleEndCustomer(e.target.checked)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label 
                    htmlFor="hasEndCustomerProject" 
                    className="ml-2 block text-sm font-medium text-slate-700 dark:text-slate-200"
                >
                    มีโครงการลูกค้าปลายทาง (End Customer)
                </label>
            </div>
            
            {/* ฟอร์มกรอกข้อมูลโครงการลูกค้าปลายทาง */}
            {hasEndCustomerProject && (
                <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-700 space-y-3">
                    <p className="text-xs font-medium text-purple-700 dark:text-purple-300 mb-2">
                        🏠 ข้อมูลโครงการลูกค้าปลายทาง
                    </p>
                    
                    {/* ชื่อโครงการลูกค้าปลายทาง */}
                    <div>
                        <label className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                            ชื่อโครงการลูกค้าปลายทาง
                        </label>
                        <input
                            type="text"
                            value={endCustomerProject?.projectName || ''}
                            onChange={(e) => handleFieldChange('projectName', e.target.value)}
                            className="w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm px-3 py-2 bg-white dark:bg-slate-700 dark:text-gray-100"
                            placeholder="เช่น บ้านคุณสมศักดิ์"
                        />
                    </div>
                    
                    {/* ที่ตั้งโครงการ */}
                    <div>
                        <label className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                            ที่ตั้งโครงการ
                        </label>
                        <textarea
                            value={endCustomerProject?.projectAddress || ''}
                            onChange={(e) => handleFieldChange('projectAddress', e.target.value)}
                            rows={2}
                            className="w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm px-3 py-2 bg-white dark:bg-slate-700 dark:text-gray-100"
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
                            value={endCustomerProject?.contactName || ''}
                            onChange={(e) => handleFieldChange('contactName', e.target.value)}
                            className="w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm px-3 py-2 bg-white dark:bg-slate-700 dark:text-gray-100"
                            placeholder="เช่น คุณสมศรี"
                        />
                    </div>
                    
                    {/* Checkbox แสดงใน PDF */}
                    <div className="flex items-center mt-3 pt-3 border-t border-purple-200 dark:border-purple-700">
                        <input
                            type="checkbox"
                            id="showEndCustomerInPdf"
                            checked={showEndCustomerInPdf}
                            onChange={(e) => onShowEndCustomerInPdfChange(e.target.checked)}
                            className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                        />
                        <label 
                            htmlFor="showEndCustomerInPdf" 
                            className="ml-2 block text-sm font-medium text-purple-700 dark:text-purple-300"
                        >
                            แสดงข้อมูลโครงการลูกค้าปลายทางในเอกสาร PDF
                        </label>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EndCustomerProjectSection;
