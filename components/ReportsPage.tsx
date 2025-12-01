/**
 * Reports Page Component
 * หน้ารายงานสรุปรายเดือน/ไตรมาส/ปี พร้อม Export
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
    BarChart2, 
    TrendingUp, 
    TrendingDown,
    Calendar,
    Download,
    FileText,
    DollarSign,
    ShoppingCart,
    RefreshCw,
    ChevronLeft,
    ChevronRight,
    Filter,
    AlertCircle,
    ArrowUpRight,
    ArrowDownRight,
    Minus
} from 'lucide-react';
import { useCompany } from '../contexts/CompanyContext';
import { getDashboardStats, DashboardStats, DOC_TYPE_NAMES } from '../services/dashboardStats';
import type { DocType } from '../utils/documentRegistry';

type PeriodType = 'month' | 'quarter' | 'year';

interface PeriodOption {
    label: string;
    value: string;
    startDate: Date;
    endDate: Date;
}

const ReportsPage: React.FC = () => {
    const { currentCompany } = useCompany();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [periodType, setPeriodType] = useState<PeriodType>('month');
    const [selectedPeriod, setSelectedPeriod] = useState<string>('');

    // Generate period options
    const periodOptions = useMemo((): PeriodOption[] => {
        const options: PeriodOption[] = [];
        const now = new Date();

        if (periodType === 'month') {
            // Last 12 months
            for (let i = 0; i < 12; i++) {
                const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const endDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
                options.push({
                    label: new Intl.DateTimeFormat('th-TH', { month: 'long', year: 'numeric' }).format(date),
                    value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
                    startDate: date,
                    endDate,
                });
            }
        } else if (periodType === 'quarter') {
            // Last 8 quarters
            for (let i = 0; i < 8; i++) {
                const quarterOffset = Math.floor(now.getMonth() / 3) - i;
                const year = now.getFullYear() + Math.floor(quarterOffset / 4);
                const quarter = ((quarterOffset % 4) + 4) % 4;
                const startMonth = quarter * 3;
                const startDate = new Date(year, startMonth, 1);
                const endDate = new Date(year, startMonth + 3, 0);
                options.push({
                    label: `ไตรมาส ${quarter + 1}/${year + 543}`,
                    value: `${year}-Q${quarter + 1}`,
                    startDate,
                    endDate,
                });
            }
        } else {
            // Last 5 years
            for (let i = 0; i < 5; i++) {
                const year = now.getFullYear() - i;
                options.push({
                    label: `ปี ${year + 543}`,
                    value: String(year),
                    startDate: new Date(year, 0, 1),
                    endDate: new Date(year, 11, 31),
                });
            }
        }

        return options;
    }, [periodType]);

    // Set default period
    useEffect(() => {
        if (periodOptions.length > 0 && !selectedPeriod) {
            setSelectedPeriod(periodOptions[0].value);
        }
    }, [periodOptions, selectedPeriod]);

    // Load data
    const loadData = useCallback(async () => {
        if (!currentCompany?.id) {
            setError('กรุณาเลือกบริษัทก่อน');
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const data = await getDashboardStats(currentCompany.id);
            setStats(data);
        } catch (err) {
            console.error('Error loading report data:', err);
            setError('ไม่สามารถโหลดข้อมูลรายงานได้');
        } finally {
            setLoading(false);
        }
    }, [currentCompany?.id]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Calculate period data
    const periodData = useMemo(() => {
        if (!stats || !selectedPeriod) return null;

        const currentOption = periodOptions.find(o => o.value === selectedPeriod);
        if (!currentOption) return null;

        // Filter monthly trends within the selected period
        const filteredTrends = stats.monthlyTrends.filter(trend => {
            const trendDate = new Date(trend.year, trend.month - 1, 1);
            return trendDate >= currentOption.startDate && trendDate <= currentOption.endDate;
        });

        const totalDocuments = filteredTrends.reduce((sum, t) => sum + t.totalDocuments, 0);
        const totalRevenue = filteredTrends.reduce((sum, t) => sum + t.totalRevenue, 0);
        const totalExpense = filteredTrends.reduce((sum, t) => sum + t.totalExpense, 0);

        // Calculate by doc type
        const byDocType: Record<DocType, number> = {} as Record<DocType, number>;
        filteredTrends.forEach(trend => {
            Object.entries(trend.byDocType).forEach(([docType, count]) => {
                byDocType[docType as DocType] = (byDocType[docType as DocType] || 0) + count;
            });
        });

        return {
            totalDocuments,
            totalRevenue,
            totalExpense,
            profit: totalRevenue - totalExpense,
            byDocType,
            trends: filteredTrends,
        };
    }, [stats, selectedPeriod, periodOptions]);

    // Previous period comparison
    const comparison = useMemo(() => {
        if (!stats || !selectedPeriod) return null;

        const currentIndex = periodOptions.findIndex(o => o.value === selectedPeriod);
        if (currentIndex < 0 || currentIndex >= periodOptions.length - 1) return null;

        const previousOption = periodOptions[currentIndex + 1];
        const previousTrends = stats.monthlyTrends.filter(trend => {
            const trendDate = new Date(trend.year, trend.month - 1, 1);
            return trendDate >= previousOption.startDate && trendDate <= previousOption.endDate;
        });

        const prevDocuments = previousTrends.reduce((sum, t) => sum + t.totalDocuments, 0);
        const prevRevenue = previousTrends.reduce((sum, t) => sum + t.totalRevenue, 0);
        const prevExpense = previousTrends.reduce((sum, t) => sum + t.totalExpense, 0);

        const calcChange = (current: number, previous: number) => {
            if (previous === 0) return current > 0 ? 100 : 0;
            return ((current - previous) / previous) * 100;
        };

        return {
            documents: calcChange(periodData?.totalDocuments || 0, prevDocuments),
            revenue: calcChange(periodData?.totalRevenue || 0, prevRevenue),
            expense: calcChange(periodData?.totalExpense || 0, prevExpense),
        };
    }, [stats, selectedPeriod, periodOptions, periodData]);

    // Format currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('th-TH', {
            style: 'decimal',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    // Render change indicator
    const renderChange = (change: number | undefined) => {
        if (change === undefined) return null;
        
        const isPositive = change > 0;
        const isNegative = change < 0;
        const color = isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-gray-500';
        const Icon = isPositive ? ArrowUpRight : isNegative ? ArrowDownRight : Minus;

        return (
            <span className={`flex items-center gap-1 text-sm ${color}`}>
                <Icon className="w-4 h-4" />
                {Math.abs(change).toFixed(1)}%
            </span>
        );
    };

    // Export to CSV
    const exportToCSV = () => {
        if (!periodData || !stats) return;

        const rows = [
            ['รายงานสรุป', selectedPeriod],
            [''],
            ['สรุปภาพรวม'],
            ['จำนวนเอกสารทั้งหมด', periodData.totalDocuments.toString()],
            ['รายรับรวม', periodData.totalRevenue.toString()],
            ['รายจ่ายรวม', periodData.totalExpense.toString()],
            ['กำไร/ขาดทุน', periodData.profit.toString()],
            [''],
            ['จำนวนเอกสารตามประเภท'],
            ...Object.entries(periodData.byDocType).map(([type, count]) => [
                DOC_TYPE_NAMES[type as DocType] || type,
                count.toString()
            ]),
        ];

        const csvContent = rows.map(row => row.join(',')).join('\n');
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `report_${selectedPeriod}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    // Loading state
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                <p className="text-gray-500">กำลังโหลดข้อมูลรายงาน...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">รายงานสรุป</h2>
                    <p className="text-sm text-gray-500 mt-1">รายงานสรุปรายเดือน/ไตรมาส/ปี</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={loadData}
                        className="flex items-center gap-2 px-3 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" />
                        รีเฟรช
                    </button>
                    <button
                        onClick={exportToCSV}
                        disabled={!periodData}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        Export CSV
                    </button>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                    <AlertCircle className="w-5 h-5" />
                    {error}
                </div>
            )}

            {/* Period Selector */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Filter className="w-5 h-5 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700">ช่วงเวลา:</span>
                    </div>
                    
                    {/* Period Type Tabs */}
                    <div className="flex bg-gray-100 rounded-lg p-1">
                        {(['month', 'quarter', 'year'] as PeriodType[]).map((type) => (
                            <button
                                key={type}
                                onClick={() => { setPeriodType(type); setSelectedPeriod(''); }}
                                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                                    periodType === type
                                        ? 'bg-white text-indigo-600 shadow-sm'
                                        : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                {type === 'month' ? 'รายเดือน' : type === 'quarter' ? 'รายไตรมาส' : 'รายปี'}
                            </button>
                        ))}
                    </div>

                    {/* Period Select */}
                    <select
                        value={selectedPeriod}
                        onChange={(e) => setSelectedPeriod(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                        {periodOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {periodData && (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Documents */}
                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-gray-500">เอกสารทั้งหมด</span>
                                <FileText className="w-5 h-5 text-indigo-500" />
                            </div>
                            <p className="text-2xl font-bold text-gray-900">{periodData.totalDocuments}</p>
                            <div className="flex items-center justify-between mt-2">
                                <span className="text-xs text-gray-400">เทียบกับช่วงก่อน</span>
                                {renderChange(comparison?.documents)}
                            </div>
                        </div>

                        {/* Revenue */}
                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-gray-500">รายรับ</span>
                                <DollarSign className="w-5 h-5 text-green-500" />
                            </div>
                            <p className="text-2xl font-bold text-gray-900">฿{formatCurrency(periodData.totalRevenue)}</p>
                            <div className="flex items-center justify-between mt-2">
                                <span className="text-xs text-gray-400">เทียบกับช่วงก่อน</span>
                                {renderChange(comparison?.revenue)}
                            </div>
                        </div>

                        {/* Expense */}
                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-gray-500">รายจ่าย</span>
                                <ShoppingCart className="w-5 h-5 text-red-500" />
                            </div>
                            <p className="text-2xl font-bold text-gray-900">฿{formatCurrency(periodData.totalExpense)}</p>
                            <div className="flex items-center justify-between mt-2">
                                <span className="text-xs text-gray-400">เทียบกับช่วงก่อน</span>
                                {renderChange(comparison?.expense)}
                            </div>
                        </div>

                        {/* Profit */}
                        <div className={`border rounded-lg p-4 ${
                            periodData.profit >= 0 
                                ? 'bg-green-50 border-green-200' 
                                : 'bg-red-50 border-red-200'
                        }`}>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-gray-500">กำไร/ขาดทุน</span>
                                {periodData.profit >= 0 ? (
                                    <TrendingUp className="w-5 h-5 text-green-500" />
                                ) : (
                                    <TrendingDown className="w-5 h-5 text-red-500" />
                                )}
                            </div>
                            <p className={`text-2xl font-bold ${
                                periodData.profit >= 0 ? 'text-green-700' : 'text-red-700'
                            }`}>
                                ฿{formatCurrency(Math.abs(periodData.profit))}
                            </p>
                            <p className="text-xs text-gray-500 mt-2">
                                {periodData.profit >= 0 ? 'กำไร' : 'ขาดทุน'}
                            </p>
                        </div>
                    </div>

                    {/* Document Types Breakdown */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">จำนวนเอกสารตามประเภท</h3>
                        <div className="space-y-3">
                            {Object.entries(periodData.byDocType)
                                .filter(([_, count]) => count > 0)
                                .sort((a, b) => b[1] - a[1])
                                .map(([docType, count]) => {
                                    const maxCount = Math.max(...Object.values(periodData.byDocType));
                                    const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
                                    
                                    return (
                                        <div key={docType}>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-sm text-gray-700">
                                                    {DOC_TYPE_NAMES[docType as DocType] || docType}
                                                </span>
                                                <span className="text-sm font-medium text-gray-900">{count}</span>
                                            </div>
                                            <div className="w-full bg-gray-100 rounded-full h-2">
                                                <div
                                                    className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
                                                    style={{ width: `${percentage}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                        
                        {Object.values(periodData.byDocType).every(count => count === 0) && (
                            <p className="text-center text-gray-500 py-8">ไม่มีข้อมูลในช่วงเวลานี้</p>
                        )}
                    </div>

                    {/* Monthly Trend Chart (Simple CSS) */}
                    {periodData.trends.length > 0 && (
                        <div className="bg-white border border-gray-200 rounded-lg p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">แนวโน้มรายเดือน</h3>
                            <div className="h-64 flex items-end gap-2">
                                {periodData.trends.map((trend, index) => {
                                    const maxDocs = Math.max(...periodData.trends.map(t => t.totalDocuments));
                                    const height = maxDocs > 0 ? (trend.totalDocuments / maxDocs) * 100 : 0;
                                    
                                    return (
                                        <div key={index} className="flex-1 flex flex-col items-center">
                                            <div className="relative w-full flex justify-center">
                                                <div
                                                    className="w-full max-w-[40px] bg-indigo-500 rounded-t-lg transition-all duration-300 hover:bg-indigo-600"
                                                    style={{ height: `${Math.max(height, 5)}%`, minHeight: '8px' }}
                                                    title={`${trend.totalDocuments} เอกสาร`}
                                                />
                                            </div>
                                            <span className="text-xs text-gray-500 mt-2 transform -rotate-45 origin-top-left whitespace-nowrap">
                                                {new Intl.DateTimeFormat('th-TH', { month: 'short' }).format(new Date(trend.year, trend.month - 1))}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </>
            )}

            {!periodData && !loading && (
                <div className="text-center py-12 text-gray-500">
                    <BarChart2 className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p>ไม่มีข้อมูลในช่วงเวลาที่เลือก</p>
                </div>
            )}
        </div>
    );
};

export default ReportsPage;

