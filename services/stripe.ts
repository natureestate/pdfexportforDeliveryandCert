/**
 * Stripe Service
 * บริการจัดการการชำระเงินผ่าน Stripe
 * 
 * รองรับ:
 * - สร้าง/จัดการ Customer
 * - สร้าง Checkout Session
 * - จัดการ Subscription
 * - Test/Live mode switch
 * 
 * หมายเหตุ: Service นี้ใช้งานร่วมกับ Stripe MCP Server
 */

import { db } from '../firebase.config';
import {
    collection,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    query,
    where,
    getDocs,
    Timestamp,
} from 'firebase/firestore';
import {
    SubscriptionPlan,
    BillingCycle,
    StripeMode,
    StripeCustomer,
    StripeSubscription,
    CompanyStripeSettings,
    SubscriptionStatus,
} from '../types';
import { getPlanTemplate, PlanTemplate } from './planTemplates';

// Collection names
const STRIPE_SETTINGS_COLLECTION = 'stripeSettings';
const STRIPE_SUBSCRIPTIONS_COLLECTION = 'stripeSubscriptions';

// ============================================================
// Stripe Mode Management
// ============================================================

/**
 * ดึงโหมด Stripe ปัจจุบัน (test/live)
 * อ่านจาก localStorage หรือ environment variable
 */
export const getStripeMode = (): StripeMode => {
    // ตรวจสอบจาก localStorage ก่อน
    const savedMode = localStorage.getItem('stripeMode');
    if (savedMode === 'live' || savedMode === 'test') {
        return savedMode;
    }
    
    // ถ้าไม่มีใน localStorage ให้ใช้จาก environment
    const envMode = import.meta.env.VITE_STRIPE_MODE;
    if (envMode === 'live') {
        return 'live';
    }
    
    // Default เป็น test mode
    return 'test';
};

/**
 * ตั้งค่าโหมด Stripe
 */
export const setStripeMode = (mode: StripeMode): void => {
    localStorage.setItem('stripeMode', mode);
    console.log(`💳 Stripe Mode: ${mode.toUpperCase()}`);
};

/**
 * ตรวจสอบว่าอยู่ใน Test Mode หรือไม่
 */
export const isTestMode = (): boolean => {
    return getStripeMode() === 'test';
};

// ============================================================
// Customer Management
// ============================================================

/**
 * สร้าง Stripe Customer ใหม่
 * ใช้ Stripe MCP Server
 */
export const createStripeCustomer = async (
    name: string,
    email: string
): Promise<StripeCustomer | null> => {
    try {
        console.log('💳 กำลังสร้าง Stripe Customer:', { name, email });
        
        // หมายเหตุ: ในการใช้งานจริง จะเรียกผ่าน Stripe MCP
        // ตัวอย่างนี้เป็น mock สำหรับ development
        
        // TODO: เรียก mcp_Stripe_create_customer
        // const result = await mcp_Stripe_create_customer({ name, email });
        
        const mockCustomer: StripeCustomer = {
            id: `cus_${generateMockId()}`,
            email,
            name,
            createdAt: new Date(),
        };
        
        console.log('✅ สร้าง Stripe Customer สำเร็จ:', mockCustomer.id);
        return mockCustomer;
    } catch (error) {
        console.error('❌ สร้าง Stripe Customer ล้มเหลว:', error);
        return null;
    }
};

/**
 * ค้นหา Stripe Customer จาก email
 */
export const findStripeCustomerByEmail = async (
    email: string
): Promise<StripeCustomer | null> => {
    try {
        console.log('🔍 กำลังค้นหา Stripe Customer:', email);
        
        // TODO: เรียก mcp_Stripe_list_customers({ email })
        
        return null;
    } catch (error) {
        console.error('❌ ค้นหา Stripe Customer ล้มเหลว:', error);
        return null;
    }
};

// ============================================================
// Product & Price Management
// ============================================================

/**
 * ดึงรายการ Products จาก Stripe
 */
export const getStripeProducts = async (): Promise<any[]> => {
    try {
        console.log('📦 กำลังดึงรายการ Products จาก Stripe...');
        
        // TODO: เรียก mcp_Stripe_list_products
        
        return [];
    } catch (error) {
        console.error('❌ ดึงรายการ Products ล้มเหลว:', error);
        return [];
    }
};

/**
 * ดึงรายการ Prices จาก Stripe
 */
export const getStripePrices = async (productId?: string): Promise<any[]> => {
    try {
        console.log('💰 กำลังดึงรายการ Prices จาก Stripe...');
        
        // TODO: เรียก mcp_Stripe_list_prices({ product: productId })
        
        return [];
    } catch (error) {
        console.error('❌ ดึงรายการ Prices ล้มเหลว:', error);
        return [];
    }
};

