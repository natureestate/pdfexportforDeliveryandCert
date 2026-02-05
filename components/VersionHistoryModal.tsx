// VersionHistoryModal - Modal สำหรับแสดงและจัดการเวอร์ชันของเอกสาร
// แสดงรายการเวอร์ชันและ restore เวอร์ชันเก่า

import React, { useState, useEffect, useCallback } from 'react';
import { 
    getDocumentVersions, 
    restoreDocumentVersion,
    DocumentVersion 
} from '../services/documentVersion';
import { DocType } from '../utils/documentRegistry';

interface VersionHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    documentId: string;
    documentType: DocType;
    documentNumber: string;
    onVersionRestored?: () => void; // Callback เมื่อ restore สำเร็จ
}

// ฟังก์ชันแปลงวันที่
const formatDateTime = (date: Date): string => {
    return new Intl.DateTimeFormat('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
};

// ฟังก์ชันแปลงเวลาที่ผ่านมา
const getRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'เมื่อสักครู่';
    if (diffMins < 60) return `${diffMins} นาทีที่แล้ว`;
    if (diffHours < 24) return `${diffHours} ชั่วโมงที่แล้ว`;
    if (diffDays < 7) return `${diffDays} วันที่แล้ว`;
    return formatDateTime(date);
};

const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({
    isOpen,
    onClose,
    documentId,
    documentType,
    documentNumber,
    onVersionRestored,
}) => {
    // State
    const [versions, setVersions] = useState<DocumentVersion[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [restoringId, setRestoringId] = useState<string | null>(null);
    const [selectedVersion, setSelectedVersion] = useState<DocumentVersion | null>(null);
    const [showPreview, setShowPreview] = useState(false);

    // ดึงรายการเวอร์ชันเมื่อเปิด Modal
    useEffect(() => {
        if (isOpen && documentId) {
            fetchVersions();
        }
    }, [isOpen, documentId, documentType]);

    const fetchVersions = async () => {
        setLoading(true);
        setError(null);
        
        try {
            const result = await getDocumentVersions(documentId, documentType);
            if (result.success && result.versions) {
                setVersions(result.versions);
            } else {
                setError(result.error || 'ไม่สามารถดึงรายการเวอร์ชันได้');
            }
        } catch (err) {
            setError('เกิดข้อผิดพลาดในการดึงข้อมูล');
        } finally {
            setLoading(false);
        }
    };

    // Restore เวอร์ชัน
    const handleRestore = async (versionId: string, versionNumber: number) => {
        if (!confirm(`คุณแน่ใจหรือไม่ที่จะ restore ไปใช้เวอร์ชัน ${versionNumber}? \n\nระบบจะสำรองข้อมูลปัจจุบันก่อน restore อัตโนมัติ`)) {
            return;
        }
        
        setRestoringId(versionId);
        setError(null);
        
        try {
            const result = await restoreDocumentVersion(versionId);
            if (result.success) {
                fetchVersions(); // รีเฟรชรายการ
                if (onVersionRestored) {
                    onVersionRestored();
                }
            } else {
                setError(result.error || 'ไม่สามารถ restore ได้');
            }
        } catch (err) {
            setError('เกิดข้อผิดพลาดในการ restore');
        } finally {
            setRestoringId(null);
        }
    };

    // Preview เวอร์ชัน
    const handlePreview = (version: DocumentVersion) => {
        setSelectedVersion(version);
        setShowPreview(true);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 dark:bg-black dark:bg-opacity-80 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
            <div className="relative bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-slate-700">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                            เวอร์ชันเอกสาร
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
                    {/* Error */}
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-300 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Loading */}
                    {loading ? (
                        <div className="flex justify-center items-center h-48">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
                        </div>
                    ) : versions.length === 0 ? (
                        // Empty state
                        <div className="text-center py-12">
                            <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">ไม่มีเวอร์ชัน</h3>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                ยังไม่มีการบันทึกเวอร์ชันสำหรับเอกสารนี้
                            </p>
                            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                                เวอร์ชันจะถูกสร้างอัตโนมัติเมื่อมีการแก้ไขเอกสาร
                            </p>
                        </div>
                    ) : (
                        // Versions list
                        <div className="space-y-3">
                            <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                ทั้งหมด {versions.length} เวอร์ชัน
                            </div>
                            {versions.map((version) => (
                                <div
                                    key={version.id}
                                    className={`p-4 rounded-lg border ${
                                        version.isCurrent
                                            ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-700'
                                            : 'bg-white dark:bg-slate-700 border-gray-200 dark:border-slate-600'
                                    }`}
                                >
                                    {/* Header */}
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                                                v{version.versionNumber}
                                            </span>
                                            <div>
                                                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                    เวอร์ชัน {version.versionNumber}
                                                </div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                                    {getRelativeTime(version.createdAt)}
                                                </div>
                                            </div>
                                        </div>
                                        {version.isCurrent && (
                                            <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 font-medium">
                                                ปัจจุบัน
                                            </span>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="ml-10 space-y-1 text-xs text-gray-500 dark:text-gray-400">
                                        <div>
                                            <span className="font-medium">สร้างโดย:</span> {version.creatorName || version.creatorEmail || 'ไม่ระบุ'}
                                        </div>
                                        <div>
                                            <span className="font-medium">เวลา:</span> {formatDateTime(version.createdAt)}
                                        </div>
                                        {version.note && (
                                            <div>
                                                <span className="font-medium">หมายเหตุ:</span> {version.note}
                                            </div>
                                        )}
                                        {version.changesSummary && (
                                            <div>
                                                <span className="font-medium">การเปลี่ยนแปลง:</span> {version.changesSummary}
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="ml-10 mt-3 flex items-center gap-2">
                                        <button
                                            onClick={() => handlePreview(version)}
                                            className="px-3 py-1.5 text-xs rounded bg-gray-100 text-gray-700 dark:bg-slate-600 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-slate-500 flex items-center gap-1"
                                        >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                            ดูข้อมูล
                                        </button>
                                        {!version.isCurrent && (
                                            <button
                                                onClick={() => handleRestore(version.id, version.versionNumber)}
                                                disabled={restoringId === version.id}
                                                className="px-3 py-1.5 text-xs rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/50 flex items-center gap-1 disabled:opacity-50"
                                            >
                                                {restoringId === version.id ? (
                                                    <>
                                                        <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                        </svg>
                                                        กำลัง restore...
                                                    </>
                                                ) : (
                                                    <>
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                        </svg>
                                                        Restore
                                                    </>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
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

            {/* Version Preview Modal */}
            {showPreview && selectedVersion && (
                <div className="fixed inset-0 bg-gray-900 bg-opacity-50 z-[60] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
                        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-slate-700">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                ข้อมูลเวอร์ชัน {selectedVersion.versionNumber}
                            </h3>
                            <button
                                onClick={() => {
                                    setShowPreview(false);
                                    setSelectedVersion(null);
                                }}
                                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto p-4">
                            <pre className="text-xs bg-gray-50 dark:bg-slate-900 p-4 rounded-lg overflow-auto whitespace-pre-wrap">
                                {JSON.stringify(selectedVersion.data, null, 2)}
                            </pre>
                        </div>
                        <div className="flex justify-end p-4 border-t border-gray-200 dark:border-slate-700">
                            <button
                                onClick={() => {
                                    setShowPreview(false);
                                    setSelectedVersion(null);
                                }}
                                className="px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-gray-200 text-sm rounded-md hover:bg-gray-300 dark:hover:bg-slate-600"
                            >
                                ปิด
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VersionHistoryModal;
