/**
 * Account Linking Modal
 * Modal สำหรับแนะนำและจัดการ Account Linking
 * รองรับ Google, Email/Password และ Phone Authentication
 */

import React, { useState, useEffect, useRef } from 'react';
import { ConfirmationResult, RecaptchaVerifier } from 'firebase/auth';
import { 
    linkWithGoogle, 
    linkWithEmailPassword, 
    signInWithGoogle, 
    checkEmailProviders,
    linkPhoneSendOTP,
    linkPhoneVerifyOTP,
    createRecaptchaVerifier,
    getLinkedProviders,
    checkLinkedProviders
} from '../services/auth';
import { Link2 } from 'lucide-react';

// ประเภทของ Provider
type ProviderType = 'google.com' | 'password' | 'phone';

interface AccountLinkingModalProps {
    isOpen: boolean;
    onClose: () => void;
    email?: string;
    phoneNumber?: string;
    existingProviders?: string[]; // providers ที่มีอยู่แล้ว
    currentProvider?: 'email' | 'google' | 'phone'; // provider ที่กำลังพยายาม login
    mode?: 'conflict' | 'suggest'; // conflict = มีปัญหาต้อง link, suggest = แนะนำให้ link
}

export const AccountLinkingModal: React.FC<AccountLinkingModalProps> = ({
    isOpen,
    onClose,
    email,
    phoneNumber,
    existingProviders = [],
    currentProvider = 'email',
    mode = 'conflict',
}) => {
    // State สำหรับ loading และ error
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    
    // State สำหรับ Email/Password linking
    const [password, setPassword] = useState('');
    const [showPasswordInput, setShowPasswordInput] = useState(false);
    
    // State สำหรับ Phone linking
    const [showPhoneInput, setShowPhoneInput] = useState(false);
    const [phoneToLink, setPhoneToLink] = useState('');
    const [otp, setOtp] = useState('');
    const [showOtpInput, setShowOtpInput] = useState(false);
    const [countdown, setCountdown] = useState(0);
    
    // Refs สำหรับ Phone Auth
    const confirmationResultRef = useRef<ConfirmationResult | null>(null);
    const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

    // ตรวจสอบ linked providers ปัจจุบัน
    const [linkedStatus, setLinkedStatus] = useState<{
        hasGoogle: boolean;
        hasEmail: boolean;
        hasPhone: boolean;
    }>({ hasGoogle: false, hasEmail: false, hasPhone: false });

    useEffect(() => {
        if (isOpen) {
            const status = checkLinkedProviders();
            setLinkedStatus(status);
        }
    }, [isOpen]);

    // Countdown timer สำหรับ OTP
    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    // Cleanup reCAPTCHA เมื่อ modal ปิด
    useEffect(() => {
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

    if (!isOpen) return null;

    /**
     * แปลง provider ID เป็นชื่อที่อ่านง่าย
     */
    const getProviderName = (providerId: string): string => {
        switch (providerId) {
            case 'google.com':
                return 'Google';
            case 'password':
                return 'Email/Password';
            case 'phone':
                return 'เบอร์โทรศัพท์';
            default:
                return providerId;
        }
    };

    /**
     * แปลง provider ID เป็น icon
     */
    const getProviderIcon = (providerId: string): string => {
        switch (providerId) {
            case 'google.com':
                return '🔵';
            case 'password':
                return '📧';
            case 'phone':
                return '📱';
            default:
                return '🔐';
        }
    };

    /**
     * Reset states
     */
    const resetStates = () => {
        setError(null);
        setSuccess(null);
        setPassword('');
        setShowPasswordInput(false);
        setShowPhoneInput(false);
        setPhoneToLink('');
        setOtp('');
        setShowOtpInput(false);
        confirmationResultRef.current = null;
    };

    /**
     * Login ด้วย Provider ที่มีอยู่แล้ว
     */
    const handleLoginWithExisting = async () => {
        setLoading(true);
        setError(null);

        try {
            if (existingProviders.includes('google.com')) {
                await signInWithGoogle();
                onClose();
            } else if (existingProviders.includes('password')) {
                setShowPasswordInput(true);
                setLoading(false);
            }
        } catch (err: any) {
            setError(err.message || 'เกิดข้อผิดพลาด');
            setLoading(false);
        }
    };

    /**
     * Link กับ Google
     */
    const handleLinkGoogle = async () => {
        setLoading(true);
        setError(null);

        try {
            await linkWithGoogle();
            setSuccess('✅ Link กับ Google สำเร็จ!');
            
            // อัปเดต status
            const status = checkLinkedProviders();
            setLinkedStatus(status);
            
            setTimeout(() => {
                onClose();
            }, 1500);
        } catch (err: any) {
            setError(err.message || 'ไม่สามารถ Link กับ Google ได้');
        } finally {
            setLoading(false);
        }
    };

    /**
     * Link กับ Email/Password
     */
    const handleLinkEmailPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!password) {
            setError('กรุณากรอกรหัสผ่าน');
            return;
        }

        if (!email) {
            setError('ไม่พบอีเมล');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            await linkWithEmailPassword(email, password);
            setSuccess('✅ Link กับ Email/Password สำเร็จ!');
            
            // อัปเดต status
            const status = checkLinkedProviders();
            setLinkedStatus(status);
            
            setTimeout(() => {
                onClose();
            }, 1500);
        } catch (err: any) {
            setError(err.message || 'ไม่สามารถ Link ได้');
        } finally {
            setLoading(false);
        }
    };

    /**
     * จัดรูปแบบเบอร์โทรศัพท์
     */
    const formatPhoneNumber = (value: string): string => {
        let cleaned = value.replace(/[^\d+]/g, '');
        
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
     * ส่ง OTP สำหรับ Link Phone
     */
    const handleSendPhoneOTP = async () => {
        const formattedPhone = formatPhoneNumber(phoneToLink);
        
        // ตรวจสอบรูปแบบ
        if (!/^\+66\d{9}$/.test(formattedPhone)) {
            setError('กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง (เช่น 0812345678)');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // สร้าง reCAPTCHA verifier
            if (!recaptchaVerifierRef.current) {
                recaptchaVerifierRef.current = createRecaptchaVerifier('link-recaptcha-container');
            }

            // ส่ง OTP
            const confirmationResult = await linkPhoneSendOTP(
                formattedPhone,
                recaptchaVerifierRef.current
            );

            confirmationResultRef.current = confirmationResult;
            setShowOtpInput(true);
            setCountdown(60);
            setSuccess('✅ ส่ง OTP สำเร็จ!');
        } catch (err: any) {
            setError(err.message || 'ไม่สามารถส่ง OTP ได้');
            
            // Reset reCAPTCHA
            if (recaptchaVerifierRef.current) {
                try {
                    recaptchaVerifierRef.current.clear();
                    recaptchaVerifierRef.current = createRecaptchaVerifier('link-recaptcha-container');
                } catch (e) {
                    console.error('Error resetting reCAPTCHA:', e);
                }
            }
        } finally {
            setLoading(false);
        }
    };

    /**
     * ยืนยัน OTP และ Link Phone
     */
    const handleVerifyPhoneOTP = async () => {
        if (otp.length !== 6) {
            setError('กรุณากรอกรหัส OTP 6 หลัก');
            return;
        }

        if (!confirmationResultRef.current) {
            setError('กรุณาขอรหัส OTP ใหม่');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            await linkPhoneVerifyOTP(confirmationResultRef.current, otp);
            setSuccess('✅ Link เบอร์โทรศัพท์สำเร็จ!');
            
            // อัปเดต status
            const status = checkLinkedProviders();
            setLinkedStatus(status);
            
            setTimeout(() => {
                onClose();
            }, 1500);
        } catch (err: any) {
            setError(err.message || 'ไม่สามารถยืนยัน OTP ได้');
        } finally {
            setLoading(false);
        }
    };

    /**
     * แสดงหน้าจอหลัก (เลือก provider ที่จะ link)
     */
    const renderMainContent = () => {
        if (mode === 'conflict') {
            return (
                <div className="space-y-4">
                    {/* ข้อความแจ้งเตือน */}
                    <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-slate-600 rounded-lg p-4">
                        <p className="text-sm text-yellow-800 dark:text-yellow-300">
                            <strong>⚠️ พบ Account ที่มีอยู่แล้ว</strong>
                        </p>
                        {email && (
                            <p className="text-sm text-yellow-800 dark:text-yellow-300 mt-1">
                                <strong>อีเมล:</strong> {email}
                            </p>
                        )}
                        {phoneNumber && (
                            <p className="text-sm text-yellow-800 dark:text-yellow-300 mt-1">
                                <strong>เบอร์โทร:</strong> {phoneNumber}
                            </p>
                        )}
                        <p className="text-sm text-yellow-800 dark:text-yellow-300 mt-2">
                            มีการ Login ด้วย:{' '}
                            <strong>{existingProviders.map(getProviderName).join(', ')}</strong>
                        </p>
                    </div>

                    {/* ตัวเลือก: Login ด้วย Provider ที่มีอยู่ */}
                    <div className="border-2 border-gray-200 dark:border-slate-600 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-800 dark:text-gray-100 mb-2">
                            ตัวเลือก 1: Login ด้วย {existingProviders.map(getProviderName).join(', ')}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                            ใช้วิธี Login ที่มีอยู่แล้ว
                        </p>
                        <button
                            onClick={handleLoginWithExisting}
                            disabled={loading}
                            className="w-full py-2 px-4 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors disabled:opacity-50"
                        >
                            {loading ? 'กำลังดำเนินการ...' : '✅ Login ด้วย ' + existingProviders.map(getProviderName).join(', ')}
                        </button>
                    </div>

                    {/* ตัวเลือก: Link accounts */}
                    <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
                        <h4 className="font-semibold text-gray-800 mb-2">
                            ตัวเลือก 2: Link Accounts
                        </h4>
                        <p className="text-sm text-gray-600 mb-3">
                            เชื่อมโยง accounts เข้าด้วยกัน เพื่อ Login ได้หลายวิธี
                        </p>
                        
                        {currentProvider === 'email' && existingProviders.includes('google.com') && (
                            <button
                                onClick={handleLinkGoogle}
                                disabled={loading}
                                className="w-full py-2 px-4 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
                            >
                                {loading ? 'กำลังดำเนินการ...' : <><Link2 className="w-4 h-4 inline mr-1" />Link กับ Google</>}
                            </button>
                        )}

                        {currentProvider === 'google' && existingProviders.includes('password') && (
                            <button
                                onClick={() => setShowPasswordInput(true)}
                                disabled={loading}
                                className="w-full py-2 px-4 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
                            >
                                {loading ? 'กำลังดำเนินการ...' : <><Link2 className="w-4 h-4 inline mr-1" />Link กับ Email/Password</>}
                            </button>
                        )}

                        {currentProvider === 'phone' && (existingProviders.includes('google.com') || existingProviders.includes('password')) && (
                            <div className="space-y-2">
                                {existingProviders.includes('google.com') && (
                                    <button
                                        onClick={handleLinkGoogle}
                                        disabled={loading}
                                        className="w-full py-2 px-4 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
                                    >
                                        {loading ? 'กำลังดำเนินการ...' : <><Link2 className="w-4 h-4 inline mr-1" />Link กับ Google</>}
                                    </button>
                                )}
                                {existingProviders.includes('password') && (
                                    <button
                                        onClick={() => setShowPasswordInput(true)}
                                        disabled={loading}
                                        className="w-full py-2 px-4 bg-purple-500 text-white rounded-lg font-medium hover:bg-purple-600 transition-colors disabled:opacity-50"
                                    >
                                        {loading ? 'กำลังดำเนินการ...' : <><Link2 className="w-4 h-4 inline mr-1" />Link กับ Email/Password</>}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        // mode === 'suggest' - แนะนำให้ link
        return (
            <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-slate-600 rounded-lg p-4">
                    <p className="text-sm text-blue-800 dark:text-blue-300">
                        <strong>💡 แนะนำ: Link Account เพิ่มเติม</strong>
                    </p>
                    <p className="text-sm text-blue-800 dark:text-blue-300 mt-2">
                        การ Link Account ช่วยให้คุณสามารถ Login ได้หลายวิธี และป้องกันปัญหาการเข้าถึงบัญชี
                    </p>
                </div>

                {/* แสดง providers ที่ link แล้ว */}
                <div className="space-y-2">
                    <h4 className="font-medium text-gray-700 dark:text-gray-300">Providers ที่ Link แล้ว:</h4>
                    <div className="flex flex-wrap gap-2">
                        {linkedStatus.hasGoogle && (
                            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                                ✅ Google
                            </span>
                        )}
                        {linkedStatus.hasEmail && (
                            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                                ✅ Email/Password
                            </span>
                        )}
                        {linkedStatus.hasPhone && (
                            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                                ✅ เบอร์โทร
                            </span>
                        )}
                    </div>
                </div>

                {/* ปุ่ม Link providers ที่ยังไม่ได้ link */}
                <div className="space-y-2">
                    <h4 className="font-medium text-gray-700">เพิ่ม Provider:</h4>
                    
                    {!linkedStatus.hasGoogle && (
                        <button
                            onClick={handleLinkGoogle}
                            disabled={loading}
                            className="w-full py-2 px-4 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            <span>🔵</span>
                            {loading ? 'กำลังดำเนินการ...' : 'Link กับ Google'}
                        </button>
                    )}
                    
                    {!linkedStatus.hasEmail && email && (
                        <button
                            onClick={() => setShowPasswordInput(true)}
                            disabled={loading}
                            className="w-full py-2 px-4 bg-purple-500 text-white rounded-lg font-medium hover:bg-purple-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            <span>📧</span>
                            {loading ? 'กำลังดำเนินการ...' : 'Link กับ Email/Password'}
                        </button>
                    )}
                    
                    {!linkedStatus.hasPhone && (
                        <button
                            onClick={() => setShowPhoneInput(true)}
                            disabled={loading}
                            className="w-full py-2 px-4 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            <span>📱</span>
                            {loading ? 'กำลังดำเนินการ...' : 'Link กับเบอร์โทรศัพท์'}
                        </button>
                    )}
                </div>
            </div>
        );
    };

    /**
     * แสดงฟอร์มกรอก Password
     */
    const renderPasswordForm = () => (
        <form onSubmit={handleLinkEmailPassword} className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                    <strong>🔐 ตั้งรหัสผ่านสำหรับ Email/Password Login</strong>
                </p>
                <p className="text-sm text-blue-800 mt-1">
                    อีเมล: {email}
                </p>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    รหัสผ่าน
                </label>
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="อย่างน้อย 6 ตัวอักษร"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={loading}
                    required
                    minLength={6}
                />
            </div>

            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={() => {
                        setShowPasswordInput(false);
                        setPassword('');
                        setError(null);
                    }}
                    disabled={loading}
                    className="flex-1 py-2 px-4 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors disabled:opacity-50"
                >
                    ← ย้อนกลับ
                </button>
                <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2 px-4 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
                >
                    {loading ? 'กำลัง Link...' : <><Link2 className="w-4 h-4 inline mr-1" />Link</>}
                </button>
            </div>
        </form>
    );

    /**
     * แสดงฟอร์มกรอกเบอร์โทรและ OTP
     */
    const renderPhoneForm = () => (
        <div className="space-y-4">
            <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-slate-600 rounded-lg p-4">
                <p className="text-sm text-green-800 dark:text-green-300">
                    <strong>📱 Link กับเบอร์โทรศัพท์</strong>
                </p>
                <p className="text-sm text-green-800 dark:text-green-300 mt-1">
                    กรอกเบอร์โทรศัพท์เพื่อรับรหัส OTP
                </p>
            </div>

            {!showOtpInput ? (
                // ขั้นตอนกรอกเบอร์โทร
                <>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            เบอร์โทรศัพท์
                        </label>
                        <input
                            type="tel"
                            value={phoneToLink}
                            onChange={(e) => setPhoneToLink(e.target.value)}
                            placeholder="0812345678"
                            className="w-full px-4 py-2 border border-gray-300 dark:border-slate-500 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100"
                            disabled={loading}
                        />
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            รูปแบบ: 0XXXXXXXXX (เบอร์ไทย)
                        </p>
                    </div>

                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                setShowPhoneInput(false);
                                setPhoneToLink('');
                                setError(null);
                            }}
                            disabled={loading}
                            className="flex-1 py-2 px-4 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
                        >
                            ← ย้อนกลับ
                        </button>
                        <button
                            type="button"
                            onClick={handleSendPhoneOTP}
                            disabled={loading || !phoneToLink}
                            className="flex-1 py-2 px-4 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors disabled:opacity-50"
                        >
                            {loading ? 'กำลังส่ง...' : '📤 ส่ง OTP'}
                        </button>
                    </div>
                </>
            ) : (
                // ขั้นตอนกรอก OTP
                <>
                    <div className="text-center">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            ส่ง OTP ไปยัง
                        </p>
                        <p className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                            {formatPhoneNumber(phoneToLink)}
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            รหัส OTP
                        </label>
                        <input
                            type="text"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            placeholder="123456"
                            maxLength={6}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-slate-500 rounded-lg text-center text-2xl tracking-widest focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100"
                            disabled={loading}
                        />
                    </div>

                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                setShowOtpInput(false);
                                setOtp('');
                                setError(null);
                            }}
                            disabled={loading}
                            className="flex-1 py-2 px-4 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
                        >
                            ← เปลี่ยนเบอร์
                        </button>
                        <button
                            type="button"
                            onClick={handleVerifyPhoneOTP}
                            disabled={loading || otp.length !== 6}
                            className="flex-1 py-2 px-4 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors disabled:opacity-50"
                        >
                            {loading ? 'กำลังยืนยัน...' : '✅ ยืนยัน'}
                        </button>
                    </div>

                    {/* ปุ่มขอ OTP ใหม่ */}
                    <div className="text-center">
                        {countdown > 0 ? (
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                ขอรหัสใหม่ได้ใน {countdown} วินาที
                            </p>
                        ) : (
                            <button
                                onClick={handleSendPhoneOTP}
                                disabled={loading}
                                className="text-sm text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-medium disabled:opacity-50"
                            >
                                ขอรหัส OTP ใหม่
                            </button>
                        )}
                    </div>
                </>
            )}

            {/* reCAPTCHA container */}
            <div id="link-recaptcha-container"></div>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                        <Link2 className="w-5 h-5 inline mr-1" />Account Linking
                    </h3>
                    <button
                        onClick={() => {
                            resetStates();
                            onClose();
                        }}
                        className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="space-y-4">
                    {/* แสดง Success Message */}
                    {success && (
                        <div className="p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-slate-600 rounded-lg">
                            <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
                        </div>
                    )}

                    {/* แสดง Error Message */}
                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-slate-600 rounded-lg">
                            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                        </div>
                    )}

                    {/* แสดง Content ตามสถานะ */}
                    {showPasswordInput ? renderPasswordForm() : 
                     showPhoneInput ? renderPhoneForm() : 
                     renderMainContent()}

                    {/* ข้อมูลเพิ่มเติม */}
                    {!showPasswordInput && !showPhoneInput && (
                        <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-3">
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                                💡 <strong>Account Linking คืออะไร?</strong>
                                <br />
                                การเชื่อมโยง accounts ทำให้คุณสามารถ Login ได้หลายวิธี (เช่น ทั้ง Google, Email/Password และเบอร์โทร) ด้วยบัญชีเดียวกัน
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AccountLinkingModal;
