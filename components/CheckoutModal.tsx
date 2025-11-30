/**
 * CheckoutModal Component
 * Modal สำหรับเลือก billing cycle และยืนยันการชำระเงิน
 */

import React, { useState } from 'react';
import { X, CreditCard, Calendar, Check, AlertCircle, Loader2 } from 'lucide-react';
import { PlanTemplate, calculateYearlyDiscount } from '../services/planTemplates';
import { BillingCycle, SubscriptionPlan } from '../types';
import { formatPrice, calculateMonthlyFromYearly, createCheckoutSession, isTestMode } from '../services/stripe';
import { useAuth } from '../contexts/AuthContext';
import { useCompany } from '../contexts/CompanyContext';

interface CheckoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    plan: PlanTemplate;
    onSuccess?: () => void;
}

const CheckoutModal: React.FC<CheckoutModalProps> = ({
    isOpen,
    onClose,
    plan,
    onSuccess,
}) => {
    const { user } = useAuth();
    const { currentCompany } = useCompany();
    
    const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // คำนวณราคาตาม billing cycle
    const price = billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly;
    const monthlyPrice = billingCycle === 'yearly' 
        ? calculateMonthlyFromYearly(plan.priceYearly)
        : plan.priceMonthly;
    
    // คำนวณส่วนลดรายปี
    const yearlyDiscount = calculateYearlyDiscount(plan);
    const yearlySavings = (plan.priceMonthly * 12) - plan.priceYearly;
    
    // ตรวจสอบว่าเป็น Enterprise หรือไม่
    const isEnterprise = plan.priceMonthly === -1;
    
    /**
     * ดำเนินการชำระเงิน
     */
    const handleCheckout = async () => {
        if (!user || !currentCompany) {
            setError('กรุณาเข้าสู่ระบบก่อนดำเนินการ');
            return;
        }
        
        if (isEnterprise) {
            // สำหรับ Enterprise ให้เปิดหน้าติดต่อ
            window.open('mailto:sales@edoconline.com?subject=สนใจแผน Enterprise', '_blank');
            return;
        }
        
        setIsLoading(true);
        setError(null);
        
        try {
            const result = await createCheckoutSession({
                companyId: currentCompany.id!,
                userId: user.uid,
                userEmail: user.email || '',
                userName: user.displayName || undefined,
                plan: plan.id as SubscriptionPlan,
                billingCycle,
                successUrl: `${window.location.origin}/subscription?success=true`,
                cancelUrl: `${window.location.origin}/pricing?canceled=true`,
            });
            
            if (result) {
                // Redirect ไปหน้า Stripe Checkout
                window.location.href = result.url;
            } else {
                setError('ไม่สามารถสร้าง Checkout Session ได้ กรุณาลองใหม่อีกครั้ง');
            }
        } catch (err: any) {
            console.error('Checkout error:', err);
            setError(err.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
        } finally {
            setIsLoading(false);
        }
    };
    
    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop */}
            <div 
                className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />
            
            {/* Modal */}
            <div className="flex min-h-full items-center justify-center p-4">
                <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl transform transition-all">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">
                                อัปเกรดเป็น {plan.name}
                            </h2>
                            <p className="text-sm text-gray-500 mt-1">{plan.descriptionTh}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                        >
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                    </div>
                    
                    {/* Content */}
                    <div className="p-6 space-y-6">
                        {/* Test Mode Warning */}
                        {isTestMode() && (
                            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                                <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-amber-800">
                                        โหมดทดสอบ (Test Mode)
                                    </p>
                                    <p className="text-xs text-amber-600 mt-1">
                                        การชำระเงินจะไม่ถูกเรียกเก็บจริง ใช้ทดสอบระบบเท่านั้น
                                    </p>
                                </div>
                            </div>
                        )}
                        
                        {/* Billing Cycle Selection */}
                        {!isEnterprise && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-3">
                                    เลือกรอบการชำระเงิน
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    {/* Monthly */}
                                    <button
                                        onClick={() => setBillingCycle('monthly')}
                                        className={`relative p-4 rounded-xl border-2 transition-all ${
                                            billingCycle === 'monthly'
                                                ? 'border-indigo-500 bg-indigo-50'
                                                : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2 mb-2">
                                            <Calendar className="w-4 h-4 text-gray-500" />
                                            <span className="font-medium">รายเดือน</span>
                                        </div>
                                        <div className="text-2xl font-bold text-gray-900">
                                            {formatPrice(plan.priceMonthly)}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">
                                            ต่อเดือน
                                        </div>
                                        {billingCycle === 'monthly' && (
                                            <div className="absolute top-2 right-2">
                                                <Check className="w-5 h-5 text-indigo-500" />
                                            </div>
                                        )}
                                    </button>
                                    
                                    {/* Yearly */}
                                    <button
                                        onClick={() => setBillingCycle('yearly')}
                                        className={`relative p-4 rounded-xl border-2 transition-all ${
                                            billingCycle === 'yearly'
                                                ? 'border-indigo-500 bg-indigo-50'
                                                : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        {yearlyDiscount > 0 && (
                                            <div className="absolute -top-2 -right-2">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-green-500 text-white">
                                                    -{yearlyDiscount}%
                                                </span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-2 mb-2">
                                            <Calendar className="w-4 h-4 text-gray-500" />
                                            <span className="font-medium">รายปี</span>
                                        </div>
                                        <div className="text-2xl font-bold text-gray-900">
                                            {formatPrice(calculateMonthlyFromYearly(plan.priceYearly))}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">
                                            ต่อเดือน ({formatPrice(plan.priceYearly)}/ปี)
                                        </div>
                                        {billingCycle === 'yearly' && (
                                            <div className="absolute top-2 right-2">
                                                <Check className="w-5 h-5 text-indigo-500" />
                                            </div>
                                        )}
                                    </button>
                                </div>
                                
                                {/* Yearly Savings */}
                                {billingCycle === 'yearly' && yearlySavings > 0 && (
                                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                                        <p className="text-sm text-green-700">
                                            🎉 ประหยัด <span className="font-bold">{formatPrice(yearlySavings)}</span> ต่อปี
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                        
                        {/* Order Summary */}
                        <div className="bg-gray-50 rounded-xl p-4">
                            <h3 className="font-medium text-gray-900 mb-3">สรุปการสั่งซื้อ</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">แผน</span>
                                    <span className="font-medium">{plan.name} ({plan.nameTh})</span>
                                </div>
                                {!isEnterprise && (
                                    <>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">รอบการชำระ</span>
                                            <span className="font-medium">
                                                {billingCycle === 'yearly' ? 'รายปี' : 'รายเดือน'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between pt-2 border-t border-gray-200">
                                            <span className="font-medium text-gray-900">ยอดรวม</span>
                                            <span className="font-bold text-lg text-gray-900">
                                                {formatPrice(price)}
                                                {billingCycle === 'yearly' ? '/ปี' : '/เดือน'}
                                            </span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                        
                        {/* Features */}
                        <div>
                            <h3 className="font-medium text-gray-900 mb-3">สิทธิประโยชน์ที่จะได้รับ</h3>
                            <div className="grid grid-cols-2 gap-2">
                                {plan.highlights.slice(0, 6).map((highlight, index) => (
                                    <div key={index} className="flex items-center gap-2 text-sm">
                                        <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                                        <span className="text-gray-600">{highlight}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        {/* Error Message */}
                        {error && (
                            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-red-700">{error}</p>
                            </div>
                        )}
                    </div>
                    
                    {/* Footer */}
                    <div className="flex items-center justify-between p-6 border-t bg-gray-50 rounded-b-2xl">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                        >
                            ยกเลิก
                        </button>
                        <button
                            onClick={handleCheckout}
                            disabled={isLoading}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all ${
                                isEnterprise
                                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700'
                                    : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700'
                            } disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl`}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    กำลังดำเนินการ...
                                </>
                            ) : isEnterprise ? (
                                <>
                                    ติดต่อฝ่ายขาย
                                </>
                            ) : (
                                <>
                                    <CreditCard className="w-5 h-5" />
                                    ดำเนินการชำระเงิน
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CheckoutModal;

