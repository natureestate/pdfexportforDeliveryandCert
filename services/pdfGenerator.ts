
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { font } from '../constants/IBMPlexSansThaiBase64';
import { convertStorageUrlToBase64, needsBase64Conversion } from './logoStorage';

// ============================================================
// Constants สำหรับ A4 และ Margin
// ============================================================

// ขนาด A4 มาตรฐาน (pixels ที่ 96 DPI: 1mm = 3.7795 pixels)
const A4_WIDTH_PX = 794;   // 210mm * 3.7795
const A4_HEIGHT_PX = 1123; // 297mm * 3.7795

// Margin มาตรฐาน 15mm ทุกด้าน (Standard)
const MARGIN_MM = 15;
const MARGIN_PX = Math.round(MARGIN_MM * 3.7795); // ~57px

// พื้นที่ใช้งานจริงหลังหักขอบ
const A4_USABLE_WIDTH_PX = A4_WIDTH_PX - (MARGIN_PX * 2);   // ~680px
const A4_USABLE_HEIGHT_PX = A4_HEIGHT_PX - (MARGIN_PX * 2); // ~1009px

// พื้นที่สำหรับ page number (ที่ footer)
const PAGE_NUMBER_HEIGHT_PX = 30; // พื้นที่สำหรับหมายเลขหน้า

// พื้นที่เนื้อหาต่อหน้า (หักพื้นที่ page number ออก)
const CONTENT_PER_PAGE_HEIGHT_PX = A4_USABLE_HEIGHT_PX - PAGE_NUMBER_HEIGHT_PX;

// Scale สำหรับ html2canvas (ความคมชัด)
const CANVAS_SCALE = 2;

/**
 * แปลงรูปภาพจาก URL เป็น Base64 เพื่อแก้ปัญหา CORS ใน html2canvas
 * สำหรับ Firebase Storage URL จะใช้ Firebase SDK แทน fetch เพื่อหลีกเลี่ยง CORS
 * @param url - URL ของรูปภาพ
 * @returns Base64 string หรือ null หากเกิดข้อผิดพลาด
 */
const convertImageToBase64 = async (url: string): Promise<string | null> => {
    try {
        // ตรวจสอบว่าเป็น Base64 อยู่แล้วหรือไม่
        if (url.startsWith('data:')) {
            console.log('Image is already Base64, skipping conversion');
            return url;
        }

        // ✅ สำหรับ Firebase Storage URL ใช้ Firebase SDK เพื่อหลีกเลี่ยงปัญหา CORS
        if (needsBase64Conversion(url)) {
            console.log('Converting Firebase Storage URL via SDK (no CORS issue)');
            const base64 = await convertStorageUrlToBase64(url);
            if (base64) {
                console.log('Successfully converted via Firebase SDK');
                return base64;
            }
            // ถ้า Firebase SDK ล้มเหลว ลอง fallback เป็น fetch
            console.warn('Firebase SDK conversion failed, trying fetch fallback...');
        }

        // สำหรับ URL อื่นๆ หรือ fallback ให้ใช้ fetch แบบเดิม
        console.log('Converting URL to Base64 via fetch:', url);
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const blob = await response.blob();
        
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => {
                console.log('Successfully converted image to Base64 via fetch');
                resolve(reader.result as string);
            };
            reader.onerror = () => {
                console.error('FileReader error during Base64 conversion');
                resolve(null);
            };
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error('Error converting image to base64:', error);
        return null;
    }
};

/**
 * รอให้รูปภาพโหลดเสร็จ
 * @param img - HTML Image Element
 */
const waitForImageLoad = (img: HTMLImageElement): Promise<void> => {
    return new Promise((resolve) => {
        // ถ้ารูปโหลดเสร็จแล้ว resolve ทันที
        if (img.complete && img.naturalHeight !== 0) {
            resolve();
            return;
        }
        
        // รอให้รูปโหลดเสร็จ
        img.onload = () => resolve();
        img.onerror = () => {
            console.warn('Image failed to load, but continuing...');
            resolve(); // resolve แม้ error เพื่อไม่ให้ค้าง
        };
        
        // Timeout 5 วินาที เผื่อรูปโหลดช้า
        setTimeout(() => resolve(), 5000);
    });
};

