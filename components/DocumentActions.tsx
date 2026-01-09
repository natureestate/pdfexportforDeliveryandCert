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

const ImageIcon = () => (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
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

// ไอคอนสำหรับฟีเจอร์ใหม่
const CopyIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
);

const LockIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
);

const UnlockIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
    </svg>
);

const ArchiveIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
    </svg>
);

const HistoryIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const ShareIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
    </svg>
);

const VersionIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
);

interface DocumentActionsProps {
    // ฟังก์ชัน callbacks - พื้นฐาน
    onEdit: () => void;
    onDownload: () => void;
    onDownloadPng?: () => void;  // ดาวน์โหลด PNG
    onCancel?: () => void;
    onRestore?: () => void;
    onDelete: () => void;
    onPreview?: () => void;
    
    // ฟังก์ชัน callbacks - ฟีเจอร์ใหม่
    onCopy?: () => void;          // Copy เอกสาร
    onLock?: () => void;          // Lock เอกสาร
    onUnlock?: () => void;        // Unlock เอกสาร
    onArchive?: () => void;       // Archive เอกสาร
    onUnarchive?: () => void;     // Unarchive เอกสาร
    onShowHistory?: () => void;   // แสดงประวัติเอกสาร
    onShare?: () => void;         // Share เอกสาร
    onShowVersions?: () => void;  // แสดง versions
    
    // สถานะ
    isCancelled?: boolean;
    isDownloading?: boolean;
    isDownloadingPng?: boolean;  // กำลังดาวน์โหลด PNG
    isCancelling?: boolean;
    isRestoring?: boolean;
    
    // สถานะฟีเจอร์ใหม่
    isLocked?: boolean;           // เอกสารถูก lock หรือไม่
    isLocking?: boolean;          // กำลัง lock
    isUnlocking?: boolean;        // กำลัง unlock
    isArchived?: boolean;         // เอกสารถูก archive หรือไม่
    isArchiving?: boolean;        // กำลัง archive
    isUnarchiving?: boolean;      // กำลัง unarchive
    isCopying?: boolean;          // กำลัง copy
    
    // ตัวเลือกเพิ่มเติม
    showPreview?: boolean;
    compact?: boolean; // โหมดกระชับสำหรับมือถือ
    showOnHover?: boolean; // แสดงเมื่อ hover บน parent (ต้องใช้กับ group class)
}

/**
 * DocumentActions - ปุ่ม actions สำหรับเอกสาร
 * แสดงปุ่มหลัก (แก้ไข, PDF) และ dropdown สำหรับ actions รอง
 * รองรับฟีเจอร์ใหม่: Copy, Lock, Archive, History, Share, Versions
 */
