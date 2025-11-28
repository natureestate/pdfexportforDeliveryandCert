/**
 * ฟังก์ชันแปลงตัวเลขเป็นตัวอักษรภาษาไทย (Thai Baht Text)
 * เช่น 30000 -> "สามหมื่นบาทถ้วน"
 * รองรับทศนิยม (สตางค์) ด้วย
 */

/**
 * แปลงตัวเลขเป็นตัวอักษรภาษาไทย
 * @param num - ตัวเลขที่ต้องการแปลง
 * @returns ตัวอักษรภาษาไทย เช่น "สามหมื่นบาทถ้วน"
 */
export const numberToThaiText = (num: number): string => {
    // กรณีเป็น 0
    if (num === 0) return 'ศูนย์บาทถ้วน';
    // กรณีไม่ใช่ตัวเลข
    if (isNaN(num)) return '';
    // กรณีเป็นค่าลบ
    if (num < 0) return 'ลบ' + numberToThaiText(Math.abs(num));
    
    // ตัวเลขไทย
    const thaiNumbers = ['', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
    // หน่วยไทย
    const thaiUnits = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];
    
    // แยกจำนวนเต็มและทศนิยม
    const [integerPart, decimalPart] = num.toFixed(2).split('.');
    const intNum = parseInt(integerPart, 10);
    const decNum = parseInt(decimalPart, 10);
    
    /**
     * ฟังก์ชันแปลงตัวเลขเป็นข้อความไทย (สำหรับแต่ละหลัก)
     * รองรับตัวเลขสูงสุดถึงหลักล้านล้าน
     */
    const convertToThaiText = (n: number): string => {
        if (n === 0) return '';
        
        let result = '';
        let remaining = n;
        let position = 0;
        
        while (remaining > 0) {
            const digit = remaining % 10;
            
            // ถ้าถึงหลักล้าน ให้เรียก recursive แล้วต่อด้วย "ล้าน"
            if (position === 6) {
                const millions = Math.floor(remaining);
                result = convertToThaiText(millions) + 'ล้าน' + result;
                break;
            }
            
            if (digit !== 0) {
                let digitText = thaiNumbers[digit];
                
                // กรณีพิเศษ: หลักสิบ
                if (position === 1) {
                    if (digit === 1) {
                        digitText = ''; // สิบ ไม่ใช่ หนึ่งสิบ
                    } else if (digit === 2) {
                        digitText = 'ยี่'; // ยี่สิบ ไม่ใช่ สองสิบ
                    }
                }
                
                // กรณีพิเศษ: หลักหน่วย เป็น 1 และมีตัวเลขอื่นนำหน้า
                if (position === 0 && digit === 1 && n > 10) {
                    digitText = 'เอ็ด'; // เช่น สิบเอ็ด ยี่สิบเอ็ด
                }
                
                result = digitText + thaiUnits[position] + result;
            }
            
            remaining = Math.floor(remaining / 10);
            position++;
        }
        
        return result;
    };
    
    // สร้างข้อความสำหรับจำนวนเต็ม
    let result = convertToThaiText(intNum);
    
    // เพิ่ม "บาท"
    result += 'บาท';
    
    // เพิ่มทศนิยม (สตางค์)
    if (decNum > 0) {
        result += convertToThaiText(decNum) + 'สตางค์';
    } else {
        result += 'ถ้วน';
    }
    
    return result;
};

/**
 * แปลงตัวเลขเป็นตัวอักษรภาษาไทย (แบบไม่มีหน่วยบาท)
 * เช่น 30000 -> "สามหมื่น"
 * @param num - ตัวเลขที่ต้องการแปลง
 * @returns ตัวอักษรภาษาไทยแบบไม่มีหน่วย
 */
export const numberToThaiTextWithoutUnit = (num: number): string => {
    if (num === 0) return 'ศูนย์';
    if (isNaN(num)) return '';
    if (num < 0) return 'ลบ' + numberToThaiTextWithoutUnit(Math.abs(num));
    
    const thaiNumbers = ['', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
    const thaiUnits = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];
    
    const convertToThaiText = (n: number): string => {
        if (n === 0) return '';
        
        let result = '';
        let remaining = n;
        let position = 0;
        
        while (remaining > 0) {
            const digit = remaining % 10;
            
            if (position === 6) {
                const millions = Math.floor(remaining);
                result = convertToThaiText(millions) + 'ล้าน' + result;
                break;
            }
            
            if (digit !== 0) {
                let digitText = thaiNumbers[digit];
                
                if (position === 1) {
                    if (digit === 1) {
                        digitText = '';
                    } else if (digit === 2) {
                        digitText = 'ยี่';
                    }
                }
                
                if (position === 0 && digit === 1 && n > 10) {
                    digitText = 'เอ็ด';
                }
                
                result = digitText + thaiUnits[position] + result;
            }
            
            remaining = Math.floor(remaining / 10);
            position++;
        }
        
        return result;
    };
    
    return convertToThaiText(Math.floor(num));
};

export default numberToThaiText;

