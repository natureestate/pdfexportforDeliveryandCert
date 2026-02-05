/**
 * ConfirmDialog Component
 * 
 * Custom dialog แทนที่ native window.confirm()
 * รองรับ dark mode และ customization
 */

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

// ประเภทของ confirm dialog
export type ConfirmVariant = 'default' | 'danger' | 'warning' | 'success';

// Options สำหรับการแสดง dialog
export interface ConfirmOptions {
  title?: string;           // หัวข้อ dialog
  message: string;          // ข้อความที่ต้องการแสดง
  confirmText?: string;     // ข้อความปุ่ม confirm (default: 'ยืนยัน')
  cancelText?: string;      // ข้อความปุ่ม cancel (default: 'ยกเลิก')
  variant?: ConfirmVariant; // รูปแบบสี (default: 'default')
  icon?: React.ReactNode;   // icon ที่ต้องการแสดง (optional)
}

// Context type
interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

// สร้าง Context
const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

// Hook สำหรับใช้งาน confirm dialog
export const useConfirm = (): ConfirmContextType => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
};

// Internal state type
interface DialogState {
  isOpen: boolean;
  options: ConfirmOptions | null;
}

// Provider Component
export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dialogState, setDialogState] = useState<DialogState>({
    isOpen: false,
    options: null,
  });
  
  // ใช้ ref เพื่อเก็บ resolve function
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  // Function สำหรับแสดง dialog
  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setDialogState({
        isOpen: true,
        options,
      });
    });
  }, []);

  // Handler เมื่อกด confirm
  const handleConfirm = useCallback(() => {
    resolveRef.current?.(true);
    resolveRef.current = null;
    setDialogState({ isOpen: false, options: null });
  }, []);

  // Handler เมื่อกด cancel
  const handleCancel = useCallback(() => {
    resolveRef.current?.(false);
    resolveRef.current = null;
    setDialogState({ isOpen: false, options: null });
  }, []);

  // สี variant
  const getVariantStyles = (variant: ConfirmVariant = 'default') => {
    switch (variant) {
      case 'danger':
        return {
          iconBg: 'bg-red-100 dark:bg-red-900/30',
          iconColor: 'text-red-600 dark:text-red-400',
          confirmBtn: 'bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 text-white',
        };
      case 'warning':
        return {
          iconBg: 'bg-amber-100 dark:bg-amber-900/30',
          iconColor: 'text-amber-600 dark:text-amber-400',
          confirmBtn: 'bg-amber-600 hover:bg-amber-700 dark:bg-amber-700 dark:hover:bg-amber-600 text-white',
        };
      case 'success':
        return {
          iconBg: 'bg-green-100 dark:bg-green-900/30',
          iconColor: 'text-green-600 dark:text-green-400',
          confirmBtn: 'bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white',
        };
      default:
        return {
          iconBg: 'bg-blue-100 dark:bg-blue-900/30',
          iconColor: 'text-blue-600 dark:text-blue-400',
          confirmBtn: 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white',
        };
    }
  };

  // Default icon ตาม variant
  const getDefaultIcon = (variant: ConfirmVariant = 'default') => {
    switch (variant) {
      case 'danger':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'success':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const { options } = dialogState;
  const variantStyles = options ? getVariantStyles(options.variant) : getVariantStyles();

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      
      {/* Dialog Overlay */}
      {dialogState.isOpen && options && (
        <div 
          className="fixed inset-0 z-[9999] overflow-y-auto"
          aria-labelledby="confirm-dialog-title"
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
                {/* Icon และ Content */}
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${variantStyles.iconBg}`}>
                    <span className={variantStyles.iconColor}>
                      {options.icon || getDefaultIcon(options.variant)}
                    </span>
                  </div>
                  
                  {/* Text Content */}
                  <div className="flex-1 min-w-0">
                    {options.title && (
                      <h3 
                        id="confirm-dialog-title"
                        className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2"
                      >
                        {options.title}
                      </h3>
                    )}
                    <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                      {options.message}
                    </p>
                  </div>
                </div>
                
                {/* Buttons */}
                <div className="mt-6 flex justify-end gap-3">
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
                    className={`px-4 py-2 text-sm font-medium rounded-lg
                              transition-colors focus:outline-none focus:ring-2 
                              focus:ring-offset-2 dark:focus:ring-offset-slate-800
                              ${variantStyles.confirmBtn}`}
                  >
                    {options.confirmText || 'ยืนยัน'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};

export default ConfirmProvider;
