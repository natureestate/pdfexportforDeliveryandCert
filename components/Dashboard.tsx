/**
 * Dashboard Component
 * แสดงสถิติและข้อมูลภาพรวมของเอกสารทั้งหมด
 */

import React, { useEffect, useState, useCallback } from 'react';
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
    PieChart
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
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigateToDocType }) => {
    const { currentCompany } = useCompany();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    // โหลดข้อมูลสถิติ
    const loadStats = useCallback(async (showRefreshing = false) => {
        try {
            if (showRefreshing) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }
            setError(null);

            const data = await getDashboardStats(currentCompany?.id);
            setStats(data);
        } catch (err) {
            console.error('Error loading dashboard stats:', err);
            setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [currentCompany?.id]);

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
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                <p className="text-gray-500">กำลังโหลดข้อมูลสถิติ...</p>
            </div>
        );
    }

    // แสดง Error
    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
                <p className="text-red-600 mb-4">{error}</p>
                <button 
                    onClick={() => loadStats()}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                    ลองใหม่
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
                    <h2 className="text-2xl font-bold text-gray-800">📊 Dashboard</h2>
                    <p className="text-gray-500 text-sm mt-1">
                        ภาพรวมเอกสารของ {currentCompany?.name || 'บริษัท'}
                    </p>
                </div>
                <button
                    onClick={() => loadStats(true)}
                    disabled={refreshing}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                    {refreshing ? 'กำลังรีเฟรช...' : 'รีเฟรช'}
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* เอกสารทั้งหมด */}
                <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-5 text-white shadow-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-indigo-100 text-sm font-medium">เอกสารทั้งหมด</p>
                            <p className="text-3xl font-bold mt-1">{formatCurrency(stats.totalDocuments)}</p>
                        </div>
                        <div className="bg-white/20 rounded-full p-3">
                            <FileText className="w-6 h-6" />
                        </div>
                    </div>
                    <div className="mt-3 flex items-center gap-1 text-sm">
                        <Calendar className="w-4 h-4" />
                        <span>เดือนนี้: {stats.totalThisMonth} ฉบับ</span>
                    </div>
                </div>

                {/* การเติบโต */}
                <div className={`bg-gradient-to-br ${stats.growthPercent >= 0 ? 'from-emerald-500 to-emerald-600' : 'from-red-500 to-red-600'} rounded-xl p-5 text-white shadow-lg`}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className={`${stats.growthPercent >= 0 ? 'text-emerald-100' : 'text-red-100'} text-sm font-medium`}>การเติบโต</p>
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
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                    <div className="bg-red-100 rounded-full p-2">
                        <Ban className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                        <p className="font-medium text-red-800">
                            เอกสารที่ยกเลิก: {stats.totalCancelled} ฉบับ
                        </p>
                        <p className="text-sm text-red-600">
                            มีเอกสารที่ถูกยกเลิกในระบบ
                        </p>
                    </div>
                </div>
            )}

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* สถิติตามประเภทเอกสาร */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <PieChart className="w-5 h-5 text-indigo-600" />
                        <h3 className="text-lg font-semibold text-gray-800">สถิติตามประเภทเอกสาร</h3>
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
                        <div className="text-center py-8 text-gray-500">
                            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                            <p>ยังไม่มีเอกสารในระบบ</p>
                            <p className="text-sm">เริ่มสร้างเอกสารใหม่ได้เลย!</p>
                        </div>
                    )}
                </div>

                {/* กิจกรรมล่าสุด */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <Activity className="w-5 h-5 text-indigo-600" />
                        <h3 className="text-lg font-semibold text-gray-800">กิจกรรมล่าสุด</h3>
                    </div>

                    <div className="space-y-3 max-h-80 overflow-y-auto">
                        {stats.recentActivity.length > 0 ? (
                            stats.recentActivity.map((activity) => (
                                <div 
                                    key={`${activity.docType}-${activity.id}`}
                                    className={`flex items-start gap-3 p-3 rounded-lg ${
                                        activity.status === 'cancelled' 
                                            ? 'bg-red-50 border border-red-100' 
                                            : 'bg-gray-50'
                                    }`}
                                >
                                    <div className={`${DOC_TYPE_COLORS[activity.docType]} rounded-full p-1.5 flex-shrink-0`}>
                                        <FileText className="w-3 h-3 text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium text-gray-800 truncate">
                                                {activity.docNumber}
                                            </span>
                                            {activity.status === 'cancelled' && (
                                                <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">
                                                    ยกเลิก
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-500 truncate">
                                            {activity.docTypeName}
                                            {activity.customerName && ` • ${activity.customerName}`}
                                        </p>
                                        {activity.total && (
                                            <p className="text-xs font-medium text-green-600">
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
                            <div className="text-center py-8 text-gray-500">
                                <Activity className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                                <p className="text-sm">ยังไม่มีกิจกรรม</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* แนวโน้มรายเดือน */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                <div className="flex items-center gap-2 mb-4">
                    <BarChart3 className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-lg font-semibold text-gray-800">แนวโน้ม 6 เดือนย้อนหลัง</h3>
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
                                        <div className="text-xs text-green-600 font-medium mb-1 truncate w-full text-center">
                                            ฿{formatCurrency(trend.revenue)}
                                        </div>
                                    )}
                                    {/* จำนวนเอกสาร */}
                                    <div className="text-sm font-bold text-gray-700 mb-1">
                                        {trend.count}
                                    </div>
                                    {/* Bar */}
                                    <div 
                                        className={`w-full max-w-12 rounded-t-lg transition-all duration-500 ${
                                            index === stats.monthlyTrend.length - 1 
                                                ? 'bg-indigo-500' 
                                                : 'bg-indigo-200'
                                        }`}
                                        style={{ 
                                            height: `${Math.max(heightPercent, 5)}%`,
                                            minHeight: '8px'
                                        }}
                                    />
                                </div>
                                {/* เดือน */}
                                <div className="text-xs text-gray-500 mt-2 text-center">
                                    {trend.month}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Legend */}
                <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-indigo-500"></div>
                        <span className="text-sm text-gray-600">เดือนปัจจุบัน</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-indigo-200"></div>
                        <span className="text-sm text-gray-600">เดือนก่อนหน้า</span>
                    </div>
                </div>
            </div>

            {/* Quick Stats Summary */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-5 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">📈 สรุปภาพรวม</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                        <p className="text-2xl font-bold text-indigo-600">{stats.totalThisMonth}</p>
                        <p className="text-sm text-gray-500">เอกสารเดือนนี้</p>
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-green-600">
                            {stats.byDocType.filter(s => s.thisMonth > 0).length}
                        </p>
                        <p className="text-sm text-gray-500">ประเภทที่ใช้งาน</p>
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-amber-600">
                            {Math.round(stats.totalDocuments / Math.max(stats.byDocType.filter(s => s.total > 0).length, 1))}
                        </p>
                        <p className="text-sm text-gray-500">เฉลี่ยต่อประเภท</p>
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-purple-600">
                            ฿{formatCurrency(stats.totalRevenue - stats.totalExpense)}
                        </p>
                        <p className="text-sm text-gray-500">กำไร/ขาดทุนเดือนนี้</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;

