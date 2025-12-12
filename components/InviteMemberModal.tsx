/**
 * Invite Member Modal Component
 * Modal สำหรับเชิญสมาชิกเข้าองค์กร
 */

import React, { useState } from 'react';
import { UserRole } from '../types';
import { createInvitation } from '../services/invitations';
import { getFunctions, httpsCallable, connectFunctionsEmulator } from 'firebase/functions';

interface InviteMemberModalProps {
    companyId: string;
    companyName: string;
    onClose: () => void;
    onSuccess: () => void;
}

/**
 * Modal สำหรับเชิญสมาชิกใหม่
 */
const InviteMemberModal: React.FC<InviteMemberModalProps> = ({
    companyId,
    companyName,
    onClose,
    onSuccess,
}) => {
    const [email, setEmail] = useState('');
    const [role, setRole] = useState<UserRole>('member');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sendEmail, setSendEmail] = useState(true);

    /**
     * จัดการการส่งฟอร์ม
     */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email.trim()) {
            setError('กรุณากรอกอีเมล');
            return;
        }

        // ตรวจสอบรูปแบบอีเมล
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError('รูปแบบอีเมลไม่ถูกต้อง');
            return;
        }

        try {
            setLoading(true);
            setError(null);

            // สร้างคำเชิญ
            const invitation = await createInvitation(
                companyId,
                companyName,
                email.trim(),
                role,
                message.trim() || undefined
            );

            console.log('✅ สร้างคำเชิญสำเร็จ:', invitation);

            // ส่งอีเมลเชิญ (ถ้าเลือก)
            if (sendEmail) {
                try {
                    // ระบุ region ให้ตรงกับ Cloud Function (us-central1)
                    const functions = getFunctions(undefined, 'us-central1');
                    const sendInvitationEmail = httpsCallable(functions, 'sendInvitationEmail');
                    
                    await sendInvitationEmail({
                        invitationId: invitation.id,
                        email: invitation.email,
                        companyName: invitation.companyName,
                        role: invitation.role,
                        invitedByName: invitation.invitedByName,
                        invitedByEmail: invitation.invitedByEmail,
                        token: invitation.token,
                        message: invitation.message,
                    });

                    console.log('✅ ส่งอีเมลเชิญสำเร็จ');
                    alert(`✅ เชิญ ${email} เข้าองค์กรสำเร็จ และส่งอีเมลเรียบร้อยแล้ว`);
                } catch (emailError: any) {
                    console.error('❌ ส่งอีเมลล้มเหลว:', emailError);
                    
                    // สร้าง invitation link สำหรับ copy
                    const baseUrl = window.location.origin;
                    const invitationLink = `${baseUrl}/accept-invitation?token=${invitation.token}`;
                    
                    // แสดง link ให้ copy
                    const shouldCopy = confirm(
                        `⚠️ เชิญสำเร็จ แต่ส่งอีเมลล้มเหลว!\n\n` +
                        `กรุณาคัดลอกลิงก์ด้านล่างแล้วส่งให้ผู้ถูกเชิญ:\n\n` +
                        `กด OK เพื่อคัดลอกลิงก์`
                    );
                    
                    if (shouldCopy) {
                        try {
                            await navigator.clipboard.writeText(invitationLink);
                            alert(`✅ คัดลอกลิงก์แล้ว!\n\nลิงก์: ${invitationLink}\n\nกรุณาส่งลิงก์นี้ให้ ${email}`);
                        } catch (copyError) {
                            // ถ้า clipboard ไม่ทำงาน ให้แสดง link ให้ copy เอง
                            prompt('กรุณาคัดลอกลิงก์ด้านล่าง:', invitationLink);
                        }
                    }
                }
            } else {
                alert(`✅ เชิญ ${email} เข้าองค์กรสำเร็จ\nกรุณาส่งลิงก์คำเชิญด้วยตนเอง`);
            }

            // เรียก callback
            onSuccess();
            onClose();

        } catch (err: any) {
            console.error('❌ เชิญสมาชิกล้มเหลว:', err);
            setError(err.message || 'ไม่สามารถเชิญสมาชิกได้');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>🎉 เชิญสมาชิกใหม่</h2>
                    <button onClick={onClose} className="close-button" disabled={loading}>
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="invite-form">
                    {error && (
                        <div className="error-message">
                            ⚠️ {error}
                        </div>
                    )}

                    <div className="form-section">
                        <label htmlFor="company-name">องค์กร:</label>
                        <input
                            type="text"
                            id="company-name"
                            value={companyName}
                            disabled
                            className="input-disabled"
                        />
                    </div>

                    <div className="form-section">
                        <label htmlFor="email">อีเมลผู้ถูกเชิญ: *</label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="example@email.com"
                            required
                            disabled={loading}
                            autoFocus
                        />
                        <small className="hint">
                            ผู้ถูกเชิญสามารถสร้างบัญชีใหม่หรือใช้บัญชีที่มีอยู่แล้วก็ได้
                        </small>
                    </div>

                    <div className="form-section">
                        <label htmlFor="role">บทบาท: *</label>
                        <select
                            id="role"
                            value={role}
                            onChange={(e) => setRole(e.target.value as UserRole)}
                            disabled={loading}
                        >
                            <option value="member">👤 Member (สมาชิกทั่วไป)</option>
                            <option value="admin">👑 Admin (ผู้จัดการ)</option>
                        </select>
                        <small className="hint">
                            {role === 'admin' 
                                ? 'Admin สามารถจัดการสมาชิก เชิญคนใหม่ และแก้ไขข้อมูลองค์กรได้'
                                : 'Member สามารถสร้างและแก้ไขเอกสารได้ แต่ไม่สามารถจัดการสมาชิกได้'}
                        </small>
                    </div>

                    <div className="form-section">
                        <label htmlFor="message">ข้อความถึงผู้ถูกเชิญ: (ไม่บังคับ)</label>
                        <textarea
                            id="message"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="เช่น: สวัสดีครับ ขอเชิญเข้าร่วมทีมของเรา..."
                            rows={3}
                            disabled={loading}
                        />
                    </div>

                    <div className="form-section checkbox-section">
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={sendEmail}
                                onChange={(e) => setSendEmail(e.target.checked)}
                                disabled={loading}
                            />
                            <span>ส่งอีเมลเชิญอัตโนมัติ</span>
                        </label>
                        <small className="hint">
                            {sendEmail 
                                ? '✅ จะส่งอีเมลพร้อมลิงก์คำเชิญไปยังผู้ถูกเชิญโดยอัตโนมัติ'
                                : '⚠️ คุณจะต้องส่งลิงก์คำเชิญด้วยตนเอง'}
                        </small>
                    </div>

                    <div className="modal-actions">
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn-secondary"
                            disabled={loading}
                        >
                            ยกเลิก
                        </button>
                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={loading}
                        >
                            {loading ? '⏳ กำลังเชิญ...' : '📨 ส่งคำเชิญ'}
                        </button>
                    </div>
                </form>

                <style>{`
                    .modal-overlay {
                        position: fixed;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background: rgba(0, 0, 0, 0.5);
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        z-index: 1000;
                        padding: 20px;
                    }

                    .modal-content {
                        background: white;
                        border-radius: 12px;
                        max-width: 600px;
                        width: 100%;
                        max-height: 90vh;
                        overflow-y: auto;
                        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
                    }

                    :global(.dark) .modal-content {
                        background: #1e293b;
                        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
                    }

                    .modal-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 20px 25px;
                        border-bottom: 2px solid #e0e0e0;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        border-radius: 12px 12px 0 0;
                    }

                    .modal-header h2 {
                        margin: 0;
                        font-size: 22px;
                    }

                    .close-button {
                        background: rgba(255, 255, 255, 0.2);
                        color: white;
                        border: none;
                        border-radius: 50%;
                        width: 36px;
                        height: 36px;
                        font-size: 20px;
                        cursor: pointer;
                        transition: background 0.3s;
                    }

                    .close-button:hover:not(:disabled) {
                        background: rgba(255, 255, 255, 0.3);
                    }

                    .close-button:disabled {
                        opacity: 0.5;
                        cursor: not-allowed;
                    }

                    .invite-form {
                        padding: 25px;
                    }

                    .error-message {
                        background: #ffebee;
                        color: #c62828;
                        padding: 12px;
                        border-radius: 6px;
                        margin-bottom: 20px;
                        border-left: 4px solid #c62828;
                    }

                    :global(.dark) .error-message {
                        background: rgba(239, 68, 68, 0.2);
                        color: #fca5a5;
                        border-left-color: #ef4444;
                    }

                    .form-section {
                        margin-bottom: 20px;
                    }

                    .form-section label {
                        display: block;
                        margin-bottom: 8px;
                        font-weight: 600;
                        color: #333;
                        font-size: 14px;
                    }

                    :global(.dark) .form-section label {
                        color: #e2e8f0;
                    }

                    .form-section input,
                    .form-section select,
                    .form-section textarea {
                        width: 100%;
                        padding: 12px;
                        border: 2px solid #e0e0e0;
                        border-radius: 6px;
                        font-size: 14px;
                        transition: border-color 0.3s;
                        font-family: inherit;
                        background: white;
                        color: #333;
                    }

                    :global(.dark) .form-section input,
                    :global(.dark) .form-section select,
                    :global(.dark) .form-section textarea {
                        background: #334155;
                        border-color: #475569;
                        color: #e2e8f0;
                    }

                    :global(.dark) .form-section input::placeholder,
                    :global(.dark) .form-section textarea::placeholder {
                        color: #94a3b8;
                    }

                    .form-section input:focus,
                    .form-section select:focus,
                    .form-section textarea:focus {
                        outline: none;
                        border-color: #667eea;
                    }

                    :global(.dark) .form-section input:focus,
                    :global(.dark) .form-section select:focus,
                    :global(.dark) .form-section textarea:focus {
                        border-color: #818cf8;
                    }

                    .form-section input:disabled,
                    .form-section select:disabled,
                    .form-section textarea:disabled {
                        background: #f5f5f5;
                        cursor: not-allowed;
                    }

                    :global(.dark) .form-section input:disabled,
                    :global(.dark) .form-section select:disabled,
                    :global(.dark) .form-section textarea:disabled {
                        background: #1e293b;
                        color: #64748b;
                    }

                    .input-disabled {
                        background: #f5f5f5 !important;
                        color: #666;
                    }

                    :global(.dark) .input-disabled {
                        background: #1e293b !important;
                        color: #64748b;
                    }

                    .form-section textarea {
                        resize: vertical;
                        min-height: 80px;
                    }

                    .hint {
                        display: block;
                        margin-top: 6px;
                        font-size: 12px;
                        color: #666;
                        line-height: 1.4;
                    }

                    :global(.dark) .hint {
                        color: #94a3b8;
                    }

                    .checkbox-section {
                        background: #f8f9fa;
                        padding: 15px;
                        border-radius: 6px;
                        border: 2px solid #e0e0e0;
                    }

                    :global(.dark) .checkbox-section {
                        background: #334155;
                        border-color: #475569;
                    }

                    .checkbox-label {
                        display: flex;
                        align-items: center;
                        cursor: pointer;
                        font-weight: 500;
                        margin-bottom: 0;
                    }

                    :global(.dark) .checkbox-label {
                        color: #e2e8f0;
                    }

                    .checkbox-label input[type="checkbox"] {
                        width: auto;
                        margin-right: 10px;
                        cursor: pointer;
                        transform: scale(1.2);
                    }

                    .checkbox-label span {
                        font-size: 14px;
                    }

                    .modal-actions {
                        display: flex;
                        gap: 12px;
                        justify-content: flex-end;
                        margin-top: 25px;
                        padding-top: 20px;
                        border-top: 1px solid #e0e0e0;
                    }

                    :global(.dark) .modal-actions {
                        border-top-color: #475569;
                    }

                    .btn-primary,
                    .btn-secondary {
                        padding: 12px 24px;
                        border: none;
                        border-radius: 6px;
                        font-size: 14px;
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
                        background: #f5f5f5;
                        color: #333;
                    }

                    :global(.dark) .btn-secondary {
                        background: #475569;
                        color: #e2e8f0;
                    }

                    .btn-secondary:hover:not(:disabled) {
                        background: #e0e0e0;
                    }

                    :global(.dark) .btn-secondary:hover:not(:disabled) {
                        background: #64748b;
                    }

                    .btn-secondary:disabled {
                        opacity: 0.5;
                        cursor: not-allowed;
                    }

                    @media (max-width: 768px) {
                        .modal-content {
                            max-width: 100%;
                            margin: 10px;
                        }

                        .modal-header h2 {
                            font-size: 18px;
                        }

                        .invite-form {
                            padding: 20px;
                        }

                        .modal-actions {
                            flex-direction: column-reverse;
                        }

                        .btn-primary,
                        .btn-secondary {
                            width: 100%;
                        }
                    }
                `}</style>
            </div>
        </div>
    );
};

export default InviteMemberModal;

