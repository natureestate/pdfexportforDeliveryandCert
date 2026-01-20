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
        console.log('💾 [CompanyContext] บันทึก last company:', companyId);
    } catch (error) {
        console.error('❌ [CompanyContext] ไม่สามารถบันทึก last company:', error);
    }
};

/**
 * โหลด last selected company ID จาก localStorage
 */
const getLastCompanyId = (userId: string): string | null => {
    try {
        const key = `${LAST_COMPANY_KEY}_${userId}`;
        const companyId = localStorage.getItem(key);
        console.log('📂 [CompanyContext] โหลด last company:', companyId);
        return companyId;
    } catch (error) {
        console.error('❌ [CompanyContext] ไม่สามารถโหลด last company:', error);
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
        console.log('🔄 [CompanyContext] เริ่มโหลดบริษัท, User:', user?.email);
        
        if (!user) {
            console.log('⚠️ [CompanyContext] ไม่มี User, ล้างข้อมูล');
            setCurrentCompany(null);
            setCompanies([]);
            setNeedsOnboarding(false);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            console.log('⏳ [CompanyContext] กำลังโหลด...');
            
            // ตรวจสอบว่าต้อง Migrate หรือไม่ (wrap ใน try-catch แยก เพื่อไม่ให้ error migration หยุดการทำงาน)
            try {
                const needMigration = await checkNeedMigration();
                if (needMigration) {
                    console.log('🔄 พบองค์กรเก่าที่ต้อง Migrate...');
                    try {
                        await migrateOldCompanies();
                        console.log('✅ Migration สำเร็จ');
                    } catch (migrationError) {
                        console.error('❌ Migration ล้มเหลว:', migrationError);
                    }
                }
            } catch (checkMigrationError) {
                // User ใหม่อาจไม่มีสิทธิ์เข้าถึง collection เก่า - ไม่เป็นไร ข้ามไป
                console.log('ℹ️ [CompanyContext] ข้าม Migration check (user ใหม่หรือไม่มีสิทธิ์)');
            }
            
            // ดึงรายการบริษัททั้งหมด
            const companiesList = await getUserCompanies();
            console.log('📋 [CompanyContext] ดึงบริษัทได้:', companiesList.length, 'องค์กร', companiesList);
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
                        console.log('✅ [CompanyContext] ใช้ last selected company:', lastCompany.name);
                    } else {
                        // ใช้บริษัทแรก
                        setCurrentCompany(companiesList[0]);
                        // บันทึกลง localStorage
                        if (companiesList[0].id) {
                            saveLastCompanyId(companiesList[0].id, user.uid);
                        }
                        console.log('✅ [CompanyContext] เลือกบริษัทแรก:', companiesList[0].name);
                    }
                } else {
                    // อัปเดต currentCompany ด้วยข้อมูลใหม่ (เช่น organizationLogoUrl ที่เพิ่งอัปเดต)
                    setCurrentCompany(existingCompany);
                    console.log('🔄 [CompanyContext] อัปเดตบริษัทปัจจุบัน:', existingCompany.name, 'orgLogo:', existingCompany.organizationLogoUrl);
                }
                setNeedsOnboarding(false);
                console.log('✅ [CompanyContext] needsOnboarding = false (มีบริษัท)');
            } else {
                console.log('⚠️ [CompanyContext] ไม่มีบริษัทเลย - ต้องไปหน้า Onboarding');
                setCurrentCompany(null);
                setNeedsOnboarding(true); // User login แล้วแต่ยังไม่มีองค์กร
                console.log('🚀 [CompanyContext] needsOnboarding = true (ไม่มีบริษัท)');
            }
        } catch (error) {
            console.error('❌ [CompanyContext] โหลดบริษัทล้มเหลว:', error);
            setCompanies([]);
            setCurrentCompany(null);
            // ถ้าโหลดบริษัทล้มเหลว ให้ไปหน้า onboarding เพื่อให้ user สร้างองค์กรใหม่
            setNeedsOnboarding(true);
            console.log('🚀 [CompanyContext] needsOnboarding = true (เกิด error)');
        } finally {
            setLoading(false);
            console.log('✅ [CompanyContext] โหลดเสร็จสิ้น');
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
        
        console.log('📌 เลือกบริษัท:', company.name);
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
