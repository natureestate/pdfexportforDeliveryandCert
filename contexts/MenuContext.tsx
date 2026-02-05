/**
 * Menu Context
 * Context สำหรับจัดการการตั้งค่าเมนูของบริษัท
 * - โหลดการตั้งค่าเมนูตาม role ของ user
 * - แชร์ข้อมูลเมนูให้ทุก component
 */

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { MenuItemConfig, DEFAULT_MENU_CONFIG, UserRole } from '../types';
import { getMenusForUser, getAllMenusForUser, getUserMenuSettings } from '../services/menuSettings';
import { checkIsAdmin } from '../services/companyMembers';
import { useCompany } from './CompanyContext';
import { useAuth } from './AuthContext';

interface MenuContextType {
    // เมนูที่แสดงสำหรับ user ปัจจุบัน (filtered และ sorted)
    visibleMenus: MenuItemConfig[];
    
    // เมนูทั้งหมด (รวมที่ซ่อน) - สำหรับหน้าตั้งค่า
    allMenus: MenuItemConfig[];
    
    // Role ของ user ปัจจุบัน
    userRole: UserRole;
    
    // ผู้ใช้เป็น Admin หรือไม่
    isAdmin: boolean;
    
    // ผู้ใช้มีการตั้งค่าเมนูเฉพาะหรือไม่
    hasCustomMenuSettings: boolean;
    
    // กำลังโหลดข้อมูล
    loading: boolean;
    
    // รีเฟรชการตั้งค่าเมนู
    refreshMenus: () => Promise<void>;
}

const MenuContext = createContext<MenuContextType | undefined>(undefined);

interface MenuProviderProps {
    children: ReactNode;
}

export const MenuProvider: React.FC<MenuProviderProps> = ({ children }) => {
    const { currentCompany } = useCompany();
    const { user } = useAuth();
    
    const [visibleMenus, setVisibleMenus] = useState<MenuItemConfig[]>([...DEFAULT_MENU_CONFIG]);
    const [allMenus, setAllMenus] = useState<MenuItemConfig[]>([...DEFAULT_MENU_CONFIG]);
    const [userRole, setUserRole] = useState<UserRole>('member');
    const [isAdmin, setIsAdmin] = useState(false);
    const [hasCustomMenuSettings, setHasCustomMenuSettings] = useState(false);
    const [loading, setLoading] = useState(true);

    /**
     * โหลดการตั้งค่าเมนู (รองรับ user-specific settings)
     */
    const loadMenuSettings = useCallback(async () => {
        if (!currentCompany?.id || !user?.uid) {
            setVisibleMenus([...DEFAULT_MENU_CONFIG]);
            setAllMenus([...DEFAULT_MENU_CONFIG]);
            setIsAdmin(false);
            setUserRole('member');
            setHasCustomMenuSettings(false);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);

            // ตรวจสอบว่า user เป็น Admin หรือไม่
            const adminStatus = await checkIsAdmin(currentCompany.id, user.uid);
            setIsAdmin(adminStatus);
            
            const role: UserRole = adminStatus ? 'admin' : 'member';
            setUserRole(role);

            // ตรวจสอบว่ามีการตั้งค่าเฉพาะ user หรือไม่
            const userSettings = await getUserMenuSettings(currentCompany.id, user.uid);
            setHasCustomMenuSettings(!!userSettings?.useCustomSettings);

            // โหลดเมนูสำหรับ user นี้ (รวม user-specific settings)
            const [visible, all] = await Promise.all([
                getMenusForUser(currentCompany.id, user.uid, role),
                getAllMenusForUser(currentCompany.id, user.uid, role),
            ]);

            setVisibleMenus(visible);
            setAllMenus(all);
        } catch {
            setVisibleMenus([...DEFAULT_MENU_CONFIG]);
            setAllMenus([...DEFAULT_MENU_CONFIG]);
            setHasCustomMenuSettings(false);
        } finally {
            setLoading(false);
        }
    }, [currentCompany?.id, user?.uid]);

    /**
     * โหลดเมนูเมื่อ company หรือ user เปลี่ยน
     */
    useEffect(() => {
        loadMenuSettings();
    }, [loadMenuSettings]);

    /**
     * รีเฟรชการตั้งค่าเมนู
     */
    const refreshMenus = async () => {
        await loadMenuSettings();
    };

    const value: MenuContextType = {
        visibleMenus,
        allMenus,
        userRole,
        isAdmin,
        hasCustomMenuSettings,
        loading,
        refreshMenus,
    };

    return (
        <MenuContext.Provider value={value}>
            {children}
        </MenuContext.Provider>
    );
};

/**
 * Hook สำหรับใช้ MenuContext
 */
export const useMenu = (): MenuContextType => {
    const context = useContext(MenuContext);
    if (context === undefined) {
        throw new Error('useMenu must be used within a MenuProvider');
    }
    return context;
};

