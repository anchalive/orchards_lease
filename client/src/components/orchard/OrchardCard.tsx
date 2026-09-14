import { Link } from 'react-router-dom';
import { Heart, MapPin, Star, GitCompareArrows } from 'lucide-react';
import { formatCurrency, titleCase } from '@/lib/format';
import { orchardSurface } from '@/lib/gradients';
import { cn } from '@/lib/cn';
import { DistanceBadge } from './DistanceBadge';
import type { Orchard } from '@/types';
import { HarvestBadge } from './HarvestTimeline';
import { FollowerBadge } from '../follow/FollowerBadge';

interface OrchardCardProps {
  orchard: Orchard;
  isSaved?: boolean;
  isCompared?: boolean;
  isFollowingSeller?: boolean;
  onToggleSave?: (id: string) => void;
  onToggleCompare?: (id: string) => void;
}

export function OrchardCard({
  orchard,
  isSaved,
  isCompared,
  isFollowingSeller,
  onToggleSave,
  onToggleCompare,
}: OrchardCardProps) {
  const surface = orchardSurface(orchard.thumbnail, orchard.fruitTypes, orchard._id);
  const rent = orchard.rentType?.startsWith('per') ? orchard.rentType : `per ${orchard.rentType}`;

  return (
    <Link
      to={`/orchards/${orchard.slug}`}
      className="group flex animate-fadeup flex-col overflow-hidden rounded-2xl border border-sand bg-cream transition-all hover:-translate-y-[3px] hover:shadow-card"
    >
      {/* Image / gradient */}
      <div className="relative h-[190px]" style={surface}>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[rgba(20,30,15,.42)]" />

        {/* badges */}
        <div className="absolute left-3 top-3 flex gap-1.5 flex-wrap">
          {isFollowingSeller && <FollowerBadge size="sm" />}
          <HarvestBadge harvestSeasons={orchard.harvestSeasons} />
          <span
            className={cn(
              'rounded-full px-2.5 py-1 text-[11.5px] font-bold tracking-[.02em]',
              orchard.available ? 'bg-avail text-forest' : 'bg-[#efe7df] text-[#9a7b5a]'
            )}
          >
            {orchard.available ? 'Available now' : 'Booked out'}
          </span>
          {orchard.isFeatured && (
            <span className="rounded-full bg-gold px-2.5 py-1 text-[11.5px] font-bold text-cream">
              Featured
            </span>
          )}
          {orchard.healthScore && (
            <span
              className={cn(
                'rounded-full px-2.5 py-1 text-[11.5px] font-bold tracking-[.02em] border shadow-sm',
                orchard.healthScore.score >= 90
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : orchard.healthScore.score >= 75
                    ? 'bg-green-50 text-green-800 border-green-200'
                    : orchard.healthScore.score >= 60
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : 'bg-orange-50/70 text-terra border-orange-200'
              )}
            >
              🌱 {orchard.healthScore.rating} {orchard.healthScore.score}/100
            </span>
          )}
        </div>

        {/* actions */}
        <div className="absolute right-2.5 top-2.5 flex gap-1.5">
          {onToggleCompare && (
            <button
              onClick={(e) => {
                e.preventDefault();
                onToggleCompare(orchard._id);
              }}
              title="Compare"
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full border backdrop-blur-sm transition-colors',
                isCompared
                  ? 'border-forest bg-forest text-cream'
                  : 'border-sand bg-cream/90 text-sub'
              )}
            >
              <GitCompareArrows className="h-[15px] w-[15px]" />
            </button>
          )}
          {onToggleSave && (
            <button
              onClick={(e) => {
                e.preventDefault();
                onToggleSave(orchard._id);
              }}
              title="Save"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-cream/90 backdrop-blur-sm"
            >
              <Heart
                className={cn('h-4 w-4', isSaved ? 'fill-terra text-terra' : 'text-sub')}
              />
            </button>
          )}
        </div>

        <div className="absolute bottom-2.5 left-3 text-[10.5px] font-bold uppercase tracking-[.1em] text-cream/80">
          {orchard.fruitTypes[0]}
        </div>
      </div>

      {/* Body */}
      <div className="px-4 pb-4 pt-3.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-serif text-[16.5px] font-semibold leading-[1.18] text-ink">
            {orchard.gardenName}
          </h3>
          {orchard.ratingCount > 0 && (
            <span className="mt-0.5 flex flex-none items-center gap-1 text-[13px] font-bold text-ink">
              <Star className="h-[13px] w-[13px] fill-gold text-gold" />
              {orchard.ratingAverage.toFixed(1)}
            </span>
          )}
        </div>

        <div className="mb-2.5 mt-1 flex flex-wrap items-center justify-between gap-1 text-[12.5px]">
          <span className="flex items-center gap-1 text-faint">
            <MapPin className="h-3 w-3" />
            {orchard.district}, {orchard.state}
          </span>
          <DistanceBadge orchard={orchard} variant="card" />
        </div>

        <div className="mb-3 flex gap-3.5 text-xs text-sub">
          <span>🌳 {orchard.totalTrees} trees</span>
          {orchard.expectedYield > 0 && <span>~{orchard.expectedYield.toLocaleString()} kg</span>}
        </div>

        <div className="flex items-baseline justify-between border-t border-chip pt-3">
          <span>
            <b className="font-serif text-[19px] text-terra">{formatCurrency(orchard.price)}</b>{' '}
            <span className="text-xs text-faint">{rent}</span>
          </span>
          <span className="text-xs text-faint">
            {orchard.ratingCount} {orchard.ratingCount === 1 ? 'review' : 'reviews'}
          </span>
        </div>
      </div>
    </Link>
  );
}

export function OrchardCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-sand bg-cream">
      <div className="sk h-[190px]" />
      <div className="space-y-3 p-4">
        <div className="sk h-4 w-3/4 rounded" />
        <div className="sk h-3 w-1/2 rounded" />
        <div className="sk h-6 w-1/3 rounded" />
      </div>
    </div>
  );
}

export { titleCase };
