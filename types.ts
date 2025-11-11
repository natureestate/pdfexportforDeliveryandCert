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

// บทบาทระดับระบบ (System-wide roles)
export type SystemRole = 'superadmin' | 'user';

// แผนการใช้งาน (Subscription Plan)
export type SubscriptionPlan = 'free' | 'basic' | 'premium' | 'enterprise';

// สถานะของแผนการใช้งาน
export type SubscriptionStatus = 'active' | 'expired' | 'suspended' | 'trial';

// โควตาการใช้งานของบริษัท
export interface CompanyQuota {
    // แผนการใช้งาน
    plan: SubscriptionPlan;                  // แผนที่ใช้งานอยู่
    status: SubscriptionStatus;              // สถานะแผน
    
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
    userId: string;            // Admin คนแรก (คนที่สร้างบริษัท)
    logoUrl?: string | null;   // โลโก้บริษัทปัจจุบัน (URL จาก Storage)
    logoType?: LogoType;       // ประเภทโลโก้
    defaultLogoUrl?: string | null;  // โลโก้ default ของแต่ละองค์กร (URL จาก Storage)
    memberCount?: number;      // จำนวนสมาชิกในองค์กร
    
    // Quota และ Subscription
    quotaId?: string;          // ID ของ quota document (reference to companyQuotas collection)
    quota?: CompanyQuota;      // ข้อมูล quota (ถ้าโหลดมาด้วย)
    
    createdAt?: Date;
    updatedAt?: Date;
}

export interface DeliveryNoteData {
    logo: string | null;          // Base64 string หรือ URL ของโลโก้
    logoUrl?: string | null;       // URL จาก Firebase Storage (สำหรับบันทึกใน Firestore)
    logoType?: LogoType;           // ประเภทของโลโก้
    fromCompany: string;
    fromAddress: string;
    fromPhone?: string;           // เบอร์โทรศัพท์ผู้ส่ง (optional)
    fromEmail?: string;            // อีเมลผู้ส่ง (optional)
    fromWebsite?: string;         // เว็บไซต์ผู้ส่ง (optional)
    toCompany: string;
    toAddress: string;
    toEmail?: string;              // อีเมลผู้รับ (optional)
    docNumber: string;
    date: Date | null;
    project: string;
    items: WorkItem[];
    senderName: string;
    receiverName: string;
}

export interface WarrantyData {
    logo: string | null;           // Base64 string หรือ URL ของโลโก้
    logoUrl?: string | null;       // URL จาก Firebase Storage (สำหรับบันทึกใน Firestore)
    logoType?: LogoType;           // ประเภทของโลโก้
    
    // ข้อมูลบริษัท
    companyName: string;
    companyAddress: string;
    companyPhone: string;          // เบอร์โทรบริษัท
    companyEmail?: string;         // อีเมลบริษัท (optional)
    companyWebsite?: string;      // เว็บไซต์บริษัท (optional)
    
    // ข้อมูลลูกค้า/โครงการ
    projectName: string;           // ชื่อโครงการ
    customerName: string;          // ชื่อลูกค้า
    customerPhone: string;         // เบอร์โทรลูกค้า
    customerAddress: string;       // ที่อยู่ลูกค้า/โครงการ
    customerEmail?: string;         // อีเมลลูกค้า (optional)
    
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
    
    // ข้อมูลภาษี
    taxId?: string;                // เลขประจำตัวผู้เสียภาษี (สำหรับนิติบุคคล)
    
    // Tags และหมายเหตุ
    tags?: string[];               // Tags สำหรับจัดกลุ่ม เช่น ['VIP', 'ลูกค้าประจำ']
    notes?: string;                // หมายเหตุเพิ่มเติม
    
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
export interface InvoiceData {
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
    
    // ข้อมูลลูกค้า/ผู้ซื้อ
    customerName: string;           // ชื่อลูกค้า/บริษัทผู้ซื้อ
    customerAddress: string;       // ที่อยู่ลูกค้า
    customerPhone?: string;         // เบอร์โทรศัพท์ลูกค้า (optional)
    customerEmail?: string;         // อีเมลลูกค้า (optional)
    customerTaxId?: string;        // เลขประจำตัวผู้เสียภาษีลูกค้า (optional)
    
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
export interface ReceiptData {
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
    
    // ข้อมูลลูกค้า/ผู้ซื้อ
    customerName: string;           // ชื่อลูกค้า/บริษัทผู้ซื้อ
    customerAddress: string;       // ที่อยู่ลูกค้า
    customerPhone?: string;         // เบอร์โทรศัพท์ลูกค้า (optional)
    customerEmail?: string;         // อีเมลลูกค้า (optional)
    customerTaxId?: string;        // เลขประจำตัวผู้เสียภาษีลูกค้า (optional)
    
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
export interface TaxInvoiceData {
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
    
    // ข้อมูลลูกค้า/ผู้ซื้อ
    customerName: string;           // ชื่อลูกค้า/บริษัทผู้ซื้อ
    customerAddress: string;       // ที่อยู่ลูกค้า
    customerPhone?: string;         // เบอร์โทรศัพท์ลูกค้า (optional)
    customerEmail?: string;         // อีเมลลูกค้า (optional)
    customerTaxId?: string;        // เลขประจำตัวผู้เสียภาษีลูกค้า (optional)
    
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
export interface QuotationData {
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
    
    // ข้อมูลลูกค้า/ผู้รับเสนอราคา
    customerName: string;           // ชื่อลูกค้า/บริษัทผู้รับเสนอราคา
    customerAddress: string;       // ที่อยู่ลูกค้า
    customerPhone?: string;         // เบอร์โทรศัพท์ลูกค้า (optional)
    customerEmail?: string;         // อีเมลลูกค้า (optional)
    customerTaxId?: string;        // เลขประจำตัวผู้เสียภาษีลูกค้า (optional)
    
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
export interface PurchaseOrderData {
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
    
    // ข้อมูลผู้ขาย/ผู้จำหน่าย
    supplierName: string;           // ชื่อผู้ขาย/บริษัทผู้จำหน่าย
    supplierAddress: string;       // ที่อยู่ผู้ขาย
    supplierPhone?: string;         // เบอร์โทรศัพท์ผู้ขาย (optional)
    supplierEmail?: string;         // อีเมลผู้ขาย (optional)
    supplierTaxId?: string;        // เลขประจำตัวผู้เสียภาษีผู้ขาย (optional)
    
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
}

// Memo Data - ข้อมูลใบบันทึก (Memo)
export interface MemoData {
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
