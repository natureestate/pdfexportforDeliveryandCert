/**
 * Authentication Service
 * บริการจัดการ Firebase Authentication
 * - Google OAuth
 * - Phone Authentication
 * - Email/Password
 * - Passwordless Email Link
 */

import { auth } from '../firebase.config';
import {
    signInWithPopup,
    GoogleAuthProvider,
    signOut as firebaseSignOut,
    onAuthStateChanged as firebaseOnAuthStateChanged,
    User,
    RecaptchaVerifier,
    signInWithPhoneNumber,
    ConfirmationResult,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendSignInLinkToEmail,
    isSignInWithEmailLink,
    signInWithEmailLink,
    ActionCodeSettings,
    fetchSignInMethodsForEmail,
    linkWithPopup,
    linkWithCredential,
    EmailAuthProvider,
    PhoneAuthProvider,
    sendPasswordResetEmail,
    updatePassword,
    reauthenticateWithCredential,
} from 'firebase/auth';

// สร้าง Google Provider
const googleProvider = new GoogleAuthProvider();

// กำหนด scopes ที่ต้องการ (optional)
googleProvider.addScope('profile');
googleProvider.addScope('email');

/**
 * Login ด้วย Google OAuth
 * @returns Promise<User> - ข้อมูลผู้ใช้ที่ login สำเร็จ
 */
export const signInWithGoogle = async (): Promise<User> => {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        
        // ดึงข้อมูลผู้ใช้
        const user = result.user;
        
        // ดึง Google Access Token (ถ้าต้องการใช้งาน Google APIs)
        const credential = GoogleAuthProvider.credentialFromResult(result);
        const token = credential?.accessToken;
        
        console.log('✅ Login สำเร็จ:', {
            name: user.displayName,
            email: user.email,
            uid: user.uid,
        });
        
        return user;
    } catch (error: any) {
        console.error('❌ Login ล้มเหลว:', error);
        
        // จัดการ error codes ต่างๆ
        const errorCode = error.code;
        const errorMessage = error.message;
        
        // แปล error message เป็นภาษาไทย
        let thaiErrorMessage = 'เกิดข้อผิดพลาดในการ Login';
        
        switch (errorCode) {
            case 'auth/popup-closed-by-user':
                thaiErrorMessage = 'คุณปิดหน้าต่าง Login';
                break;
            case 'auth/cancelled-popup-request':
                thaiErrorMessage = 'มีการร้องขอ Login อื่นอยู่แล้ว';
                break;
            case 'auth/popup-blocked':
                thaiErrorMessage = 'เบราว์เซอร์บล็อก popup กรุณาอนุญาต popup';
                break;
            case 'auth/network-request-failed':
                thaiErrorMessage = 'ไม่สามารถเชื่อมต่ออินเทอร์เน็ตได้';
                break;
            case 'auth/too-many-requests':
                thaiErrorMessage = 'มีการพยายาม Login มากเกินไป กรุณารอสักครู่';
                break;
            default:
                thaiErrorMessage = errorMessage || 'เกิดข้อผิดพลาดในการ Login';
        }
        
        throw new Error(thaiErrorMessage);
    }
};

/**
 * Logout
 */
export const signOut = async (): Promise<void> => {
    try {
        await firebaseSignOut(auth);
        console.log('✅ Logout สำเร็จ');
    } catch (error) {
        console.error('❌ Logout ล้มเหลว:', error);
        throw new Error('ไม่สามารถ Logout ได้');
    }
};

/**
 * ติดตามสถานะการ Login
 * @param callback - ฟังก์ชันที่จะถูกเรียกเมื่อสถานะเปลี่ยน
 * @returns unsubscribe function
 */
export const onAuthStateChanged = (callback: (user: User | null) => void) => {
    return firebaseOnAuthStateChanged(auth, callback);
};

/**
 * ดึงข้อมูลผู้ใช้ปัจจุบัน
 * @returns User | null
 */
export const getCurrentUser = (): User | null => {
    return auth.currentUser;
};

