import React, { useState } from 'react';
import { BadgeCheck, Flag, Edit2, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { StarRating } from './StarRating';
import { formatDate } from '@/lib/format';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { reviewService } from '@/services/review.service';
import type { Review } from '@/types';
import { cn } from '@/lib/cn';

interface ReviewCardProps {
  review: Review;
  onEdit?: (review: Review) => void;
  onDelete?: (reviewId: string) => void;
}

export const ReviewCard: React.FC<ReviewCardProps> = ({ review, onEdit, onDelete }) => {
  const { user } = useAuth();
  const toast = useToast();
  const [showCategories, setShowCategories] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reported, setReported] = useState(review.isReported || false);

  const renterName = typeof review.renterId === 'object' ? review.renterId?.name : 'Renter';
  const renterAvatar = typeof review.renterId === 'object' ? review.renterId?.avatar : undefined;
  const renterIdStr = typeof review.renterId === 'object' ? review.renterId?._id : review.renterId;

  const isAuthor = user && renterIdStr === user.id;
  const isAdmin = user?.role === 'admin';

  const handleReport = async () => {
    if (reported || reporting) return;
    setReporting(true);
    try {
      await reviewService.reportReview(review._id);
      setReported(true);
      toast.success('Review reported to site administrators');
    } catch {
      toast.error('Failed to report review');
    } finally {
      setReporting(false);
    }
  };

  const hasCategoryRatings =
    review.cleanlinessRating ||
    review.maintenanceRating ||
    review.accessibilityRating ||
    review.communicationRating;

  return (
    <div className="rounded-xl border border-sand bg-cream p-5 transition-shadow hover:shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-3">
        {/* Author info */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-forest text-sm font-bold text-cream">
            {renterAvatar ? (
              <img src={renterAvatar} alt={renterName} className="h-10 w-10 rounded-full object-cover" />
            ) : (
              renterName?.slice(0, 2).toUpperCase()
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5 font-bold text-ink text-sm">
              <span>{renterName}</span>
              <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                <BadgeCheck className="h-3 w-3 text-emerald-600" />
                Verified Renter
              </span>
            </div>
            <div className="text-xs text-faint">{formatDate(review.createdAt)}</div>
          </div>
        </div>

        {/* Action button menu */}
        <div className="relative">
          {(isAuthor || isAdmin) ? (
            <div className="flex items-center gap-1">
              {onEdit && (
                <button
                  onClick={() => onEdit(review)}
                  title="Edit review"
                  className="rounded-lg p-1.5 text-sub hover:bg-sand/60 hover:text-ink transition-colors"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => onDelete(review._id)}
                  title="Delete review"
                  className="rounded-lg p-1.5 text-sub hover:bg-red-50 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={handleReport}
              disabled={reported || reporting}
              title={reported ? 'Reported' : 'Report review'}
              className={cn(
                'flex items-center gap-1 text-xs font-semibold rounded-lg px-2.5 py-1 transition-colors',
                reported
                  ? 'bg-amber-50 text-amber-700 cursor-default'
                  : 'text-sub hover:bg-sand/60 hover:text-ink'
              )}
            >
              <Flag className="h-3.5 w-3.5" />
              <span>{reported ? 'Reported' : 'Report'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Ratings Header */}
      <div className="flex items-center justify-between my-2">
        <StarRating value={review.rating} size="sm" showLabel />
        {hasCategoryRatings && (
          <button
            onClick={() => setShowCategories(!showCategories)}
            className="flex items-center gap-1 text-xs font-medium text-forest hover:underline focus:outline-none"
          >
            <span>Category details</span>
            {showCategories ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>

      {/* Category details collapse */}
      {showCategories && hasCategoryRatings && (
        <div className="my-3 grid grid-cols-2 gap-2 rounded-lg bg-chip/60 p-3 text-xs border border-sand/60">
          <div>
            <span className="text-faint">Cleanliness: </span>
            <span className="font-bold text-ink">{review.cleanlinessRating || review.rating}★</span>
          </div>
          <div>
            <span className="text-faint">Maintenance: </span>
            <span className="font-bold text-ink">{review.maintenanceRating || review.rating}★</span>
          </div>
          <div>
            <span className="text-faint">Accessibility: </span>
            <span className="font-bold text-ink">{review.accessibilityRating || review.rating}★</span>
          </div>
          <div>
            <span className="text-faint">Communication: </span>
            <span className="font-bold text-ink">{review.communicationRating || review.rating}★</span>
          </div>
        </div>
      )}

      {/* Comment */}
      <p className="text-sm leading-relaxed text-ink mt-2 whitespace-pre-line">{review.comment}</p>
    </div>
  );
};
