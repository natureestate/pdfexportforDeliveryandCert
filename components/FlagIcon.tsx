/**
 * FlagIcon Component
 * Custom SVG flag icons แบบวงกลมที่สวยงาม
 * รองรับธงชาติไทยและอังกฤษ
 */

import React from 'react';

interface FlagIconProps {
    country: 'th' | 'en' | 'gb';
    size?: number;
    className?: string;
}

// Thai Flag - วงกลม
const ThaiFlag: React.FC<{ size: number; className?: string }> = ({ size, className }) => (
    <svg 
        width={size} 
        height={size} 
        viewBox="0 0 64 64" 
        className={className}
        style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))' }}
    >
        <defs>
            <clipPath id="thCircle">
                <circle cx="32" cy="32" r="30" />
            </clipPath>
            <linearGradient id="thShine" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="white" stopOpacity="0.3" />
                <stop offset="50%" stopColor="white" stopOpacity="0" />
                <stop offset="100%" stopColor="black" stopOpacity="0.1" />
            </linearGradient>
        </defs>
        
        {/* Background circle with border */}
        <circle cx="32" cy="32" r="31" fill="#e5e7eb" />
        
        {/* Flag stripes */}
        <g clipPath="url(#thCircle)">
            {/* Red stripe (top) */}
            <rect x="0" y="0" width="64" height="10.67" fill="#ED1C24" />
            {/* White stripe */}
            <rect x="0" y="10.67" width="64" height="10.67" fill="#FFFFFF" />
            {/* Blue stripe (center - double height) */}
            <rect x="0" y="21.33" width="64" height="21.33" fill="#241D4F" />
            {/* White stripe */}
            <rect x="0" y="42.67" width="64" height="10.67" fill="#FFFFFF" />
            {/* Red stripe (bottom) */}
            <rect x="0" y="53.33" width="64" height="10.67" fill="#ED1C24" />
        </g>
        
        {/* Shine overlay */}
        <circle cx="32" cy="32" r="30" fill="url(#thShine)" />
        
        {/* Border */}
        <circle cx="32" cy="32" r="30" fill="none" stroke="#d1d5db" strokeWidth="1" />
    </svg>
);

// UK Flag (Union Jack) - วงกลม
const UKFlag: React.FC<{ size: number; className?: string }> = ({ size, className }) => (
    <svg 
        width={size} 
        height={size} 
        viewBox="0 0 64 64" 
        className={className}
        style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))' }}
    >
        <defs>
            <clipPath id="ukCircle">
                <circle cx="32" cy="32" r="30" />
            </clipPath>
            <linearGradient id="ukShine" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="white" stopOpacity="0.3" />
                <stop offset="50%" stopColor="white" stopOpacity="0" />
                <stop offset="100%" stopColor="black" stopOpacity="0.1" />
            </linearGradient>
        </defs>
        
        {/* Background circle with border */}
        <circle cx="32" cy="32" r="31" fill="#e5e7eb" />
        
        {/* Union Jack */}
        <g clipPath="url(#ukCircle)">
            {/* Blue background */}
            <rect x="0" y="0" width="64" height="64" fill="#012169" />
            
            {/* White diagonal stripes (St Andrew's and St Patrick's crosses) */}
            <path d="M0,0 L64,64 M64,0 L0,64" stroke="#FFFFFF" strokeWidth="12" />
            
            {/* Red diagonal stripes (St Patrick's cross) */}
            <path d="M0,0 L32,32 M32,32 L64,64" stroke="#C8102E" strokeWidth="4" />
            <path d="M64,0 L32,32 M32,32 L0,64" stroke="#C8102E" strokeWidth="4" />
            
            {/* White cross (St George's cross background) */}
            <path d="M32,0 L32,64 M0,32 L64,32" stroke="#FFFFFF" strokeWidth="14" />
            
            {/* Red cross (St George's cross) */}
            <path d="M32,0 L32,64 M0,32 L64,32" stroke="#C8102E" strokeWidth="8" />
        </g>
        
        {/* Shine overlay */}
        <circle cx="32" cy="32" r="30" fill="url(#ukShine)" />
        
        {/* Border */}
        <circle cx="32" cy="32" r="30" fill="none" stroke="#d1d5db" strokeWidth="1" />
    </svg>
);

const FlagIcon: React.FC<FlagIconProps> = ({ country, size = 24, className = '' }) => {
    switch (country) {
        case 'th':
            return <ThaiFlag size={size} className={className} />;
        case 'en':
        case 'gb':
            return <UKFlag size={size} className={className} />;
        default:
            return <ThaiFlag size={size} className={className} />;
    }
};

export default FlagIcon;

// Export individual flags for direct use
export { ThaiFlag, UKFlag };

