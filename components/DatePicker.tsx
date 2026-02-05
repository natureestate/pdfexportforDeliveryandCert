/**
 * DatePicker Component
 * 
 * Wrapper สำหรับ PrimeReact Calendar แทนที่ native input type="date"
 * รองรับ dark mode และ customization
 */

import React from 'react';
import { Calendar } from 'primereact/calendar';
import 'primereact/resources/themes/lara-light-indigo/theme.css'; // Import theme
import 'primereact/resources/primereact.min.css'; // Import PrimeReact CSS

interface DatePickerProps {
  /** ค่า Date ปัจจุบัน */
  value: Date | null | undefined;
  /** Callback เมื่อเปลี่ยนค่า */
  onChange: (date: Date | null) => void;
  /** placeholder text */
  placeholder?: string;
  /** id สำหรับ label */
  id?: string;
  /** className เพิ่มเติม */
  className?: string;
  /** disabled state */
  disabled?: boolean;
  /** วันที่น้อยสุดที่เลือกได้ */
  minDate?: Date;
  /** วันที่มากสุดที่เลือกได้ */
  maxDate?: Date;
  /** แสดงปุ่มล้างค่า */
  showClear?: boolean;
  /** แสดง icon */
  showIcon?: boolean;
  /** format การแสดงผล */
  dateFormat?: string;
  /** อนุญาตให้กรอกเอง */
  manualInput?: boolean;
}

/**
 * DatePicker Component - ใช้แทน native input type="date"
 * 
 * @example
 * <DatePicker
 *   value={data.date}
 *   onChange={(date) => setData({ ...data, date })}
 *   placeholder="เลือกวันที่"
 * />
 */
const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  placeholder = 'เลือกวันที่',
  id,
  className = '',
  disabled = false,
  minDate,
  maxDate,
  showClear = true,
  showIcon = true,
  dateFormat = 'dd/mm/yy',
  manualInput = true,
}) => {
  // แปลง value ให้เป็น Date object ถ้าจำเป็น
  const dateValue = value instanceof Date ? value : (value ? new Date(value) : null);
  
  // ตรวจสอบว่า dateValue เป็น valid Date หรือไม่
  const isValidDate = dateValue instanceof Date && !isNaN(dateValue.getTime());

  return (
    <div className={`date-picker-wrapper ${className}`}>
      <Calendar
        id={id}
        value={isValidDate ? dateValue : null}
        onChange={(e) => {
          const newValue = e.value;
          if (newValue instanceof Date) {
            onChange(newValue);
          } else if (Array.isArray(newValue)) {
            // ถ้าเป็น range selection จะได้ array
            onChange(newValue[0] || null);
          } else {
            onChange(null);
          }
        }}
        placeholder={placeholder}
        disabled={disabled}
        minDate={minDate}
        maxDate={maxDate}
        showIcon={showIcon}
        showButtonBar={showClear}
        dateFormat={dateFormat}
        touchUI={false}
        showOnFocus={true}
        readOnlyInput={!manualInput}
        className="w-full"
        inputClassName="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-md shadow-sm 
                       bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100
                       focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500
                       placeholder-gray-400 dark:placeholder-gray-500"
        pt={{
          root: { className: 'w-full' },
          input: { 
            className: `w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-md shadow-sm 
                       bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100
                       focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500
                       placeholder-gray-400 dark:placeholder-gray-500`
          },
          dropdownButton: {
            className: 'bg-gray-100 dark:bg-slate-600 border-gray-300 dark:border-slate-500 hover:bg-gray-200 dark:hover:bg-slate-500'
          },
          panel: {
            className: 'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg'
          },
          header: {
            className: 'bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-slate-600'
          },
          title: {
            className: 'text-gray-900 dark:text-gray-100 font-medium'
          },
          dayLabel: {
            className: 'text-gray-600 dark:text-gray-400 text-xs'
          },
          day: {
            className: 'text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30'
          },
          monthPicker: {
            className: 'text-gray-900 dark:text-gray-100'
          },
          yearPicker: {
            className: 'text-gray-900 dark:text-gray-100'
          },
          buttonbar: {
            className: 'bg-gray-50 dark:bg-slate-700 border-t border-gray-200 dark:border-slate-600'
          }
        }}
      />
    </div>
  );
};

/**
 * Helper function แปลง Date เป็น ISO string สำหรับเก็บใน state
 */
export const formatDateForStorage = (date: Date | null): string | null => {
  if (!date) return null;
  return date.toISOString();
};

/**
 * Helper function แปลง ISO string กลับเป็น Date
 */
export const parseDateFromStorage = (dateString: string | null | undefined): Date | null => {
  if (!dateString) return null;
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? null : date;
};

export default DatePicker;
