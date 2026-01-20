// Generic Document Service - บริการสำหรับจัดการเอกสารทุกประเภทใน Firestore
// ลด code duplication โดยใช้ Generic Functions และ Factory Pattern

import { 
    collection, 
    doc, 
    getDoc, 
    getDocs, 
    setDoc, 
    updateDoc, 
    query,
    where,
    orderBy,
    limit,
    Timestamp,
    QueryConstraint
} from "firebase/firestore";
import { db, auth } from "../firebase.config";
import { generateVerificationToken } from "./verification";

// Interface สำหรับ Document Data ที่มี logo และ logoUrl
interface DocumentDataWithLogo {
    logo?: string | null;
    logoUrl?: string | null;
    [key: string]: any;
}

// Interface สำหรับ Firestore Document
export interface FirestoreDocument {
    id?: string;
    createdAt?: Date;
    updatedAt?: Date;
    isDeleted?: boolean;
    deletedAt?: Date | null;
}

// Configuration สำหรับแต่ละ Document Type
export interface DocumentConfig<T extends DocumentDataWithLogo> {
    collection: string;                                    // ชื่อ collection
    prefix: string;                                        // Prefix สำหรับ document ID (เช่น 'DN', 'IN')
    documentNumberField: string;                           // Field name ที่เก็บ document number (เช่น 'docNumber', 'invoiceNumber')
    generateId: (docNumber: string) => string;             // Function สำหรับ generate document ID
    dateFields?: string[];                                // Fields ที่เป็น Date type (เช่น ['date'], ['invoiceDate', 'dueDate'])
    errorMessages: {
        save: string;                                      // Error message เมื่อ save ไม่สำเร็จ
        get: string;                                       // Error message เมื่อ get ไม่สำเร็จ
        getAll: string;                                    // Error message เมื่อ getAll ไม่สำเร็จ
        update: string;                                    // Error message เมื่อ update ไม่สำเร็จ
        delete: string;                                    // Error message เมื่อ delete ไม่สำเร็จ
        search: string;                                    // Error message เมื่อ search ไม่สำเร็จ
    };
}

/**
 * สร้าง Generic Document ID Generator
 * รูปแบบ: YYMMDD_PREFIX-XXXX
 */
export const createIdGenerator = (prefix: string): ((docNumber: string) => string) => {
    return (docNumber: string): string => {
        const now = new Date();
        const yy = String(now.getFullYear()).slice(-2);
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        
        // ลบ prefix ออกจาก docNumber ถ้ามี แล้วใส่กลับในรูปแบบที่ต้องการ
        const cleanDocNumber = docNumber.replace(new RegExp(`^${prefix}-`, 'i'), '');
        return `${yy}${mm}${dd}_${prefix}-${cleanDocNumber}`;
    };
};

/**
 * แปลง Date fields เป็น Timestamp สำหรับ Firestore
 */
const convertDatesToTimestamps = <T extends DocumentDataWithLogo>(
    data: T,
    dateFields?: string[]
): any => {
    if (!dateFields || dateFields.length === 0) {
        return data;
    }
    
    const converted = { ...data };
    dateFields.forEach(field => {
        if (converted[field] instanceof Date) {
            (converted as any)[field] = Timestamp.fromDate(converted[field] as Date);
        }
    });
    
    return converted;
};

/**
 * ลบ fields ที่มีค่า undefined ออกจาก object
 * Firebase ไม่รองรับค่า undefined ใน setDoc() และ updateDoc()
 */
const removeUndefinedFields = (obj: Record<string, any>): Record<string, any> => {
    const result: Record<string, any> = {};
    for (const key in obj) {
        if (obj[key] !== undefined) {
            // ถ้าเป็น object (แต่ไม่ใช่ Date, Timestamp, หรือ null) ให้ recursive
            if (obj[key] !== null && typeof obj[key] === 'object' && !(obj[key] instanceof Date) && !obj[key].toDate) {
                if (Array.isArray(obj[key])) {
                    // ถ้าเป็น array ให้ filter และ map
                    result[key] = obj[key].map((item: any) => 
                        typeof item === 'object' && item !== null ? removeUndefinedFields(item) : item
                    );
                } else {
                    // ถ้าเป็น object ให้ recursive
                    result[key] = removeUndefinedFields(obj[key]);
                }
            } else {
                result[key] = obj[key];
            }
        }
    }
    return result;
};

/**
 * แปลง Timestamp fields เป็น Date สำหรับ JavaScript
 */
