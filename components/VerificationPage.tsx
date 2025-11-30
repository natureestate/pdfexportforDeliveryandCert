/**
 * VerificationPage - หน้าสาธารณะสำหรับตรวจสอบความถูกต้องของเอกสาร
 * 
 * ฟีเจอร์:
 * - ไม่ต้อง Login (Public Access)
 * - แสดงข้อมูลเอกสารแบบ Read-only
 * - แสดงสถานะ: ถูกต้อง (สีเขียว) / ยกเลิก (สีแดง)
 * - รองรับเอกสารทั้ง 10 ประเภท
 */

import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle, XCircle, FileText, Calendar, Building2, User, DollarSign, AlertTriangle, Loader2, ArrowLeft, Shield } from 'lucide-react';
import { getDocumentByToken, getDocTypeName, isValidDocType } from '../services/verification';
import { PublicVerificationData } from '../types';

// Component สำหรับแสดงหน้า Verification
const VerificationPage: React.FC = () => {
    // ดึง parameters จาก URL
    const { docType, token } = useParams<{ docType: string; token: string }>();
    
    // State
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [documentData, setDocumentData] = useState<PublicVerificationData | null>(null);

    // โหลดข้อมูลเอกสารเมื่อ component mount
    useEffect(() => {
        const loadDocument = async () => {
            setLoading(true);
            setError(null);

            // ตรวจสอบ parameters
            if (!docType || !token) {
                setError('URL ไม่ถูกต้อง กรุณาสแกน QR Code ใหม่');
                setLoading(false);
                return;
            }

            // ตรวจสอบ docType
            if (!isValidDocType(docType)) {
                setError('ประเภทเอกสารไม่ถูกต้อง');
                setLoading(false);
                return;
            }

            // ดึงข้อมูลเอกสาร
            const result = await getDocumentByToken(docType, token);
            
            if (result.success && result.data) {
                setDocumentData(result.data);
            } else {
                setError(result.error || 'ไม่พบเอกสาร');
            }

            setLoading(false);
        };

        loadDocument();
    }, [docType, token]);

    // Format วันที่
    const formatDate = (date: Date | null | undefined) => {
        if (!date) return '-';
        return new Intl.DateTimeFormat('th-TH', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        }).format(date);
    };

    // Format จำนวนเงิน
    const formatCurrency = (amount: number | undefined) => {
        if (amount === undefined || amount === null) return '-';
        return new Intl.NumberFormat('th-TH', {
            style: 'currency',
            currency: 'THB',
        }).format(amount);
    };

    // แสดง Loading
    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
                    <Loader2 className="w-16 h-16 text-indigo-600 animate-spin mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-slate-700">กำลังตรวจสอบเอกสาร...</h2>
                    <p className="text-slate-500 mt-2">กรุณารอสักครู่</p>
                </div>
            </div>
        );
    }

    // แสดง Error
    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertTriangle className="w-10 h-10 text-red-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-red-600 mb-2">ไม่พบเอกสาร</h2>
                    <p className="text-slate-600 mb-6">{error}</p>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-left">
                        <p className="text-sm text-amber-800">
                            <strong>สาเหตุที่อาจเป็นไปได้:</strong>
                        </p>
                        <ul className="text-sm text-amber-700 mt-2 list-disc list-inside space-y-1">
                            <li>QR Code อาจถูกแก้ไขหรือไม่สมบูรณ์</li>
                            <li>เอกสารอาจถูกลบออกจากระบบแล้ว</li>
                            <li>ลิงก์อาจหมดอายุหรือไม่ถูกต้อง</li>
                        </ul>
                    </div>
                </div>
            </div>
        );
    }

    // แสดงข้อมูลเอกสาร
    const isActive = documentData?.documentStatus === 'active';

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
                {/* Header - สถานะเอกสาร */}
                <div className={`p-6 ${isActive ? 'bg-gradient-to-r from-emerald-500 to-green-600' : 'bg-gradient-to-r from-red-500 to-rose-600'}`}>
                    <div className="flex items-center justify-center mb-4">
                        {isActive ? (
                            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
                                <CheckCircle className="w-12 h-12 text-white" />
                            </div>
                        ) : (
                            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
                                <XCircle className="w-12 h-12 text-white" />
                            </div>
                        )}
                    </div>
                    <h1 className="text-2xl font-bold text-white text-center">
                        {isActive ? '✅ เอกสารต้นฉบับถูกต้อง' : '❌ เอกสารถูกยกเลิกแล้ว'}
                    </h1>
                    <p className="text-white/80 text-center mt-2">
                        {isActive ? 'Document Verified' : 'Document Cancelled'}
                    </p>
                </div>

                {/* Alert สำหรับเอกสารที่ถูกยกเลิก */}
                {!isActive && documentData?.cancelledAt && (
                    <div className="bg-red-50 border-b border-red-200 p-4">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-red-800 font-semibold">เอกสารนี้ถูกยกเลิกแล้ว</p>
                                <p className="text-red-600 text-sm mt-1">
                                    ยกเลิกเมื่อ: {formatDate(documentData.cancelledAt)}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* ข้อมูลเอกสาร */}
                <div className="p-6 space-y-4">
                    {/* ประเภทเอกสาร */}
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                        <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                            <FileText className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wide">ประเภทเอกสาร</p>
                            <p className="font-semibold text-slate-800">{documentData?.documentType}</p>
                        </div>
                    </div>

                    {/* เลขที่เอกสาร */}
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                        <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                            <Shield className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wide">เลขที่เอกสาร</p>
                            <p className="font-semibold text-slate-800 font-mono">{documentData?.documentNumber}</p>
                        </div>
                    </div>

                    {/* วันที่เอกสาร */}
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wide">วันที่เอกสาร</p>
                            <p className="font-semibold text-slate-800">{formatDate(documentData?.documentDate)}</p>
                        </div>
                    </div>

                    {/* บริษัทผู้ออกเอกสาร */}
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wide">ผู้ออกเอกสาร</p>
                            <p className="font-semibold text-slate-800">{documentData?.companyName}</p>
                        </div>
                    </div>

                    {/* ลูกค้า (ถ้ามี) */}
                    {documentData?.customerName && (
                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                            <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center">
                                <User className="w-5 h-5 text-cyan-600" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 uppercase tracking-wide">ลูกค้า</p>
                                <p className="font-semibold text-slate-800">{documentData.customerName}</p>
                            </div>
                        </div>
                    )}

                    {/* ยอดรวม (ถ้ามี) */}
                    {documentData?.totalAmount !== undefined && documentData?.totalAmount > 0 && (
                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                <DollarSign className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 uppercase tracking-wide">ยอดรวม</p>
                                <p className="font-semibold text-slate-800">{formatCurrency(documentData.totalAmount)}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="bg-slate-50 px-6 py-4 border-t border-slate-200">
                    <div className="flex items-center justify-between">
                        <p className="text-xs text-slate-500">
                            ตรวจสอบเมื่อ: {new Date().toLocaleString('th-TH')}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                            <Shield className="w-3 h-3" />
                            <span>eCert Online</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VerificationPage;

