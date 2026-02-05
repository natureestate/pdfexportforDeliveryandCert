/**
 * InputPromptDialog Component
 * 
 * Custom dialog แทนที่ native window.prompt()
 * รองรับ dark mode และ customization
 */

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

// ประเภทของ input
export type InputType = 'text' | 'email' | 'number' | 'password' | 'tel' | 'url';

// Options สำหรับการแสดง dialog
export interface PromptOptions {
  title?: string;           // หัวข้อ dialog
  message?: string;         // ข้อความอธิบาย (optional)
  placeholder?: string;     // placeholder ใน input
  defaultValue?: string;    // ค่าเริ่มต้น
  inputType?: InputType;    // ประเภท input (default: 'text')
  confirmText?: string;     // ข้อความปุ่ม confirm (default: 'ตกลง')
  cancelText?: string;      // ข้อความปุ่ม cancel (default: 'ยกเลิก')
  required?: boolean;       // ต้องกรอกหรือไม่ (default: true)
  maxLength?: number;       // ความยาวสูงสุด
  minLength?: number;       // ความยาวต่ำสุด
  pattern?: string;         // regex pattern สำหรับ validation
  errorMessage?: string;    // ข้อความ error เมื่อ validation ไม่ผ่าน
}

// Context type
interface PromptContextType {
  prompt: (options: PromptOptions) => Promise<string | null>;
}

// สร้าง Context
const PromptContext = createContext<PromptContextType | undefined>(undefined);

// Hook สำหรับใช้งาน prompt dialog
export const usePrompt = (): PromptContextType => {
  const context = useContext(PromptContext);
  if (!context) {
    throw new Error('usePrompt must be used within a PromptProvider');
  }
  return context;
};

// Internal state type
interface DialogState {
  isOpen: boolean;
  options: PromptOptions | null;
}