/**
 * ตรวจสอบว่า user login แล้วหรือยัง
 * @returns boolean
 */
export const isAuthenticated = (): boolean => {
    return auth.currentUser !== null;
};

// ==================== Phone Authentication ====================

/**
 * สร้าง RecaptchaVerifier สำหรับ Phone Authentication
 * @param elementId - ID ของ element ที่จะแสดง reCAPTCHA (ใช้ invisible mode)
 * @returns RecaptchaVerifier instance
 */
export const createRecaptchaVerifier = (elementId: string): RecaptchaVerifier => {
    // ตรวจสอบว่าเป็น localhost หรือไม่
    const isLocalhost = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1';
    
    if (isLocalhost) {
        console.log('🔧 Development Mode: ใช้ reCAPTCHA แบบ visible สำหรับ localhost');
        // ใช้ visible mode สำหรับ localhost เพื่อให้ทดสอบได้ง่าย
        return new RecaptchaVerifier(auth, elementId, {
            size: 'normal', // เปลี่ยนเป็น normal เพื่อให้เห็น checkbox
            callback: () => {
                console.log('✅ reCAPTCHA resolved สำหรับ Phone Auth (localhost)');
            },
            'expired-callback': () => {
                console.warn('⚠️ reCAPTCHA หมดอายุ');
            }
        });
    }
    
    // Production: ใช้ invisible mode
    return new RecaptchaVerifier(auth, elementId, {
        size: 'invisible',
        callback: () => {
            console.log('✅ reCAPTCHA resolved สำหรับ Phone Auth');
        },
        'expired-callback': () => {
            console.warn('⚠️ reCAPTCHA หมดอายุ');
        }
    });
};

/**
 * ส่ง OTP ไปยังเบอร์โทรศัพท์
 * @param phoneNumber - เบอร์โทรศัพท์ในรูปแบบ +66XXXXXXXXX
 * @param recaptchaVerifier - RecaptchaVerifier instance
 * @returns Promise<ConfirmationResult> - ใช้สำหรับยืนยัน OTP
 */
export const sendPhoneOTP = async (
    phoneNumber: string,
    recaptchaVerifier: RecaptchaVerifier
): Promise<ConfirmationResult> => {
    try {
        console.log('📱 กำลังส่ง OTP ไปยัง:', phoneNumber);
        
        const confirmationResult = await signInWithPhoneNumber(
            auth,
            phoneNumber,
            recaptchaVerifier
        );
        
        console.log('✅ ส่ง OTP สำเร็จ');
        return confirmationResult;
    } catch (error: any) {
        console.error('❌ ส่ง OTP ล้มเหลว:', error);
        
        // แปล error message เป็นภาษาไทย
        const errorCode = error.code;
        let thaiErrorMessage = 'ไม่สามารถส่ง OTP ได้';
        
        switch (errorCode) {
            case 'auth/invalid-phone-number':
                thaiErrorMessage = 'รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง';
                break;
            case 'auth/missing-phone-number':
                thaiErrorMessage = 'กรุณากรอกเบอร์โทรศัพท์';
                break;
            case 'auth/quota-exceeded':
                thaiErrorMessage = 'ส่ง SMS เกินโควต้า กรุณาลองใหม่ภายหลัง';
                break;
            case 'auth/user-disabled':
                thaiErrorMessage = 'บัญชีนี้ถูกระงับการใช้งาน';
                break;
            case 'auth/operation-not-allowed':
                thaiErrorMessage = 'ระบบยังไม่เปิดใช้งาน Phone Authentication';
                break;
            case 'auth/too-many-requests':
                thaiErrorMessage = 'มีการส่ง OTP มากเกินไป กรุณารอสักครู่';
                break;
            case 'auth/captcha-check-failed':
                thaiErrorMessage = 'การตรวจสอบ reCAPTCHA ล้มเหลว กรุณาลองใหม่';
                break;
            default:
                thaiErrorMessage = error.message || 'ไม่สามารถส่ง OTP ได้';
        }
        
        throw new Error(thaiErrorMessage);
    }
};

