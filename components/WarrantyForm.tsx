import React, { useRef, useState, useEffect } from 'react';
import { WarrantyData, LogoType, EndCustomerProject } from '../types';
import { formatDateForInput } from '../utils/dateUtils';
import CompanyProfileSelector from './CompanyProfileSelector';
import EndCustomerProjectSection from './EndCustomerProjectSection';
import ServiceTemplateSelector from './ServiceTemplateSelector';
import CustomerSelector from './CustomerSelector';
import { generateDocumentNumber } from '../services/documentNumber';

export interface WarrantyFormProps {
    data: WarrantyData;
    setData: React.Dispatch<React.SetStateAction<WarrantyData>>;
    sharedLogo?: string | null;
    sharedLogoUrl?: string | null;
    sharedLogoType?: LogoType;
    companyDefaultLogoUrl?: string | null;
    onLogoChange?: (logo: string | null, logoUrl: string | null, logoType: LogoType) => void;
    onSetDefaultLogo?: (logoUrl: string) => Promise<void>;
}

const FormDivider: React.FC<{ title: string }> = ({ title }) => (
    <div className="relative">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-gray-300 dark:border-gray-600" />
        </div>
        <div className="relative flex justify-start">
            <span className="bg-white dark:bg-slate-800 pr-3 text-lg font-medium text-gray-900 dark:text-gray-100">{title}</span>
        </div>
    </div>
);

