/**
 * UserGuidePage - หน้าคู่มือการใช้งานระบบ
 * แสดงคำแนะนำการใช้งานทั้งหมดแบบ Multi-section พร้อม Sidebar นำทาง
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    BookOpen,
    ChevronRight,
    ChevronDown,
    Home,
    FileText,
    Settings,
    Users,
    Zap,
    LogIn,
    Building2,
    UserPlus,
    LayoutDashboard,
    Package,
    Shield,
    Receipt,
    FileCheck,
    DollarSign,
    ShoppingCart,
    StickyNote,
    HardHat,
    PlusCircle,
    Edit2,
    Eye,
    Download,
    Copy,
    Lock,
    Unlock,
    Archive,
    History,
    Share2,
    GitBranch,
    XCircle,
    RotateCcw,
    Palette,
    ImageIcon,
    Menu as MenuIcon,
    LayoutGrid,
    Moon,
    Sun,
    Globe,
    Crown,
    User,
    BarChart3,
    Sparkles,
    Mail,
    Lightbulb,
    HelpCircle,
    ArrowLeft,
    Search,
    X,
    CheckCircle,
    AlertCircle,
    Info
} from 'lucide-react';

// ============================================================
// Types
// ============================================================

interface GuideSection {
    id: string;
    title: string;
    icon: React.ReactNode;
    subsections: GuideSubsection[];
}

interface GuideSubsection {
    id: string;
    title: string;
    content: React.ReactNode;
}

// ============================================================
// Guide Content Data
// ============================================================

const guideSections: GuideSection[] = [
    {
        id: 'getting-started',
        title: 'เริ่มต้นใช้งาน',
        icon: <Home className="w-5 h-5" />,
        subsections: [
            {
                id: 'login',
                title: 'การ Login เข้าสู่ระบบ',
                content: (
                    <div className="space-y-4">
                        <p className="text-gray-600 dark:text-gray-300">
                            ระบบรองรับการเข้าสู่ระบบหลายวิธี เพื่อความสะดวกของผู้ใช้งาน
                        </p>
                        <div className="grid gap-4 md:grid-cols-3">
                            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="p-2 bg-blue-500 rounded-lg">
                                        <svg className="w-5 h-5 text-white" viewBox="0 0 24 24">
                                            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                        </svg>
                                    </div>
                                    <h4 className="font-semibold text-blue-800 dark:text-blue-200">Google</h4>
                                </div>
                                <p className="text-sm text-blue-700 dark:text-blue-300">เข้าสู่ระบบด้วยบัญชี Google ของคุณ รวดเร็วและปลอดภัย</p>
                            </div>
                            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="p-2 bg-purple-500 rounded-lg">
                                        <Mail className="w-5 h-5 text-white" />
                                    </div>
                                    <h4 className="font-semibold text-purple-800 dark:text-purple-200">Email</h4>
                                </div>
                                <p className="text-sm text-purple-700 dark:text-purple-300">ใช้ Email และรหัสผ่านในการเข้าสู่ระบบ</p>
                            </div>
                            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="p-2 bg-green-500 rounded-lg">
                                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                        </svg>
                                    </div>
                                    <h4 className="font-semibold text-green-800 dark:text-green-200">Phone</h4>
                                </div>
                                <p className="text-sm text-green-700 dark:text-green-300">ยืนยันตัวตนด้วยเบอร์โทรศัพท์และ OTP</p>
                            </div>
                        </div>
                        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                            <div className="flex items-start gap-2">
                                <Lightbulb className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                                <div>
                                    <h4 className="font-semibold text-amber-800 dark:text-amber-200">เคล็ดลับ</h4>
                                    <p className="text-sm text-amber-700 dark:text-amber-300">คุณสามารถเชื่อมโยงหลายวิธีการ Login เข้ากับบัญชีเดียวกันได้ ไปที่ "เชื่อมต่อบัญชี" ในเมนูผู้ใช้</p>
                                </div>
                            </div>
                        </div>
                    </div>
                ),
            },
            {
                id: 'create-org',
                title: 'การสร้างองค์กรใหม่',
                content: (
                    <div className="space-y-4">
                        <p className="text-gray-600 dark:text-gray-300">
                            หลังจาก Login เข้าสู่ระบบครั้งแรก คุณจะถูกนำไปยังหน้าสร้างองค์กร หรือเข้าร่วมองค์กรที่มีอยู่
                        </p>
                        <div className="space-y-3">
                            <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 font-bold">1</div>
                                <div>
                                    <h4 className="font-semibold text-gray-800 dark:text-gray-100">กรอกชื่อองค์กร</h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">ใส่ชื่อบริษัท/องค์กรของคุณ</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 font-bold">2</div>
                                <div>
                                    <h4 className="font-semibold text-gray-800 dark:text-gray-100">กรอกข้อมูลเพิ่มเติม (ไม่บังคับ)</h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">ที่อยู่, เบอร์โทร, อีเมล - สามารถแก้ไขภายหลังได้</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 font-bold">3</div>
                                <div>
                                    <h4 className="font-semibold text-gray-800 dark:text-gray-100">กดสร้างองค์กร</h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">คุณจะเป็น Admin ขององค์กรโดยอัตโนมัติ</p>
                                </div>
                            </div>
                        </div>
                    </div>
                ),
            },
            {
                id: 'join-org',
                title: 'การเข้าร่วมองค์กร',
                content: (
                    <div className="space-y-4">
                        <p className="text-gray-600 dark:text-gray-300">
                            หากต้องการเข้าร่วมองค์กรที่มีอยู่แล้ว สามารถทำได้ 2 วิธี
                        </p>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="p-4 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg border border-cyan-200 dark:border-cyan-800">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="p-2 bg-cyan-500 rounded-lg">
                                        <UserPlus className="w-5 h-5 text-white" />
                                    </div>
                                    <h4 className="font-semibold text-cyan-800 dark:text-cyan-200">รับคำเชิญ</h4>
                                </div>
                                <p className="text-sm text-cyan-700 dark:text-cyan-300 mb-2">Admin ขององค์กรส่งคำเชิญมาทาง Email</p>
                                <ul className="text-sm text-cyan-600 dark:text-cyan-400 space-y-1">
                                    <li>• คลิกลิงก์ในอีเมล</li>
                                    <li>• Login เข้าสู่ระบบ</li>
                                    <li>• ยืนยันเข้าร่วมองค์กร</li>
                                </ul>
                            </div>
                            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="p-2 bg-emerald-500 rounded-lg">
                                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                                        </svg>
                                    </div>
                                    <h4 className="font-semibold text-emerald-800 dark:text-emerald-200">ใช้รหัสองค์กร</h4>
                                </div>
                                <p className="text-sm text-emerald-700 dark:text-emerald-300 mb-2">ขอรหัสจาก Admin แล้วกรอกเข้าระบบ</p>
                                <ul className="text-sm text-emerald-600 dark:text-emerald-400 space-y-1">
                                    <li>• ไปที่ "เข้าร่วมองค์กร"</li>
                                    <li>• กรอกรหัส 6 หลัก</li>
                                    <li>• รอ Admin อนุมัติ</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                ),
            },
            {
                id: 'dashboard',
                title: 'ภาพรวมหน้าหลัก (Dashboard)',
                content: (
                    <div className="space-y-4">
                        <p className="text-gray-600 dark:text-gray-300">
                            หน้า Dashboard แสดงข้อมูลสถิติและภาพรวมของเอกสารทั้งหมดในองค์กร
                        </p>
                        <div className="grid gap-3 md:grid-cols-2">
                            <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                                <BarChart3 className="w-5 h-5 text-indigo-500 mt-0.5" />
                                <div>
                                    <h4 className="font-semibold text-gray-800 dark:text-gray-100">สถิติเอกสาร</h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">ดูจำนวนเอกสารแยกตามประเภท</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                                <DollarSign className="w-5 h-5 text-green-500 mt-0.5" />
                                <div>
                                    <h4 className="font-semibold text-gray-800 dark:text-gray-100">ยอดรวม</h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">ดูยอดรวมจากใบแจ้งหนี้ ใบเสร็จ</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                                <History className="w-5 h-5 text-purple-500 mt-0.5" />
                                <div>
                                    <h4 className="font-semibold text-gray-800 dark:text-gray-100">กิจกรรมล่าสุด</h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">ดูการทำงานล่าสุดของทีม</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                                <Zap className="w-5 h-5 text-amber-500 mt-0.5" />
                                <div>
                                    <h4 className="font-semibold text-gray-800 dark:text-gray-100">Quick Actions</h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">สร้างเอกสารได้รวดเร็ว</p>
                                </div>
                            </div>
                        </div>
                    </div>
                ),
            },
        ],
    },
    {
        id: 'documents',
        title: 'การจัดการเอกสาร',
        icon: <FileText className="w-5 h-5" />,
        subsections: [
            {
                id: 'doc-types',
                title: 'ประเภทเอกสารทั้งหมด',
                content: (
                    <div className="space-y-4">
                        <p className="text-gray-600 dark:text-gray-300">
                            ระบบรองรับเอกสารทางธุรกิจ 10 ประเภท
                        </p>
                        <div className="grid gap-3 md:grid-cols-2">
                            {[
                                { icon: <Package className="w-4 h-4" />, name: 'ใบส่งมอบงาน', desc: 'Delivery Note', color: 'blue' },
                                { icon: <Shield className="w-4 h-4" />, name: 'ใบรับประกัน', desc: 'Warranty Card', color: 'purple' },
                                { icon: <FileText className="w-4 h-4" />, name: 'ใบแจ้งหนี้', desc: 'Invoice', color: 'green' },
                                { icon: <Receipt className="w-4 h-4" />, name: 'ใบเสร็จรับเงิน', desc: 'Receipt', color: 'emerald' },
                                { icon: <FileCheck className="w-4 h-4" />, name: 'ใบกำกับภาษี', desc: 'Tax Invoice', color: 'teal' },
                                { icon: <DollarSign className="w-4 h-4" />, name: 'ใบเสนอราคา', desc: 'Quotation', color: 'amber' },
                                { icon: <ShoppingCart className="w-4 h-4" />, name: 'ใบสั่งซื้อ', desc: 'Purchase Order', color: 'orange' },
                                { icon: <StickyNote className="w-4 h-4" />, name: 'บันทึกข้อความ', desc: 'Memo', color: 'pink' },
                                { icon: <PlusCircle className="w-4 h-4" />, name: 'ใบส่วนต่าง', desc: 'Variation Order', color: 'rose' },
                                { icon: <HardHat className="w-4 h-4" />, name: 'สัญญาจ้างเหมา', desc: 'Subcontract', color: 'indigo' },
                            ].map((doc, index) => (
                                <div key={index} className={`flex items-center gap-3 p-3 bg-${doc.color}-50 dark:bg-${doc.color}-900/20 rounded-lg border border-${doc.color}-200 dark:border-${doc.color}-800`}>
                                    <div className={`p-2 bg-${doc.color}-500 rounded-lg text-white`}>
                                        {doc.icon}
                                    </div>
                                    <div>
                                        <h4 className={`font-semibold text-${doc.color}-800 dark:text-${doc.color}-200`}>{doc.name}</h4>
                                        <p className={`text-xs text-${doc.color}-600 dark:text-${doc.color}-400`}>{doc.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ),
            },
            {
                id: 'create-doc',
                title: 'การสร้างเอกสารใหม่',
                content: (
                    <div className="space-y-4">
                        <p className="text-gray-600 dark:text-gray-300">
                            ขั้นตอนการสร้างเอกสารใหม่
                        </p>
                        <div className="space-y-3">
                            <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400 font-bold">1</div>
                                <div>
                                    <h4 className="font-semibold text-gray-800 dark:text-gray-100">เลือกประเภทเอกสาร</h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">คลิกที่ Tab เอกสารที่ต้องการ (เช่น ใบส่งมอบงาน, ใบแจ้งหนี้)</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400 font-bold">2</div>
                                <div>
                                    <h4 className="font-semibold text-gray-800 dark:text-gray-100">กรอกข้อมูลเอกสาร</h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">กรอกรายละเอียดในฟอร์ม เลขที่เอกสารจะถูกสร้างอัตโนมัติ</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400 font-bold">3</div>
                                <div>
                                    <h4 className="font-semibold text-gray-800 dark:text-gray-100">ดูตัวอย่างและบันทึก</h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">ตรวจสอบตัวอย่างเอกสารทางขวา แล้วกดบันทึก</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                            <div className="flex items-start gap-2">
                                <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                                <div>
                                    <h4 className="font-semibold text-blue-800 dark:text-blue-200">เลขที่เอกสารอัตโนมัติ</h4>
                                    <p className="text-sm text-blue-700 dark:text-blue-300">รูปแบบ: PREFIX-YYMMDDXX เช่น DN-25010901 (ใบส่งมอบงานวันที่ 9 ม.ค. 68 ฉบับที่ 1)</p>
                                </div>
                            </div>
                        </div>
                    </div>
                ),
            },
            {
                id: 'edit-doc',
                title: 'การแก้ไขเอกสาร',
                content: (
                    <div className="space-y-4">
                        <p className="text-gray-600 dark:text-gray-300">
                            วิธีการแก้ไขเอกสารที่บันทึกไว้แล้ว
                        </p>
                        <div className="space-y-3">
                            <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                                <Edit2 className="w-5 h-5 text-amber-500 mt-0.5" />
                                <div>
                                    <h4 className="font-semibold text-gray-800 dark:text-gray-100">1. ไปที่ประวัติเอกสาร</h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">คลิกแท็บ "ประวัติ" ด้านล่างของหน้า</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                                <Search className="w-5 h-5 text-amber-500 mt-0.5" />
                                <div>
                                    <h4 className="font-semibold text-gray-800 dark:text-gray-100">2. ค้นหาเอกสาร</h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">ใช้ช่องค้นหาหรือเลื่อนหารายการที่ต้องการ</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                                <Edit2 className="w-5 h-5 text-amber-500 mt-0.5" />
                                <div>
                                    <h4 className="font-semibold text-gray-800 dark:text-gray-100">3. กดปุ่มแก้ไข</h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">ข้อมูลจะโหลดขึ้นมาในฟอร์ม พร้อมแก้ไขและบันทึกใหม่</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                            <div className="flex items-start gap-2">
                                <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400 mt-0.5" />
                                <div>
                                    <h4 className="font-semibold text-orange-800 dark:text-orange-200">ข้อควรระวัง</h4>
                                    <p className="text-sm text-orange-700 dark:text-orange-300">เอกสารที่ถูก Lock จะไม่สามารถแก้ไขได้ ต้อง Unlock ก่อน</p>
                                </div>
                            </div>
                        </div>
                    </div>
                ),
            },
            {
                id: 'preview-download',
                title: 'การดูตัวอย่างและดาวน์โหลด',
                content: (
                    <div className="space-y-4">
                        <p className="text-gray-600 dark:text-gray-300">
                            ดูตัวอย่างเอกสารและดาวน์โหลดในรูปแบบต่างๆ
                        </p>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                <div className="flex items-center gap-2 mb-2">
                                    <Eye className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                    <h4 className="font-semibold text-blue-800 dark:text-blue-200">Preview</h4>
                                </div>
                                <p className="text-sm text-blue-700 dark:text-blue-300">คลิกที่เลขที่เอกสารหรือปุ่ม "ดูตัวอย่าง" เพื่อเปิด Modal แสดงเอกสาร</p>
                            </div>
                            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                                <div className="flex items-center gap-2 mb-2">
                                    <Download className="w-5 h-5 text-red-600 dark:text-red-400" />
                                    <h4 className="font-semibold text-red-800 dark:text-red-200">PDF</h4>
                                </div>
                                <p className="text-sm text-red-700 dark:text-red-300">กดปุ่ม PDF เพื่อดาวน์โหลดเอกสารในรูปแบบ PDF</p>
                            </div>
                            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                                <div className="flex items-center gap-2 mb-2">
                                    <ImageIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                    <h4 className="font-semibold text-emerald-800 dark:text-emerald-200">PNG</h4>
                                </div>
                                <p className="text-sm text-emerald-700 dark:text-emerald-300">กดปุ่ม PNG เพื่อดาวน์โหลดเป็นรูปภาพ</p>
                            </div>
                        </div>
                    </div>
                ),
            },
        ],
    },
    {
        id: 'doc-features',
        title: 'ฟีเจอร์เอกสาร',
        icon: <Zap className="w-5 h-5" />,
        subsections: [
            {
                id: 'copy',
                title: 'Copy เอกสาร',
                content: (
                    <div className="space-y-4">
                        <p className="text-gray-600 dark:text-gray-300">
                            สร้างเอกสารใหม่จากเอกสารที่มีอยู่ ช่วยประหยัดเวลาในการกรอกข้อมูลซ้ำ
                        </p>
                        <div className="flex items-start gap-3 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
                            <Copy className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                            <div>
                                <h4 className="font-semibold text-indigo-800 dark:text-indigo-200">วิธีใช้งาน</h4>
                                <ul className="text-sm text-indigo-700 dark:text-indigo-300 mt-2 space-y-1">
                                    <li>1. ไปที่ประวัติเอกสาร</li>
                                    <li>2. คลิกเมนู ... (More options)</li>
                                    <li>3. เลือก "Copy เอกสาร"</li>
                                    <li>4. ระบบจะโหลดข้อมูลพร้อมเลขที่เอกสารใหม่</li>
                                    <li>5. แก้ไขข้อมูลตามต้องการและบันทึก</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                ),
            },
            {
                id: 'lock',
                title: 'Lock/Unlock เอกสาร',
                content: (
                    <div className="space-y-4">
                        <p className="text-gray-600 dark:text-gray-300">
                            ล็อกเอกสารเพื่อป้องกันการแก้ไขโดยไม่ตั้งใจ
                        </p>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                                <div className="flex items-center gap-2 mb-2">
                                    <Lock className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                                    <h4 className="font-semibold text-orange-800 dark:text-orange-200">Lock</h4>
                                </div>
                                <ul className="text-sm text-orange-700 dark:text-orange-300 space-y-1">
                                    <li>• เอกสารจะไม่สามารถแก้ไขได้</li>
                                    <li>• ปุ่ม "แก้ไข" จะถูก disable</li>
                                    <li>• แสดง badge "Locked"</li>
                                </ul>
                            </div>
                            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                                <div className="flex items-center gap-2 mb-2">
                                    <Unlock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                                    <h4 className="font-semibold text-yellow-800 dark:text-yellow-200">Unlock</h4>
                                </div>
                                <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                                    <li>• ปลดล็อกเพื่อแก้ไขได้</li>
                                    <li>• เฉพาะเจ้าของเอกสาร</li>
                                    <li>• หรือคนที่ lock สามารถ unlock ได้</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                ),
            },
            {
                id: 'archive',
                title: 'Archive เอกสาร',
                content: (
                    <div className="space-y-4">
                        <p className="text-gray-600 dark:text-gray-300">
                            จัดเก็บเอกสารเก่าที่ไม่ได้ใช้งานแล้ว เพื่อให้รายการหลักเป็นระเบียบ
                        </p>
                        <div className="flex items-start gap-3 p-4 bg-gray-100 dark:bg-slate-700 rounded-lg">
                            <Archive className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                            <div>
                                <h4 className="font-semibold text-gray-800 dark:text-gray-200">การใช้งาน Archive</h4>
                                <ul className="text-sm text-gray-600 dark:text-gray-400 mt-2 space-y-1">
                                    <li>• เอกสารที่ Archive จะไม่แสดงในรายการหลัก</li>
                                    <li>• สลับดูเอกสาร Archive ได้ที่ Tab "Archive"</li>
                                    <li>• สามารถ Unarchive กลับมาได้ตลอดเวลา</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                ),
            },
            {
                id: 'history',
                title: 'ประวัติเอกสาร',
                content: (
                    <div className="space-y-4">
                        <p className="text-gray-600 dark:text-gray-300">
                            ดูประวัติการเปลี่ยนแปลงทั้งหมดของเอกสาร
                        </p>
                        <div className="flex items-start gap-3 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                            <History className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                            <div>
                                <h4 className="font-semibold text-purple-800 dark:text-purple-200">ข้อมูลที่แสดง</h4>
                                <ul className="text-sm text-purple-700 dark:text-purple-300 mt-2 space-y-1">
                                    <li>• วันเวลาที่สร้าง/แก้ไข</li>
                                    <li>• ผู้ทำรายการ</li>
                                    <li>• ประเภท action (สร้าง, แก้ไข, lock, archive, etc.)</li>
                                    <li>• รายละเอียดการเปลี่ยนแปลง</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                ),
            },
            {
                id: 'share',
                title: 'แชร์ลิงก์',
                content: (
                    <div className="space-y-4">
                        <p className="text-gray-600 dark:text-gray-300">
                            สร้างลิงก์แชร์เอกสารให้คนอื่นดูได้โดยไม่ต้อง Login
                        </p>
                        <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                            <Share2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                            <div>
                                <h4 className="font-semibold text-green-800 dark:text-green-200">ตัวเลือกการแชร์</h4>
                                <ul className="text-sm text-green-700 dark:text-green-300 mt-2 space-y-1">
                                    <li>• ตั้งวันหมดอายุลิงก์ (1, 7, 30, 90 วัน)</li>
                                    <li>• อนุญาต/ไม่อนุญาตให้ดาวน์โหลด PDF</li>
                                    <li>• ดูจำนวนครั้งที่มีคนเข้าดู</li>
                                    <li>• เปิด/ปิดลิงก์ได้ตลอดเวลา</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                ),
            },
            {
                id: 'versions',
                title: 'เวอร์ชันเอกสาร',
                content: (
                    <div className="space-y-4">
                        <p className="text-gray-600 dark:text-gray-300">
                            ระบบเก็บเวอร์ชันของเอกสารทุกครั้งที่มีการแก้ไข
                        </p>
                        <div className="flex items-start gap-3 p-4 bg-teal-50 dark:bg-teal-900/20 rounded-lg border border-teal-200 dark:border-teal-800">
                            <GitBranch className="w-6 h-6 text-teal-600 dark:text-teal-400" />
                            <div>
                                <h4 className="font-semibold text-teal-800 dark:text-teal-200">ความสามารถ</h4>
                                <ul className="text-sm text-teal-700 dark:text-teal-300 mt-2 space-y-1">
                                    <li>• ดูรายการเวอร์ชันทั้งหมด</li>
                                    <li>• เปรียบเทียบเวอร์ชัน</li>
                                    <li>• Restore กลับไปใช้เวอร์ชันเก่าได้</li>
                                    <li>• ระบบจะสำรองก่อน restore อัตโนมัติ</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                ),
            },
            {
                id: 'cancel-restore',
                title: 'ยกเลิก/กู้คืนเอกสาร',
                content: (
                    <div className="space-y-4">
                        <p className="text-gray-600 dark:text-gray-300">
                            ยกเลิกเอกสารที่ไม่ต้องการใช้งานแล้ว หรือกู้คืนกลับมา
                        </p>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                                <div className="flex items-center gap-2 mb-2">
                                    <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                                    <h4 className="font-semibold text-red-800 dark:text-red-200">ยกเลิกเอกสาร</h4>
                                </div>
                                <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                                    <li>• เอกสารจะแสดงสถานะ "ยกเลิกแล้ว"</li>
                                    <li>• ขีดฆ่าข้อความ</li>
                                    <li>• ยังคงเห็นในประวัติ</li>
                                </ul>
                            </div>
                            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                                <div className="flex items-center gap-2 mb-2">
                                    <RotateCcw className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                    <h4 className="font-semibold text-emerald-800 dark:text-emerald-200">กู้คืนเอกสาร</h4>
                                </div>
                                <ul className="text-sm text-emerald-700 dark:text-emerald-300 space-y-1">
                                    <li>• นำเอกสารที่ยกเลิกกลับมาใช้</li>
                                    <li>• เอกสารจะกลับเป็นปกติ</li>
                                    <li>• ข้อมูลไม่สูญหาย</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                ),
            },
        ],
    },
    {
        id: 'settings',
        title: 'การตั้งค่า',
        icon: <Settings className="w-5 h-5" />,
        subsections: [
            {
                id: 'company-info',
                title: 'ตั้งค่าข้อมูลบริษัท',
                content: (
                    <div className="space-y-4">
                        <p className="text-gray-600 dark:text-gray-300">
                            จัดการข้อมูลบริษัทที่จะแสดงในเอกสาร (เฉพาะ Admin)
                        </p>
                        <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                            <Building2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                            <div>
                                <h4 className="font-semibold text-green-800 dark:text-green-200">ข้อมูลที่แก้ไขได้</h4>
                                <ul className="text-sm text-green-700 dark:text-green-300 mt-2 space-y-1">
                                    <li>• ชื่อบริษัท/องค์กร</li>
                                    <li>• ที่อยู่</li>
                                    <li>• เบอร์โทรศัพท์</li>
                                    <li>• อีเมล</li>
                                    <li>• เลขประจำตัวผู้เสียภาษี</li>
                                </ul>
                            </div>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            <strong>วิธีเข้าถึง:</strong> คลิกรูปโปรไฟล์ &gt; ตั้งค่า &gt; ข้อมูลบริษัท
                        </p>
                    </div>
                ),
            },
            {
                id: 'logo-management',
                title: 'จัดการโลโก้',
                content: (
                    <div className="space-y-4">
                        <p className="text-gray-600 dark:text-gray-300">
                            อัปโหลดและจัดการโลโก้สำหรับเอกสารและองค์กร
                        </p>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="p-4 bg-pink-50 dark:bg-pink-900/20 rounded-lg border border-pink-200 dark:border-pink-800">
                                <div className="flex items-center gap-2 mb-2">
                                    <Palette className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                                    <h4 className="font-semibold text-pink-800 dark:text-pink-200">โลโก้เอกสาร</h4>
                                </div>
                                <p className="text-sm text-pink-700 dark:text-pink-300">โลโก้ที่แสดงบนเอกสาร PDF</p>
                            </div>
                            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                                <div className="flex items-center gap-2 mb-2">
                                    <ImageIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                    <h4 className="font-semibold text-emerald-800 dark:text-emerald-200">โลโก้องค์กร</h4>
                                </div>
                                <p className="text-sm text-emerald-700 dark:text-emerald-300">โลโก้ที่แสดงบน Header</p>
                            </div>
                        </div>
                    </div>
                ),
            },
            {
                id: 'menu-settings',
                title: 'ตั้งค่าเมนูและ Tab',
                content: (
                    <div className="space-y-4">
                        <p className="text-gray-600 dark:text-gray-300">
                            ปรับแต่งการแสดงผลเมนูและแท็บตามความต้องการ
                        </p>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
                                <div className="flex items-center gap-2 mb-2">
                                    <MenuIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                    <h4 className="font-semibold text-indigo-800 dark:text-indigo-200">ตั้งค่าเมนู</h4>
                                </div>
                                <p className="text-sm text-indigo-700 dark:text-indigo-300">ซ่อน/แสดงประเภทเอกสารที่ไม่ได้ใช้</p>
                            </div>
                            <div className="p-4 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg border border-cyan-200 dark:border-cyan-800">
                                <div className="flex items-center gap-2 mb-2">
                                    <LayoutGrid className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                                    <h4 className="font-semibold text-cyan-800 dark:text-cyan-200">ตั้งค่า Tab</h4>
                                </div>
                                <p className="text-sm text-cyan-700 dark:text-cyan-300">จัดลำดับและแสดง/ซ่อน Tab ต่างๆ</p>
                            </div>
                        </div>
                    </div>
                ),
            },
            {
                id: 'theme-language',
                title: 'ธีมและภาษา',
                content: (
                    <div className="space-y-4">
                        <p className="text-gray-600 dark:text-gray-300">
                            ปรับแต่งรูปลักษณ์และภาษาของระบบ
                        </p>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="p-4 bg-slate-100 dark:bg-slate-700 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <Moon className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                                    <Sun className="w-5 h-5 text-amber-500" />
                                    <h4 className="font-semibold text-slate-800 dark:text-slate-200">ธีม</h4>
                                </div>
                                <p className="text-sm text-slate-600 dark:text-slate-400">เลือก Light Mode หรือ Dark Mode</p>
                            </div>
                            <div className="p-4 bg-slate-100 dark:bg-slate-700 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <Globe className="w-5 h-5 text-blue-500" />
                                    <h4 className="font-semibold text-slate-800 dark:text-slate-200">ภาษา</h4>
                                </div>
                                <p className="text-sm text-slate-600 dark:text-slate-400">รองรับภาษาไทยและภาษาอังกฤษ</p>
                            </div>
                        </div>
                    </div>
                ),
            },
        ],
    },
    {
        id: 'organization',
        title: 'การจัดการองค์กร',
        icon: <Users className="w-5 h-5" />,
        subsections: [
            {
                id: 'members',
                title: 'จัดการสมาชิก',
                content: (
                    <div className="space-y-4">
                        <p className="text-gray-600 dark:text-gray-300">
                            เพิ่ม ลบ และจัดการสิทธิ์สมาชิกในองค์กร (เฉพาะ Admin)
                        </p>
                        <div className="flex items-start gap-3 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
                            <Users className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                            <div>
                                <h4 className="font-semibold text-indigo-800 dark:text-indigo-200">สิ่งที่ทำได้</h4>
                                <ul className="text-sm text-indigo-700 dark:text-indigo-300 mt-2 space-y-1">
                                    <li>• ดูรายชื่อสมาชิกทั้งหมด</li>
                                    <li>• เชิญสมาชิกใหม่ทาง Email</li>
                                    <li>• สร้างรหัสเข้าร่วมองค์กร</li>
                                    <li>• เปลี่ยนสิทธิ์ Admin/Member</li>
                                    <li>• ลบสมาชิกออกจากองค์กร</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                ),
            },
            {
                id: 'roles',
                title: 'สิทธิ์การใช้งาน',
                content: (
                    <div className="space-y-4">
                        <p className="text-gray-600 dark:text-gray-300">
                            ระบบมี 2 ระดับสิทธิ์
                        </p>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                                <div className="flex items-center gap-2 mb-3">
                                    <Crown className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                                    <h4 className="font-bold text-amber-800 dark:text-amber-200">Admin</h4>
                                </div>
                                <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
                                    <li>✓ สร้าง/แก้ไข/ลบเอกสาร</li>
                                    <li>✓ จัดการสมาชิก</li>
                                    <li>✓ ตั้งค่าบริษัท/โลโก้</li>
                                    <li>✓ ตั้งค่าเมนู</li>
                                    <li>✓ ดูโควตา</li>
                                    <li>✓ อัปเกรดแพ็กเกจ</li>
                                </ul>
                            </div>
                            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                <div className="flex items-center gap-2 mb-3">
                                    <User className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                    <h4 className="font-bold text-blue-800 dark:text-blue-200">Member</h4>
                                </div>
                                <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                                    <li>✓ สร้าง/แก้ไข/ลบเอกสาร</li>
                                    <li>✓ ดาวน์โหลด PDF/PNG</li>
                                    <li>✓ ดูประวัติเอกสาร</li>
                                    <li>✗ ไม่สามารถจัดการสมาชิก</li>
                                    <li>✗ ไม่สามารถตั้งค่าระบบ</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                ),
            },
            {
                id: 'quota',
                title: 'โควตาและข้อจำกัด',
                content: (
                    <div className="space-y-4">
                        <p className="text-gray-600 dark:text-gray-300">
                            ดูการใช้งานและข้อจำกัดของแพ็กเกจปัจจุบัน
                        </p>
                        <div className="flex items-start gap-3 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                            <BarChart3 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                            <div>
                                <h4 className="font-semibold text-purple-800 dark:text-purple-200">ข้อมูลที่แสดง</h4>
                                <ul className="text-sm text-purple-700 dark:text-purple-300 mt-2 space-y-1">
                                    <li>• จำนวนเอกสารที่ใช้/สูงสุด</li>
                                    <li>• จำนวนสมาชิกที่ใช้/สูงสุด</li>
                                    <li>• พื้นที่เก็บข้อมูล</li>
                                    <li>• ฟีเจอร์ที่เปิดใช้งาน</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                ),
            },
            {
                id: 'upgrade',
                title: 'แพ็กเกจและการอัปเกรด',
                content: (
                    <div className="space-y-4">
                        <p className="text-gray-600 dark:text-gray-300">
                            อัปเกรดแพ็กเกจเพื่อเพิ่มความสามารถ
                        </p>
                        <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                            <Sparkles className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                            <div>
                                <h4 className="font-semibold text-amber-800 dark:text-amber-200">ข้อดีของการอัปเกรด</h4>
                                <ul className="text-sm text-amber-700 dark:text-amber-300 mt-2 space-y-1">
                                    <li>• เพิ่มจำนวนเอกสาร/เดือน</li>
                                    <li>• เพิ่มจำนวนสมาชิก</li>
                                    <li>• ปลดล็อกฟีเจอร์พิเศษ</li>
                                    <li>• พื้นที่เก็บข้อมูลเพิ่มเติม</li>
                                </ul>
                            </div>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            <strong>วิธีเข้าถึง:</strong> คลิกรูปโปรไฟล์ &gt; แพ็กเกจ
                        </p>
                    </div>
                ),
            },
        ],
    },
    {
        id: 'tips',
        title: 'Tips และ FAQ',
        icon: <Lightbulb className="w-5 h-5" />,
        subsections: [
            {
                id: 'tips',
                title: 'เคล็ดลับการใช้งาน',
                content: (
                    <div className="space-y-4">
                        <div className="space-y-3">
                            {[
                                { tip: 'ใช้ Copy เอกสารเมื่อต้องสร้างเอกสารที่คล้ายกัน ประหยัดเวลาได้มาก', icon: <Copy className="w-4 h-4" /> },
                                { tip: 'Lock เอกสารสำคัญหลังจากส่งให้ลูกค้าแล้ว เพื่อป้องกันการแก้ไขโดยไม่ตั้งใจ', icon: <Lock className="w-4 h-4" /> },
                                { tip: 'ใช้ Archive จัดเก็บเอกสารเก่า เพื่อให้รายการหลักไม่รกเกินไป', icon: <Archive className="w-4 h-4" /> },
                                { tip: 'ตั้งค่าซ่อนประเภทเอกสารที่ไม่ได้ใช้ จะทำให้หน้าจอเรียบง่ายขึ้น', icon: <Settings className="w-4 h-4" /> },
                                { tip: 'เชื่อมต่อหลายวิธี Login เพื่อความสะดวกในการเข้าถึงบัญชี', icon: <LogIn className="w-4 h-4" /> },
                            ].map((item, index) => (
                                <div key={index} className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                                    <div className="p-1.5 bg-amber-500 rounded text-white">
                                        {item.icon}
                                    </div>
                                    <p className="text-sm text-amber-800 dark:text-amber-200">{item.tip}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                ),
            },
            {
                id: 'faq',
                title: 'คำถามที่พบบ่อย',
                content: (
                    <div className="space-y-4">
                        {[
                            {
                                q: 'ลืมรหัสผ่านทำอย่างไร?',
                                a: 'คลิก "ลืมรหัสผ่าน" ที่หน้า Login แล้วกรอก Email ระบบจะส่งลิงก์ตั้งรหัสใหม่ไปให้',
                            },
                            {
                                q: 'สามารถเปลี่ยนเลขที่เอกสารเองได้ไหม?',
                                a: 'ได้ครับ เลขที่เอกสารที่ระบบสร้างเป็นเพียงค่าแนะนำ คุณสามารถแก้ไขได้ก่อนบันทึก',
                            },
                            {
                                q: 'Export ข้อมูลได้ไหม?',
                                a: 'สามารถ Export เป็น PDF หรือ PNG ได้ทันที โดยกดปุ่ม PDF หรือ PNG ในแต่ละเอกสาร',
                            },
                            {
                                q: 'รองรับการใช้งานบน Mobile ไหม?',
                                a: 'ใช่ครับ ระบบรองรับ Responsive Design ใช้งานได้ทั้ง Desktop และ Mobile',
                            },
                            {
                                q: 'ข้อมูลปลอดภัยไหม?',
                                a: 'ข้อมูลถูกเก็บบน Firebase Cloud ของ Google มีการเข้ารหัสและระบบรักษาความปลอดภัยระดับสูง',
                            },
                        ].map((item, index) => (
                            <div key={index} className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                                <div className="flex items-start gap-2 mb-2">
                                    <HelpCircle className="w-5 h-5 text-indigo-500 mt-0.5" />
                                    <h4 className="font-semibold text-gray-800 dark:text-gray-100">{item.q}</h4>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-400 ml-7">{item.a}</p>
                            </div>
                        ))}
                    </div>
                ),
            },
        ],
    },
];

// ============================================================
// Main Component
// ============================================================

const UserGuidePage: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [activeSection, setActiveSection] = useState<string>('getting-started');
    const [activeSubsection, setActiveSubsection] = useState<string>('login');
    const [expandedSections, setExpandedSections] = useState<string[]>(['getting-started']);
    const [showMobileSidebar, setShowMobileSidebar] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const contentRef = useRef<HTMLDivElement>(null);

    // Toggle section expansion
    const toggleSection = (sectionId: string) => {
        setExpandedSections(prev =>
            prev.includes(sectionId)
                ? prev.filter(id => id !== sectionId)
                : [...prev, sectionId]
        );
    };

    // Navigate to subsection
    const handleNavigate = (sectionId: string, subsectionId: string) => {
        setActiveSection(sectionId);
        setActiveSubsection(subsectionId);
        if (!expandedSections.includes(sectionId)) {
            setExpandedSections(prev => [...prev, sectionId]);
        }
        setShowMobileSidebar(false);
        // Scroll to top of content
        if (contentRef.current) {
            contentRef.current.scrollTop = 0;
        }
    };

    // Get current subsection content
    const getCurrentContent = () => {
        const section = guideSections.find(s => s.id === activeSection);
        if (!section) return null;
        const subsection = section.subsections.find(sub => sub.id === activeSubsection);
        return subsection;
    };

    const currentContent = getCurrentContent();
    const currentSection = guideSections.find(s => s.id === activeSection);

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-900">
            {/* Header */}
            <div className="bg-white dark:bg-slate-800 shadow-sm border-b border-gray-200 dark:border-slate-700 sticky top-0 z-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between py-4">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => navigate(-1)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                title="กลับ"
                            >
                                <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                            </button>
                            <div className="flex items-center gap-2">
                                <BookOpen className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                                <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                                    คู่มือการใช้งาน
                                </h1>
                            </div>
                        </div>
                        
                        {/* Mobile Sidebar Toggle */}
                        <button
                            onClick={() => setShowMobileSidebar(!showMobileSidebar)}
                            className="md:hidden p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                        >
                            <MenuIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="flex gap-6">
                    {/* Sidebar - Desktop */}
                    <aside className="hidden md:block w-72 flex-shrink-0">
                        <div className="sticky top-24 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
                            <div className="p-4 border-b border-gray-200 dark:border-slate-700">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="ค้นหา..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                            </div>
                            <nav className="p-2 max-h-[calc(100vh-200px)] overflow-y-auto">
                                {guideSections.map((section) => (
                                    <div key={section.id} className="mb-1">
                                        <button
                                            onClick={() => toggleSection(section.id)}
                                            className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                                                activeSection === section.id
                                                    ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                {section.icon}
                                                <span>{section.title}</span>
                                            </div>
                                            {expandedSections.includes(section.id) ? (
                                                <ChevronDown className="w-4 h-4" />
                                            ) : (
                                                <ChevronRight className="w-4 h-4" />
                                            )}
                                        </button>
                                        {expandedSections.includes(section.id) && (
                                            <div className="ml-4 mt-1 space-y-1">
                                                {section.subsections.map((sub) => (
                                                    <button
                                                        key={sub.id}
                                                        onClick={() => handleNavigate(section.id, sub.id)}
                                                        className={`w-full text-left px-3 py-1.5 text-sm rounded-lg transition-colors ${
                                                            activeSubsection === sub.id && activeSection === section.id
                                                                ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-medium'
                                                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700/50'
                                                        }`}
                                                    >
                                                        {sub.title}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </nav>
                        </div>
                    </aside>

                    {/* Mobile Sidebar Overlay */}
                    {showMobileSidebar && (
                        <div className="md:hidden fixed inset-0 z-50">
                            <div
                                className="absolute inset-0 bg-black/50"
                                onClick={() => setShowMobileSidebar(false)}
                            />
                            <div className="absolute left-0 top-0 bottom-0 w-80 max-w-[85vw] bg-white dark:bg-slate-800 shadow-xl overflow-y-auto">
                                <div className="sticky top-0 bg-white dark:bg-slate-800 p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
                                    <h2 className="font-semibold text-gray-800 dark:text-gray-100">หัวข้อ</h2>
                                    <button
                                        onClick={() => setShowMobileSidebar(false)}
                                        className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"
                                    >
                                        <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                                    </button>
                                </div>
                                <nav className="p-2">
                                    {guideSections.map((section) => (
                                        <div key={section.id} className="mb-1">
                                            <button
                                                onClick={() => toggleSection(section.id)}
                                                className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                                                    activeSection === section.id
                                                        ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                                                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    {section.icon}
                                                    <span>{section.title}</span>
                                                </div>
                                                {expandedSections.includes(section.id) ? (
                                                    <ChevronDown className="w-4 h-4" />
                                                ) : (
                                                    <ChevronRight className="w-4 h-4" />
                                                )}
                                            </button>
                                            {expandedSections.includes(section.id) && (
                                                <div className="ml-4 mt-1 space-y-1">
                                                    {section.subsections.map((sub) => (
                                                        <button
                                                            key={sub.id}
                                                            onClick={() => handleNavigate(section.id, sub.id)}
                                                            className={`w-full text-left px-3 py-1.5 text-sm rounded-lg transition-colors ${
                                                                activeSubsection === sub.id && activeSection === section.id
                                                                    ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-medium'
                                                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700/50'
                                                            }`}
                                                        >
                                                            {sub.title}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </nav>
                            </div>
                        </div>
                    )}

                    {/* Main Content */}
                    <main ref={contentRef} className="flex-1 min-w-0">
                        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
                            {/* Breadcrumb */}
                            {currentSection && currentContent && (
                                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
                                    <span>{currentSection.title}</span>
                                    <ChevronRight className="w-4 h-4" />
                                    <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                                        {currentContent.title}
                                    </span>
                                </div>
                            )}

                            {/* Title */}
                            {currentContent && (
                                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">
                                    {currentContent.title}
                                </h2>
                            )}

                            {/* Content */}
                            {currentContent?.content}

                            {/* Navigation */}
                            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-slate-700 flex justify-between">
                                <PrevNextButton
                                    direction="prev"
                                    currentSection={activeSection}
                                    currentSubsection={activeSubsection}
                                    onNavigate={handleNavigate}
                                />
                                <PrevNextButton
                                    direction="next"
                                    currentSection={activeSection}
                                    currentSubsection={activeSubsection}
                                    onNavigate={handleNavigate}
                                />
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
};

// ============================================================
// Helper Component: Prev/Next Navigation
// ============================================================

interface PrevNextButtonProps {
    direction: 'prev' | 'next';
    currentSection: string;
    currentSubsection: string;
    onNavigate: (sectionId: string, subsectionId: string) => void;
}

const PrevNextButton: React.FC<PrevNextButtonProps> = ({
    direction,
    currentSection,
    currentSubsection,
    onNavigate,
}) => {
    // สร้าง flat list ของทุก subsections
    const flatList: { sectionId: string; subsectionId: string; title: string }[] = [];
    guideSections.forEach((section) => {
        section.subsections.forEach((sub) => {
            flatList.push({
                sectionId: section.id,
                subsectionId: sub.id,
                title: sub.title,
            });
        });
    });

    // หา index ปัจจุบัน
    const currentIndex = flatList.findIndex(
        (item) => item.sectionId === currentSection && item.subsectionId === currentSubsection
    );

    const targetIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
    const target = flatList[targetIndex];

    if (!target) {
        return <div />;
    }

    return (
        <button
            onClick={() => onNavigate(target.sectionId, target.subsectionId)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                direction === 'prev'
                    ? 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
        >
            {direction === 'prev' && <ArrowLeft className="w-4 h-4" />}
            <span>{direction === 'prev' ? 'ก่อนหน้า' : 'ถัดไป'}</span>
            {direction === 'next' && <ChevronRight className="w-4 h-4" />}
        </button>
    );
};

export default UserGuidePage;
