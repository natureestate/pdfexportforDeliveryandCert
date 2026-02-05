/**
 * Tab Settings Modal
 * Modal สำหรับตั้งค่าสิทธิ์การเข้าถึง Tab Menu
 */

import React, { useState, useEffect, useCallback } from 'react';
import { X, LayoutDashboard, FilePlus, History, Users, BarChart2, Calendar, GripVertical, Eye, EyeOff, Save, RefreshCw, Shield, User } from 'lucide-react';
import { useCompany } from '../contexts/CompanyContext';
import { TabConfig, TabType, UserRole, DEFAULT_TAB_CONFIG } from '../types';
import {
    getAllTabsForRole,
    saveTabSettingsForRole,
    getDefaultTabsForRole,
} from '../services/tabSettings';

// Icon map สำหรับ Tab
const tabIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    LayoutDashboard,
    FilePlus,
    History,
    Users,
    BarChart2,
    Calendar,
};

interface TabSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    companyId: string;
    onSaved?: () => void;
}

const TabSettingsModal: React.FC<TabSettingsModalProps> = ({
    isOpen,
    onClose,
    companyId,
    onSaved,
}) => {
    const [selectedRole, setSelectedRole] = useState<UserRole>('member');
    const [tabs, setTabs] = useState<TabConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasChanges, setHasChanges] = useState(false);

    /**
     * โหลด Tab settings สำหรับ role ที่เลือก
     */
    const loadTabs = useCallback(async () => {
        if (!companyId) return;

        try {
            setLoading(true);
            setError(null);
            const loadedTabs = await getAllTabsForRole(companyId, selectedRole);
            setTabs(loadedTabs);
            setHasChanges(false);
        } catch (err) {
            console.error('Error loading tabs:', err);
            setError('ไม่สามารถโหลดการตั้งค่า Tab ได้');
        } finally {
            setLoading(false);
        }
    }, [companyId, selectedRole]);

    useEffect(() => {
        if (isOpen) {
            loadTabs();
        }
    }, [isOpen, loadTabs]);

    /**
     * Toggle visibility ของ Tab
     */
    const handleToggleVisibility = (tabId: TabType) => {
        setTabs(prev =>
            prev.map(tab =>
                tab.id === tabId ? { ...tab, visible: !tab.visible } : tab
            )
        );
        setHasChanges(true);
    };

    /**
     * Reset เป็นค่า default
     */
    const handleReset = () => {
        const defaultTabs = getDefaultTabsForRole(selectedRole, true);
        setTabs(defaultTabs);
        setHasChanges(true);
    };

    /**
     * บันทึกการตั้งค่า
     */
    const handleSave = async () => {
        try {
            setSaving(true);
            setError(null);
            await saveTabSettingsForRole(companyId, selectedRole, tabs);
            setHasChanges(false);
            onSaved?.();
        } catch (err) {
            console.error('Error saving tabs:', err);
            setError(err instanceof Error ? err.message : 'ไม่สามารถบันทึกการตั้งค่าได้');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-600">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 rounded-lg">
                            <LayoutDashboard className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">ตั้งค่า Tab Menu</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">กำหนดสิทธิ์การเข้าถึง Tab สำหรับแต่ละ Role</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    </button>
                </div>

                {/* Role Selector */}
                <div className="p-4 bg-gray-50 dark:bg-slate-700 border-b border-gray-200 dark:border-slate-600">
                    <div className="flex gap-2">
                        <button
                            onClick={() => setSelectedRole('admin')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                                selectedRole === 'admin'
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700'
                            }`}
                        >
                            <Shield className="w-4 h-4" />
                            Admin
                        </button>
                        <button
                            onClick={() => setSelectedRole('member')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                                selectedRole === 'member'
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700'
                            }`}
                        >
                            <User className="w-4 h-4" />
                            Member
                        </button>
                    </div>
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        {selectedRole === 'admin' 
                            ? 'Admin สามารถเข้าถึง Tab ทั้งหมดได้ตาม default'
                            : 'Member จะเห็นเฉพาะ Tab ที่เปิดใช้งาน'
                        }
                    </p>
                </div>

                {/* Content */}
                <div className="p-4 overflow-y-auto max-h-[50vh]">
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <RefreshCw className="w-6 h-6 text-indigo-600 animate-spin" />
                            <span className="ml-2 text-gray-600 dark:text-gray-400">กำลังโหลด...</span>
                        </div>
                    ) : error ? (
                        <div className="text-center py-8">
                            <p className="text-red-500">{error}</p>
                            <button
                                onClick={loadTabs}
                                className="mt-2 px-4 py-2 text-sm bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg"
                            >
                                ลองใหม่
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {tabs.map((tab) => {
                                const TabIcon = tabIconMap[tab.icon];
                                return (
                                    <div
                                        key={tab.id}
                                        className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                                            tab.visible
                                                ? 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-600'
                                                : 'bg-gray-50 dark:bg-slate-700 border-gray-100 dark:border-slate-600 opacity-60'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <GripVertical className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                                            {TabIcon && (
                                                <div className={`p-2 rounded-lg ${
                                                    tab.visible ? 'bg-indigo-100' : 'bg-gray-100 dark:bg-slate-600'
                                                }`}>
                                                    <TabIcon className={`w-4 h-4 ${
                                                        tab.visible ? 'text-indigo-600' : 'text-gray-400'
                                                    }`} />
                                                </div>
                                            )}
                                            <div>
                                                <p className="font-medium text-gray-800 dark:text-gray-100">{tab.label}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    {tab.shortLabel}
                                                    {tab.adminOnly && (
                                                        <span className="ml-2 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-xs">
                                                            Admin Only
                                                        </span>
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleToggleVisibility(tab.id)}
                                            className={`p-2 rounded-lg transition-colors ${
                                                tab.visible
                                                    ? 'bg-green-100 text-green-600 hover:bg-green-200'
                                                    : 'bg-gray-100 dark:bg-slate-600 text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-500'
                                            }`}
                                            title={tab.visible ? 'ซ่อน Tab นี้' : 'แสดง Tab นี้'}
                                        >
                                            {tab.visible ? (
                                                <Eye className="w-4 h-4" />
                                            ) : (
                                                <EyeOff className="w-4 h-4" />
                                            )}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700">
                    <button
                        onClick={handleReset}
                        className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-600 rounded-lg transition-colors"
                    >
                        <RefreshCw className="w-4 h-4 inline mr-1" />
                        รีเซ็ตเป็นค่าเริ่มต้น
                    </button>
                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-500 transition-colors"
                        >
                            ยกเลิก
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving || !hasChanges}
                            className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-colors ${
                                hasChanges && !saving
                                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                                    : 'bg-gray-300 dark:bg-slate-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                            }`}
                        >
                            {saving ? (
                                <>
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                    กำลังบันทึก...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    บันทึก
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TabSettingsModal;

