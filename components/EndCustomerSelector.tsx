/**
 * End Customer Selector Component
 * Component สำหรับเลือกและจัดการข้อมูลลูกค้าปลายทาง (End Customer)
 * End Customer เชื่อมโยงกับ Customer - หนึ่ง Customer มีหลาย End Customer ได้
 */

import React, { useState, useEffect } from 'react';
import { 
    EndCustomer, 
    getEndCustomersByCustomer, 
    saveEndCustomer, 
    updateEndCustomer, 
    deleteEndCustomer, 
    updateEndCustomerUsage,
    searchEndCustomers,
    getRecentEndCustomers,
    getAllEndCustomersForCustomer,
    saveEndCustomerWithSync,
    deleteEndCustomerWithSync,
    syncEndCustomersFromEmbedded
} from '../services/endCustomers';
import { useCompany } from '../contexts/CompanyContext';
import { EndCustomerProject } from '../types';
import { Users, Save, Home, Plus } from 'lucide-react';
import { INPUT_LIMITS } from '../utils/inputValidation';
import { useConfirm } from './ConfirmDialog';

interface EndCustomerSelectorProps {
    /** Label ที่แสดง */
    label?: string;
    /** Callback เมื่อเลือก End Customer */
    onSelect: (endCustomer: EndCustomer) => void;
    /** Customer ID ที่ต้องการดู End Customers (ถ้ามี) */
    customerId?: string;
    /** Customer Name สำหรับแสดงผล */
    customerName?: string;
    /** ข้อมูล End Customer ปัจจุบัน (ถ้ามี) */
    currentEndCustomer?: EndCustomerProject;
    /** แสดงปุ่มบันทึก End Customer ใหม่หรือไม่ */
    showSaveButton?: boolean;
    /** ซ่อน Selector (ใช้สำหรับ inline mode) */
    inline?: boolean;
}

