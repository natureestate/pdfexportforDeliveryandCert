/**
 * Access Requests Service
 * บริการจัดการคำขอเข้าร่วมองค์กร
 * 
 * ระบบนี้ช่วยให้ User ขอเข้าร่วมองค์กรได้ และ Admin อนุมัติหรือปฏิเสธ
 */

import { db, auth } from '../firebase.config';
import {
    collection,
    doc,
    getDocs,
    getDoc,
    setDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    Timestamp,
    updateDoc,
} from 'firebase/firestore';
import { AccessRequest, AccessRequestStatus, UserRole, PublicCompanyInfo } from '../types';
import { checkIsAdmin, addMemberFromInvitation, updateMemberCount } from './companyMembers';

// Collection names
const ACCESS_REQUESTS_COLLECTION = 'accessRequests';
const COMPANIES_COLLECTION = 'companies';

/**
 * สร้างคำขอเข้าร่วมองค์กร
 * @param companyId - ID ขององค์กร
 * @param message - ข้อความจากผู้ขอ (optional)
 * @returns AccessRequest object
 */
export const createAccessRequest = async (
    companyId: string,
    message?: string
): Promise<AccessRequest> => {
    try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error('กรุณา Login ก่อนขอเข้าร่วมองค์กร');
        }

        // ตรวจสอบว่าเป็นสมาชิกอยู่แล้วหรือไม่
        const existingMemberQuery = query(
            collection(db, 'companyMembers'),
            where('companyId', '==', companyId),
            where('userId', '==', currentUser.uid)
        );
        const existingMemberSnapshot = await getDocs(existingMemberQuery);
        if (!existingMemberSnapshot.empty) {
            throw new Error('คุณเป็นสมาชิกขององค์กรนี้อยู่แล้ว');
        }

        // ตรวจสอบว่ามีคำขอที่ pending อยู่แล้วหรือไม่
        const existingRequestQuery = query(
            collection(db, ACCESS_REQUESTS_COLLECTION),
            where('companyId', '==', companyId),
            where('userId', '==', currentUser.uid),
            where('status', '==', 'pending')
        );
        const existingRequestSnapshot = await getDocs(existingRequestQuery);
        if (!existingRequestSnapshot.empty) {
            throw new Error('คุณมีคำขอที่รอการอนุมัติอยู่แล้ว');
        }

        // ดึงข้อมูลบริษัท
        const companyDoc = await getDoc(doc(db, COMPANIES_COLLECTION, companyId));
        if (!companyDoc.exists()) {
            throw new Error('ไม่พบข้อมูลองค์กร');
        }
        const companyData = companyDoc.data();

        // สร้าง Document
        const docRef = doc(collection(db, ACCESS_REQUESTS_COLLECTION));
        const requestId = docRef.id;

        const requestData: any = {
            userId: currentUser.uid,
            userEmail: currentUser.email || '',
            userName: currentUser.displayName || undefined,
            userPhone: currentUser.phoneNumber || undefined,
            companyId,
            companyName: companyData.name,
            status: 'pending' as AccessRequestStatus,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        };

        // เพิ่มข้อความถ้ามี
        if (message) {
            requestData.message = message;
        }

        // บันทึกข้อมูล
        await setDoc(docRef, requestData);

        console.log('✅ สร้างคำขอเข้าร่วมองค์กรสำเร็จ:', requestId);

        return {
            id: requestId,
            ...requestData,
            createdAt: new Date(),
            updatedAt: new Date(),
        } as AccessRequest;
    } catch (error) {
        console.error('❌ สร้างคำขอเข้าร่วมองค์กรล้มเหลว:', error);
        throw error;
    }
};

/**
 * ดึงคำขอเข้าร่วมขององค์กร (สำหรับ Admin)
 * @param companyId - ID ขององค์กร
 * @param statusFilter - กรองตามสถานะ (optional)
 * @returns Array ของ AccessRequest
 */
export const getAccessRequests = async (
    companyId: string,
    statusFilter?: AccessRequestStatus
): Promise<AccessRequest[]> => {
    try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error('กรุณา Login ก่อนดูคำขอเข้าร่วม');
        }

        // ตรวจสอบว่าเป็น Admin หรือไม่
        const isAdmin = await checkIsAdmin(companyId, currentUser.uid);
        if (!isAdmin) {
            throw new Error('เฉพาะ Admin เท่านั้นที่สามารถดูคำขอเข้าร่วมได้');
        }

        let q;
        if (statusFilter) {
            q = query(
                collection(db, ACCESS_REQUESTS_COLLECTION),
                where('companyId', '==', companyId),
                where('status', '==', statusFilter),
                orderBy('createdAt', 'desc')
            );
        } else {
            q = query(
                collection(db, ACCESS_REQUESTS_COLLECTION),
                where('companyId', '==', companyId),
                orderBy('createdAt', 'desc')
            );
        }

        const snapshot = await getDocs(q);
        const requests = snapshot.docs.map(docSnap => {
            const data = docSnap.data();
            return {
                id: docSnap.id,
                userId: data.userId,
                userEmail: data.userEmail,
                userName: data.userName,
                userPhone: data.userPhone,
                companyId: data.companyId,
                companyName: data.companyName,
                status: data.status,
                message: data.message,
                reviewedBy: data.reviewedBy,
                reviewedByName: data.reviewedByName,
                reviewedAt: data.reviewedAt?.toDate(),
                rejectionReason: data.rejectionReason,
                assignedRole: data.assignedRole,
                createdAt: data.createdAt?.toDate(),
                updatedAt: data.updatedAt?.toDate(),
            } as AccessRequest;
        });

        console.log(`📋 ดึงคำขอเข้าร่วมองค์กร ${companyId}: ${requests.length} คำขอ`);
        return requests;
    } catch (error) {
        console.error('❌ ดึงคำขอเข้าร่วมล้มเหลว:', error);
        throw error;
    }
};