/**
 * สร้าง Product ใน Stripe สำหรับ Plan
 */
export const createStripeProduct = async (
    plan: PlanTemplate
): Promise<string | null> => {
    try {
        console.log('📦 กำลังสร้าง Stripe Product:', plan.name);
        
        // TODO: เรียก mcp_Stripe_create_product
        // const result = await mcp_Stripe_create_product({
        //     name: `Edoc Online - ${plan.name}`,
        //     description: plan.descriptionTh,
        // });
        
        const mockProductId = `prod_${generateMockId()}`;
        console.log('✅ สร้าง Stripe Product สำเร็จ:', mockProductId);
        return mockProductId;
    } catch (error) {
        console.error('❌ สร้าง Stripe Product ล้มเหลว:', error);
        return null;
    }
};

/**
 * สร้าง Price ใน Stripe สำหรับ Plan
 */
export const createStripePrice = async (
    productId: string,
    amount: number,
    currency: string = 'thb'
): Promise<string | null> => {
    try {
        console.log('💰 กำลังสร้าง Stripe Price:', { productId, amount, currency });
        
        // TODO: เรียก mcp_Stripe_create_price
        // const result = await mcp_Stripe_create_price({
        //     product: productId,
        //     unit_amount: amount * 100, // Stripe ใช้หน่วยสตางค์
        //     currency,
        // });
        
        const mockPriceId = `price_${generateMockId()}`;
        console.log('✅ สร้าง Stripe Price สำเร็จ:', mockPriceId);
        return mockPriceId;
    } catch (error) {
        console.error('❌ สร้าง Stripe Price ล้มเหลว:', error);
        return null;
    }
};

// ============================================================
// Payment Link & Checkout
// ============================================================

/**
 * สร้าง Payment Link สำหรับ Plan
 */
export const createPaymentLink = async (
    priceId: string,
    quantity: number = 1,
    redirectUrl?: string
): Promise<string | null> => {
    try {
        console.log('🔗 กำลังสร้าง Payment Link:', { priceId, quantity });
        
        // TODO: เรียก mcp_Stripe_create_payment_link
        // const result = await mcp_Stripe_create_payment_link({
        //     price: priceId,
        //     quantity,
        //     redirect_url: redirectUrl,
        // });
        
        const mockUrl = `https://checkout.stripe.com/pay/${generateMockId()}`;
        console.log('✅ สร้าง Payment Link สำเร็จ:', mockUrl);
        return mockUrl;
    } catch (error) {
        console.error('❌ สร้าง Payment Link ล้มเหลว:', error);
        return null;
    }
};

/**
 * สร้าง Checkout Session สำหรับการสมัคร subscription
 */
export interface CreateCheckoutSessionParams {
    companyId: string;
    userId: string;
    userEmail: string;
    userName?: string;
    plan: SubscriptionPlan;
    billingCycle: BillingCycle;
    successUrl: string;
    cancelUrl: string;
}

export const createCheckoutSession = async (
    params: CreateCheckoutSessionParams
): Promise<{ url: string; sessionId: string } | null> => {
    try {
        console.log('🛒 กำลังสร้าง Checkout Session:', params);
        
        const {
            companyId,
            userId,
            userEmail,
            userName,
            plan,
            billingCycle,
            successUrl,
            cancelUrl,
        } = params;
        
        // ดึง Plan Template
        const planTemplate = await getPlanTemplate(plan);
        if (!planTemplate) {
            throw new Error(`ไม่พบ Plan Template: ${plan}`);
        }
        
        // ตรวจสอบว่าเป็น Free plan หรือไม่
        if (planTemplate.priceMonthly === 0) {
            throw new Error('ไม่สามารถสร้าง Checkout Session สำหรับ Free plan');
        }
        
        // ตรวจสอบว่าเป็น Enterprise (ติดต่อฝ่ายขาย)
        if (planTemplate.priceMonthly === -1) {
            throw new Error('กรุณาติดต่อฝ่ายขายสำหรับ Enterprise plan');
        }
        
        // ดึง Price ID ตาม billing cycle
        const priceId = billingCycle === 'yearly' 
            ? planTemplate.stripePriceYearlyId 
            : planTemplate.stripePriceMonthlyId;
        
        if (!priceId) {
            // ถ้ายังไม่มี Price ID ใน Stripe ให้สร้าง Payment Link แทน
            console.warn('⚠️  ไม่พบ Stripe Price ID, ใช้ mock checkout');
        }
        
        // ค้นหาหรือสร้าง Stripe Customer
        let stripeCustomerId: string | null = null;
        const existingCustomer = await findStripeCustomerByEmail(userEmail);
        
        if (existingCustomer) {
            stripeCustomerId = existingCustomer.id;
        } else {
            const newCustomer = await createStripeCustomer(userName || userEmail, userEmail);
            if (newCustomer) {
                stripeCustomerId = newCustomer.id;
            }
        }
        
        // บันทึก Stripe Settings ของ Company
        await saveCompanyStripeSettings({
            companyId,
            stripeCustomerId: stripeCustomerId || undefined,
            stripeMode: getStripeMode(),
        });
        
        // TODO: สร้าง Checkout Session จริงผ่าน Stripe API
        // ในตอนนี้ใช้ mock
        const mockSessionId = `cs_${generateMockId()}`;
        const mockUrl = `https://checkout.stripe.com/c/pay/${mockSessionId}?plan=${plan}&cycle=${billingCycle}`;
        
        console.log('✅ สร้าง Checkout Session สำเร็จ:', mockSessionId);
        
        return {
            url: mockUrl,
            sessionId: mockSessionId,
        };
    } catch (error) {
        console.error('❌ สร้าง Checkout Session ล้มเหลว:', error);
        return null;
    }
};

