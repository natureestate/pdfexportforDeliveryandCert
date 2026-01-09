// DocumentHistoryModal - Modal สำหรับแสดงประวัติการเปลี่ยนแปลงเอกสาร
// แสดง timeline ของการเปลี่ยนแปลงเอกสาร

import React, { useState, useEffect } from 'react';
import { 
    getDocumentHistory, 
    DocumentHistoryEntry, 
    getActionLabel, 
    getActionIcon,
    DocumentHistoryAction 
} from '../services/documentHistory';
import { DocType } from '../utils/documentRegistry';

interface DocumentHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    documentId: string;
    documentType: DocType;
    documentNumber: string;
}

// ฟังก์ชันแปลงวันที่เป็นภาษาไทย
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

// สีตาม action type
const getActionColor = (action: DocumentHistoryAction): string => {
    const colors: Record<DocumentHistoryAction, string> = {
        'create': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
        'update': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
        'lock': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
        'unlock': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
        'archive': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
        'unarchive': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
        'cancel': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
        'restore': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
        'copy': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
        'share': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
        'version_create': 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
    };
    return colors[action] || 'bg-gray-100 text-gray-800';
};

// สีของ timeline dot ตาม action type
const getTimelineDotColor = (action: DocumentHistoryAction): string => {
    const colors: Record<DocumentHistoryAction, string> = {
        'create': 'bg-green-500',
        'update': 'bg-blue-500',
        'lock': 'bg-orange-500',
        'unlock': 'bg-yellow-500',
        'archive': 'bg-gray-500',
        'unarchive': 'bg-cyan-500',
        'cancel': 'bg-red-500',
        'restore': 'bg-emerald-500',
        'copy': 'bg-indigo-500',
        'share': 'bg-purple-500',
        'version_create': 'bg-teal-500',
    };
    return colors[action] || 'bg-gray-500';
};

const DocumentHistoryModal: React.FC<DocumentHistoryModalProps> = ({
    isOpen,
    onClose,
    documentId,
    documentType,
    documentNumber,
}) => {
    const [history, setHistory] = useState<DocumentHistoryEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // ดึงข้อมูลประวัติเมื่อเปิด modal
    useEffect(() => {
        if (isOpen && documentId) {
            fetchHistory();
        }
    }, [isOpen, documentId, documentType]);

    const fetchHistory = async () => {
        setLoading(true);
        setError(null);
        
        try {
            const result = await getDocumentHistory(documentId, documentType, 100);
            if (result.success && result.data) {
                setHistory(result.data);
            } else {
                setError(result.error || 'ไม่สามารถดึงประวัติเอกสารได้');
            }
        } catch (err) {
            setError('เกิดข้อผิดพลาดในการดึงประวัติเอกสาร');
            console.error('Error fetching history:', err);
        } finally {
            setLoading(false);
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
                            ประวัติเอกสาร
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
                    {loading ? (
                        // Loading state
                        <div className="flex justify-center items-center h-48">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
                        </div>
                    ) : error ? (
                        // Error state
                        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 text-center">
                            <p className="text-red-600 dark:text-red-300">{error}</p>
                            <button
                                onClick={fetchHistory}
                                className="mt-2 px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                            >
                                ลองใหม่
                            </button>
                        </div>
                    ) : history.length === 0 ? (
                        // Empty state
                        <div className="text-center py-12">
                            <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">ไม่มีประวัติ</h3>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                ยังไม่มีการบันทึกประวัติสำหรับเอกสารนี้
                            </p>
                        </div>
                    ) : (
                        // Timeline
                        <div className="relative">
                            {/* Timeline line */}
                            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-slate-600"></div>
                            
                            {/* Timeline entries */}
                            <div className="space-y-6">
                                {history.map((entry, index) => (
                                    <div key={entry.id || index} className="relative flex gap-4">
                                        {/* Timeline dot */}
                                        <div className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full ${getTimelineDotColor(entry.action)} text-white text-sm`}>
                                            {getActionIcon(entry.action)}
                                        </div>
                                        
                                        {/* Content card */}
                                        <div className="flex-1 bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3 sm:p-4">
                                            {/* Header */}
                                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionColor(entry.action)}`}>
                                                    {getActionLabel(entry.action)}
                                                </span>
                                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                                    {getRelativeTime(entry.timestamp)}
                                                </span>
                                            </div>
                                            
                                            {/* Description */}
                                            {entry.description && (
                                                <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                                                    {entry.description}
                                                </p>
                                            )}
                                            
                                            {/* Changes (for update action) */}
                                            {entry.changes && Object.keys(entry.changes).length > 0 && (
                                                <div className="mt-2 bg-white dark:bg-slate-800 rounded border border-gray-200 dark:border-slate-600 p-2">
                                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                                        รายละเอียดการเปลี่ยนแปลง:
                                                    </p>
                                                    <ul className="text-xs text-gray-600 dark:text-gray-300 space-y-1">
                                                        {Object.entries(entry.changes).map(([field, change]) => (
                                                            <li key={field} className="flex flex-wrap gap-1">
                                                                <span className="font-medium">{field}:</span>
                                                                <span className="text-red-500 line-through">
                                                                    {typeof change.old === 'object' ? JSON.stringify(change.old) : String(change.old || '-')}
                                                                </span>
                                                                <span className="text-gray-400">→</span>
                                                                <span className="text-green-500">
                                                                    {typeof change.new === 'object' ? JSON.stringify(change.new) : String(change.new || '-')}
                                                                </span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                            
                                            {/* User info */}
                                            <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                </svg>
                                                <span>{entry.userName || entry.userEmail || 'ไม่ระบุ'}</span>
                                                <span className="text-gray-300 dark:text-gray-600">•</span>
                                                <span>{formatDateTime(entry.timestamp)}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
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

export default DocumentHistoryModal;
