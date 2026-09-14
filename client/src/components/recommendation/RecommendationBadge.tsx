import React from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/cn';

interface RecommendationBadgeProps {
  score: number;
  className?: string;
  showIcon?: boolean;
}

export const RecommendationBadge: React.FC<RecommendationBadgeProps> = ({
  score,
  className,
  showIcon = true,
}) => {
  const roundedScore = Math.round(score);

  const getGradient = (val: number) => {
    if (val >= 85) return 'from-emerald-600 to-teal-700 text-white shadow-emerald-900/20';
    if (val >= 70) return 'from-amber-600 to-orange-600 text-white shadow-amber-900/20';
    return 'from-forest to-forest-dark text-cream shadow-forest/20';
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r px-2.5 py-0.5 text-xs font-bold shadow-sm backdrop-blur-sm',
        getGradient(roundedScore),
        className
      )}
    >
      {showIcon && <Sparkles className="h-3 w-3 animate-pulse flex-none" />}
      <span>{roundedScore}% Match</span>
    </span>
  );
};
