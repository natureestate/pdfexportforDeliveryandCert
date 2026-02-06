export interface WorkItem {
    description: string;
    quantity: number;
    unit: string;
    notes: string;
}

// ประเภทของโลโก้
export type LogoType = 'default' | 'custom' | 'uploaded';

// บทบาทของผู้ใช้ในองค์กร
export type UserRole = 'admin' | 'member';

// สถานะของสมาชิกในองค์กร
export type MemberStatus = 'active' | 'pending' | 'inactive';

// สถานะของคำเชิญ
export type InvitationStatus = 'pending' | 'accepted' | 'rejected' | 'expired';

// สถานะของคำขอเข้าร่วมองค์กร (Access Request)
export type AccessRequestStatus = 'pending' | 'approved' | 'rejected';

// ============================================================
// Organization Join Code Types (ระบบ Join Code สำหรับเข้าร่วมองค์กร)
// ============================================================

/**
 * Organization Join Code - รหัสสำหรับเข้าร่วมองค์กร
 * Admin สร้าง code แล้วแชร์ให้ user ใหม่ใช้เข้าร่วมได้โดยไม่ต้องรอคำเชิญ
 */
export interface OrganizationCode {
    id?: string;                    // Document ID
    code: string;                   // รหัสเข้าร่วม (8-10 ตัวอักษร เช่น "ABC123XYZ")
    companyId: string;              // ID ขององค์กร
    companyName: string;            // ชื่อองค์กร (สำหรับแสดงผล)
    role: UserRole;                 // บทบาทเริ่มต้นเมื่อเข้าร่วม (admin หรือ member)
    maxUses: number;                // จำนวนครั้งสูงสุดที่ใช้ได้ (-1 = ไม่จำกัด)
    usedCount: number;              // จำนวนครั้งที่ใช้ไปแล้ว
    expiresAt?: Date;               // วันหมดอายุ (optional, null = ไม่หมดอายุ)
    isActive: boolean;              // code ยังใช้งานได้หรือไม่
    description?: string;           // คำอธิบาย (optional เช่น "สำหรับทีมขาย")
    createdBy: string;              // User ID ของผู้สร้าง
    createdByName?: string;         // ชื่อผู้สร้าง (สำหรับแสดงผล)
    createdAt?: Date;
    updatedAt?: Date;
}

/**
 * ข้อมูลผู้ใช้ที่เข้าร่วมด้วย Code
 */
export interface OrganizationCodeUsage {
    id?: string;                    // Document ID
    codeId: string;                 // ID ของ OrganizationCode
    code: string;                   // รหัสที่ใช้
    userId: string;                 // User ID ของผู้ใช้
    userEmail?: string;             // Email ของผู้ใช้
    userName?: string;              // ชื่อผู้ใช้
    companyId: string;              // ID ขององค์กร
    joinedAt?: Date;                // วันที่เข้าร่วม
}

// ============================================================
// Access Request Types (ระบบขอเข้าร่วมองค์กร)
// ============================================================

/**
 * Access Request - คำขอเข้าร่วมองค์กร
 * User ส่งคำขอไปยังองค์กร แล้ว Admin อนุมัติหรือปฏิเสธ
 */
export interface AccessRequest {
    id?: string;                    // Document ID
    userId: string;                 // User ID ของผู้ขอ
    userEmail: string;              // Email ของผู้ขอ
    userName?: string;              // ชื่อผู้ขอ
    userPhone?: string;             // เบอร์โทรผู้ขอ (optional)
    companyId: string;              // ID ขององค์กรที่ขอเข้าร่วม
    companyName: string;            // ชื่อองค์กร (สำหรับแสดงผล)
    status: AccessRequestStatus;    // สถานะคำขอ: pending, approved, rejected
    message?: string;               // ข้อความจากผู้ขอ (optional เช่น "ผมเป็นพนักงานใหม่ของบริษัท")
    reviewedBy?: string;            // User ID ของ Admin ที่ตรวจสอบ
    reviewedByName?: string;        // ชื่อ Admin ที่ตรวจสอบ
    reviewedAt?: Date;              // วันที่ตรวจสอบ
    rejectionReason?: string;       // เหตุผลที่ปฏิเสธ (ถ้ามี)
    assignedRole?: UserRole;        // บทบาทที่ได้รับ (เมื่ออนุมัติ)
    createdAt?: Date;
    updatedAt?: Date;
}

/**
 * ข้อมูลองค์กรสำหรับแสดงในรายการ (ใช้ในหน้า Request Access)
 */
export interface PublicCompanyInfo {
    id: string;                     // Company ID
    name: string;                   // ชื่อองค์กร
    memberCount?: number;           // จำนวนสมาชิก (optional)
    logoUrl?: string;               // URL โลโก้ (optional)
}

// ============================================================
// Document Signature Types (QR Scan to Sign/Approve System)
// ระบบเซ็นชื่อยืนยันรับมอบงานผ่าน QR Code
// ============================================================

// สถานะการเซ็นเอกสาร
export type SignatureStatus = 'pending' | 'signed' | 'rejected';

// ประเภทลายเซ็น
export type SignatureType = 'draw' | 'typed';

// บทบาทผู้เซ็น
export type SignerRole = 'receiver' | 'approver' | 'witness';

// ข้อมูลลายเซ็น (เก็บใน signatures collection)
export interface DocumentSignature {
    id?: string;                     // Document ID
    documentId: string;              // ID ของเอกสารที่เซ็น
    docType: string;                 // ประเภทเอกสาร (delivery, invoice, etc.)
    signToken: string;               // Token สำหรับเซ็น (UUID)
    companyId?: string;              // ID ของบริษัทเจ้าของเอกสาร
    
    // ข้อมูลผู้เซ็น
    signerName: string;              // ชื่อผู้เซ็น
    signerPhone: string;             // เบอร์โทรที่ verify OTP
    signerRole: SignerRole;          // บทบาท (ผู้รับมอบ, ผู้อนุมัติ, พยาน)
    
    // ลายเซ็น
    signatureType: SignatureType;    // draw หรือ typed
    signatureData: string;           // Base64 image (วาด) หรือ text (พิมพ์)
    signatureImageUrl?: string;      // URL ของรูปลายเซ็น (ถ้า upload ไป Storage)
    
    // สถานะ
    status: SignatureStatus;         // pending, signed, rejected
    signedAt?: Date;                 // วันที่เซ็น
    rejectedAt?: Date;               // วันที่ปฏิเสธ (ถ้ามี)
    rejectionReason?: string;        // เหตุผลที่ปฏิเสธ (ถ้ามี)
    
    // OTP Verification
    otpVerifiedAt?: Date;            // วันที่ยืนยัน OTP
    otpPhone?: string;               // เบอร์โทรที่ใช้ยืนยัน OTP
    
    // Audit Trail
    ipAddress?: string;              // IP Address ผู้เซ็น
    userAgent?: string;              // Browser/Device info
    
    // Metadata
    createdAt?: Date;
    updatedAt?: Date;
}

// ข้อมูลเอกสารสำหรับหน้า Sign (Public)
export interface PublicSigningData {
    documentType: string;            // ประเภทเอกสาร (ชื่อไทย)
    documentNumber: string;          // เลขที่เอกสาร
    documentDate: Date | null;       // วันที่เอกสาร
    companyName: string;             // ชื่อบริษัทผู้ออกเอกสาร
    companyPhone?: string;           // เบอร์โทรบริษัท
    customerName?: string;           // ชื่อลูกค้า (ถ้ามี)
    projectName?: string;            // ชื่อโครงการ (ถ้ามี)
    items?: Array<{                  // รายการงาน (สำหรับ Delivery Note)
        description: string;
        quantity: number;
        unit: string;
    }>;
    signatureStatus: SignatureStatus; // สถานะการเซ็น
    signedBy?: string;               // ชื่อผู้เซ็น (ถ้าเซ็นแล้ว)
    signedAt?: Date;                 // วันที่เซ็น (ถ้าเซ็นแล้ว)
}

// ============================================================
// Document Verification Types (QR Code Verification System)
// ============================================================

// สถานะของเอกสาร (สำหรับระบบตรวจสอบ QR Code)
export type DocumentStatus = 'active' | 'cancelled';

// ข้อมูลการตรวจสอบเอกสาร (Verification Fields)
// เพิ่มใน Document Data ทุกประเภท
export interface DocumentVerificationFields {
    verificationToken?: string;      // UUID v4 สำหรับตรวจสอบเอกสาร (สร้างอัตโนมัติ)
    signToken?: string;              // UUID v4 สำหรับเซ็นชื่อยืนยัน (แยกจาก verificationToken)
    documentStatus?: DocumentStatus; // สถานะเอกสาร: active หรือ cancelled
    cancelledAt?: Date;              // วันที่ยกเลิกเอกสาร (ถ้ามี)
    cancelledBy?: string;            // User ID ของผู้ยกเลิก (ถ้ามี)
    cancelledReason?: string;        // เหตุผลในการยกเลิก (ถ้ามี)
    
    // Signature Fields (ระบบเซ็นชื่อยืนยันรับมอบ)
    signatureStatus?: SignatureStatus; // สถานะการเซ็น: pending, signed, rejected
    signedBy?: string;               // ชื่อผู้เซ็น
    signedAt?: Date;                 // วันที่เซ็น
    signatureId?: string;            // Reference to signatures collection
}

// ข้อมูลสำหรับหน้า Public Verification
export interface PublicVerificationData {
    documentType: string;            // ประเภทเอกสาร
    documentNumber: string;          // เลขที่เอกสาร
    documentDate: Date | null;       // วันที่เอกสาร
    companyName: string;             // ชื่อบริษัทผู้ออกเอกสาร
    customerName?: string;           // ชื่อลูกค้า (ถ้ามี)
    totalAmount?: number;            // ยอดรวม (ถ้ามี)
    documentStatus: DocumentStatus;  // สถานะเอกสาร
    cancelledAt?: Date;              // วันที่ยกเลิก (ถ้ามี)
    createdAt?: Date;                // วันที่สร้างเอกสาร
}

// บทบาทระดับระบบ (System-wide roles)
export type SystemRole = 'superadmin' | 'user';

