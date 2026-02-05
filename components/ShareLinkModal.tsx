// ShareLinkModal - Modal สำหรับสร้างและจัดการลิงก์แชร์เอกสาร
// แสดงรายการลิงก์แชร์ที่มีอยู่และสร้างลิงก์ใหม่

import React, { useState, useEffect, useCallback } from 'react';
import { 
    createShareLink, 
    getShareLinksForDocument, 
    deactivateShareLink,
    activateShareLink,
    deleteShareLink,
    generateShareUrl,
    ShareLink 
} from '../services/shareLink';
import { DocType } from '../utils/documentRegistry';

interface ShareLinkModalProps {
    isOpen: boolean;
    onClose: () => void;
    documentId: string;
    documentType: DocType;
    documentNumber: string;
    companyId?: string;
}

// ฟังก์ชันแปลงวันที่
const formatDate = (date: Date | null | undefined): string => {
    if (!date) return 'ไม่มีกำหนด';
    return new Intl.DateTimeFormat('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
};

const ShareLinkModal: React.FC<ShareLinkModalProps> = ({
    isOpen,
    onClose,
    documentId,
    documentType,
    documentNumber,
    companyId,
}) => {
    // State
    const [shareLinks, setShareLinks] = useState<ShareLink[]>([]);
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    
    // Form state สำหรับสร้างลิงก์ใหม่
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [expiresInDays, setExpiresInDays] = useState<number>(0); // 0 = ไม่หมดอายุ
    const [canDownload, setCanDownload] = useState(true);
    const [note, setNote] = useState('');

    // ดึงรายการ Share Links เมื่อเปิด Modal
    useEffect(() => {
        if (isOpen && documentId) {
            fetchShareLinks();
        }
    }, [isOpen, documentId, documentType]);

    const fetchShareLinks = async () => {
        setLoading(true);
        setError(null);
        
        try {
            const result = await getShareLinksForDocument(documentId, documentType);
            if (result.success && result.shareLinks) {
                setShareLinks(result.shareLinks);
            } else {
                setError(result.error || 'ไม่สามารถดึงรายการลิงก์แชร์ได้');
            }
        } catch (err) {
            setError('เกิดข้อผิดพลาดในการดึงข้อมูล');
        } finally {
            setLoading(false);
        }
    };

    // สร้างลิงก์แชร์ใหม่
    const handleCreateShareLink = async () => {
        setCreating(true);
        setError(null);
        
        try {
            const result = await createShareLink(
                documentId,
                documentType,
                documentNumber,
                {
                    expiresInDays: expiresInDays > 0 ? expiresInDays : undefined,
                    canDownload,
                    note: note || undefined,
                    companyId,
                }
            );

            if (result.success && result.shareLink) {
                setShareLinks([result.shareLink, ...shareLinks]);
                setShowCreateForm(false);
                resetForm();
                
                // Copy URL อัตโนมัติ
                if (result.shareUrl) {
                    await navigator.clipboard.writeText(result.shareUrl);
                    setCopiedId(result.shareLink.id);
                    setTimeout(() => setCopiedId(null), 3000);
                }
                
                console.log('✅ สร้างลิงก์แชร์สำเร็จ! ลิงก์ถูก copy ไว้แล้ว');
            } else {
                setError(result.error || 'ไม่สามารถสร้างลิงก์แชร์ได้');
            }
        } catch (err) {
            setError('เกิดข้อผิดพลาดในการสร้างลิงก์');
        } finally {
            setCreating(false);
        }
    };

    // Reset form
    const resetForm = () => {
        setExpiresInDays(0);
        setCanDownload(true);
        setNote('');
    };

    // Copy URL
    const handleCopyUrl = async (shareToken: string, shareLinkId: string) => {
        try {
            const url = generateShareUrl(shareToken);
            await navigator.clipboard.writeText(url);
            setCopiedId(shareLinkId);
            setTimeout(() => setCopiedId(null), 3000);
        } catch (err) {
            console.error('ไม่สามารถ copy ลิงก์ได้', err);
        }
    };

    // Toggle Active status
    const handleToggleActive = async (shareLink: ShareLink) => {
        try {
            if (shareLink.isActive) {
                await deactivateShareLink(shareLink.id);
            } else {
                await activateShareLink(shareLink.id);
            }
            fetchShareLinks();
        } catch (err) {
            console.error('เกิดข้อผิดพลาด', err);
        }
    };

    // Delete share link
    const handleDelete = async (shareLinkId: string) => {
        if (!confirm('คุณแน่ใจหรือไม่ที่จะลบลิงก์แชร์นี้?')) return;
        
        try {
            await deleteShareLink(shareLinkId);
            setShareLinks(shareLinks.filter(sl => sl.id !== shareLinkId));
        } catch (err) {
            console.error('ไม่สามารถลบลิงก์แชร์ได้', err);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 dark:bg-black dark:bg-opacity-80 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
            <div className="relative bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-slate-700">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                            แชร์เอกสาร
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            เลขที่: {documentNumber}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                        title="ปิด"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-4">
                    {/* Create new share link button */}
                    {!showCreateForm && (
                        <button
                            onClick={() => setShowCreateForm(true)}
                            className="w-full mb-4 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            สร้างลิงก์แชร์ใหม่
                        </button>
                    )}

                    {/* Create form */}
                    {showCreateForm && (
                        <div className="mb-4 p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-200 dark:border-slate-600">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                                สร้างลิงก์แชร์ใหม่
                            </h3>
                            
                            {/* Expires */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    หมดอายุใน
                                </label>
                                <select
                                    value={expiresInDays}
                                    onChange={(e) => setExpiresInDays(Number(e.target.value))}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
                                >
                                    <option value={0}>ไม่มีกำหนด</option>
                                    <option value={1}>1 วัน</option>
                                    <option value={7}>7 วัน</option>
                                    <option value={30}>30 วัน</option>
                                    <option value={90}>90 วัน</option>
                                </select>
                            </div>

                            {/* Can Download */}
                            <div className="mb-4">
                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={canDownload}
                                        onChange={(e) => setCanDownload(e.target.checked)}
                                        className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                                    />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">
                                        อนุญาตให้ดาวน์โหลด PDF
                                    </span>
                                </label>
                            </div>

                            {/* Note */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    หมายเหตุ (ไม่บังคับ)
                                </label>
                                <input
                                    type="text"
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    placeholder="เช่น แชร์ให้ลูกค้า..."
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
                                />
                            </div>

                            {/* Buttons */}
                            <div className="flex gap-2">
                                <button
                                    onClick={handleCreateShareLink}
                                    disabled={creating}
                                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {creating ? (
                                        <>
                                            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            กำลังสร้าง...
                                        </>
                                    ) : (
                                        'สร้างลิงก์'
                                    )}
                                </button>
                                <button
                                    onClick={() => {
                                        setShowCreateForm(false);
                                        resetForm();
                                    }}
                                    className="px-4 py-2 bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-slate-500"
                                >
                                    ยกเลิก
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-300 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Share links list */}
                    {loading ? (
                        <div className="flex justify-center items-center h-32">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
                        </div>
                    ) : shareLinks.length === 0 ? (
                        <div className="text-center py-8">
                            <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                            </svg>
                            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                ยังไม่มีลิงก์แชร์
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                                ลิงก์แชร์ที่มีอยู่ ({shareLinks.length})
                            </h3>
                            {shareLinks.map((shareLink) => {
                                const isExpired = shareLink.expiresAt && shareLink.expiresAt < new Date();
                                
                                return (
                                    <div
                                        key={shareLink.id}
                                        className={`p-3 rounded-lg border ${
                                            !shareLink.isActive || isExpired
                                                ? 'bg-gray-100 dark:bg-slate-700/30 border-gray-200 dark:border-slate-600 opacity-60'
                                                : 'bg-white dark:bg-slate-700 border-gray-200 dark:border-slate-600'
                                        }`}
                                    >
                                        {/* Status badges */}
                                        <div className="flex items-center gap-2 mb-2">
                                            {isExpired && (
                                                <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                                                    หมดอายุ
                                                </span>
                                            )}
                                            {!shareLink.isActive && (
                                                <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                                                    ปิดใช้งาน
                                                </span>
                                            )}
                                            {shareLink.isActive && !isExpired && (
                                                <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                                                    ใช้งานได้
                                                </span>
                                            )}
                                            {shareLink.permissions.canDownload && (
                                                <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                                    ดาวน์โหลดได้
                                                </span>
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1 mb-2">
                                            <div>สร้างเมื่อ: {formatDate(shareLink.createdAt)}</div>
                                            {shareLink.expiresAt && (
                                                <div>หมดอายุ: {formatDate(shareLink.expiresAt)}</div>
                                            )}
                                            <div>เข้าดู: {shareLink.accessCount} ครั้ง</div>
                                            {shareLink.note && (
                                                <div className="text-gray-600 dark:text-gray-300">หมายเหตุ: {shareLink.note}</div>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2 mt-2">
                                            <button
                                                onClick={() => handleCopyUrl(shareLink.shareToken, shareLink.id)}
                                                className={`flex-1 px-3 py-1.5 text-xs rounded flex items-center justify-center gap-1 ${
                                                    copiedId === shareLink.id
                                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                                        : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-900/50'
                                                }`}
                                            >
                                                {copiedId === shareLink.id ? (
                                                    <>
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                        Copied!
                                                    </>
                                                ) : (
                                                    <>
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                        </svg>
                                                        Copy ลิงก์
                                                    </>
                                                )}
                                            </button>
                                            <button
                                                onClick={() => handleToggleActive(shareLink)}
                                                className={`px-3 py-1.5 text-xs rounded ${
                                                    shareLink.isActive
                                                        ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 hover:bg-orange-200 dark:hover:bg-orange-900/50'
                                                        : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50'
                                                }`}
                                            >
                                                {shareLink.isActive ? 'ปิด' : 'เปิด'}
                                            </button>
                                            <button
                                                onClick={() => handleDelete(shareLink.id)}
                                                className="px-3 py-1.5 text-xs rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50"
                                            >
                                                ลบ
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end items-center p-4 border-t border-gray-200 dark:border-slate-700">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-gray-200 text-sm font-medium rounded-md hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors"
                    >
                        ปิด
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ShareLinkModal;
