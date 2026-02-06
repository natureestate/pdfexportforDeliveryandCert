/**
 * Menu Settings Modal Component
 * Modal สำหรับ Admin ตั้งค่าเมนูของบริษัท
 * - เลือกแสดง/ซ่อนเมนู
 * - จัดลำดับเมนู (Drag & Drop)
 * - แยกการตั้งค่าตาม role
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
    X, 
    Settings, 
    GripVertical, 
    Eye, 
    EyeOff, 
    ChevronUp, 
    ChevronDown,
    RotateCcw,
    Save,
    Copy,
    Users,
    UserCog,
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
    CheckCircle
} from 'lucide-react';
import { 
    MenuItemConfig, 
    UserRole, 
    DEFAULT_MENU_CONFIG,
    MenuDocType
} from '../types';
import { 
    getAllMenusForRole, 
    saveMenuSettingsForRole, 
    resetMenuSettings,
    copyMenuSettings
} from '../services/menuSettings';
import { useCompany } from '../contexts/CompanyContext';
import { checkIsAdmin } from '../services/companyMembers';
import { useAuth } from '../contexts/AuthContext';

// Icon mapping - แมป icon name กับ component
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

interface MenuSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave?: () => void;
    onOpenUserSettings?: () => void; // เปิด modal ตั้งค่ารายบุคคล
}

type NotificationType = 'success' | 'error' | 'info';

interface Notification {
    show: boolean;
    message: string;
    type: NotificationType;
}

const MenuSettingsModal: React.FC<MenuSettingsModalProps> = ({
    isOpen,
    onClose,
    onSave,
    onOpenUserSettings,
}) => {
    const { currentCompany } = useCompany();
    const { user } = useAuth();
    
    // State สำหรับ role ที่กำลังตั้งค่า
    const [selectedRole, setSelectedRole] = useState<UserRole>('member');
    
    // State สำหรับเมนู
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
     * โหลดการตั้งค่าเมนูสำหรับ role ที่เลือก
     */
    const loadMenuSettings = useCallback(async () => {
        if (!currentCompany?.id) return;
        
        setIsLoading(true);
        try {
            const menuSettings = await getAllMenusForRole(currentCompany.id, selectedRole);
            setMenus(menuSettings);
        } catch (error) {
            console.error('❌ โหลดการตั้งค่าเมนูล้มเหลว:', error);
            showNotification('ไม่สามารถโหลดการตั้งค่าได้', 'error');
            setMenus([...DEFAULT_MENU_CONFIG]);
        } finally {
            setIsLoading(false);
        }
    }, [currentCompany?.id, selectedRole, showNotification]);

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

    // โหลดข้อมูลเมื่อเปิด modal หรือเปลี่ยน role
    useEffect(() => {
        if (isOpen) {
            checkAdminPermission();
            loadMenuSettings();
        }
    }, [isOpen, loadMenuSettings, checkAdminPermission]);

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
        if (!currentCompany?.id || !isAdmin) return;
        
        setIsSaving(true);
        try {
            await saveMenuSettingsForRole(currentCompany.id, selectedRole, menus);
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
     * รีเซ็ตเป็นค่า default
     */
    const handleReset = async () => {
        if (!currentCompany?.id || !isAdmin) return;
        
        if (!confirm(`ต้องการรีเซ็ตการตั้งค่าเมนูสำหรับ ${selectedRole === 'admin' ? 'Admin' : 'Member'} เป็นค่าเริ่มต้นหรือไม่?`)) {
            return;
        }
        
        setIsSaving(true);
        try {
            await resetMenuSettings(currentCompany.id, selectedRole);
            setMenus([...DEFAULT_MENU_CONFIG]);
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
     * คัดลอกการตั้งค่าจาก Admin ไป Member หรือกลับกัน
     */
    const handleCopySettings = async () => {
        if (!currentCompany?.id || !isAdmin) return;
        
        const targetRole: UserRole = selectedRole === 'admin' ? 'member' : 'admin';
        
        if (!confirm(`ต้องการคัดลอกการตั้งค่าจาก ${selectedRole === 'admin' ? 'Admin' : 'Member'} ไปยัง ${targetRole === 'admin' ? 'Admin' : 'Member'} หรือไม่?`)) {
            return;
        }
        
        setIsSaving(true);
        try {
            await copyMenuSettings(currentCompany.id, selectedRole, targetRole);
            showNotification(`คัดลอกการตั้งค่าไปยัง ${targetRole === 'admin' ? 'Admin' : 'Member'} สำเร็จ`, 'success');
        } catch (error) {
            console.error('❌ คัดลอกล้มเหลว:', error);
            showNotification('ไม่สามารถคัดลอกการตั้งค่าได้', 'error');
        } finally {
            setIsSaving(false);
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
                            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                                <Settings className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">ตั้งค่าเมนู</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400">เลือกเมนูที่ต้องการแสดงและจัดลำดับ</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Role Selector */}
                    <div className="p-4 border-b border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">ตั้งค่าสำหรับ:</span>
                            {/* ปุ่มตั้งค่ารายบุคคล */}
                            {isAdmin && onOpenUserSettings && (
                                <button
                                    onClick={() => {
                                        onClose();
                                        onOpenUserSettings();
                                    }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
                                >
                                    <Users className="w-3.5 h-3.5" />
                                    ตั้งค่ารายบุคคล
                                </button>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setSelectedRole('admin')}
                                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 transition-all ${
                                    selectedRole === 'admin'
                                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                                        : 'border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-slate-500'
                                }`}
                            >
                                <UserCog className="w-4 h-4" />
                                <span className="font-medium">Admin</span>
                            </button>
                            <button
                                onClick={() => setSelectedRole('member')}
                                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 transition-all ${
                                    selectedRole === 'member'
                                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                                        : 'border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-slate-500'
                                }`}
                            >
                                <Users className="w-4 h-4" />
                                <span className="font-medium">Member</span>
                            </button>
                        </div>
                    </div>

                    {/* Menu List */}
                    <div className="p-4 max-h-[400px] overflow-y-auto">
                        {!isAdmin && (
                            <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-center gap-2 text-amber-700 dark:text-amber-300">
                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                <span className="text-sm">คุณไม่มีสิทธิ์ตั้งค่าเมนู (ต้องเป็น Admin ขององค์กร)</span>
                            </div>
                        )}
                        
                        {isLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {menus.map((menu, index) => (
                                    <div
                                        key={menu.id}
                                        draggable={isAdmin}
                                        onDragStart={() => handleDragStart(index)}
                                        onDragOver={(e) => handleDragOver(e, index)}
                                        onDragEnd={handleDragEnd}
                                        className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                                            dragOverIndex === index
                                                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                                                : menu.visible
                                                    ? 'border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 hover:border-gray-300 dark:hover:border-slate-500'
                                                    : 'border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-800 opacity-60'
                                        } ${isAdmin ? 'cursor-grab active:cursor-grabbing' : ''}`}
                                    >
                                        {/* Drag Handle - จุดลาก */}
                                        {isAdmin && (
                                            <div className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                                <GripVertical className="w-5 h-5" />
                                            </div>
                                        )}
                                        
                                        {/* Icon */}
                                        <div className={`p-2 rounded-lg ${
                                            menu.visible 
                                                ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400' 
                                                : 'bg-gray-200 dark:bg-slate-600 text-gray-400 dark:text-gray-500'
                                        }`}>
                                            {renderIcon(menu.icon)}
                                        </div>
                                        
                                        {/* Label - ชื่อเมนู */}
                                        <div className="flex-1 min-w-0">
                                            <p className={`font-medium ${menu.visible ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}`}>
                                                {menu.label}
                                            </p>
                                            <p className="text-xs text-gray-400 dark:text-gray-500">
                                                {menu.shortLabel}
                                            </p>
                                        </div>
                                        
                                        {/* Actions - ปุ่มจัดการ */}
                                        {isAdmin && (
                                            <div className="flex items-center gap-1">
                                                {/* Move Up - ย้ายขึ้น */}
                                                <button
                                                    onClick={() => handleMoveUp(index)}
                                                    disabled={index === 0}
                                                    className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-600 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                                                    title="ย้ายขึ้น"
                                                >
                                                    <ChevronUp className="w-4 h-4" />
                                                </button>
                                                
                                                {/* Move Down - ย้ายลง */}
                                                <button
                                                    onClick={() => handleMoveDown(index)}
                                                    disabled={index === menus.length - 1}
                                                    className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-600 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                                                    title="ย้ายลง"
                                                >
                                                    <ChevronDown className="w-4 h-4" />
                                                </button>
                                                
                                                {/* Toggle Visibility - สลับแสดง/ซ่อน */}
                                                <button
                                                    onClick={() => handleToggleVisibility(menu.id)}
                                                    className={`p-1.5 rounded transition-colors ${
                                                        menu.visible
                                                            ? 'text-green-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30'
                                                            : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-600'
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
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 border-t border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 rounded-b-xl">
                        <div className="flex gap-2">
                            {isAdmin && (
                                <>
                                    <button
                                        onClick={handleReset}
                                        disabled={isSaving}
                                        className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg transition-colors disabled:opacity-50"
                                    >
                                        <RotateCcw className="w-4 h-4" />
                                        รีเซ็ต
                                    </button>
                                    <button
                                        onClick={handleCopySettings}
                                        disabled={isSaving}
                                        className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg transition-colors disabled:opacity-50"
                                        title={`คัดลอกไปยัง ${selectedRole === 'admin' ? 'Member' : 'Admin'}`}
                                    >
                                        <Copy className="w-4 h-4" />
                                        คัดลอกไป {selectedRole === 'admin' ? 'Member' : 'Admin'}
                                    </button>
                                </>
                            )}
                        </div>
                        
                        <div className="flex gap-2">
                            <button
                                onClick={onClose}
                                className="flex-1 sm:flex-none px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-600 border border-gray-300 dark:border-slate-500 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-500 transition-colors"
                            >
                                ยกเลิก
                            </button>
                            {isAdmin && (
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                </div>
            </div>
        </div>
    );
};

export default MenuSettingsModal;

