/**
 * LanguageSwitcher Component
 * Component สำหรับเปลี่ยนภาษาของแอปพลิเคชัน
 * ใช้ FlagIcon แบบวงกลมสวยงามแทน emoji
 */

import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { supportedLanguages } from '../i18n';
import FlagIcon from './FlagIcon';

interface LanguageSwitcherProps {
    className?: string;
    showLabel?: boolean;
    compact?: boolean;
}

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ 
    className = '', 
    showLabel = true,
    compact = false 
}) => {
    const { i18n, t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // ดึงข้อมูลภาษาปัจจุบัน
    const currentLanguage = supportedLanguages.find(lang => lang.code === i18n.language) 
        || supportedLanguages[0]; // Default เป็นภาษาไทย

    // ปิด dropdown เมื่อคลิกข้างนอก
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // ฟังก์ชันเปลี่ยนภาษา
    const handleLanguageChange = (langCode: string) => {
        i18n.changeLanguage(langCode);
        setIsOpen(false);
    };

    if (compact) {
        // Compact mode - แสดงเฉพาะ flag แบบวงกลมสวยงาม
        return (
            <div ref={dropdownRef} className={`relative ${className}`}>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center justify-center p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-all duration-200 hover:scale-110"
                    title={t('language.selectLanguage')}
                >
                    <FlagIcon country={currentLanguage.code as 'th' | 'en'} size={28} />
                </button>
                
                {isOpen && (
                    <div className="absolute right-0 mt-2 w-44 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-200 dark:border-slate-600 py-2 z-50 animate-fadeIn">
                        {supportedLanguages.map((lang) => (
                            <button
                                key={lang.code}
                                onClick={() => handleLanguageChange(lang.code)}
                                className={`w-full px-4 py-2.5 text-left flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-slate-700 transition-all duration-200 ${
                                    i18n.language === lang.code 
                                        ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' 
                                        : 'text-gray-700 dark:text-gray-300'
                                }`}
                            >
                                <FlagIcon country={lang.code as 'th' | 'en'} size={24} />
                                <span className="text-sm font-medium">{lang.nativeName}</span>
                                {i18n.language === lang.code && (
                                    <Check className="w-4 h-4 ml-auto text-indigo-600 dark:text-indigo-400" />
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // Full mode - แสดง label และ dropdown พร้อม flag แบบวงกลม (compact)
    return (
        <div ref={dropdownRef} className={`relative flex items-center justify-between ${className}`}>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">ภาษา</span>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all duration-200"
            >
                <FlagIcon country={currentLanguage.code as 'th' | 'en'} size={18} />
                {showLabel && (
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                        {currentLanguage.code.toUpperCase()}
                    </span>
                )}
                <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isOpen && (
                <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-gray-200 dark:border-slate-600 py-1 z-50 animate-fadeIn overflow-hidden">
                    {supportedLanguages.map((lang) => (
                        <button
                            key={lang.code}
                            onClick={() => handleLanguageChange(lang.code)}
                            className={`w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-slate-700 transition-all duration-200 ${
                                i18n.language === lang.code 
                                    ? 'bg-indigo-50 dark:bg-indigo-900/30' 
                                    : ''
                            }`}
                        >
                            <FlagIcon country={lang.code as 'th' | 'en'} size={20} />
                            <span className={`text-sm font-medium flex-1 ${
                                i18n.language === lang.code 
                                    ? 'text-indigo-600 dark:text-indigo-400' 
                                    : 'text-gray-700 dark:text-gray-300'
                            }`}>
                                {lang.nativeName}
                            </span>
                            {i18n.language === lang.code && (
                                <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default LanguageSwitcher;

