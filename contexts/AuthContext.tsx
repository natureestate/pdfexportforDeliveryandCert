/**
 * Auth Context
 * Context สำหรับแชร์สถานะ Authentication ทั้งแอป
 * รองรับการ activate pending members เมื่อ user login (ทั้ง Email และ Phone)
 * รองรับการแนะนำ Account Linking เพื่อป้องกันการสร้าง user ซ้ำซ้อน
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { onAuthStateChanged, getLinkedProviders } from '../services/auth';
import { 
    activatePendingMemberships, 
    activatePendingMembershipsByPhone,
    findPendingMemberships
} from '../services/companyMembers';
import { CompanyMember } from '../types';

// Interface สำหรับ Auth Context
interface AuthContextType {
    user: User | null;
    loading: boolean;
    isAuthenticated: boolean;
    // ข้อมูลสำหรับ Account Linking
    linkedProviders: string[];
    hasMultipleProviders: boolean;
    pendingMembershipsCount: number;
    // ฟังก์ชันสำหรับ refresh providers
    refreshLinkedProviders: () => void;
}

// สร้าง Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Props สำหรับ Provider
interface AuthProviderProps {
    children: ReactNode;
}

/**
 * Auth Provider Component
 * Wrap แอปด้วย component นี้เพื่อให้ทุก component เข้าถึง auth state ได้
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [linkedProviders, setLinkedProviders] = useState<string[]>([]);
    const [pendingMembershipsCount, setPendingMembershipsCount] = useState<number>(0);

    /**
     * Refresh linked providers
     */
    const refreshLinkedProviders = () => {
        const providers = getLinkedProviders();
        setLinkedProviders(providers);
    };

    useEffect(() => {
        // ติดตามสถานะการ Login
        const unsubscribe = onAuthStateChanged(async (currentUser) => {
            setUser(currentUser);
            setLoading(false);
            
            if (currentUser) {
                console.log('👤 ผู้ใช้ Login:', {
                    name: currentUser.displayName,
                    email: currentUser.email,
                    phoneNumber: currentUser.phoneNumber,
                    uid: currentUser.uid,
                    providers: currentUser.providerData.map(p => p.providerId),
                });

                // อัปเดต linked providers
                const providers = getLinkedProviders();
                setLinkedProviders(providers);

                // ตรวจสอบและ activate pending memberships
                let totalActivated = 0;
                
                // 1. Activate ด้วย Email (ถ้ามี)
                if (currentUser.email) {
                    try {
                        const activatedByEmail = await activatePendingMemberships(
                            currentUser.email,
                            currentUser.uid,
                            currentUser.displayName || undefined,
                            currentUser.phoneNumber || undefined
                        );
                        totalActivated += activatedByEmail;
                        console.log(`✅ Activated ${activatedByEmail} memberships by email`);
                    } catch (error) {
                        console.error('❌ ไม่สามารถ activate pending memberships by email:', error);
                    }
                }
                
                // 2. Activate ด้วย Phone Number (ถ้ามี)
                if (currentUser.phoneNumber) {
                    try {
                        const activatedByPhone = await activatePendingMembershipsByPhone(
                            currentUser.phoneNumber,
                            currentUser.uid,
                            currentUser.displayName || undefined,
                            currentUser.email || undefined
                        );
                        totalActivated += activatedByPhone;
                        console.log(`✅ Activated ${activatedByPhone} memberships by phone`);
                    } catch (error) {
                        console.error('❌ ไม่สามารถ activate pending memberships by phone:', error);
                    }
                }

                if (totalActivated > 0) {
                    console.log(`🎉 รวม activated ${totalActivated} memberships`);
                }

                // 3. ตรวจสอบว่ามี pending memberships ที่ยังไม่ได้ activate หรือไม่
                // (กรณีที่ user ยังไม่ได้ link account)
                try {
                    const pendingMemberships = await findPendingMemberships(
                        currentUser.email || undefined,
                        currentUser.phoneNumber || undefined
                    );
                    setPendingMembershipsCount(pendingMemberships.length);
                    
                    if (pendingMemberships.length > 0) {
                        console.log(`⚠️ พบ ${pendingMemberships.length} pending memberships ที่ยังไม่ได้ activate`);
                        console.log('💡 อาจต้อง Link Account เพื่อเข้าถึงองค์กรเหล่านี้');
                    }
                } catch (error) {
                    console.error('❌ ไม่สามารถตรวจสอบ pending memberships:', error);
                }
                
            } else {
                console.log('👤 ไม่มีผู้ใช้ Login');
                setLinkedProviders([]);
                setPendingMembershipsCount(0);
            }
        });

        // Cleanup subscription เมื่อ component unmount
        return () => unsubscribe();
    }, []);

    const value: AuthContextType = {
        user,
        loading,
        isAuthenticated: user !== null,
        linkedProviders,
        hasMultipleProviders: linkedProviders.length > 1,
        pendingMembershipsCount,
        refreshLinkedProviders,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

/**
 * Custom Hook สำหรับใช้ Auth Context
 * @returns AuthContextType
 * @throws Error ถ้าใช้นอก AuthProvider
 */
export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    
    if (context === undefined) {
        throw new Error('useAuth ต้องใช้ภายใน AuthProvider');
    }
    
    return context;
};
