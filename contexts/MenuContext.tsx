/**
 * Menu Context
 * Context สำหรับจัดการการตั้งค่าเมนูของบริษัท
 * - โหลดการตั้งค่าเมนูตาม role ของ user
 * - แชร์ข้อมูลเมนูให้ทุก component
 */

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { MenuItemConfig, DEFAULT_MENU_CONFIG, UserRole } from '../types';
import { getMenusForRole, getAllMenusForRole } from '../services/menuSettings';
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
    const [loading, setLoading] = useState(true);

    /**
     * โหลดการตั้งค่าเมนู
     */
    const loadMenuSettings = useCallback(async () => {
        if (!currentCompany?.id || !user?.uid) {
            console.log('⚠️ [MenuContext] ไม่มี company หรือ user');
            setVisibleMenus([...DEFAULT_MENU_CONFIG]);
            setAllMenus([...DEFAULT_MENU_CONFIG]);
            setIsAdmin(false);
            setUserRole('member');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            console.log('🔄 [MenuContext] กำลังโหลดการตั้งค่าเมนู...');

            // ตรวจสอบว่า user เป็น Admin หรือไม่
            const adminStatus = await checkIsAdmin(currentCompany.id, user.uid);
            setIsAdmin(adminStatus);
            
            const role: UserRole = adminStatus ? 'admin' : 'member';
            setUserRole(role);
            
            console.log('👤 [MenuContext] User role:', role);

            // โหลดเมนูสำหรับ role นี้
            const [visible, all] = await Promise.all([
                getMenusForRole(currentCompany.id, role),
                getAllMenusForRole(currentCompany.id, role),
            ]);

            setVisibleMenus(visible);
            setAllMenus(all);
            
            console.log('✅ [MenuContext] โหลดเมนูสำเร็จ:', visible.length, 'เมนูที่แสดง');
        } catch (error) {
            console.error('❌ [MenuContext] โหลดการตั้งค่าเมนูล้มเหลว:', error);
            setVisibleMenus([...DEFAULT_MENU_CONFIG]);
            setAllMenus([...DEFAULT_MENU_CONFIG]);
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