/**
 * แปลง <img> (รวมถึง SVG) เป็น PNG Data URL โดยวาดลง canvas ก่อน
 * เหมาะสำหรับกรณี html2canvas เรนเดอร์ SVG ไม่ขึ้น
 */
const rasterizeImageElementToPng = async (img: HTMLImageElement): Promise<string> => {
    await waitForImageLoad(img);

    // ใช้ขนาดจริงของรูปเพื่อคมชัดสุด
    const width = img.naturalWidth || img.width || 256;
    const height = img.naturalHeight || img.height || 256;

    const canvas = document.createElement('canvas');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(width * dpr));
    canvas.height = Math.max(1, Math.floor(height * dpr));
    const ctx = canvas.getContext('2d');
    if (!ctx) return img.src;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // วาดรูปลงบน canvas
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    
    // คืนค่าเป็น PNG Data URL (ปลอดภัยสำหรับ html2canvas)
    return canvas.toDataURL('image/png');
};

/**
 * ปรับ CSS ของแถบสีและหัวข้อให้ตรงกันก่อน render PDF
 * แก้ไขปัญหา html2canvas ที่ render CSS ไม่เหมือน browser
 * @param element - HTML element ที่จะสร้าง PDF
 */
const fixSectionHeadersForPdf = (element: HTMLElement): () => void => {
    // หาแถบสีทั้งหมด (section headers)
    const sectionHeaders = element.querySelectorAll('[class*="bg-indigo-700"], [class*="bg-green-700"]');
    const originalStyles: { element: HTMLElement; styles: { [key: string]: string } }[] = [];

    sectionHeaders.forEach((header) => {
        const el = header as HTMLElement;
        
        // บันทึก style เดิม
        const originalStyle: { [key: string]: string } = {
            paddingTop: el.style.paddingTop,
            paddingBottom: el.style.paddingBottom,
            paddingLeft: el.style.paddingLeft,
            paddingRight: el.style.paddingRight,
            display: el.style.display,
            alignItems: el.style.alignItems,
            alignSelf: el.style.alignSelf,
            justifyContent: el.style.justifyContent,
            height: el.style.height,
            minHeight: el.style.minHeight,
            boxSizing: el.style.boxSizing,
            lineHeight: el.style.lineHeight,
            verticalAlign: el.style.verticalAlign,
        };
        
        originalStyles.push({ element: el, styles: originalStyle });

        // ปรับ CSS ให้แน่ใจว่าแถบสีและข้อความตรงกัน
        el.style.paddingTop = '12px';
        el.style.paddingBottom = '12px';
        el.style.paddingLeft = '8px';
        el.style.paddingRight = '8px';
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.alignSelf = 'stretch';
        el.style.justifyContent = 'flex-start';
        el.style.height = 'auto';
        el.style.minHeight = '40px';
        el.style.boxSizing = 'border-box';
        el.style.lineHeight = '1';
        el.style.verticalAlign = 'middle';

        // ปรับ h3 และ span ภายใน
        const h3 = el.querySelector('h3') as HTMLElement;
        if (h3) {
            const h3OriginalStyle: { [key: string]: string } = {
                margin: h3.style.margin,
                padding: h3.style.padding,
                display: h3.style.display,
                alignItems: h3.style.alignItems,
                alignSelf: h3.style.alignSelf,
                lineHeight: h3.style.lineHeight,
                height: h3.style.height,
                verticalAlign: h3.style.verticalAlign,
                boxSizing: h3.style.boxSizing,
            };
            
            originalStyles.push({ element: h3, styles: h3OriginalStyle });
            
            h3.style.margin = '0';
            h3.style.padding = '0';
            h3.style.display = 'flex';
            h3.style.alignItems = 'center';
            h3.style.alignSelf = 'center';
            h3.style.lineHeight = '1';
            h3.style.height = '100%';
            h3.style.verticalAlign = 'middle';
            h3.style.marginTop = '0';
            h3.style.marginBottom = '0';
            h3.style.boxSizing = 'border-box';

            // ปรับ span ทั้งหมดใน h3
            const spans = h3.querySelectorAll('span');
            spans.forEach((span) => {
                const spanEl = span as HTMLElement;
                const spanOriginalStyle: { [key: string]: string } = {
                    display: spanEl.style.display,
                    alignItems: spanEl.style.alignItems,
                    alignSelf: spanEl.style.alignSelf,
                    lineHeight: spanEl.style.lineHeight,
                    verticalAlign: spanEl.style.verticalAlign,
                    height: spanEl.style.height,
                    marginTop: spanEl.style.marginTop,
                    marginBottom: spanEl.style.marginBottom,
                };
                
                originalStyles.push({ element: spanEl, styles: spanOriginalStyle });
                
                spanEl.style.display = 'inline-flex';
                spanEl.style.alignItems = 'center';
                spanEl.style.alignSelf = 'center';
                spanEl.style.justifyContent = 'center';
                spanEl.style.lineHeight = '1';
                spanEl.style.verticalAlign = 'middle';
                spanEl.style.height = 'auto';
                spanEl.style.marginTop = '0';
                spanEl.style.marginBottom = '0';
            });
        }
    });

    // คืนค่าฟังก์ชันสำหรับ restore styles
    return () => {
        originalStyles.forEach(({ element: el, styles }) => {
            Object.keys(styles).forEach((key) => {
                if (styles[key]) {
                    el.style.setProperty(key, styles[key]);
                } else {
                    el.style.removeProperty(key);
                }
            });
        });
    };
};

