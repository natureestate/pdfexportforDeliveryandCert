/**
 * Account Linking Suggestion Component
 * แสดงแนะนำให้ผู้ใช้ Link Account เพิ่มเติม
 * เพื่อป้องกันการสร้าง user ซ้ำซ้อน
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { checkLinkedProviders } from '../services/auth';
import { AccountLinkingModal } from './AccountLinkingModal';
import { Link2 } from 'lucide-react';

interface AccountLinkingSuggestionProps {
    /** แสดงเป็น banner หรือ card */
    variant?: 'banner' | 'card';
    /** ซ่อนอัตโนมัติหลังจากกี่วินาที (0 = ไม่ซ่อน) */
    autoHideSeconds?: number;
    /** แสดงเฉพาะเมื่อมี provider ไม่ครบ */
    showOnlyIfIncomplete?: boolean;
    /** Callback เมื่อปิด */
    onDismiss?: () => void;
}

export const AccountLinkingSuggestion: React.FC<AccountLinkingSuggestionProps> = ({
    variant = 'banner',
    autoHideSeconds = 0,
    showOnlyIfIncomplete = true,
    onDismiss,
}) => {
    const { user, linkedProviders, pendingMembershipsCount } = useAuth();
    const [isVisible, setIsVisible] = useState(true);
    const [isDismissed, setIsDismissed] = useState(false);
    const [showLinkingModal, setShowLinkingModal] = useState(false);
    const [providerStatus, setProviderStatus] = useState<{
        hasGoogle: boolean;
        hasEmail: boolean;
        hasPhone: boolean;
        missingProviders: string[];
    }>({ hasGoogle: false, hasEmail: false, hasPhone: false, missingProviders: [] });

    // ตรวจสอบ localStorage ว่าเคยปิดหรือยัง
    useEffect(() => {
        const dismissed = localStorage.getItem('accountLinkingSuggestionDismissed');
        if (dismissed) {
            const dismissedDate = new Date(dismissed);
            const now = new Date();
            const daysDiff = Math.floor((now.getTime() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24));
            
            // ถ้าปิดไปแล้วน้อยกว่า 7 วัน ไม่แสดง
            if (daysDiff < 7) {
                setIsDismissed(true);
            }
        }
    }, []);

    // ตรวจสอบ provider status
    useEffect(() => {
        if (user) {
            const status = checkLinkedProviders();
            setProviderStatus(status);
        }
    }, [user, linkedProviders]);

    // Auto hide
    useEffect(() => {
        if (autoHideSeconds > 0 && isVisible) {
            const timer = setTimeout(() => {
                setIsVisible(false);
            }, autoHideSeconds * 1000);
            return () => clearTimeout(timer);
        }
    }, [autoHideSeconds, isVisible]);

    // ไม่แสดงถ้า:
    // 1. ไม่มี user
    // 2. ถูก dismiss แล้ว
    // 3. showOnlyIfIncomplete = true และมี provider ครบแล้ว
    if (!user || isDismissed || !isVisible) {
        return null;
    }

    if (showOnlyIfIncomplete && providerStatus.missingProviders.length === 0) {
        return null;
    }

    // นับจำนวน provider ที่ link แล้ว
    const linkedCount = [
        providerStatus.hasGoogle,
        providerStatus.hasEmail,
        providerStatus.hasPhone
    ].filter(Boolean).length;

    /**
     * ปิด suggestion และบันทึกลง localStorage
     */
    const handleDismiss = () => {
        setIsVisible(false);
        setIsDismissed(true);
        localStorage.setItem('accountLinkingSuggestionDismissed', new Date().toISOString());
        onDismiss?.();
    };

    /**
     * เปิด modal เพื่อ link account
     */
    const handleOpenLinkingModal = () => {
        setShowLinkingModal(true);
    };

    /**
     * แสดง provider ที่ link แล้ว
     */
    const renderLinkedProviders = () => (
        <div className="flex flex-wrap gap-1">
            {providerStatus.hasGoogle && (
                <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">
                    ✅ Google
                </span>
            )}
            {providerStatus.hasEmail && (
                <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">
                    ✅ Email
                </span>
            )}
            {providerStatus.hasPhone && (
                <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">
                    ✅ Phone
                </span>
            )}
        </div>
    );

    /**
     * แสดง provider ที่ยังไม่ได้ link
     */
    const renderMissingProviders = () => (
        <div className="flex flex-wrap gap-1">
            {!providerStatus.hasGoogle && (
                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
                    ⭕ Google
                </span>
            )}
            {!providerStatus.hasEmail && (
                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
                    ⭕ Email
                </span>
            )}
            {!providerStatus.hasPhone && (
                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
                    ⭕ Phone
                </span>
            )}
        </div>
    );

    // Banner variant
    if (variant === 'banner') {
        return (
            <>
                <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-3 relative">
                    <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-3">
                            <Link2 className="w-6 h-6" />
                            <div>
                                <p className="font-medium text-sm">
                                    {linkedCount === 1 
                                        ? 'แนะนำ: เพิ่มวิธี Login เพิ่มเติม' 
                                        : `คุณ Link แล้ว ${linkedCount}/3 วิธี`}
                                </p>
                                <p className="text-xs text-white/80">
                                    ป้องกันปัญหาการเข้าถึงบัญชีด้วยการ Link Account หลายวิธี
                                </p>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleOpenLinkingModal}
                                className="px-4 py-1.5 bg-white text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors"
                            >
                                Link เพิ่ม
                            </button>
                            <button
                                onClick={handleDismiss}
                                className="p-1 hover:bg-white/20 rounded transition-colors"
                                title="ปิด (จะแสดงอีกครั้งใน 7 วัน)"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Modal */}
                <AccountLinkingModal
                    isOpen={showLinkingModal}
                    onClose={() => setShowLinkingModal(false)}
                    email={user.email || undefined}
                    phoneNumber={user.phoneNumber || undefined}
                    mode="suggest"
                />
            </>
        );
    }

    // Card variant
    return (
        <>
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 relative">
                {/* ปุ่มปิด */}
                <button
                    onClick={handleDismiss}
                    className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    title="ปิด (จะแสดงอีกครั้งใน 7 วัน)"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white">
                        <Link2 className="w-6 h-6" />
                    </div>
                    
                    <div className="flex-1">
                        <h4 className="font-semibold text-gray-800 mb-1">
                            Account Linking
                        </h4>
                        <p className="text-sm text-gray-600 mb-3">
                            {linkedCount === 1 
                                ? 'เพิ่มวิธี Login เพื่อป้องกันปัญหาการเข้าถึงบัญชี' 
                                : `คุณ Link แล้ว ${linkedCount}/3 วิธี`}
                        </p>

                        {/* แสดง provider status */}
                        <div className="space-y-2 mb-3">
                            <div>
                                <span className="text-xs text-gray-500">Link แล้ว:</span>
                                {renderLinkedProviders()}
                            </div>
                            {providerStatus.missingProviders.length > 0 && (
                                <div>
                                    <span className="text-xs text-gray-500">ยังไม่ได้ Link:</span>
                                    {renderMissingProviders()}
                                </div>
                            )}
                        </div>

                        {/* ปุ่ม Link */}
                        <button
                            onClick={handleOpenLinkingModal}
                            className="w-full py-2 px-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg text-sm font-medium hover:from-blue-600 hover:to-purple-600 transition-all"
                        >
                            <Link2 className="w-4 h-4 inline mr-1" />Link Account เพิ่มเติม
                        </button>

                        {/* แสดง pending memberships */}
                        {pendingMembershipsCount > 0 && (
                            <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <p className="text-xs text-yellow-800">
                                    ⚠️ พบ {pendingMembershipsCount} องค์กรที่รอให้คุณ Link Account เพื่อเข้าร่วม
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal */}
            <AccountLinkingModal
                isOpen={showLinkingModal}
                onClose={() => setShowLinkingModal(false)}
                email={user.email || undefined}
                phoneNumber={user.phoneNumber || undefined}
                mode="suggest"
            />
        </>
    );
};

export default AccountLinkingSuggestion;

