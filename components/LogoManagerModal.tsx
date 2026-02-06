/**
 * LogoManagerModal Component
 * Modal สำหรับจัดการโลโก้เอกสาร (สำหรับพิมพ์ใน PDF)
 * เก็บ Base64 ใน Firestore โดยตรง (ไม่ผ่าน Firebase Storage)
 * UI/UX เหมือนกับ OrganizationLogoManager
 */

import React, { useRef, useState, useEffect } from 'react';
import { X, Upload, Trash2, FileText, Image, AlertCircle, CheckCircle, RotateCcw } from 'lucide-react';
import { LogoType } from '../types';
import { getDefaultLogoUrl } from '../services/logoStorage';

interface LogoManagerModalProps {
    /** แสดง modal หรือไม่ */
    isOpen: boolean;
    
    /** Callback เมื่อต้องการปิด modal */
    onClose: () => void;
    
    /** URL ปัจจุบันของโลโก้ (Base64 หรือ URL) */
    currentLogo: string | null;
    
    /** URL ที่เก็บใน Firebase Storage (backwards compatibility) */
    logoUrl?: string | null;
    
    /** ประเภทของโลโก้ */
    logoType?: LogoType;
    
    /** URL ของ default logo ที่กำหนดไว้ในองค์กร (optional) */
    companyDefaultLogoUrl?: string | null;
    
    /** รหัสองค์กร (ไม่ใช้แล้ว - เก็บไว้เพื่อ backwards compatibility) */
    organizationId?: string;
    
    /** Callback เมื่อโลโก้เปลี่ยนแปลง */
    onChange: (logo: string | null, logoUrl: string | null, logoType: LogoType) => void;
    
    /** Callback เมื่อต้องการตั้งค่า default logo ใหม่ (ไม่ใช้แล้ว) */
    onSetDefaultLogo?: (logoUrl: string) => Promise<void>;
}

