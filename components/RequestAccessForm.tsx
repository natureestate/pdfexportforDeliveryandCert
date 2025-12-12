/**
 * Request Access Form Component
 * ฟอร์มสำหรับ User ขอเข้าร่วมองค์กร
 */

import React, { useState, useEffect } from 'react';
import { getPublicCompanies, createAccessRequest } from '../services/accessRequests';
import { PublicCompanyInfo } from '../types';
import {
    UserPlus,
    Building2,
    Search,
    Users,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Send,
    MessageSquare,
} from 'lucide-react';

interface RequestAccessFormProps {
    onSuccess?: () => void;  // เรียกเมื่อส่งคำขอสำเร็จ
    onCancel?: () => void;   // เรียกเมื่อยกเลิก
}

const RequestAccessForm: React.FC<RequestAccessFormProps> = ({ onSuccess, onCancel }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [companies, setCompanies] = useState<PublicCompanyInfo[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedCompany, setSelectedCompany] = useState<PublicCompanyInfo | null>(null);
    const [message, setMessage] = useState('');
    const [success, setSuccess] = useState(false);

    /**
     * โหลดรายชื่อองค์กร
     */
    useEffect(() => {
        const loadCompanies = async () => {
            setIsLoading(true);
            try {
                const result = await getPublicCompanies(searchTerm);
                setCompanies(result);
            } catch (err) {
                console.error('Failed to load companies:', err);
            } finally {
                setIsLoading(false);
            }
        };

        // Debounce search
        const timeoutId = setTimeout(loadCompanies, 300);
        return () => clearTimeout(timeoutId);
    }, [searchTerm]);

    /**
     * ส่งคำขอเข้าร่วม
     */
    const handleSubmit = async () => {
        if (!selectedCompany) {
            setError('กรุณาเลือกองค์กร');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            await createAccessRequest(selectedCompany.id, message.trim() || undefined);
            setSuccess(true);
            
            // เรียก callback หลัง 2 วินาที
            setTimeout(() => {
                if (onSuccess) {
                    onSuccess();
                }
            }, 2000);
        } catch (err: any) {
            setError(err.message || 'ไม่สามารถส่งคำขอได้');
        } finally {
            setIsSubmitting(false);
        }
    };

    // แสดงหน้าสำเร็จ
    if (success) {
        return (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8 text-blue-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    ส่งคำขอสำเร็จ!
                </h2>
                <p className="text-gray-600 mb-4">
                    คำขอของคุณถูกส่งไปยัง <span className="font-medium">{selectedCompany?.name}</span> แล้ว
                </p>
                <p className="text-sm text-gray-500">
                    กรุณารอ Admin อนุมัติ คุณจะเป็นสมาชิกโดยอัตโนมัติเมื่อได้รับการอนุมัติ
                </p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <UserPlus className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                    <h2 className="font-semibold text-gray-900">ขอเข้าร่วมองค์กร</h2>
                    <p className="text-sm text-gray-500">เลือกองค์กรที่ต้องการเข้าร่วม</p>
                </div>
            </div>

            {/* ขั้นตอนที่ 1: เลือกองค์กร */}
            {!selectedCompany && (
                <div className="space-y-4">
                    {/* ช่องค้นหา */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="ค้นหาชื่อองค์กร..."
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    {/* รายการองค์กร */}
                    <div className="border border-gray-200 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                        {isLoading ? (
                            <div className="p-4 text-center">
                                <Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto" />
                                <p className="text-sm text-gray-500 mt-2">กำลังโหลด...</p>
                            </div>
                        ) : companies.length === 0 ? (
                            <div className="p-4 text-center">
                                <Building2 className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                <p className="text-sm text-gray-500">
                                    {searchTerm ? 'ไม่พบองค์กรที่ตรงกัน' : 'ยังไม่มีองค์กรในระบบ'}
                                </p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {companies.map((company) => (
                                    <button
                                        key={company.id}
                                        onClick={() => setSelectedCompany(company)}
                                        className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-3"
                                    >
                                        {company.logoUrl ? (
                                            <img
                                                src={company.logoUrl}
                                                alt={company.name}
                                                className="w-10 h-10 rounded-lg object-cover"
                                            />
                                        ) : (
                                            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                                                <Building2 className="w-5 h-5 text-gray-400" />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-gray-900 truncate">
                                                {company.name}
                                            </p>
                                            {company.memberCount !== undefined && (
                                                <p className="text-xs text-gray-500 flex items-center gap-1">
                                                    <Users className="w-3 h-3" />
                                                    {company.memberCount} สมาชิก
                                                </p>
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <p className="text-xs text-gray-500 text-center">
                        เลือกองค์กรที่คุณต้องการขอเข้าร่วม
                    </p>
                </div>
            )}

            {/* ขั้นตอนที่ 2: ส่งคำขอ */}
            {selectedCompany && (
                <div className="space-y-4">
                    {/* องค์กรที่เลือก */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center gap-3">
                            {selectedCompany.logoUrl ? (
                                <img
                                    src={selectedCompany.logoUrl}
                                    alt={selectedCompany.name}
                                    className="w-12 h-12 rounded-lg object-cover"
                                />
                            ) : (
                                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <Building2 className="w-6 h-6 text-blue-600" />
                                </div>
                            )}
                            <div className="flex-1">
                                <p className="font-medium text-gray-900">{selectedCompany.name}</p>
                                {selectedCompany.memberCount !== undefined && (
                                    <p className="text-xs text-gray-500 flex items-center gap-1">
                                        <Users className="w-3 h-3" />
                                        {selectedCompany.memberCount} สมาชิก
                                    </p>
                                )}
                            </div>
                            <button
                                onClick={() => setSelectedCompany(null)}
                                className="text-sm text-blue-600 hover:text-blue-800"
                            >
                                เปลี่ยน
                            </button>
                        </div>
                    </div>

                    {/* ข้อความ */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            <div className="flex items-center gap-1">
                                <MessageSquare className="w-4 h-4" />
                                <span>ข้อความถึง Admin (ไม่บังคับ)</span>
                            </div>
                        </label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="เช่น ผมเป็นพนักงานใหม่ของบริษัท..."
                            rows={3}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={isSubmitting}
                        />
                    </div>

                    {error && (
                        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
                            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    )}

                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <p className="text-sm text-amber-800">
                            ⏳ หลังส่งคำขอ คุณจะต้องรอ Admin ขององค์กรอนุมัติ
                        </p>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={() => setSelectedCompany(null)}
                            disabled={isSubmitting}
                            className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50"
                        >
                            ยกเลิก
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>กำลังส่ง...</span>
                                </>
                            ) : (
                                <>
                                    <Send className="w-5 h-5" />
                                    <span>ส่งคำขอ</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RequestAccessForm;