const DocumentActions: React.FC<DocumentActionsProps> = ({
    onEdit,
    onDownload,
    onDownloadPng,
    onCancel,
    onRestore,
    onDelete,
    onPreview,
    // ฟีเจอร์ใหม่
    onCopy,
    onLock,
    onUnlock,
    onArchive,
    onUnarchive,
    onShowHistory,
    onShare,
    onShowVersions,
    // สถานะ
    isCancelled = false,
    isDownloading = false,
    isDownloadingPng = false,
    isCancelling = false,
    isRestoring = false,
    // สถานะฟีเจอร์ใหม่
    isLocked = false,
    isLocking = false,
    isUnlocking = false,
    isArchived = false,
    isArchiving = false,
    isUnarchiving = false,
    isCopying = false,
    // ตัวเลือก
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
        // Copy เอกสาร (ฟีเจอร์ใหม่)
        {
            label: 'Copy เอกสาร',
            icon: <CopyIcon />,
            onClick: onCopy || (() => {}),
            variant: 'default' as const,
            loading: isCopying,
            loadingText: 'กำลัง copy...',
            hidden: !onCopy,
        },
        // Lock/Unlock เอกสาร (ฟีเจอร์ใหม่)
        {
            label: isLocked ? 'Unlock เอกสาร' : 'Lock เอกสาร',
            icon: isLocked ? <UnlockIcon /> : <LockIcon />,
            onClick: isLocked ? (onUnlock || (() => {})) : (onLock || (() => {})),
            variant: 'warning' as const,
            loading: isLocked ? isUnlocking : isLocking,
            loadingText: isLocked ? 'กำลัง unlock...' : 'กำลัง lock...',
            hidden: isLocked ? !onUnlock : !onLock,
        },
        // Archive/Unarchive เอกสาร (ฟีเจอร์ใหม่)
        {
            label: isArchived ? 'Unarchive เอกสาร' : 'Archive เอกสาร',
            icon: <ArchiveIcon />,
            onClick: isArchived ? (onUnarchive || (() => {})) : (onArchive || (() => {})),
            variant: 'default' as const,
            loading: isArchived ? isUnarchiving : isArchiving,
            loadingText: isArchived ? 'กำลัง unarchive...' : 'กำลัง archive...',
            hidden: isArchived ? !onUnarchive : !onArchive,
        },
        // แสดงประวัติ (ฟีเจอร์ใหม่)
        {
            label: 'ประวัติเอกสาร',
            icon: <HistoryIcon />,
            onClick: onShowHistory || (() => {}),
            variant: 'default' as const,
            hidden: !onShowHistory,
        },
        // Share เอกสาร (ฟีเจอร์ใหม่)
        {
            label: 'แชร์เอกสาร',
            icon: <ShareIcon />,
            onClick: onShare || (() => {}),
            variant: 'success' as const,
            hidden: !onShare,
        },
        // แสดง Versions (ฟีเจอร์ใหม่)
        {
            label: 'เวอร์ชันเอกสาร',
            icon: <VersionIcon />,
            onClick: onShowVersions || (() => {}),
            variant: 'default' as const,
            hidden: !onShowVersions,
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
            {/* แสดง badges สถานะ */}
            {isLocked && (
                <span className="px-1.5 py-0.5 text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded flex items-center gap-1" title="เอกสารถูก Lock">
                    <LockIcon />
                    <span className="hidden sm:inline">Locked</span>
                </span>
            )}
            {isArchived && (
                <span className="px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded flex items-center gap-1" title="เอกสารถูก Archive">
                    <ArchiveIcon />
                    <span className="hidden sm:inline">Archived</span>
                </span>
            )}
            
            {/* ปุ่มแก้ไข - แสดงตลอด (แต่ disable ถ้า locked) */}
            <button
                onClick={onEdit}
                disabled={isLocked}
                className={`
                    ${compact ? 'p-1.5' : 'px-2 sm:px-3 py-1.5 sm:py-1'}
                    bg-amber-600 text-white text-xs sm:text-sm rounded hover:bg-amber-700 
                    flex items-center justify-center gap-1 transition-colors
                    disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-amber-600
                `}
                title={isLocked ? "เอกสารถูก Lock ไม่สามารถแก้ไขได้" : "แก้ไขเอกสาร"}
            >
                <EditIcon />
                {!compact && <span className="hidden sm:inline">แก้ไข</span>}
            </button>

            {/* ปุ่มดาวน์โหลด PDF - แสดงตลอด */}
            <button
                onClick={onDownload}
                disabled={isDownloading || isDownloadingPng}
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

            {/* ปุ่มดาวน์โหลด PNG - แสดงถ้ามี callback */}
            {onDownloadPng && (
                <button
                    onClick={onDownloadPng}
                    disabled={isDownloading || isDownloadingPng}
                    className={`
                        ${compact ? 'p-1.5' : 'px-2 sm:px-3 py-1.5 sm:py-1'}
                        bg-emerald-600 text-white text-xs sm:text-sm rounded hover:bg-emerald-700 
                        flex items-center justify-center gap-1 transition-colors
                        disabled:opacity-50 disabled:cursor-not-allowed
                    `}
                    title="ดาวน์โหลด PNG"
                >
                    {isDownloadingPng ? (
                        <>
                            <LoadingSpinner />
                            {!compact && <span className="hidden sm:inline">กำลังสร้าง...</span>}
                        </>
                    ) : (
                        <>
                            <ImageIcon />
                            {!compact && <span className="hidden sm:inline">PNG</span>}
                        </>
                    )}
                </button>
            )}

            {/* Dropdown สำหรับ actions อื่นๆ */}
            <ActionDropdown actions={dropdownActions} />
        </div>
    );
};

export default DocumentActions;

