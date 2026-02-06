/**
 * BranchInfoSection Component - ส่วนข้อมูลสาขา (สำนักงานใหญ่/สาขา)
 * แสดงเมื่อเลือกประเภทเป็นนิติบุคคล (company)
 * ตามประกาศอธิบดีกรมสรรพากร ฉบับที่ 200
 * 
 * ใช้แทนส่วนที่ซ้ำกันใน CustomerSelector, ContractorSelector, CRMPage
 */

import React from 'react';

/** สีธีมที่รองรับ */
type ThemeColor = 'blue' | 'orange' | 'indigo' | 'green' | 'purple';

/** คู่ค่าสีสำหรับ background, border, text, และ focus ring ตามธีม */
const colorMap: Record<ThemeColor, {
    bg: string;
    border: string;
    text: string;
    focusRing: string;
}> = {
    blue: {
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        border: 'border-blue-200 dark:border-blue-700',
        text: 'text-blue-700 dark:text-blue-300',
        focusRing: 'focus:border-blue-500 focus:ring-blue-500',
    },
    orange: {
        bg: 'bg-orange-50 dark:bg-orange-900/20',
        border: 'border-orange-200 dark:border-orange-700',
        text: 'text-orange-700 dark:text-orange-300',
        focusRing: 'focus:border-orange-500 focus:ring-orange-500',
    },
    indigo: {
        bg: 'bg-indigo-50 dark:bg-indigo-900/20',
        border: 'border-indigo-200 dark:border-indigo-700',
        text: 'text-indigo-700 dark:text-indigo-300',
        focusRing: 'focus:border-indigo-500 focus:ring-indigo-500',
    },
    green: {
        bg: 'bg-green-50 dark:bg-green-900/20',
        border: 'border-green-200 dark:border-green-700',
        text: 'text-green-700 dark:text-green-300',
        focusRing: 'focus:border-green-500 focus:ring-green-500',
    },
    purple: {
        bg: 'bg-purple-50 dark:bg-purple-900/20',
        border: 'border-purple-200 dark:border-purple-700',
        text: 'text-purple-700 dark:text-purple-300',
        focusRing: 'focus:border-purple-500 focus:ring-purple-500',
    },
};

interface BranchInfoSectionProps {
    /** รหัสสาขา 5 หลัก (เช่น "00000") */
    branchCode: string;
    /** ชื่อสาขา */
    branchName: string;
    /** callback เมื่อรหัสสาขาเปลี่ยน */
    onBranchCodeChange: (value: string) => void;
    /** callback เมื่อชื่อสาขาเปลี่ยน */
    onBranchNameChange: (value: string) => void;
    /** สีธีม - ปกติ blue สำหรับลูกค้า, orange สำหรับช่าง */
    themeColor?: ThemeColor;
    /** className เพิ่มเติม */
    className?: string;
}

const BranchInfoSection: React.FC<BranchInfoSectionProps> = ({
    branchCode,
    branchName,
    onBranchCodeChange,
    onBranchNameChange,
    themeColor = 'blue',
    className = '',
}) => {
    const colors = colorMap[themeColor];

    return (
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-3 p-3 ${colors.bg} rounded-lg border ${colors.border} ${className}`}>
            <div className="md:col-span-2">
                <p className={`text-xs font-medium ${colors.text} mb-2`}>
                    📋 ข้อมูลสาขา (ตามประกาศอธิบดีกรมสรรพากร ฉบับที่ 200)
                </p>
            </div>
            <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    รหัสสาขา (5 หลัก)
                </label>
                <input
                    type="text"
                    value={branchCode}
                    onChange={(e) => onBranchCodeChange(e.target.value)}
                    maxLength={5}
                    className={`w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm ${colors.focusRing} text-xs sm:text-sm px-3 py-2 dark:bg-slate-700 dark:text-gray-100`}
                    placeholder="00000 (สำนักงานใหญ่)"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">00000 = สำนักงานใหญ่</p>
            </div>
            <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    ชื่อสาขา
                </label>
                <input
                    type="text"
                    value={branchName}
                    onChange={(e) => onBranchNameChange(e.target.value)}
                    className={`w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm ${colors.focusRing} text-xs sm:text-sm px-3 py-2 dark:bg-slate-700 dark:text-gray-100`}
                    placeholder="เช่น สำนักงานใหญ่, สาขาลาดพร้าว"
                />
            </div>
        </div>
    );
};

export default BranchInfoSection;
