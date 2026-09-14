import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/cn';

interface RecommendationReasonProps {
  reasons: string[];
  limit?: number;
  className?: string;
  variant?: 'compact' | 'full';
}

export const RecommendationReason: React.FC<RecommendationReasonProps> = ({
  reasons = [],
  limit = 2,
  className,
  variant = 'compact',
}) => {
  if (!reasons || reasons.length === 0) return null;
  const displayedReasons = reasons.slice(0, limit);

  if (variant === 'compact') {
    return (
      <div className={cn('flex flex-wrap gap-1.5', className)}>
        {displayedReasons.map((reason, idx) => (
          <span
            key={idx}
            className="inline-flex items-center gap-1 rounded-md bg-forest/10 px-2 py-0.5 text-[11px] font-semibold text-forest border border-forest/20"
          >
            <CheckCircle2 className="h-3 w-3 flex-none text-forest" />
            <span className="truncate max-w-[22ch]">{reason}</span>
          </span>
        ))}
      </div>
    );
  }

  return (
    <ul className={cn('space-y-1 text-xs text-sub', className)}>
      {displayedReasons.map((reason, idx) => (
        <li key={idx} className="flex items-start gap-1.5 text-forest font-medium">
          <CheckCircle2 className="h-3.5 w-3.5 flex-none text-forest mt-0.5" />
          <span>{reason}</span>
        </li>
      ))}
    </ul>
  );
};
