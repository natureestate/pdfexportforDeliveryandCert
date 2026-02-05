/**
 * Accept Invitation Page Component
 * หน้าสำหรับยอมรับคำเชิญเข้าองค์กร
 * รองรับ: Google Login, Email/Password, และ Account Linking
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getInvitationByToken, acceptInvitation } from '../services/invitations';
import { updateMemberCount, addMemberFromInvitation } from '../services/companyMembers';
import { Invitation } from '../types';
import { Building2, Crown, User } from 'lucide-react';
import { useConfirm } from './ConfirmDialog';

/**
 * หน้ายอมรับคำเชิญ
 */
const AcceptInvitationPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user, loading: authLoading } = useAuth();
    const { confirm } = useConfirm();

    const [invitation, setInvitation] = useState<Invitation | null>(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    
    // State สำหรับ Email Mismatch
    const [showEmailMismatchOptions, setShowEmailMismatchOptions] = useState(false);

    const token = searchParams.get('token');

    /**
     * โหลดข้อมูลคำเชิญ
     */
    useEffect(() => {
        const loadInvitation = async () => {
            if (!token) {
                setError('ไม่พบ Token คำเชิญ');
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);

                const invitationData = await getInvitationByToken(token);

                if (!invitationData) {
                    setError('ไม่พบคำเชิญนี้ หรือคำเชิญอาจถูกลบไปแล้ว');
                    setLoading(false);
                    return;
                }

                // ตรวจสอบสถานะ
                if (invitationData.status === 'accepted') {
                    setError('คำเชิญนี้ถูกใช้งานไปแล้ว');
                    setLoading(false);
                    return;
                }

                if (invitationData.status === 'rejected') {
                    setError('คำเชิญนี้ถูกปฏิเสธแล้ว');
                    setLoading(false);
                    return;
                }

                if (invitationData.status === 'expired') {
                    setError('คำเชิญนี้หมดอายุแล้ว');
                    setLoading(false);
                    return;
                }

                // ตรวจสอบวันหมดอายุ
                if (invitationData.expiresAt && invitationData.expiresAt < new Date()) {
                    setError('คำเชิญนี้หมดอายุแล้ว');
                    setLoading(false);
                    return;
                }

                setInvitation(invitationData);
            } catch (err: any) {
                console.error('❌ โหลดคำเชิญล้มเหลว:', err);
                setError(err.message || 'ไม่สามารถโหลดคำเชิญได้');
            } finally {
                setLoading(false);
            }
        };

        loadInvitation();
    }, [token]);

    /**
     * ยอมรับคำเชิญ
     */
    const handleAccept = async () => {
        if (!user) {
            // ถ้ายังไม่ได้ login ให้ redirect ไป login page พร้อม return URL
            const returnUrl = `/accept-invitation?token=${token}`;
            navigate(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
            return;
        }

        if (!invitation) {
            setError('ไม่พบข้อมูลคำเชิญ');
            return;
        }

        // ตรวจสอบว่าอีเมลตรงกันหรือไม่
        if (user.email && invitation.email.toLowerCase() !== user.email.toLowerCase()) {
            // แสดงตัวเลือกให้ผู้ใช้เลือก
            setShowEmailMismatchOptions(true);
            return;
        }

        // ดำเนินการยอมรับคำเชิญ
        await processAcceptInvitation();
    };

    /**
     * ดำเนินการยอมรับคำเชิญ (ใช้ร่วมกันทั้งกรณีอีเมลตรงและไม่ตรง)
     */
    const processAcceptInvitation = async () => {
        if (!user || !invitation) return;

        try {
            setProcessing(true);
            setError(null);

            // ยอมรับคำเชิญ
            await acceptInvitation(token!, user.uid);

            // เพิ่มสมาชิกเข้าองค์กร - รองรับกรณีอีเมลไม่ตรงกัน
            await addMemberFromInvitation(
                invitation.companyId,
                user.uid,
                invitation.email, // ใช้อีเมลจากคำเชิญ
                invitation.role,
                user.phoneNumber || undefined,
                user.displayName || undefined,
                user.email || undefined // อีเมลจริงที่ใช้ login
            );

            // อัปเดตจำนวนสมาชิก
            await updateMemberCount(invitation.companyId);

            console.log('✅ ยอมรับคำเชิญสำเร็จ');
            setSuccess(true);

            // Redirect ไปหน้าหลักหลังจาก 2 วินาที
            setTimeout(() => {
                navigate('/');
            }, 2000);

        } catch (err: any) {
            console.error('❌ ยอมรับคำเชิญล้มเหลว:', err);
            setError(err.message || 'ไม่สามารถยอมรับคำเชิญได้');
        } finally {
            setProcessing(false);
        }
    };

    /**
     * ยอมรับคำเชิญแม้อีเมลไม่ตรงกัน (ผู้ใช้ยืนยันว่าเป็นเจ้าของอีเมลที่ถูกเชิญ)
     */
    const handleAcceptWithDifferentEmail = async () => {
        setShowEmailMismatchOptions(false);
        await processAcceptInvitation();
    };

    /**
     * ยกเลิกและ Logout เพื่อ login ใหม่ด้วยอีเมลที่ถูกต้อง
     */
    const handleLogoutAndRetry = () => {
        setShowEmailMismatchOptions(false);
        const returnUrl = `/accept-invitation?token=${token}`;
        navigate(`/login?returnUrl=${encodeURIComponent(returnUrl)}&logout=true`);
    };

    /**
     * ปฏิเสธคำเชิญ
     */
    const handleReject = async () => {
        const confirmed = await confirm({
            title: 'ยืนยันการปฏิเสธ',
            message: 'คุณแน่ใจหรือไม่ว่าต้องการปฏิเสธคำเชิญนี้?',
            variant: 'warning',
            confirmText: 'ปฏิเสธ',
            cancelText: 'ยกเลิก'
        });
        if (confirmed) {
            navigate('/');
        }
    };

    /**
     * แสดงสถานะการโหลด
     */
    if (loading || authLoading) {
        return (
            <div className="accept-invitation-page">
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p>กำลังโหลดข้อมูลคำเชิญ...</p>
                </div>
                <style>{styles}</style>
            </div>
        );
    }

    /**
     * แสดงข้อความสำเร็จ
     */
    if (success) {
        return (
            <div className="accept-invitation-page">
                <div className="success-container">
                    <div className="success-icon">✅</div>
                    <h1>ยอมรับคำเชิญสำเร็จ!</h1>
                    <p>คุณได้เข้าร่วมองค์กร <strong>{invitation?.companyName}</strong> แล้ว</p>
                    <p className="redirect-message">กำลังนำคุณไปหน้าหลัก...</p>
                </div>
                <style>{styles}</style>
            </div>
        );
    }

    /**
     * แสดงข้อความ error
     */
    if (error) {
        return (
            <div className="accept-invitation-page">
                <div className="error-container">
                    <div className="error-icon">❌</div>
                    <h1>ไม่สามารถยอมรับคำเชิญได้</h1>
                    <p className="error-message">{error}</p>
                    <button onClick={() => navigate('/')} className="btn-primary">
                        กลับหน้าหลัก
                    </button>
                </div>
                <style>{styles}</style>
            </div>
        );
    }

    /**
     * แสดงข้อมูลคำเชิญ
     */
    return (
        <div className="accept-invitation-page">
            <div className="invitation-card">
                <div className="card-header">
                    <div className="icon">🎉</div>
                    <h1>คำเชิญเข้าร่วมองค์กร</h1>
                </div>

                <div className="card-body">
                    <div className="invitation-info">
                        <div className="info-row">
                            <span className="label"><Building2 className="w-4 h-4 inline mr-1" />องค์กร:</span>
                            <span className="value">{invitation?.companyName}</span>
                        </div>
                        <div className="info-row">
                            <span className="label">📧 อีเมล:</span>
                            <span className="value">{invitation?.email}</span>
                        </div>
                        <div className="info-row">
                            <span className="label">👤 บทบาท:</span>
                            <span className="value role-badge">
                                {invitation?.role === 'admin' ? <><Crown className="w-3 h-3 inline mr-0.5" /> Admin (ผู้จัดการ)</> : <><User className="w-3 h-3 inline mr-0.5" /> Member (สมาชิกทั่วไป)</>}
                            </span>
                        </div>
                        {invitation?.invitedByName && (
                            <div className="info-row">
                                <span className="label">✉️ เชิญโดย:</span>
                                <span className="value">
                                    {invitation.invitedByName}
                                    {invitation.invitedByEmail && ` (${invitation.invitedByEmail})`}
                                </span>
                            </div>
                        )}
                        {invitation?.expiresAt && (
                            <div className="info-row">
                                <span className="label">⏰ หมดอายุ:</span>
                                <span className="value">
                                    {invitation.expiresAt.toLocaleDateString('th-TH', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                </span>
                            </div>
                        )}
                    </div>

                    {invitation?.message && (
                        <div className="message-box">
                            <h3>💬 ข้อความจากผู้เชิญ:</h3>
                            <p>{invitation.message}</p>
                        </div>
                    )}

                    {!user && (
                        <div className="warning-box">
                            ⚠️ <strong>หมายเหตุ:</strong> คุณต้อง Login หรือสร้างบัญชีก่อนยอมรับคำเชิญ
                        </div>
                    )}

                    {/* แสดงข้อมูลผู้ใช้ที่ login อยู่ */}
                    {user && (
                        <div className="logged-in-info">
                            <h3>👤 คุณ Login อยู่ในชื่อ:</h3>
                            <p><strong>{user.displayName || user.email || user.phoneNumber}</strong></p>
                            {user.email && user.email.toLowerCase() !== invitation?.email.toLowerCase() && (
                                <div className="email-mismatch-warning">
                                    ⚠️ อีเมลที่ login ({user.email}) <strong>ไม่ตรงกับ</strong> อีเมลที่ถูกเชิญ ({invitation?.email})
                                </div>
                            )}
                        </div>
                    )}

                    {/* Modal ตัวเลือกเมื่ออีเมลไม่ตรงกัน */}
                    {showEmailMismatchOptions && (
                        <div className="email-mismatch-modal">
                            <h3>⚠️ อีเมลไม่ตรงกัน</h3>
                            <p>
                                คำเชิญนี้สำหรับ: <strong>{invitation?.email}</strong><br/>
                                คุณ login ด้วย: <strong>{user?.email}</strong>
                            </p>
                            
                            <div className="mismatch-options">
                                <div className="option-card option-accept">
                                    <h4>✅ ยอมรับคำเชิญด้วยบัญชีนี้</h4>
                                    <p>ถ้าคุณเป็นเจ้าของอีเมล {invitation?.email} และต้องการใช้บัญชี Google ปัจจุบัน</p>
                                    <button 
                                        onClick={handleAcceptWithDifferentEmail}
                                        className="btn-accept"
                                        disabled={processing}
                                    >
                                        {processing ? '⏳ กำลังดำเนินการ...' : '✅ ยืนยันและยอมรับ'}
                                    </button>
                                </div>
                                
                                <div className="option-card option-logout">
                                    <h4>🔄 Login ด้วยอีเมลอื่น</h4>
                                    <p>Logout แล้ว login ใหม่ด้วยอีเมล {invitation?.email}</p>
                                    <button 
                                        onClick={handleLogoutAndRetry}
                                        className="btn-logout"
                                        disabled={processing}
                                    >
                                        🔄 Logout และ Login ใหม่
                                    </button>
                                </div>
                            </div>
                            
                            <button 
                                onClick={() => setShowEmailMismatchOptions(false)}
                                className="btn-cancel-mismatch"
                                disabled={processing}
                            >
                                ยกเลิก
                            </button>
                        </div>
                    )}

                    <div className="role-description">
                        <h3>📋 สิทธิ์ของบทบาท {invitation?.role === 'admin' ? 'Admin' : 'Member'}:</h3>
                        {invitation?.role === 'admin' ? (
                            <ul>
                                <li>✅ สร้างและแก้ไขเอกสารทั้งหมด</li>
                                <li>✅ จัดการสมาชิกในองค์กร</li>
                                <li>✅ เชิญสมาชิกใหม่</li>
                                <li>✅ แก้ไขข้อมูลองค์กร</li>
                                <li>✅ ลบเอกสารและข้อมูล</li>
                            </ul>
                        ) : (
                            <ul>
                                <li>✅ สร้างและแก้ไขเอกสาร</li>
                                <li>✅ ดูเอกสารทั้งหมดในองค์กร</li>
                                <li>✅ จัดการข้อมูลลูกค้า</li>
                                <li>❌ ไม่สามารถจัดการสมาชิกได้</li>
                                <li>❌ ไม่สามารถแก้ไขข้อมูลองค์กรได้</li>
                            </ul>
                        )}
                    </div>
                </div>

                <div className="card-actions">
                    <button
                        onClick={handleReject}
                        className="btn-secondary"
                        disabled={processing}
                    >
                        ❌ ปฏิเสธ
                    </button>
                    <button
                        onClick={handleAccept}
                        className="btn-primary"
                        disabled={processing}
                    >
                        {processing ? '⏳ กำลังดำเนินการ...' : user ? '✅ ยอมรับคำเชิญ' : '🔐 Login เพื่อยอมรับ'}
                    </button>
                </div>
            </div>

            <style>{styles}</style>
        </div>
    );
};

// Styles
const styles = `
    .accept-invitation-page {
        min-height: 100vh;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 20px;
    }

    .loading-container,
    .success-container,
    .error-container {
        background: white;
        border-radius: 12px;
        padding: 40px;
        text-align: center;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        max-width: 500px;
    }

    .spinner {
        border: 4px solid #f3f3f3;
        border-top: 4px solid #667eea;
        border-radius: 50%;
        width: 50px;
        height: 50px;
        animation: spin 1s linear infinite;
        margin: 0 auto 20px;
    }

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }

    .success-icon,
    .error-icon {
        font-size: 64px;
        margin-bottom: 20px;
    }

    .success-container h1 {
        color: #2e7d32;
        margin-bottom: 15px;
    }

    .error-container h1 {
        color: #c62828;
        margin-bottom: 15px;
    }

    .error-message {
        color: #666;
        white-space: pre-line;
        line-height: 1.6;
    }

    .redirect-message {
        color: #666;
        font-style: italic;
        margin-top: 15px;
    }

    .invitation-card {
        background: white;
        border-radius: 12px;
        max-width: 700px;
        width: 100%;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        overflow: hidden;
    }

    .card-header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 30px;
        text-align: center;
    }

    .card-header .icon {
        font-size: 64px;
        margin-bottom: 10px;
    }

    .card-header h1 {
        margin: 0;
        font-size: 28px;
    }

    .card-body {
        padding: 30px;
    }

    .invitation-info {
        background: #f8f9fa;
        border-radius: 8px;
        padding: 20px;
        margin-bottom: 20px;
    }

    .info-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 0;
        border-bottom: 1px solid #e0e0e0;
    }

    .info-row:last-child {
        border-bottom: none;
    }

    .info-row .label {
        font-weight: 600;
        color: #555;
        flex: 0 0 140px;
    }

    .info-row .value {
        flex: 1;
        text-align: right;
        color: #333;
        word-break: break-word;
    }

    .role-badge {
        display: inline-block;
        padding: 6px 12px;
        background: #e3f2fd;
        color: #1565c0;
        border-radius: 12px;
        font-weight: 600;
        font-size: 14px;
    }

    .message-box {
        background: #fff3e0;
        border-left: 4px solid #ff9800;
        padding: 15px;
        border-radius: 4px;
        margin-bottom: 20px;
    }

    .message-box h3 {
        margin: 0 0 10px 0;
        font-size: 16px;
        color: #e65100;
    }

    .message-box p {
        margin: 0;
        color: #555;
        line-height: 1.6;
    }

    .warning-box {
        background: #fff3cd;
        border: 1px solid #ffc107;
        padding: 12px;
        border-radius: 4px;
        margin-bottom: 20px;
        font-size: 14px;
        color: #856404;
    }

    .logged-in-info {
        background: #e3f2fd;
        border-left: 4px solid #2196F3;
        padding: 15px;
        border-radius: 4px;
        margin-bottom: 20px;
    }

    .logged-in-info h3 {
        margin: 0 0 8px 0;
        font-size: 14px;
        color: #1565c0;
    }

    .logged-in-info p {
        margin: 0;
        color: #333;
    }

    .email-mismatch-warning {
        background: #fff3e0;
        border: 1px solid #ff9800;
        padding: 10px;
        border-radius: 4px;
        margin-top: 10px;
        font-size: 13px;
        color: #e65100;
    }

    .email-mismatch-modal {
        background: white;
        border: 2px solid #ff9800;
        border-radius: 12px;
        padding: 25px;
        margin: 20px 0;
        box-shadow: 0 4px 20px rgba(255, 152, 0, 0.2);
    }

    .email-mismatch-modal h3 {
        margin: 0 0 15px 0;
        color: #e65100;
        font-size: 20px;
    }

    .email-mismatch-modal p {
        color: #555;
        margin-bottom: 20px;
        line-height: 1.6;
    }

    .mismatch-options {
        display: grid;
        gap: 15px;
        margin-bottom: 20px;
    }

    .option-card {
        border: 2px solid #e0e0e0;
        border-radius: 8px;
        padding: 20px;
        transition: all 0.3s;
    }

    .option-card:hover {
        border-color: #667eea;
        box-shadow: 0 2px 10px rgba(102, 126, 234, 0.2);
    }

    .option-card h4 {
        margin: 0 0 10px 0;
        font-size: 16px;
        color: #333;
    }

    .option-card p {
        margin: 0 0 15px 0;
        font-size: 13px;
        color: #666;
    }

    .option-accept {
        border-color: #4CAF50;
        background: #f1f8e9;
    }

    .option-logout {
        border-color: #2196F3;
        background: #e3f2fd;
    }

    .btn-accept {
        width: 100%;
        padding: 12px;
        background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
        color: white;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s;
    }

    .btn-accept:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4);
    }

    .btn-accept:disabled {
        background: #ccc;
        cursor: not-allowed;
        transform: none;
    }

    .btn-logout {
        width: 100%;
        padding: 12px;
        background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%);
        color: white;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s;
    }

    .btn-logout:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(33, 150, 243, 0.4);
    }

    .btn-logout:disabled {
        background: #ccc;
        cursor: not-allowed;
        transform: none;
    }

    .btn-cancel-mismatch {
        width: 100%;
        padding: 10px;
        background: #f5f5f5;
        color: #666;
        border: 2px solid #e0e0e0;
        border-radius: 6px;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.3s;
    }

    .btn-cancel-mismatch:hover:not(:disabled) {
        background: #e0e0e0;
    }

    .btn-cancel-mismatch:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .role-description {
        background: #f8f9fa;
        border-radius: 8px;
        padding: 20px;
        margin-top: 20px;
    }

    .role-description h3 {
        margin: 0 0 15px 0;
        font-size: 16px;
        color: #333;
    }

    .role-description ul {
        margin: 0;
        padding-left: 20px;
        list-style: none;
    }

    .role-description li {
        padding: 6px 0;
        color: #555;
        line-height: 1.5;
    }

    .card-actions {
        display: flex;
        gap: 15px;
        padding: 20px 30px;
        background: #f8f9fa;
        border-top: 1px solid #e0e0e0;
    }

    .btn-primary,
    .btn-secondary {
        flex: 1;
        padding: 14px 24px;
        border: none;
        border-radius: 8px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s;
    }

    .btn-primary {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
    }

    .btn-primary:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }

    .btn-primary:disabled {
        background: #ccc;
        cursor: not-allowed;
        transform: none;
    }

    .btn-secondary {
        background: white;
        color: #666;
        border: 2px solid #e0e0e0;
    }

    .btn-secondary:hover:not(:disabled) {
        background: #f5f5f5;
        border-color: #ccc;
    }

    .btn-secondary:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    @media (max-width: 768px) {
        .invitation-card {
            margin: 10px;
        }

        .card-header h1 {
            font-size: 22px;
        }

        .card-body {
            padding: 20px;
        }

        .info-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 5px;
        }

        .info-row .label {
            flex: none;
        }

        .info-row .value {
            text-align: left;
        }

        .card-actions {
            flex-direction: column-reverse;
            padding: 15px 20px;
        }

        .btn-primary,
        .btn-secondary {
            width: 100%;
        }
    }
`;

export default AcceptInvitationPage;

