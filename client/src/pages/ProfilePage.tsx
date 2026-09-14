import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Phone,
  Globe,
  CalendarDays,
  Check,
  Clock,
  Star,
  MessageSquare,
  UserCheck,
  Calendar,
  Sparkles,
  ArrowRight,
  Eye,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useMarketplace } from '@/context/MarketplaceContext';
import { userService } from '@/services/user.service';
import { sellerService } from '@/services/seller.service';
import { wishlistService } from '@/services/wishlist.service';
import { recommendationService } from '@/services/recommendation.service';
import { Toggle } from '@/components/ui/Toggle';
import { RecommendedSection } from '@/components/recommendation/RecommendedSection';
import { getErrorMessage } from '@/lib/apiClient';
import { avatarGradient, initialsOf } from '@/lib/avatar';
import { formatDate, formatCurrency, timeAgo } from '@/lib/format';
import type { NotificationSettings, Orchard, RecommendationItem } from '@/types';

interface Activity {
  type: string;
  action?: string;
  title: string;
  detail?: string;
  link?: string;
  at: string;
}

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'booking':
      return <Calendar className="h-4 w-4 text-forest" />;
    case 'review':
      return <Star className="h-4 w-4 text-amber-500" />;
    case 'follow':
      return <UserCheck className="h-4 w-4 text-blue-500" />;
    case 'question':
      return <MessageSquare className="h-4 w-4 text-purple-500" />;
    default:
      return <Clock className="h-4 w-4 text-emerald-600" />;
  }
};

const NOTIF_ROWS: { key: keyof NotificationSettings; title: string; desc: string }[] = [
  { key: 'emailBookings', title: 'Booking alerts', desc: 'Status changes on your lease requests.' },
  { key: 'emailApprovals', title: 'Approval updates', desc: 'When listings or bookings are approved.' },
  { key: 'emailMarketing', title: 'Newsletter', desc: 'Seasonal orchard highlights & offers.' },
  { key: 'inAppSystem', title: 'System notices', desc: 'Important account & platform updates.' },
];

