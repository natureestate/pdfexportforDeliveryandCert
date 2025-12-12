/**
 * PricingCard Component
 * แสดงรายละเอียดแต่ละ Plan ในรูปแบบ Card
 */

import React from 'react';
import { Check, X, Sparkles, Crown, Building2, Rocket } from 'lucide-react';
import { PlanTemplate, calculateYearlyDiscount } from '../services/planTemplates';
import { BillingCycle, SubscriptionPlan } from '../types';
import { formatPrice, calculateMonthlyFromYearly } from '../services/stripe';

interface PricingCardProps {
    plan: PlanTemplate;
    billingCycle: BillingCycle;
    currentPlan?: SubscriptionPlan;
    onSelect: (plan: PlanTemplate) => void;
    isLoading?: boolean;
}

/**
 * ไอคอนสำหรับแต่ละ Plan
 */
const getPlanIcon = (planId: string) => {
    switch (planId) {
        case 'free':
            return <Sparkles className="w-6 h-6" />;
        case 'starter':
            return <Rocket className="w-6 h-6" />;
        case 'business':
            return <Building2 className="w-6 h-6" />;
        case 'enterprise':
            return <Crown className="w-6 h-6" />;
        default:
            return <Sparkles className="w-6 h-6" />;
    }
};

const PricingCard: React.FC<PricingCardProps> = ({
    plan,
    billingCycle,
    currentPlan,
    onSelect,
    isLoading = false,
}) => {
    // คำนวณราคาตาม billing cycle
    const price = billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly;
    const monthlyPrice = billingCycle === 'yearly' 
        ? calculateMonthlyFromYearly(plan.priceYearly)
        : plan.priceMonthly;
    
    // คำนวณส่วนลดรายปี
    const yearlyDiscount = calculateYearlyDiscount(plan);
    
    // ตรวจสอบว่าเป็น plan ปัจจุบันหรือไม่
    const isCurrentPlan = currentPlan === plan.id;
    
    // ตรวจสอบว่าเป็น Free plan หรือไม่
    const isFree = plan.priceMonthly === 0;
    
    // ตรวจสอบว่าเป็น Enterprise (ติดต่อฝ่ายขาย)
    const isEnterprise = plan.priceMonthly === -1;
    
    // สีพื้นหลังตาม plan
    const getBgGradient = () => {
        if (plan.isPopular) {
            return 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-300 dark:border-amber-600';
        }
        switch (plan.id) {
            case 'enterprise':
                return 'bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border-purple-200 dark:border-purple-600';
            case 'starter':
                return 'bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-blue-200 dark:border-blue-600';
            default:
                return 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-600';
        }
    };

    return (
        <div
            className={`relative rounded-2xl border-2 p-6 transition-all duration-300 hover:shadow-xl ${getBgGradient()} ${
                plan.isPopular ? 'ring-2 ring-amber-400 ring-offset-2' : ''
            } ${isCurrentPlan ? 'ring-2 ring-green-500 ring-offset-2' : ''}`}
        >
            {/* Badge */}
            {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold text-white shadow-lg ${
                            plan.isPopular
                                ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                                : 'bg-gradient-to-r from-blue-500 to-cyan-500'
                        }`}
                    >
                        {plan.isPopular && <Crown className="w-3 h-3" />}
                        {plan.badge}
                    </span>
                </div>
            )}

            {/* Current Plan Badge */}
            {isCurrentPlan && (
                <div className="absolute -top-3 right-4">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold text-white bg-green-500 shadow-lg">
                        <Check className="w-3 h-3" />
                        แผนปัจจุบัน
                    </span>
                </div>
            )}

            {/* Header */}
            <div className="text-center mb-6">
                {/* Icon */}
                <div
                    className="inline-flex items-center justify-center w-14 h-14 rounded-xl mb-4"
                    style={{ backgroundColor: `${plan.color}20`, color: plan.color }}
                >
                    {getPlanIcon(plan.id || '')}
                </div>

                {/* Plan Name */}
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">{plan.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{plan.nameTh}</p>
            </div>

            {/* Price */}
            <div className="text-center mb-6">
                {isFree ? (
                    <div className="text-4xl font-bold text-gray-900 dark:text-gray-100">ฟรี</div>
                ) : isEnterprise ? (
                    <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">ติดต่อฝ่ายขาย</div>
                ) : (
                    <>
                        <div className="flex items-baseline justify-center gap-1">
                            <span className="text-4xl font-bold text-gray-900 dark:text-gray-100">
                                {formatPrice(monthlyPrice, 'THB').replace('฿', '')}
                            </span>
                            <span className="text-gray-500 dark:text-gray-400">/เดือน</span>
                        </div>
                        
                        {billingCycle === 'yearly' && yearlyDiscount > 0 && (
                            <div className="mt-2 space-y-1">
                                <div className="text-sm text-gray-500 dark:text-gray-400 line-through">
                                    {formatPrice(plan.priceMonthly * 12, 'THB')}/ปี
                                </div>
                                <div className="text-sm font-medium text-green-600 dark:text-green-400">
                                    {formatPrice(price, 'THB')}/ปี (ประหยัด {yearlyDiscount}%)
                                </div>
                            </div>
                        )}
                        
                        {billingCycle === 'monthly' && yearlyDiscount > 0 && (
                            <div className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                                💡 จ่ายรายปีประหยัด {yearlyDiscount}%
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* CTA Button */}
            <button
                onClick={() => onSelect(plan)}
                disabled={isLoading || isCurrentPlan}
                className={`w-full py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-200 ${
                    isCurrentPlan
                        ? 'bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                        : plan.isPopular
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 shadow-lg hover:shadow-xl'
                        : isEnterprise
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700'
                        : isFree
                        ? 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-slate-600'
                        : 'bg-gray-900 dark:bg-slate-600 text-white hover:bg-gray-800 dark:hover:bg-slate-500'
                } disabled:opacity-50`}
            >
                {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        กำลังดำเนินการ...
                    </span>
                ) : isCurrentPlan ? (
                    'แผนปัจจุบัน'
                ) : isFree ? (
                    'เริ่มใช้งานฟรี'
                ) : isEnterprise ? (
                    'ติดต่อเรา'
                ) : (
                    'เลือกแผนนี้'
                )}
            </button>

            {/* Highlights */}
            <div className="mt-6 space-y-3">
                {plan.highlights.map((highlight, index) => (
                    <div key={index} className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-green-500 dark:text-green-400 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-600 dark:text-gray-300">{highlight}</span>
                    </div>
                ))}
            </div>

            {/* Feature Details */}
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-slate-600">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">รายละเอียด</h4>
                <div className="space-y-2 text-sm">
                    {/* Users */}
                    <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">ผู้ใช้งาน</span>
                        <span className="font-medium text-gray-800 dark:text-gray-200">
                            {plan.maxUsers === -1 ? 'ไม่จำกัด' : `${plan.maxUsers} คน`}
                        </span>
                    </div>
                    
                    {/* Documents */}
                    <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">เอกสาร/เดือน</span>
                        <span className="font-medium text-gray-800 dark:text-gray-200">
                            {plan.maxDocuments === -1 ? 'ไม่จำกัด' : `${plan.maxDocuments} ใบ`}
                        </span>
                    </div>
                    
                    {/* Document Types */}
                    <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">ประเภทเอกสาร</span>
                        <span className="font-medium text-gray-800 dark:text-gray-200">
                            {plan.features.documentAccess === 'full' ? 'ครบทุกประเภท' : 'พื้นฐาน'}
                        </span>
                    </div>
                    
                    {/* Custom Logo */}
                    <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Custom Logo</span>
                        {plan.allowCustomLogo ? (
                            <Check className="w-5 h-5 text-green-500 dark:text-green-400" />
                        ) : (
                            <X className="w-5 h-5 text-red-400 dark:text-red-500" />
                        )}
                    </div>
                    
                    {/* Watermark */}
                    <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">ไม่มีลายน้ำ</span>
                        {!plan.features.hasWatermark ? (
                            <Check className="w-5 h-5 text-green-500 dark:text-green-400" />
                        ) : (
                            <X className="w-5 h-5 text-red-400 dark:text-red-500" />
                        )}
                    </div>
                    
                    {/* CRM */}
                    <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">ฐานข้อมูลลูกค้า</span>
                        <span className="font-medium text-gray-800 dark:text-gray-200">
                            {plan.maxCustomers === -1 ? 'ไม่จำกัด' : `${plan.maxCustomers} ราย`}
                        </span>
                    </div>
                    
                    {/* Contractors */}
                    <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">ช่าง/ผู้รับเหมา</span>
                        <span className="font-medium text-gray-800 dark:text-gray-200">
                            {plan.maxContractors === -1 ? 'ไม่จำกัด' : `${plan.maxContractors} ราย`}
                        </span>
                    </div>
                    
                    {/* PDF Exports */}
                    <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Export PDF</span>
                        <span className="font-medium text-gray-800 dark:text-gray-200">
                            {plan.maxPdfExports === -1 ? 'ไม่จำกัด' : `${plan.maxPdfExports} ครั้ง/เดือน`}
                        </span>
                    </div>
                    
                    {/* History */}
                    <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">ประวัติเอกสาร</span>
                        <span className="font-medium text-gray-800 dark:text-gray-200">
                            {plan.historyRetentionDays === -1 
                                ? 'Audit Log' 
                                : plan.historyRetentionDays >= 365
                                ? `${Math.round(plan.historyRetentionDays / 365)} ปี`
                                : `${plan.historyRetentionDays} วัน`}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PricingCard;