/**
 * แปลงโลโก้ใน element เป็น Base64 ก่อนสร้าง PDF
 * @param element - HTML element ที่จะสร้าง PDF
 */
const preprocessImagesForPdf = async (element: HTMLElement): Promise<() => void> => {
    const images = element.querySelectorAll('img');
    const originalSources: { img: HTMLImageElement; originalSrc: string; originalCrossOrigin: string | null }[] = [];

    console.log(`Found ${images.length} images to process for PDF generation`);

    // แปลงรูปภาพทั้งหมดเป็น Base64
    for (const img of Array.from(images)) {
        const originalSrc = img.src;
        const originalCrossOrigin = img.getAttribute('crossorigin');
        originalSources.push({ img, originalSrc, originalCrossOrigin });

        console.log(`Processing image: ${originalSrc}`);
        
        // ตั้งค่า crossorigin สำหรับรูปจาก external URL
        if (!originalSrc.startsWith('data:') && !originalSrc.startsWith('/')) {
            img.setAttribute('crossorigin', 'anonymous');
            console.log('Set crossorigin="anonymous" for external image');
        }
        
        // ถ้าเป็น Base64 อยู่แล้ว ไม่ต้องแปลง แต่ต้องรอให้โหลด
        if (originalSrc.startsWith('data:')) {
            console.log('Image is already Base64, waiting for load...');
            await waitForImageLoad(img);
            
            // ถ้าเป็น SVG ยังต้องแปลงเป็น PNG
            if (originalSrc.startsWith('data:image/svg+xml')) {
                try {
                    console.log('Rasterizing Base64 SVG to PNG...');
                    const pngDataUrl = await rasterizeImageElementToPng(img);
                    img.src = pngDataUrl;
                    await waitForImageLoad(img);
                    console.log('SVG rasterized to PNG successfully');
                } catch (e) {
                    console.warn('Rasterize SVG failed:', e);
                }
            }
            continue;
        }
        
        // แปลงรูปภาพเป็น Base64
        const base64 = await convertImageToBase64(originalSrc);
        if (base64) {
            // ล็อกขนาดภาพไว้ก่อนเปลี่ยน src
            const currentWidth = img.clientWidth || img.naturalWidth;
            const currentHeight = img.clientHeight || img.naturalHeight;
            
            if (currentWidth && !img.style.width) {
                img.style.width = `${currentWidth}px`;
            }
            if (currentHeight && !img.style.height) {
                img.style.height = `${currentHeight}px`;
            }

            img.src = base64;
            await waitForImageLoad(img);

            // ถ้าเป็น SVG ให้แปลงเป็น PNG
            if (base64.startsWith('data:image/svg+xml')) {
                try {
                    console.log('Rasterizing SVG to PNG...');
                    const pngDataUrl = await rasterizeImageElementToPng(img);
                    img.src = pngDataUrl;
                    await waitForImageLoad(img);
                    console.log('SVG rasterized to PNG successfully');
                } catch (e) {
                    console.warn('Rasterize SVG failed, using original Base64:', e);
                }
            }

            console.log('Image successfully converted and loaded');
        } else {
            console.warn(`Failed to convert image: ${originalSrc}`);
        }
    }

    // รอเพิ่มอีก 500ms เพื่อให้ DOM และรูปภาพพร้อมสมบูรณ์
    console.log('Waiting for DOM to stabilize...');
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log('All images processed and loaded');

    // คืนค่าฟังก์ชันสำหรับ restore รูปภาพกลับเป็นสถานะเดิม
    return () => {
        console.log('Restoring original image sources');
        originalSources.forEach(({ img, originalSrc, originalCrossOrigin }) => {
            img.src = originalSrc;
            if (originalCrossOrigin) {
                img.setAttribute('crossorigin', originalCrossOrigin);
            } else {
                img.removeAttribute('crossorigin');
            }
            img.style.width = '';
            img.style.height = '';
        });
    };
};

