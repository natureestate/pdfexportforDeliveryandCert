import React, { forwardRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DeliveryNoteData } from '../types';
// หมายเหตุ: ไม่ใช้ getDefaultLogoUrl แล้ว - ใช้ skeleton placeholder แทน default logo
import QRCodeFooter from './QRCodeFooter';
import QRCodeFooterSign from './QRCodeFooterSign';
import EndCustomerProjectPreview from './EndCustomerProjectPreview';

interface DocumentPreviewProps {
    data: DeliveryNoteData;
}

// Helper function สำหรับแปลง Firestore Timestamp เป็น Date
const toDate = (value: unknown): Date | null => {
    if (!value) return null;
    // ถ้าเป็น Date object แล้ว
    if (value instanceof Date) return value;
    // ถ้าเป็น Firestore Timestamp (มี toDate method)
    if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as any).toDate === 'function') {
        return (value as any).toDate();
    }
    // ถ้าเป็น object ที่มี seconds (Firestore Timestamp format)
    if (typeof value === 'object' && value !== null && 'seconds' in value) {
        return new Date((value as any).seconds * 1000);
    }
    // ถ้าเป็น string หรือ number
    if (typeof value === 'string' || typeof value === 'number') {
        const date = new Date(value);
        return isNaN(date.getTime()) ? null : date;
    }
    return null;
};

