/**
 * ActivityLogPage Component
 * หน้าแสดง Activity Log ของบริษัท
 * 
 * ฟีเจอร์:
 * - แสดง log การดำเนินการทั้งหมด (สร้าง, แก้ไข, ลบ, อัปเดต ฯลฯ)
 * - กรองตาม: ประเภทกิจกรรม, ประเภท resource, ผู้ใช้, วัน/เดือน/ปี
 * - แยกกลุ่มตามวันที่ (วันนี้, เมื่อวาน, วันที่เต็ม)
 * - Pagination (โหลดเพิ่ม)
 * - รองรับ Dark Mode
 * - Responsive (Mobile/Desktop)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ClipboardList,
    Filter,
    ChevronDown,
    ChevronUp,
    Search,
    RefreshCw,
    Calendar as CalendarIcon,
    User,
    FileText,
    Users,
    HardHat,
    Building2,
    UserPlus,
    Settings,
    Link2,
    CreditCard,
    X,
    Loader2,
    ChevronLeft,
    ChevronRight,
    Clock,
    Activity,
} from 'lucide-react';
import { useCompany } from '../contexts/CompanyContext';
import { useAuth } from '../contexts/AuthContext';
import {
    getActivityLogs,
    groupActivitiesByDate,
    formatDateLabel,
    formatTime,
    ACTIVITY_ACTION_LABELS,
    ACTIVITY_ACTION_ICONS,
    ACTIVITY_ACTION_COLORS,
    ACTIVITY_RESOURCE_LABELS,
    type ActivityLogEntry,
    type ActivityAction,
    type ActivityResourceType,
    type ActivityLogQueryOptions,
} from '../services/activityLog';
import type { DocumentSnapshot } from 'firebase/firestore';

// ============================================================
// Sub-Components - คอมโพเนนต์ย่อย
// ============================================================

/** ปุ่ม Filter Chip สำหรับกรองข้อมูล */
const FilterChip: React.FC<{
    label: string;
    icon?: string;
    active: boolean;
    onClick: () => void;
}> = ({ label, icon, active, onClick }) => (
    <button
        onClick={onClick}
        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all
            ${active
                ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-300 dark:ring-indigo-600'
                : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
            }`}
    >
        {icon && <span className="text-xs">{icon}</span>}
        {label}
    </button>
);

/** แสดงรายการ Activity Log แต่ละรายการ */
const ActivityLogItem: React.FC<{
    entry: ActivityLogEntry;
}> = ({ entry }) => {
    const colors = ACTIVITY_ACTION_COLORS[entry.action];
    const icon = ACTIVITY_ACTION_ICONS[entry.action];

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-start gap-3 p-3 sm:p-4 rounded-lg bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 hover:shadow-sm transition-shadow"
        >
            {/* ไอคอน Action */}
            <div className={`flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-base sm:text-lg ${colors.bg} ${colors.darkBg}`}>
                {icon}
            </div>

            {/* ข้อมูลหลัก */}
            <div className="flex-1 min-w-0">
                {/* คำอธิบายกิจกรรม */}
                <p className="text-sm sm:text-base text-gray-800 dark:text-gray-100 leading-relaxed">
                    {entry.description}
                </p>

                {/* ข้อมูลผู้ดำเนินการ + เวลา */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                    {/* ผู้ดำเนินการ */}
                    <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                        {entry.userPhotoURL ? (
                            <img
                                src={entry.userPhotoURL}
                                alt=""
                                className="w-4 h-4 rounded-full"
                            />
                        ) : (
                            <User className="w-3.5 h-3.5" />
                        )}
                        {entry.userName || entry.userEmail || 'ไม่ระบุ'}
                    </span>

                    {/* เวลา */}
                    <span className="inline-flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                        <Clock className="w-3 h-3" />
                        {formatTime(entry.timestamp)}
                    </span>

                    {/* Badge ประเภท Action */}
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text} ${colors.darkBg} ${colors.darkText}`}>
                        {ACTIVITY_ACTION_LABELS[entry.action]}
                    </span>

                    {/* Badge ประเภท Resource */}
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300">
                        {ACTIVITY_RESOURCE_LABELS[entry.resourceType]}
                    </span>
                </div>
            </div>
        </motion.div>
    );
};

