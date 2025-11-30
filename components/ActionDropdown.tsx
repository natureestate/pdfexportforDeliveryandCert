import React, { useState, useRef, useEffect } from 'react';

// ประเภทของ action ใน dropdown
export interface ActionItem {
    label: string;           // ข้อความที่แสดง
    icon?: React.ReactNode;  // ไอคอน (optional)
    onClick: () => void;     // ฟังก์ชันเมื่อคลิก
    disabled?: boolean;      // ปิดการใช้งาน
    loading?: boolean;       // กำลังโหลด
    loadingText?: string;    // ข้อความตอนโหลด
    variant?: 'default' | 'danger' | 'success' | 'warning'; // สีของ action
    hidden?: boolean;        // ซ่อน action นี้
}

interface ActionDropdownProps {
    actions: ActionItem[];   // รายการ actions
    buttonLabel?: string;    // ข้อความปุ่ม (default: "⋮")
}

/**
 * ActionDropdown - Dropdown menu สำหรับ actions ต่างๆ
 * ใช้สำหรับจัดการปุ่มที่มีหลายตัวเลือกให้เป็นระเบียบ
 */
const ActionDropdown: React.FC<ActionDropdownProps> = ({ actions, buttonLabel }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // ปิด dropdown เมื่อคลิกนอก component
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // ปิด dropdown เมื่อกด Escape
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, []);

    // กรอง actions ที่ไม่ถูกซ่อน
    const visibleActions = actions.filter(action => !action.hidden);

    if (visibleActions.length === 0) return null;

    // กำหนดสีตาม variant
    const getVariantClasses = (variant?: ActionItem['variant']) => {
        switch (variant) {
            case 'danger':
                return 'text-red-600 hover:bg-red-50';
            case 'success':
                return 'text-green-600 hover:bg-green-50';
            case 'warning':
                return 'text-amber-600 hover:bg-amber-50';
            default:
                return 'text-gray-700 hover:bg-gray-100';
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* ปุ่มเปิด dropdown */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-1.5 sm:p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="ตัวเลือกเพิ่มเติม"
                aria-label="เปิดเมนูตัวเลือก"
                aria-expanded={isOpen}
            >
                {buttonLabel || (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                    </svg>
                )}
            </button>

            {/* Dropdown menu */}
            {isOpen && (
                <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                    {visibleActions.map((action, index) => (
                        <button
                            key={index}
                            onClick={() => {
                                if (!action.disabled && !action.loading) {
                                    action.onClick();
                                    setIsOpen(false);
                                }
                            }}
                            disabled={action.disabled || action.loading}
                            className={`
                                w-full px-4 py-2 text-left text-sm flex items-center gap-2 transition-colors
                                ${getVariantClasses(action.variant)}
                                ${(action.disabled || action.loading) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                            `}
                        >
                            {action.loading ? (
                                <>
                                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span>{action.loadingText || 'กำลังดำเนินการ...'}</span>
                                </>
                            ) : (
                                <>
                                    {action.icon && <span className="w-4 h-4 flex-shrink-0">{action.icon}</span>}
                                    <span>{action.label}</span>
                                </>
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ActionDropdown;

