import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useCompany } from '../contexts/CompanyContext';
import { useMenu } from '../contexts/MenuContext';
import { useTab } from '../contexts/TabContext';
import { signOut, getLinkedProviders, linkWithEmailPassword, changePassword, sendPasswordReset, checkLinkedProviders } from '../services/auth';
import CompanySelector from './CompanySelector';
import UserManagement from './UserManagement';
import LogoManagerModal from './LogoManagerModal';
import CompanyInfoModal from './CompanyInfoModal';
import AccountLinkingModal from './AccountLinkingModal';
import MenuSettingsModal from './MenuSettingsModal';
import UserMenuSettingsModal from './UserMenuSettingsModal';
import TabSettingsModal from './TabSettingsModal';
import OrganizationLogoManager from './OrganizationLogoManager';
import ThemeToggle from './ThemeToggle';
import LanguageSwitcher from './LanguageSwitcher';
import NotificationBell from './NotificationBell';
import { checkIsAdmin } from '../services/companyMembers';
import { getQuota } from '../services/quota';
import { updateCompany } from '../services/companies';
import { convertStorageUrlToBase64 } from '../services/logoStorage';
import { CompanyQuota, LogoType } from '../types';
import { Link2, Key, Building2, Palette, BarChart3, Users, HardDrive, Crown, User, CreditCard, Sparkles, Settings, ChevronRight, LayoutDashboard, Mail, Phone, UserCircle, TrendingUp, FileText, Check, X, RefreshCw, Pause, Lightbulb, Zap, ImageIcon } from 'lucide-react';

