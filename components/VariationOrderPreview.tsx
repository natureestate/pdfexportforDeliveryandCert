import React, { forwardRef } from 'react';
import { VariationOrderData } from '../types';
import { getDefaultLogoUrl } from '../services/logoStorage';
import QRCodeFooter from './QRCodeFooter';
import EndCustomerProjectPreview from './EndCustomerProjectPreview';

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
        <div ref={ref} className="bg-white shadow-lg p-6 md:p-8 w-full aspect-[210/297] overflow-auto text-[13px] leading-snug" id="printable-area">
            {/* Header - ปรับขนาดให้อ่านง่ายขึ้น */}
            <header className="flex justify-between items-start pb-3 border-b border-gray-300 mb-4">
                <div className="w-1/3">
                    {/* Logo */}
                    <div className="max-h-[100px] overflow-hidden flex items-center justify-start">
                        <img 
                            src={displayLogo} 
                            alt="Company Logo" 
                            className="max-h-[100px] w-auto max-w-full object-contain object-center"
                            crossOrigin="anonymous"
                        />
                    </div>
                </div>
                <div className="w-2/3 text-right">
                    <h1 className="text-xl font-bold text-gray-800 leading-tight">ใบแจ้งเปลี่ยนแปลงงาน</h1>
                    <h2 className="text-sm text-gray-500">VARIATION ORDER (VO)</h2>
                    <div className="mt-2 text-xs space-y-0.5 text-gray-700">
                        <p><span className="font-semibold text-gray-600">เลขที่:</span> {data.voNumber || '________'} | <span className="font-semibold text-gray-600">วันที่:</span> {formatDate(data.date)}</p>
                        {data.contractNumber && (
                            <p><span className="font-semibold text-gray-600">อ้างอิงสัญญา:</span> {data.contractNumber}</p>
                        )}
                        <p><span className="font-semibold text-gray-600">ผู้ร้องขอ:</span> {getRequestedByText(data.requestedBy)}</p>
                    </div>
                </div>
            </header>

            {/* ข้อมูลบริษัทและลูกค้า */}
            <section className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-slate-50 p-2.5 rounded text-xs">
                    <p className="font-semibold text-slate-600 text-sm mb-1">บริษัทผู้ออกเอกสาร:</p>
                    <p className="font-bold text-slate-800 text-[13px]">{data.companyName || 'N/A'}</p>
                    {(data.companyBranchCode || data.companyBranchName) && (
                        <p className="text-slate-600 text-[11px]">
                            {data.companyBranchCode === '00000' 
                                ? (data.companyBranchName || 'สำนักงานใหญ่')
                                : `${data.companyBranchName || 'สาขา'} (${data.companyBranchCode || '-'})`}
                        </p>
                    )}
                    <p className="text-slate-600 whitespace-pre-wrap">{data.companyAddress || 'N/A'}</p>
                    <p className="text-slate-600">
                        {data.companyPhone && `โทร: ${data.companyPhone}`}
                        {data.companyPhone && data.companyEmail && ' | '}
                        {data.companyEmail && `${data.companyEmail}`}
                    </p>
                    {data.companyTaxId && <p className="text-slate-600">เลขประจำตัวผู้เสียภาษี: {data.companyTaxId}</p>}
                </div>
                <div className="bg-slate-50 p-2.5 rounded text-xs">
                    <p className="font-semibold text-slate-600 text-sm mb-1">ลูกค้า/โครงการ:</p>
                    <p className="font-bold text-slate-800 text-[13px]">{data.customerName || 'N/A'}</p>
                    {(data.customerBranchCode || data.customerBranchName) && (
                        <p className="text-slate-600 text-[11px]">
                            {data.customerBranchCode === '00000' 
                                ? (data.customerBranchName || 'สำนักงานใหญ่')
                                : `${data.customerBranchName || 'สาขา'} (${data.customerBranchCode || '-'})`}
                        </p>
                    )}
                    <p className="text-slate-600 whitespace-pre-wrap">{data.customerAddress || 'N/A'}</p>
                    {data.projectName && <p className="text-slate-600">โครงการ: {data.projectName}</p>}
                    {data.location && <p className="text-slate-600">สถานที่: {data.location}</p>}
                    <p className="text-slate-600">
                        {data.customerPhone && `โทร: ${data.customerPhone}`}
                        {data.customerPhone && data.customerEmail && ' | '}
                        {data.customerEmail && `${data.customerEmail}`}
                    </p>
                    {data.customerTaxId && <p className="text-slate-600">เลขประจำตัวผู้เสียภาษี: {data.customerTaxId}</p>}
                    
                    {/* End Customer Project */}
                    <EndCustomerProjectPreview
                        hasEndCustomerProject={data.hasEndCustomerProject}
                        endCustomerProject={data.endCustomerProject}
                        showEndCustomerInPdf={data.showEndCustomerInPdf}
                    />
                </div>
            </section>

            {/* รายละเอียดการเปลี่ยนแปลง */}
            <section className="mb-4 space-y-2">
                <div className="bg-indigo-50 px-3 py-2 rounded">
                    <p className="font-semibold text-indigo-800 text-sm">เรื่อง: {data.subject || '...........................'}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-red-50 px-3 py-2 rounded">
                        <p className="font-semibold text-red-800 text-xs mb-1">งานเดิม (Original):</p>
                        <p className="text-slate-700 whitespace-pre-wrap text-xs">{data.originalScope || '...........'}</p>
                    </div>
                    <div className="bg-green-50 px-3 py-2 rounded">
                        <p className="font-semibold text-green-800 text-xs mb-1">งานใหม่ (New):</p>
                        <p className="text-slate-700 whitespace-pre-wrap text-xs">{data.newScope || '...........'}</p>
                    </div>
                </div>
                {data.reasonForChange && (
                    <div className="bg-yellow-50 px-3 py-2 rounded">
                        <p className="font-semibold text-yellow-800 text-xs mb-1">เหตุผล:</p>
                        <p className="text-slate-700 whitespace-pre-wrap text-xs">{data.reasonForChange}</p>
                    </div>
                )}
            </section>
            
            {/* ตารางรายการงาน */}
            <section className="mb-4">
                {/* งานใหม่/งานเพิ่ม */}
                {newItems.length > 0 && (
                    <div className="mb-3">
                        <h4 className="font-semibold text-green-700 text-xs mb-1">A. งานใหม่/เพิ่ม (Add)</h4>
                        <table className="w-full text-left text-xs border-collapse">
                            <thead className="bg-green-700 text-white">
                                <tr>
                                    <th className="px-1.5 py-1 text-center font-semibold w-8">#</th>
                                    <th className="px-1.5 py-1 font-semibold">รายละเอียด</th>
                                    <th className="px-1.5 py-1 text-center font-semibold w-14">จำนวน</th>
                                    <th className="px-1.5 py-1 text-center font-semibold w-16">หน่วย</th>
                                    <th className="px-1.5 py-1 text-right font-semibold w-24">ราคา/หน่วย</th>
                                    <th className="px-1.5 py-1 text-right font-semibold w-28">จำนวนเงิน</th>
                                </tr>
                            </thead>
                            <tbody className="text-slate-700">
                                {newItems.map((item, index) => (
                                    <tr key={index} className="border-b border-slate-200 bg-green-50">
                                        <td className="px-1.5 py-1 text-center">{index + 1}</td>
                                        <td className="px-1.5 py-1 whitespace-pre-wrap">{item.description || '...'}</td>
                                        <td className="px-1.5 py-1 text-center">{item.quantity.toLocaleString('th-TH')}</td>
                                        <td className="px-1.5 py-1 text-center">{item.unit || '-'}</td>
                                        <td className="px-1.5 py-1 text-right">{item.unitPrice.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                                        <td className="px-1.5 py-1 text-right font-medium text-green-700">{item.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* งานเดิม/งานลด */}
                {deductItems.length > 0 && (
                    <div className="mb-3">
                        <h4 className="font-semibold text-red-700 text-xs mb-1">B. งานเดิม/ลด (Deduct)</h4>
                        <table className="w-full text-left text-xs border-collapse">
                            <thead className="bg-red-700 text-white">
                                <tr>
                                    <th className="px-1.5 py-1 text-center font-semibold w-8">#</th>
                                    <th className="px-1.5 py-1 font-semibold">รายละเอียด</th>
                                    <th className="px-1.5 py-1 text-center font-semibold w-14">จำนวน</th>
                                    <th className="px-1.5 py-1 text-center font-semibold w-16">หน่วย</th>
                                    <th className="px-1.5 py-1 text-right font-semibold w-24">ราคา/หน่วย</th>
                                    <th className="px-1.5 py-1 text-right font-semibold w-28">จำนวนเงิน</th>
                                </tr>
                            </thead>
                            <tbody className="text-slate-700">
                                {deductItems.map((item, index) => (
                                    <tr key={index} className="border-b border-slate-200 bg-red-50">
                                        <td className="px-1.5 py-1 text-center">{index + 1}</td>
                                        <td className="px-1.5 py-1 whitespace-pre-wrap">{item.description || '...'}</td>
                                        <td className="px-1.5 py-1 text-center">{item.quantity.toLocaleString('th-TH')}</td>
                                        <td className="px-1.5 py-1 text-center">{item.unit || '-'}</td>
                                        <td className="px-1.5 py-1 text-right">{item.unitPrice.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                                        <td className="px-1.5 py-1 text-right font-medium text-red-700">-{item.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {/* สรุปผลกระทบด้านราคา */}
            <section className="mb-4 flex justify-end">
                <div className="w-80 space-y-1 text-xs">
                    <div className="flex justify-between">
                        <span className="text-gray-600">ยอดรวมงานเพิ่ม:</span>
                        <span className="font-medium text-green-600">{data.newItemsSubtotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600">ยอดรวมงานลด:</span>
                        <span className="font-medium text-red-600">-{data.deductItemsSubtotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-gray-300">
                        <span className="font-semibold text-gray-900">ส่วนต่างสุทธิ:</span>
                        <span className={`font-bold ${data.netDifference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {data.netDifference.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
                        </span>
                    </div>
                    {data.taxRate > 0 && (
                        <div className="flex justify-between">
                            <span className="text-gray-600">VAT ({data.taxRate}%):</span>
                            <span className="font-medium text-gray-800">{data.taxAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</span>
                        </div>
                    )}
                    <div className="flex justify-between pt-1 border-t border-gray-400 text-sm">
                        <span className="font-bold text-gray-900">รวมชำระเพิ่ม/หัก:</span>
                        <span className={`font-bold ${data.totalAmount >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>
                            {data.totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
                        </span>
                    </div>
                    {data.paymentNote && (
                        <div className="text-[11px] text-gray-600 italic">{data.paymentNote}</div>
                    )}
                </div>
            </section>

            {/* สรุปผลกระทบด้านระยะเวลา + หมายเหตุ */}
            <section className="mb-4 grid grid-cols-2 gap-3">
                <div className="bg-yellow-50 px-3 py-2 rounded text-xs">
                    <p className="font-semibold text-yellow-800 text-xs mb-1">ผลกระทบเวลา:</p>
                    {data.hasTimeImpact ? (
                        <p className="text-slate-700">☑ ขยาย {data.timeImpactDays || 0} วัน {data.timeImpactReason && `(${data.timeImpactReason})`}</p>
                    ) : (
                        <p className="text-slate-700">☐ ไม่มีผลกระทบ</p>
                    )}
                </div>
                <div className="bg-slate-50 px-3 py-2 rounded text-xs">
                    {data.terms && (
                        <p className="text-slate-700"><span className="font-semibold">เงื่อนไข:</span> {data.terms}</p>
                    )}
                    {data.notes && (
                        <p className="text-slate-700"><span className="font-semibold">หมายเหตุ:</span> {data.notes}</p>
                    )}
                    {!data.terms && !data.notes && (
                        <p className="text-slate-400 italic">-</p>
                    )}
                </div>
            </section>

            {/* ส่วนอนุมัติ */}
            <section className="mb-3">
                <div className="grid grid-cols-2 gap-6">
                    <div className="text-center">
                        <p className="font-semibold text-slate-600 text-xs mb-2">ลงนามผู้อนุมัติ (ลูกค้า)</p>
                        <div className="border-t border-gray-400 pt-1 mt-10">
                            <p className="text-[11px] text-gray-600">({data.customerApproverName || '...........................'})</p>
                            {data.customerApproverDate && (
                                <p className="text-[11px] text-gray-600">วันที่: {formatDate(data.customerApproverDate)}</p>
                            )}
                        </div>
                    </div>
                    <div className="text-center">
                        <p className="font-semibold text-slate-600 text-xs mb-2">ลงนามผู้เสนอ (บริษัท)</p>
                        <div className="border-t border-gray-400 pt-1 mt-10">
                            <p className="text-[11px] text-gray-600">({data.companyApproverName || '...........................'})</p>
                            {data.companyApproverDate && (
                                <p className="text-[11px] text-gray-600">วันที่: {formatDate(data.companyApproverDate)}</p>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="mt-4 text-[11px] border-t border-gray-200 pt-2">
                <div className="flex justify-between items-end">
                    <div className="flex-1">
                        {data.issuedBy && (
                            <p className="text-gray-600 mb-1">ผู้ออกเอกสาร: {data.issuedBy}</p>
                        )}
                        <p className="text-gray-400 text-[10px]">* ห้ามทำงานก่อนเซ็น - ทีมช่างจะเริ่มงานเมื่อได้รับอนุมัติ</p>
                    </div>
                    {/* QR Code */}
                    <QRCodeFooter 
                        docType="variation-order" 
                        verificationToken={data.verificationToken}
                        size={60}
                    />
                </div>
            </footer>
        </div>
    );
});

export default VariationOrderPreview;

