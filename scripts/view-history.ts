// สคริปต์สำหรับดูข้อมูล History จาก Firestore
// ใช้ Firebase Admin SDK เพื่อดึงข้อมูลทั้ง deliveryNotes และ warrantyCards

import admin from 'firebase-admin';

// ตรวจสอบว่า Firebase Admin ถูก initialize แล้วหรือยัง
if (!admin.apps || admin.apps.length === 0) {
  // ใช้ Application Default Credentials (ADC) ซึ่งจะใช้ credentials จาก firebase login
  admin.initializeApp({
    projectId: 'ecertonline-29a67'
  });
}

const db = admin.firestore();

// ฟังก์ชันสำหรับแปลง Timestamp เป็น string ที่อ่านง่าย
function formatTimestamp(timestamp: admin.firestore.Timestamp | null | undefined): string {
  if (!timestamp) return 'N/A';
  const date = timestamp.toDate();
  return date.toLocaleString('th-TH', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// ฟังก์ชันสำหรับแสดงข้อมูล Delivery Notes
async function viewDeliveryNotes(limit: number = 20) {
  console.log('\n📦 ========== ใบส่งมอบงาน (Delivery Notes) ==========\n');
  
  try {
    const snapshot = await db.collection('deliveryNotes')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    
    if (snapshot.empty) {
      console.log('ไม่พบข้อมูลใบส่งมอบงาน');
      return;
    }
    
    console.log(`พบทั้งหมด ${snapshot.size} รายการ (แสดง ${limit} รายการล่าสุด)\n`);
    
    let index = 0;
    snapshot.forEach((doc) => {
      index++;
      const data = doc.data();
      console.log(`[${index}] Document ID: ${doc.id}`);
      console.log(`    เลขที่เอกสาร: ${data.docNumber || 'N/A'}`);
      console.log(`    จาก: ${data.fromCompany || 'N/A'}`);
      console.log(`    ถึง: ${data.toCompany || 'N/A'}`);
      console.log(`    โครงการ: ${data.project || 'N/A'}`);
      console.log(`    วันที่: ${formatTimestamp(data.date)}`);
      console.log(`    สร้างเมื่อ: ${formatTimestamp(data.createdAt)}`);
      console.log(`    Company ID: ${data.companyId || 'N/A'}`);
      console.log(`    User ID: ${data.userId || 'N/A'}`);
      console.log(`    จำนวนรายการ: ${data.items?.length || 0} รายการ`);
      console.log('    ' + '-'.repeat(60));
    });
    
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการดึงข้อมูลใบส่งมอบงาน:', error);
  }
}

// ฟังก์ชันสำหรับแสดงข้อมูล Warranty Cards
async function viewWarrantyCards(limit: number = 20) {
  console.log('\n🛡️  ========== ใบรับประกันสินค้า (Warranty Cards) ==========\n');
  
  try {
    const snapshot = await db.collection('warrantyCards')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    
    if (snapshot.empty) {
      console.log('ไม่พบข้อมูลใบรับประกันสินค้า');
      return;
    }
    
    console.log(`พบทั้งหมด ${snapshot.size} รายการ (แสดง ${limit} รายการล่าสุด)\n`);
    
    let index = 0;
    snapshot.forEach((doc) => {
      index++;
      const data = doc.data();
      console.log(`[${index}] Document ID: ${doc.id}`);
      console.log(`    ชื่อบริษัท: ${data.companyName || 'N/A'}`);
      console.log(`    ชื่อลูกค้า: ${data.customerName || 'N/A'}`);
      console.log(`    ชื่อสินค้า: ${data.productName || 'N/A'}`);
      console.log(`    Serial Number: ${data.serialNumber || 'N/A'}`);
      console.log(`    วันที่ซื้อ: ${formatTimestamp(data.purchaseDate)}`);
      console.log(`    ระยะเวลารับประกัน: ${data.warrantyPeriod || 'N/A'}`);
      console.log(`    สร้างเมื่อ: ${formatTimestamp(data.createdAt)}`);
      console.log(`    Company ID: ${data.companyId || 'N/A'}`);
      console.log(`    User ID: ${data.userId || 'N/A'}`);
      console.log('    ' + '-'.repeat(60));
    });
    
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการดึงข้อมูลใบรับประกัน:', error);
  }
}

// ฟังก์ชันหลัก
async function main() {
  const args = process.argv.slice(2);
  const limit = args[0] ? parseInt(args[0], 10) : 20;
  
  console.log('🔥 Firebase Firestore History Viewer');
  console.log(`📊 Project: ecertonline-29a67`);
  console.log(`📝 Limit: ${limit} รายการต่อ collection\n`);
  
  await viewDeliveryNotes(limit);
  await viewWarrantyCards(limit);
  
  console.log('\n✅ เสร็จสิ้น\n');
  
  // ปิดการเชื่อมต่อ
  await admin.app().delete();
}

// รันสคริปต์
main().catch(console.error);