// แผนการใช้งาน (Subscription Plan)
// อัปเดต: เปลี่ยนจาก basic เป็น starter ตาม pricing ใหม่
export type SubscriptionPlan = 'free' | 'starter' | 'business' | 'enterprise';

// สถานะของแผนการใช้งาน
export type SubscriptionStatus = 'active' | 'expired' | 'suspended' | 'trial' | 'canceled' | 'past_due';

// ============================================================
// Stripe Integration Types
// ============================================================

// รอบการเรียกเก็บเงิน (Billing Cycle)
export type BillingCycle = 'monthly' | 'yearly';

// โหมดการใช้งาน Stripe
export type StripeMode = 'test' | 'live';

// ประเภทเอกสารที่ใช้ได้ในแต่ละ Plan
export type DocumentAccessLevel = 'basic' | 'full';

// ข้อมูล Stripe Customer
export interface StripeCustomer {
    id: string;                           // Stripe Customer ID (cus_xxx)
    email: string;                        // อีเมลลูกค้า
    name?: string;                        // ชื่อลูกค้า
    phone?: string;                       // เบอร์โทรศัพท์
    createdAt?: Date;                     // วันที่สร้าง
}

// ข้อมูล Stripe Subscription
export interface StripeSubscription {
    id: string;                           // Stripe Subscription ID (sub_xxx)
    customerId: string;                   // Stripe Customer ID
    status: SubscriptionStatus;           // สถานะ subscription
    plan: SubscriptionPlan;               // แผนที่สมัคร
    billingCycle: BillingCycle;           // รอบการเรียกเก็บเงิน
    priceId: string;                      // Stripe Price ID
    productId: string;                    // Stripe Product ID
    currentPeriodStart: Date;             // วันเริ่มต้นรอบปัจจุบัน
    currentPeriodEnd: Date;               // วันสิ้นสุดรอบปัจจุบัน
    cancelAtPeriodEnd: boolean;           // จะยกเลิกเมื่อสิ้นสุดรอบหรือไม่
    canceledAt?: Date;                    // วันที่ยกเลิก (ถ้ามี)
    createdAt?: Date;
    updatedAt?: Date;
}

// ข้อมูล Stripe Price
export interface StripePrice {
    id: string;                           // Stripe Price ID (price_xxx)
    productId: string;                    // Stripe Product ID
    plan: SubscriptionPlan;               // แผนที่เกี่ยวข้อง
    billingCycle: BillingCycle;           // รอบการเรียกเก็บเงิน
    unitAmount: number;                   // ราคา (สตางค์)
    currency: string;                     // สกุลเงิน
    active: boolean;                      // ใช้งานอยู่หรือไม่
}

// ข้อมูล Stripe Product
export interface StripeProduct {
    id: string;                           // Stripe Product ID (prod_xxx)
    name: string;                         // ชื่อ product
    description?: string;                 // คำอธิบาย
    plan: SubscriptionPlan;               // แผนที่เกี่ยวข้อง
    active: boolean;                      // ใช้งานอยู่หรือไม่
    prices: StripePrice[];                // รายการราคา
}

// ข้อมูล Payment Intent
export interface StripePaymentIntent {
    id: string;                           // Payment Intent ID (pi_xxx)
    amount: number;                       // จำนวนเงิน (สตางค์)
    currency: string;                     // สกุลเงิน
    status: 'succeeded' | 'processing' | 'requires_payment_method' | 'canceled';
    customerId?: string;                  // Stripe Customer ID
    createdAt?: Date;
}

// ข้อมูล Checkout Session
export interface CheckoutSession {
    id: string;                           // Session ID
    url: string;                          // URL สำหรับ redirect
    plan: SubscriptionPlan;               // แผนที่เลือก
    billingCycle: BillingCycle;           // รอบการเรียกเก็บเงิน
    customerId?: string;                  // Stripe Customer ID
    successUrl: string;                   // URL หลังชำระสำเร็จ
    cancelUrl: string;                    // URL หลังยกเลิก
}

// การตั้งค่า Stripe ของบริษัท
export interface CompanyStripeSettings {
    id?: string;                          // Document ID
    companyId: string;                    // Company ID
    stripeCustomerId?: string;            // Stripe Customer ID
    stripeSubscriptionId?: string;        // Stripe Subscription ID
    stripeMode: StripeMode;               // โหมด test/live
    createdAt?: Date;
    updatedAt?: Date;
}

// โควตาการใช้งานของบริษัท
export interface CompanyQuota {
    // แผนการใช้งาน
    plan: SubscriptionPlan;                  // แผนที่ใช้งานอยู่
    status: SubscriptionStatus;              // สถานะแผน
    billingCycle?: BillingCycle;             // รอบการเรียกเก็บเงิน (monthly/yearly)
    
    // โควตาองค์กร
    maxCompanies: number;                    // จำนวนองค์กรสูงสุดที่สร้างได้ (-1 = ไม่จำกัด)
    currentCompanies: number;                // จำนวนองค์กรปัจจุบัน
    
    // โควตาผู้ใช้งาน
    maxUsers: number;                        // จำนวนผู้ใช้งานสูงสุด (-1 = ไม่จำกัด)
    currentUsers: number;                    // จำนวนผู้ใช้งานปัจจุบัน
    
    // โควตาเอกสาร
    maxDocuments: number;                    // จำนวนเอกสารสูงสุดต่อเดือน (-1 = ไม่จำกัด)
    currentDocuments: number;                // จำนวนเอกสารที่สร้างในเดือนนี้
    documentResetDate?: Date;                // วันที่รีเซ็ตจำนวนเอกสาร (วันแรกของเดือนถัดไป)
    
    // โควตาโลโก้
    maxLogos: number;                        // จำนวนโลโก้สูงสุด (-1 = ไม่จำกัด)
    currentLogos: number;                    // จำนวนโลโก้ปัจจุบัน
    allowCustomLogo: boolean;                // อนุญาตให้ใช้โลโก้กำหนดเองหรือไม่
    
    // โควตา Storage
    maxStorageMB: number;                    // พื้นที่เก็บข้อมูลสูงสุด (MB) (-1 = ไม่จำกัด)
    currentStorageMB: number;                // พื้นที่ที่ใช้ไปแล้ว (MB)
    
    // โควตา CRM (ลูกค้า)
    maxCustomers: number;                    // จำนวนลูกค้าสูงสุด (-1 = ไม่จำกัด)
    currentCustomers: number;                // จำนวนลูกค้าปัจจุบัน
    
    // โควตาช่าง/ผู้รับเหมา
    maxContractors: number;                  // จำนวนช่าง/ผู้รับเหมาสูงสุด (-1 = ไม่จำกัด)
    currentContractors: number;              // จำนวนช่าง/ผู้รับเหมาปัจจุบัน
    
    // โควตา Export PDF
    maxPdfExports: number;                   // จำนวน export PDF สูงสุดต่อเดือน (-1 = ไม่จำกัด)
    currentPdfExports: number;               // จำนวน export PDF ในเดือนนี้
    
    // ประวัติเอกสาร (Document History)
    historyRetentionDays: number;            // จำนวนวันที่เก็บประวัติเอกสาร (-1 = ไม่จำกัด/Audit Log)
    
    // Features พิเศษ
    features: {
        multipleProfiles: boolean;           // ใช้ Profile หลายอันได้หรือไม่
        apiAccess: boolean;                  // เข้าถึง API ได้หรือไม่
        customDomain: boolean;               // ใช้ Custom Domain ได้หรือไม่
        prioritySupport: boolean;            // Support แบบพิเศษ
        exportPDF: boolean;                  // Export PDF ได้หรือไม่
        exportExcel: boolean;                // Export Excel ได้หรือไม่
        advancedReports: boolean;            // รายงานขั้นสูง
        customTemplates: boolean;            // Template กำหนดเอง
        documentAccess: DocumentAccessLevel; // ระดับการเข้าถึงเอกสาร (basic/full)
        hasWatermark: boolean;               // มีลายน้ำบนเอกสารหรือไม่
        lineNotification: boolean;           // แจ้งเตือนผ่าน Line
        dedicatedSupport: boolean;           // ผู้ดูแลส่วนตัว
        auditLog: boolean;                   // Audit Log เต็มรูปแบบ
    };
    
    // ข้อมูลการสมัคร
    startDate: Date;                         // วันที่เริ่มใช้งานแผนปัจจุบัน
    endDate?: Date;                          // วันหมดอายุ (ถ้าเป็น subscription แบบจ่ายเงิน)
    trialEndDate?: Date;                     // วันหมดอายุทดลองใช้
    
    // Payment
    lastPaymentDate?: Date;                  // วันที่จ่ายเงินล่าสุด
    nextPaymentDate?: Date;                  // วันที่จ่ายเงินครั้งถัดไป
    paymentAmount?: number;                  // จำนวนเงินที่ต้องจ่าย
    currency?: string;                       // สกุลเงิน (THB, USD)
    
    // Stripe Integration
    stripeCustomerId?: string;               // Stripe Customer ID
    stripeSubscriptionId?: string;           // Stripe Subscription ID
    stripePriceId?: string;                  // Stripe Price ID
    
    // Metadata
    createdAt?: Date;
    updatedAt?: Date;
    updatedBy?: string;                      // User ID ของผู้อัปเดต
    notes?: string;                          // หมายเหตุ
}

// ข้อมูล Super Admin
export interface SuperAdmin {
    id?: string;                    // Document ID
    userId: string;                 // Firebase Auth UID
    email: string;                  // อีเมล
    displayName?: string;           // ชื่อแสดง
    role: SystemRole;               // บทบาทระดับระบบ
    permissions: string[];          // สิทธิ์พิเศษ (เช่น 'view_all', 'manage_users', 'manage_companies')
    createdBy?: string;             // User ID ของผู้สร้าง
    createdAt?: Date;
    updatedAt?: Date;
    lastLoginAt?: Date;             // Login ล่าสุด
}

// สถิติภาพรวมระบบ
export interface SystemStats {
    totalCompanies: number;         // จำนวนบริษัททั้งหมด
    totalUsers: number;             // จำนวน users ทั้งหมด
    totalMembers: number;           // จำนวนสมาชิกทั้งหมด
    totalInvitations: number;       // จำนวนคำเชิญทั้งหมด
    totalDocuments: number;         // จำนวนเอกสารทั้งหมด
    activeUsers: number;            // จำนวน active users
    pendingInvitations: number;     // จำนวนคำเชิญที่รอ
}

