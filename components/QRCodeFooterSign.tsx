/**
 * QRCodeFooterSign - Component แสดง QR Code สำหรับเซ็นชื่อยืนยันรับมอบ
 * 
 * ใช้แสดงที่ท้ายเอกสาร (Footer) ใน Preview Component
 * - แสดง QR Code ที่ link ไปยังหน้า Sign
 * - มีข้อความกำกับ "สแกนเพื่อเซ็นรับมอบ"
 */

import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { generateSignUrl } from '../services/signatureService';

// Props สำหรับ QRCodeFooterSign
interface QRCodeFooterSignProps {
    docType: string;                    // ประเภทเอกสาร (delivery, invoice, etc.)
    signToken?: string;                 // Sign Token (UUID)
    size?: number;                      // ขนาด QR Code (default: 80)
    showLabel?: boolean;                // แสดงข้อความกำกับหรือไม่ (default: true)
    label?: string;                     // ข้อความกำกับ custom
    className?: string;                 // Custom CSS class
}

const QRCodeFooterSign: React.FC<QRCodeFooterSignProps> = ({
    docType,
    signToken,
    size = 80,
    showLabel = true,
    label = 'สแกนเพื่อเซ็นรับมอบ',
    className = '',
}) => {
    // State สำหรับเก็บ QR Code Data URL
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
    const [error, setError] = useState<boolean>(false);

    // สร้าง QR Code เมื่อ signToken เปลี่ยน
    useEffect(() => {
        const generateQR = async () => {
            // ถ้าไม่มี token ไม่ต้องสร้าง QR
            if (!signToken) {
                setQrCodeDataUrl(null);
                return;
            }

            try {
                // สร้าง URL สำหรับ sign
                const signUrl = generateSignUrl(docType, signToken);
                
                // สร้าง QR Code เป็น Data URL
                const dataUrl = await QRCode.toDataURL(signUrl, {
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
                console.error('❌ [QRCodeFooterSign] Error generating QR code:', err);
                setError(true);
                setQrCodeDataUrl(null);
            }
        };

        generateQR();
    }, [docType, signToken, size]);

    // ถ้าไม่มี token หรือมี error ไม่แสดงอะไร
    if (!signToken || error) {
        return null;
    }

    // ถ้ายังไม่ได้สร้าง QR Code แสดง placeholder
    if (!qrCodeDataUrl) {
        return (
            <div 
                className={`flex flex-col items-center justify-center ${className}`}
                style={{ width: size, height: size + (showLabel ? 24 : 0) }}
            >
                <div 
                    className="bg-slate-100 animate-pulse rounded"
                    style={{ width: size, height: size }}
                />
                {showLabel && (
                    <div className="h-4 w-16 bg-slate-100 animate-pulse rounded mt-1" />
                )}
            </div>
        );
    }

    return (
        <div className={`flex flex-col items-center ${className}`}>
            {/* QR Code Image */}
            <img 
                src={qrCodeDataUrl} 
                alt="QR Code สำหรับเซ็นรับมอบ"
                style={{ width: size, height: size }}
                className="border border-slate-200 rounded"
            />
            
            {/* Label */}
            {showLabel && (
                <p 
                    className="text-xs text-slate-500 mt-1 text-center"
                    style={{ maxWidth: size + 20 }}
                >
                    {label}
                </p>
            )}
        </div>
    );
};

export default QRCodeFooterSign;

