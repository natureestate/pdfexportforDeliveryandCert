/**
 * Tab Context
 * Context สำหรับจัดการสิทธิ์การเข้าถึง Tab Menu (ViewMode)
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useCompany } from './CompanyContext';
import { useAuth } from './AuthContext';
import { checkIsAdmin } from '../services/companyMembers';
import {
    getTabsForUser,
    getAllTabsForUser,
    getUserTabSettings,
    canAccessTab,
    getDefaultTabsForRole,
} from '../services/tabSettings';
import { TabConfig, TabType, UserRole, DEFAULT_TAB_CONFIG } from '../types';

interface TabContextType {
    visibleTabs: TabConfig[];           // Tab ที่แสดงสำหรับ user ปัจจุบัน
    allTabs: TabConfig[];               // Tab ทั้งหมด (รวมที่ซ่อน) - สำหรับตั้งค่า
    userRole: UserRole;                 // บทบาทของ user
    isAdmin: boolean;                   // เป็น Admin หรือไม่
    hasCustomTabSettings: boolean;      // มีการตั้งค่า Tab เฉพาะ user หรือไม่
    loading: boolean;                   // กำลังโหลดหรือไม่
    canAccess: (tabId: TabType) => boolean;  // ตรวจสอบสิทธิ์เข้าถึง Tab
    refreshTabs: () => Promise<void>;   // โหลด Tab ใหม่
}

const TabContext = createContext<TabContextType | undefined>(undefined);

interface TabProviderProps {
    children: ReactNode;
}

export const TabProvider: React.FC<TabProviderProps> = ({ children }) => {
    const { currentCompany } = useCompany();
    const { user } = useAuth();

    const [visibleTabs, setVisibleTabs] = useState<TabConfig[]>([...DEFAULT_TAB_CONFIG]);
    const [allTabs, setAllTabs] = useState<TabConfig[]>([...DEFAULT_TAB_CONFIG]);
    const [userRole, setUserRole] = useState<UserRole>('member');
    const [isAdmin, setIsAdmin] = useState(false);
    const [hasCustomTabSettings, setHasCustomTabSettings] = useState(false);
    const [loading, setLoading] = useState(true);

    /**
     * โหลดการตั้งค่า Tab (รองรับ user-specific settings)
     */
    const loadTabSettings = useCallback(async () => {
        if (!currentCompany?.id || !user?.uid) {
            setVisibleTabs([...DEFAULT_TAB_CONFIG]);
            setAllTabs([...DEFAULT_TAB_CONFIG]);
            setIsAdmin(false);
            setUserRole('member');
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
            const userSettings = await getUserTabSettings(currentCompany.id, user.uid);
            setHasCustomTabSettings(!!userSettings?.useCustomSettings);

            // โหลด Tab สำหรับ user นี้ (รวม user-specific settings)
            const [visible, all] = await Promise.all([
                getTabsForUser(currentCompany.id, user.uid, role),
                getAllTabsForUser(currentCompany.id, user.uid, role),
            ]);

            setVisibleTabs(visible);
            setAllTabs(all);
        } catch {
            // ใช้ค่า default ตาม role
            const defaultTabs = getDefaultTabsForRole(userRole);
            setVisibleTabs(defaultTabs);
            setAllTabs(getDefaultTabsForRole(userRole, true));
            setHasCustomTabSettings(false);
        } finally {
            setLoading(false);
        }
    }, [currentCompany?.id, user?.uid, userRole]);

    /**
     * โหลด Tab เมื่อ company หรือ user เปลี่ยน
     */
    useEffect(() => {
        loadTabSettings();
    }, [loadTabSettings]);

    /**
     * ตรวจสอบว่า user มีสิทธิ์เข้าถึง Tab หรือไม่
     */
    const canAccess = useCallback((tabId: TabType): boolean => {
        return visibleTabs.some(tab => tab.id === tabId && tab.visible);
    }, [visibleTabs]);

    /**
     * โหลด Tab ใหม่ (สำหรับเรียกจากภายนอก)
     */
    const refreshTabs = useCallback(async () => {
        await loadTabSettings();
    }, [loadTabSettings]);

    const value: TabContextType = {
        visibleTabs,
        allTabs,
        userRole,
        isAdmin,
        hasCustomTabSettings,
        loading,
        canAccess,
        refreshTabs,
    };

    return <TabContext.Provider value={value}>{children}</TabContext.Provider>;
};

/**
 * Hook สำหรับใช้งาน TabContext
 */
export const useTab = (): TabContextType => {
    const context = useContext(TabContext);
    if (context === undefined) {
        throw new Error('useTab must be used within a TabProvider');
    }
    return context;
};

