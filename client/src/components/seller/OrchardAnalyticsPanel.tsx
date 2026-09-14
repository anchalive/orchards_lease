import { useEffect, useState } from 'react';
import {
  TrendingUp, Eye, Heart, Star, CalendarDays, IndianRupee,
  CheckCircle2, Clock, XCircle, BarChart3, Users, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { sellerService, type OrchardAnalytics } from '@/services/seller.service';
import { bookingService } from '@/services/booking.service';
import { Spinner } from '@/components/ui';
import { formatCurrency, formatDate, formatNumber } from '@/lib/format';
import { getErrorMessage } from '@/lib/apiClient';
import { useToast } from '@/context/ToastContext';
import type { Booking } from '@/types';

interface Props {
  orchardId: string;
  gardenName: string;
}

/* ------------------------------------------------------------------ */
/*  Mini bar chart                                                       */
/* ------------------------------------------------------------------ */
function RevenueChart({ series }: { series: OrchardAnalytics['revenueSeries'] }) {
  const max = Math.max(1, ...series.map((s) => s.revenue));
  return (
    <div className="mt-2">
      <div className="flex items-end gap-1.5 h-[80px]">
        {series.map((pt) => {
          const pct = (pt.revenue / max) * 100;
          const hasRevenue = pt.revenue > 0;
          return (
            <div key={pt.label} className="group relative flex flex-1 flex-col items-center gap-0.5">
              <div
                className="w-full rounded-t-md transition-all duration-300"
                style={{
                  height: `${Math.max(pct, hasRevenue ? 8 : 3)}%`,
                  background: hasRevenue
                    ? 'linear-gradient(180deg, #2d6a4f 0%, #52b788 100%)'
                    : '#e8e0d8',
                }}
              />
              {/* Tooltip */}
              <div className="absolute -top-9 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-10">
                <div className="rounded-lg bg-ink px-2.5 py-1.5 text-[10px] text-white whitespace-nowrap shadow-lg">
                  <div className="font-semibold">{formatCurrency(pt.revenue)}</div>
                  <div className="text-white/70">{pt.bookings} booking{pt.bookings !== 1 ? 's' : ''}</div>
                </div>
                <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-ink" />
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-1.5 mt-1">
        {series.map((pt) => (
          <div key={pt.label} className="flex-1 text-center text-[9px] text-faint truncate">
            {pt.label.split(' ')[0]}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Booking status badge                                                 */
/* ------------------------------------------------------------------ */
function BookingBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    requested:  'bg-amber-50 text-amber-700 border-amber-200',
    approved:   'bg-emerald-50 text-emerald-700 border-emerald-200',
    completed:  'bg-blue-50 text-blue-700 border-blue-200',
    rejected:   'bg-red-50 text-red-700 border-red-200',
    cancelled:  'bg-gray-100 text-gray-600 border-gray-200',
  };
  const icons: Record<string, typeof Clock> = {
    requested:  Clock,
    approved:   CheckCircle2,
    completed:  CheckCircle2,
    rejected:   XCircle,
    cancelled:  XCircle,
  };
  const Icon = icons[status] || Clock;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-semibold ${styles[status] || 'bg-chip text-sub border-sand'}`}>
      <Icon className="h-3 w-3" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Approve / reject quick actions                                       */
/* ------------------------------------------------------------------ */
function BookingRow({ booking, onRefresh }: { booking: Booking; onRefresh: () => void }) {
  const toast = useToast();
  const renter = typeof booking.renterId === 'object' ? booking.renterId : null;
  const [acting, setActing] = useState(false);

  const act = async (fn: () => Promise<unknown>, msg: string) => {
    setActing(true);
    try {
      await fn();
      toast.success(msg);
      onRefresh();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-sand bg-white px-4 py-3">
      {/* Avatar */}
      <div className="h-9 w-9 flex-none rounded-full bg-forest/10 flex items-center justify-center text-sm font-bold text-forest">
        {renter?.name?.charAt(0)?.toUpperCase() ?? '?'}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-ink truncate">{renter?.name ?? 'Renter'}</span>
          <BookingBadge status={booking.bookingStatus} />
        </div>
        <p className="mt-0.5 text-[11.5px] text-faint">
          {formatDate(booking.startDate)} → {formatDate(booking.endDate)}
          <span className="mx-1.5">·</span>
          <span className="font-semibold text-terra">{formatCurrency(booking.totalAmount)}</span>
        </p>
      </div>

      {/* Quick actions for pending */}
      {booking.bookingStatus === 'requested' && (
        <div className="flex gap-1.5 flex-none">
          <button
            disabled={acting}
            onClick={() => act(() => bookingService.approve(booking._id), 'Booking approved')}
            className="rounded-lg bg-forest px-3 py-1.5 text-[11.5px] font-bold text-white hover:bg-forest/90 disabled:opacity-50 transition-colors"
          >
            Approve
          </button>
          <button
            disabled={acting}
            onClick={() => act(() => bookingService.reject(booking._id, 'Declined by owner'), 'Booking declined')}
            className="rounded-lg border border-sand bg-white px-3 py-1.5 text-[11.5px] font-semibold text-sub hover:bg-chip disabled:opacity-50 transition-colors"
          >
            Decline
          </button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main panel                                                           */
/* ------------------------------------------------------------------ */
export function OrchardAnalyticsPanel({ orchardId, gardenName }: Props) {
  const [analytics, setAnalytics]   = useState<OrchardAnalytics | null>(null);
  const [bookings,  setBookings]    = useState<Booking[]>([]);
  const [page,      setPage]        = useState(1);
  const [totalPages,setTotalPages]  = useState(1);
  const [loading,   setLoading]     = useState(true);
  const [bLoading,  setBLoading]    = useState(false);
  const [tab,       setTab]         = useState<'overview' | 'bookings'>('overview');

  const loadAnalytics = () =>
    sellerService.getOrchardAnalytics(orchardId).then(setAnalytics).catch(() => {});

  const loadBookings = (p = 1) => {
    setBLoading(true);
    setPage(p);
    sellerService
      .getOrchardBookings(orchardId, { page: p, limit: 8 })
      .then((res) => {
        setBookings(res.data ?? []);
        setTotalPages((res.meta as { totalPages?: number })?.totalPages ?? 1);
      })
      .catch(() => {})
      .finally(() => setBLoading(false));
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([loadAnalytics(), loadBookings(1)])
      .finally(() => setLoading(false));
  }, [orchardId]);

  /* KPI definitions */
  const kpis = analytics
    ? [
        {
          icon: IndianRupee,
          label: 'Revenue',
          value: formatCurrency(analytics.revenue),
          sub: `${analytics.completedBookings} completed`,
          accent: true,
        },
        {
          icon: CalendarDays,
          label: 'Total Bookings',
          value: analytics.totalBookings,
          sub: `${analytics.pendingApprovals} pending`,
        },
        {
          icon: Eye,
          label: 'Views',
          value: formatNumber(analytics.viewCount),
          sub: 'all time',
        },
        {
          icon: Heart,
          label: 'Saves',
          value: formatNumber(analytics.favouriteCount),
          sub: 'wishlisted',
        },
        {
          icon: Star,
          label: 'Rating',
          value: analytics.ratingAverage > 0 ? analytics.ratingAverage.toFixed(1) : '—',
          sub: analytics.ratingCount > 0 ? `${analytics.ratingCount} review${analytics.ratingCount !== 1 ? 's' : ''}` : 'no reviews yet',
        },
      ]
    : [];

  /* Booking status summary pills */
  const byStat = analytics?.bookingsByStatus ?? {};

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-serif text-[22px] font-semibold text-ink leading-tight">
            {gardenName}
          </h2>
          <p className="mt-0.5 text-[13px] text-faint">Individual orchard analytics & bookings</p>
        </div>
        <div className="flex items-center gap-1 rounded-xl bg-chip p-1">
          {(['overview', 'bookings'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-[9px] px-4 py-1.5 text-[12.5px] font-semibold transition-all ${
                tab === t
                  ? 'bg-white text-ink shadow-sm'
                  : 'text-sub hover:text-ink'
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner className="h-7 w-7" />
        </div>
      ) : tab === 'overview' ? (
        <>
          {/* KPI grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {kpis.map(({ icon: Icon, label, value, sub, accent }) => (
              <div
                key={label}
                className="flex flex-col gap-1 rounded-2xl border border-sand bg-cream px-4 py-3.5"
              >
                <div className="flex items-center gap-2">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-[9px] ${accent ? 'bg-terra/10' : 'bg-forest/10'}`}>
                    <Icon className={`h-4 w-4 ${accent ? 'text-terra' : 'text-forest'}`} />
                  </div>
                  <span className="text-[11px] font-semibold text-faint uppercase tracking-wide">{label}</span>
                </div>
                <div className={`font-serif text-[22px] font-bold leading-none ${accent ? 'text-terra' : 'text-ink'}`}>
                  {value}
                </div>
                <div className="text-[11.5px] text-sub">{sub}</div>
              </div>
            ))}
          </div>

          {/* Booking status breakdown */}
          {analytics && Object.keys(byStat).length > 0 && (
            <div className="rounded-2xl border border-sand bg-cream p-4">
              <div className="flex items-center gap-2 mb-3">
                <Users className="h-4 w-4 text-forest" />
                <h3 className="text-[13px] font-semibold text-ink">Booking Status Breakdown</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(byStat).map(([status, count]) => (
                  <BookingBadge key={status} status={status} />
                ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-4">
                {Object.entries(byStat).map(([status, count]) => (
                  <div key={status} className="text-[12.5px] text-sub capitalize">
                    <span className="font-bold text-ink">{count}</span> {status}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Revenue chart */}
          {analytics && analytics.revenueSeries.length > 0 && (
            <div className="rounded-2xl border border-sand bg-cream p-4">
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="h-4 w-4 text-forest" />
                <h3 className="text-[13px] font-semibold text-ink">Revenue — last 6 months</h3>
              </div>
              <RevenueChart series={analytics.revenueSeries} />
            </div>
          )}

          {analytics && analytics.totalBookings === 0 && (
            <div className="flex flex-col items-center py-10 gap-2 text-center">
              <TrendingUp className="h-10 w-10 text-faint/40" />
              <p className="text-[13.5px] text-sub">No bookings yet for this orchard.</p>
              <p className="text-[12px] text-faint">Stats will appear here once renters start booking.</p>
            </div>
          )}
        </>
      ) : (
        /* Bookings tab */
        <div className="flex flex-col gap-2">
          {bLoading ? (
            <div className="flex justify-center py-10">
              <Spinner className="h-6 w-6" />
            </div>
          ) : bookings.length === 0 ? (
            <div className="flex flex-col items-center py-12 gap-2 text-center">
              <CalendarDays className="h-10 w-10 text-faint/40" />
              <p className="text-[13.5px] text-sub">No bookings yet for this orchard.</p>
            </div>
          ) : (
            <>
              {bookings.map((b) => (
                <BookingRow key={b._id} booking={b} onRefresh={() => loadBookings(page)} />
              ))}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => loadBookings(page - 1)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-sand bg-white text-sub hover:bg-chip disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-[12.5px] text-sub">
                    {page} / {totalPages}
                  </span>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => loadBookings(page + 1)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-sand bg-white text-sub hover:bg-chip disabled:opacity-40"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