/**
 * ยืนยัน OTP และ Login
 * @param confirmationResult - ผลจากการส่ง OTP
 * @param otp - รหัส OTP 6 หลัก
 * @returns Promise<User> - ข้อมูลผู้ใช้ที่ login สำเร็จ
 */
export const verifyPhoneOTP = async (
    confirmationResult: ConfirmationResult,
    otp: string
): Promise<User> => {
    try {
        console.log('🔐 กำลังยืนยัน OTP...');
        
        const result = await confirmationResult.confirm(otp);
        const user = result.user;
        
        console.log('✅ Login ด้วยเบอร์โทรศัพท์สำเร็จ:', {
            phoneNumber: user.phoneNumber,
            uid: user.uid,
        });
        
        return user;
    } catch (error: any) {
        console.error('❌ ยืนยัน OTP ล้มเหลว:', error);
        
        // แปล error message เป็นภาษาไทย
        const errorCode = error.code;
        let thaiErrorMessage = 'ไม่สามารถยืนยัน OTP ได้';
        
        switch (errorCode) {
            case 'auth/invalid-verification-code':
                thaiErrorMessage = 'รหัส OTP ไม่ถูกต้อง';
                break;
            case 'auth/code-expired':
                thaiErrorMessage = 'รหัส OTP หมดอายุแล้ว กรุณาขอรหัสใหม่';
                break;
            case 'auth/missing-verification-code':
                thaiErrorMessage = 'กรุณากรอกรหัส OTP';
                break;
            case 'auth/session-expired':
                thaiErrorMessage = 'Session หมดอายุ กรุณาขอรหัส OTP ใหม่';
                break;
            default:
                thaiErrorMessage = error.message || 'ไม่สามารถยืนยัน OTP ได้';
        }
        
        throw new Error(thaiErrorMessage);
    }
};

// ==================== Email/Password Authentication ====================

/**
 * สมัครสมาชิกด้วย Email และ Password
 * @param email - อีเมล
 * @param password - รหัสผ่าน (ต้องมีอย่างน้อย 6 ตัวอักษร)
 * @returns Promise<User> - ข้อมูลผู้ใช้ที่สร้างสำเร็จ
 */
export const signUpWithEmailPassword = async (
    email: string,
    password: string
): Promise<User> => {
    try {
        console.log('📝 กำลังสมัครสมาชิกด้วย Email:', email);
        
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        console.log('✅ สมัครสมาชิกสำเร็จ:', {
            email: user.email,
            uid: user.uid,
        });
        
        return user;
    } catch (error: any) {
        console.error('❌ สมัครสมาชิกล้มเหลว:', error);
        
        const errorCode = error.code;
        let thaiErrorMessage = 'ไม่สามารถสมัครสมาชิกได้';
        
        switch (errorCode) {
            case 'auth/email-already-in-use':
                thaiErrorMessage = 'อีเมลนี้ถูกใช้งานแล้ว';
                break;
            case 'auth/invalid-email':
                thaiErrorMessage = 'รูปแบบอีเมลไม่ถูกต้อง';
                break;
            case 'auth/weak-password':
                thaiErrorMessage = 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร';
                break;
            case 'auth/operation-not-allowed':
                thaiErrorMessage = 'ระบบยังไม่เปิดใช้งาน Email/Password Authentication';
                break;
            default:
                thaiErrorMessage = error.message || 'ไม่สามารถสมัครสมาชิกได้';
        }
        
        throw new Error(thaiErrorMessage);
    }
};

/**
 * Login ด้วย Email และ Password
 * @param email - อีเมล
 * @param password - รหัสผ่าน
 * @returns Promise<User> - ข้อมูลผู้ใช้ที่ login สำเร็จ
 */
