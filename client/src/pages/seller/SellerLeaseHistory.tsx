import { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  FileDown,
  LayoutList,
  Search,
  TrendingUp,
  TreePine,
  Wallet,
} from 'lucide-react';
import { bookingService } from '@/services/booking.service';
import { Badge, EmptyState, Spinner, statusTone } from '@/components/ui';
import { useToast } from '@/context/ToastContext';
import { formatCurrency, formatDate, titleCase } from '@/lib/format';
import { orchardSurface } from '@/lib/gradients';
import { initialsOf } from '@/lib/avatar';
import { getErrorMessage } from '@/lib/apiClient';
import { cn } from '@/lib/cn';
import type { Booking, Orchard, User } from '@/types';

/* ─── constants ─── */
const HISTORY_STATUSES = ['completed', 'cancelled', 'rejected'] as const;
type HistoryStatus = (typeof HISTORY_STATUSES)[number];

const STATUS_LABELS: Record<HistoryStatus, string> = {
  completed: 'Completed',
  cancelled: 'Cancelled',
  rejected: 'Rejected',
};

const PAGE_SIZE = 12;

/* ─── helpers ─── */
function durationDays(b: Booking) {
  return Math.max(
    1,
    Math.ceil(
      (new Date(b.endDate).getTime() - new Date(b.startDate).getTime()) / (1000 * 60 * 60 * 24)
    )
  );
}

/* ─── Stat card ─── */
function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  accent: string;
}) {
  return (
    <div className="flex flex-1 basis-[160px] flex-col gap-2 rounded-2xl border border-sand bg-cream px-5 py-4">
      <div className={cn('flex h-8 w-8 items-center justify-center rounded-xl', accent)}>
        <Icon className="h-4 w-4 text-white" />
      </div>
      <div className="font-serif text-[22px] font-bold leading-none text-ink">{value}</div>
      <div className="text-[11.5px] font-semibold uppercase tracking-wide text-faint">{label}</div>
      {sub && <div className="text-[11px] text-faint">{sub}</div>}
    </div>
  );
}

/* ─── Timeline row ─── */
function TimelineRow({ entry }: { entry: { status: string; note: string; at: string } }) {
  return (
    <div className="flex items-start gap-3 py-1.5">
      <span className="mt-[5px] h-2 w-2 flex-none rounded-full bg-forest-light" />
      <div className="min-w-0 flex-1">
        <span className="text-[12px] font-semibold text-ink">{titleCase(entry.status)}</span>
        {entry.note && (
          <span className="ml-2 text-[11.5px] text-faint">— {entry.note}</span>
        )}
      </div>
      <span className="flex-none text-[11px] text-faint">{formatDate(entry.at)}</span>
    </div>
  );
}

/* ─── History row card ─── */
function HistoryCard({
  booking,
  onDownload,
  downloadingId,
}: {
  booking: Booking;
  onDownload: (id: string) => void;
  downloadingId: string | null;
}) {
  const [open, setOpen] = useState(false);
  const o = booking.orchardId as Orchard;
  const renter = booking.renterId as User;
  const days = durationDays(booking);
  const isDownloading = downloadingId === booking._id;

  return (
    <div className="overflow-hidden rounded-2xl border border-sand bg-cream transition-shadow hover:shadow-sm">
      {/* Main row */}
      <div className="flex flex-wrap items-center gap-3.5 p-4">
        {/* Renter avatar */}
        <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-forest-light text-sm font-bold text-cream">
          {initialsOf(renter?.name)}
        </span>

        {/* Orchard thumbnail */}
        <div
          className="h-[56px] w-[72px] flex-none rounded-[9px]"
          style={orchardSurface(o?.thumbnail, o?.fruitTypes || [], o?._id || booking._id)}
        />

        {/* Info */}
        <div className="min-w-[160px] flex-1 basis-[180px]">
          <div className="text-[14.5px] font-bold">{renter?.name || '—'}</div>
          <div className="mt-0.5 text-[12px] text-faint">
            {o?.gardenName || 'Orchard'}
            {o && ` · ${o.district}, ${o.state}`}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[12px] text-[#3a4632]">
            <Calendar className="h-3 w-3 text-faint" />
            {formatDate(booking.startDate)} → {formatDate(booking.endDate)}
            <span className="text-faint">· {days} day{days !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Amount + status */}
        <div className="flex-none text-right">
          <Badge tone={statusTone[booking.bookingStatus] || 'gray'}>
            {titleCase(booking.bookingStatus)}
          </Badge>
          <div className="mt-1.5 font-serif text-[18px] font-bold text-ink">
            {formatCurrency(booking.totalAmount)}
          </div>
          <div className="text-[11px] text-faint">
            Payment: {titleCase(booking.paymentStatus)}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-none flex-wrap items-center gap-2">
          {booking.bookingStatus === 'completed' && (
            <button
              id={`seller-history-download-${booking._id}`}
              onClick={() => onDownload(booking._id)}
              disabled={isDownloading}
              className="flex items-center gap-1.5 rounded-[9px] bg-[#2a4e20] px-3.5 py-2 text-[12px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {isDownloading ? (
                <Spinner className="h-3.5 w-3.5 text-white" />
              ) : (
                <FileDown className="h-3.5 w-3.5" />
              )}
              {isDownloading ? 'Generating…' : 'Agreement'}
            </button>
          )}
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-1 rounded-[9px] border border-sand bg-white px-3 py-2 text-[12px] font-semibold text-sub hover:bg-chip"
          >
            Timeline
            {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Timeline accordion */}
      {open && (
        <div className="border-t border-sand bg-[#faf8f3] px-5 py-3">
          {booking.timeline && booking.timeline.length > 0 ? (
            booking.timeline.map((t, i) => <TimelineRow key={i} entry={t} />)
          ) : (
            <p className="text-[12px] text-faint">No timeline entries.</p>
          )}
        </div>
      )}
    </div>
  );
}

