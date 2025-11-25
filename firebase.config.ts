/**
 * Firebase Configuration และ Initialization
 * ไฟล์นี้ใช้สำหรับการตั้งค่าและเชื่อมต่อกับ Firebase services
 * 
 * ⚠️ ความปลอดภัย: ค่า configuration ถูกดึงจาก Environment Variables
 * ดู .env.example สำหรับตัวอย่างการตั้งค่า
 */

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

// ============================================================
// Environment Variables Validation
// ============================================================

/**
 * ตรวจสอบว่า Environment Variables ถูกตั้งค่าครบถ้วนหรือไม่
 * ถ้าไม่ครบจะแสดง warning ใน console
 */
const validateEnvVariables = () => {
    const requiredVars = [
        'VITE_FIREBASE_API_KEY',
        'VITE_FIREBASE_AUTH_DOMAIN',
        'VITE_FIREBASE_PROJECT_ID',
        'VITE_FIREBASE_STORAGE_BUCKET',
        'VITE_FIREBASE_MESSAGING_SENDER_ID',
        'VITE_FIREBASE_APP_ID',
    ];

    const missingVars = requiredVars.filter(varName => !import.meta.env[varName]);

    if (missingVars.length > 0) {
        console.error('❌ Missing Firebase Environment Variables:', missingVars);
        console.error('📝 กรุณาสร้างไฟล์ .env และตั้งค่าตามตัวอย่างใน .env.example');
        
        // ในโหมด development แสดง warning แต่ยังทำงานต่อได้ (ถ้ามี fallback)
        if (import.meta.env.DEV) {
            console.warn('⚠️ Development Mode: ใช้ค่า fallback (ถ้ามี)');
        }
    }

    return missingVars.length === 0;
};

// ตรวจสอบ Environment Variables
const isEnvValid = validateEnvVariables();

// ============================================================
// Firebase Configuration
// ============================================================

/**
 * Firebase Configuration Object
 * ค่าทั้งหมดถูกดึงจาก Environment Variables
 */
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Log configuration status (ไม่แสดงค่าจริงเพื่อความปลอดภัย)
if (import.meta.env.DEV) {
    console.log('🔧 Firebase Config Status:', {
        apiKey: firebaseConfig.apiKey ? '✅ Set' : '❌ Missing',
        authDomain: firebaseConfig.authDomain ? '✅ Set' : '❌ Missing',
        projectId: firebaseConfig.projectId ? '✅ Set' : '❌ Missing',
        storageBucket: firebaseConfig.storageBucket ? '✅ Set' : '❌ Missing',
        messagingSenderId: firebaseConfig.messagingSenderId ? '✅ Set' : '❌ Missing',
        appId: firebaseConfig.appId ? '✅ Set' : '❌ Missing',
    });
}

// ============================================================
// Firebase Initialization
// ============================================================

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// ============================================================
// App Check (reCAPTCHA v3)
// ============================================================

/**
 * Initialize App Check with reCAPTCHA v3
 * ใช้สำหรับป้องกัน abuse และ bot attacks
 */
const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

if (recaptchaSiteKey) {
    try {
        const appCheck = initializeAppCheck(app, {
            provider: new ReCaptchaV3Provider(recaptchaSiteKey),
            isTokenAutoRefreshEnabled: true // Auto-refresh token
        });
        
        if (import.meta.env.DEV) {
            console.log('✅ App Check initialized with reCAPTCHA v3');
        }
    } catch (error) {
        console.error('❌ Failed to initialize App Check:', error);
    }
} else {
    console.warn('⚠️ reCAPTCHA Site Key not found. App Check is disabled.');
}

// ============================================================
// Firebase Services
// ============================================================

// Initialize Firebase services
export const db = getFirestore(app);        // Firestore Database
export const auth = getAuth(app);           // Firebase Authentication
export const storage = getStorage(app);     // Firebase Storage
export const functions = getFunctions(app); // Firebase Cloud Functions

// ============================================================
// Development Settings
// ============================================================

/**
 * ตั้งค่าสำหรับ Development Mode
 * - เปิดใช้งาน Test Phone Numbers
 * - แสดง debug information
 */
if (typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    console.log('🔧 Development Mode: เปิดใช้งาน Test Phone Numbers');
    
    // ตั้งค่า Test Phone Number และ OTP
    // หมายเหตุ: ต้องตั้งค่า Test Phone Numbers ใน Firebase Console ด้วย
    (auth as any).settings = {
        appVerificationDisabledForTesting: false, // ยังคงใช้ reCAPTCHA
    };
    
    // แสดงข้อมูล Test Phone (ถ้ามี)
    const testPhone = import.meta.env.VITE_TEST_PHONE_NUMBER;
    const testOtp = import.meta.env.VITE_TEST_OTP;
    if (testPhone && testOtp) {
        console.log(`📱 Test Phone: ${testPhone}, OTP: ${testOtp}`);
    }
}

// ============================================================
// Exports
// ============================================================

// Export app instance สำหรับใช้งานอื่นๆ
export default app;

// Export utility functions
export const isFirebaseConfigValid = () => isEnvValid;
export const getFirebaseProjectId = () => firebaseConfig.projectId;
