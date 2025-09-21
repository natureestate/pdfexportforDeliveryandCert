
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { font } from '../constants/IBMPlexSansThaiBase64';

export const generatePdf = async (element: HTMLElement, filename: string): Promise<void> => {
    // Hide scrollbars during capture for a cleaner image
    const originalOverflow = element.style.overflow;
    element.style.overflow = 'visible';

    const canvas = await html2canvas(element, {
        scale: 2, // Keep scale for high resolution on screens
        useCORS: true,
        logging: false,
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
