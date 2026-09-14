import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/cn';

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  readOnly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export const StarRating: React.FC<StarRatingProps> = ({
  value,
  onChange,
  readOnly = true,
  size = 'md',
  showLabel = false,
  className,
}) => {
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const starSizes = {
    sm: 'h-3.5 w-3.5',
    md: 'h-5 w-5',
    lg: 'h-7 w-7',
  };

  const activeValue = hoverValue !== null ? hoverValue : value;

  return (
    <div className={cn('inline-flex items-center gap-1', className)}>
      <div className="flex items-center gap-0.5" onMouseLeave={() => !readOnly && setHoverValue(null)}>
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = activeValue >= star;
          const isHalf = !isFilled && activeValue >= star - 0.5;

          return (
            <button
              key={star}
              type="button"
              disabled={readOnly}
              onClick={() => !readOnly && onChange && onChange(star)}
              onMouseEnter={() => !readOnly && setHoverValue(star)}
              className={cn(
                'transition-transform duration-100 focus:outline-none',
                readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110'
              )}
            >
              <Star
                className={cn(
                  starSizes[size],
                  isFilled
                    ? 'fill-amber-400 text-amber-400'
                    : isHalf
                    ? 'fill-amber-400/50 text-amber-400'
                    : 'fill-stone-200 text-stone-300 dark:fill-stone-700 dark:text-stone-600'
                )}
              />
            </button>
          );
        })}
      </div>
      {showLabel && (
        <span className="ml-1.5 text-xs font-semibold text-stone-700 dark:text-stone-300">
          {value > 0 ? value.toFixed(1) : 'No ratings'}
        </span>
      )}
    </div>
  );
};