export const signInWithEmailPassword = async (
    email: string,
    password: string
): Promise<User> => {
    try {
        console.log('🔐 กำลัง Login ด้วย Email:', email);
        
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        console.log('✅ Login สำเร็จ:', {
            email: user.email,
            uid: user.uid,
        });
        
        return user;
    } catch (error: any) {
        console.error('❌ Login ล้มเหลว:', error);
        
        const errorCode = error.code;
        let thaiErrorMessage = 'ไม่สามารถ Login ได้';
        
        switch (errorCode) {
            case 'auth/user-not-found':
                thaiErrorMessage = 'ไม่พบผู้ใช้นี้ในระบบ';
                break;
            case 'auth/wrong-password':
                thaiErrorMessage = 'รหัสผ่านไม่ถูกต้อง';
                break;
            case 'auth/invalid-email':
                thaiErrorMessage = 'รูปแบบอีเมลไม่ถูกต้อง';
                break;
            case 'auth/user-disabled':
                thaiErrorMessage = 'บัญชีนี้ถูกระงับการใช้งาน';
                break;
            case 'auth/too-many-requests':
                thaiErrorMessage = 'มีการพยายาม Login มากเกินไป กรุณารอสักครู่';
                break;
            case 'auth/invalid-credential':
                thaiErrorMessage = 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
                break;
            default:
                thaiErrorMessage = error.message || 'ไม่สามารถ Login ได้';
        }
        
        throw new Error(thaiErrorMessage);
    }
};

// ==================== Passwordless Email Link Authentication ====================

/**
 * ส่ง Email Link สำหรับ Passwordless Login
 * @param email - อีเมลที่ต้องการส่ง link
 * @returns Promise<void>
 */
export const sendEmailLoginLink = async (email: string): Promise<void> => {
    try {
        console.log('📧 กำลังส่ง Email Link ไปยัง:', email);
        
        // กำหนดค่า ActionCodeSettings
        const actionCodeSettings: ActionCodeSettings = {
            // URL ที่จะ redirect กลับมาหลังจากคลิก link
            url: window.location.origin + '/login',
            // ต้องเป็น true สำหรับ email link
            handleCodeInApp: true,
        };
        
        await sendSignInLinkToEmail(auth, email, actionCodeSettings);
        
        // บันทึก email ไว้ใน localStorage เพื่อใช้ตอนยืนยัน
        window.localStorage.setItem('emailForSignIn', email);
        
        console.log('✅ ส่ง Email Link สำเร็จ');
    } catch (error: any) {
        console.error('❌ ส่ง Email Link ล้มเหลว:', error);
        
        const errorCode = error.code;
        let thaiErrorMessage = 'ไม่สามารถส่ง Email Link ได้';
        
        switch (errorCode) {
            case 'auth/invalid-email':
                thaiErrorMessage = 'รูปแบบอีเมลไม่ถูกต้อง';
                break;
            case 'auth/missing-email':
                thaiErrorMessage = 'กรุณากรอกอีเมล';
                break;
            case 'auth/quota-exceeded':
                thaiErrorMessage = 'ส่ง Email เกินโควต้า กรุณาลองใหม่ภายหลัง';
                break;
            case 'auth/too-many-requests':
                thaiErrorMessage = 'มีการส่ง Email มากเกินไป กรุณารอสักครู่';
                break;
            default:
                thaiErrorMessage = error.message || 'ไม่สามารถส่ง Email Link ได้';
        }
        
        throw new Error(thaiErrorMessage);
    }
};

/**
 * ตรวจสอบว่า URL ปัจจุบันเป็น Email Link หรือไม่
 * @returns boolean
 */
export const checkIsEmailLink = (): boolean => {
    return isSignInWithEmailLink(auth, window.location.href);
};

/**
 * Login ด้วย Email Link (เรียกใช้หลังจากคลิก link ใน email)
 * @param email - อีเมล (ถ้าไม่ระบุจะดึงจาก localStorage)
 * @returns Promise<User> - ข้อมูลผู้ใช้ที่ login สำเร็จ
 */
