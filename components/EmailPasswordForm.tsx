/**
 * Email/Password Authentication Form
 * Form สำหรับ Login และ Sign Up ด้วย Email และ Password
 * รองรับ Account Linking
 */

import React, { useState } from 'react';
import { signInWithEmailPassword, signUpWithEmailPassword, checkEmailProviders, sendPasswordReset } from '../services/auth';
import { AccountLinkingModal } from './AccountLinkingModal';
import { Link2, Key } from 'lucide-react';

interface EmailPasswordFormProps {
    onSuccess?: () => void;
}

export const EmailPasswordForm: React.FC<EmailPasswordFormProps> = ({ onSuccess }) => {
    const [mode, setMode] = useState<'login' | 'signup'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    
    // Account Linking Modal
    const [showLinkingModal, setShowLinkingModal] = useState(false);
    const [existingProviders, setExistingProviders] = useState<string[]>([]);
    
    // Forgot Password
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [resetEmail, setResetEmail] = useState('');

    /**
     * จัดการ Login
     */
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        // Validation
        if (!email || !password) {
            setError('กรุณากรอกอีเมลและรหัสผ่าน');
            return;
        }

        try {
            setLoading(true);
            await signInWithEmailPassword(email, password);
            setSuccess('✅ Login สำเร็จ!');
            
            // เรียก callback ถ้ามี
            if (onSuccess) {
                setTimeout(() => onSuccess(), 500);
            }
        } catch (err: any) {
            setError(err.message || 'เกิดข้อผิดพลาดในการ Login');
        } finally {
            setLoading(false);
        }
    };

    /**
     * จัดการ Sign Up
     */
    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        // Validation
        if (!email || !password || !confirmPassword) {
            setError('กรุณากรอกข้อมูลให้ครบถ้วน');
            return;
        }

        if (password !== confirmPassword) {
            setError('รหัสผ่านไม่ตรงกัน');
            return;
        }

        if (password.length < 6) {
            setError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
            return;
        }

        try {
            setLoading(true);
            
            // ตรวจสอบว่าอีเมลนี้มี provider อื่นหรือไม่
            const providers = await checkEmailProviders(email);
            
            if (providers.length > 0) {
                // มี account แล้ว → แสดง Account Linking Modal
                console.log('📧 อีเมลนี้มี providers:', providers);
                setExistingProviders(providers);
                setShowLinkingModal(true);
                setLoading(false);
                return;
            }
            
            // ไม่มี account → สมัครสมาชิกปกติ
            await signUpWithEmailPassword(email, password);
            setSuccess('✅ สมัครสมาชิกสำเร็จ! กำลัง Login...');
            
            // เรียก callback ถ้ามี
            if (onSuccess) {
                setTimeout(() => onSuccess(), 500);
            }
        } catch (err: any) {
            // ตรวจสอบ error code
            if (err.message && err.message.includes('อีเมลนี้ถูกใช้งานแล้ว')) {
                // ลอง check providers อีกครั้ง
                const providers = await checkEmailProviders(email);
                if (providers.length > 0) {
                    setExistingProviders(providers);
                    setShowLinkingModal(true);
                } else {
                    setError(err.message);
                }
            } else {
                setError(err.message || 'เกิดข้อผิดพลาดในการสมัครสมาชิก');
            }
        } finally {
            setLoading(false);
        }
    };

    /**
     * สลับโหมด Login/Sign Up
     */
    const toggleMode = () => {
        setMode(mode === 'login' ? 'signup' : 'login');
        setError(null);
        setSuccess(null);
        setPassword('');
        setConfirmPassword('');
    };

    /**
     * ส่งอีเมลรีเซ็ตรหัสผ่าน
     */
    const handleForgotPassword = async () => {
        if (!resetEmail) {
            alert('❌ กรุณากรอกอีเมล');
            return;
        }

        try {
            await sendPasswordReset(resetEmail);
            alert(`✅ ส่งอีเมลรีเซ็ตรหัสผ่านไปที่ ${resetEmail} แล้ว\n\nกรุณาตรวจสอบอีเมลของคุณ`);
            setShowForgotPassword(false);
            setResetEmail('');
        } catch (err: any) {
            alert(`❌ ${err.message || 'ไม่สามารถส่งอีเมลได้'}`);
        }
    };

    return (
        <div className="w-full max-w-md mx-auto">
            {/* Tab สลับโหมด */}
            <div className="flex mb-6 border-b border-gray-200 dark:border-slate-600">
                <button
                    type="button"
                    onClick={() => setMode('login')}
                    className={`flex-1 py-3 text-center font-medium transition-colors ${
                        mode === 'login'
                            ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                            : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'
                    }`}
                >
                    เข้าสู่ระบบ
                </button>
                <button
                    type="button"
                    onClick={() => setMode('signup')}
                    className={`flex-1 py-3 text-center font-medium transition-colors ${
                        mode === 'signup'
                            ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                            : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'
                    }`}
                >
                    สมัครสมาชิก
                </button>
            </div>

            {/* Form */}
            <form onSubmit={mode === 'login' ? handleLogin : handleSignUp} className="space-y-4">
                {/* Email Input */}
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">
                        อีเมล
                    </label>
                    <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="example@email.com"
                        className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                        disabled={loading}
                        required
                    />
                </div>

                {/* Password Input */}
                <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">
                        รหัสผ่าน
                    </label>
                    <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="อย่างน้อย 6 ตัวอักษร"
                        className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                        disabled={loading}
                        required
                        minLength={6}
                    />
                </div>

                {/* Confirm Password Input (สำหรับ Sign Up) */}
                {mode === 'signup' && (
                    <div>
                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">
                            ยืนยันรหัสผ่าน
                        </label>
                        <input
                            type="password"
                            id="confirmPassword"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="กรอกรหัสผ่านอีกครั้ง"
                            className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                            disabled={loading}
                            required
                            minLength={6}
                        />
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
                        <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
                    </div>
                )}

                {/* Success Message */}
                {success && (
                    <div className="p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg">
                        <p className="text-sm text-green-600 dark:text-green-300">{success}</p>
                    </div>
                )}

                {/* ลืมรหัสผ่าน? (แสดงเฉพาะโหมด Login) */}
                {mode === 'login' && (
                    <div className="text-center">
                        <button
                            type="button"
                            onClick={() => {
                                setResetEmail(email);
                                setShowForgotPassword(true);
                            }}
                            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline"
                        >
                            <Link2 className="w-4 h-4 inline mr-1" />ลืมรหัสผ่าน?
                        </button>
                    </div>
                )}

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={loading}
                    className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-colors ${
                        loading
                            ? 'bg-gray-400 dark:bg-slate-600 cursor-not-allowed'
                            : 'bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-800 active:bg-blue-800'
                    }`}
                >
                    {loading ? (
                        <span className="flex items-center justify-center">
                            <svg
                                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                            >
                                <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                ></circle>
                                <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                ></path>
                            </svg>
                            กำลังดำเนินการ...
                        </span>
                    ) : mode === 'login' ? (
                        'เข้าสู่ระบบ'
                    ) : (
                        'สมัครสมาชิก'
                    )}
                </button>

                {/* Toggle Mode Link */}
                <div className="text-center text-sm text-gray-600 dark:text-slate-400">
                    {mode === 'login' ? (
                        <p>
                            ยังไม่มีบัญชี?{' '}
                            <button
                                type="button"
                                onClick={toggleMode}
                                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                            >
                                สมัครสมาชิก
                            </button>
                        </p>
                    ) : (
                        <p>
                            มีบัญชีแล้ว?{' '}
                            <button
                                type="button"
                                onClick={toggleMode}
                                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                            >
                                เข้าสู่ระบบ
                            </button>
                        </p>
                    )}
                </div>
            </form>

            {/* Account Linking Modal */}
            <AccountLinkingModal
                isOpen={showLinkingModal}
                onClose={() => {
                    setShowLinkingModal(false);
                    setExistingProviders([]);
                }}
                email={email}
                existingProviders={existingProviders}
                currentProvider="email"
            />

            {/* Forgot Password Modal */}
            {showForgotPassword && (
                <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl dark:shadow-slate-900/50 max-w-md w-full p-6">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-gray-800 dark:text-slate-100">
                                <Key className="w-5 h-5 inline mr-1" />ลืมรหัสผ่าน
                            </h3>
                            <button
                                onClick={() => {
                                    setShowForgotPassword(false);
                                    setResetEmail('');
                                }}
                                className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="space-y-4">
                            {/* ข้อความแจ้งเตือน */}
                            <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                                <p className="text-sm text-blue-800 dark:text-blue-300">
                                    กรอกอีเมลของคุณ เราจะส่งลิงก์รีเซ็ตรหัสผ่านให้คุณ
                                </p>
                            </div>

                            {/* Email Input */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">
                                    อีเมล
                                </label>
                                <input
                                    type="email"
                                    value={resetEmail}
                                    onChange={(e) => setResetEmail(e.target.value)}
                                    placeholder="example@email.com"
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                                    required
                                />
                            </div>

                            {/* Submit Button */}
                            <button
                                onClick={handleForgotPassword}
                                className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 transition-all"
                            >
                                ส่งอีเมลรีเซ็ตรหัสผ่าน
                            </button>

                            {/* ข้อมูลเพิ่มเติม */}
                            <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-3">
                                <p className="text-xs text-gray-600 dark:text-slate-400">
                                    <strong>หมายเหตุ</strong>
                                    <br />
                                    หลังจากได้รับอีเมล ให้คลิกลิงก์เพื่อตั้งรหัสผ่านใหม่
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