// ============================================================
// Subscription Management
// ============================================================

/**
 * ดึงรายการ Subscriptions ทั้งหมด
 */
export const getStripeSubscriptions = async (
    customerId?: string,
    status?: string
): Promise<any[]> => {
    try {
        console.log('📋 กำลังดึงรายการ Subscriptions...');
        
        // TODO: เรียก mcp_Stripe_list_subscriptions
        
        return [];
    } catch (error) {
        console.error('❌ ดึงรายการ Subscriptions ล้มเหลว:', error);
        return [];
    }
};

/**
 * ยกเลิก Subscription
 */
export const cancelStripeSubscription = async (
    subscriptionId: string
): Promise<boolean> => {
    try {
        console.log('🚫 กำลังยกเลิก Subscription:', subscriptionId);
        
        // TODO: เรียก mcp_Stripe_cancel_subscription
        // await mcp_Stripe_cancel_subscription({ subscription: subscriptionId });
        
        console.log('✅ ยกเลิก Subscription สำเร็จ');
        return true;
    } catch (error) {
        console.error('❌ ยกเลิก Subscription ล้มเหลว:', error);
        return false;
    }
};

/**
 * อัปเดต Subscription (เปลี่ยน Plan)
 */
export const updateStripeSubscription = async (
    subscriptionId: string,
    newPriceId: string
): Promise<boolean> => {
    try {
        console.log('🔄 กำลังอัปเดต Subscription:', { subscriptionId, newPriceId });
        
        // TODO: เรียก mcp_Stripe_update_subscription
        
        console.log('✅ อัปเดต Subscription สำเร็จ');
        return true;
    } catch (error) {
        console.error('❌ อัปเดต Subscription ล้มเหลว:', error);
        return false;
    }
};

// ============================================================
// Firestore Integration
// ============================================================

/**
 * บันทึก Stripe Settings ของ Company
 */
export const saveCompanyStripeSettings = async (
    settings: Omit<CompanyStripeSettings, 'id' | 'createdAt' | 'updatedAt'>
): Promise<void> => {
    try {
        const settingsRef = doc(db, STRIPE_SETTINGS_COLLECTION, settings.companyId);
        
        await setDoc(settingsRef, {
            ...settings,
            updatedAt: Timestamp.now(),
        }, { merge: true });
        
        console.log('✅ บันทึก Stripe Settings สำเร็จ:', settings.companyId);
    } catch (error) {
        console.error('❌ บันทึก Stripe Settings ล้มเหลว:', error);
        throw error;
    }
};

/**
 * ดึง Stripe Settings ของ Company
 */
export const getCompanyStripeSettings = async (
    companyId: string
): Promise<CompanyStripeSettings | null> => {
    try {
        const settingsRef = doc(db, STRIPE_SETTINGS_COLLECTION, companyId);
        const settingsSnap = await getDoc(settingsRef);
        
        if (!settingsSnap.exists()) {
            return null;
        }
        
        const data = settingsSnap.data();
        return {
            id: settingsSnap.id,
            companyId: data.companyId,
            stripeCustomerId: data.stripeCustomerId,
            stripeSubscriptionId: data.stripeSubscriptionId,
            stripeMode: data.stripeMode || 'test',
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate(),
        };
    } catch (error) {
        console.error('❌ ดึง Stripe Settings ล้มเหลว:', error);
        return null;
    }
};

/**
 * บันทึก Subscription ใน Firestore
 */