const WarrantyForm: React.FC<WarrantyFormProps> = ({ 
    data, 
    setData,
    sharedLogo,
    sharedLogoUrl,
    sharedLogoType,
    companyDefaultLogoUrl,
    onLogoChange,
    onSetDefaultLogo
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showCompanySelector, setShowCompanySelector] = useState(false);
    const [showServiceSelector, setShowServiceSelector] = useState(false);

    const handleDataChange = <K extends keyof WarrantyData,>(key: K, value: WarrantyData[K]) => {
        setData(prev => ({ ...prev, [key]: value }));
    };

    /**
     * จัดการการเปลี่ยนแปลงโลโก้จาก LogoManager component
     */
    const handleLogoChange = (logo: string | null, logoUrl: string | null, logoType: LogoType) => {
        // ใช้ onLogoChange ถ้ามี (Shared Logo) มิฉะนั้นใช้ setData (แบบเดิม)
        if (onLogoChange) {
            onLogoChange(logo, logoUrl, logoType);
        } else {
            setData(prev => ({
                ...prev,
                logo,
                logoUrl,
                logoType,
            }));
        }
    };

    /**
     * สร้าง Warranty Number อัตโนมัติ (รูปแบบ: WR-YYMMDDXX)
     */
    const handleGenerateWarrantyNumber = async () => {
        try {
            const newWarrantyNumber = await generateDocumentNumber('warranty');
            handleDataChange('warrantyNumber', newWarrantyNumber);
        } catch (error) {
            console.error('Error generating warranty number:', error);
            alert('ไม่สามารถสร้างเลขที่ใบรับประกันได้ กรุณาลองใหม่อีกครั้ง');
        }
    };

    /**
     * คำนวณวันสิ้นสุดการรับประกันอัตโนมัติ
     * จาก: วันที่ส่งมอบ (purchaseDate) + ระยะเวลารับประกัน (warrantyPeriod)
     */
    const calculateWarrantyEndDate = () => {
        if (!data.purchaseDate || !data.warrantyPeriod) {
            return;
        }

        const purchaseDate = new Date(data.purchaseDate);
        const periodMatch = data.warrantyPeriod.match(/(\d+)\s*(ปี|เดือน|วัน|year|month|day)/i);
        
        if (!periodMatch) {
            console.warn('ไม่สามารถแปลงระยะเวลารับประกันได้ กรุณาใช้รูปแบบ "3 ปี", "6 เดือน", "30 วัน"');
            return;
        }

        const [, amount, unit] = periodMatch;
        const numAmount = parseInt(amount);
        const endDate = new Date(purchaseDate);

        if (unit.match(/ปี|year/i)) {
            endDate.setFullYear(endDate.getFullYear() + numAmount);
        } else if (unit.match(/เดือน|month/i)) {
            endDate.setMonth(endDate.getMonth() + numAmount);
        } else if (unit.match(/วัน|day/i)) {
            endDate.setDate(endDate.getDate() + numAmount);
        }

        handleDataChange('warrantyEndDate', endDate);
    };

    /**
     * Auto-calculate warranty end date เมื่อ purchaseDate หรือ warrantyPeriod เปลี่ยน
     */
    useEffect(() => {
        calculateWarrantyEndDate();
    }, [data.purchaseDate, data.warrantyPeriod]);

    /**
     * Auto-generate warranty number เมื่อ component mount (ถ้ายังไม่มี)
     */
    useEffect(() => {
        if (!data.warrantyNumber) {
            handleGenerateWarrantyNumber();
        }
    }, []);


    return (
        <div className="space-y-8 pt-4">
             <div className="space-y-6">
                {/* เลขที่ใบรับประกัน - แสดงด้านบนสุด */}
                <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-medium">เลขที่ใบรับประกัน:</span> <span className="font-mono">{data.warrantyNumber || 'กำลังสร้าง...'}</span>
                </div>
                
                {/* ส่วนที่ 1: ข้อมูลลูกค้า */}
                <FormDivider title="ส่วนที่ 1: ข้อมูลลูกค้า/โครงการ" />
                <div className="space-y-4">
                    {/* CustomerSelector - ระบบจัดการลูกค้าแบบครบวงจร */}
                    <CustomerSelector
                        label="เลือกข้อมูลลูกค้า"
                        onSelect={(customer) => {
                            handleDataChange('customerName', customer.customerName);
                            handleDataChange('customerPhone', customer.phone);
                            handleDataChange('customerAddress', customer.address);
                            if (customer.projectName) {
                                handleDataChange('projectName', customer.projectName);
                            }
                            if (customer.email) {
                                handleDataChange('customerEmail', customer.email);
                            }
                            // ข้อมูลสาขา (สำหรับนิติบุคคล)
                            if (customer.branchCode) {
                                handleDataChange('customerBranchCode', customer.branchCode);
                            }
                            if (customer.branchName) {
                                handleDataChange('customerBranchName', customer.branchName);
                            }
                            // ข้อมูลโครงการลูกค้าปลายทาง (End Customer Project)
                            if (customer.hasEndCustomerProject && customer.endCustomerProject) {
                                handleDataChange('hasEndCustomerProject', true);
                                handleDataChange('endCustomerProject', customer.endCustomerProject);
                                handleDataChange('showEndCustomerInPdf', true);
                            } else {
                                handleDataChange('hasEndCustomerProject', false);
                                handleDataChange('endCustomerProject', undefined);
                                handleDataChange('showEndCustomerInPdf', false);
                            }
                        }}
                        currentCustomer={{
                            customerName: data.customerName,
                            phone: data.customerPhone,
                            address: data.customerAddress,
                            projectName: data.projectName,
                        }}
                        showSaveButton={true}
                    />

                    <div>
                        <label htmlFor="projectName" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">ชื่อโครงการ</label>
                        <input type="text" id="projectName" value={data.projectName} onChange={(e) => handleDataChange('projectName', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100 dark:border-slate-600" placeholder="เช่น โครงการบ้านมหาสารคาม" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                        <div>
                            <label htmlFor="customerName" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">ชื่อลูกค้า</label>
                            <input type="text" id="customerName" value={data.customerName} onChange={(e) => handleDataChange('customerName', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100 dark:border-slate-600" placeholder="เช่น คุณชัยทัต" />
                        </div>
                        <div>
                            <label htmlFor="customerPhone" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">โทรศัพท์ลูกค้า</label>
                            <input type="tel" id="customerPhone" value={data.customerPhone} onChange={(e) => handleDataChange('customerPhone', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100 dark:border-slate-600" placeholder="เช่น 089-xxx-xxxx" />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="customerEmail" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">อีเมลลูกค้า</label>
                        <input type="email" id="customerEmail" value={data.customerEmail || ''} onChange={(e) => handleDataChange('customerEmail', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100 dark:border-slate-600" placeholder="เช่น customer@example.com" />
                    </div>
                    <div>
                        <label htmlFor="customerAddress" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">ที่อยู่โครงการ/ลูกค้า</label>
                        <textarea id="customerAddress" value={data.customerAddress} onChange={(e) => handleDataChange('customerAddress', e.target.value)} rows={2} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100 dark:border-slate-600" placeholder="เช่น 123 หมู่ 5 ตำบลแวง อำเภอแกดำ มหาสารคาม" />
                    </div>
                    <div>
                        <label htmlFor="purchaseDate" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">วันที่ส่งมอบสินค้า</label>
                        <input type="date" id="purchaseDate" value={formatDateForInput(data.purchaseDate)} onChange={(e) => handleDataChange('purchaseDate', e.target.value ? new Date(e.target.value) : null)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100 dark:border-slate-600" />
                    </div>
                    
                    {/* ส่วนโครงการลูกค้าปลายทาง (End Customer Project) */}
                    <EndCustomerProjectSection
                        hasEndCustomerProject={data.hasEndCustomerProject || false}
                        endCustomerProject={data.endCustomerProject}
                        showEndCustomerInPdf={data.showEndCustomerInPdf || false}
                        onHasEndCustomerChange={(value) => handleDataChange('hasEndCustomerProject', value)}
                        onEndCustomerProjectChange={(value) => handleDataChange('endCustomerProject', value)}
                        onShowEndCustomerInPdfChange={(value) => handleDataChange('showEndCustomerInPdf', value)}
                    />
                </div>

                {/* ส่วนที่ 2: ข้อมูลสินค้า/บริการ */}
                <FormDivider title="ส่วนที่ 2: ข้อมูลสินค้า/บริการ" />
                <div className="space-y-4">
                    {/* Service Template Selector */}
                    <div>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 gap-2">
                            <label className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">ข้อมูลสินค้า/บริการ</label>
                            <button
                                type="button"
                                onClick={() => setShowServiceSelector(!showServiceSelector)}
                                className="text-xs sm:text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                            >
                                {showServiceSelector ? 'ซ่อน' : 'เลือกจากที่บันทึกไว้'}
                            </button>
                        </div>
                        {showServiceSelector && (
                            <ServiceTemplateSelector
                                onSelect={(template) => {
                                    handleDataChange('serviceName', template.serviceName);
                                    handleDataChange('productDetail', template.productDetail);
                                    handleDataChange('houseModel', template.houseModel);
                                    handleDataChange('batchNo', template.batchNo);
                                    handleDataChange('warrantyPeriod', template.warrantyPeriod);
                                    handleDataChange('terms', template.terms);
                                    setShowServiceSelector(false);
                                }}
                            />
                        )}
                    </div>

                    <div>
                        <label htmlFor="serviceName" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">ประเภทสินค้า</label>
                        <input 
                            type="text" 
                            id="serviceName" 
                            value={data.serviceName} 
                            onChange={(e) => handleDataChange('serviceName', e.target.value)} 
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100 dark:border-slate-600" 
                            placeholder="เช่น โครงสร้างสำเร็จระบบ Fully precast concrete"
                        />
                    </div>
                    <div>
                        <label htmlFor="productDetail" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">รายการสินค้า</label>
                        <input 
                            type="text" 
                            id="productDetail" 
                            value={data.productDetail} 
                            onChange={(e) => handleDataChange('productDetail', e.target.value)} 
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100 dark:border-slate-600" 
                            placeholder="เช่น โครงสร้างสำเร็จรูป"
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                        <div>
                            <label htmlFor="houseModel" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">แบบบ้าน</label>
                            <input 
                                type="text" 
                                id="houseModel" 
                                value={data.houseModel} 
                                onChange={(e) => handleDataChange('houseModel', e.target.value)} 
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100 dark:border-slate-600" 
                                placeholder="เช่น A01, Modern Loft"
                            />
                        </div>
                        <div>
                            <label htmlFor="batchNo" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">หมายเลขการผลิต (Batch No.)</label>
                            <input 
                                type="text" 
                                id="batchNo" 
                                value={data.batchNo} 
                                onChange={(e) => handleDataChange('batchNo', e.target.value)} 
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100 dark:border-slate-600" 
                                placeholder="เช่น BATCH-2025-08-A01"
                            />
                        </div>
                    </div>
                    
                    {/* Checkbox สำหรับแสดง Batch No. ในเอกสาร */}
                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            id="showBatchNo"
                            checked={data.showBatchNo || false}
                            onChange={(e) => handleDataChange('showBatchNo', e.target.checked)}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <label htmlFor="showBatchNo" className="ml-2 block text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                            แสดงหมายเลขการผลิต (Batch No.) ในเอกสาร
                        </label>
                    </div>
                    <div>
                        <label htmlFor="warrantyPeriod" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">ระยะเวลารับประกัน</label>
                        <input 
                            type="text" 
                            id="warrantyPeriod" 
                            value={data.warrantyPeriod} 
                            onChange={(e) => handleDataChange('warrantyPeriod', e.target.value)} 
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100 dark:border-slate-600" 
                            placeholder="เช่น 3 ปี, 5 ปี"
                            disabled={data.useMultipleWarrantyTypes}
                        />
                        {data.useMultipleWarrantyTypes && (
                            <p className="mt-1 text-xs text-amber-600">💡 กำลังใช้การรับประกันแบบหลายประเภท (ด้านล่าง)</p>
                        )}
                    </div>
                </div>

                {/* ส่วนที่ 3: การรับประกัน */}
                <FormDivider title="ส่วนที่ 3: การรับประกัน" />
                <div className="space-y-4">
                    {/* Checkbox สำหรับเปิดใช้การรับประกันแบบงานรับสร้างบ้าน */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/50 rounded-lg p-3 sm:p-4">
                        <div className="flex items-start">
                            <input
                                type="checkbox"
                                id="useMultipleWarrantyTypes"
                                checked={data.useMultipleWarrantyTypes || false}
                                onChange={(e) => {
                                    const checked = e.target.checked;
                                    handleDataChange('useMultipleWarrantyTypes', checked);
                                    // ถ้าเปิดใช้งาน ให้ล้างค่า warrantyPeriod
                                    if (checked) {
                                        handleDataChange('warrantyPeriod', '');
                                    }
                                }}
                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mt-1"
                            />
                            <label htmlFor="useMultipleWarrantyTypes" className="ml-3 block">
                                <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-blue-200">🏠 ใช้การรับประกันแบบงานรับสร้างบ้าน (หลายประเภท)</span>
                                <p className="text-xs text-slate-600 dark:text-blue-300 mt-1">เหมาะสำหรับงานก่อสร้างที่มีการรับประกันแยกตามประเภทงาน</p>
                            </label>
                        </div>

                        {/* แสดง Checkbox ประเภทการรับประกันเมื่อเปิดใช้งาน */}
                        {data.useMultipleWarrantyTypes && (
                            <div className="mt-3 sm:mt-4 ml-0 sm:ml-7 space-y-2 sm:space-y-3 border-t border-blue-200 dark:border-blue-900/50 pt-3 sm:pt-4">
                                <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">เลือกประเภทการรับประกัน:</p>
                                
                                {/* รับประกันทั่วไป 1 ปี */}
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id="warrantyGeneral"
                                        checked={data.warrantyGeneral || false}
                                        onChange={(e) => handleDataChange('warrantyGeneral', e.target.checked)}
                                        className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                                    />
                                    <label htmlFor="warrantyGeneral" className="ml-2 block text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                                        <span className="font-medium">รับประกันทั่วไป</span> <span className="text-green-600 font-semibold">1 ปี</span>
                                    </label>
                                </div>

                                {/* รับประกันงานหลังคา 3 ปี */}
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id="warrantyRoof"
                                        checked={data.warrantyRoof || false}
                                        onChange={(e) => handleDataChange('warrantyRoof', e.target.checked)}
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                    <label htmlFor="warrantyRoof" className="ml-2 block text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                                        <span className="font-medium">รับประกันงานหลังคา</span> <span className="text-blue-600 font-semibold">3 ปี</span>
                                    </label>
                                </div>

                                {/* รับประกันงานโครงสร้าง 15 ปี */}
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id="warrantyStructure"
                                        checked={data.warrantyStructure || false}
                                        onChange={(e) => handleDataChange('warrantyStructure', e.target.checked)}
                                        className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                                    />
                                    <label htmlFor="warrantyStructure" className="ml-2 block text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                                        <span className="font-medium">รับประกันงานโครงสร้าง</span> <span className="text-purple-600 font-semibold">15 ปี</span>
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                        <div>
                            <label htmlFor="warrantyEndDate" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">วันสิ้นสุดการรับประกัน</label>
                            <div className="mt-1 block w-full rounded-md border border-gray-300 dark:border-slate-600 px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-100 dark:bg-slate-700 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                                {data.warrantyEndDate ? new Intl.DateTimeFormat('th-TH', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                }).format(data.warrantyEndDate) : 'ยังไม่ได้คำนวณ'}
                            </div>
                            <p className="mt-1 text-xs text-green-600">✅ คำนวณอัตโนมัติจากวันส่งมอบ + ระยะเวลารับประกัน (ไม่สามารถแก้ไขได้)</p>
                        </div>
                        <div>
                            <label htmlFor="issueDate" className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">วันที่ออกเอกสาร</label>
                            <input 
                                type="date" 
                                id="issueDate" 
                                value={formatDateForInput(data.issueDate)} 
                                onChange={(e) => handleDataChange('issueDate', e.target.value ? new Date(e.target.value) : null)} 
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100 dark:border-slate-600" 
                            />
                        </div>
                    </div>
                </div>

                {/* ส่วนที่ 4: เงื่อนไขการรับประกัน */}
                <FormDivider title="ส่วนที่ 4: เงื่อนไขการรับประกัน" />
                <div>
                     <textarea id="terms" value={data.terms} onChange={(e) => handleDataChange('terms', e.target.value)} rows={6} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm bg-gray-50 dark:bg-slate-700 dark:text-gray-100 dark:border-slate-600" placeholder="ระบุเงื่อนไขการรับประกัน ขอบเขต และข้อจำกัดต่างๆ" />
                </div>
            </div>
        </div>
    );
};

export default WarrantyForm;