/**
 * ดึงคำขอที่ผู้ใช้ส่งไป (สำหรับ User ดูสถานะของตัวเอง)
 * @returns Array ของ AccessRequest
 */
export const getMyAccessRequests = async (): Promise<AccessRequest[]> => {
    try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error('กรุณา Login ก่อนดูคำขอของคุณ');
        }

        const q = query(
            collection(db, ACCESS_REQUESTS_COLLECTION),
            where('userId', '==', currentUser.uid),
            orderBy('createdAt', 'desc')
        );

        const snapshot = await getDocs(q);
        const requests = snapshot.docs.map(docSnap => {
            const data = docSnap.data();
            return {
                id: docSnap.id,
                userId: data.userId,
                userEmail: data.userEmail,
                userName: data.userName,
                userPhone: data.userPhone,
                companyId: data.companyId,
                companyName: data.companyName,
                status: data.status,
                message: data.message,
                reviewedBy: data.reviewedBy,
                reviewedByName: data.reviewedByName,
                reviewedAt: data.reviewedAt?.toDate(),
                rejectionReason: data.rejectionReason,
                assignedRole: data.assignedRole,
                createdAt: data.createdAt?.toDate(),
                updatedAt: data.updatedAt?.toDate(),
            } as AccessRequest;
        });

        console.log(`📋 ดึงคำขอของ User: ${requests.length} คำขอ`);
        return requests;
    } catch (error) {
        console.error('❌ ดึงคำขอของ User ล้มเหลว:', error);
        throw error;
    }
};

/**
 * นับจำนวนคำขอที่รอการอนุมัติ
 * @param companyId - ID ขององค์กร
 * @returns จำนวนคำขอ
 */
export const getPendingRequestsCount = async (companyId: string): Promise<number> => {
    try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            return 0;
        }

        // ตรวจสอบว่าเป็น Admin หรือไม่
        const isAdmin = await checkIsAdmin(companyId, currentUser.uid);
        if (!isAdmin) {
            return 0;
        }

        const q = query(
            collection(db, ACCESS_REQUESTS_COLLECTION),
            where('companyId', '==', companyId),
            where('status', '==', 'pending')
        );

        const snapshot = await getDocs(q);
        return snapshot.size;
    } catch (error) {
        console.error('❌ นับคำขอล้มเหลว:', error);
        return 0;
    }
};

/**
 * อนุมัติคำขอเข้าร่วมองค์กร
 * @param requestId - ID ของ AccessRequest
 * @param role - บทบาทที่จะกำหนด (default: member)
 */
export const approveAccessRequest = async (
    requestId: string,
    role: UserRole = 'member'
): Promise<void> => {
    try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error('กรุณา Login ก่อนอนุมัติคำขอ');
        }

        // ดึงข้อมูลคำขอ
        const requestRef = doc(db, ACCESS_REQUESTS_COLLECTION, requestId);
        const requestDoc = await getDoc(requestRef);

        if (!requestDoc.exists()) {
            throw new Error('ไม่พบคำขอนี้');
        }

        const requestData = requestDoc.data();

        // ตรวจสอบว่าเป็น Admin หรือไม่
        const isAdmin = await checkIsAdmin(requestData.companyId, currentUser.uid);
        if (!isAdmin) {
            throw new Error('เฉพาะ Admin เท่านั้นที่สามารถอนุมัติคำขอได้');
        }

        // ตรวจสอบสถานะ
        if (requestData.status !== 'pending') {
            throw new Error('คำขอนี้ถูกดำเนินการไปแล้ว');
        }

        // เพิ่มสมาชิกเข้าองค์กร
        await addMemberFromInvitation(
            requestData.companyId,
            requestData.userId,
            requestData.userEmail,
            role,
            requestData.userPhone || undefined,
            requestData.userName || undefined
        );

        // อัปเดตคำขอ
        await updateDoc(requestRef, {
            status: 'approved' as AccessRequestStatus,
            reviewedBy: currentUser.uid,
            reviewedByName: currentUser.displayName || currentUser.email,
            reviewedAt: Timestamp.now(),
            assignedRole: role,
            updatedAt: Timestamp.now(),
        });

        // อัปเดตจำนวนสมาชิก
        await updateMemberCount(requestData.companyId);

        console.log('✅ อนุมัติคำขอเข้าร่วมสำเร็จ:', requestId);
    } catch (error) {
        console.error('❌ อนุมัติคำขอล้มเหลว:', error);
        throw error;
    }
};

