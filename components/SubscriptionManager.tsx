/**
 * SubscriptionManager Component
 * หน้าจัดการ subscription ปัจจุบัน (ดู/ยกเลิก/อัปเกรด)
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    ArrowLeft,
    CreditCard,
    Calendar,
    Check,
    AlertCircle,
    Loader2,
    Crown,
    Sparkles,
    Building2,
    Rocket,
    RefreshCw,
    ExternalLink,
    AlertTriangle,
    CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCompany } from '../contexts/CompanyContext';
import { SubscriptionPlan, BillingCycle, CompanyQuota } from '../types';
import { getQuota } from '../services/quota';
import { getPlanTemplate, PlanTemplate } from '../services/planTemplates';
import {
    getCompanySubscription,
    cancelStripeSubscription,
    formatPrice,
    isSubscriptionActive,
    isSubscriptionExpiringSoon,
    getSubscriptionEndDate,
    isTestMode,
} from '../services/stripe';
import Header from './Header';

const SubscriptionManager: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user } = useAuth();
    const { currentCompany } = useCompany();

    // State
    const [quota, setQuota] = useState<CompanyQuota | null>(null);
    const [planTemplate, setPlanTemplate] = useState<PlanTemplate | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isCanceling, setIsCanceling] = useState(false);
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    /**
     * โหลดข้อมูล Subscription
     */
    useEffect(() => {
        const loadSubscription = async () => {
            if (!currentCompany?.id) return;

            try {
                setIsLoading(true);
                setError(null);

                // โหลด Quota
                const companyQuota = await getQuota(currentCompany.id);
                setQuota(companyQuota);

                // โหลด Plan Template
                if (companyQuota) {
                    const template = await getPlanTemplate(companyQuota.plan);
                    setPlanTemplate(template);
                }
            } catch (err: any) {
                console.error('Failed to load subscription:', err);
                setError('ไม่สามารถโหลดข้อมูล subscription ได้');
            } finally {
                setIsLoading(false);
            }
        };

        loadSubscription();
    }, [currentCompany]);

    /**
     * ตรวจสอบ success message จาก URL
     */
    useEffect(() => {
        if (searchParams.get('success') === 'true') {
            setSuccessMessage('🎉 ชำระเงินสำเร็จ! ขอบคุณที่อัปเกรด');
            // ลบ param หลัง 5 วินาที
            setTimeout(() => {
                setSuccessMessage(null);
                navigate('/subscription', { replace: true });
            }, 5000);
        }
    }, [searchParams, navigate]);

    /**
     * ยกเลิก Subscription
     */
    const handleCancelSubscription = async () => {
        if (!quota?.stripeSubscriptionId) return;

        try {
            setIsCanceling(true);
            setError(null);

            const success = await cancelStripeSubscription(quota.stripeSubscriptionId);

            if (success) {
                setSuccessMessage('ยกเลิก subscription สำเร็จ จะยังใช้งานได้จนหมดรอบบิล');
                setShowCancelConfirm(false);
                
                // Reload data
                const companyQuota = await getQuota(currentCompany!.id!);
                setQuota(companyQuota);
            } else {
                setError('ไม่สามารถยกเลิก subscription ได้ กรุณาลองใหม่อีกครั้ง');
            }
        } catch (err: any) {
            console.error('Failed to cancel subscription:', err);
            setError(err.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
        } finally {
            setIsCanceling(false);
        }
    };

    /**
     * ไอคอนสำหรับแต่ละ Plan
     */
    const getPlanIcon = (plan: SubscriptionPlan) => {
        switch (plan) {
            case 'free':
                return <Sparkles className="w-8 h-8" />;
            case 'starter':
                return <Rocket className="w-8 h-8" />;
            case 'business':
                return <Building2 className="w-8 h-8" />;
            case 'enterprise':
                return <Crown className="w-8 h-8" />;
            default:
                return <Sparkles className="w-8 h-8" />;
        }
    };

    /**
     * สีสำหรับแต่ละ Plan
     */
    const getPlanColor = (plan: SubscriptionPlan) => {
        switch (plan) {
            case 'free':
                return '#6B7280';
            case 'starter':
                return '#3B82F6';
            case 'business':
                return '#F59E0B';
            case 'enterprise':
                return '#8B5CF6';
            default:
                return '#6B7280';
        }
    };

    /**
     * Format วันที่
     */
    const formatDate = (date: Date | null | undefined) => {
        if (!date) return '-';
        return new Intl.DateTimeFormat('th-TH', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        }).format(date);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
                <Header />
                <div className="flex items-center justify-center py-24">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
            <Header />

            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
                {/* Back Button */}
                <button
                    onClick={() => navigate('/')}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-8 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>กลับหน้าหลัก</span>
                </button>

                {/* Success Message */}
                {successMessage && (
                    <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                        <p className="text-green-800">{successMessage}</p>
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-red-500" />
                        <p className="text-red-800">{error}</p>
                    </div>
                )}

                {/* Test Mode Banner */}
                {isTestMode() && (
                    <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                        <div>
                            <p className="font-medium text-amber-800">โหมดทดสอบ (Test Mode)</p>
                            <p className="text-sm text-amber-600">
                                ข้อมูล subscription อาจไม่ตรงกับ Stripe จริง
                            </p>
                        </div>
                    </div>
                )}

                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                        จัดการ Subscription
                    </h1>
                    <p className="text-gray-600 mt-2">
                        ดูและจัดการแผนการใช้งานของคุณ
                    </p>
                </div>

                {/* Current Plan Card */}
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-8">
                    {/* Plan Header */}
                    <div
                        className="p-6 text-white"
                        style={{
                            background: `linear-gradient(135deg, ${getPlanColor(quota?.plan || 'free')} 0%, ${getPlanColor(quota?.plan || 'free')}dd 100%)`,
                        }}
                    >
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white/20 rounded-xl">
                                {getPlanIcon(quota?.plan || 'free')}
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold">
                                    {planTemplate?.name || 'Free'}
                                </h2>
                                <p className="text-white/80">
                                    {planTemplate?.nameTh || 'ทดลองใช้'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Plan Details */}
                    <div className="p-6 space-y-6">
                        {/* Status */}
                        <div className="flex items-center justify-between">
                            <span className="text-gray-600">สถานะ</span>
                            <span
                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${
                                    quota?.status === 'active'
                                        ? 'bg-green-100 text-green-700'
                                        : quota?.status === 'trial'
                                        ? 'bg-blue-100 text-blue-700'
                                        : quota?.status === 'canceled'
                                        ? 'bg-gray-100 text-gray-700'
                                        : 'bg-red-100 text-red-700'
                                }`}
                            >
                                {quota?.status === 'active' && <Check className="w-4 h-4" />}
                                {quota?.status === 'active'
                                    ? 'ใช้งานอยู่'
                                    : quota?.status === 'trial'
                                    ? 'ทดลองใช้'
                                    : quota?.status === 'canceled'
                                    ? 'ยกเลิกแล้ว'
                                    : quota?.status === 'expired'
                                    ? 'หมดอายุ'
                                    : quota?.status}
                            </span>
                        </div>

                        {/* Billing Cycle */}
                        {quota?.billingCycle && (
                            <div className="flex items-center justify-between">
                                <span className="text-gray-600">รอบการชำระเงิน</span>
                                <span className="font-medium">
                                    {quota.billingCycle === 'yearly' ? 'รายปี' : 'รายเดือน'}
                                </span>
                            </div>
                        )}

                        {/* Price */}
                        {planTemplate && planTemplate.priceMonthly > 0 && (
                            <div className="flex items-center justify-between">
                                <span className="text-gray-600">ราคา</span>
                                <span className="font-medium">
                                    {quota?.billingCycle === 'yearly'
                                        ? `${formatPrice(planTemplate.priceYearly)}/ปี`
                                        : `${formatPrice(planTemplate.priceMonthly)}/เดือน`}
                                </span>
                            </div>
                        )}

                        {/* Start Date */}
                        <div className="flex items-center justify-between">
                            <span className="text-gray-600">เริ่มใช้งาน</span>
                            <span className="font-medium">{formatDate(quota?.startDate)}</span>
                        </div>

                        {/* End Date */}
                        {quota?.endDate && (
                            <div className="flex items-center justify-between">
                                <span className="text-gray-600">หมดอายุ</span>
                                <span className="font-medium">{formatDate(quota.endDate)}</span>
                            </div>
                        )}

                        {/* Next Payment */}
                        {quota?.nextPaymentDate && (
                            <div className="flex items-center justify-between">
                                <span className="text-gray-600">ชำระเงินครั้งถัดไป</span>
                                <span className="font-medium">{formatDate(quota.nextPaymentDate)}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Usage Stats */}
                <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">การใช้งาน</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {/* Documents */}
                        <UsageStat
                            label="เอกสาร/เดือน"
                            current={quota?.currentDocuments || 0}
                            max={quota?.maxDocuments || 0}
                        />
                        {/* Users */}
                        <UsageStat
                            label="ผู้ใช้งาน"
                            current={quota?.currentUsers || 0}
                            max={quota?.maxUsers || 0}
                        />
                        {/* Customers */}
                        <UsageStat
                            label="ลูกค้า"
                            current={quota?.currentCustomers || 0}
                            max={quota?.maxCustomers || 0}
                        />
                        {/* PDF Exports */}
                        <UsageStat
                            label="Export PDF"
                            current={quota?.currentPdfExports || 0}
                            max={quota?.maxPdfExports || 0}
                        />
                    </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-4">
                    {/* Upgrade Button */}
                    {quota?.plan !== 'enterprise' && (
                        <button
                            onClick={() => navigate('/pricing')}
                            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl"
                        >
                            <Crown className="w-5 h-5" />
                            {quota?.plan === 'free' ? 'อัปเกรดแผน' : 'เปลี่ยนแผน'}
                        </button>
                    )}

                    {/* Cancel Button */}
                    {quota?.plan !== 'free' && quota?.stripeSubscriptionId && (
                        <button
                            onClick={() => setShowCancelConfirm(true)}
                            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all"
                        >
                            ยกเลิก Subscription
                        </button>
                    )}
                </div>

                {/* Cancel Confirmation Modal */}
                {showCancelConfirm && (
                    <div className="fixed inset-0 z-50 overflow-y-auto">
                        <div
                            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                            onClick={() => setShowCancelConfirm(false)}
                        />
                        <div className="flex min-h-full items-center justify-center p-4">
                            <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6">
                                <div className="text-center">
                                    <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                                        <AlertTriangle className="w-6 h-6 text-red-600" />
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                                        ยืนยันการยกเลิก?
                                    </h3>
                                    <p className="text-gray-600 mb-6">
                                        คุณจะยังใช้งานได้จนหมดรอบบิลปัจจุบัน หลังจากนั้นจะกลับเป็น Free plan
                                    </p>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setShowCancelConfirm(false)}
                                            className="flex-1 px-4 py-2 border border-gray-300 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                                        >
                                            ยกเลิก
                                        </button>
                                        <button
                                            onClick={handleCancelSubscription}
                                            disabled={isCanceling}
                                            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                                        >
                                            {isCanceling ? (
                                                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                                            ) : (
                                                'ยืนยัน'
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

/**
 * Usage Stat Component
 */
interface UsageStatProps {
    label: string;
    current: number;
    max: number;
}

const UsageStat: React.FC<UsageStatProps> = ({ label, current, max }) => {
    const isUnlimited = max === -1;
    const percentage = isUnlimited ? 0 : Math.min((current / max) * 100, 100);
    const isNearLimit = percentage >= 80;
    const isOverLimit = percentage >= 100;

    return (
        <div className="p-4 bg-gray-50 rounded-xl">
            <div className="text-sm text-gray-600 mb-2">{label}</div>
            <div className="text-2xl font-bold text-gray-900">
                {current}
                <span className="text-sm font-normal text-gray-500">
                    /{isUnlimited ? '∞' : max}
                </span>
            </div>
            {!isUnlimited && (
                <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all ${
                            isOverLimit
                                ? 'bg-red-500'
                                : isNearLimit
                                ? 'bg-amber-500'
                                : 'bg-green-500'
                        }`}
                        style={{ width: `${percentage}%` }}
                    />
                </div>
            )}
        </div>
    );
};

export default SubscriptionManager;

