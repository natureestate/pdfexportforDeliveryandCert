/**
 * Goals Service
 * บริการจัดการเป้าหมายรายเดือน
 */

import { db, auth } from '../firebase.config';
import {
    collection,
    doc,
    getDocs,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    Timestamp,
} from 'firebase/firestore';

const GOALS_COLLECTION = 'monthlyGoals';

// Interface สำหรับเป้าหมายรายเดือน
export interface MonthlyGoal {
    id?: string;
    companyId: string;
    userId: string;
    year: number;
    month: number;          // 1-12
    monthKey: string;       // เช่น "2025-01"
    
    // เป้าหมาย
    documentGoal: number;   // จำนวนเอกสารที่ต้องการสร้าง
    revenueGoal: number;    // ยอดรายได้ที่ต้องการ
    
    // ความคืบหน้า (จะถูกคำนวณจาก dashboard stats)
    documentProgress?: number;
    revenueProgress?: number;
    
    // Metadata
    createdAt?: Date;
    updatedAt?: Date;
}

// Interface สำหรับ response
export interface GoalWithProgress extends MonthlyGoal {
    documentProgress: number;
    revenueProgress: number;
    documentPercent: number;
    revenuePercent: number;
    isDocumentGoalMet: boolean;
    isRevenueGoalMet: boolean;
}

/**
 * สร้าง monthKey จากปีและเดือน
 */
const createMonthKey = (year: number, month: number): string => {
    return `${year}-${String(month).padStart(2, '0')}`;
};

/**
 * ดึงเป้าหมายของเดือนปัจจุบัน
 */
export const getCurrentMonthGoal = async (companyId: string): Promise<MonthlyGoal | null> => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
        throw new Error('กรุณา Login ก่อน');
    }

    const now = new Date();
    const monthKey = createMonthKey(now.getFullYear(), now.getMonth() + 1);

    try {
        const q = query(
            collection(db, GOALS_COLLECTION),
            where('companyId', '==', companyId),
            where('userId', '==', currentUser.uid),
            where('monthKey', '==', monthKey)
        );

        const snapshot = await getDocs(q);
        if (snapshot.empty) {
            return null;
        }

        const doc = snapshot.docs[0];
        const data = doc.data();
        return {
            id: doc.id,
            companyId: data.companyId,
            userId: data.userId,
            year: data.year,
            month: data.month,
            monthKey: data.monthKey,
            documentGoal: data.documentGoal || 0,
            revenueGoal: data.revenueGoal || 0,
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate(),
        };
    } catch (error) {
        console.error('Error getting current month goal:', error);
        return null;
    }
};

/**
 * ดึงเป้าหมายทั้งหมดของปี
 */
export const getYearlyGoals = async (companyId: string, year: number): Promise<MonthlyGoal[]> => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
        throw new Error('กรุณา Login ก่อน');
    }

    try {
        const q = query(
            collection(db, GOALS_COLLECTION),
            where('companyId', '==', companyId),
            where('userId', '==', currentUser.uid),
            where('year', '==', year)
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                companyId: data.companyId,
                userId: data.userId,
                year: data.year,
                month: data.month,
                monthKey: data.monthKey,
                documentGoal: data.documentGoal || 0,
                revenueGoal: data.revenueGoal || 0,
                createdAt: data.createdAt?.toDate(),
                updatedAt: data.updatedAt?.toDate(),
            };
        }).sort((a, b) => a.month - b.month);
    } catch (error) {
        console.error('Error getting yearly goals:', error);
        return [];
    }
};

/**
 * บันทึกหรืออัปเดตเป้าหมาย
 */
export const saveGoal = async (
    companyId: string,
    year: number,
    month: number,
    documentGoal: number,
    revenueGoal: number
): Promise<string> => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
        throw new Error('กรุณา Login ก่อน');
    }

    const monthKey = createMonthKey(year, month);
    const docId = `goal_${companyId}_${currentUser.uid}_${monthKey}`;

    try {
        const docRef = doc(db, GOALS_COLLECTION, docId);
        await setDoc(docRef, {
            companyId,
            userId: currentUser.uid,
            year,
            month,
            monthKey,
            documentGoal,
            revenueGoal,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        }, { merge: true });

        console.log('✅ บันทึกเป้าหมายสำเร็จ:', docId);
        return docId;
    } catch (error) {
        console.error('❌ Error saving goal:', error);
        throw new Error('ไม่สามารถบันทึกเป้าหมายได้');
    }
};

/**
 * อัปเดตเป้าหมาย
 */
export const updateGoal = async (
    id: string,
    updates: Partial<Pick<MonthlyGoal, 'documentGoal' | 'revenueGoal'>>
): Promise<void> => {
    try {
        const docRef = doc(db, GOALS_COLLECTION, id);
        await updateDoc(docRef, {
            ...updates,
            updatedAt: Timestamp.now(),
        });

        console.log('✅ อัปเดตเป้าหมายสำเร็จ:', id);
    } catch (error) {
        console.error('❌ Error updating goal:', error);
        throw new Error('ไม่สามารถอัปเดตเป้าหมายได้');
    }
};

/**
 * ลบเป้าหมาย
 */
export const deleteGoal = async (id: string): Promise<void> => {
    try {
        const docRef = doc(db, GOALS_COLLECTION, id);
        await deleteDoc(docRef);

        console.log('✅ ลบเป้าหมายสำเร็จ:', id);
    } catch (error) {
        console.error('❌ Error deleting goal:', error);
        throw new Error('ไม่สามารถลบเป้าหมายได้');
    }
};

/**
 * คำนวณความคืบหน้าของเป้าหมาย
 */
export const calculateGoalProgress = (
    goal: MonthlyGoal,
    currentDocuments: number,
    currentRevenue: number
): GoalWithProgress => {
    const documentPercent = goal.documentGoal > 0 
        ? Math.min(100, Math.round((currentDocuments / goal.documentGoal) * 100))
        : 0;
    
    const revenuePercent = goal.revenueGoal > 0
        ? Math.min(100, Math.round((currentRevenue / goal.revenueGoal) * 100))
        : 0;

    return {
        ...goal,
        documentProgress: currentDocuments,
        revenueProgress: currentRevenue,
        documentPercent,
        revenuePercent,
        isDocumentGoalMet: currentDocuments >= goal.documentGoal,
        isRevenueGoalMet: currentRevenue >= goal.revenueGoal,
    };
};

