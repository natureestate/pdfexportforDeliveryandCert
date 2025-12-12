/**
 * Organization Logo Manager Component
 * Component สำหรับจัดการ Logo องค์กร (แสดงใน Header) แยกจาก Logo เอกสาร (แสดงใน PDF)
 */

import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Upload, Trash2, Building2, Image, AlertCircle, CheckCircle } from 'lucide-react';
import { uploadLogoFile, convertStorageUrlToBase64 } from '../services/logoStorage';
import { updateCompany } from '../services/companies';
import { useCompany } from '../contexts/CompanyContext';

interface OrganizationLogoManagerProps {
    isOpen: boolean;
    onClose: () => void;
}

const OrganizationLogoManager: React.FC<OrganizationLogoManagerProps> = ({ isOpen, onClose }) => {
    const { t } = useTranslation();
    const { currentCompany, refreshCompanies } = useCompany();
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // โหลด logo ปัจจุบันเมื่อเปิด modal
    useEffect(() => {
        const loadCurrentLogo = async () => {
            if (isOpen && currentCompany?.organizationLogoUrl) {
                try {
                    const base64 = await convertStorageUrlToBase64(currentCompany.organizationLogoUrl);
                    setLogoPreview(base64);
                } catch (error) {
                    console.error('Error loading organization logo:', error);
                    setLogoPreview(currentCompany.organizationLogoUrl);
                }
            } else {
                setLogoPreview(null);
            }
        };
        loadCurrentLogo();
    }, [isOpen, currentCompany?.organizationLogoUrl]);

    // Reset states เมื่อเปิด modal
    useEffect(() => {
        if (isOpen) {
            setError(null);
            setSuccess(null);
        }
    }, [isOpen]);

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // ตรวจสอบประเภทไฟล์
        const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            setError(t('organizationLogo.invalidFileType'));
            return;
        }

        // ตรวจสอบขนาดไฟล์ (สูงสุด 2MB)
        const maxSize = 2 * 1024 * 1024;
        if (file.size > maxSize) {
            setError(t('organizationLogo.fileTooLarge'));
            return;
        }

        setError(null);
        setIsUploading(true);

        try {
            // อัปโหลดไฟล์ไปยัง Firebase Storage
            const fileName = `org-logo-${currentCompany?.id}-${Date.now()}.${file.name.split('.').pop()}`;
            const logoUrl = await uploadLogoFile(file, fileName);

            // อัปเดต Company document
            if (currentCompany?.id) {
                await updateCompany(currentCompany.id, {
                    organizationLogoUrl: logoUrl,
                });
            }

            // แสดง preview
            const reader = new FileReader();
            reader.onload = (e) => {
                setLogoPreview(e.target?.result as string);
            };
            reader.readAsDataURL(file);

            // Refresh companies เพื่ออัปเดต context
            await refreshCompanies();

            setSuccess(t('organizationLogo.uploadSuccess'));
            setTimeout(() => setSuccess(null), 3000);
        } catch (error) {
            console.error('Error uploading organization logo:', error);
            setError(t('organizationLogo.uploadError'));
        } finally {
            setIsUploading(false);
            // Reset input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleRemoveLogo = async () => {
        if (!currentCompany?.id) return;

        setIsDeleting(true);
        setError(null);

        try {
            // อัปเดต Company document ให้ลบ logo
            await updateCompany(currentCompany.id, {
                organizationLogoUrl: null,
            });

            setLogoPreview(null);
            await refreshCompanies();

            setSuccess(t('organizationLogo.removeSuccess'));
            setTimeout(() => setSuccess(null), 3000);
        } catch (error) {
            console.error('Error removing organization logo:', error);
            setError(t('organizationLogo.removeError'));
        } finally {
            setIsDeleting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/20 rounded-lg">
                                <Building2 className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">
                                    {t('organizationLogo.title')}
                                </h2>
                                <p className="text-emerald-100 text-sm">
                                    {t('organizationLogo.subtitle')}
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
                                <p className="font-medium mb-1">{t('organizationLogo.infoTitle')}</p>
                                <p>{t('organizationLogo.infoDescription')}</p>
                            </div>
                        </div>
                    </div>

                    {/* Current Logo Preview */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            {t('organizationLogo.currentLogo')}
                        </label>
                        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 flex flex-col items-center justify-center bg-gray-50 dark:bg-slate-700/50">
                            {logoPreview ? (
                                <div className="relative group">
                                    <img
                                        src={logoPreview}
                                        alt="Organization Logo"
                                        className="max-h-32 max-w-full object-contain rounded-lg shadow-md"
                                    />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                                        <button
                                            onClick={handleRemoveLogo}
                                            disabled={isDeleting}
                                            className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                                        >
                                            {isDeleting ? (
                                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            ) : (
                                                <Trash2 className="w-5 h-5" />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center">
                                    <Image className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {t('organizationLogo.noLogo')}
                                    </p>
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
                            disabled={isUploading}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isUploading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    <span>{t('organizationLogo.uploading')}</span>
                                </>
                            ) : (
                                <>
                                    <Upload className="w-5 h-5" />
                                    <span>{t('organizationLogo.uploadNew')}</span>
                                </>
                            )}
                        </button>
                        <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
                            {t('organizationLogo.fileRequirements')}
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
                        {t('app.close')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OrganizationLogoManager;

