/**
 * Input Validation Constants และ Utility Functions
 * กำหนด maxLength, pattern, และ rules สำหรับ input fields ต่างๆ
 */

// =====================================================
// INPUT LENGTH LIMITS - กำหนดจำนวนตัวอักษรสูงสุด
// =====================================================
export const INPUT_LIMITS = {
    // ข้อมูลบริษัท
    companyName: 200,           // ชื่อบริษัท
    companyAddress: 500,        // ที่อยู่บริษัท
    taxId: 13,                  // เลขประจำตัวผู้เสียภาษี (13 หลัก)
    
    // ข้อมูลติดต่อ
    phone: 15,                  // เบอร์โทรศัพท์ (รองรับ +66, -, ช่องว่าง)
    email: 100,                 // อีเมล
    website: 200,               // เว็บไซต์
    fax: 15,                    // แฟกซ์
    
    // ข้อมูลลูกค้า/ผู้รับเหมา
    customerName: 200,          // ชื่อลูกค้า
    contactPerson: 100,         // ชื่อผู้ติดต่อ
    projectName: 200,           // ชื่อโครงการ
    projectAddress: 500,        // ที่อยู่โครงการ
    
    // ข้อมูลเอกสาร
    docNumber: 50,              // เลขที่เอกสาร
    referenceNumber: 50,        // เลขที่อ้างอิง
    contractNumber: 50,         // เลขที่สัญญา
    
    // รายละเอียดสินค้า/บริการ
    itemDescription: 500,       // รายละเอียดรายการ
    itemNotes: 300,             // หมายเหตุรายการ
    unit: 50,                   // หน่วย
    
    // หมายเหตุและเงื่อนไข
    notes: 1000,                // หมายเหตุทั่วไป
    terms: 2000,                // เงื่อนไขการชำระเงิน/เงื่อนไขอื่นๆ
    workScope: 2000,            // ขอบเขตงาน
    
    // ข้อมูลธนาคาร
    bankName: 100,              // ชื่อธนาคาร
    accountName: 200,           // ชื่อบัญชี
    accountNumber: 20,          // เลขที่บัญชี
    branch: 100,                // สาขา
    
    // ข้อมูลการรับประกัน
    warrantyPeriod: 50,         // ระยะเวลารับประกัน
    productName: 200,           // ชื่อสินค้า
    serialNumber: 100,          // หมายเลขซีเรียล
    modelNumber: 100,           // รุ่น
    
    // ข้อมูลผู้ลงนาม
    signerName: 100,            // ชื่อผู้ลงนาม
    signerPosition: 100,        // ตำแหน่งผู้ลงนาม
    witnessName: 100,           // ชื่อพยาน
    
    // ข้อมูลอื่นๆ
    location: 200,              // สถานที่
    reason: 500,                // เหตุผล
    shortText: 100,             // ข้อความสั้น
    longText: 2000,             // ข้อความยาว
} as const;

// =====================================================
// INPUT PATTERNS - รูปแบบการตรวจสอบ
// =====================================================
export const INPUT_PATTERNS = {
    // เบอร์โทรศัพท์ไทย (รองรับ 08x, 09x, 02x, 0x-xxx-xxxx, +66)
    phone: /^[0-9+\-\s()]{0,15}$/,
    phoneStrict: /^(\+66|0)[0-9]{8,9}$/,
    
    // เลขประจำตัวผู้เสียภาษี (13 หลัก)
    taxId: /^[0-9]{13}$/,
    taxIdPartial: /^[0-9]{0,13}$/,
    
    // อีเมล
    email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    
    // ตัวเลขเท่านั้น
    numbersOnly: /^[0-9]*$/,
    
    // ตัวเลขและทศนิยม (สำหรับราคา, จำนวน)
    decimal: /^[0-9]*\.?[0-9]*$/,
    
    // เลขที่บัญชีธนาคาร
    bankAccount: /^[0-9\-]{0,20}$/,
    
    // URL/Website
    website: /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/,
} as const;

