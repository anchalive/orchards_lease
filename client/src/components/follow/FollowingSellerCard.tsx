import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, User, TreePine, Users, Trash2 } from 'lucide-react';
import { avatarGradient, initialsOf } from '@/lib/avatar';
import { Button } from '@/components/ui';
import { SellerQuickViewModal } from './SellerQuickViewModal';
import type { FollowedSeller } from '@/types';

interface FollowingSellerCardProps {
  item: FollowedSeller;
  onUnfollow: (sellerId: string) => Promise<void>;
}

export function FollowingSellerCard({ item, onUnfollow }: FollowingSellerCardProps) {
  const navigate = useNavigate();
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const [unfollowing, setUnfollowing] = useState(false);

  const seller = item.seller;
  const latestOrchard = item.latestOrchard;

  const handleUnfollow = async () => {
    setUnfollowing(true);
    try {
      await onUnfollow(seller._id);
    } finally {
      setUnfollowing(false);
    }
  };

  return (
    <>
      <div className="flex flex-col justify-between rounded-2xl border border-sand bg-paper p-5 shadow-sm hover:shadow-card transition-all duration-200">
        {/* Top: Seller Info Header */}
        <div>
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <span
                className="flex h-12 w-12 flex-none items-center justify-center rounded-full text-sm font-bold text-cream shadow-xs"
                style={{ background: avatarGradient('seller') }}
              >
                {seller.avatar ? (
                  <img
                    src={seller.avatar}
                    alt={seller.name}
                    className="h-12 w-12 rounded-full object-cover"
                  />
                ) : (
                  initialsOf(seller.name)
                )}
              </span>
              <div>
                <h3
                  onClick={() => navigate(`/sellers/${seller._id}`)}
                  className="font-serif text-lg font-bold text-ink hover:text-forest transition-colors cursor-pointer"
                >
                  {seller.name}
                </h3>
                <div className="flex items-center gap-3 text-xs text-sub mt-0.5">
                  <span className="flex items-center gap-1 font-medium">
                    <Users className="h-3.5 w-3.5 text-forest" />
                    {item.followerCount} {item.followerCount === 1 ? 'follower' : 'followers'}
                  </span>
                  <span className="flex items-center gap-1 font-medium">
                    <TreePine className="h-3.5 w-3.5 text-forest" />
                    {item.orchardCount} {item.orchardCount === 1 ? 'orchard' : 'orchards'}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={handleUnfollow}
              disabled={unfollowing}
              title="Unfollow seller"
              className="rounded-xl border border-sand p-2 text-faint hover:border-red-200 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          {seller.bio && (
            <p className="text-xs leading-relaxed text-sub line-clamp-2 mb-4 italic">"{seller.bio}"</p>
          )}

          {/* Latest Orchard Highlight */}
          <div className="mb-4 rounded-xl border border-sand/70 bg-cream/60 p-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-faint mb-1.5">
              Latest Listing
            </div>
            {latestOrchard ? (
              <div className="flex items-center gap-3">
                {latestOrchard.thumbnail && (
                  <img
                    src={latestOrchard.thumbnail}
                    alt=""
                    className="h-11 w-11 rounded-lg object-cover flex-none bg-sand"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold text-ink">
                    {latestOrchard.gardenName}
                  </div>
                  <div className="text-xs text-sub truncate">
                    {latestOrchard.district}, {latestOrchard.state}
                  </div>
                </div>
                <button
                  onClick={() => setQuickViewOpen(true)}
                  className="flex items-center gap-1 rounded-lg bg-chip px-2.5 py-1 text-xs font-bold text-forest hover:bg-avail transition-colors cursor-pointer flex-none"
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>Quick View</span>
                </button>
              </div>
            ) : (
              <p className="text-xs text-faint italic">No active published orchards listed yet.</p>
            )}
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-sand/60">
          <Button
            variant="outline"
            className="w-full flex items-center justify-center gap-1.5 text-xs py-2"
            onClick={() => navigate(`/sellers/${seller._id}`)}
          >
            <User className="h-3.5 w-3.5" />
            <span>Visit Profile</span>
          </Button>
        </div>
      </div>

      {quickViewOpen && (
        <SellerQuickViewModal
          sellerName={seller.name}
          orchard={latestOrchard || null}
          onClose={() => setQuickViewOpen(false)}
        />
      )}
    </>
  );
}
