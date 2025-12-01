/**
 * PhoneAuthForm Component
 * ฟอร์มสำหรับ Login ด้วยเบอร์โทรศัพท์และ OTP
 */

import React, { useState, useEffect, useRef } from 'react';
import { ConfirmationResult, RecaptchaVerifier } from 'firebase/auth';
import { createRecaptchaVerifier, sendPhoneOTP, verifyPhoneOTP } from '../services/auth';

interface PhoneAuthFormProps {
    /** Callback เมื่อ Login สำเร็จ */
    onSuccess?: () => void;
    /** Callback เมื่อเกิด error */
    onError?: (error: string) => void;
}

type Step = 'phone' | 'otp';

const PhoneAuthForm: React.FC<PhoneAuthFormProps> = ({ onSuccess, onError }) => {
    // State management
    const [step, setStep] = useState<Step>('phone');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [otp, setOtp] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [countdown, setCountdown] = useState(0);
    
    // Refs
    const confirmationResultRef = useRef<ConfirmationResult | null>(null);
    const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

    /**
     * ตั้งค่า reCAPTCHA Verifier เมื่อ component mount
     */
    useEffect(() => {
        // สร้าง reCAPTCHA verifier
        try {
            recaptchaVerifierRef.current = createRecaptchaVerifier('recaptcha-container');
        } catch (err) {
            console.error('Error creating reCAPTCHA verifier:', err);
        }

        // Cleanup เมื่อ component unmount
        return () => {
            if (recaptchaVerifierRef.current) {
                try {
                    recaptchaVerifierRef.current.clear();
                } catch (err) {
                    console.error('Error clearing reCAPTCHA:', err);
                }
            }
        };
    }, []);

    /**
     * Countdown timer สำหรับปุ่มขอ OTP ใหม่
     */
    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    /**
     * จัดรูปแบบเบอร์โทรศัพท์
     */
    const formatPhoneNumber = (value: string): string => {
        // ลบตัวอักษรที่ไม่ใช่ตัวเลขและ +
        let cleaned = value.replace(/[^\d+]/g, '');
        
        // ถ้าไม่มี + ให้เติม +66 ข้างหน้า
        if (!cleaned.startsWith('+')) {
            if (cleaned.startsWith('0')) {
                cleaned = '+66' + cleaned.substring(1);
            } else if (cleaned.startsWith('66')) {
                cleaned = '+' + cleaned;
            } else {
                cleaned = '+66' + cleaned;
            }
        }
        
        return cleaned;
    };

    /**
     * จัดการการเปลี่ยนแปลงเบอร์โทรศัพท์
     */
    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatPhoneNumber(e.target.value);
        setPhoneNumber(formatted);
        setError(null);
    };

    /**
     * ตรวจสอบความถูกต้องของเบอร์โทรศัพท์
     */
    const validatePhoneNumber = (phone: string): boolean => {
        // รูปแบบ: +66XXXXXXXXX (เบอร์ไทย 10 หลัก)
        const phoneRegex = /^\+66\d{9}$/;
        return phoneRegex.test(phone);
    };

    /**
     * ส่ง OTP ไปยังเบอร์โทรศัพท์
     */
    const handleSendOTP = async () => {
        setError(null);

        // ตรวจสอบเบอร์โทรศัพท์
        if (!validatePhoneNumber(phoneNumber)) {
            const errorMsg = 'กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง (เช่น +66812345678)';
            setError(errorMsg);
            onError?.(errorMsg);
            return;
        }

        setIsLoading(true);

        try {
            // สร้าง reCAPTCHA verifier ใหม่ถ้ายังไม่มี
            if (!recaptchaVerifierRef.current) {
                recaptchaVerifierRef.current = createRecaptchaVerifier('recaptcha-container');
            }

            // ส่ง OTP
            const confirmationResult = await sendPhoneOTP(
                phoneNumber,
                recaptchaVerifierRef.current
            );

            // เก็บ confirmation result ไว้ใช้ยืนยัน OTP
            confirmationResultRef.current = confirmationResult;

            // เปลี่ยนไปขั้นตอนกรอก OTP
            setStep('otp');
            setCountdown(60); // เริ่ม countdown 60 วินาที
            
            console.log('✅ ส่ง OTP สำเร็จ');
        } catch (err: any) {
            console.error('Error sending OTP:', err);
            const errorMsg = err.message || 'ไม่สามารถส่ง OTP ได้';
            setError(errorMsg);
            onError?.(errorMsg);
            
            // รีเซ็ต reCAPTCHA
            if (recaptchaVerifierRef.current) {
                try {
                    recaptchaVerifierRef.current.clear();
                    recaptchaVerifierRef.current = createRecaptchaVerifier('recaptcha-container');
                } catch (e) {
                    console.error('Error resetting reCAPTCHA:', e);
                }
            }
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * ยืนยัน OTP และ Login
     */
    const handleVerifyOTP = async () => {
        setError(null);

        // ตรวจสอบ OTP
        if (otp.length !== 6) {
            const errorMsg = 'กรุณากรอกรหัส OTP 6 หลัก';
            setError(errorMsg);
            onError?.(errorMsg);
            return;
        }

        if (!confirmationResultRef.current) {
            const errorMsg = 'กรุณาขอรหัส OTP ใหม่';
            setError(errorMsg);
            onError?.(errorMsg);
            return;
        }

        setIsLoading(true);

        try {
            // ยืนยัน OTP
            await verifyPhoneOTP(confirmationResultRef.current, otp);
            
            console.log('✅ Login สำเร็จ');
            onSuccess?.();
        } catch (err: any) {
            console.error('Error verifying OTP:', err);
            const errorMsg = err.message || 'ไม่สามารถยืนยัน OTP ได้';
            setError(errorMsg);
            onError?.(errorMsg);
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * กลับไปขั้นตอนกรอกเบอร์โทรศัพท์
     */
    const handleBackToPhone = () => {
        setStep('phone');
        setOtp('');
        setError(null);
        confirmationResultRef.current = null;
    };

    /**
     * จัดการการกด Enter
     */
    const handleKeyPress = (e: React.KeyboardEvent, action: () => void) => {
        if (e.key === 'Enter' && !isLoading) {
            action();
        }
    };

    return (
        <div className="space-y-4">
            {step === 'phone' ? (
                // ขั้นตอนที่ 1: กรอกเบอร์โทรศัพท์
                <>
                    <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">
                            เบอร์โทรศัพท์
                        </label>
                        <input
                            type="tel"
                            id="phone"
                            value={phoneNumber}
                            onChange={handlePhoneChange}
                            onKeyPress={(e) => handleKeyPress(e, handleSendOTP)}
                            placeholder="+66812345678"
                            disabled={isLoading}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-slate-700 disabled:cursor-not-allowed bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                        />
                        <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                            รูปแบบ: +66XXXXXXXXX (เบอร์ไทย)
                        </p>
                    </div>

                    <button
                        onClick={handleSendOTP}
                        disabled={isLoading || !phoneNumber}
                        className="w-full bg-indigo-600 dark:bg-indigo-700 text-white rounded-lg px-6 py-3 font-medium hover:bg-indigo-700 dark:hover:bg-indigo-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <>
                                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>กำลังส่ง OTP...</span>
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                <span>ส่งรหัส OTP</span>
                            </>
                        )}
                    </button>
                </>
            ) : (
                // ขั้นตอนที่ 2: กรอก OTP
                <>
                    <div className="text-center mb-4">
                        <p className="text-sm text-gray-600 dark:text-slate-400">
                            เราได้ส่งรหัส OTP ไปยัง
                        </p>
                        <p className="text-lg font-semibold text-gray-800 dark:text-slate-100 mt-1">
                            {phoneNumber}
                        </p>
                    </div>

                    <div>
                        <label htmlFor="otp" className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">
                            รหัส OTP
                        </label>
                        <input
                            type="text"
                            id="otp"
                            value={otp}
                            onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                                setOtp(value);
                                setError(null);
                            }}
                            onKeyPress={(e) => handleKeyPress(e, handleVerifyOTP)}
                            placeholder="123456"
                            maxLength={6}
                            disabled={isLoading}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg text-center text-2xl tracking-widest focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-slate-700 disabled:cursor-not-allowed bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                        />
                        <p className="mt-1 text-xs text-gray-500 dark:text-slate-400 text-center">
                            กรอกรหัส OTP 6 หลัก
                        </p>
                    </div>

                    <button
                        onClick={handleVerifyOTP}
                        disabled={isLoading || otp.length !== 6}
                        className="w-full bg-indigo-600 dark:bg-indigo-700 text-white rounded-lg px-6 py-3 font-medium hover:bg-indigo-700 dark:hover:bg-indigo-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <>
                                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>กำลังยืนยัน...</span>
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>ยืนยัน OTP</span>
                            </>
                        )}
                    </button>

                    {/* ปุ่มขอ OTP ใหม่ */}
                    <div className="text-center">
                        {countdown > 0 ? (
                            <p className="text-sm text-gray-500 dark:text-slate-400">
                                ขอรหัสใหม่ได้ใน {countdown} วินาที
                            </p>
                        ) : (
                            <button
                                onClick={handleSendOTP}
                                disabled={isLoading}
                                className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                ขอรหัส OTP ใหม่
                            </button>
                        )}
                    </div>

                    {/* ปุ่มกลับ */}
                    <button
                        onClick={handleBackToPhone}
                        disabled={isLoading}
                        className="w-full text-gray-600 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        ← เปลี่ยนเบอร์โทรศัพท์
                    </button>
                </>
            )}

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-start gap-2">
                    <svg className="w-5 h-5 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                </div>
            )}
        </div>
    );
};

export default PhoneAuthForm;