/** แสดงกลุ่ม Activity Log ตามวันที่ */
const DateGroup: React.FC<{
    dateKey: string;
    entries: ActivityLogEntry[];
    count: number;
}> = ({ dateKey, entries, count }) => (
    <div className="mb-6">
        {/* หัวข้อวันที่ */}
        <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-900/20">
                <CalendarIcon className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                    {formatDateLabel(dateKey)}
                </span>
                <span className="text-xs text-indigo-500 dark:text-indigo-400">
                    ({count} กิจกรรม)
                </span>
            </div>
            <div className="flex-1 h-px bg-gray-200 dark:bg-slate-700" />
        </div>

        {/* รายการกิจกรรม */}
        <div className="space-y-2">
            {entries.map((entry) => (
                <ActivityLogItem key={entry.id} entry={entry} />
            ))}
        </div>
    </div>
);

// ============================================================
// ข้อมูล Filter สำหรับ UI
// ============================================================

/** ตัวเลือก Action Filter */
const ACTION_FILTER_OPTIONS: { value: ActivityAction; label: string; icon: string }[] = [
    { value: 'create', label: 'สร้าง', icon: '➕' },
    { value: 'update', label: 'แก้ไข', icon: '✏️' },
    { value: 'delete', label: 'ลบ', icon: '🗑️' },
    { value: 'export', label: 'ส่งออก', icon: '📄' },
    { value: 'copy', label: 'คัดลอก', icon: '📋' },
    { value: 'share', label: 'แชร์', icon: '🔗' },
    { value: 'lock', label: 'ล็อก', icon: '🔒' },
    { value: 'archive', label: 'จัดเก็บ', icon: '📦' },
    { value: 'cancel', label: 'ยกเลิก', icon: '❌' },
    { value: 'sign', label: 'เซ็นชื่อ', icon: '✍️' },
];

/** ตัวเลือก Resource Type Filter */
const RESOURCE_FILTER_OPTIONS: { value: ActivityResourceType; label: string; icon: React.ReactNode }[] = [
    { value: 'document', label: 'เอกสาร', icon: <FileText className="w-3.5 h-3.5" /> },
    { value: 'customer', label: 'ลูกค้า', icon: <Users className="w-3.5 h-3.5" /> },
    { value: 'contractor', label: 'ผู้รับเหมา', icon: <HardHat className="w-3.5 h-3.5" /> },
    { value: 'company', label: 'บริษัท', icon: <Building2 className="w-3.5 h-3.5" /> },
    { value: 'member', label: 'สมาชิก', icon: <UserPlus className="w-3.5 h-3.5" /> },
    { value: 'settings', label: 'การตั้งค่า', icon: <Settings className="w-3.5 h-3.5" /> },
    { value: 'shareLink', label: 'ลิงก์แชร์', icon: <Link2 className="w-3.5 h-3.5" /> },
    { value: 'subscription', label: 'แพ็กเกจ', icon: <CreditCard className="w-3.5 h-3.5" /> },
];

/** รายชื่อเดือนภาษาไทย */
const THAI_MONTHS = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

// ============================================================
// Main Component - ActivityLogPage
// ============================================================

