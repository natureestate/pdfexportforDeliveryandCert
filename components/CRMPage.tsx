/**
 * CRM Page Component
 * หน้าจัดการลูกค้าและช่าง - CRUD + ค้นหา + Tags
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
    Users, 
    HardHat, 
    Search, 
    Plus, 
    AlertCircle,
} from 'lucide-react';
import CRMEntityListItem from './CRMEntityListItem';
import CRMEntityModal, { CRMFormData } from './CRMEntityModal';
import { useCompany } from '../contexts/CompanyContext';
import { 
    Customer, 
    getCustomers, 
    saveCustomer, 
    updateCustomer, 
    deleteCustomer,
    searchCustomers,
    EndCustomerProject
} from '../services/customers';
import { 
    Contractor, 
    getContractors, 
    saveContractor, 
    updateContractor, 
    deleteContractor,
    searchContractors 
} from '../services/contractors';
import { 
    saveEndCustomerWithSync, 
    deleteEndCustomerWithSync 
} from '../services/endCustomers';

type TabType = 'customers' | 'contractors';

const initialFormData: CRMFormData = {
    name: '',
    type: 'individual',
    phone: '',
    alternatePhone: '',
    email: '',
    lineId: '',
    address: '',
    district: '',
    amphoe: '',
    province: '',
    postalCode: '',
    taxId: '',
    tags: [],
    notes: '',
    projectName: '',
    houseNumber: '',
    idCard: '',
    specialties: [],
    branchCode: '',
    branchName: '',
    hasEndCustomerProjects: false,
    endCustomerProjects: [],
};

const CRMPage: React.FC = () => {
    const { currentCompany } = useCompany();
    const [activeTab, setActiveTab] = useState<TabType>('customers');
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [contractors, setContractors] = useState<Contractor[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Modal states
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<CRMFormData>(initialFormData);
    const [saving, setSaving] = useState(false);
    
    // Delete confirmation
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);
    
    // Tag input - จัดการใน CRMEntityModal แล้ว

    // Load data
    const loadData = useCallback(async () => {
        if (!currentCompany?.id) {
            setError('กรุณาเลือกบริษัทก่อน');
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const [customersData, contractorsData] = await Promise.all([
                getCustomers(currentCompany.id),
                getContractors(currentCompany.id),
            ]);
            setCustomers(customersData);
            setContractors(contractorsData);
        } catch (err) {
            console.error('Error loading CRM data:', err);
            setError('ไม่สามารถโหลดข้อมูลได้');
        } finally {
            setLoading(false);
        }
    }, [currentCompany?.id]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Search
    const handleSearch = useCallback(async () => {
        if (!currentCompany?.id || !searchTerm.trim()) {
            loadData();
            return;
        }

        setLoading(true);
        try {
            if (activeTab === 'customers') {
                const results = await searchCustomers(currentCompany.id, searchTerm);
                setCustomers(results);
            } else {
                const results = await searchContractors(currentCompany.id, searchTerm);
                setContractors(results);
            }
        } catch (err) {
            console.error('Search error:', err);
        } finally {
            setLoading(false);
        }
    }, [currentCompany?.id, searchTerm, activeTab, loadData]);

    useEffect(() => {
        const debounce = setTimeout(() => {
            if (searchTerm) {
                handleSearch();
            } else {
                loadData();
            }
        }, 300);

        return () => clearTimeout(debounce);
    }, [searchTerm, handleSearch, loadData]);

    // Open modal for add/edit
    const openModal = (item?: Customer | Contractor) => {
        if (item) {
            setEditingId(item.id || null);
            if (activeTab === 'customers') {
                const customer = item as Customer;
                setFormData({
                    name: customer.customerName,
                    type: customer.customerType,
                    phone: customer.phone,
                    alternatePhone: customer.alternatePhone || '',
                    email: customer.email || '',
                    lineId: customer.lineId || '',
                    address: customer.address,
                    district: customer.district || '',
                    amphoe: customer.amphoe || '',
                    province: customer.province || '',
                    postalCode: customer.postalCode || '',
                    taxId: customer.taxId || '',
                    tags: customer.tags || [],
                    notes: customer.notes || '',
                    projectName: customer.projectName || '',
                    houseNumber: customer.houseNumber || '',
                    idCard: '',
                    specialties: [],
                    // ข้อมูลสาขา (สำหรับนิติบุคคล)
                    branchCode: customer.branchCode || '',
                    branchName: customer.branchName || '',
                    // ข้อมูลโครงการลูกค้าปลายทาง (รองรับหลายโครงการ)
                    hasEndCustomerProjects: customer.hasEndCustomerProjects || customer.hasEndCustomerProject || false,
                    endCustomerProjects: customer.endCustomerProjects || (customer.endCustomerProject ? [customer.endCustomerProject] : []),
                });
            } else {
                const contractor = item as Contractor;
                setFormData({
                    name: contractor.contractorName,
                    type: contractor.contractorType,
                    phone: contractor.phone,
                    alternatePhone: contractor.alternatePhone || '',
                    email: contractor.email || '',
                    lineId: contractor.lineId || '',
                    address: contractor.address,
                    district: contractor.district || '',
                    amphoe: contractor.amphoe || '',
                    province: contractor.province || '',
                    postalCode: contractor.postalCode || '',
                    taxId: contractor.taxId || '',
                    tags: contractor.tags || [],
                    notes: contractor.notes || '',
                    projectName: '',
                    houseNumber: '',
                    idCard: contractor.idCard || '',
                    specialties: contractor.specialties || [],
                    // ข้อมูลสาขา (สำหรับนิติบุคคล)
                    branchCode: contractor.branchCode || '',
                    branchName: contractor.branchName || '',
                    // ข้อมูลโครงการลูกค้าปลายทาง (ไม่ใช้สำหรับ contractor)
                    hasEndCustomerProjects: false,
                    endCustomerProjects: [],
                });
            }
        } else {
            setEditingId(null);
            setFormData(initialFormData);
        }
        setShowModal(true);
    };

    // Save
    const handleSave = async () => {
        if (!currentCompany?.id) return;
        if (!formData.name.trim() || !formData.phone.trim()) {
            // TODO: แสดง toast notification แทน console.warn
            return;
        }

        setSaving(true);
        try {
            if (activeTab === 'customers') {
                const customerData = {
                    companyId: currentCompany.id,
                    customerName: formData.name,
                    customerType: formData.type,
                    phone: formData.phone,
                    alternatePhone: formData.alternatePhone || undefined,
                    email: formData.email || undefined,
                    lineId: formData.lineId || undefined,
                    address: formData.address,
                    district: formData.district || undefined,
                    amphoe: formData.amphoe || undefined,
                    province: formData.province || undefined,
                    postalCode: formData.postalCode || undefined,
                    taxId: formData.taxId || undefined,
                    tags: formData.tags,
                    notes: formData.notes || undefined,
                    projectName: formData.projectName || undefined,
                    houseNumber: formData.houseNumber || undefined,
                    // ข้อมูลสาขา (สำหรับนิติบุคคล)
                    branchCode: formData.branchCode || undefined,
                    branchName: formData.branchName || undefined,
                    // ข้อมูลโครงการลูกค้าปลายทาง (รองรับหลายโครงการ)
                    hasEndCustomerProjects: formData.hasEndCustomerProjects,
                    endCustomerProjects: formData.hasEndCustomerProjects ? formData.endCustomerProjects : [],
                };

                let customerId: string;
                if (editingId) {
                    await updateCustomer(editingId, customerData);
                    customerId = editingId;
                } else {
                    customerId = await saveCustomer(customerData, currentCompany.id);
                }

                // Sync End Customer Projects ไปยัง endCustomers collection
                if (formData.hasEndCustomerProjects && formData.endCustomerProjects.length > 0) {
                    // Sync End Customer Projects ไปยัง endCustomers collection
                    for (const project of formData.endCustomerProjects) {
                        // ตรวจสอบว่ามี ID หรือยัง (ถ้าไม่มี = โครงการใหม่)
                        if (!project.id || project.id.startsWith('ec_')) {
                            try {
                                await saveEndCustomerWithSync({
                                    customerId: customerId,
                                    companyId: currentCompany.id,
                                    projectName: project.projectName,
                                    projectAddress: project.projectAddress,
                                    contactName: project.contactName,
                                    contactPhone: project.contactPhone,
                                    notes: project.notes,
                                }, currentCompany.id);
                            } catch (syncErr) {
                                console.warn('Sync warning:', syncErr);
                            }
                        }
                    }
                }
            } else {
                const contractorData = {
                    companyId: currentCompany.id,
                    contractorName: formData.name,
                    contractorType: formData.type,
                    phone: formData.phone,
                    alternatePhone: formData.alternatePhone || undefined,
                    email: formData.email || undefined,
                    lineId: formData.lineId || undefined,
                    address: formData.address,
                    district: formData.district || undefined,
                    amphoe: formData.amphoe || undefined,
                    province: formData.province || undefined,
                    postalCode: formData.postalCode || undefined,
                    taxId: formData.taxId || undefined,
                    tags: formData.tags,
                    notes: formData.notes || undefined,
                    idCard: formData.idCard || undefined,
                    specialties: formData.specialties,
                    // ข้อมูลสาขา (สำหรับนิติบุคคล)
                    branchCode: formData.branchCode || undefined,
                    branchName: formData.branchName || undefined,
                };

                if (editingId) {
                    await updateContractor(editingId, contractorData);
                } else {
                    await saveContractor(contractorData, currentCompany.id);
                }
            }

            setShowModal(false);
            loadData();
        } catch (err) {
            console.error('ไม่สามารถบันทึกข้อมูลได้:', err);
        } finally {
            setSaving(false);
        }
    };

    // Delete
    const handleDelete = async (id: string) => {
        setDeleting(true);
        try {
            if (activeTab === 'customers') {
                await deleteCustomer(id);
            } else {
                await deleteContractor(id);
            }
            setDeleteConfirm(null);
            loadData();
        } catch (err) {
            console.error('ไม่สามารถลบข้อมูลได้:', err);
        } finally {
            setDeleting(false);
        }
    };

    const currentData = activeTab === 'customers' ? customers : contractors;

    // Render loading
    if (loading && !currentData.length) {
        return (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
                <p className="text-gray-500 dark:text-gray-400">กำลังโหลดข้อมูล...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">จัดการข้อมูล CRM</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">จัดการข้อมูลลูกค้าและช่าง</p>
                </div>
                <button
                    onClick={() => openModal()}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    เพิ่ม{activeTab === 'customers' ? 'ลูกค้า' : 'ช่าง'}
                </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-slate-700">
                <button
                    onClick={() => { setActiveTab('customers'); setSearchTerm(''); }}
                    className={`flex items-center gap-2 px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                        activeTab === 'customers'
                            ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                            : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                >
                    <Users className="w-5 h-5" />
                    ลูกค้า ({customers.length})
                </button>
                <button
                    onClick={() => { setActiveTab('contractors'); setSearchTerm(''); }}
                    className={`flex items-center gap-2 px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                        activeTab === 'contractors'
                            ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                            : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                >
                    <HardHat className="w-5 h-5" />
                    ช่าง ({contractors.length})
                </button>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                <input
                    type="text"
                    placeholder={`ค้นหา${activeTab === 'customers' ? 'ลูกค้า' : 'ช่าง'}...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-800 dark:text-gray-100"
                />
            </div>

            {/* Error */}
            {error && (
                <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
                    <AlertCircle className="w-5 h-5" />
                    {error}
                </div>
            )}

            {/* List */}
            <div className="space-y-3">
                {currentData.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                        <Users className="w-16 h-16 mx-auto mb-4 opacity-30" />
                        <p>ยังไม่มีข้อมูล{activeTab === 'customers' ? 'ลูกค้า' : 'ช่าง'}</p>
                        <button
                            onClick={() => openModal()}
                            className="mt-4 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
                        >
                            + เพิ่มรายการแรก
                        </button>
                    </div>
                ) : (
                    currentData.map((item) => (
                        <CRMEntityListItem
                            key={item.id}
                            item={item}
                            activeTab={activeTab}
                            onEdit={openModal}
                            onDeleteRequest={(id) => setDeleteConfirm(id)}
                            onDeleteConfirm={handleDelete}
                            onDeleteCancel={() => setDeleteConfirm(null)}
                            deleteConfirmId={deleteConfirm}
                            deleting={deleting}
                        />
                    ))
                )}
            </div>

            {/* Modal - ใช้ CRMEntityModal component */}
            <CRMEntityModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                formData={formData}
                onFormDataChange={setFormData}
                onSave={handleSave}
                saving={saving}
                isEditing={!!editingId}
                activeTab={activeTab}
            />
        </div>
    );
};

export default CRMPage;