const DocumentPreview = forwardRef<HTMLDivElement, DocumentPreviewProps>(({ data }, ref) => {
    const { t, i18n } = useTranslation();
    const currentLang = i18n.language;
    
    const formatDate = (date: Date | null) => {
        if (!date) return '...........................';
        // ใช้ภาษาตามการตั้งค่าปัจจุบัน
        const locale = currentLang === 'en' ? 'en-US' : 'th-TH';
        return new Intl.DateTimeFormat(locale, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        }).format(date);
    };
    
    // แปลง signedAt เป็น Date object ที่ถูกต้อง
    const signedAtDate = toDate(data.signedAt);

    // ✅ กำหนดโลโก้ที่จะแสดง - ใช้ logo (Base64) ก่อนเพื่อหลีกเลี่ยงปัญหา CORS
    // ถ้าไม่มี Base64 ให้ใช้ logoUrl, ถ้าไม่มีเลยจะแสดง skeleton placeholder แทน
    const displayLogo = data.logo || data.logoUrl || null;
    const hasLogo = !!displayLogo;
    
    // State สำหรับ skeleton loading ตอนโหลดโลโก้
    const [logoLoading, setLogoLoading] = useState(true);
    const [logoError, setLogoError] = useState(false);

    return (
        <div ref={ref} className="bg-white shadow-lg p-8 md:p-12 w-full aspect-[210/297] overflow-auto text-sm" id="printable-area">
            <header className="flex justify-between items-start pb-3 border-b border-gray-400">
                <div className="w-2/5">
                    {/* Wrapper สำหรับ trim ขอบบนล่าง */}
                    <div className="max-h-[168px] overflow-hidden flex items-center justify-start">
                        {/* กรณีไม่มีโลโก้เลย - แสดง Skeleton Placeholder */}
                        {!hasLogo ? (
                            <div className="flex items-center justify-center w-40 h-24 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg">
                                <div className="text-center">
                                    <svg className="w-8 h-8 text-gray-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                                    </svg>
                                    <p className="text-[9px] text-gray-400 mt-1">โลโก้บริษัท</p>
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* Skeleton Loading - แสดงตอนกำลังโหลดโลโก้ */}
                                {logoLoading && !logoError && (
                                    <div className="animate-pulse flex items-center justify-center w-40 h-24 bg-gray-200 rounded-lg">
                                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                                        </svg>
                                    </div>
                                )}
                                <img 
                                    src={displayLogo} 
                                    alt="Company Logo" 
                                    className={`max-h-[168px] w-auto max-w-full object-contain object-center transition-opacity duration-300 ${logoLoading ? 'opacity-0 absolute' : 'opacity-100'}`}
                                    crossOrigin="anonymous"
                                    onLoad={() => setLogoLoading(false)}
                                    onError={() => { setLogoLoading(false); setLogoError(true); }}
                                />
                            </>
                        )}
                    </div>
                </div>
                <div className="w-3/5 text-right">
                    <h1 className="text-2xl font-bold text-gray-800">{currentLang === 'en' ? 'DELIVERY NOTE' : 'ใบส่งมอบงาน'}</h1>
                    <h2 className="text-lg text-gray-500">{currentLang === 'en' ? '' : 'DELIVERY NOTE'}</h2>
                    <div className="mt-4 text-xs text-gray-700">
                        <p><span className="font-semibold text-gray-600">{t('pdf.documentNumber')}:</span> <span className="text-gray-800">{data.docNumber || '________________'}</span></p>
                        <p><span className="font-semibold text-gray-600">{t('pdf.date')}:</span> <span className="text-gray-800">{formatDate(data.date)}</span></p>
                    </div>
                </div>
            </header>

            <section className="grid grid-cols-2 gap-4 my-4">
                <div className="bg-slate-50 p-3 rounded-md">
                    <p className="font-semibold text-slate-600 text-base mb-1">{t('delivery.sender')}:</p>
                    <p className="font-bold text-slate-800">{data.fromCompany || 'N/A'}</p>
                    {/* แสดงข้อมูลสาขาตามประกาศอธิบดีกรมสรรพากร (ฉบับที่ 200) */}
                    {(data.fromBranchCode || data.fromBranchName) && (
                        <p className="text-slate-600 text-xs font-medium">
                            {data.fromBranchCode === '00000' 
                                ? (data.fromBranchName || 'สำนักงานใหญ่')
                                : `${data.fromBranchName || 'สาขา'} (สาขาที่ ${data.fromBranchCode || '00001'})`
                            }
                        </p>
                    )}
                    <p className="text-slate-600 whitespace-pre-wrap text-xs">{data.fromAddress || 'N/A'}</p>
                    {data.fromTaxId && <p className="text-slate-600 text-xs mt-1">{t('company.taxId')}: {data.fromTaxId}</p>}
                    {data.fromPhone && <p className="text-slate-600 text-xs">{t('company.phone')}: {data.fromPhone}</p>}
                    {data.fromEmail && <p className="text-slate-600 text-xs">{t('company.email')}: {data.fromEmail}</p>}
                    {data.fromWebsite && <p className="text-slate-600 text-xs">{t('company.website')}: {data.fromWebsite}</p>}
                </div>
                <div className="bg-slate-50 p-3 rounded-md">
                    <p className="font-semibold text-slate-600 text-base mb-1">{t('delivery.receiver')}:</p>
                    <p className="font-bold text-slate-800">{data.toCompany || 'N/A'}</p>
                    {/* แสดงข้อมูลสาขาผู้รับ (ถ้ามี) */}
                    {(data.toBranchCode || data.toBranchName) && (
                        <p className="text-slate-600 text-xs font-medium">
                            {data.toBranchCode === '00000' 
                                ? (data.toBranchName || 'สำนักงานใหญ่')
                                : `${data.toBranchName || 'สาขา'} (สาขาที่ ${data.toBranchCode || '00001'})`
                            }
                        </p>
                    )}
                    <p className="text-slate-600 whitespace-pre-wrap">{data.toAddress || 'N/A'}</p>
                    {data.toTaxId && <p className="text-slate-600 text-xs mt-1">{t('company.taxId')}: {data.toTaxId}</p>}
                    {data.toEmail && <p className="text-slate-600 text-xs">{t('company.email')}: {data.toEmail}</p>}
                    
                    {/* แสดงข้อมูลโครงการลูกค้าปลายทาง (End Customer Project) */}
                    <EndCustomerProjectPreview
                        hasEndCustomerProject={data.hasEndCustomerProject}
                        endCustomerProject={data.endCustomerProject}
                        showEndCustomerInPdf={data.showEndCustomerInPdf}
                    />
                </div>
            </section>
            
            {data.project && (
                <section className="mb-4">
                    <p><span className="font-semibold text-slate-600">{t('form.project')}:</span> <span className="font-semibold text-slate-800">{data.project}</span></p>
                </section>
            )}

            <section className="min-h-[250px]">
                <table className="w-full text-left text-sm">
                    <thead className="border-b border-slate-300">
                        <tr>
                            <th className="p-2 text-center font-semibold text-slate-600 w-12">#</th>
                            <th className="p-2 font-semibold text-slate-600">{t('items.description')}</th>
                            <th className="p-2 text-center font-semibold text-slate-600 w-20">{t('items.quantity')}</th>
                            <th className="p-2 text-center font-semibold text-slate-600 w-24">{t('items.unit')}</th>
                            <th className="p-2 font-semibold text-slate-600 w-1/4">{t('items.notes')}</th>
                        </tr>
                    </thead>
                    <tbody className="text-slate-700">
                        {data.items.map((item, index) => (
                            <tr key={index} className="border-b border-slate-100">
                                <td className="p-2 text-center align-top">{index + 1}</td>
                                <td className="p-2 align-top whitespace-pre-wrap">{item.description}</td>
                                <td className="p-2 text-center align-top">{item.quantity}</td>
                                <td className="p-2 text-center align-top">{item.unit}</td>
                                <td className="p-2 align-top">{item.notes}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>

            <footer className="mt-10 text-xs text-gray-700">
                <div className="grid grid-cols-2 gap-8 text-center">
                    {/* ผู้ส่ง */}
                    <div>
                        <div className="border-b border-dotted border-slate-400 w-3/4 mx-auto pb-1 mb-2"></div>
                        <p className="text-gray-800">({data.senderName || '...........................'})</p>
                        <p className="font-semibold mt-1 text-blue-600">{t('delivery.sender')}</p>
                        <p className="mt-4 text-gray-700">{t('pdf.date')}: ......./......./...........</p>
                    </div>
                    {/* ผู้รับ - แสดงลายเซ็นถ้าเซ็นแล้ว */}
                    <div>
                        {/* แสดงรูปลายเซ็น (ถ้าเซ็นแล้ว) */}
                        {data.signatureStatus === 'signed' && data.signatureImageUrl ? (
                            <div className="mb-2">
                                <img 
                                    src={data.signatureImageUrl} 
                                    alt="ลายเซ็นผู้รับ"
                                    className="h-16 max-w-[200px] mx-auto object-contain"
                                />
                            </div>
                        ) : (
                            <div className="border-b border-dotted border-slate-400 w-3/4 mx-auto pb-1 mb-2"></div>
                        )}
                        <p className="text-gray-800">
                            ({data.signatureStatus === 'signed' && data.signedBy ? data.signedBy : (data.receiverName || '...........................')})
                        </p>
                        <p className="font-semibold mt-1 text-blue-600">{t('delivery.receiver')}</p>
                        {/* แสดงวันที่เซ็น (ถ้าเซ็นแล้ว) หรือช่องกรอก */}
                        {data.signatureStatus === 'signed' && signedAtDate ? (
                            <p className="mt-4 text-gray-700">
                                {t('pdf.date')}: {new Intl.DateTimeFormat('th-TH', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                }).format(signedAtDate)}
                            </p>
                        ) : (
                            <p className="mt-4 text-gray-700">{t('pdf.date')}: ......./......./...........</p>
                        )}
                        {/* Badge เซ็นแล้ว */}
                        {data.signatureStatus === 'signed' && (
                            <p className="mt-2 text-green-600 font-semibold text-xs">✓ ยืนยันรับมอบแล้ว</p>
                        )}
                    </div>
                </div>

                {/* QR Code - ควบคุมการแสดงผลด้วย showVerificationQR และ showSignQR */}
                {(data.showVerificationQR !== false || data.showSignQR) && (
                    <div className="mt-4 flex justify-between items-start">
                        {/* QR Code สำหรับตรวจสอบต้นฉบับเอกสาร (ซ้าย) */}
                        <div className="flex flex-col items-center" style={{ minWidth: 90 }}>
                            {data.showVerificationQR !== false && (
                                <QRCodeFooter 
                                    docType="delivery" 
                                    verificationToken={data.verificationToken}
                                    size={65}
                                />
                            )}
                        </div>
                        
                        {/* QR Code สำหรับเซ็นรับมอบ (ขวา) - แสดงเมื่อเปิดใช้งานและยังไม่ได้เซ็น */}
                        <div className="flex flex-col items-center" style={{ minWidth: 90 }}>
                            {data.showSignQR && data.signToken && data.signatureStatus !== 'signed' ? (
                                <QRCodeFooterSign 
                                    docType="delivery" 
                                    signToken={data.signToken}
                                    size={65}
                                    label="สแกนเพื่อเซ็นรับมอบ"
                                />
                            ) : data.showSignQR && data.signatureStatus === 'signed' ? (
                                <div className="text-center text-xs p-2 bg-green-50 border border-green-200 rounded-md" style={{ minWidth: 90 }}>
                                    <p className="text-green-600 font-semibold">✓ เซ็นแล้ว</p>
                                    {signedAtDate && (
                                        <p className="text-slate-500 mt-1 text-[10px]">
                                            {new Intl.DateTimeFormat('th-TH', {
                                                day: 'numeric',
                                                month: 'short',
                                                year: '2-digit',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            }).format(signedAtDate)}
                                        </p>
                                    )}
                                </div>
                            ) : null}
                        </div>
                    </div>
                )}
            </footer>
        </div>
    );
});

export default DocumentPreview;