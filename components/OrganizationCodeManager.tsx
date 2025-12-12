/**
 * Organization Code Manager Component
 * สำหรับ Admin จัดการ Join Codes ขององค์กร
 */

import React, { useState, useEffect } from 'react';
import {
    createOrganizationCode,
    getCompanyOrganizationCodes,
    deactivateOrganizationCode,
    activateOrganizationCode,
    deleteOrganizationCode,
} from '../services/organizationCodes';
import { OrganizationCode, UserRole } from '../types';
import {
    KeyRound,
    Plus,
    Copy,
    Check,
    X,
    Trash2,
    ToggleLeft,
    ToggleRight,
    Loader2,
    AlertCircle,
    Clock,
    Users,
    Shield,
    RefreshCw,
} from 'lucide-react';

interface OrganizationCodeManagerProps {
    companyId: string;
    companyName: string;
}

const OrganizationCodeManager: React.FC<OrganizationCodeManagerProps> = ({
    companyId,
    companyName,
}) => {
    const [codes, setCodes] = useState<OrganizationCode[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copiedCode, setCopiedCode] = useState<string | null>(null);

    // Create form state
    const [newCodeRole, setNewCodeRole] = useState<UserRole>('member');
    const [newCodeMaxUses, setNewCodeMaxUses] = useState<number>(-1);
    const [newCodeExpiryDays, setNewCodeExpiryDays] = useState<number>(0);
    const [newCodeDescription, setNewCodeDescription] = useState('');

    /**
     * โหลดรายการ codes
     */
    const loadCodes = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await getCompanyOrganizationCodes(companyId);
            setCodes(result);
        } catch (err: any) {
            setError(err.message || 'ไม่สามารถโหลดข้อมูลได้');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadCodes();
    }, [companyId]);

    /**
     * สร้าง code ใหม่
     */
    const handleCreate = async () => {
        setIsCreating(true);
        setError(null);

        try {
            await createOrganizationCode(companyId, {
                role: newCodeRole,
                maxUses: newCodeMaxUses,
                expiresInDays: newCodeExpiryDays > 0 ? newCodeExpiryDays : undefined,
                description: newCodeDescription.trim() || undefined,
            });

            // รีเซ็ตฟอร์มและรีโหลด
            setShowCreateModal(false);
            setNewCodeRole('member');
            setNewCodeMaxUses(-1);
            setNewCodeExpiryDays(0);
            setNewCodeDescription('');
            await loadCodes();
        } catch (err: any) {
            setError(err.message || 'ไม่สามารถสร้าง code ได้');
        } finally {
            setIsCreating(false);
        }
    };

    /**
     * เปิด/ปิดใช้งาน code
     */
    const handleToggleActive = async (code: OrganizationCode) => {
        try {
            if (code.isActive) {
                await deactivateOrganizationCode(code.id!);
            } else {
                await activateOrganizationCode(code.id!);
            }
            await loadCodes();
        } catch (err: any) {
            setError(err.message || 'ไม่สามารถเปลี่ยนสถานะได้');
        }
    };

    /**
     * ลบ code
     */
    const handleDelete = async (code: OrganizationCode) => {
        if (!confirm(`ต้องการลบ Join Code "${code.code}" หรือไม่?`)) {
            return;
        }

        try {
            await deleteOrganizationCode(code.id!);
            await loadCodes();
        } catch (err: any) {
            setError(err.message || 'ไม่สามารถลบ code ได้');
        }
    };

    /**
     * คัดลอก code
     */
    const handleCopy = async (code: string) => {
        try {
            await navigator.clipboard.writeText(code);
            setCopiedCode(code);
            setTimeout(() => setCopiedCode(null), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    /**
     * ตรวจสอบว่า code หมดอายุหรือยัง
     */
    const isExpired = (code: OrganizationCode): boolean => {
        if (!code.expiresAt) return false;
        return code.expiresAt < new Date();
    };

    /**
     * ตรวจสอบว่า code ใช้ครบจำนวนแล้วหรือยัง
     */
    const isMaxedOut = (code: OrganizationCode): boolean => {
        if (code.maxUses === -1) return false;
        return code.usedCount >= code.maxUses;
    };

    /**
     * จัดรูปแบบวันที่
     */
    const formatDate = (date?: Date): string => {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                        <KeyRound className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">Join Codes</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            รหัสสำหรับเข้าร่วมองค์กรโดยไม่ต้องรอคำเชิญ
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={loadCodes}
                        disabled={isLoading}
                        className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"
                        title="รีเฟรช"
                    >
                        <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                    >
                        <Plus className="w-4 h-4" />
                        <span>สร้าง Code</span>
                    </button>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400" />
                    <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                    <button onClick={() => setError(null)} className="ml-auto">
                        <X className="w-4 h-4 text-red-500 dark:text-red-400" />
                    </button>
                </div>
            )}

            {/* Content */}
            <div className="p-4">
                {isLoading ? (
                    <div className="text-center py-8">
                        <Loader2 className="w-8 h-8 animate-spin text-gray-400 dark:text-gray-500 mx-auto" />
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">กำลังโหลด...</p>
                    </div>
                ) : codes.length === 0 ? (
                    <div className="text-center py-8">
                        <KeyRound className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                        <p className="text-gray-500 dark:text-gray-400">ยังไม่มี Join Code</p>
                        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                            สร้าง code เพื่อให้ผู้อื่นเข้าร่วมองค์กรได้ง่ายขึ้น
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {codes.map((code) => {
                            const expired = isExpired(code);
                            const maxedOut = isMaxedOut(code);
                            const isDisabled = !code.isActive || expired || maxedOut;

                            return (
                                <div
                                    key={code.id}
                                    className={`border rounded-lg p-4 ${
                                        isDisabled ? 'bg-gray-50 dark:bg-slate-700/50 border-gray-200 dark:border-slate-600' : 'bg-white dark:bg-slate-700 border-gray-200 dark:border-slate-600'
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            {/* Code */}
                                            <div className="flex items-center gap-2 mb-2">
                                                <code className={`text-lg font-mono font-bold tracking-wider ${
                                                    isDisabled ? 'text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-gray-100'
                                                }`}>
                                                    {code.code}
                                                </code>
                                                <button
                                                    onClick={() => handleCopy(code.code)}
                                                    className={`p-1 rounded ${
                                                        copiedCode === code.code
                                                            ? 'text-emerald-600 dark:text-emerald-400'
                                                            : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                                                    }`}
                                                    title="คัดลอก"
                                                >
                                                    {copiedCode === code.code ? (
                                                        <Check className="w-4 h-4" />
                                                    ) : (
                                                        <Copy className="w-4 h-4" />
                                                    )}
                                                </button>
                                                {/* Status badges */}
                                                {!code.isActive && (
                                                    <span className="text-xs px-2 py-0.5 bg-gray-200 dark:bg-slate-600 text-gray-600 dark:text-gray-300 rounded">
                                                        ปิดใช้งาน
                                                    </span>
                                                )}
                                                {expired && (
                                                    <span className="text-xs px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded">
                                                        หมดอายุ
                                                    </span>
                                                )}
                                                {maxedOut && (
                                                    <span className="text-xs px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded">
                                                        ใช้ครบแล้ว
                                                    </span>
                                                )}
                                            </div>

                                            {/* Info */}
                                            <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
                                                <div className="flex items-center gap-1">
                                                    <Shield className="w-4 h-4" />
                                                    <span>{code.role === 'admin' ? 'Admin' : 'Member'}</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Users className="w-4 h-4" />
                                                    <span>
                                                        ใช้แล้ว {code.usedCount}/
                                                        {code.maxUses === -1 ? '∞' : code.maxUses}
                                                    </span>
                                                </div>
                                                {code.expiresAt && (
                                                    <div className="flex items-center gap-1">
                                                        <Clock className="w-4 h-4" />
                                                        <span>หมดอายุ {formatDate(code.expiresAt)}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Description */}
                                            {code.description && (
                                                <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                                                    {code.description}
                                                </p>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleToggleActive(code)}
                                                className={`p-2 rounded-lg ${
                                                    code.isActive
                                                        ? 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30'
                                                        : 'text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-600'
                                                }`}
                                                title={code.isActive ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
                                            >
                                                {code.isActive ? (
                                                    <ToggleRight className="w-5 h-5" />
                                                ) : (
                                                    <ToggleLeft className="w-5 h-5" />
                                                )}
                                            </button>
                                            <button
                                                onClick={() => handleDelete(code)}
                                                className="p-2 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
                                                title="ลบ"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl max-w-md w-full shadow-xl">
                        <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100">สร้าง Join Code ใหม่</h3>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded"
                            >
                                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                            </button>
                        </div>

                        <div className="p-4 space-y-4">
                            {/* Role */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    บทบาทเมื่อเข้าร่วม
                                </label>
                                <select
                                    value={newCodeRole}
                                    onChange={(e) => setNewCodeRole(e.target.value as UserRole)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
                                >
                                    <option value="member">Member (สมาชิกทั่วไป)</option>
                                    <option value="admin">Admin (ผู้ดูแลระบบ)</option>
                                </select>
                            </div>

                            {/* Max Uses */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    จำนวนครั้งที่ใช้ได้
                                </label>
                                <select
                                    value={newCodeMaxUses}
                                    onChange={(e) => setNewCodeMaxUses(parseInt(e.target.value))}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
                                >
                                    <option value={-1}>ไม่จำกัด</option>
                                    <option value={1}>1 ครั้ง</option>
                                    <option value={5}>5 ครั้ง</option>
                                    <option value={10}>10 ครั้ง</option>
                                    <option value={25}>25 ครั้ง</option>
                                    <option value={50}>50 ครั้ง</option>
                                    <option value={100}>100 ครั้ง</option>
                                </select>
                            </div>

                            {/* Expiry */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    หมดอายุใน
                                </label>
                                <select
                                    value={newCodeExpiryDays}
                                    onChange={(e) => setNewCodeExpiryDays(parseInt(e.target.value))}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
                                >
                                    <option value={0}>ไม่หมดอายุ</option>
                                    <option value={1}>1 วัน</option>
                                    <option value={7}>7 วัน</option>
                                    <option value={14}>14 วัน</option>
                                    <option value={30}>30 วัน</option>
                                    <option value={90}>90 วัน</option>
                                </select>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    คำอธิบาย (ไม่บังคับ)
                                </label>
                                <input
                                    type="text"
                                    value={newCodeDescription}
                                    onChange={(e) => setNewCodeDescription(e.target.value)}
                                    placeholder="เช่น สำหรับทีมขาย"
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                                />
                            </div>
                        </div>

                        <div className="p-4 border-t border-gray-200 dark:border-slate-700 flex gap-3">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                disabled={isCreating}
                                className="flex-1 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={handleCreate}
                                disabled={isCreating}
                                className="flex-1 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isCreating ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>กำลังสร้าง...</span>
                                    </>
                                ) : (
                                    <>
                                        <Plus className="w-4 h-4" />
                                        <span>สร้าง Code</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrganizationCodeManager;
