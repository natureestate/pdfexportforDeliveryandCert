/**
 * Feature Showcase Modal
 * Modal แสดง features ของแอปเพื่อโปรโมทให้ผู้ใช้สนใจสมัครใช้งาน
 */

import React, { useState } from 'react';
import {
    X,
    FileText,
    Shield,
    Users,
    Palette,
    BarChart3,
    Cloud,
    Smartphone,
    Globe,
    Zap,
    CheckCircle2,
    ArrowRight,
    ArrowLeft,
    Sparkles,
    Building2,
    Receipt,
    FileCheck,
    Clock,
    Lock,
    Star,
} from 'lucide-react';

interface FeatureShowcaseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onGetStarted?: () => void;
}

// ข้อมูล Features หลัก
const mainFeatures = [
    {
        icon: FileText,
        title: 'สร้างเอกสารมืออาชีพ',
        description: 'สร้างใบส่งมอบงาน, ใบเสนอราคา, ใบแจ้งหนี้, ใบเสร็จ และเอกสารธุรกิจอื่นๆ ได้ง่ายๆ',
        color: 'indigo',
        highlights: ['10+ ประเภทเอกสาร', 'ออกแบบสวยงาม', 'Export PDF คุณภาพสูง'],
    },
    {
        icon: Building2,
        title: 'จัดการหลายองค์กร',
        description: 'รองรับการทำงานกับหลายบริษัท สลับองค์กรได้ง่าย พร้อมโลโก้และข้อมูลแยกกัน',
        color: 'emerald',
        highlights: ['สลับองค์กรได้ทันที', 'โลโก้แยกแต่ละองค์กร', 'ข้อมูลเป็นส่วนตัว'],
    },
    {
        icon: Users,
        title: 'ทำงานเป็นทีม',
        description: 'เชิญสมาชิกเข้าร่วมองค์กร กำหนดบทบาท Admin/Member จัดการสิทธิ์ได้ละเอียด',
        color: 'blue',
        highlights: ['เชิญสมาชิกง่ายๆ', 'กำหนดบทบาท', 'Join Code สะดวก'],
    },
    {
        icon: BarChart3,
        title: 'Dashboard & รายงาน',
        description: 'ดูสถิติเอกสาร รายได้ ค่าใช้จ่าย และแนวโน้มธุรกิจได้แบบ Real-time',
        color: 'purple',
        highlights: ['สถิติแบบ Real-time', 'กราฟแนวโน้ม', 'ตั้งเป้าหมาย'],
    },
];

// ข้อมูล Features เพิ่มเติม
const additionalFeatures = [
    { icon: Palette, text: 'ปรับแต่งโลโก้และธีม', color: 'pink' },
    { icon: Globe, text: 'รองรับ 2 ภาษา (TH/EN)', color: 'cyan' },
    { icon: Smartphone, text: 'ใช้งานได้ทุกอุปกรณ์', color: 'orange' },
    { icon: Cloud, text: 'ข้อมูลปลอดภัยบน Cloud', color: 'sky' },
    { icon: Clock, text: 'ประวัติเอกสารครบถ้วน', color: 'amber' },
    { icon: Lock, text: 'เข้าสู่ระบบปลอดภัย', color: 'red' },
];

// ประเภทเอกสารที่รองรับ
const documentTypes = [
    { name: 'ใบส่งมอบงาน', icon: '📦' },
    { name: 'ใบรับประกัน', icon: '🛡️' },
    { name: 'ใบแจ้งหนี้', icon: '📄' },
    { name: 'ใบเสร็จรับเงิน', icon: '🧾' },
    { name: 'ใบกำกับภาษี', icon: '📋' },
    { name: 'ใบเสนอราคา', icon: '💰' },
    { name: 'ใบสั่งซื้อ', icon: '🛒' },
    { name: 'บันทึกข้อความ', icon: '📝' },
    { name: 'ใบสั่งเปลี่ยนแปลง', icon: '🔄' },
    { name: 'สัญญาจ้างช่าง', icon: '🔧' },
];

