/**
 * Dashboard Component
 * แสดงสถิติและข้อมูลภาพรวมของเอกสารทั้งหมด
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { 
    TrendingUp, 
    TrendingDown, 
    FileText, 
    DollarSign, 
    ShoppingCart,
    AlertCircle,
    RefreshCw,
    Calendar,
    Users,
    ArrowUpRight,
    ArrowDownRight,
    Ban,
    Activity,
    BarChart3,
    PieChart,
    Star,
    AlertTriangle,
    Clock,
    Zap,
    Target,
    Plus,
    Check,
    Edit2,
    Shield,
    Package,
    Receipt,
    FileCheck,
    Home
} from 'lucide-react';
import { useCompany } from '../contexts/CompanyContext';
import { 
    getDashboardStats, 
    DashboardStats, 
    DocumentTypeStats,
    RecentActivity,
    MonthlyTrend,
    DOC_TYPE_NAMES 
} from '../services/dashboardStats';
import { getCurrentMonthGoal, saveGoal, GoalWithProgress, calculateGoalProgress, MonthlyGoal } from '../services/goals';
import type { DocType } from '../utils/documentRegistry';

// สีสำหรับแต่ละประเภทเอกสาร
const DOC_TYPE_COLORS: Record<DocType, string> = {
    'delivery': 'bg-blue-500',
    'warranty': 'bg-purple-500',
    'invoice': 'bg-green-500',
    'receipt': 'bg-emerald-500',
    'tax-invoice': 'bg-teal-500',
    'quotation': 'bg-amber-500',
    'purchase-order': 'bg-orange-500',
    'memo': 'bg-pink-500',
    'variation-order': 'bg-rose-500',
    'subcontract': 'bg-indigo-500',
};

// สีพื้นหลังอ่อนสำหรับแต่ละประเภทเอกสาร
const DOC_TYPE_BG_COLORS: Record<DocType, string> = {
    'delivery': 'bg-blue-50 border-blue-200',
    'warranty': 'bg-purple-50 border-purple-200',
    'invoice': 'bg-green-50 border-green-200',
    'receipt': 'bg-emerald-50 border-emerald-200',
    'tax-invoice': 'bg-teal-50 border-teal-200',
    'quotation': 'bg-amber-50 border-amber-200',
    'purchase-order': 'bg-orange-50 border-orange-200',
    'memo': 'bg-pink-50 border-pink-200',
    'variation-order': 'bg-rose-50 border-rose-200',
    'subcontract': 'bg-indigo-50 border-indigo-200',
};

// Text colors สำหรับแต่ละประเภทเอกสาร
const DOC_TYPE_TEXT_COLORS: Record<DocType, string> = {
    'delivery': 'text-blue-700',
    'warranty': 'text-purple-700',
    'invoice': 'text-green-700',
    'receipt': 'text-emerald-700',
    'tax-invoice': 'text-teal-700',
    'quotation': 'text-amber-700',
    'purchase-order': 'text-orange-700',
    'memo': 'text-pink-700',
    'variation-order': 'text-rose-700',
    'subcontract': 'text-indigo-700',
};

interface DashboardProps {
    onNavigateToDocType?: (docType: DocType) => void;
    onQuickAction?: (docType: DocType) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigateToDocType, onQuickAction }) => {
    const { t } = useTranslation();
    const { currentCompany } = useCompany();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    
    // Goals state
    const [goal, setGoal] = useState<MonthlyGoal | null>(null);
    const [goalProgress, setGoalProgress] = useState<GoalWithProgress | null>(null);
    const [showGoalModal, setShowGoalModal] = useState(false);
    const [goalForm, setGoalForm] = useState({ documentGoal: 0, revenueGoal: 0 });
    const [savingGoal, setSavingGoal] = useState(false);

    // โหลดข้อมูลสถิติ
    const loadStats = useCallback(async (showRefreshing = false) => {
        try {
            if (showRefreshing) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }
            setError(null);

            const [data, goalData] = await Promise.all([
                getDashboardStats(currentCompany?.id),
                currentCompany?.id ? getCurrentMonthGoal(currentCompany.id) : Promise.resolve(null),
            ]);
            setStats(data);
            setGoal(goalData);
            
            // คำนวณความคืบหน้าของเป้าหมาย
            if (goalData && data) {
                const progress = calculateGoalProgress(goalData, data.totalThisMonth, data.totalRevenue);
                setGoalProgress(progress);
            }
        } catch (err) {
            console.error('Error loading dashboard stats:', err);
            setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [currentCompany?.id]);
    
    // บันทึกเป้าหมาย
    const handleSaveGoal = async () => {
        if (!currentCompany?.id) return;
        
        setSavingGoal(true);
        try {
            const now = new Date();
            await saveGoal(
                currentCompany.id,
                now.getFullYear(),
                now.getMonth() + 1,
                goalForm.documentGoal,
                goalForm.revenueGoal
            );
            setShowGoalModal(false);
            loadStats(true);
        } catch (err) {
            console.error('Error saving goal:', err);
            console.error('ไม่สามารถบันทึกเป้าหมายได้');
        } finally {
            setSavingGoal(false);
        }
    };

    // โหลดข้อมูลเมื่อ component mount หรือเปลี่ยนบริษัท
    useEffect(() => {
        loadStats();
    }, [loadStats]);

    // ฟอร์แมตตัวเลขเงิน
    const formatCurrency = (amount: number): string => {
        return new Intl.NumberFormat('th-TH', {
            style: 'decimal',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    // ฟอร์แมตวันที่
    const formatDate = (date: Date): string => {
        return new Intl.DateTimeFormat('th-TH', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
        }).format(date);
    };

    // ฟอร์แมตวันที่แบบสั้น
    const formatShortDate = (date: Date): string => {
        return new Intl.DateTimeFormat('th-TH', {
            day: 'numeric',
            month: 'short',
        }).format(date);
    };

    // แสดง Loading
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
                <p className="text-gray-500 dark:text-gray-400">กำลังโหลดข้อมูลสถิติ...</p>
            </div>
        );
    }

    // แสดง Error
    if (error) {
        return (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
                <AlertCircle className="w-12 h-12 text-red-400 dark:text-red-300 mx-auto mb-3" />
                <p className="text-red-600 dark:text-red-300 mb-4">{error}</p>
                <button 
                    onClick={() => loadStats()}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                    {t('dashboard.tryAgain')}
                </button>
            </div>
        );
    }

    if (!stats) {
        return null;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                        <BarChart3 className="w-7 h-7 text-indigo-600 dark:text-indigo-400" /> {t('dashboard.title')}
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                        {t('dashboard.overview')} {currentCompany?.name || t('company.companyName')}
                    </p>
                </div>
                <button
                    onClick={() => loadStats(true)}
                    disabled={refreshing}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                    {refreshing ? t('app.refreshing') : t('app.refresh')}
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* เอกสารทั้งหมด */}
                <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-5 text-white shadow-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-indigo-100 text-sm font-medium">{t('dashboard.totalDocuments')}</p>
                            <p className="text-3xl font-bold mt-1">{formatCurrency(stats.totalDocuments)}</p>
                        </div>
                        <div className="bg-white/20 rounded-full p-3">
                            <FileText className="w-6 h-6" />
                        </div>
                    </div>
                    <div className="mt-3 flex items-center gap-1 text-sm">
                        <Calendar className="w-4 h-4" />
                        <span>{t('dashboard.thisMonth')}: {stats.totalThisMonth} {t('dashboard.documents')}</span>
                    </div>
                </div>

                {/* การเติบโต */}
                <div className={`bg-gradient-to-br ${stats.growthPercent >= 0 ? 'from-emerald-500 to-emerald-600' : 'from-red-500 to-red-600'} rounded-xl p-5 text-white shadow-lg`}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className={`${stats.growthPercent >= 0 ? 'text-emerald-100' : 'text-red-100'} text-sm font-medium`}>{t('dashboard.growth')}</p>
                            <p className="text-3xl font-bold mt-1">
                                {stats.growthPercent >= 0 ? '+' : ''}{stats.growthPercent}%
                            </p>
                        </div>
                        <div className="bg-white/20 rounded-full p-3">
                            {stats.growthPercent >= 0 ? (
                                <TrendingUp className="w-6 h-6" />
                            ) : (
                                <TrendingDown className="w-6 h-6" />
                            )}
                        </div>
                    </div>
                    <div className="mt-3 text-sm">
                        เทียบกับเดือนที่แล้ว ({stats.totalLastMonth} ฉบับ)
                    </div>
                </div>

                {/* รายได้เดือนนี้ */}
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-5 text-white shadow-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-green-100 text-sm font-medium">รายได้เดือนนี้</p>
                            <p className="text-2xl sm:text-3xl font-bold mt-1 truncate">
                                ฿{formatCurrency(stats.totalRevenue)}
                            </p>
                        </div>
                        <div className="bg-white/20 rounded-full p-3">
                            <DollarSign className="w-6 h-6" />
                        </div>
                    </div>
                    <div className="mt-3 flex items-center gap-1 text-sm text-green-100">
                        <ArrowUpRight className="w-4 h-4" />
                        <span>จากใบแจ้งหนี้/ใบเสร็จ</span>
                    </div>
                </div>

                {/* รายจ่ายเดือนนี้ */}
                <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-5 text-white shadow-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-orange-100 text-sm font-medium">รายจ่ายเดือนนี้</p>
                            <p className="text-2xl sm:text-3xl font-bold mt-1 truncate">
                                ฿{formatCurrency(stats.totalExpense)}
                            </p>
                        </div>
                        <div className="bg-white/20 rounded-full p-3">
                            <ShoppingCart className="w-6 h-6" />
                        </div>
                    </div>
                    <div className="mt-3 flex items-center gap-1 text-sm text-orange-100">
                        <ArrowDownRight className="w-4 h-4" />
                        <span>จากใบสั่งซื้อ/สัญญาช่าง</span>
                    </div>
                </div>
            </div>

            {/* เอกสารที่ยกเลิก */}
            {stats.totalCancelled > 0 && (
                <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center gap-3">
                    <div className="bg-red-100 dark:bg-red-800 rounded-full p-2">
                        <Ban className="w-5 h-5 text-red-600 dark:text-red-300" />
                    </div>
                    <div>
                        <p className="font-medium text-red-800 dark:text-red-200">
                            เอกสารที่ยกเลิก: {stats.totalCancelled} ฉบับ
                        </p>
                        <p className="text-sm text-red-600 dark:text-red-300">
                            มีเอกสารที่ถูกยกเลิกในระบบ
                        </p>
                    </div>
                </div>
            )}

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* สถิติตามประเภทเอกสาร */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-700 rounded-xl shadow-sm border border-gray-200 dark:border-slate-600 p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <PieChart className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">สถิติตามประเภทเอกสาร</h3>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {stats.byDocType
                            .filter(stat => stat.total > 0)
                            .sort((a, b) => b.total - a.total)
                            .map((stat) => (
                                <button
                                    key={stat.docType}
                                    onClick={() => onNavigateToDocType?.(stat.docType)}
                                    className={`${DOC_TYPE_BG_COLORS[stat.docType]} border rounded-lg p-3 text-left hover:shadow-md transition-all cursor-pointer group`}
                                >
                                    <div className={`${DOC_TYPE_TEXT_COLORS[stat.docType]} font-medium text-sm truncate`}>
                                        {stat.name}
                                    </div>
                                    <div className={`${DOC_TYPE_TEXT_COLORS[stat.docType]} text-2xl font-bold mt-1`}>
                                        {stat.total}
                                    </div>
                                    <div className="flex items-center gap-1 mt-1">
                                        {stat.growthPercent > 0 ? (
                                            <span className="text-xs text-green-600 flex items-center gap-0.5">
                                                <TrendingUp className="w-3 h-3" />
                                                +{stat.growthPercent}%
                                            </span>
                                        ) : stat.growthPercent < 0 ? (
                                            <span className="text-xs text-red-600 flex items-center gap-0.5">
                                                <TrendingDown className="w-3 h-3" />
                                                {stat.growthPercent}%
                                            </span>
                                        ) : (
                                            <span className="text-xs text-gray-500">-</span>
                                        )}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">
                                        เดือนนี้: {stat.thisMonth}
                                    </div>
                                </button>
                            ))}
                    </div>

                    {/* แสดงถ้าไม่มีเอกสาร */}
                    {stats.byDocType.every(stat => stat.total === 0) && (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-500" />
                            <p>ยังไม่มีเอกสารในระบบ</p>
                            <p className="text-sm">เริ่มสร้างเอกสารใหม่ได้เลย!</p>
                        </div>
                    )}
                </div>

                {/* กิจกรรมล่าสุด */}
                <div className="bg-white dark:bg-slate-700 rounded-xl shadow-sm border border-gray-200 dark:border-slate-600 p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <Activity className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">กิจกรรมล่าสุด</h3>
                    </div>

                    <div className="space-y-3 max-h-80 overflow-y-auto">
                        {stats.recentActivity.length > 0 ? (
                            stats.recentActivity.map((activity) => (
                                <div 
                                    key={`${activity.docType}-${activity.id}`}
                                    className={`flex items-start gap-3 p-3 rounded-lg ${
                                        activity.status === 'cancelled' 
                                            ? 'bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-800' 
                                            : 'bg-gray-50 dark:bg-slate-600'
                                    }`}
                                >
                                    <div className={`${DOC_TYPE_COLORS[activity.docType]} rounded-full p-1.5 flex-shrink-0`}>
                                        <FileText className="w-3 h-3 text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                                                {activity.docNumber}
                                            </span>
                                            {activity.status === 'cancelled' && (
                                                <span className="text-xs bg-red-100 dark:bg-red-800 text-red-600 dark:text-red-200 px-1.5 py-0.5 rounded">
                                                    ยกเลิก
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                            {activity.docTypeName}
                                            {activity.customerName && ` • ${activity.customerName}`}
                                        </p>
                                        {activity.total && (
                                            <p className="text-xs font-medium text-green-600 dark:text-green-400">
                                                ฿{formatCurrency(activity.total)}
                                            </p>
                                        )}
                                    </div>
                                    <div className="text-xs text-gray-400 flex-shrink-0">
                                        {formatShortDate(activity.createdAt)}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                <Activity className="w-10 h-10 mx-auto mb-2 text-gray-300 dark:text-gray-500" />
                                <p className="text-sm">ยังไม่มีกิจกรรม</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* แนวโน้มรายเดือน */}
            <div className="bg-white dark:bg-slate-700 rounded-xl shadow-sm border border-gray-200 dark:border-slate-600 p-5">
                <div className="flex items-center gap-2 mb-4">
                    <BarChart3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">แนวโน้ม 6 เดือนย้อนหลัง</h3>
                </div>

                {/* Simple Bar Chart */}
                <div className="flex items-end justify-between gap-2 h-48 px-2">
                    {stats.monthlyTrend.map((trend, index) => {
                        const maxCount = Math.max(...stats.monthlyTrend.map(t => t.count), 1);
                        const heightPercent = (trend.count / maxCount) * 100;
                        
                        return (
                            <div key={trend.monthKey} className="flex-1 flex flex-col items-center">
                                <div className="w-full flex flex-col items-center justify-end h-36">
                                    {/* ยอดเงิน */}
                                    {trend.revenue > 0 && (
                                        <div className="text-xs text-green-600 dark:text-green-400 font-medium mb-1 truncate w-full text-center">
                                            ฿{formatCurrency(trend.revenue)}
                                        </div>
                                    )}
                                    {/* จำนวนเอกสาร */}
                                    <div className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">
                                        {trend.count}
                                    </div>
                                    {/* Bar */}
                                    <div 
                                        className={`w-full max-w-12 rounded-t-lg transition-all duration-500 ${
                                            index === stats.monthlyTrend.length - 1 
                                                ? 'bg-indigo-500' 
                                                : 'bg-indigo-200 dark:bg-indigo-700'
                                        }`}
                                        style={{ 
                                            height: `${Math.max(heightPercent, 5)}%`,
                                            minHeight: '8px'
                                        }}
                                    />
                                </div>
                                {/* เดือน */}
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                                    {trend.month}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Legend */}
                <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-gray-100 dark:border-slate-600">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-indigo-500"></div>
                        <span className="text-sm text-gray-600 dark:text-gray-300">เดือนปัจจุบัน</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-indigo-200 dark:bg-indigo-700"></div>
                        <span className="text-sm text-gray-600 dark:text-gray-300">เดือนก่อนหน้า</span>
                    </div>
                </div>
            </div>

            {/* Customer Stats with End Customer Project */}
            {stats.totalCustomers !== undefined && stats.totalCustomers > 0 && (
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/30 dark:to-indigo-900/30 rounded-xl p-5 border border-purple-200 dark:border-purple-700">
                    <div className="flex items-center gap-2 mb-4">
                        <Home className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">สถิติลูกค้า & โครงการลูกค้าปลายทาง</h3>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white dark:bg-slate-700 rounded-lg p-4 text-center shadow-sm">
                            <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{stats.totalCustomers}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">ลูกค้าทั้งหมด</p>
                        </div>
                        <div className="bg-white dark:bg-slate-700 rounded-lg p-4 text-center shadow-sm">
                            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.customersWithEndProject || 0}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">มีโครงการลูกค้าปลายทาง</p>
                        </div>
                        <div className="bg-white dark:bg-slate-700 rounded-lg p-4 text-center shadow-sm">
                            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                                {stats.totalCustomers > 0 ? Math.round((stats.customersWithEndProject || 0) / stats.totalCustomers * 100) : 0}%
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">สัดส่วนลูกค้าปลายทาง</p>
                        </div>
                        <div className="bg-white dark:bg-slate-700 rounded-lg p-4 text-center shadow-sm">
                            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.totalCustomers - (stats.customersWithEndProject || 0)}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">ลูกค้าทั่วไป</p>
                        </div>
                    </div>
                </div>
            )}

            {/* New Features Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top 5 ลูกค้า */}
                <div className="bg-white dark:bg-slate-700 rounded-xl shadow-sm border border-gray-200 dark:border-slate-600 p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <Star className="w-5 h-5 text-amber-500" />
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Top 5 ลูกค้า</h3>
                    </div>
                    
                    {stats.topCustomers && stats.topCustomers.length > 0 ? (
                        <div className="space-y-3">
                            {stats.topCustomers.map((customer, index) => (
                                <div key={customer.customerName} className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                                        index === 0 ? 'bg-amber-500' : 
                                        index === 1 ? 'bg-gray-400' : 
                                        index === 2 ? 'bg-amber-700' : 'bg-gray-300'
                                    }`}>
                                        {index + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-800 dark:text-gray-100 truncate">{customer.customerName}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {customer.documentCount} เอกสาร • ฿{formatCurrency(customer.totalAmount)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                            <Users className="w-10 h-10 mx-auto mb-2 text-gray-300 dark:text-gray-500" />
                            <p className="text-sm">ยังไม่มีข้อมูลลูกค้า</p>
                        </div>
                    )}
                </div>

                {/* เอกสารใกล้หมดอายุ */}
                <div className="bg-white dark:bg-slate-700 rounded-xl shadow-sm border border-gray-200 dark:border-slate-600 p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">เอกสารใกล้หมดอายุ</h3>
                    </div>
                    
                    {stats.expiringDocuments && stats.expiringDocuments.length > 0 ? (
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {stats.expiringDocuments.map((doc) => (
                                <div 
                                    key={doc.id}
                                    className={`p-3 rounded-lg border ${
                                        doc.daysUntilExpiry <= 7 
                                            ? 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800' 
                                            : 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            {doc.docType === 'warranty' ? (
                                                <Shield className="w-4 h-4 text-purple-500" />
                                            ) : (
                                                <FileText className="w-4 h-4 text-amber-500" />
                                            )}
                                            <span className="font-medium text-sm dark:text-gray-100">{doc.docNumber}</span>
                                        </div>
                                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                            doc.daysUntilExpiry <= 7 
                                                ? 'bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200' 
                                                : 'bg-amber-100 dark:bg-amber-800 text-amber-700 dark:text-amber-200'
                                        }`}>
                                            {doc.daysUntilExpiry} วัน
                                        </span>
                                    </div>
                                    {doc.customerName && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">{doc.customerName}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                            <Check className="w-10 h-10 mx-auto mb-2 text-green-400" />
                            <p className="text-sm">ไม่มีเอกสารใกล้หมดอายุ</p>
                        </div>
                    )}
                </div>

                {/* สถานะการชำระเงิน */}
                <div className="bg-white dark:bg-slate-700 rounded-xl shadow-sm border border-gray-200 dark:border-slate-600 p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <Clock className="w-5 h-5 text-red-500" />
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">ใบแจ้งหนี้ค้างชำระ</h3>
                    </div>
                    
                    {stats.pendingPayments && stats.pendingPayments.length > 0 ? (
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {stats.pendingPayments.map((payment) => (
                                <div 
                                    key={payment.id}
                                    className={`p-3 rounded-lg border ${
                                        payment.status === 'overdue' 
                                            ? 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800' 
                                            : 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <span className="font-medium text-sm dark:text-gray-100">{payment.docNumber}</span>
                                            {payment.customerName && (
                                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{payment.customerName}</p>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-sm text-gray-800 dark:text-gray-100">฿{formatCurrency(payment.amount)}</p>
                                            {payment.status === 'overdue' && (
                                                <span className="text-xs text-red-600 dark:text-red-400">เกินกำหนด {payment.daysOverdue} วัน</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <div className="pt-2 border-t border-gray-100 dark:border-slate-600 mt-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600 dark:text-gray-300">รวมค้างชำระ</span>
                                    <span className="font-bold text-red-600 dark:text-red-400">
                                        ฿{formatCurrency(stats.pendingPayments.reduce((sum, p) => sum + p.amount, 0))}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                            <Check className="w-10 h-10 mx-auto mb-2 text-green-400" />
                            <p className="text-sm">ไม่มีใบแจ้งหนี้ค้างชำระ</p>
                        </div>
                    )}
                </div>

                {/* Quick Actions */}
                <div className="bg-white dark:bg-slate-700 rounded-xl shadow-sm border border-gray-200 dark:border-slate-600 p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <Zap className="w-5 h-5 text-indigo-500" />
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Quick Actions</h3>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { docType: 'quotation' as DocType, icon: DollarSign, label: 'ใบเสนอราคา', color: 'bg-amber-50 dark:bg-amber-900/30 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800' },
                            { docType: 'invoice' as DocType, icon: FileText, label: 'ใบแจ้งหนี้', color: 'bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/50 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800' },
                            { docType: 'receipt' as DocType, icon: Receipt, label: 'ใบเสร็จ', color: 'bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' },
                            { docType: 'delivery' as DocType, icon: Package, label: 'ใบส่งมอบ', color: 'bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800' },
                            { docType: 'warranty' as DocType, icon: Shield, label: 'ใบรับประกัน', color: 'bg-purple-50 dark:bg-purple-900/30 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800' },
                            { docType: 'tax-invoice' as DocType, icon: FileCheck, label: 'ใบกำกับภาษี', color: 'bg-teal-50 dark:bg-teal-900/30 hover:bg-teal-100 dark:hover:bg-teal-900/50 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800' },
                        ].map(({ docType, icon: Icon, label, color }) => (
                            <button
                                key={docType}
                                onClick={() => onQuickAction?.(docType)}
                                className={`flex items-center gap-2 p-3 rounded-lg border transition-all ${color}`}
                            >
                                <Icon className="w-5 h-5" />
                                <span className="text-sm font-medium">{label}</span>
                                <Plus className="w-4 h-4 ml-auto opacity-50" />
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* เป้าหมายรายเดือน */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-xl p-5 border border-indigo-200 dark:border-indigo-700">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Target className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">เป้าหมายเดือนนี้</h3>
                    </div>
                    <button
                        onClick={() => {
                            setGoalForm({
                                documentGoal: goal?.documentGoal || 10,
                                revenueGoal: goal?.revenueGoal || 100000,
                            });
                            setShowGoalModal(true);
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                        <Edit2 className="w-4 h-4" />
                        {goal ? 'แก้ไข' : 'ตั้งเป้า'}
                    </button>
                </div>
                
                {goalProgress ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* เป้าหมายเอกสาร */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">จำนวนเอกสาร</span>
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                    {goalProgress.documentProgress}/{goalProgress.documentGoal}
                                </span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-4 overflow-hidden">
                                <div 
                                    className={`h-full rounded-full transition-all duration-500 ${
                                        goalProgress.isDocumentGoalMet ? 'bg-green-500' : 'bg-indigo-500'
                                    }`}
                                    style={{ width: `${goalProgress.documentPercent}%` }}
                                />
                            </div>
                            <div className="flex items-center justify-between mt-1">
                                <span className={`text-xs font-medium ${
                                    goalProgress.isDocumentGoalMet ? 'text-green-600' : 'text-indigo-600'
                                }`}>
                                    {goalProgress.documentPercent}%
                                </span>
                                {goalProgress.isDocumentGoalMet && (
                                    <span className="text-xs text-green-600 flex items-center gap-1">
                                        <Check className="w-3 h-3" /> บรรลุเป้าหมาย!
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* เป้าหมายรายได้ */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">รายได้</span>
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                    ฿{formatCurrency(goalProgress.revenueProgress || 0)}/฿{formatCurrency(goalProgress.revenueGoal)}
                                </span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-4 overflow-hidden">
                                <div 
                                    className={`h-full rounded-full transition-all duration-500 ${
                                        goalProgress.isRevenueGoalMet ? 'bg-green-500' : 'bg-purple-500'
                                    }`}
                                    style={{ width: `${goalProgress.revenuePercent}%` }}
                                />
                            </div>
                            <div className="flex items-center justify-between mt-1">
                                <span className={`text-xs font-medium ${
                                    goalProgress.isRevenueGoalMet ? 'text-green-600' : 'text-purple-600'
                                }`}>
                                    {goalProgress.revenuePercent}%
                                </span>
                                {goalProgress.isRevenueGoalMet && (
                                    <span className="text-xs text-green-600 flex items-center gap-1">
                                        <Check className="w-3 h-3" /> บรรลุเป้าหมาย!
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-6">
                        <Target className="w-12 h-12 mx-auto mb-3 text-indigo-300 dark:text-indigo-500" />
                        <p className="text-gray-600 dark:text-gray-300 mb-2">ยังไม่ได้ตั้งเป้าหมาย</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">คลิก "ตั้งเป้า" เพื่อกำหนดเป้าหมายรายเดือน</p>
                    </div>
                )}
            </div>

            {/* Quick Stats Summary */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-700 dark:to-slate-600 rounded-xl p-5 border border-gray-200 dark:border-slate-600">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" /> สรุปภาพรวม
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                        <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{stats.totalThisMonth}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">เอกสารเดือนนี้</p>
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                            {stats.byDocType.filter(s => s.thisMonth > 0).length}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">ประเภทที่ใช้งาน</p>
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                            {Math.round(stats.totalDocuments / Math.max(stats.byDocType.filter(s => s.total > 0).length, 1))}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">เฉลี่ยต่อประเภท</p>
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                            ฿{formatCurrency(stats.totalRevenue - stats.totalExpense)}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">กำไร/ขาดทุนเดือนนี้</p>
                    </div>
                </div>
            </div>

            {/* Goal Modal */}
            {showGoalModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-md w-full p-6">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">ตั้งเป้าหมายรายเดือน</h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                                    จำนวนเอกสาร (ฉบับ)
                                </label>
                                <input
                                    type="number"
                                    value={goalForm.documentGoal}
                                    onChange={(e) => setGoalForm({ ...goalForm, documentGoal: parseInt(e.target.value) || 0 })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-800 dark:text-gray-100"
                                    min={0}
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                                    เป้าหมายรายได้ (บาท)
                                </label>
                                <input
                                    type="number"
                                    value={goalForm.revenueGoal}
                                    onChange={(e) => setGoalForm({ ...goalForm, revenueGoal: parseInt(e.target.value) || 0 })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-800 dark:text-gray-100"
                                    min={0}
                                    step={1000}
                                />
                            </div>
                        </div>
                        
                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setShowGoalModal(false)}
                                className="px-4 py-2 text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-slate-700 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={handleSaveGoal}
                                disabled={savingGoal}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                            >
                                {savingGoal ? 'กำลังบันทึก...' : 'บันทึก'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;

