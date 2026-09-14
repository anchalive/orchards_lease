import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/cn';
import { sellerService, type SellerOverview as Overview, type RevenuePoint } from '@/services/seller.service';
import { bookingService } from '@/services/booking.service';
import { orchardService } from '@/services/orchard.service';
import { weatherService } from '@/services/weather.service';
import { WeatherIcon } from '@/components/orchard/WeatherCard';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Skeleton } from '@/components/ui';
import { formatCurrency } from '@/lib/format';
import { initialsOf } from '@/lib/avatar';
import { getErrorMessage } from '@/lib/apiClient';
import { reviewService } from '@/services/review.service';
import { StarRating } from '@/components/orchard/StarRating';
import { ReviewCard } from '@/components/orchard/ReviewCard';
import type { Booking, Orchard, User, Review, ReviewSummary } from '@/types';


export default function SellerOverview() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [revenue, setRevenue] = useState<RevenuePoint[]>([]);
  const [queue, setQueue] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [myOrchards, setMyOrchards] = useState<Orchard[]>([]);
  const [selectedOrchardId, setSelectedOrchardId] = useState<string>('');
  const [weather, setWeather] = useState<any>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);

  const [sellerReviews, setSellerReviews] = useState<Review[]>([]);
  const [sellerReviewSummary, setSellerReviewSummary] = useState<ReviewSummary | null>(null);

  const loadQueue = () =>
    bookingService
      .list({ role: 'seller', status: 'requested' })
      .then((res) => setQueue(res.data))
      .catch(() => {});

  useEffect(() => {
    Promise.all([sellerService.overview(), sellerService.revenue(6)])
      .then(([o, r]) => {
        setOverview(o);
        setRevenue(r);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    loadQueue();

    reviewService.getSellerReviews(1, 5)
      .then((res) => {
        setSellerReviews(res.reviews);
        setSellerReviewSummary(res.summary);
      })
      .catch(() => {});

    orchardService.listMine()
      .then((res) => {
        setMyOrchards(res.data);
        if (res.data.length > 0) {
          setSelectedOrchardId(res.data[0]._id);
        }
      })
      .catch(() => {});
  }, []);


  useEffect(() => {
    if (!selectedOrchardId) return;
    setWeatherLoading(true);
    weatherService.getWeather(selectedOrchardId)
      .then((data) => setWeather(data))
      .catch(() => setWeather(null))
      .finally(() => setWeatherLoading(false));
  }, [selectedOrchardId]);

  const approve = async (id: string) => {
    try {
      await bookingService.approve(id);
      toast.success('Booking approved — renter notified');
      loadQueue();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const kpis = overview
    ? [
        { k: 'Total revenue', v: formatCurrency(overview.revenue), sub: 'this season' },
        { k: 'Active listings', v: `${overview.activeListings} / ${overview.totalOrchards}`, sub: 'published' },
        { k: 'Total bookings', v: overview.totalBookings, sub: `${overview.pendingApprovals} pending` },
        { k: 'Total views', v: overview.totalViews.toLocaleString(), sub: 'across listings' },
      ]
    : [];

  const maxRev = Math.max(1, ...revenue.map((r) => r.revenue));

  return (
    <main className="mx-auto max-w-[1180px] px-6 pb-16 pt-[26px]">
      <div className="mb-[22px] flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[13px] font-semibold text-faint">Good day, {user?.name?.split(' ')[0]} 🌿</p>
          <h1 className="mt-0.5 font-serif text-[28px] font-semibold">Orchard dashboard</h1>
        </div>
        <button
          onClick={() => navigate('/seller/orchards/new')}
          className="flex items-center gap-2 rounded-xl bg-forest px-5 py-3 text-sm font-bold text-cream hover:bg-forest-dark"
        >
          <Plus className="h-4 w-4" /> Add orchard
        </button>
      </div>

      {/* KPIs */}
      <div className="mb-[22px] grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[104px]" />)
          : kpis.map((k) => (
              <div key={k.k} className="rounded-2xl border border-sand bg-cream px-5 py-[18px]">
                <div className="mb-2 text-[12.5px] font-semibold text-faint">{k.k}</div>
                <div className="font-serif text-[26px] font-bold text-ink">{k.v}</div>
                <div className="mt-1.5 text-xs font-semibold text-[#3f8a52]">{k.sub}</div>
              </div>
            ))}
      </div>

      <div className="flex flex-wrap items-start gap-5">
        {/* Revenue bars */}
        <div className="min-w-[320px] flex-[2_1_440px] rounded-[18px] border border-sand bg-cream p-[22px]">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-serif text-[18px] font-semibold">Revenue · last 6 months</h2>
            <span className="text-[12.5px] font-semibold text-faint">₹</span>
          </div>
          {loading ? (
            <Skeleton className="h-[140px]" />
          ) : (
            <div className="flex h-[160px] items-end gap-3.5 px-1">
              {revenue.map((b) => (
                <div key={b.label} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                  <div className="text-[11px] font-bold text-sub">{b.revenue ? formatCurrency(b.revenue) : ''}</div>
                  <div
                    className="w-full rounded-t-[5px] bg-forest transition-all"
                    style={{ height: `${Math.max(4, Math.round((b.revenue / maxRev) * 120))}px` }}
                  />
                  <div className="text-xs font-semibold text-faint">{b.label.split(' ')[0]}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Approval queue & Weather Widget Stack */}
        <div className="flex-1 basis-[280px] flex flex-col gap-5">
          {/* Approval queue */}
          <div className="rounded-[18px] border border-sand bg-cream p-[22px]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-serif text-[18px] font-semibold">Approval queue</h2>
              <span className="rounded-full bg-[#fbf2dd] px-2.5 py-[3px] text-xs font-bold text-[#a9772b]">
                {queue.length} pending
              </span>
            </div>
            {queue.length === 0 ? (
              <p className="py-3.5 text-center text-[13px] text-faint">All caught up 🌿</p>
            ) : (
              queue.slice(0, 4).map((b) => {
                const renter = b.renterId as User;
                const o = b.orchardId as Orchard;
                return (
                  <div key={b._id} className="flex items-center gap-2.5 border-t border-chip py-[11px]">
                    <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-forest-light text-xs font-bold text-cream">
                      {initialsOf(renter?.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13.5px] font-bold">{renter?.name}</div>
                      <div className="truncate text-[11.5px] text-faint">{o?.gardenName}</div>
                    </div>
                    <button
                      onClick={() => approve(b._id)}
                      className="flex-none rounded-[9px] bg-forest px-2.5 py-[7px] text-xs font-bold text-cream"
                    >
                      Approve
                    </button>
                  </div>
                );
              })
            )}
            <button
              onClick={() => navigate('/seller/bookings')}
              className="mt-3 w-full rounded-[10px] bg-avail py-2.5 text-[13px] font-bold text-forest"
            >
              View all bookings
            </button>
          </div>

          {/* Weather Widget */}
          <div className="rounded-[18px] border border-sand bg-cream p-[22px] flex flex-col justify-between">
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-serif text-[18px] font-semibold">Orchard Weather</h2>
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-forest/10 text-forest text-xs font-semibold">
                  ☁️
                </span>
              </div>
              
              {myOrchards.length === 0 ? (
                <p className="py-3 text-center text-xs text-faint">No orchards listed yet 🌳</p>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-faint uppercase tracking-wider block mb-1">Select Listing</label>
                    <select
                      value={selectedOrchardId}
                      onChange={(e) => setSelectedOrchardId(e.target.value)}
                      className="w-full rounded-xl border border-sand bg-cream px-3 py-2 text-xs font-semibold text-ink focus:outline-none focus:ring-1 focus:ring-forest"
                    >
                      {myOrchards.map((o) => (
                        <option key={o._id} value={o._id}>
                          {o.gardenName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {weatherLoading ? (
                    <div className="flex justify-center py-6">
                      <span className="text-xs text-faint font-semibold animate-pulse">Loading conditions...</span>
                    </div>
                  ) : weather ? (
                    <div className="rounded-xl border border-sand/40 bg-white/40 p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chip text-forest">
                          <WeatherIcon iconName={weather.current.icon} className="h-6 w-6" />
                        </div>
                        <div>
                          <div className="text-[20px] font-bold font-serif text-ink">{weather.current.temperature}°C</div>
                          <div className="text-xs font-bold text-sub">{weather.current.condition}</div>
                        </div>
                      </div>
                      <div className="text-right text-[11px] font-semibold text-faint space-y-0.5 animate-fadeIn">
                        <div>Feels like {weather.current.feelsLike}°C</div>
                        <div>Wind: {weather.current.windSpeed} km/h</div>
                        <div>Rain: {weather.current.rainChance}%</div>
                      </div>
                    </div>
                  ) : (
                    <p className="py-3 text-center text-xs text-terra font-bold">Failed to load weather</p>
                  )}
                </div>
              )}
            </div>
            
            {selectedOrchardId && (
              <button
                onClick={() => {
                  const target = myOrchards.find((o) => o._id === selectedOrchardId);
                  if (target) navigate(`/orchards/${target.slug}`);
                }}
                className="mt-4 w-full rounded-[10px] bg-avail py-2 text-[12.5px] font-bold text-forest hover:bg-[#d8edd6] transition-colors"
              >
                View Full 7-Day Forecast
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Orchard Health Overview Section (Issue #72) */}
      <div className="mt-6 rounded-[18px] border border-sand bg-cream p-[22px]">
        <h2 className="mb-4 font-serif text-[18px] font-semibold">Orchard Health Overview</h2>
        {myOrchards.length === 0 ? (
          <p className="py-4 text-center text-sm text-faint font-semibold">No orchards listed yet. Add an orchard to calculate its health score!</p>
        ) : (
          <div className="space-y-4">
            {myOrchards.map((o) => {
              const score = o.healthScore?.score ?? 0;
              const rating = o.healthScore?.rating ?? 'Needs Improvement';
              
              // Generate completion suggestions based on parameters
              const tips = [];
              if (!o.irrigationMethod || o.irrigationMethod.toLowerCase() === 'none') {
                tips.push('Add irrigation details to improve your Orchard Health Score.');
              }
              if (!o.soilFertility || o.soilFertility === 'Unknown') {
                tips.push('Provide soil fertility details to increase your score.');
              }
              if (!o.maintenanceStatus || o.maintenanceStatus === 'Unknown') {
                tips.push('Specify the maintenance status of your orchard to boost score.');
              }
              if (!o.waterSourceQuality || o.waterSourceQuality === 'Unknown') {
                tips.push('Add water source quality details to optimize rating.');
              }
              if (!o.organicCertification?.isCertified) {
                tips.push('Verify organic certification to gain compliance points.');
              }

              const pillTone = score >= 90
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : score >= 75
                  ? 'bg-green-50 text-green-800 border-green-200'
                  : score >= 60
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : 'bg-orange-50/70 text-terra border-orange-200';

              return (
                <div key={o._id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-sand bg-cream p-4 hover:shadow-soft transition-shadow">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-forest/10 text-forest text-base font-bold">
                      🌳
                    </div>
                    <div>
                      <h4 className="font-serif text-[15px] font-semibold text-ink">{o.gardenName}</h4>
                      <p className="text-[12.5px] text-faint">{o.district}, {o.state} · {o.fruitTypes[0]}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4">
                    <div className={cn('rounded-full border px-3 py-1 text-xs font-bold shadow-sm', pillTone)}>
                      {rating} · {score}/100
                    </div>
                    
                    <button
                      onClick={() => navigate(`/seller/orchards/${o._id}/edit`)}
                      className="rounded-[9px] border border-sand bg-white px-3.5 py-1.5 text-xs font-bold text-ink hover:bg-chip transition-colors"
                    >
                      Improve Profile
                    </button>
                  </div>

                  {tips.length > 0 && score < 90 && (
                    <div className="w-full mt-2.5 border-t border-sand/40 pt-2.5 text-xs font-semibold text-forest flex items-center gap-2">
                      <span className="flex h-2 w-2 rounded-full bg-forest animate-ping" />
                      <span>Tip: {tips[0]}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Seller Rating & Review Overview Section */}
      <div className="mt-6 rounded-[18px] border border-sand bg-cream p-[22px]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-serif text-[18px] font-semibold text-ink">Recent Reviews</h2>
            <p className="text-xs text-sub mt-0.5">Renter ratings and feedback across your orchards</p>
          </div>
          {sellerReviewSummary && sellerReviewSummary.ratingCount > 0 && (
            <div className="flex items-center gap-2 rounded-xl bg-chip/70 px-3.5 py-1.5 border border-sand/60">
              <span className="font-serif text-lg font-bold text-ink">
                {sellerReviewSummary.ratingAverage.toFixed(1)}
              </span>
              <StarRating value={sellerReviewSummary.ratingAverage} size="sm" />
              <span className="text-xs font-semibold text-faint">
                ({sellerReviewSummary.ratingCount})
              </span>
            </div>
          )}
        </div>

        {sellerReviews.length === 0 ? (
          <p className="py-6 text-center text-sm font-semibold text-faint">
            No reviews received yet for your orchards 🌟
          </p>
        ) : (
          <div className="space-y-3.5">
            {sellerReviews.map((r) => (
              <ReviewCard key={r._id} review={r} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

