/**
 * FormDivider Component - แบ่งส่วนของฟอร์มด้วยเส้นแนวนอนและชื่อหัวข้อ
 * ใช้แทนที่ FormDivider ที่ถูก define ซ้ำใน 10+ form files
 */

import React from 'react';

interface FormDividerProps {
    /** ชื่อหัวข้อของส่วนที่แบ่ง */
    title: string;
    /** className เพิ่มเติมสำหรับ container */
    className?: string;
}

const FormDivider: React.FC<FormDividerProps> = React.memo(({ title, className = '' }) => (
    <div className={`relative ${className}`}>
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-gray-300 dark:border-gray-600" />
        </div>
        <div className="relative flex justify-start">
            <span className="bg-white dark:bg-slate-800 pr-3 text-lg font-medium text-gray-900 dark:text-gray-100">
                {title}
            </span>
        </div>
    </div>
));

FormDivider.displayName = 'FormDivider';

export default FormDivider;
