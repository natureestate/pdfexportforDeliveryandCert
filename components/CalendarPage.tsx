/**
 * Calendar Page Component
 * หน้าปฏิทินแสดงเอกสารตามวันที่ + กำหนดส่ง/หมดอายุ
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    FileText,
    AlertTriangle,
    Clock,
    Shield,
    DollarSign,
    Package,
    RefreshCw,
    AlertCircle,
    X
} from 'lucide-react';
import { useCompany } from '../contexts/CompanyContext';
import { getDashboardStats, DashboardStats, DOC_TYPE_NAMES, RecentActivity } from '../services/dashboardStats';
import type { DocType } from '../utils/documentRegistry';

interface CalendarEvent {
    id: string;
    date: Date;
    title: string;
    type: 'created' | 'due' | 'expiring' | 'warranty';
    docType: DocType;
    docNumber: string;
    customerName?: string;
    amount?: number;
}

const DOC_TYPE_COLORS: Record<DocType, string> = {
    'delivery': 'bg-blue-100 text-blue-700 border-blue-200',
    'warranty': 'bg-purple-100 text-purple-700 border-purple-200',
    'invoice': 'bg-green-100 text-green-700 border-green-200',
    'receipt': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    'tax-invoice': 'bg-teal-100 text-teal-700 border-teal-200',
    'quotation': 'bg-amber-100 text-amber-700 border-amber-200',
    'purchase-order': 'bg-orange-100 text-orange-700 border-orange-200',
    'memo': 'bg-pink-100 text-pink-700 border-pink-200',
    'variation-order': 'bg-rose-100 text-rose-700 border-rose-200',
    'subcontract': 'bg-indigo-100 text-indigo-700 border-indigo-200',
};

const EVENT_TYPE_COLORS: Record<string, string> = {
    'created': 'bg-blue-500',
    'due': 'bg-red-500',
    'expiring': 'bg-amber-500',
    'warranty': 'bg-purple-500',
};

const CalendarPage: React.FC = () => {
    const { currentCompany } = useCompany();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [showEventModal, setShowEventModal] = useState(false);

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
            console.error('Error loading calendar data:', err);
            setError('ไม่สามารถโหลดข้อมูลปฏิทินได้');
        } finally {
            setLoading(false);
        }
    }, [currentCompany?.id]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Generate calendar events from stats
    const events = useMemo((): CalendarEvent[] => {
        if (!stats) return [];

        const eventList: CalendarEvent[] = [];

        // Recent activities as created events
        stats.recentActivities.forEach(activity => {
            if (activity.createdAt) {
                eventList.push({
                    id: activity.id,
                    date: activity.createdAt,
                    title: `${DOC_TYPE_NAMES[activity.docType]} ${activity.docNumber}`,
                    type: 'created',
                    docType: activity.docType,
                    docNumber: activity.docNumber,
                    customerName: activity.customerName,
                    amount: activity.amount,
                });
            }
        });

        // Expiring documents
        stats.expiringDocuments.forEach(doc => {
            if (doc.expiryDate) {
                eventList.push({
                    id: doc.id,
                    date: doc.expiryDate,
                    title: `หมดอายุ: ${DOC_TYPE_NAMES[doc.docType]} ${doc.docNumber}`,
                    type: doc.docType === 'warranty' ? 'warranty' : 'expiring',
                    docType: doc.docType,
                    docNumber: doc.docNumber,
                    customerName: doc.customerName,
                });
            }
        });

        // Pending payments (due dates)
        stats.pendingPayments.forEach(payment => {
            if (payment.dueDate) {
                eventList.push({
                    id: payment.id,
                    date: payment.dueDate,
                    title: `ครบกำหนด: ${DOC_TYPE_NAMES[payment.docType]} ${payment.docNumber}`,
                    type: 'due',
                    docType: payment.docType,
                    docNumber: payment.docNumber,
                    customerName: payment.customerName,
                    amount: payment.amount,
                });
            }
        });

        return eventList;
    }, [stats]);

    // Get calendar grid data
    const calendarData = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        
        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);
        
        const startDay = firstDayOfMonth.getDay();
        const daysInMonth = lastDayOfMonth.getDate();
        
        const days: (Date | null)[] = [];
        
        // Add empty cells for days before the first day of month
        for (let i = 0; i < startDay; i++) {
            days.push(null);
        }
        
        // Add days of month
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(new Date(year, month, i));
        }
        
        return days;
    }, [currentDate]);

    // Get events for a specific date
    const getEventsForDate = (date: Date): CalendarEvent[] => {
        return events.filter(event => {
            const eventDate = new Date(event.date);
            return (
                eventDate.getFullYear() === date.getFullYear() &&
                eventDate.getMonth() === date.getMonth() &&
                eventDate.getDate() === date.getDate()
            );
        });
    };

    // Get events for selected date
    const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];

    // Navigate months
    const goToPreviousMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const goToNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const goToToday = () => {
        setCurrentDate(new Date());
        setSelectedDate(new Date());
    };

    // Format date
    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('th-TH', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        }).format(date);
    };

    // Check if date is today
    const isToday = (date: Date) => {
        const today = new Date();
        return (
            date.getFullYear() === today.getFullYear() &&
            date.getMonth() === today.getMonth() &&
            date.getDate() === today.getDate()
        );
    };

    // Check if date is selected
    const isSelected = (date: Date) => {
        if (!selectedDate) return false;
        return (
            date.getFullYear() === selectedDate.getFullYear() &&
            date.getMonth() === selectedDate.getMonth() &&
            date.getDate() === selectedDate.getDate()
        );
    };

    // Loading state
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                <p className="text-gray-500">กำลังโหลดข้อมูลปฏิทิน...</p>
            </div>
        );
    }

    const weekDays = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">ปฏิทินเอกสาร</h2>
                    <p className="text-sm text-gray-500 mt-1">แสดงเอกสารตามวันที่และกำหนดการ</p>
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
                        onClick={goToToday}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                        วันนี้
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

            {/* Legend */}
            <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span className="text-gray-600">สร้างเอกสาร</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span className="text-gray-600">ครบกำหนดชำระ</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                    <span className="text-gray-600">ใกล้หมดอายุ</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                    <span className="text-gray-600">รับประกันหมดอายุ</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Calendar */}
                <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg p-4">
                    {/* Month Navigation */}
                    <div className="flex items-center justify-between mb-4">
                        <button
                            onClick={goToPreviousMonth}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <h3 className="text-lg font-semibold text-gray-900">
                            {new Intl.DateTimeFormat('th-TH', { month: 'long', year: 'numeric' }).format(currentDate)}
                        </h3>
                        <button
                            onClick={goToNextMonth}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Week Days Header */}
                    <div className="grid grid-cols-7 gap-1 mb-2">
                        {weekDays.map((day, index) => (
                            <div
                                key={day}
                                className={`text-center text-sm font-medium py-2 ${
                                    index === 0 ? 'text-red-500' : index === 6 ? 'text-blue-500' : 'text-gray-500'
                                }`}
                            >
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-1">
                        {calendarData.map((date, index) => {
                            if (!date) {
                                return <div key={`empty-${index}`} className="h-24 sm:h-28" />;
                            }

                            const dayEvents = getEventsForDate(date);
                            const hasEvents = dayEvents.length > 0;
                            const dayOfWeek = date.getDay();

                            return (
                                <button
                                    key={date.toISOString()}
                                    onClick={() => setSelectedDate(date)}
                                    className={`h-24 sm:h-28 p-1 sm:p-2 border rounded-lg transition-all text-left ${
                                        isSelected(date)
                                            ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200'
                                            : isToday(date)
                                            ? 'border-indigo-300 bg-indigo-50'
                                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                    }`}
                                >
                                    <div className={`text-sm font-medium mb-1 ${
                                        isToday(date)
                                            ? 'text-indigo-600'
                                            : dayOfWeek === 0
                                            ? 'text-red-500'
                                            : dayOfWeek === 6
                                            ? 'text-blue-500'
                                            : 'text-gray-700'
                                    }`}>
                                        {date.getDate()}
                                    </div>
                                    
                                    {/* Event dots */}
                                    {hasEvents && (
                                        <div className="flex flex-wrap gap-0.5">
                                            {dayEvents.slice(0, 4).map((event, idx) => (
                                                <div
                                                    key={idx}
                                                    className={`w-2 h-2 rounded-full ${EVENT_TYPE_COLORS[event.type]}`}
                                                    title={event.title}
                                                />
                                            ))}
                                            {dayEvents.length > 4 && (
                                                <span className="text-xs text-gray-500">+{dayEvents.length - 4}</span>
                                            )}
                                        </div>
                                    )}

                                    {/* Event preview (desktop) */}
                                    <div className="hidden sm:block mt-1 space-y-0.5">
                                        {dayEvents.slice(0, 2).map((event, idx) => (
                                            <div
                                                key={idx}
                                                className={`text-xs truncate px-1 py-0.5 rounded ${DOC_TYPE_COLORS[event.docType]}`}
                                            >
                                                {event.docNumber}
                                            </div>
                                        ))}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Selected Date Events */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <CalendarIcon className="w-5 h-5 text-indigo-500" />
                        {selectedDate ? formatDate(selectedDate) : 'เลือกวันที่'}
                    </h3>

                    {selectedDate ? (
                        selectedDateEvents.length > 0 ? (
                            <div className="space-y-3">
                                {selectedDateEvents.map((event) => (
                                    <div
                                        key={event.id}
                                        className={`p-3 rounded-lg border ${DOC_TYPE_COLORS[event.docType]}`}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <div className={`w-2 h-2 rounded-full ${EVENT_TYPE_COLORS[event.type]}`} />
                                                    <span className="text-xs font-medium">
                                                        {event.type === 'created' ? 'สร้างเอกสาร' :
                                                         event.type === 'due' ? 'ครบกำหนดชำระ' :
                                                         event.type === 'warranty' ? 'รับประกันหมดอายุ' :
                                                         'ใกล้หมดอายุ'}
                                                    </span>
                                                </div>
                                                <p className="font-medium text-sm truncate">
                                                    {DOC_TYPE_NAMES[event.docType]}
                                                </p>
                                                <p className="text-xs opacity-75">
                                                    เลขที่: {event.docNumber}
                                                </p>
                                                {event.customerName && (
                                                    <p className="text-xs opacity-75 truncate">
                                                        {event.customerName}
                                                    </p>
                                                )}
                                                {event.amount && (
                                                    <p className="text-sm font-medium mt-1">
                                                        ฿{event.amount.toLocaleString('th-TH')}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                <CalendarIcon className="w-12 h-12 mx-auto mb-2 opacity-30" />
                                <p>ไม่มีกิจกรรมในวันนี้</p>
                            </div>
                        )
                    ) : (
                        <div className="text-center py-8 text-gray-500">
                            <CalendarIcon className="w-12 h-12 mx-auto mb-2 opacity-30" />
                            <p>คลิกที่วันที่เพื่อดูรายละเอียด</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Upcoming Events Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Expiring Soon */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="w-5 h-5 text-amber-600" />
                        <h4 className="font-semibold text-amber-800">ใกล้หมดอายุ</h4>
                    </div>
                    <p className="text-2xl font-bold text-amber-900">
                        {stats?.expiringDocuments.filter(d => d.docType !== 'warranty').length || 0}
                    </p>
                    <p className="text-sm text-amber-700">เอกสารใน 30 วัน</p>
                </div>

                {/* Warranty Expiring */}
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Shield className="w-5 h-5 text-purple-600" />
                        <h4 className="font-semibold text-purple-800">รับประกันหมดอายุ</h4>
                    </div>
                    <p className="text-2xl font-bold text-purple-900">
                        {stats?.expiringDocuments.filter(d => d.docType === 'warranty').length || 0}
                    </p>
                    <p className="text-sm text-purple-700">ใบรับประกันใน 30 วัน</p>
                </div>

                {/* Pending Payments */}
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Clock className="w-5 h-5 text-red-600" />
                        <h4 className="font-semibold text-red-800">ค้างชำระ</h4>
                    </div>
                    <p className="text-2xl font-bold text-red-900">
                        {stats?.pendingPayments.length || 0}
                    </p>
                    <p className="text-sm text-red-700">ใบแจ้งหนี้รอชำระ</p>
                </div>
            </div>
        </div>
    );
};

export default CalendarPage;