// ข้อมูลสมาชิกในองค์กร
export interface CompanyMember {
    id?: string;                // Document ID
    companyId: string;          // ID ขององค์กร
    userId: string;             // User ID จาก Firebase Auth
    email: string;              // อีเมลของ User
    phoneNumber?: string;       // เบอร์โทรศัพท์
    displayName?: string;       // ชื่อแสดง
    role: UserRole;             // บทบาท: admin หรือ member
    status: MemberStatus;       // สถานะ: active, pending, inactive
    joinedAt?: Date;            // วันที่เข้าร่วม
    invitedBy?: string;         // User ID ของคนที่เชิญ
    createdAt?: Date;
    updatedAt?: Date;
}

// ข้อมูลบริษัท
export interface Company {
    id?: string;
    name: string;              // ชื่อบริษัท
    address?: string;          // ที่อยู่บริษัท (optional)
    phone?: string;            // เบอร์โทรศัพท์บริษัท (optional)
    email?: string;            // อีเมลบริษัท (optional)
    website?: string;         // เว็บไซต์บริษัท (optional)
    taxId?: string;            // เลขประจำตัวผู้เสียภาษี (optional)
    
    // ข้อมูลสาขาตามประกาศอธิบดีกรมสรรพากร (ฉบับที่ 200)
    // Ref: https://www.rd.go.th/27983.html
    branchCode?: string;       // รหัสสาขา 5 หลัก (เช่น "00000" = สำนักงานใหญ่, "00001" = สาขาที่ 1)
    branchName?: string;       // ชื่อสาขา (เช่น "สำนักงานใหญ่", "สาขาลาดพร้าว")
    
    userId: string;            // Admin คนแรก (คนที่สร้างบริษัท)
    logoUrl?: string | null;   // โลโก้เอกสาร (สำหรับพิมพ์ใน PDF) - URL จาก Storage (backwards compatibility)
    logoBase64?: string | null; // โลโก้เอกสาร (Base64) - เก็บใน Firestore โดยตรง (ใหม่)
    logoType?: LogoType;       // ประเภทโลโก้เอกสาร
    defaultLogoUrl?: string | null;  // โลโก้ default ของแต่ละองค์กร (URL จาก Storage)
    organizationLogoUrl?: string | null;  // โลโก้องค์กร (แสดงใน Header)
    memberCount?: number;      // จำนวนสมาชิกในองค์กร
    
    // Quota และ Subscription
    quotaId?: string;          // ID ของ quota document (reference to companyQuotas collection)
    quota?: CompanyQuota;      // ข้อมูล quota (ถ้าโหลดมาด้วย)
    
    createdAt?: Date;
    updatedAt?: Date;
}

export interface DeliveryNoteData extends DocumentVerificationFields {
    logo: string | null;          // Base64 string หรือ URL ของโลโก้
    logoUrl?: string | null;       // URL จาก Firebase Storage (สำหรับบันทึกใน Firestore)
    logoType?: LogoType;           // ประเภทของโลโก้
    fromCompany: string;
    fromAddress: string;
    fromPhone?: string;           // เบอร์โทรศัพท์ผู้ส่ง (optional)
    fromEmail?: string;            // อีเมลผู้ส่ง (optional)
    fromWebsite?: string;         // เว็บไซต์ผู้ส่ง (optional)
    fromTaxId?: string;            // เลขประจำตัวผู้เสียภาษีผู้ส่ง (optional)
    fromBranchCode?: string;       // รหัสสาขาผู้ส่ง (optional) - ตามประกาศอธิบดีกรมสรรพากร ฉบับที่ 200
    fromBranchName?: string;       // ชื่อสาขาผู้ส่ง (optional)
    toCompany: string;
    toAddress: string;
    toEmail?: string;              // อีเมลผู้รับ (optional)
    toTaxId?: string;              // เลขประจำตัวผู้เสียภาษีผู้รับ (optional)
    toBranchCode?: string;         // รหัสสาขาผู้รับ (optional)
    toBranchName?: string;         // ชื่อสาขาผู้รับ (optional)
    docNumber: string;
    date: Date | null;
    project: string;
    items: WorkItem[];
    senderName: string;
    receiverName: string;
    
    // ข้อมูลโครงการลูกค้าปลายทาง (End Customer Project)
    hasEndCustomerProject?: boolean;           // มีโครงการลูกค้าปลายทางหรือไม่
    endCustomerProject?: EndCustomerProject;   // ข้อมูลโครงการลูกค้าปลายทาง
    showEndCustomerInPdf?: boolean;            // แสดงข้อมูลโครงการลูกค้าปลายทางใน PDF หรือไม่
}

export interface WarrantyData extends DocumentVerificationFields {
    logo: string | null;           // Base64 string หรือ URL ของโลโก้
    logoUrl?: string | null;       // URL จาก Firebase Storage (สำหรับบันทึกใน Firestore)
    logoType?: LogoType;           // ประเภทของโลโก้
    
    // ข้อมูลบริษัท
    companyName: string;
    companyAddress: string;
    companyPhone: string;          // เบอร์โทรบริษัท
    companyEmail?: string;         // อีเมลบริษัท (optional)
    companyWebsite?: string;      // เว็บไซต์บริษัท (optional)
    companyTaxId?: string;         // เลขประจำตัวผู้เสียภาษี (optional)
    companyBranchCode?: string;    // รหัสสาขา (optional) - ตามประกาศอธิบดีกรมสรรพากร ฉบับที่ 200
    companyBranchName?: string;    // ชื่อสาขา (optional)
    
    // ข้อมูลลูกค้า/โครงการ
    projectName: string;           // ชื่อโครงการ
    customerName: string;          // ชื่อลูกค้า
    customerPhone: string;         // เบอร์โทรลูกค้า
    customerAddress: string;       // ที่อยู่ลูกค้า/โครงการ
    customerEmail?: string;         // อีเมลลูกค้า (optional)
    customerBranchCode?: string;   // รหัสสาขาลูกค้า (optional) - สำหรับนิติบุคคล
    customerBranchName?: string;   // ชื่อสาขาลูกค้า (optional)
    
    // ข้อมูลสินค้า/บริการ
    serviceName: string;           // ชื่อบริการ/ประเภทสินค้า
    productDetail: string;         // รายการสินค้า/รายละเอียด
    houseModel: string;            // แบบบ้าน
    batchNo: string;               // หมายเลขการผลิต (Batch No.)
    showBatchNo?: boolean;         // แสดง Batch No. ในเอกสารหรือไม่
    purchaseDate: Date | null;     // วันที่ส่งมอบ
    
    // การรับประกัน
    warrantyPeriod: string;        // ระยะเวลารับประกัน
    warrantyEndDate: Date | null;  // วันที่สิ้นสุดการรับประกัน
    terms: string;                 // เงื่อนไขการรับประกัน
    
    // การรับประกันแบบงานรับสร้างบ้าน (Multiple warranty types)
    useMultipleWarrantyTypes?: boolean;  // ใช้การรับประกันหลายประเภทหรือไม่
    warrantyGeneral?: boolean;     // รับประกันทั่วไป (1 ปี)
    warrantyRoof?: boolean;        // รับประกันงานหลังคา (3 ปี)
    warrantyStructure?: boolean;   // รับประกันงานโครงสร้าง (15 ปี)
    
    // ข้อมูลเอกสาร
    warrantyNumber: string;        // เลขที่ใบรับประกัน
    issueDate: Date | null;        // วันที่ออกเอกสาร
    issuedBy: string;              // ผู้ออกเอกสาร
    
    // ข้อมูลโครงการลูกค้าปลายทาง (End Customer Project)
    hasEndCustomerProject?: boolean;           // มีโครงการลูกค้าปลายทางหรือไม่
    endCustomerProject?: EndCustomerProject;   // ข้อมูลโครงการลูกค้าปลายทาง
    showEndCustomerInPdf?: boolean;            // แสดงข้อมูลโครงการลูกค้าปลายทางใน PDF หรือไม่
}

// Template สำหรับข้อมูลสินค้า/บริการที่ใช้บ่อย
export interface ServiceTemplate {
    id?: string;
    serviceName: string;           // ชื่อบริการ/ประเภทสินค้า
    productDetail: string;         // รายการสินค้า/รายละเอียด
    houseModel: string;            // แบบบ้าน
    batchNo: string;               // หมายเลขการผลิต (Batch No.)
    warrantyPeriod: string;        // ระยะเวลารับประกัน
    terms: string;                 // เงื่อนไขการรับประกัน
    userId: string;                // ผู้สร้าง template
    createdAt?: Date;
    updatedAt?: Date;
}

// ============================================================
// End Customer Project Types (โครงการลูกค้าปลายทาง)
// ============================================================

/**
 * EndCustomerProject - ข้อมูลโครงการของลูกค้าปลายทาง
 * สำหรับกรณีที่ลูกค้าของเรา (Customer) มีลูกค้าปลายทางอีกที
 * ตัวอย่าง: บริษัทของเรา → ลูกค้า (ผู้รับเหมา) → โครงการลูกค้าปลายทาง (เจ้าของบ้าน)
 * 
 * หมายเหตุ: ลูกค้า 1 ราย สามารถมีหลาย End Customer Project ได้
 */
export interface EndCustomerProject {
    id?: string;                  // ID สำหรับระบุโครงการ (auto-generate)
    projectName: string;          // ชื่อโครงการลูกค้าปลายทาง
    projectAddress?: string;      // ที่ตั้งโครงการ
    contactName?: string;         // ชื่อผู้ติดต่อที่โครงการ
    contactPhone?: string;        // เบอร์โทรผู้ติดต่อ
    notes?: string;               // หมายเหตุเพิ่มเติม
    createdAt?: Date;             // วันที่สร้าง
}

// Customer - ข้อมูลลูกค้าแบบครบวงจร (ลดการกรอกข้อมูลซ้ำ)
export interface Customer {
    id?: string;
    companyId: string;             // ID ของบริษัทที่สร้างลูกค้านี้
    userId: string;                // User ที่สร้างลูกค้านี้
    
