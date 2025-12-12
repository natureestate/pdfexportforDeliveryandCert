/**
 * User Management Component
 * Component สำหรับ Admin จัดการสมาชิกในองค์กร
 * รองรับ: เพิ่ม, แก้ไข, ลบสมาชิก และจัดการคำเชิญ
 */

import React, { useState, useEffect } from 'react';
import { CompanyMember, UserRole, Invitation } from '../types';
import {
    getCompanyMembers,
    addCompanyMember,
    updateMemberRole,
    removeMember,
    checkIsAdmin,
    updateMemberCount,
    updateMemberInfo,
    addMemberDirect,
} from '../services/companyMembers';
import {
    getCompanyInvitations,
    cancelInvitation,
    resendInvitation,
    checkExpiredInvitations,
} from '../services/invitations';
import { useAuth } from '../contexts/AuthContext';
import InviteMemberModal from './InviteMemberModal';
import OrganizationCodeManager from './OrganizationCodeManager';
import AccessRequestsManager from './AccessRequestsManager';
import { Users, Crown, User, Save, Loader, KeyRound, UserPlus } from 'lucide-react';

interface UserManagementProps {
    companyId: string;
    companyName: string;
    onClose?: () => void;
}

/**
 * Interface สำหรับ Edit Member Form
 */
interface EditMemberForm {
    displayName: string;
    phoneNumber: string;
    role: UserRole;
}

/**
 * Interface สำหรับ Add Member Form
 */
interface AddMemberForm {
    email: string;
    displayName: string;
    phoneNumber: string;
    role: UserRole;
}

/**
 * Component สำหรับจัดการสมาชิกในองค์กร
 */