/**
 * วัดความสูงเนื้อหาจริงของ element (รวม padding)
 * @param element - HTML element ที่ต้องการวัด
 * @returns ความสูงเนื้อหาจริงเป็น pixels
 */
const measureContentHeight = (element: HTMLElement): number => {
    // ใช้ scrollHeight เพื่อให้ได้ความสูงจริงของเนื้อหา
    const scrollHeight = element.scrollHeight;
    const offsetHeight = element.offsetHeight;
    const clientHeight = element.clientHeight;
    
    // เลือกค่าที่สูงที่สุดเพื่อให้ได้ความสูงจริง
    const actualHeight = Math.max(scrollHeight, offsetHeight, clientHeight);
    
    console.log(`📐 Measured content height: scrollHeight=${scrollHeight}px, offsetHeight=${offsetHeight}px, clientHeight=${clientHeight}px, using=${actualHeight}px`);
    
    // ถ้าวัดได้ 0 ให้ใช้ค่า A4 เป็น fallback
    if (actualHeight <= 0) {
        console.warn('⚠️ Content height is 0 or negative, using A4 height as fallback');
        return A4_HEIGHT_PX;
    }
    
    return actualHeight;
};

/**
 * คำนวณจำนวนหน้าที่ต้องใช้
 * @param contentHeight - ความสูงเนื้อหาทั้งหมด (px)
 * @returns จำนวนหน้า
 */
const calculatePageCount = (contentHeight: number): number => {
    // หักพื้นที่ margin ออก เพราะเราจะใส่ margin ใน PDF เอง
    const usableContentHeight = contentHeight;
    const pageCount = Math.ceil(usableContentHeight / CONTENT_PER_PAGE_HEIGHT_PX);
    console.log(`📄 Content height: ${usableContentHeight}px, Content per page: ${CONTENT_PER_PAGE_HEIGHT_PX}px, Total pages: ${pageCount}`);
    return Math.max(1, pageCount);
};

/**
 * เพิ่ม font ภาษาไทยลงใน PDF instance
 * @param pdf - jsPDF instance
 * @returns true ถ้าเพิ่มสำเร็จ, false ถ้าไม่สำเร็จ
 */
const addThaiFont = (pdf: jsPDF): boolean => {
    try {
        pdf.addFileToVFS('IBMPlexSansThai-Regular.ttf', font);
        pdf.addFont('IBMPlexSansThai-Regular.ttf', 'IBMPlexSansThai', 'normal');
        pdf.setFont('IBMPlexSansThai');
        return true;
    } catch (error) {
        console.warn('⚠️ Failed to add Thai font, using default font:', error);
        return false;
    }
};

/**
 * เพิ่มหมายเลขหน้าลงใน PDF
 * @param pdf - jsPDF instance
 * @param currentPage - หน้าปัจจุบัน
 * @param totalPages - จำนวนหน้าทั้งหมด
 * @param useThaiText - ใช้ข้อความภาษาไทยหรือไม่
 */
