import React from 'react';
import { Star, Sparkles, Wrench, Navigation, MessageSquare } from 'lucide-react';
import { StarRating } from './StarRating';
import type { ReviewSummary } from '@/types';

interface RatingBreakdownProps {
  summary: ReviewSummary;
}

export const RatingBreakdown: React.FC<RatingBreakdownProps> = ({ summary }) => {
  const { ratingAverage, ratingCount, categoryAverages, distribution } = summary;

  const categories = [
    { label: 'Cleanliness', score: categoryAverages?.cleanliness || 0, icon: Sparkles },
    { label: 'Maintenance', score: categoryAverages?.maintenance || 0, icon: Wrench },
    { label: 'Accessibility', score: categoryAverages?.accessibility || 0, icon: Navigation },
    { label: 'Owner Communication', score: categoryAverages?.communication || 0, icon: MessageSquare },
  ];

  return (
    <div className="rounded-2xl border border-sand bg-cream p-6 shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* Overall Score */}
        <div className="md:col-span-4 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-sand pb-6 md:pb-0 md:pr-6 text-center">
          <div className="font-serif text-5xl font-extrabold text-ink tracking-tight">
            {ratingAverage > 0 ? ratingAverage.toFixed(1) : '0.0'}
          </div>
          <div className="my-2">
            <StarRating value={ratingAverage} size="lg" />
          </div>
          <p className="text-xs font-semibold text-sub">
            Based on {ratingCount} verified {ratingCount === 1 ? 'review' : 'reviews'}
          </p>
        </div>

        {/* Category Ratings */}
        <div className="md:col-span-4 space-y-3.5 border-b md:border-b-0 md:border-r border-sand pb-6 md:pb-0 md:pr-6">
          <h4 className="text-xs font-bold uppercase tracking-wider text-faint mb-2">
            Category Ratings
          </h4>
          {categories.map(({ label, score, icon: Icon }) => (
            <div key={label} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-ink font-medium">
                <Icon className="h-3.5 w-3.5 text-forest" />
                <span>{label}</span>
              </div>
              <div className="flex items-center gap-1.5 font-bold text-ink">
                <span>{score > 0 ? score.toFixed(1) : '5.0'}</span>
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              </div>
            </div>
          ))}
        </div>

        {/* Star Rating Distribution Bars */}
        <div className="md:col-span-4 space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-faint mb-2">
            Rating Distribution
          </h4>
          {[5, 4, 3, 2, 1].map((stars) => {
            const count = distribution?.[stars as keyof typeof distribution] || 0;
            const percentage = ratingCount > 0 ? Math.round((count / ratingCount) * 100) : 0;

            return (
              <div key={stars} className="flex items-center gap-2 text-xs">
                <div className="flex items-center gap-1 w-12 font-medium text-sub">
                  <span>{stars}</span>
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                </div>
                <div className="flex-1 h-2 rounded-full bg-sand/70 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-forest transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="w-8 text-right font-mono text-[11px] text-faint">{count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
