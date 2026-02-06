/**
 * NotificationBell Component
 * กระดิ่งแจ้งเตือน - แสดงจำนวนเอกสารใหม่ที่ยังไม่ได้อ่าน
 * เมื่อคลิกจะแสดง dropdown รายการเอกสารที่สร้างล่าสุด
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bell,
    Package,
    Shield,
    FileText,
    Receipt,
    FileCheck,
    DollarSign,
    ShoppingCart,
    StickyNote,
    PlusCircle,
    HardHat,
    CheckCheck,
    X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCompany } from '../contexts/CompanyContext';
import {
    NotificationItem,
    NotificationDocType,
    DOC_TYPE_LABELS,
    subscribeToNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    getUnreadCount,
    formatTimeAgo,
} from '../services/notifications';

// ============================================================
// Icon mapping - แมป doc type กับ icon และ สี
// ============================================================

/** แมป icon สำหรับแต่ละประเภทเอกสาร */
const DOC_TYPE_ICONS: Record<NotificationDocType, React.ComponentType<{ className?: string }>> = {
    'delivery': Package,
    'warranty': Shield,
    'invoice': FileText,
    'receipt': Receipt,
    'tax-invoice': FileCheck,
    'quotation': DollarSign,
    'purchase-order': ShoppingCart,
    'memo': StickyNote,
    'variation-order': PlusCircle,
    'subcontract': HardHat,
};

/** สีพื้นหลังของ icon ตามประเภทเอกสาร */
const DOC_TYPE_COLORS: Record<NotificationDocType, string> = {
    'delivery': 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400',
    'warranty': 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400',
    'invoice': 'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400',
    'receipt': 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400',
    'tax-invoice': 'bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400',
    'quotation': 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/40 dark:text-yellow-400',
    'purchase-order': 'bg-pink-100 text-pink-600 dark:bg-pink-900/40 dark:text-pink-400',
    'memo': 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
    'variation-order': 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400',
    'subcontract': 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400',
};

// ============================================================
// Component
// ============================================================

const NotificationBell: React.FC = () => {
    const { user } = useAuth();
    const { currentCompany } = useCompany();
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    /** จำนวนแจ้งเตือนที่ยังไม่อ่าน */
    const unreadCount = user ? getUnreadCount(notifications, user.uid) : 0;

    // ============================================================
    // Subscribe to notifications - ฟังการแจ้งเตือนแบบ realtime
    // ============================================================
    useEffect(() => {
        if (!currentCompany?.id || !user) return;

        const unsubscribe = subscribeToNotifications(
            currentCompany.id,
            (newNotifications) => {
                setNotifications(newNotifications);
            },
            30, // จำนวน notification ที่ดึง
        );

        return () => unsubscribe();
    }, [currentCompany?.id, user]);

    // ============================================================
    // ปิด dropdown เมื่อคลิกข้างนอก
    // ============================================================
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    // ============================================================
    // Handlers
    // ============================================================

    /** คลิกที่ notification item - ทำเครื่องหมายว่าอ่านแล้ว */
    const handleNotificationClick = useCallback(async (notification: NotificationItem) => {
        if (!user || !notification.id) return;
        
        // ทำเครื่องหมายว่าอ่านแล้ว
        if (!notification.readBy.includes(user.uid)) {
            await markNotificationAsRead(notification.id, user.uid);
        }
    }, [user]);

    /** อ่านทั้งหมด */
    const handleMarkAllRead = useCallback(async () => {
        if (!user || !currentCompany?.id) return;
        await markAllNotificationsAsRead(currentCompany.id, user.uid);
    }, [user, currentCompany?.id]);

    // ============================================================
    // Render
    // ============================================================

    // ไม่แสดงถ้ายังไม่ได้ login หรือไม่มี company
    if (!user || !currentCompany) return null;

    return (
        <div className="relative" ref={dropdownRef}>
            {/* ปุ่มกระดิ่ง */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors duration-200"
                title="แจ้งเตือน"
            >
                <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                
                {/* Badge จำนวนแจ้งเตือนที่ยังไม่อ่าน */}
                {unreadCount > 0 && (
                    <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold text-white bg-red-500 rounded-full px-1 shadow-sm"
                    >
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </motion.span>
                )}
            </button>

            {/* Dropdown รายการแจ้งเตือน */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -8 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-gray-200 dark:border-slate-600 z-50 origin-top-right overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-slate-600 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20">
                            <div className="flex items-center gap-2">
                                <Bell className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                                    แจ้งเตือน
                                </h3>
                                {unreadCount > 0 && (
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400 font-medium">
                                        {unreadCount} ใหม่
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-1">
                                {unreadCount > 0 && (
                                    <button
                                        onClick={handleMarkAllRead}
                                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center gap-1 px-2 py-1 rounded hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                                        title="อ่านทั้งหมด"
                                    >
                                        <CheckCheck className="w-3.5 h-3.5" />
                                        อ่านทั้งหมด
                                    </button>
                                )}
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* รายการแจ้งเตือน */}
                        <div className="max-h-[400px] overflow-y-auto">
                            {notifications.length === 0 ? (
                                <div className="py-12 text-center">
                                    <Bell className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        ยังไม่มีแจ้งเตือน
                                    </p>
                                </div>
                            ) : (
                                notifications.map((notification) => {
                                    const isUnread = !notification.readBy.includes(user.uid);
                                    const IconComponent = DOC_TYPE_ICONS[notification.docType] || FileText;
                                    const colorClass = DOC_TYPE_COLORS[notification.docType] || DOC_TYPE_COLORS['memo'];
                                    const isSelf = notification.createdByUid === user.uid;

                                    return (
                                        <button
                                            key={notification.id}
                                            onClick={() => handleNotificationClick(notification)}
                                            className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors border-b border-gray-100 dark:border-slate-700 last:border-b-0 ${
                                                isUnread ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''
                                            }`}
                                        >
                                            {/* Icon ประเภทเอกสาร */}
                                            <div className={`p-2 rounded-lg flex-shrink-0 ${colorClass}`}>
                                                <IconComponent className="w-4 h-4" />
                                            </div>

                                            {/* เนื้อหา */}
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm ${isUnread ? 'font-semibold text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300'}`}>
                                                    {isSelf ? 'คุณ' : notification.createdByName} สร้าง{DOC_TYPE_LABELS[notification.docType]}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                                                    {notification.docTitle}
                                                </p>
                                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                                    {formatTimeAgo(notification.createdAt)}
                                                </p>
                                            </div>

                                            {/* จุดยังไม่อ่าน */}
                                            {isUnread && (
                                                <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 flex-shrink-0 mt-1.5" />
                                            )}
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default NotificationBell;
