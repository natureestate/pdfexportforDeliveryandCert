import React, { forwardRef } from 'react';
import { MemoData } from '../types';
import { getDefaultLogoUrl } from '../services/logoStorage';
import QRCodeFooter from './QRCodeFooter';

interface MemoPreviewProps {
    data: MemoData;
}

const MemoPreview = forwardRef<HTMLDivElement, MemoPreviewProps>(({ data }, ref) => {
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
            {/* Header */}
            <header className="flex justify-between items-start pb-4 border-b border-gray-400">
                <div className="w-2/5">
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
                    <h1 className="text-2xl font-bold text-gray-800">ใบบันทึก</h1>
                    <h2 className="text-lg text-gray-500">MEMORANDUM</h2>
                    <div className="mt-4 text-xs text-gray-700">
                        <p><span className="font-semibold text-gray-600">เลขที่เอกสาร:</span> <span className="text-gray-800">{data.memoNumber || '________________'}</span></p>
                        <p><span className="font-semibold text-gray-600">วันที่:</span> <span className="text-gray-800">{formatDate(data.date)}</span></p>
                    </div>
                </div>
            </header>

            {/* ส่วนที่ 1: หัวกระดาษ */}
            <section className="my-6 space-y-3">
                <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="font-semibold text-slate-700">จาก:</div>
                    <div className="col-span-2 text-slate-800">
                        {data.fromName || '...........................'}
                        {data.fromPosition && <span className="text-slate-600"> / {data.fromPosition}</span>}
                    </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="font-semibold text-slate-700">ถึง:</div>
                    <div className="col-span-2 text-slate-800">
                        {data.toName || '...........................'}
                        {data.toPosition && <span className="text-slate-600"> / {data.toPosition}</span>}
                    </div>
                </div>
                
                {data.cc && (
                    <div className="grid grid-cols-3 gap-4 text-sm">
                        <div className="font-semibold text-slate-700">สำเนาถึง:</div>
                        <div className="col-span-2 text-slate-800">{data.cc}</div>
                    </div>
                )}
                
                <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="font-semibold text-slate-700">เรื่อง:</div>
                    <div className="col-span-2 text-slate-800 font-semibold">{data.subject || '...........................'}</div>
                </div>
            </section>

            {/* ส่วนที่ 2: การอ้างอิงโครงการ */}
            {(data.projectName || data.projectId || data.referenceDocument) && (
                <section className="my-6 bg-slate-50 p-4 rounded-md">
                    <h3 className="font-semibold text-slate-700 mb-2">การอ้างอิงโครงการ:</h3>
                    <div className="space-y-2 text-sm">
                        {data.projectName && (
                            <p><span className="font-semibold text-slate-600">ชื่อโครงการ / ลูกค้า:</span> {data.projectName}</p>
                        )}
                        {data.projectId && (
                            <p><span className="font-semibold text-slate-600">รหัสโครงการ:</span> {data.projectId}</p>
                        )}
                        {data.referenceDocument && (
                            <p><span className="font-semibold text-slate-600">อ้างอิงถึง:</span> {data.referenceDocument}</p>
                        )}
                    </div>
                </section>
            )}

            {/* ส่วนที่ 3: เนื้อหา */}
            <section className="my-6 space-y-4">
                <div>
                    <p className="font-semibold text-slate-700 mb-2">วัตถุประสงค์:</p>
                    <p className="text-slate-800">{data.purpose || '...........................'}</p>
                </div>
                
                <div>
                    <p className="font-semibold text-slate-700 mb-2">รายละเอียด:</p>
                    <div className="text-slate-800 whitespace-pre-wrap bg-slate-50 p-3 rounded-md min-h-[100px]">
                        {data.details || '...........................'}
                    </div>
                </div>
                
                {data.reason && (
                    <div>
                        <p className="font-semibold text-slate-700 mb-2">เหตุผล:</p>
                        <p className="text-slate-800 whitespace-pre-wrap">{data.reason}</p>
                    </div>
                )}
            </section>

            {/* ส่วนที่ 4: การดำเนินการ */}
            <section className="my-6 bg-blue-50 p-4 rounded-md border border-blue-200">
                <h3 className="font-semibold text-slate-700 mb-2">การดำเนินการ:</h3>
                <div className="space-y-2 text-sm">
                    <p className="text-slate-800 whitespace-pre-wrap">{data.actionRequired || '...........................'}</p>
                    {data.deadline && (
                        <p className="text-slate-600"><span className="font-semibold">กำหนดเสร็จ:</span> {formatDate(data.deadline)}</p>
                    )}
                    {(data.contactPerson || data.contactPhone) && (
                        <p className="text-slate-600">
                            <span className="font-semibold">ผู้ประสานงาน:</span> {data.contactPerson || ''}
                            {data.contactPhone && <span> โทร: {data.contactPhone}</span>}
                        </p>
                    )}
                </div>
            </section>

            {/* ส่วนที่ 5: การลงนาม */}
            <footer className="mt-12 space-y-8">
                {/* ผู้ออก Memo */}
                <div className="text-center">
                    <div className="border-b border-dotted border-slate-400 w-2/3 mx-auto pb-1 mb-2"></div>
                    <p className="text-slate-800">({data.issuedByName || '...........................'})</p>
                    <p className="font-semibold mt-1 text-slate-700">{data.issuedByPosition || '...........................'}</p>
                    <p className="text-xs text-slate-600 mt-2">ผู้ออกเอกสาร</p>
                </div>

                {/* ส่วนสำหรับผู้รับ (ถ้าต้องการการตอบกลับ) */}
                {data.requireResponse && (
                    <div className="mt-8 bg-yellow-50 p-4 rounded-md border border-yellow-200">
                        <h3 className="font-semibold text-slate-700 mb-3 text-center">ส่วนสำหรับผู้รับ</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex items-center space-x-4">
                                <label className="flex items-center">
                                    <input type="checkbox" className="mr-2" disabled checked={data.responseStatus === 'acknowledged'} />
                                    <span>รับทราบ</span>
                                </label>
                                <label className="flex items-center">
                                    <input type="checkbox" className="mr-2" disabled checked={data.responseStatus === 'approved'} />
                                    <span>อนุมัติ</span>
                                </label>
                                <label className="flex items-center">
                                    <input type="checkbox" className="mr-2" disabled checked={data.responseStatus === 'rejected'} />
                                    <span>ไม่อนุมัติ</span>
                                </label>
                            </div>
                            {data.responseReason && (
                                <p className="text-slate-600 mt-2">
                                    <span className="font-semibold">เหตุผล:</span> {data.responseReason}
                                </p>
                            )}
                            <div className="mt-4 text-center">
                                <div className="border-b border-dotted border-slate-400 w-2/3 mx-auto pb-1 mb-2"></div>
                                <p className="text-slate-800">({data.responseName || '...........................'})</p>
                                <p className="text-xs text-slate-600 mt-2">
                                    วันที่: {data.responseDate ? formatDate(data.responseDate) : '......./......./...........'}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </footer>

            {/* ข้อมูลบริษัท (ด้านล่างสุด) */}
            <div className="mt-8 pt-4 border-t border-gray-200 text-xs text-slate-600">
                <div className="flex justify-between items-end">
                    <div className="text-center flex-1">
                        <p className="font-semibold">{data.companyName || ''}</p>
                        {data.companyAddress && <p>{data.companyAddress}</p>}
                        {data.companyPhone && <p>โทร: {data.companyPhone}</p>}
                        {data.companyEmail && <p>อีเมล: {data.companyEmail}</p>}
                        {data.companyWebsite && <p>เว็บไซต์: {data.companyWebsite}</p>}
                    </div>
                    {/* QR Code สำหรับตรวจสอบเอกสาร */}
                    <QRCodeFooter 
                        docType="memo" 
                        verificationToken={data.verificationToken}
                        size={70}
                    />
                </div>
            </div>
        </div>
    );
});

MemoPreview.displayName = 'MemoPreview';

export default MemoPreview;

