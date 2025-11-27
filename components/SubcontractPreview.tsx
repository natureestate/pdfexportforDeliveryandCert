/**
 * SubcontractPreview Component
 * Preview สัญญาจ้างเหมาช่วง (Sub-contractor Agreement)
 * แสดงผลแบบ Dynamic ตามข้อมูลที่กรอก พร้อม Export PDF
 */
import React, { forwardRef, useMemo } from 'react';
import { SubcontractData } from '../types';

interface SubcontractPreviewProps {
    data: SubcontractData;
}

// ฟังก์ชันแปลงวันที่เป็นภาษาไทย
const formatThaiDate = (date: Date | null): string => {
    if (!date) return '...........';
    const thaiMonths = [
        'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
        'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];
    const d = new Date(date);
    const day = d.getDate();
    const month = thaiMonths[d.getMonth()];
    const year = d.getFullYear() + 543; // แปลงเป็น พ.ศ.
    return `${day} ${month} พ.ศ. ${year}`;
};

// ฟังก์ชันแปลงวันที่เป็นรูปแบบสั้น
const formatThaiDateShort = (date: Date | null): string => {
    if (!date) return '...........';
    const d = new Date(date);
    const day = d.getDate();
    const month = d.getMonth() + 1;
    const year = d.getFullYear() + 543;
    return `${day}/${month}/${year}`;
};

// ฟังก์ชันจัดรูปแบบตัวเลขเงิน
const formatCurrency = (amount: number): string => {
    return amount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const SubcontractPreview = forwardRef<HTMLDivElement, SubcontractPreviewProps>(({ data }, ref) => {
    // คำนวณยอดรวมงวดงาน
    const totalMilestonePercentage = useMemo(() => {
        return data.paymentMilestones.reduce((sum, m) => sum + m.percentage, 0);
    }, [data.paymentMilestones]);

    const totalMilestoneAmount = useMemo(() => {
        return data.paymentMilestones.reduce((sum, m) => sum + m.amount, 0);
    }, [data.paymentMilestones]);

    return (
        <div ref={ref} className="bg-white p-6 sm:p-8 max-w-4xl mx-auto print:p-6 print:max-w-none" style={{ fontFamily: "'IBM Plex Sans Thai', sans-serif" }}>
            {/* หัวเอกสาร - โลโก้และข้อมูลบริษัท */}
            <div className="flex justify-between items-start mb-6 border-b pb-4">
                <div className="flex items-start gap-4">
                    {data.logo && (
                        <img 
                            src={data.logo} 
                            alt="Company Logo" 
                            className="w-16 h-16 sm:w-20 sm:h-20 object-contain"
                            crossOrigin="anonymous"
                        />
                    )}
                    <div>
                        <h1 className="text-lg sm:text-xl font-bold text-gray-800">{data.companyName || 'ชื่อบริษัท'}</h1>
                        {data.companyAddress && <p className="text-xs sm:text-sm text-gray-600">{data.companyAddress}</p>}
                        {data.companyPhone && <p className="text-xs sm:text-sm text-gray-600">โทร: {data.companyPhone}</p>}
                        {data.companyEmail && <p className="text-xs sm:text-sm text-gray-600">อีเมล: {data.companyEmail}</p>}
                        {data.companyTaxId && <p className="text-xs sm:text-sm text-gray-600">เลขประจำตัวผู้เสียภาษี: {data.companyTaxId}</p>}
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-xs sm:text-sm text-gray-600">เลขที่สัญญา: <span className="font-medium">{data.contractNumber || '-'}</span></p>
                </div>
            </div>

            {/* ชื่อเอกสาร */}
            <div className="text-center mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">สัญญาจ้างเหมาช่วง</h2>
                <p className="text-sm text-gray-600">(Sub-contractor Agreement)</p>
            </div>

            {/* ทำที่ และ วันที่ */}
            <div className="flex justify-between mb-4 text-sm">
                <p><strong>ทำที่:</strong> {data.contractLocation || '...........................................................................'}</p>
                <p><strong>วันที่:</strong> {formatThaiDate(data.contractDate)}</p>
            </div>

            {/* คำนำสัญญา */}
            <div className="mb-4 text-sm leading-relaxed text-gray-800">
                <p className="mb-2">สัญญาฉบับนี้ทำขึ้นระหว่าง</p>
                
                {/* ผู้ว่าจ้าง */}
                <div className="mb-3 pl-4">
                    <p><strong>(1) ผู้ว่าจ้าง:</strong> {data.companyName || '............................................................................................'}</p>
                    {data.companyAddress && <p className="pl-4">ที่อยู่: {data.companyAddress}</p>}
                    {data.companyTaxId && <p className="pl-4">เลขประจำตัวผู้เสียภาษี: {data.companyTaxId}</p>}
                </div>
                
                {/* ผู้รับจ้าง */}
                <div className="mb-3 pl-4">
                    <p><strong>(2) ผู้รับจ้าง:</strong> {data.contractorName || '............................................................................................'}</p>
                    {data.contractorIdCard && <p className="pl-4">เลขบัตรประชาชน/เลขผู้เสียภาษี: {data.contractorIdCard}</p>}
                    {data.contractorPhone && <p className="pl-4">เบอร์โทรศัพท์: {data.contractorPhone}</p>}
                    {data.contractorAddress && <p className="pl-4">ที่อยู่: {data.contractorAddress}</p>}
                </div>
                
                <p>ทั้งสองฝ่ายตกลงทำสัญญากันดังมีข้อความต่อไปนี้:</p>
            </div>

            {/* ข้อ 1: ลักษณะงานที่จ้าง */}
            <div className="mb-4">
                <h3 className="font-bold text-gray-900 mb-2">ข้อ 1. ลักษณะงานที่จ้าง (Scope of Work)</h3>
                <div className="text-sm leading-relaxed text-gray-800 pl-4">
                    <p className="mb-2">ผู้ว่าจ้างตกลงจ้างและผู้รับจ้างตกลงรับทำงาน {data.scopeOfWork || '.............................................................................................'}</p>
                    <p className="mb-2">ณ สถานที่ก่อสร้าง (โครงการ/บ้านลูกค้า): <strong>{data.projectName || '...................................'}</strong></p>
                    {data.projectLocation && <p className="mb-2">ที่อยู่: {data.projectLocation}</p>}
                    
                    {/* ตารางรายการงาน */}
                    {data.items.length > 0 && (
                        <div className="mt-3">
                            <p className="mb-2">โดยมีรายละเอียดเนื้องานและปริมาณงานตามรายการดังนี้:</p>
                            <table className="w-full border-collapse border border-gray-300 text-xs">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="border border-gray-300 px-2 py-1 text-center w-10">ลำดับ</th>
                                        <th className="border border-gray-300 px-2 py-1 text-left">รายการงาน (Description)</th>
                                        <th className="border border-gray-300 px-2 py-1 text-center w-16">ปริมาณ</th>
                                        <th className="border border-gray-300 px-2 py-1 text-center w-16">หน่วย</th>
                                        <th className="border border-gray-300 px-2 py-1 text-right w-24">ราคาต่อหน่วย</th>
                                        <th className="border border-gray-300 px-2 py-1 text-right w-24">รวมเป็นเงิน (บาท)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.items.map((item, index) => (
                                        <tr key={index}>
                                            <td className="border border-gray-300 px-2 py-1 text-center">{index + 1}</td>
                                            <td className="border border-gray-300 px-2 py-1">{item.description || '-'}</td>
                                            <td className="border border-gray-300 px-2 py-1 text-center">{item.quantity}</td>
                                            <td className="border border-gray-300 px-2 py-1 text-center">{item.unit}</td>
                                            <td className="border border-gray-300 px-2 py-1 text-right">{formatCurrency(item.unitPrice)}</td>
                                            <td className="border border-gray-300 px-2 py-1 text-right font-medium">{formatCurrency(item.amount)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-gray-50">
                                    <tr>
                                        <td colSpan={5} className="border border-gray-300 px-2 py-1 text-right font-bold">รวมทั้งสิ้น</td>
                                        <td className="border border-gray-300 px-2 py-1 text-right font-bold text-indigo-600">{formatCurrency(data.totalWorkAmount)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}
                    
                    {data.materialNote && (
                        <p className="mt-2 text-gray-600 italic">* หมายเหตุ: {data.materialNote}</p>
                    )}
                </div>
            </div>

            {/* ข้อ 2: ระยะเวลาการทำงาน (ถ้าเลือกแสดง) */}
            {data.showWorkPeriod && (
                <div className="mb-4">
                    <h3 className="font-bold text-gray-900 mb-2">ข้อ 2. ระยะเวลาการทำงาน</h3>
                    <div className="text-sm leading-relaxed text-gray-800 pl-4">
                        <p>ผู้รับจ้างสัญญาว่าจะเริ่มทำงานในวันที่ <strong>{formatThaiDate(data.startDate)}</strong></p>
                        <p>และจะดำเนินงานให้แล้วเสร็จสมบูรณ์ ภายในวันที่ <strong>{formatThaiDate(data.endDate)}</strong></p>
                    </div>
                </div>
            )}

            {/* ข้อ 3: การชำระเงินและการแบ่งงวดงาน */}
            <div className="mb-4">
                <h3 className="font-bold text-gray-900 mb-2">ข้อ {data.showWorkPeriod ? '3' : '2'}. การชำระเงินและการแบ่งงวดงาน (Payment Terms)</h3>
                <div className="text-sm leading-relaxed text-gray-800 pl-4">
                    <p className="mb-2">ผู้ว่าจ้างจะชำระเงินค่าจ้างรวมทั้งสิ้น <strong>{formatCurrency(data.totalContractAmount)}</strong> บาท ({data.totalContractAmountText || '............................................'})</p>
                    <p className="mb-2">โดยแบ่งจ่ายตามความก้าวหน้าของงาน ดังตารางต่อไปนี้:</p>
                    
                    {data.paymentMilestones.length > 0 && (
                        <table className="w-full border-collapse border border-gray-300 text-xs mt-2">
                            <thead className="bg-green-50">
                                <tr>
                                    <th className="border border-gray-300 px-2 py-1 text-center w-14">งวดที่</th>
                                    <th className="border border-gray-300 px-2 py-1 text-left">รายละเอียดงานที่ต้องแล้วเสร็จ (Milestone)</th>
                                    <th className="border border-gray-300 px-2 py-1 text-center w-16">% ของยอด</th>
                                    <th className="border border-gray-300 px-2 py-1 text-right w-28">จำนวนเงิน (บาท)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.paymentMilestones.map((milestone, index) => (
                                    <tr key={index}>
                                        <td className="border border-gray-300 px-2 py-1 text-center font-medium">{milestone.milestone}</td>
                                        <td className="border border-gray-300 px-2 py-1">{milestone.description || '-'}</td>
                                        <td className="border border-gray-300 px-2 py-1 text-center">{milestone.percentage}%</td>
                                        <td className="border border-gray-300 px-2 py-1 text-right">{formatCurrency(milestone.amount)}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-green-50">
                                <tr>
                                    <td colSpan={2} className="border border-gray-300 px-2 py-1 text-right font-bold">รวม</td>
                                    <td className="border border-gray-300 px-2 py-1 text-center font-bold">{totalMilestonePercentage}%</td>
                                    <td className="border border-gray-300 px-2 py-1 text-right font-bold text-green-600">{formatCurrency(totalMilestoneAmount)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    )}
                    
                    <p className="mt-2 text-gray-600 italic">* การจ่ายเงินจะกระทำเมื่อผู้ว่าจ้างได้ตรวจรับงานในงวดนั้นๆ ว่าถูกต้องเรียบร้อยแล้วเท่านั้น</p>
                </div>
            </div>

            {/* ข้อ 4: เครื่องมือและวัสดุอุปกรณ์ (ถ้าเลือกแสดง) */}
            {data.showToolsSection && (
                <div className="mb-4">
                    <h3 className="font-bold text-gray-900 mb-2">ข้อ {data.showWorkPeriod ? '4' : '3'}. เครื่องมือและวัสดุอุปกรณ์</h3>
                    <div className="text-sm leading-relaxed text-gray-800 pl-4">
                        <p>4.1 ผู้รับจ้างต้องจัดเตรียมเครื่องมือ เครื่องจักร และอุปกรณ์ที่จำเป็นในการทำงานมาเอง</p>
                        <p>4.2 วัสดุสิ้นเปลือง (เช่น ตะปู ใบตัด ลวดเชื่อม) ให้ถือเป็นความรับผิดชอบของ <strong>{data.consumableResponsibility === 'employer' ? '☑ ผู้ว่าจ้าง' : '☑ ผู้รับจ้าง'}</strong></p>
                    </div>
                </div>
            )}

            {/* ข้อ 5: มาตรฐานงานและการรับประกัน (ถ้าเลือกแสดง) */}
            {data.showWarrantySection && (
                <div className="mb-4">
                    <h3 className="font-bold text-gray-900 mb-2">ข้อ {getClauseNumber(data, 5)}. มาตรฐานงานและการรับประกัน</h3>
                    <div className="text-sm leading-relaxed text-gray-800 pl-4">
                        <p className="mb-2">ผู้รับจ้างต้องทำงานให้ถูกต้องตามหลักวิศวกรรมและสถาปัตยกรรม หากงานมีความบกพร่อง ผู้รับจ้างต้องเข้ามาแก้ไขให้เรียบร้อยภายใน <strong>{data.defectFixDays}</strong> วัน นับแต่ได้รับแจ้ง โดยไม่คิดค่าใช้จ่ายเพิ่มเติม</p>
                        <p>ทั้งนี้ ผู้รับจ้างรับประกันผลงานเป็นระยะเวลา <strong>{data.warrantyMonths}</strong> เดือน นับตั้งแต่วันส่งมอบงาน</p>
                    </div>
                </div>
            )}

            {/* ข้อ 6: การทิ้งงานและการปรับ (ถ้าเลือกแสดง) */}
            {data.showPenaltySection && (
                <div className="mb-4">
                    <h3 className="font-bold text-gray-900 mb-2">ข้อ {getClauseNumber(data, 6)}. การทิ้งงานและการปรับ</h3>
                    <div className="text-sm leading-relaxed text-gray-800 pl-4">
                        <p className="mb-2">หากผู้รับจ้างไม่เข้าทำงานติดต่อกันเกิน <strong>{data.abandonDays}</strong> วัน โดยไม่มีเหตุอันควร หรือทำงานล่าช้ากว่ากำหนด ผู้ว่าจ้างมีสิทธิ์:</p>
                        <p className="pl-4">6.1 ปรับเป็นรายวัน วันละ <strong>{formatCurrency(data.penaltyPerDay)}</strong> บาท จนกว่างานจะแล้วเสร็จ (ถ้ามี)</p>
                        <p className="pl-4">6.2 บอกเลิกสัญญา และริบเงินประกันผลงาน (ถ้ามี) รวมถึงเรียกร้องค่าเสียหายจากการหาผู้รับจ้างรายใหม่</p>
                    </div>
                </div>
            )}

            {/* หมายเหตุเพิ่มเติม */}
            {data.notes && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <p className="text-sm text-gray-700"><strong>หมายเหตุ:</strong> {data.notes}</p>
                </div>
            )}

            {/* ข้อความปิดท้าย */}
            <div className="mb-6 text-sm text-gray-800">
                <p>สัญญาฉบับนี้ทำขึ้นสองฉบับ มีข้อความถูกต้องตรงกัน คู่สัญญาได้อ่านและเข้าใจดีแล้ว จึงลงลายมือชื่อไว้เป็นหลักฐาน</p>
            </div>

            {/* ส่วนลงนาม */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 pt-6 border-t">
                {/* ผู้ว่าจ้าง */}
                <div className="text-center">
                    <p className="mb-8">ลงชื่อ ...............................................</p>
                    <p className="text-sm">( {data.employerSignName || '...............................................'} )</p>
                    <p className="text-sm font-medium text-gray-700 mt-1">ผู้ว่าจ้าง</p>
                </div>
                
                {/* ผู้รับจ้าง */}
                <div className="text-center">
                    <p className="mb-8">ลงชื่อ ...............................................</p>
                    <p className="text-sm">( {data.contractorSignName || '...............................................'} )</p>
                    <p className="text-sm font-medium text-gray-700 mt-1">ผู้รับจ้าง</p>
                </div>
                
                {/* พยาน */}
                <div className="text-center">
                    <p className="mb-8">ลงชื่อ ...............................................</p>
                    <p className="text-sm">( {data.witnessName || '...............................................'} )</p>
                    <p className="text-sm font-medium text-gray-700 mt-1">พยาน</p>
                </div>
            </div>

            {/* Footer - ผู้ออกเอกสาร */}
            {data.issuedBy && (
                <div className="mt-6 pt-4 border-t text-xs text-gray-500 text-right">
                    <p>ผู้ออกเอกสาร: {data.issuedBy}</p>
                </div>
            )}
        </div>
    );
});

// Helper function สำหรับคำนวณเลขข้อที่ถูกต้อง
const getClauseNumber = (data: SubcontractData, baseNumber: number): number => {
    let offset = 0;
    if (!data.showWorkPeriod && baseNumber > 2) offset++;
    if (!data.showToolsSection && baseNumber > 4) offset++;
    return baseNumber - offset;
};

SubcontractPreview.displayName = 'SubcontractPreview';

export default SubcontractPreview;