// =====================================================
// NUMBER CONSTRAINTS - ขอบเขตตัวเลข
// =====================================================
export const NUMBER_LIMITS = {
    // จำนวน
    quantity: {
        min: 0,
        max: 999999999,      // 999 ล้าน
        step: 0.01,
    },
    
    // ราคา/จำนวนเงิน (บาท)
    price: {
        min: 0,
        max: 999999999999,   // 999,999 ล้าน (ล้านล้าน)
        step: 0.01,
    },
    
    // เปอร์เซ็นต์
    percentage: {
        min: 0,
        max: 100,
        step: 0.01,
    },
    
    // จำนวนวัน
    days: {
        min: 0,
        max: 9999,
        step: 1,
    },
    
    // ปี
    year: {
        min: 1,
        max: 100,
        step: 1,
    },
} as const;

// =====================================================
// HELPER FUNCTIONS - ฟังก์ชันช่วยเหลือ
// =====================================================

/**
 * ตรวจสอบว่าค่าไม่เกินความยาวที่กำหนด
 */
export const isWithinLimit = (value: string | undefined, limit: number): boolean => {
    if (!value) return true;
    return value.length <= limit;
};

/**
 * ตัดข้อความให้ไม่เกินความยาวที่กำหนด
 */
export const truncateToLimit = (value: string | undefined, limit: number): string => {
    if (!value) return '';
    return value.substring(0, limit);
};

/**
 * ตรวจสอบเบอร์โทรศัพท์
 */
export const isValidPhone = (phone: string): boolean => {
    if (!phone) return true; // ไม่บังคับกรอก
    return INPUT_PATTERNS.phone.test(phone);
};

/**
 * ตรวจสอบเลขประจำตัวผู้เสียภาษี
 */
export const isValidTaxId = (taxId: string): boolean => {
    if (!taxId) return true; // ไม่บังคับกรอก
    return INPUT_PATTERNS.taxId.test(taxId);
};

/**
 * ตรวจสอบอีเมล
 */
export const isValidEmail = (email: string): boolean => {
    if (!email) return true; // ไม่บังคับกรอก
    return INPUT_PATTERNS.email.test(email);
};

/**
 * ฟอร์แมตเบอร์โทรศัพท์ (เก็บเฉพาะตัวเลขและ +)
 */
export const formatPhone = (phone: string): string => {
    return phone.replace(/[^0-9+\-\s]/g, '');
};

/**
 * ฟอร์แมตเลขประจำตัวผู้เสียภาษี (เก็บเฉพาะตัวเลข)
 */
export const formatTaxId = (taxId: string): string => {
    return taxId.replace(/[^0-9]/g, '').substring(0, 13);
};

/**
 * ฟอร์แมตตัวเลขสำหรับ input (เก็บเฉพาะตัวเลขและจุดทศนิยม)
 */
export const formatNumberInput = (value: string): string => {
    // ลบตัวอักษรที่ไม่ใช่ตัวเลขและจุด
    let formatted = value.replace(/[^0-9.]/g, '');
    
    // ให้มีจุดทศนิยมได้แค่จุดเดียว
    const parts = formatted.split('.');
    if (parts.length > 2) {
        formatted = parts[0] + '.' + parts.slice(1).join('');
    }
    
    return formatted;
};

/**
 * ตรวจสอบว่าตัวเลขอยู่ในช่วงที่กำหนด
 */
export const isNumberInRange = (value: number, min: number, max: number): boolean => {
    return value >= min && value <= max;
};

/**
 * สร้าง props สำหรับ input ตัวเลขบนมือถือ
 * ใช้ inputMode="decimal" เพื่อแสดง keyboard ตัวเลขพร้อมจุดทศนิยม
 */
export const getNumericInputProps = (allowDecimal: boolean = true) => ({
    inputMode: (allowDecimal ? 'decimal' : 'numeric') as 'decimal' | 'numeric',
    pattern: allowDecimal ? '[0-9]*\\.?[0-9]*' : '[0-9]*',
});

/**
 * สร้าง props สำหรับ input เบอร์โทรศัพท์บนมือถือ
 */
export const getTelInputProps = () => ({
    type: 'tel' as const,
    inputMode: 'tel' as const,
    maxLength: INPUT_LIMITS.phone,
});

