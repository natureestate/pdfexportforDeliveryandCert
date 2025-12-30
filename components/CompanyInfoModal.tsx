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
    
    /** อีเมลบริษัทปัจจุบัน */
    companyEmail?: string;
    
    /** เว็บไซต์บริษัทปัจจุบัน */
    companyWebsite?: string;
    
    /** เลขประจำตัวผู้เสียภาษีบริษัทปัจจุบัน */
    companyTaxId?: string;
    
    /** รหัสสาขา (5 หลัก) ตามประกาศอธิบดีกรมสรรพากร ฉบับที่ 200 */
    companyBranchCode?: string;
    
    /** ชื่อสาขา */
    companyBranchName?: string;
    
    /** Callback เมื่อบันทึกข้อมูล */
    onSave: (data: {
        name: string;
        address?: string;
        phone?: string;
        email?: string;
        website?: string;
        taxId?: string;
        branchCode?: string;
        branchName?: string;
    }) => Promise<void>;
}

const CompanyInfoModal: React.FC<CompanyInfoModalProps> = ({
    isOpen,
    onClose,
    companyName,
    companyAddress,
    companyPhone,
    companyEmail,
    companyWebsite,
    companyTaxId,
    companyBranchCode,
    companyBranchName,
    onSave,
}) => {
    const [name, setName] = useState(companyName);
    const [address, setAddress] = useState(companyAddress || '');
    const [phone, setPhone] = useState(companyPhone || '');
    const [email, setEmail] = useState(companyEmail || '');
    const [website, setWebsite] = useState(companyWebsite || '');
    const [taxId, setTaxId] = useState(companyTaxId || '');
    // ข้อมูลสาขาตามประกาศอธิบดีกรมสรรพากร (ฉบับที่ 200)
    // Default: สำนักงานใหญ่ = 00000
    const [branchCode, setBranchCode] = useState(companyBranchCode || '00000');
    const [branchName, setBranchName] = useState(companyBranchName || 'สำนักงานใหญ่');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // อัปเดต state เมื่อ props เปลี่ยน
    useEffect(() => {
        setName(companyName);
        setAddress(companyAddress || '');
        setPhone(companyPhone || '');
        setEmail(companyEmail || '');
        setWebsite(companyWebsite || '');
        setTaxId(companyTaxId || '');
        setBranchCode(companyBranchCode || '00000');
        setBranchName(companyBranchName || 'สำนักงานใหญ่');
    }, [companyName, companyAddress, companyPhone, companyEmail, companyWebsite, companyTaxId, companyBranchCode, companyBranchName]);

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
                website: website.trim() || undefined,
                taxId: taxId.trim() || undefined,
                branchCode: branchCode.trim() || '00000',
                branchName: branchName.trim() || 'สำนักงานใหญ่',
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

                        {/* อีเมล */}
                        <div>
                            <label htmlFor="company-email" className="block text-sm font-medium text-gray-700 mb-2">
                                อีเมล
                            </label>
                            <input
                                type="email"
                                id="company-email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={isSaving}
                                placeholder="กรอกอีเมลบริษัท"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                            />
                        </div>

                        {/* เว็บไซต์ */}
                        <div>
                            <label htmlFor="company-website" className="block text-sm font-medium text-gray-700 mb-2">
                                เว็บไซต์
                            </label>
                            <input
                                type="url"
                                id="company-website"
                                value={website}
                                onChange={(e) => setWebsite(e.target.value)}
                                disabled={isSaving}
                                placeholder="กรอกเว็บไซต์บริษัท (เช่น https://example.com)"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                            />
                        </div>

                        {/* เลขประจำตัวผู้เสียภาษี */}
                        <div>
                            <label htmlFor="company-taxId" className="block text-sm font-medium text-gray-700 mb-2">
                                เลขประจำตัวผู้เสียภาษี
                            </label>
                            <input
                                type="text"
                                id="company-taxId"
                                value={taxId}
                                onChange={(e) => setTaxId(e.target.value)}
                                disabled={isSaving}
                                placeholder="กรอกเลขประจำตัวผู้เสียภาษี"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                            />
                        </div>

                        {/* ข้อมูลสาขา (ตามประกาศอธิบดีกรมสรรพากร ฉบับที่ 200) */}
                        <div className="border-t border-gray-200 pt-4 mt-4">
                            <div className="flex items-center gap-2 mb-4">
                                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                                <h3 className="text-sm font-semibold text-gray-700">ข้อมูลสาขา</h3>
                                <span className="text-xs text-gray-500">(ตามประกาศอธิบดีกรมสรรพากร ฉบับที่ 200)</span>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {/* รหัสสาขา */}
                                <div>
                                    <label htmlFor="company-branchCode" className="block text-sm font-medium text-gray-700 mb-2">
                                        รหัสสาขา (5 หลัก)
                                    </label>
                                    <input
                                        type="text"
                                        id="company-branchCode"
                                        value={branchCode}
                                        onChange={(e) => {
                                            // อนุญาตเฉพาะตัวเลข และจำกัด 5 หลัก
                                            const value = e.target.value.replace(/\D/g, '').slice(0, 5);
                                            setBranchCode(value);
                                            // ถ้าเป็น 00000 ให้ตั้งชื่อเป็นสำนักงานใหญ่อัตโนมัติ
                                            if (value === '00000' && branchName !== 'สำนักงานใหญ่') {
                                                setBranchName('สำนักงานใหญ่');
                                            }
                                        }}
                                        disabled={isSaving}
                                        placeholder="00000"
                                        maxLength={5}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed font-mono text-center"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">00000 = สำนักงานใหญ่</p>
                                </div>

                                {/* ชื่อสาขา */}
                                <div>
                                    <label htmlFor="company-branchName" className="block text-sm font-medium text-gray-700 mb-2">
                                        ชื่อสาขา
                                    </label>
                                    <input
                                        type="text"
                                        id="company-branchName"
                                        value={branchName}
                                        onChange={(e) => setBranchName(e.target.value)}
                                        disabled={isSaving}
                                        placeholder="สำนักงานใหญ่"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                    />
                                </div>
                            </div>

                            {/* ตัวอย่างการแสดงผล */}
                            <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                <p className="text-xs text-gray-500 mb-1">ตัวอย่างที่จะแสดงในเอกสาร:</p>
                                <p className="text-sm font-medium text-gray-700">
                                    {branchCode === '00000' 
                                        ? `${branchName || 'สำนักงานใหญ่'}` 
                                        : `${branchName || 'สาขา'} (สาขาที่ ${branchCode || '00001'})`
                                    }
                                </p>
                            </div>
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

