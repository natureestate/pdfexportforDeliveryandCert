/**
 * Company Selector Component
 * Dropdown สำหรับเลือกบริษัทที่ต้องการทำงาน
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCompany } from '../contexts/CompanyContext';
import { createCompany } from '../services/companies';
import { canCreateCompany } from '../services/quota';
import { Company } from '../types';
import { auth } from '../firebase.config';
import { Users } from 'lucide-react';

const CompanySelector: React.FC = () => {
    const { currentCompany, companies, selectCompany, refreshCompanies, loading } = useCompany();
    const [showDropdown, setShowDropdown] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newCompanyName, setNewCompanyName] = useState('');
    const [newCompanyAddress, setNewCompanyAddress] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [quotaInfo, setQuotaInfo] = useState<{ currentCount: number; maxCount: number; plan?: string } | null>(null);

    /**
     * เลือกบริษัท
     */
    const handleSelectCompany = (company: Company) => {
        selectCompany(company);
        setShowDropdown(false);
    };

    /**
     * ตรวจสอบสิทธิ์และเปิด modal สร้างบริษัท
     */
    const handleOpenCreateModal = async () => {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            setError('กรุณา Login ก่อนสร้างบริษัท');
            return;
        }

        try {
            // ตรวจสอบว่าสามารถสร้างบริษัทใหม่ได้หรือไม่
            const result = await canCreateCompany(currentUser.uid);
            
            if (!result.canCreate) {
                // แสดง error message
                console.error(result.reason || 'ไม่สามารถสร้างบริษัทใหม่ได้');
                return;
            }

            // บันทึกข้อมูล quota เพื่อแสดงใน modal
            setQuotaInfo({
                currentCount: result.currentCount,
                maxCount: result.maxCount,
                plan: result.plan,
            });

            // เปิด modal
            setShowDropdown(false);
            setShowCreateModal(true);
            setError(null);
        } catch (err: any) {
            setError(err.message || 'ไม่สามารถตรวจสอบสิทธิ์ได้');
        }
    };

    /**
     * สร้างบริษัทใหม่
     */
    const handleCreateCompany = async () => {
        if (!newCompanyName.trim()) {
            setError('กรุณากรอกชื่อบริษัท');
            return;
        }

        setIsCreating(true);
        setError(null);

        try {
            // เตรียมข้อมูลบริษัท - ส่งเฉพาะ fields ที่มีค่า
            const companyData: any = {
                name: newCompanyName.trim(),
            };
            
            // เพิ่ม address เฉพาะเมื่อมีค่า
            if (newCompanyAddress.trim()) {
                companyData.address = newCompanyAddress.trim();
            }
            
            await createCompany(companyData);

            // รีเฟรชรายการและปิด modal
            await refreshCompanies();
            setShowCreateModal(false);
            setNewCompanyName('');
            setNewCompanyAddress('');
        } catch (err: any) {
            setError(err.message || 'ไม่สามารถสร้างบริษัทได้');
        } finally {
            setIsCreating(false);
        }
    };

    // แสดง Loading state
    if (loading) {
        return (
            <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg">
                <svg className="animate-spin h-5 w-5 text-indigo-600 dark:text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-sm text-gray-500 dark:text-gray-400">กำลังโหลด...</span>
            </div>
        );
    }

    return (
        <div className="relative">
            {/* Dropdown Button */}
            <button
                onClick={() => {
                    if (companies.length === 0) {
                        setShowCreateModal(true);
                    } else if (currentCompany) {
                        setShowDropdown(!showDropdown);
                    } else {
                        setShowCreateModal(true);
                    }
                }}
                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors min-w-[200px]"
                title={currentCompany ? `คลิกเพื่อเปลี่ยนองค์กร (${companies.length} องค์กร)` : 'คลิกเพื่อสร้างองค์กร'}
            >
                <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <div className="flex-1 text-left">
                    <span className="font-medium text-gray-700 dark:text-gray-200 block truncate">
                        {currentCompany ? currentCompany.name : 'สร้างองค์กรใหม่'}
                    </span>
                    {companies.length > 0 && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                            {companies.length} องค์กร
                        </span>
                    )}
                </div>
                <svg className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform flex-shrink-0 ${showDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {/* Dropdown Menu - พร้อม enter/exit animation */}
            <AnimatePresence>
            {showDropdown && companies.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -8 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="fixed md:absolute left-2 right-2 sm:left-4 sm:right-4 md:left-auto md:right-0 mt-2 md:w-80 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg z-50 max-h-[80vh] sm:max-h-[70vh] flex flex-col origin-top-right">
                    <div className="p-2 sm:p-3 border-b border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 flex-shrink-0 rounded-t-lg">
                        <p className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-200">เลือกองค์กร</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{companies.length} องค์กรทั้งหมด</p>
                    </div>

                    <div className="flex-1 overflow-y-auto overscroll-contain">
                        {companies.length === 0 ? (
                            <div className="p-3 sm:p-4 text-center text-gray-500 dark:text-gray-400">
                                <p className="text-xs sm:text-sm">ยังไม่มีองค์กร</p>
                                <button
                                    onClick={() => {
                                        setShowDropdown(false);
                                        setShowCreateModal(true);
                                    }}
                                    className="mt-2 text-xs sm:text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium"
                                >
                                    + สร้างองค์กรใหม่
                                </button>
                            </div>
                        ) : (
                            companies.map((company) => (
                                <button
                                    key={company.id}
                                    onClick={() => handleSelectCompany(company)}
                                    className={`w-full text-left px-3 sm:px-4 py-2 sm:py-3 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors border-b border-gray-100 dark:border-slate-700 last:border-b-0 ${
                                        currentCompany?.id === company.id ? 'bg-indigo-50 dark:bg-indigo-900/30' : ''
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-2 sm:gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                                <p className={`text-xs sm:text-sm font-medium truncate ${
                                                    currentCompany?.id === company.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-200'
                                                }`}>
                                                    {company.name}
                                                </p>
                                                {currentCompany?.id === company.id && (
                                                    <span className="flex-shrink-0 inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-300">
                                                        เลือกอยู่
                                                    </span>
                                                )}
                                            </div>
                                            {company.address && (
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1 break-words">
                                                    📍 {company.address}
                                                </p>
                                            )}
                                            <div className="flex items-center gap-2 sm:gap-3 mt-1.5 sm:mt-2">
                                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                                    <Users className="w-3 h-3 inline mr-0.5" />{company.memberCount || 0} สมาชิก
                                                </span>
                                            </div>
                                        </div>
                                        {currentCompany?.id === company.id && (
                                            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5 sm:mt-1" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                        )}
                                    </div>
                                </button>
                            ))
                        )}
                    </div>

                    <div className="p-2 border-t border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 flex-shrink-0 rounded-b-lg">
                        <button
                            onClick={handleOpenCreateModal}
                            className="w-full px-3 sm:px-4 py-2 text-left text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-md transition-colors flex items-center gap-2 text-xs sm:text-sm"
                        >
                            <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            <span className="font-medium">เพิ่มบริษัทใหม่</span>
                        </button>
                    </div>
                </motion.div>
            )}
            </AnimatePresence>

            {/* Create Company Modal - พร้อม enter/exit animation */}
            <AnimatePresence>
            {showCreateModal && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-2 sm:p-4"
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ duration: 0.25, ease: "easeOut" }}
                        className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-4 sm:p-6">
                            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                                เพิ่มบริษัทใหม่
                            </h3>
                            
                            {/* แสดงข้อมูล Quota */}
                            {quotaInfo && (
                                <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-900/50 rounded-md">
                                    <p className="text-xs sm:text-sm text-blue-800 dark:text-blue-300">
                                        <span className="font-medium">
                                            {quotaInfo.plan ? `แผน ${quotaInfo.plan.toUpperCase()}` : 'แผนปัจจุบัน'}:
                                        </span>
                                        {' '}สร้างได้ {quotaInfo.currentCount}/{quotaInfo.maxCount === -1 ? '∞' : quotaInfo.maxCount} องค์กร
                                    </p>
                                </div>
                            )}

                            <div className="space-y-3 sm:space-y-4">
                                <div>
                                    <label htmlFor="companyName" className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        ชื่อบริษัท <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        id="companyName"
                                        value={newCompanyName}
                                        onChange={(e) => {
                                            setNewCompanyName(e.target.value);
                                            setError(null);
                                        }}
                                        placeholder="เช่น บริษัท ABC จำกัด"
                                        className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
                                        disabled={isCreating}
                                    />
                                </div>

                                <div>
                                    <label htmlFor="companyAddress" className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        ที่อยู่ (ถ้ามี)
                                    </label>
                                    <textarea
                                        id="companyAddress"
                                        value={newCompanyAddress}
                                        onChange={(e) => setNewCompanyAddress(e.target.value)}
                                        placeholder="ที่อยู่บริษัท"
                                        rows={3}
                                        className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
                                        disabled={isCreating}
                                    />
                                </div>

                                {error && (
                                    <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-900/50 rounded-md p-2 sm:p-3 flex items-start gap-2">
                                        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <p className="text-xs sm:text-sm text-red-700 dark:text-red-300">{error}</p>
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-4 sm:mt-6">
                                <button
                                    onClick={() => {
                                        setShowCreateModal(false);
                                        setNewCompanyName('');
                                        setNewCompanyAddress('');
                                        setError(null);
                                    }}
                                    disabled={isCreating}
                                    className="flex-1 px-4 py-2 text-xs sm:text-sm border border-gray-300 dark:border-slate-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    onClick={handleCreateCompany}
                                    disabled={isCreating || !newCompanyName.trim()}
                                    className="flex-1 px-4 py-2 text-xs sm:text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isCreating ? (
                                        <>
                                            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            <span>กำลังสร้าง...</span>
                                        </>
                                    ) : (
                                        'สร้างบริษัท'
                                    )}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
            </AnimatePresence>

            {/* Backdrop สำหรับปิด dropdown */}
            {showDropdown && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowDropdown(false)}
                />
            )}
        </div>
    );
};

export default CompanySelector;
