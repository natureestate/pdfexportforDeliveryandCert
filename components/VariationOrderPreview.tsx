import React, { forwardRef } from 'react';
import { VariationOrderData } from '../types';
import { getDefaultLogoUrl } from '../services/logoStorage';
import QRCodeFooter from './QRCodeFooter';

interface VariationOrderPreviewProps {
    data: VariationOrderData;
}

const VariationOrderPreview = forwardRef<HTMLDivElement, VariationOrderPreviewProps>(({ data }, ref) => {
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

    // แยกรายการงานใหม่และงานเดิม
    const newItems = data.items.filter(item => item.itemType === 'new');
    const deductItems = data.items.filter(item => item.itemType === 'deduct');

    // แปลงผู้ร้องขอเป็นข้อความภาษาไทย
    const getRequestedByText = (requestedBy: 'customer' | 'company' | 'designer') => {
        switch (requestedBy) {
            case 'customer':
                return 'ลูกค้า';
            case 'company':
                return 'บริษัท';
            case 'designer':
                return 'ผู้ออกแบบ';
            default:
                return requestedBy;
        }
    };

    return (
        <div ref={ref} className="bg-white shadow-lg p-8 md:p-12 w-full aspect-[210/297] overflow-auto text-sm" id="printable-area">
            <header className="flex justify-between items-start pb-4 border-b-2 border-gray-800">
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
                    <h1 className="text-2xl font-bold text-gray-800">ใบแจ้งเปลี่ยนแปลงงาน</h1>
                    <h2 className="text-lg text-gray-500">VARIATION ORDER (VO)</h2>
                    <div className="mt-4 text-xs space-y-1">
                        <p><span className="font-semibold text-gray-600">เลขที่:</span> {data.voNumber || '________________'}</p>
                        <p><span className="font-semibold text-gray-600">วันที่ออก:</span> {formatDate(data.date)}</p>
                        {data.contractNumber && (
                            <p><span className="font-semibold text-gray-600">อ้างอิงสัญญาเลขที่:</span> {data.contractNumber}</p>
                        )}
                        <p><span className="font-semibold text-gray-600">ผู้ร้องขอ:</span> {getRequestedByText(data.requestedBy)}</p>
                    </div>
                </div>
            </header>

            <section className="grid grid-cols-2 gap-6 my-6">
                <div className="bg-slate-50 p-3 rounded-md">
                    <p className="font-semibold text-slate-600 text-base mb-1">บริษัทผู้ออกเอกสาร:</p>
                    <p className="font-bold text-slate-800">{data.companyName || 'N/A'}</p>
                    <p className="text-slate-600 whitespace-pre-wrap text-xs">{data.companyAddress || 'N/A'}</p>
                    {data.companyPhone && <p className="text-slate-600 text-xs mt-1">โทร: {data.companyPhone}</p>}
                    {data.companyEmail && <p className="text-slate-600 text-xs">อีเมล: {data.companyEmail}</p>}
                    {data.companyWebsite && <p className="text-slate-600 text-xs">เว็บไซต์: {data.companyWebsite}</p>}
                    {data.companyTaxId && (
                        <p className="text-slate-600 text-xs mt-1">เลขประจำตัวผู้เสียภาษี: {data.companyTaxId}</p>
                    )}
                </div>
                <div className="bg-slate-50 p-3 rounded-md">
                    <p className="font-semibold text-slate-600 text-base mb-1">ลูกค้า/โครงการ:</p>
                    <p className="font-bold text-slate-800">{data.customerName || 'N/A'}</p>
                    <p className="text-slate-600 whitespace-pre-wrap text-xs">{data.customerAddress || 'N/A'}</p>
                    {data.projectName && <p className="text-slate-600 text-xs mt-1">โครงการ: {data.projectName}</p>}
                    {data.location && <p className="text-slate-600 text-xs">สถานที่: {data.location}</p>}
                    {data.customerPhone && <p className="text-slate-600 text-xs">โทร: {data.customerPhone}</p>}
                    {data.customerEmail && <p className="text-slate-600 text-xs">อีเมล: {data.customerEmail}</p>}
                    {data.customerTaxId && (
                        <p className="text-slate-600 text-xs mt-1">เลขประจำตัวผู้เสียภาษี: {data.customerTaxId}</p>
                    )}
                </div>
            </section>

            {/* รายละเอียดการเปลี่ยนแปลง */}
            <section className="mb-6 space-y-3">
                <div className="bg-indigo-50 p-3 rounded-md">
                    <p className="font-semibold text-indigo-800 text-base mb-2">เรื่อง: {data.subject || '...........................'}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-red-50 p-3 rounded-md">
                        <p className="font-semibold text-red-800 text-sm mb-1">รายละเอียดงานเดิม (Original Scope / Spec):</p>
                        <p className="text-slate-700 whitespace-pre-wrap text-xs">{data.originalScope || '...........................'}</p>
                    </div>
                    <div className="bg-green-50 p-3 rounded-md">
                        <p className="font-semibold text-green-800 text-sm mb-1">รายละเอียดงานใหม่ (New Scope / Spec):</p>
                        <p className="text-slate-700 whitespace-pre-wrap text-xs">{data.newScope || '...........................'}</p>
                    </div>
                </div>
                <div className="bg-yellow-50 p-3 rounded-md">
                    <p className="font-semibold text-yellow-800 text-sm mb-1">เหตุผลในการเปลี่ยนแปลง:</p>
                    <p className="text-slate-700 whitespace-pre-wrap text-xs">{data.reasonForChange || '...........................'}</p>
                </div>
            </section>
            
            {/* ตารางรายการงาน */}
            <section className="mb-6">
                <h3 className="font-semibold text-gray-800 text-base mb-2">รายการงาน</h3>
                
                {/* งานใหม่/งานเพิ่ม */}
                {newItems.length > 0 && (
                    <div className="mb-4">
                        <h4 className="font-semibold text-green-700 text-sm mb-2">A. งานใหม่ / งานเพิ่ม (New / Add)</h4>
                        <table className="w-full text-left text-sm border-collapse">
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
                                {newItems.map((item, index) => (
                                    <tr key={index} className="border-b border-slate-200 bg-green-50">
                                        <td className="p-2 text-center align-top">{index + 1}</td>
                                        <td className="p-2 align-top whitespace-pre-wrap">{item.description || '...........................'}</td>
                                        <td className="p-2 text-center align-top">{item.quantity.toLocaleString('th-TH')}</td>
                                        <td className="p-2 text-center align-top">{item.unit || '-'}</td>
                                        <td className="p-2 text-right align-top">{item.unitPrice.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                        <td className="p-2 text-right align-top font-medium text-green-700">{item.amount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* งานเดิม/งานลด */}
                {deductItems.length > 0 && (
                    <div className="mb-4">
                        <h4 className="font-semibold text-red-700 text-sm mb-2">B. งานเดิม / งานลด (Original / Deduct)</h4>
                        <table className="w-full text-left text-sm border-collapse">
                            <thead className="bg-red-700 text-white">
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
                                {deductItems.map((item, index) => (
                                    <tr key={index} className="border-b border-slate-200 bg-red-50">
                                        <td className="p-2 text-center align-top">{index + 1}</td>
                                        <td className="p-2 align-top whitespace-pre-wrap">{item.description || '...........................'}</td>
                                        <td className="p-2 text-center align-top">{item.quantity.toLocaleString('th-TH')}</td>
                                        <td className="p-2 text-center align-top">{item.unit || '-'}</td>
                                        <td className="p-2 text-right align-top">{item.unitPrice.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                        <td className="p-2 text-right align-top font-medium text-red-700">-{item.amount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {/* สรุปผลกระทบด้านราคา */}
            <section className="mb-6 flex justify-end">
                <div className="w-96 space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-600">ยอดรวมงานใหม่/งานเพิ่ม:</span>
                        <span className="font-medium text-green-600">{data.newItemsSubtotal.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-600">ยอดรวมงานเดิม/งานลด:</span>
                        <span className="font-medium text-red-600">-{data.deductItemsSubtotal.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-gray-300 text-sm">
                        <span className="font-semibold text-gray-900">ยอดรวมส่วนต่าง (สุทธิ):</span>
                        <span className={`font-bold ${data.netDifference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {data.netDifference.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท
                        </span>
                    </div>
                    {data.taxRate > 0 && (
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">ภาษีมูลค่าเพิ่ม ({data.taxRate}%):</span>
                            <span className="font-medium">{data.taxAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท</span>
                        </div>
                    )}
                    <div className="flex justify-between pt-2 border-t-2 border-gray-800 text-base">
                        <span className="font-bold text-gray-900">ยอดรวมที่ต้องชำระเพิ่ม/หัก:</span>
                        <span className={`font-bold ${data.totalAmount >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>
                            {data.totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท
                        </span>
                    </div>
                    {data.paymentNote && (
                        <div className="mt-2 text-xs text-gray-600 italic">
                            {data.paymentNote}
                        </div>
                    )}
                </div>
            </section>

            {/* สรุปผลกระทบด้านระยะเวลา */}
            <section className="mb-6">
                <div className="bg-yellow-50 p-3 rounded-md">
                    <p className="font-semibold text-yellow-800 text-sm mb-2">สรุปผลกระทบด้านระยะเวลา (Time Impact):</p>
                    {data.hasTimeImpact ? (
                        <div className="space-y-1 text-xs">
                            <p className="text-slate-700">☑ มีผลกระทบ ทำให้ระยะเวลาโครงการโดยรวม <span className="font-semibold">ขยายออกไป {data.timeImpactDays || 0} วันทำการ</span></p>
                            {data.timeImpactReason && (
                                <p className="text-slate-700 ml-4">เหตุผล: {data.timeImpactReason}</p>
                            )}
                        </div>
                    ) : (
                        <p className="text-slate-700 text-xs">☐ ไม่มีผลกระทบต่อกำหนดการเดิม</p>
                    )}
                </div>
            </section>

            {/* หมายเหตุและเงื่อนไข */}
            {(data.terms || data.notes) && (
                <section className="mb-6 space-y-2">
                    {data.terms && (
                        <div>
                            <p className="font-semibold text-slate-600 text-sm">เงื่อนไข:</p>
                            <p className="text-slate-700 whitespace-pre-wrap text-xs">{data.terms}</p>
                        </div>
                    )}
                    {data.notes && (
                        <div>
                            <p className="font-semibold text-slate-600 text-sm">หมายเหตุ:</p>
                            <p className="text-slate-700 whitespace-pre-wrap text-xs">{data.notes}</p>
                        </div>
                    )}
                </section>
            )}

            {/* ส่วนอนุมัติ */}
            <section className="mb-6">
                <div className="grid grid-cols-2 gap-6">
                    <div className="text-center">
                        <p className="font-semibold text-slate-600 text-sm mb-4">ลงนามผู้อนุมัติ (ลูกค้า)</p>
                        <div className="border-t-2 border-gray-800 pt-2 mt-16">
                            <p className="text-xs text-gray-600">({data.customerApproverName || '...........................'})</p>
                            {data.customerApproverDate && (
                                <p className="text-xs text-gray-600 mt-1">วันที่: {formatDate(data.customerApproverDate)}</p>
                            )}
                        </div>
                    </div>
                    <div className="text-center">
                        <p className="font-semibold text-slate-600 text-sm mb-4">ลงนามผู้เสนอ (บริษัท)</p>
                        <div className="border-t-2 border-gray-800 pt-2 mt-16">
                            <p className="text-xs text-gray-600">({data.companyApproverName || '...........................'})</p>
                            {data.companyApproverDate && (
                                <p className="text-xs text-gray-600 mt-1">วันที่: {formatDate(data.companyApproverDate)}</p>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="mt-8 text-xs">
                <div className="flex justify-between items-end">
                    <div className="text-center flex-1">
                        {data.issuedBy && (
                            <div className="mb-4">
                                <p className="text-gray-600">ผู้ออกเอกสาร: {data.issuedBy}</p>
                            </div>
                        )}
                        <p className="text-gray-500">หมายเหตุ: ห้ามทำงานก่อนเซ็น - ทีมช่างจะเริ่มงานเปลี่ยนแปลงเมื่องานนี้ได้รับการอนุมัติและลงนาม</p>
                    </div>
                    {/* QR Code สำหรับตรวจสอบเอกสาร */}
                    <QRCodeFooter 
                        docType="variation-order" 
                        verificationToken={data.verificationToken}
                        size={70}
                    />
                </div>
            </footer>
        </div>
    );
});

export default VariationOrderPreview;