export const signInWithEmailLinkAuth = async (email?: string): Promise<User> => {
    try {
        // ดึง email จาก localStorage ถ้าไม่ได้ส่งมา
        let userEmail = email;
        if (!userEmail) {
            userEmail = window.localStorage.getItem('emailForSignIn');
        }
        
        if (!userEmail) {
            throw new Error('ไม่พบอีเมล กรุณากรอกอีเมลที่ใช้ส่ง link');
        }
        
        console.log('🔗 กำลัง Login ด้วย Email Link:', userEmail);
        
        const result = await signInWithEmailLink(auth, userEmail, window.location.href);
        const user = result.user;
        
        // ลบ email ออกจาก localStorage
        window.localStorage.removeItem('emailForSignIn');
        
        console.log('✅ Login ด้วย Email Link สำเร็จ:', {
            email: user.email,
            uid: user.uid,
        });
        
        return user;
    } catch (error: any) {
        console.error('❌ Login ด้วย Email Link ล้มเหลว:', error);
        
        const errorCode = error.code;
        let thaiErrorMessage = 'ไม่สามารถ Login ด้วย Email Link ได้';
        
        switch (errorCode) {
            case 'auth/invalid-action-code':
                thaiErrorMessage = 'Link หมดอายุหรือถูกใช้งานแล้ว กรุณาขอ link ใหม่';
                break;
            case 'auth/expired-action-code':
                thaiErrorMessage = 'Link หมดอายุแล้ว กรุณาขอ link ใหม่';
                break;
            case 'auth/invalid-email':
                thaiErrorMessage = 'รูปแบบอีเมลไม่ถูกต้อง';
                break;
            case 'auth/user-disabled':
                thaiErrorMessage = 'บัญชีนี้ถูกระงับการใช้งาน';
                break;
            default:
                thaiErrorMessage = error.message || 'ไม่สามารถ Login ด้วย Email Link ได้';
        }
        
        throw new Error(thaiErrorMessage);
    }
};

// ==================== Account Linking ====================

/**
 * ตรวจสอบว่าอีเมลนี้มี Provider อะไรบ้าง
 * @param email - อีเมลที่ต้องการตรวจสอบ
 * @returns Array ของ sign-in methods
 */
export const checkEmailProviders = async (email: string): Promise<string[]> => {
    try {
        const methods = await fetchSignInMethodsForEmail(auth, email);
        console.log('📧 อีเมล', email, 'มี providers:', methods);
        return methods;
    } catch (error: any) {
        console.error('❌ ตรวจสอบ providers ล้มเหลว:', error);
        return [];
    }
};

/**
 * Link Google Account กับ Account ปัจจุบัน
 * @returns Promise<User>
 */
export const linkWithGoogle = async (): Promise<User> => {
    try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error('กรุณา Login ก่อน');
        }

        console.log('🔗 กำลัง Link กับ Google...');
        
        const result = await linkWithPopup(currentUser, googleProvider);
        const user = result.user;
        
        console.log('✅ Link กับ Google สำเร็จ:', {
            email: user.email,
            providers: user.providerData.map(p => p.providerId),
        });
        
        return user;
    } catch (error: any) {
        console.error('❌ Link กับ Google ล้มเหลว:', error);
        
        const errorCode = error.code;
        let thaiErrorMessage = 'ไม่สามารถ Link กับ Google ได้';
        
        switch (errorCode) {
            case 'auth/provider-already-linked':
                thaiErrorMessage = 'Google Account นี้ถูก Link ไว้แล้ว';
                break;
            case 'auth/credential-already-in-use':
                thaiErrorMessage = 'Google Account นี้ถูกใช้งานโดยผู้ใช้อื่นแล้ว';
                break;
            case 'auth/email-already-in-use':
                thaiErrorMessage = 'อีเมลนี้ถูกใช้งานแล้ว';
                break;
            case 'auth/popup-closed-by-user':
                thaiErrorMessage = 'คุณปิดหน้าต่าง';
                break;
            default:
                thaiErrorMessage = error.message || 'ไม่สามารถ Link กับ Google ได้';
        }
        
        throw new Error(thaiErrorMessage);
    }
};