export default function ProfilePage() {
  const { user, updateUser, logout } = useAuth();
  const { savedIds, compareIds, bookingCount } = useMarketplace();
  const toast = useToast();

  const isSeller = user?.role === 'seller';
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({ bio: '', phone: '', language: '' });
  const [notif, setNotif] = useState<NotificationSettings | null>(null);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [sellerStats, setSellerStats] = useState<{ orchards: number; revenue: number; rating: number } | null>(null);

  const [recentlyViewed, setRecentlyViewed] = useState<Orchard[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [recLoading, setRecLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({ bio: user.bio || '', phone: user.phone || '', language: user.language || 'English' });
      setNotif(
        user.notificationSettings || {
          emailBookings: true,
          emailApprovals: true,
          emailMarketing: false,
          inAppBookings: true,
          inAppSystem: true,
        }
      );
    }
    userService.getActivity().then(setActivity).catch(() => {});
    if (isSeller) {
      sellerService
        .overview()
        .then((o) => setSellerStats({ orchards: o.totalOrchards, revenue: o.revenue, rating: 0 }))
        .catch(() => {});
    } else {
      wishlistService.getRecentlyViewed().then(setRecentlyViewed).catch(() => {});
      setRecLoading(true);
      recommendationService
        .getPersonalized({ limit: 3 })
        .then((res) => setRecommendations(res.recommendations || []))
        .catch(() => {})
        .finally(() => setRecLoading(false));
    }
  }, [user, isSeller]);

  if (!user) return null;

  const save = async () => {
    try {
      const updated = await userService.updateProfile(form);
      updateUser(updated);
      setEdit(false);
      toast.success('Profile updated');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const toggleNotif = async (key: keyof NotificationSettings) => {
    if (!notif) return;
    const next = { ...notif, [key]: !notif[key] };
    setNotif(next);
    try {
      await userService.updateNotifications({ [key]: next[key] });
    } catch (err) {
      toast.error(getErrorMessage(err));
      setNotif(notif);
    }
  };

  const stats = isSeller
    ? [
        { k: 'Orchards', v: sellerStats?.orchards ?? 0 },
        { k: 'Season revenue', v: formatCurrency(sellerStats?.revenue ?? 0) },
        { k: 'Saved', v: savedIds.size },
        { k: 'Bookings', v: bookingCount },
      ]
    : [
        { k: 'Bookings', v: bookingCount },
        { k: 'Saved', v: savedIds.size },
        { k: 'Comparing', v: compareIds.length },
        { k: 'Reviews', v: activity.filter((a) => a.type === 'review').length },
      ];

  const cover = isSeller
    ? 'linear-gradient(135deg,#3f6b34,#c98a2b)'
    : 'linear-gradient(135deg,#2f5d3a,#3f6b34)';

  return (
    <main className="mx-auto max-w-[1080px] px-6 pb-16 pt-6">
      <div
        className="relative min-h-[135px] overflow-hidden rounded-3xl p-5 sm:px-8 sm:py-6 flex flex-wrap items-center justify-between gap-4"
        style={{ background: cover }}
      >
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(circle at 86% 30%,rgba(201,138,43,.3),transparent 44%)' }}
        />
        {!isSeller && (
          <div className="relative z-10 flex flex-wrap items-center gap-4 w-full justify-end pr-2 text-cream">
            {recentlyViewed.length > 0 ? (
              <div className="flex items-center gap-3 bg-black/25 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/15 shadow-sm max-w-sm sm:max-w-md">
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-white/10">
                  <Eye className="h-4 w-4 text-cream" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-cream/70 flex items-center gap-1">
                    <span>Last Viewed Orchard</span>
                  </div>
                  <div className="text-sm font-bold truncate text-cream">
                    {recentlyViewed[0].gardenName}
                  </div>
                </div>
                {recentlyViewed[0].slug && (
                  <Link
                    to={`/orchards/${recentlyViewed[0].slug}`}
                    className="flex-none rounded-xl bg-white/20 hover:bg-white/30 px-3 py-1.5 text-xs font-bold text-cream transition-colors flex items-center gap-1"
                  >
                    Resume <ArrowRight className="h-3 w-3" />
                  </Link>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-black/20 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/15 text-xs font-medium text-cream/90">
                <Sparkles className="h-4 w-4 text-amber-300" />
                <span>Explore marketplace to start tracking your recent activity</span>
                <Link to="/explore" className="underline font-bold ml-1 hover:text-white">
                  Explore now
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="-mt-[46px] mb-[22px] flex flex-wrap items-end gap-[18px] px-2">
        <span
          className="flex h-24 w-24 items-center justify-center rounded-[24px] border-4 border-paper text-[30px] font-bold text-cream"
          style={{ background: avatarGradient(user.role) }}
        >
          {initialsOf(user.name)}
        </span>
        <div className="flex-1 basis-60 pb-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-serif text-[25px] font-semibold">{user.name}</h1>
            {isSeller ? (
              <span className="rounded-full bg-[#fbf2dd] px-2.5 py-[3px] text-[11.5px] font-bold text-[#a9772b]">
                Verified Seller
              </span>
            ) : (
              <span className="rounded-full bg-avail px-2.5 py-[3px] text-[11.5px] font-bold text-forest">Renter</span>
            )}
          </div>
          <p className="mt-1 text-[13.5px] text-faint">
            {user.email} · {isSeller ? 'Selling' : 'Member'} since {formatDate(user.createdAt)}
          </p>
        </div>
        <button
          onClick={() => (edit ? save() : setEdit(true))}
          className="rounded-[11px] border border-sand bg-cream px-[18px] py-2.5 text-[13.5px] font-bold text-ink"
        >
          {edit ? 'Save changes' : 'Edit profile'}
        </button>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        {stats.map((st) => (
          <div key={st.k} className="rounded-[15px] border border-sand bg-cream px-5 py-[18px]">
            <div className="font-serif text-[28px] font-bold text-ink">{st.v}</div>
            <div className="mt-0.5 text-[12.5px] font-semibold text-faint">{st.k}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-start gap-6">
        <div className="flex flex-1 basis-[360px] flex-col gap-5">
          {/* About */}
          <section className="rounded-2xl border border-sand bg-cream p-[22px]">
            <h2 className="mb-4 font-serif text-[18px] font-semibold">
              {isSeller ? 'About the orchardist' : 'About you'}
            </h2>
            {edit ? (
              <>
                <textarea
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  rows={3}
                  className="mb-3.5 w-full resize-y rounded-[11px] border border-sand bg-white px-3.5 py-3 text-sm outline-none"
                  placeholder="Tell others about yourself…"
                />
                <div className="flex flex-wrap gap-3">
                  <label className="flex-1 basis-[140px]">
                    <span className="eyebrow mb-1.5 block">Phone</span>
                    <input
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="w-full rounded-[11px] border border-sand bg-white px-3.5 py-3 text-sm outline-none"
                    />
                  </label>
                  <label className="flex-1 basis-[140px]">
                    <span className="eyebrow mb-1.5 block">Language</span>
                    <input
                      value={form.language}
                      onChange={(e) => setForm({ ...form, language: e.target.value })}
                      className="w-full rounded-[11px] border border-sand bg-white px-3.5 py-3 text-sm outline-none"
                    />
                  </label>
                </div>
              </>
            ) : (
              <>
                <p className="mb-4 text-[14.5px] leading-relaxed text-[#3a4632]">
                  {user.bio || 'No bio yet — click Edit profile to add one.'}
                </p>
                <div className="flex flex-col gap-2.5 text-sm text-[#3a4632]">
                  <span className="flex items-center gap-2.5">
                    <Phone className="h-4 w-4 text-faint" /> {user.phone || '—'}
                  </span>
                  <span className="flex items-center gap-2.5">
                    <Globe className="h-4 w-4 text-faint" /> {user.language || 'English'}
                  </span>
                  <span className="flex items-center gap-2.5">
                    <CalendarDays className="h-4 w-4 text-faint" /> Joined {formatDate(user.createdAt)}
                  </span>
                </div>
              </>
            )}
          </section>

          {/* Notifications (both roles) */}
          <section className="rounded-2xl border border-sand bg-cream p-[22px]">
            <h2 className="font-serif text-[18px] font-semibold">Notifications</h2>
            <p className="mb-4 text-[13px] text-faint">Choose what we ping you about.</p>
            <div className="flex flex-col">
              {notif &&
                NOTIF_ROWS.map((row) => (
                  <div key={row.key} className="flex items-center justify-between gap-3.5 border-t border-chip py-[11px]">
                    <div>
                      <div className="text-sm font-semibold">{row.title}</div>
                      <div className="text-[12.5px] text-faint">{row.desc}</div>
                    </div>
                    <Toggle on={!!notif[row.key]} onClick={() => toggleNotif(row.key)} />
                  </div>
                ))}
            </div>
          </section>
        </div>

        {/* Right column */}
        <div className="flex-1 basis-[280px]">
          {isSeller ? (
            <section className="rounded-2xl border border-sand bg-cream p-[22px]">
              <h2 className="mb-4 font-serif text-[18px] font-semibold">Payout &amp; verification</h2>
              <div className="flex flex-col gap-3.5">
                <div className="flex items-center gap-2.5 rounded-xl bg-avail px-3.5 py-3">
                  <Check className="h-[18px] w-[18px] text-forest" strokeWidth={2.2} />
                  <div>
                    <div className="text-[13.5px] font-bold text-forest">KYC verified</div>
                    <div className="text-xs text-[#5f7a58]">Aadhaar &amp; PAN on file</div>
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-sand px-3.5 py-3">
                  <div>
                    <div className="text-[13.5px] font-bold">Bank payout</div>
                    <div className="text-xs text-faint">HDFC •••• 4821</div>
                  </div>
                  <span className="cursor-pointer text-xs font-semibold text-terra">Edit</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-sand px-3.5 py-3">
                  <div>
                    <div className="text-[13.5px] font-bold">Response rate</div>
                    <div className="text-xs text-faint">Replies within 6 hrs</div>
                  </div>
                  <span className="text-sm font-bold text-forest">98%</span>
                </div>
              </div>
              <button
                onClick={logout}
                className="mt-4 w-full rounded-[11px] bg-[#f7ece6] py-3 text-[13.5px] font-bold text-[#a05a45]"
              >
                Log out
              </button>
            </section>
          ) : (
            <section className="rounded-2xl border border-sand bg-cream p-[22px]">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-serif text-[18px] font-semibold text-ink">Recent activity</h2>
                {activity.length > 0 && (
                  <span className="text-xs font-bold text-faint bg-paper px-2 py-0.5 rounded-full border border-sand/60">
                    Last 20
                  </span>
                )}
              </div>
              <div className="flex flex-col divide-y divide-chip/60">
                {activity.length === 0 ? (
                  <div className="py-6 text-center">
                    <Clock className="mx-auto h-6 w-6 text-faint/60 mb-2" />
                    <p className="text-sm font-medium text-ink">No activity recorded yet</p>
                    <p className="text-xs text-faint mt-0.5">Your bookings, reviews, and saves will show here.</p>
                  </div>
                ) : (
                  activity.slice(0, 8).map((t, i) => (
                    <div key={i} className="flex gap-3.5 py-3.5 first:pt-0 last:pb-2">
                      <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-paper border border-sand/60 shadow-2xs">
                        {getActivityIcon(t.type)}
                      </span>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <div className="flex items-start justify-between gap-2">
                          {t.link ? (
                            <Link
                              to={t.link}
                              className="text-[13.5px] font-semibold leading-snug text-ink hover:text-forest transition-colors line-clamp-1"
                            >
                              {t.title}
                            </Link>
                          ) : (
                            <div className="text-[13.5px] font-semibold leading-snug text-ink line-clamp-1">
                              {t.title}
                            </div>
                          )}
                          <span className="text-[11px] font-medium text-faint whitespace-nowrap mt-0.5">
                            {timeAgo(t.at)}
                          </span>
                        </div>
                        {t.detail && (
                          <div className="mt-1 text-xs text-sub line-clamp-2 bg-paper/50 rounded-lg px-2.5 py-1.5 border border-chip/50">
                            {t.detail}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
              <button
                onClick={logout}
                className="mt-4 w-full rounded-[11px] bg-[#f7ece6] py-3 text-[13.5px] font-bold text-[#a05a45] hover:bg-[#ebdcd3] transition-colors"
              >
                Log out
              </button>
            </section>
          )}
        </div>
      </div>

      {!isSeller && (
        <div className="mt-10 space-y-10 border-t border-sand/80 pt-8">
          {/* Recently Viewed Section */}
          {recentlyViewed.length > 0 && (
            <section>
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-forest mb-1">
                    <Eye className="h-3.5 w-3.5" />
                    <span>Browsing History</span>
                  </div>
                  <h2 className="font-serif text-2xl font-bold text-ink">Recently Viewed Orchards</h2>
                </div>
                <Link to="/explore" className="text-xs font-bold text-forest hover:underline flex items-center gap-1">
                  View marketplace <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {recentlyViewed.slice(0, 3).map((orchard) => (
                  <Link
                    key={orchard._id}
                    to={`/orchards/${orchard.slug || ''}`}
                    className="group flex gap-3.5 rounded-2xl border border-sand bg-cream p-3 hover:border-forest/40 hover:shadow-md transition-all"
                  >
                    <div className="h-20 w-20 flex-none overflow-hidden rounded-xl bg-sand/30">
                      <img
                        src={orchard.thumbnail || '/placeholder-orchard.jpg'}
                        alt={orchard.gardenName}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div className="min-w-0 flex-1 flex flex-col justify-center">
                      <div className="text-xs font-semibold text-faint truncate">
                        {orchard.district}, {orchard.state}
                      </div>
                      <div className="font-serif text-base font-bold text-ink truncate group-hover:text-forest transition-colors">
                        {orchard.gardenName}
                      </div>
                      <div className="mt-1 flex items-center justify-between">
                        <span className="text-sm font-bold text-terra">
                          {formatCurrency(orchard.price || 0)}
                          <span className="text-[10px] font-normal text-faint">/yr</span>
                        </span>
                        {orchard.ratingAverage ? (
                          <span className="flex items-center gap-1 text-xs font-bold text-ink">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                            {orchard.ratingAverage}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* AI Personalized Recommendations Based on Activity */}
          <RecommendedSection
            title="Recommended Based On Your Activity"
            subtitle="Smart personalized orchard matches derived from your recent bookings, views, and wishlist."
            items={recommendations}
            isLoading={recLoading}
            onRetry={() => {
              setRecLoading(true);
              recommendationService
                .getPersonalized({ limit: 3 })
                .then((res) => setRecommendations(res.recommendations || []))
                .catch(() => {})
                .finally(() => setRecLoading(false));
            }}
            maxItems={3}
            badgeText="Activity-Based AI Picks"
          />
        </div>
      )}
    </main>
  );
}
