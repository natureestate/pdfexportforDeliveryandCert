/**
 * i18n Configuration
 * ระบบ Internationalization สำหรับแอป
 * รองรับภาษาไทย (th) และอังกฤษ (en)
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import thTranslation from '../locales/th/translation.json';
import enTranslation from '../locales/en/translation.json';

// Resources สำหรับแต่ละภาษา
const resources = {
    th: {
        translation: thTranslation
    },
    en: {
        translation: enTranslation
    }
};

// Initialize i18n
i18n
    .use(LanguageDetector) // ตรวจจับภาษาจาก browser/localStorage
    .use(initReactI18next) // เชื่อมต่อกับ React
    .init({
        resources,
        fallbackLng: 'th', // ภาษา fallback เป็นภาษาไทย
        defaultNS: 'translation',
        
        // ตั้งค่า Language Detector
        detection: {
            order: ['localStorage', 'navigator', 'htmlTag'],
            caches: ['localStorage'],
            lookupLocalStorage: 'i18nextLng'
        },
        
        interpolation: {
            escapeValue: false // React จัดการ XSS อยู่แล้ว
        },
        
        // React-specific options
        react: {
            useSuspense: false // ปิด Suspense เพื่อความเข้ากันได้
        },
        
        debug: process.env.NODE_ENV === 'development'
    });

export default i18n;

// Helper function สำหรับเปลี่ยนภาษา
export const changeLanguage = (lng: 'th' | 'en') => {
    i18n.changeLanguage(lng);
};

// Helper function สำหรับดึงภาษาปัจจุบัน
export const getCurrentLanguage = (): string => {
    return i18n.language || 'th';
};

// รายการภาษาที่รองรับ
export const supportedLanguages = [
    { code: 'th', name: 'ไทย', nativeName: 'ภาษาไทย', flag: '🇹🇭' },
    { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' }
];