/**
 * Link Email/Password กับ Account ปัจจุบัน
 * @param email - อีเมล
 * @param password - รหัสผ่าน
 * @returns Promise<User>
 */
export const linkWithEmailPassword = async (
    email: string,
    password: string
): Promise<User> => {
    try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error('กรุณา Login ก่อน');
        }

        console.log('🔗 กำลัง Link กับ Email/Password...');
        
        const credential = EmailAuthProvider.credential(email, password);
        const result = await linkWithCredential(currentUser, credential);
        const user = result.user;
        
        console.log('✅ Link กับ Email/Password สำเร็จ:', {
            email: user.email,
            providers: user.providerData.map(p => p.providerId),
        });
        
        return user;
    } catch (error: any) {
        console.error('❌ Link กับ Email/Password ล้มเหลว:', error);
        
        const errorCode = error.code;
        let thaiErrorMessage = 'ไม่สามารถ Link กับ Email/Password ได้';
        
        switch (errorCode) {
            case 'auth/provider-already-linked':
                thaiErrorMessage = 'Email/Password ถูก Link ไว้แล้ว';
                break;
            case 'auth/credential-already-in-use':
                thaiErrorMessage = 'อีเมลนี้ถูกใช้งานโดยผู้ใช้อื่นแล้ว';
                break;
            case 'auth/email-already-in-use':
                thaiErrorMessage = 'อีเมลนี้ถูกใช้งานแล้ว';
                break;
            case 'auth/weak-password':
                thaiErrorMessage = 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร';
                break;
            case 'auth/invalid-email':
                thaiErrorMessage = 'รูปแบบอีเมลไม่ถูกต้อง';
                break;
            default:
                thaiErrorMessage = error.message || 'ไม่สามารถ Link กับ Email/Password ได้';
        }
        
        throw new Error(thaiErrorMessage);
    }
};

/**
 * ดึงรายการ Providers ที่ Link ไว้แล้ว
 * @returns Array ของ provider IDs
 */
export const getLinkedProviders = (): string[] => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
        return [];
    }
    
    return currentUser.providerData.map(provider => provider.providerId);
};

/**
 * ตรวจสอบว่า Provider นี้ถูก Link ไว้แล้วหรือไม่
 * @param providerId - Provider ID (เช่น 'google.com', 'password')
 * @returns boolean
 */
export const isProviderLinked = (providerId: string): boolean => {
    const linkedProviders = getLinkedProviders();
    return linkedProviders.includes(providerId);
};

/**
 * ส่งอีเมลรีเซ็ตรหัสผ่าน
 * @param email - อีเมลที่ต้องการรีเซ็ตรหัสผ่าน
 */
export const sendPasswordReset = async (email: string): Promise<void> => {
    try {
        await sendPasswordResetEmail(auth, email);
        console.log('✅ ส่งอีเมลรีเซ็ตรหัสผ่านสำเร็จ:', email);
    } catch (error: any) {
        console.error('❌ ส่งอีเมลรีเซ็ตรหัสผ่านล้มเหลว:', error);
        throw new Error(getAuthErrorMessage(error.code));
    }
};

/**
 * เปลี่ยนรหัสผ่าน (ต้อง Reauthenticate ก่อน)
 * @param currentPassword - รหัสผ่านปัจจุบัน
 * @param newPassword - รหัสผ่านใหม่
 */
export const changePassword = async (
    currentPassword: string,
    newPassword: string
): Promise<void> => {
    const currentUser = auth.currentUser;
    
    if (!currentUser || !currentUser.email) {
        throw new Error('ไม่พบข้อมูลผู้ใช้');
    }

    try {
        // Reauthenticate ก่อนเปลี่ยนรหัสผ่าน
        const credential = EmailAuthProvider.credential(
            currentUser.email,
            currentPassword
        );
        
        await reauthenticateWithCredential(currentUser, credential);
        console.log('✅ Reauthenticate สำเร็จ');

        // เปลี่ยนรหัสผ่าน
        await updatePassword(currentUser, newPassword);
        console.log('✅ เปลี่ยนรหัสผ่านสำเร็จ');
    } catch (error: any) {
        console.error('❌ เปลี่ยนรหัสผ่านล้มเหลว:', error);
        
        if (error.code === 'auth/wrong-password') {
            throw new Error('รหัสผ่านปัจจุบันไม่ถูกต้อง');
        } else if (error.code === 'auth/weak-password') {
            throw new Error('รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร');
        } else if (error.code === 'auth/requires-recent-login') {
            throw new Error('กรุณา Logout แล้ว Login ใหม่ก่อนเปลี่ยนรหัสผ่าน');
        }
        
        throw new Error(getAuthErrorMessage(error.code));
    }
};