    // ข้อมูลลูกค้าหลัก
    customerName: string;          // ชื่อลูกค้า/บริษัท
    customerType: 'individual' | 'company';  // ประเภท: บุคคล หรือ นิติบุคคล
    
    // ข้อมูลติดต่อ
    phone: string;                 // เบอร์โทรศัพท์หลัก
    alternatePhone?: string;       // เบอร์สำรอง
    email?: string;                // อีเมล
    lineId?: string;               // Line ID
    
    // ที่อยู่
    address: string;               // ที่อยู่หลัก
    district?: string;             // ตำบล/แขวง
    amphoe?: string;               // อำเภอ/เขต
    province?: string;             // จังหวัด
    postalCode?: string;           // รหัสไปรษณีย์
    
    // ข้อมูลโครงการ (สำหรับธุรกิจก่อสร้าง/อสังหา)
    projectName?: string;          // ชื่อโครงการ (ถ้ามี)
    houseNumber?: string;          // บ้านเลขที่/ห้องเลขที่
    
    // ข้อมูลภาษี (สำหรับนิติบุคคล)
    taxId?: string;                // เลขประจำตัวผู้เสียภาษี
    branchCode?: string;           // รหัสสาขา 5 หลัก (เช่น "00000" = สำนักงานใหญ่)
    branchName?: string;           // ชื่อสาขา (เช่น "สำนักงานใหญ่", "สาขาลาดพร้าว")
    
    // Tags และหมายเหตุ
    tags?: string[];               // Tags สำหรับจัดกลุ่ม เช่น ['VIP', 'ลูกค้าประจำ']
    notes?: string;                // หมายเหตุเพิ่มเติม
    
    // ข้อมูลโครงการลูกค้าปลายทาง (End Customer Projects) - รองรับหลายโครงการ
    hasEndCustomerProjects?: boolean;           // มีโครงการลูกค้าปลายทางหรือไม่
    endCustomerProjects?: EndCustomerProject[]; // รายการโครงการลูกค้าปลายทาง (หลายโครงการ)
    
    // Legacy field - สำหรับ backward compatibility (deprecated)
    endCustomerProject?: EndCustomerProject;   // @deprecated - ใช้ endCustomerProjects แทน
    hasEndCustomerProject?: boolean;           // @deprecated - ใช้ hasEndCustomerProjects แทน
    
    // Metadata
    lastUsedAt?: Date;             // ใช้ล่าสุดเมื่อไร (สำหรับ sorting)
    usageCount?: number;           // จำนวนครั้งที่ใช้ (สำหรับ suggestion)
    createdAt?: Date;
    updatedAt?: Date;
}

// Invoice Item - รายการสินค้า/บริการในใบแจ้งหนี้
export interface InvoiceItem {
    description: string;        // รายละเอียดสินค้า/บริการ
    quantity: number;           // จำนวน
    unit: string;               // หน่วย (เช่น ชิ้น, ชั่วโมง, งาน)
    unitPrice: number;          // ราคาต่อหน่วย
    amount: number;            // จำนวนเงิน (quantity * unitPrice)
    notes?: string;             // หมายเหตุเพิ่มเติม (optional)
}

// Invoice Data - ข้อมูลใบแจ้งหนี้
export interface InvoiceData extends DocumentVerificationFields {
    logo: string | null;           // Base64 string หรือ URL ของโลโก้
    logoUrl?: string | null;       // URL จาก Firebase Storage (สำหรับบันทึกใน Firestore)
    logoType?: LogoType;           // ประเภทของโลโก้
    
    // ข้อมูลบริษัทผู้ขาย
    companyName: string;            // ชื่อบริษัทผู้ขาย
    companyAddress: string;         // ที่อยู่บริษัทผู้ขาย
    companyPhone: string;          // เบอร์โทรศัพท์บริษัทผู้ขาย
    companyEmail?: string;         // อีเมลบริษัทผู้ขาย (optional)
    companyWebsite?: string;      // เว็บไซต์บริษัทผู้ขาย (optional)
    companyTaxId?: string;         // เลขประจำตัวผู้เสียภาษี (optional)
    companyBranchCode?: string;    // รหัสสาขา (optional) - ตามประกาศอธิบดีกรมสรรพากร ฉบับที่ 200
    companyBranchName?: string;    // ชื่อสาขา (optional)
    
    // ข้อมูลลูกค้า/ผู้ซื้อ
    customerName: string;           // ชื่อลูกค้า/บริษัทผู้ซื้อ
    customerAddress: string;       // ที่อยู่ลูกค้า
    customerPhone?: string;         // เบอร์โทรศัพท์ลูกค้า (optional)
    customerEmail?: string;         // อีเมลลูกค้า (optional)
    customerTaxId?: string;        // เลขประจำตัวผู้เสียภาษีลูกค้า (optional)
    customerBranchCode?: string;   // รหัสสาขาลูกค้า (optional)
    customerBranchName?: string;   // ชื่อสาขาลูกค้า (optional)
    
    // ข้อมูลเอกสาร
    invoiceNumber: string;          // เลขที่ใบแจ้งหนี้
    invoiceDate: Date | null;       // วันที่ออกใบแจ้งหนี้
    dueDate: Date | null;           // วันที่ครบกำหนดชำระ (optional)
    referenceNumber?: string;        // เลขที่อ้างอิง (optional)
    
    // รายการสินค้า/บริการ
    items: InvoiceItem[];           // รายการสินค้า/บริการ
    
    // ข้อมูลการชำระเงิน
    subtotal: number;               // ยอดรวมก่อนภาษี
    taxRate: number;                // อัตราภาษีมูลค่าเพิ่ม (%) (เช่น 7)
    taxAmount: number;              // จำนวนภาษีมูลค่าเพิ่ม
    discount: number;               // ส่วนลด (optional, default 0)
    total: number;                  // ยอดรวมทั้งสิ้น (subtotal + taxAmount - discount)
    
    // ข้อมูลเพิ่มเติม
    paymentTerms?: string;          // เงื่อนไขการชำระเงิน (optional)
    notes?: string;                 // หมายเหตุเพิ่มเติม (optional)
    issuedBy?: string;             // ผู้ออกเอกสาร (optional)
    
    // ข้อมูลโครงการลูกค้าปลายทาง (End Customer Project)
    hasEndCustomerProject?: boolean;           // มีโครงการลูกค้าปลายทางหรือไม่
    endCustomerProject?: EndCustomerProject;   // ข้อมูลโครงการลูกค้าปลายทาง
    showEndCustomerInPdf?: boolean;            // แสดงข้อมูลโครงการลูกค้าปลายทางใน PDF หรือไม่
}

// Receipt Item - รายการสินค้า/บริการในใบเสร็จ
export interface ReceiptItem {
    description: string;        // รายละเอียดสินค้า/บริการ
    quantity: number;           // จำนวน
    unit: string;               // หน่วย (เช่น ชิ้น, ชั่วโมง, งาน)
    unitPrice: number;          // ราคาต่อหน่วย
    amount: number;            // จำนวนเงิน (quantity * unitPrice)
    notes?: string;             // หมายเหตุเพิ่มเติม (optional)
}

// Receipt Data - ข้อมูลใบเสร็จ
export interface ReceiptData extends DocumentVerificationFields {
    logo: string | null;           // Base64 string หรือ URL ของโลโก้
    logoUrl?: string | null;       // URL จาก Firebase Storage (สำหรับบันทึกใน Firestore)
    logoType?: LogoType;           // ประเภทของโลโก้
    
    // ข้อมูลบริษัทผู้ขาย
    companyName: string;            // ชื่อบริษัทผู้ขาย
    companyAddress: string;         // ที่อยู่บริษัทผู้ขาย
    companyPhone: string;          // เบอร์โทรศัพท์บริษัทผู้ขาย
    companyEmail?: string;         // อีเมลบริษัทผู้ขาย (optional)
    companyWebsite?: string;      // เว็บไซต์บริษัทผู้ขาย (optional)
    companyTaxId?: string;         // เลขประจำตัวผู้เสียภาษี (optional)
    companyBranchCode?: string;    // รหัสสาขา (optional) - ตามประกาศอธิบดีกรมสรรพากร ฉบับที่ 200
    companyBranchName?: string;    // ชื่อสาขา (optional)
    
    // ข้อมูลลูกค้า/ผู้ซื้อ
    customerName: string;           // ชื่อลูกค้า/บริษัทผู้ซื้อ
    customerAddress: string;       // ที่อยู่ลูกค้า
    customerPhone?: string;         // เบอร์โทรศัพท์ลูกค้า (optional)
    customerEmail?: string;         // อีเมลลูกค้า (optional)
    customerTaxId?: string;        // เลขประจำตัวผู้เสียภาษีลูกค้า (optional)
    customerBranchCode?: string;   // รหัสสาขาลูกค้า (optional)
    customerBranchName?: string;   // ชื่อสาขาลูกค้า (optional)
    
    // ข้อมูลเอกสาร
    receiptNumber: string;          // เลขที่ใบเสร็จ
    receiptDate: Date | null;       // วันที่ออกใบเสร็จ
    referenceNumber?: string;        // เลขที่อ้างอิง (เช่น เลขที่ใบแจ้งหนี้) (optional)
    
    // รายการสินค้า/บริการ
    items: ReceiptItem[];           // รายการสินค้า/บริการ
    
    // ข้อมูลการชำระเงิน
    subtotal: number;               // ยอดรวมก่อนภาษี
    taxRate: number;                // อัตราภาษีมูลค่าเพิ่ม (%) (เช่น 7)
    taxAmount: number;              // จำนวนภาษีมูลค่าเพิ่ม
    discount: number;               // ส่วนลด (optional, default 0)
    total: number;                  // ยอดรวมทั้งสิ้น (subtotal + taxAmount - discount)
    
    // ข้อมูลการรับเงิน
    paymentMethod?: string;         // วิธีการชำระเงิน (เช่น เงินสด, โอนเงิน, เช็ค) (optional)
    paidAmount: number;             // จำนวนเงินที่รับ (default = total)
    changeAmount: number;           // เงินทอน (paidAmount - total)
    
    // ข้อมูลเพิ่มเติม
    notes?: string;                 // หมายเหตุเพิ่มเติม (optional)
    issuedBy?: string;             // ผู้ออกเอกสาร (optional)
    
