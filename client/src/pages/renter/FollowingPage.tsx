import { useEffect, useState } from 'react';
import { Search, Star } from 'lucide-react';
import { followService } from '@/services/follow.service';
import { useToast } from '@/context/ToastContext';
import { getErrorMessage } from '@/lib/apiClient';
import { FollowingSellerCard } from '@/components/follow/FollowingSellerCard';
import { EmptyFollowingState } from '@/components/follow/EmptyFollowingState';
import type { FollowedSeller } from '@/types';

export default function FollowingPage() {
  const toast = useToast();
  const [following, setFollowing] = useState<FollowedSeller[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const loadFollowing = async () => {
    setLoading(true);
    try {
      const data = await followService.getFollowing();
      setFollowing(data);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFollowing();
  }, []);

  const handleUnfollow = async (sellerId: string) => {
    try {
      await followService.unfollowSeller(sellerId);
      setFollowing((prev) => prev.filter((item) => item.seller._id !== sellerId));
      toast.success('Removed seller from followed list');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const filteredFollowing = following.filter((item) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const nameMatch = item.seller.name?.toLowerCase().includes(q);
    const orchardMatch = item.latestOrchard?.gardenName?.toLowerCase().includes(q);
    const districtMatch = item.latestOrchard?.district?.toLowerCase().includes(q);
    return nameMatch || orchardMatch || districtMatch;
  });

  return (
    <main className="mx-auto max-w-[1280px] px-6 py-8">
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-sand pb-6">
        <div>
          <div className="flex items-center gap-2 text-forest font-bold text-sm mb-1">
            <Star className="h-4 w-4 fill-forest" />
            <span>Renter Dashboard</span>
          </div>
          <h1 className="font-serif text-3xl font-bold text-ink">Followed Sellers</h1>
          <p className="mt-1 text-sm text-sub">
            Manage your trusted sellers and view their latest orchard listings.
          </p>
        </div>

        {following.length > 0 && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-sand bg-cream px-3.5 py-2">
              <Search className="h-4 w-4 text-faint" />
              <input
                type="text"
                placeholder="Search sellers or locations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-48 bg-transparent text-xs text-ink outline-none placeholder:text-faint sm:w-64"
              />
            </div>
            <div className="rounded-xl border border-sand bg-cream px-4 py-2 text-xs font-bold text-ink">
              {following.length} {following.length === 1 ? 'Seller' : 'Sellers'}
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <FollowingSkeleton />
      ) : following.length === 0 ? (
        <EmptyFollowingState />
      ) : filteredFollowing.length === 0 ? (
        <div className="py-12 text-center text-sub">
          <p>No followed sellers matching "{searchQuery}".</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredFollowing.map((item) => (
            <FollowingSellerCard key={item._id} item={item} onUnfollow={handleUnfollow} />
          ))}
        </div>
      )}
    </main>
  );
}

function FollowingSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-64 rounded-2xl border border-sand bg-paper p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="sk h-12 w-12 rounded-full" />
            <div className="space-y-2 flex-1">
              <div className="sk h-4 w-32 rounded" />
              <div className="sk h-3 w-24 rounded" />
            </div>
          </div>
          <div className="sk h-16 rounded-xl" />
          <div className="sk h-9 rounded-xl" />
        </div>
      ))}
    </div>
  );
}
