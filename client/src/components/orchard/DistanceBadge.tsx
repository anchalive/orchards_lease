import { useLocation } from '@/context/LocationContext';
import { Navigation, Loader2 } from 'lucide-react';
import type { Orchard } from '@/types';
import { cn } from '@/lib/cn';

interface DistanceBadgeProps {
  orchard: Orchard;
  variant?: 'card' | 'detail' | 'compact';
  className?: string;
}

export function DistanceBadge({ orchard, variant = 'card', className }: DistanceBadgeProps) {
  const { userLocation, status, requestLocation, getDistanceTo } = useLocation();

  const distInfo = getDistanceTo(orchard);

  if (!userLocation) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          requestLocation();
        }}
        disabled={status === 'locating'}
        title="Click to enable location & see distance"
        className={cn(
          'inline-flex items-center gap-1 rounded-full border border-sand bg-cream/90 px-2.5 py-1 text-[11.5px] font-semibold text-sub hover:border-forest hover:text-forest transition-colors',
          className
        )}
      >
        {status === 'locating' ? (
          <Loader2 className="h-3 w-3 animate-spin text-forest" />
        ) : (
          <Navigation className="h-3 w-3 text-forest" />
        )}
        <span>{status === 'locating' ? 'Locating…' : 'Check distance'}</span>
      </button>
    );
  }

  if (!distInfo) return null;

  if (variant === 'compact') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 text-[11.5px] font-bold text-forest',
          className
        )}
      >
        <Navigation className="h-3 w-3" />
        {distInfo.formattedDistance}
      </span>
    );
  }

  if (variant === 'detail') {
    return (
      <div className={cn('flex items-center gap-2 rounded-xl border border-avail bg-[#f2f7ef] px-3.5 py-2.5', className)}>
        <div className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-forest text-cream">
          <Navigation className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="font-serif text-[15px] font-bold text-forest">{distInfo.formattedDistance} away</span>
            <span className="text-xs font-semibold text-sub">({distInfo.formattedRoadDistance} road trip)</span>
          </div>
          <div className="text-[12px] text-faint">
            Estimated travel: <strong className="font-semibold text-ink">{distInfo.formattedTravelTime}</strong> from your location
          </div>
        </div>
      </div>
    );
  }

  // Default 'card' variant
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-[#f2f7ef] px-2.5 py-0.5 text-[11.5px] font-bold text-forest border border-[#d2e5ca]',
        className
      )}
    >
      <Navigation className="h-3 w-3 text-forest flex-none" />
      <span>{distInfo.formattedDistance}</span>
      <span className="font-normal text-sub">· {distInfo.formattedTravelTime}</span>
    </span>
  );
}
