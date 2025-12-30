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
    Edit2, 
    Trash2, 
    Phone, 
    Mail, 
    MapPin, 
    Tag, 
    X,
    RefreshCw,
    Building2,
    User,
    ChevronDown,
    ChevronUp,
    AlertCircle,
    Check,
    Clock,
    Star
} from 'lucide-react';
import { useCompany } from '../contexts/CompanyContext';
import { 
    Customer, 
    getCustomers, 
    saveCustomer, 
    updateCustomer, 
    deleteCustomer,
    searchCustomers 
} from '../services/customers';
import { 
    Contractor, 
    getContractors, 
    saveContractor, 
    updateContractor, 
    deleteContractor,
    searchContractors 
} from '../services/contractors';

type TabType = 'customers' | 'contractors';

interface FormData {
    // Common fields
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
    // Customer specific
    projectName: string;
    houseNumber: string;
    // Contractor specific
    idCard: string;
    specialties: string[];
    // ข้อมูลสาขา (สำหรับนิติบุคคล)
    branchCode: string;
    branchName: string;
}

const initialFormData: FormData = {
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
    const [formData, setFormData] = useState<FormData>(initialFormData);
    const [saving, setSaving] = useState(false);
    
    // Delete confirmation
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);
    
    // Tag input
    const [tagInput, setTagInput] = useState('');
    const [specialtyInput, setSpecialtyInput] = useState('');

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
            alert('กรุณากรอกชื่อและเบอร์โทรศัพท์');
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
                };

                if (editingId) {
                    await updateCustomer(editingId, customerData);
                } else {
                    await saveCustomer(customerData, currentCompany.id);
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
            console.error('Save error:', err);
            alert('ไม่สามารถบันทึกข้อมูลได้');
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
            console.error('Delete error:', err);
            alert('ไม่สามารถลบข้อมูลได้');
        } finally {
            setDeleting(false);
        }
    };

    // Add tag
    const addTag = () => {
        if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
            setFormData({ ...formData, tags: [...formData.tags, tagInput.trim()] });
            setTagInput('');
        }
    };

    // Remove tag
    const removeTag = (tag: string) => {
        setFormData({ ...formData, tags: formData.tags.filter(t => t !== tag) });
    };

    // Add specialty
    const addSpecialty = () => {
        if (specialtyInput.trim() && !formData.specialties.includes(specialtyInput.trim())) {
            setFormData({ ...formData, specialties: [...formData.specialties, specialtyInput.trim()] });
            setSpecialtyInput('');
        }
    };

    // Remove specialty
    const removeSpecialty = (specialty: string) => {
        setFormData({ ...formData, specialties: formData.specialties.filter(s => s !== specialty) });
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
                    currentData.map((item) => {
                        const isCustomer = activeTab === 'customers';
                        const name = isCustomer ? (item as Customer).customerName : (item as Contractor).contractorName;
                        const type = isCustomer ? (item as Customer).customerType : (item as Contractor).contractorType;
                        const tags = isCustomer ? (item as Customer).tags : (item as Contractor).tags;
                        const specialties = !isCustomer ? (item as Contractor).specialties : undefined;
                        const usageCount = item.usageCount || 0;
                        const lastUsed = item.lastUsedAt;

                        return (
                            <div
                                key={item.id}
                                className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4 hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">{name}</h3>
                                            <span className={`px-2 py-0.5 text-xs rounded-full ${
                                                type === 'company' 
                                                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
                                                    : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300'
                                            }`}>
                                                {type === 'company' ? 'นิติบุคคล' : 'บุคคล'}
                                            </span>
                                            {usageCount > 0 && (
                                                <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                                                    <Star className="w-3 h-3" />
                                                    ใช้ {usageCount} ครั้ง
                                                </span>
                                            )}
                                        </div>
                                        
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
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => openModal(item)}
                                            className="p-2 text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                                            title="แก้ไข"
                                        >
                                            <Edit2 className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => setDeleteConfirm(item.id || null)}
                                            className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                            title="ลบ"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>

                                {/* Delete confirmation */}
                                {deleteConfirm === item.id && (
                                    <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
                                        <p className="text-sm text-red-700 dark:text-red-300 mb-2">ยืนยันการลบ "{name}"?</p>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleDelete(item.id!)}
                                                disabled={deleting}
                                                className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
                                            >
                                                {deleting ? 'กำลังลบ...' : 'ยืนยัน'}
                                            </button>
                                            <button
                                                onClick={() => setDeleteConfirm(null)}
                                                className="px-3 py-1 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-200 text-sm rounded hover:bg-gray-300 dark:hover:bg-slate-600"
                                            >
                                                ยกเลิก
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                {editingId ? 'แก้ไข' : 'เพิ่ม'}{activeTab === 'customers' ? 'ลูกค้า' : 'ช่าง'}
                            </h3>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-gray-600 dark:text-gray-300"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-4 space-y-4">
                            {/* Type */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">ประเภท</label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="type"
                                            value="individual"
                                            checked={formData.type === 'individual'}
                                            onChange={(e) => setFormData({ ...formData, type: e.target.value as 'individual' | 'company' })}
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
                                            onChange={(e) => setFormData({ ...formData, type: e.target.value as 'individual' | 'company' })}
                                            className="text-indigo-600"
                                        />
                                        <Building2 className="w-4 h-4" />
                                        <span>นิติบุคคล</span>
                                    </label>
                                </div>
                            </div>

                            {/* Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                                    ชื่อ{activeTab === 'customers' ? 'ลูกค้า' : 'ช่าง'} *
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-800 dark:text-gray-100"
                                    placeholder={`ชื่อ${activeTab === 'customers' ? 'ลูกค้า' : 'ช่าง'}/บริษัท`}
                                />
                            </div>

                            {/* Phone */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">เบอร์โทรศัพท์ *</label>
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-800 dark:text-gray-100"
                                        placeholder="0XX-XXX-XXXX"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">เบอร์สำรอง</label>
                                    <input
                                        type="tel"
                                        value={formData.alternatePhone}
                                        onChange={(e) => setFormData({ ...formData, alternatePhone: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-800 dark:text-gray-100"
                                        placeholder="0XX-XXX-XXXX"
                                    />
                                </div>
                            </div>

                            {/* Email & Line ID */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">อีเมล</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-800 dark:text-gray-100"
                                        placeholder="email@example.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Line ID</label>
                                    <input
                                        type="text"
                                        value={formData.lineId}
                                        onChange={(e) => setFormData({ ...formData, lineId: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-800 dark:text-gray-100"
                                        placeholder="Line ID"
                                    />
                                </div>
                            </div>

                            {/* ID Card (contractors only) */}
                            {activeTab === 'contractors' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">เลขบัตรประชาชน</label>
                                    <input
                                        type="text"
                                        value={formData.idCard}
                                        onChange={(e) => setFormData({ ...formData, idCard: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-800 dark:text-gray-100"
                                        placeholder="X-XXXX-XXXXX-XX-X"
                                        maxLength={17}
                                    />
                                </div>
                            )}

                            {/* Tax ID */}
                            {formData.type === 'company' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">เลขประจำตัวผู้เสียภาษี</label>
                                    <input
                                        type="text"
                                        value={formData.taxId}
                                        onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-800 dark:text-gray-100"
                                        placeholder="เลขประจำตัวผู้เสียภาษี 13 หลัก"
                                    />
                                </div>
                            )}

                            {/* ข้อมูลสาขา (ตามประกาศอธิบดีกรมสรรพากร ฉบับที่ 200) */}
                            {formData.type === 'company' && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                    <div className="sm:col-span-2">
                                        <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-2">
                                            📋 ข้อมูลสาขา (ตามประกาศอธิบดีกรมสรรพากร ฉบับที่ 200)
                                        </p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">รหัสสาขา (5 หลัก)</label>
                                        <input
                                            type="text"
                                            value={formData.branchCode || ''}
                                            onChange={(e) => setFormData({ ...formData, branchCode: e.target.value })}
                                            maxLength={5}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-800 dark:text-gray-100"
                                            placeholder="00000 (สำนักงานใหญ่)"
                                        />
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">00000 = สำนักงานใหญ่</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">ชื่อสาขา</label>
                                        <input
                                            type="text"
                                            value={formData.branchName || ''}
                                            onChange={(e) => setFormData({ ...formData, branchName: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-800 dark:text-gray-100"
                                            placeholder="เช่น สำนักงานใหญ่, สาขาลาดพร้าว"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Address */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">ที่อยู่</label>
                                <textarea
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-800 dark:text-gray-100"
                                    rows={2}
                                    placeholder="ที่อยู่"
                                />
                            </div>

                            {/* District, Amphoe, Province, Postal */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">ตำบล/แขวง</label>
                                    <input
                                        type="text"
                                        value={formData.district}
                                        onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-800 dark:text-gray-100"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">อำเภอ/เขต</label>
                                    <input
                                        type="text"
                                        value={formData.amphoe}
                                        onChange={(e) => setFormData({ ...formData, amphoe: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-800 dark:text-gray-100"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">จังหวัด</label>
                                    <input
                                        type="text"
                                        value={formData.province}
                                        onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-800 dark:text-gray-100"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">รหัสไปรษณีย์</label>
                                    <input
                                        type="text"
                                        value={formData.postalCode}
                                        onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-800 dark:text-gray-100"
                                        maxLength={5}
                                    />
                                </div>
                            </div>

                            {/* Project Name & House Number (customers only) */}
                            {activeTab === 'customers' && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">ชื่อโครงการ</label>
                                        <input
                                            type="text"
                                            value={formData.projectName}
                                            onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-800 dark:text-gray-100"
                                            placeholder="ชื่อโครงการ/หมู่บ้าน"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">บ้านเลขที่</label>
                                        <input
                                            type="text"
                                            value={formData.houseNumber}
                                            onChange={(e) => setFormData({ ...formData, houseNumber: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-800 dark:text-gray-100"
                                            placeholder="บ้านเลขที่/ห้องเลขที่"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Specialties (contractors only) */}
                            {activeTab === 'contractors' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">ความเชี่ยวชาญ</label>
                                    <div className="flex gap-2 mb-2">
                                        <input
                                            type="text"
                                            value={specialtyInput}
                                            onChange={(e) => setSpecialtyInput(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSpecialty())}
                                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                            placeholder="เช่น งานปูกระเบื้อง, งานไฟฟ้า"
                                        />
                                        <button
                                            type="button"
                                            onClick={addSpecialty}
                                            className="px-3 py-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200"
                                        >
                                            <Plus className="w-5 h-5" />
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {formData.specialties.map((spec, idx) => (
                                            <span key={idx} className="flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 text-sm rounded-full">
                                                {spec}
                                                <button type="button" onClick={() => removeSpecialty(spec)}>
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Tags */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Tags</label>
                                <div className="flex gap-2 mb-2">
                                    <input
                                        type="text"
                                        value={tagInput}
                                        onChange={(e) => setTagInput(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                        placeholder="เช่น VIP, ลูกค้าประจำ"
                                    />
                                    <button
                                        type="button"
                                        onClick={addTag}
                                        className="px-3 py-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900/50"
                                    >
                                        <Plus className="w-5 h-5" />
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {formData.tags.map((tag, idx) => (
                                        <span key={idx} className="flex items-center gap-1 px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-sm rounded-full">
                                            {tag}
                                            <button type="button" onClick={() => removeTag(tag)}>
                                                <X className="w-3 h-3" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">หมายเหตุ</label>
                                <textarea
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-800 dark:text-gray-100"
                                    rows={3}
                                    placeholder="หมายเหตุเพิ่มเติม"
                                />
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="flex justify-end gap-3 p-4 border-t border-gray-200 dark:border-slate-700 sticky bottom-0 bg-white dark:bg-slate-800">
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-4 py-2 text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-slate-700 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={handleSave}
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
            )}
        </div>
    );
};

export default CRMPage;

