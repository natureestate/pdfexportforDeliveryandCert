// Document Number Service - บริการสำหรับ generate เลขที่เอกสารอัตโนมัติ
// รูปแบบ: prefix-YYMMDDXX (เช่น DN-25101001, WR-25101001)

import { 
    doc, 
    getDoc, 
    setDoc, 
    updateDoc, 
    runTransaction,
    Timestamp 
} from "firebase/firestore";
import { db, auth } from "../firebase.config";

// Collection สำหรับเก็บ running number
const DOC_NUMBERS_COLLECTION = "documentNumbers";

// ประเภทของเอกสาร
export type DocumentType = 'delivery' | 'warranty' | 'invoice' | 'receipt' | 'tax-invoice' | 'quotation' | 'purchase-order' | 'memo' | 'variation-order';

// Interface สำหรับ document number counter
interface DocumentNumberCounter {
    prefix: string;          // Prefix ของเอกสาร (เช่น DN, WR)
    date: string;            // วันที่ในรูปแบบ YYMMDD
    lastNumber: number;      // Running number สุดท้าย
    userId: string;          // User ID ของผู้สร้าง
    updatedAt: Date;         // เวลาที่อัปเดตล่าสุด
}

/**
 * สร้างรูปแบบวันที่ YYMMDD
 * @returns string - วันที่ในรูปแบบ YYMMDD
 */