/**
 * ปฏิเสธคำขอเข้าร่วมองค์กร
 * @param requestId - ID ของ AccessRequest
 * @param reason - เหตุผลที่ปฏิเสธ (optional)
 */
export const rejectAccessRequest = async (
    requestId: string,
    reason?: string
): Promise<void> => {
    try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error('กรุณา Login ก่อนปฏิเสธคำขอ');
        }

        // ดึงข้อมูลคำขอ
        const requestRef = doc(db, ACCESS_REQUESTS_COLLECTION, requestId);
        const requestDoc = await getDoc(requestRef);

        if (!requestDoc.exists()) {
            throw new Error('ไม่พบคำขอนี้');
        }

        const requestData = requestDoc.data();

        // ตรวจสอบว่าเป็น Admin หรือไม่
        const isAdmin = await checkIsAdmin(requestData.companyId, currentUser.uid);
        if (!isAdmin) {
            throw new Error('เฉพาะ Admin เท่านั้นที่สามารถปฏิเสธคำขอได้');
        }

        // ตรวจสอบสถานะ
        if (requestData.status !== 'pending') {
            throw new Error('คำขอนี้ถูกดำเนินการไปแล้ว');
        }

        // อัปเดตคำขอ
        const updateData: any = {
            status: 'rejected' as AccessRequestStatus,
            reviewedBy: currentUser.uid,
            reviewedByName: currentUser.displayName || currentUser.email,
            reviewedAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        };

        if (reason) {
            updateData.rejectionReason = reason;
        }

        await updateDoc(requestRef, updateData);

        console.log('✅ ปฏิเสธคำขอเข้าร่วมสำเร็จ:', requestId);
    } catch (error) {
        console.error('❌ ปฏิเสธคำขอล้มเหลว:', error);
        throw error;
    }
};

/**
 * ยกเลิกคำขอเข้าร่วมองค์กร (โดยผู้ขอ)
 * @param requestId - ID ของ AccessRequest
 */
export const cancelAccessRequest = async (requestId: string): Promise<void> => {
    try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error('กรุณา Login ก่อนยกเลิกคำขอ');
        }

        // ดึงข้อมูลคำขอ
        const requestRef = doc(db, ACCESS_REQUESTS_COLLECTION, requestId);
        const requestDoc = await getDoc(requestRef);

        if (!requestDoc.exists()) {
            throw new Error('ไม่พบคำขอนี้');
        }

        const requestData = requestDoc.data();

        // ตรวจสอบว่าเป็นเจ้าของคำขอหรือไม่
        if (requestData.userId !== currentUser.uid) {
            throw new Error('คุณไม่มีสิทธิ์ยกเลิกคำขอนี้');
        }

        // ตรวจสอบสถานะ
        if (requestData.status !== 'pending') {
            throw new Error('คำขอนี้ถูกดำเนินการไปแล้ว ไม่สามารถยกเลิกได้');
        }

        // ลบคำขอ
        await deleteDoc(requestRef);

        console.log('✅ ยกเลิกคำขอเข้าร่วมสำเร็จ:', requestId);
    } catch (error) {
        console.error('❌ ยกเลิกคำขอล้มเหลว:', error);
        throw error;
    }
};

/**
 * ดึงรายชื่อองค์กรสำหรับแสดงในหน้า Request Access
 * (แสดงเฉพาะองค์กรที่เปิดให้ขอเข้าร่วมได้)
 * @param searchTerm - คำค้นหา (optional)
 * @returns Array ของ PublicCompanyInfo
 */
export const getPublicCompanies = async (searchTerm?: string): Promise<PublicCompanyInfo[]> => {
    try {
        // ดึงรายการบริษัททั้งหมด (จำกัด 50 รายการ)
        const q = query(
            collection(db, COMPANIES_COLLECTION),
            orderBy('name'),
        );

        const snapshot = await getDocs(q);
        let companies = snapshot.docs.map(docSnap => {
            const data = docSnap.data();
            return {
                id: docSnap.id,
                name: data.name,
                memberCount: data.memberCount,
                logoUrl: data.logoUrl,
            } as PublicCompanyInfo;
        });

        // กรองตามคำค้นหา (ถ้ามี)
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            companies = companies.filter(c => 
                c.name.toLowerCase().includes(term)
            );
        }

        // จำกัดจำนวน
        return companies.slice(0, 50);
    } catch (error) {
        console.error('❌ ดึงรายชื่อองค์กรล้มเหลว:', error);
        return [];
    }
};
