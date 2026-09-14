import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Users, TreePine, BadgeCheck } from 'lucide-react';
import { followService } from '@/services/follow.service';
import { orchardService } from '@/services/orchard.service';
import { useMarketplace } from '@/context/MarketplaceContext';
import { avatarGradient, initialsOf } from '@/lib/avatar';
import { formatDate } from '@/lib/format';
import { FollowButton } from '@/components/follow/FollowButton';
import { OrchardCard } from '@/components/orchard/OrchardCard';
import { EmptyState } from '@/components/ui';
import type { SellerFollowStats, Orchard } from '@/types';

export default function SellerProfilePage() {
  const { sellerId = '' } = useParams();
  const navigate = useNavigate();
  const { isSaved, isCompared, toggleSave, toggleCompare } = useMarketplace();

  const [stats, setStats] = useState<SellerFollowStats | null>(null);
  const [orchards, setOrchards] = useState<Orchard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sellerId) return;
    setLoading(true);
    window.scrollTo(0, 0);

    Promise.all([
      followService.getSellerFollowersStats(sellerId),
      orchardService.list({ sellerId }),
    ])
      .then(([statsData, orchardsRes]) => {
        setStats(statsData);
        setOrchards(orchardsRes.data || []);
      })
      .catch(() => {
        setStats(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [sellerId]);

  if (loading) return <SellerProfileSkeleton />;

  if (!stats || !stats.seller) {
    return (
      <main className="container-page py-16">
        <EmptyState
          emoji="👤"
          title="Seller not found"
          description="The seller profile you are looking for does not exist or has been deactivated."
          action={<button onClick={() => navigate('/explore')} className="btn-primary">Browse orchards</button>}
        />
      </main>
    );
  }

  const seller = stats.seller;

  return (
    <main className="mx-auto max-w-[1180px] px-6 pb-16 pt-6">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="mb-6 flex items-center gap-1.5 py-1 text-sm font-semibold text-sub hover:text-ink transition-colors cursor-pointer"
      >
        <ChevronLeft className="h-4 w-4" /> Back
      </button>

      {/* Seller Header Banner */}
      <div className="mb-10 rounded-3xl border border-sand bg-paper p-6 md:p-8 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="flex flex-wrap items-center gap-5">
            <span
              className="flex h-20 w-20 flex-none items-center justify-center rounded-full text-2xl font-bold text-cream shadow-md"
              style={{ background: avatarGradient('seller') }}
            >
              {seller.avatar ? (
                <img
                  src={seller.avatar}
                  alt={seller.name}
                  className="h-20 w-20 rounded-full object-cover"
                />
              ) : (
                initialsOf(seller.name)
              )}
            </span>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="font-serif text-2xl font-bold text-ink md:text-3xl">
                  {seller.name}
                </h1>
                <BadgeCheck className="h-5 w-5 text-forest" />
              </div>
              {seller.createdAt && (
                <p className="text-xs text-sub mb-3">
                  Verified Seller · Member since {formatDate(seller.createdAt)}
                </p>
              )}

              {/* Stats badges */}
              <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-ink">
                <span className="flex items-center gap-1.5 rounded-full bg-avail px-3 py-1 text-forest">
                  <Users className="h-3.5 w-3.5" />
                  {stats.followerCount} {stats.followerCount === 1 ? 'Follower' : 'Followers'}
                </span>
                <span className="flex items-center gap-1.5 rounded-full bg-chip px-3 py-1 text-ink">
                  <TreePine className="h-3.5 w-3.5 text-forest" />
                  {stats.orchardCount} {stats.orchardCount === 1 ? 'Orchard' : 'Orchards'}
                </span>
              </div>
            </div>
          </div>

          {/* Follow Button */}
          <div>
            <FollowButton
              sellerId={seller._id}
              sellerName={seller.name}
              isFollowing={stats.isFollowing}
              followerCount={stats.followerCount}
              onFollowChange={(isFollowing, newCount) => {
                setStats((prev) =>
                  prev
                    ? {
                        ...prev,
                        isFollowing,
                        followerCount: newCount !== undefined ? newCount : prev.followerCount,
                      }
                    : null
                );
              }}
              size="lg"
            />
          </div>
        </div>

        {seller.bio && (
          <div className="mt-6 border-t border-sand/60 pt-4 text-sm leading-relaxed text-sub">
            <p className="italic">"{seller.bio}"</p>
          </div>
        )}
      </div>

      {/* Seller Orchards Section */}
      <section>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-serif text-2xl font-bold text-ink">
            Published Orchards ({orchards.length})
          </h2>
        </div>

        {orchards.length === 0 ? (
          <div className="rounded-2xl border border-sand bg-cream/50 p-8 text-center text-sub">
            <p>This seller has not published any active orchards at the moment.</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {orchards.map((o) => (
              <OrchardCard
                key={o._id}
                orchard={o}
                isSaved={isSaved(o._id)}
                isCompared={isCompared(o._id)}
                onToggleSave={toggleSave}
                onToggleCompare={toggleCompare}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function SellerProfileSkeleton() {
  return (
    <main className="mx-auto max-w-[1180px] px-6 pb-16 pt-6 space-y-8">
      <div className="sk h-5 w-24 rounded" />
      <div className="sk h-48 rounded-3xl" />
      <div className="sk h-8 w-48 rounded-lg" />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="sk h-72 rounded-2xl" />
        ))}
      </div>
    </main>
  );
}
