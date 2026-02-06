/**
 * FormInput Component - Input field ที่ใช้ร่วมกันทั่วทั้งแอป
 * รวม label, required indicator, error state, และ styling ไว้ในที่เดียว
 * รองรับ dark mode และ responsive text sizes
 */

import React from 'react';

/** สีธีมที่รองรับ - ใช้สำหรับ focus ring/border */
type ThemeColor = 'indigo' | 'orange' | 'blue' | 'green' | 'red' | 'purple';

/** คู่ค่า focus class สำหรับแต่ละสี */
const focusColorMap: Record<ThemeColor, string> = {
    indigo: 'focus:border-indigo-500 focus:ring-indigo-500',
    orange: 'focus:border-orange-500 focus:ring-orange-500',
    blue: 'focus:border-blue-500 focus:ring-blue-500',
    green: 'focus:border-green-500 focus:ring-green-500',
    red: 'focus:border-red-500 focus:ring-red-500',
    purple: 'focus:border-purple-500 focus:ring-purple-500',
};

interface FormInputProps {
    /** ข้อความ label ของ input */
    label?: string;
    /** แสดงเครื่องหมาย * สีแดง บ่งบอกว่าต้องกรอก */
    required?: boolean;
    /** ค่าปัจจุบันของ input */
    value: string | number;
    /** callback เมื่อค่าเปลี่ยน */
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    /** ประเภท input (text, tel, email, number ฯลฯ) */
    type?: string;
    /** ข้อความ placeholder */
    placeholder?: string;
    /** จำนวนตัวอักษรสูงสุด */
    maxLength?: number;
    /** inputMode สำหรับ mobile keyboard */
    inputMode?: 'none' | 'text' | 'decimal' | 'numeric' | 'tel' | 'search' | 'email' | 'url';
    /** สีธีมสำหรับ focus ring */
    themeColor?: ThemeColor;
    /** className เพิ่มเติมสำหรับ container */
    containerClassName?: string;
    /** className เพิ่มเติมสำหรับ input */
    className?: string;
    /** ข้อความช่วยเหลือด้านล่าง input */
    helperText?: string;
    /** ปิดการใช้งาน input */
    disabled?: boolean;
    /** pattern สำหรับ validation */
    pattern?: string;
    /** callback เมื่อกด Enter */
    onKeyPress?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    /** callback เมื่อ input ได้รับ focus */
    onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
    /** callback เมื่อ input สูญเสีย focus */
    onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
}

const FormInput: React.FC<FormInputProps> = ({
    label,
    required = false,
    value,
    onChange,
    type = 'text',
    placeholder,
    maxLength,
    inputMode,
    themeColor = 'indigo',
    containerClassName = '',
    className = '',
    helperText,
    disabled = false,
    pattern,
    onKeyPress,
    onFocus,
    onBlur,
}) => {
    const focusClasses = focusColorMap[themeColor];

    return (
        <div className={containerClassName}>
            {label && (
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
            )}
            <input
                type={type}
                value={value}
                onChange={onChange}
                maxLength={maxLength}
                inputMode={inputMode}
                disabled={disabled}
                pattern={pattern}
                placeholder={placeholder}
                onKeyPress={onKeyPress}
                onFocus={onFocus}
                onBlur={onBlur}
                className={`w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm ${focusClasses} text-xs sm:text-sm px-3 py-2 dark:bg-slate-700 dark:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
            />
            {helperText && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{helperText}</p>
            )}
        </div>
    );
};

export default FormInput;
