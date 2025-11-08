/**
 * CompanyInfoModal Component
 * Modal สำหรับจัดการข้อมูลบริษัท (ชื่อ, ที่อยู่, โทรศัพท์, อีเมล)
 * ใช้งานใน dropdown profile menu
 */

import React, { useState, useEffect } from 'react';

interface CompanyInfoModalProps {
    /** แสดง modal หรือไม่ */
    isOpen: boolean;
    
    /** Callback เมื่อต้องการปิด modal */
    onClose: () => void;
    
    /** ชื่อบริษัทปัจจุบัน */
    companyName: string;
    
    /** ที่อยู่บริษัทปัจจุบัน */
    companyAddress?: string;
    
    /** เบอร์โทรศัพท์บริษัทปัจจุบัน */
    companyPhone?: string;
    
    /** อีเมล/เว็บไซต์บริษัทปัจจุบัน */
    companyEmail?: string;
    
    /** Callback เมื่อบันทึกข้อมูล */
    onSave: (data: {
        name: string;
        address?: string;
        phone?: string;
        email?: string;
    }) => Promise<void>;
}

const CompanyInfoModal: React.FC<CompanyInfoModalProps> = ({
    isOpen,
    onClose,
    companyName,
    companyAddress,
    companyPhone,
    companyEmail,
    onSave,
}) => {
    const [name, setName] = useState(companyName);
    const [address, setAddress] = useState(companyAddress || '');
    const [phone, setPhone] = useState(companyPhone || '');
    const [email, setEmail] = useState(companyEmail || '');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // อัปเดต state เมื่อ props เปลี่ยน
    useEffect(() => {
        setName(companyName);
        setAddress(companyAddress || '');
        setPhone(companyPhone || '');
        setEmail(companyEmail || '');
    }, [companyName, companyAddress, companyPhone, companyEmail]);

    // รีเซ็ต error เมื่อปิด modal
    useEffect(() => {
        if (!isOpen) {
            setError(null);
        }
    }, [isOpen]);

    /**
     * จัดการการบันทึกข้อมูล
     */
    const handleSave = async () => {
        // Validation
        if (!name.trim()) {
            setError('กรุณากรอกชื่อบริษัท');
            return;
        }

        setError(null);
        setIsSaving(true);

        try {
            await onSave({
                name: name.trim(),
                address: address.trim() || undefined,
                phone: phone.trim() || undefined,
                email: email.trim() || undefined,
            });

            console.log('✅ บันทึกข้อมูลบริษัทสำเร็จ');
            onClose();
        } catch (err: any) {
            console.error('❌ บันทึกข้อมูลบริษัทล้มเหลว:', err);
            setError(err.message || 'ไม่สามารถบันทึกข้อมูลได้');
        } finally {
            setIsSaving(false);
        }
    };

    // ถ้า modal ไม่เปิด ไม่แสดงอะไร
    if (!isOpen) return null;

    return (
        <>
            {/* Modal Overlay */}
            <div 
                className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
                onClick={onClose}
            >
                {/* Modal Content */}
                <div 
                    className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Modal Header */}
                    <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
                        <h2 className="text-xl font-bold text-gray-800">ข้อมูลบริษัท</h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                            disabled={isSaving}
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Modal Body */}
                    <div className="p-6 space-y-4">
                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-start gap-2">
                                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>{error}</span>
                            </div>
                        )}

                        {/* ชื่อบริษัท */}
                        <div>
                            <label htmlFor="company-name" className="block text-sm font-medium text-gray-700 mb-2">
                                ชื่อบริษัท <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                id="company-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                disabled={isSaving}
                                placeholder="กรอกชื่อบริษัท"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                            />
                        </div>

                        {/* ที่อยู่ */}
                        <div>
                            <label htmlFor="company-address" className="block text-sm font-medium text-gray-700 mb-2">
                                ที่อยู่
                            </label>
                            <textarea
                                id="company-address"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                disabled={isSaving}
                                placeholder="กรอกที่อยู่บริษัท"
                                rows={3}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed resize-none"
                            />
                        </div>

                        {/* โทรศัพท์ */}
                        <div>
                            <label htmlFor="company-phone" className="block text-sm font-medium text-gray-700 mb-2">
                                โทรศัพท์
                            </label>
                            <input
                                type="tel"
                                id="company-phone"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                disabled={isSaving}
                                placeholder="กรอกเบอร์โทรศัพท์"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                            />
                        </div>

                        {/* อีเมล/เว็บไซต์ */}
                        <div>
                            <label htmlFor="company-email" className="block text-sm font-medium text-gray-700 mb-2">
                                อีเมล/เว็บไซต์
                            </label>
                            <input
                                type="text"
                                id="company-email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={isSaving}
                                placeholder="กรอกอีเมลหรือเว็บไซต์"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                            />
                        </div>
                    </div>

                    {/* Modal Footer */}
                    <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            disabled={isSaving}
                            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            ยกเลิก
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isSaving ? (
                                <>
                                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span>กำลังบันทึก...</span>
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    <span>บันทึก</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default CompanyInfoModal;