const convertTimestampsToDates = <T extends DocumentDataWithLogo>(
    data: any,
    dateFields?: string[]
): T => {
    const converted = { ...data };
    
    // แปลง Timestamp fields ที่ระบุ
    if (dateFields && dateFields.length > 0) {
        dateFields.forEach(field => {
            if (converted[field]?.toDate) {
                converted[field] = converted[field].toDate();
            } else if (converted[field] === null || converted[field] === undefined) {
                converted[field] = null;
            }
        });
    }
    
    // แปลง standard fields
    if (converted.createdAt?.toDate) {
        converted.createdAt = converted.createdAt.toDate();
    }
    if (converted.updatedAt?.toDate) {
        converted.updatedAt = converted.updatedAt.toDate();
    }
    if (converted.deletedAt?.toDate) {
        converted.deletedAt = converted.deletedAt.toDate();
    } else if (converted.deletedAt === null || converted.deletedAt === undefined) {
        converted.deletedAt = null;
    }
    
    return converted as T;
};

/**
 * สร้าง Generic Document Service สำหรับ CRUD operations
 */
export const createDocumentService = <T extends DocumentDataWithLogo>(
    config: DocumentConfig<T>
) => {
    /**
     * บันทึกเอกสารใหม่ลง Firestore
     * - Auto-generate verification token สำหรับ QR Code
     * - ตั้งค่า documentStatus เป็น 'active' โดย default
     */
    const save = async (data: T, companyId?: string): Promise<string> => {
        try {
            const currentUser = auth.currentUser;
            if (!currentUser) {
                throw new Error("กรุณา Login ก่อนบันทึกข้อมูล");
            }
            
            // สร้าง Document ID
            const docNumber = data[config.documentNumberField] as string;
            const docId = config.generateId(docNumber);
            const docRef = doc(db, config.collection, docId);
            
            // สร้าง Verification Token ถ้ายังไม่มี (สำหรับ QR Code)
            const verificationToken = (data as any).verificationToken || generateVerificationToken();
            
            // เตรียมข้อมูลสำหรับบันทึก
            const rawDataToSave = {
                ...convertDatesToTimestamps(data, config.dateFields),
                // ถ้ามี logoUrl (อัปโหลดไปยัง Storage แล้ว) ให้ลบ Base64 ออก
                logo: data.logoUrl ? null : data.logo,
                userId: currentUser.uid,
                companyId: companyId || null,
                isDeleted: false,
                // Verification fields สำหรับ QR Code
                verificationToken: verificationToken,
                documentStatus: (data as any).documentStatus || 'active',
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            };
            
            // ลบ fields ที่มีค่า undefined ออก (Firebase ไม่รองรับ undefined)
            const dataToSave = removeUndefinedFields(rawDataToSave);
            
            await setDoc(docRef, dataToSave);
            console.log(`✅ [DocumentService] Saved with verification token: ${verificationToken.substring(0, 8)}...`);
            return docId;
        } catch (error) {
            console.error(`Error saving ${config.collection}:`, error);
            throw new Error(config.errorMessages.save);
        }
    };

    /**
     * ดึงข้อมูลเอกสารตาม ID
     */
    const get = async (id: string): Promise<(T & FirestoreDocument) | null> => {
        try {
            const docRef = doc(db, config.collection, id);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                const data = docSnap.data();
                // ถ้าเอกสารถูกลบ (soft delete) ให้ return null
                if (data.isDeleted) {
                    return null;
                }
                return {
                    id: docSnap.id,
                    ...convertTimestampsToDates<T>(data, config.dateFields),
                } as T & FirestoreDocument;
            }
            return null;
        } catch (error) {
            console.error(`Error getting ${config.collection}:`, error);
            throw new Error(config.errorMessages.get);
        }
    };

    /**
     * ดึงรายการเอกสารทั้งหมด (มีการ limit)
     */
    const getAll = async (limitCount: number = 50, companyId?: string): Promise<(T & FirestoreDocument)[]> => {
        try {
            const currentUser = auth.currentUser;
            if (!currentUser) {
                throw new Error("กรุณา Login ก่อนดูข้อมูล");
            }
            
            // สร้าง query constraints
            const constraints: QueryConstraint[] = [
                where("userId", "==", currentUser.uid),
            ];
            
            if (companyId) {
                constraints.push(where("companyId", "==", companyId));
            }
            
            constraints.push(where("isDeleted", "==", false));
            constraints.push(orderBy("createdAt", "desc"));
            constraints.push(limit(limitCount));
            
            const q = query(collection(db, config.collection), ...constraints);
            const querySnapshot = await getDocs(q);
            
            return querySnapshot.docs
                .map(doc => {
                    const data = doc.data();
                    if (data.isDeleted === true) {
                        return null;
                    }
                    return {
                        id: doc.id,
                        ...convertTimestampsToDates<T>(data, config.dateFields),
                    } as T & FirestoreDocument;
                })
                .filter((doc): doc is T & FirestoreDocument => doc !== null && !doc.isDeleted);
        } catch (error) {
            console.error(`Error getting ${config.collection} list:`, error);
            throw new Error(config.errorMessages.getAll);
        }
    };

    /**
     * อัปเดตเอกสาร
     */
    const update = async (id: string, data: Partial<T>): Promise<void> => {
        try {
            const currentUser = auth.currentUser;
            if (!currentUser) {
                throw new Error("กรุณา Login ก่อนอัปเดตข้อมูล");
            }

            const docRef = doc(db, config.collection, id);
            const docSnap = await getDoc(docRef);
            
            if (!docSnap.exists()) {
                throw new Error("ไม่พบเอกสารที่ต้องการอัปเดต");
            }

            const existingData = docSnap.data();
            
            // ตรวจสอบสิทธิ์: ต้องเป็นเจ้าของหรือเป็น Super Admin (ตรวจสอบที่ Firestore Rules)
            if (existingData.userId !== currentUser.uid && existingData.companyId == null) {
                throw new Error("คุณไม่มีสิทธิ์แก้ไขเอกสารนี้");
            }

            // เตรียมข้อมูลสำหรับอัปเดต
            const rawDataToUpdate: any = {
                ...convertDatesToTimestamps(data, config.dateFields),
                updatedAt: Timestamp.now(),
            };

            // จัดการ logo: ถ้ามี logoUrl ให้ลบ Base64 ออก
            if (data.logoUrl !== undefined) {
                rawDataToUpdate.logo = data.logoUrl ? null : data.logo;
            }
            
            // ลบ fields ที่มีค่า undefined ออก (Firebase ไม่รองรับ undefined)
            const dataToUpdate = removeUndefinedFields(rawDataToUpdate);

            await updateDoc(docRef, dataToUpdate);
        } catch (error) {
            console.error(`Error updating ${config.collection}:`, error);
            throw error instanceof Error ? error : new Error(config.errorMessages.update);
        }
    };

    /**
     * ลบเอกสาร (Soft Delete)
     */
    const deleteDoc = async (id: string): Promise<void> => {
        try {
            const currentUser = auth.currentUser;
            if (!currentUser) {
                throw new Error("กรุณา Login ก่อนลบข้อมูล");
            }

            const docRef = doc(db, config.collection, id);
            const docSnap = await getDoc(docRef);
            
            if (!docSnap.exists()) {
                throw new Error("ไม่พบเอกสารที่ต้องการลบ");
            }

            const existingData = docSnap.data();
            
            // ตรวจสอบสิทธิ์: ต้องเป็นเจ้าของหรือเป็น Super Admin (ตรวจสอบที่ Firestore Rules)
            if (existingData.userId !== currentUser.uid && existingData.companyId == null) {
                throw new Error("คุณไม่มีสิทธิ์ลบเอกสารนี้");
            }

            // ใช้ soft delete แทนการลบจริง
            await updateDoc(docRef, {
                isDeleted: true,
                deletedAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            });
            
            console.log(`✅ Soft delete ${config.collection} สำเร็จ: ${id}`);
        } catch (error) {
            console.error(`Error deleting ${config.collection}:`, error);
            throw error instanceof Error ? error : new Error(config.errorMessages.delete);
        }
    };

    /**
     * ค้นหาเอกสารตาม document number
     */
    const searchByDocumentNumber = async (
        documentNumber: string,
        companyId?: string
    ): Promise<(T & FirestoreDocument)[]> => {
        try {
            const currentUser = auth.currentUser;
            if (!currentUser) {
                throw new Error("กรุณา Login ก่อนค้นหาข้อมูล");
            }

            const constraints: QueryConstraint[] = [
                where(config.documentNumberField, "==", documentNumber),
                where("userId", "==", currentUser.uid),
                where("isDeleted", "==", false),
            ];

            if (companyId) {
                constraints.push(where("companyId", "==", companyId));
            }

            const q = query(collection(db, config.collection), ...constraints);
            const querySnapshot = await getDocs(q);
            
            return querySnapshot.docs
                .map(doc => {
                    const data = doc.data();
                    if (data.isDeleted === true) {
                        return null;
                    }
                    return {
                        id: doc.id,
                        ...convertTimestampsToDates<T>(data, config.dateFields),
                    } as T & FirestoreDocument;
                })
                .filter((doc): doc is T & FirestoreDocument => doc !== null && !doc.isDeleted);
        } catch (error) {
            console.error(`Error searching ${config.collection}:`, error);
            throw new Error(config.errorMessages.search);
        }
    };

    return {
        save,
        get,
        getAll,
        update,
        delete: deleteDoc,
        searchByDocumentNumber,
    };
};

