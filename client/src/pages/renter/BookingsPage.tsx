import { useEffect, useState } from 'react';
import { RefreshCw, Calendar, History } from 'lucide-react';
import { bookingService } from '@/services/booking.service';
import { recommendationService } from '@/services/recommendation.service';
import { useToast } from '@/context/ToastContext';
import { Button, Card, Badge, EmptyState } from '@/components/ui';
import { RenewalModal } from '@/components/orchard/RenewalModal';
import { RecommendedSection } from '@/components/recommendation/RecommendedSection';
import { formatCurrency, formatDate } from '@/lib/format';
import { getErrorMessage } from '@/lib/apiClient';
import type { Booking, Orchard, RecommendationItem } from '@/types';

export default function BookingsPage() {
  const toast = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedForRenewal, setSelectedForRenewal] = useState<Booking | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [recLoading, setRecLoading] = useState(true);

  const fetchBookings = () => {
    setLoading(true);
    bookingService
      .list({ role: 'renter' })
      .then((res) => setBookings(res.data))
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  const fetchRecommendations = () => {
    setRecLoading(true);
    recommendationService
      .getPersonalized({ limit: 3 })
      .then((res) => setRecommendations(res.recommendations))
      .catch(() => {})
      .finally(() => setRecLoading(false));
  };

  useEffect(() => {
    fetchBookings();
    fetchRecommendations();
  }, []);


  const handleRequestRenewal = async (newEndDate: string, message: string) => {
    if (!selectedForRenewal) return;
    setSubmitting(true);
    try {
      await bookingService.requestRenewal(selectedForRenewal._id, { newEndDate, message });
      toast.success('Lease renewal request submitted to owner!');
      setSelectedForRenewal(null);
      fetchBookings();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="container-page py-12">
        <div className="sk mb-6 h-8 w-48 rounded" />
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="sk h-44 rounded-2xl" />
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="container-page py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-ink">My Leases &amp; Bookings</h1>
          <p className="text-sm text-sub">Manage active orchard leases and request extensions before expiry.</p>
        </div>
      </div>

      {bookings.length === 0 ? (
        <EmptyState
          emoji="📑"
          title="No booking records found"
          description="When you lease an orchard, your active and historical bookings will appear here."
        />
      ) : (
        <div className="space-y-5">
          {bookings.map((b) => {
            const orchard = typeof b.orchardId === 'object' ? (b.orchardId as Orchard) : null;
            const isApproved = b.bookingStatus === 'approved';
            const isRenewal = b.isRenewal;

            return (
              <Card key={b._id} className="p-6 space-y-4 border-sand bg-cream">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge tone={b.bookingStatus === 'approved' ? 'green' : 'gray'}>
                        {b.bookingStatus.toUpperCase()}
                      </Badge>
                      {isRenewal && (
                        <Badge tone="green" className="bg-emerald-100 text-emerald-800 border-emerald-300">
                          Renewal Request
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-serif text-xl font-bold text-ink">
                      {orchard?.gardenName || 'Orchard Lease'}
                    </h3>
                    <p className="text-xs text-sub mt-0.5">
                      {orchard?.district}, {orchard?.state}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="font-serif text-2xl font-bold text-terra">
                      {formatCurrency(b.totalAmount)}
                    </span>
                    <span className="text-xs text-faint block">Total Paid / Agreed</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl bg-paper p-4 text-sm border border-sand/60">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-forest" />
                    <div>
                      <span className="text-xs text-faint block">Lease Duration</span>
                      <span className="font-semibold text-ink">
                        {formatDate(b.startDate)} — {formatDate(b.endDate)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3">
                    {/* Lease Renewal Action Button (Issue #27) */}
                    {isApproved && (
                      <Button
                        size="sm"
                        onClick={() => setSelectedForRenewal(b)}
                        className="bg-forest text-cream hover:bg-forest-dark"
                      >
                        <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                        Request Renewal
                      </Button>
                    )}
                  </div>
                </div>

                {/* Display Renewal History (Issue #27) */}
                {b.renewalHistory && b.renewalHistory.length > 0 && (
                  <div className="border-t border-sand/60 pt-3">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-forest mb-2">
                      <History className="h-3.5 w-3.5" />
                      <span>Lease Renewal History</span>
                    </div>
                    <div className="space-y-1.5">
                      {b.renewalHistory.map((h, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs bg-paper/60 p-2 rounded-lg">
                          <span className="text-sub">
                            Extended on {formatDate(h.renewedAt)}: {formatDate(h.previousEndDate)} ➔ <strong className="text-ink">{formatDate(h.newEndDate)}</strong>
                          </span>
                          <span className="font-semibold text-terra">
                            +{formatCurrency(h.additionalAmount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Smart Personalized Recommendations */}
      <div className="mt-12 border-t border-sand/80 pt-8">
        <RecommendedSection
          title="Personalized Recommendations"
          subtitle="Explore handpicked orchards based on your active leases, wishlist, and preferred fruit varieties."
          items={recommendations}
          isLoading={recLoading}
          onRetry={fetchRecommendations}
          maxItems={3}
        />
      </div>

      {selectedForRenewal && (
        <RenewalModal
          booking={selectedForRenewal}
          submitting={submitting}
          onClose={() => setSelectedForRenewal(null)}
          onConfirm={handleRequestRenewal}
        />
      )}
    </main>
  );
}

