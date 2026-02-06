/**
 * CRMEntityListItem Component
 * แสดงข้อมูลลูกค้าหรือช่างแต่ละรายการใน CRM list
 * แยกออกมาจาก CRMPage เพื่อลดขนาดและเพิ่ม readability
 */

import React from 'react';
import {
    Edit2,
    Trash2,
    Phone,
    Mail,
    MapPin,
    X,
    Home,
    Clock,
    Star
} from 'lucide-react';
import { Customer } from '../services/customers';
import { Contractor } from '../services/contractors';
import { EndCustomerProject } from '../services/customers';

interface CRMEntityListItemProps {
    /** ข้อมูล entity (customer หรือ contractor) */
    item: Customer | Contractor;
    /** ประเภทของ tab ปัจจุบัน */
    activeTab: 'customers' | 'contractors';
    /** callback เมื่อกดปุ่มแก้ไข */
    onEdit: (item: Customer | Contractor) => void;
    /** callback เมื่อกดปุ่มลบ */
    onDeleteRequest: (id: string) => void;
    /** callback เมื่อกดยืนยันลบ */
    onDeleteConfirm: (id: string) => void;
    /** callback เมื่อกดยกเลิกการลบ */
    onDeleteCancel: () => void;
    /** ID ของ entity ที่กำลังจะลบ (แสดง confirmation) */
    deleteConfirmId: string | null;
    /** กำลังลบอยู่หรือไม่ */
    deleting: boolean;
}

const CRMEntityListItem: React.FC<CRMEntityListItemProps> = React.memo(({
    item,
    activeTab,
    onEdit,
    onDeleteRequest,
    onDeleteConfirm,
    onDeleteCancel,
    deleteConfirmId,
    deleting,
}) => {
    const isCustomer = activeTab === 'customers';
    const name = isCustomer ? (item as Customer).customerName : (item as Contractor).contractorName;
    const type = isCustomer ? (item as Customer).customerType : (item as Contractor).contractorType;
    const tags = isCustomer ? (item as Customer).tags : (item as Contractor).tags;
    const specialties = !isCustomer ? (item as Contractor).specialties : undefined;
    const usageCount = item.usageCount || 0;
    const lastUsed = item.lastUsedAt;

    // รองรับทั้งแบบเก่า (single) และแบบใหม่ (array)
    const customer = item as Customer;
    const hasEndCustomers = isCustomer
        ? (customer.hasEndCustomerProjects || customer.hasEndCustomerProject || false)
        : false;
    const endCustomerProjects: EndCustomerProject[] = isCustomer
        ? (customer.endCustomerProjects || (customer.endCustomerProject ? [customer.endCustomerProject] : []))
        : [];

    return (
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                    {/* ชื่อ + ประเภท + badges */}
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">{name}</h3>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${
                            type === 'company'
                                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300'
                        }`}>
                            {type === 'company' ? 'นิติบุคคล' : 'บุคคล'}
                        </span>
                        {hasEndCustomers && endCustomerProjects.length > 0 && (
                            <span className="flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                                <Home className="w-3 h-3" />
                                ลูกค้าปลายทาง ({endCustomerProjects.length})
                            </span>
                        )}
                        {usageCount > 0 && (
                            <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                                <Star className="w-3 h-3" />
                                ใช้ {usageCount} ครั้ง
                            </span>
                        )}
                    </div>

                    {/* ข้อมูลติดต่อ */}
                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                            <Phone className="w-4 h-4" />
                            {item.phone}
                        </span>
                        {item.email && (
                            <span className="flex items-center gap-1">
                                <Mail className="w-4 h-4" />
                                {item.email}
                            </span>
                        )}
                        {lastUsed && (
                            <span className="flex items-center gap-1 text-xs">
                                <Clock className="w-3 h-3" />
                                ใช้ล่าสุด: {new Intl.DateTimeFormat('th-TH', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric'
                                }).format(lastUsed)}
                            </span>
                        )}
                    </div>

                    {/* ที่อยู่ */}
                    {item.address && (
                        <p className="flex items-start gap-1 text-sm text-gray-500 dark:text-gray-400 mt-1">
                            <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <span className="truncate">{item.address}</span>
                        </p>
                    )}

                    {/* Tags */}
                    {tags && tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                            {tags.map((tag, idx) => (
                                <span
                                    key={idx}
                                    className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs rounded-full"
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Specialties (contractors only) */}
                    {specialties && specialties.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                            {specialties.map((spec, idx) => (
                                <span
                                    key={idx}
                                    className="px-2 py-0.5 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs rounded-full"
                                >
                                    {spec}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* End Customer Projects Info (customers only) */}
                    {hasEndCustomers && endCustomerProjects.length > 0 && (
                        <div className="mt-2 p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-700">
                            <div className="flex items-center gap-1 text-xs text-purple-700 dark:text-purple-300 mb-2">
                                <Home className="w-3 h-3" />
                                <span className="font-medium">โครงการลูกค้าปลายทาง ({endCustomerProjects.length} โครงการ)</span>
                            </div>
                            <div className="space-y-2">
                                {endCustomerProjects.slice(0, 3).map((project, idx) => (
                                    <div key={project.id || idx} className="text-xs text-gray-600 dark:text-gray-300 pl-2 border-l-2 border-purple-300 dark:border-purple-600">
                                        {project.projectName && (
                                            <p className="font-medium">{idx + 1}. {project.projectName}</p>
                                        )}
                                        {project.projectAddress && (
                                            <p className="truncate text-gray-500 dark:text-gray-400">📍 {project.projectAddress}</p>
                                        )}
                                        {project.contactName && (
                                            <p className="text-gray-500 dark:text-gray-400">👤 {project.contactName} {project.contactPhone && `(${project.contactPhone})`}</p>
                                        )}
                                    </div>
                                ))}
                                {endCustomerProjects.length > 3 && (
                                    <p className="text-xs text-purple-600 dark:text-purple-400 pl-2">
                                        ...และอีก {endCustomerProjects.length - 3} โครงการ
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* ปุ่มแก้ไข/ลบ */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => onEdit(item)}
                        className="p-2 text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                        title="แก้ไข"
                    >
                        <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => onDeleteRequest(item.id || '')}
                        className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        title="ลบ"
                    >
                        <Trash2 className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Delete confirmation */}
            {deleteConfirmId === item.id && (
                <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm text-red-700 dark:text-red-300 mb-2">ยืนยันการลบ "{name}"?</p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => onDeleteConfirm(item.id!)}
                            disabled={deleting}
                            className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
                        >
                            {deleting ? 'กำลังลบ...' : 'ยืนยัน'}
                        </button>
                        <button
                            onClick={onDeleteCancel}
                            className="px-3 py-1 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-200 text-sm rounded hover:bg-gray-300 dark:hover:bg-slate-600"
                        >
                            ยกเลิก
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
});

CRMEntityListItem.displayName = 'CRMEntityListItem';

export default CRMEntityListItem;