const Header: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { currentCompany, refreshCompanies } = useCompany();
    const { refreshMenus } = useMenu();
    const { refreshTabs } = useTab();
    const [showDropdown, setShowDropdown] = useState(false);
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [showUserManagement, setShowUserManagement] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    
    // Settings submenu
    const [showSettingsSubmenu, setShowSettingsSubmenu] = useState(false);
    const [showMenuSettings, setShowMenuSettings] = useState(false);
    const [showUserMenuSettings, setShowUserMenuSettings] = useState(false);
    const [showTabSettings, setShowTabSettings] = useState(false);
    
    // Account Linking
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [linkError, setLinkError] = useState<string | null>(null);
    const [linkLoading, setLinkLoading] = useState(false);
    const [hasPassword, setHasPassword] = useState(false);
    
    // Change Password
    const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [changePasswordError, setChangePasswordError] = useState<string | null>(null);
    const [changePasswordLoading, setChangePasswordLoading] = useState(false);
    
    // Reset Password
    const [showResetPasswordLink, setShowResetPasswordLink] = useState(false);

    // Quota Modal
    const [showQuotaModal, setShowQuotaModal] = useState(false);
    const [quota, setQuota] = useState<CompanyQuota | null>(null);
    const [quotaLoading, setQuotaLoading] = useState(false);

    // Logo Manager Modal
    const [showLogoModal, setShowLogoModal] = useState(false);
    const [companyLogo, setCompanyLogo] = useState<string | null>(null);
    const [companyLogoUrl, setCompanyLogoUrl] = useState<string | null>(null);
    const [companyLogoType, setCompanyLogoType] = useState<LogoType>('default');

    // Company Info Modal
    const [showCompanyInfoModal, setShowCompanyInfoModal] = useState(false);

    // Organization Logo Modal
    const [showOrganizationLogoModal, setShowOrganizationLogoModal] = useState(false);
    const [organizationLogo, setOrganizationLogo] = useState<string | null>(null);

    // Account Linking Modal
    const [showAccountLinkingModal, setShowAccountLinkingModal] = useState(false);
    const [linkedProviders, setLinkedProviders] = useState<{
        hasGoogle: boolean;
        hasEmail: boolean;
        hasPhone: boolean;
    }>({ hasGoogle: false, hasEmail: false, hasPhone: false });

    // Toast Notification
    const [notification, setNotification] = useState<{
        show: boolean;
        message: string;
        type: 'success' | 'info' | 'error' | 'warning';
    }>({ show: false, message: '', type: 'info' });

    // ตรวจสอบว่ามี Password หรือไม่ และ providers ที่ link แล้ว
    useEffect(() => {
        if (user) {
            const providers = getLinkedProviders();
            setHasPassword(providers.includes('password'));
            
            // ตรวจสอบ linked providers
            const status = checkLinkedProviders();
            setLinkedProviders(status);
        } else {
            setHasPassword(false);
            setLinkedProviders({ hasGoogle: false, hasEmail: false, hasPhone: false });
        }
    }, [user]);

    // ตรวจสอบสิทธิ์ Admin เมื่อเปลี่ยนองค์กร
    useEffect(() => {
        const checkAdminStatus = async () => {
            if (user && currentCompany?.id) {
                const adminStatus = await checkIsAdmin(currentCompany.id, user.uid);
                setIsAdmin(adminStatus);
            } else {
                setIsAdmin(false);
            }
        };
        checkAdminStatus();
    }, [user, currentCompany]);

    // ปิด mobile menu เมื่อหน้าจอใหญ่ขึ้น
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 768) {
                setShowMobileMenu(false);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Auto-hide toast notification
    useEffect(() => {
        if (notification.show) {
            const timer = setTimeout(() => {
                setNotification({ ...notification, show: false });
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    // Toast notification function
    const showToast = (message: string, type: 'success' | 'info' | 'error' | 'warning') => {
        setNotification({ show: true, message, type });
    };

    // ป้องกันการ scroll เมื่อเปิด mobile menu
    useEffect(() => {
        if (showMobileMenu) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [showMobileMenu]);

    // โหลดข้อมูลโลโก้จาก currentCompany
    // ใช้ logoBase64 ก่อน, fallback ไป logoUrl (backwards compatibility)
    useEffect(() => {
        if (currentCompany) {
            // ใช้ logoBase64 ก่อน (ใหม่), ถ้าไม่มีใช้ logoUrl (เก่า)
            const logo = currentCompany.logoBase64 || currentCompany.logoUrl || null;
            setCompanyLogo(logo);
            setCompanyLogoUrl(currentCompany.logoUrl || null);
            setCompanyLogoType(currentCompany.logoType || 'default');
        } else {
            setCompanyLogo(null);
            setCompanyLogoUrl(null);
            setCompanyLogoType('default');
        }
    }, [currentCompany]);

    // โหลด Organization Logo จาก currentCompany
    useEffect(() => {
        const loadOrganizationLogo = async () => {
            if (currentCompany?.organizationLogoUrl) {
                try {
                    const base64 = await convertStorageUrlToBase64(currentCompany.organizationLogoUrl);
                    setOrganizationLogo(base64);
                } catch {
                    // ถ้าแปลงไม่ได้ ใช้ URL โดยตรง
                    setOrganizationLogo(currentCompany.organizationLogoUrl);
                }
            } else {
                setOrganizationLogo(null);
            }
        };
        loadOrganizationLogo();
    }, [currentCompany?.organizationLogoUrl]);

    const handleLogout = async () => {
        setIsLoggingOut(true);
        try {
            await signOut();
            setShowDropdown(false);
        } catch {
            showToast('เกิดข้อผิดพลาดในการ Logout', 'error');
        } finally {
            setIsLoggingOut(false);
        }
    };

    /**
     * จัดการ Link Email/Password
     */
    const handleLinkPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLinkError(null);

        // Validation
        if (!password || !confirmPassword) {
            setLinkError('กรุณากรอกรหัสผ่านให้ครบถ้วน');
            return;
        }

        if (password !== confirmPassword) {
            setLinkError('รหัสผ่านไม่ตรงกัน');
            return;
        }

        if (password.length < 6) {
            setLinkError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
            return;
        }

        try {
            setLinkLoading(true);
            await linkWithEmailPassword(user?.email || '', password);
            showToast('เพิ่มรหัสผ่านสำเร็จ! ตอนนี้คุณสามารถ Login ด้วย Email/Password ได้แล้ว', 'success');
            setShowPasswordModal(false);
            setPassword('');
            setConfirmPassword('');
            setHasPassword(true);
        } catch (err: any) {
            setLinkError(err.message || 'ไม่สามารถเพิ่มรหัสผ่านได้');
        } finally {
            setLinkLoading(false);
        }
    };

    /**
     * จัดการเปลี่ยนรหัสผ่าน
     */
    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setChangePasswordError(null);

        // Validation
        if (!currentPassword || !newPassword || !confirmNewPassword) {
            setChangePasswordError('กรุณากรอกข้อมูลให้ครบถ้วน');
            return;
        }

        if (newPassword !== confirmNewPassword) {
            setChangePasswordError('รหัสผ่านใหม่ไม่ตรงกัน');
            return;
        }

        if (newPassword.length < 6) {
            setChangePasswordError('รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร');
            return;
        }

        if (currentPassword === newPassword) {
            setChangePasswordError('รหัสผ่านใหม่ต้องไม่เหมือนรหัสผ่านเดิม');
            return;
        }

        try {
            setChangePasswordLoading(true);
            await changePassword(currentPassword, newPassword);
            showToast('เปลี่ยนรหัสผ่านสำเร็จ!', 'success');
            setShowChangePasswordModal(false);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmNewPassword('');
        } catch (err: any) {
            setChangePasswordError(err.message || 'ไม่สามารถเปลี่ยนรหัสผ่านได้');
        } finally {
            setChangePasswordLoading(false);
        }
    };

    /**
     * ส่งอีเมลรีเซ็ตรหัสผ่าน
     */
    const handleSendResetEmail = async () => {
        if (!user?.email) {
            showToast('ไม่พบอีเมลของผู้ใช้', 'error');
            return;
        }

        try {
            await sendPasswordReset(user.email);
            showToast(`ส่งอีเมลรีเซ็ตรหัสผ่านไปที่ ${user.email} แล้ว กรุณาตรวจสอบอีเมลของคุณ`, 'success');
            setShowChangePasswordModal(false);
        } catch (err: any) {
            showToast(err.message || 'ไม่สามารถส่งอีเมลได้', 'error');
        }
    };

    /**
     * เปิด Modal Quota และโหลดข้อมูล
     */
    const handleShowQuota = async () => {
        if (!currentCompany?.id) {
            showToast('ไม่พบข้อมูลบริษัท', 'error');
            return;
        }

        setShowQuotaModal(true);
        setShowDropdown(false);
        setShowMobileMenu(false);
        setQuotaLoading(true);

        try {
            const quotaData = await getQuota(currentCompany.id);
            setQuota(quotaData);
        } catch {
            showToast('ไม่สามารถโหลดข้อมูล Quota ได้', 'error');
        } finally {
            setQuotaLoading(false);
        }
    };

    /**
     * จัดการการเปลี่ยนแปลงโลโก้
     * เก็บ Base64 ใน Firestore โดยตรง (ไม่ผ่าน Firebase Storage)
     */
    const handleLogoChange = async (logo: string | null, logoUrl: string | null, logoType: LogoType) => {
        // อัปเดต state ใน Header
        setCompanyLogo(logo);
        setCompanyLogoUrl(logoUrl);
        setCompanyLogoType(logoType);

        // บันทึกลง Firebase - เก็บ Base64 โดยตรงใน logoBase64 field
        if (currentCompany?.id) {
            try {
                await updateCompany(currentCompany.id, {
                    logoBase64: logo,  // เก็บ Base64 โดยตรง (ใหม่)
                    logoUrl: logoUrl,  // เก็บไว้เพื่อ backwards compatibility
                    logoType: logoType,
                });
                
                // รีเฟรชข้อมูลบริษัท
                if (refreshCompanies) {
                    await refreshCompanies();
                }
            } catch {
                showToast('ไม่สามารถบันทึกโลโก้ได้', 'error');
            }
        }
    };

    /**
     * ตั้งค่า default logo ของบริษัท
     */
    const handleSetDefaultLogo = async (logoUrl: string) => {
        if (!currentCompany?.id) {
            throw new Error('ไม่พบข้อมูลบริษัท');
        }

        try {
            await updateCompany(currentCompany.id, {
                defaultLogoUrl: logoUrl,
            });
            showToast('ตั้งค่า default logo สำเร็จ', 'success');
        } catch (error) {
            throw error;
        }
    };

    /**
     * เปิด Logo Manager Modal
     */
    const handleShowLogoManager = () => {
        setShowLogoModal(true);
        setShowDropdown(false);
        setShowMobileMenu(false);
    };

    /**
     * บันทึกข้อมูลบริษัท
     * รวมถึงข้อมูลสาขาตามประกาศอธิบดีกรมสรรพากร (ฉบับที่ 200)
     */
    const handleSaveCompanyInfo = async (data: {
        name: string;
        address?: string;
        phone?: string;
        email?: string;
        website?: string;
        taxId?: string;
        branchCode?: string;
        branchName?: string;
    }) => {
        if (!currentCompany?.id) {
            throw new Error('ไม่พบข้อมูลบริษัท');
        }

        try {
            await updateCompany(currentCompany.id, {
                name: data.name,
                address: data.address,
                phone: data.phone,
                email: data.email,
                website: data.website,
                taxId: data.taxId,
                branchCode: data.branchCode || '00000',
                branchName: data.branchName || 'สำนักงานใหญ่',
            });
            
            // รีเฟรชข้อมูลบริษัทจาก Context
            if (refreshCompanies) {
                await refreshCompanies();
            }
            
            showToast('บันทึกข้อมูลบริษัทสำเร็จ', 'success');
        } catch (error) {
            throw error;
        }
    };

    /**
     * เปิด Company Info Modal
     */
    const handleShowCompanyInfo = () => {
        setShowCompanyInfoModal(true);
        setShowDropdown(false);
        setShowMobileMenu(false);
    };

    /**
     * เปิด Organization Logo Modal
     */
    const handleShowOrganizationLogo = () => {
        setShowOrganizationLogoModal(true);
        setShowDropdown(false);
        setShowMobileMenu(false);
    };

    // Toast notification colors and icons
    const notificationColors: Record<typeof notification.type, string> = {
        info: 'bg-blue-500',
        success: 'bg-green-500',
        error: 'bg-red-500',
        warning: 'bg-amber-500',
    };
    
    const notificationIcons: Record<typeof notification.type, string> = {
        info: 'ℹ️',
        success: '✅',
        error: '❌',
        warning: '⚠️',
    };

    return (
        <>
            {/* Toast Notification - พร้อม framer-motion slide + fade animation */}
            <AnimatePresence>
                {notification.show && (
                    <motion.div
                        initial={{ opacity: 0, y: -30, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        className={`fixed top-5 right-2 sm:right-5 ${notificationColors[notification.type]} text-white py-3 px-4 sm:px-5 rounded-xl shadow-2xl z-[9999] text-sm sm:text-base max-w-[calc(100vw-1rem)] sm:max-w-md flex items-center gap-3 border border-white/20`}
                    >
                        <span className="text-xl">{notificationIcons[notification.type]}</span>
                        <span className="flex-1">{notification.message}</span>
                        <button 
                            onClick={() => setNotification({ ...notification, show: false })}
                            className="text-white/80 hover:text-white transition-colors ml-2"
                            aria-label="Close notification"
                        >
                            ✕
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
            <header className="bg-white dark:bg-slate-800 shadow-md sticky top-0 z-30 transition-colors">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 md:py-4">
                <div className="flex items-center justify-between">
                    {/* ส่วนซ้าย - โลโก้องค์กรและชื่อแอป */}
                        <div className="flex items-center space-x-2 md:space-x-3 flex-1 min-w-0">
                            {/* Organization Logo หรือ Default Icon */}
                            {organizationLogo ? (
                                <img 
                                    src={organizationLogo} 
                                    alt={currentCompany?.name || 'Organization'} 
                                    className="h-10 w-auto md:h-12 max-w-[120px] md:max-w-[150px] object-contain flex-shrink-0"
                                    style={{ backgroundColor: 'inherit' }}
                                />
                            ) : (
                                <svg className="h-7 w-7 md:h-8 md:w-8 text-indigo-600 dark:text-indigo-400 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            )}
                            <div className="min-w-0 flex-1">
                                <h1 className="text-lg md:text-2xl font-bold text-slate-800 dark:text-slate-100 truncate">
                                {currentCompany?.name || t('app.title')}
                            </h1>
                        </div>
                    </div>

                        {/* ส่วนขวา - Desktop Menu และ Mobile Hamburger */}
                    {user && (
                            <>
                                {/* Desktop Menu */}
                                <div className="hidden md:flex items-center gap-4">
                                    <CompanySelector />
                                    
                                    {/* กระดิ่งแจ้งเตือนเอกสารใหม่ */}
                                    <NotificationBell />
                                    
                                    {/* Desktop User Menu */}
                        <div className="relative">
                            <button
                                onClick={() => setShowDropdown(!showDropdown)}
                                className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors duration-200"
                            >
                                {user.photoURL ? (
                                    <img
                                        src={user.photoURL}
                                        alt={user.displayName || 'User'}
                                        className="w-10 h-10 rounded-full border-2 border-indigo-200 dark:border-indigo-600"
                                    />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center border-2 border-indigo-200 dark:border-indigo-600">
                                        <span className="text-indigo-600 dark:text-indigo-300 font-semibold text-lg">
                                            {user.displayName?.charAt(0) || user.email?.charAt(0) || '?'}
                                        </span>
                                    </div>
                                )}

                                            <div className="text-left">
                                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                                        {user.displayName || t('auth.user')}
                                    </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[150px]">
                                        {user.email}
                                    </p>
                                </div>

                                <svg
                                    className={`w-4 h-4 text-gray-600 dark:text-gray-300 transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                                        {/* Desktop Dropdown - พร้อม enter/exit animation */}
                                        <AnimatePresence>
                                        {showDropdown && (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.95, y: -8 }}
                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.95, y: -8 }}
                                                transition={{ duration: 0.2, ease: "easeOut" }}
                                                className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-gray-200 dark:border-slate-600 py-2 z-50 origin-top-right">
                                                {/* ข้อมูล Profile */}
                                                <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-600 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30">
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-2 flex items-center gap-1">
                                                        <UserCircle className="w-3.5 h-3.5" /> {t('auth.profile')}
                                                    </p>
                                                    <div className="space-y-1">
                                                        {user?.displayName && (
                                                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{user.displayName}</p>
                                                        )}
                                                        {user?.email && (
                                                            <p className="text-xs text-gray-600 dark:text-gray-300 flex items-center gap-1">
                                                                <Mail className="w-3 h-3" /> {user.email}
                                                            </p>
                                                        )}
                                                        {user?.phoneNumber && (
                                                            <p className="text-xs text-gray-600 dark:text-gray-300 flex items-center gap-1">
                                                                <Phone className="w-3 h-3" /> {user.phoneNumber}
                                                            </p>
                                                        )}
                                                    </div>
                                                    {/* แสดง providers ที่ link แล้ว */}
                                                    <div className="flex flex-wrap gap-1 mt-2">
                                                        {linkedProviders.hasGoogle && (
                                                            <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs">Google</span>
                                                        )}
                                                        {linkedProviders.hasEmail && (
                                                            <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-xs">Email</span>
                                                        )}
                                                        {linkedProviders.hasPhone && (
                                                            <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs">Phone</span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* ธีม และ ภาษา - แสดงสำหรับทุกคน */}
                                                <div className="px-4 py-2.5 border-b border-gray-200 dark:border-slate-600 space-y-2">
                                                    <ThemeToggle showLabel />
                                                    <LanguageSwitcher showLabel />
                                                </div>

                                                {currentCompany && (
                                                    <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-600">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{t('header.currentOrganization')}</p>
                                                            <div className={`px-2 py-1 rounded text-xs font-medium ${
                                                                isAdmin 
                                                                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-700' 
                                                                    : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-700'
                                                            }`}>
                                                                {isAdmin ? <><Crown className="w-3 h-3 inline mr-0.5" /> {t('header.admin')}</> : <><User className="w-3 h-3 inline mr-0.5" /> {t('header.member')}</>}
                                                            </div>
                                                        </div>
                                                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
                                                            {currentCompany.name}
                                                        </p>
                                                    </div>
                                                )}

                                                {/* ปุ่ม Account Linking */}
                                                <button
                                                    onClick={() => {
                                                        setShowAccountLinkingModal(true);
                                                        setShowDropdown(false);
                                                    }}
                                                    className="w-full px-4 py-3 text-left text-sm text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/30 transition-colors duration-200 flex items-center justify-between border-b border-gray-200 dark:border-slate-600"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <Link2 className="w-5 h-5" />
                                                        <span className="font-medium">{t('auth.accountLinking')}</span>
                                                    </div>
                                                    <span className="text-xs px-2 py-0.5 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 rounded-full">
                                                        {[linkedProviders.hasGoogle, linkedProviders.hasEmail, linkedProviders.hasPhone].filter(Boolean).length}/3
                                                    </span>
                                                </button>

                                                {/* เพิ่มรหัสผ่าน (ถ้ายังไม่มี) */}
                                                {!hasPassword ? (
                                                    <button
                                                        onClick={() => {
                                                            setShowPasswordModal(true);
                                                            setShowDropdown(false);
                                                        }}
                                                        className="w-full px-4 py-3 text-left text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors duration-200 flex items-center gap-3 border-b border-gray-200 dark:border-slate-600"
                                                    >
                                                        <Link2 className="w-5 h-5" />
                                                        <span className="font-medium">{t('auth.addPassword')}</span>
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => {
                                                            setShowChangePasswordModal(true);
                                                            setShowDropdown(false);
                                                        }}
                                                        className="w-full px-4 py-3 text-left text-sm text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-colors duration-200 flex items-center gap-3 border-b border-gray-200 dark:border-slate-600"
                                                    >
                                                        <Key className="w-5 h-5" />
                                                        <span className="font-medium">{t('auth.changePassword')}</span>
                                                    </button>
                                                )}

                                                {/* ปุ่มตั้งค่า (รวมทุกอย่าง) - เฉพาะ Admin */}
                                                {currentCompany && isAdmin && (
                                                    <div className="relative">
                                                        <button
                                                            onClick={() => setShowSettingsSubmenu(!showSettingsSubmenu)}
                                                            className="w-full px-4 py-3 text-left text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors duration-200 flex items-center justify-between border-b border-gray-200 dark:border-slate-600"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <Settings className="w-5 h-5" />
                                                                <span className="font-medium">{t('header.settings')}</span>
                                                            </div>
                                                            <ChevronRight className={`w-4 h-4 transition-transform ${showSettingsSubmenu ? 'rotate-90' : ''}`} />
                                                        </button>
                                                        
                                                        {/* Settings Submenu - พร้อม expand/collapse animation */}
                                                        <AnimatePresence>
                                                        {showSettingsSubmenu && (
                                                            <motion.div
                                                                initial={{ height: 0, opacity: 0 }}
                                                                animate={{ height: "auto", opacity: 1 }}
                                                                exit={{ height: 0, opacity: 0 }}
                                                                transition={{ duration: 0.2, ease: "easeOut" }}
                                                                className="bg-gray-50 dark:bg-slate-700 border-b border-gray-200 dark:border-slate-600 overflow-hidden">
                                                                {/* ข้อมูลบริษัท */}
                                                                <button
                                                                    onClick={() => {
                                                                        handleShowCompanyInfo();
                                                                        setShowSettingsSubmenu(false);
                                                                    }}
                                                                    className="w-full px-6 py-2.5 text-left text-sm text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors duration-200 flex items-center gap-3"
                                                                >
                                                                    <Building2 className="w-4 h-4" />
                                                                    <span>{t('header.companyInfo')}</span>
                                                                </button>
                                                                
                                                                {/* จัดการโลโก้เอกสาร */}
                                                                <button
                                                                    onClick={() => {
                                                                        handleShowLogoManager();
                                                                        setShowSettingsSubmenu(false);
                                                                    }}
                                                                    className="w-full px-6 py-2.5 text-left text-sm text-pink-600 dark:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-900/30 transition-colors duration-200 flex items-center gap-3"
                                                                >
                                                                    <Palette className="w-4 h-4" />
                                                                    <span>{t('header.documentLogoManagement')}</span>
                                                                </button>

                                                                {/* จัดการโลโก้องค์กร */}
                                                                <button
                                                                    onClick={() => {
                                                                        handleShowOrganizationLogo();
                                                                        setShowSettingsSubmenu(false);
                                                                    }}
                                                                    className="w-full px-6 py-2.5 text-left text-sm text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors duration-200 flex items-center gap-3"
                                                                >
                                                                    <ImageIcon className="w-4 h-4" />
                                                                    <span>{t('header.organizationLogoManagement')}</span>
                                                                </button>
                                                                
                                                                {/* ตั้งค่าเมนู */}
                                                                <button
                                                                    onClick={() => {
                                                                        setShowMenuSettings(true);
                                                                        setShowDropdown(false);
                                                                        setShowSettingsSubmenu(false);
                                                                    }}
                                                                    className="w-full px-6 py-2.5 text-left text-sm text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors duration-200 flex items-center gap-3"
                                                                >
                                                                    <Settings className="w-4 h-4" />
                                                                    <span>{t('header.menuSettings')}</span>
                                                                </button>
                                                                
                                                                {/* ตั้งค่า Tab Menu */}
                                                                <button
                                                                    onClick={() => {
                                                                        setShowTabSettings(true);
                                                                        setShowDropdown(false);
                                                                        setShowSettingsSubmenu(false);
                                                                    }}
                                                                    className="w-full px-6 py-2.5 text-left text-sm text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/30 transition-colors duration-200 flex items-center gap-3"
                                                                >
                                                                    <LayoutDashboard className="w-4 h-4" />
                                                                    <span>{t('header.tabSettings')}</span>
                                                                </button>
                                                            </motion.div>
                                                        )}
                                                        </AnimatePresence>
                                                    </div>
                                                )}

                                                {/* ปุ่มดูโควตา */}
                                                {currentCompany && (
                                                    <button
                                                        onClick={handleShowQuota}
                                                        className="w-full px-4 py-3 text-left text-sm text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors duration-200 flex items-center gap-3 border-b border-gray-200 dark:border-slate-600"
                                                    >
                                                        <BarChart3 className="w-5 h-5" />
                                                        <span className="font-medium">{t('header.viewQuota')}</span>
                                                    </button>
                                                )}

                                                {/* ปุ่มแพ็กเกจ/อัปเกรด */}
                                                {currentCompany && (
                                                    <button
                                                        onClick={() => {
                                                            navigate('/pricing');
                                                            setShowDropdown(false);
                                                        }}
                                                        className="w-full px-4 py-3 text-left text-sm text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-colors duration-200 flex items-center gap-3 border-b border-gray-200 dark:border-slate-600"
                                                    >
                                                        <Sparkles className="w-5 h-5" />
                                                        <span className="font-medium">{t('header.packages')}</span>
                                                    </button>
                                                )}

                                                {currentCompany && isAdmin && (
                                                    <button
                                                        onClick={() => {
                                                            setShowUserManagement(true);
                                                            setShowDropdown(false);
                                                        }}
                                                        className="w-full px-4 py-3 text-left text-sm text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors duration-200 flex items-center gap-3 border-b border-gray-200 dark:border-slate-600"
                                                    >
                                                        <Users className="w-5 h-5" />
                                                        <span className="font-medium">{t('header.manageMembers')}</span>
                                                    </button>
                                                )}

                                                {/* ปุ่มคู่มือการใช้งาน */}
                                                <button
                                                    onClick={() => {
                                                        navigate('/guide');
                                                        setShowDropdown(false);
                                                    }}
                                                    className="w-full px-4 py-3 text-left text-sm text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/30 transition-colors duration-200 flex items-center gap-3 border-b border-gray-200 dark:border-slate-600"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                                    </svg>
                                                    <span className="font-medium">{t('header.userGuide', 'คู่มือการใช้งาน')}</span>
                                                </button>

                                                <button
                                                    onClick={handleLogout}
                                                    disabled={isLoggingOut}
                                                    className="w-full px-4 py-3 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors duration-200 flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {isLoggingOut ? (
                                                        <>
                                                            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                            </svg>
                                                            <span className="font-medium">{t('auth.loggingOut')}</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                                            </svg>
                                                            <span className="font-medium">{t('auth.logout')}</span>
                                                        </>
                                                    )}
                                                </button>
                                            </motion.div>
                                        )}
                                        </AnimatePresence>
                                    </div>
                                </div>

                                {/* กระดิ่งแจ้งเตือน - Mobile */}
                                <div className="md:hidden">
                                    <NotificationBell />
                                </div>

                                {/* Mobile Hamburger Button */}
                                <button
                                    onClick={() => setShowMobileMenu(!showMobileMenu)}
                                    className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors duration-200 flex-shrink-0"
                                    aria-label="Menu"
                                >
                                    <svg 
                                        className="w-6 h-6 text-gray-700 dark:text-gray-300" 
                                        fill="none" 
                                        stroke="currentColor" 
                                        viewBox="0 0 24 24"
                                    >
                                        {showMobileMenu ? (
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        ) : (
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                        )}
                                    </svg>
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Desktop Dropdown Overlay */}
                            {showDropdown && (
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowDropdown(false)}
                    />
                )}
            </header>

            {/* Mobile Slide-in Menu */}
            <div 
                className={`fixed inset-0 z-50 md:hidden transition-opacity duration-300 ${
                    showMobileMenu ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
            >
                {/* Backdrop */}
                <div 
                    className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
                    onClick={() => setShowMobileMenu(false)}
                />
                
                {/* Sidebar */}
                <div 
                    className={`absolute top-0 right-0 h-full w-80 max-w-[85vw] bg-white dark:bg-slate-800 shadow-2xl transform transition-transform duration-300 ease-out ${
                        showMobileMenu ? 'translate-x-0' : 'translate-x-full'
                    }`}
                >
                    <div className="flex flex-col h-full">
                        {/* Header ของ Sidebar */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-slate-600 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30">
                            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">{t('header.menu')}</h2>
                            <button
                                onClick={() => setShowMobileMenu(false)}
                                className="p-2 rounded-full hover:bg-white/80 dark:hover:bg-slate-700 transition-colors duration-200"
                                aria-label="Close Menu"
                            >
                                <svg className="w-6 h-6 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Content ของ Sidebar */}
                        <div className="flex-1 overflow-y-auto">
                            {/* ข้อมูลผู้ใช้ */}
                            <div className="px-5 py-4 border-b border-gray-200 dark:border-slate-600 bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-900/30 dark:to-slate-800">
                                <div className="flex items-center gap-3 mb-3">
                                    {user?.photoURL ? (
                                        <img
                                            src={user.photoURL}
                                            alt={user.displayName || 'User'}
                                            className="w-14 h-14 rounded-full border-2 border-indigo-300 dark:border-indigo-600 shadow-md"
                                        />
                                    ) : (
                                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center border-2 border-indigo-300 dark:border-indigo-600 shadow-md">
                                            <span className="text-white font-bold text-xl">
                                                {user?.displayName?.charAt(0) || user?.email?.charAt(0) || '?'}
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-base font-bold text-gray-800 dark:text-gray-100 truncate">
                                            {user?.displayName || t('auth.user')}
                                        </p>
                                        <p className="text-xs text-gray-600 dark:text-gray-300 truncate mt-0.5">
                                            {user?.email}
                                        </p>
                                        {user?.phoneNumber && (
                                            <p className="text-xs text-gray-600 dark:text-gray-300 truncate mt-0.5 flex items-center gap-1">
                                                <Phone className="w-3 h-3" /> {user.phoneNumber}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                {/* แสดง providers ที่ link แล้ว */}
                                <div className="flex flex-wrap gap-1">
                                    {linkedProviders.hasGoogle && (
                                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">Google</span>
                                    )}
                                    {linkedProviders.hasEmail && (
                                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs">Email</span>
                                    )}
                                    {linkedProviders.hasPhone && (
                                        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">Phone</span>
                                    )}
                                </div>
                            </div>

                            {/* ข้อมูลองค์กร */}
                            {currentCompany && (
                                <div className="px-5 py-4 border-b border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700/50">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">{t('header.currentOrganization')}</p>
                                        <div className={`px-2.5 py-1 rounded-full text-xs font-bold shadow-sm ${
                                            isAdmin 
                                                ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white' 
                                                : 'bg-gradient-to-r from-blue-400 to-indigo-500 text-white'
                                        }`}>
                                            {isAdmin ? <><Crown className="w-3 h-3 inline mr-0.5" /> {t('header.admin')}</> : <><User className="w-3 h-3 inline mr-0.5" /> {t('header.member')}</>}
                                        </div>
                                    </div>
                                    <p className="text-sm font-bold text-gray-800 dark:text-gray-100 break-words">
                                        {currentCompany.name}
                                    </p>
                                </div>
                            )}

                            {/* Company Selector สำหรับ Mobile */}
                            <div className="px-5 py-4 border-b border-gray-200 dark:border-slate-600">
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide mb-3">{t('header.changeOrganization')}</p>
                                <CompanySelector />
                            </div>

                            {/* เมนูต่างๆ */}
                            <div className="px-3 py-2">
                                {/* ปุ่ม Account Linking */}
                                <button
                                    onClick={() => {
                                        setShowAccountLinkingModal(true);
                                        setShowMobileMenu(false);
                                    }}
                                    className="w-full px-4 py-3.5 text-left text-sm font-medium text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-900/30 hover:bg-cyan-100 dark:hover:bg-cyan-900/50 rounded-lg transition-all duration-200 flex items-center justify-between mb-2 shadow-sm hover:shadow"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-lg bg-cyan-200 dark:bg-cyan-800 flex items-center justify-center">
                                            <Link2 className="w-5 h-5 text-cyan-700 dark:text-cyan-300" />
                                        </div>
                                        <span>{t('auth.accountLinking')}</span>
                                    </div>
                                    <span className="text-xs px-2 py-0.5 bg-cyan-200 dark:bg-cyan-800 text-cyan-700 dark:text-cyan-300 rounded-full">
                                        {[linkedProviders.hasGoogle, linkedProviders.hasEmail, linkedProviders.hasPhone].filter(Boolean).length}/3
                                    </span>
                                </button>

                                {/* เพิ่มรหัสผ่าน (ถ้ายังไม่มี) */}
                                {!hasPassword ? (
                                    <button
                                        onClick={() => {
                                            setShowPasswordModal(true);
                                            setShowMobileMenu(false);
                                        }}
                                        className="w-full px-4 py-3.5 text-left text-sm font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg transition-all duration-200 flex items-center gap-3 mb-2 shadow-sm hover:shadow"
                                    >
                                        <div className="w-9 h-9 rounded-lg bg-blue-200 dark:bg-blue-800 flex items-center justify-center">
                                            <Link2 className="w-5 h-5 text-blue-700 dark:text-blue-300" />
                                        </div>
                                        <span>{t('auth.addPassword')}</span>
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => {
                                            setShowChangePasswordModal(true);
                                            setShowMobileMenu(false);
                                        }}
                                        className="w-full px-4 py-3.5 text-left text-sm font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 hover:bg-amber-100 dark:hover:bg-amber-900/50 rounded-lg transition-all duration-200 flex items-center gap-3 mb-2 shadow-sm hover:shadow"
                                    >
                                        <div className="w-9 h-9 rounded-lg bg-amber-200 dark:bg-amber-800 flex items-center justify-center">
                                            <Key className="w-5 h-5 text-amber-700 dark:text-amber-300" />
                                        </div>
                                        <span>{t('auth.changePassword')}</span>
                                    </button>
                                )}

                                {/* ปุ่มตั้งค่า (รวมทุกอย่าง) - Mobile */}
                                {currentCompany && isAdmin && (
                                    <div className="mb-2">
                                        <button
                                            onClick={() => setShowSettingsSubmenu(!showSettingsSubmenu)}
                                            className="w-full px-4 py-3.5 text-left text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 rounded-lg transition-all duration-200 flex items-center justify-between shadow-sm hover:shadow"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-lg bg-gray-200 dark:bg-slate-600 flex items-center justify-center">
                                                    <Settings className="w-5 h-5 text-gray-700 dark:text-gray-200" />
                                                </div>
                                                <span>{t('header.settings')}</span>
                                            </div>
                                            <ChevronRight className={`w-5 h-5 transition-transform ${showSettingsSubmenu ? 'rotate-90' : ''}`} />
                                        </button>
                                        
                                        {/* Settings Submenu - Mobile พร้อม expand/collapse animation */}
                                        <AnimatePresence>
                                        {showSettingsSubmenu && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.2, ease: "easeOut" }}
                                                className="mt-1 ml-4 space-y-1 overflow-hidden">
                                                {/* ข้อมูลบริษัท */}
                                                <button
                                                    onClick={() => {
                                                        handleShowCompanyInfo();
                                                        setShowMobileMenu(false);
                                                        setShowSettingsSubmenu(false);
                                                    }}
                                                    className="w-full px-4 py-2.5 text-left text-sm font-medium text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/50 rounded-lg transition-all duration-200 flex items-center gap-3"
                                                >
                                                    <Building2 className="w-4 h-4" />
                                                    <span>{t('header.companyInfo')}</span>
                                                </button>
                                                
                                                {/* จัดการโลโก้เอกสาร */}
                                                <button
                                                    onClick={() => {
                                                        handleShowLogoManager();
                                                        setShowMobileMenu(false);
                                                        setShowSettingsSubmenu(false);
                                                    }}
                                                    className="w-full px-4 py-2.5 text-left text-sm font-medium text-pink-700 dark:text-pink-300 bg-pink-50 dark:bg-pink-900/30 hover:bg-pink-100 dark:hover:bg-pink-900/50 rounded-lg transition-all duration-200 flex items-center gap-3"
                                                >
                                                    <Palette className="w-4 h-4" />
                                                    <span>{t('header.documentLogoManagement')}</span>
                                                </button>

                                                {/* จัดการโลโก้องค์กร */}
                                                <button
                                                    onClick={() => {
                                                        handleShowOrganizationLogo();
                                                        setShowMobileMenu(false);
                                                        setShowSettingsSubmenu(false);
                                                    }}
                                                    className="w-full px-4 py-2.5 text-left text-sm font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-lg transition-all duration-200 flex items-center gap-3"
                                                >
                                                    <ImageIcon className="w-4 h-4" />
                                                    <span>{t('header.organizationLogoManagement')}</span>
                                                </button>
                                                
                                                {/* ตั้งค่าเมนู */}
                                                <button
                                                    onClick={() => {
                                                        setShowMenuSettings(true);
                                                        setShowMobileMenu(false);
                                                        setShowSettingsSubmenu(false);
                                                    }}
                                                    className="w-full px-4 py-2.5 text-left text-sm font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-lg transition-all duration-200 flex items-center gap-3"
                                                >
                                                    <Settings className="w-4 h-4" />
                                                    <span>{t('header.menuSettings')}</span>
                                                </button>
                                                
                                                {/* ตั้งค่า Tab Menu */}
                                                <button
                                                    onClick={() => {
                                                        setShowTabSettings(true);
                                                        setShowMobileMenu(false);
                                                        setShowSettingsSubmenu(false);
                                                    }}
                                                    className="w-full px-4 py-2.5 text-left text-sm font-medium text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-900/30 hover:bg-cyan-100 dark:hover:bg-cyan-900/50 rounded-lg transition-all duration-200 flex items-center gap-3"
                                                >
                                                    <LayoutDashboard className="w-4 h-4" />
                                                    <span>{t('header.tabSettings')}</span>
                                                </button>
                                                
                                                                {/* ธีม Dark/Light */}
                                                <div className="mt-2 pt-2 border-t border-gray-200 dark:border-slate-600">
                                                                    <ThemeToggle showLabel />
                                                                </div>
                                                                
                                                                {/* เปลี่ยนภาษา */}
                                                                <div className="mt-2 pt-2 border-t border-gray-200 dark:border-slate-600">
                                                                    <LanguageSwitcher showLabel />
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                        </AnimatePresence>
                                                    </div>
                                                )}

                                                {/* ธีม และ ภาษา - สำหรับ user ที่ไม่ใช่ admin (Mobile) */}
                                                {(!isAdmin || !currentCompany) && (
                                                    <div className="mb-2 p-3 bg-gray-50 dark:bg-slate-700 rounded-lg space-y-3">
                                                        <ThemeToggle showLabel />
                                                        <div className="pt-2 border-t border-gray-200 dark:border-slate-600">
                                                            <LanguageSwitcher showLabel />
                                                        </div>
                                                    </div>
                                                )}

                                                {/* ปุ่มดูโควตา */}
                                                {currentCompany && (
                                                    <button
                                                        onClick={handleShowQuota}
                                                        className="w-full px-4 py-3.5 text-left text-sm font-medium text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/30 hover:bg-purple-100 dark:hover:bg-purple-900/50 rounded-lg transition-all duration-200 flex items-center gap-3 mb-2 shadow-sm hover:shadow"
                                                    >
                                                        <div className="w-9 h-9 rounded-lg bg-purple-200 dark:bg-purple-800 flex items-center justify-center">
                                                            <BarChart3 className="w-5 h-5 text-purple-700 dark:text-purple-300" />
                                                        </div>
                                                        <span>{t('header.viewQuota')}</span>
                                                    </button>
                                                )}

                                {/* ปุ่มแพ็กเกจ/อัปเกรด */}
                                {currentCompany && (
                                    <button
                                        onClick={() => {
                                            navigate('/pricing');
                                            setShowMobileMenu(false);
                                        }}
                                        className="w-full px-4 py-3.5 text-left text-sm font-medium text-amber-700 dark:text-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 hover:from-amber-100 hover:to-orange-100 dark:hover:from-amber-900/50 dark:hover:to-orange-900/50 rounded-lg transition-all duration-200 flex items-center gap-3 mb-2 shadow-sm hover:shadow border border-amber-200 dark:border-amber-700"
                                    >
                                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                                            <Sparkles className="w-5 h-5 text-white" />
                                        </div>
                                        <span>{t('header.packages')}</span>
                                    </button>
                                )}

                                {/* ปุ่มจัดการสมาชิก */}
                                {currentCompany && isAdmin && (
                                    <button
                                        onClick={() => {
                                            setShowUserManagement(true);
                                            setShowMobileMenu(false);
                                        }}
                                        className="w-full px-4 py-3.5 text-left text-sm font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-lg transition-all duration-200 flex items-center gap-3 mb-2 shadow-sm hover:shadow"
                                    >
                                        <div className="w-9 h-9 rounded-lg bg-indigo-200 dark:bg-indigo-800 flex items-center justify-center">
                                            <Users className="w-5 h-5 text-indigo-700 dark:text-indigo-300" />
                                        </div>
                                        <span>{t('header.manageMembers')}</span>
                                    </button>
                                )}

                                {/* ปุ่มคู่มือการใช้งาน (Mobile) */}
                                <button
                                    onClick={() => {
                                        navigate('/guide');
                                        setShowMobileMenu(false);
                                    }}
                                    className="w-full px-4 py-3.5 text-left text-sm font-medium text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-900/30 hover:bg-teal-100 dark:hover:bg-teal-900/50 rounded-lg transition-all duration-200 flex items-center gap-3 mb-2 shadow-sm hover:shadow"
                                >
                                    <div className="w-9 h-9 rounded-lg bg-teal-200 dark:bg-teal-800 flex items-center justify-center">
                                        <svg className="w-5 h-5 text-teal-700 dark:text-teal-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                        </svg>
                                    </div>
                                    <span>{t('header.userGuide', 'คู่มือการใช้งาน')}</span>
                                </button>
                            </div>
                        </div>

                        {/* Logout Button ด้านล่าง */}
                        <div className="border-t border-gray-200 dark:border-slate-600 p-4 bg-gray-50 dark:bg-slate-700">
                            <button
                                onClick={() => {
                                    handleLogout();
                                    setShowMobileMenu(false);
                                }}
                                disabled={isLoggingOut}
                                className="w-full px-4 py-3.5 text-left text-sm font-medium text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 rounded-lg transition-all duration-200 flex items-center justify-center gap-3 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isLoggingOut ? (
                                            <>
                                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                <span>{t('auth.loggingOut')}</span>
                                            </>
                                        ) : (
                                            <>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                                </svg>
                                                <span>{t('auth.logout')}</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                        </div>
                </div>
            </div>

            {/* Modal จัดการสมาชิก */}
            {showUserManagement && currentCompany && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                        <UserManagement
                            companyId={currentCompany.id!}
                            companyName={currentCompany.name}
                            onClose={() => setShowUserManagement(false)}
                        />
                    </div>
                </div>
            )}

            {/* Password Modal - เพิ่มรหัสผ่าน */}
            {showPasswordModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                                เพิ่มรหัสผ่าน
                            </h3>
                            <button
                                onClick={() => {
                                    setShowPasswordModal(false);
                                    setPassword('');
                                    setConfirmPassword('');
                                    setLinkError(null);
                                }}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="space-y-4">
                            {/* ข้อความแจ้งเตือน */}
                            <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                                <p className="text-sm text-blue-800 dark:text-blue-300">
                                    <strong>อีเมล:</strong> {user?.email}
                                </p>
                                <p className="text-sm text-blue-800 dark:text-blue-300 mt-2">
                                    ตั้งรหัสผ่านเพื่อให้สามารถ Login ด้วย Email/Password ได้
                                </p>
                            </div>

                            {/* Form */}
                            <form onSubmit={handleLinkPassword} className="space-y-4">
                                {/* Password Input */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        รหัสผ่าน
                                    </label>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="อย่างน้อย 6 ตัวอักษร"
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
                                        disabled={linkLoading}
                                        required
                                        minLength={6}
                                    />
                                </div>

                                {/* Confirm Password Input */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        ยืนยันรหัสผ่าน
                                    </label>
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="กรอกรหัสผ่านอีกครั้ง"
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
                                        disabled={linkLoading}
                                        required
                                        minLength={6}
                                    />
                                </div>

                                {/* Error Message */}
                                {linkError && (
                                    <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
                                        <p className="text-sm text-red-600 dark:text-red-400">{linkError}</p>
                                    </div>
                                )}

                                {/* Submit Button */}
                                <button
                                    type="submit"
                                    disabled={linkLoading}
                                    className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50"
                                >
                                    {linkLoading ? 'กำลังเพิ่มรหัสผ่าน...' : 'เพิ่มรหัสผ่าน'}
                                </button>
                            </form>

                            {/* ข้อมูลเพิ่มเติม */}
                            <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-3">
                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                    <Lightbulb className="w-4 h-4 inline text-amber-500" /> <strong>หลังจากเพิ่มรหัสผ่านแล้ว</strong>
                                    <br />
                                    คุณสามารถ Login ได้ทั้ง Google และ Email/Password
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Change Password Modal - เปลี่ยนรหัสผ่าน */}
            {showChangePasswordModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                                เปลี่ยนรหัสผ่าน
                            </h3>
                            <button
                                onClick={() => {
                                    setShowChangePasswordModal(false);
                                    setCurrentPassword('');
                                    setNewPassword('');
                                    setConfirmNewPassword('');
                                    setChangePasswordError(null);
                                }}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="space-y-4">
                            {/* ข้อความแจ้งเตือน */}
                            <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                                <p className="text-sm text-amber-800 dark:text-amber-300">
                                    <strong>อีเมล:</strong> {user?.email}
                                </p>
                                <p className="text-sm text-amber-800 dark:text-amber-300 mt-2">
                                    กรุณากรอกรหัสผ่านปัจจุบันและรหัสผ่านใหม่
                                </p>
                            </div>

                            {/* Form */}
                            <form onSubmit={handleChangePassword} className="space-y-4">
                                {/* Current Password Input */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        รหัสผ่านปัจจุบัน
                                    </label>
                                    <input
                                        type="password"
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        placeholder="กรอกรหัสผ่านเดิม"
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
                                        disabled={changePasswordLoading}
                                        required
                                    />
                                </div>

                                {/* New Password Input */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        รหัสผ่านใหม่
                                    </label>
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="อย่างน้อย 6 ตัวอักษร"
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
                                        disabled={changePasswordLoading}
                                        required
                                        minLength={6}
                                    />
                                </div>

                                {/* Confirm New Password Input */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        ยืนยันรหัสผ่านใหม่
                                    </label>
                                    <input
                                        type="password"
                                        value={confirmNewPassword}
                                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                                        placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
                                        disabled={changePasswordLoading}
                                        required
                                        minLength={6}
                                    />
                                </div>

                                {/* Error Message */}
                                {changePasswordError && (
                                    <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
                                        <p className="text-sm text-red-600 dark:text-red-400">{changePasswordError}</p>
                                    </div>
                                )}

                                {/* ลืมรหัสผ่าน? */}
                                <div className="text-center">
                                    <button
                                        type="button"
                                        onClick={handleSendResetEmail}
                                        className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline"
                                    >
                                        ลืมรหัสผ่าน? ส่งอีเมลรีเซ็ต
                                    </button>
                                </div>

                                {/* Submit Button */}
                                <button
                                    type="submit"
                                    disabled={changePasswordLoading}
                                    className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-lg font-medium hover:from-amber-600 hover:to-amber-700 transition-all disabled:opacity-50"
                                >
                                    {changePasswordLoading ? 'กำลังเปลี่ยนรหัสผ่าน...' : 'เปลี่ยนรหัสผ่าน'}
                                </button>
                            </form>

                            {/* ข้อมูลเพิ่มเติม */}
                            <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-3">
                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                    <Lightbulb className="w-4 h-4 inline text-amber-500" /> <strong>หมายเหตุ</strong>
                                    <br />
                                    หลังเปลี่ยนรหัสผ่านแล้ว ให้ใช้รหัสผ่านใหม่ในการ Login ครั้งต่อไป
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Quota Modal - แสดงข้อมูล Quota */}
            {showQuotaModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                                ข้อมูลโควตาของบริษัท
                            </h3>
                            <button
                                onClick={() => setShowQuotaModal(false)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Loading State */}
                        {quotaLoading ? (
                            <div className="flex flex-col items-center justify-center py-12">
                                <svg className="animate-spin h-12 w-12 text-purple-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <p className="text-gray-600 dark:text-gray-400">กำลังโหลดข้อมูล...</p>
                            </div>
                        ) : quota ? (
                            <div className="space-y-6">
                                {/* ข้อมูลบริษัท */}
                                <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/30 dark:to-indigo-900/30 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                                    <p className="text-sm text-purple-600 dark:text-purple-400 font-medium mb-1">บริษัท</p>
                                    <p className="text-lg font-bold text-gray-800 dark:text-gray-100">{currentCompany?.name}</p>
                                </div>

                                {/* แผนปัจจุบัน */}
                                <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-amber-600 dark:text-amber-400 font-medium mb-1">แผนปัจจุบัน</p>
                                            <p className="text-2xl font-bold text-gray-800 dark:text-gray-100 capitalize">{quota.plan}</p>
                                        </div>
                                        <div className={`px-4 py-2 rounded-full text-sm font-bold flex items-center gap-1.5 ${
                                            quota.status === 'active' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                                            quota.status === 'trial' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                                            quota.status === 'expired' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
                                            'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                        }`}>
                                            {quota.status === 'active' ? <><Check className="w-4 h-4" /> Active</> :
                                             quota.status === 'trial' ? <><RefreshCw className="w-4 h-4" /> Trial</> :
                                             quota.status === 'expired' ? <><X className="w-4 h-4" /> Expired</> :
                                             <><Pause className="w-4 h-4" /> Suspended</>}
                                        </div>
                                    </div>
                                </div>

                                {/* โควตาการใช้งาน */}
                                <div className="space-y-4">
                                    <h4 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                                        <TrendingUp className="w-5 h-5 text-blue-600" /> การใช้งาน
                                    </h4>

                                    {/* ผู้ใช้ */}
                                    <div className="bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1"><Users className="w-4 h-4" /> ผู้ใช้</span>
                                            <span className={`text-sm font-bold ${quota.currentUsers >= quota.maxUsers && quota.maxUsers !== -1 ? 'text-red-600 dark:text-red-400' : 'text-gray-800 dark:text-gray-200'}`}>
                                                {quota.currentUsers} / {quota.maxUsers === -1 ? '∞' : quota.maxUsers}
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-2.5">
                                            <div 
                                                className={`h-2.5 rounded-full ${quota.currentUsers >= quota.maxUsers && quota.maxUsers !== -1 ? 'bg-red-500' : 'bg-blue-500'}`}
                                                style={{ width: quota.maxUsers === -1 ? '0%' : `${Math.min((quota.currentUsers / quota.maxUsers) * 100, 100)}%` }}
                                            ></div>
                                        </div>
                                    </div>

                                    {/* เอกสาร/เดือน */}
                                    <div className="bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1"><FileText className="w-4 h-4" /> เอกสาร/เดือน</span>
                                            <span className={`text-sm font-bold ${quota.currentDocuments >= quota.maxDocuments && quota.maxDocuments !== -1 ? 'text-red-600 dark:text-red-400' : 'text-gray-800 dark:text-gray-200'}`}>
                                                {quota.currentDocuments} / {quota.maxDocuments === -1 ? '∞' : quota.maxDocuments}
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-2.5">
                                            <div 
                                                className={`h-2.5 rounded-full ${quota.currentDocuments >= quota.maxDocuments && quota.maxDocuments !== -1 ? 'bg-red-500' : 'bg-green-500'}`}
                                                style={{ width: quota.maxDocuments === -1 ? '0%' : `${Math.min((quota.currentDocuments / quota.maxDocuments) * 100, 100)}%` }}
                                            ></div>
                                        </div>
                                    </div>

                                    {/* โลโก้ */}
                                    <div className="bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1"><Palette className="w-4 h-4" /> โลโก้</span>
                                            <span className={`text-sm font-bold ${quota.currentLogos >= quota.maxLogos && quota.maxLogos !== -1 ? 'text-red-600 dark:text-red-400' : 'text-gray-800 dark:text-gray-200'}`}>
                                                {quota.currentLogos} / {quota.maxLogos === -1 ? '∞' : quota.maxLogos}
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-2.5">
                                            <div 
                                                className={`h-2.5 rounded-full ${quota.currentLogos >= quota.maxLogos && quota.maxLogos !== -1 ? 'bg-red-500' : 'bg-purple-500'}`}
                                                style={{ width: quota.maxLogos === -1 ? '0%' : `${Math.min((quota.currentLogos / quota.maxLogos) * 100, 100)}%` }}
                                            ></div>
                                        </div>
                                    </div>

                                    {/* Storage */}
                                    <div className="bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1"><HardDrive className="w-4 h-4" /> พื้นที่จัดเก็บ</span>
                                            <span className={`text-sm font-bold ${quota.currentStorageMB >= quota.maxStorageMB && quota.maxStorageMB !== -1 ? 'text-red-600 dark:text-red-400' : 'text-gray-800 dark:text-gray-200'}`}>
                                                {quota.currentStorageMB.toFixed(1)} MB / {quota.maxStorageMB === -1 ? '∞' : `${quota.maxStorageMB} MB`}
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-2.5">
                                            <div 
                                                className={`h-2.5 rounded-full ${quota.currentStorageMB >= quota.maxStorageMB && quota.maxStorageMB !== -1 ? 'bg-red-500' : 'bg-indigo-500'}`}
                                                style={{ width: quota.maxStorageMB === -1 ? '0%' : `${Math.min((quota.currentStorageMB / quota.maxStorageMB) * 100, 100)}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>

                                {/* Features */}
                                <div className="space-y-3">
                                    <h4 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                                        <Zap className="w-5 h-5 text-amber-500" /> ฟีเจอร์
                                    </h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        {quota.features.multipleProfiles && (
                                            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                                <Check className="w-4 h-4 text-green-500" /> Multiple Profiles
                                            </div>
                                        )}
                                        {quota.features.apiAccess && (
                                            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                                <Check className="w-4 h-4 text-green-500" /> API Access
                                            </div>
                                        )}
                                        {quota.features.customDomain && (
                                            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                                <Check className="w-4 h-4 text-green-500" /> Custom Domain
                                            </div>
                                        )}
                                        {quota.features.prioritySupport && (
                                            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                                <Check className="w-4 h-4 text-green-500" /> Priority Support
                                            </div>
                                        )}
                                        {quota.features.exportPDF && (
                                            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                                <Check className="w-4 h-4 text-green-500" /> Export PDF
                                            </div>
                                        )}
                                        {quota.features.exportExcel && (
                                            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                                <Check className="w-4 h-4 text-green-500" /> Export Excel
                                            </div>
                                        )}
                                        {quota.features.advancedReports && (
                                            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                                <Check className="w-4 h-4 text-green-500" /> Advanced Reports
                                            </div>
                                        )}
                                        {quota.features.customTemplates && (
                                            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                                <Check className="w-4 h-4 text-green-500" /> Custom Templates
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* ปุ่มปิด */}
                                <button
                                    onClick={() => setShowQuotaModal(false)}
                                    className="w-full py-3 px-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg font-medium hover:from-purple-600 hover:to-purple-700 transition-all"
                                >
                                    ปิด
                                </button>
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <p className="text-gray-600">ไม่พบข้อมูลโควตา</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Logo Manager Modal */}
            {showLogoModal && (
                <LogoManagerModal
                    isOpen={showLogoModal}
                    onClose={() => setShowLogoModal(false)}
                    currentLogo={companyLogo}
                    logoUrl={companyLogoUrl}
                    logoType={companyLogoType}
                    companyDefaultLogoUrl={currentCompany?.defaultLogoUrl}
                    organizationId={currentCompany?.id}
                    onChange={handleLogoChange}
                    onSetDefaultLogo={handleSetDefaultLogo}
                />
            )}

            {/* Company Info Modal */}
            {showCompanyInfoModal && currentCompany && (
                <CompanyInfoModal
                    isOpen={showCompanyInfoModal}
                    onClose={() => setShowCompanyInfoModal(false)}
                    companyName={currentCompany.name}
                    companyAddress={currentCompany.address}
                    companyPhone={currentCompany.phone}
                    companyEmail={currentCompany.email}
                    companyWebsite={currentCompany.website}
                    companyTaxId={currentCompany.taxId}
                    companyBranchCode={currentCompany.branchCode}
                    companyBranchName={currentCompany.branchName}
                    onSave={handleSaveCompanyInfo}
                />
            )}

            {/* Organization Logo Manager Modal */}
            <OrganizationLogoManager
                isOpen={showOrganizationLogoModal}
                onClose={() => setShowOrganizationLogoModal(false)}
            />

            {/* Account Linking Modal */}
            <AccountLinkingModal
                isOpen={showAccountLinkingModal}
                onClose={() => {
                    setShowAccountLinkingModal(false);
                    // รีเฟรช linked providers หลังปิด modal
                    const status = checkLinkedProviders();
                    setLinkedProviders(status);
                    setHasPassword(status.hasEmail);
                }}
                email={user?.email || undefined}
                phoneNumber={user?.phoneNumber || undefined}
                mode="suggest"
            />

            {/* Menu Settings Modal */}
            <MenuSettingsModal
                isOpen={showMenuSettings}
                onClose={() => setShowMenuSettings(false)}
                onSave={() => {
                    refreshMenus();
                    setShowMenuSettings(false);
                }}
                onOpenUserSettings={() => setShowUserMenuSettings(true)}
            />

            {/* User Menu Settings Modal */}
            <UserMenuSettingsModal
                isOpen={showUserMenuSettings}
                onClose={() => setShowUserMenuSettings(false)}
                onSave={() => {
                    refreshMenus();
                }}
            />

            {/* Tab Settings Modal */}
            {currentCompany && (
                <TabSettingsModal
                    isOpen={showTabSettings}
                    onClose={() => setShowTabSettings(false)}
                    companyId={currentCompany.id!}
                    onSaved={() => {
                        // รีเฟรช tabs หลังบันทึก
                        refreshTabs();
                    }}
                />
            )}
        </>
    );
};

export default Header;