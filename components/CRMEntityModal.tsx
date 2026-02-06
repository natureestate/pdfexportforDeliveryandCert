/**
 * CRMEntityModal Component
 * Modal form สำหรับเพิ่ม/แก้ไขลูกค้าหรือช่างใน CRM
 * แยกออกมาจาก CRMPage เพื่อลดขนาด
 */

import React, { useState } from 'react';
import {
    Plus,
    Trash2,
    X,
    RefreshCw,
    Building2,
    User,
    Check,
} from 'lucide-react';
import { EndCustomerProject } from '../services/customers';
import BranchInfoSection from './shared/BranchInfoSection';
import TagInput from './shared/TagInput';

/** ข้อมูลฟอร์ม CRM (ใช้ร่วมกันทั้ง customer และ contractor) */
export interface CRMFormData {
    name: string;
    type: 'individual' | 'company';
    phone: string;
    alternatePhone: string;
    email: string;
    lineId: string;
    address: string;
    district: string;
    amphoe: string;
    province: string;
    postalCode: string;
    taxId: string;
    tags: string[];
    notes: string;
    projectName: string;
    houseNumber: string;
    idCard: string;
    specialties: string[];
    branchCode: string;
    branchName: string;
    hasEndCustomerProjects: boolean;
    endCustomerProjects: EndCustomerProject[];
}

interface CRMEntityModalProps {
    /** แสดง modal หรือไม่ */
    isOpen: boolean;
    /** callback ปิด modal */
    onClose: () => void;
    /** ข้อมูลฟอร์มปัจจุบัน */
    formData: CRMFormData;
    /** callback เมื่อข้อมูลฟอร์มเปลี่ยน */
    onFormDataChange: (data: CRMFormData) => void;
    /** callback บันทึกข้อมูล */
    onSave: () => void;
    /** กำลังบันทึกอยู่หรือไม่ */
    saving: boolean;
    /** กำลังแก้ไข (true) หรือเพิ่มใหม่ (false) */
    isEditing: boolean;
    /** ประเภท tab ปัจจุบัน */
    activeTab: 'customers' | 'contractors';
}

