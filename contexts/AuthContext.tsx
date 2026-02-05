/**
 * Auth Context
 * Context สำหรับแชร์สถานะ Authentication ทั้งแอป
 * รองรับการ activate pending members เมื่อ user login (ทั้ง Email และ Phone)
 * รองรับการแนะนำ Account Linking เพื่อป้องกันการสร้าง user ซ้ำซ้อน
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { onAuthStateChanged, getLinkedProviders, signOut as authLogout } from '../services/auth';
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
    // ฟังก์ชันสำหรับ logout
    logout: () => Promise<void>;
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
                // อัปเดต linked providers
                const providers = getLinkedProviders();
                setLinkedProviders(providers);

                // ตรวจสอบและ activate pending memberships
                
                // 1. Activate ด้วย Email (ถ้ามี)
                if (currentUser.email) {
                    try {
                        await activatePendingMemberships(
                            currentUser.email,
                            currentUser.uid,
                            currentUser.displayName || undefined,
                            currentUser.phoneNumber || undefined
                        );
                    } catch {
                        // ไม่ต้องทำอะไร - อาจไม่มี pending memberships
                    }
                }
                
                // 2. Activate ด้วย Phone Number (ถ้ามี)
                if (currentUser.phoneNumber) {
                    try {
                        await activatePendingMembershipsByPhone(
                            currentUser.phoneNumber,
                            currentUser.uid,
                            currentUser.displayName || undefined,
                            currentUser.email || undefined
                        );
                    } catch {
                        // ไม่ต้องทำอะไร - อาจไม่มี pending memberships
                    }
                }

                // 3. ตรวจสอบว่ามี pending memberships ที่ยังไม่ได้ activate หรือไม่
                // (กรณีที่ user ยังไม่ได้ link account)
                try {
                    const pendingMemberships = await findPendingMemberships(
                        currentUser.email || undefined,
                        currentUser.phoneNumber || undefined
                    );
                    setPendingMembershipsCount(pendingMemberships.length);
                } catch {
                    // ไม่สามารถตรวจสอบ pending memberships
                }
                
            } else {
                setLinkedProviders([]);
                setPendingMembershipsCount(0);
            }
        });

        // Cleanup subscription เมื่อ component unmount
        return () => unsubscribe();
    }, []);

    /**
     * Logout function
     * ออกจากระบบและล้างข้อมูล
     */
    const logout = async () => {
        try {
            await authLogout();
            // State จะถูก reset อัตโนมัติผ่าน onAuthStateChanged
        } catch (error) {
            throw error;
        }
    };

    const value: AuthContextType = {
        user,
        loading,
        isAuthenticated: user !== null,
        linkedProviders,
        hasMultipleProviders: linkedProviders.length > 1,
        pendingMembershipsCount,
        refreshLinkedProviders,
        logout,
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