    // ข้อมูลโครงการลูกค้าปลายทาง (End Customer Project)
    hasEndCustomerProject?: boolean;           // มีโครงการลูกค้าปลายทางหรือไม่
    endCustomerProject?: EndCustomerProject;   // ข้อมูลโครงการลูกค้าปลายทาง
    showEndCustomerInPdf?: boolean;            // แสดงข้อมูลโครงการลูกค้าปลายทางใน PDF หรือไม่
}

// Tax Invoice Item - รายการสินค้า/บริการในใบกำกับภาษี
export interface TaxInvoiceItem {
    description: string;        // รายละเอียดสินค้า/บริการ
    quantity: number;           // จำนวน
    unit: string;               // หน่วย (เช่น ชิ้น, ชั่วโมง, งาน)
    unitPrice: number;          // ราคาต่อหน่วย
    amount: number;            // จำนวนเงิน (quantity * unitPrice)
    notes?: string;             // หมายเหตุเพิ่มเติม (optional)
}

// Tax Invoice Data - ข้อมูลใบกำกับภาษี
export interface TaxInvoiceData extends DocumentVerificationFields {
    logo: string | null;           // Base64 string หรือ URL ของโลโก้
    logoUrl?: string | null;       // URL จาก Firebase Storage (สำหรับบันทึกใน Firestore)
    logoType?: LogoType;           // ประเภทของโลโก้
    
    // ข้อมูลบริษัทผู้ขาย
    companyName: string;            // ชื่อบริษัทผู้ขาย
    companyAddress: string;         // ที่อยู่บริษัทผู้ขาย
    companyPhone: string;          // เบอร์โทรศัพท์บริษัทผู้ขาย
    companyEmail?: string;         // อีเมลบริษัทผู้ขาย (optional)
    companyWebsite?: string;      // เว็บไซต์บริษัทผู้ขาย (optional)
    companyTaxId?: string;         // เลขประจำตัวผู้เสียภาษี (optional)
    companyBranchCode?: string;    // รหัสสาขา (optional) - ตามประกาศอธิบดีกรมสรรพากร ฉบับที่ 200
    companyBranchName?: string;    // ชื่อสาขา (optional)
    
    // ข้อมูลลูกค้า/ผู้ซื้อ
    customerName: string;           // ชื่อลูกค้า/บริษัทผู้ซื้อ
    customerAddress: string;       // ที่อยู่ลูกค้า
    customerPhone?: string;         // เบอร์โทรศัพท์ลูกค้า (optional)
    customerEmail?: string;         // อีเมลลูกค้า (optional)
    customerTaxId?: string;        // เลขประจำตัวผู้เสียภาษีลูกค้า (optional)
    customerBranchCode?: string;   // รหัสสาขาลูกค้า (optional)
    customerBranchName?: string;   // ชื่อสาขาลูกค้า (optional)
    
    // ข้อมูลเอกสาร
    taxInvoiceNumber: string;          // เลขที่ใบกำกับภาษี
    taxInvoiceDate: Date | null;       // วันที่ออกใบกำกับภาษี
    referenceNumber?: string;        // เลขที่อ้างอิง (เช่น เลขที่ใบแจ้งหนี้) (optional)
    
    // รายการสินค้า/บริการ
    items: TaxInvoiceItem[];           // รายการสินค้า/บริการ
    
    // ข้อมูลการชำระเงิน
    subtotal: number;               // ยอดรวมก่อนภาษี
    taxRate: number;                // อัตราภาษีมูลค่าเพิ่ม (%) (เช่น 7)
    taxAmount: number;              // จำนวนภาษีมูลค่าเพิ่ม
    discount: number;               // ส่วนลด (optional, default 0)
    total: number;                  // ยอดรวมทั้งสิ้น (subtotal + taxAmount - discount)
    
    // ข้อมูลการรับเงิน
    paymentMethod?: string;         // วิธีการชำระเงิน (เช่น เงินสด, โอนเงิน, เช็ค) (optional)
    paidAmount: number;             // จำนวนเงินที่รับ (default = total)
    changeAmount: number;           // เงินทอน (paidAmount - total)
    
    // ข้อมูลเพิ่มเติม
    notes?: string;                 // หมายเหตุเพิ่มเติม (optional)
    issuedBy?: string;             // ผู้ออกเอกสาร (optional)
    
    // ข้อมูลโครงการลูกค้าปลายทาง (End Customer Project)
    hasEndCustomerProject?: boolean;           // มีโครงการลูกค้าปลายทางหรือไม่
    endCustomerProject?: EndCustomerProject;   // ข้อมูลโครงการลูกค้าปลายทาง
    showEndCustomerInPdf?: boolean;            // แสดงข้อมูลโครงการลูกค้าปลายทางใน PDF หรือไม่
}

// Quotation Item - รายการสินค้า/บริการในใบเสนอราคา
export interface QuotationItem {
    description: string;        // รายละเอียดสินค้า/บริการ
    quantity: number;           // จำนวน
    unit: string;               // หน่วย (เช่น ชิ้น, ชั่วโมง, งาน)
    unitPrice: number;          // ราคาต่อหน่วย
    amount: number;            // จำนวนเงิน (quantity * unitPrice)
    notes?: string;             // หมายเหตุเพิ่มเติม (optional)
}

// Quotation Data - ข้อมูลใบเสนอราคา
export interface QuotationData extends DocumentVerificationFields {
    logo: string | null;           // Base64 string หรือ URL ของโลโก้
    logoUrl?: string | null;       // URL จาก Firebase Storage (สำหรับบันทึกใน Firestore)
    logoType?: LogoType;           // ประเภทของโลโก้
    
    // ข้อมูลบริษัทผู้เสนอราคา
    companyName: string;            // ชื่อบริษัทผู้เสนอราคา
    companyAddress: string;         // ที่อยู่บริษัทผู้เสนอราคา
    companyPhone: string;          // เบอร์โทรศัพท์บริษัทผู้เสนอราคา
    companyEmail?: string;         // อีเมลบริษัทผู้เสนอราคา (optional)
    companyWebsite?: string;      // เว็บไซต์บริษัทผู้เสนอราคา (optional)
    companyTaxId?: string;         // เลขประจำตัวผู้เสียภาษี (optional)
    companyBranchCode?: string;    // รหัสสาขา (optional) - ตามประกาศอธิบดีกรมสรรพากร ฉบับที่ 200
    companyBranchName?: string;    // ชื่อสาขา (optional)
    
    // ข้อมูลลูกค้า/ผู้รับเสนอราคา
    customerName: string;           // ชื่อลูกค้า/บริษัทผู้รับเสนอราคา
    customerAddress: string;       // ที่อยู่ลูกค้า
    customerPhone?: string;         // เบอร์โทรศัพท์ลูกค้า (optional)
    customerEmail?: string;         // อีเมลลูกค้า (optional)
    customerTaxId?: string;        // เลขประจำตัวผู้เสียภาษีลูกค้า (optional)
    customerBranchCode?: string;   // รหัสสาขาลูกค้า (optional)
    customerBranchName?: string;   // ชื่อสาขาลูกค้า (optional)
    
    // ข้อมูลเอกสาร
    quotationNumber: string;          // เลขที่ใบเสนอราคา
    quotationDate: Date | null;       // วันที่ออกใบเสนอราคา
    validUntilDate: Date | null;      // วันที่หมดอายุใบเสนอราคา (optional)
    referenceNumber?: string;        // เลขที่อ้างอิง (optional)
    
    // รายการสินค้า/บริการ
    items: QuotationItem[];           // รายการสินค้า/บริการ
    
    // ข้อมูลการเสนอราคา
    subtotal: number;               // ยอดรวมก่อนภาษี
    taxRate: number;                // อัตราภาษีมูลค่าเพิ่ม (%) (เช่น 7)
    taxAmount: number;              // จำนวนภาษีมูลค่าเพิ่ม
    discount: number;               // ส่วนลด (optional, default 0)
    total: number;                  // ยอดรวมทั้งสิ้น (subtotal + taxAmount - discount)
    
    // ข้อมูลเพิ่มเติม
    paymentTerms?: string;          // เงื่อนไขการชำระเงิน (optional)
    deliveryTerms?: string;          // เงื่อนไขการส่งมอบ (optional)
    notes?: string;                 // หมายเหตุเพิ่มเติม (optional)
    issuedBy?: string;             // ผู้ออกเอกสาร (optional)
    
    // ข้อมูลโครงการลูกค้าปลายทาง (End Customer Project)
    hasEndCustomerProject?: boolean;           // มีโครงการลูกค้าปลายทางหรือไม่
    endCustomerProject?: EndCustomerProject;   // ข้อมูลโครงการลูกค้าปลายทาง
    showEndCustomerInPdf?: boolean;            // แสดงข้อมูลโครงการลูกค้าปลายทางใน PDF หรือไม่
}

// Purchase Order Item - รายการสินค้า/บริการในใบสั่งซื้อ
export interface PurchaseOrderItem {
    description: string;        // รายละเอียดสินค้า/บริการ
    quantity: number;           // จำนวน
    unit: string;               // หน่วย (เช่น ชิ้น, ชั่วโมง, งาน)
    unitPrice: number;          // ราคาต่อหน่วย
    amount: number;            // จำนวนเงิน (quantity * unitPrice)
    notes?: string;             // หมายเหตุเพิ่มเติม (optional)
}

// Purchase Order Data - ข้อมูลใบสั่งซื้อ
export interface PurchaseOrderData extends DocumentVerificationFields {
    logo: string | null;           // Base64 string หรือ URL ของโลโก้
    logoUrl?: string | null;       // URL จาก Firebase Storage (สำหรับบันทึกใน Firestore)
    logoType?: LogoType;           // ประเภทของโลโก้
    
    // ข้อมูลบริษัทผู้สั่งซื้อ
    companyName: string;            // ชื่อบริษัทผู้สั่งซื้อ
    companyAddress: string;         // ที่อยู่บริษัทผู้สั่งซื้อ
    companyPhone: string;          // เบอร์โทรศัพท์บริษัทผู้สั่งซื้อ
    companyEmail?: string;         // อีเมลบริษัทผู้สั่งซื้อ (optional)
    companyWebsite?: string;      // เว็บไซต์บริษัทผู้สั่งซื้อ (optional)
    companyTaxId?: string;         // เลขประจำตัวผู้เสียภาษี (optional)
    companyBranchCode?: string;    // รหัสสาขา (optional) - ตามประกาศอธิบดีกรมสรรพากร ฉบับที่ 200
    companyBranchName?: string;    // ชื่อสาขา (optional)
    
