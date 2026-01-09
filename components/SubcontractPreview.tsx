/**
 * SubcontractPreview Component
 * Preview สัญญาจ้างเหมาช่วง (Sub-contractor Agreement)
 * แสดงผลแบบ Dynamic ตามข้อมูลที่กรอก พร้อม Export PDF
 */
import React, { forwardRef, useMemo } from 'react';
import { SubcontractData } from '../types';
import QRCodeFooter from './QRCodeFooter';
import { getDefaultLogoUrl } from '../services/logoStorage';

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

    // วันที่พิมพ์ (ปัจจุบัน) และวันที่สร้าง
    const printedDate = formatThaiDateShort(new Date());
    const createdDate = formatThaiDateShort(data.contractDate || new Date());
    
    // ✅ กำหนดโลโก้ที่จะแสดง - ใช้ logo (Base64) ก่อนเพื่อหลีกเลี่ยงปัญหา CORS
    // ถ้าไม่มี Base64 ให้ใช้ logoUrl แต่อาจมีปัญหา CORS, fallback ไป default logo
    const displayLogo = data.logo || data.logoUrl || getDefaultLogoUrl();

    return (
        <div ref={ref} className="bg-white p-4 sm:p-5 max-w-4xl mx-auto print:p-3 print:max-w-none" style={{ fontFamily: "'IBM Plex Sans Thai', sans-serif" }}>
            {/* หัวเอกสาร - โลโก้, เลขที่สัญญาและวันที่ */}
            <div className="flex justify-between items-start mb-2 text-xs text-gray-800 border-b pb-1.5">
                {/* โลโก้บริษัท - แสดงเสมอ (ใช้ default logo ถ้าไม่มี) */}
                <div className="flex items-center gap-2">
                    <img 
                        src={displayLogo} 
                        alt="Company Logo" 
                        className="w-10 h-10 sm:w-12 sm:h-12 object-contain"
                        crossOrigin="anonymous"
                    />
                    <p><strong>เลขที่สัญญา:</strong> <span className="font-semibold text-gray-900">{data.contractNumber || '-'}</span></p>
                </div>
                <p><strong>วันที่:</strong> <span className="text-gray-900">{formatThaiDate(data.contractDate)}</span></p>
            </div>

            {/* ชื่อเอกสาร */}
            <div className="text-center mb-2">
                <h2 className="text-base sm:text-lg font-bold text-gray-900">สัญญาจ้างเหมาช่วง</h2>
                <p className="text-[10px] text-gray-600">(Sub-contractor Agreement)</p>
            </div>

            {/* ทำที่ */}
            <div className="mb-1.5 text-xs text-gray-800">
                <p><strong>ทำที่:</strong> {data.contractLocation || '...........................................................................'}</p>
            </div>

            {/* คำนำสัญญา - รูปแบบกระชับ (ลด line-height) */}
            <div className="mb-2 text-xs leading-tight text-gray-800">
                <p className="mb-0.5">สัญญาฉบับนี้ทำขึ้นระหว่าง</p>
                
                {/* ผู้ว่าจ้าง - แบบกระชับ */}
                <div className="mb-1 pl-2">
                    <p className="font-medium">
                        (1) ผู้ว่าจ้าง: {data.companyName || '............................'}
                        {/* แสดงข้อมูลสาขาตามประกาศอธิบดีกรมสรรพากร (ฉบับที่ 200) */}
                        {(data.companyBranchCode || data.companyBranchName) && (
                            <span className="font-normal text-gray-600 ml-1">
                                ({data.companyBranchCode === '00000' 
                                    ? (data.companyBranchName || 'สำนักงานใหญ่')
                                    : `${data.companyBranchName || 'สาขา'} สาขาที่ ${data.companyBranchCode || 'ไม่ระบุ'}`})
                            </span>
                        )}
                        {data.companyTaxId && <span className="font-normal text-gray-600 ml-1">เลขผู้เสียภาษี: {data.companyTaxId}</span>}
                    </p>
                    {data.companyAddress && <p className="text-gray-600 pl-4">ที่อยู่: {data.companyAddress} {data.companyPhone && <span>โทร: {data.companyPhone}</span>}</p>}
                </div>
                
                {/* ผู้รับจ้าง - แบบกระชับ */}
                <div className="mb-1 pl-2">
                    <p className="font-medium">
                        (2) ผู้รับจ้าง: {data.contractorName || '............................'}
                        {/* แสดงข้อมูลสาขาผู้รับจ้าง (สำหรับนิติบุคคล) */}
                        {(data.contractorBranchCode || data.contractorBranchName) && (
                            <span className="font-normal text-gray-600 ml-1">
                                ({data.contractorBranchCode === '00000' 
                                    ? (data.contractorBranchName || 'สำนักงานใหญ่')
                                    : `${data.contractorBranchName || 'สาขา'} สาขาที่ ${data.contractorBranchCode || 'ไม่ระบุ'}`})
                            </span>
                        )}
                        {data.contractorIdCard && <span className="font-normal text-gray-600 ml-1">เลขประจำตัว: {data.contractorIdCard}</span>}
                    </p>
                    <p className="text-gray-600 pl-4">
                        {data.contractorPhone && <span>โทร: {data.contractorPhone} </span>}
                        {data.contractorAddress && <span>ที่อยู่: {data.contractorAddress}</span>}
                    </p>
                </div>
                
                <p>ทั้งสองฝ่ายตกลงทำสัญญากันดังมีข้อความต่อไปนี้:</p>
            </div>

            {/* ข้อ 1: ลักษณะงานที่จ้าง */}
            <div className="mb-2">
                <h3 className="font-bold text-gray-900 mb-1 text-xs">ข้อ 1. ลักษณะงานที่จ้าง (Scope of Work)</h3>
                <div className="text-xs leading-tight text-gray-800 pl-3">
                    <p className="mb-1">ผู้ว่าจ้างตกลงจ้างและผู้รับจ้างตกลงรับทำงาน {data.scopeOfWork || '.............................................................................................'}</p>
                    <p className="mb-1">ณ สถานที่ก่อสร้าง (โครงการ/บ้านลูกค้า): <strong>{data.projectName || '...................................'}</strong></p>
                    {data.projectLocation && <p className="mb-1">ที่อยู่: {data.projectLocation}</p>}
                    
                    {/* ตารางรายการงาน */}
                    {data.items.length > 0 && (
                        <div className="my-2.5">
                            <p className="mb-1.5">โดยมีรายละเอียดเนื้องานและปริมาณงานตามรายการดังนี้:</p>
                            <table className="w-full border-collapse border border-gray-300 text-[10px]" style={{ borderCollapse: 'collapse' }}>
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="border border-gray-300 px-1.5 py-1.5 text-center w-8" style={{ verticalAlign: 'middle' }}>ลำดับ</th>
                                        <th className="border border-gray-300 px-1.5 py-1.5 text-left" style={{ verticalAlign: 'middle' }}>รายการงาน (Description)</th>
                                        <th className="border border-gray-300 px-1.5 py-1.5 text-center w-14" style={{ verticalAlign: 'middle' }}>ปริมาณ</th>
                                        <th className="border border-gray-300 px-1.5 py-1.5 text-center w-12" style={{ verticalAlign: 'middle' }}>หน่วย</th>
                                        <th className="border border-gray-300 px-1.5 py-1.5 text-right w-20" style={{ verticalAlign: 'middle' }}>ราคา/หน่วย</th>
                                        <th className="border border-gray-300 px-1.5 py-1.5 text-right w-20" style={{ verticalAlign: 'middle' }}>รวมเป็นเงิน</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.items.map((item, index) => (
                                        <tr key={index}>
                                            <td className="border border-gray-300 px-1.5 py-1.5 text-center" style={{ verticalAlign: 'middle' }}>{index + 1}</td>
                                            <td className="border border-gray-300 px-1.5 py-1.5" style={{ verticalAlign: 'middle' }}>{item.description || '-'}</td>
                                            <td className="border border-gray-300 px-1.5 py-1.5 text-center" style={{ verticalAlign: 'middle' }}>{item.quantity}</td>
                                            <td className="border border-gray-300 px-1.5 py-1.5 text-center" style={{ verticalAlign: 'middle' }}>{item.unit}</td>
                                            <td className="border border-gray-300 px-1.5 py-1.5 text-right" style={{ verticalAlign: 'middle' }}>{formatCurrency(item.unitPrice)}</td>
                                            <td className="border border-gray-300 px-1.5 py-1.5 text-right font-medium" style={{ verticalAlign: 'middle' }}>{formatCurrency(item.amount)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-gray-50">
                                    <tr>
                                        <td colSpan={5} className="border border-gray-300 px-1.5 py-1.5 text-right font-bold" style={{ verticalAlign: 'middle' }}>รวมทั้งสิ้น</td>
                                        <td className="border border-gray-300 px-1.5 py-1.5 text-right font-bold text-indigo-600" style={{ verticalAlign: 'middle' }}>{formatCurrency(data.totalWorkAmount)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}
                    
                    {data.materialNote && (
                        <p className="mt-1 text-gray-600 italic text-[10px]">* หมายเหตุ: {data.materialNote}</p>
                    )}
                </div>
            </div>

            {/* ข้อ 2: ระยะเวลาการทำงาน (ถ้าเลือกแสดง) */}
            {data.showWorkPeriod && (
                <div className="mb-2">
                    <h3 className="font-bold text-gray-900 mb-1 text-xs">ข้อ 2. ระยะเวลาการทำงาน</h3>
                    <div className="text-xs leading-tight text-gray-800 pl-3">
                        <p>ผู้รับจ้างสัญญาว่าจะเริ่มทำงานในวันที่ <strong>{formatThaiDate(data.startDate)}</strong> และจะดำเนินงานให้แล้วเสร็จสมบูรณ์ ภายในวันที่ <strong>{formatThaiDate(data.endDate)}</strong></p>
                    </div>
                </div>
            )}

            {/* ข้อ 3: การชำระเงินและการแบ่งงวดงาน */}
            <div className="mb-2">
                <h3 className="font-bold text-gray-900 mb-1 text-xs">ข้อ {data.showWorkPeriod ? '3' : '2'}. การชำระเงินและการแบ่งงวดงาน (Payment Terms)</h3>
                <div className="text-xs leading-tight text-gray-800 pl-3">
                    <p className="mb-1">ผู้ว่าจ้างจะชำระเงินค่าจ้างรวมทั้งสิ้น <strong>{formatCurrency(data.totalContractAmount)}</strong> บาท ({data.totalContractAmountText || '............................................'})</p>
                    <p className="mb-1">โดยแบ่งจ่ายตามความก้าวหน้าของงาน ดังตารางต่อไปนี้:</p>
                    
                    {data.paymentMilestones.length > 0 && (
                        <div className="my-2.5">
                            <table className="w-full border-collapse border border-gray-300 text-[10px]" style={{ borderCollapse: 'collapse' }}>
                                <thead className="bg-green-50">
                                    <tr>
                                        <th className="border border-gray-300 px-1.5 py-1.5 text-center w-10" style={{ verticalAlign: 'middle' }}>งวดที่</th>
                                        <th className="border border-gray-300 px-1.5 py-1.5 text-left" style={{ verticalAlign: 'middle' }}>รายละเอียดงานที่ต้องแล้วเสร็จ (Milestone)</th>
                                        <th className="border border-gray-300 px-1.5 py-1.5 text-center w-14" style={{ verticalAlign: 'middle' }}>% ของยอด</th>
                                        <th className="border border-gray-300 px-1.5 py-1.5 text-right w-24" style={{ verticalAlign: 'middle' }}>จำนวนเงิน (บาท)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.paymentMilestones.map((milestone, index) => (
                                        <tr key={index}>
                                            <td className="border border-gray-300 px-1.5 py-1.5 text-center font-medium" style={{ verticalAlign: 'middle' }}>{milestone.milestone}</td>
                                            <td className="border border-gray-300 px-1.5 py-1.5" style={{ verticalAlign: 'middle' }}>{milestone.description || '-'}</td>
                                            <td className="border border-gray-300 px-1.5 py-1.5 text-center" style={{ verticalAlign: 'middle' }}>{milestone.percentage}%</td>
                                            <td className="border border-gray-300 px-1.5 py-1.5 text-right" style={{ verticalAlign: 'middle' }}>{formatCurrency(milestone.amount)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-green-50">
                                    <tr>
                                        <td colSpan={2} className="border border-gray-300 px-1.5 py-1.5 text-right font-bold" style={{ verticalAlign: 'middle' }}>รวม</td>
                                        <td className="border border-gray-300 px-1.5 py-1.5 text-center font-bold" style={{ verticalAlign: 'middle' }}>{totalMilestonePercentage}%</td>
                                        <td className="border border-gray-300 px-1.5 py-1.5 text-right font-bold text-green-600" style={{ verticalAlign: 'middle' }}>{formatCurrency(totalMilestoneAmount)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}
                    
                    <p className="text-gray-600 italic text-[10px]">* การจ่ายเงินจะกระทำเมื่อผู้ว่าจ้างได้ตรวจรับงานในงวดนั้นๆ ว่าถูกต้องเรียบร้อยแล้วเท่านั้น</p>
                </div>
            </div>

            {/* ข้อ 4: เครื่องมือและวัสดุอุปกรณ์ (ถ้าเลือกแสดง) */}
            {data.showToolsSection && (
                <div className="mb-2">
                    <h3 className="font-bold text-gray-900 mb-1 text-xs">ข้อ {data.showWorkPeriod ? '4' : '3'}. เครื่องมือและวัสดุอุปกรณ์</h3>
                    <div className="text-xs leading-tight text-gray-800 pl-3">
                        <p>ผู้รับจ้างต้องจัดเตรียมเครื่องมือ เครื่องจักร และอุปกรณ์ที่จำเป็นในการทำงานมาเอง วัสดุสิ้นเปลือง (เช่น ตะปู ใบตัด ลวดเชื่อม) ให้ถือเป็นความรับผิดชอบของ <strong>{data.consumableResponsibility === 'employer' ? '☑ ผู้ว่าจ้าง' : '☑ ผู้รับจ้าง'}</strong></p>
                    </div>
                </div>
            )}

            {/* ข้อ 5: มาตรฐานงานและการรับประกัน (ถ้าเลือกแสดง) */}
            {data.showWarrantySection && (
                <div className="mb-2">
                    <h3 className="font-bold text-gray-900 mb-1 text-xs">ข้อ {getClauseNumber(data, 5)}. มาตรฐานงานและการรับประกัน</h3>
                    <div className="text-xs leading-tight text-gray-800 pl-3">
                        <p>ผู้รับจ้างต้องทำงานให้ถูกต้องตามหลักวิศวกรรมและสถาปัตยกรรม หากงานมีความบกพร่อง ผู้รับจ้างต้องแก้ไขภายใน <strong>{data.defectFixDays}</strong> วัน นับแต่ได้รับแจ้ง โดยไม่คิดค่าใช้จ่าย ทั้งนี้ ผู้รับจ้างรับประกันผลงานเป็นระยะเวลา <strong>{data.warrantyMonths}</strong> เดือน นับตั้งแต่วันส่งมอบงาน</p>
                    </div>
                </div>
            )}

            {/* ข้อ 6: การทิ้งงานและการปรับ (ถ้าเลือกแสดง) */}
            {data.showPenaltySection && (
                <div className="mb-2">
                    <h3 className="font-bold text-gray-900 mb-1 text-xs">ข้อ {getClauseNumber(data, 6)}. การทิ้งงานและการปรับ</h3>
                    <div className="text-xs leading-tight text-gray-800 pl-3">
                        <p>หากผู้รับจ้างไม่เข้าทำงานติดต่อกันเกิน <strong>{data.abandonDays}</strong> วัน โดยไม่มีเหตุอันควร หรือทำงานล่าช้ากว่ากำหนด ผู้ว่าจ้างมีสิทธิ์ปรับเป็นรายวัน วันละ <strong>{formatCurrency(data.penaltyPerDay)}</strong> บาท หรือบอกเลิกสัญญา และริบเงินประกันผลงาน (ถ้ามี)</p>
                    </div>
                </div>
            )}

            {/* หมายเหตุเพิ่มเติม */}
            {data.notes && (
                <div className="mb-2 p-1.5 bg-yellow-50 border border-yellow-200 rounded">
                    <p className="text-[10px] text-gray-700"><strong>หมายเหตุ:</strong> {data.notes}</p>
                </div>
            )}

            {/* ข้อความปิดท้าย */}
            <div className="mb-3 text-xs text-gray-800">
                <p>สัญญาฉบับนี้ทำขึ้นสองฉบับ มีข้อความถูกต้องตรงกัน คู่สัญญาได้อ่านและเข้าใจดีแล้ว จึงลงลายมือชื่อไว้เป็นหลักฐาน</p>
            </div>

            {/* ส่วนลงนาม (ลดระยะห่าง) */}
            <div className="grid grid-cols-3 gap-3 mt-4 pt-3 border-t border-gray-300">
                {/* ผู้ว่าจ้าง */}
                <div className="text-center text-gray-800">
                    <p className="text-xs mb-4">ลงชื่อ ...................................</p>
                    <p className="text-[10px] text-gray-900">( {data.employerSignName || '...............................'} )</p>
                    <p className="text-[10px] font-medium text-blue-600">ผู้ว่าจ้าง</p>
                </div>
                
                {/* ผู้รับจ้าง */}
                <div className="text-center text-gray-800">
                    <p className="text-xs mb-4">ลงชื่อ ...................................</p>
                    <p className="text-[10px] text-gray-900">( {data.contractorSignName || '...............................'} )</p>
                    <p className="text-[10px] font-medium text-blue-600">ผู้รับจ้าง</p>
                </div>
                
                {/* พยาน */}
                <div className="text-center text-gray-800">
                    <p className="text-xs mb-4">ลงชื่อ ...................................</p>
                    <p className="text-[10px] text-gray-900">( {data.witnessName || '...............................'} )</p>
                    <p className="text-[10px] font-medium text-blue-600">พยาน</p>
                </div>
            </div>

            {/* Footer - ข้อมูลเอกสาร, QR Code และหมายเลขหน้า */}
            <div className="mt-4 pt-2 border-t text-[9px] text-gray-400">
                <div className="flex justify-between items-end">
                    <div className="flex-1 space-y-0.5">
                        {data.issuedBy && <p>ผู้ออกเอกสาร: {data.issuedBy}</p>}
                        <p>วันที่สร้าง: {createdDate} | วันที่พิมพ์: {printedDate}</p>
                    </div>
                    <div className="flex items-end gap-3">
                        {/* หมายเลขหน้า */}
                        <p className="text-gray-400">หน้า 1/1</p>
                        {/* QR Code สำหรับตรวจสอบเอกสาร */}
                        <QRCodeFooter 
                            docType="subcontract" 
                            verificationToken={data.verificationToken}
                            size={50}
                        />
                    </div>
                </div>
            </div>
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

