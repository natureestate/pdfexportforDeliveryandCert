/**
 * Helper functions สำหรับจัดการ input ตัวเลข
 * แก้ปัญหาที่ผู้ใช้ไม่สามารถลบตัวเลขให้ว่างได้
 */

/**
 * แปลงค่า input เป็นตัวเลข โดยอนุญาตให้ค่าว่างได้
 * @param value - ค่าจาก input field
 * @returns ตัวเลข หรือ empty string ถ้าค่าว่าง
 */
export const parseNumberInput = (value: string): number | '' => {
  // อนุญาตให้ค่าว่างหรือเครื่องหมายลบเดี่ยวๆ ได้
  if (value === '' || value === '-') {
    return '';
  }
  
  const parsed = parseFloat(value);
  return isNaN(parsed) ? '' : parsed;
};

/**
 * แปลงค่า input เป็นตัวเลขจำนวนเต็ม โดยอนุญาตให้ค่าว่างได้
 * @param value - ค่าจาก input field
 * @returns ตัวเลขจำนวนเต็ม หรือ empty string ถ้าค่าว่าง
 */
export const parseIntInput = (value: string): number | '' => {
  // อนุญาตให้ค่าว่างหรือเครื่องหมายลบเดี่ยวๆ ได้
  if (value === '' || value === '-') {
    return '';
  }
  
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? '' : parsed;
};

/**
 * แปลงค่าตัวเลขหรือ empty string เป็นตัวเลขสำหรับคำนวณ
 * @param value - ตัวเลข หรือ empty string
 * @param defaultValue - ค่า default ถ้าเป็น empty string (default: 0)
 * @returns ตัวเลขสำหรับคำนวณ
 */
export const toNumber = (value: number | '' | undefined, defaultValue: number = 0): number => {
  if (value === '' || value === undefined) {
    return defaultValue;
  }
  return value;
};