const EndCustomerSelector: React.FC<EndCustomerSelectorProps> = ({
    label = 'เลือก End Customer',
    onSelect,
    customerId,
    customerName,
    currentEndCustomer,
    showSaveButton = true,
    inline = false,
}) => {
    const { currentCompany } = useCompany();
    const { confirm } = useConfirm();
    const [endCustomers, setEndCustomers] = useState<EndCustomer[]>([]);
    const [recentEndCustomers, setRecentEndCustomers] = useState<EndCustomer[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // State สำหรับบันทึก End Customer ใหม่
    const [newEndCustomer, setNewEndCustomer] = useState<Partial<EndCustomer>>({
        projectName: '',
        projectAddress: '',
        contactName: '',
        contactPhone: '',
        notes: '',
    });
    
    // State สำหรับแก้ไข End Customer
    const [editingEndCustomer, setEditingEndCustomer] = useState<EndCustomer | null>(null);

    // โหลดข้อมูล End Customer เมื่อเปิด Modal
    useEffect(() => {
        if (isModalOpen && currentCompany?.id) {
            loadEndCustomers();
            loadRecentEndCustomers();
        }
    }, [isModalOpen, currentCompany, customerId]);

    // โหลดรายการ End Customer (ตาม Customer ถ้ามี)
    // ใช้ getAllEndCustomersForCustomer เพื่อดึงจากทั้ง collection และ Customer.endCustomerProjects
    const loadEndCustomers = async () => {
        if (!currentCompany?.id) return;
        
        setIsLoading(true);
        try {
            let data: EndCustomer[];
            if (customerId) {
                // ดึง End Customer ของ Customer ที่ระบุ (รวมจาก 2 แหล่ง)
                data = await getAllEndCustomersForCustomer(currentCompany.id, customerId);
                
                // Auto-sync: ถ้ามีข้อมูลจาก Customer.endCustomerProjects ที่ยังไม่ได้ sync
                // จะ sync ไปยัง collection โดยอัตโนมัติ
                try {
                    await syncEndCustomersFromEmbedded(currentCompany.id, customerId);
                } catch (syncError) {
                    console.warn('Auto-sync warning:', syncError);
                }
            } else {
                // ดึงทั้งหมดของบริษัท (สำหรับ fallback)
                const { getEndCustomers } = await import('../services/endCustomers');
                data = await getEndCustomers(currentCompany.id);
            }
            setEndCustomers(data);
        } catch (error) {
            console.error('Failed to load end customers:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // โหลด End Customer ที่ใช้ล่าสุด
    const loadRecentEndCustomers = async () => {
        if (!currentCompany?.id) return;
        
        try {
            const data = await getRecentEndCustomers(currentCompany.id, 5);
            // กรองตาม customerId ถ้ามี
            const filtered = customerId 
                ? data.filter(ec => ec.customerId === customerId)
                : data;
            setRecentEndCustomers(filtered.slice(0, 5));
        } catch (error) {
            console.error('Failed to load recent end customers:', error);
        }
    };

    // เลือก End Customer
    const handleSelectEndCustomer = async (endCustomer: EndCustomer) => {
        onSelect(endCustomer);
        
        // อัปเดตการใช้งาน
        if (endCustomer.id) {
            await updateEndCustomerUsage(endCustomer.id);
        }
        
        setIsModalOpen(false);
        setSearchText('');
    };

    // ค้นหา End Customer
    const handleSearch = async () => {
        if (!currentCompany?.id || !searchText.trim()) {
            await loadEndCustomers();
            return;
        }

        setIsLoading(true);
        try {
            const results = await searchEndCustomers(currentCompany.id, searchText, customerId);
            setEndCustomers(results);
        } catch (error) {
            console.error('Failed to search end customers:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // บันทึก End Customer ใหม่ (พร้อม sync ไปยัง Customer.endCustomerProjects)
    const handleSaveNewEndCustomer = async () => {
        if (!currentCompany?.id) {
            console.warn('กรุณาเลือกบริษัทก่อน');
            return;
        }

        if (!customerId) {
            console.warn('กรุณาเลือกลูกค้าก่อนเพิ่ม End Customer');
            return;
        }

        if (!newEndCustomer.projectName) {
            console.warn('กรุณากรอกชื่อโครงการ End Customer');
            return;
        }

        setIsSaving(true);
        try {
            // ใช้ saveEndCustomerWithSync เพื่อบันทึกและ sync ไปยัง Customer.endCustomerProjects
            await saveEndCustomerWithSync({
                ...newEndCustomer as EndCustomer,
                customerId: customerId,
                companyId: currentCompany.id,
            }, currentCompany.id);

            await loadEndCustomers();
            setIsSaveModalOpen(false);
            
            // รีเซ็ตฟอร์ม
            setNewEndCustomer({
                projectName: '',
                projectAddress: '',
                contactName: '',
                contactPhone: '',
                notes: '',
            });
            
            console.log('✅ บันทึกข้อมูล End Customer สำเร็จ! (Sync กับ CRM แล้ว)');
        } catch (error) {
            console.error('❌ ไม่สามารถบันทึกข้อมูล End Customer ได้:', error);
        } finally {
            setIsSaving(false);
        }
    };

    // เปิด Modal บันทึกใหม่พร้อมข้อมูลปัจจุบัน
    const handleSaveCurrentAsEndCustomer = () => {
        if (!currentEndCustomer?.projectName) {
            console.warn('กรุณากรอกชื่อโครงการ End Customer ก่อนบันทึก');
            return;
        }

        setNewEndCustomer({
            projectName: currentEndCustomer.projectName,
            projectAddress: currentEndCustomer.projectAddress || '',
            contactName: currentEndCustomer.contactName || '',
        });
        
        setIsSaveModalOpen(true);
    };
    
    // เปิด Modal แก้ไข End Customer
    const handleEditEndCustomer = (endCustomer: EndCustomer) => {
        setEditingEndCustomer(endCustomer);
        setIsEditModalOpen(true);
    };
    
    // บันทึกการแก้ไข End Customer
    const handleUpdateEndCustomer = async () => {
        if (!editingEndCustomer?.id) return;
        
        if (!editingEndCustomer.projectName) {
            console.warn('กรุณากรอกชื่อโครงการ End Customer');
            return;
        }
        
        setIsSaving(true);
        try {
            await updateEndCustomer(editingEndCustomer.id, {
                projectName: editingEndCustomer.projectName,
                projectAddress: editingEndCustomer.projectAddress,
                contactName: editingEndCustomer.contactName,
                contactPhone: editingEndCustomer.contactPhone,
                notes: editingEndCustomer.notes,
            });
            
            await loadEndCustomers();
            setIsEditModalOpen(false);
            setEditingEndCustomer(null);
            
            console.log('✅ อัปเดตข้อมูล End Customer สำเร็จ!');
        } catch (error) {
            console.error('❌ ไม่สามารถอัปเดตข้อมูล End Customer ได้:', error);
        } finally {
            setIsSaving(false);
        }
    };

    // ลบ End Customer (พร้อม sync การลบไปยัง Customer.endCustomerProjects)
    const handleDeleteEndCustomer = async (id: string, event: React.MouseEvent) => {
        event.stopPropagation();
        
        const confirmed = await confirm({
            title: 'ยืนยันการลบ',
            message: 'ต้องการลบข้อมูล End Customer นี้หรือไม่?\n(จะลบจากทั้ง CRM และรายการเลือกด้วย)',
            variant: 'danger',
            confirmText: 'ลบ',
            cancelText: 'ยกเลิก'
        });
        if (!confirmed) return;

        try {
            // ใช้ deleteEndCustomerWithSync เพื่อลบและ sync ไปยัง Customer.endCustomerProjects
            await deleteEndCustomerWithSync(id, customerId, currentCompany?.id);
            await loadEndCustomers();
            console.log('✅ ลบข้อมูล End Customer สำเร็จ! (Sync กับ CRM แล้ว)');
        } catch (error) {
            console.error('❌ ไม่สามารถลบข้อมูล End Customer ได้:', error);
            throw error;
        }
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    <Home className="w-4 h-4 inline mr-1" />{label}
                </label>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => setIsModalOpen(true)}
                        disabled={!customerId}
                        className="text-xs border border-purple-300 rounded px-3 py-1 text-purple-700 hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed dark:border-purple-600 dark:text-purple-400 dark:hover:bg-purple-900/30"
                    >
                        <Users className="w-3.5 h-3.5 inline mr-1" />เลือก End Customer
                    </button>
                    {showSaveButton && (
                        <button
                            type="button"
                            onClick={handleSaveCurrentAsEndCustomer}
                            disabled={!customerId}
                            className="text-xs bg-purple-500 text-white rounded px-3 py-1 hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Save className="w-3.5 h-3.5 inline mr-1" />บันทึก End Customer
                        </button>
                    )}
                </div>
            </div>
            
            {/* แสดงข้อความช่วยเหลือเมื่อยังไม่ได้เลือกลูกค้า */}
            {!customerId && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                    ⚠️ กรุณาเลือกลูกค้าก่อน จึงจะสามารถเลือก End Customer ได้
                </p>
            )}

            {/* Modal เลือก End Customer */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-2 sm:p-4">
                    <div className="bg-white dark:bg-slate-800 p-3 sm:p-6 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] sm:max-h-[80vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-3 sm:mb-4">
                            <div>
                                <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-100">
                                    <Home className="w-4 h-4 inline mr-1" />เลือก End Customer
                                </h3>
                                {customerName && (
                                    <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                                        ลูกค้า: {customerName}
                                    </p>
                                )}
                            </div>
                            <button
                                onClick={() => {
                                    setIsModalOpen(false);
                                    setSearchText('');
                                }}
                                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1"
                            >
                                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Search Bar */}
                        <div className="mb-3 sm:mb-4 flex flex-col sm:flex-row gap-2">
                            <input
                                type="text"
                                placeholder="🔍 ค้นหาด้วยชื่อโครงการ, ที่อยู่, ผู้ติดต่อ..."
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                className="flex-1 rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-xs sm:text-sm px-3 py-2 bg-white dark:bg-slate-700 dark:text-gray-100"
                            />
                            <button
                                onClick={handleSearch}
                                className="px-3 sm:px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-xs sm:text-sm whitespace-nowrap"
                            >
                                ค้นหา
                            </button>
                            <button
                                onClick={() => setIsSaveModalOpen(true)}
                                className="px-3 sm:px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 whitespace-nowrap text-xs sm:text-sm"
                            >
                                <Plus className="w-3.5 h-3.5 inline mr-1" />ใหม่
                            </button>
                        </div>

                        {/* Recent End Customers */}
                        {!searchText && recentEndCustomers.length > 0 && (
                            <div className="mb-3 sm:mb-4">
                                <h4 className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">🕒 End Customer ล่าสุด</h4>
                                <div className="space-y-1">
                                    {recentEndCustomers.map((ec) => (
                                        <button
                                            key={ec.id}
                                            onClick={() => handleSelectEndCustomer(ec)}
                                            className="w-full text-left p-2 sm:p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors"
                                        >
                                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                                                        🏠 {ec.projectName}
                                                    </p>
                                                    {ec.contactName && (
                                                        <p className="text-xs text-gray-600 dark:text-gray-400">
                                                            👤 {ec.contactName}
                                                        </p>
                                                    )}
                                                </div>
                                                <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                                    ใช้ {ec.usageCount || 0} ครั้ง
                                                </span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* End Customer List */}
                        <div>
                            <h4 className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                📋 End Customer ทั้งหมด ({endCustomers.length})
                            </h4>
                            {isLoading ? (
                                <div className="text-center py-6 sm:py-8">
                                    <svg className="animate-spin h-6 w-6 sm:h-8 sm:w-8 mx-auto text-purple-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <p className="mt-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400">กำลังโหลด...</p>
                                </div>
                            ) : endCustomers.length === 0 ? (
                                <div className="text-center py-6 sm:py-8 text-gray-500 dark:text-gray-400">
                                    <Home className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                                    <p className="text-xs sm:text-sm">ยังไม่มีข้อมูล End Customer</p>
                                    <button
                                        onClick={() => setIsSaveModalOpen(true)}
                                        className="mt-2 text-xs sm:text-sm text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 font-medium"
                                    >
                                        <Plus className="w-3.5 h-3.5 inline mr-1" />เพิ่ม End Customer ใหม่
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-64 sm:max-h-96 overflow-y-auto">
                                    {endCustomers.map((ec) => (
                                        <div
                                            key={ec.id}
                                            onClick={() => handleSelectEndCustomer(ec)}
                                            className="relative p-2 sm:p-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-md hover:border-purple-400 dark:hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 cursor-pointer transition-all group"
                                        >
                                            {/* Edit and Delete Buttons */}
                                            <div className="absolute top-1.5 sm:top-2 right-1.5 sm:right-2 flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleEditEndCustomer(ec);
                                                    }}
                                                    className="p-1 bg-amber-500 text-white rounded-full hover:bg-amber-600"
                                                    title="แก้ไข"
                                                >
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={(e) => handleDeleteEndCustomer(ec.id!, e)}
                                                    className="p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                                                    title="ลบ"
                                                >
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>

                                            <div className="pr-12 sm:pr-6">
                                                <p className="text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
                                                    🏠 {ec.projectName}
                                                </p>
                                                {ec.projectAddress && (
                                                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 truncate">
                                                        📍 {ec.projectAddress}
                                                    </p>
                                                )}
                                                <div className="mt-1.5 sm:mt-2 text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
                                                    {ec.contactName && <div>👤 {ec.contactName}</div>}
                                                    {ec.contactPhone && <div>📞 {ec.contactPhone}</div>}
                                                </div>
                                                <div className="mt-1.5 sm:mt-2 text-xs text-gray-400 dark:text-gray-500">
                                                    ใช้งาน {ec.usageCount || 0} ครั้ง
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="mt-3 sm:mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
                            💡 คลิกเพื่อเลือก End Customer • <span className="hidden sm:inline">Hover</span><span className="sm:hidden">แตะ</span> เพื่อแก้ไข/ลบ
                        </div>
                    </div>
                </div>
            )}

            {/* Modal บันทึก End Customer ใหม่ */}
            {isSaveModalOpen && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-2 sm:p-4">
                    <div className="bg-white dark:bg-slate-800 p-3 sm:p-6 rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                        <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3 sm:mb-4">
                            <Plus className="w-4 h-4 inline mr-1" />เพิ่ม End Customer ใหม่
                        </h3>
                        
                        {customerName && (
                            <p className="text-xs text-purple-600 dark:text-purple-400 mb-3 bg-purple-50 dark:bg-purple-900/20 p-2 rounded">
                                ลูกค้า: <strong>{customerName}</strong>
                            </p>
                        )}

                        <div className="space-y-3 sm:space-y-4">
                            {/* ชื่อโครงการ */}
                            <div>
                                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    ชื่อโครงการ End Customer <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={newEndCustomer.projectName || ''}
                                    onChange={(e) => setNewEndCustomer(prev => ({ ...prev, projectName: e.target.value }))}
                                    maxLength={INPUT_LIMITS.projectName}
                                    className="w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-xs sm:text-sm px-3 py-2 bg-white dark:bg-slate-700 dark:text-gray-100"
                                    placeholder="เช่น บ้านคุณสมศักดิ์"
                                />
                            </div>

                            {/* ที่ตั้งโครงการ */}
                            <div>
                                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    ที่ตั้งโครงการ
                                </label>
                                <textarea
                                    value={newEndCustomer.projectAddress || ''}
                                    onChange={(e) => setNewEndCustomer(prev => ({ ...prev, projectAddress: e.target.value }))}
                                    rows={2}
                                    maxLength={INPUT_LIMITS.projectAddress}
                                    className="w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-xs sm:text-sm px-3 py-2 bg-white dark:bg-slate-700 dark:text-gray-100"
                                    placeholder="เช่น 123 หมู่ 5 ต.แวง อ.แกดำ จ.มหาสารคาม"
                                />
                            </div>

                            {/* ชื่อผู้ติดต่อ */}
                            <div>
                                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    ชื่อผู้ติดต่อ
                                </label>
                                <input
                                    type="text"
                                    value={newEndCustomer.contactName || ''}
                                    onChange={(e) => setNewEndCustomer(prev => ({ ...prev, contactName: e.target.value }))}
                                    maxLength={INPUT_LIMITS.contactPerson}
                                    className="w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-xs sm:text-sm px-3 py-2 bg-white dark:bg-slate-700 dark:text-gray-100"
                                    placeholder="เช่น คุณสมศรี"
                                />
                            </div>

                            {/* เบอร์โทรผู้ติดต่อ */}
                            <div>
                                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    เบอร์โทรผู้ติดต่อ
                                </label>
                                <input
                                    type="tel"
                                    value={newEndCustomer.contactPhone || ''}
                                    onChange={(e) => setNewEndCustomer(prev => ({ ...prev, contactPhone: e.target.value }))}
                                    maxLength={INPUT_LIMITS.phone}
                                    inputMode="tel"
                                    className="w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-xs sm:text-sm px-3 py-2 bg-white dark:bg-slate-700 dark:text-gray-100"
                                    placeholder="08x-xxx-xxxx"
                                />
                            </div>

                            {/* หมายเหตุ */}
                            <div>
                                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    หมายเหตุ
                                </label>
                                <textarea
                                    value={newEndCustomer.notes || ''}
                                    onChange={(e) => setNewEndCustomer(prev => ({ ...prev, notes: e.target.value }))}
                                    rows={2}
                                    maxLength={INPUT_LIMITS.notes}
                                    className="w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-xs sm:text-sm px-3 py-2 bg-white dark:bg-slate-700 dark:text-gray-100"
                                    placeholder="หมายเหตุเพิ่มเติม..."
                                />
                            </div>
                        </div>

                        <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row gap-2 justify-end">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsSaveModalOpen(false);
                                    setNewEndCustomer({
                                        projectName: '',
                                        projectAddress: '',
                                        contactName: '',
                                        contactPhone: '',
                                        notes: '',
                                    });
                                }}
                                disabled={isSaving}
                                className="w-full sm:w-auto px-4 py-2 bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-slate-500 focus:outline-none focus:ring-2 focus:ring-gray-500 text-xs sm:text-sm"
                            >
                                ยกเลิก
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveNewEndCustomer}
                                disabled={isSaving}
                                className="w-full sm:w-auto px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-purple-300 text-xs sm:text-sm"
                            >
                                {isSaving ? 'กำลังบันทึก...' : <><Save className="w-3.5 h-3.5 inline mr-1" />บันทึก</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Modal แก้ไข End Customer */}
            {isEditModalOpen && editingEndCustomer && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-2 sm:p-4">
                    <div className="bg-white dark:bg-slate-800 p-3 sm:p-6 rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                        <h2 className="text-base sm:text-xl font-semibold text-gray-800 dark:text-gray-100 mb-3 sm:mb-4">
                            ✏️ แก้ไข End Customer
                        </h2>
                        
                        <div className="space-y-3 sm:space-y-4">
                            {/* ชื่อโครงการ */}
                            <div>
                                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    ชื่อโครงการ End Customer <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={editingEndCustomer.projectName}
                                    onChange={(e) => setEditingEndCustomer(prev => prev ? ({ ...prev, projectName: e.target.value }) : null)}
                                    className="w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-xs sm:text-sm px-3 py-2 bg-white dark:bg-slate-700 dark:text-gray-100"
                                    placeholder="เช่น บ้านคุณสมศักดิ์"
                                    required
                                />
                            </div>

                            {/* ที่ตั้งโครงการ */}
                            <div>
                                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    ที่ตั้งโครงการ
                                </label>
                                <textarea
                                    value={editingEndCustomer.projectAddress || ''}
                                    onChange={(e) => setEditingEndCustomer(prev => prev ? ({ ...prev, projectAddress: e.target.value }) : null)}
                                    rows={2}
                                    className="w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-xs sm:text-sm px-3 py-2 bg-white dark:bg-slate-700 dark:text-gray-100"
                                    placeholder="เช่น 123 หมู่ 5 ต.แวง อ.แกดำ จ.มหาสารคาม"
                                />
                            </div>

                            {/* ชื่อผู้ติดต่อ */}
                            <div>
                                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    ชื่อผู้ติดต่อ
                                </label>
                                <input
                                    type="text"
                                    value={editingEndCustomer.contactName || ''}
                                    onChange={(e) => setEditingEndCustomer(prev => prev ? ({ ...prev, contactName: e.target.value }) : null)}
                                    className="w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-xs sm:text-sm px-3 py-2 bg-white dark:bg-slate-700 dark:text-gray-100"
                                    placeholder="เช่น คุณสมศรี"
                                />
                            </div>

                            {/* เบอร์โทรผู้ติดต่อ */}
                            <div>
                                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    เบอร์โทรผู้ติดต่อ
                                </label>
                                <input
                                    type="tel"
                                    value={editingEndCustomer.contactPhone || ''}
                                    onChange={(e) => setEditingEndCustomer(prev => prev ? ({ ...prev, contactPhone: e.target.value }) : null)}
                                    className="w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-xs sm:text-sm px-3 py-2 bg-white dark:bg-slate-700 dark:text-gray-100"
                                    placeholder="08x-xxx-xxxx"
                                />
                            </div>

                            {/* หมายเหตุ */}
                            <div>
                                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    หมายเหตุ
                                </label>
                                <textarea
                                    value={editingEndCustomer.notes || ''}
                                    onChange={(e) => setEditingEndCustomer(prev => prev ? ({ ...prev, notes: e.target.value }) : null)}
                                    rows={2}
                                    className="w-full rounded-md border-gray-300 dark:border-slate-600 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-xs sm:text-sm px-3 py-2 bg-white dark:bg-slate-700 dark:text-gray-100"
                                    placeholder="หมายเหตุเพิ่มเติม..."
                                />
                            </div>
                        </div>

                        <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row gap-2 justify-end">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsEditModalOpen(false);
                                    setEditingEndCustomer(null);
                                }}
                                disabled={isSaving}
                                className="w-full sm:w-auto px-4 py-2 bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-slate-500 focus:outline-none focus:ring-2 focus:ring-gray-500 text-xs sm:text-sm"
                            >
                                ยกเลิก
                            </button>
                            <button
                                type="button"
                                onClick={handleUpdateEndCustomer}
                                disabled={isSaving}
                                className="w-full sm:w-auto px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-amber-300 text-xs sm:text-sm"
                            >
                                {isSaving ? 'กำลังอัปเดต...' : <><Save className="w-3.5 h-3.5 inline mr-1" />อัปเดต</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EndCustomerSelector;