const addPageNumber = (pdf: jsPDF, currentPage: number, totalPages: number, useThaiText: boolean = true): void => {
    try {
        const pageWidth = pdf.internal.pageSize.getWidth();  // 210mm
        const pageHeight = pdf.internal.pageSize.getHeight(); // 297mm
        
        pdf.setFontSize(10);
        pdf.setTextColor(102, 102, 102); // #666666 (Gray)
        
        // ข้อความหมายเลขหน้า (ใช้ภาษาอังกฤษถ้า font ไทยไม่พร้อม)
        const pageNumberText = useThaiText 
            ? `หน้า ${currentPage} / ${totalPages}`
            : `Page ${currentPage} / ${totalPages}`;
        
        // ตำแหน่ง: มุมล่างขวา (ห่างจากขอบ 15mm)
        const xPosition = pageWidth - MARGIN_MM;
        const yPosition = pageHeight - (MARGIN_MM / 2); // กลาง margin ล่าง
        
        // วางข้อความชิดขวา
        pdf.text(pageNumberText, xPosition, yPosition, { align: 'right' });
        
        console.log(`📝 Added page number: ${pageNumberText}`);
    } catch (error) {
        console.warn('⚠️ Failed to add page number:', error);
        // ไม่ throw error เพื่อให้ PDF ยังสร้างได้แม้ไม่มีเลขหน้า
    }
};

/**
 * สร้าง PDF หลายหน้า (Dynamic Pagination)
 * วิธีการ: สร้าง canvas เดียวของเนื้อหาทั้งหมด แล้วแบ่งเป็นหลายหน้าใน PDF
 * @param element - HTML element ที่จะสร้าง PDF
 * @param filename - ชื่อไฟล์ PDF
 * @param contentHeight - ความสูงเนื้อหาทั้งหมด
 */
const generateMultiPagePdf = async (
    element: HTMLElement, 
    filename: string, 
    contentHeight: number
): Promise<void> => {
    console.log(`📚 Generating multi-page PDF...`);
    console.log(`   Content height: ${contentHeight}px`);
    
    // สร้าง canvas ของเนื้อหาทั้งหมด (รวม padding)
    const fullCanvas = await html2canvas(element, {
        scale: CANVAS_SCALE,
        width: A4_WIDTH_PX,
        height: contentHeight,
        useCORS: true,
        allowTaint: true,
        logging: false,
        imageTimeout: 15000,
        backgroundColor: '#ffffff',
        windowWidth: A4_WIDTH_PX,
        windowHeight: contentHeight,
    });
    
    console.log(`🖼️ Full canvas created: ${fullCanvas.width}x${fullCanvas.height}px`);
    
    // สร้าง PDF ใหม่
    const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
    });
    
    // เพิ่ม font ภาษาไทย (และเก็บผลลัพธ์ว่าสำเร็จหรือไม่)
    const hasThaiFontMulti = addThaiFont(pdf);
    
    const pdfWidth = pdf.internal.pageSize.getWidth();   // 210mm
    const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm
    
    // คำนวณความสูงต่อหน้าใน canvas (pixels * scale)
    const pageHeightInCanvas = A4_HEIGHT_PX * CANVAS_SCALE;
    const totalPages = Math.ceil(fullCanvas.height / pageHeightInCanvas);
    
    console.log(`📄 Total pages: ${totalPages} (canvas height: ${fullCanvas.height}px, page height: ${pageHeightInCanvas}px)`);
    
    // แบ่ง canvas เป็นหลายหน้า
    for (let page = 0; page < totalPages; page++) {
        console.log(`📄 Processing page ${page + 1} of ${totalPages}...`);
        
        // ถ้าไม่ใช่หน้าแรก ให้เพิ่มหน้าใหม่
        if (page > 0) {
            pdf.addPage();
        }
        
        // คำนวณส่วนที่ต้อง crop จาก canvas
        const srcY = page * pageHeightInCanvas;
        const srcHeight = Math.min(pageHeightInCanvas, fullCanvas.height - srcY);
        
        // สร้าง canvas ใหม่สำหรับหน้านี้
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = fullCanvas.width;
        pageCanvas.height = srcHeight;
        
        const ctx = pageCanvas.getContext('2d');
        if (!ctx) {
            throw new Error('Cannot create canvas context');
        }
        
        // เติมพื้นหลังสีขาว
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        
        // วาดส่วนของ canvas ที่ต้องการ
        ctx.drawImage(
            fullCanvas,
            0, srcY,                    // source x, y
            fullCanvas.width, srcHeight, // source width, height
            0, 0,                        // dest x, y
            fullCanvas.width, srcHeight  // dest width, height
        );
        
        // แปลงเป็น image data
        const imgData = pageCanvas.toDataURL('image/jpeg', 0.95);
        
        // คำนวณความสูงใน PDF สำหรับหน้านี้
        const pageHeightMM = (srcHeight / pageHeightInCanvas) * pdfHeight;
        
        // วาง image ลงใน PDF (เต็มความกว้าง)
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pageHeightMM);
        
        // เพิ่มหมายเลขหน้า (ใช้ภาษาไทยถ้า font พร้อม)
        addPageNumber(pdf, page + 1, totalPages, hasThaiFontMulti);
    }
    
    // บันทึก PDF
    console.log(`💾 Saving multi-page PDF as: ${filename}`);
    pdf.save(filename);
    
    console.log('✅ Multi-page PDF generation completed successfully!');
};

