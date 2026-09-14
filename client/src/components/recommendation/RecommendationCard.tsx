import React from 'react';
import { OrchardCard } from '@/components/orchard/OrchardCard';
import { RecommendationBadge } from './RecommendationBadge';
import { RecommendationReason } from './RecommendationReason';
import type { RecommendationItem } from '@/types';

interface RecommendationCardProps {
  item: RecommendationItem;
  isSaved?: boolean;
  isCompared?: boolean;
  onToggleSave?: (id: string) => void;
  onToggleCompare?: (id: string) => void;
  className?: string;
}

export const RecommendationCard: React.FC<RecommendationCardProps> = ({
  item,
  isSaved = false,
  isCompared = false,
  onToggleSave,
  onToggleCompare,
  className,
}) => {
  const { orchard, score, reasons } = item;

  return (
    <div className={`group relative flex flex-col transition-transform hover:-translate-y-1 ${className || ''}`}>
      {/* Match Score Badge Overlay */}
      <div className="absolute right-3 top-3 z-10">
        <RecommendationBadge score={score} />
      </div>

      {/* Main Orchard Card */}
      <OrchardCard
        orchard={orchard}
        isSaved={isSaved}
        isCompared={isCompared}
        onToggleSave={onToggleSave}
        onToggleCompare={onToggleCompare}
      />

      {/* Recommendation Reasons Strip */}
      {reasons && reasons.length > 0 && (
        <div className="mt-2 px-1">
          <RecommendationReason reasons={reasons} limit={2} />
        </div>
      )}
    </div>
  );
};
