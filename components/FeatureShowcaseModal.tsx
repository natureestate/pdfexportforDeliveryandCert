/**
 * Feature Showcase Modal
 * Modal แสดง features ของแอปเพื่อโปรโมทให้ผู้ใช้สนใจสมัครใช้งาน
 * พร้อม motion effects สำหรับความเคลื่อนไหวที่สวยงาม
 */

import React, { useState, useEffect } from 'react';
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
    Package,
    ShieldCheck,
    FileWarning,
    ClipboardList,
    DollarSign,
    ShoppingCart,
    StickyNote,
    RefreshCw,
    Wrench,
    LucideIcon,
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

// ประเภทเอกสารที่รองรับ พร้อม Lucide icons
const documentTypes: { name: string; icon: LucideIcon; color: string }[] = [
    { name: 'ใบส่งมอบงาน', icon: Package, color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/40' },
    { name: 'ใบรับประกัน', icon: ShieldCheck, color: 'text-red-500 bg-red-100 dark:bg-red-900/40' },
    { name: 'ใบแจ้งหนี้', icon: FileText, color: 'text-gray-600 bg-gray-100 dark:bg-gray-700/40' },
    { name: 'ใบเสร็จรับเงิน', icon: Receipt, color: 'text-gray-700 bg-gray-100 dark:bg-gray-700/40' },
    { name: 'ใบกำกับภาษี', icon: ClipboardList, color: 'text-cyan-600 bg-cyan-100 dark:bg-cyan-900/40' },
    { name: 'ใบเสนอราคา', icon: DollarSign, color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/40' },
    { name: 'ใบสั่งซื้อ', icon: ShoppingCart, color: 'text-gray-500 bg-gray-100 dark:bg-gray-700/40' },
    { name: 'บันทึกข้อความ', icon: StickyNote, color: 'text-blue-500 bg-blue-100 dark:bg-blue-900/40' },
    { name: 'ใบสั่งเปลี่ยนแปลง', icon: RefreshCw, color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/40' },
    { name: 'สัญญาจ้างช่าง', icon: Wrench, color: 'text-gray-500 bg-gray-100 dark:bg-gray-700/40' },
];

const FeatureShowcaseModal: React.FC<FeatureShowcaseModalProps> = ({
    isOpen,
    onClose,
    onGetStarted,
}) => {
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);
    const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');

    // Reset animation state เมื่อเปลี่ยน slide
    useEffect(() => {
        if (isAnimating) {
            const timer = setTimeout(() => setIsAnimating(false), 400);
            return () => clearTimeout(timer);
        }
    }, [isAnimating]);

    // Reset slide เมื่อเปิด modal
    useEffect(() => {
        if (isOpen) {
            setCurrentSlide(0);
            setIsAnimating(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    // ฟังก์ชันเปลี่ยน slide พร้อม animation
    const goToSlide = (index: number) => {
        if (index === currentSlide || isAnimating) return;
        setSlideDirection(index > currentSlide ? 'right' : 'left');
        setIsAnimating(true);
        setCurrentSlide(index);
    };

    const nextSlide = () => {
        if (currentSlide < slides.length - 1 && !isAnimating) {
            goToSlide(currentSlide + 1);
        }
    };

    const prevSlide = () => {
        if (currentSlide > 0 && !isAnimating) {
            goToSlide(currentSlide - 1);
        }
    };

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
        // Slide 1: Welcome พร้อม entrance animations
        <div key="welcome" className="text-center px-4">
            <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl animate-float">
                <Sparkles className="w-12 h-12 text-white animate-pulse-gentle" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4 animate-fadeInUp">
                ยินดีต้อนรับสู่ eCert Online
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-md mx-auto animate-fadeInUp" style={{ animationDelay: '100ms' }}>
                ระบบสร้างเอกสารธุรกิจออนไลน์ที่ครบครัน ใช้งานง่าย ปลอดภัย และมืออาชีพ
            </p>
            
            {/* Stats พร้อม staggered animation */}
            <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto mb-8">
                <div className="bg-indigo-50 dark:bg-indigo-900/30 rounded-xl p-4 hover:scale-105 transition-transform duration-300 animate-fadeInUp" style={{ animationDelay: '200ms' }}>
                    <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">10+</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">ประเภทเอกสาร</div>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-900/30 rounded-xl p-4 hover:scale-105 transition-transform duration-300 animate-fadeInUp" style={{ animationDelay: '300ms' }}>
                    <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">24/7</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">ใช้งานได้ตลอด</div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/30 rounded-xl p-4 hover:scale-105 transition-transform duration-300 animate-fadeInUp" style={{ animationDelay: '400ms' }}>
                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">100%</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Cloud-based</div>
                </div>
            </div>
        </div>,

        // Slide 2: Document Types พร้อม Lucide icons และ staggered animation
        <div key="documents" className="px-4">
            <div className="text-center mb-6 animate-fadeInUp">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg animate-bounce-gentle">
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
                {documentTypes.map((doc, idx) => {
                    const IconComponent = doc.icon;
                    const colorParts = doc.color.split(' ');
                    const textColor = colorParts[0];
                    const bgColor = colorParts.slice(1).join(' ');
                    return (
                        <div 
                            key={idx} 
                            className="bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl p-3 text-center hover:shadow-lg hover:scale-105 transition-all duration-300 cursor-pointer group animate-fadeInUp"
                            style={{ animationDelay: `${idx * 80}ms` }}
                        >
                            <div className={`w-10 h-10 ${bgColor} rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform duration-300`}>
                                <IconComponent className={`w-5 h-5 ${textColor}`} />
                            </div>
                            <div className="text-xs font-medium text-gray-700 dark:text-gray-300">{doc.name}</div>
                        </div>
                    );
                })}
            </div>
        </div>,

        // Slide 3: Main Features พร้อม hover และ staggered animations
        <div key="features" className="px-4">
            <div className="text-center mb-6 animate-fadeInUp">
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
                            className="bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl p-4 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group animate-fadeInUp"
                            style={{ animationDelay: `${idx * 100}ms` }}
                        >
                            <div className={`w-12 h-12 ${colors.lightBg} dark:bg-opacity-30 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}>
                                <Icon className={`w-6 h-6 ${colors.text}`} />
                            </div>
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{feature.title}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{feature.description}</p>
                            <div className="space-y-1">
                                {feature.highlights.map((h, i) => (
                                    <div key={i} className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 animate-fadeInUp" style={{ animationDelay: `${(idx * 100) + (i * 50)}ms` }}>
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

        // Slide 4: Additional Features พร้อม animations
        <div key="more" className="px-4">
            <div className="text-center mb-6 animate-fadeInUp">
                <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg animate-pulse-gentle">
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
                            className="bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl p-4 text-center hover:shadow-lg hover:scale-105 transition-all duration-300 group animate-fadeInUp"
                            style={{ animationDelay: `${idx * 80}ms` }}
                        >
                            <div className={`w-10 h-10 ${colors.lightBg} dark:bg-opacity-30 rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:rotate-12 transition-transform duration-300`}>
                                <Icon className={`w-5 h-5 ${colors.text}`} />
                            </div>
                            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">{feature.text}</div>
                        </div>
                    );
                })}
            </div>

            {/* Testimonial พร้อม shimmer effect */}
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 text-white text-center max-w-md mx-auto animate-fadeInUp relative overflow-hidden" style={{ animationDelay: '500ms' }}>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
                <div className="flex justify-center gap-1 mb-3">
                    {[1,2,3,4,5].map(i => <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400 animate-twinkle" style={{ animationDelay: `${i * 100}ms` }} />)}
                </div>
                <p className="text-sm mb-3 opacity-90">
                    "ใช้งานง่ายมาก สร้างเอกสารได้เร็ว ประหยัดเวลาทำงานได้เยอะเลย"
                </p>
                <p className="text-xs opacity-75">— ผู้ใช้งานจริง</p>
            </div>
        </div>,

        // Slide 5: CTA พร้อม entrance และ hover animations
        <div key="cta" className="text-center px-4">
            <div className="w-24 h-24 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl animate-float">
                <Receipt className="w-12 h-12 text-white animate-pulse-gentle" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4 animate-fadeInUp">
                พร้อมเริ่มต้นแล้วหรือยัง?
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-md mx-auto animate-fadeInUp" style={{ animationDelay: '100ms' }}>
                เข้าร่วมกับธุรกิจมากมายที่ใช้ eCert Online ในการสร้างเอกสารมืออาชีพ
            </p>
            
            <div className="space-y-4 max-w-sm mx-auto animate-fadeInUp" style={{ animationDelay: '200ms' }}>
                <button
                    onClick={() => {
                        onClose();
                        onGetStarted?.();
                    }}
                    className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-2xl hover:scale-105 flex items-center justify-center gap-2 relative overflow-hidden group"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                    <Sparkles className="w-5 h-5 animate-pulse-gentle" />
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

    // CSS Keyframes สำหรับ animations (inject ผ่าน style tag)
    const animationStyles = `
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        @keyframes float {
            0%, 100% {
                transform: translateY(0px);
            }
            50% {
                transform: translateY(-10px);
            }
        }
        
        @keyframes pulse-gentle {
            0%, 100% {
                opacity: 1;
            }
            50% {
                opacity: 0.7;
            }
        }
        
        @keyframes bounce-gentle {
            0%, 100% {
                transform: translateY(0);
            }
            50% {
                transform: translateY(-5px);
            }
        }
        
        @keyframes shimmer {
            0% {
                transform: translateX(-100%);
            }
            100% {
                transform: translateX(100%);
            }
        }
        
        @keyframes twinkle {
            0%, 100% {
                transform: scale(1);
                opacity: 1;
            }
            50% {
                transform: scale(1.2);
                opacity: 0.8;
            }
        }
        
        @keyframes slideInFromRight {
            from {
                opacity: 0;
                transform: translateX(30px);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }
        
        @keyframes slideInFromLeft {
            from {
                opacity: 0;
                transform: translateX(-30px);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }
        
        @keyframes modalEnter {
            from {
                opacity: 0;
                transform: scale(0.95) translateY(10px);
            }
            to {
                opacity: 1;
                transform: scale(1) translateY(0);
            }
        }
        
        .animate-fadeInUp {
            animation: fadeInUp 0.5s ease-out forwards;
            opacity: 0;
        }
        
        .animate-float {
            animation: float 3s ease-in-out infinite;
        }
        
        .animate-pulse-gentle {
            animation: pulse-gentle 2s ease-in-out infinite;
        }
        
        .animate-bounce-gentle {
            animation: bounce-gentle 2s ease-in-out infinite;
        }
        
        .animate-shimmer {
            animation: shimmer 3s ease-in-out infinite;
        }
        
        .animate-twinkle {
            animation: twinkle 1.5s ease-in-out infinite;
        }
        
        .animate-slideInRight {
            animation: slideInFromRight 0.4s ease-out forwards;
        }
        
        .animate-slideInLeft {
            animation: slideInFromLeft 0.4s ease-out forwards;
        }
        
        .animate-modalEnter {
            animation: modalEnter 0.3s ease-out forwards;
        }
    `;

    return (
        <>
            {/* Inject animation styles */}
            <style>{animationStyles}</style>
            
            <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
                <div className="bg-gray-50 dark:bg-slate-800 rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-modalEnter">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center animate-pulse-gentle">
                                <Sparkles className="w-4 h-4 text-white" />
                            </div>
                            <span className="font-semibold text-gray-900 dark:text-white">eCert Online</span>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full transition-all duration-300 hover:rotate-90"
                        >
                            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                        </button>
                    </div>

                    {/* Content พร้อม slide transition */}
                    <div className="flex-1 overflow-y-auto py-8 relative">
                        <div 
                            key={currentSlide}
                            className={isAnimating ? (slideDirection === 'right' ? 'animate-slideInRight' : 'animate-slideInLeft') : ''}
                        >
                            {slides[currentSlide]}
                        </div>
                    </div>

                    {/* Footer Navigation พร้อม hover effects */}
                    <div className="p-4 border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                        <div className="flex items-center justify-between">
                            <button
                                onClick={prevSlide}
                                disabled={currentSlide === 0 || isAnimating}
                                className="flex items-center gap-1 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300 hover:-translate-x-1"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                <span className="hidden sm:inline">ก่อนหน้า</span>
                            </button>

                            {/* Dots พร้อม animation */}
                            <div className="flex items-center gap-2">
                                {slides.map((_, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => goToSlide(idx)}
                                        disabled={isAnimating}
                                        className={`h-2.5 rounded-full transition-all duration-300 ${
                                            currentSlide === idx 
                                                ? 'bg-indigo-600 w-6' 
                                                : 'bg-gray-300 dark:bg-slate-600 hover:bg-gray-400 dark:hover:bg-slate-500 w-2.5 hover:scale-125'
                                        }`}
                                    />
                                ))}
                            </div>

                            {currentSlide < totalSlides - 1 ? (
                                <button
                                    onClick={nextSlide}
                                    disabled={isAnimating}
                                    className="flex items-center gap-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all duration-300 hover:translate-x-1 hover:shadow-lg disabled:opacity-50"
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
                                    className="flex items-center gap-1 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg hover:from-emerald-600 hover:to-teal-600 transition-all duration-300 hover:scale-105 hover:shadow-lg"
                                >
                                    <span>เริ่มเลย</span>
                                    <Sparkles className="w-4 h-4 animate-pulse-gentle" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default FeatureShowcaseModal;