    // ข้อมูลผู้ขาย/ผู้จำหน่าย
    supplierName: string;           // ชื่อผู้ขาย/บริษัทผู้จำหน่าย
    supplierAddress: string;       // ที่อยู่ผู้ขาย
    supplierPhone?: string;         // เบอร์โทรศัพท์ผู้ขาย (optional)
    supplierEmail?: string;         // อีเมลผู้ขาย (optional)
    supplierTaxId?: string;        // เลขประจำตัวผู้เสียภาษีผู้ขาย (optional)
    supplierBranchCode?: string;   // รหัสสาขาผู้ขาย (optional)
    supplierBranchName?: string;   // ชื่อสาขาผู้ขาย (optional)
    
    // ข้อมูลเอกสาร
    purchaseOrderNumber: string;          // เลขที่ใบสั่งซื้อ
    purchaseOrderDate: Date | null;       // วันที่ออกใบสั่งซื้อ
    expectedDeliveryDate: Date | null;    // วันที่ต้องการรับสินค้า (optional)
    referenceNumber?: string;        // เลขที่อ้างอิง (optional)
    
    // รายการสินค้า/บริการ
    items: PurchaseOrderItem[];           // รายการสินค้า/บริการ
    
    // ข้อมูลการสั่งซื้อ
    subtotal: number;               // ยอดรวมก่อนภาษี
    taxRate: number;                // อัตราภาษีมูลค่าเพิ่ม (%) (เช่น 7)
    taxAmount: number;              // จำนวนภาษีมูลค่าเพิ่ม
    discount: number;               // ส่วนลด (optional, default 0)
    total: number;                  // ยอดรวมทั้งสิ้น (subtotal + taxAmount - discount)
    
    // ข้อมูลเพิ่มเติม
    paymentTerms?: string;          // เงื่อนไขการชำระเงิน (optional)
    deliveryTerms?: string;          // เงื่อนไขการส่งมอบ (optional)
    notes?: string;                 // หมายเหตุเพิ่มเติม (optional)
    issuedBy?: string;             // ผู้ออกเอกสาร (optional)
    
    // ข้อมูลโครงการลูกค้าปลายทาง (End Customer Project)
    hasEndCustomerProject?: boolean;           // มีโครงการลูกค้าปลายทางหรือไม่
    endCustomerProject?: EndCustomerProject;   // ข้อมูลโครงการลูกค้าปลายทาง
    showEndCustomerInPdf?: boolean;            // แสดงข้อมูลโครงการลูกค้าปลายทางใน PDF หรือไม่
}

// Memo Data - ข้อมูลใบบันทึก (Memo)
export interface MemoData extends DocumentVerificationFields {
    logo: string | null;           // Base64 string หรือ URL ของโลโก้
    logoUrl?: string | null;       // URL จาก Firebase Storage (สำหรับบันทึกใน Firestore)
    logoType?: LogoType;           // ประเภทของโลโก้
    
    // ข้อมูลบริษัทผู้ออกเอกสาร
    companyName: string;            // ชื่อบริษัทผู้ออกเอกสาร
    companyAddress: string;         // ที่อยู่บริษัทผู้ออกเอกสาร
    companyPhone: string;           // เบอร์โทรศัพท์บริษัทผู้ออกเอกสาร
    companyEmail?: string;         // อีเมลบริษัทผู้ออกเอกสาร (optional)
    companyWebsite?: string;        // เว็บไซต์บริษัทผู้ออกเอกสาร (optional)
    
    // ส่วนที่ 1: หัวกระดาษ (Header)
    memoNumber: string;             // เลขที่เอกสาร (Memo No.) เช่น MEMO-2025-101
    date: Date | null;             // วันที่ออกเอกสาร
    fromName: string;              // จาก (ชื่อ และ/หรือ ตำแหน่ง/ฝ่าย)
    fromPosition?: string;          // ตำแหน่ง/ฝ่าย (optional)
    toName: string;                 // ถึง (ชื่อผู้รับ)
    toPosition?: string;           // ตำแหน่งผู้รับ (optional)
    cc?: string;                    // สำเนาถึง (ถ้ามี) - รองรับหลายคนคั่นด้วย comma
    subject: string;                // เรื่อง (ต้องชัดเจน)
    
    // ส่วนที่ 2: การอ้างอิงโครงการ (Project Reference)
    projectName?: string;           // ชื่อโครงการ / ลูกค้า
    projectId?: string;             // รหัสโครงการ (ถ้ามี)
    referenceDocument?: string;     // อ้างอิงถึงเอกสารเดิม (เช่น "ตามใบเสนอราคาที่...")
    
    // ส่วนที่ 3: เนื้อหา (Body)
    purpose: string;               // วัตถุประสงค์ (เพื่อแจ้งให้ทราบ, เพื่อขออนุมัติ, เพื่อยืนยันคำสั่ง, เพื่อสั่งการ)
    details: string;                // รายละเอียด (เกิดอะไรขึ้น? มีอะไรเปลี่ยนแปลง? ข้อมูลคืออะไร?)
    reason?: string;                // เหตุผล (ทำไมถึงต้องทำ/เปลี่ยน)
    
    // ส่วนที่ 4: การดำเนินการ (Action)
    actionRequired: string;         // สิ่งที่ต้องดำเนินการ (เช่น "โปรดลงนามอนุมัติ", "โปรดตรวจสอบสต็อก")
    deadline?: Date | null;         // กำหนดเสร็จ (ต้องดำเนินการภายในวันไหน)
    contactPerson?: string;         // ผู้ประสานงาน (ชื่อ)
    contactPhone?: string;          // เบอร์โทรผู้ประสานงาน
    
    // ส่วนที่ 5: การลงนาม (Signature)
    issuedByName: string;          // ชื่อ-นามสกุลผู้ออก Memo
    issuedByPosition: string;       // ตำแหน่งผู้ออก Memo
    
    // ส่วนสำหรับผู้รับ (ถ้าจำเป็นต้องมีการตอบกลับ)
    requireResponse?: boolean;      // ต้องการการตอบกลับหรือไม่
    responseReceived?: boolean;     // ได้รับการตอบกลับแล้วหรือไม่
    responseStatus?: 'acknowledged' | 'approved' | 'rejected';  // สถานะการตอบกลับ
    responseReason?: string;        // เหตุผล (ถ้าไม่อนุมัติ)
    responseName?: string;          // ชื่อผู้รับทราบ/อนุมัติ
    responseDate?: Date | null;     // วันที่รับทราบ/อนุมัติ
}

// Variation Order Item - รายการงานใหม่/งานเดิมในใบส่วนต่าง
export interface VariationOrderItem {
    description: string;        // รายละเอียดงาน
    quantity: number;           // จำนวน
    unit: string;               // หน่วย (เช่น ตร.ม., ชิ้น, งาน)
    unitPrice: number;          // ราคาต่อหน่วย
    amount: number;            // จำนวนเงิน (quantity * unitPrice)
    itemType: 'new' | 'deduct'; // ประเภท: งานใหม่/งานเพิ่ม หรือ งานเดิม/งานลด
    notes?: string;             // หมายเหตุเพิ่มเติม (optional)
}

// Variation Order Data - ข้อมูลใบส่วนต่าง (Variation Order)
export interface VariationOrderData extends DocumentVerificationFields {
    logo: string | null;           // Base64 string หรือ URL ของโลโก้
    logoUrl?: string | null;       // URL จาก Firebase Storage (สำหรับบันทึกใน Firestore)
    logoType?: LogoType;           // ประเภทของโลโก้
    
    // ข้อมูลบริษัทผู้ออกเอกสาร
    companyName: string;            // ชื่อบริษัทผู้ออกเอกสาร
    companyAddress: string;         // ที่อยู่บริษัทผู้ออกเอกสาร
    companyPhone: string;          // เบอร์โทรศัพท์บริษัทผู้ออกเอกสาร
    companyEmail?: string;         // อีเมลบริษัทผู้ออกเอกสาร (optional)
    companyWebsite?: string;       // เว็บไซต์บริษัทผู้ออกเอกสาร (optional)
    companyTaxId?: string;         // เลขประจำตัวผู้เสียภาษี (optional)
    companyBranchCode?: string;    // รหัสสาขา (optional) - ตามประกาศอธิบดีกรมสรรพากร ฉบับที่ 200
    companyBranchName?: string;    // ชื่อสาขา (optional)
    
    // ข้อมูลลูกค้า/โครงการ
    customerName: string;           // ชื่อลูกค้า/บริษัท
    customerAddress: string;        // ที่อยู่ลูกค้า/โครงการ
    customerPhone?: string;         // เบอร์โทรศัพท์ลูกค้า (optional)
    customerEmail?: string;         // อีเมลลูกค้า (optional)
    customerTaxId?: string;        // เลขประจำตัวผู้เสียภาษีลูกค้า (optional)
    customerBranchCode?: string;   // รหัสสาขาลูกค้า (optional)
    customerBranchName?: string;   // ชื่อสาขาลูกค้า (optional)
    
    // ส่วนหัวและข้อมูลอ้างอิง
    voNumber: string;               // เลขที่เอกสาร (VO No.) เช่น VO-001
    date: Date | null;              // วันที่ออกเอกสาร
    projectName: string;           // โครงการ / ลูกค้า
    location: string;              // สถานที่
    contractNumber?: string;       // อ้างอิงสัญญาเลขที่ (optional)
    requestedBy: 'customer' | 'company' | 'designer'; // ผู้ร้องขอ
    
    // รายละเอียดการเปลี่ยนแปลง
    subject: string;                // เรื่อง (เช่น "ขอเปลี่ยนแปลงสเปคกระเบื้องห้องน้ำชั้น 2")
    originalScope: string;          // รายละเอียดงานเดิม (Original Scope / Spec)
    newScope: string;               // รายละเอียดงานใหม่ (New Scope / Spec)
    reasonForChange: string;       // เหตุผลในการเปลี่ยนแปลง
    