const FeatureShowcaseModal: React.FC<FeatureShowcaseModalProps> = ({
    isOpen,
    onClose,
    onGetStarted,
}) => {
    const [currentSlide, setCurrentSlide] = useState(0);

    if (!isOpen) return null;

    const getColorClasses = (color: string) => {
        const colors: Record<string, { bg: string; text: string; lightBg: string }> = {
            indigo: { bg: 'bg-indigo-500', text: 'text-indigo-600', lightBg: 'bg-indigo-100' },
            emerald: { bg: 'bg-emerald-500', text: 'text-emerald-600', lightBg: 'bg-emerald-100' },
            blue: { bg: 'bg-blue-500', text: 'text-blue-600', lightBg: 'bg-blue-100' },
            purple: { bg: 'bg-purple-500', text: 'text-purple-600', lightBg: 'bg-purple-100' },
            pink: { bg: 'bg-pink-500', text: 'text-pink-600', lightBg: 'bg-pink-100' },
            cyan: { bg: 'bg-cyan-500', text: 'text-cyan-600', lightBg: 'bg-cyan-100' },
            orange: { bg: 'bg-orange-500', text: 'text-orange-600', lightBg: 'bg-orange-100' },
            sky: { bg: 'bg-sky-500', text: 'text-sky-600', lightBg: 'bg-sky-100' },
            amber: { bg: 'bg-amber-500', text: 'text-amber-600', lightBg: 'bg-amber-100' },
            red: { bg: 'bg-red-500', text: 'text-red-600', lightBg: 'bg-red-100' },
        };
        return colors[color] || colors.indigo;
    };

    const slides = [
        // Slide 1: Welcome
        <div key="welcome" className="text-center px-4">
            <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                <Sparkles className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                ยินดีต้อนรับสู่ eCert Online
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-md mx-auto">
                ระบบสร้างเอกสารธุรกิจออนไลน์ที่ครบครัน ใช้งานง่าย ปลอดภัย และมืออาชีพ
            </p>
            
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto mb-8">
                <div className="bg-indigo-50 dark:bg-indigo-900/30 rounded-xl p-4">
                    <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">10+</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">ประเภทเอกสาร</div>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-900/30 rounded-xl p-4">
                    <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">24/7</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">ใช้งานได้ตลอด</div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/30 rounded-xl p-4">
                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">100%</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Cloud-based</div>
                </div>
            </div>
        </div>,

        // Slide 2: Document Types
        <div key="documents" className="px-4">
            <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <FileCheck className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    รองรับเอกสารครบทุกประเภท
                </h2>
                <p className="text-gray-600 dark:text-gray-300">
                    สร้างเอกสารธุรกิจได้มากกว่า 10 ประเภท
                </p>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 max-w-2xl mx-auto">
                {documentTypes.map((doc, idx) => (
                    <div 
                        key={idx} 
                        className="bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl p-3 text-center hover:shadow-md transition-shadow"
                    >
                        <div className="text-2xl mb-1">{doc.icon}</div>
                        <div className="text-xs font-medium text-gray-700 dark:text-gray-300">{doc.name}</div>
                    </div>
                ))}
            </div>
        </div>,

        // Slide 3: Main Features
        <div key="features" className="px-4">
            <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    ฟีเจอร์ที่ทรงพลัง
                </h2>
                <p className="text-gray-600 dark:text-gray-300">
                    ออกแบบมาเพื่อธุรกิจของคุณโดยเฉพาะ
                </p>
            </div>
            
            <div className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
                {mainFeatures.map((feature, idx) => {
                    const colors = getColorClasses(feature.color);
                    const Icon = feature.icon;
                    return (
                        <div 
                            key={idx} 
                            className="bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl p-4 hover:shadow-lg transition-shadow"
                        >
                            <div className={`w-12 h-12 ${colors.lightBg} dark:bg-opacity-30 rounded-xl flex items-center justify-center mb-3`}>
                                <Icon className={`w-6 h-6 ${colors.text}`} />
                            </div>
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{feature.title}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{feature.description}</p>
                            <div className="space-y-1">
                                {feature.highlights.map((h, i) => (
                                    <div key={i} className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                        <CheckCircle2 className={`w-3.5 h-3.5 ${colors.text}`} />
                                        <span>{h}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>,

        // Slide 4: Additional Features
        <div key="more" className="px-4">
            <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <Zap className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    และอีกมากมาย...
                </h2>
                <p className="text-gray-600 dark:text-gray-300">
                    ฟีเจอร์เสริมที่ทำให้การทำงานง่ายขึ้น
                </p>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-xl mx-auto mb-8">
                {additionalFeatures.map((feature, idx) => {
                    const colors = getColorClasses(feature.color);
                    const Icon = feature.icon;
                    return (
                        <div 
                            key={idx} 
                            className="bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl p-4 text-center hover:shadow-md transition-shadow"
                        >
                            <div className={`w-10 h-10 ${colors.lightBg} dark:bg-opacity-30 rounded-lg flex items-center justify-center mx-auto mb-2`}>
                                <Icon className={`w-5 h-5 ${colors.text}`} />
                            </div>
                            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">{feature.text}</div>
                        </div>
                    );
                })}
            </div>

            {/* Testimonial */}
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 text-white text-center max-w-md mx-auto">
                <div className="flex justify-center gap-1 mb-3">
                    {[1,2,3,4,5].map(i => <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />)}
                </div>
                <p className="text-sm mb-3 opacity-90">
                    "ใช้งานง่ายมาก สร้างเอกสารได้เร็ว ประหยัดเวลาทำงานได้เยอะเลย"
                </p>
                <p className="text-xs opacity-75">— ผู้ใช้งานจริง</p>
            </div>
        </div>,

        // Slide 5: CTA
        <div key="cta" className="text-center px-4">
            <div className="w-24 h-24 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                <Receipt className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                พร้อมเริ่มต้นแล้วหรือยัง?
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-md mx-auto">
                เข้าร่วมกับธุรกิจมากมายที่ใช้ eCert Online ในการสร้างเอกสารมืออาชีพ
            </p>
            
            <div className="space-y-4 max-w-sm mx-auto">
                <button
                    onClick={() => {
                        onClose();
                        onGetStarted?.();
                    }}
                    className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                >
                    <Sparkles className="w-5 h-5" />
                    เริ่มต้นใช้งานเลย
                </button>
                
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    มีคำถาม? ติดต่อเราได้ที่{' '}
                    <a href="mailto:info@natureestate.co.th" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                        info@natureestate.co.th
                    </a>
                </p>
            </div>
        </div>,
    ];

    const totalSlides = slides.length;

    return (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-50 dark:bg-slate-800 rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-semibold text-gray-900 dark:text-white">eCert Online</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto py-8">
                    {slides[currentSlide]}
                </div>

                {/* Footer Navigation */}
                <div className="p-4 border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => setCurrentSlide(prev => Math.max(0, prev - 1))}
                            disabled={currentSlide === 0}
                            className="flex items-center gap-1 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span className="hidden sm:inline">ก่อนหน้า</span>
                        </button>

                        {/* Dots */}
                        <div className="flex items-center gap-2">
                            {slides.map((_, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setCurrentSlide(idx)}
                                    className={`w-2.5 h-2.5 rounded-full transition-all ${
                                        currentSlide === idx 
                                            ? 'bg-indigo-600 w-6' 
                                            : 'bg-gray-300 dark:bg-slate-600 hover:bg-gray-400 dark:hover:bg-slate-500'
                                    }`}
                                />
                            ))}
                        </div>

                        {currentSlide < totalSlides - 1 ? (
                            <button
                                onClick={() => setCurrentSlide(prev => Math.min(totalSlides - 1, prev + 1))}
                                className="flex items-center gap-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                            >
                                <span className="hidden sm:inline">ถัดไป</span>
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        ) : (
                            <button
                                onClick={() => {
                                    onClose();
                                    onGetStarted?.();
                                }}
                                className="flex items-center gap-1 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg hover:from-emerald-600 hover:to-teal-600 transition-colors"
                            >
                                <span>เริ่มเลย</span>
                                <Sparkles className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FeatureShowcaseModal;

