
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { font } from '../constants/IBMPlexSansThaiBase64';

export const generatePdf = async (element: HTMLElement, filename: string): Promise<void> => {
    // Hide scrollbars during capture for a cleaner image
    const originalOverflow = element.style.overflow;
    element.style.overflow = 'visible';

    const canvas = await html2canvas(element, {
        scale: 2, // เพิ่ม scale สำหรับความละเอียดสูงบนหน้าจอ
        useCORS: true, // อนุญาตให้โหลด image จาก external sources
        allowTaint: true, // อนุญาตให้ render image ที่มาจากแหล่งอื่น
        logging: false, // ปิด logging
        imageTimeout: 0, // ไม่จำกัดเวลาในการโหลด image
        backgroundColor: '#ffffff', // กำหนดสีพื้นหลัง
    });

    // Restore original overflow style
    element.style.overflow = originalOverflow;

    // Use JPEG format with high quality (0.95) for significant file size reduction
    const imgData = canvas.toDataURL('image/jpeg', 0.95);

    const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
    });

    // Add font to jsPDF
    pdf.addFileToVFS('IBMPlexSansThai-Regular.ttf', font);
    pdf.addFont('IBMPlexSansThai-Regular.ttf', 'IBMPlexSansThai', 'normal');
    pdf.setFont('IBMPlexSansThai');

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const ratio = canvasWidth / canvasHeight;

    let imgWidth = pdfWidth;
    let imgHeight = imgWidth / ratio;
    
    // if image height is larger than page height, scale down
    if (imgHeight > pdfHeight) {
        imgHeight = pdfHeight;
        imgWidth = imgHeight * ratio;
    }

    const x = (pdfWidth - imgWidth) / 2;
    const y = (pdfHeight - imgHeight) / 2;
    
    // Specify 'JPEG' as the format
    pdf.addImage(imgData, 'JPEG', x, y, imgWidth, imgHeight);
    
    pdf.save(filename);
};