/**
 * สร้าง props สำหรับ input อีเมลบนมือถือ
 */
export const getEmailInputProps = () => ({
    type: 'email' as const,
    inputMode: 'email' as const,
    maxLength: INPUT_LIMITS.email,
});

// =====================================================
// COMMON INPUT PROPS - props ที่ใช้บ่อย
// =====================================================
export const COMMON_INPUT_PROPS = {
    // ข้อมูลบริษัท
    companyName: {
        maxLength: INPUT_LIMITS.companyName,
    },
    companyAddress: {
        maxLength: INPUT_LIMITS.companyAddress,
    },
    taxId: {
        maxLength: INPUT_LIMITS.taxId,
        inputMode: 'numeric' as const,
        pattern: '[0-9]*',
    },
    
    // ข้อมูลติดต่อ
    phone: {
        type: 'tel' as const,
        maxLength: INPUT_LIMITS.phone,
        inputMode: 'tel' as const,
    },
    email: {
        type: 'email' as const,
        maxLength: INPUT_LIMITS.email,
        inputMode: 'email' as const,
    },
    website: {
        type: 'url' as const,
        maxLength: INPUT_LIMITS.website,
        inputMode: 'url' as const,
    },
    
    // ข้อมูลลูกค้า
    customerName: {
        maxLength: INPUT_LIMITS.customerName,
    },
    contactPerson: {
        maxLength: INPUT_LIMITS.contactPerson,
    },
    projectName: {
        maxLength: INPUT_LIMITS.projectName,
    },
    projectAddress: {
        maxLength: INPUT_LIMITS.projectAddress,
    },
    
    // ข้อมูลเอกสาร
    docNumber: {
        maxLength: INPUT_LIMITS.docNumber,
    },
    referenceNumber: {
        maxLength: INPUT_LIMITS.referenceNumber,
    },
    
    // รายละเอียด
    itemDescription: {
        maxLength: INPUT_LIMITS.itemDescription,
    },
    unit: {
        maxLength: INPUT_LIMITS.unit,
    },
    notes: {
        maxLength: INPUT_LIMITS.notes,
    },
    terms: {
        maxLength: INPUT_LIMITS.terms,
    },
    
    // ตัวเลข (จำนวน)
    quantity: {
        type: 'number' as const,
        inputMode: 'decimal' as const,
        min: NUMBER_LIMITS.quantity.min,
        max: NUMBER_LIMITS.quantity.max,
        step: NUMBER_LIMITS.quantity.step,
    },
    
    // ตัวเลข (ราคา)
    price: {
        type: 'number' as const,
        inputMode: 'decimal' as const,
        min: NUMBER_LIMITS.price.min,
        max: NUMBER_LIMITS.price.max,
        step: NUMBER_LIMITS.price.step,
    },
    
    // ตัวเลข (เปอร์เซ็นต์)
    percentage: {
        type: 'number' as const,
        inputMode: 'decimal' as const,
        min: NUMBER_LIMITS.percentage.min,
        max: NUMBER_LIMITS.percentage.max,
        step: NUMBER_LIMITS.percentage.step,
    },
    
    // ข้อมูลธนาคาร
    bankName: {
        maxLength: INPUT_LIMITS.bankName,
    },
    accountName: {
        maxLength: INPUT_LIMITS.accountName,
    },
    accountNumber: {
        maxLength: INPUT_LIMITS.accountNumber,
        inputMode: 'numeric' as const,
        pattern: '[0-9\\-]*',
    },
    
    // ข้อมูลการรับประกัน
    productName: {
        maxLength: INPUT_LIMITS.productName,
    },
    serialNumber: {
        maxLength: INPUT_LIMITS.serialNumber,
    },
    modelNumber: {
        maxLength: INPUT_LIMITS.modelNumber,
    },
    
    // ผู้ลงนาม
    signerName: {
        maxLength: INPUT_LIMITS.signerName,
    },
    signerPosition: {
        maxLength: INPUT_LIMITS.signerPosition,
    },
} as const;