// ==================== Phone Account Linking ====================

/**
 * Link Phone Number กับ Account ปัจจุบัน
 * ใช้สำหรับเพิ่มเบอร์โทรให้กับ account ที่ login ด้วย Email/Google
 * @param phoneNumber - เบอร์โทรศัพท์ในรูปแบบ +66XXXXXXXXX
 * @param recaptchaVerifier - RecaptchaVerifier instance
 * @returns Promise<ConfirmationResult> - ใช้สำหรับยืนยัน OTP
 */
export const linkPhoneSendOTP = async (
    phoneNumber: string,
    recaptchaVerifier: RecaptchaVerifier
): Promise<ConfirmationResult> => {
    try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error('กรุณา Login ก่อน');
        }

        console.log('📱 กำลังส่ง OTP เพื่อ Link Phone:', phoneNumber);
        
        // ใช้ signInWithPhoneNumber แต่จะ link กับ account ปัจจุบันหลังจากยืนยัน OTP
        const confirmationResult = await signInWithPhoneNumber(
            auth,
            phoneNumber,
            recaptchaVerifier
        );
        
        console.log('✅ ส่ง OTP สำเร็จ');
        return confirmationResult;
    } catch (error: any) {
        console.error('❌ ส่ง OTP สำหรับ Link Phone ล้มเหลว:', error);
        throw new Error(getPhoneAuthErrorMessage(error.code));
    }
};

/**
 * ยืนยัน OTP และ Link Phone กับ Account ปัจจุบัน
 * @param confirmationResult - ผลจากการส่ง OTP
 * @param otp - รหัส OTP 6 หลัก
 * @returns Promise<User>
 */
export const linkPhoneVerifyOTP = async (
    confirmationResult: ConfirmationResult,
    otp: string
): Promise<User> => {
    try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error('กรุณา Login ก่อน');
        }

        console.log('🔗 กำลังยืนยัน OTP และ Link Phone...');
        
        // ยืนยัน OTP
        const credential = PhoneAuthProvider.credential(
            confirmationResult.verificationId,
            otp
        );
        
        // Link กับ account ปัจจุบัน
        const result = await linkWithCredential(currentUser, credential);
        const user = result.user;
        
        console.log('✅ Link Phone สำเร็จ:', {
            phoneNumber: user.phoneNumber,
            providers: user.providerData.map(p => p.providerId),
        });
        
        return user;
    } catch (error: any) {
        console.error('❌ Link Phone ล้มเหลว:', error);
        
        const errorCode = error.code;
        let thaiErrorMessage = 'ไม่สามารถ Link เบอร์โทรได้';
        
        switch (errorCode) {
            case 'auth/provider-already-linked':
                thaiErrorMessage = 'เบอร์โทรนี้ถูก Link ไว้แล้ว';
                break;
            case 'auth/credential-already-in-use':
                thaiErrorMessage = 'เบอร์โทรนี้ถูกใช้งานโดยผู้ใช้อื่นแล้ว';
                break;
            case 'auth/invalid-verification-code':
                thaiErrorMessage = 'รหัส OTP ไม่ถูกต้อง';
                break;
            case 'auth/code-expired':
                thaiErrorMessage = 'รหัส OTP หมดอายุแล้ว กรุณาขอรหัสใหม่';
                break;
            case 'auth/requires-recent-login':
                thaiErrorMessage = 'กรุณา Logout แล้ว Login ใหม่ก่อน Link เบอร์โทร';
                break;
            default:
                thaiErrorMessage = error.message || 'ไม่สามารถ Link เบอร์โทรได้';
        }
        
        throw new Error(thaiErrorMessage);
    }
};

