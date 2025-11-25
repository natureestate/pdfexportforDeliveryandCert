/**
 * reCAPTCHA v3 Service
 * บริการจัดการ Google reCAPTCHA v3 สำหรับป้องกัน bot
 * 
 * ⚠️ ความปลอดภัย: Site Key ถูกดึงจาก Environment Variables
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase.config';

// Site Key สำหรับ reCAPTCHA v3 (ดึงจาก Environment Variables)
const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || '';

// ตรวจสอบว่ามี Site Key หรือไม่
if (!RECAPTCHA_SITE_KEY && import.meta.env.DEV) {
    console.warn('⚠️ VITE_RECAPTCHA_SITE_KEY ไม่ได้ตั้งค่า - reCAPTCHA จะไม่ทำงาน');
}

// Threshold สำหรับตัดสินว่าเป็น bot หรือไม่ (0.0-1.0)
const RECAPTCHA_THRESHOLD = 0.5;

// Declare grecaptcha type
declare global {
    interface Window {
        grecaptcha: {
            ready: (callback: () => void) => void;
            execute: (siteKey: string, options: { action: string }) => Promise<string>;
        };
    }
}

/**
 * Interface สำหรับผลการ verify reCAPTCHA
 */
export interface RecaptchaVerifyResult {
    success: boolean;
    score: number;
    action: string;
    message?: string;
}

/**
 * Execute reCAPTCHA และรับ token
 * @param action - ชื่อ action (เช่น 'login', 'submit')
 * @returns Promise<string> - reCAPTCHA token
 */
export const executeRecaptcha = async (action: string): Promise<string> => {
    try {
        // รอให้ reCAPTCHA พร้อม
        return await new Promise((resolve, reject) => {
            if (!window.grecaptcha) {
                reject(new Error('reCAPTCHA ยังไม่โหลดเสร็จ'));
                return;
            }

            window.grecaptcha.ready(async () => {
                try {
                    const token = await window.grecaptcha.execute(RECAPTCHA_SITE_KEY, { action });
                    resolve(token);
                } catch (error) {
                    reject(error);
                }
            });
        });
    } catch (error) {
        console.error('Error executing reCAPTCHA:', error);
        throw new Error('ไม่สามารถตรวจสอบ reCAPTCHA ได้');
    }
};

/**
 * Verify reCAPTCHA token กับ Firebase Cloud Function
 * @param token - reCAPTCHA token
 * @param action - ชื่อ action ที่คาดหวัง
 * @returns Promise<RecaptchaVerifyResult>
 */
export const verifyRecaptchaToken = async (
    token: string,
    action: string
): Promise<RecaptchaVerifyResult> => {
    try {
        // เรียก Firebase Cloud Function
        const verifyRecaptcha = httpsCallable<
            { token: string; action: string },
            RecaptchaVerifyResult
        >(functions, 'verifyRecaptcha');

        const result = await verifyRecaptcha({ token, action });
        return result.data;
    } catch (error: any) {
        console.error('Error verifying reCAPTCHA:', error);
        
        // ถ้า Cloud Function ยังไม่ deploy หรือมีปัญหา ให้ผ่านไปก่อน
        if (error.code === 'functions/not-found') {
            console.warn('⚠️ Cloud Function ยังไม่ได้ deploy, ข้าม reCAPTCHA verification');
            return {
                success: true,
                score: 1.0,
                action,
                message: 'Cloud Function not deployed, bypassing verification'
            };
        }
        
        throw new Error('ไม่สามารถตรวจสอบ reCAPTCHA ได้');
    }
};

/**
 * Execute และ Verify reCAPTCHA ในขั้นตอนเดียว
 * @param action - ชื่อ action
 * @returns Promise<RecaptchaVerifyResult>
 */
export const executeAndVerifyRecaptcha = async (
    action: string
): Promise<RecaptchaVerifyResult> => {
    // 1. Execute reCAPTCHA และรับ token
    const token = await executeRecaptcha(action);
    
    // 2. Verify token กับ backend
    const result = await verifyRecaptchaToken(token, action);
    
    return result;
};

/**
 * ตรวจสอบว่า reCAPTCHA score ผ่านเกณฑ์หรือไม่
 * @param score - reCAPTCHA score (0.0-1.0)
 * @returns boolean
 */
export const isRecaptchaScoreValid = (score: number): boolean => {
    return score >= RECAPTCHA_THRESHOLD;
};

/**
 * ดึงข้อความ error ตาม score
 * @param score - reCAPTCHA score
 * @returns string
 */
export const getRecaptchaErrorMessage = (score: number): string => {
    if (score < 0.3) {
        return 'ตรวจพบกิจกรรมผิดปกติ ไม่สามารถดำเนินการได้';
    } else if (score < 0.5) {
        return 'ตรวจพบกิจกรรมที่น่าสงสัย กรุณาลองใหม่อีกครั้ง';
    } else {
        return 'การตรวจสอบล้มเหลว กรุณาลองใหม่';
    }
};
