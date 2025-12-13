/**
 * SignApprovalPage - หน้าสาธารณะสำหรับเซ็นชื่อยืนยันรับมอบงาน
 * 
 * ฟีเจอร์:
 * 1. แสดงข้อมูลเอกสาร (ไม่ต้อง Login)
 * 2. ยืนยันตัวตนด้วย OTP
 * 3. เซ็นชื่อ (วาด/พิมพ์)
 * 4. บันทึกลายเซ็นและอัปเดตสถานะ
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { 
    FileText, 
    Calendar, 
    Building2, 
    User, 
    Package, 
    CheckCircle, 
    XCircle,
    AlertTriangle, 
    Loader2, 
    Shield,
    PenTool,
    Phone
} from 'lucide-react';
import { PublicSigningData, SignatureType } from '../types';
import { 
    getDocumentForSigning, 
    saveSignature, 
    isValidDocType, 
    getDocTypeName 
} from '../services/signatureService';
import OTPVerificationForm from './OTPVerificationForm';
import SignaturePad from './SignaturePad';

// Step ของ Sign Flow
type SignStep = 'loading' | 'error' | 'already_signed' | 'verify_otp' | 'sign' | 'confirm' | 'success';

const SignApprovalPage: React.FC = () => {
    // ดึง parameters จาก URL
    const { docType, token } = useParams<{ docType: string; token: string }>();
    
    // State
    const [step, setStep] = useState<SignStep>('loading');
    const [error, setError] = useState<string | null>(null);
    const [documentData, setDocumentData] = useState<PublicSigningData | null>(null);
    const [documentId, setDocumentId] = useState<string | null>(null);
    
    // OTP Verified State
    const [verifiedPhone, setVerifiedPhone] = useState<string | null>(null);
    const [otpVerifiedAt, setOtpVerifiedAt] = useState<Date | null>(null);
    
    // Signature State
    const [signerName, setSignerName] = useState('');
    const [signatureData, setSignatureData] = useState<{ type: SignatureType; data: string } | null>(null);
    
    // Loading State
    const [isSaving, setIsSaving] = useState(false);

    // โหลดข้อมูลเอกสาร
    useEffect(() => {
        const loadDocument = async () => {
            setStep('loading');
            setError(null);

            // ตรวจสอบ parameters
            if (!docType || !token) {
                setError('URL ไม่ถูกต้อง กรุณาสแกน QR Code ใหม่');
                setStep('error');
                return;
            }

            // ตรวจสอบ docType
            if (!isValidDocType(docType)) {
                setError('ประเภทเอกสารไม่ถูกต้อง');
                setStep('error');
                return;
            }

            // ดึงข้อมูลเอกสาร
            const result = await getDocumentForSigning(docType, token);
            
            if (result.success && result.data && result.documentId) {
                setDocumentData(result.data);
                setDocumentId(result.documentId);
                
                // ตรวจสอบว่าเอกสารถูกเซ็นแล้วหรือไม่
                if (result.data.signatureStatus === 'signed') {
                    setStep('already_signed');
                } else {
                    setStep('verify_otp');
                }
            } else {
                setError(result.error || 'ไม่พบเอกสาร');
                setStep('error');
            }
        };

        loadDocument();
    }, [docType, token]);

    // Handle OTP Verified
    const handleOTPVerified = useCallback((phone: string) => {
        console.log('✅ [SignApprovalPage] OTP verified:', phone);
        setVerifiedPhone(phone);
        setOtpVerifiedAt(new Date());
        setStep('sign');
    }, []);

    // Handle Signature Change
    const handleSignatureChange = useCallback((data: { type: SignatureType; data: string } | null) => {
        setSignatureData(data);
    }, []);

    // Handle Proceed to Confirm
    const handleProceedToConfirm = useCallback(() => {
        if (!signerName.trim()) {
            alert('กรุณากรอกชื่อผู้รับมอบ');
            return;
        }
        if (!signatureData) {
            alert('กรุณาเซ็นชื่อ');
            return;
        }
        setStep('confirm');
    }, [signerName, signatureData]);

    // Handle Submit Signature
    const handleSubmitSignature = async () => {
        if (!documentId || !docType || !token || !verifiedPhone || !otpVerifiedAt || !signatureData) {
            setError('ข้อมูลไม่ครบถ้วน');
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            const result = await saveSignature({
                documentId,
                docType,
                signToken: token,
                signerName: signerName.trim(),
                signerPhone: verifiedPhone,
                signatureType: signatureData.type,
                signatureData: signatureData.data,
                otpVerifiedAt,
            });

            if (result.success) {
                setStep('success');
            } else {
                setError(result.error || 'เกิดข้อผิดพลาดในการบันทึกลายเซ็น');
            }
        } catch (err: any) {
            console.error('❌ [SignApprovalPage] Error saving signature:', err);
            setError(err.message || 'เกิดข้อผิดพลาดในการบันทึกลายเซ็น');
        } finally {
            setIsSaving(false);
        }
    };

    // Format วันที่
    const formatDate = (date: Date | null | undefined) => {
        if (!date) return '-';
        return new Intl.DateTimeFormat('th-TH', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        }).format(date);
    };

    // แสดง Loading
    if (step === 'loading') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
                    <Loader2 className="w-16 h-16 text-indigo-600 animate-spin mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-slate-700">กำลังโหลดเอกสาร...</h2>
                    <p className="text-slate-500 mt-2">กรุณารอสักครู่</p>
                </div>
            </div>
        );
    }

    // แสดง Error
    if (step === 'error') {
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

    // แสดงหน้าเอกสารถูกเซ็นแล้ว
    if (step === 'already_signed') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
                    {/* Header */}
                    <div className="p-6 bg-gradient-to-r from-green-500 to-emerald-600">
                        <div className="flex items-center justify-center mb-4">
                            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
                                <CheckCircle className="w-12 h-12 text-white" />
                            </div>
                        </div>
                        <h1 className="text-2xl font-bold text-white text-center">
                            เอกสารถูกเซ็นแล้ว
                        </h1>
                        <p className="text-white/80 text-center mt-2">
                            Document Already Signed
                        </p>
                    </div>

                    {/* Info */}
                    <div className="p-6 space-y-4">
                        <DocumentInfoCard documentData={documentData} formatDate={formatDate} />

                        {documentData?.signedBy && (
                            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                    <PenTool className="w-5 h-5 text-green-600" />
                                </div>
                                <div>
                                    <p className="text-xs text-green-600 uppercase tracking-wide">เซ็นโดย</p>
                                    <p className="font-semibold text-green-800">{documentData.signedBy}</p>
                                    {documentData.signedAt && (
                                        <p className="text-xs text-green-600 mt-0.5">
                                            เมื่อ {formatDate(documentData.signedAt)}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="bg-slate-50 px-6 py-4 border-t border-slate-200">
                        <div className="flex items-center justify-between text-xs text-slate-500">
                            <span>ตรวจสอบเมื่อ: {new Date().toLocaleString('th-TH')}</span>
                            <div className="flex items-center gap-1">
                                <Shield className="w-3 h-3" />
                                <span>eCert Online</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // แสดงหน้า OTP Verification
    if (step === 'verify_otp') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
                    {/* Header */}
                    <div className="p-6 bg-gradient-to-r from-indigo-600 to-purple-600">
                        <div className="flex items-center justify-center mb-4">
                            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                                <PenTool className="w-8 h-8 text-white" />
                            </div>
                        </div>
                        <h1 className="text-xl font-bold text-white text-center">
                            เซ็นชื่อยืนยันรับมอบงาน
                        </h1>
                        <p className="text-white/80 text-center mt-1 text-sm">
                            {documentData?.documentType} เลขที่ {documentData?.documentNumber}
                        </p>
                    </div>

                    {/* Document Info */}
                    <div className="p-4 bg-slate-50 border-b border-slate-200">
                        <DocumentInfoCard documentData={documentData} formatDate={formatDate} compact />
                    </div>

                    {/* OTP Form */}
                    <div className="p-6">
                        <h2 className="text-lg font-semibold text-slate-800 mb-4">
                            ขั้นตอนที่ 1: ยืนยันตัวตน
                        </h2>
                        <OTPVerificationForm
                            onVerified={handleOTPVerified}
                            onError={(err) => console.error('OTP Error:', err)}
                        />
                    </div>

                    {/* Footer */}
                    <div className="bg-slate-50 px-6 py-3 border-t border-slate-200">
                        <div className="flex items-center justify-center gap-1 text-xs text-slate-500">
                            <Shield className="w-3 h-3" />
                            <span>ระบบ e-Signature by eCert Online</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // แสดงหน้าเซ็นชื่อ
    if (step === 'sign') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
                    {/* Header */}
                    <div className="p-6 bg-gradient-to-r from-indigo-600 to-purple-600">
                        <div className="flex items-center justify-center mb-4">
                            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                                <PenTool className="w-8 h-8 text-white" />
                            </div>
                        </div>
                        <h1 className="text-xl font-bold text-white text-center">
                            เซ็นชื่อยืนยันรับมอบงาน
                        </h1>
                        <p className="text-white/80 text-center mt-1 text-sm">
                            {documentData?.documentType} เลขที่ {documentData?.documentNumber}
                        </p>
                    </div>

                    {/* Verified Badge */}
                    <div className="px-6 py-3 bg-green-50 border-b border-green-200">
                        <div className="flex items-center gap-2 text-sm text-green-700">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                            <span>ยืนยัน OTP สำเร็จ: {verifiedPhone}</span>
                        </div>
                    </div>

                    {/* Sign Form */}
                    <div className="p-6 space-y-6">
                        <h2 className="text-lg font-semibold text-slate-800">
                            ขั้นตอนที่ 2: เซ็นชื่อรับมอบ
                        </h2>

                        {/* ชื่อผู้รับมอบ */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                ชื่อผู้รับมอบ <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <User className="w-5 h-5 text-slate-400" />
                                </div>
                                <input
                                    type="text"
                                    value={signerName}
                                    onChange={(e) => setSignerName(e.target.value)}
                                    placeholder="กรอกชื่อ-นามสกุล"
                                    className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>
                        </div>

                        {/* ลายเซ็น */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                ลายเซ็น <span className="text-red-500">*</span>
                            </label>
                            <SignaturePad
                                onSignatureChange={handleSignatureChange}
                                signerName={signerName}
                            />
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-red-700">{error}</p>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="button"
                            onClick={handleProceedToConfirm}
                            disabled={!signerName.trim() || !signatureData}
                            className={`w-full flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors ${
                                !signerName.trim() || !signatureData
                                    ? 'opacity-50 cursor-not-allowed'
                                    : ''
                            }`}
                        >
                            <span>ดำเนินการต่อ</span>
                        </button>
                    </div>

                    {/* Footer */}
                    <div className="bg-slate-50 px-6 py-3 border-t border-slate-200">
                        <div className="flex items-center justify-center gap-1 text-xs text-slate-500">
                            <Shield className="w-3 h-3" />
                            <span>ระบบ e-Signature by eCert Online</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // แสดงหน้ายืนยัน
    if (step === 'confirm') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
                    {/* Header */}
                    <div className="p-6 bg-gradient-to-r from-amber-500 to-orange-600">
                        <div className="flex items-center justify-center mb-4">
                            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                                <Shield className="w-8 h-8 text-white" />
                            </div>
                        </div>
                        <h1 className="text-xl font-bold text-white text-center">
                            ยืนยันการเซ็นรับมอบ
                        </h1>
                    </div>

                    {/* Confirmation Details */}
                    <div className="p-6 space-y-4">
                        <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-slate-600">เอกสาร:</span>
                                <span className="font-medium text-slate-800">
                                    {documentData?.documentType} #{documentData?.documentNumber}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-600">ผู้ออกเอกสาร:</span>
                                <span className="font-medium text-slate-800">{documentData?.companyName}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-600">ผู้รับมอบ:</span>
                                <span className="font-medium text-slate-800">{signerName}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-600">เบอร์โทร:</span>
                                <span className="font-medium text-slate-800">{verifiedPhone}</span>
                            </div>
                        </div>

                        {/* Signature Preview */}
                        <div className="border border-slate-200 rounded-lg p-4">
                            <p className="text-xs text-slate-500 mb-2">ลายเซ็น:</p>
                            {signatureData?.type === 'draw' ? (
                                <img 
                                    src={signatureData.data} 
                                    alt="ลายเซ็น" 
                                    className="max-h-24 mx-auto"
                                />
                            ) : (
                                <p 
                                    className="text-2xl text-center text-slate-800"
                                    style={{ 
                                        fontFamily: "'Sarabun', 'Segoe Script', cursive",
                                        fontStyle: 'italic',
                                    }}
                                >
                                    {signatureData?.data}
                                </p>
                            )}
                        </div>

                        {/* Warning */}
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                            <p className="text-sm text-amber-800">
                                <strong>โปรดตรวจสอบ:</strong> เมื่อกดยืนยันแล้ว ลายเซ็นนี้จะถูกบันทึกเป็นหลักฐานการรับมอบงาน 
                                และไม่สามารถแก้ไขได้
                            </p>
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-red-700">{error}</p>
                            </div>
                        )}

                        {/* Buttons */}
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setStep('sign')}
                                disabled={isSaving}
                                className="flex-1 py-3 px-4 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                            >
                                ย้อนกลับ
                            </button>
                            <button
                                type="button"
                                onClick={handleSubmitSignature}
                                disabled={isSaving}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors ${
                                    isSaving ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        <span>กำลังบันทึก...</span>
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle className="w-5 h-5" />
                                        <span>ยืนยันรับมอบ</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // แสดงหน้าสำเร็จ
    if (step === 'success') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
                    {/* Header */}
                    <div className="p-8 bg-gradient-to-r from-green-500 to-emerald-600">
                        <div className="flex items-center justify-center mb-4">
                            <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center">
                                <CheckCircle className="w-14 h-14 text-white" />
                            </div>
                        </div>
                        <h1 className="text-2xl font-bold text-white text-center">
                            เซ็นรับมอบสำเร็จ!
                        </h1>
                        <p className="text-white/80 text-center mt-2">
                            ลายเซ็นของคุณถูกบันทึกเรียบร้อยแล้ว
                        </p>
                    </div>

                    {/* Summary */}
                    <div className="p-6 space-y-4">
                        <div className="bg-green-50 rounded-lg p-4 space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-slate-600">เอกสาร:</span>
                                <span className="font-medium text-slate-800">
                                    {documentData?.documentType}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-600">เลขที่:</span>
                                <span className="font-medium text-slate-800">{documentData?.documentNumber}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-600">ผู้รับมอบ:</span>
                                <span className="font-medium text-slate-800">{signerName}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-600">วันที่เซ็น:</span>
                                <span className="font-medium text-slate-800">
                                    {new Date().toLocaleString('th-TH')}
                                </span>
                            </div>
                        </div>

                        <div className="text-center text-sm text-slate-500">
                            <p>คุณสามารถปิดหน้านี้ได้</p>
                            <p className="mt-1">ผู้ส่งมอบจะได้รับการแจ้งเตือนอัตโนมัติ</p>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="bg-slate-50 px-6 py-4 border-t border-slate-200">
                        <div className="flex items-center justify-center gap-1 text-xs text-slate-500">
                            <Shield className="w-3 h-3" />
                            <span>ระบบ e-Signature by eCert Online</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Fallback
    return null;
};

// ============================================================
// Sub-component: Document Info Card
// ============================================================

interface DocumentInfoCardProps {
    documentData: PublicSigningData | null;
    formatDate: (date: Date | null | undefined) => string;
    compact?: boolean;
}

const DocumentInfoCard: React.FC<DocumentInfoCardProps> = ({ 
    documentData, 
    formatDate, 
    compact = false 
}) => {
    if (!documentData) return null;

    if (compact) {
        return (
            <div className="space-y-2">
                <div className="flex items-center gap-3">
                    <Building2 className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-600">{documentData.companyName}</span>
                </div>
                {documentData.customerName && (
                    <div className="flex items-center gap-3">
                        <User className="w-4 h-4 text-slate-400" />
                        <span className="text-sm text-slate-600">{documentData.customerName}</span>
                    </div>
                )}
                <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-600">{formatDate(documentData.documentDate)}</span>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {/* ประเภทเอกสาร */}
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide">ประเภทเอกสาร</p>
                    <p className="font-semibold text-slate-800">{documentData.documentType}</p>
                </div>
            </div>

            {/* เลขที่เอกสาร */}
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                    <Shield className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide">เลขที่เอกสาร</p>
                    <p className="font-semibold text-slate-800 font-mono">{documentData.documentNumber}</p>
                </div>
            </div>

            {/* บริษัทผู้ออกเอกสาร */}
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide">ผู้ออกเอกสาร</p>
                    <p className="font-semibold text-slate-800">{documentData.companyName}</p>
                </div>
            </div>

            {/* วันที่เอกสาร */}
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide">วันที่เอกสาร</p>
                    <p className="font-semibold text-slate-800">{formatDate(documentData.documentDate)}</p>
                </div>
            </div>

            {/* รายการงาน (ถ้ามี) */}
            {documentData.items && documentData.items.length > 0 && (
                <div className="p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                        <Package className="w-4 h-4 text-slate-500" />
                        <p className="text-xs text-slate-500 uppercase tracking-wide">รายการงาน</p>
                    </div>
                    <ul className="space-y-1 text-sm text-slate-700">
                        {documentData.items.slice(0, 5).map((item, index) => (
                            <li key={index} className="flex justify-between">
                                <span>{item.description || '-'}</span>
                                <span className="text-slate-500">
                                    {item.quantity} {item.unit}
                                </span>
                            </li>
                        ))}
                        {documentData.items.length > 5 && (
                            <li className="text-slate-500 italic">
                                และอีก {documentData.items.length - 5} รายการ...
                            </li>
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default SignApprovalPage;