/**
 * ดึง Auth Error Message เป็นภาษาไทย (สำหรับ Phone Auth)
 */
const getPhoneAuthErrorMessage = (errorCode: string): string => {
    switch (errorCode) {
        case 'auth/invalid-phone-number':
            return 'รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง';
        case 'auth/missing-phone-number':
            return 'กรุณากรอกเบอร์โทรศัพท์';
        case 'auth/quota-exceeded':
            return 'ส่ง SMS เกินโควต้า กรุณาลองใหม่ภายหลัง';
        case 'auth/user-disabled':
            return 'บัญชีนี้ถูกระงับการใช้งาน';
        case 'auth/operation-not-allowed':
            return 'ระบบยังไม่เปิดใช้งาน Phone Authentication';
        case 'auth/too-many-requests':
            return 'มีการส่ง OTP มากเกินไป กรุณารอสักครู่';
        case 'auth/captcha-check-failed':
            return 'การตรวจสอบ reCAPTCHA ล้มเหลว กรุณาลองใหม่';
        default:
            return 'ไม่สามารถส่ง OTP ได้';
    }
};

/**
 * ดึง Auth Error Message เป็นภาษาไทย (ทั่วไป)
 */
const getAuthErrorMessage = (errorCode: string): string => {
    switch (errorCode) {
        case 'auth/user-not-found':
            return 'ไม่พบผู้ใช้นี้ในระบบ';
        case 'auth/wrong-password':
            return 'รหัสผ่านไม่ถูกต้อง';
        case 'auth/invalid-email':
            return 'รูปแบบอีเมลไม่ถูกต้อง';
        case 'auth/user-disabled':
            return 'บัญชีนี้ถูกระงับการใช้งาน';
        case 'auth/too-many-requests':
            return 'มีการพยายามมากเกินไป กรุณารอสักครู่';
        case 'auth/email-already-in-use':
            return 'อีเมลนี้ถูกใช้งานแล้ว';
        case 'auth/weak-password':
            return 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร';
        case 'auth/requires-recent-login':
            return 'กรุณา Logout แล้ว Login ใหม่ก่อน';
        case 'auth/credential-already-in-use':
            return 'ข้อมูลนี้ถูกใช้งานโดยผู้ใช้อื่นแล้ว';
        case 'auth/provider-already-linked':
            return 'บัญชีนี้ถูก Link ไว้แล้ว';
        default:
            return 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง';
    }
};

/**
 * ดึงข้อมูล Provider ทั้งหมดของ User ปัจจุบัน
 * @returns Array ของ provider info
 */
export const getUserProviders = (): { providerId: string; email?: string; phoneNumber?: string }[] => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
        return [];
    }
    
    return currentUser.providerData.map(provider => ({
        providerId: provider.providerId,
        email: provider.email || undefined,
        phoneNumber: provider.phoneNumber || undefined,
    }));
};

/**
 * ตรวจสอบว่า User มี Provider ครบหรือยัง
 * @returns object แสดงสถานะ providers
 */
export const checkLinkedProviders = (): {
    hasGoogle: boolean;
    hasEmail: boolean;
    hasPhone: boolean;
    missingProviders: string[];
} => {
    const providers = getLinkedProviders();
    
    const hasGoogle = providers.includes('google.com');
    const hasEmail = providers.includes('password');
    const hasPhone = providers.includes('phone');
    
    const missingProviders: string[] = [];
    if (!hasGoogle) missingProviders.push('google.com');
    if (!hasEmail) missingProviders.push('password');
    if (!hasPhone) missingProviders.push('phone');
    
    return {
        hasGoogle,
        hasEmail,
        hasPhone,
        missingProviders,
    };
};
