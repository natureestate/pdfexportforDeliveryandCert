/**
 * Join By Code Form Component
 * ฟอร์มสำหรับ User กรอก Join Code เพื่อเข้าร่วมองค์กร
 */

import React, { useState } from 'react';
import { validateOrganizationCode, joinByCode } from '../services/organizationCodes';
import { OrganizationCode } from '../types';
import {
    KeyRound,
    Building2,
    Users,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Shield,
} from 'lucide-react';

interface JoinByCodeFormProps {
    onSuccess?: () => void;  // เรียกเมื่อ join สำเร็จ
    onCancel?: () => void;   // เรียกเมื่อยกเลิก
}

const JoinByCodeForm: React.FC<JoinByCodeFormProps> = ({ onSuccess, onCancel }) => {
    const [code, setCode] = useState('');
    const [isValidating, setIsValidating] = useState(false);
    const [isJoining, setIsJoining] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [validatedCode, setValidatedCode] = useState<OrganizationCode | null>(null);
    const [success, setSuccess] = useState(false);

    /**
     * จัดรูปแบบ code (ตัวพิมพ์ใหญ่, ไม่มีช่องว่าง)
     */
    const formatCode = (value: string): string => {
        return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
    };

    /**
     * ตรวจสอบ code
     */
    const handleValidate = async () => {
        if (!code.trim() || code.length < 6) {
            setError('กรุณากรอก Join Code (อย่างน้อย 6 ตัวอักษร)');
            return;
        }

        setIsValidating(true);
        setError(null);
        setValidatedCode(null);

        try {
            const result = await validateOrganizationCode(code);
            
            if (result.valid && result.codeData) {
                setValidatedCode(result.codeData);
            } else {
                setError(result.message || 'Join Code ไม่ถูกต้อง');
            }
        } catch (err: any) {
            setError(err.message || 'เกิดข้อผิดพลาดในการตรวจสอบ');
        } finally {
            setIsValidating(false);
        }
    };

    /**
     * เข้าร่วมองค์กร
     */
    const handleJoin = async () => {
        if (!validatedCode) return;

        setIsJoining(true);
        setError(null);

        try {
            await joinByCode(code);
            setSuccess(true);
            
            // เรียก callback หลัง 1.5 วินาที
            setTimeout(() => {
                if (onSuccess) {
                    onSuccess();
                }
            }, 1500);
        } catch (err: any) {
            setError(err.message || 'ไม่สามารถเข้าร่วมองค์กรได้');
        } finally {
            setIsJoining(false);
        }
    };

    /**
     * รีเซ็ตฟอร์ม
     */
    const handleReset = () => {
        setCode('');
        setValidatedCode(null);
        setError(null);
        setSuccess(false);
    };

    // แสดงหน้าสำเร็จ
    if (success) {
        return (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6 shadow-sm text-center">
                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    เข้าร่วมสำเร็จ!
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                    คุณเป็นสมาชิกของ <span className="font-medium">{validatedCode?.companyName}</span> แล้ว
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500">
                    กำลังพาคุณไปหน้าหลัก...
                </p>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center">
                    <KeyRound className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                    <h2 className="font-semibold text-gray-900 dark:text-gray-100">ใช้ Join Code</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">กรอกรหัสที่ได้รับจากองค์กร</p>
                </div>
            </div>

            {/* ฟอร์มกรอก code */}
            {!validatedCode && (
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Join Code
                        </label>
                        <input
                            type="text"
                            value={code}
                            onChange={(e) => {
                                setCode(formatCode(e.target.value));
                                setError(null);
                            }}
                            placeholder="เช่น ABC123XY"
                            className="w-full px-4 py-3 text-center text-lg font-mono tracking-widest border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent uppercase bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                            disabled={isValidating}
                            maxLength={10}
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
                            รหัส 8-10 ตัวอักษร (ตัวพิมพ์ใหญ่และตัวเลข)
                        </p>
                    </div>

                    {error && (
                        <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                            <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                        </div>
                    )}

                    <button
                        onClick={handleValidate}
                        disabled={isValidating || code.length < 6}
                        className="w-full py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isValidating ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span>กำลังตรวจสอบ...</span>
                            </>
                        ) : (
                            <>
                                <KeyRound className="w-5 h-5" />
                                <span>ตรวจสอบ Code</span>
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* แสดงข้อมูลองค์กรที่ตรวจสอบแล้ว */}
            {validatedCode && (
                <div className="space-y-4">
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                            <span className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                                Join Code ถูกต้อง
                            </span>
                        </div>
                        
                        <div className="space-y-3">
                            <div className="flex items-start gap-3">
                                <Building2 className="w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">องค์กร</p>
                                    <p className="font-medium text-gray-900 dark:text-gray-100">{validatedCode.companyName}</p>
                                </div>
                            </div>
                            
                            <div className="flex items-start gap-3">
                                <Shield className="w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">บทบาทที่จะได้รับ</p>
                                    <p className="font-medium text-gray-900 dark:text-gray-100">
                                        {validatedCode.role === 'admin' ? 'Admin' : 'Member'}
                                    </p>
                                </div>
                            </div>
                            
                            {validatedCode.description && (
                                <div className="flex items-start gap-3">
                                    <Users className="w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">คำอธิบาย</p>
                                        <p className="text-sm text-gray-700 dark:text-gray-300">{validatedCode.description}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {error && (
                        <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                            <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                        </div>
                    )}

                    <div className="flex gap-3">
                        <button
                            onClick={handleReset}
                            disabled={isJoining}
                            className="flex-1 py-3 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50"
                        >
                            ใช้ Code อื่น
                        </button>
                        <button
                            onClick={handleJoin}
                            disabled={isJoining}
                            className="flex-1 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isJoining ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>กำลังเข้าร่วม...</span>
                                </>
                            ) : (
                                <>
                                    <Users className="w-5 h-5" />
                                    <span>เข้าร่วมองค์กร</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default JoinByCodeForm;
