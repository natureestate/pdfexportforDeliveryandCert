/**
 * Customer Selector Component
 * Component สำหรับเลือกและจัดการข้อมูลลูกค้า - ลดการกรอกข้อมูลซ้ำ
 */

import React, { useState, useEffect } from 'react';
import { Customer, getCustomers, saveCustomer, updateCustomer, deleteCustomer, updateCustomerUsage, searchCustomers, getRecentCustomers } from '../services/customers';
import { useCompany } from '../contexts/CompanyContext';
import { migrateCustomersLastUsedAt } from '../services/customerMigration';

interface CustomerSelectorProps {
    label?: string;
    onSelect: (customer: Customer) => void;
    currentCustomer?: Partial<Pick<Customer, 'customerName' | 'phone' | 'address' | 'projectName'>>;
    showSaveButton?: boolean;
}

const CustomerSelector: React.FC<CustomerSelectorProps> = ({
    label = 'เลือกข้อมูลลูกค้า',
    onSelect,
    currentCustomer,
    showSaveButton = true,
}) => {
    const { currentCompany } = useCompany();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [recentCustomers, setRecentCustomers] = useState<Customer[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // State สำหรับบันทึกลูกค้าใหม่
    const [newCustomer, setNewCustomer] = useState<Omit<Customer, 'id' | 'userId' | 'companyId' | 'createdAt' | 'updatedAt' | 'usageCount'>>({
        customerName: '',
        customerType: 'individual',
        phone: '',
        address: '',
        projectName: '',
    });
    
    // State สำหรับแก้ไขลูกค้า
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

    // โหลดข้อมูลลูกค้า และ migrate ถ้าจำเป็น
    useEffect(() => {
        if (isModalOpen && currentCompany?.id) {
            const loadData = async () => {
                // Migrate ก่อน (ถ้ามีข้อมูลเก่า)
                try {
                    await migrateCustomersLastUsedAt(currentCompany.id);
                } catch (error) {
                    console.warn('⚠️ Migration warning (safe to ignore):', error);
                }
                
                // จากนั้นโหลดข้อมูล
                await loadCustomers();
                await loadRecentCustomers();
            };
            
            loadData();
        }
    }, [isModalOpen, currentCompany]);

    const loadCustomers = async () => {
        if (!currentCompany?.id) return;
        
        setIsLoading(true);
        try {
            const data = await getCustomers(currentCompany.id);
            setCustomers(data);
        } catch (error) {
            console.error('Failed to load customers:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadRecentCustomers = async () => {
        if (!currentCompany?.id) return;
        
        try {
            const data = await getRecentCustomers(currentCompany.id, 5);
            setRecentCustomers(data);
        } catch (error) {
            console.error('Failed to load recent customers:', error);
        }
    };

    const handleSelectCustomer = async (customer: Customer) => {
        onSelect(customer);
        
        // อัปเดตการใช้งาน
        if (customer.id) {
            await updateCustomerUsage(customer.id);
        }
        
        setIsModalOpen(false);
        setSearchText('');
    };

    const handleSearch = async () => {
        if (!currentCompany?.id || !searchText.trim()) {
            await loadCustomers();
            return;
        }

        setIsLoading(true);
        try {
            const results = await searchCustomers(currentCompany.id, searchText);
            setCustomers(results);
        } catch (error) {
            console.error('Failed to search customers:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveNewCustomer = async () => {
        if (!currentCompany?.id) {
            alert('กรุณาเลือกบริษัทก่อน');
            return;
        }

        if (!newCustomer.customerName || !newCustomer.phone) {
            alert('กรุณากรอกชื่อลูกค้าและเบอร์โทรศัพท์');
            return;
        }

        setIsSaving(true);
        try {
            await saveCustomer({
                ...newCustomer,
                companyId: currentCompany.id,
            }, currentCompany.id);

            await loadCustomers();
            setIsSaveModalOpen(false);
            
            // รีเซ็ตฟอร์ม
            setNewCustomer({
                customerName: '',
                customerType: 'individual',
                phone: '',
                address: '',
                projectName: '',
            });
            
            alert('✅ บันทึกข้อมูลลูกค้าสำเร็จ!');
        } catch (error) {
            console.error('Failed to save customer:', error);
            alert('❌ ไม่สามารถบันทึกข้อมูลลูกค้าได้');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveCurrentAsCustomer = () => {
        if (!currentCustomer?.customerName || !currentCustomer?.phone) {
            alert('กรุณากรอกชื่อลูกค้าและเบอร์โทรศัพท์ก่อนบันทึก');
            return;
        }

        setNewCustomer({
            customerName: currentCustomer.customerName,
            customerType: 'individual',
            phone: currentCustomer.phone,
            address: currentCustomer.address || '',
            projectName: currentCustomer.projectName || '',
            taxId: '',
        });
        
        setIsSaveModalOpen(true);
    };
    
    // เปิด modal แก้ไขลูกค้า
    const handleEditCustomer = (customer: Customer) => {
        setEditingCustomer(customer);
        setIsEditModalOpen(true);
    };
    
    // บันทึกการแก้ไขลูกค้า
    const handleUpdateCustomer = async () => {
        if (!editingCustomer?.id) return;
        
        if (!editingCustomer.customerName || !editingCustomer.phone) {
            alert('กรุณากรอกชื่อลูกค้าและเบอร์โทรศัพท์');
            return;
        }
        
        setIsSaving(true);
        try {
            await updateCustomer(editingCustomer.id, {
                customerName: editingCustomer.customerName,
                customerType: editingCustomer.customerType,
                phone: editingCustomer.phone,
                email: editingCustomer.email,
                address: editingCustomer.address,
                projectName: editingCustomer.projectName,
                taxId: editingCustomer.taxId,
            });
            
            await loadCustomers();
            setIsEditModalOpen(false);
            setEditingCustomer(null);
            
            alert('✅ อัปเดตข้อมูลลูกค้าสำเร็จ!');
        } catch (error) {
            console.error('Failed to update customer:', error);
            alert('❌ ไม่สามารถอัปเดตข้อมูลลูกค้าได้');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteCustomer = async (id: string, event: React.MouseEvent) => {
        event.stopPropagation();
        
        if (!window.confirm('ต้องการลบข้อมูลลูกค้านี้หรือไม่?')) return;

        try {
            await deleteCustomer(id);
            await loadCustomers();
            alert('✅ ลบข้อมูลลูกค้าสำเร็จ!');
        } catch (error) {
            console.error('Failed to delete customer:', error);
            alert('❌ ไม่สามารถลบข้อมูลลูกค้าได้');
        }
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-slate-700">{label}</label>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => setIsModalOpen(true)}
                        className="text-xs border border-indigo-300 rounded px-3 py-1 text-indigo-700 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        👥 เลือกลูกค้า
                    </button>
                    {showSaveButton && (
                        <button
                            type="button"
                            onClick={handleSaveCurrentAsCustomer}
                            className="text-xs bg-green-500 text-white rounded px-3 py-1 hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500"
                        >
                            💾 บันทึกลูกค้า
                        </button>
                    )}
                </div>
            </div>

            {/* Modal เลือกลูกค้า */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-2 sm:p-4">
                    <div className="bg-white p-3 sm:p-6 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] sm:max-h-[80vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-3 sm:mb-4">
                            <h3 className="text-base sm:text-lg font-semibold text-gray-800">
                                👥 เลือกข้อมูลลูกค้า
                            </h3>
                            <button
                                onClick={() => {
                                    setIsModalOpen(false);
                                    setSearchText('');
                                }}
                                className="text-gray-500 hover:text-gray-700 p-1"
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
                                placeholder="🔍 ค้นหาด้วยชื่อ, เบอร์โทร, โครงการ..."
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm px-3 py-2"
                            />
                            <button
                                onClick={handleSearch}
                                className="px-3 sm:px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-xs sm:text-sm whitespace-nowrap"
                            >
                                ค้นหา
                            </button>
                            <button
                                onClick={() => setIsSaveModalOpen(true)}
                                className="px-3 sm:px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 whitespace-nowrap text-xs sm:text-sm"
                            >
                                + ใหม่
                            </button>
                        </div>

                        {/* Recent Customers */}
                        {!searchText && recentCustomers.length > 0 && (
                            <div className="mb-3 sm:mb-4">
                                <h4 className="text-xs sm:text-sm font-medium text-gray-700 mb-2">🕒 ลูกค้าล่าสุด</h4>
                                <div className="space-y-1">
                                    {recentCustomers.map((customer) => (
                                        <button
                                            key={customer.id}
                                            onClick={() => handleSelectCustomer(customer)}
                                            className="w-full text-left p-2 sm:p-3 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 transition-colors"
                                        >
                                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs sm:text-sm font-medium text-gray-800 truncate">
                                                        {customer.customerName}
                                                        {customer.projectName && (
                                                            <span className="ml-1 sm:ml-2 text-xs text-blue-600">
                                                                ({customer.projectName})
                                                            </span>
                                                        )}
                                                    </p>
                                                    <p className="text-xs text-gray-600">
                                                        📞 {customer.phone}
                                                    </p>
                                                </div>
                                                <span className="text-xs text-gray-500 whitespace-nowrap">
                                                    ใช้ {customer.usageCount || 0} ครั้ง
                                                </span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Customer List */}
                        <div>
                            <h4 className="text-xs sm:text-sm font-medium text-gray-700 mb-2">
                                📋 ลูกค้าทั้งหมด ({customers.length})
                            </h4>
                            {isLoading ? (
                                <div className="text-center py-6 sm:py-8">
                                    <svg className="animate-spin h-6 w-6 sm:h-8 sm:w-8 mx-auto text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <p className="mt-2 text-xs sm:text-sm text-gray-500">กำลังโหลด...</p>
                                </div>
                            ) : customers.length === 0 ? (
                                <div className="text-center py-6 sm:py-8 text-gray-500">
                                    <p className="text-xs sm:text-sm">ยังไม่มีข้อมูลลูกค้า</p>
                                    <button
                                        onClick={() => setIsSaveModalOpen(true)}
                                        className="mt-2 text-xs sm:text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                                    >
                                        + เพิ่มลูกค้าใหม่
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-64 sm:max-h-96 overflow-y-auto">
                                    {customers.map((customer) => (
                                        <div
                                            key={customer.id}
                                            onClick={() => handleSelectCustomer(customer)}
                                            className="relative p-2 sm:p-3 bg-gray-50 border border-gray-200 rounded-md hover:border-indigo-400 hover:bg-indigo-50 cursor-pointer transition-all group"
                                        >
                                            {/* Edit and Delete Buttons */}
                                            <div className="absolute top-1.5 sm:top-2 right-1.5 sm:right-2 flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleEditCustomer(customer);
                                                    }}
                                                    className="p-1 bg-amber-500 text-white rounded-full hover:bg-amber-600"
                                                    title="แก้ไข"
                                                >
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={(e) => handleDeleteCustomer(customer.id!, e)}
                                                    className="p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                                                    title="ลบ"
                                                >
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>

                                            <div>
                                                <div className="flex items-start justify-between pr-12 sm:pr-6">
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs sm:text-sm font-semibold text-gray-800 truncate">
                                                            {customer.customerName}
                                                            <span className="ml-1 sm:ml-2 text-xs bg-gray-200 text-gray-600 px-1.5 sm:px-2 py-0.5 rounded whitespace-nowrap">
                                                                {customer.customerType === 'individual' ? '👤 บุคคล' : '🏢 นิติบุคคล'}
                                                            </span>
                                                        </p>
                                                        {customer.projectName && (
                                                            <p className="text-xs sm:text-sm text-indigo-600 mt-0.5 truncate">
                                                                🏗️ {customer.projectName}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="mt-1.5 sm:mt-2 text-xs text-gray-600 space-y-0.5">
                                                    <div>📞 {customer.phone}</div>
                                                    {customer.address && (
                                                        <div className="truncate">📍 {customer.address}</div>
                                                    )}
                                                    {customer.tags && customer.tags.length > 0 && (
                                                        <div className="flex flex-wrap gap-1 mt-1">
                                                            {customer.tags.map((tag, idx) => (
                                                                <span key={idx} className="bg-blue-100 text-blue-700 px-1.5 sm:px-2 py-0.5 rounded text-xs">
                                                                    {tag}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="mt-1.5 sm:mt-2 text-xs text-gray-400">
                                                    ใช้งาน {customer.usageCount || 0} ครั้ง
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="mt-3 sm:mt-4 text-xs text-gray-500 text-center">
                            💡 คลิกเพื่อเลือกลูกค้า • <span className="hidden sm:inline">Hover</span><span className="sm:hidden">แตะ</span> เพื่อแก้ไข/ลบ
                        </div>
                    </div>
                </div>
            )}

            {/* Modal บันทึกลูกค้าใหม่ */}
            {isSaveModalOpen && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-2 sm:p-4">
                    <div className="bg-white p-3 sm:p-6 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">
                            💾 บันทึกข้อมูลลูกค้าใหม่
                        </h3>

                        <div className="space-y-3 sm:space-y-4">
                            {/* ข้อมูลพื้นฐาน */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                                        ชื่อลูกค้า/บริษัท <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={newCustomer.customerName}
                                        onChange={(e) => setNewCustomer(prev => ({ ...prev, customerName: e.target.value }))}
                                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm px-3 py-2"
                                        placeholder="เช่น คุณสมชาย ใจดี"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                                        ประเภท
                                    </label>
                                    <select
                                        value={newCustomer.customerType}
                                        onChange={(e) => setNewCustomer(prev => ({ ...prev, customerType: e.target.value as 'individual' | 'company' }))}
                                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm px-3 py-2"
                                    >
                                        <option value="individual">👤 บุคคลธรรมดา</option>
                                        <option value="company">🏢 นิติบุคคล</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                                        เบอร์โทรศัพท์ <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="tel"
                                        value={newCustomer.phone}
                                        onChange={(e) => setNewCustomer(prev => ({ ...prev, phone: e.target.value }))}
                                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm px-3 py-2"
                                        placeholder="08x-xxx-xxxx"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                                        เบอร์สำรอง
                                    </label>
                                    <input
                                        type="tel"
                                        value={newCustomer.alternatePhone || ''}
                                        onChange={(e) => setNewCustomer(prev => ({ ...prev, alternatePhone: e.target.value }))}
                                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm px-3 py-2"
                                        placeholder="08x-xxx-xxxx"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                                        อีเมล
                                    </label>
                                    <input
                                        type="email"
                                        value={newCustomer.email || ''}
                                        onChange={(e) => setNewCustomer(prev => ({ ...prev, email: e.target.value }))}
                                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm px-3 py-2"
                                        placeholder="example@email.com"
                                    />
                                </div>
                            </div>

                            {/* ข้อมูลโครงการ */}
                            <div>
                                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                                    ชื่อโครงการ
                                </label>
                                <input
                                    type="text"
                                    value={newCustomer.projectName || ''}
                                    onChange={(e) => setNewCustomer(prev => ({ ...prev, projectName: e.target.value }))}
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm px-3 py-2"
                                    placeholder="เช่น บ้านสวยใจกลางเมือง"
                                />
                            </div>

                            {/* เลขประจำตัวผู้เสียภาษี */}
                            <div>
                                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                                    เลขประจำตัวผู้เสียภาษี
                                </label>
                                <input
                                    type="text"
                                    value={newCustomer.taxId || ''}
                                    onChange={(e) => setNewCustomer(prev => ({ ...prev, taxId: e.target.value }))}
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm px-3 py-2"
                                    placeholder="เช่น 0123456789012 (สำหรับนิติบุคคล)"
                                />
                            </div>

                            {/* ที่อยู่ */}
                            <div>
                                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                                    ที่อยู่
                                </label>
                                <textarea
                                    value={newCustomer.address}
                                    onChange={(e) => setNewCustomer(prev => ({ ...prev, address: e.target.value }))}
                                    rows={3}
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm px-3 py-2"
                                    placeholder="เช่น 123 หมู่ 5 ตำบลแวง อำเภอแกดำ มหาสารคาม"
                                />
                            </div>

                            {/* หมายเหตุ */}
                            <div>
                                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                                    หมายเหตุ
                                </label>
                                <textarea
                                    value={newCustomer.notes || ''}
                                    onChange={(e) => setNewCustomer(prev => ({ ...prev, notes: e.target.value }))}
                                    rows={2}
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm px-3 py-2"
                                    placeholder="บันทึกข้อมูลเพิ่มเติม..."
                                />
                            </div>
                        </div>

                        <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row gap-2 justify-end">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsSaveModalOpen(false);
                                    setNewCustomer({
                                        customerName: '',
                                        customerType: 'individual',
                                        phone: '',
                                        address: '',
                                        projectName: '',
                                        taxId: '',
                                    });
                                }}
                                disabled={isSaving}
                                className="w-full sm:w-auto px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 text-xs sm:text-sm"
                            >
                                ยกเลิก
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveNewCustomer}
                                disabled={isSaving}
                                className="w-full sm:w-auto px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-green-300 text-xs sm:text-sm"
                            >
                                {isSaving ? 'กำลังบันทึก...' : '💾 บันทึก'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Modal แก้ไขลูกค้า */}
            {isEditModalOpen && editingCustomer && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-2 sm:p-4">
                    <div className="bg-white p-3 sm:p-6 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <h2 className="text-base sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4">✏️ แก้ไขข้อมูลลูกค้า</h2>
                        
                        <div className="space-y-3 sm:space-y-4">
                            {/* ประเภทลูกค้า */}
                            <div>
                                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                                    ประเภทลูกค้า
                                </label>
                                <select
                                    value={editingCustomer.customerType}
                                    onChange={(e) => setEditingCustomer(prev => prev ? ({ ...prev, customerType: e.target.value as 'individual' | 'company' }) : null)}
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm px-3 py-2"
                                >
                                    <option value="individual">👤 บุคคล</option>
                                    <option value="company">🏢 นิติบุคคล</option>
                                </select>
                            </div>

                            {/* ชื่อลูกค้า */}
                            <div>
                                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                                    ชื่อลูกค้า <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={editingCustomer.customerName}
                                    onChange={(e) => setEditingCustomer(prev => prev ? ({ ...prev, customerName: e.target.value }) : null)}
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm px-3 py-2"
                                    placeholder="เช่น คุณสมชาย ใจดี"
                                    required
                                />
                            </div>

                            {/* เบอร์โทร */}
                            <div>
                                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                                    เบอร์โทรศัพท์ <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="tel"
                                    value={editingCustomer.phone}
                                    onChange={(e) => setEditingCustomer(prev => prev ? ({ ...prev, phone: e.target.value }) : null)}
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm px-3 py-2"
                                    placeholder="0812345678"
                                    required
                                />
                            </div>

                            {/* อีเมล */}
                            <div>
                                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                                    อีเมล
                                </label>
                                <input
                                    type="email"
                                    value={editingCustomer.email || ''}
                                    onChange={(e) => setEditingCustomer(prev => prev ? ({ ...prev, email: e.target.value }) : null)}
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm px-3 py-2"
                                    placeholder="example@email.com"
                                />
                            </div>

                            {/* ชื่อโครงการ */}
                            <div>
                                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                                    ชื่อโครงการ
                                </label>
                                <input
                                    type="text"
                                    value={editingCustomer.projectName || ''}
                                    onChange={(e) => setEditingCustomer(prev => prev ? ({ ...prev, projectName: e.target.value }) : null)}
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm px-3 py-2"
                                    placeholder="เช่น บ้านสวยใจกลางเมือง"
                                />
                            </div>

                            {/* เลขประจำตัวผู้เสียภาษี */}
                            <div>
                                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                                    เลขประจำตัวผู้เสียภาษี
                                </label>
                                <input
                                    type="text"
                                    value={editingCustomer.taxId || ''}
                                    onChange={(e) => setEditingCustomer(prev => prev ? ({ ...prev, taxId: e.target.value }) : null)}
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm px-3 py-2"
                                    placeholder="เช่น 0123456789012 (สำหรับนิติบุคคล)"
                                />
                            </div>

                            {/* ที่อยู่ */}
                            <div>
                                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                                    ที่อยู่
                                </label>
                                <textarea
                                    value={editingCustomer.address || ''}
                                    onChange={(e) => setEditingCustomer(prev => prev ? ({ ...prev, address: e.target.value }) : null)}
                                    rows={3}
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm px-3 py-2"
                                    placeholder="เช่น 123 หมู่ 5 ตำบลแวง อำเภอแกดำ มหาสารคาม"
                                />
                            </div>
                        </div>

                        <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row gap-2 justify-end">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsEditModalOpen(false);
                                    setEditingCustomer(null);
                                }}
                                disabled={isSaving}
                                className="w-full sm:w-auto px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 text-xs sm:text-sm"
                            >
                                ยกเลิก
                            </button>
                            <button
                                type="button"
                                onClick={handleUpdateCustomer}
                                disabled={isSaving}
                                className="w-full sm:w-auto px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-amber-300 text-xs sm:text-sm"
                            >
                                {isSaving ? 'กำลังอัปเดต...' : '💾 อัปเดต'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerSelector;

