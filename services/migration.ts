/**
 * Migration Service
 * บริการสำหรับ Migrate ข้อมูลเก่าให้รองรับระบบ Multi-user
 */

import { db, auth } from '../firebase.config';
import {
    collection,
    getDocs,
    query,
    where,
} from 'firebase/firestore';
import { addFirstAdmin, getCompanyMembers } from './companyMembers';

/**
 * Migrate องค์กรเก่าให้มีข้อมูลสมาชิก
 * เรียกใช้ครั้งเดียวเพื่อเพิ่มข้อมูล Admin ให้กับองค์กรเก่า
 */
export const migrateOldCompanies = async (): Promise<void> => {
    try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error('กรุณา Login ก่อน Migrate');
        }

        console.log('🔄 เริ่ม Migration องค์กรเก่า...');

        // ดึงองค์กรทั้งหมดที่ User เป็นเจ้าของ
        const q = query(
            collection(db, 'companies'),
            where('userId', '==', currentUser.uid)
        );

        const querySnapshot = await getDocs(q);
        let migratedCount = 0;
        let skippedCount = 0;

        for (const doc of querySnapshot.docs) {
            const companyId = doc.id;
            const companyData = doc.data();

            try {
                // ตรวจสอบว่ามีข้อมูลสมาชิกแล้วหรือยัง
                const members = await getCompanyMembers(companyId);

                if (members.length === 0) {
                    // ยังไม่มีข้อมูลสมาชิก → เพิ่ม Admin
                    await addFirstAdmin(
                        companyId,
                        currentUser.uid,
                        currentUser.email || '',
                        currentUser.phoneNumber || undefined,
                        currentUser.displayName || undefined
                    );

                    console.log(`✅ Migrate สำเร็จ: ${companyData.name} (${companyId})`);
                    migratedCount++;
                } else {
                    console.log(`⏭️ ข้าม: ${companyData.name} (มีสมาชิกแล้ว)`);
                    skippedCount++;
                }
            } catch (error) {
                console.error(`❌ Migrate ล้มเหลว: ${companyData.name}`, error);
            }
        }

        console.log(`\n📊 สรุปผล Migration:`);
        console.log(`   ✅ Migrate สำเร็จ: ${migratedCount} องค์กร`);
        console.log(`   ⏭️ ข้าม: ${skippedCount} องค์กร`);
        console.log(`   📋 รวมทั้งหมด: ${querySnapshot.docs.length} องค์กร\n`);

        if (migratedCount > 0) {
            alert(`✅ Migration สำเร็จ!\n\nเพิ่มข้อมูลสมาชิกให้กับ ${migratedCount} องค์กร`);
        } else {
            alert('ℹ️ ไม่มีองค์กรที่ต้อง Migrate');
        }
    } catch (error) {
        console.error('❌ Migration ล้มเหลว:', error);
        throw error;
    }
};

/**
 * ตรวจสอบว่ามีองค์กรเก่าที่ต้อง Migrate หรือไม่
 * หมายเหตุ: User ใหม่ที่ยังไม่มีองค์กรจะไม่มีสิทธิ์ query companies collection
 * ดังนั้น function นี้จะ return false สำหรับ user ใหม่
 */
export const checkNeedMigration = async (): Promise<boolean> => {
    try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            return false;
        }

        // ดึงองค์กรทั้งหมดที่ User เป็นเจ้าของ
        const q = query(
            collection(db, 'companies'),
            where('userId', '==', currentUser.uid)
        );

        let querySnapshot;
        try {
            querySnapshot = await getDocs(q);
        } catch (queryError: any) {
            // User ใหม่อาจไม่มีสิทธิ์ query companies collection
            // เพราะยังไม่มีองค์กรใดๆ - ไม่เป็นไร return false
            if (queryError?.code === 'permission-denied') {
                console.log('ℹ️ [Migration] User ใหม่ - ไม่มีองค์กรเก่าที่ต้อง migrate');
                return false;
            }
            throw queryError;
        }

        // ถ้าไม่มีองค์กรเลย ไม่ต้อง migrate
        if (querySnapshot.empty) {
            return false;
        }

        // ตรวจสอบแต่ละองค์กร
        for (const doc of querySnapshot.docs) {
            const companyId = doc.id;
            
            try {
                const members = await getCompanyMembers(companyId);
                if (members.length === 0) {
                    // พบองค์กรที่ยังไม่มีสมาชิก
                    return true;
                }
            } catch (error) {
                console.warn(`⚠️ ไม่สามารถตรวจสอบองค์กร ${companyId}:`, error);
            }
        }

        return false;
    } catch (error) {
        console.error('❌ ตรวจสอบ Migration ล้มเหลว:', error);
        // Return false เพื่อไม่ให้หยุดการทำงาน
        return false;
    }
};