    // รายการงาน (แยกเป็นงานใหม่/งานเดิม)
    items: VariationOrderItem[];    // รายการงาน
    
    // สรุปผลกระทบด้านราคา (Cost Impact)
    newItemsSubtotal: number;       // ยอดรวมงานใหม่/งานเพิ่ม
    deductItemsSubtotal: number;    // ยอดรวมงานเดิม/งานลด
    netDifference: number;          // ยอดรวมส่วนต่าง (สุทธิ)
    taxRate: number;                // อัตราภาษีมูลค่าเพิ่ม (%) (เช่น 7)
    taxAmount: number;              // จำนวนภาษีมูลค่าเพิ่ม
    totalAmount: number;            // ยอดรวมที่ต้องชำระเพิ่ม/หัก
    paymentNote?: string;           // หมายเหตุการชำระเงิน (เช่น "หักจากงวดที่ 10")
    
    // สรุปผลกระทบด้านระยะเวลา (Time Impact)
    hasTimeImpact: boolean;          // มีผลกระทบต่อระยะเวลาหรือไม่
    timeImpactDays?: number;        // จำนวนวันที่ขยายออกไป (วันทำการ)
    timeImpactReason?: string;      // เหตุผล (ถ้ามีผลกระทบ)
    
    // ส่วนอนุมัติ
    terms?: string;                 // เงื่อนไข (เช่น "ราคานี้มีผลยืนยันภายใน 7 วัน")
    customerApproverName?: string;  // ชื่อผู้อนุมัติ (ลูกค้า)
    customerApproverDate?: Date | null; // วันที่อนุมัติ (ลูกค้า)
    companyApproverName?: string;   // ชื่อผู้เสนอ (บริษัท)
    companyApproverDate?: Date | null; // วันที่เสนอ (บริษัท)
    
    // ข้อมูลเพิ่มเติม
    notes?: string;                 // หมายเหตุเพิ่มเติม (optional)
    issuedBy?: string;              // ผู้ออกเอกสาร (optional)
    
    // ข้อมูลโครงการลูกค้าปลายทาง (End Customer Project)
    hasEndCustomerProject?: boolean;           // มีโครงการลูกค้าปลายทางหรือไม่
    endCustomerProject?: EndCustomerProject;   // ข้อมูลโครงการลูกค้าปลายทาง
    showEndCustomerInPdf?: boolean;            // แสดงข้อมูลโครงการลูกค้าปลายทางใน PDF หรือไม่
}

// ============================================================
// ระบบตั้งค่าเมนู (Menu Settings System)
// ============================================================

// ประเภทเอกสารที่รองรับ (Document Types)
export type MenuDocType = 
    | 'delivery'        // ใบส่งมอบงาน
    | 'warranty'        // ใบรับประกัน
    | 'invoice'         // ใบแจ้งหนี้
    | 'receipt'         // ใบเสร็จ
    | 'tax-invoice'     // ใบกำกับภาษี
    | 'quotation'       // ใบเสนอราคา
    | 'purchase-order'  // ใบสั่งซื้อ
    | 'memo'            // บันทึก
    | 'variation-order' // ใบส่วนต่าง
    | 'subcontract';    // สัญญาจ้างเหมาช่วง

// ข้อมูลเมนูแต่ละรายการ
export interface MenuItemConfig {
    id: MenuDocType;        // ID ของเมนู (ตรงกับ DocType)
    label: string;          // ชื่อเมนูที่แสดง
    shortLabel: string;     // ชื่อย่อ (สำหรับ mobile)
    icon: string;           // ชื่อ icon (lucide-react)
    visible: boolean;       // แสดงเมนูนี้หรือไม่
    order: number;          // ลำดับการแสดง (0 = แรกสุด)
}

// การตั้งค่าเมนูตาม Role
export interface RoleMenuSettings {
    role: UserRole;                     // บทบาท (admin หรือ member)
    menus: MenuItemConfig[];            // รายการเมนูพร้อมการตั้งค่า
}

// การตั้งค่าเมนูของบริษัท
export interface CompanyMenuSettings {
    id?: string;                        // Document ID
    companyId: string;                  // ID ของบริษัท
    settings: RoleMenuSettings[];       // การตั้งค่าแยกตาม role
    createdAt?: Date;
    updatedAt?: Date;
    updatedBy?: string;                 // User ID ของผู้อัปเดตล่าสุด
}

// Default Menu Configuration - เมนูทั้งหมดที่มีในระบบ
export const DEFAULT_MENU_CONFIG: MenuItemConfig[] = [
    { id: 'delivery', label: 'ส่งมอบงาน', shortLabel: 'ส่งมอบ', icon: 'Package', visible: true, order: 0 },
    { id: 'warranty', label: 'รับประกัน', shortLabel: 'รับประกัน', icon: 'Shield', visible: true, order: 1 },
    { id: 'invoice', label: 'แจ้งหนี้', shortLabel: 'แจ้งหนี้', icon: 'FileText', visible: true, order: 2 },
    { id: 'receipt', label: 'ใบเสร็จ', shortLabel: 'ใบเสร็จ', icon: 'Receipt', visible: true, order: 3 },
    { id: 'tax-invoice', label: 'กำกับภาษี', shortLabel: 'กำกับภาษี', icon: 'FileCheck', visible: true, order: 4 },
    { id: 'quotation', label: 'เสนอราคา', shortLabel: 'เสนอราคา', icon: 'DollarSign', visible: true, order: 5 },
    { id: 'purchase-order', label: 'สั่งซื้อ', shortLabel: 'สั่งซื้อ', icon: 'ShoppingCart', visible: true, order: 6 },
    { id: 'memo', label: 'บันทึก', shortLabel: 'บันทึก', icon: 'StickyNote', visible: true, order: 7 },
    { id: 'variation-order', label: 'ส่วนต่าง', shortLabel: 'ส่วนต่าง', icon: 'PlusCircle', visible: true, order: 8 },
    { id: 'subcontract', label: 'สัญญาช่าง', shortLabel: 'สัญญาช่าง', icon: 'HardHat', visible: true, order: 9 },
];

// ============================================================
// การตั้งค่า Tab Menu (ViewMode Tabs)
// ============================================================

// ประเภท Tab ที่มีในระบบ
export type TabType = 'dashboard' | 'form' | 'history' | 'crm' | 'reports' | 'calendar' | 'activityLog';

// ข้อมูล Tab แต่ละรายการ
export interface TabConfig {
    id: TabType;            // ID ของ Tab
    label: string;          // ชื่อ Tab ที่แสดง
    shortLabel: string;     // ชื่อย่อ (สำหรับ mobile)
    icon: string;           // ชื่อ icon (lucide-react)
    visible: boolean;       // แสดง Tab นี้หรือไม่
    order: number;          // ลำดับการแสดง
    adminOnly?: boolean;    // เฉพาะ Admin เท่านั้น
}

// Default Tab Configuration - Tab ทั้งหมดที่มีในระบบ
export const DEFAULT_TAB_CONFIG: TabConfig[] = [
    { id: 'dashboard', label: 'Dashboard', shortLabel: 'แดช', icon: 'LayoutDashboard', visible: true, order: 0, adminOnly: false },
    { id: 'form', label: 'สร้างเอกสาร', shortLabel: 'สร้าง', icon: 'FilePlus', visible: true, order: 1, adminOnly: false },
    { id: 'history', label: 'ประวัติเอกสาร', shortLabel: 'ประวัติ', icon: 'History', visible: true, order: 2, adminOnly: false },
    { id: 'crm', label: 'CRM', shortLabel: 'CRM', icon: 'Users', visible: true, order: 3, adminOnly: false },
    { id: 'reports', label: 'รายงาน', shortLabel: 'รายงาน', icon: 'BarChart2', visible: true, order: 4, adminOnly: true },
    { id: 'calendar', label: 'ปฏิทิน', shortLabel: 'ปฏิทิน', icon: 'Calendar', visible: true, order: 5, adminOnly: false },
    { id: 'activityLog', label: 'Activity Log', shortLabel: 'Log', icon: 'ClipboardList', visible: true, order: 6, adminOnly: false },
];

// การตั้งค่า Tab ตาม Role
export interface RoleTabSettings {
    role: UserRole;                     // บทบาท (admin หรือ member)
    tabs: TabConfig[];                  // รายการ Tab พร้อมการตั้งค่า
}

// การตั้งค่า Tab ของบริษัท
export interface CompanyTabSettings {
    id?: string;                        // Document ID
    companyId: string;                  // ID ของบริษัท
    settings: RoleTabSettings[];        // การตั้งค่าแยกตาม role
    createdAt?: Date;
    updatedAt?: Date;
    updatedBy?: string;                 // User ID ของผู้อัปเดตล่าสุด
}

// การตั้งค่า Tab สำหรับ user แต่ละคน
export interface UserTabSettings {
    id?: string;                        // Document ID (format: {companyId}_{userId}_tabs)
    companyId: string;                  // ID ของบริษัท
    userId: string;                     // User ID
    useCustomSettings: boolean;         // ใช้การตั้งค่าเฉพาะ user หรือใช้ค่าจาก role
    tabs: TabConfig[];                  // รายการ Tab พร้อมการตั้งค่า
    createdAt?: Date;
    updatedAt?: Date;
    updatedBy?: string;                 // User ID ของ Admin ที่อัปเดต
}

// ============================================================
// การตั้งค่าเมนูรายบุคคล (Per-User Menu Settings)
// ============================================================

// การตั้งค่าเมนูสำหรับ user แต่ละคน
export interface UserMenuSettings {
    id?: string;                        // Document ID (format: {companyId}_{userId})
    companyId: string;                  // ID ของบริษัท
    userId: string;                     // User ID ที่ถูกกำหนดสิทธิ์
    userEmail?: string;                 // Email ของ user (สำหรับแสดงผล)
    userDisplayName?: string;           // ชื่อของ user (สำหรับแสดงผล)
    useCustomSettings: boolean;         // ใช้การตั้งค่าเฉพาะ user หรือใช้ค่าจาก role
    menus: MenuItemConfig[];            // รายการเมนูพร้อมการตั้งค่า (ถ้า useCustomSettings = true)
    createdAt?: Date;
    updatedAt?: Date;
    updatedBy?: string;                 // User ID ของ Admin ที่อัปเดต
}

