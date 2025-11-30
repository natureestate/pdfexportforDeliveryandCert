import React from 'react';
import ActionDropdown from './ActionDropdown';

// ไอคอนต่างๆ
const EditIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
);

const DownloadIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
);

const LoadingSpinner = () => (
    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const CancelIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
    </svg>
);

const RestoreIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
);

const DeleteIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

const PreviewIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
);

interface DocumentActionsProps {
    // ฟังก์ชัน callbacks
    onEdit: () => void;
    onDownload: () => void;
    onCancel?: () => void;
    onRestore?: () => void;
    onDelete: () => void;
    onPreview?: () => void;
    
    // สถานะ
    isCancelled?: boolean;
    isDownloading?: boolean;
    isCancelling?: boolean;
    isRestoring?: boolean;
    
    // ตัวเลือกเพิ่มเติม
    showPreview?: boolean;
    compact?: boolean; // โหมดกระชับสำหรับมือถือ
    showOnHover?: boolean; // แสดงเมื่อ hover บน parent (ต้องใช้กับ group class)
}

/**
 * DocumentActions - ปุ่ม actions สำหรับเอกสาร
 * แสดงปุ่มหลัก (แก้ไข, PDF) และ dropdown สำหรับ actions รอง
 */
const DocumentActions: React.FC<DocumentActionsProps> = ({
    onEdit,
    onDownload,
    onCancel,
    onRestore,
    onDelete,
    onPreview,
    isCancelled = false,
    isDownloading = false,
    isCancelling = false,
    isRestoring = false,
    showPreview = false,
    compact = false,
    showOnHover = false,
}) => {
    // Actions สำหรับ dropdown menu
    const dropdownActions = [
        // ดูตัวอย่าง (ถ้าเปิดใช้งาน)
        {
            label: 'ดูตัวอย่าง',
            icon: <PreviewIcon />,
            onClick: onPreview || (() => {}),
            variant: 'default' as const,
            hidden: !showPreview || !onPreview,
        },
        // ยกเลิก/กู้คืน
        {
            label: isCancelled ? 'กู้คืนเอกสาร' : 'ยกเลิกเอกสาร',
            icon: isCancelled ? <RestoreIcon /> : <CancelIcon />,
            onClick: isCancelled ? (onRestore || (() => {})) : (onCancel || (() => {})),
            variant: isCancelled ? 'success' as const : 'warning' as const,
            loading: isCancelled ? isRestoring : isCancelling,
            loadingText: isCancelled ? 'กำลังกู้คืน...' : 'กำลังยกเลิก...',
            hidden: isCancelled ? !onRestore : !onCancel,
        },
        // ลบเอกสาร
        {
            label: 'ลบเอกสาร',
            icon: <DeleteIcon />,
            onClick: onDelete,
            variant: 'danger' as const,
        },
    ];

    // CSS classes สำหรับ hover effect
    const hoverClasses = showOnHover 
        ? 'opacity-0 group-hover:opacity-100 transition-opacity duration-200' 
        : '';

    return (
        <div className={`flex items-center gap-1 sm:gap-2 ${hoverClasses}`}>
            {/* ปุ่มแก้ไข - แสดงตลอด */}
            <button
                onClick={onEdit}
                className={`
                    ${compact ? 'p-1.5' : 'px-2 sm:px-3 py-1.5 sm:py-1'}
                    bg-amber-600 text-white text-xs sm:text-sm rounded hover:bg-amber-700 
                    flex items-center justify-center gap-1 transition-colors
                `}
                title="แก้ไขเอกสาร"
            >
                <EditIcon />
                {!compact && <span className="hidden sm:inline">แก้ไข</span>}
            </button>

            {/* ปุ่มดาวน์โหลด PDF - แสดงตลอด */}
            <button
                onClick={onDownload}
                disabled={isDownloading}
                className={`
                    ${compact ? 'p-1.5' : 'px-2 sm:px-3 py-1.5 sm:py-1'}
                    bg-blue-600 text-white text-xs sm:text-sm rounded hover:bg-blue-700 
                    flex items-center justify-center gap-1 transition-colors
                    disabled:opacity-50 disabled:cursor-not-allowed
                `}
                title="ดาวน์โหลด PDF"
            >
                {isDownloading ? (
                    <>
                        <LoadingSpinner />
                        {!compact && <span className="hidden sm:inline">กำลังสร้าง...</span>}
                    </>
                ) : (
                    <>
                        <DownloadIcon />
                        {!compact && <span className="hidden sm:inline">PDF</span>}
                    </>
                )}
            </button>

            {/* Dropdown สำหรับ actions อื่นๆ */}
            <ActionDropdown actions={dropdownActions} />
        </div>
    );
};

export default DocumentActions;

