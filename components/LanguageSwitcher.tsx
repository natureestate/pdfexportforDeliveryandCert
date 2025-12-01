/**
 * LanguageSwitcher Component
 * Component สำหรับเปลี่ยนภาษาของแอปพลิเคชัน
 */

import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { supportedLanguages } from '../i18n';

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
        // Compact mode - แสดงเฉพาะ flag
        return (
            <div ref={dropdownRef} className={`relative ${className}`}>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center justify-center p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                    title={t('language.selectLanguage')}
                >
                    <span className="text-lg">{currentLanguage.flag}</span>
                </button>
                
                {isOpen && (
                    <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-600 py-1 z-50">
                        {supportedLanguages.map((lang) => (
                            <button
                                key={lang.code}
                                onClick={() => handleLanguageChange(lang.code)}
                                className={`w-full px-4 py-2 text-left flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors ${
                                    i18n.language === lang.code 
                                        ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' 
                                        : 'text-gray-700 dark:text-gray-300'
                                }`}
                            >
                                <span className="text-lg">{lang.flag}</span>
                                <span className="text-sm">{lang.nativeName}</span>
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

    // Full mode - แสดง label และ dropdown
    return (
        <div ref={dropdownRef} className={`relative ${className}`}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
                <Globe className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span className="text-lg">{currentLanguage.flag}</span>
                {showLabel && (
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                        {currentLanguage.nativeName}
                    </span>
                )}
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-600 py-1 z-50">
                    <div className="px-3 py-2 border-b border-gray-100 dark:border-slate-700">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            {t('language.selectLanguage')}
                        </span>
                    </div>
                    {supportedLanguages.map((lang) => (
                        <button
                            key={lang.code}
                            onClick={() => handleLanguageChange(lang.code)}
                            className={`w-full px-4 py-2.5 text-left flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors ${
                                i18n.language === lang.code 
                                    ? 'bg-indigo-50 dark:bg-indigo-900/30' 
                                    : ''
                            }`}
                        >
                            <span className="text-xl">{lang.flag}</span>
                            <div className="flex-1">
                                <div className={`text-sm font-medium ${
                                    i18n.language === lang.code 
                                        ? 'text-indigo-600 dark:text-indigo-400' 
                                        : 'text-gray-700 dark:text-gray-300'
                                }`}>
                                    {lang.nativeName}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {lang.name}
                                </div>
                            </div>
                            {i18n.language === lang.code && (
                                <Check className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default LanguageSwitcher;