// ข้อมูลสมาชิกพร้อมการตั้งค่าเมนู (สำหรับแสดงในหน้าตั้งค่า)
export interface MemberWithMenuSettings {
    memberId: string;                   // ID ของ CompanyMember
    userId: string;                     // User ID
    email: string;                      // Email
    displayName?: string;               // ชื่อแสดง
    role: UserRole;                     // บทบาท (admin/member)
    status: MemberStatus;               // สถานะ
    hasCustomMenuSettings: boolean;     // มีการตั้งค่าเมนูเฉพาะหรือไม่
    menuSettings?: UserMenuSettings;    // การตั้งค่าเมนู (ถ้ามี)
}

// ข้อมูลคำเชิญเข้าองค์กร
export interface Invitation {
    id?: string;                   // Document ID
    companyId: string;             // ID ขององค์กรที่เชิญ
    companyName: string;           // ชื่อองค์กร (สำหรับแสดงในอีเมล)
    email: string;                 // อีเมลของผู้ถูกเชิญ
    role: UserRole;                // บทบาทที่จะได้รับ: admin หรือ member
    status: InvitationStatus;      // สถานะคำเชิญ
    invitedBy: string;             // User ID ของผู้เชิญ
    invitedByName?: string;        // ชื่อของผู้เชิญ (สำหรับแสดงในอีเมล)
    invitedByEmail?: string;       // อีเมลของผู้เชิญ
    token: string;                 // Token สำหรับยืนยันคำเชิญ (unique)
    expiresAt: Date;               // วันหมดอายุของคำเชิญ (เช่น 7 วัน)
    acceptedAt?: Date;             // วันที่ยอมรับคำเชิญ
    acceptedBy?: string;           // User ID ของผู้ยอมรับ (ถ้ามี)
    message?: string;              // ข้อความจากผู้เชิญ (optional)
    createdAt?: Date;
    updatedAt?: Date;
}

// Contractor - ข้อมูลช่าง/ผู้รับจ้าง (ลดการกรอกข้อมูลซ้ำ)
export interface Contractor {
    id?: string;
    companyId: string;             // ID ของบริษัทที่สร้างข้อมูลช่างนี้
    userId: string;                // User ที่สร้างข้อมูลช่างนี้
    
    // ข้อมูลช่างหลัก
    contractorName: string;        // ชื่อช่าง/หัวหน้าชุดช่าง
    contractorType: 'individual' | 'company';  // ประเภท: บุคคล หรือ นิติบุคคล
    
    // ข้อมูลติดต่อ
    phone: string;                 // เบอร์โทรศัพท์หลัก
    alternatePhone?: string;       // เบอร์สำรอง
    email?: string;                // อีเมล
    lineId?: string;               // Line ID
    
    // ที่อยู่
    address: string;               // ที่อยู่หลัก
    district?: string;             // ตำบล/แขวง
    amphoe?: string;               // อำเภอ/เขต
    province?: string;             // จังหวัด
    postalCode?: string;           // รหัสไปรษณีย์
    
    // ข้อมูลภาษี (สำหรับนิติบุคคล)
    idCard?: string;               // เลขบัตรประชาชน
    taxId?: string;                // เลขประจำตัวผู้เสียภาษี
    branchCode?: string;           // รหัสสาขา 5 หลัก (เช่น "00000" = สำนักงานใหญ่)
    branchName?: string;           // ชื่อสาขา (เช่น "สำนักงานใหญ่", "สาขาลาดพร้าว")
    
    // ข้อมูลความเชี่ยวชาญ
    specialties?: string[];        // ความเชี่ยวชาญ เช่น ['งานปูกระเบื้อง', 'งานไฟฟ้า', 'งานประปา']
    
    // Tags และหมายเหตุ
    tags?: string[];               // Tags สำหรับจัดกลุ่ม เช่น ['ช่างประจำ', 'ช่างเก่ง']
    notes?: string;                // หมายเหตุเพิ่มเติม
    
    // Metadata
    lastUsedAt?: Date;             // ใช้ล่าสุดเมื่อไร (สำหรับ sorting)
    usageCount?: number;           // จำนวนครั้งที่ใช้ (สำหรับ suggestion)
    createdAt?: Date;
    updatedAt?: Date;
}

// Subcontract Work Item - รายการงานในสัญญาจ้างเหมาช่วง
export interface SubcontractWorkItem {
    description: string;        // รายละเอียดงาน
    quantity: number;           // ปริมาณ
    unit: string;               // หน่วย (เช่น ตร.ม., ชิ้น, งาน)
    unitPrice: number;          // ราคาต่อหน่วย
    amount: number;             // จำนวนเงิน (quantity * unitPrice)
    notes?: string;             // หมายเหตุเพิ่มเติม (optional)
}

// Subcontract Payment Milestone - งวดงานในสัญญาจ้างเหมาช่วง
export interface SubcontractPaymentMilestone {
    milestone: number;          // งวดที่
    description: string;        // รายละเอียดงานที่ต้องแล้วเสร็จ
    percentage: number;         // % ของยอด
    amount: number;             // จำนวนเงิน (บาท)
}

// Subcontract Data - ข้อมูลสัญญาจ้างเหมาช่วง
export interface SubcontractData extends DocumentVerificationFields {
    logo: string | null;           // Base64 string หรือ URL ของโลโก้
    logoUrl?: string | null;       // URL จาก Firebase Storage (สำหรับบันทึกใน Firestore)
    logoType?: LogoType;           // ประเภทของโลโก้
    
    // ข้อมูลผู้ว่าจ้าง (บริษัท)
    companyName: string;            // ชื่อบริษัทผู้ว่าจ้าง
    companyAddress: string;         // ที่อยู่บริษัทผู้ว่าจ้าง
    companyPhone: string;           // เบอร์โทรศัพท์บริษัทผู้ว่าจ้าง
    companyEmail?: string;          // อีเมลบริษัทผู้ว่าจ้าง (optional)
    companyTaxId?: string;          // เลขประจำตัวผู้เสียภาษี (optional)
    companyBranchCode?: string;     // รหัสสาขา (optional) - ตามประกาศอธิบดีกรมสรรพากร ฉบับที่ 200
    companyBranchName?: string;     // ชื่อสาขา (optional)
    
    // ข้อมูลผู้รับจ้าง (ช่าง)
    contractorName: string;         // ชื่อช่าง/หัวหน้าชุดช่าง
    contractorIdCard?: string;      // เลขบัตรประชาชน/เลขผู้เสียภาษี
    contractorPhone: string;        // เบอร์โทรศัพท์
    contractorAddress?: string;     // ที่อยู่ผู้รับจ้าง (optional)
    contractorBranchCode?: string;  // รหัสสาขาผู้รับจ้าง (optional) - สำหรับผู้รับจ้างที่เป็นนิติบุคคล
    contractorBranchName?: string;  // ชื่อสาขาผู้รับจ้าง (optional)
    
    // ข้อมูลเอกสารและสถานที่
    contractNumber: string;         // เลขที่สัญญา
    contractDate: Date | null;      // วันที่ทำสัญญา
    contractLocation: string;       // ทำที่ (สถานที่ทำสัญญา)
    projectName: string;            // ชื่อโครงการ/บ้านลูกค้า
    projectLocation: string;        // สถานที่ก่อสร้าง
    
    // ข้อ 1: ลักษณะงานที่จ้าง (Scope of Work)
    scopeOfWork: string;            // รายละเอียดงานที่จ้าง
    items: SubcontractWorkItem[];   // รายการงาน
    materialNote?: string;          // หมายเหตุเรื่องวัสดุ (เช่น "ค่าวัสดุผู้ว่าจ้างเป็นผู้จัดหา")
    totalWorkAmount: number;        // รวมทั้งสิ้น (ค่าแรงและค่าวัสดุตามตกลง)
    
    // ข้อ 2: ระยะเวลาการทำงาน
    showWorkPeriod: boolean;        // แสดงข้อนี้หรือไม่
    startDate: Date | null;         // วันที่เริ่มทำงาน
    endDate: Date | null;           // วันที่แล้วเสร็จ
    
    // ข้อ 3: การชำระเงินและการแบ่งงวดงาน
    totalContractAmount: number;    // ค่าจ้างรวมทั้งสิ้น
    totalContractAmountText: string; // ค่าจ้างเป็นตัวอักษร
    paymentMilestones: SubcontractPaymentMilestone[]; // งวดงาน
    
    // ข้อ 4: เครื่องมือและวัสดุอุปกรณ์
    showToolsSection: boolean;      // แสดงข้อนี้หรือไม่
    consumableResponsibility: 'employer' | 'contractor'; // วัสดุสิ้นเปลืองใครรับผิดชอบ
    
    // ข้อ 5: มาตรฐานงานและการรับประกัน
    showWarrantySection: boolean;   // แสดงข้อนี้หรือไม่
    defectFixDays: number;          // แก้ไขภายในกี่วัน
    warrantyMonths: number;         // รับประกันผลงานกี่เดือน
    
    // ข้อ 6: การทิ้งงานและการปรับ
    showPenaltySection: boolean;    // แสดงข้อนี้หรือไม่
    abandonDays: number;            // ไม่เข้าทำงานติดต่อกันเกินกี่วัน
    penaltyPerDay: number;          // ปรับเป็นรายวัน วันละกี่บาท
    
    // ส่วนลงนาม
    employerSignName: string;       // ชื่อผู้ว่าจ้าง (ลงนาม)
    contractorSignName: string;     // ชื่อผู้รับจ้าง (ลงนาม)
    witnessName?: string;           // ชื่อพยาน (optional)
    
    // ข้อมูลเพิ่มเติม
    notes?: string;                 // หมายเหตุเพิ่มเติม (optional)
    issuedBy?: string;              // ผู้ออกเอกสาร (optional)
    
    // ข้อมูลโครงการลูกค้าปลายทาง (End Customer Project)
    hasEndCustomerProject?: boolean;           // มีโครงการลูกค้าปลายทางหรือไม่
    endCustomerProject?: EndCustomerProject;   // ข้อมูลโครงการลูกค้าปลายทาง
    showEndCustomerInPdf?: boolean;            // แสดงข้อมูลโครงการลูกค้าปลายทางใน PDF หรือไม่
}
