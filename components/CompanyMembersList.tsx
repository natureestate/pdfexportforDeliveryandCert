/**
 * Company Members List Component
 * Component แสดงรายการองค์กรที่ User เป็นสมาชิก พร้อมข้อมูลบทบาท
 */

import React, { useState, useEffect } from 'react';
import { Company, CompanyMember } from '../types';
import { getUserMemberships } from '../services/companyMembers';
import { getCompanyById } from '../services/companies';
import { useAuth } from '../contexts/AuthContext';
import UserManagement from './UserManagement';
import { Crown, User, Users } from 'lucide-react';

interface CompanyWithRole extends Company {
    memberRole?: string;
    memberStatus?: string;
}

/**
 * Component แสดงรายการองค์กรที่ User เป็นสมาชิก
 */
const CompanyMembersList: React.FC = () => {
    const { user } = useAuth();
    const [companies, setCompanies] = useState<CompanyWithRole[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedCompany, setSelectedCompany] = useState<CompanyWithRole | null>(null);
    const [showManagement, setShowManagement] = useState(false);

    /**
     * โหลดรายการองค์กรที่ User เป็นสมาชิก
     */
    const loadCompanies = async () => {
        if (!user) {
            setCompanies([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            // ดึงรายการ membership
            const memberships = await getUserMemberships(user.uid);

            // ดึงข้อมูลบริษัทแต่ละแห่ง
            const companiesData: CompanyWithRole[] = [];

            for (const membership of memberships) {
                const company = await getCompanyById(membership.companyId);
                if (company) {
                    companiesData.push({
                        ...company,
                        memberRole: membership.role,
                        memberStatus: membership.status,
                    });
                }
            }

            setCompanies(companiesData);
        } catch (err: any) {
            console.error('❌ โหลดองค์กรล้มเหลว:', err);
            setError(err.message || 'ไม่สามารถโหลดรายการองค์กรได้');
        } finally {
            setLoading(false);
        }
    };

    /**
     * เปิดหน้าจัดการสมาชิก
     */
    const handleManageMembers = (company: CompanyWithRole) => {
        setSelectedCompany(company);
        setShowManagement(true);
    };

    /**
     * ปิดหน้าจัดการสมาชิก
     */
    const handleCloseManagement = () => {
        setShowManagement(false);
        setSelectedCompany(null);
        loadCompanies(); // รีเฟรชข้อมูล
    };

    /**
     * โหลดข้อมูลเมื่อ component mount
     */
    useEffect(() => {
        loadCompanies();
    }, [user]);

    /**
     * แสดง User Management Modal
     */
    if (showManagement && selectedCompany) {
        return (
            <div className="modal-overlay">
                <div className="modal-content">
                    <UserManagement
                        companyId={selectedCompany.id!}
                        companyName={selectedCompany.name}
                        onClose={handleCloseManagement}
                    />
                </div>
            </div>
        );
    }

    /**
     * แสดงสถานะการโหลด
     */
    if (loading) {
        return (
            <div className="companies-list-container">
                <div className="loading">กำลังโหลดข้อมูล...</div>
            </div>
        );
    }

    return (
        <div className="companies-list-container">
            <div className="companies-header">
                <h2>องค์กรของฉัน</h2>
                <button onClick={loadCompanies} className="btn-refresh">
                    🔄 รีเฟรช
                </button>
            </div>

            {error && (
                <div className="error-message">
                    ⚠️ {error}
                </div>
            )}

            {companies.length === 0 ? (
                <div className="no-companies">
                    <p>คุณยังไม่ได้เป็นสมาชิกขององค์กรใดๆ</p>
                    <p className="hint">กรุณาสร้างองค์กรใหม่ หรือรอการเชิญจากองค์กรอื่น</p>
                </div>
            ) : (
                <div className="companies-grid">
                    {companies.map((company) => (
                        <div key={company.id} className="company-card">
                            <div className="company-header">
                                <h3>{company.name}</h3>
                                <span className={`role-badge ${company.memberRole}`}>
                                    {company.memberRole === 'admin' ? <><Crown className="w-3 h-3 inline mr-0.5" /> Admin</> : <><User className="w-3 h-3 inline mr-0.5" /> Member</>}
                                </span>
                            </div>

                            {company.address && (
                                <p className="company-address">📍 {company.address}</p>
                            )}

                            <div className="company-info">
                                <div className="info-item">
                                    <span className="label">สมาชิก:</span>
                                    <span className="value">{company.memberCount || 0} คน</span>
                                </div>
                                <div className="info-item">
                                    <span className="label">สถานะ:</span>
                                    <span className={`status-badge ${company.memberStatus}`}>
                                        {company.memberStatus === 'active' ? '✅ Active' : '⏳ Pending'}
                                    </span>
                                </div>
                            </div>

                            {company.memberRole === 'admin' && (
                                <button
                                    onClick={() => handleManageMembers(company)}
                                    className="btn-manage"
                                >
                                    <Users className="w-4 h-4 inline mr-1" />จัดการสมาชิก
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <style>{`
                .companies-list-container {
                    padding: 20px;
                    max-width: 1200px;
                    margin: 0 auto;
                }

                .companies-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                    padding-bottom: 10px;
                    border-bottom: 2px solid #e0e0e0;
                }

                .companies-header h2 {
                    margin: 0;
                    color: #333;
                }

                .btn-refresh {
                    background: #4CAF50;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                    transition: background 0.3s;
                }

                .btn-refresh:hover {
                    background: #45a049;
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

                .no-companies {
                    text-align: center;
                    padding: 60px 20px;
                    background: #f9f9f9;
                    border-radius: 8px;
                }

                .no-companies p {
                    margin: 10px 0;
                    color: #666;
                }

                .no-companies .hint {
                    font-size: 14px;
                    color: #999;
                }

                .companies-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                    gap: 20px;
                }

                .company-card {
                    background: white;
                    border: 1px solid #e0e0e0;
                    border-radius: 8px;
                    padding: 20px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    transition: transform 0.3s, box-shadow 0.3s;
                }

                .company-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 8px rgba(0,0,0,0.15);
                }

                .company-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 15px;
                }

                .company-header h3 {
                    margin: 0;
                    color: #333;
                    flex: 1;
                }

                .role-badge {
                    display: inline-block;
                    padding: 4px 12px;
                    border-radius: 12px;
                    font-size: 12px;
                    font-weight: 500;
                    white-space: nowrap;
                }

                .role-badge.admin {
                    background: #fff3e0;
                    color: #e65100;
                }

                .role-badge.member {
                    background: #e3f2fd;
                    color: #1565c0;
                }

                .company-address {
                    color: #666;
                    font-size: 14px;
                    margin: 10px 0;
                }

                .company-info {
                    margin: 15px 0;
                    padding: 15px;
                    background: #f9f9f9;
                    border-radius: 4px;
                }

                .info-item {
                    display: flex;
                    justify-content: space-between;
                    margin: 8px 0;
                    font-size: 14px;
                }

                .info-item .label {
                    color: #666;
                    font-weight: 500;
                }

                .info-item .value {
                    color: #333;
                }

                .status-badge {
                    display: inline-block;
                    padding: 2px 8px;
                    border-radius: 10px;
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

                .btn-manage {
                    width: 100%;
                    background: #2196F3;
                    color: white;
                    border: none;
                    padding: 10px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 500;
                    margin-top: 15px;
                    transition: background 0.3s;
                }

                .btn-manage:hover {
                    background: #1976D2;
                }

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
                    border-radius: 8px;
                    max-width: 1200px;
                    width: 100%;
                    max-height: 90vh;
                    overflow-y: auto;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                }

                @media (max-width: 768px) {
                    .companies-grid {
                        grid-template-columns: 1fr;
                    }

                    .company-header {
                        flex-direction: column;
                        gap: 10px;
                    }

                    .modal-overlay {
                        padding: 10px;
                    }

                    .modal-content {
                        max-height: 95vh;
                    }
                }
            `}</style>
        </div>
    );
};

export default CompanyMembersList;

