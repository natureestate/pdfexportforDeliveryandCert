/**
 * Contractor Selector Component
 * Component สำหรับเลือกและจัดการข้อมูลช่าง/ผู้รับจ้าง - ลดการกรอกข้อมูลซ้ำ
 */

import React, { useState, useEffect } from 'react';
import { Contractor, getContractors, saveContractor, updateContractor, deleteContractor, updateContractorUsage, searchContractors, getRecentContractors } from '../services/contractors';
import { useCompany } from '../contexts/CompanyContext';
import { Wrench, Save } from 'lucide-react';
import { INPUT_LIMITS } from '../utils/inputValidation';

interface ContractorSelectorProps {
    label?: string;
    onSelect: (contractor: Contractor) => void;
    currentContractor?: Partial<Pick<Contractor, 'contractorName' | 'phone' | 'address' | 'idCard'>>;
    showSaveButton?: boolean;
}

const ContractorSelector: React.FC<ContractorSelectorProps> = ({
    label = 'เลือกข้อมูลช่าง',
    onSelect,
    currentContractor,
    showSaveButton = true,
}) => {
    const { currentCompany } = useCompany();
    const [contractors, setContractors] = useState<Contractor[]>([]);
    const [recentContractors, setRecentContractors] = useState<Contractor[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // State สำหรับบันทึกช่างใหม่
    const [newContractor, setNewContractor] = useState<Omit<Contractor, 'id' | 'userId' | 'companyId' | 'createdAt' | 'updatedAt' | 'usageCount'>>({
        contractorName: '',
        contractorType: 'individual',
        phone: '',
        address: '',
        idCard: '',
        specialties: [],
    });
    
    // State สำหรับแก้ไขช่าง
    const [editingContractor, setEditingContractor] = useState<Contractor | null>(null);
    
    // State สำหรับ specialties input
    const [specialtiesInput, setSpecialtiesInput] = useState('');

    // โหลดข้อมูลช่าง
    useEffect(() => {
        if (isModalOpen && currentCompany?.id) {
            const loadData = async () => {
                await loadContractors();
                await loadRecentContractors();
            };
            
            loadData();
        }
    }, [isModalOpen, currentCompany]);

    const loadContractors = async () => {
        if (!currentCompany?.id) return;
        
        setIsLoading(true);
        try {
            const data = await getContractors(currentCompany.id);
            setContractors(data);
        } catch (error) {
            console.error('Failed to load contractors:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadRecentContractors = async () => {
        if (!currentCompany?.id) return;
        
        try {
            const data = await getRecentContractors(currentCompany.id, 5);
            setRecentContractors(data);
        } catch (error) {
            console.error('Failed to load recent contractors:', error);
        }
    };

    const handleSelectContractor = async (contractor: Contractor) => {
        onSelect(contractor);
        
        // อัปเดตการใช้งาน
        if (contractor.id) {
            await updateContractorUsage(contractor.id);
        }
        
        setIsModalOpen(false);
        setSearchText('');
    };

    const handleSearch = async () => {
        if (!currentCompany?.id || !searchText.trim()) {
            await loadContractors();
            return;
        }

        setIsLoading(true);
        try {
            const results = await searchContractors(currentCompany.id, searchText);
            setContractors(results);
        } catch (error) {
            console.error('Failed to search contractors:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveNewContractor = async () => {
        if (!currentCompany?.id) {
            alert('กรุณาเลือกบริษัทก่อน');
            return;
        }

        if (!newContractor.contractorName || !newContractor.phone) {
            alert('กรุณากรอกชื่อช่างและเบอร์โทรศัพท์');
            return;
        }

        setIsSaving(true);
        try {
            // แปลง specialties input เป็น array
            const specialtiesArray = specialtiesInput
                .split(',')
                .map(s => s.trim())
                .filter(s => s.length > 0);

            await saveContractor({
                ...newContractor,
                specialties: specialtiesArray,
                companyId: currentCompany.id,
            }, currentCompany.id);

            await loadContractors();
            setIsSaveModalOpen(false);
            
            // รีเซ็ตฟอร์ม
            setNewContractor({
                contractorName: '',
                contractorType: 'individual',
                phone: '',
                address: '',
                idCard: '',
                specialties: [],
            });
            setSpecialtiesInput('');
            
            alert('✅ บันทึกข้อมูลช่างสำเร็จ!');
        } catch (error) {
            console.error('Failed to save contractor:', error);
            alert('❌ ไม่สามารถบันทึกข้อมูลช่างได้');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveCurrentAsContractor = () => {
        if (!currentContractor?.contractorName || !currentContractor?.phone) {
            alert('กรุณากรอกชื่อช่างและเบอร์โทรศัพท์ก่อนบันทึก');
            return;
        }

        setNewContractor({
            contractorName: currentContractor.contractorName,
            contractorType: 'individual',
            phone: currentContractor.phone,
            address: currentContractor.address || '',
            idCard: currentContractor.idCard || '',
            specialties: [],
        });
        
        setIsSaveModalOpen(true);
    };
    
    // เปิด modal แก้ไขช่าง
    const handleEditContractor = (contractor: Contractor) => {
        setEditingContractor(contractor);
        setSpecialtiesInput(contractor.specialties?.join(', ') || '');
        setIsEditModalOpen(true);
    };
    
    // บันทึกการแก้ไขช่าง
    const handleUpdateContractor = async () => {
        if (!editingContractor?.id) return;
        
        if (!editingContractor.contractorName || !editingContractor.phone) {
            alert('กรุณากรอกชื่อช่างและเบอร์โทรศัพท์');
            return;
        }
        
        setIsSaving(true);
        try {
            // แปลง specialties input เป็น array
            const specialtiesArray = specialtiesInput
                .split(',')
                .map(s => s.trim())
                .filter(s => s.length > 0);

            await updateContractor(editingContractor.id, {
                contractorName: editingContractor.contractorName,
                contractorType: editingContractor.contractorType,
                phone: editingContractor.phone,
                email: editingContractor.email,
                address: editingContractor.address,
                idCard: editingContractor.idCard,
                taxId: editingContractor.taxId,
                specialties: specialtiesArray,
                // ข้อมูลสาขา (สำหรับนิติบุคคล)
                branchCode: editingContractor.branchCode,
                branchName: editingContractor.branchName,
            });
            
            await loadContractors();
            setIsEditModalOpen(false);
            setEditingContractor(null);
            setSpecialtiesInput('');
            
            alert('✅ อัปเดตข้อมูลช่างสำเร็จ!');
        } catch (error) {
            console.error('Failed to update contractor:', error);
            alert('❌ ไม่สามารถอัปเดตข้อมูลช่างได้');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteContractor = async (id: string, event: React.MouseEvent) => {
        event.stopPropagation();
        
        if (!window.confirm('ต้องการลบข้อมูลช่างนี้หรือไม่?')) return;

        try {
            await deleteContractor(id);
            await loadContractors();
            alert('✅ ลบข้อมูลช่างสำเร็จ!');
        } catch (error) {
            console.error('Failed to delete contractor:', error);
            alert('❌ ไม่สามารถลบข้อมูลช่างได้');
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
                        className="text-xs border border-orange-300 rounded px-3 py-1 text-orange-700 hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                        <Wrench className="w-3.5 h-3.5 inline mr-1" />เลือกช่าง
                    </button>
                    {showSaveButton && (
                        <button
                            type="button"
                            onClick={handleSaveCurrentAsContractor}
                            className="text-xs bg-green-500 text-white rounded px-3 py-1 hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500"
                        >
                            <Save className="w-3.5 h-3.5 inline mr-1" />บันทึกช่าง
                        </button>
                    )}
                </div>
            </div>

            {/* Modal เลือกช่าง */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-2 sm:p-4">
                    <div className="bg-white p-3 sm:p-6 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] sm:max-h-[80vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-3 sm:mb-4">
                            <h3 className="text-base sm:text-lg font-semibold text-gray-800">
                                <Wrench className="w-4 h-4 inline mr-1" />เลือกข้อมูลช่าง
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
                                placeholder="🔍 ค้นหาด้วยชื่อ, เบอร์โทร, ความเชี่ยวชาญ..."
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 text-xs sm:text-sm px-3 py-2"
                            />
                            <button
                                onClick={handleSearch}
                                className="px-3 sm:px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 text-xs sm:text-sm whitespace-nowrap"
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

                        {/* Recent Contractors */}
                        {!searchText && recentContractors.length > 0 && (
                            <div className="mb-3 sm:mb-4">
                                <h4 className="text-xs sm:text-sm font-medium text-gray-700 mb-2">🕒 ช่างล่าสุด</h4>
                                <div className="space-y-1">
                                    {recentContractors.map((contractor) => (
                                        <button
                                            key={contractor.id}
                                            onClick={() => handleSelectContractor(contractor)}
                                            className="w-full text-left p-2 sm:p-3 bg-orange-50 border border-orange-200 rounded hover:bg-orange-100 transition-colors"
                                        >
                                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs sm:text-sm font-medium text-gray-800 truncate">
                                                        🔧 {contractor.contractorName}
                                                        {contractor.specialties && contractor.specialties.length > 0 && (
                                                            <span className="ml-1 sm:ml-2 text-xs text-orange-600">
                                                                ({contractor.specialties.slice(0, 2).join(', ')})
                                                            </span>
                                                        )}
                                                    </p>
                                                    <p className="text-xs text-gray-600">
                                                        📞 {contractor.phone}
                                                    </p>
                                                </div>
                                                <span className="text-xs text-gray-500 whitespace-nowrap">
                                                    ใช้ {contractor.usageCount || 0} ครั้ง
                                                </span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Contractor List */}
                        <div>
                            <h4 className="text-xs sm:text-sm font-medium text-gray-700 mb-2">
                                📋 ช่างทั้งหมด ({contractors.length})
                            </h4>
                            {isLoading ? (
                                <div className="text-center py-6 sm:py-8">
                                    <svg className="animate-spin h-6 w-6 sm:h-8 sm:w-8 mx-auto text-orange-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <p className="mt-2 text-xs sm:text-sm text-gray-500">กำลังโหลด...</p>
                                </div>
                            ) : contractors.length === 0 ? (
                                <div className="text-center py-6 sm:py-8 text-gray-500">
                                    <p className="text-xs sm:text-sm">ยังไม่มีข้อมูลช่าง</p>
                                    <button
                                        onClick={() => setIsSaveModalOpen(true)}
                                        className="mt-2 text-xs sm:text-sm text-orange-600 hover:text-orange-700 font-medium"
                                    >
                                        + เพิ่มช่างใหม่
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-64 sm:max-h-96 overflow-y-auto">
                                    {contractors.map((contractor) => (
                                        <div
                                            key={contractor.id}
                                            onClick={() => handleSelectContractor(contractor)}
                                            className="relative p-2 sm:p-3 bg-gray-50 border border-gray-200 rounded-md hover:border-orange-400 hover:bg-orange-50 cursor-pointer transition-all group"
                                        >
                                            {/* Edit and Delete Buttons */}
                                            <div className="absolute top-1.5 sm:top-2 right-1.5 sm:right-2 flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleEditContractor(contractor);
                                                    }}
                                                    className="p-1 bg-amber-500 text-white rounded-full hover:bg-amber-600"
                                                    title="แก้ไข"
                                                >
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={(e) => handleDeleteContractor(contractor.id!, e)}
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
                                                            🔧 {contractor.contractorName}
                                                            <span className="ml-1 sm:ml-2 text-xs bg-gray-200 text-gray-600 px-1.5 sm:px-2 py-0.5 rounded whitespace-nowrap">
                                                                {contractor.contractorType === 'individual' ? '👤 บุคคล' : '🏢 นิติบุคคล'}
                                                            </span>
                                                        </p>
                                                        {contractor.specialties && contractor.specialties.length > 0 && (
                                                            <p className="text-xs sm:text-sm text-orange-600 mt-0.5 truncate">
                                                                🛠️ {contractor.specialties.join(', ')}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="mt-1.5 sm:mt-2 text-xs text-gray-600 space-y-0.5">
                                                    <div>📞 {contractor.phone}</div>
                                                    {contractor.address && (
                                                        <div className="truncate">📍 {contractor.address}</div>
                                                    )}
                                                    {contractor.tags && contractor.tags.length > 0 && (
                                                        <div className="flex flex-wrap gap-1 mt-1">
                                                            {contractor.tags.map((tag, idx) => (
                                                                <span key={idx} className="bg-orange-100 text-orange-700 px-1.5 sm:px-2 py-0.5 rounded text-xs">
                                                                    {tag}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="mt-1.5 sm:mt-2 text-xs text-gray-400">
                                                    ใช้งาน {contractor.usageCount || 0} ครั้ง
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="mt-3 sm:mt-4 text-xs text-gray-500 text-center">
                            💡 คลิกเพื่อเลือกช่าง • <span className="hidden sm:inline">Hover</span><span className="sm:hidden">แตะ</span> เพื่อแก้ไข/ลบ
                        </div>
                    </div>
                </div>
            )}

            {/* Modal บันทึกช่างใหม่ */}
            {isSaveModalOpen && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-2 sm:p-4">
                    <div className="bg-white p-3 sm:p-6 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">
                            <Save className="w-4 h-4 inline mr-1" />บันทึกข้อมูลช่างใหม่
                        </h3>

                        <div className="space-y-3 sm:space-y-4">
                            {/* ข้อมูลพื้นฐาน */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                                        ชื่อช่าง/หัวหน้าชุดช่าง <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={newContractor.contractorName}
                                        onChange={(e) => setNewContractor(prev => ({ ...prev, contractorName: e.target.value }))}
                                        maxLength={INPUT_LIMITS.customerName}
                                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 text-xs sm:text-sm px-3 py-2"
                                        placeholder="เช่น นายสมชาย ช่างเก่ง"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                                        ประเภท
                                    </label>
                                    <select
                                        value={newContractor.contractorType}
                                        onChange={(e) => setNewContractor(prev => ({ ...prev, contractorType: e.target.value as 'individual' | 'company' }))}
                                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 text-xs sm:text-sm px-3 py-2"
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
                                        value={newContractor.phone}
                                        onChange={(e) => setNewContractor(prev => ({ ...prev, phone: e.target.value }))}
                                        maxLength={INPUT_LIMITS.phone}
                                        inputMode="tel"
                                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 text-xs sm:text-sm px-3 py-2"
                                        placeholder="08x-xxx-xxxx"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                                        เบอร์สำรอง
                                    </label>
                                    <input
                                        type="tel"
                                        value={newContractor.alternatePhone || ''}
                                        onChange={(e) => setNewContractor(prev => ({ ...prev, alternatePhone: e.target.value }))}
                                        maxLength={INPUT_LIMITS.phone}
                                        inputMode="tel"
                                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 text-xs sm:text-sm px-3 py-2"
                                        placeholder="08x-xxx-xxxx"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                                        อีเมล
                                    </label>
                                    <input
                                        type="email"
                                        value={newContractor.email || ''}
                                        onChange={(e) => setNewContractor(prev => ({ ...prev, email: e.target.value }))}
                                        maxLength={INPUT_LIMITS.email}
                                        inputMode="email"
                                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 text-xs sm:text-sm px-3 py-2"
                                        placeholder="example@email.com"
                                    />
                                </div>
                            </div>

                            {/* เลขบัตรประชาชน */}
                            <div>
                                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                                    เลขบัตรประชาชน/เลขผู้เสียภาษี
                                </label>
                                <input
                                    type="text"
                                    value={newContractor.idCard || ''}
                                    onChange={(e) => setNewContractor(prev => ({ ...prev, idCard: e.target.value }))}
                                    maxLength={INPUT_LIMITS.taxId}
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 text-xs sm:text-sm px-3 py-2"
                                    placeholder="1-2345-67890-12-3"
                                />
                            </div>

                            {/* ความเชี่ยวชาญ */}
                            <div>
                                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                                    ความเชี่ยวชาญ (คั่นด้วย comma)
                                </label>
                                <input
                                    type="text"
                                    value={specialtiesInput}
                                    onChange={(e) => setSpecialtiesInput(e.target.value)}
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 text-xs sm:text-sm px-3 py-2"
                                    placeholder="เช่น งานปูกระเบื้อง, งานไฟฟ้า, งานประปา"
                                />
                            </div>

                            {/* ข้อมูลสาขา (แสดงเมื่อเป็นนิติบุคคล) */}
                            {newContractor.contractorType === 'company' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                                    <div className="md:col-span-2">
                                        <p className="text-xs font-medium text-orange-700 mb-2">
                                            📋 ข้อมูลสาขา (ตามประกาศอธิบดีกรมสรรพากร ฉบับที่ 200)
                                        </p>
                                    </div>
                                    <div>
                                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                                            รหัสสาขา (5 หลัก)
                                        </label>
                                        <input
                                            type="text"
                                            value={newContractor.branchCode || ''}
                                            onChange={(e) => setNewContractor(prev => ({ ...prev, branchCode: e.target.value }))}
                                            maxLength={5}
                                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 text-xs sm:text-sm px-3 py-2"
                                            placeholder="00000 (สำนักงานใหญ่)"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">00000 = สำนักงานใหญ่</p>
                                    </div>
                                    <div>
                                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                                            ชื่อสาขา
                                        </label>
                                        <input
                                            type="text"
                                            value={newContractor.branchName || ''}
                                            onChange={(e) => setNewContractor(prev => ({ ...prev, branchName: e.target.value }))}
                                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 text-xs sm:text-sm px-3 py-2"
                                            placeholder="เช่น สำนักงานใหญ่, สาขาลาดพร้าว"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* ที่อยู่ */}
                            <div>
                                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                                    ที่อยู่
                                </label>
                                <textarea
                                    value={newContractor.address}
                                    onChange={(e) => setNewContractor(prev => ({ ...prev, address: e.target.value }))}
                                    rows={3}
                                    maxLength={INPUT_LIMITS.companyAddress}
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 text-xs sm:text-sm px-3 py-2"
                                    placeholder="เช่น 123 หมู่ 5 ตำบลแวง อำเภอแกดำ มหาสารคาม"
                                />
                            </div>

                            {/* หมายเหตุ */}
                            <div>
                                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                                    หมายเหตุ
                                </label>
                                <textarea
                                    value={newContractor.notes || ''}
                                    onChange={(e) => setNewContractor(prev => ({ ...prev, notes: e.target.value }))}
                                    rows={2}
                                    maxLength={INPUT_LIMITS.notes}
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 text-xs sm:text-sm px-3 py-2"
                                    placeholder="บันทึกข้อมูลเพิ่มเติม..."
                                />
                            </div>
                        </div>

                        <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row gap-2 justify-end">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsSaveModalOpen(false);
                                    setNewContractor({
                                        contractorName: '',
                                        contractorType: 'individual',
                                        phone: '',
                                        address: '',
                                        idCard: '',
                                        specialties: [],
                                    });
                                    setSpecialtiesInput('');
                                }}
                                disabled={isSaving}
                                className="w-full sm:w-auto px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 text-xs sm:text-sm"
                            >
                                ยกเลิก
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveNewContractor}
                                disabled={isSaving}
                                className="w-full sm:w-auto px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-green-300 text-xs sm:text-sm"
                            >
                                {isSaving ? 'กำลังบันทึก...' : <><Save className="w-3.5 h-3.5 inline mr-1" />บันทึก</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Modal แก้ไขช่าง */}
            {isEditModalOpen && editingContractor && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-2 sm:p-4">
                    <div className="bg-white p-3 sm:p-6 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <h2 className="text-base sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4">✏️ แก้ไขข้อมูลช่าง</h2>
                        
                        <div className="space-y-3 sm:space-y-4">
                            {/* ประเภทช่าง */}
                            <div>
                                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                                    ประเภทช่าง
                                </label>
                                <select
                                    value={editingContractor.contractorType}
                                    onChange={(e) => setEditingContractor(prev => prev ? ({ ...prev, contractorType: e.target.value as 'individual' | 'company' }) : null)}
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 text-xs sm:text-sm px-3 py-2"
                                >
                                    <option value="individual">👤 บุคคล</option>
                                    <option value="company">🏢 นิติบุคคล</option>
                                </select>
                            </div>

                            {/* ชื่อช่าง */}
                            <div>
                                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                                    ชื่อช่าง <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={editingContractor.contractorName}
                                    onChange={(e) => setEditingContractor(prev => prev ? ({ ...prev, contractorName: e.target.value }) : null)}
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 text-xs sm:text-sm px-3 py-2"
                                    placeholder="เช่น นายสมชาย ช่างเก่ง"
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
                                    value={editingContractor.phone}
                                    onChange={(e) => setEditingContractor(prev => prev ? ({ ...prev, phone: e.target.value }) : null)}
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 text-xs sm:text-sm px-3 py-2"
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
                                    value={editingContractor.email || ''}
                                    onChange={(e) => setEditingContractor(prev => prev ? ({ ...prev, email: e.target.value }) : null)}
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 text-xs sm:text-sm px-3 py-2"
                                    placeholder="example@email.com"
                                />
                            </div>

                            {/* เลขบัตรประชาชน */}
                            <div>
                                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                                    เลขบัตรประชาชน/เลขผู้เสียภาษี
                                </label>
                                <input
                                    type="text"
                                    value={editingContractor.idCard || ''}
                                    onChange={(e) => setEditingContractor(prev => prev ? ({ ...prev, idCard: e.target.value }) : null)}
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 text-xs sm:text-sm px-3 py-2"
                                    placeholder="1-2345-67890-12-3"
                                />
                            </div>

                            {/* ความเชี่ยวชาญ */}
                            <div>
                                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                                    ความเชี่ยวชาญ (คั่นด้วย comma)
                                </label>
                                <input
                                    type="text"
                                    value={specialtiesInput}
                                    onChange={(e) => setSpecialtiesInput(e.target.value)}
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 text-xs sm:text-sm px-3 py-2"
                                    placeholder="เช่น งานปูกระเบื้อง, งานไฟฟ้า, งานประปา"
                                />
                            </div>

                            {/* ข้อมูลสาขา (แสดงเมื่อเป็นนิติบุคคล) */}
                            {editingContractor.contractorType === 'company' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                                    <div className="md:col-span-2">
                                        <p className="text-xs font-medium text-orange-700 mb-2">
                                            📋 ข้อมูลสาขา (ตามประกาศอธิบดีกรมสรรพากร ฉบับที่ 200)
                                        </p>
                                    </div>
                                    <div>
                                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                                            รหัสสาขา (5 หลัก)
                                        </label>
                                        <input
                                            type="text"
                                            value={editingContractor.branchCode || ''}
                                            onChange={(e) => setEditingContractor(prev => prev ? ({ ...prev, branchCode: e.target.value }) : null)}
                                            maxLength={5}
                                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 text-xs sm:text-sm px-3 py-2"
                                            placeholder="00000 (สำนักงานใหญ่)"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">00000 = สำนักงานใหญ่</p>
                                    </div>
                                    <div>
                                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                                            ชื่อสาขา
                                        </label>
                                        <input
                                            type="text"
                                            value={editingContractor.branchName || ''}
                                            onChange={(e) => setEditingContractor(prev => prev ? ({ ...prev, branchName: e.target.value }) : null)}
                                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 text-xs sm:text-sm px-3 py-2"
                                            placeholder="เช่น สำนักงานใหญ่, สาขาลาดพร้าว"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* ที่อยู่ */}
                            <div>
                                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                                    ที่อยู่
                                </label>
                                <textarea
                                    value={editingContractor.address || ''}
                                    onChange={(e) => setEditingContractor(prev => prev ? ({ ...prev, address: e.target.value }) : null)}
                                    rows={3}
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 text-xs sm:text-sm px-3 py-2"
                                    placeholder="เช่น 123 หมู่ 5 ตำบลแวง อำเภอแกดำ มหาสารคาม"
                                />
                            </div>
                        </div>

                        <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row gap-2 justify-end">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsEditModalOpen(false);
                                    setEditingContractor(null);
                                    setSpecialtiesInput('');
                                }}
                                disabled={isSaving}
                                className="w-full sm:w-auto px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 text-xs sm:text-sm"
                            >
                                ยกเลิก
                            </button>
                            <button
                                type="button"
                                onClick={handleUpdateContractor}
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

export default ContractorSelector;

