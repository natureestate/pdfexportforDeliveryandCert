/**
 * Access Requests Manager Component
 * สำหรับ Admin จัดการคำขอเข้าร่วมองค์กร
 */

import React, { useState, useEffect } from 'react';
import {
    getAccessRequests,
    approveAccessRequest,
    rejectAccessRequest,
    getPendingRequestsCount,
} from '../services/accessRequests';
import { AccessRequest, AccessRequestStatus, UserRole } from '../types';
import {
    UserPlus,
    Check,
    X,
    Loader2,
    AlertCircle,
    Clock,
    CheckCircle2,
    XCircle,
    Mail,
    Phone,
    MessageSquare,
    RefreshCw,
    Filter,
    Shield,
} from 'lucide-react';

interface AccessRequestsManagerProps {
    companyId: string;
    companyName: string;
}

const AccessRequestsManager: React.FC<AccessRequestsManagerProps> = ({
    companyId,
    companyName,
}) => {
    const [requests, setRequests] = useState<AccessRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<AccessRequestStatus | 'all'>('all');
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [showRejectModal, setShowRejectModal] = useState<AccessRequest | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [approveRole, setApproveRole] = useState<UserRole>('member');
    const [showApproveModal, setShowApproveModal] = useState<AccessRequest | null>(null);
    const [pendingCount, setPendingCount] = useState(0);

    /**
     * โหลดรายการคำขอ
     */
    const loadRequests = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const filter = statusFilter === 'all' ? undefined : statusFilter;
            const result = await getAccessRequests(companyId, filter);
            setRequests(result);
            
            // นับจำนวน pending
            const count = await getPendingRequestsCount(companyId);
            setPendingCount(count);
        } catch (err: any) {
            setError(err.message || 'ไม่สามารถโหลดข้อมูลได้');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadRequests();
    }, [companyId, statusFilter]);

    /**
     * อนุมัติคำขอ
     */
    const handleApprove = async () => {
        if (!showApproveModal) return;
        
        setProcessingId(showApproveModal.id!);
        setError(null);

        try {
            await approveAccessRequest(showApproveModal.id!, approveRole);
            setShowApproveModal(null);
            setApproveRole('member');
            await loadRequests();
        } catch (err: any) {
            setError(err.message || 'ไม่สามารถอนุมัติได้');
        } finally {
            setProcessingId(null);
        }
    };

    /**
     * ปฏิเสธคำขอ
     */
    const handleReject = async () => {
        if (!showRejectModal) return;
        
        setProcessingId(showRejectModal.id!);
        setError(null);

        try {
            await rejectAccessRequest(showRejectModal.id!, rejectReason.trim() || undefined);
            setShowRejectModal(null);
            setRejectReason('');
            await loadRequests();
        } catch (err: any) {
            setError(err.message || 'ไม่สามารถปฏิเสธได้');
        } finally {
            setProcessingId(null);
        }
    };

    /**
     * จัดรูปแบบวันที่
     */
    const formatDate = (date?: Date): string => {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    /**
     * สีตามสถานะ
     */
    const getStatusColor = (status: AccessRequestStatus) => {
        switch (status) {
            case 'pending':
                return 'bg-amber-100 text-amber-800';
            case 'approved':
                return 'bg-emerald-100 text-emerald-800';
            case 'rejected':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    /**
     * ข้อความสถานะ
     */
    const getStatusLabel = (status: AccessRequestStatus) => {
        switch (status) {
            case 'pending':
                return 'รอการอนุมัติ';
            case 'approved':
                return 'อนุมัติแล้ว';
            case 'rejected':
                return 'ปฏิเสธ';
            default:
                return status;
        }
    };

    /**
     * ไอคอนสถานะ
     */
    const StatusIcon = ({ status }: { status: AccessRequestStatus }) => {
        switch (status) {
            case 'pending':
                return <Clock className="w-4 h-4" />;
            case 'approved':
                return <CheckCircle2 className="w-4 h-4" />;
            case 'rejected':
                return <XCircle className="w-4 h-4" />;
            default:
                return null;
        }
    };

    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center relative">
                        <UserPlus className="w-5 h-5 text-blue-600" />
                        {pendingCount > 0 && (
                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                                {pendingCount > 9 ? '9+' : pendingCount}
                            </span>
                        )}
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900">คำขอเข้าร่วม</h3>
                        <p className="text-sm text-gray-500">
                            จัดการคำขอเข้าร่วมองค์กรจากผู้ใช้
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {/* Filter */}
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as AccessRequestStatus | 'all')}
                            className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="all">ทั้งหมด</option>
                            <option value="pending">รอการอนุมัติ</option>
                            <option value="approved">อนุมัติแล้ว</option>
                            <option value="rejected">ปฏิเสธ</option>
                        </select>
                    </div>
                    <button
                        onClick={loadRequests}
                        disabled={isLoading}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                        title="รีเฟรช"
                    >
                        <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="p-4 bg-red-50 border-b border-red-200 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <p className="text-sm text-red-700">{error}</p>
                    <button onClick={() => setError(null)} className="ml-auto">
                        <X className="w-4 h-4 text-red-500" />
                    </button>
                </div>
            )}

            {/* Content */}
            <div className="p-4">
                {isLoading ? (
                    <div className="text-center py-8">
                        <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto" />
                        <p className="text-sm text-gray-500 mt-2">กำลังโหลด...</p>
                    </div>
                ) : requests.length === 0 ? (
                    <div className="text-center py-8">
                        <UserPlus className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">
                            {statusFilter === 'pending'
                                ? 'ไม่มีคำขอที่รอการอนุมัติ'
                                : 'ยังไม่มีคำขอเข้าร่วม'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {requests.map((request) => (
                            <div
                                key={request.id}
                                className={`border rounded-lg p-4 ${
                                    request.status === 'pending' ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-200'
                                }`}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        {/* User info */}
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                                                <span className="text-sm font-medium text-gray-600">
                                                    {(request.userName || request.userEmail || '?')[0].toUpperCase()}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900">
                                                    {request.userName || 'ไม่ระบุชื่อ'}
                                                </p>
                                                <div className="flex items-center gap-3 text-sm text-gray-500">
                                                    {request.userEmail && (
                                                        <span className="flex items-center gap-1">
                                                            <Mail className="w-3 h-3" />
                                                            {request.userEmail}
                                                        </span>
                                                    )}
                                                    {request.userPhone && (
                                                        <span className="flex items-center gap-1">
                                                            <Phone className="w-3 h-3" />
                                                            {request.userPhone}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Message */}
                                        {request.message && (
                                            <div className="flex items-start gap-2 mt-2 p-2 bg-white rounded border border-gray-200">
                                                <MessageSquare className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                                                <p className="text-sm text-gray-600">{request.message}</p>
                                            </div>
                                        )}

                                        {/* Status & Date */}
                                        <div className="flex items-center gap-3 mt-3 text-sm">
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded ${getStatusColor(request.status)}`}>
                                                <StatusIcon status={request.status} />
                                                {getStatusLabel(request.status)}
                                            </span>
                                            <span className="text-gray-500">
                                                ส่งเมื่อ {formatDate(request.createdAt)}
                                            </span>
                                            {request.reviewedAt && (
                                                <span className="text-gray-500">
                                                    ตรวจสอบเมื่อ {formatDate(request.reviewedAt)}
                                                </span>
                                            )}
                                        </div>

                                        {/* Rejection reason */}
                                        {request.status === 'rejected' && request.rejectionReason && (
                                            <div className="mt-2 p-2 bg-red-50 rounded border border-red-200">
                                                <p className="text-sm text-red-700">
                                                    <strong>เหตุผล:</strong> {request.rejectionReason}
                                                </p>
                                            </div>
                                        )}

                                        {/* Approved role */}
                                        {request.status === 'approved' && request.assignedRole && (
                                            <div className="mt-2 flex items-center gap-1 text-sm text-emerald-700">
                                                <Shield className="w-4 h-4" />
                                                <span>เข้าร่วมเป็น {request.assignedRole === 'admin' ? 'Admin' : 'Member'}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    {request.status === 'pending' && (
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => {
                                                    setShowApproveModal(request);
                                                    setApproveRole('member');
                                                }}
                                                disabled={processingId === request.id}
                                                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 text-sm"
                                            >
                                                {processingId === request.id ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Check className="w-4 h-4" />
                                                )}
                                                <span>อนุมัติ</span>
                                            </button>
                                            <button
                                                onClick={() => setShowRejectModal(request)}
                                                disabled={processingId === request.id}
                                                className="flex items-center gap-1 px-3 py-1.5 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50 text-sm"
                                            >
                                                <X className="w-4 h-4" />
                                                <span>ปฏิเสธ</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Approve Modal */}
            {showApproveModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-md w-full shadow-xl">
                        <div className="p-4 border-b border-gray-200">
                            <h3 className="font-semibold text-gray-900">อนุมัติคำขอ</h3>
                        </div>

                        <div className="p-4 space-y-4">
                            <p className="text-gray-600">
                                อนุมัติให้ <strong>{showApproveModal.userName || showApproveModal.userEmail}</strong> เข้าร่วมองค์กร
                            </p>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    กำหนดบทบาท
                                </label>
                                <select
                                    value={approveRole}
                                    onChange={(e) => setApproveRole(e.target.value as UserRole)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                >
                                    <option value="member">Member (สมาชิกทั่วไป)</option>
                                    <option value="admin">Admin (ผู้ดูแลระบบ)</option>
                                </select>
                            </div>
                        </div>

                        <div className="p-4 border-t border-gray-200 flex gap-3">
                            <button
                                onClick={() => setShowApproveModal(null)}
                                disabled={processingId === showApproveModal.id}
                                className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={handleApprove}
                                disabled={processingId === showApproveModal.id}
                                className="flex-1 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {processingId === showApproveModal.id ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>กำลังอนุมัติ...</span>
                                    </>
                                ) : (
                                    <>
                                        <Check className="w-4 h-4" />
                                        <span>อนุมัติ</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reject Modal */}
            {showRejectModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-md w-full shadow-xl">
                        <div className="p-4 border-b border-gray-200">
                            <h3 className="font-semibold text-gray-900">ปฏิเสธคำขอ</h3>
                        </div>

                        <div className="p-4 space-y-4">
                            <p className="text-gray-600">
                                ปฏิเสธคำขอจาก <strong>{showRejectModal.userName || showRejectModal.userEmail}</strong>
                            </p>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    เหตุผล (ไม่บังคับ)
                                </label>
                                <textarea
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    placeholder="เช่น ไม่พบข้อมูลในระบบ..."
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                />
                            </div>
                        </div>

                        <div className="p-4 border-t border-gray-200 flex gap-3">
                            <button
                                onClick={() => {
                                    setShowRejectModal(null);
                                    setRejectReason('');
                                }}
                                disabled={processingId === showRejectModal.id}
                                className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={handleReject}
                                disabled={processingId === showRejectModal.id}
                                className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {processingId === showRejectModal.id ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>กำลังปฏิเสธ...</span>
                                    </>
                                ) : (
                                    <>
                                        <X className="w-4 h-4" />
                                        <span>ปฏิเสธ</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AccessRequestsManager;
