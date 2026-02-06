/**
 * LogoWithSkeleton Component
 * แสดงโลโก้พร้อม skeleton loading animation ตอนกำลังโหลด
 * ใช้ร่วมกันในทุก Preview component (DocumentPreview, InvoicePreview, ฯลฯ)
 */

import React, { useState } from 'react';

interface LogoWithSkeletonProps {
    /** URL หรือ Base64 ของโลโก้ */
    src: string;
    /** ข้อความ alt สำหรับ accessibility */
    alt?: string;
    /** className สำหรับ container */
    containerClassName?: string;
    /** className สำหรับ img */
    imgClassName?: string;
}

const LogoWithSkeleton: React.FC<LogoWithSkeletonProps> = ({
    src,
    alt = 'Company Logo',
    containerClassName = 'max-h-[168px] overflow-hidden flex items-center justify-start',
    imgClassName = 'max-h-[168px] w-auto max-w-full object-contain object-center',
}) => {
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    return (
        <div className={containerClassName}>
            {/* Skeleton Loading - แสดงตอนกำลังโหลดโลโก้ */}
            {isLoading && !hasError && (
                <div className="animate-pulse flex items-center justify-center w-40 h-24 bg-gray-200 rounded-lg">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                    </svg>
                </div>
            )}
            <img
                src={src}
                alt={alt}
                className={`${imgClassName} transition-opacity duration-300 ${isLoading ? 'opacity-0 absolute' : 'opacity-100'}`}
                crossOrigin="anonymous"
                onLoad={() => setIsLoading(false)}
                onError={() => { setIsLoading(false); setHasError(true); }}
            />
        </div>
    );
};

export default LogoWithSkeleton;
