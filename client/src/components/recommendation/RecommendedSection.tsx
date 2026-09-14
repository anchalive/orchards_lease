import React from 'react';
import { Sparkles, RefreshCw, AlertCircle } from 'lucide-react';
import { OrchardCardSkeleton } from '@/components/orchard/OrchardCard';
import { RecommendationCard } from './RecommendationCard';
import { Button, EmptyState } from '@/components/ui';
import { useMarketplace } from '@/context/MarketplaceContext';
import type { RecommendationItem } from '@/types';

interface RecommendedSectionProps {
  title?: string;
  subtitle?: string;
  items: RecommendationItem[];
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  maxItems?: number;
  badgeText?: string;
  className?: string;
}

export const RecommendedSection: React.FC<RecommendedSectionProps> = ({
  title = 'Recommended For You',
  subtitle = 'Smart personalized picks based on your activity, preferences, and verified orchard performance.',
  items = [],
  isLoading = false,
  error = null,
  onRetry,
  maxItems = 6,
  badgeText = 'AI Smart Recommendations',
  className = '',
}) => {
  const { isSaved, isCompared, toggleSave, toggleCompare } = useMarketplace();
  const displayedItems = items.slice(0, maxItems);

  if (error) {
    return (
      <section className={`py-6 ${className}`}>
        <div className="rounded-2xl border border-terra/30 bg-terra/5 p-6 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-terra mb-2" />
          <h3 className="font-serif text-lg font-bold text-ink mb-1">Failed to load recommendations</h3>
          <p className="text-xs text-sub mb-4">{error}</p>
          {onRetry && (
            <Button size="sm" variant="outline" onClick={onRetry} className="inline-flex items-center gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" /> Retry
            </Button>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className={`py-6 ${className}`}>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full bg-forest/10 px-3 py-1 text-xs font-bold text-forest">
            <Sparkles className="h-3.5 w-3.5 text-forest animate-pulse" />
            <span>{badgeText}</span>
          </div>
          <h2 className="font-serif text-2xl font-bold text-ink">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-sub">{subtitle}</p>}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(258px,1fr))] gap-5">
          {Array.from({ length: maxItems > 4 ? 4 : maxItems }).map((_, i) => (
            <OrchardCardSkeleton key={i} />
          ))}
        </div>
      ) : displayedItems.length === 0 ? (
        <EmptyState
          emoji="💡"
          title="No recommendations available yet"
          description="Explore and save orchards to get tailored recommendation matches."
        />
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(258px,1fr))] gap-5">
          {displayedItems.map((item) => (
            <RecommendationCard
              key={item.orchard._id}
              item={item}
              isSaved={isSaved(item.orchard._id)}
              isCompared={isCompared(item.orchard._id)}
              onToggleSave={toggleSave}
              onToggleCompare={toggleCompare}
            />
          ))}
        </div>
      )}
    </section>
  );
};
