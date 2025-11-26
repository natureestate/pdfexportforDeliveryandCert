/**
 * Login Page Component
 * หน้า Login ด้วย Google OAuth, Phone, Email/Password และ Email Link
 */

import React, { useState, useEffect } from 'react';
import { signInWithGoogle } from '../services/auth';
import { executeAndVerifyRecaptcha, isRecaptchaScoreValid, getRecaptchaErrorMessage } from '../services/recaptcha';
import PhoneAuthForm from './PhoneAuthForm';
import { EmailPasswordForm } from './EmailPasswordForm';
import { EmailLinkForm } from './EmailLinkForm';
import PolicyModal from './PolicyModal';

type LoginMethod = 'google' | 'phone' | 'email' | 'emailLink';

const LoginPage: React.FC = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loginMethod, setLoginMethod] = useState<LoginMethod>('google');
    const [showPolicyModal, setShowPolicyModal] = useState(false);
    const [policyType, setPolicyType] = useState<'terms' | 'privacy'>('terms');
    const [showRecaptchaBadge, setShowRecaptchaBadge] = useState(false);

    const handleOpenPolicy = (type: 'terms' | 'privacy') => {
        setPolicyType(type);
        setShowPolicyModal(true);
    };

    const handleClosePolicy = () => {
        setShowPolicyModal(false);
    };

    /**
     * แสดง reCAPTCHA badge เมื่อคลิกที่ข้อความ
     * และซ่อนอัตโนมัติหลังจาก 3 วินาที
     */
    const handleShowRecaptchaBadge = () => {
        console.log('🔍 คลิกที่ข้อความ reCAPTCHA');
        
        // สร้างหรือหา badge element
        let badge = document.querySelector('.grecaptcha-badge') as HTMLElement;
        
        if (!badge) {
            console.log('📦 สร้าง badge element ใหม่');
            // สร้าง badge element ใหม่
            badge = document.createElement('div');
            badge.className = 'grecaptcha-badge show-badge';
            badge.setAttribute('data-style', 'bottomright');
            badge.style.cssText = `
                visibility: visible !important;
                opacity: 1 !important;
                position: fixed !important;
                bottom: 14px !important;
                right: 14px !important;
                width: 256px !important;
                height: 60px !important;
                z-index: 9999 !important;
                background: #fff !important;
                border: 1px solid #c1c1c1 !important;
                border-radius: 3px !important;
                box-shadow: 0 0 4px 1px rgba(0,0,0,.08) !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                font-size: 11px !important;
                color: #555 !important;
                font-family: Roboto, helvetica, arial, sans-serif !important;
            `;
            
            // สร้างเนื้อหาภายใน badge
            const badgeContent = document.createElement('div');
            badgeContent.style.cssText = 'display: flex; align-items: center; gap: 8px; padding: 8px; flex-wrap: wrap;';
            
            // เพิ่มข้อความ
            const text = document.createElement('span');
            text.textContent = 'This site is protected by reCAPTCHA and the Google ';
            text.style.cssText = 'color: #555; font-size: 11px;';
            
            // เพิ่มลิงก์
            const link = document.createElement('a');
            link.href = 'https://policies.google.com/privacy';
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.textContent = 'Privacy Policy';
            link.style.cssText = 'color: #1a73e8; text-decoration: none; font-size: 11px;';
            
            const and = document.createTextNode(' and ');
            const termsLink = document.createElement('a');
            termsLink.href = 'https://policies.google.com/terms';
            termsLink.target = '_blank';
            termsLink.rel = 'noopener noreferrer';
            termsLink.textContent = 'Terms of Service';
            termsLink.style.cssText = 'color: #1a73e8; text-decoration: none; font-size: 11px;';
            
            badgeContent.appendChild(text);
            badgeContent.appendChild(link);
            badgeContent.appendChild(and);
            badgeContent.appendChild(termsLink);
            badge.appendChild(badgeContent);
            document.body.appendChild(badge);
            console.log('✅ Badge ถูกสร้างและเพิ่มเข้า DOM แล้ว');
        } else {
            console.log('✅ พบ badge ที่มีอยู่แล้ว');
        }

        // แสดง badge โดยตั้งค่า state และ style
        setShowRecaptchaBadge(true);
        
        // ตั้งค่า style โดยตรงเพื่อให้แน่ใจว่าแสดง
        if (badge) {
            badge.classList.add('show-badge');
            badge.style.visibility = 'visible';
            badge.style.opacity = '1';
            badge.style.display = 'flex';
            console.log('✅ Badge แสดงแล้ว:', {
                visibility: badge.style.visibility,
                opacity: badge.style.opacity,
                display: badge.style.display,
                hasShowBadgeClass: badge.classList.contains('show-badge')
            });
        }
        
        // ซ่อน badge หลังจาก 3 วินาที
        setTimeout(() => {
            console.log('⏰ ซ่อน badge หลังจาก 3 วินาที');
            setShowRecaptchaBadge(false);
            if (badge) {
                badge.classList.remove('show-badge');
                badge.style.visibility = 'hidden';
                badge.style.opacity = '0';
                badge.style.display = 'none';
            }
        }, 3000);
    };

    /**
     * ควบคุมการแสดง/ซ่อน reCAPTCHA badge ด้วย CSS
     */
    useEffect(() => {
        const badge = document.querySelector('.grecaptcha-badge') as HTMLElement;
        if (badge) {
            if (showRecaptchaBadge) {
                // แสดง badge โดยเพิ่ม class และตั้งค่า style
                badge.classList.add('show-badge');
                badge.style.visibility = 'visible';
                badge.style.opacity = '1';
                badge.style.display = 'flex';
                console.log('แสดง reCAPTCHA badge');
            } else {
                // ซ่อน badge โดยลบ class และตั้งค่า style
                badge.classList.remove('show-badge');
                badge.style.visibility = 'hidden';
                badge.style.opacity = '0';
                badge.style.display = 'none';
            }
        }
    }, [showRecaptchaBadge]);

    const handleGoogleSignIn = async () => {
        setIsLoading(true);
        setError(null);

        try {
            // 1. Execute reCAPTCHA ก่อน (ไม่ต้องรอ verify)
            console.log('🔒 กำลังตรวจสอบ reCAPTCHA...');
            const recaptchaPromise = executeAndVerifyRecaptcha('login');
            
            // 2. Login ทันที (ไม่ต้องรอ reCAPTCHA)
            console.log('🔑 กำลัง Login...');
            await signInWithGoogle();
            
            // 3. รอผล reCAPTCHA และ log (แต่ไม่บล็อกการ login)
            recaptchaPromise.then(result => {
                console.log('reCAPTCHA result:', {
                    success: result.success,
                    score: result.score,
                    action: result.action
                });
                
                // ถ้า score ต่ำมาก ให้ log warning
                if (result.success && result.score < 0.3) {
                    console.warn('⚠️ reCAPTCHA score ต่ำ:', result.score);
                }
            }).catch(err => {
                console.warn('⚠️ reCAPTCHA verification failed:', err);
            });
            
            // ไม่ต้อง redirect เพราะ AuthContext จะจัดการให้
        } catch (err: any) {
            console.error('Login error:', err);
            setError(err.message || 'เกิดข้อผิดพลาดในการ Login');
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12 max-w-md w-full">
                {/* โลโก้แอป */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-indigo-100 rounded-full mb-4">
                        <svg className="w-12 h-12 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">
                        เครื่องมือสร้างเอกสาร
                    </h1>
                    <p className="text-gray-600">
                        ระบบจัดการใบส่งมอบงานและใบรับประกัน
                    </p>
                </div>

                {/* ข้อความต้อนรับ */}
                <div className="mb-8 text-center">
                    <h2 className="text-xl font-semibold text-gray-800 mb-2">
                        ยินดีต้อนรับ
                    </h2>
                    <p className="text-gray-600 text-sm">
                        กรุณา Login เพื่อเข้าใช้งานระบบ
                    </p>
                </div>

                {/* Tab สำหรับเลือกวิธี Login - 4 แถว แนวตั้ง */}
                <div className="flex flex-col gap-3 mb-6">
                    {/* Google - กดแล้ว Login เลย */}
                    <button
                        onClick={() => {
                            setError(null);
                            handleGoogleSignIn();
                        }}
                        disabled={isLoading}
                        className={`w-full py-4 px-6 rounded-xl font-medium transition-all duration-200 bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg hover:from-blue-600 hover:to-blue-700 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        <div className="flex items-center justify-center gap-4">
                            {isLoading && loginMethod === 'google' ? (
                                <>
                                    <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span className="text-base font-semibold">กำลัง Login...</span>
                                </>
                            ) : (
                                <>
                                    <svg className="w-8 h-8 flex-shrink-0" viewBox="0 0 24 24">
                                        <path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                        <path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                        <path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                        <path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                    </svg>
                                    <span className="text-base font-semibold">🚀 เข้าสู่ระบบด้วย Google</span>
                                </>
                            )}
                        </div>
                    </button>

                    {/* Phone */}
                    <button
                        onClick={() => {
                            setLoginMethod('phone');
                            setError(null);
                        }}
                        className={`w-full py-4 px-6 rounded-xl font-medium transition-all duration-200 ${
                            loginMethod === 'phone'
                                ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg scale-[1.02]'
                                : 'bg-white text-gray-700 hover:bg-gray-50 border-2 border-gray-200 hover:border-green-400'
                        }`}
                    >
                        <div className="flex items-center gap-4">
                            <svg className="w-8 h-8 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            <span className="text-base font-semibold">เข้าสู่ระบบด้วยเบอร์โทรศัพท์</span>
                        </div>
                    </button>

                    {/* Email/Password */}
                    <button
                        onClick={() => {
                            setLoginMethod('email');
                            setError(null);
                        }}
                        className={`w-full py-4 px-6 rounded-xl font-medium transition-all duration-200 ${
                            loginMethod === 'email'
                                ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg scale-[1.02]'
                                : 'bg-white text-gray-700 hover:bg-gray-50 border-2 border-gray-200 hover:border-purple-400'
                        }`}
                    >
                        <div className="flex items-center gap-4">
                            <svg className="w-8 h-8 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                            </svg>
                            <span className="text-base font-semibold">เข้าสู่ระบบด้วย Email/Password</span>
                        </div>
                    </button>

                    {/* Email Link */}
                    <button
                        onClick={() => {
                            setLoginMethod('emailLink');
                            setError(null);
                        }}
                        className={`w-full py-4 px-6 rounded-xl font-medium transition-all duration-200 ${
                            loginMethod === 'emailLink'
                                ? 'bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-lg scale-[1.02]'
                                : 'bg-white text-gray-700 hover:bg-gray-50 border-2 border-gray-200 hover:border-pink-400'
                        }`}
                    >
                        <div className="flex items-center gap-4">
                            <svg className="w-8 h-8 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
                            </svg>
                            <span className="text-base font-semibold">เข้าสู่ระบบด้วย Email Link</span>
                        </div>
                    </button>
                </div>

                {/* แสดงฟอร์ม Login ตามที่เลือก */}
                {loginMethod === 'phone' && (
                    // ฟอร์ม Phone Authentication
                    <PhoneAuthForm
                        onSuccess={() => {
                            // AuthContext จะจัดการ redirect
                        }}
                        onError={(errorMsg) => {
                            setError(errorMsg);
                        }}
                    />
                )}

                {loginMethod === 'email' && (
                    // ฟอร์ม Email/Password Authentication
                    <EmailPasswordForm
                        onSuccess={() => {
                            // AuthContext จะจัดการ redirect
                        }}
                    />
                )}

                {loginMethod === 'emailLink' && (
                    // ฟอร์ม Email Link Authentication
                    <EmailLinkForm
                        onSuccess={() => {
                            // AuthContext จะจัดการ redirect
                        }}
                    />
                )}

                {/* Error Message */}
                {error && (
                    <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                        <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                )}

                {/* ข้อความด้านล่าง */}
                <div className="mt-8 text-center space-y-3">
                    <p className="text-xs text-gray-500">
                        การ Login หมายถึงคุณยอมรับ
                        <br />
                        <button 
                            onClick={(e) => {
                                e.preventDefault();
                                handleOpenPolicy('terms');
                            }}
                            className="text-indigo-600 hover:text-indigo-700 underline"
                        >
                            เงื่อนไขการใช้งาน
                        </button>
                        {' และ '}
                        <button 
                            onClick={(e) => {
                                e.preventDefault();
                                handleOpenPolicy('privacy');
                            }}
                            className="text-indigo-600 hover:text-indigo-700 underline"
                        >
                            นโยบายความเป็นส่วนตัว
                        </button>
                    </p>
                    <p 
                        className="text-xs text-gray-400 flex items-center justify-center gap-1 cursor-pointer hover:text-gray-600 transition-colors"
                        onClick={handleShowRecaptchaBadge}
                        title="คลิกเพื่อดู reCAPTCHA badge"
                    >
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                        </svg>
                        ระบบป้องกันด้วย reCAPTCHA v3
                    </p>
                </div>

                {/* reCAPTCHA Container สำหรับ Phone Auth */}
                <div id="recaptcha-container"></div>
            </div>

            {/* Policy Modal */}
            <PolicyModal 
                isOpen={showPolicyModal}
                onClose={handleClosePolicy}
                type={policyType}
            />

            {/* Background Decoration */}
            <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-white opacity-10 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white opacity-10 rounded-full blur-3xl"></div>
            </div>
        </div>
    );
};

export default LoginPage;
