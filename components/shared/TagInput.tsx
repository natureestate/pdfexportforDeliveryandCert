/**
 * TagInput Component - จัดการ tags/specialties แบบ add/remove
 * ใช้แทน tag input ที่ซ้ำกันใน CRMPage, CustomerSelector, ContractorSelector
 * รองรับทั้งโหมด tag (กดปุ่มเพิ่ม) และโหมด comma-separated (พิมพ์คั่นด้วย comma)
 */

import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';

/** สีธีมที่รองรับ */
type ThemeColor = 'indigo' | 'orange' | 'blue' | 'green' | 'purple';

/** คู่ค่าสีสำหรับ tag badges และปุ่ม */
const tagColorMap: Record<ThemeColor, {
    badge: string;
    badgeText: string;
    button: string;
    buttonHover: string;
    focusRing: string;
}> = {
    indigo: {
        badge: 'bg-indigo-100 dark:bg-indigo-900/30',
        badgeText: 'text-indigo-700 dark:text-indigo-300',
        button: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300',
        buttonHover: 'hover:bg-indigo-200 dark:hover:bg-indigo-900/50',
        focusRing: 'focus:ring-indigo-500 focus:border-indigo-500',
    },
    orange: {
        badge: 'bg-orange-100 dark:bg-orange-900/30',
        badgeText: 'text-orange-700 dark:text-orange-300',
        button: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
        buttonHover: 'hover:bg-orange-200 dark:hover:bg-orange-900/50',
        focusRing: 'focus:ring-orange-500 focus:border-orange-500',
    },
    blue: {
        badge: 'bg-blue-100 dark:bg-blue-900/30',
        badgeText: 'text-blue-700 dark:text-blue-300',
        button: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
        buttonHover: 'hover:bg-blue-200 dark:hover:bg-blue-900/50',
        focusRing: 'focus:ring-blue-500 focus:border-blue-500',
    },
    green: {
        badge: 'bg-green-100 dark:bg-green-900/30',
        badgeText: 'text-green-700 dark:text-green-300',
        button: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
        buttonHover: 'hover:bg-green-200 dark:hover:bg-green-900/50',
        focusRing: 'focus:ring-green-500 focus:border-green-500',
    },
    purple: {
        badge: 'bg-purple-100 dark:bg-purple-900/30',
        badgeText: 'text-purple-700 dark:text-purple-300',
        button: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
        buttonHover: 'hover:bg-purple-200 dark:hover:bg-purple-900/50',
        focusRing: 'focus:ring-purple-500 focus:border-purple-500',
    },
};

interface TagInputProps {
    /** ข้อความ label */
    label?: string;
    /** รายการ tags ปัจจุบัน */
    tags: string[];
    /** callback เมื่อ tags เปลี่ยน (เพิ่มหรือลบ) */
    onTagsChange: (tags: string[]) => void;
    /** ข้อความ placeholder สำหรับ input */
    placeholder?: string;
    /** สีธีม */
    themeColor?: ThemeColor;
    /** className เพิ่มเติมสำหรับ container */
    className?: string;
    /** โหมด comma-separated - ไม่มีปุ่มเพิ่ม แยก tag ด้วย comma เมื่อ blur */
    commaSeparated?: boolean;
}

const TagInput: React.FC<TagInputProps> = ({
    label,
    tags,
    onTagsChange,
    placeholder = 'เพิ่ม tag...',
    themeColor = 'indigo',
    className = '',
    commaSeparated = false,
}) => {
    const [input, setInput] = useState('');
    const colors = tagColorMap[themeColor];

    /** เพิ่ม tag ใหม่ (ถ้ายังไม่มี) */
    const addTag = () => {
        const trimmed = input.trim();
        if (trimmed && !tags.includes(trimmed)) {
            onTagsChange([...tags, trimmed]);
            setInput('');
        }
    };

    /** ลบ tag ตาม index */
    const removeTag = (tagToRemove: string) => {
        onTagsChange(tags.filter(t => t !== tagToRemove));
    };

    /** จัดการ comma-separated input เมื่อ blur */
    const handleBlur = () => {
        if (commaSeparated && input.trim()) {
            const newTags = input
                .split(',')
                .map(t => t.trim())
                .filter(t => t && !tags.includes(t));
            if (newTags.length > 0) {
                onTagsChange([...tags, ...newTags]);
            }
            setInput('');
        }
    };

    /** จัดการ Enter key */
    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (commaSeparated) {
                handleBlur();
            } else {
                addTag();
            }
        }
    };

    return (
        <div className={className}>
            {label && (
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    {label}
                </label>
            )}

            {/* แสดง tags ที่มีอยู่ */}
            {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                    {tags.map((tag, idx) => (
                        <span
                            key={idx}
                            className={`${colors.badge} ${colors.badgeText} px-2 py-0.5 rounded text-xs flex items-center gap-1`}
                        >
                            {tag}
                            <button
                                type="button"
                                onClick={() => removeTag(tag)}
                                className="hover:opacity-70"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    ))}
                </div>
            )}

            {/* input field */}
            <div className="flex gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    onBlur={handleBlur}
                    className={`flex-1 w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm ${colors.focusRing} text-xs sm:text-sm px-3 py-2 dark:bg-slate-700 dark:text-gray-100`}
                    placeholder={placeholder}
                />
                {!commaSeparated && (
                    <button
                        type="button"
                        onClick={addTag}
                        className={`px-3 py-2 ${colors.button} ${colors.buttonHover} rounded-lg`}
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                )}
            </div>
        </div>
    );
};

export default TagInput;
