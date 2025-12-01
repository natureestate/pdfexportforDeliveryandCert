import React, { forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import { DeliveryNoteData } from '../types';
import { getDefaultLogoUrl } from '../services/logoStorage';
import QRCodeFooter from './QRCodeFooter';

interface DocumentPreviewProps {
    data: DeliveryNoteData;
}

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

    // ✅ กำหนดโลโก้ที่จะแสดง - ใช้ logo (Base64) ก่อนเพื่อหลีกเลี่ยงปัญหา CORS
    // ถ้าไม่มี Base64 ให้ใช้ logoUrl แต่อาจมีปัญหา CORS
    const displayLogo = data.logo || data.logoUrl || getDefaultLogoUrl();

    return (
        <div ref={ref} className="bg-white shadow-lg p-8 md:p-12 w-full aspect-[210/297] overflow-auto text-sm" id="printable-area">
            <header className="flex justify-between items-start pb-4 border-b-2 border-gray-800">
                <div className="w-2/5">
                    {/* Wrapper สำหรับ trim ขอบบนล่าง - ขยายเพิ่ม 30% จาก max-h-32 (128px) = 166.4px ≈ 168px */}
                    {/* ลด padding โดยใช้ auto height และ trim ขอบบนล่าง */}
                    <div className="max-h-[168px] overflow-hidden flex items-center justify-start">
                        <img 
                            src={displayLogo} 
                            alt="Company Logo" 
                            className="max-h-[168px] w-auto max-w-full object-contain object-center"
                            crossOrigin="anonymous"
                        />
                    </div>
                </div>
                <div className="w-3/5 text-right">
                    <h1 className="text-2xl font-bold text-gray-800">{currentLang === 'en' ? 'DELIVERY NOTE' : 'ใบส่งมอบงาน'}</h1>
                    <h2 className="text-lg text-gray-500">{currentLang === 'en' ? '' : 'DELIVERY NOTE'}</h2>
                    <div className="mt-4 text-xs">
                        <p><span className="font-semibold text-gray-600">{t('pdf.documentNumber')}:</span> {data.docNumber || '________________'}</p>
                        <p><span className="font-semibold text-gray-600">{t('pdf.date')}:</span> {formatDate(data.date)}</p>
                    </div>
                </div>
            </header>

            <section className="grid grid-cols-2 gap-6 my-6">
                <div className="bg-slate-50 p-3 rounded-md">
                    <p className="font-semibold text-slate-600 text-base mb-1">{t('delivery.sender')}:</p>
                    <p className="font-bold text-slate-800">{data.fromCompany || 'N/A'}</p>
                    <p className="text-slate-600 whitespace-pre-wrap text-xs">{data.fromAddress || 'N/A'}</p>
                    {data.fromPhone && <p className="text-slate-600 text-xs mt-1">{t('company.phone')}: {data.fromPhone}</p>}
                    {data.fromEmail && <p className="text-slate-600 text-xs">{t('company.email')}: {data.fromEmail}</p>}
                    {data.fromWebsite && <p className="text-slate-600 text-xs">{t('company.website')}: {data.fromWebsite}</p>}
                </div>
                <div className="bg-slate-50 p-3 rounded-md">
                    <p className="font-semibold text-slate-600 text-base mb-1">{t('delivery.receiver')}:</p>
                    <p className="font-bold text-slate-800">{data.toCompany || 'N/A'}</p>
                    <p className="text-slate-600 whitespace-pre-wrap">{data.toAddress || 'N/A'}</p>
                    {data.toEmail && <p className="text-slate-600 text-xs mt-1">{t('company.email')}: {data.toEmail}</p>}
                </div>
            </section>
            
            {data.project && (
                <section className="mb-6">
                    <p><span className="font-semibold text-slate-600">{t('form.project')}:</span> {data.project}</p>
                </section>
            )}

            <section className="min-h-[300px]">
                <table className="w-full text-left text-sm">
                    <thead className="border-b-2 border-slate-300">
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

            <footer className="mt-16 text-xs">
                <div className="grid grid-cols-2 gap-12 text-center">
                    <div>
                        <div className="border-b border-dotted border-slate-400 w-3/4 mx-auto pb-1 mb-2"></div>
                        <p>({data.senderName || '...........................'})</p>
                        <p className="font-semibold mt-1">{t('delivery.sender')}</p>
                        <p className="mt-4">{t('pdf.date')}: ......./......./...........</p>
                    </div>
                    <div>
                        <div className="border-b border-dotted border-slate-400 w-3/4 mx-auto pb-1 mb-2"></div>
                        <p>({data.receiverName || '...........................'})</p>
                        <p className="font-semibold mt-1">{t('delivery.receiver')}</p>
                        <p className="mt-4">{t('pdf.date')}: ......./......./...........</p>
                    </div>
                </div>
                {/* QR Code สำหรับตรวจสอบเอกสาร */}
                <div className="mt-6">
                    <QRCodeFooter 
                        docType="delivery" 
                        verificationToken={data.verificationToken}
                        size={70}
                    />
                </div>
            </footer>
        </div>
    );
});

export default DocumentPreview;