const LogoManagerModal: React.FC<LogoManagerModalProps> = ({
    isOpen,
    onClose,
    currentLogo,
    logoUrl,
    logoType = 'default',
    companyDefaultLogoUrl,
    onChange,
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);

    // กำหนด logo ที่จะแสดง (ใช้ default logo ของ company ถ้ามี)
    const displayLogo = logoPreview || currentLogo || getDefaultLogoUrl(companyDefaultLogoUrl);
    const isDefault = logoType === 'default' || (!currentLogo && !logoPreview);

    // โหลด logo ปัจจุบันเมื่อเปิด modal
    useEffect(() => {
        if (isOpen) {
            setLogoPreview(currentLogo);
            setError(null);
            setSuccess(null);
        }
    }, [isOpen, currentLogo]);

    /**
     * จัดการการเลือกไฟล์โลโก้
     * อ่านไฟล์เป็น Base64 แล้วส่งกลับทันที (ไม่อัปโหลดไป Storage)
     */
    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // ตรวจสอบประเภทไฟล์
        const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            setError('กรุณาเลือกไฟล์ PNG, JPG, SVG หรือ WebP เท่านั้น');
            return;
        }

        // ตรวจสอบขนาดไฟล์ (จำกัดที่ 500KB เพื่อไม่ให้ Firestore document ใหญ่เกินไป)
        const maxSize = 500 * 1024; // 500KB
        if (file.size > maxSize) {
            setError('ไฟล์มีขนาดใหญ่เกิน 500KB กรุณาลดขนาดไฟล์');
            return;
        }

        setError(null);
        setIsProcessing(true);

        try {
            console.log('🚀 [LogoManagerModal] กำลังอ่านไฟล์...');
            console.log('📁 [LogoManagerModal] File:', file.name, file.type, file.size);

            // อ่านไฟล์เป็น Base64
            const base64String = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target?.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            // แสดง preview
            setLogoPreview(base64String);

            // ส่ง Base64 กลับไปยัง parent component
            // logoUrl = null เพราะไม่ได้อัปโหลดไป Storage
            onChange(base64String, null, 'custom');

            console.log('✅ [LogoManagerModal] อ่านไฟล์สำเร็จ - Base64 พร้อมใช้งาน');
            setSuccess('อัปโหลดโลโก้สำเร็จ');
            setTimeout(() => setSuccess(null), 3000);
        } catch (error: any) {
            console.error('❌ [LogoManagerModal] Error reading file:', error);
            setError('ไม่สามารถอ่านไฟล์ได้ กรุณาลองใหม่');
        } finally {
            setIsProcessing(false);
            // Reset input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    /**
     * ลบโลโก้และใช้ default แทน
     */
    const handleRemoveLogo = () => {
        const defaultUrl = getDefaultLogoUrl(companyDefaultLogoUrl);
        setLogoPreview(null);
        onChange(null, null, 'default');
        setSuccess('ลบโลโก้สำเร็จ - ใช้โลโก้ default แทน');
        setTimeout(() => setSuccess(null), 3000);
    };

    /**
     * ใช้ default logo
     */
    const handleUseDefaultLogo = () => {
        const defaultUrl = getDefaultLogoUrl(companyDefaultLogoUrl);
        setLogoPreview(null);
        onChange(defaultUrl, null, 'default');
        setSuccess('เปลี่ยนเป็นโลโก้ default แล้ว');
        setTimeout(() => setSuccess(null), 3000);
    };

    // ถ้า modal ไม่เปิด ไม่แสดงอะไร
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header - Gradient style เหมือน OrganizationLogoManager */}
                <div className="bg-gradient-to-r from-pink-500 to-rose-600 px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/20 rounded-lg">
                                <FileText className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">
                                    โลโก้เอกสาร
                                </h2>
                                <p className="text-pink-100 text-sm">
                                    สำหรับพิมพ์ในเอกสาร PDF
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5 text-white" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    {/* Info Box */}
                    <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-4 mb-6">
                        <div className="flex gap-3">
                            <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-blue-700 dark:text-blue-300">
                                <p className="font-medium mb-1">โลโก้สำหรับเอกสาร</p>
                                <p>โลโก้นี้จะแสดงในเอกสาร PDF ที่สร้าง เช่น ใบส่งมอบงาน, ใบแจ้งหนี้ ฯลฯ</p>
                            </div>
                        </div>
                    </div>

                    {/* Current Logo Preview */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            โลโก้ปัจจุบัน
                        </label>
                        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 flex flex-col items-center justify-center bg-gray-50 dark:bg-slate-700/50">
                            {(logoPreview || currentLogo) && !isDefault ? (
                                <div className="relative group">
                                    <img
                                        src={logoPreview || currentLogo || ''}
                                        alt="Document Logo"
                                        className="max-h-32 max-w-full object-contain rounded-lg shadow-md"
                                    />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                                        <button
                                            onClick={handleRemoveLogo}
                                            disabled={isProcessing}
                                            className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                                            title="ลบโลโก้"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={handleUseDefaultLogo}
                                            disabled={isProcessing}
                                            className="p-2 bg-gray-500 text-white rounded-full hover:bg-gray-600 transition-colors"
                                            title="ใช้ Default"
                                        >
                                            <RotateCcw className="w-5 h-5" />
                                        </button>
                                    </div>
                                    {/* Logo Type Badge */}
                                    <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                                        <span className="text-xs px-3 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-200 shadow whitespace-nowrap">
                                            โลโก้กำหนดเอง
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center">
                                    <Image className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        ใช้โลโก้ Default
                                    </p>
                                    {companyDefaultLogoUrl && (
                                        <img 
                                            src={companyDefaultLogoUrl} 
                                            alt="Default Logo" 
                                            className="max-h-16 mx-auto mt-2 opacity-50"
                                        />
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Upload Button */}
                    <div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                            onChange={handleFileSelect}
                            className="hidden"
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isProcessing}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-pink-500 to-rose-600 text-white rounded-xl hover:from-pink-600 hover:to-rose-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isProcessing ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    <span>กำลังประมวลผล...</span>
                                </>
                            ) : (
                                <>
                                    <Upload className="w-5 h-5" />
                                    <span>อัปโหลดโลโก้ใหม่</span>
                                </>
                            )}
                        </button>
                        <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
                            PNG, JPG, SVG, WebP (สูงสุด 500KB)
                        </p>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-300">
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            <span className="text-sm">{error}</span>
                        </div>
                    )}

                    {/* Success Message */}
                    {success && (
                        <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg flex items-center gap-2 text-green-700 dark:text-green-300">
                            <CheckCircle className="w-5 h-5 flex-shrink-0" />
                            <span className="text-sm">{success}</span>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 dark:bg-slate-700/50 border-t border-gray-200 dark:border-slate-600">
                    <button
                        onClick={onClose}
                        className="w-full px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-600 border border-gray-300 dark:border-slate-500 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-500 transition-colors"
                    >
                        ปิด
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LogoManagerModal;
