/**
 * PricingPage Component
 * หน้าแสดง Pricing Plan ทั้ง 4 ระดับ พร้อมตารางเปรียบเทียบ features
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
    ArrowLeft, 
    Check, 
    X, 
    Sparkles, 
    Zap, 
    Shield,
    MessageCircle,
    HelpCircle,
    ExternalLink
} from 'lucide-react';
import { BillingCycle, SubscriptionPlan } from '../types';
import { PlanTemplate, getActivePlanTemplates } from '../services/planTemplates';
import { getStripeMode, isTestMode } from '../services/stripe';
import { useAuth } from '../contexts/AuthContext';
import { useCompany } from '../contexts/CompanyContext';
import { getQuota } from '../services/quota';
import PricingCard from './PricingCard';
import CheckoutModal from './CheckoutModal';
import Header from './Header';

const PricingPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user } = useAuth();
    const { currentCompany } = useCompany();
    
    // State
    const [plans, setPlans] = useState<PlanTemplate[]>([]);
    const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
    const [currentPlan, setCurrentPlan] = useState<SubscriptionPlan>('free');
    const [selectedPlan, setSelectedPlan] = useState<PlanTemplate | null>(null);
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [showCanceledMessage, setShowCanceledMessage] = useState(false);
    
    /**
     * โหลด Plan Templates และ Current Plan
     */
    useEffect(() => {
        const loadData = async () => {
            try {
                setIsLoading(true);
                
                // โหลด Plan Templates
                const planTemplates = await getActivePlanTemplates();
                setPlans(planTemplates);
                
                // โหลด Current Plan ของบริษัท
                if (currentCompany?.id) {
                    const quota = await getQuota(currentCompany.id);
                    if (quota) {
                        setCurrentPlan(quota.plan);
                    }
                }
            } catch (error) {
                console.error('Failed to load plans:', error);
            } finally {
                setIsLoading(false);
            }
        };
        
        loadData();
    }, [currentCompany]);
    
    /**
     * ตรวจสอบ URL params สำหรับ canceled message
     */
    useEffect(() => {
        if (searchParams.get('canceled') === 'true') {
            setShowCanceledMessage(true);
            // ลบ param หลัง 5 วินาที
            setTimeout(() => {
                setShowCanceledMessage(false);
                navigate('/pricing', { replace: true });
            }, 5000);
        }
    }, [searchParams, navigate]);
    
    /**
     * เลือก Plan
     */
    const handleSelectPlan = (plan: PlanTemplate) => {
        // ถ้าเป็น Free plan ให้กลับไปหน้าหลัก
        if (plan.priceMonthly === 0) {
            navigate('/');
            return;
        }
        
        // ถ้าเป็น Enterprise ให้เปิด modal ติดต่อ
        if (plan.priceMonthly === -1) {
            setSelectedPlan(plan);
            setIsCheckoutOpen(true);
            return;
        }
        
        // เปิด Checkout Modal
        setSelectedPlan(plan);
        setIsCheckoutOpen(true);
    };
    
    /**
     * ปิด Checkout Modal
     */
    const handleCloseCheckout = () => {
        setIsCheckoutOpen(false);
        setSelectedPlan(null);
    };
    
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
            <Header />
            
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
                {/* Back Button */}
                <button
                    onClick={() => navigate('/')}
                    className="flex items-center gap-2 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 mb-8 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>กลับหน้าหลัก</span>
                </button>
                
                {/* Canceled Message */}
                {showCanceledMessage && (
                    <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-xl">
                        <p className="text-amber-800 dark:text-amber-300">
                            การชำระเงินถูกยกเลิก คุณสามารถเลือกแผนใหม่ได้อีกครั้ง
                        </p>
                    </div>
                )}
                
                {/* Test Mode Banner */}
                {isTestMode() && (
                    <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center gap-3">
                        <Zap className="w-5 h-5 text-amber-500 dark:text-amber-400" />
                        <div>
                            <p className="font-medium text-amber-800 dark:text-amber-300">โหมดทดสอบ (Test Mode)</p>
                            <p className="text-sm text-amber-600 dark:text-amber-400">
                                Stripe อยู่ในโหมดทดสอบ การชำระเงินจะไม่ถูกเรียกเก็บจริง
                            </p>
                        </div>
                    </div>
                )}
                
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-slate-100 mb-4">
                        เลือกแผนที่เหมาะกับคุณ
                    </h1>
                    <p className="text-lg text-gray-600 dark:text-slate-400 max-w-2xl mx-auto">
                        เริ่มต้นฟรี อัปเกรดได้ทุกเมื่อ ยกเลิกได้ตลอด
                    </p>
                    
                    {/* Billing Cycle Toggle */}
                    <div className="mt-8 inline-flex items-center gap-3 p-1.5 bg-gray-100 dark:bg-slate-700 rounded-xl">
                        <button
                            onClick={() => setBillingCycle('monthly')}
                            className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                                billingCycle === 'monthly'
                                    ? 'bg-white dark:bg-slate-600 text-gray-900 dark:text-slate-100 shadow-sm'
                                    : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200'
                            }`}
                        >
                            รายเดือน
                        </button>
                        <button
                            onClick={() => setBillingCycle('yearly')}
                            className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                                billingCycle === 'yearly'
                                    ? 'bg-white dark:bg-slate-600 text-gray-900 dark:text-slate-100 shadow-sm'
                                    : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200'
                            }`}
                        >
                            รายปี
                            <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 text-xs font-bold rounded-full">
                                -30%
                            </span>
                        </button>
                    </div>
                </div>
                
                {/* Pricing Cards */}
                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-4">
                        {plans.map((plan) => (
                            <PricingCard
                                key={plan.id}
                                plan={plan}
                                billingCycle={billingCycle}
                                currentPlan={currentPlan}
                                onSelect={handleSelectPlan}
                            />
                        ))}
                    </div>
                )}
                
                {/* Features Comparison Table */}
                <div className="mt-16">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 text-center mb-8">
                        เปรียบเทียบรายละเอียดทุกแผน
                    </h2>
                    
                    <div className="overflow-x-auto bg-white dark:bg-slate-800 rounded-xl shadow-lg dark:shadow-slate-900/50">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="border-b-2 border-gray-200 dark:border-slate-700">
                                    <th className="text-left py-4 px-4 font-medium text-gray-500 dark:text-slate-400">
                                        Feature / รายละเอียด
                                    </th>
                                    {plans.map((plan) => (
                                        <th 
                                            key={plan.id}
                                            className="py-4 px-4 text-center"
                                            style={{ minWidth: '150px' }}
                                        >
                                            <span 
                                                className="font-bold text-lg"
                                                style={{ color: plan.color }}
                                            >
                                                {plan.name}
                                            </span>
                                        <div className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                                            {plan.nameTh}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                            {/* Price */}
                            <tr className="bg-gray-50 dark:bg-slate-700/50">
                                <td className="py-3 px-4 font-medium text-gray-700 dark:text-slate-200">
                                    ราคา (รายเดือน)
                                </td>
                            {plans.map((plan) => (
                                    <td key={plan.id} className="py-3 px-4 text-center font-bold text-gray-900 dark:text-slate-100">
                                        {plan.priceMonthly === 0 
                                            ? 'ฟรี' 
                                            : plan.priceMonthly === -1 
                                            ? 'ติดต่อฝ่ายขาย'
                                            : `฿${plan.priceMonthly}`}
                                    </td>
                                ))}
                            </tr>
                            
                            {/* Users */}
                            <tr>
                                <td className="py-3 px-4 text-gray-600 dark:text-slate-300">จำนวนผู้ใช้งาน</td>
                            {plans.map((plan) => (
                                    <td key={plan.id} className="py-3 px-4 text-center text-gray-800 dark:text-slate-200">
                                        {plan.maxUsers === -1 ? 'ไม่จำกัด' : `${plan.maxUsers} คน`}
                                    </td>
                                ))}
                            </tr>
                            
                            {/* Documents */}
                            <tr className="bg-gray-50 dark:bg-slate-700/50">
                                <td className="py-3 px-4 text-gray-600 dark:text-slate-300">เอกสารที่สร้างได้/เดือน</td>
                            {plans.map((plan) => (
                                    <td key={plan.id} className="py-3 px-4 text-center text-gray-800 dark:text-slate-200">
                                        {plan.maxDocuments === -1 ? 'ไม่จำกัด' : `${plan.maxDocuments} ใบ`}
                                    </td>
                                ))}
                            </tr>
                            
                            {/* Document Types */}
                            <tr>
                                <td className="py-3 px-4 text-gray-600 dark:text-slate-300">ประเภทเอกสารที่ใช้ได้</td>
                            {plans.map((plan) => (
                                    <td key={plan.id} className="py-3 px-4 text-center text-sm text-gray-800 dark:text-slate-200">
                                        {plan.features.documentAccess === 'full' 
                                            ? '✅ ครบทุกประเภท' 
                                            : 'พื้นฐาน (ใบเสนอราคา, ใบเสร็จ)'}
                                    </td>
                                ))}
                            </tr>
                            
                            {/* Custom Logo */}
                            <tr className="bg-gray-50 dark:bg-slate-700/50">
                                <td className="py-3 px-4 text-gray-600 dark:text-slate-300">โลโก้บนเอกสาร</td>
                            {plans.map((plan) => (
                                    <td key={plan.id} className="py-3 px-4 text-center">
                                        {plan.allowCustomLogo ? (
                                            <span className="text-green-600 dark:text-green-400">✅ Custom Logo</span>
                                        ) : (
                                            <span className="text-gray-400 dark:text-slate-500">❌ ไม่ได้</span>
                                        )}
                                    </td>
                                ))}
                            </tr>
                            
                            {/* Watermark */}
                            <tr>
                                <td className="py-3 px-4 text-gray-600 dark:text-slate-300">ลายน้ำ (Watermark)</td>
                            {plans.map((plan) => (
                                    <td key={plan.id} className="py-3 px-4 text-center">
                                        {plan.features.hasWatermark ? (
                                            <span className="text-amber-600 dark:text-amber-400">มีลายน้ำ App</span>
                                        ) : (
                                            <span className="text-green-600 dark:text-green-400">❌ ไม่มีลายน้ำ</span>
                                        )}
                                    </td>
                                ))}
                            </tr>
                            
                            {/* CRM */}
                            <tr className="bg-gray-50 dark:bg-slate-700/50">
                                <td className="py-3 px-4 text-gray-600 dark:text-slate-300">ฐานข้อมูลลูกค้า (CRM)</td>
                            {plans.map((plan) => (
                                    <td key={plan.id} className="py-3 px-4 text-center text-gray-800 dark:text-slate-200">
                                        {plan.maxCustomers === -1 ? 'ไม่จำกัด' : `${plan.maxCustomers} ราย`}
                                    </td>
                                ))}
                            </tr>
                            
                            {/* Contractors */}
                            <tr>
                                <td className="py-3 px-4 text-gray-600 dark:text-slate-300">ฐานข้อมูลช่าง/ผู้รับเหมา</td>
                            {plans.map((plan) => (
                                    <td key={plan.id} className="py-3 px-4 text-center text-gray-800 dark:text-slate-200">
                                        {plan.maxContractors === -1 ? 'ไม่จำกัด' : `${plan.maxContractors} ราย`}
                                    </td>
                                ))}
                            </tr>
                            
                            {/* PDF Export */}
                            <tr className="bg-gray-50 dark:bg-slate-700/50">
                                <td className="py-3 px-4 text-gray-600 dark:text-slate-300">ส่งออก PDF</td>
                            {plans.map((plan) => (
                                    <td key={plan.id} className="py-3 px-4 text-center text-gray-800 dark:text-slate-200">
                                        {plan.maxPdfExports === -1 
                                            ? 'ไม่จำกัด' 
                                            : `จำกัด ${plan.maxPdfExports} ครั้ง`}
                                    </td>
                                ))}
                            </tr>
                            
                            {/* History */}
                            <tr>
                                <td className="py-3 px-4 text-gray-600 dark:text-slate-300">ประวัติเอกสาร (Log)</td>
                            {plans.map((plan) => (
                                    <td key={plan.id} className="py-3 px-4 text-center text-gray-800 dark:text-slate-200">
                                        {plan.historyRetentionDays === -1 
                                            ? 'Audit Log เต็มรูปแบบ' 
                                            : plan.historyRetentionDays >= 365
                                            ? `${Math.round(plan.historyRetentionDays / 365)} ปี`
                                            : `${plan.historyRetentionDays} วัน`}
                                    </td>
                                ))}
                            </tr>
                            
                            {/* Reports */}
                            <tr className="bg-gray-50 dark:bg-slate-700/50">
                                <td className="py-3 px-4 text-gray-600 dark:text-slate-300">รายงาน (Dashboard)</td>
                            {plans.map((plan) => (
                                    <td key={plan.id} className="py-3 px-4 text-center text-sm text-gray-800 dark:text-slate-200">
                                        {plan.features.advancedReports 
                                            ? plan.features.auditLog
                                                ? 'Custom Report'
                                                : 'สรุปยอดขาย / แยกตามลูกค้า'
                                            : plan.features.exportExcel
                                            ? 'ยอดรวมรายเดือน'
                                            : '-'}
                                    </td>
                                ))}
                            </tr>
                            
                            {/* Support */}
                            <tr>
                                <td className="py-3 px-4 text-gray-600 dark:text-slate-300">การสนับสนุน (Support)</td>
                            {plans.map((plan) => (
                                    <td key={plan.id} className="py-3 px-4 text-center text-sm text-gray-800 dark:text-slate-200">
                                        {plan.features.dedicatedSupport 
                                            ? 'ผู้ดูแลส่วนตัว (Dedicated)'
                                            : plan.features.lineNotification
                                            ? 'Email + Line OA'
                                            : 'Email'}
                                    </td>
                                ))}
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
                
                {/* FAQ Section */}
                <div className="mt-16 max-w-3xl mx-auto">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 text-center mb-8">
                        คำถามที่พบบ่อย
                    </h2>
                    
                    <div className="space-y-4">
                        <FaqItem 
                            question="สามารถเปลี่ยนแผนได้หรือไม่?"
                            answer="ได้ครับ คุณสามารถอัปเกรดหรือดาวน์เกรดแผนได้ตลอดเวลา โดยระบบจะคำนวณส่วนต่างให้อัตโนมัติ"
                        />
                        <FaqItem 
                            question="รองรับการชำระเงินแบบไหนบ้าง?"
                            answer="รองรับบัตรเครดิต/เดบิต (Visa, Mastercard, JCB) และ PromptPay ผ่านระบบ Stripe ที่ปลอดภัย"
                        />
                        <FaqItem 
                            question="ยกเลิกได้หรือไม่?"
                            answer="ได้ครับ คุณสามารถยกเลิกได้ตลอดเวลา โดยจะยังใช้งานได้จนหมดรอบบิล"
                        />
                        <FaqItem 
                            question="ถ้าเอกสารเกินโควตาจะเป็นอย่างไร?"
                            answer="ระบบจะแจ้งเตือนเมื่อใกล้ถึงโควตา และคุณสามารถอัปเกรดแผนเพื่อเพิ่มโควตาได้ทันที"
                        />
                        <FaqItem 
                            question="มีระยะเวลาทดลองใช้หรือไม่?"
                            answer="Free plan สามารถใช้งานได้ตลอดไป ไม่มีระยะเวลาจำกัด เหมาะสำหรับทดลองใช้งานระบบ"
                        />
                    </div>
                </div>
                
                {/* CTA Section */}
                <div className="mt-16 text-center">
                    <div className="inline-flex flex-col sm:flex-row items-center gap-4 p-6 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/30 dark:to-blue-900/30 rounded-2xl">
                        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                            <MessageCircle className="w-6 h-6" />
                            <span className="font-medium">มีคำถาม?</span>
                        </div>
                        <a
                            href="mailto:support@edoconline.com"
                            className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-slate-700 rounded-xl text-gray-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors shadow-sm"
                        >
                            ติดต่อเรา
                            <ExternalLink className="w-4 h-4" />
                        </a>
                    </div>
                </div>
            </main>
            
            {/* Checkout Modal */}
            {selectedPlan && (
                <CheckoutModal
                    isOpen={isCheckoutOpen}
                    onClose={handleCloseCheckout}
                    plan={selectedPlan}
                />
            )}
        </div>
    );
};

/**
 * FAQ Item Component
 */
interface FaqItemProps {
    question: string;
    answer: string;
}

const FaqItem: React.FC<FaqItemProps> = ({ question, answer }) => {
    const [isOpen, setIsOpen] = useState(false);
    
    return (
        <div className="border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-800">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
                <span className="font-medium text-gray-900 dark:text-slate-100">{question}</span>
                <HelpCircle className={`w-5 h-5 text-gray-400 dark:text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="px-4 pb-4">
                    <p className="text-gray-600 dark:text-slate-300">{answer}</p>
                </div>
            )}
        </div>
    );
};

export default PricingPage;