/**
 * สร้าง PDF หน้าเดียว (สำหรับเนื้อหาที่พอดี 1 หน้า)
 * @param element - HTML element ที่จะสร้าง PDF
 * @param filename - ชื่อไฟล์ PDF
 */
const generateSinglePagePdf = async (element: HTMLElement, filename: string): Promise<void> => {
    console.log('📄 Generating single-page PDF...');
    
    // สร้าง canvas ด้วย html2canvas
    const canvas = await html2canvas(element, {
        scale: CANVAS_SCALE,
        width: A4_WIDTH_PX,
        height: A4_HEIGHT_PX,
        useCORS: true,
        allowTaint: true,
        logging: false,
        imageTimeout: 15000,
        backgroundColor: '#ffffff',
        windowWidth: A4_WIDTH_PX,
        windowHeight: A4_HEIGHT_PX,
    });
    
    console.log(`🖼️ Canvas created: ${canvas.width}x${canvas.height}px`);
    
    // แปลง canvas เป็น image data
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    
    // สร้าง PDF
    const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
    });
    
    // เพิ่ม font ภาษาไทย (และเก็บผลลัพธ์ว่าสำเร็จหรือไม่)
    const hasThaiFontSingle = addThaiFont(pdf);
    
    const pdfWidth = pdf.internal.pageSize.getWidth();   // 210mm
    const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm
    
    // วาง image เต็มหน้า A4 (ไม่มี margin เพราะ element มี padding อยู่แล้ว)
    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
    
    // เพิ่มหมายเลขหน้า (1/1) - ใช้ภาษาไทยถ้า font พร้อม
    addPageNumber(pdf, 1, 1, hasThaiFontSingle);
    
    // บันทึก PDF
    console.log(`💾 Saving PDF as: ${filename}`);
    pdf.save(filename);
    
    console.log('✅ Single-page PDF generation completed successfully!');
};

/**
 * Restore styles ของ element กลับเป็นค่าเดิม
 */
const restoreElementStyles = (
    element: HTMLElement, 
    originalStyles: Record<string, string>
): void => {
    element.style.width = originalStyles.width || '';
    element.style.height = originalStyles.height || '';
    element.style.minHeight = originalStyles.minHeight || '';
    element.style.maxWidth = originalStyles.maxWidth || '';
    element.style.maxHeight = originalStyles.maxHeight || '';
    element.style.overflow = originalStyles.overflow || '';
    element.style.aspectRatio = originalStyles.aspectRatio || '';
    element.style.boxSizing = originalStyles.boxSizing || '';
    element.style.padding = originalStyles.padding || '';
};

/**
 * ฟังก์ชันหลักสำหรับสร้าง PDF
 * รองรับทั้งหน้าเดียวและหลายหน้าแบบอัตโนมัติ
 * @param element - HTML element ที่จะสร้าง PDF
 * @param filename - ชื่อไฟล์ PDF
 */
