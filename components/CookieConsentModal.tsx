import React, { useState, useEffect } from 'react';
import { saveCookieConsent } from '../services/cookieConsent';
import { auth } from '../firebase.config';

interface CookieConsentModalProps {
    onAccept: () => void;
    onDecline?: () => void;
}

const CookieConsentModal: React.FC<CookieConsentModalProps> = ({ onAccept, onDecline }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // ตรวจสอบว่า user ยอมรับ cookie แล้วหรือยัง
        const consent = localStorage.getItem('pdpa-cookie-consent');
        if (!consent) {
            // รอสักครู่เพื่อให้ page โหลดเสร็จก่อนแสดง popup
            setTimeout(() => {
                setIsVisible(true);
            }, 500);
        }
    }, []);

    const handleAccept = async () => {
        try {
            // บันทึก consent ใน Firestore (ถ้า login แล้ว) และ localStorage
            await saveCookieConsent('accepted', {
                userAgent: navigator.userAgent,
            });
            
            setIsVisible(false);
            onAccept();
            console.log('✅ Cookie consent accepted and saved');
        } catch (error) {
            console.error('❌ Error saving consent:', error);
            // แม้จะบันทึกไม่สำเร็จก็ยังปิด modal และยอมรับ
            setIsVisible(false);
            onAccept();
        }
    };

    const handleDecline = async () => {
        try {
            // บันทึกการปฏิเสธใน Firestore (ถ้า login แล้ว) และ localStorage
            await saveCookieConsent('declined', {
                userAgent: navigator.userAgent,
            });
            
            setIsVisible(false);
            if (onDecline) {
                onDecline();
            }
            console.log('⚠️ Cookie consent declined and saved');
        } catch (error) {
            console.error('❌ Error saving consent:', error);
            // แม้จะบันทึกไม่สำเร็จก็ยังปิด modal
            setIsVisible(false);
            if (onDecline) {
                onDecline();
            }
        }
    };

    if (!isVisible) return null;

    return (
        <>
            {/* Overlay */}
            <div 
                className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-end sm:items-center justify-center p-4"
                onClick={handleDecline}
            >
                {/* Modal Content */}
                <div 
                    className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slide-up"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-4 rounded-t-lg">
                        <div className="flex items-center gap-3">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            <h2 className="text-xl font-bold">นโยบายคุ้มครองข้อมูลส่วนบุคคล (PDPA)</h2>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="p-6 space-y-4 text-gray-700">
                        <p className="text-base leading-relaxed">
                            เว็บไซต์นี้ใช้คุกกี้ (Cookies) เพื่อปรับปรุงประสบการณ์การใช้งานของคุณ 
                            และเพื่อให้บริการที่เหมาะสมกับความต้องการของคุณ
                        </p>

                        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                            <h3 className="font-semibold text-blue-900 mb-2">ข้อมูลที่เรารวบรวม:</h3>
                            <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
                                <li>ข้อมูลการเข้าสู่ระบบและบัญชีผู้ใช้</li>
                                <li>ข้อมูลบริษัทและข้อมูลการติดต่อ</li>
                                <li>ข้อมูลเอกสารที่คุณสร้าง (ใบส่งมอบงาน, ใบรับประกันสินค้า)</li>
                                <li>ข้อมูลการใช้งานระบบเพื่อปรับปรุงบริการ</li>
                            </ul>
                        </div>

                        <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
                            <h3 className="font-semibold text-green-900 mb-2">วัตถุประสงค์ในการใช้ข้อมูล:</h3>
                            <ul className="list-disc list-inside space-y-1 text-sm text-green-800">
                                <li>ให้บริการสร้างและจัดการเอกสาร</li>
                                <li>ปรับปรุงและพัฒนาบริการ</li>
                                <li>รักษาความปลอดภัยของระบบ</li>
                                <li>ส่งข้อมูลสำคัญเกี่ยวกับบริการ</li>
                            </ul>
                        </div>

                        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
                            <h3 className="font-semibold text-yellow-900 mb-2">สิทธิ์ของคุณ:</h3>
                            <ul className="list-disc list-inside space-y-1 text-sm text-yellow-800">
                                <li>สิทธิ์ในการเข้าถึงข้อมูลส่วนบุคคลของคุณ</li>
                                <li>สิทธิ์ในการแก้ไขหรือลบข้อมูล</li>
                                <li>สิทธิ์ในการถอนความยินยอม</li>
                                <li>สิทธิ์ในการร้องเรียนต่อคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล</li>
                            </ul>
                        </div>

                        <p className="text-sm text-gray-600 italic">
                            โดยการคลิก "ยอมรับ" คุณยินยอมให้เราใช้คุกกี้และประมวลผลข้อมูลส่วนบุคคลของคุณ 
                            ตามนโยบายคุ้มครองข้อมูลส่วนบุคคลของเรา
                        </p>
                    </div>

                    {/* Footer */}
                    <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-lg">
                        <div className="flex flex-col sm:flex-row gap-3 justify-end">
                            <button
                                onClick={handleDecline}
                                className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                ปฏิเสธ
                            </button>
                            <button
                                onClick={handleAccept}
                                className="px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg"
                            >
                                ยอมรับ
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* CSS Animation */}
            <style>{`
                @keyframes slide-up {
                    from {
                        transform: translateY(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }
                .animate-slide-up {
                    animation: slide-up 0.3s ease-out;
                }
                @media (min-width: 640px) {
                    @keyframes slide-up {
                        from {
                            transform: translateY(-50%) scale(0.95);
                            opacity: 0;
                        }
                        to {
                            transform: translateY(0) scale(1);
                            opacity: 1;
                        }
                    }
                }
            `}</style>
        </>
    );
};

export default CookieConsentModal;

