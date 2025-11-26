/**
 * Company Profile Selector Component
 * คอมโพเนนต์สำหรับเลือก Company Profile ที่บันทึกไว้
 */

import React, { useState, useEffect } from 'react';
import { CompanyProfile, getCompanyProfiles, saveCompanyProfile, deleteCompanyProfile, getProfilesByType } from '../services/companyProfiles';
import { Save } from 'lucide-react';

interface CompanyProfileSelectorProps {
    type: 'sender' | 'receiver';
    label: string;
    onSelect: (profile: { companyName: string; address: string }) => void;
    currentCompany?: string;
    currentAddress?: string;
}

const CompanyProfileSelector: React.FC<CompanyProfileSelectorProps> = ({
    type,
    label,
    onSelect,
    currentCompany,
    currentAddress,
}) => {
    const [profiles, setProfiles] = useState<CompanyProfile[]>([]);
    const [filteredProfiles, setFilteredProfiles] = useState<CompanyProfile[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [newProfileName, setNewProfileName] = useState('');

    // โหลด profiles
    useEffect(() => {
        loadProfiles();
    }, []);

    // กรอง profiles ตามประเภท
    useEffect(() => {
        setFilteredProfiles(getProfilesByType(profiles, type));
    }, [profiles, type]);

    const loadProfiles = async () => {
        try {
            const data = await getCompanyProfiles();
            setProfiles(data);
        } catch (error) {
            console.error('Failed to load profiles:', error);
        }
    };

    const handleSelectProfile = (profile: CompanyProfile) => {
        onSelect({
            companyName: profile.companyName,
            address: profile.address,
        });
    };

    const handleSaveCurrentAsProfile = async () => {
        if (!newProfileName.trim()) {
            alert('กรุณาใส่ชื่อ Profile');
            return;
        }

        if (!currentCompany || !currentAddress) {
            alert('กรุณากรอกข้อมูลบริษัทและที่อยู่ก่อนบันทึก');
            return;
        }

        setIsSaving(true);
        try {
            await saveCompanyProfile({
                name: newProfileName,
                companyName: currentCompany,
                address: currentAddress,
                type: type,
            });

            await loadProfiles();
            setIsModalOpen(false);
            setNewProfileName('');
            alert('บันทึก Profile สำเร็จ!');
        } catch (error) {
            console.error('Failed to save profile:', error);
            alert('ไม่สามารถบันทึก Profile ได้');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteProfile = async (id: string) => {
        if (!window.confirm('ต้องการลบ Profile นี้หรือไม่?')) return;

        try {
            await deleteCompanyProfile(id);
            await loadProfiles();
            alert('ลบ Profile สำเร็จ!');
        } catch (error) {
            console.error('Failed to delete profile:', error);
            alert('ไม่สามารถลบ Profile ได้');
        }
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-slate-700">{label}</label>
                <div className="flex gap-2">
                    {filteredProfiles.length > 0 && (
                        <select
                            className="text-xs border border-indigo-300 rounded px-2 py-1 text-indigo-700 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            onChange={(e) => {
                                const profile = filteredProfiles.find(p => p.id === e.target.value);
                                if (profile) handleSelectProfile(profile);
                                e.target.value = '';
                            }}
                            defaultValue=""
                        >
                            <option value="">📋 เลือก Profile</option>
                            {filteredProfiles.map(profile => (
                                <option key={profile.id} value={profile.id}>
                                    {profile.name}
                                </option>
                            ))}
                        </select>
                    )}
                    <button
                        type="button"
                        onClick={() => setIsModalOpen(true)}
                        className="text-xs bg-green-500 text-white rounded px-2 py-1 hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                        <Save className="w-4 h-4 inline mr-1" />บันทึก
                    </button>
                </div>
            </div>

            {/* Modal สำหรับบันทึก Profile */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
                    <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">
                            บันทึก Profile ใหม่
                        </h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    ชื่อ Profile
                                </label>
                                <input
                                    type="text"
                                    value={newProfileName}
                                    onChange={(e) => setNewProfileName(e.target.value)}
                                    placeholder={type === 'sender' ? 'เช่น "บริษัทเรา"' : 'เช่น "ลูกค้า A"'}
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                />
                            </div>

                            <div className="bg-gray-50 p-3 rounded">
                                <p className="text-xs text-gray-600 mb-1">จะบันทึกข้อมูล:</p>
                                <p className="text-sm font-medium text-gray-800">{currentCompany || '(ยังไม่ได้กรอก)'}</p>
                                <p className="text-xs text-gray-600 mt-1">{currentAddress || '(ยังไม่ได้กรอก)'}</p>
                            </div>
                        </div>

                        <div className="mt-6 flex gap-2 justify-end">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsModalOpen(false);
                                    setNewProfileName('');
                                }}
                                disabled={isSaving}
                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
                            >
                                ยกเลิก
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveCurrentAsProfile}
                                disabled={isSaving}
                                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-green-300"
                            >
                                {isSaving ? 'กำลังบันทึก...' : 'บันทึก'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* รายการ Profiles ที่บันทึกไว้ */}
            {filteredProfiles.length > 0 && (
                <div className="mt-2 text-xs">
                    <details className="cursor-pointer">
                        <summary className="text-slate-600 hover:text-indigo-600">
                            จัดการ Profiles ({filteredProfiles.length})
                        </summary>
                        <div className="mt-2 space-y-1 pl-2 border-l-2 border-slate-200">
                            {filteredProfiles.map(profile => (
                                <div key={profile.id} className="flex items-center justify-between p-2 bg-slate-50 rounded hover:bg-slate-100">
                                    <button
                                        type="button"
                                        onClick={() => handleSelectProfile(profile)}
                                        className="flex-1 text-left"
                                    >
                                        <p className="font-medium text-slate-800">{profile.name}</p>
                                        <p className="text-xs text-slate-600 truncate">{profile.companyName}</p>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleDeleteProfile(profile.id!)}
                                        className="ml-2 p-1 text-red-500 hover:bg-red-50 rounded"
                                        title="ลบ Profile"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </details>
                </div>
            )}
        </div>
    );
};

export default CompanyProfileSelector;

