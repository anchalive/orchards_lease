import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Wrench, Sprout, Lock, UserCheck, RefreshCw, AlertCircle } from 'lucide-react';
import { availabilityService } from '@/services/availability.service';
import type { OrchardAvailabilityResponse, BlockedDate, BookedDate } from '@/types';
import { cn } from '@/lib/cn';
import { OccupancyBadge } from '@/components/orchard/OccupancyBadge';

interface AvailabilityCalendarProps {
  orchardId: string;
  isOwner?: boolean;
  onManageClick?: () => void;
  className?: string;
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const pad = (n: number) => String(n).padStart(2, '0');
const toISODate = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

const parseLocalDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

export const AvailabilityCalendar: React.FC<AvailabilityCalendarProps> = ({
  orchardId,
  isOwner,
  onManageClick,
  className,
}) => {
  const [data, setData] = useState<OrchardAvailabilityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedDayInfo, setSelectedDayInfo] = useState<{
    dateStr: string;
    status: 'available' | 'booked' | 'maintenance' | 'harvest' | 'personal' | 'system' | 'past';
    note?: string;
  } | null>(null);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await availabilityService.getAvailability(orchardId);
      setData(res);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load availability calendar');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orchardId) loadData();
  }, [orchardId]);

  const currentMonthDate = useMemo(() => {
    const d = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
    return d;
  }, [today, monthOffset]);

  const monthGrid = useMemo(() => {
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: ({ day: number; iso: string; date: Date } | null)[] = [];
    for (let i = 0; i < firstDayIndex; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({
        day: d,
        iso: toISODate(year, month, d),
        date: new Date(year, month, d),
      });
    }
    while (cells.length % 7 !== 0) cells.push(null);

    const weeks: (typeof cells)[] = [];
    for (let i = 0; i < cells.length; i += 7) {
      weeks.push(cells.slice(i, i + 7));
    }
    return {
      year,
      month,
      label: currentMonthDate.toLocaleString('default', { month: 'long', year: 'numeric' }),
      weeks,
    };
  }, [currentMonthDate]);

  // Helper to determine day status
  const getDayStatus = (cellDate: Date) => {
    if (cellDate < today) return { type: 'past' as const };

    const targetTime = cellDate.getTime();

    // Check active bookings
    if (data?.bookedDates) {
      const bookingMatch = data.bookedDates.find((b: BookedDate) => {
        const s = parseLocalDate(b.startDate).getTime();
        const e = parseLocalDate(b.endDate).getTime();
        return targetTime >= s && targetTime < e;
      });
      if (bookingMatch) {
        return {
          type: 'booked' as const,
          note: `Booked (${bookingMatch.status})`,
        };
      }
    }

    // Check blocked dates
    if (data?.blockedDates) {
      const blockMatch = data.blockedDates.find((b: BlockedDate) => {
        const s = parseLocalDate(b.startDate).getTime();
        const e = parseLocalDate(b.endDate).getTime();
        return targetTime >= s && targetTime < e;
      });
      if (blockMatch) {
        const r = blockMatch.reason?.toLowerCase();
        if (r === 'maintenance') return { type: 'maintenance' as const, note: blockMatch.note || 'Maintenance Period' };
        if (r === 'harvest') return { type: 'harvest' as const, note: blockMatch.note || 'Harvest Block Period' };
        if (r === 'system') return { type: 'system' as const, note: blockMatch.note || 'Reserved by System' };
        return { type: 'personal' as const, note: blockMatch.note || 'Blocked by Owner' };
      }
    }

    return { type: 'available' as const };
  };

  if (loading) {
    return (
      <div className={cn('rounded-2xl border border-sand bg-cream p-6 shadow-sm', className)}>
        <div className="flex items-center justify-between pb-4 border-b border-chip">
          <div className="h-6 w-48 bg-chip animate-pulse rounded-lg" />
          <div className="h-8 w-24 bg-chip animate-pulse rounded-xl" />
        </div>
        <div className="py-8 text-center text-sm text-faint flex items-center justify-center gap-2">
          <RefreshCw className="h-4 w-4 animate-spin text-forest" /> Loading availability calendar...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('rounded-2xl border border-red-200 bg-red-50/70 p-6 shadow-sm', className)}>
        <div className="flex items-center gap-3 text-red-800 font-semibold mb-2">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <span>Calendar Error</span>
        </div>
        <p className="text-xs text-red-700 mb-4">{error}</p>
        <button
          onClick={loadData}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Try Again
        </button>
      </div>
    );
  }

  return (
    <div className={cn('rounded-2xl border border-sand bg-cream p-6 shadow-sm space-y-5', className)}>
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-chip pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-forest-light/20 text-forest">
            <CalendarIcon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-serif text-lg font-bold text-ink">Orchard Availability Calendar</h3>
            {data && <OccupancyBadge status={data.occupancyStatus} />}
            <p className="text-xs text-faint">Real-time lease availability and scheduled maintenance</p>
          </div>
        </div>

        {isOwner && onManageClick && (
          <button
            onClick={onManageClick}
            className="flex items-center gap-1.5 rounded-xl bg-forest px-3.5 py-2 text-xs font-bold text-cream transition-colors hover:bg-forest-dark shadow-sm"
          >
            <Wrench className="h-3.5 w-3.5" /> Manage Blocked Dates
          </button>
        )}
      </div>

      {/* Calendar Legend Bar */}
      <div className="flex flex-wrap items-center gap-3 text-xs font-medium bg-[#faf7ee] p-3 rounded-xl border border-chip">
        <span className="text-[11px] font-bold uppercase tracking-wider text-faint mr-1">Legend:</span>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-emerald-500 border border-emerald-600" />
          <span className="text-ink font-semibold">Available</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-terra border border-terra/80" />
          <span className="text-ink font-semibold">Booked</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-amber-500 border border-amber-600" />
          <span className="text-ink font-semibold">Maintenance</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-purple-500 border border-purple-600" />
          <span className="text-ink font-semibold">Harvest Block</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-slate-500 border border-slate-600" />
          <span className="text-ink font-semibold">Blocked / Personal</span>
        </div>
      </div>

      {/* Month Header & Controls */}
      <div className="flex items-center justify-between px-1">
        <button
          onClick={() => setMonthOffset((m) => Math.max(0, m - 1))}
          disabled={monthOffset <= 0}
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-sand bg-white text-ink disabled:opacity-30 disabled:cursor-not-allowed hover:bg-chip transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="font-serif text-base font-bold text-ink">{monthGrid.label}</span>
        <button
          onClick={() => setMonthOffset((m) => Math.min(11, m + 1))}
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-sand bg-white text-ink hover:bg-chip transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Days Grid */}
      <div className="overflow-hidden rounded-xl border border-sand bg-white p-2 shadow-inner">
        <div className="grid grid-cols-7 mb-2 text-center text-[11px] font-bold text-faint uppercase tracking-wider">
          {DAYS_OF_WEEK.map((day, idx) => (
            <div key={idx} className="py-1">
              {day}
            </div>
          ))}
        </div>

        <div className="space-y-1">
          {monthGrid.weeks.map((week, wIdx) => (
            <div key={wIdx} className="grid grid-cols-7 gap-1">
              {week.map((cell, cIdx) => {
                if (!cell) {
                  return <div key={cIdx} className="h-10 rounded-lg bg-transparent" />;
                }

                const statusObj = getDayStatus(cell.date);
                const isPast = statusObj.type === 'past';
                const isBooked = statusObj.type === 'booked';
                const isMaint = statusObj.type === 'maintenance';
                const isHarvest = statusObj.type === 'harvest';
                const isPersonal = statusObj.type === 'personal' || statusObj.type === 'system';
                const isAvail = statusObj.type === 'available';

                return (
                  <button
                    key={cIdx}
                    onClick={() =>
                      setSelectedDayInfo({
                        dateStr: cell.date.toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        }),
                        status: statusObj.type,
                        note: statusObj.note,
                      })
                    }
                    className={cn(
                      'relative flex h-10 select-none flex-col items-center justify-center rounded-lg text-xs font-semibold transition-all duration-150',
                      isPast && 'bg-chip/40 text-faint opacity-50 cursor-default',
                      isAvail && !isPast && 'bg-emerald-50 text-emerald-900 border border-emerald-200/60 hover:bg-emerald-100 hover:border-emerald-400',
                      isBooked && !isPast && 'bg-terra/15 text-terra border border-terra/30 font-bold hover:bg-terra/25',
                      isMaint && !isPast && 'bg-amber-50 text-amber-900 border border-amber-300 font-bold hover:bg-amber-100',
                      isHarvest && !isPast && 'bg-purple-50 text-purple-900 border border-purple-300 font-bold hover:bg-purple-100',
                      isPersonal && !isPast && 'bg-slate-100 text-slate-800 border border-slate-300 font-bold hover:bg-slate-200'
                    )}
                  >
                    <span>{cell.day}</span>
                    {/* Status Badge Icon */}
                    {!isPast && (
                      <span className="absolute bottom-0.5 right-0.5">
                        {isBooked && <UserCheck className="h-2.5 w-2.5 text-terra" />}
                        {isMaint && <Wrench className="h-2.5 w-2.5 text-amber-700" />}
                        {isHarvest && <Sprout className="h-2.5 w-2.5 text-purple-700" />}
                        {isPersonal && <Lock className="h-2.5 w-2.5 text-slate-600" />}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Clicked Day Detail Banner */}
      {selectedDayInfo && (
        <div className="rounded-xl border border-chip bg-[#faf7ee] p-3.5 text-xs flex items-center justify-between animate-fadeup">
          <div>
            <div className="font-bold text-ink flex items-center gap-1.5">
              <span>{selectedDayInfo.dateStr}</span>
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide',
                  selectedDayInfo.status === 'available' && 'bg-emerald-100 text-emerald-800',
                  selectedDayInfo.status === 'booked' && 'bg-terra/20 text-terra',
                  selectedDayInfo.status === 'maintenance' && 'bg-amber-100 text-amber-900',
                  selectedDayInfo.status === 'harvest' && 'bg-purple-100 text-purple-900',
                  (selectedDayInfo.status === 'personal' || selectedDayInfo.status === 'system') && 'bg-slate-200 text-slate-800',
                  selectedDayInfo.status === 'past' && 'bg-chip text-faint'
                )}
              >
                {selectedDayInfo.status}
              </span>
            </div>
            {selectedDayInfo.note && (
              <p className="text-sub mt-1 font-medium">{selectedDayInfo.note}</p>
            )}
          </div>
          <button
            onClick={() => setSelectedDayInfo(null)}
            className="text-faint hover:text-ink text-xs font-semibold px-2 py-1"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
};

export default AvailabilityCalendar;
