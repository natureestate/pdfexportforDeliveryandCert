import React, { forwardRef } from 'react';
import { ReceiptData } from '../types';
import { getDefaultLogoUrl } from '../services/logoStorage';
import QRCodeFooter from './QRCodeFooter';

interface ReceiptPreviewProps {
    data: ReceiptData;
}

const ReceiptPreview = forwardRef<HTMLDivElement, ReceiptPreviewProps>(({ data }, ref) => {
    const formatDate = (date: Date | null) => {
        if (!date) return '...........................';
        return new Intl.DateTimeFormat('th-TH', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        }).format(date);
    };

    // ✅ กำหนดโลโก้ที่จะแสดง - ใช้ logo (Base64) ก่อนเพื่อหลีกเลี่ยงปัญหา CORS
    const displayLogo = data.logo || data.logoUrl || getDefaultLogoUrl();

    return (
        <div ref={ref} className="bg-white shadow-lg p-8 md:p-12 w-full aspect-[210/297] overflow-auto text-sm" id="printable-area">
            <header className="flex justify-between items-start pb-4 border-b border-gray-400">
                <div className="w-2/5">
                    {/* Wrapper สำหรับ trim ขอบบนล่าง */}
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
                    <h1 className="text-2xl font-bold text-gray-800">ใบเสร็จ</h1>
                    <h2 className="text-lg text-gray-500">RECEIPT</h2>
                    <div className="mt-4 text-xs space-y-1 text-gray-700">
                        <p><span className="font-semibold text-gray-600">เลขที่:</span> <span className="text-gray-800">{data.receiptNumber || '________________'}</span></p>
                        <p><span className="font-semibold text-gray-600">วันที่ออก:</span> <span className="text-gray-800">{formatDate(data.receiptDate)}</span></p>
                        {data.referenceNumber && (
                            <p><span className="font-semibold text-gray-600">เลขที่อ้างอิง:</span> <span className="text-gray-800">{data.referenceNumber}</span></p>
                        )}
                    </div>
                </div>
            </header>

            <section className="grid grid-cols-2 gap-6 my-6">
                <div className="bg-slate-50 p-3 rounded-md">
                    <p className="font-semibold text-slate-600 text-base mb-1">ผู้ขาย:</p>
                    <p className="font-bold text-slate-800">{data.companyName || 'N/A'}</p>
                    {/* แสดงข้อมูลสาขาตามประกาศอธิบดีกรมสรรพากร (ฉบับที่ 200) */}
                    {(data.companyBranchCode || data.companyBranchName) && (
                        <p className="text-slate-600 text-xs font-medium">
                            {data.companyBranchCode === '00000' 
                                ? (data.companyBranchName || 'สำนักงานใหญ่')
                                : `${data.companyBranchName || 'สาขา'} (สาขาที่ ${data.companyBranchCode || 'ไม่ระบุ'})`}
                        </p>
                    )}
                    <p className="text-slate-600 whitespace-pre-wrap text-xs">{data.companyAddress || 'N/A'}</p>
                    {data.companyPhone && <p className="text-slate-600 text-xs mt-1">โทร: {data.companyPhone}</p>}
                    {data.companyEmail && <p className="text-slate-600 text-xs">อีเมล: {data.companyEmail}</p>}
                    {data.companyWebsite && <p className="text-slate-600 text-xs">เว็บไซต์: {data.companyWebsite}</p>}
                    {data.companyTaxId && (
                        <p className="text-slate-600 text-xs mt-1">เลขประจำตัวผู้เสียภาษี: {data.companyTaxId}</p>
                    )}
                </div>
                <div className="bg-slate-50 p-3 rounded-md">
                    <p className="font-semibold text-slate-600 text-base mb-1">ผู้ซื้อ:</p>
                    <p className="font-bold text-slate-800">{data.customerName || 'N/A'}</p>
                    {/* แสดงข้อมูลสาขาลูกค้า (สำหรับนิติบุคคล) */}
                    {(data.customerBranchCode || data.customerBranchName) && (
                        <p className="text-slate-600 text-xs font-medium">
                            {data.customerBranchCode === '00000' 
                                ? (data.customerBranchName || 'สำนักงานใหญ่')
                                : `${data.customerBranchName || 'สาขา'} (สาขาที่ ${data.customerBranchCode || 'ไม่ระบุ'})`}
                        </p>
                    )}
                    <p className="text-slate-600 whitespace-pre-wrap text-xs">{data.customerAddress || 'N/A'}</p>
                    {data.customerPhone && <p className="text-slate-600 text-xs mt-1">โทร: {data.customerPhone}</p>}
                    {data.customerEmail && <p className="text-slate-600 text-xs">อีเมล: {data.customerEmail}</p>}
                    {data.customerTaxId && (
                        <p className="text-slate-600 text-xs mt-1">เลขประจำตัวผู้เสียภาษี: {data.customerTaxId}</p>
                    )}
                </div>
            </section>
            
            <section className="min-h-[300px] mb-6">
                <table className="w-full text-left text-sm">
                    <thead className="bg-green-700 text-white">
                        <tr>
                            <th className="p-2 text-center font-semibold w-12">#</th>
                            <th className="p-2 font-semibold">รายละเอียด</th>
                            <th className="p-2 text-center font-semibold w-20">จำนวน</th>
                            <th className="p-2 text-center font-semibold w-24">หน่วย</th>
                            <th className="p-2 text-right font-semibold w-28">ราคาต่อหน่วย</th>
                            <th className="p-2 text-right font-semibold w-32">จำนวนเงิน</th>
                        </tr>
                    </thead>
                    <tbody className="text-slate-700">
                        {data.items.map((item, index) => (
                            <tr key={index} className="border-b border-slate-200">
                                <td className="p-2 text-center align-top">{index + 1}</td>
                                <td className="p-2 align-top whitespace-pre-wrap">{item.description || '...........................'}</td>
                                <td className="p-2 text-center align-top">{item.quantity.toLocaleString('th-TH')}</td>
                                <td className="p-2 text-center align-top">{item.unit || '-'}</td>
                                <td className="p-2 text-right align-top">{item.unitPrice.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                <td className="p-2 text-right align-top font-medium">{item.amount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>

            {/* สรุปยอดเงิน */}
            <section className="mb-6 flex justify-end">
                <div className="w-80 space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-600">ยอดรวมก่อนภาษี:</span>
                        <span className="font-medium text-gray-800">{data.subtotal.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท</span>
                    </div>
                    {data.taxRate > 0 && (
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">ภาษีมูลค่าเพิ่ม ({data.taxRate}%):</span>
                            <span className="font-medium text-gray-800">{data.taxAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท</span>
                        </div>
                    )}
                    {data.discount > 0 && (
                        <div className="flex justify-between text-sm text-red-600">
                            <span>ส่วนลด:</span>
                            <span className="font-medium text-red-600">-{data.discount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท</span>
                        </div>
                    )}
                    <div className="flex justify-between pt-2 border-t border-gray-400 text-base">
                        <span className="font-bold text-gray-900">ยอดรวมทั้งสิ้น:</span>
                        <span className="font-bold text-green-600">{data.total.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท</span>
                    </div>
                </div>
            </section>

            {/* ข้อมูลการรับเงิน */}
            <section className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="space-y-2">
                    {data.paymentMethod && (
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">วิธีการชำระเงิน:</span>
                            <span className="font-medium text-gray-900">{data.paymentMethod}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-600">จำนวนเงินที่รับ:</span>
                        <span className="font-medium text-gray-900">{data.paidAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท</span>
                    </div>
                    {data.changeAmount > 0 && (
                        <div className="flex justify-between pt-2 border-t border-green-300 text-base">
                            <span className="font-semibold text-green-800">เงินทอน:</span>
                            <span className="font-bold text-green-600">{data.changeAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท</span>
                        </div>
                    )}
                </div>
            </section>

            {/* หมายเหตุ */}
            {data.notes && (
                <section className="mb-6">
                    <p className="font-semibold text-slate-600 text-sm mb-1">หมายเหตุ:</p>
                    <p className="text-slate-700 whitespace-pre-wrap text-xs">{data.notes}</p>
                </section>
            )}

            {/* Footer */}
            <footer className="mt-8 text-xs">
                <div className="flex justify-between items-end">
                    <div className="text-center flex-1">
                        {data.issuedBy && (
                            <div className="mb-4">
                                <p className="text-gray-600">ผู้ออกเอกสาร: {data.issuedBy}</p>
                            </div>
                        )}
                        <p className="text-gray-500">ขอบคุณที่ใช้บริการ</p>
                    </div>
                    {/* QR Code สำหรับตรวจสอบเอกสาร */}
                    <QRCodeFooter 
                        docType="receipt" 
                        verificationToken={data.verificationToken}
                        size={70}
                    />
                </div>
            </footer>
        </div>
    );
});

export default ReceiptPreview;