const formatDateYYMMDD = (): string => {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yy}${mm}${dd}`;
};

/**
 * แปลงประเภทเอกสารเป็น prefix
 * @param type - ประเภทเอกสาร
 * @returns string - Prefix ของเอกสาร
 */
const getDocumentPrefix = (type: DocumentType): string => {
    switch (type) {
        case 'delivery':
            return 'DN'; // Delivery Note
        case 'warranty':
            return 'WR'; // Warranty
        case 'invoice':
            return 'IN'; // Invoice
        case 'receipt':
            return 'RC'; // Receipt
        case 'tax-invoice':
            return 'TI'; // Tax Invoice
        case 'quotation':
            return 'QT'; // Quotation
        case 'purchase-order':
            return 'PO'; // Purchase Order
        case 'memo':
            return 'MEMO'; // Memo
        case 'variation-order':
            return 'VO'; // Variation Order
        default:
            return 'DOC';
    }
};

/**
 * สร้าง Document ID สำหรับ counter (unique per user per day)
 * @param prefix - Prefix ของเอกสาร
 * @param date - วันที่ในรูปแบบ YYMMDD
 * @param userId - User ID
 * @returns string - Document ID
 */
const getCounterId = (prefix: string, date: string, userId: string): string => {
    return `${userId}_${prefix}_${date}`;
};

/**
 * สร้างเลขที่เอกสารใหม่อัตโนมัติ โดยใช้ Transaction เพื่อป้องกัน race condition
 * @param type - ประเภทเอกสาร
 * @param customPrefix - Prefix กำหนดเอง (optional) ถ้าไม่ระบุจะใช้ค่า default
 * @returns Promise<string> - เลขที่เอกสารที่สร้างใหม่
 * 
 * @example
 * const docNumber = await generateDocumentNumber('delivery'); // DN-25101001
 * const docNumber = await generateDocumentNumber('warranty', 'WRT'); // WRT-25101001
 */
export const generateDocumentNumber = async (
    type: DocumentType,
    customPrefix?: string
): Promise<string> => {
    try {
        // ตรวจสอบว่า user login แล้วหรือยัง
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error("กรุณา Login ก่อนสร้างเลขที่เอกสาร");
        }

        const prefix = customPrefix || getDocumentPrefix(type);
        const date = formatDateYYMMDD();
        const counterId = getCounterId(prefix, date, currentUser.uid);
        
        // ใช้ Transaction เพื่อป้องกัน race condition
        const newDocNumber = await runTransaction(db, async (transaction) => {
            const counterRef = doc(db, DOC_NUMBERS_COLLECTION, counterId);
            const counterDoc = await transaction.get(counterRef);

            let newNumber: number;

            if (!counterDoc.exists()) {
                // ถ้ายังไม่มี counter สำหรับวันนี้ ให้เริ่มที่ 1
                newNumber = 1;
                transaction.set(counterRef, {
                    prefix,
                    date,
                    lastNumber: newNumber,
                    userId: currentUser.uid,
                    createdAt: Timestamp.now(),
                    updatedAt: Timestamp.now(),
                });
            } else {
                // ถ้ามี counter แล้ว ให้เพิ่มค่าขึ้น 1
                const counterData = counterDoc.data() as DocumentNumberCounter;
                newNumber = counterData.lastNumber + 1;
                transaction.update(counterRef, {
                    lastNumber: newNumber,
                    updatedAt: Timestamp.now(),
                });
            }

            // สร้างเลขที่เอกสารในรูปแบบ prefix-YYMMDDXX
            const formattedNumber = String(newNumber).padStart(2, '0');
            return `${prefix}-${date}${formattedNumber}`;
        });

        console.log(`Generated document number: ${newDocNumber}`);
        return newDocNumber;

    } catch (error) {
        console.error("Error generating document number:", error);
        throw new Error("ไม่สามารถสร้างเลขที่เอกสารได้");
    }
};

/**
 * ดึงเลขที่เอกสารล่าสุด (สำหรับแสดงผลหรือตรวจสอบ)
 * @param type - ประเภทเอกสาร
 * @param customPrefix - Prefix กำหนดเอง (optional)
 * @returns Promise<string | null> - เลขที่เอกสารล่าสุด หรือ null ถ้ายังไม่มี
 */
export const getLastDocumentNumber = async (
    type: DocumentType,
    customPrefix?: string
): Promise<string | null> => {
    try {
        // ตรวจสอบว่า user login แล้วหรือยัง
        const currentUser = auth.currentUser;
        if (!currentUser) {
            return null;
        }

        const prefix = customPrefix || getDocumentPrefix(type);
        const date = formatDateYYMMDD();
        const counterId = getCounterId(prefix, date, currentUser.uid);
        
        const counterRef = doc(db, DOC_NUMBERS_COLLECTION, counterId);
        const counterDoc = await getDoc(counterRef);

        if (counterDoc.exists()) {
            const counterData = counterDoc.data() as DocumentNumberCounter;
            const formattedNumber = String(counterData.lastNumber).padStart(2, '0');
            return `${prefix}-${date}${formattedNumber}`;
        }

        return null;
    } catch (error) {
        console.error("Error getting last document number:", error);
        return null;
    }
};

/**
 * รีเซ็ต counter สำหรับวันใหม่ (เรียกใช้อัตโนมัติเมื่อเปลี่ยนวัน)
 * ไม่จำเป็นต้องเรียกใช้เอง เพราะระบบจะตรวจสอบวันที่อัตโนมัติ
 */
export const resetDailyCounter = async (
    type: DocumentType,
    customPrefix?: string
): Promise<void> => {
    try {
        // ตรวจสอบว่า user login แล้วหรือยัง
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error("กรุณา Login ก่อนรีเซ็ต counter");
        }

        const prefix = customPrefix || getDocumentPrefix(type);
        const date = formatDateYYMMDD();
        const counterId = getCounterId(prefix, date, currentUser.uid);
        
        const counterRef = doc(db, DOC_NUMBERS_COLLECTION, counterId);
        
        await setDoc(counterRef, {
            prefix,
            date,
            lastNumber: 0,
            userId: currentUser.uid,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        });

        console.log(`Reset counter for ${prefix}-${date}`);
    } catch (error) {
        console.error("Error resetting daily counter:", error);
        throw new Error("ไม่สามารถรีเซ็ต counter ได้");
    }
};

/**
 * ตรวจสอบว่าเลขที่เอกสารซ้ำหรือไม่ (optional - สำหรับการตรวจสอบเพิ่มเติม)
 * @param docNumber - เลขที่เอกสารที่ต้องการตรวจสอบ
 * @returns Promise<boolean> - true ถ้าเลขที่เอกสารไม่ซ้ำ, false ถ้าซ้ำ
 */
export const isDocumentNumberAvailable = async (docNumber: string): Promise<boolean> => {
    try {
        // ตรวจสอบว่า user login แล้วหรือยัง
        const currentUser = auth.currentUser;
        if (!currentUser) {
            return false;
        }

        // แยก prefix และ date จากเลขที่เอกสาร
        const parts = docNumber.split('-');
        if (parts.length !== 2) {
            return false;
        }

        const prefix = parts[0];
        const dateAndNumber = parts[1];
        const date = dateAndNumber.substring(0, 6);
        const number = parseInt(dateAndNumber.substring(6), 10);

        const counterId = getCounterId(prefix, date, currentUser.uid);
        const counterRef = doc(db, DOC_NUMBERS_COLLECTION, counterId);
        const counterDoc = await getDoc(counterRef);

        if (!counterDoc.exists()) {
            // ถ้ายังไม่มี counter ให้ถือว่าไม่ซ้ำ
            return true;
        }

        const counterData = counterDoc.data() as DocumentNumberCounter;
        // ถ้าเลขที่เอกสารมากกว่า lastNumber ให้ถือว่าไม่ซ้ำ
        return number > counterData.lastNumber;

    } catch (error) {
        console.error("Error checking document number availability:", error);
        return false;
    }
};

/**
 * สร้างเลขที่เอกสารแบบกำหนดเอง (Custom) โดยไม่ใช้ running number
 * @param prefix - Prefix ของเอกสาร
 * @param suffix - ส่วนท้ายของเอกสาร (optional)
 * @returns string - เลขที่เอกสารที่สร้างขึ้น
 * 
 * @example
 * const docNumber = generateCustomDocumentNumber('DN', '001'); // DN-251010001
 */
export const generateCustomDocumentNumber = (
    prefix: string,
    suffix?: string
): string => {
    const date = formatDateYYMMDD();
    return suffix ? `${prefix}-${date}${suffix}` : `${prefix}-${date}`;
};