export const generatePdf = async (element: HTMLElement, filename: string): Promise<void> => {
    // เก็บ restore functions ไว้เพื่อใช้ใน finally
    let restoreHeaders: (() => void) | null = null;
    let restoreImages: (() => void) | null = null;
    
    // 🔥 บันทึกค่า style เดิมของ element
    const originalStyles: Record<string, string> = {
        width: element.style.width,
        height: element.style.height,
        minHeight: element.style.minHeight,
        maxWidth: element.style.maxWidth,
        maxHeight: element.style.maxHeight,
        overflow: element.style.overflow,
        aspectRatio: element.style.aspectRatio,
        boxSizing: element.style.boxSizing,
        padding: element.style.padding,
    };
    
    try {
        console.log('🚀 Starting PDF generation process...');
        console.log(`📏 A4 Size: ${A4_WIDTH_PX}x${A4_HEIGHT_PX}px`);
        console.log(`📐 Margin: ${MARGIN_MM}mm (${MARGIN_PX}px)`);
        console.log(`📄 Usable area: ${A4_USABLE_WIDTH_PX}x${A4_USABLE_HEIGHT_PX}px`);
        
        // 🔥 บังคับให้ element มีความกว้างเท่ากับ A4
        // แต่ไม่จำกัดความสูง เพื่อให้วัดความสูงจริงได้
        element.style.width = `${A4_WIDTH_PX}px`;
        element.style.minHeight = 'auto';
        element.style.maxWidth = `${A4_WIDTH_PX}px`;
        element.style.maxHeight = 'none'; // ไม่จำกัดความสูง
        element.style.height = 'auto';    // ให้สูงตามเนื้อหา
        element.style.overflow = 'visible';
        element.style.aspectRatio = 'auto';
        element.style.boxSizing = 'border-box';
        
        // 🔥 ใช้ padding มาตรฐาน 15mm (57px) เพื่อให้ margin ซ้าย-ขวา-บน-ล่าง เท่ากัน
        element.style.padding = `${MARGIN_PX}px`;
        
        console.log(`📏 Set element width to A4: ${A4_WIDTH_PX}px with padding: ${MARGIN_PX}px`);
        
        // รอให้ DOM อัปเดตขนาดใหม่
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Force reflow
        void element.offsetHeight;

        // ปรับ CSS ของแถบสีและหัวข้อ
        console.log('🎨 Fixing section headers alignment...');
        restoreHeaders = fixSectionHeadersForPdf(element);

        // แปลงรูปภาพเป็น Base64
        console.log('🖼️ Preprocessing images...');
        restoreImages = await preprocessImagesForPdf(element);

        // รอให้ CSS และ images พร้อม
        await new Promise(resolve => setTimeout(resolve, 300));
        void element.offsetHeight;
        
        // 📐 วัดความสูงเนื้อหาจริง
        const contentHeight = measureContentHeight(element);
        
        // คำนวณจำนวนหน้า
        const pageCount = calculatePageCount(contentHeight);
        
        console.log(`📊 Content analysis: ${contentHeight}px content, ${pageCount} page(s) needed`);
        
        // ตัดสินใจว่าจะใช้แบบ single page หรือ multi page
        if (pageCount === 1) {
            // 📄 หน้าเดียว: บังคับขนาด A4 เต็มหน้า
            element.style.height = `${A4_HEIGHT_PX}px`;
            element.style.maxHeight = `${A4_HEIGHT_PX}px`;
            
            await new Promise(resolve => setTimeout(resolve, 100));
            void element.offsetHeight;
            
            await generateSinglePagePdf(element, filename);
        } else {
            // 📚 หลายหน้า: ใช้ระบบ pagination
            await generateMultiPagePdf(element, filename, contentHeight);
        }
        
        console.log('🎉 PDF generation completed successfully!');
    } catch (error) {
        // Log error details for debugging
        console.error('❌ Error generating PDF:', error);
        if (error instanceof Error) {
            console.error('Error name:', error.name);
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
        }
        throw new Error('ไม่สามารถสร้าง PDF ได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
        // 🔥 Restore ค่า style เดิมทั้งหมด (ไม่ว่าจะสำเร็จหรือไม่)
        try {
            if (restoreImages) restoreImages();
        } catch (e) {
            console.warn('Failed to restore images:', e);
        }
        try {
            if (restoreHeaders) restoreHeaders();
        } catch (e) {
            console.warn('Failed to restore headers:', e);
        }
        try {
            restoreElementStyles(element, originalStyles);
        } catch (e) {
            console.warn('Failed to restore element styles:', e);
        }
    }
};

/**
 * ฟังก์ชันสำหรับทดสอบการแปลงรูปภาพเป็น Base64
 * @param imageUrl - URL ของรูปภาพที่ต้องการทดสอบ
 * @returns Promise<boolean> - true หากแปลงสำเร็จ
 */
export const testImageConversion = async (imageUrl: string): Promise<boolean> => {
    try {
        const result = await convertImageToBase64(imageUrl);
        return result !== null;
    } catch (error) {
        console.error('Test image conversion failed:', error);
        return false;
    }
};

/**
 * ฟังก์ชันสำหรับสร้าง PNG จาก HTML element
 * รองรับทั้งหน้าเดียวและหลายหน้า (สำหรับหลายหน้าจะสร้างไฟล์ ZIP)
 * @param element - HTML element ที่จะสร้าง PNG
 * @param filename - ชื่อไฟล์ PNG (ไม่ต้องใส่นามสกุล)
 */
export const generatePng = async (element: HTMLElement, filename: string): Promise<void> => {
    // เก็บ restore functions ไว้เพื่อใช้ใน finally
    let restoreHeaders: (() => void) | null = null;
    let restoreImages: (() => void) | null = null;
    
    // บันทึกค่า style เดิมของ element
    const originalStyles: Record<string, string> = {
        width: element.style.width,
        height: element.style.height,
        minHeight: element.style.minHeight,
        maxWidth: element.style.maxWidth,
        maxHeight: element.style.maxHeight,
        overflow: element.style.overflow,
        aspectRatio: element.style.aspectRatio,
        boxSizing: element.style.boxSizing,
        padding: element.style.padding,
    };
    
    try {
        console.log('🖼️ Starting PNG generation process...');
        console.log(`📏 A4 Size: ${A4_WIDTH_PX}x${A4_HEIGHT_PX}px`);
        
        // บังคับให้ element มีความกว้างเท่ากับ A4
        element.style.width = `${A4_WIDTH_PX}px`;
        element.style.minHeight = 'auto';
        element.style.maxWidth = `${A4_WIDTH_PX}px`;
        element.style.maxHeight = 'none';
        element.style.height = 'auto';
        element.style.overflow = 'visible';
        element.style.aspectRatio = 'auto';
        element.style.boxSizing = 'border-box';
        element.style.padding = `${MARGIN_PX}px`;
        
        // รอให้ DOM อัปเดตขนาดใหม่
        await new Promise(resolve => setTimeout(resolve, 100));
        void element.offsetHeight;

        // ปรับ CSS ของแถบสีและหัวข้อ
        restoreHeaders = fixSectionHeadersForPdf(element);

        // แปลงรูปภาพเป็น Base64 (ใช้ฟังก์ชันเดียวกับ PDF generation)
        console.log('🖼️ Converting images to Base64 for PNG...');
        restoreImages = await preprocessImagesForPdf(element);

        // รอให้ทุกอย่างพร้อม
        await new Promise(resolve => setTimeout(resolve, 200));
        void element.offsetHeight;

        // วัดความสูงจริงของเนื้อหา
        const contentHeight = element.scrollHeight;
        console.log(`📏 Content height: ${contentHeight}px`);

        // สร้าง canvas ด้วย html2canvas
        const canvas = await html2canvas(element, {
            scale: CANVAS_SCALE,
            useCORS: true,
            allowTaint: true,
            logging: false,
            imageTimeout: 15000,
            backgroundColor: '#ffffff',
            windowWidth: A4_WIDTH_PX,
        });
        
        console.log(`🖼️ Canvas created: ${canvas.width}x${canvas.height}px`);
        
        // แปลง canvas เป็น PNG blob
        const blob = await new Promise<Blob | null>((resolve) => {
            canvas.toBlob(resolve, 'image/png', 1.0);
        });
        
        if (!blob) {
            throw new Error('Failed to create PNG blob');
        }
        
        // สร้าง download link
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        // ลบนามสกุล .pdf ออกถ้ามี แล้วเพิ่ม .png
        const pngFilename = filename.replace(/\.pdf$/i, '') + '.png';
        link.download = pngFilename;
        link.href = url;
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Cleanup
        URL.revokeObjectURL(url);
        
        console.log(`💾 PNG saved as: ${pngFilename}`);
        console.log('✅ PNG generation completed successfully!');
    } catch (error) {
        console.error('❌ Error generating PNG:', error);
        if (error instanceof Error) {
            console.error('Error message:', error.message);
        }
        throw new Error('ไม่สามารถสร้าง PNG ได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
        // Restore ค่า style เดิมทั้งหมด
        try {
            if (restoreImages) restoreImages();
        } catch (e) {
            console.warn('Failed to restore images:', e);
        }
        try {
            if (restoreHeaders) restoreHeaders();
        } catch (e) {
            console.warn('Failed to restore headers:', e);
        }
        try {
            restoreElementStyles(element, originalStyles);
        } catch (e) {
            console.warn('Failed to restore element styles:', e);
        }
    }
};
