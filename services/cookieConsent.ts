/**
 * Cookie Consent Service
 * บริการจัดการ Cookie Consent และ PDPA Consent
 */

import { db } from '../firebase.config';
import {
    collection,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    Timestamp,
} from 'firebase/firestore';
import { auth } from '../firebase.config';

// Collection name
const USER_CONSENTS_COLLECTION = 'userConsents';

export interface UserConsent {
    userId: string;
    consentType: 'pdpa-cookie';
    status: 'accepted' | 'declined';
    consentDate: Date;
    ipAddress?: string;
    userAgent?: string;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * บันทึก Cookie Consent ใน Firestore
 * @param status - สถานะการยอมรับ ('accepted' | 'declined')
 * @param metadata - ข้อมูลเพิ่มเติม (IP, User Agent)
 */
export const saveCookieConsent = async (
    status: 'accepted' | 'declined',
    metadata?: { ipAddress?: string; userAgent?: string }
): Promise<void> => {
    try {
        const currentUser = auth.currentUser;
        
        // ถ้ายังไม่ login ให้เก็บแค่ใน localStorage
        if (!currentUser) {
            console.log('⚠️ User not logged in, saving consent to localStorage only');
            localStorage.setItem('pdpa-cookie-consent', status);
            localStorage.setItem('pdpa-cookie-consent-date', new Date().toISOString());
            return;
        }

        const userId = currentUser.uid;
        const consentDocRef = doc(db, USER_CONSENTS_COLLECTION, userId);

        // ตรวจสอบว่ามี consent อยู่แล้วหรือไม่
        const existingConsent = await getDoc(consentDocRef);

        const consentData: Omit<UserConsent, 'userId'> = {
            consentType: 'pdpa-cookie',
            status,
            consentDate: new Date(),
            ipAddress: metadata?.ipAddress,
            userAgent: metadata?.userAgent || navigator.userAgent,
            updatedAt: new Date(),
        };

        if (existingConsent.exists()) {
            // อัปเดต consent ที่มีอยู่
            await updateDoc(consentDocRef, {
                ...consentData,
                updatedAt: Timestamp.now(),
            });
            console.log('✅ Updated cookie consent in Firestore');
        } else {
            // สร้าง consent ใหม่
            await setDoc(consentDocRef, {
                userId,
                ...consentData,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            });
            console.log('✅ Saved cookie consent to Firestore');
        }

        // บันทึกใน localStorage ด้วย (สำหรับ offline access)
        localStorage.setItem('pdpa-cookie-consent', status);
        localStorage.setItem('pdpa-cookie-consent-date', new Date().toISOString());
    } catch (error) {
        console.error('❌ Error saving cookie consent:', error);
        // Fallback: บันทึกใน localStorage แม้ Firestore จะล้มเหลว
        localStorage.setItem('pdpa-cookie-consent', status);
        localStorage.setItem('pdpa-cookie-consent-date', new Date().toISOString());
        throw error;
    }
};

/**
 * ดึง Cookie Consent จาก Firestore
 * @param userId - User ID (optional, จะใช้ current user ถ้าไม่ระบุ)
 */
export const getCookieConsent = async (userId?: string): Promise<UserConsent | null> => {
    try {
        const currentUser = auth.currentUser;
        const targetUserId = userId || currentUser?.uid;

        if (!targetUserId) {
            // ถ้ายังไม่ login ให้อ่านจาก localStorage
            const consent = localStorage.getItem('pdpa-cookie-consent');
            if (consent) {
                return {
                    userId: 'anonymous',
                    consentType: 'pdpa-cookie',
                    status: consent as 'accepted' | 'declined',
                    consentDate: new Date(localStorage.getItem('pdpa-cookie-consent-date') || new Date().toISOString()),
                    createdAt: new Date(),
                    updatedAt: new Date(),
                };
            }
            return null;
        }

        const consentDocRef = doc(db, USER_CONSENTS_COLLECTION, targetUserId);
        const consentDoc = await getDoc(consentDocRef);

        if (consentDoc.exists()) {
            const data = consentDoc.data();
            return {
                userId: data.userId,
                consentType: data.consentType,
                status: data.status,
                consentDate: data.consentDate.toDate(),
                ipAddress: data.ipAddress,
                userAgent: data.userAgent,
                createdAt: data.createdAt.toDate(),
                updatedAt: data.updatedAt.toDate(),
            };
        }

        return null;
    } catch (error) {
        console.error('❌ Error getting cookie consent:', error);
        // Fallback: อ่านจาก localStorage
        const consent = localStorage.getItem('pdpa-cookie-consent');
        if (consent) {
            return {
                userId: 'anonymous',
                consentType: 'pdpa-cookie',
                status: consent as 'accepted' | 'declined',
                consentDate: new Date(localStorage.getItem('pdpa-cookie-consent-date') || new Date().toISOString()),
                createdAt: new Date(),
                updatedAt: new Date(),
            };
        }
        return null;
    }
};

/**
 * ตรวจสอบว่า user ยอมรับ cookie แล้วหรือยัง
 * @returns true ถ้ายอมรับ, false ถ้าไม่ยอมรับหรือยังไม่ยอมรับ
 */
export const hasAcceptedCookieConsent = async (): Promise<boolean> => {
    try {
        const consent = await getCookieConsent();
        return consent?.status === 'accepted';
    } catch (error) {
        console.error('❌ Error checking cookie consent:', error);
        // Fallback: ตรวจสอบจาก localStorage
        const consent = localStorage.getItem('pdpa-cookie-consent');
        return consent === 'accepted';
    }
};

/**
 * ลบ Cookie Consent (สำหรับการถอนความยินยอม)
 */
export const revokeCookieConsent = async (): Promise<void> => {
    try {
        const currentUser = auth.currentUser;
        
        if (currentUser) {
            const consentDocRef = doc(db, USER_CONSENTS_COLLECTION, currentUser.uid);
            await updateDoc(consentDocRef, {
                status: 'declined',
                updatedAt: Timestamp.now(),
            });
            console.log('✅ Revoked cookie consent in Firestore');
        }

        // ลบจาก localStorage
        localStorage.removeItem('pdpa-cookie-consent');
        localStorage.removeItem('pdpa-cookie-consent-date');
    } catch (error) {
        console.error('❌ Error revoking cookie consent:', error);
        // Fallback: ลบจาก localStorage
        localStorage.removeItem('pdpa-cookie-consent');
        localStorage.removeItem('pdpa-cookie-consent-date');
        throw error;
    }
};

