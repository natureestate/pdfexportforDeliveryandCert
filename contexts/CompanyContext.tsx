/**
 * Company Context
 * Context สำหรับจัดการบริษัทที่เลือกและข้อมูลบริษัททั้งหมด
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Company } from '../types';
import { getUserCompanies } from '../services/companies';
import { useAuth } from './AuthContext';
import { checkNeedMigration, migrateOldCompanies } from '../services/migration';

// Key สำหรับเก็บ last selected company ใน localStorage
const LAST_COMPANY_KEY = 'lastSelectedCompanyId';

interface CompanyContextType {
    // บริษัทที่เลือกปัจจุบัน
    currentCompany: Company | null;
    
    // รายการบริษัททั้งหมด
    companies: Company[];
    
    // กำลังโหลดข้อมูล
    loading: boolean;
    
    // ต้องไปหน้า Onboarding หรือไม่ (user login แต่ยังไม่มีองค์กร)
    needsOnboarding: boolean;
    
    // เลือกบริษัท
    selectCompany: (company: Company) => void;
    
    // รีเฟรชรายการบริษัท
    refreshCompanies: () => Promise<void>;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

interface CompanyProviderProps {
    children: ReactNode;
}

/**
 * บันทึก last selected company ID ลง localStorage
 */
const saveLastCompanyId = (companyId: string, userId: string) => {
    try {
        // เก็บแยกตาม userId เพื่อรองรับหลาย user ใน browser เดียวกัน
        const key = `${LAST_COMPANY_KEY}_${userId}`;
        localStorage.setItem(key, companyId);
    } catch {
        // ไม่ต้องทำอะไร - localStorage อาจไม่พร้อมใช้งาน
    }
};

/**
 * โหลด last selected company ID จาก localStorage
 */
const getLastCompanyId = (userId: string): string | null => {
    try {
        const key = `${LAST_COMPANY_KEY}_${userId}`;
        return localStorage.getItem(key);
    } catch {
        return null;
    }
};

export const CompanyProvider: React.FC<CompanyProviderProps> = ({ children }) => {
    const { user } = useAuth();
    const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);
    const [needsOnboarding, setNeedsOnboarding] = useState(false);

    /**
     * โหลดรายการบริษัททั้งหมด
     */
    const loadCompanies = async () => {
        if (!user) {
            setCurrentCompany(null);
            setCompanies([]);
            setNeedsOnboarding(false);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            
            // ตรวจสอบว่าต้อง Migrate หรือไม่ (wrap ใน try-catch แยก เพื่อไม่ให้ error migration หยุดการทำงาน)
            try {
                const needMigration = await checkNeedMigration();
                if (needMigration) {
                    try {
                        await migrateOldCompanies();
                    } catch {
                        // Migration ล้มเหลว - ไม่เป็นไร ดำเนินการต่อ
                    }
                }
            } catch {
                // User ใหม่อาจไม่มีสิทธิ์เข้าถึง collection เก่า - ไม่เป็นไร ข้ามไป
            }
            
            // ดึงรายการบริษัททั้งหมด
            const companiesList = await getUserCompanies();
            setCompanies(companiesList);

            // ตั้งค่าบริษัทเป็น current
            if (companiesList.length > 0) {
                // ถ้ามี currentCompany แล้ว ตรวจสอบว่ายังอยู่ใน list หรือไม่
                const existingCompany = currentCompany && companiesList.find(c => c.id === currentCompany.id);
                
                if (!currentCompany || !existingCompany) {
                    // ลองโหลด last selected company จาก localStorage
                    const lastCompanyId = getLastCompanyId(user.uid);
                    const lastCompany = lastCompanyId ? companiesList.find(c => c.id === lastCompanyId) : null;
                    
                    if (lastCompany) {
                        // ใช้ last selected company
                        setCurrentCompany(lastCompany);
                    } else {
                        // ใช้บริษัทแรก
                        setCurrentCompany(companiesList[0]);
                        // บันทึกลง localStorage
                        if (companiesList[0].id) {
                            saveLastCompanyId(companiesList[0].id, user.uid);
                        }
                    }
                } else {
                    // อัปเดต currentCompany ด้วยข้อมูลใหม่ (เช่น organizationLogoUrl ที่เพิ่งอัปเดต)
                    setCurrentCompany(existingCompany);
                }
                setNeedsOnboarding(false);
            } else {
                setCurrentCompany(null);
                setNeedsOnboarding(true); // User login แล้วแต่ยังไม่มีองค์กร
            }
        } catch {
            setCompanies([]);
            setCurrentCompany(null);
            // ถ้าโหลดบริษัทล้มเหลว ให้ไปหน้า onboarding เพื่อให้ user สร้างองค์กรใหม่
            setNeedsOnboarding(true);
        } finally {
            setLoading(false);
        }
    };

    /**
     * โหลดบริษัทเมื่อ user เปลี่ยน
     */
    useEffect(() => {
        loadCompanies();
    }, [user]);

    /**
     * เลือกบริษัท
     */
    const selectCompany = (company: Company) => {
        setCurrentCompany(company);
        
        // บันทึก last selected company ลง localStorage
        if (user && company.id) {
            saveLastCompanyId(company.id, user.uid);
        }
    };

    /**
     * รีเฟรชรายการบริษัท
     */
    const refreshCompanies = async () => {
        await loadCompanies();
    };

    const value: CompanyContextType = {
        currentCompany,
        companies,
        loading,
        needsOnboarding,
        selectCompany,
        refreshCompanies,
    };

    return (
        <CompanyContext.Provider value={value}>
            {children}
        </CompanyContext.Provider>
    );
};

/**
 * Hook สำหรับใช้ CompanyContext
 */
export const useCompany = (): CompanyContextType => {
    const context = useContext(CompanyContext);
    if (context === undefined) {
        throw new Error('useCompany must be used within a CompanyProvider');
    }
    return context;
};
