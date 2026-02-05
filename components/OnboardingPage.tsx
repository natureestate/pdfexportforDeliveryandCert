/**
 * Onboarding Page Component
 * หน้า Waitlist สำหรับ User ใหม่ที่ยังไม่มีองค์กร
 * 
 * ทางเลือกที่มี:
 * 1. รอ Waitlist (ระบบอยู่ระหว่างพัฒนา)
 * 2. เข้าร่วมด้วย Join Code (ยังใช้งานได้)
 * 3. รอคำเชิญ
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCompany } from '../contexts/CompanyContext';
import JoinByCodeForm from './JoinByCodeForm';
import FeatureShowcaseModal from './FeatureShowcaseModal';
import {
    Clock,
    KeyRound,
    Mail,
    ArrowLeft,
    Sparkles,
    Users,
    ChevronRight,
    Construction,
    CheckCircle2,
    Send,
    Star,
} from 'lucide-react';

type OnboardingStep = 'select' | 'join-code' | 'wait-invite' | 'waitlist-confirmed';

const OnboardingPage: React.FC = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const { refreshCompanies } = useCompany();
    
    const [currentStep, setCurrentStep] = useState<OnboardingStep>('select');
    const [showFeatureModal, setShowFeatureModal] = useState(false);

    /**
     * จัดการเมื่อ join สำเร็จ
     */
    const handleJoinSuccess = async () => {
        // รอให้ Firestore sync ก่อน refresh
        await new Promise(resolve => setTimeout(resolve, 500));
        await refreshCompanies();
        // รอ context อัปเดต state ก่อน navigate
        await new Promise(resolve => setTimeout(resolve, 500));
        navigate('/');
    };

    /**
     * Logout
     */
    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    /**
     * ยืนยัน Waitlist
     */
    const handleConfirmWaitlist = () => {
        setCurrentStep('waitlist-confirmed');
    };

    // ข้อมูลทางเลือก
    const options = [
        {
            id: 'waitlist',
            title: '🚧 รอ Waitlist',
            description: 'ระบบอยู่ระหว่างการพัฒนา ยืนยันเพื่อรับการแจ้งเตือนเมื่อพร้อมใช้งาน',
            icon: Clock,
            color: 'purple',
            features: ['ระบบกำลังพัฒนา', 'รอการแจ้งเตือน', 'ติดต่อ Admin ได้'],
            badge: 'แนะนำ',
        },
        {
            id: 'join-code',
            title: 'มี Join Code',
            description: 'ใช้รหัสเข้าร่วมที่ได้รับจากองค์กร',
            icon: KeyRound,
            color: 'emerald',
            features: ['เข้าร่วมทันที', 'ไม่ต้องรอการอนุมัติ', 'ได้รับบทบาทตาม Code'],
        },
        {
            id: 'wait-invite',
            title: 'รอคำเชิญ',
            description: 'รอให้ Admin เชิญคุณเข้าร่วมองค์กร',
            icon: Mail,
            color: 'amber',
            features: ['แจ้งอีเมลที่ใช้', 'ตรวจสอบ Inbox', 'รอการติดต่อ'],
        },
    ];

    const getColorClasses = (color: string) => {
        const colors: Record<string, { bg: string; text: string; border: string; hover: string; darkBg: string; darkText: string; darkBorder: string }> = {
            purple: {
                bg: 'bg-purple-50',
                text: 'text-purple-600',
                border: 'border-purple-200',
                hover: 'hover:border-purple-400 hover:bg-purple-100',
                darkBg: 'dark:bg-purple-900/30',
                darkText: 'dark:text-purple-400',
                darkBorder: 'dark:border-purple-700',
            },
            emerald: {
                bg: 'bg-emerald-50',
                text: 'text-emerald-600',
                border: 'border-emerald-200',
                hover: 'hover:border-emerald-400 hover:bg-emerald-100',
                darkBg: 'dark:bg-emerald-900/30',
                darkText: 'dark:text-emerald-400',
                darkBorder: 'dark:border-emerald-700',
            },
            amber: {
                bg: 'bg-amber-50',
                text: 'text-amber-600',
                border: 'border-amber-200',
                hover: 'hover:border-amber-400 hover:bg-amber-100',
                darkBg: 'dark:bg-amber-900/30',
                darkText: 'dark:text-amber-400',
                darkBorder: 'dark:border-amber-700',
            },
        };
        return colors[color] || colors.purple;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-950">
            {/* Header */}
            <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-slate-700 sticky top-0 z-50">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="font-bold text-gray-900 dark:text-gray-100">ยินดีต้อนรับ</h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email || user?.phoneNumber}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                    >
                        ออกจากระบบ
                    </button>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-8">
                {/* Select Step */}
                {currentStep === 'select' && (
                    <div className="space-y-8">
                        {/* Banner แจ้งเตือนระบบกำลังพัฒนา */}
                        <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl p-6 text-white shadow-lg">
                            <div className="flex items-start gap-4">
                                <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                                    <Construction className="w-7 h-7" />
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-xl font-bold mb-2">
                                        🚧 ระบบอยู่ระหว่างการพัฒนา
                                    </h2>
                                    <p className="text-purple-100 mb-3">
                                        ขอบคุณที่สนใจใช้งาน! ขณะนี้ระบบยังไม่เปิดให้ใช้งานทั่วไป 
                                        แต่คุณสามารถเข้าร่วมองค์กรที่มีอยู่ได้ หากมี Join Code
                                    </p>
                                    <div className="flex flex-wrap items-center gap-3">
                                        <div className="flex items-center gap-2 text-sm">
                                            <Mail className="w-4 h-4" />
                                            <span>ติดต่อ: </span>
                                            <a 
                                                href="mailto:info@natureestate.co.th" 
                                                className="font-medium underline hover:no-underline"
                                            >
                                                info@natureestate.co.th
                                            </a>
                                        </div>
                                        <button
                                            onClick={() => setShowFeatureModal(true)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
                                        >
                                            <Star className="w-4 h-4" />
                                            <span>ดูฟีเจอร์ทั้งหมด</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="text-center">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                                เลือกวิธีเริ่มต้น
                            </h2>
                            <p className="text-gray-600 dark:text-gray-400">
                                เลือกทางเลือกที่เหมาะกับคุณ
                            </p>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {options.map((option) => {
                                const colors = getColorClasses(option.color);
                                const Icon = option.icon;
                                
                                return (
                                    <button
                                        key={option.id}
                                        onClick={() => {
                                            if (option.id === 'waitlist') {
                                                handleConfirmWaitlist();
                                            } else {
                                                setCurrentStep(option.id as OnboardingStep);
                                            }
                                        }}
                                        className={`text-left p-6 rounded-2xl border-2 transition-all duration-200 bg-white dark:bg-slate-800 ${colors.border} ${colors.darkBorder} ${colors.hover} dark:hover:bg-slate-700 relative`}
                                    >
                                        {option.badge && (
                                            <span className="absolute top-3 right-3 px-2 py-0.5 bg-purple-500 text-white text-xs font-medium rounded-full">
                                                {option.badge}
                                            </span>
                                        )}
                                        <div className={`w-12 h-12 rounded-xl ${colors.bg} ${colors.darkBg} flex items-center justify-center mb-4`}>
                                            <Icon className={`w-6 h-6 ${colors.text} ${colors.darkText}`} />
                                        </div>
                                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                                            {option.title}
                                        </h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                            {option.description}
                                        </p>
                                        <ul className="space-y-1">
                                            {option.features.map((feature, idx) => (
                                                <li key={idx} className="text-xs text-gray-500 dark:text-gray-500 flex items-center gap-1">
                                                    <div className={`w-1 h-1 rounded-full ${colors.text.replace('text-', 'bg-')}`} />
                                                    {feature}
                                                </li>
                                            ))}
                                        </ul>
                                        <div className="mt-4 flex items-center text-sm font-medium gap-1">
                                            <span className={`${colors.text} ${colors.darkText}`}>เลือก</span>
                                            <ChevronRight className={`w-4 h-4 ${colors.text} ${colors.darkText}`} />
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Waitlist Confirmed Step */}
                {currentStep === 'waitlist-confirmed' && (
                    <div className="max-w-md mx-auto">
                        <button
                            onClick={() => setCurrentStep('select')}
                            className="flex items-center gap-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 mb-6"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span>กลับ</span>
                        </button>

                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-8 shadow-sm text-center">
                            <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                                <CheckCircle2 className="w-10 h-10 text-white" />
                            </div>
                            
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                                ขอบคุณที่รอ! 🎉
                            </h2>
                            
                            <p className="text-gray-600 dark:text-gray-400 mb-6">
                                เราได้รับข้อมูลของคุณแล้ว จะแจ้งให้ทราบเมื่อระบบพร้อมใช้งาน
                            </p>

                            <div className="bg-purple-50 dark:bg-purple-900/30 rounded-xl p-5 mb-6 text-left">
                                <h3 className="font-semibold text-purple-900 dark:text-purple-300 mb-3 flex items-center gap-2">
                                    <Clock className="w-5 h-5" />
                                    สถานะ: รอ Waitlist
                                </h3>
                                <div className="space-y-2 text-sm">
                                    {user?.email && (
                                        <div className="flex items-center gap-2">
                                            <Mail className="w-4 h-4 text-purple-500 dark:text-purple-400" />
                                            <span className="text-gray-700 dark:text-gray-300">{user.email}</span>
                                        </div>
                                    )}
                                    {user?.phoneNumber && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-700 dark:text-gray-300">{user.phoneNumber}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-4 mb-6 text-left">
                                <div className="flex items-start gap-3">
                                    <Send className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-medium text-blue-900 dark:text-blue-300">ต้องการติดต่อ?</p>
                                        <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                                            ส่งอีเมลถึงเราได้ที่{' '}
                                            <a 
                                                href="mailto:info@natureestate.co.th" 
                                                className="font-medium underline hover:no-underline"
                                            >
                                                info@natureestate.co.th
                                            </a>
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <button
                                    onClick={() => setCurrentStep('join-code')}
                                    className="w-full py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 flex items-center justify-center gap-2"
                                >
                                    <KeyRound className="w-5 h-5" />
                                    <span>มี Join Code? เข้าร่วมเลย</span>
                                </button>
                                
                                <button
                                    onClick={handleLogout}
                                    className="w-full py-3 border border-gray-300 dark:border-slate-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700"
                                >
                                    ออกจากระบบ
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Join by Code Step */}
                {currentStep === 'join-code' && (
                    <div className="max-w-md mx-auto">
                        <button
                            onClick={() => setCurrentStep('select')}
                            className="flex items-center gap-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 mb-6"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span>กลับ</span>
                        </button>

                        <JoinByCodeForm onSuccess={handleJoinSuccess} />
                    </div>
                )}

                {/* Wait for Invite Step */}
                {currentStep === 'wait-invite' && (
                    <div className="max-w-md mx-auto">
                        <button
                            onClick={() => setCurrentStep('select')}
                            className="flex items-center gap-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 mb-6"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span>กลับ</span>
                        </button>

                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6 shadow-sm text-center">
                            <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Mail className="w-8 h-8 text-amber-600 dark:text-amber-400" />
                            </div>
                            
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                                รอคำเชิญ
                            </h2>
                            
                            <p className="text-gray-600 dark:text-gray-400 mb-6">
                                ขอให้ Admin ขององค์กรเชิญคุณโดยใช้อีเมลหรือเบอร์โทรด้านล่าง
                            </p>

                            <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4 space-y-2 text-left">
                                {user?.email && (
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">อีเมล</p>
                                        <p className="font-medium text-gray-900 dark:text-gray-100">{user.email}</p>
                                    </div>
                                )}
                                {user?.phoneNumber && (
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">เบอร์โทรศัพท์</p>
                                        <p className="font-medium text-gray-900 dark:text-gray-100">{user.phoneNumber}</p>
                                    </div>
                                )}
                            </div>

                            <div className="mt-6 space-y-3">
                                <div className="flex items-center gap-3 text-left p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                                    <Users className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                                    <p className="text-sm text-blue-800 dark:text-blue-300">
                                        เมื่อได้รับคำเชิญ ระบบจะเพิ่มคุณเข้าองค์กรอัตโนมัติเมื่อ Login ครั้งถัดไป
                                    </p>
                                </div>

                                <div className="flex items-center gap-3 text-left p-3 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                                    <Send className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                                    <p className="text-sm text-purple-800 dark:text-purple-300">
                                        ติดต่อ Admin:{' '}
                                        <a 
                                            href="mailto:info@natureestate.co.th" 
                                            className="font-medium underline hover:no-underline"
                                        >
                                            info@natureestate.co.th
                                        </a>
                                    </p>
                                </div>

                                <button
                                    onClick={() => window.location.reload()}
                                    className="w-full py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700"
                                >
                                    รีเฟรชหน้า
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="max-w-4xl mx-auto px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                <p className="mb-3">
                    มีคำถาม? ติดต่อเราได้ที่{' '}
                    <a 
                        href="mailto:info@natureestate.co.th" 
                        className="text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                        info@natureestate.co.th
                    </a>
                </p>
                <button
                    onClick={() => setShowFeatureModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-lg font-medium hover:from-amber-500 hover:to-orange-600 transition-all shadow-md hover:shadow-lg"
                >
                    <Sparkles className="w-4 h-4" />
                    <span>ดูฟีเจอร์ทั้งหมด</span>
                </button>
            </footer>

            {/* Feature Showcase Modal */}
            <FeatureShowcaseModal
                isOpen={showFeatureModal}
                onClose={() => setShowFeatureModal(false)}
            />
        </div>
    );
};

export default OnboardingPage;
