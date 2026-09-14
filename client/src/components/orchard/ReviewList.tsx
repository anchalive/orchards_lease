import React from 'react';
import { ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { ReviewCard } from './ReviewCard';
import type { Review, PageMeta } from '@/types';

interface ReviewListProps {
  reviews: Review[];
  meta?: PageMeta;
  loading?: boolean;
  sort: 'newest' | 'highest' | 'lowest';
  onSortChange: (sort: 'newest' | 'highest' | 'lowest') => void;
  onPageChange: (page: number) => void;
  onEditReview?: (review: Review) => void;
  onDeleteReview?: (reviewId: string) => void;
}

export const ReviewList: React.FC<ReviewListProps> = ({
  reviews,
  meta,
  loading = false,
  sort,
  onSortChange,
  onPageChange,
  onEditReview,
  onDeleteReview,
}) => {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="sk h-32 rounded-xl" />
        ))}
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="rounded-xl border border-sand bg-cream p-8 text-center">
        <p className="text-sm font-semibold text-sub">No reviews match the selected filter.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header controls bar */}
      <div className="flex items-center justify-between pb-2 border-b border-sand">
        <span className="text-xs font-bold uppercase tracking-wider text-faint">
          {meta?.total || reviews.length} {meta?.total === 1 ? 'Review' : 'Reviews'}
        </span>
        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-3.5 w-3.5 text-faint" />
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value as 'newest' | 'highest' | 'lowest')}
            className="rounded-lg border border-sand bg-cream px-2.5 py-1 text-xs font-semibold text-ink focus:outline-none focus:ring-1 focus:ring-forest"
          >
            <option value="newest">Most Recent</option>
            <option value="highest">Highest Rated</option>
            <option value="lowest">Lowest Rated</option>
          </select>
        </div>
      </div>

      {/* Review cards list */}
      <div className="space-y-3.5">
        {reviews.map((review) => (
          <ReviewCard
            key={review._id}
            review={review}
            onEdit={onEditReview}
            onDelete={onDeleteReview}
          />
        ))}
      </div>

      {/* Pagination controls */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-sand">
          <span className="text-xs text-faint">
            Page {meta.page} of {meta.totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(meta.page - 1)}
              disabled={!meta.hasPrevPage}
              className="flex items-center gap-1 rounded-lg border border-sand bg-cream px-3 py-1.5 text-xs font-semibold text-ink disabled:opacity-40 disabled:cursor-not-allowed hover:bg-sand/60 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <button
              onClick={() => onPageChange(meta.page + 1)}
              disabled={!meta.hasNextPage}
              className="flex items-center gap-1 rounded-lg border border-sand bg-cream px-3 py-1.5 text-xs font-semibold text-ink disabled:opacity-40 disabled:cursor-not-allowed hover:bg-sand/60 transition-colors"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