const ActivityLogPage: React.FC = () => {
    const { currentCompany } = useCompany();
    const { user } = useAuth();

    // ============================================================
    // State - สถานะของหน้า
    // ============================================================

    // ข้อมูล Activity Log
    const [entries, setEntries] = useState<ActivityLogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [lastDoc, setLastDoc] = useState<DocumentSnapshot | undefined>();
    const [hasMore, setHasMore] = useState(false);

    // ตัวกรอง (Filters)
    const [showFilters, setShowFilters] = useState(false);
    const [selectedActions, setSelectedActions] = useState<ActivityAction[]>([]);
    const [selectedResourceTypes, setSelectedResourceTypes] = useState<ActivityResourceType[]>([]);
    const [filterMyOnly, setFilterMyOnly] = useState(false);

    // ตัวกรองวัน/เดือน/ปี
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
    const [selectedDay, setSelectedDay] = useState<number | null>(null);
    const [filterMode, setFilterMode] = useState<'all' | 'year' | 'month' | 'day'>('all');

    // ============================================================
    // Functions - ฟังก์ชันหลัก
    // ============================================================

    /** ดึงข้อมูล Activity Log จาก Firestore */
    const fetchActivityLogs = useCallback(async (isLoadMore = false) => {
        if (!currentCompany?.id) return;

        if (isLoadMore) {
            setLoadingMore(true);
        } else {
            setLoading(true);
            setEntries([]);
            setLastDoc(undefined);
        }

        try {
            const queryOptions: ActivityLogQueryOptions = {
                companyId: currentCompany.id,
                pageSize: 50,
            };

            // เพิ่ม filter ตาม action
            if (selectedActions.length > 0) {
                queryOptions.actions = selectedActions;
            }

            // เพิ่ม filter ตาม resource type (เลือกได้แค่ 1 ตัว สำหรับ Firestore query)
            if (selectedResourceTypes.length === 1) {
                queryOptions.resourceTypes = selectedResourceTypes;
            }

            // เพิ่ม filter เฉพาะของฉัน
            if (filterMyOnly && user?.uid) {
                queryOptions.userId = user.uid;
            }

            // เพิ่ม filter วัน/เดือน/ปี ตาม mode
            if (filterMode === 'year' || filterMode === 'month' || filterMode === 'day') {
                queryOptions.year = selectedYear;
            }
            if (filterMode === 'month' || filterMode === 'day') {
                queryOptions.month = selectedMonth;
            }
            if (filterMode === 'day' && selectedDay) {
                queryOptions.day = selectedDay;
            }

            // Pagination
            if (isLoadMore && lastDoc) {
                queryOptions.lastDoc = lastDoc;
            }

            const result = await getActivityLogs(queryOptions);

            if (result.success && result.data) {
                if (isLoadMore) {
                    setEntries(prev => [...prev, ...result.data!]);
                } else {
                    setEntries(result.data);
                }
                setLastDoc(result.lastDoc);
                setHasMore(result.hasMore || false);
            }
        } catch (error) {
            console.error('❌ [ActivityLogPage] เกิดข้อผิดพลาด:', error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [currentCompany?.id, selectedActions, selectedResourceTypes, filterMyOnly, filterMode, selectedYear, selectedMonth, selectedDay, lastDoc, user?.uid]);

    // โหลดข้อมูลเมื่อ component mount หรือ filter เปลี่ยน
    useEffect(() => {
        fetchActivityLogs(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentCompany?.id, selectedActions, selectedResourceTypes, filterMyOnly, filterMode, selectedYear, selectedMonth, selectedDay]);

    /** สลับการเลือก action filter */
    const toggleAction = (action: ActivityAction) => {
        setSelectedActions(prev =>
            prev.includes(action)
                ? prev.filter(a => a !== action)
                : [...prev, action]
        );
    };

    /** สลับการเลือก resource type filter */
    const toggleResourceType = (type: ActivityResourceType) => {
        setSelectedResourceTypes(prev =>
            prev.includes(type)
                ? prev.filter(t => t !== type)
                : prev.length === 0 ? [type] : [type] // เลือกได้แค่ 1 ตัวสำหรับ Firestore
        );
    };

    /** ล้าง filter ทั้งหมด */
    const clearAllFilters = () => {
        setSelectedActions([]);
        setSelectedResourceTypes([]);
        setFilterMyOnly(false);
        setFilterMode('all');
        setSelectedDay(null);
    };

    /** สลับเดือน (ก่อนหน้า/ถัดไป) */
    const navigateMonth = (direction: 'prev' | 'next') => {
        if (direction === 'prev') {
            if (selectedMonth === 1) {
                setSelectedMonth(12);
                setSelectedYear(prev => prev - 1);
            } else {
                setSelectedMonth(prev => prev - 1);
            }
        } else {
            if (selectedMonth === 12) {
                setSelectedMonth(1);
                setSelectedYear(prev => prev + 1);
            } else {
                setSelectedMonth(prev => prev + 1);
            }
        }
        setSelectedDay(null);
    };

    // จัดกลุ่มตามวันที่
    const groupedEntries = groupActivitiesByDate(entries);
    const sortedDateKeys = Object.keys(groupedEntries).sort((a, b) => b.localeCompare(a));

    // นับจำนวน filter ที่ใช้อยู่
    const activeFilterCount = selectedActions.length + selectedResourceTypes.length + (filterMyOnly ? 1 : 0) + (filterMode !== 'all' ? 1 : 0);

    // ============================================================
    // Render
    // ============================================================

    return (
        <div className="max-w-4xl mx-auto">
            {/* Header - หัวข้อหลัก */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
                <div className="flex items-center gap-2">
                    <Activity className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100">
                        Activity Log
                    </h2>
                    {entries.length > 0 && (
                        <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">
                            ({entries.length} รายการ)
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {/* ปุ่ม Refresh */}
                    <button
                        onClick={() => fetchActivityLogs(false)}
                        disabled={loading}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline">รีเฟรช</span>
                    </button>

                    {/* ปุ่ม Filter */}
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                            ${showFilters || activeFilterCount > 0
                                ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
                                : 'text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600'
                            }`}
                    >
                        <Filter className="w-4 h-4" />
                        <span className="hidden sm:inline">ตัวกรอง</span>
                        {activeFilterCount > 0 && (
                            <span className="ml-1 w-5 h-5 rounded-full bg-indigo-600 dark:bg-indigo-500 text-white text-xs flex items-center justify-center">
                                {activeFilterCount}
                            </span>
                        )}
                        {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {/* Filter Panel - แผงตัวกรอง */}
            <AnimatePresence>
                {showFilters && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden mb-4"
                    >
                        <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 space-y-4">
                            {/* กรองตาม วัน/เดือน/ปี */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                                    ช่วงเวลา
                                </label>
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {(['all', 'month', 'day'] as const).map(mode => (
                                        <FilterChip
                                            key={mode}
                                            label={mode === 'all' ? 'ทั้งหมด' : mode === 'month' ? 'เลือกเดือน' : 'เลือกวัน'}
                                            active={filterMode === mode}
                                            onClick={() => {
                                                setFilterMode(mode);
                                                if (mode === 'all') setSelectedDay(null);
                                            }}
                                        />
                                    ))}
                                </div>

                                {/* ตัวเลือกเดือน */}
                                {(filterMode === 'month' || filterMode === 'day') && (
                                    <div className="flex items-center gap-2 mb-2">
                                        <button onClick={() => navigateMonth('prev')} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">
                                            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                                        </button>
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200 min-w-[140px] text-center">
                                            {THAI_MONTHS[selectedMonth - 1]} {selectedYear + 543}
                                        </span>
                                        <button onClick={() => navigateMonth('next')} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">
                                            <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                                        </button>
                                    </div>
                                )}

                                {/* ตัวเลือกวัน */}
                                {filterMode === 'day' && (
                                    <div className="flex flex-wrap gap-1">
                                        {Array.from({ length: new Date(selectedYear, selectedMonth, 0).getDate() }, (_, i) => i + 1).map(day => (
                                            <button
                                                key={day}
                                                onClick={() => setSelectedDay(day === selectedDay ? null : day)}
                                                className={`w-8 h-8 rounded-md text-xs font-medium transition-colors
                                                    ${selectedDay === day
                                                        ? 'bg-indigo-600 text-white'
                                                        : 'bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-slate-600 border border-gray-200 dark:border-slate-600'
                                                    }`}
                                            >
                                                {day}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* กรองตามประเภทกิจกรรม */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                                    ประเภทกิจกรรม
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {ACTION_FILTER_OPTIONS.map(opt => (
                                        <FilterChip
                                            key={opt.value}
                                            label={opt.label}
                                            icon={opt.icon}
                                            active={selectedActions.includes(opt.value)}
                                            onClick={() => toggleAction(opt.value)}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* กรองตามประเภท Resource */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                                    ประเภทข้อมูล
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {RESOURCE_FILTER_OPTIONS.map(opt => (
                                        <button
                                            key={opt.value}
                                            onClick={() => toggleResourceType(opt.value)}
                                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all
                                                ${selectedResourceTypes.includes(opt.value)
                                                    ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-300 dark:ring-indigo-600'
                                                    : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                                                }`}
                                        >
                                            {opt.icon}
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* เฉพาะของฉัน + ล้าง filter */}
                            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-200 dark:border-slate-600">
                                <FilterChip
                                    label="เฉพาะของฉัน"
                                    icon="👤"
                                    active={filterMyOnly}
                                    onClick={() => setFilterMyOnly(!filterMyOnly)}
                                />

                                {activeFilterCount > 0 && (
                                    <button
                                        onClick={clearAllFilters}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                        ล้างตัวกรอง
                                    </button>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Content - เนื้อหาหลัก */}
            {loading ? (
                /* Loading State - กำลังโหลด */
                <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
                    <Loader2 className="w-10 h-10 animate-spin mb-3" />
                    <p className="text-sm">กำลังโหลด Activity Log...</p>
                </div>
            ) : entries.length === 0 ? (
                /* Empty State - ไม่มีข้อมูล */
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                        <ClipboardList className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-300 mb-1">
                        ยังไม่มี Activity Log
                    </h3>
                    <p className="text-sm text-gray-400 dark:text-gray-500 max-w-md">
                        {activeFilterCount > 0
                            ? 'ไม่พบกิจกรรมที่ตรงกับตัวกรอง ลองเปลี่ยนตัวกรองดูครับ'
                            : 'เมื่อมีการดำเนินการในระบบ (สร้าง แก้ไข ลบ เอกสาร/ลูกค้า ฯลฯ) ระบบจะบันทึก log ไว้ที่นี่'}
                    </p>
                    {activeFilterCount > 0 && (
                        <button
                            onClick={clearAllFilters}
                            className="mt-4 px-4 py-2 rounded-lg text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors"
                        >
                            ล้างตัวกรองทั้งหมด
                        </button>
                    )}
                </div>
            ) : (
                /* Activity Log List - รายการ Activity Log แยกตามวัน */
                <div>
                    {sortedDateKeys.map(dateKey => (
                        <DateGroup
                            key={dateKey}
                            dateKey={dateKey}
                            entries={groupedEntries[dateKey]}
                            count={groupedEntries[dateKey].length}
                        />
                    ))}

                    {/* ปุ่มโหลดเพิ่ม */}
                    {hasMore && (
                        <div className="flex justify-center mt-6">
                            <button
                                onClick={() => fetchActivityLogs(true)}
                                disabled={loadingMore}
                                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors disabled:opacity-50"
                            >
                                {loadingMore ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        กำลังโหลด...
                                    </>
                                ) : (
                                    <>
                                        <ChevronDown className="w-4 h-4" />
                                        โหลดเพิ่ม
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ActivityLogPage;
