import { Star } from 'lucide-react';
import { cn } from '@/lib/cn';

interface FollowerBadgeProps {
  className?: string;
  size?: 'sm' | 'md';
}

export function FollowerBadge({ className, size = 'sm' }: FollowerBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-bold text-amber-900 bg-amber-100 border border-amber-300/70 shadow-xs rounded-full',
        size === 'sm' ? 'px-2.5 py-0.5 text-[11px]' : 'px-3 py-1 text-xs',
        className
      )}
    >
      <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
      <span>Following Seller</span>
    </span>
  );
}
