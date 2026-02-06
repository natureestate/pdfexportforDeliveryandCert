/**
 * DatePicker Component
 * 
 * ใช้ shadcn/ui Calendar + Popover แทน PrimeReact
 * รองรับ dark mode และ customization
 */

import React from 'react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { Calendar as CalendarIcon, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

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
  /** format การแสดงผล (ใช้ date-fns format) */
  dateFormat?: string;
  /** อนุญาตให้กรอกเอง (ไม่รองรับใน shadcn version) */
  manualInput?: boolean;
}

/**
 * DatePicker Component - ใช้ shadcn/ui Calendar + Popover
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
  dateFormat = 'dd/MM/yyyy',
  manualInput = true, // ไม่ใช้ใน shadcn version แต่เก็บไว้เพื่อ backward compatibility
}) => {
  // state สำหรับเปิด/ปิด popover
  const [open, setOpen] = React.useState(false);
  
  // แปลง value ให้เป็น Date object ถ้าจำเป็น
  const dateValue = value instanceof Date ? value : (value ? new Date(value) : undefined);
  
  // ตรวจสอบว่า dateValue เป็น valid Date หรือไม่
  const isValidDate = dateValue instanceof Date && !isNaN(dateValue.getTime());
  const selectedDate = isValidDate ? dateValue : undefined;

  // จัดการเมื่อเลือกวันที่
  const handleSelect = (date: Date | undefined) => {
    onChange(date || null);
    setOpen(false);
  };

  // จัดการเมื่อกดปุ่มล้าง
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  return (
    <div className={cn('date-picker-wrapper', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            variant="outline"
            disabled={disabled}
            className={cn(
              'w-full justify-start text-left font-normal',
              'h-10 px-3 py-2 text-sm',
              'border border-gray-300 dark:border-slate-600',
              'bg-white dark:bg-slate-700',
              'text-gray-900 dark:text-gray-100',
              'hover:bg-gray-50 dark:hover:bg-slate-600',
              'focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400',
              !selectedDate && 'text-gray-400 dark:text-gray-500'
            )}
          >
            {/* Icon ปฏิทิน */}
            {showIcon && (
              <CalendarIcon className="mr-2 h-4 w-4 text-gray-400 dark:text-gray-500" />
            )}
            
            {/* แสดงวันที่หรือ placeholder */}
            <span className="flex-1">
              {selectedDate
                ? format(selectedDate, dateFormat, { locale: th })
                : placeholder}
            </span>
            
            {/* ปุ่มล้างค่า */}
            {showClear && selectedDate && !disabled && (
              <X
                className="ml-2 h-4 w-4 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                onClick={handleClear}
              />
            )}
          </Button>
        </PopoverTrigger>
        
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleSelect}
            disabled={(date) => {
              // ปิดการเลือกวันที่นอกช่วง min/max
              if (minDate && date < minDate) return true;
              if (maxDate && date > maxDate) return true;
              return false;
            }}
            initialFocus
          />
          
          {/* ปุ่ม Today และ Clear */}
          {showClear && (
            <div className="flex items-center justify-between border-t border-gray-200 dark:border-slate-600 p-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSelect(new Date())}
                className="text-xs"
              >
                วันนี้
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSelect(undefined)}
                className="text-xs text-gray-500"
              >
                ล้าง
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
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
