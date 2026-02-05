/**
 * User Menu Settings Modal Component
 * Modal สำหรับ Admin กำหนดสิทธิ์เมนูรายบุคคล
 * - เลือก user ที่ต้องการตั้งค่า
 * - กำหนดเมนูที่แสดง/ซ่อน
 * - จัดลำดับเมนู
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
    X, 
    Users, 
    GripVertical, 
    Eye, 
    EyeOff, 
    ChevronUp, 
    ChevronDown,
    RotateCcw,
    Save,
    Package,
    Shield,
    FileText,
    Receipt,
    FileCheck,
    DollarSign,
    ShoppingCart,
    StickyNote,
    PlusCircle,
    HardHat,
    Loader2,
    AlertCircle,
    CheckCircle,
    User,
    Settings,
    ChevronLeft,
    Trash2,
    Copy
} from 'lucide-react';
import { 
    MenuItemConfig, 
    DEFAULT_MENU_CONFIG,
    MenuDocType,
    MemberWithMenuSettings
} from '../types';
import { 
    getMembersWithMenuSettings,
    getAllMenusForUser,
    saveUserMenuSettings,
    removeUserMenuSettings,
    copyRoleSettingsToUser,
    getAllMenusForRole
} from '../services/menuSettings';
import { useCompany } from '../contexts/CompanyContext';
import { checkIsAdmin } from '../services/companyMembers';
import { useAuth } from '../contexts/AuthContext';

// Icon mapping
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    Package,
    Shield,
    FileText,
    Receipt,
    FileCheck,
    DollarSign,
    ShoppingCart,
    StickyNote,
    PlusCircle,
    HardHat,
};

interface UserMenuSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave?: () => void;
}

type NotificationType = 'success' | 'error' | 'info';

interface Notification {
    show: boolean;
    message: string;
    type: NotificationType;
}

type ViewMode = 'list' | 'edit';

const UserMenuSettingsModal: React.FC<UserMenuSettingsModalProps> = ({
    isOpen,
    onClose,
    onSave,
}) => {
    const { currentCompany } = useCompany();
    const { user } = useAuth();
    
    // View state
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [selectedMember, setSelectedMember] = useState<MemberWithMenuSettings | null>(null);
    
    // Members list
    const [members, setMembers] = useState<MemberWithMenuSettings[]>([]);
    
    // Menu settings for selected user
    const [menus, setMenus] = useState<MenuItemConfig[]>([...DEFAULT_MENU_CONFIG]);
    
    // Loading และ Error states
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [notification, setNotification] = useState<Notification>({ show: false, message: '', type: 'info' });
    
    // Drag state
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

    /**
     * แสดง notification
     */
    const showNotification = useCallback((message: string, type: NotificationType) => {
        setNotification({ show: true, message, type });
        setTimeout(() => {
            setNotification(prev => ({ ...prev, show: false }));
        }, 3000);
    }, []);

    /**
     * โหลดรายการสมาชิก
     */
    const loadMembers = useCallback(async () => {
        if (!currentCompany?.id) return;
        
        setIsLoading(true);
        try {
            const membersList = await getMembersWithMenuSettings(currentCompany.id);
            // Filter เฉพาะ active members
            setMembers(membersList.filter(m => m.status === 'active'));
        } catch (error) {
            console.error('❌ โหลดรายการสมาชิกล้มเหลว:', error);
            showNotification('ไม่สามารถโหลดรายการสมาชิกได้', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [currentCompany?.id, showNotification]);

    /**
     * โหลดการตั้งค่าเมนูของ user ที่เลือก
     */
    const loadUserMenuSettings = useCallback(async (member: MemberWithMenuSettings) => {
        if (!currentCompany?.id) return;
        
        setIsLoading(true);
        try {
            const userMenus = await getAllMenusForUser(currentCompany.id, member.userId, member.role);
            setMenus(userMenus);
        } catch (error) {
            console.error('❌ โหลดการตั้งค่าเมนูล้มเหลว:', error);
            showNotification('ไม่สามารถโหลดการตั้งค่าได้', 'error');
            setMenus([...DEFAULT_MENU_CONFIG]);
        } finally {
            setIsLoading(false);
        }
    }, [currentCompany?.id, showNotification]);

    /**
     * ตรวจสอบสิทธิ์ Admin
     */
    const checkAdminPermission = useCallback(async () => {
        if (!currentCompany?.id || !user?.uid) {
            setIsAdmin(false);
            return;
        }
        
        try {
            const adminStatus = await checkIsAdmin(currentCompany.id, user.uid);
            setIsAdmin(adminStatus);
            
            if (!adminStatus) {
                showNotification('คุณไม่มีสิทธิ์ตั้งค่าเมนู (ต้องเป็น Admin)', 'error');
            }
        } catch (error) {
            console.error('❌ ตรวจสอบสิทธิ์ล้มเหลว:', error);
            setIsAdmin(false);
        }
    }, [currentCompany?.id, user?.uid, showNotification]);

    // โหลดข้อมูลเมื่อเปิด modal
    useEffect(() => {
        if (isOpen) {
            checkAdminPermission();
            loadMembers();
            setViewMode('list');
            setSelectedMember(null);
        }
    }, [isOpen, loadMembers, checkAdminPermission]);

    /**
     * เลือก user เพื่อตั้งค่า
     */
    const handleSelectMember = async (member: MemberWithMenuSettings) => {
        setSelectedMember(member);
        setViewMode('edit');
        await loadUserMenuSettings(member);
    };

    /**
     * กลับไปหน้ารายการ
     */
    const handleBackToList = () => {
        setViewMode('list');
        setSelectedMember(null);
        loadMembers(); // Refresh list
    };

    /**
     * สลับการแสดง/ซ่อนเมนู
     */
    const handleToggleVisibility = (menuId: MenuDocType) => {
        setMenus(prev => prev.map(menu =>
            menu.id === menuId
                ? { ...menu, visible: !menu.visible }
                : menu
        ));
    };

    /**
     * ย้ายเมนูขึ้น
     */
    const handleMoveUp = (index: number) => {
        if (index === 0) return;
        
        setMenus(prev => {
            const newMenus = [...prev];
            [newMenus[index - 1], newMenus[index]] = [newMenus[index], newMenus[index - 1]];
            return newMenus.map((menu, i) => ({ ...menu, order: i }));
        });
    };

    /**
     * ย้ายเมนูลง
     */
    const handleMoveDown = (index: number) => {
        if (index === menus.length - 1) return;
        
        setMenus(prev => {
            const newMenus = [...prev];
            [newMenus[index], newMenus[index + 1]] = [newMenus[index + 1], newMenus[index]];
            return newMenus.map((menu, i) => ({ ...menu, order: i }));
        });
    };

    /**
     * Drag & Drop handlers
     */
    const handleDragStart = (index: number) => {
        setDraggedIndex(index);
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        setDragOverIndex(index);
    };

    const handleDragEnd = () => {
        if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
            setMenus(prev => {
                const newMenus = [...prev];
                const [draggedItem] = newMenus.splice(draggedIndex, 1);
                newMenus.splice(dragOverIndex, 0, draggedItem);
                return newMenus.map((menu, i) => ({ ...menu, order: i }));
            });
        }
        setDraggedIndex(null);
        setDragOverIndex(null);
    };

    /**
     * บันทึกการตั้งค่า
     */
    const handleSave = async () => {
        if (!currentCompany?.id || !isAdmin || !selectedMember) return;
        
        setIsSaving(true);
        try {
            await saveUserMenuSettings(
                currentCompany.id,
                selectedMember.userId,
                menus,
                selectedMember.email,
                selectedMember.displayName
            );
            showNotification('บันทึกการตั้งค่าสำเร็จ', 'success');
            onSave?.();
        } catch (error) {
            console.error('❌ บันทึกล้มเหลว:', error);
            showNotification('ไม่สามารถบันทึกการตั้งค่าได้', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    /**
     * รีเซ็ตเป็นค่าจาก role
     */
    const handleResetToRole = async () => {
        if (!currentCompany?.id || !isAdmin || !selectedMember) return;
        
        if (!confirm(`ต้องการรีเซ็ตการตั้งค่าของ ${selectedMember.displayName || selectedMember.email} กลับเป็นค่าจาก ${selectedMember.role === 'admin' ? 'Admin' : 'Member'} หรือไม่?`)) {
            return;
        }
        
        setIsSaving(true);
        try {
            // ลบการตั้งค่าเฉพาะ user
            await removeUserMenuSettings(currentCompany.id, selectedMember.userId);
            
            // โหลดค่าจาก role
            const roleMenus = await getAllMenusForRole(currentCompany.id, selectedMember.role);
            setMenus(roleMenus);
            
            showNotification('รีเซ็ตการตั้งค่าสำเร็จ', 'success');
            onSave?.();
        } catch (error) {
            console.error('❌ รีเซ็ตล้มเหลว:', error);
            showNotification('ไม่สามารถรีเซ็ตการตั้งค่าได้', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    /**
     * คัดลอกการตั้งค่าจาก role
     */
    const handleCopyFromRole = async () => {
        if (!currentCompany?.id || !selectedMember) return;
        
        setIsLoading(true);
        try {
            const roleMenus = await getAllMenusForRole(currentCompany.id, selectedMember.role);
            setMenus(roleMenus);
            showNotification(`คัดลอกการตั้งค่าจาก ${selectedMember.role === 'admin' ? 'Admin' : 'Member'} สำเร็จ`, 'info');
        } catch (error) {
            console.error('❌ คัดลอกล้มเหลว:', error);
            showNotification('ไม่สามารถคัดลอกการตั้งค่าได้', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    // ไม่แสดงถ้า modal ไม่ได้เปิด
    if (!isOpen) return null;

    // Render icon component
    const renderIcon = (iconName: string) => {
        const IconComponent = iconMap[iconName];
        return IconComponent ? <IconComponent className="w-5 h-5" /> : null;
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop */}
            <div 
                className="fixed inset-0 bg-black/50 transition-opacity"
                onClick={onClose}
            />
            
            {/* Modal */}
            <div className="flex min-h-full items-center justify-center p-4">
                <div className="relative w-full max-w-2xl bg-white dark:bg-slate-800 rounded-xl shadow-2xl transform transition-all">
                    {/* Notification */}
                    {notification.show && (
                        <div className={`absolute top-4 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-lg shadow-lg z-10 flex items-center gap-2 ${
                            notification.type === 'success' ? 'bg-green-500 text-white' :
                            notification.type === 'error' ? 'bg-red-500 text-white' :
                            'bg-blue-500 text-white'
                        }`}>
                            {notification.type === 'success' && <CheckCircle className="w-4 h-4" />}
                            {notification.type === 'error' && <AlertCircle className="w-4 h-4" />}
                            {notification.message}
                        </div>
                    )}
                    
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-600">
                        <div className="flex items-center gap-3">
                            {viewMode === 'edit' && (
                                <button
                                    onClick={handleBackToList}
                                    className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                            )}
                            <div className="p-2 bg-purple-100 rounded-lg">
                                <Users className="w-6 h-6 text-purple-600" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                    {viewMode === 'list' ? 'ตั้งค่าเมนูรายบุคคล' : `ตั้งค่าเมนู: ${selectedMember?.displayName || selectedMember?.email}`}
                                </h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {viewMode === 'list' ? 'เลือก user ที่ต้องการกำหนดสิทธิ์เมนู' : `Role: ${selectedMember?.role === 'admin' ? 'Admin' : 'Member'}`}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-4 max-h-[500px] overflow-y-auto">
                        {!isAdmin && (
                            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-amber-700">
                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                <span className="text-sm">คุณไม่มีสิทธิ์ตั้งค่าเมนู (ต้องเป็น Admin ขององค์กร)</span>
                            </div>
                        )}
                        
                        {isLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
                            </div>
                        ) : viewMode === 'list' ? (
                            /* Members List View */
                            <div className="space-y-2">
                                {members.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                        <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                        <p>ไม่พบสมาชิกในองค์กร</p>
                                    </div>
                                ) : (
                                    members.map((member) => (
                                        <div
                                            key={member.memberId}
                                            onClick={() => isAdmin && handleSelectMember(member)}
                                            className={`flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 transition-all ${
                                                isAdmin ? 'hover:border-purple-300 dark:hover:border-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/30 cursor-pointer' : 'opacity-60'
                                            }`}
                                        >
                                            {/* Avatar */}
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                                member.role === 'admin' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'
                                            }`}>
                                                <User className="w-5 h-5" />
                                            </div>
                                            
                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                                                    {member.displayName || member.email}
                                                </p>
                                                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                                    <span className={`px-1.5 py-0.5 rounded ${
                                                        member.role === 'admin' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                                                    }`}>
                                                        {member.role === 'admin' ? 'Admin' : 'Member'}
                                                    </span>
                                                    {member.displayName && (
                                                        <span className="truncate">{member.email}</span>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            {/* Custom Settings Badge */}
                                            {member.hasCustomMenuSettings && (
                                                <div className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full flex items-center gap-1">
                                                    <Settings className="w-3 h-3" />
                                                    กำหนดเอง
                                                </div>
                                            )}
                                            
                                            {/* Arrow */}
                                            {isAdmin && (
                                                <ChevronLeft className="w-5 h-5 text-gray-400 dark:text-gray-500 rotate-180" />
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        ) : (
                            /* Menu Edit View */
                            <div className="space-y-2">
                                {/* Info Banner */}
                                {selectedMember?.hasCustomMenuSettings && (
                                    <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg flex items-center gap-2 text-purple-700">
                                        <Settings className="w-5 h-5 flex-shrink-0" />
                                        <span className="text-sm">User นี้มีการตั้งค่าเมนูเฉพาะ</span>
                                    </div>
                                )}
                                
                                {menus.map((menu, index) => (
                                    <div
                                        key={menu.id}
                                        draggable={isAdmin}
                                        onDragStart={() => handleDragStart(index)}
                                        onDragOver={(e) => handleDragOver(e, index)}
                                        onDragEnd={handleDragEnd}
                                        className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                                            dragOverIndex === index
                                                ? 'border-purple-500 dark:border-purple-600 bg-purple-50 dark:bg-purple-900/30'
                                                : menu.visible
                                                    ? 'border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-gray-300 dark:hover:border-slate-500'
                                                    : 'border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 opacity-60'
                                        } ${isAdmin ? 'cursor-grab active:cursor-grabbing' : ''}`}
                                    >
                                        {/* Drag Handle */}
                                        {isAdmin && (
                                            <div className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
                                                <GripVertical className="w-5 h-5" />
                                            </div>
                                        )}
                                        
                                        {/* Icon */}
                                        <div className={`p-2 rounded-lg ${
                                            menu.visible ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' : 'bg-gray-200 dark:bg-slate-600 text-gray-400 dark:text-gray-500'
                                        }`}>
                                            {renderIcon(menu.icon)}
                                        </div>
                                        
                                        {/* Label */}
                                        <div className="flex-1 min-w-0">
                                            <p className={`font-medium ${menu.visible ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}`}>
                                                {menu.label}
                                            </p>
                                        </div>
                                        
                                        {/* Actions */}
                                        {isAdmin && (
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => handleMoveUp(index)}
                                                    disabled={index === 0}
                                                    className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                                                    title="ย้ายขึ้น"
                                                >
                                                    <ChevronUp className="w-4 h-4" />
                                                </button>
                                                
                                                <button
                                                    onClick={() => handleMoveDown(index)}
                                                    disabled={index === menus.length - 1}
                                                    className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                                                    title="ย้ายลง"
                                                >
                                                    <ChevronDown className="w-4 h-4" />
                                                </button>
                                                
                                                <button
                                                    onClick={() => handleToggleVisibility(menu.id)}
                                                    className={`p-1.5 rounded transition-colors ${
                                                        menu.visible
                                                            ? 'text-green-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30'
                                                            : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                                                    }`}
                                                    title={menu.visible ? 'ซ่อนเมนู' : 'แสดงเมนู'}
                                                >
                                                    {menu.visible ? (
                                                        <Eye className="w-4 h-4" />
                                                    ) : (
                                                        <EyeOff className="w-4 h-4" />
                                                    )}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    {viewMode === 'edit' && (
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 border-t border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 rounded-b-xl">
                            <div className="flex gap-2">
                                {isAdmin && (
                                    <>
                                        <button
                                            onClick={handleResetToRole}
                                            disabled={isSaving}
                                            className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                            title="ลบการตั้งค่าเฉพาะ และใช้ค่าจาก Role"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            ใช้ค่าจาก Role
                                        </button>
                                        <button
                                            onClick={handleCopyFromRole}
                                            disabled={isSaving}
                                            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg transition-colors disabled:opacity-50"
                                            title="คัดลอกการตั้งค่าจาก Role มาแก้ไข"
                                        >
                                            <Copy className="w-4 h-4" />
                                            คัดลอกจาก Role
                                        </button>
                                    </>
                                )}
                            </div>
                            
                            <div className="flex gap-2">
                                <button
                                    onClick={handleBackToList}
                                    className="flex-1 sm:flex-none px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                                >
                                    ยกเลิก
                                </button>
                                {isAdmin && (
                                    <button
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isSaving ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Save className="w-4 h-4" />
                                        )}
                                        บันทึก
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                    
                    {/* Footer for List View */}
                    {viewMode === 'list' && (
                        <div className="flex justify-end p-4 border-t border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 rounded-b-xl">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                            >
                                ปิด
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserMenuSettingsModal;