// Provider Component
export const PromptProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dialogState, setDialogState] = useState<DialogState>({
    isOpen: false,
    options: null,
  });
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  // ใช้ ref เพื่อเก็บ resolve function และ input element
  const resolveRef = useRef<((value: string | null) => void) | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Function สำหรับแสดง dialog
  const prompt = useCallback((options: PromptOptions): Promise<string | null> => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setInputValue(options.defaultValue || '');
      setError(null);
      setDialogState({
        isOpen: true,
        options,
      });
    });
  }, []);

  // Focus input เมื่อเปิด dialog
  useEffect(() => {
    if (dialogState.isOpen && inputRef.current) {
      // ใช้ timeout เพื่อให้ dialog render ก่อน
      const timer = setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [dialogState.isOpen]);

  // Validate input
  const validateInput = useCallback((value: string, options: PromptOptions): boolean => {
    const { required = true, minLength, maxLength, pattern, errorMessage } = options;

    // ตรวจสอบ required
    if (required && !value.trim()) {
      setError(errorMessage || 'กรุณากรอกข้อมูล');
      return false;
    }

    // ตรวจสอบ minLength
    if (minLength && value.length < minLength) {
      setError(errorMessage || `กรุณากรอกอย่างน้อย ${minLength} ตัวอักษร`);
      return false;
    }

    // ตรวจสอบ maxLength
    if (maxLength && value.length > maxLength) {
      setError(errorMessage || `กรุณากรอกไม่เกิน ${maxLength} ตัวอักษร`);
      return false;
    }

    // ตรวจสอบ pattern
    if (pattern) {
      const regex = new RegExp(pattern);
      if (!regex.test(value)) {
        setError(errorMessage || 'รูปแบบข้อมูลไม่ถูกต้อง');
        return false;
      }
    }

    setError(null);
    return true;
  }, []);

  // Handler เมื่อกด confirm
  const handleConfirm = useCallback(() => {
    const { options } = dialogState;
    if (!options) return;

    if (!validateInput(inputValue, options)) {
      return;
    }

    resolveRef.current?.(inputValue);
    resolveRef.current = null;
    setDialogState({ isOpen: false, options: null });
    setInputValue('');
    setError(null);
  }, [dialogState, inputValue, validateInput]);

  // Handler เมื่อกด cancel
  const handleCancel = useCallback(() => {
    resolveRef.current?.(null);
    resolveRef.current = null;
    setDialogState({ isOpen: false, options: null });
    setInputValue('');
    setError(null);
  }, []);

  // Handler สำหรับ keyboard events
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirm();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  }, [handleConfirm, handleCancel]);

  const { options } = dialogState;

  return (
    <PromptContext.Provider value={{ prompt }}>
      {children}
      
      {/* Dialog Overlay */}
      {dialogState.isOpen && options && (
        <div 
          className="fixed inset-0 z-[9999] overflow-y-auto"
          aria-labelledby="prompt-dialog-title"
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 dark:bg-black/70 transition-opacity"
            onClick={handleCancel}
          />
          
          {/* Dialog Container */}
          <div className="flex min-h-full items-center justify-center p-4">
            <div 
              className="relative bg-white dark:bg-slate-800 rounded-lg shadow-xl 
                         max-w-md w-full transform transition-all
                         border border-gray-200 dark:border-slate-700"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                {/* Icon และ Title */}
                <div className="flex items-start gap-4 mb-4">
                  {/* Icon */}
                  <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center bg-blue-100 dark:bg-blue-900/30">
                    <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  
                  {/* Title และ Message */}
                  <div className="flex-1 min-w-0">
                    {options.title && (
                      <h3 
                        id="prompt-dialog-title"
                        className="text-lg font-semibold text-gray-900 dark:text-gray-100"
                      >
                        {options.title}
                      </h3>
                    )}
                    {options.message && (
                      <p className="mt-1 text-gray-600 dark:text-gray-400">
                        {options.message}
                      </p>
                    )}
                  </div>
                </div>
                
                {/* Input Field */}
                <div className="mb-4">
                  <input
                    ref={inputRef}
                    type={options.inputType || 'text'}
                    value={inputValue}
                    onChange={(e) => {
                      setInputValue(e.target.value);
                      setError(null); // ล้าง error เมื่อพิมพ์
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder={options.placeholder}
                    maxLength={options.maxLength}
                    className={`w-full px-4 py-3 text-base rounded-lg border 
                              bg-white dark:bg-slate-700
                              text-gray-900 dark:text-gray-100
                              placeholder-gray-400 dark:placeholder-gray-500
                              focus:outline-none focus:ring-2 
                              ${error 
                                ? 'border-red-500 dark:border-red-400 focus:ring-red-500 dark:focus:ring-red-400' 
                                : 'border-gray-300 dark:border-slate-600 focus:ring-blue-500 dark:focus:ring-blue-400'
                              }
                              transition-colors`}
                  />
                  {/* Error Message */}
                  {error && (
                    <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                      {error}
                    </p>
                  )}
                </div>
                
                {/* Buttons */}
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="px-4 py-2 text-sm font-medium rounded-lg
                             bg-gray-100 dark:bg-slate-700 
                             text-gray-700 dark:text-gray-300
                             hover:bg-gray-200 dark:hover:bg-slate-600
                             transition-colors focus:outline-none focus:ring-2 
                             focus:ring-gray-400 dark:focus:ring-slate-500"
                  >
                    {options.cancelText || 'ยกเลิก'}
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirm}
                    className="px-4 py-2 text-sm font-medium rounded-lg
                             bg-blue-600 hover:bg-blue-700 
                             dark:bg-blue-700 dark:hover:bg-blue-600 
                             text-white
                             transition-colors focus:outline-none focus:ring-2 
                             focus:ring-blue-500 focus:ring-offset-2 
                             dark:focus:ring-offset-slate-800"
                  >
                    {options.confirmText || 'ตกลง'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </PromptContext.Provider>
  );
};

export default PromptProvider;