export const saveSubscription = async (
    companyId: string,
    subscription: Omit<StripeSubscription, 'createdAt' | 'updatedAt'>
): Promise<void> => {
    try {
        const subRef = doc(db, STRIPE_SUBSCRIPTIONS_COLLECTION, companyId);
        
        await setDoc(subRef, {
            ...subscription,
            companyId,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        });
        
        // อัปเดต Stripe Settings
        await saveCompanyStripeSettings({
            companyId,
            stripeSubscriptionId: subscription.id,
            stripeCustomerId: subscription.customerId,
            stripeMode: getStripeMode(),
        });
        
        console.log('✅ บันทึก Subscription สำเร็จ:', subscription.id);
    } catch (error) {
        console.error('❌ บันทึก Subscription ล้มเหลว:', error);
        throw error;
    }
};

/**
 * ดึง Subscription ของ Company
 */
export const getCompanySubscription = async (
    companyId: string
): Promise<StripeSubscription | null> => {
    try {
        const subRef = doc(db, STRIPE_SUBSCRIPTIONS_COLLECTION, companyId);
        const subSnap = await getDoc(subRef);
        
        if (!subSnap.exists()) {
            return null;
        }
        
        const data = subSnap.data();
        return {
            id: data.id,
            customerId: data.customerId,
            status: data.status,
            plan: data.plan,
            billingCycle: data.billingCycle,
            priceId: data.priceId,
            productId: data.productId,
            currentPeriodStart: data.currentPeriodStart?.toDate(),
            currentPeriodEnd: data.currentPeriodEnd?.toDate(),
            cancelAtPeriodEnd: data.cancelAtPeriodEnd,
            canceledAt: data.canceledAt?.toDate(),
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate(),
        };
    } catch (error) {
        console.error('❌ ดึง Subscription ล้มเหลว:', error);
        return null;
    }
};

/**
 * อัปเดตสถานะ Subscription ใน Firestore
 */
export const updateSubscriptionStatus = async (
    companyId: string,
    status: SubscriptionStatus,
    additionalData?: Partial<StripeSubscription>
): Promise<void> => {
    try {
        const subRef = doc(db, STRIPE_SUBSCRIPTIONS_COLLECTION, companyId);
        
        await updateDoc(subRef, {
            status,
            ...additionalData,
            updatedAt: Timestamp.now(),
        });
        
        console.log('✅ อัปเดตสถานะ Subscription สำเร็จ:', { companyId, status });
    } catch (error) {
        console.error('❌ อัปเดตสถานะ Subscription ล้มเหลว:', error);
        throw error;
    }
};

// ============================================================
// Utility Functions
// ============================================================

/**
 * สร้าง Mock ID สำหรับ development
 */
const generateMockId = (): string => {
    return Math.random().toString(36).substring(2, 15);
};

/**
 * แปลงราคาเป็นหน่วยสตางค์ (สำหรับ Stripe)
 */
export const toStripeAmount = (amount: number): number => {
    return Math.round(amount * 100);
};

/**
 * แปลงราคาจากหน่วยสตางค์ (จาก Stripe)
 */
export const fromStripeAmount = (amount: number): number => {
    return amount / 100;
};

/**
 * Format ราคาเป็น string
 */
export const formatPrice = (amount: number, currency: string = 'THB'): string => {
    if (amount === 0) return 'ฟรี';
    if (amount === -1) return 'ติดต่อฝ่ายขาย';
    
    return new Intl.NumberFormat('th-TH', {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
};

/**
 * คำนวณราคาต่อเดือนจากราคารายปี
 */
export const calculateMonthlyFromYearly = (yearlyPrice: number): number => {
    if (yearlyPrice <= 0) return yearlyPrice;
    return Math.round(yearlyPrice / 12);
};

/**
 * ตรวจสอบว่า Subscription ยังใช้งานได้หรือไม่
 */
export const isSubscriptionActive = (subscription: StripeSubscription | null): boolean => {
    if (!subscription) return false;
    
    const activeStatuses: SubscriptionStatus[] = ['active', 'trial'];
    return activeStatuses.includes(subscription.status);
};

/**
 * ดึงวันหมดอายุของ Subscription
 */
export const getSubscriptionEndDate = (subscription: StripeSubscription | null): Date | null => {
    if (!subscription) return null;
    return subscription.currentPeriodEnd || null;
};

/**
 * ตรวจสอบว่า Subscription กำลังจะหมดอายุหรือไม่ (ภายใน 7 วัน)
 */
export const isSubscriptionExpiringSoon = (subscription: StripeSubscription | null): boolean => {
    if (!subscription) return false;
    
    const endDate = subscription.currentPeriodEnd;
    if (!endDate) return false;
    
    const now = new Date();
    const daysUntilExpiry = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    return daysUntilExpiry <= 7 && daysUntilExpiry > 0;
};

