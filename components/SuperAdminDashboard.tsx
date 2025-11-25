/**
 * Super Admin Dashboard Component
 * Dashboard สำหรับ Super Admin จัดการระบบทั้งหมด
 */

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
    isSuperAdmin,
    getSystemStats,
    getAllCompanies,
    getAllMembers,
    getAllInvitations,
} from '../services/superAdmin';
import { SystemStats, Company, CompanyMember, Invitation, CompanyQuota, SubscriptionPlan } from '../types';
import { signOut } from '../services/auth';
import { getAllQuotas, changePlan, updateQuota } from '../services/quota';
import { getAllPlanTemplates, updatePlanTemplate, PlanTemplate } from '../services/planTemplates';

type TabType = 'overview' | 'companies' | 'members' | 'invitations' | 'quotas' | 'plans';

const SuperAdminDashboard: React.FC = () => {
    const { user } = useAuth();
    const [isSuper, setIsSuper] = useState(false);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabType>('overview');
    
    // Data states
    const [stats, setStats] = useState<SystemStats | null>(null);
    const [statsLoading, setStatsLoading] = useState(false);
    const [statsError, setStatsError] = useState<string | null>(null);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [members, setMembers] = useState<CompanyMember[]>([]);
    const [invitations, setInvitations] = useState<Invitation[]>([]);
    const [quotas, setQuotas] = useState<(CompanyQuota & { companyId: string })[]>([]);
    const [planTemplates, setPlanTemplates] = useState<PlanTemplate[]>([]);
    
    // Filter states
    const [selectedCompany, setSelectedCompany] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');
    
    // Quota management states
    const [editingQuota, setEditingQuota] = useState<string | null>(null);
    const [quotaUpdating, setQuotaUpdating] = useState(false);
    
    // Plan management states
    const [editingPlan, setEditingPlan] = useState<string | null>(null);
    const [planUpdating, setPlanUpdating] = useState(false);
    
    // Ref เพื่อติดตามว่าเคยโหลด stats แล้วหรือยัง (เพื่อหลีกเลี่ยง infinite loop)
    const statsLoadedRef = useRef(false);

    /**
     * ตรวจสอบว่าเป็น Super Admin และโหลดข้อมูล
     */
    useEffect(() => {
        const checkAndLoad = async () => {
            if (!user) {
                setLoading(false);
                return;
            }

            try {
                // ตรวจสอบ Super Admin
                const superStatus = await isSuperAdmin(user.uid);
                setIsSuper(superStatus);

                if (superStatus) {
                    // โหลดสถิติ
                    setStatsLoading(true);
                    setStatsError(null);
                    try {
                        const statsData = await getSystemStats();
                        setStats(statsData);
                        statsLoadedRef.current = true;
                    } catch (statsError) {
                        console.error('❌ โหลดสถิติล้มเหลว:', statsError);
                        setStatsError('ไม่สามารถโหลดสถิติได้ กรุณาลองใหม่อีกครั้ง');
                    } finally {
                        setStatsLoading(false);
                    }
                }
            } catch (error) {
                console.error('❌ โหลดข้อมูล Super Admin ล้มเหลว:', error);
                setStatsError('ไม่สามารถโหลดสถิติได้ กรุณาลองใหม่อีกครั้ง');
            } finally {
                setLoading(false);
            }
        };

        checkAndLoad();
    }, [user]);

    /**
     * โหลดสถิติใหม่เมื่อคลิกแท็บ overview (ถ้ายังไม่เคยโหลด)
     */
    useEffect(() => {
        // โหลดสถิติเมื่อเปิดแท็บ overview และยังไม่เคยโหลด และไม่กำลังโหลดอยู่
        if (activeTab === 'overview' && isSuper && !statsLoadedRef.current && !statsLoading) {
            const loadStats = async () => {
                try {
                    setStatsLoading(true);
                    setStatsError(null);
                    const statsData = await getSystemStats();
                    setStats(statsData);
                    statsLoadedRef.current = true;
                } catch (error) {
                    console.error('❌ โหลดสถิติล้มเหลว:', error);
                    setStatsError('ไม่สามารถโหลดสถิติได้ กรุณาลองใหม่อีกครั้ง');
                } finally {
                    setStatsLoading(false);
                }
            };

            loadStats();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, isSuper]);

    /**
     * โหลดข้อมูลตาม Tab
     */
    useEffect(() => {
        const loadTabData = async () => {
            if (!isSuper) return;

            try {
                switch (activeTab) {
                    case 'companies':
                        if (companies.length === 0) {
                            const companiesData = await getAllCompanies();
                            setCompanies(companiesData);
                        }
                        break;
                    case 'members':
                        if (members.length === 0) {
                            const membersData = await getAllMembers(selectedCompany || undefined);
                            setMembers(membersData);
                        }
                        break;
                    case 'invitations':
                        if (invitations.length === 0) {
                            const invitationsData = await getAllInvitations();
                            setInvitations(invitationsData);
                        }
                        break;
                    case 'quotas':
                        if (quotas.length === 0) {
                            const quotasData = await getAllQuotas();
                            setQuotas(quotasData);
                            
                            // โหลดข้อมูลบริษัทด้วยถ้ายังไม่มี
                            if (companies.length === 0) {
                                const companiesData = await getAllCompanies();
                                setCompanies(companiesData);
                            }
                        }
                        
                        // โหลด Plan Templates สำหรับแสดงคำอธิบาย
                        if (planTemplates.length === 0) {
                            const templatesData = await getAllPlanTemplates();
                            setPlanTemplates(templatesData);
                        }
                        break;
                    case 'plans':
                        if (planTemplates.length === 0) {
                            const templatesData = await getAllPlanTemplates();
                            setPlanTemplates(templatesData);
                        }
                        break;
                }
            } catch (error) {
                console.error('❌ โหลดข้อมูลล้มเหลว:', error);
            }
        };

        loadTabData();
    }, [activeTab, isSuper, selectedCompany]);

    /**
     * ฟังก์ชันหาประเภทการ Login ของสมาชิก
     * @param member - ข้อมูลสมาชิก
     * @returns ประเภทการ login (email, phone, หรือ unknown)
     */
    const getAuthType = (member: CompanyMember): 'email' | 'phone' | 'unknown' => {
        // ถ้ามีเบอร์โทรและไม่มีอีเมล = login ด้วยเบอร์โทร
        if (member.phoneNumber && (!member.email || member.email === '')) {
            return 'phone';
        }
        // ถ้ามีอีเมล = login ด้วยอีเมล
        if (member.email && member.email !== '') {
            return 'email';
        }
        // ไม่มีทั้งคู่ = unknown
        return 'unknown';
    };

    /**
     * ฟังก์ชันแสดงข้อมูลติดต่อหลัก (อีเมลหรือเบอร์โทร)
     * @param member - ข้อมูลสมาชิก
     * @returns ข้อความแสดงข้อมูลติดต่อ
     */
    const getPrimaryContact = (member: CompanyMember): string => {
        if (member.email && member.email !== '') {
            return member.email;
        }
        if (member.phoneNumber && member.phoneNumber !== '') {
            return member.phoneNumber;
        }
        return '-';
    };

    /**
     * Filter members by search term
     * รองรับการค้นหาด้วยอีเมล, เบอร์โทร, และชื่อ
     */
    const filteredMembers = members.filter(member => {
        const searchLower = searchTerm.toLowerCase();
        return (
            (member.email || '').toLowerCase().includes(searchLower) ||
            (member.phoneNumber || '').toLowerCase().includes(searchLower) ||
            (member.displayName || '').toLowerCase().includes(searchLower)
        );
    });

    /**
     * Filter invitations by search term
     */
    const filteredInvitations = invitations.filter(invitation =>
        invitation.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invitation.companyName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    /**
     * แสดงสถานะ Loading
     */
    if (loading) {
        return (
            <div className="super-admin-dashboard">
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p>กำลังตรวจสอบสิทธิ์...</p>
                </div>
                <style>{styles}</style>
            </div>
        );
    }

    /**
     * แสดงข้อความไม่มีสิทธิ์
     */
    if (!isSuper) {
        return (
            <div className="super-admin-dashboard">
                <div className="no-permission">
                    <div className="icon">🚫</div>
                    <h2>ไม่มีสิทธิ์เข้าถึง</h2>
                    <p>หน้านี้สำหรับ Super Admin เท่านั้น</p>
                </div>
                <style>{styles}</style>
            </div>
        );
    }

    /**
     * ฟังก์ชัน Logout
     */
    const handleLogout = async () => {
        try {
            await signOut();
            console.log('✅ Logout สำเร็จ');
        } catch (error) {
            console.error('❌ Logout ล้มเหลว:', error);
            alert('ไม่สามารถ Logout ได้ กรุณาลองใหม่อีกครั้ง');
        }
    };

    /**
     * เปลี่ยนแผนของบริษัท
     */
    const handleChangePlan = async (companyId: string, newPlan: SubscriptionPlan) => {
        if (!confirm(`ต้องการเปลี่ยนแผนเป็น ${newPlan} หรือไม่?`)) {
            return;
        }

        try {
            setQuotaUpdating(true);
            await changePlan(companyId, newPlan, user?.uid);
            
            // รีโหลดข้อมูล
            const quotasData = await getAllQuotas();
            setQuotas(quotasData);
            
            alert('เปลี่ยนแผนสำเร็จ!');
        } catch (error) {
            console.error('❌ เปลี่ยนแผนล้มเหลว:', error);
            alert('ไม่สามารถเปลี่ยนแผนได้ กรุณาลองใหม่อีกครั้ง');
        } finally {
            setQuotaUpdating(false);
            setEditingQuota(null);
        }
    };

    /**
     * หาชื่อบริษัทจาก ID
     */
    const getCompanyName = (companyId: string): string => {
        const company = companies.find(c => c.id === companyId);
        return company?.name || 'ไม่พบข้อมูล';
    };

    /**
     * แก้ไข Plan Template
     */
    const handleUpdatePlanTemplate = async (planId: string, updates: Partial<PlanTemplate>) => {
        if (!confirm(`ต้องการอัปเดตแผน ${planId} หรือไม่?`)) {
            return;
        }

        try {
            setPlanUpdating(true);
            await updatePlanTemplate(planId, updates, user?.uid);
            
            // รีโหลดข้อมูล
            const templatesData = await getAllPlanTemplates();
            setPlanTemplates(templatesData);
            
            alert('อัปเดตแผนสำเร็จ!');
        } catch (error) {
            console.error('❌ อัปเดตแผนล้มเหลว:', error);
            alert('ไม่สามารถอัปเดตแผนได้ กรุณาลองใหม่อีกครั้ง');
        } finally {
            setPlanUpdating(false);
            setEditingPlan(null);
        }
    };


    return (
        <div className="super-admin-dashboard">
            {/* Header */}
            <div className="dashboard-header">
                <div>
                    <h1>🔐 Super Admin Dashboard</h1>
                    <p className="subtitle">จัดการระบบทั้งหมด</p>
                </div>
                <div className="user-info">
                    <span className="badge">Super Admin</span>
                    <span>{user?.email}</span>
                    <button 
                        className="logout-button"
                        onClick={handleLogout}
                        title="ออกจากระบบ"
                    >
                        🚪 Logout
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="tabs">
                <button
                    className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
                    onClick={() => setActiveTab('overview')}
                >
                    📊 ภาพรวม
                </button>
                <button
                    className={`tab ${activeTab === 'companies' ? 'active' : ''}`}
                    onClick={() => setActiveTab('companies')}
                >
                    🏢 บริษัททั้งหมด
                </button>
                <button
                    className={`tab ${activeTab === 'quotas' ? 'active' : ''}`}
                    onClick={() => setActiveTab('quotas')}
                >
                    💎 โควตาบริษัท
                </button>
                <button
                    className={`tab ${activeTab === 'plans' ? 'active' : ''}`}
                    onClick={() => setActiveTab('plans')}
                >
                    🎯 จัดการแผน
                </button>
                <button
                    className={`tab ${activeTab === 'members' ? 'active' : ''}`}
                    onClick={() => setActiveTab('members')}
                >
                    👥 สมาชิกทั้งหมด
                </button>
                <button
                    className={`tab ${activeTab === 'invitations' ? 'active' : ''}`}
                    onClick={() => setActiveTab('invitations')}
                >
                    📨 คำเชิญทั้งหมด
                </button>
            </div>

            {/* Content */}
            <div className="dashboard-content">
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                    <div className="overview-tab">
                        {statsLoading ? (
                            <div className="loading-stats">
                                <div className="spinner"></div>
                                <p>กำลังโหลดสถิติ...</p>
                            </div>
                        ) : statsError ? (
                            <div className="error-message">
                                <div className="error-icon">⚠️</div>
                                <h3>เกิดข้อผิดพลาด</h3>
                                <p>{statsError}</p>
                                <button 
                                    className="retry-button"
                                    onClick={async () => {
                                        try {
                                            setStatsLoading(true);
                                            setStatsError(null);
                                            const statsData = await getSystemStats();
                                            setStats(statsData);
                                            statsLoadedRef.current = true;
                                        } catch (error) {
                                            console.error('❌ โหลดสถิติล้มเหลว:', error);
                                            setStatsError('ไม่สามารถโหลดสถิติได้ กรุณาลองใหม่อีกครั้ง');
                                        } finally {
                                            setStatsLoading(false);
                                        }
                                    }}
                                >
                                    🔄 ลองใหม่อีกครั้ง
                                </button>
                            </div>
                        ) : stats ? (
                            <div className="stats-grid">
                                <div className="stat-card">
                                    <div className="stat-icon">🏢</div>
                                    <div className="stat-info">
                                        <div className="stat-value">{stats.totalCompanies}</div>
                                        <div className="stat-label">บริษัททั้งหมด</div>
                                    </div>
                                </div>

                                <div className="stat-card">
                                    <div className="stat-icon">👥</div>
                                    <div className="stat-info">
                                        <div className="stat-value">{stats.totalUsers}</div>
                                        <div className="stat-label">ผู้ใช้ทั้งหมด</div>
                                    </div>
                                </div>

                                <div className="stat-card">
                                    <div className="stat-icon">✅</div>
                                    <div className="stat-info">
                                        <div className="stat-value">{stats.activeUsers}</div>
                                        <div className="stat-label">สมาชิกที่ใช้งาน</div>
                                    </div>
                                </div>

                                <div className="stat-card">
                                    <div className="stat-icon">📨</div>
                                    <div className="stat-info">
                                        <div className="stat-value">{stats.pendingInvitations}</div>
                                        <div className="stat-label">คำเชิญรอการยอมรับ</div>
                                    </div>
                                </div>

                                <div className="stat-card">
                                    <div className="stat-icon">📄</div>
                                    <div className="stat-info">
                                        <div className="stat-value">{stats.totalDocuments}</div>
                                        <div className="stat-label">เอกสารทั้งหมด</div>
                                    </div>
                                </div>

                                <div className="stat-card">
                                    <div className="stat-icon">👤</div>
                                    <div className="stat-info">
                                        <div className="stat-value">{stats.totalMembers}</div>
                                        <div className="stat-label">สมาชิกทั้งหมด</div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="empty-state">
                                <div className="empty-icon">📊</div>
                                <h3>ยังไม่มีข้อมูลสถิติ</h3>
                                <p>คลิกปุ่มด้านล่างเพื่อโหลดสถิติระบบ</p>
                                <button 
                                    className="load-button"
                                    onClick={async () => {
                                        try {
                                            setStatsLoading(true);
                                            setStatsError(null);
                                            const statsData = await getSystemStats();
                                            setStats(statsData);
                                            statsLoadedRef.current = true;
                                        } catch (error) {
                                            console.error('❌ โหลดสถิติล้มเหลว:', error);
                                            setStatsError('ไม่สามารถโหลดสถิติได้ กรุณาลองใหม่อีกครั้ง');
                                        } finally {
                                            setStatsLoading(false);
                                        }
                                    }}
                                >
                                    🔄 โหลดสถิติ
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Companies Tab */}
                {activeTab === 'companies' && (
                    <div className="companies-tab">
                        <div className="tab-header">
                            <h2>🏢 บริษัททั้งหมด ({companies.length})</h2>
                        </div>

                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>ชื่อบริษัท</th>
                                        <th>ที่อยู่</th>
                                        <th>จำนวนสมาชิก</th>
                                        <th>วันที่สร้าง</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {companies.map(company => (
                                        <tr key={company.id}>
                                            <td className="font-medium">{company.name}</td>
                                            <td>{company.address || '-'}</td>
                                            <td className="text-center">
                                                <span className="badge">{company.memberCount || 0} คน</span>
                                            </td>
                                            <td>
                                                {company.createdAt 
                                                    ? company.createdAt.toLocaleDateString('th-TH')
                                                    : '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Members Tab */}
                {activeTab === 'members' && (
                    <div className="members-tab">
                        <div className="tab-header">
                            <h2>👥 สมาชิกทั้งหมด ({filteredMembers.length})</h2>
                            <input
                                type="text"
                                placeholder="ค้นหาด้วยอีเมล, เบอร์โทร หรือชื่อ..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="search-input"
                            />
                        </div>

                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>ประเภท Login</th>
                                        <th>อีเมล/เบอร์โทร</th>
                                        <th>ชื่อ</th>
                                        <th>บทบาท</th>
                                        <th>สถานะ</th>
                                        <th>วันที่เข้าร่วม</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredMembers.map(member => {
                                        const authType = getAuthType(member);
                                        return (
                                            <tr key={member.id}>
                                                <td>
                                                    <span className={`auth-type-badge auth-${authType}`}>
                                                        {authType === 'email' ? '📧 อีเมล' :
                                                         authType === 'phone' ? '📱 เบอร์โทร' :
                                                         '❓ ไม่ระบุ'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className="contact-info">
                                                        <span className="primary-contact">{getPrimaryContact(member)}</span>
                                                        {/* แสดงเบอร์โทรเพิ่มเติมถ้ามีทั้งอีเมลและเบอร์โทร */}
                                                        {member.email && member.phoneNumber && (
                                                            <span className="secondary-contact">📱 {member.phoneNumber}</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td>{member.displayName || '-'}</td>
                                                <td>
                                                    <span className={`role-badge ${member.role}`}>
                                                        {member.role === 'admin' ? '👑 Admin' : '👤 Member'}
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
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Quotas Tab */}
                {activeTab === 'quotas' && (
                    <div className="quotas-tab">
                        <div className="tab-header">
                            <h2>💎 โควตาและแผนการใช้งาน ({quotas.length})</h2>
                        </div>

                        <div className="quota-info-box">
                            <div className="info-item">
                                <span className="info-label">📊 แผนทั้งหมด:</span>
                                <span className="info-value">
                                    Free: {quotas.filter(q => q.plan === 'free').length} | 
                                    Basic: {quotas.filter(q => q.plan === 'basic').length} | 
                                    Premium: {quotas.filter(q => q.plan === 'premium').length} | 
                                    Enterprise: {quotas.filter(q => q.plan === 'enterprise').length}
                                </span>
                            </div>
                        </div>

                        <div className="table-container">
                            <table className="quota-table">
                                <thead>
                                    <tr>
                                        <th>บริษัท</th>
                                        <th>แผน</th>
                                        <th>สถานะ</th>
                                        <th>ผู้ใช้</th>
                                        <th>เอกสาร/เดือน</th>
                                        <th>โลโก้</th>
                                        <th>Storage (MB)</th>
                                        <th>การจัดการ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {quotas.map(quota => (
                                        <tr key={quota.companyId}>
                                            <td className="font-medium">
                                                {getCompanyName(quota.companyId)}
                                            </td>
                                            <td>
                                                {editingQuota === quota.companyId ? (
                                                    <select
                                                        className="plan-select"
                                                        defaultValue={quota.plan}
                                                        onChange={(e) => handleChangePlan(quota.companyId, e.target.value as SubscriptionPlan)}
                                                        disabled={quotaUpdating}
                                                    >
                                                        <option value="free">Free</option>
                                                        <option value="basic">Basic</option>
                                                        <option value="premium">Premium</option>
                                                        <option value="enterprise">Enterprise</option>
                                                    </select>
                                                ) : (
                                                    <span className={`plan-badge plan-${quota.plan}`}>
                                                        {quota.plan.toUpperCase()}
                                                    </span>
                                                )}
                                            </td>
                                            <td>
                                                <span className={`status-badge quota-${quota.status}`}>
                                                    {quota.status === 'active' ? '✅ Active' :
                                                     quota.status === 'trial' ? '🔄 Trial' :
                                                     quota.status === 'expired' ? '❌ Expired' :
                                                     '⏸️ Suspended'}
                                                </span>
                                            </td>
                                            <td className="text-center">
                                                <span className={quota.currentUsers >= quota.maxUsers && quota.maxUsers !== -1 ? 'quota-exceeded' : ''}>
                                                    {quota.currentUsers} / {quota.maxUsers === -1 ? '∞' : quota.maxUsers}
                                                </span>
                                            </td>
                                            <td className="text-center">
                                                <span className={quota.currentDocuments >= quota.maxDocuments && quota.maxDocuments !== -1 ? 'quota-exceeded' : ''}>
                                                    {quota.currentDocuments} / {quota.maxDocuments === -1 ? '∞' : quota.maxDocuments}
                                                </span>
                                            </td>
                                            <td className="text-center">
                                                <span className={quota.currentLogos >= quota.maxLogos && quota.maxLogos !== -1 ? 'quota-exceeded' : ''}>
                                                    {quota.currentLogos} / {quota.maxLogos === -1 ? '∞' : quota.maxLogos}
                                                </span>
                                            </td>
                                            <td className="text-center">
                                                <span className={quota.currentStorageMB >= quota.maxStorageMB && quota.maxStorageMB !== -1 ? 'quota-exceeded' : ''}>
                                                    {quota.currentStorageMB.toFixed(1)} / {quota.maxStorageMB === -1 ? '∞' : quota.maxStorageMB}
                                                </span>
                                            </td>
                                            <td className="text-center">
                                                {editingQuota === quota.companyId ? (
                                                    <div className="action-buttons">
                                                        <button
                                                            className="btn-cancel"
                                                            onClick={() => setEditingQuota(null)}
                                                            disabled={quotaUpdating}
                                                        >
                                                            ❌
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        className="btn-edit"
                                                        onClick={() => setEditingQuota(quota.companyId)}
                                                        disabled={quotaUpdating}
                                                    >
                                                        ✏️ แก้ไข
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Legend - ดึงข้อมูลจาก Plan Templates */}
                        {planTemplates.length > 0 && (
                            <div className="quota-legend">
                                <h3>📖 คำอธิบายแผนการใช้งาน</h3>
                                <div className="legend-grid">
                                    {planTemplates.map(plan => (
                                        <div key={plan.id} className="legend-item">
                                            <strong>{plan.name}:</strong>{' '}
                                            {plan.maxUsers === -1 ? 'ไม่จำกัด' : `${plan.maxUsers} Users`},{' '}
                                            {plan.maxDocuments === -1 ? 'ไม่จำกัด' : `${plan.maxDocuments} Docs/month`},{' '}
                                            {plan.maxLogos === -1 ? 'ไม่จำกัด' : `${plan.maxLogos} Logo${plan.maxLogos > 1 ? 's' : ''}`},{' '}
                                            {plan.maxStorageMB === -1 ? 'ไม่จำกัด' : plan.maxStorageMB >= 1000 ? `${(plan.maxStorageMB / 1024).toFixed(1)}GB` : `${plan.maxStorageMB}MB`}
                                            {plan.price > 0 && ` (${plan.price.toLocaleString()}฿/เดือน)`}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Invitations Tab */}
                {activeTab === 'invitations' && (
                    <div className="invitations-tab">
                        <div className="tab-header">
                            <h2>📨 คำเชิญทั้งหมด ({filteredInvitations.length})</h2>
                            <input
                                type="text"
                                placeholder="ค้นหาด้วยอีเมลหรือบริษัท..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="search-input"
                            />
                        </div>

                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>อีเมล</th>
                                        <th>บริษัท</th>
                                        <th>บทบาท</th>
                                        <th>สถานะ</th>
                                        <th>หมดอายุ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredInvitations.map(invitation => (
                                        <tr key={invitation.id}>
                                            <td>{invitation.email}</td>
                                            <td>{invitation.companyName}</td>
                                            <td>
                                                <span className={`role-badge ${invitation.role}`}>
                                                    {invitation.role === 'admin' ? '👑 Admin' : '👤 Member'}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`status-badge invitation-${invitation.status}`}>
                                                    {invitation.status === 'pending' ? '⏳ รอยอมรับ' :
                                                     invitation.status === 'accepted' ? '✅ ยอมรับแล้ว' :
                                                     invitation.status === 'rejected' ? '❌ ปฏิเสธ' :
                                                     '⏰ หมดอายุ'}
                                                </span>
                                            </td>
                                            <td>
                                                {invitation.expiresAt 
                                                    ? invitation.expiresAt.toLocaleDateString('th-TH')
                                                    : '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Plans Tab */}
                {activeTab === 'plans' && (
                    <div className="plans-tab">
                        <div className="tab-header">
                            <h2>🎯 จัดการแผนการใช้งาน ({planTemplates.length})</h2>
                        </div>

                        <div className="plans-grid">
                            {planTemplates.map(plan => (
                                <div key={plan.id} className="plan-card" style={{ borderTop: `4px solid ${plan.color}` }}>
                                    <div className="plan-header">
                                        <h3>{plan.name}</h3>
                                        {plan.isPopular && <span className="popular-badge">⭐ ยอดนิยม</span>}
                                    </div>
                                    
                                    <p className="plan-description">{plan.description}</p>
                                    
                                    <div className="plan-price">
                                        <span className="price-amount">{plan.price === 0 ? 'ฟรี' : `${plan.price.toLocaleString()}฿`}</span>
                                        {plan.price > 0 && <span className="price-period">/เดือน</span>}
                                    </div>

                                    {editingPlan === plan.id ? (
                                        <div className="plan-edit-form">
                                            <div className="form-group">
                                                <label>👥 ผู้ใช้สูงสุด:</label>
                                                <input
                                                    type="number"
                                                    defaultValue={plan.maxUsers}
                                                    onChange={(e) => {
                                                        const val = parseInt(e.target.value);
                                                        handleUpdatePlanTemplate(plan.id!, { maxUsers: val });
                                                    }}
                                                    placeholder="-1 = ไม่จำกัด"
                                                    disabled={planUpdating}
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label>📄 เอกสาร/เดือน:</label>
                                                <input
                                                    type="number"
                                                    defaultValue={plan.maxDocuments}
                                                    onChange={(e) => {
                                                        const val = parseInt(e.target.value);
                                                        handleUpdatePlanTemplate(plan.id!, { maxDocuments: val });
                                                    }}
                                                    placeholder="-1 = ไม่จำกัด"
                                                    disabled={planUpdating}
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label>🎨 โลโก้:</label>
                                                <input
                                                    type="number"
                                                    defaultValue={plan.maxLogos}
                                                    onChange={(e) => {
                                                        const val = parseInt(e.target.value);
                                                        handleUpdatePlanTemplate(plan.id!, { maxLogos: val });
                                                    }}
                                                    placeholder="-1 = ไม่จำกัด"
                                                    disabled={planUpdating}
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label>💾 Storage (MB):</label>
                                                <input
                                                    type="number"
                                                    defaultValue={plan.maxStorageMB}
                                                    onChange={(e) => {
                                                        const val = parseInt(e.target.value);
                                                        handleUpdatePlanTemplate(plan.id!, { maxStorageMB: val });
                                                    }}
                                                    placeholder="-1 = ไม่จำกัด"
                                                    disabled={planUpdating}
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label>💰 ราคา (฿/เดือน):</label>
                                                <input
                                                    type="number"
                                                    defaultValue={plan.price}
                                                    onChange={(e) => {
                                                        const val = parseInt(e.target.value);
                                                        handleUpdatePlanTemplate(plan.id!, { price: val });
                                                    }}
                                                    disabled={planUpdating}
                                                />
                                            </div>
                                            <button
                                                className="btn-cancel"
                                                onClick={() => setEditingPlan(null)}
                                                disabled={planUpdating}
                                            >
                                                ❌ ปิด
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="plan-features">
                                                <div className="feature-item">
                                                    <span className="feature-icon">👥</span>
                                                    <span>{plan.maxUsers === -1 ? 'ไม่จำกัด' : plan.maxUsers} ผู้ใช้</span>
                                                </div>
                                                <div className="feature-item">
                                                    <span className="feature-icon">📄</span>
                                                    <span>{plan.maxDocuments === -1 ? 'ไม่จำกัด' : plan.maxDocuments} เอกสาร/เดือน</span>
                                                </div>
                                                <div className="feature-item">
                                                    <span className="feature-icon">🎨</span>
                                                    <span>{plan.maxLogos === -1 ? 'ไม่จำกัด' : plan.maxLogos} โลโก้</span>
                                                </div>
                                                <div className="feature-item">
                                                    <span className="feature-icon">💾</span>
                                                    <span>{plan.maxStorageMB === -1 ? 'ไม่จำกัด' : `${plan.maxStorageMB} MB`}</span>
                                                </div>
                                            </div>

                                            <div className="plan-features-list">
                                                {plan.features.multipleProfiles && <div className="feature">✅ Multiple Profiles</div>}
                                                {plan.features.apiAccess && <div className="feature">✅ API Access</div>}
                                                {plan.features.customDomain && <div className="feature">✅ Custom Domain</div>}
                                                {plan.features.prioritySupport && <div className="feature">✅ Priority Support</div>}
                                                {plan.features.exportPDF && <div className="feature">✅ Export PDF</div>}
                                                {plan.features.exportExcel && <div className="feature">✅ Export Excel</div>}
                                                {plan.features.advancedReports && <div className="feature">✅ Advanced Reports</div>}
                                                {plan.features.customTemplates && <div className="feature">✅ Custom Templates</div>}
                                            </div>

                                            <button
                                                className="btn-edit-plan"
                                                onClick={() => setEditingPlan(plan.id!)}
                                                disabled={planUpdating}
                                            >
                                                ✏️ แก้ไขแผน
                                            </button>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="plan-note">
                            <h4>📝 หมายเหตุ:</h4>
                            <p>• การแก้ไขแผนจะส่งผลกับ <strong>บริษัทใหม่ที่สร้างในอนาคต</strong> เท่านั้น</p>
                            <p>• บริษัทที่มีอยู่แล้วจะยังใช้โควต้าที่กำหนดไว้เดิม (ดูได้ที่แท็บ "💎 โควตาบริษัท")</p>
                            <p>• ตัวเลข <strong>-1</strong> หมายถึง ไม่จำกัด</p>
                        </div>
                    </div>
                )}
            </div>

            <style>{styles}</style>
        </div>
    );
};

// Styles
const styles = `
    .super-admin-dashboard {
        min-height: 100vh;
        background: #f5f7fa;
        padding: 20px;
    }

    .loading-container,
    .no-permission {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 60vh;
        text-align: center;
    }

    .spinner {
        border: 4px solid #f3f3f3;
        border-top: 4px solid #667eea;
        border-radius: 50%;
        width: 50px;
        height: 50px;
        animation: spin 1s linear infinite;
        margin-bottom: 20px;
    }

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }

    .no-permission .icon {
        font-size: 64px;
        margin-bottom: 20px;
    }

    .dashboard-header {
        background: white;
        padding: 30px;
        border-radius: 12px;
        margin-bottom: 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .dashboard-header h1 {
        margin: 0;
        font-size: 28px;
        color: #1a202c;
    }

    .dashboard-header .subtitle {
        margin: 5px 0 0 0;
        color: #718096;
    }

    .user-info {
        display: flex;
        align-items: center;
        gap: 10px;
        color: #4a5568;
    }

    .badge {
        display: inline-block;
        padding: 4px 12px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 600;
    }

    .logout-button {
        padding: 8px 16px;
        background: #f56565;
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.3s;
        margin-left: 10px;
    }

    .logout-button:hover {
        background: #e53e3e;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(245, 101, 101, 0.4);
    }

    .logout-button:active {
        transform: translateY(0);
    }

    .tabs {
        display: flex;
        gap: 10px;
        margin-bottom: 20px;
        overflow-x: auto;
    }

    .tab {
        background: white;
        border: none;
        padding: 12px 24px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        color: #4a5568;
        transition: all 0.3s;
        white-space: nowrap;
    }

    .tab:hover {
        background: #f7fafc;
    }

    .tab.active {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
    }

    .dashboard-content {
        background: white;
        border-radius: 12px;
        padding: 30px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        min-height: 400px;
    }

    .loading-stats,
    .error-message,
    .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 300px;
        text-align: center;
    }

    .loading-stats .spinner {
        margin-bottom: 20px;
    }

    .error-message .error-icon,
    .empty-state .empty-icon {
        font-size: 64px;
        margin-bottom: 20px;
    }

    .error-message h3,
    .empty-state h3 {
        margin: 0 0 10px 0;
        color: #1a202c;
        font-size: 20px;
    }

    .error-message p,
    .empty-state p {
        margin: 0 0 20px 0;
        color: #718096;
    }

    .retry-button,
    .load-button {
        padding: 12px 24px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: transform 0.2s, box-shadow 0.2s;
    }

    .retry-button:hover,
    .load-button:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }

    .retry-button:active,
    .load-button:active {
        transform: translateY(0);
    }

    .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 20px;
    }

    .stat-card {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 12px;
        padding: 24px;
        color: white;
        display: flex;
        align-items: center;
        gap: 16px;
    }

    .stat-icon {
        font-size: 48px;
    }

    .stat-info {
        flex: 1;
    }

    .stat-value {
        font-size: 32px;
        font-weight: 700;
        margin-bottom: 4px;
    }

    .stat-label {
        font-size: 14px;
        opacity: 0.9;
    }

    .tab-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        gap: 20px;
    }

    .tab-header h2 {
        margin: 0;
        color: #1a202c;
    }

    .search-input {
        padding: 10px 16px;
        border: 2px solid #e2e8f0;
        border-radius: 8px;
        font-size: 14px;
        min-width: 300px;
    }

    .search-input:focus {
        outline: none;
        border-color: #667eea;
    }

    .table-container {
        overflow-x: auto;
    }

    table {
        width: 100%;
        border-collapse: collapse;
    }

    th, td {
        padding: 12px;
        text-align: left;
        border-bottom: 1px solid #e2e8f0;
    }

    th {
        background: #f7fafc;
        font-weight: 600;
        color: #4a5568;
        font-size: 14px;
    }

    td {
        color: #2d3748;
        font-size: 14px;
    }

    tr:hover {
        background: #f7fafc;
    }

    .font-medium {
        font-weight: 500;
    }

    .text-center {
        text-align: center;
    }

    .role-badge {
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

    .status-badge {
        display: inline-block;
        padding: 4px 12px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 500;
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

    /* Auth Type Badge Styles - แสดงประเภทการ Login */
    .auth-type-badge {
        display: inline-block;
        padding: 4px 10px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 500;
        white-space: nowrap;
    }

    .auth-type-badge.auth-email {
        background: #e3f2fd;
        color: #1565c0;
    }

    .auth-type-badge.auth-phone {
        background: #e8f5e9;
        color: #2e7d32;
    }

    .auth-type-badge.auth-unknown {
        background: #f5f5f5;
        color: #666;
    }

    /* Contact Info Styles - แสดงข้อมูลติดต่อ */
    .contact-info {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .contact-info .primary-contact {
        font-weight: 500;
        color: #2d3748;
    }

    .contact-info .secondary-contact {
        font-size: 12px;
        color: #718096;
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

    .status-badge.quota-active {
        background: #e8f5e9;
        color: #2e7d32;
    }

    .status-badge.quota-trial {
        background: #e3f2fd;
        color: #1565c0;
    }

    .status-badge.quota-expired {
        background: #ffebee;
        color: #c62828;
    }

    .status-badge.quota-suspended {
        background: #fff3e0;
        color: #f57c00;
    }

    /* Quota Tab Styles */
    .quota-info-box {
        background: #f7fafc;
        padding: 20px;
        border-radius: 8px;
        margin-bottom: 20px;
    }

    .info-item {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 14px;
    }

    .info-label {
        font-weight: 600;
        color: #4a5568;
    }

    .info-value {
        color: #2d3748;
    }

    .quota-table {
        font-size: 13px;
    }

    .plan-badge {
        display: inline-block;
        padding: 4px 12px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
    }

    .plan-badge.plan-free {
        background: #e2e8f0;
        color: #4a5568;
    }

    .plan-badge.plan-basic {
        background: #dbeafe;
        color: #1e40af;
    }

    .plan-badge.plan-premium {
        background: #fef3c7;
        color: #b45309;
    }

    .plan-badge.plan-enterprise {
        background: #ede9fe;
        color: #6b21a8;
    }

    .plan-select {
        padding: 6px 12px;
        border: 2px solid #e2e8f0;
        border-radius: 6px;
        font-size: 13px;
        font-weight: 600;
        background: white;
        cursor: pointer;
    }

    .plan-select:focus {
        outline: none;
        border-color: #667eea;
    }

    .quota-exceeded {
        color: #e53e3e;
        font-weight: 600;
    }

    .action-buttons {
        display: flex;
        gap: 5px;
        justify-content: center;
    }

    .btn-edit,
    .btn-cancel {
        padding: 6px 12px;
        border: none;
        border-radius: 6px;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
    }

    .btn-edit {
        background: #667eea;
        color: white;
    }

    .btn-edit:hover:not(:disabled) {
        background: #5568d3;
        transform: translateY(-1px);
    }

    .btn-cancel {
        background: #f56565;
        color: white;
    }

    .btn-cancel:hover:not(:disabled) {
        background: #e53e3e;
        transform: translateY(-1px);
    }

    .btn-edit:disabled,
    .btn-cancel:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .quota-legend {
        margin-top: 30px;
        padding: 20px;
        background: #f7fafc;
        border-radius: 8px;
    }

    .quota-legend h3 {
        margin: 0 0 15px 0;
        color: #1a202c;
        font-size: 16px;
    }

    .legend-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 12px;
    }

    .legend-item {
        padding: 12px;
        background: white;
        border-radius: 6px;
        font-size: 13px;
        color: #4a5568;
    }

    .legend-item strong {
        color: #2d3748;
    }

    /* Plans Tab Styles */
    .plans-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 24px;
        margin-bottom: 30px;
    }

    .plan-card {
        background: white;
        border-radius: 12px;
        padding: 24px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        transition: transform 0.3s, box-shadow 0.3s;
    }

    .plan-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
    }

    .plan-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
    }

    .plan-header h3 {
        margin: 0;
        font-size: 24px;
        color: #1a202c;
    }

    .popular-badge {
        background: #fef3c7;
        color: #b45309;
        padding: 4px 10px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 600;
    }

    .plan-description {
        color: #718096;
        margin: 0 0 16px 0;
        font-size: 14px;
    }

    .plan-price {
        margin-bottom: 20px;
    }

    .price-amount {
        font-size: 32px;
        font-weight: 700;
        color: #1a202c;
    }

    .price-period {
        color: #718096;
        font-size: 14px;
    }

    .plan-features {
        border-top: 1px solid #e2e8f0;
        border-bottom: 1px solid #e2e8f0;
        padding: 16px 0;
        margin-bottom: 16px;
    }

    .feature-item {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 10px;
        font-size: 14px;
        color: #4a5568;
    }

    .feature-item:last-child {
        margin-bottom: 0;
    }

    .feature-icon {
        font-size: 18px;
    }

    .plan-features-list {
        margin-bottom: 20px;
    }

    .plan-features-list .feature {
        padding: 6px 0;
        font-size: 13px;
        color: #4a5568;
    }

    .btn-edit-plan {
        width: 100%;
        padding: 10px;
        background: #667eea;
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
    }

    .btn-edit-plan:hover:not(:disabled) {
        background: #5568d3;
        transform: translateY(-1px);
    }

    .btn-edit-plan:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .plan-edit-form {
        border-top: 1px solid #e2e8f0;
        padding-top: 16px;
    }

    .form-group {
        margin-bottom: 12px;
    }

    .form-group label {
        display: block;
        margin-bottom: 6px;
        font-size: 13px;
        font-weight: 500;
        color: #4a5568;
    }

    .form-group input {
        width: 100%;
        padding: 8px 12px;
        border: 2px solid #e2e8f0;
        border-radius: 6px;
        font-size: 14px;
    }

    .form-group input:focus {
        outline: none;
        border-color: #667eea;
    }

    .plan-note {
        background: #f7fafc;
        padding: 20px;
        border-radius: 8px;
        border-left: 4px solid #667eea;
    }

    .plan-note h4 {
        margin: 0 0 12px 0;
        color: #1a202c;
        font-size: 16px;
    }

    .plan-note p {
        margin: 6px 0;
        color: #4a5568;
        font-size: 14px;
    }

    @media (max-width: 768px) {
        .dashboard-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 15px;
        }

        .stats-grid {
            grid-template-columns: 1fr;
        }

        .tab-header {
            flex-direction: column;
            align-items: stretch;
        }

        .search-input {
            min-width: 100%;
        }

        .tabs {
            overflow-x: auto;
        }

        .plans-grid {
            grid-template-columns: 1fr;
        }
    }
`;

export default SuperAdminDashboard;