const UserManagement: React.FC<UserManagementProps> = ({ companyId, companyName, onClose }) => {
    const { user } = useAuth();
    const [members, setMembers] = useState<CompanyMember[]>([]);
    const [invitations, setInvitations] = useState<Invitation[]>([]);
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [activeTab, setActiveTab] = useState<'members' | 'invitations' | 'codes' | 'requests'>('members');
    
    // State สำหรับ Add Member Modal
    const [showAddMemberModal, setShowAddMemberModal] = useState(false);
    const [addMemberForm, setAddMemberForm] = useState<AddMemberForm>({
        email: '',
        displayName: '',
        phoneNumber: '',
        role: 'member',
    });
    const [addMemberLoading, setAddMemberLoading] = useState(false);
    const [addMemberError, setAddMemberError] = useState<string | null>(null);
    
    // State สำหรับ Edit Member Modal
    const [showEditMemberModal, setShowEditMemberModal] = useState(false);
    const [editingMember, setEditingMember] = useState<CompanyMember | null>(null);
    const [editMemberForm, setEditMemberForm] = useState<EditMemberForm>({
        displayName: '',
        phoneNumber: '',
        role: 'member',
    });
    const [editMemberLoading, setEditMemberLoading] = useState(false);
    const [editMemberError, setEditMemberError] = useState<string | null>(null);

    /**
     * โหลดรายการสมาชิกและคำเชิญ
     */
    const loadMembers = async () => {
        try {
            setLoading(true);
            setError(null);

            // ตรวจสอบว่าเป็น Admin หรือไม่
            if (user) {
                const adminStatus = await checkIsAdmin(companyId, user.uid);
                setIsAdmin(adminStatus);
            }

            // ดึงรายการสมาชิก
            const membersList = await getCompanyMembers(companyId);
            setMembers(membersList);

            // ดึงรายการคำเชิญ (เฉพาะ Admin)
            if (user) {
                const adminStatus = await checkIsAdmin(companyId, user.uid);
                if (adminStatus) {
                    // ตรวจสอบคำเชิญที่หมดอายุก่อน
                    await checkExpiredInvitations(companyId);
                    
                    const invitationsList = await getCompanyInvitations(companyId);
                    setInvitations(invitationsList);
                }
            }
        } catch (err: any) {
            console.error('❌ โหลดข้อมูลล้มเหลว:', err);
            setError(err.message || 'ไม่สามารถโหลดรายการได้');
        } finally {
            setLoading(false);
        }
    };

    /**
     * ยกเลิกคำเชิญ
     */
    const handleCancelInvitation = async (invitationId: string, email: string) => {
        if (!confirm(`ต้องการยกเลิกคำเชิญสำหรับ ${email} หรือไม่?`)) {
            return;
        }

        try {
            await cancelInvitation(invitationId);
            await loadMembers();
            alert('✅ ยกเลิกคำเชิญสำเร็จ');
        } catch (err: any) {
            console.error('❌ ยกเลิกคำเชิญล้มเหลว:', err);
            alert(err.message || 'ไม่สามารถยกเลิกคำเชิญได้');
        }
    };

    /**
     * ส่งคำเชิญใหม่
     */
    const handleResendInvitation = async (invitationId: string, email: string) => {
        if (!confirm(`ต้องการส่งคำเชิญใหม่ให้ ${email} หรือไม่?`)) {
            return;
        }

        try {
            await resendInvitation(invitationId);
            await loadMembers();
            alert('✅ ส่งคำเชิญใหม่สำเร็จ');
        } catch (err: any) {
            console.error('❌ ส่งคำเชิญใหม่ล้มเหลว:', err);
            alert(err.message || 'ไม่สามารถส่งคำเชิญใหม่ได้');
        }
    };

    /**
     * Copy Invitation Link
     */
    const handleCopyInvitationLink = async (token: string, email: string) => {
        const baseUrl = window.location.origin;
        const invitationLink = `${baseUrl}/accept-invitation?token=${token}`;
        
        try {
            await navigator.clipboard.writeText(invitationLink);
            alert(`✅ คัดลอกลิงก์สำเร็จ!\n\nลิงก์: ${invitationLink}\n\nกรุณาส่งลิงก์นี้ให้ ${email} ทาง Line, Email หรือช่องทางอื่น`);
        } catch (err) {
            // Fallback สำหรับ browser ที่ไม่รองรับ clipboard API
            prompt('กรุณาคัดลอกลิงก์ด้านล่าง:', invitationLink);
        }
    };

    /**
     * เปิด Modal เพิ่มสมาชิกโดยตรง
     */
    const handleOpenAddMember = () => {
        setAddMemberForm({
            email: '',
            displayName: '',
            phoneNumber: '',
            role: 'member',
        });
        setAddMemberError(null);
        setShowAddMemberModal(true);
    };

    /**
     * เพิ่มสมาชิกโดยตรง
     */
    const handleAddMember = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!addMemberForm.email.trim()) {
            setAddMemberError('กรุณากรอกอีเมล');
            return;
        }

        // ตรวจสอบรูปแบบอีเมล
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(addMemberForm.email)) {
            setAddMemberError('รูปแบบอีเมลไม่ถูกต้อง');
            return;
        }

        try {
            setAddMemberLoading(true);
            setAddMemberError(null);

            await addMemberDirect(
                companyId,
                addMemberForm.email.trim(),
                addMemberForm.role,
                addMemberForm.displayName.trim() || undefined,
                addMemberForm.phoneNumber.trim() || undefined
            );

            alert('✅ เพิ่มสมาชิกสำเร็จ');
            setShowAddMemberModal(false);
            await loadMembers();
        } catch (err: any) {
            console.error('❌ เพิ่มสมาชิกล้มเหลว:', err);
            setAddMemberError(err.message || 'ไม่สามารถเพิ่มสมาชิกได้');
        } finally {
            setAddMemberLoading(false);
        }
    };

    /**
     * เปิด Modal แก้ไขสมาชิก
     */
    const handleOpenEditMember = (member: CompanyMember) => {
        setEditingMember(member);
        setEditMemberForm({
            displayName: member.displayName || '',
            phoneNumber: member.phoneNumber || '',
            role: member.role,
        });
        setEditMemberError(null);
        setShowEditMemberModal(true);
    };

    /**
     * บันทึกการแก้ไขสมาชิก
     */
    const handleSaveEditMember = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!editingMember) return;

        try {
            setEditMemberLoading(true);
            setEditMemberError(null);

            await updateMemberInfo(editingMember.id!, {
                displayName: editMemberForm.displayName.trim() || undefined,
                phoneNumber: editMemberForm.phoneNumber.trim() || undefined,
                role: editMemberForm.role,
            });

            alert('✅ แก้ไขข้อมูลสมาชิกสำเร็จ');
            setShowEditMemberModal(false);
            setEditingMember(null);
            await loadMembers();
        } catch (err: any) {
            console.error('❌ แก้ไขข้อมูลล้มเหลว:', err);
            setEditMemberError(err.message || 'ไม่สามารถแก้ไขข้อมูลได้');
        } finally {
            setEditMemberLoading(false);
        }
    };

    /**
     * เปลี่ยนบทบาทของสมาชิก
     */
    const handleChangeRole = async (memberId: string, currentRole: UserRole) => {
        const newRole: UserRole = currentRole === 'admin' ? 'member' : 'admin';
        
        if (!confirm(`ต้องการเปลี่ยนบทบาทเป็น ${newRole === 'admin' ? 'Admin' : 'Member'} หรือไม่?`)) {
            return;
        }

        try {
            await updateMemberRole(memberId, newRole);
            await loadMembers();
            alert('✅ เปลี่ยนบทบาทสำเร็จ');
        } catch (err: any) {
            console.error('❌ เปลี่ยนบทบาทล้มเหลว:', err);
            alert(err.message || 'ไม่สามารถเปลี่ยนบทบาทได้');
        }
    };

    /**
     * ลบสมาชิก
     */
    const handleRemoveMember = async (memberId: string, memberEmail: string) => {
        if (!confirm(`ต้องการลบ ${memberEmail} ออกจากองค์กรหรือไม่?`)) {
            return;
        }

        try {
            await removeMember(memberId);
            await updateMemberCount(companyId);
            await loadMembers();
            alert('✅ ลบสมาชิกสำเร็จ');
        } catch (err: any) {
            console.error('❌ ลบสมาชิกล้มเหลว:', err);
            alert(err.message || 'ไม่สามารถลบสมาชิกได้');
        }
    };

    /**
     * โหลดข้อมูลเมื่อ component mount
     */
    useEffect(() => {
        loadMembers();
    }, [companyId]);

    /**
     * แสดงสถานะการโหลด
     */
    if (loading) {
        return (
            <div className="user-management-container">
                <div className="loading">กำลังโหลดข้อมูล...</div>
            </div>
        );
    }

    return (
        <div className="user-management-container">
            <div className="user-management-header">
                <h2>จัดการสมาชิก: {companyName}</h2>
                {onClose && (
                    <button onClick={onClose} className="close-button">
                        ✕
                    </button>
                )}
            </div>

            {error && (
                <div className="error-message">
                    ⚠️ {error}
                </div>
            )}

            {/* ปุ่มจัดการสมาชิก (เฉพาะ Admin) */}
            {isAdmin && (
                <div className="invite-button-section">
                    <button onClick={() => setShowInviteModal(true)} className="btn-invite">
                        📨 เชิญสมาชิกใหม่
                    </button>
                    <button onClick={handleOpenAddMember} className="btn-add-direct">
                        ➕ เพิ่มสมาชิกโดยตรง
                    </button>
                </div>
            )}

            {/* Tabs */}
            {isAdmin && (
                <div className="tabs">
                    <button
                        className={`tab ${activeTab === 'members' ? 'active' : ''}`}
                        onClick={() => setActiveTab('members')}
                    >
                        <Users className="w-4 h-4 inline mr-1" />สมาชิก ({members.length})
                    </button>
                    <button
                        className={`tab ${activeTab === 'invitations' ? 'active' : ''}`}
                        onClick={() => setActiveTab('invitations')}
                    >
                        📨 คำเชิญ ({invitations.filter(i => i.status === 'pending').length})
                    </button>
                    <button
                        className={`tab ${activeTab === 'codes' ? 'active' : ''}`}
                        onClick={() => setActiveTab('codes')}
                    >
                        <KeyRound className="w-4 h-4 inline mr-1" />Join Codes
                    </button>
                    <button
                        className={`tab ${activeTab === 'requests' ? 'active' : ''}`}
                        onClick={() => setActiveTab('requests')}
                    >
                        <UserPlus className="w-4 h-4 inline mr-1" />คำขอเข้าร่วม
                    </button>
                </div>
            )}

            {/* รายการสมาชิก */}
            {activeTab === 'members' && (
                <div className="members-list-section">
                    <h3>รายการสมาชิก ({members.length} คน)</h3>
                
                {members.length === 0 ? (
                    <div className="no-members">ยังไม่มีสมาชิกในองค์กร</div>
                ) : (
                    <div className="members-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>อีเมล</th>
                                    <th>ชื่อ</th>
                                    <th>เบอร์โทร</th>
                                    <th>บทบาท</th>
                                    <th>สถานะ</th>
                                    <th>วันที่เข้าร่วม</th>
                                    {isAdmin && <th>จัดการ</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {members.map((member) => (
                                    <tr key={member.id}>
                                        <td>{member.email}</td>
                                        <td>{member.displayName || '-'}</td>
                                        <td>{member.phoneNumber || '-'}</td>
                                        <td>
                                            <span className={`role-badge ${member.role}`}>
                                                {member.role === 'admin' ? <><Crown className="w-3 h-3 inline mr-0.5" /> Admin</> : <><User className="w-3 h-3 inline mr-0.5" /> Member</>}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`status-badge ${member.status}`}>
                                                {member.status === 'active' ? '✅ Active' : 
                                                 member.status === 'pending' ? '⏳ Pending' : 
                                                 '❌ Inactive'}
                                            </span>
                                        </td>
                                        <td>
                                            {member.joinedAt 
                                                ? member.joinedAt.toLocaleDateString('th-TH')
                                                : '-'}
                                        </td>
                                        {isAdmin && (
                                            <td className="actions-cell">
                                                {member.userId !== user?.uid && (
                                                    <>
                                                        <button
                                                            onClick={() => handleOpenEditMember(member)}
                                                            className="btn-small btn-edit"
                                                            title="แก้ไขข้อมูล"
                                                        >
                                                            ✏️
                                                        </button>
                                                        <button
                                                            onClick={() => handleChangeRole(member.id!, member.role)}
                                                            className="btn-small btn-secondary"
                                                            title="เปลี่ยนบทบาท"
                                                        >
                                                            🔄
                                                        </button>
                                                        <button
                                                            onClick={() => handleRemoveMember(member.id!, member.email)}
                                                            className="btn-small btn-danger"
                                                            title="ลบสมาชิก"
                                                        >
                                                            🗑️
                                                        </button>
                                                    </>
                                                )}
                                                {member.userId === user?.uid && (
                                                    <>
                                                        <button
                                                            onClick={() => handleOpenEditMember(member)}
                                                            className="btn-small btn-edit"
                                                            title="แก้ไขข้อมูลของฉัน"
                                                        >
                                                            ✏️
                                                        </button>
                                                        <span className="self-indicator">(คุณ)</span>
                                                    </>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                </div>
            )}

            {/* รายการคำเชิญ (เฉพาะ Admin) */}
            {activeTab === 'invitations' && isAdmin && (
                <div className="invitations-list-section">
                    <h3>รายการคำเชิญ ({invitations.length} คำเชิญ)</h3>
                    
                    {invitations.length === 0 ? (
                        <div className="no-invitations">ยังไม่มีคำเชิญ</div>
                    ) : (
                        <div className="invitations-table">
                            <table>
                                <thead>
                                    <tr>
                                        <th>อีเมล</th>
                                        <th>บทบาท</th>
                                        <th>สถานะ</th>
                                        <th>เชิญโดย</th>
                                        <th>วันที่สร้าง</th>
                                        <th>หมดอายุ</th>
                                        <th>จัดการ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {invitations.map((invitation) => (
                                        <tr key={invitation.id}>
                                            <td>{invitation.email}</td>
                                            <td>
                                                <span className={`role-badge ${invitation.role}`}>
                                                    {invitation.role === 'admin' ? <><Crown className="w-3 h-3 inline mr-0.5" /> Admin</> : <><User className="w-3 h-3 inline mr-0.5" /> Member</>}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`status-badge invitation-${invitation.status}`}>
                                                    {invitation.status === 'pending' ? '⏳ รอการยอมรับ' :
                                                     invitation.status === 'accepted' ? '✅ ยอมรับแล้ว' :
                                                     invitation.status === 'rejected' ? '❌ ปฏิเสธ' :
                                                     '⏰ หมดอายุ'}
                                                </span>
                                            </td>
                                            <td>
                                                {invitation.invitedByName || '-'}
                                            </td>
                                            <td>
                                                {invitation.createdAt
                                                    ? invitation.createdAt.toLocaleDateString('th-TH')
                                                    : '-'}
                                            </td>
                                            <td>
                                                {invitation.expiresAt
                                                    ? invitation.expiresAt.toLocaleDateString('th-TH')
                                                    : '-'}
                                            </td>
                                            <td className="actions-cell">
                                                {invitation.status === 'pending' && (
                                                    <>
                                                        <button
                                                            onClick={() => handleCopyInvitationLink(invitation.token, invitation.email)}
                                                            className="btn-small btn-copy"
                                                            title="คัดลอกลิงก์"
                                                        >
                                                            📋
                                                        </button>
                                                        <button
                                                            onClick={() => handleResendInvitation(invitation.id!, invitation.email)}
                                                            className="btn-small btn-secondary"
                                                            title="ส่งใหม่"
                                                        >
                                                            🔄
                                                        </button>
                                                        <button
                                                            onClick={() => handleCancelInvitation(invitation.id!, invitation.email)}
                                                            className="btn-small btn-danger"
                                                            title="ยกเลิก"
                                                        >
                                                            🗑️
                                                        </button>
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Join Codes Tab (เฉพาะ Admin) */}
            {activeTab === 'codes' && isAdmin && (
                <div className="codes-section">
                    <OrganizationCodeManager 
                        companyId={companyId} 
                        companyName={companyName} 
                    />
                </div>
            )}

            {/* Access Requests Tab (เฉพาะ Admin) */}
            {activeTab === 'requests' && isAdmin && (
                <div className="requests-section">
                    <AccessRequestsManager 
                        companyId={companyId} 
                        companyName={companyName} 
                    />
                </div>
            )}

            {/* Modal เชิญสมาชิก */}
            {showInviteModal && (
                <InviteMemberModal
                    companyId={companyId}
                    companyName={companyName}
                    onClose={() => setShowInviteModal(false)}
                    onSuccess={loadMembers}
                />
            )}

            {/* Modal เพิ่มสมาชิกโดยตรง */}
            {showAddMemberModal && (
                <div className="modal-overlay" onClick={() => setShowAddMemberModal(false)}>
                    <div className="modal-content-inner" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header-inner">
                            <h3>➕ เพิ่มสมาชิกโดยตรง</h3>
                            <button 
                                onClick={() => setShowAddMemberModal(false)} 
                                className="close-button"
                                disabled={addMemberLoading}
                            >
                                ✕
                            </button>
                        </div>
                        <form onSubmit={handleAddMember} className="modal-body">
                            {addMemberError && (
                                <div className="error-message">
                                    ⚠️ {addMemberError}
                                </div>
                            )}
                            
                            <div className="form-group">
                                <label htmlFor="add-email">อีเมล *</label>
                                <input
                                    type="email"
                                    id="add-email"
                                    value={addMemberForm.email}
                                    onChange={(e) => setAddMemberForm({...addMemberForm, email: e.target.value})}
                                    placeholder="example@email.com"
                                    required
                                    disabled={addMemberLoading}
                                    autoFocus
                                />
                            </div>
                            
                            <div className="form-group">
                                <label htmlFor="add-displayName">ชื่อแสดง</label>
                                <input
                                    type="text"
                                    id="add-displayName"
                                    value={addMemberForm.displayName}
                                    onChange={(e) => setAddMemberForm({...addMemberForm, displayName: e.target.value})}
                                    placeholder="ชื่อ-นามสกุล"
                                    disabled={addMemberLoading}
                                />
                            </div>
                            
                            <div className="form-group">
                                <label htmlFor="add-phoneNumber">เบอร์โทรศัพท์</label>
                                <input
                                    type="tel"
                                    id="add-phoneNumber"
                                    value={addMemberForm.phoneNumber}
                                    onChange={(e) => setAddMemberForm({...addMemberForm, phoneNumber: e.target.value})}
                                    placeholder="08x-xxx-xxxx"
                                    disabled={addMemberLoading}
                                />
                            </div>
                            
                            <div className="form-group">
                                <label htmlFor="add-role">บทบาท *</label>
                                <select
                                    id="add-role"
                                    value={addMemberForm.role}
                                    onChange={(e) => setAddMemberForm({...addMemberForm, role: e.target.value as UserRole})}
                                    disabled={addMemberLoading}
                                >
                                    <option value="member">Member (สมาชิกทั่วไป)</option>
                                    <option value="admin">Admin (ผู้จัดการ)</option>
                                </select>
                            </div>
                            
                            <div className="modal-actions-inner">
                                <button
                                    type="button"
                                    onClick={() => setShowAddMemberModal(false)}
                                    className="btn-cancel"
                                    disabled={addMemberLoading}
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="submit"
                                    className="btn-submit"
                                    disabled={addMemberLoading}
                                >
                                    {addMemberLoading ? '⏳ กำลังเพิ่ม...' : '✅ เพิ่มสมาชิก'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal แก้ไขสมาชิก */}
            {showEditMemberModal && editingMember && (
                <div className="modal-overlay" onClick={() => setShowEditMemberModal(false)}>
                    <div className="modal-content-inner" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header-inner">
                            <h3>✏️ แก้ไขข้อมูลสมาชิก</h3>
                            <button 
                                onClick={() => setShowEditMemberModal(false)} 
                                className="close-button"
                                disabled={editMemberLoading}
                            >
                                ✕
                            </button>
                        </div>
                        <form onSubmit={handleSaveEditMember} className="modal-body">
                            {editMemberError && (
                                <div className="error-message">
                                    ⚠️ {editMemberError}
                                </div>
                            )}
                            
                            <div className="form-group">
                                <label>อีเมล</label>
                                <input
                                    type="email"
                                    value={editingMember.email}
                                    disabled
                                    className="input-disabled"
                                />
                                <small className="hint">อีเมลไม่สามารถเปลี่ยนได้</small>
                            </div>
                            
                            <div className="form-group">
                                <label htmlFor="edit-displayName">ชื่อแสดง</label>
                                <input
                                    type="text"
                                    id="edit-displayName"
                                    value={editMemberForm.displayName}
                                    onChange={(e) => setEditMemberForm({...editMemberForm, displayName: e.target.value})}
                                    placeholder="ชื่อ-นามสกุล"
                                    disabled={editMemberLoading}
                                />
                            </div>
                            
                            <div className="form-group">
                                <label htmlFor="edit-phoneNumber">เบอร์โทรศัพท์</label>
                                <input
                                    type="tel"
                                    id="edit-phoneNumber"
                                    value={editMemberForm.phoneNumber}
                                    onChange={(e) => setEditMemberForm({...editMemberForm, phoneNumber: e.target.value})}
                                    placeholder="08x-xxx-xxxx"
                                    disabled={editMemberLoading}
                                />
                            </div>
                            
                            <div className="form-group">
                                <label htmlFor="edit-role">บทบาท</label>
                                <select
                                    id="edit-role"
                                    value={editMemberForm.role}
                                    onChange={(e) => setEditMemberForm({...editMemberForm, role: e.target.value as UserRole})}
                                    disabled={editMemberLoading || editingMember.userId === user?.uid}
                                >
                                    <option value="member">Member (สมาชิกทั่วไป)</option>
                                    <option value="admin">Admin (ผู้จัดการ)</option>
                                </select>
                                {editingMember.userId === user?.uid && (
                                    <small className="hint">ไม่สามารถเปลี่ยนบทบาทของตัวเองได้</small>
                                )}
                            </div>
                            
                            <div className="modal-actions-inner">
                                <button
                                    type="button"
                                    onClick={() => setShowEditMemberModal(false)}
                                    className="btn-cancel"
                                    disabled={editMemberLoading}
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="submit"
                                    className="btn-submit"
                                    disabled={editMemberLoading}
                                >
                                    {editMemberLoading ? <><Loader className="w-4 h-4 inline mr-1 animate-spin" />กำลังบันทึก...</> : <><Save className="w-4 h-4 inline mr-1" />บันทึก</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style>{`
                .user-management-container {
                    padding: 20px;
                    max-width: 1200px;
                    margin: 0 auto;
                }

                .user-management-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                    padding-bottom: 10px;
                    border-bottom: 2px solid #e0e0e0;
                }

                .user-management-header h2 {
                    margin: 0;
                    color: #333;
                }

                .close-button {
                    background: #f44336;
                    color: white;
                    border: none;
                    border-radius: 50%;
                    width: 32px;
                    height: 32px;
                    font-size: 18px;
                    cursor: pointer;
                    transition: background 0.3s;
                }

                .close-button:hover {
                    background: #d32f2f;
                }

                .loading {
                    text-align: center;
                    padding: 40px;
                    color: #666;
                }

                .error-message {
                    background: #ffebee;
                    color: #c62828;
                    padding: 12px;
                    border-radius: 4px;
                    margin-bottom: 20px;
                }

                .invite-button-section {
                    margin-bottom: 20px;
                    display: flex;
                    gap: 12px;
                    flex-wrap: wrap;
                }

                .btn-invite {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 16px;
                    font-weight: 600;
                    transition: all 0.3s;
                }

                .btn-invite:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
                }

                .btn-add-direct {
                    background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 16px;
                    font-weight: 600;
                    transition: all 0.3s;
                }

                .btn-add-direct:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4);
                }

                .tabs {
                    display: flex;
                    gap: 10px;
                    margin-bottom: 20px;
                    border-bottom: 2px solid #e0e0e0;
                }

                .tab {
                    background: none;
                    border: none;
                    padding: 12px 24px;
                    cursor: pointer;
                    font-size: 16px;
                    font-weight: 500;
                    color: #666;
                    border-bottom: 3px solid transparent;
                    transition: all 0.3s;
                }

                .tab:hover {
                    color: #2196F3;
                }

                .tab.active {
                    color: #2196F3;
                    border-bottom-color: #2196F3;
                }

                .members-list-section,
                .invitations-list-section {
                    margin-top: 20px;
                }

                .members-list-section h3,
                .invitations-list-section h3 {
                    margin-bottom: 15px;
                    color: #333;
                }

                .no-members,
                .no-invitations {
                    text-align: center;
                    padding: 40px;
                    color: #999;
                    background: #f9f9f9;
                    border-radius: 4px;
                }

                .members-table {
                    overflow-x: auto;
                }

                .members-table table {
                    width: 100%;
                    border-collapse: collapse;
                    background: white;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }

                .members-table th,
                .members-table td {
                    padding: 12px;
                    text-align: left;
                    border-bottom: 1px solid #e0e0e0;
                }

                .members-table th {
                    background: #f5f5f5;
                    font-weight: 600;
                    color: #555;
                }

                .members-table tr:hover {
                    background: #f9f9f9;
                }

                .role-badge,
                .status-badge {
                    display: inline-block;
                    padding: 4px 12px;
                    border-radius: 12px;
                    font-size: 12px;
                    font-weight: 500;
                }

                .role-badge.admin {
                    background: #fff3e0;
                    color: #e65100;
                }

                .role-badge.member {
                    background: #e3f2fd;
                    color: #1565c0;
                }

                .status-badge.active {
                    background: #e8f5e9;
                    color: #2e7d32;
                }

                .status-badge.pending {
                    background: #fff3e0;
                    color: #f57c00;
                }

                .status-badge.inactive {
                    background: #ffebee;
                    color: #c62828;
                }

                .status-badge.invitation-pending {
                    background: #fff3e0;
                    color: #f57c00;
                }

                .status-badge.invitation-accepted {
                    background: #e8f5e9;
                    color: #2e7d32;
                }

                .status-badge.invitation-rejected {
                    background: #ffebee;
                    color: #c62828;
                }

                .status-badge.invitation-expired {
                    background: #f5f5f5;
                    color: #666;
                }

                .actions-cell {
                    display: flex;
                    gap: 8px;
                    align-items: center;
                }

                .btn-small {
                    border: none;
                    padding: 6px 10px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                    transition: opacity 0.3s;
                }

                .btn-small:hover {
                    opacity: 0.8;
                }

                .btn-secondary {
                    background: #2196F3;
                    color: white;
                }

                .btn-danger {
                    background: #f44336;
                    color: white;
                }

                .btn-edit {
                    background: #FF9800;
                    color: white;
                }

                .btn-copy {
                    background: #9C27B0;
                    color: white;
                }

                .self-indicator {
                    color: #666;
                    font-size: 12px;
                    font-style: italic;
                }

                /* Modal Styles */
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

                .modal-content-inner {
                    background: white;
                    border-radius: 12px;
                    max-width: 500px;
                    width: 100%;
                    max-height: 90vh;
                    overflow-y: auto;
                    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
                }

                .modal-header-inner {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 20px 25px;
                    border-bottom: 2px solid #e0e0e0;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border-radius: 12px 12px 0 0;
                }

                .modal-header-inner h3 {
                    margin: 0;
                    font-size: 20px;
                }

                .modal-body {
                    padding: 25px;
                }

                .form-group {
                    margin-bottom: 20px;
                }

                .form-group label {
                    display: block;
                    margin-bottom: 8px;
                    font-weight: 600;
                    color: #333;
                    font-size: 14px;
                }

                .form-group input,
                .form-group select {
                    width: 100%;
                    padding: 12px;
                    border: 2px solid #e0e0e0;
                    border-radius: 6px;
                    font-size: 14px;
                    transition: border-color 0.3s;
                    font-family: inherit;
                    box-sizing: border-box;
                }

                .form-group input:focus,
                .form-group select:focus {
                    outline: none;
                    border-color: #667eea;
                }

                .form-group input:disabled,
                .form-group select:disabled {
                    background: #f5f5f5;
                    cursor: not-allowed;
                }

                .input-disabled {
                    background: #f5f5f5 !important;
                    color: #666;
                }

                .hint {
                    display: block;
                    margin-top: 6px;
                    font-size: 12px;
                    color: #666;
                }

                .modal-actions-inner {
                    display: flex;
                    gap: 12px;
                    justify-content: flex-end;
                    margin-top: 25px;
                    padding-top: 20px;
                    border-top: 1px solid #e0e0e0;
                }

                .btn-cancel {
                    padding: 12px 24px;
                    border: none;
                    border-radius: 6px;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    background: #f5f5f5;
                    color: #333;
                    transition: all 0.3s;
                }

                .btn-cancel:hover:not(:disabled) {
                    background: #e0e0e0;
                }

                .btn-cancel:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .btn-submit {
                    padding: 12px 24px;
                    border: none;
                    border-radius: 6px;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    transition: all 0.3s;
                }

                .btn-submit:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
                }

                .btn-submit:disabled {
                    background: #ccc;
                    cursor: not-allowed;
                    transform: none;
                }

                @media (max-width: 768px) {
                    .tabs {
                        overflow-x: auto;
                    }

                    .tab {
                        white-space: nowrap;
                        font-size: 14px;
                        padding: 10px 16px;
                    }

                    .members-table,
                    .invitations-table {
                        font-size: 12px;
                    }

                    .members-table th,
                    .members-table td,
                    .invitations-table th,
                    .invitations-table td {
                        padding: 8px;
                    }
                }
            `}</style>
        </div>
    );
};

export default UserManagement;