const CRMEntityModal: React.FC<CRMEntityModalProps> = ({
    isOpen,
    onClose,
    formData,
    onFormDataChange,
    onSave,
    saving,
    isEditing,
    activeTab,
}) => {
    if (!isOpen) return null;

    /** อัพเดท field ใน formData */
    const updateField = <K extends keyof CRMFormData>(key: K, value: CRMFormData[K]) => {
        onFormDataChange({ ...formData, [key]: value });
    };

    /** class สำหรับ input */
    const inputClass = "w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-800 dark:text-gray-100";

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Modal Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {isEditing ? 'แก้ไข' : 'เพิ่ม'}{activeTab === 'customers' ? 'ลูกค้า' : 'ช่าง'}
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-gray-600 dark:text-gray-300"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-4 space-y-4">
                    {/* ประเภท */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">ประเภท</label>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="type"
                                    value="individual"
                                    checked={formData.type === 'individual'}
                                    onChange={(e) => updateField('type', e.target.value as 'individual' | 'company')}
                                    className="text-indigo-600"
                                />
                                <User className="w-4 h-4" />
                                <span>บุคคลธรรมดา</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="type"
                                    value="company"
                                    checked={formData.type === 'company'}
                                    onChange={(e) => updateField('type', e.target.value as 'individual' | 'company')}
                                    className="text-indigo-600"
                                />
                                <Building2 className="w-4 h-4" />
                                <span>นิติบุคคล</span>
                            </label>
                        </div>
                    </div>

                    {/* ชื่อ */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                            ชื่อ{activeTab === 'customers' ? 'ลูกค้า' : 'ช่าง'} *
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => updateField('name', e.target.value)}
                            className={inputClass}
                            placeholder={`ชื่อ${activeTab === 'customers' ? 'ลูกค้า' : 'ช่าง'}/บริษัท`}
                        />
                    </div>

                    {/* เบอร์โทรศัพท์ */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">เบอร์โทรศัพท์ *</label>
                            <input type="tel" value={formData.phone} onChange={(e) => updateField('phone', e.target.value)} className={inputClass} placeholder="0XX-XXX-XXXX" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">เบอร์สำรอง</label>
                            <input type="tel" value={formData.alternatePhone} onChange={(e) => updateField('alternatePhone', e.target.value)} className={inputClass} placeholder="0XX-XXX-XXXX" />
                        </div>
                    </div>

                    {/* อีเมล & Line ID */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">อีเมล</label>
                            <input type="email" value={formData.email} onChange={(e) => updateField('email', e.target.value)} className={inputClass} placeholder="email@example.com" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Line ID</label>
                            <input type="text" value={formData.lineId} onChange={(e) => updateField('lineId', e.target.value)} className={inputClass} placeholder="Line ID" />
                        </div>
                    </div>

                    {/* เลขบัตรประชาชน (contractors only) */}
                    {activeTab === 'contractors' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">เลขบัตรประชาชน</label>
                            <input type="text" value={formData.idCard} onChange={(e) => updateField('idCard', e.target.value)} className={inputClass} placeholder="X-XXXX-XXXXX-XX-X" maxLength={17} />
                        </div>
                    )}

                    {/* เลขประจำตัวผู้เสียภาษี */}
                    {formData.type === 'company' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">เลขประจำตัวผู้เสียภาษี</label>
                            <input type="text" value={formData.taxId} onChange={(e) => updateField('taxId', e.target.value)} className={inputClass} placeholder="เลขประจำตัวผู้เสียภาษี 13 หลัก" />
                        </div>
                    )}

                    {/* ข้อมูลสาขา - ใช้ BranchInfoSection shared component */}
                    {formData.type === 'company' && (
                        <BranchInfoSection
                            branchCode={formData.branchCode || ''}
                            branchName={formData.branchName || ''}
                            onBranchCodeChange={(value) => updateField('branchCode', value)}
                            onBranchNameChange={(value) => updateField('branchName', value)}
                            themeColor={activeTab === 'customers' ? 'blue' : 'orange'}
                        />
                    )}

                    {/* ที่อยู่ */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">ที่อยู่</label>
                        <textarea value={formData.address} onChange={(e) => updateField('address', e.target.value)} className={inputClass} rows={2} placeholder="ที่อยู่" />
                    </div>

                    {/* ตำบล/อำเภอ/จังหวัด/ไปรษณีย์ */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">ตำบล/แขวง</label>
                            <input type="text" value={formData.district} onChange={(e) => updateField('district', e.target.value)} className={inputClass} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">อำเภอ/เขต</label>
                            <input type="text" value={formData.amphoe} onChange={(e) => updateField('amphoe', e.target.value)} className={inputClass} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">จังหวัด</label>
                            <input type="text" value={formData.province} onChange={(e) => updateField('province', e.target.value)} className={inputClass} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">รหัสไปรษณีย์</label>
                            <input type="text" value={formData.postalCode} onChange={(e) => updateField('postalCode', e.target.value)} className={inputClass} maxLength={5} />
                        </div>
                    </div>

                    {/* ชื่อโครงการ & บ้านเลขที่ (customers only) */}
                    {activeTab === 'customers' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">ชื่อโครงการ</label>
                                <input type="text" value={formData.projectName} onChange={(e) => updateField('projectName', e.target.value)} className={inputClass} placeholder="ชื่อโครงการ/หมู่บ้าน" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">บ้านเลขที่</label>
                                <input type="text" value={formData.houseNumber} onChange={(e) => updateField('houseNumber', e.target.value)} className={inputClass} placeholder="บ้านเลขที่/ห้องเลขที่" />
                            </div>
                        </div>
                    )}

                    {/* End Customer Projects (customers only) */}
                    {activeTab === 'customers' && (
                        <EndCustomerProjectsSection
                            formData={formData}
                            onFormDataChange={onFormDataChange}
                        />
                    )}

                    {/* ความเชี่ยวชาญ (contractors only) - ใช้ TagInput shared component */}
                    {activeTab === 'contractors' && (
                        <TagInput
                            label="ความเชี่ยวชาญ"
                            tags={formData.specialties}
                            onTagsChange={(newSpecialties) => updateField('specialties', newSpecialties)}
                            placeholder="เช่น งานปูกระเบื้อง, งานไฟฟ้า"
                            themeColor="orange"
                        />
                    )}

                    {/* Tags - ใช้ TagInput shared component */}
                    <TagInput
                        label="Tags"
                        tags={formData.tags}
                        onTagsChange={(newTags) => updateField('tags', newTags)}
                        placeholder="เช่น VIP, ลูกค้าประจำ"
                        themeColor="indigo"
                    />

                    {/* หมายเหตุ */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">หมายเหตุ</label>
                        <textarea value={formData.notes} onChange={(e) => updateField('notes', e.target.value)} className={inputClass} rows={3} placeholder="หมายเหตุเพิ่มเติม" />
                    </div>
                </div>

                {/* Modal Footer */}
                <div className="flex justify-end gap-3 p-4 border-t border-gray-200 dark:border-slate-700 sticky bottom-0 bg-white dark:bg-slate-800">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-slate-700 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                    >
                        ยกเลิก
                    </button>
                    <button
                        onClick={onSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                    >
                        {saving ? (
                            <>
                                <RefreshCw className="w-5 h-5 animate-spin" />
                                กำลังบันทึก...
                            </>
                        ) : (
                            <>
                                <Check className="w-5 h-5" />
                                บันทึก
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

/**
 * EndCustomerProjectsSection - ส่วนจัดการโครงการลูกค้าปลายทาง
 * แยก internal component เพื่อลดขนาดของ CRMEntityModal
 */
const EndCustomerProjectsSection: React.FC<{
    formData: CRMFormData;
    onFormDataChange: (data: CRMFormData) => void;
}> = ({ formData, onFormDataChange }) => {
    const inputClassSmall = "w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-xs px-3 py-2 bg-white dark:bg-slate-700 dark:text-gray-100";

    /** อัพเดทข้อมูล End Customer Project ตาม index */
    const updateProject = (index: number, field: keyof EndCustomerProject, value: string) => {
        const updated = [...formData.endCustomerProjects];
        updated[index] = { ...updated[index], [field]: value };
        onFormDataChange({ ...formData, endCustomerProjects: updated });
    };

    return (
        <div className="border-t border-gray-200 dark:border-slate-600 pt-4 mt-4">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                    <input
                        type="checkbox"
                        id="hasEndCustomerProjects"
                        checked={formData.hasEndCustomerProjects}
                        onChange={(e) => {
                            const checked = e.target.checked;
                            onFormDataChange({
                                ...formData,
                                hasEndCustomerProjects: checked,
                                endCustomerProjects: checked && formData.endCustomerProjects.length === 0
                                    ? [{ id: `ec_${Date.now()}`, projectName: '' }]
                                    : formData.endCustomerProjects,
                            });
                        }}
                        className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                    />
                    <label htmlFor="hasEndCustomerProjects" className="ml-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                        มีโครงการลูกค้าปลายทาง (End Customer)
                    </label>
                </div>
                {formData.hasEndCustomerProjects && (
                    <span className="text-xs text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30 px-2 py-1 rounded-full">
                        {formData.endCustomerProjects.length} โครงการ
                    </span>
                )}
            </div>

            {formData.hasEndCustomerProjects && (
                <div className="space-y-3">
                    {formData.endCustomerProjects.map((project, index) => (
                        <div key={project.id || index} className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-700 space-y-3">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-medium text-purple-700 dark:text-purple-300">🏠 โครงการที่ {index + 1}</p>
                                {formData.endCustomerProjects.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const updated = formData.endCustomerProjects.filter((_, i) => i !== index);
                                            onFormDataChange({
                                                ...formData,
                                                endCustomerProjects: updated,
                                                hasEndCustomerProjects: updated.length > 0,
                                            });
                                        }}
                                        className="p-1 text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                                        title="ลบโครงการนี้"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-200 mb-1">ชื่อโครงการ *</label>
                                    <input type="text" value={project.projectName || ''} onChange={(e) => updateProject(index, 'projectName', e.target.value)} className={inputClassSmall} placeholder="เช่น บ้านคุณสมศักดิ์" />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-200 mb-1">ที่ตั้งโครงการ</label>
                                    <input type="text" value={project.projectAddress || ''} onChange={(e) => updateProject(index, 'projectAddress', e.target.value)} className={inputClassSmall} placeholder="เช่น 123 หมู่ 5 ต.แวง อ.แกดำ จ.มหาสารคาม" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-200 mb-1">ชื่อผู้ติดต่อ</label>
                                    <input type="text" value={project.contactName || ''} onChange={(e) => updateProject(index, 'contactName', e.target.value)} className={inputClassSmall} placeholder="เช่น คุณสมศรี" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-200 mb-1">เบอร์โทรผู้ติดต่อ</label>
                                    <input type="tel" value={project.contactPhone || ''} onChange={(e) => updateProject(index, 'contactPhone', e.target.value)} className={inputClassSmall} placeholder="0XX-XXX-XXXX" />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-200 mb-1">หมายเหตุ</label>
                                    <input type="text" value={project.notes || ''} onChange={(e) => updateProject(index, 'notes', e.target.value)} className={inputClassSmall} placeholder="หมายเหตุเพิ่มเติม" />
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* ปุ่มเพิ่มโครงการใหม่ */}
                    <button
                        type="button"
                        onClick={() => {
                            onFormDataChange({
                                ...formData,
                                endCustomerProjects: [
                                    ...formData.endCustomerProjects,
                                    { id: `ec_${Date.now()}`, projectName: '' }
                                ],
                            });
                        }}
                        className="w-full py-2 px-4 border-2 border-dashed border-purple-300 dark:border-purple-600 rounded-lg text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors flex items-center justify-center gap-2 text-sm"
                    >
                        <Plus className="w-4 h-4" />
                        เพิ่มโครงการลูกค้าปลายทาง
                    </button>
                </div>
            )}
        </div>
    );
};

export default CRMEntityModal;
