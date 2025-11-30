/**
 * QRCodeFooter - Component แสดง QR Code สำหรับตรวจสอบเอกสาร
 * 
 * ใช้แสดงที่ท้ายเอกสาร (Footer) ในทุก Preview Component
 * - แสดง QR Code ที่ link ไปยังหน้า Verification
 * - มีข้อความกำกับ "สแกนเพื่อตรวจสอบต้นฉบับ"
 */

import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { generateVerificationUrl } from '../services/verification';

// Props สำหรับ QRCodeFooter
interface QRCodeFooterProps {
    docType: string;                    // ประเภทเอกสาร (delivery, invoice, etc.)
    verificationToken?: string;         // Verification Token (UUID)
    size?: number;                      // ขนาด QR Code (default: 80)
    showLabel?: boolean;                // แสดงข้อความกำกับหรือไม่ (default: true)
    className?: string;                 // Custom CSS class
}

const QRCodeFooter: React.FC<QRCodeFooterProps> = ({
    docType,
    verificationToken,
    size = 80,
    showLabel = true,
    className = '',
}) => {
    // State สำหรับเก็บ QR Code Data URL
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
    const [error, setError] = useState<boolean>(false);

    // สร้าง QR Code เมื่อ verificationToken เปลี่ยน
    useEffect(() => {
        const generateQR = async () => {
            // ถ้าไม่มี token ไม่ต้องสร้าง QR
            if (!verificationToken) {
                setQrCodeDataUrl(null);
                return;
            }

            try {
                // สร้าง URL สำหรับ verification
                const verificationUrl = generateVerificationUrl(docType, verificationToken);
                
                // สร้าง QR Code เป็น Data URL
                const dataUrl = await QRCode.toDataURL(verificationUrl, {
                    width: size * 2, // สร้างขนาดใหญ่กว่าเพื่อความคมชัด
                    margin: 1,
                    color: {
                        dark: '#1e293b',  // สีเข้ม (slate-800)
                        light: '#ffffff', // สีอ่อน (white)
                    },
                    errorCorrectionLevel: 'M', // Medium error correction
                });
                
                setQrCodeDataUrl(dataUrl);
                setError(false);
            } catch (err) {
                console.error('❌ [QRCodeFooter] Error generating QR code:', err);
                setError(true);
                setQrCodeDataUrl(null);
            }
        };

        generateQR();
    }, [docType, verificationToken, size]);

    // ถ้าไม่มี token หรือมี error ไม่แสดงอะไร
    if (!verificationToken || error) {
        return null;
    }

    // ถ้ายังไม่ได้สร้าง QR Code แสดง placeholder
    if (!qrCodeDataUrl) {
        return (
            <div className={`flex items-center justify-end gap-2 ${className}`}>
                <div 
                    className="bg-gray-100 animate-pulse"
                    style={{ width: size, height: size }}
                />
            </div>
        );
    }

    return (
        <div className={`flex items-center justify-end gap-3 ${className}`}>
            {/* ข้อความกำกับ */}
            {showLabel && (
                <div className="text-right">
                    <p className="text-[9px] text-gray-500 leading-tight">
                        สแกนเพื่อตรวจสอบต้นฉบับ
                    </p>
                    <p className="text-[8px] text-gray-400 leading-tight">
                        Scan to verify
                    </p>
                </div>
            )}
            
            {/* QR Code */}
            <div className="flex-shrink-0">
                <img 
                    src={qrCodeDataUrl} 
                    alt="QR Code สำหรับตรวจสอบเอกสาร"
                    style={{ width: size, height: size }}
                    className="border border-gray-200 rounded"
                />
            </div>
        </div>
    );
};

export default QRCodeFooter;

