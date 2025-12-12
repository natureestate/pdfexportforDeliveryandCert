/**
 * Onboarding Page Component
 * หน้าเลือกทางเลือกสำหรับ User ใหม่ที่ยังไม่มีองค์กร
 * 
 * ทางเลือกที่มี:
 * 1. สร้างองค์กรใหม่
 * 2. เข้าร่วมด้วย Join Code
 * 3. ขอเข้าร่วมองค์กร (Request Access)
 * 4. รอคำเชิญ
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCompany } from '../contexts/CompanyContext';
import { createCompany } from '../services/companies';
import { canCreateCompany } from '../services/quota';
import { auth } from '../firebase.config';
import JoinByCodeForm from './JoinByCodeForm';
import {
    Building2,
    KeyRound,
    Mail,
    ArrowLeft,
    Sparkles,
    Shield,
    Users,
    ChevronRight,
} from 'lucide-react';

type OnboardingStep = 'select' | 'create' | 'join-code' | 'wait-invite';

const OnboardingPage: React.FC = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const { refreshCompanies } = useCompany();
    
    const [currentStep, setCurrentStep] = useState<OnboardingStep>('select');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // Create Company Form
    const [companyName, setCompanyName] = useState('');
    const [companyAddress, setCompanyAddress] = useState('');

    /**
     * สร้างองค์กรใหม่
     */
    const handleCreateCompany = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!companyName.trim()) {
            setError('กรุณากรอกชื่อองค์กร');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const currentUser = auth.currentUser;
            if (!currentUser) {
                throw new Error('กรุณา Login ก่อนสร้างองค์กร');
            }

            // ตรวจสอบ quota
            const quotaCheck = await canCreateCompany(currentUser.uid);
            if (!quotaCheck.canCreate) {
                throw new Error(quotaCheck.reason || 'ไม่สามารถสร้างองค์กรได้');
            }

            // สร้างองค์กร
            const companyData: any = {
                name: companyName.trim(),
            };
            
            if (companyAddress.trim()) {
                companyData.address = companyAddress.trim();
            }

            await createCompany(companyData);
            
            // รีเฟรชรายการองค์กร
            await refreshCompanies();
            
            // ไปหน้าหลัก
            navigate('/');
        } catch (err: any) {
            setError(err.message || 'ไม่สามารถสร้างองค์กรได้');
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * จัดการเมื่อ join สำเร็จ
     */
    const handleJoinSuccess = async () => {
        await refreshCompanies();
        navigate('/');
    };

    /**
     * Logout
     */
    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    // ข้อมูลทางเลือก
    const options = [
        {
            id: 'create',
            title: 'สร้างองค์กรใหม่',
            description: 'สร้างองค์กรของคุณเองและเป็น Admin คนแรก',
            icon: Building2,
            color: 'indigo',
            features: ['เป็น Admin อัตโนมัติ', 'เชิญสมาชิกได้', 'ตั้งค่าองค์กรได้'],
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
        const colors: Record<string, { bg: string; text: string; border: string; hover: string }> = {
            indigo: {
                bg: 'bg-indigo-50',
                text: 'text-indigo-600',
                border: 'border-indigo-200',
                hover: 'hover:border-indigo-400 hover:bg-indigo-100',
            },
            emerald: {
                bg: 'bg-emerald-50',
                text: 'text-emerald-600',
                border: 'border-emerald-200',
                hover: 'hover:border-emerald-400 hover:bg-emerald-100',
            },
            blue: {
                bg: 'bg-blue-50',
                text: 'text-blue-600',
                border: 'border-blue-200',
                hover: 'hover:border-blue-400 hover:bg-blue-100',
            },
            amber: {
                bg: 'bg-amber-50',
                text: 'text-amber-600',
                border: 'border-amber-200',
                hover: 'hover:border-amber-400 hover:bg-amber-100',
            },
        };
        return colors[color] || colors.indigo;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="font-bold text-gray-900">ยินดีต้อนรับ</h1>
                            <p className="text-sm text-gray-500">{user?.email || user?.phoneNumber}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="text-sm text-gray-500 hover:text-gray-700"
                    >
                        ออกจากระบบ
                    </button>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-8">
                {/* Select Step */}
                {currentStep === 'select' && (
                    <div className="space-y-8">
                        <div className="text-center">
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">
                                เริ่มต้นใช้งาน
                            </h2>
                            <p className="text-gray-600">
                                เลือกวิธีที่คุณต้องการเริ่มต้น
                            </p>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            {options.map((option) => {
                                const colors = getColorClasses(option.color);
                                const Icon = option.icon;
                                
                                return (
                                    <button
                                        key={option.id}
                                        onClick={() => setCurrentStep(option.id as OnboardingStep)}
                                        className={`text-left p-6 rounded-2xl border-2 transition-all duration-200 ${colors.border} ${colors.hover}`}
                                    >
                                        <div className={`w-12 h-12 rounded-xl ${colors.bg} flex items-center justify-center mb-4`}>
                                            <Icon className={`w-6 h-6 ${colors.text}`} />
                                        </div>
                                        <h3 className="font-semibold text-gray-900 mb-1">
                                            {option.title}
                                        </h3>
                                        <p className="text-sm text-gray-600 mb-4">
                                            {option.description}
                                        </p>
                                        <ul className="space-y-1">
                                            {option.features.map((feature, idx) => (
                                                <li key={idx} className="text-xs text-gray-500 flex items-center gap-1">
                                                    <div className={`w-1 h-1 rounded-full ${colors.text.replace('text-', 'bg-')}`} />
                                                    {feature}
                                                </li>
                                            ))}
                                        </ul>
                                        <div className="mt-4 flex items-center text-sm font-medium gap-1" style={{ color: colors.text.replace('text-', '') }}>
                                            <span className={colors.text}>เลือก</span>
                                            <ChevronRight className={`w-4 h-4 ${colors.text}`} />
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Create Company Step */}
                {currentStep === 'create' && (
                    <div className="max-w-md mx-auto">
                        <button
                            onClick={() => setCurrentStep('select')}
                            className="flex items-center gap-1 text-gray-600 hover:text-gray-900 mb-6"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span>กลับ</span>
                        </button>

                        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                                    <Building2 className="w-6 h-6 text-indigo-600" />
                                </div>
                                <div>
                                    <h2 className="font-semibold text-gray-900">สร้างองค์กรใหม่</h2>
                                    <p className="text-sm text-gray-500">คุณจะเป็น Admin อัตโนมัติ</p>
                                </div>
                            </div>

                            <form onSubmit={handleCreateCompany} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        ชื่อองค์กร <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={companyName}
                                        onChange={(e) => {
                                            setCompanyName(e.target.value);
                                            setError(null);
                                        }}
                                        placeholder="เช่น บริษัท ABC จำกัด"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                        disabled={isLoading}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        ที่อยู่ (ไม่บังคับ)
                                    </label>
                                    <textarea
                                        value={companyAddress}
                                        onChange={(e) => setCompanyAddress(e.target.value)}
                                        placeholder="ที่อยู่องค์กร"
                                        rows={3}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                        disabled={isLoading}
                                    />
                                </div>

                                {error && (
                                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                                        {error}
                                    </div>
                                )}

                                <div className="bg-indigo-50 rounded-lg p-4">
                                    <div className="flex items-start gap-3">
                                        <Shield className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-medium text-indigo-900">สิทธิ์ Admin</p>
                                            <p className="text-xs text-indigo-700 mt-1">
                                                คุณจะสามารถเชิญสมาชิก, จัดการบทบาท, และตั้งค่าองค์กรได้
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading || !companyName.trim()}
                                    className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isLoading ? (
                                        <>
                                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                            </svg>
                                            <span>กำลังสร้าง...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Building2 className="w-5 h-5" />
                                            <span>สร้างองค์กร</span>
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {/* Join by Code Step */}
                {currentStep === 'join-code' && (
                    <div className="max-w-md mx-auto">
                        <button
                            onClick={() => setCurrentStep('select')}
                            className="flex items-center gap-1 text-gray-600 hover:text-gray-900 mb-6"
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
                            className="flex items-center gap-1 text-gray-600 hover:text-gray-900 mb-6"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span>กลับ</span>
                        </button>

                        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm text-center">
                            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Mail className="w-8 h-8 text-amber-600" />
                            </div>
                            
                            <h2 className="text-xl font-semibold text-gray-900 mb-2">
                                รอคำเชิญ
                            </h2>
                            
                            <p className="text-gray-600 mb-6">
                                ขอให้ Admin ขององค์กรเชิญคุณโดยใช้อีเมลหรือเบอร์โทรด้านล่าง
                            </p>

                            <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-left">
                                {user?.email && (
                                    <div>
                                        <p className="text-xs text-gray-500">อีเมล</p>
                                        <p className="font-medium text-gray-900">{user.email}</p>
                                    </div>
                                )}
                                {user?.phoneNumber && (
                                    <div>
                                        <p className="text-xs text-gray-500">เบอร์โทรศัพท์</p>
                                        <p className="font-medium text-gray-900">{user.phoneNumber}</p>
                                    </div>
                                )}
                            </div>

                            <div className="mt-6 space-y-3">
                                <div className="flex items-center gap-3 text-left p-3 bg-blue-50 rounded-lg">
                                    <Users className="w-5 h-5 text-blue-600 flex-shrink-0" />
                                    <p className="text-sm text-blue-800">
                                        เมื่อได้รับคำเชิญ ระบบจะเพิ่มคุณเข้าองค์กรอัตโนมัติเมื่อ Login ครั้งถัดไป
                                    </p>
                                </div>

                                <button
                                    onClick={() => window.location.reload()}
                                    className="w-full py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                                >
                                    รีเฟรชหน้า
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default OnboardingPage;
