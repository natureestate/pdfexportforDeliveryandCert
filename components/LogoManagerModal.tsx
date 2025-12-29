/**
 * LogoManagerModal Component
 * Modal สำหรับจัดการโลโก้แบบ Hybrid (Default + Custom Upload + Gallery)
 * ใช้งานใน dropdown profile menu
 */

import React, { useRef, useState, useEffect } from 'react';
import { LogoType } from '../types';
import { 
    uploadLogoBase64, 
    deleteLogo, 
    isDefaultLogo, 
    getDefaultLogoUrl,
    listAllLogos,
    deleteLogoByPath,
    formatFileSize,
    LogoItem,
    convertStorageUrlToBase64
} from '../services/logoStorage';

interface LogoManagerModalProps {
    /** แสดง modal หรือไม่ */
    isOpen: boolean;
    
    /** Callback เมื่อต้องการปิด modal */
    onClose: () => void;
    
    /** URL ปัจจุบันของโลโก้ (Base64 หรือ Storage URL) */
    currentLogo: string | null;
    
    /** URL ที่เก็บใน Firebase Storage */
    logoUrl?: string | null;
    
    /** ประเภทของโลโก้ */
    logoType?: LogoType;
    
    /** URL ของ default logo ที่กำหนดไว้ในองค์กร (optional) */
    companyDefaultLogoUrl?: string | null;
    
    /** รหัสองค์กร สำหรับแยกเก็บโลโก้ใน Storage */
    organizationId?: string;
    
    /** Callback เมื่อโลโก้เปลี่ยนแปลง */
    onChange: (logo: string | null, logoUrl: string | null, logoType: LogoType) => void;
    
    /** Callback เมื่อต้องการตั้งค่า default logo ใหม่ */
    onSetDefaultLogo?: (logoUrl: string) => Promise<void>;
}

// Interface สำหรับ Logo Item พร้อม Base64
interface LogoItemWithPreview extends LogoItem {
    preview?: string; // Base64 preview image
    isLoadingPreview?: boolean;
}

