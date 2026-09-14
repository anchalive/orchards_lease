import { useMemo, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X, AlertCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/cn';
import type { Orchard, OrchardAvailabilityResponse } from '@/types';
import { availabilityService } from '@/services/availability.service';

interface BookingModalProps {
  orchard: Orchard;
  onClose: () => void;
  onConfirm: (startISO: string, endISO: string) => void;
  submitting?: boolean;
}

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const fmt = (s: string) => {
  if (!s) return '';
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function monthCells(y: number, m: number) {
  const first = new Date(y, m, 1);
  const dow = first.getDay();
  const n = new Date(y, m + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < dow; i += 1) cells.push(null);
  for (let d = 1; d <= n; d += 1) cells.push(d);
  while (cells.length % 7) cells.push(null);
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return { label: first.toLocaleString('en-US', { month: 'long', year: 'numeric' }), weeks, y, m };
}

export function BookingModal({ orchard, onClose, onConfirm, submitting }: BookingModalProps) {
  const TODAY = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const [offset, setOffset] = useState(0);
  const [start, setStart] = useState<string | null>(null);
  const [end, setEnd] = useState<string | null>(null);
  const [availability, setAvailability] = useState<OrchardAvailabilityResponse | null>(null);
  const [rangeError, setRangeError] = useState('');

  useEffect(() => {
    if (orchard._id) {
      availabilityService
        .getAvailability(orchard._id)
        .then(setAvailability)
        .catch(() => {});
    }
  }, [orchard._id]);

  // Check if a date string is unavailable due to booking or block
  const isUnavailable = (dateObj: Date) => {
    const t = dateObj.getTime();

    if (availability?.bookedDates) {
      for (const b of availability.bookedDates) {
        const s = new Date(b.startDate).setHours(0, 0, 0, 0);
        const e = new Date(b.endDate).setHours(0, 0, 0, 0);
        if (t >= s && t < e) return true;
      }
    }

    if (availability?.blockedDates) {
      for (const b of availability.blockedDates) {
        const s = new Date(b.startDate).setHours(0, 0, 0, 0);
        const e = new Date(b.endDate).setHours(0, 0, 0, 0);
        if (t >= s && t < e) return true;
      }
    }

    return false;
  };

  // Validate selected range does not span unavailable dates
  const validateRange = (startStr: string, endStr: string) => {
    const sDate = new Date(startStr);
    const eDate = new Date(endStr);
    let curr = new Date(sDate);

    while (curr < eDate) {
      if (isUnavailable(curr)) {
        return false;
      }
      curr.setDate(curr.getDate() + 1);
    }
    return true;
  };

  const pick = (d: string) => {
    setRangeError('');
    if (!start || (start && end)) {
      setStart(d);
      setEnd(null);
    } else if (d < start) {
      setStart(d);
    } else if (d === start) {
      setEnd(null);
    } else {
      if (!validateRange(start, d)) {
        setRangeError('Selected range overlaps with unavailable/blocked dates.');
        return;
      }
      setEnd(d);
    }
  };

  const months = useMemo(() => {
    const base = new Date(TODAY.getFullYear(), TODAY.getMonth(), 1);
    return [0, 1].map((k) => {
      const dt = new Date(base.getFullYear(), base.getMonth() + offset + k, 1);
      const md = monthCells(dt.getFullYear(), dt.getMonth());
      return md;
    });
  }, [offset, TODAY]);

  const fee = Math.round(orchard.price * 0.08);
  const dep = Math.round(orchard.price * 0.15);
  const total = orchard.price + fee + dep;
  const hasDates = !!(start && end);
  const datesLabel = hasDates ? `${fmt(start)} → ${fmt(end)}` : start ? `${fmt(start)} → …` : 'Select harvest dates';

  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-[rgba(28,36,22,.5)] p-4 py-8 backdrop-blur-[3px]"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-[620px] animate-fadeup overflow-hidden rounded-3xl bg-cream shadow-pop">
        {/* header */}
        <div className="flex items-center justify-between border-b border-chip px-6 py-5">
          <div>
            <h2 className="font-serif text-xl font-semibold">Select your lease dates</h2>
            <p className="mt-0.5 text-[13px] text-faint">{orchard.gardenName}</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-[34px] w-[34px] items-center justify-center rounded-full border border-sand bg-cream text-sub hover:bg-chip"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* calendar */}
        <div className="px-6 py-5">
          {rangeError && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-800">
              <AlertCircle className="h-4 w-4 text-red-600 flex-none" />
              <span>{rangeError}</span>
            </div>
          )}

          <div className="mb-3.5 flex items-center justify-between">
            <button
              onClick={() => setOffset((o) => Math.max(0, o - 1))}
              className="flex h-8 w-8 items-center justify-center rounded-[9px] border border-sand bg-cream"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-[13px] font-semibold text-faint">Tap a start &amp; end date</span>
            <button
              onClick={() => setOffset((o) => Math.min(6, o + 1))}
              className="flex h-8 w-8 items-center justify-center rounded-[9px] border border-sand bg-cream"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="flex flex-wrap gap-6">
            {months.map((md) => (
              <div key={`${md.y}-${md.m}`} className="min-w-[230px] flex-1 basis-[240px]">
                <div className="mb-2.5 text-center font-serif text-[15px] font-semibold">{md.label}</div>
                <div className="mb-1 grid grid-cols-7">
                  {DOW.map((d, i) => (
                    <span key={i} className="text-center text-[11px] font-bold text-[#b3ac98]">
                      {d}
                    </span>
                  ))}
                </div>
                {md.weeks.map((w, wi) => (
                  <div key={wi} className="grid grid-cols-7">
                    {w.map((day, di) => {
                      if (day == null) return <span key={di} />;
                      const cellISO = iso(md.y, md.m, day);
                      const date = new Date(md.y, md.m, day);
                      const past = date < TODAY;
                      const blocked = isUnavailable(date);
                      const disabled = past || blocked;
                      const isStart = cellISO === start;
                      const isEnd = cellISO === end;
                      const inRange = !!(start && end && cellISO > start && cellISO < end);
                      const sel = isStart || isEnd;
                      return (
                        <div
                          key={di}
                          onClick={disabled ? undefined : () => pick(cellISO)}
                          className={cn(
                            'flex h-[38px] select-none items-center justify-center rounded-[9px] text-[13px] transition-colors',
                            disabled ? 'cursor-not-allowed text-[#c4bda9]' : 'cursor-pointer',
                            sel ? 'bg-forest font-bold text-cream' : inRange ? 'bg-avail text-ink' : 'text-ink',
                            blocked && !past && 'bg-amber-50/60 text-amber-900 line-through font-semibold',
                            past && 'opacity-45'
                          )}
                        >
                          {day}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* footer */}
        <div className="flex flex-wrap items-center justify-between gap-3.5 border-t border-chip bg-[#faf7ee] px-6 py-4">
          <div>
            <div className="text-xs font-semibold text-faint">{datesLabel}</div>
            {hasDates && (
              <div className="mt-0.5 font-serif text-xl font-bold text-ink">
                {formatCurrency(total)} <span className="font-sans text-xs font-medium text-faint">total</span>
              </div>
            )}
          </div>
          {hasDates ? (
            <button
              onClick={() => onConfirm(start!, end!)}
              disabled={submitting}
              className="rounded-xl bg-forest px-[26px] py-3 text-[15px] font-bold text-cream hover:bg-forest-dark disabled:opacity-60"
            >
              {submitting ? 'Sending…' : 'Confirm request'}
            </button>
          ) : (
            <button className="cursor-not-allowed rounded-xl bg-[#bdb6a3] px-[26px] py-3 text-[15px] font-bold text-cream">
              Select dates to continue
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
