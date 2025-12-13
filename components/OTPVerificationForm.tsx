/**
 * OTPVerificationForm - Component สำหรับยืนยัน OTP ในหน้า Public Sign
 * 
 * ฟีเจอร์:
 * 1. กรอกเบอร์โทรศัพท์ + ส่ง OTP
 * 2. กรอก OTP 6 หลัก
 * 3. Countdown timer สำหรับส่ง OTP ใหม่
 * 4. รองรับ reCAPTCHA
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Phone, Shield, RefreshCw, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { RecaptchaVerifier, ConfirmationResult } from 'firebase/auth';
import { 
    createSignRecaptchaVerifier, 
    sendSigningOTP, 
    verifySigningOTP,
    formatPhoneToE164 
} from '../services/signatureService';

// Props สำหรับ OTPVerificationForm
interface OTPVerificationFormProps {
    onVerified: (phone: string) => void;
    onError?: (error: string) => void;
    disabled?: boolean;
    className?: string;
}

// Step ของ OTP flow
type OTPStep = 'phone' | 'otp' | 'verified';

// Countdown duration (seconds)
const RESEND_COOLDOWN = 60;

const OTPVerificationForm: React.FC<OTPVerificationFormProps> = ({
    onVerified,
    onError,
    disabled = false,
    className = '',
}) => {
    // State
    const [step, setStep] = useState<OTPStep>('phone');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [countdown, setCountdown] = useState(0);
    
    // Refs
    const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
    const confirmationResultRef = useRef<ConfirmationResult | null>(null);
    const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);
    const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (countdownIntervalRef.current) {
                clearInterval(countdownIntervalRef.current);
            }
            if (recaptchaVerifierRef.current) {
                try {
                    recaptchaVerifierRef.current.clear();
                } catch (e) {
                    // Ignore cleanup errors
                }
            }
        };
    }, []);

    // Countdown timer
    useEffect(() => {
        if (countdown > 0) {
            countdownIntervalRef.current = setInterval(() => {
                setCountdown((prev) => {
                    if (prev <= 1) {
                        if (countdownIntervalRef.current) {
                            clearInterval(countdownIntervalRef.current);
                        }
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }

        return () => {
            if (countdownIntervalRef.current) {
                clearInterval(countdownIntervalRef.current);
            }
        };
    }, [countdown]);

    // Initialize reCAPTCHA
    const initRecaptcha = useCallback(() => {
        if (recaptchaVerifierRef.current) {
            try {
                recaptchaVerifierRef.current.clear();
            } catch (e) {
                // Ignore
            }
        }
        recaptchaVerifierRef.current = createSignRecaptchaVerifier('sign-recaptcha-container');
    }, []);

    // ส่ง OTP
    const handleSendOTP = async () => {
        // Validate phone number
        const cleanedPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');
        if (cleanedPhone.length < 9) {
            const errorMsg = 'กรุณากรอกเบอร์โทรศัพท์ที่ถูกต้อง';
            setError(errorMsg);
            onError?.(errorMsg);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Initialize reCAPTCHA ถ้ายังไม่มี
            if (!recaptchaVerifierRef.current) {
                initRecaptcha();
            }

            // Format เบอร์โทรเป็น E.164
            const formattedPhone = formatPhoneToE164(cleanedPhone);
            
            console.log('📱 [OTPVerificationForm] กำลังส่ง OTP ไปยัง:', formattedPhone);
            
            // ส่ง OTP
            const confirmationResult = await sendSigningOTP(
                formattedPhone,
                recaptchaVerifierRef.current!
            );
            
            confirmationResultRef.current = confirmationResult;
            
            // เปลี่ยนไปหน้ากรอก OTP
            setStep('otp');
            setCountdown(RESEND_COOLDOWN);
            
            // Focus OTP input แรก
            setTimeout(() => {
                otpInputRefs.current[0]?.focus();
            }, 100);
            
        } catch (err: any) {
            console.error('❌ [OTPVerificationForm] Error sending OTP:', err);
            const errorMsg = err.message || 'ไม่สามารถส่ง OTP ได้';
            setError(errorMsg);
            onError?.(errorMsg);
            
            // Reset reCAPTCHA
            initRecaptcha();
        } finally {
            setIsLoading(false);
        }
    };

    // ยืนยัน OTP
    const handleVerifyOTP = async () => {
        const otpCode = otp.join('');
        
        if (otpCode.length !== 6) {
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
        setError(null);

        try {
            console.log('🔐 [OTPVerificationForm] กำลังยืนยัน OTP...');
            
            await verifySigningOTP(confirmationResultRef.current, otpCode);
            
            console.log('✅ [OTPVerificationForm] ยืนยัน OTP สำเร็จ');
            
            // เปลี่ยนสถานะเป็น verified
            setStep('verified');
            
            // Callback
            onVerified(formatPhoneToE164(phoneNumber));
            
        } catch (err: any) {
            console.error('❌ [OTPVerificationForm] Error verifying OTP:', err);
            const errorMsg = err.message || 'ไม่สามารถยืนยัน OTP ได้';
            setError(errorMsg);
            onError?.(errorMsg);
        } finally {
            setIsLoading(false);
        }
    };

    // Handle OTP input change
    const handleOtpChange = (index: number, value: string) => {
        // รับเฉพาะตัวเลข
        const digit = value.replace(/\D/g, '').slice(0, 1);
        
        const newOtp = [...otp];
        newOtp[index] = digit;
        setOtp(newOtp);

        // Auto-focus next input
        if (digit && index < 5) {
            otpInputRefs.current[index + 1]?.focus();
        }

        // Auto-submit เมื่อกรอกครบ 6 หลัก
        if (digit && index === 5 && newOtp.every(d => d !== '')) {
            setTimeout(() => handleVerifyOTP(), 100);
        }
    };

    // Handle OTP keydown (backspace)
    const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            otpInputRefs.current[index - 1]?.focus();
        }
    };

    // Handle paste OTP
    const handleOtpPaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        
        if (pastedData.length > 0) {
            const newOtp = [...otp];
            for (let i = 0; i < pastedData.length && i < 6; i++) {
                newOtp[i] = pastedData[i];
            }
            setOtp(newOtp);
            
            // Focus last filled input or next empty
            const lastIndex = Math.min(pastedData.length - 1, 5);
            otpInputRefs.current[lastIndex]?.focus();
            
            // Auto-submit ถ้ากรอกครบ
            if (newOtp.every(d => d !== '')) {
                setTimeout(() => handleVerifyOTP(), 100);
            }
        }
    };

    // ส่ง OTP ใหม่
    const handleResendOTP = () => {
        setOtp(['', '', '', '', '', '']);
        setError(null);
        handleSendOTP();
    };

    // กลับไปแก้ไขเบอร์โทร
    const handleBackToPhone = () => {
        setStep('phone');
        setOtp(['', '', '', '', '', '']);
        setError(null);
        confirmationResultRef.current = null;
    };

    // Format countdown เป็น mm:ss
    const formatCountdown = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className={`bg-white rounded-xl border border-slate-200 overflow-hidden ${className}`}>
            {/* Header */}
            <div className="px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    <span className="font-medium">ยืนยันตัวตนด้วย OTP</span>
                </div>
            </div>

            <div className="p-4">
                {/* Step: กรอกเบอร์โทร */}
                {step === 'phone' && (
                    <div className="space-y-4">
                        <p className="text-sm text-slate-600">
                            กรุณากรอกเบอร์โทรศัพท์ของคุณเพื่อรับรหัส OTP
                        </p>

                        {/* Phone Input */}
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Phone className="w-5 h-5 text-slate-400" />
                            </div>
                            <input
                                type="tel"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                disabled={disabled || isLoading}
                                placeholder="0812345678"
                                className={`w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-lg ${
                                    disabled || isLoading ? 'opacity-50 cursor-not-allowed bg-slate-100' : ''
                                }`}
                            />
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-red-700">{error}</p>
                            </div>
                        )}

                        {/* Send OTP Button */}
                        <button
                            type="button"
                            onClick={handleSendOTP}
                            disabled={disabled || isLoading || !phoneNumber.trim()}
                            className={`w-full flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors ${
                                disabled || isLoading || !phoneNumber.trim() 
                                    ? 'opacity-50 cursor-not-allowed' 
                                    : ''
                            }`}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>กำลังส่ง OTP...</span>
                                </>
                            ) : (
                                <span>ขอรหัส OTP</span>
                            )}
                        </button>

                        {/* reCAPTCHA container */}
                        <div id="sign-recaptcha-container"></div>
                    </div>
                )}

                {/* Step: กรอก OTP */}
                {step === 'otp' && (
                    <div className="space-y-4">
                        <p className="text-sm text-slate-600">
                            กรอกรหัส OTP 6 หลักที่ส่งไปยัง{' '}
                            <span className="font-semibold text-slate-800">{phoneNumber}</span>
                        </p>

                        {/* OTP Inputs */}
                        <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
                            {otp.map((digit, index) => (
                                <input
                                    key={index}
                                    ref={(el) => (otpInputRefs.current[index] = el)}
                                    type="text"
                                    inputMode="numeric"
                                    value={digit}
                                    onChange={(e) => handleOtpChange(index, e.target.value)}
                                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                                    disabled={disabled || isLoading}
                                    maxLength={1}
                                    className={`w-12 h-14 text-center text-2xl font-bold border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                                        disabled || isLoading ? 'opacity-50 cursor-not-allowed bg-slate-100' : ''
                                    }`}
                                />
                            ))}
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-red-700">{error}</p>
                            </div>
                        )}

                        {/* Verify Button */}
                        <button
                            type="button"
                            onClick={handleVerifyOTP}
                            disabled={disabled || isLoading || otp.join('').length !== 6}
                            className={`w-full flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors ${
                                disabled || isLoading || otp.join('').length !== 6
                                    ? 'opacity-50 cursor-not-allowed' 
                                    : ''
                            }`}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>กำลังยืนยัน...</span>
                                </>
                            ) : (
                                <span>ยืนยัน OTP</span>
                            )}
                        </button>

                        {/* Resend & Back */}
                        <div className="flex items-center justify-between text-sm">
                            <button
                                type="button"
                                onClick={handleBackToPhone}
                                disabled={disabled || isLoading}
                                className="text-slate-600 hover:text-slate-800"
                            >
                                ← แก้ไขเบอร์โทร
                            </button>
                            
                            {countdown > 0 ? (
                                <span className="text-slate-500">
                                    ส่งใหม่ได้ใน {formatCountdown(countdown)}
                                </span>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleResendOTP}
                                    disabled={disabled || isLoading}
                                    className="flex items-center gap-1 text-indigo-600 hover:text-indigo-700"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    <span>ส่ง OTP ใหม่</span>
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Step: ยืนยันสำเร็จ */}
                {step === 'verified' && (
                    <div className="py-6 text-center">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="w-8 h-8 text-green-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-green-700 mb-1">
                            ยืนยันตัวตนสำเร็จ
                        </h3>
                        <p className="text-sm text-slate-600">
                            เบอร์โทร {phoneNumber} ได้รับการยืนยันแล้ว
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OTPVerificationForm;