const LogoManagerModal: React.FC<LogoManagerModalProps> = ({
    isOpen,
    onClose,
    currentLogo,
    logoUrl,
    logoType = 'default',
    companyDefaultLogoUrl,
    organizationId,
    onChange,
    onSetDefaultLogo,
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [showGallery, setShowGallery] = useState(false);
    const [availableLogos, setAvailableLogos] = useState<LogoItemWithPreview[]>([]);
    const [isLoadingGallery, setIsLoadingGallery] = useState(false);

    // กำหนด logo ที่จะแสดง (ใช้ default logo ของ company ถ้ามี)
    const displayLogo = currentLogo || getDefaultLogoUrl(companyDefaultLogoUrl);
    const isDefault = logoType === 'default' || !currentLogo;

    /**
     * โหลดรายการโลโก้ที่มีอยู่ (ตามองค์กร)
     */
    const loadAvailableLogos = async () => {
        setIsLoadingGallery(true);
        try {
            // ส่ง organizationId เพื่อดึงเฉพาะโลโก้ขององค์กรนี้
            const logos = await listAllLogos(organizationId);
            
            console.log(`📋 [Gallery] Loaded ${logos.length} logos for org: ${organizationId || 'shared'}`);
            
            // ไม่แปลง Base64 ล่วงหน้า เพื่อหลีกเลี่ยงปัญหา CORS
            // จะแปลงเฉพาะตอนที่ผู้ใช้เลือกโลโก้
            const logosWithPreview: LogoItemWithPreview[] = logos.map(logo => ({
                ...logo,
                isLoadingPreview: false,
                preview: logo.url // ใช้ URL ตรงๆ ใน Gallery (อาจมี CORS แต่ไม่สำคัญ)
            }));
            
            setAvailableLogos(logosWithPreview);
        } catch (error) {
            console.error('Error loading logos:', error);
            setUploadError('ไม่สามารถโหลดรายการโลโก้ได้');
        } finally {
            setIsLoadingGallery(false);
        }
    };

    /**
     * โหลดรายการโลโก้เมื่อเปิด gallery
     */
    useEffect(() => {
        if (showGallery) {
            loadAvailableLogos();
        }
    }, [showGallery]);

    /**
     * รีเซ็ต state เมื่อปิด modal
     */
    useEffect(() => {
        if (!isOpen) {
            setShowGallery(false);
            setUploadError(null);
        }
    }, [isOpen]);

    /**
     * จัดการการเลือกไฟล์โลโก้
     */
    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // ตรวจสอบประเภทไฟล์
        const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
        if (!validTypes.includes(file.type)) {
            setUploadError('กรุณาเลือกไฟล์ PNG, JPG หรือ SVG เท่านั้น');
            return;
        }

        // ตรวจสอบขนาดไฟล์ (จำกัดที่ 2MB)
        const maxSize = 2 * 1024 * 1024; // 2MB
        if (file.size > maxSize) {
            setUploadError('ไฟล์มีขนาดใหญ่เกิน 2MB');
            return;
        }

        setUploadError(null);

        // อ่านไฟล์เป็น Base64 สำหรับแสดงผล
        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64String = reader.result as string;
            
            // อัปเดต UI ทันทีด้วย Base64
            onChange(base64String, null, 'custom');
            
            // อัปโหลดไปยัง Firebase Storage ในพื้นหลัง (แยกตามองค์กร)
            setIsUploading(true);
            try {
                // ส่ง organizationId เพื่อแยกเก็บตามองค์กร
                const uploadedUrl = await uploadLogoBase64(base64String, undefined, organizationId);
                console.log('✅ โลโก้อัปโหลดสำเร็จ:', uploadedUrl);
                console.log('📂 [Modal] Uploaded to org folder:', organizationId || 'shared');
                
                // ✅ แปลง Firebase Storage URL เป็น Base64 เพื่อหลีกเลี่ยงปัญหา CORS
                console.log('🔄 กำลังแปลง Storage URL เป็น Base64 เพื่อหลีกเลี่ยง CORS...');
                const base64FromStorage = await convertStorageUrlToBase64(uploadedUrl);
                
                if (base64FromStorage) {
                    // ใช้ Base64 ที่แปลงจาก Storage (คุณภาพดีกว่า + ไม่มีปัญหา CORS)
                    onChange(base64FromStorage, uploadedUrl, 'uploaded');
                    console.log('✅ แปลงเป็น Base64 สำเร็จ - ไม่มีปัญหา CORS!');
                } else {
                    // Fallback: ใช้ Base64 เดิมถ้าแปลงไม่สำเร็จ
                    onChange(base64String, uploadedUrl, 'uploaded');
                    console.warn('⚠️  ใช้ Base64 เดิม (แปลงจาก Storage ไม่สำเร็จ)');
                }
            } catch (error) {
                console.error('❌ ไม่สามารถอัปโหลดโลโก้ได้:', error);
                setUploadError('ไม่สามารถอัปโหลดโลโก้ได้ กรุณาลองใหม่');
                // ถ้าอัปโหลดไม่สำเร็จ ยังคงใช้ Base64 เดิมได้
            } finally {
                setIsUploading(false);
            }
        };
        
        reader.readAsDataURL(file);
    };

    /**
     * ลบโลโก้และใช้ default แทน
     */
    const handleRemoveLogo = async () => {
        try {
            // ถ้ามี logoUrl จาก Storage ให้ลบออก
            if (logoUrl && !isDefaultLogo(logoUrl)) {
                await deleteLogo(logoUrl);
            }
            
            // รีเซ็ตเป็น default logo (ใช้ของ company ถ้ามี)
            const defaultUrl = getDefaultLogoUrl(companyDefaultLogoUrl);
            onChange(defaultUrl, null, 'default');
            
            // Clear file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
            
            setUploadError(null);
        } catch (error) {
            console.error('ไม่สามารถลบโลโก้ได้:', error);
            setUploadError('ไม่สามารถลบโลโก้ได้');
        }
    };

    /**
     * ใช้ default logo
     */
    const handleUseDefaultLogo = () => {
        const defaultUrl = getDefaultLogoUrl(companyDefaultLogoUrl);
        onChange(defaultUrl, null, 'default');
        
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        setUploadError(null);
    };

    /**
     * ตั้งค่าโลโก้ปัจจุบันเป็น default logo ของ company
     */
    const handleSetAsDefaultLogo = async () => {
        if (!logoUrl || !onSetDefaultLogo) {
            setUploadError('ไม่สามารถตั้งค่า default logo ได้');
            return;
        }

        if (!confirm('ต้องการตั้งค่าโลโก้นี้เป็น default logo ของบริษัทหรือไม่?')) {
            return;
        }

        try {
            setIsUploading(true);
            await onSetDefaultLogo(logoUrl);
            setUploadError(null);
            console.log('✅ ตั้งค่า default logo สำเร็จ');
        } catch (error) {
            console.error('❌ ตั้งค่า default logo ล้มเหลว:', error);
            setUploadError('ไม่สามารถตั้งค่า default logo ได้');
        } finally {
            setIsUploading(false);
        }
    };

    /**
     * เปิด file picker
     */
    const handleClickUpload = () => {
        fileInputRef.current?.click();
    };

    /**
     * เลือกโลโก้จาก gallery
     * ใช้วิธีโหลดรูปใหม่แล้วแปลงเป็น Base64 เพื่อหลีกเลี่ยงปัญหา CORS
     */
    const handleSelectLogo = async (logo: LogoItemWithPreview) => {
        console.log('📷 เลือกโลโก้จาก Gallery:', logo.name);
        setIsUploading(true);
        setUploadError(null);
        
        try {
            // วิธีแก้ปัญหา CORS: โหลดรูปจาก URL แล้วแปลงเป็น Base64 ด้วย fetch + blob
            console.log('🔄 กำลังโหลดและแปลงโลโก้...');
            
            // ใช้ fetch ดึงรูปมาเป็น blob (ใช้ URL พร้อม token จาก Firebase)
            const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(logo.url)}`;
            
            try {
                // ลองโหลดโดยตรงก่อน (อาจได้ถ้า CORS ถูกต้อง)
                const response = await fetch(logo.url, { mode: 'no-cors' });
                
                // ถ้าไม่ได้ blob จาก no-cors ให้ลอง proxy
                throw new Error('Need proxy');
            } catch {
                // ใช้ proxy service ที่ช่วยแก้ปัญหา CORS
                console.log('⚠️  ใช้ proxy service เพื่อหลีกเลี่ยง CORS...');
                const response = await fetch(proxyUrl);
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const blob = await response.blob();
                
                // แปลง blob เป็น Base64
                const base64 = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
                
                if (base64) {
                    onChange(base64, logo.url, 'uploaded');
                    console.log('✅ เลือกโลโก้สำเร็จ!');
                    setShowGallery(false);
                } else {
                    throw new Error('ไม่สามารถแปลงเป็น Base64 ได้');
                }
            }
        } catch (error) {
            console.error('❌ ไม่สามารถโหลดโลโก้:', error);
            setUploadError('ไม่สามารถโหลดโลโก้ได้ อาจเกิดจากปัญหาเครือข่าย');
        } finally {
            setIsUploading(false);
        }
    };

    /**
     * ลบโลโก้จาก gallery
     */
    const handleDeleteFromGallery = async (logo: LogoItemWithPreview, event: React.MouseEvent) => {
        event.stopPropagation(); // ป้องกันไม่ให้ trigger การเลือก
        
        if (!confirm(`ต้องการลบโลโก้ "${logo.name}" หรือไม่?`)) {
            return;
        }

        try {
            await deleteLogoByPath(logo.fullPath);
            
            // ถ้าโลโก้ที่ลบคือโลโก้ที่กำลังใช้งานอยู่ ให้เปลี่ยนเป็น default
            if (logoUrl === logo.url) {
                const defaultUrl = getDefaultLogoUrl(companyDefaultLogoUrl);
                onChange(defaultUrl, null, 'default');
            }
            
            // โหลดรายการใหม่
            await loadAvailableLogos();
        } catch (error) {
            console.error('Error deleting logo:', error);
            setUploadError('ไม่สามารถลบโลโก้ได้');
        }
    };

    /**
     * Toggle gallery
     */
    const handleToggleGallery = () => {
        setShowGallery(!showGallery);
        setUploadError(null);
    };

    // ถ้า modal ไม่เปิด ไม่แสดงอะไร
    if (!isOpen) return null;

    return (
        <>
            {/* Modal Overlay */}
            <div 
                className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-2 sm:p-4"
                onClick={onClose}
            >
                {/* Modal Content */}
                <div 
                    className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Modal Header */}
                    <div className="sticky top-0 bg-white border-b border-gray-200 px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between z-10">
                        <h2 className="text-base sm:text-xl font-bold text-gray-800">จัดการโลโก้บริษัท</h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                        >
                            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Modal Body */}
                    <div className="p-3 sm:p-6 space-y-3 sm:space-y-4">
                        {/* Hidden File Input */}
                        <input
                            type="file"
                            accept="image/png, image/jpeg, image/jpg, image/svg+xml"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            className="hidden"
                            id="logo-upload-modal-input"
                        />

                        {/* Logo Display Area */}
                        <div className="relative">
                            {isDefault ? (
                                // แสดง Default Logo พร้อมปุ่ม Upload
                                <div
                                    className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition-colors"
                                    onClick={handleClickUpload}
                                >
                                    <img 
                                        src={displayLogo} 
                                        alt="Default Logo" 
                                        className="max-h-24 sm:max-h-32 mx-auto mb-3 sm:mb-4 object-contain opacity-60"
                                    />
                                    <svg className="mx-auto h-8 w-8 sm:h-12 sm:w-12 text-slate-400 mb-2 sm:mb-3" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    <p className="text-sm sm:text-base text-slate-600 font-medium">คลิกเพื่ออัปโหลดโลโก้ของคุณ</p>
                                    <small className="text-xs sm:text-sm text-slate-400">หรือใช้โลโก้ default</small>
                                    <div className="mt-2">
                                        <small className="text-xs text-slate-500">PNG, JPG, SVG (สูงสุด 2MB)</small>
                                    </div>
                                </div>
                            ) : (
                                // แสดง Custom Logo พร้อมปุ่มจัดการ
                                <div className="relative border rounded-lg p-3 sm:p-6 bg-slate-50">
                                    <div className="flex items-center justify-center min-h-[120px] sm:min-h-[150px]">
                                        <img 
                                            src={displayLogo} 
                                            alt="Company Logo" 
                                            className="max-h-24 sm:max-h-32 max-w-full object-contain"
                                            crossOrigin="anonymous"
                                        />
                                    </div>
                                    
                                    {/* Action Buttons */}
                                    <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row gap-2 justify-center flex-wrap">
                                        {/* ปุ่มเปลี่ยนโลโก้ */}
                                        <button
                                            type="button"
                                            onClick={handleClickUpload}
                                            disabled={isUploading}
                                            className="px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-500 text-white rounded-lg shadow hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm"
                                        >
                                            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z" />
                                            </svg>
                                            <span className="font-medium">เปลี่ยนโลโก้</span>
                                        </button>
                                        
                                        {/* ปุ่มตั้งเป็น Default (แสดงเฉพาะเมื่อมี callback และโลโก้ถูกอัปโหลดแล้ว) */}
                                        {onSetDefaultLogo && logoType === 'uploaded' && logoUrl && (
                                            <button
                                                type="button"
                                                onClick={handleSetAsDefaultLogo}
                                                disabled={isUploading}
                                                className="px-3 sm:px-4 py-1.5 sm:py-2 bg-purple-500 text-white rounded-lg shadow hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:bg-purple-300 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm"
                                            >
                                                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                                </svg>
                                                <span className="font-medium">ตั้งเป็น Default</span>
                                            </button>
                                        )}
                                        
                                        {/* ปุ่มใช้ Default */}
                                        <button
                                            type="button"
                                            onClick={handleUseDefaultLogo}
                                            disabled={isUploading}
                                            className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-500 text-white rounded-lg shadow hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm"
                                        >
                                            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                            </svg>
                                            <span className="font-medium">ใช้ Default</span>
                                        </button>
                                        
                                        {/* ปุ่มลบ */}
                                        <button
                                            type="button"
                                            onClick={handleRemoveLogo}
                                            disabled={isUploading}
                                            className="px-3 sm:px-4 py-1.5 sm:py-2 bg-red-500 text-white rounded-lg shadow hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:bg-red-300 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm"
                                        >
                                            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                            <span className="font-medium">ลบโลโก้</span>
                                        </button>
                                    </div>

                                    {/* Upload Status */}
                                    {isUploading && (
                                        <div className="mt-4">
                                            <div className="bg-blue-100 border border-blue-300 rounded px-3 py-2 text-sm text-blue-700 flex items-center gap-2">
                                                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                กำลังอัปโหลด...
                                            </div>
                                        </div>
                                    )}

                                    {/* Logo Type Badge */}
                                    <div className="mt-3 flex justify-center">
                                        <span className={`text-xs px-3 py-1 rounded-full ${
                                            logoType === 'uploaded' 
                                                ? 'bg-green-100 text-green-700' 
                                                : 'bg-yellow-100 text-yellow-700'
                                        }`}>
                                            {logoType === 'uploaded' ? '☁️ ใน Cloud' : '📁 ชั่วคราว'}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Error Message */}
                        {uploadError && (
                            <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700">
                                ⚠️ {uploadError}
                            </div>
                        )}

                        {/* Info Message */}
                        {!isDefault && logoType === 'custom' && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-yellow-700">
                                💡 โลโก้กำลังอัปโหลด... จะถูกบันทึกอัตโนมัติเมื่อเสร็จสิ้น
                            </div>
                        )}

                        {/* Gallery Toggle Button */}
                        <button
                            type="button"
                            onClick={handleToggleGallery}
                            className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2 text-xs sm:text-sm font-medium"
                        >
                            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {showGallery ? 'ซ่อนคลังโลโก้' : 'เลือกจากคลังโลโก้'}
                        </button>

                        {/* Logo Gallery */}
                        {showGallery && (
                            <div className="border rounded-lg p-2 sm:p-4 bg-slate-50 max-h-80 sm:max-h-96 overflow-y-auto">
                                <div className="flex items-center justify-between mb-2 sm:mb-3">
                                    <h3 className="text-xs sm:text-sm font-semibold text-slate-700">คลังโลโก้ ({availableLogos.length})</h3>
                                    <button
                                        type="button"
                                        onClick={loadAvailableLogos}
                                        disabled={isLoadingGallery}
                                        className="text-xs text-indigo-600 hover:text-indigo-800 disabled:text-slate-400"
                                    >
                                        🔄 รีเฟรช
                                    </button>
                                </div>

                                {isLoadingGallery ? (
                                    <div className="flex items-center justify-center py-6 sm:py-8">
                                        <svg className="animate-spin h-5 w-5 sm:h-6 sm:w-6 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <span className="ml-2 text-xs sm:text-sm text-slate-600">กำลังโหลด...</span>
                                    </div>
                                ) : availableLogos.length === 0 ? (
                                    <div className="text-center py-6 sm:py-8 text-slate-500">
                                        <svg className="mx-auto h-8 w-8 sm:h-12 sm:w-12 text-slate-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        <p className="text-xs sm:text-sm">ยังไม่มีโลโก้ในคลัง</p>
                                        <p className="text-xs text-slate-400 mt-1">อัปโหลดโลโก้เพื่อเริ่มต้นใช้งาน</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 sm:grid-cols-2 gap-2 sm:gap-3">
                                        {availableLogos.map((logo) => {
                                            const isCurrentLogo = logoUrl === logo.url;
                                            return (
                                                <div
                                                    key={logo.fullPath}
                                                    onClick={() => handleSelectLogo(logo)}
                                                    className={`relative border-2 rounded-lg p-3 cursor-pointer transition-all hover:shadow-md ${
                                                        isCurrentLogo 
                                                            ? 'border-indigo-500 bg-indigo-50' 
                                                            : 'border-slate-200 bg-white hover:border-indigo-300'
                                                    }`}
                                                >
                                                    {/* Current Logo Badge */}
                                                    {isCurrentLogo && (
                                                        <div className="absolute top-1 left-1">
                                                            <span className="text-xs px-2 py-0.5 bg-indigo-500 text-white rounded-full">
                                                                ✓ กำลังใช้
                                                            </span>
                                                        </div>
                                                    )}

                                                    {/* Delete Button */}
                                                    <button
                                                        type="button"
                                                        onClick={(e) => handleDeleteFromGallery(logo, e)}
                                                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full shadow hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 z-10"
                                                        title="ลบโลโก้"
                                                    >
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                    </button>

                                                    {/* Logo Image */}
                                                    <div className="flex items-center justify-center h-20 mb-2">
                                                        {logo.isLoadingPreview ? (
                                                            // แสดง loading spinner ขณะโหลด preview
                                                            <div className="flex items-center justify-center">
                                                                <svg className="animate-spin h-6 w-6 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                </svg>
                                                            </div>
                                                        ) : logo.preview ? (
                                                            // แสดง Base64 preview (ไม่มีปัญหา CORS)
                                                            <img 
                                                                src={logo.preview} 
                                                                alt={logo.name}
                                                                className="max-h-full max-w-full object-contain"
                                                            />
                                                        ) : (
                                                            // Fallback: แสดง placeholder ถ้าโหลดไม่สำเร็จ
                                                            <div className="text-slate-400 text-xs text-center">
                                                                ไม่สามารถโหลดภาพ
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Logo Info */}
                                                    <div className="text-xs text-slate-600 space-y-1">
                                                        <p className="font-medium truncate" title={logo.name}>
                                                            {logo.name}
                                                        </p>
                                                        <div className="flex justify-between text-slate-500">
                                                            <span>{formatFileSize(logo.size)}</span>
                                                            <span>{logo.uploadedAt.toLocaleDateString('th-TH', { 
                                                                day: 'numeric', 
                                                                month: 'short' 
                                                            })}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Modal Footer */}
                    <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-3 sm:px-6 py-3 sm:py-4 flex justify-end gap-2 sm:gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 sm:px-6 py-1.5 sm:py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium text-xs sm:text-sm"
                        >
                            ปิด
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default LogoManagerModal;