/* ══ Main Page ══════════════════════════════════════════════════════════ */
export default function SellerLeaseHistory() {
  const toast = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<HistoryStatus | 'all'>('all');
  const [page, setPage] = useState(1);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  /* Fetch */
  useEffect(() => {
    setLoading(true);
    bookingService
      .history({ role: 'seller' })
      .then((res) => setBookings(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  /* Client-side filter */
  const filtered = useMemo(() => {
    let out = bookings;
    if (statusFilter !== 'all') out = out.filter((b) => b.bookingStatus === statusFilter);
    if (search.trim()) {
      const re = new RegExp(search.trim(), 'i');
      out = out.filter((b) => {
        const o = b.orchardId as Orchard;
        const renter = b.renterId as User;
        return (
          re.test(o?.gardenName || '') ||
          re.test(o?.district || '') ||
          re.test(o?.state || '') ||
          re.test(renter?.name || '')
        );
      });
    }
    return out;
  }, [bookings, statusFilter, search]);

  /* Pagination */
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  /* Reset page on filter change */
  useEffect(() => setPage(1), [search, statusFilter]);

  /* Stats */
  const stats = useMemo(() => {
    const completed = bookings.filter((b) => b.bookingStatus === 'completed');
    const totalEarned = completed.reduce((s, b) => s + b.totalAmount, 0);
    const uniqueOrchards = new Set(
      bookings.map((b) => (b.orchardId as Orchard)?._id || (b.orchardId as string))
    ).size;
    const uniqueRenters = new Set(
      bookings.map((b) => (b.renterId as User)?._id || (b.renterId as string))
    ).size;
    return { total: bookings.length, totalEarned, uniqueOrchards, uniqueRenters };
  }, [bookings]);

  /* Download */
  const handleDownload = async (id: string) => {
    setDownloadingId(id);
    try {
      await bookingService.downloadAgreement(id);
      toast.success('Lease agreement downloaded');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <main className="mx-auto max-w-[1000px] px-6 pb-20 pt-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-serif text-[30px] font-semibold leading-tight">Lease History</h1>
        <p className="mt-1 text-[13.5px] text-faint">
          A complete record of all past leases on your orchards.
        </p>
      </div>

      {/* Stats row */}
      {!loading && bookings.length > 0 && (
        <div className="mb-7 flex flex-wrap gap-3">
          <StatCard
            icon={LayoutList}
            label="Total Leases"
            value={String(stats.total)}
            accent="bg-[#2a4e20]"
          />
          <StatCard
            icon={Wallet}
            label="Total Earned"
            value={formatCurrency(stats.totalEarned)}
            sub="from completed leases"
            accent="bg-[#a05a45]"
          />
          <StatCard
            icon={TreePine}
            label="Orchards"
            value={String(stats.uniqueOrchards)}
            sub="properties leased"
            accent="bg-[#3a6b8a]"
          />
          <StatCard
            icon={TrendingUp}
            label="Renters"
            value={String(stats.uniqueRenters)}
            sub="unique lessees"
            accent="bg-[#7a6b3e]"
          />
        </div>
      )}

      {/* Search + filters */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex min-w-[200px] flex-1 items-center gap-2 rounded-xl border border-sand bg-cream px-3.5 py-2.5">
          <Search className="h-4 w-4 flex-none text-faint" />
          <input
            id="seller-history-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by orchard, renter name, location…"
            className="w-full bg-transparent text-[13.5px] text-ink outline-none placeholder:text-faint"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {(['all', ...HISTORY_STATUSES] as const).map((s) => (
            <button
              key={s}
              id={`seller-filter-${s}`}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'rounded-full border px-3.5 py-[7px] text-[12px] font-semibold transition-all',
                statusFilter === s
                  ? 'border-forest bg-forest text-cream'
                  : 'border-sand text-sub hover:border-faint'
              )}
            >
              {s === 'all' ? 'All' : STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner className="h-8 w-8" />
        </div>
      ) : bookings.length === 0 ? (
        <EmptyState
          emoji="📜"
          title="No lease history yet"
          description="Completed and past lease agreements for your orchards will appear here."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          emoji="🔍"
          title="No results"
          description="Try adjusting your search or filter."
        />
      ) : (
        <>
          {/* Result count */}
          <p className="mb-3 text-[13px] text-faint">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of{' '}
            {filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}
          </p>

          {/* Cards */}
          <div className="flex flex-col gap-3">
            {paginated.map((b) => (
              <HistoryCard
                key={b._id}
                booking={b}
                onDownload={handleDownload}
                downloadingId={downloadingId}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg border border-sand px-3.5 py-2 text-[13px] font-semibold text-sub disabled:opacity-40 hover:bg-chip"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={cn(
                    'h-9 w-9 rounded-lg border text-[13px] font-semibold transition-all',
                    n === page
                      ? 'border-forest bg-forest text-cream'
                      : 'border-sand text-sub hover:bg-chip'
                  )}
                >
                  {n}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-lg border border-sand px-3.5 py-2 text-[13px] font-semibold text-sub disabled:opacity-40 hover:bg-chip"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </main>
  );
}
