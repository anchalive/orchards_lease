import React, { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { StarRating } from './StarRating';
import { Button } from '@/components/ui';
import { reviewService } from '@/services/review.service';
import { useToast } from '@/context/ToastContext';
import { getErrorMessage } from '@/lib/apiClient';
import type { Review, Booking } from '@/types';

interface WriteReviewModalProps {
  orchardId: string;
  gardenName: string;
  booking?: Booking | null;
  existingReview?: Review | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const WriteReviewModal: React.FC<WriteReviewModalProps> = ({
  orchardId,
  gardenName,
  booking,
  existingReview,
  onClose,
  onSuccess,
}) => {
  const toast = useToast();
  const [rating, setRating] = useState(existingReview?.rating || 5);
  const [cleanliness, setCleanliness] = useState(existingReview?.cleanlinessRating || 5);
  const [maintenance, setMaintenance] = useState(existingReview?.maintenanceRating || 5);
  const [accessibility, setAccessibility] = useState(existingReview?.accessibilityRating || 5);
  const [communication, setCommunication] = useState(existingReview?.communicationRating || 5);
  const [comment, setComment] = useState(existingReview?.comment || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!existingReview;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditing && !booking) {
      setError('A completed booking is required to submit a review');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      if (isEditing && existingReview) {
        await reviewService.updateReview(existingReview._id, {
          rating,
          cleanlinessRating: cleanliness,
          maintenanceRating: maintenance,
          accessibilityRating: accessibility,
          communicationRating: communication,
          comment,
        });
        toast.success('Review updated successfully!');
      } else if (booking) {
        await reviewService.createReview(orchardId, {
          orchardId,
          bookingId: booking._id,
          rating,
          cleanlinessRating: cleanliness,
          maintenanceRating: maintenance,
          accessibilityRating: accessibility,
          communicationRating: communication,
          comment,
        });
        toast.success('Review submitted successfully!');
      }
      onSuccess();
      onClose();
    } catch (err) {
      const msg = getErrorMessage(err);
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-2xl bg-cream p-6 shadow-xl border border-sand">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-faint hover:bg-sand/60 hover:text-ink transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <h3 className="font-serif text-xl font-bold text-ink mb-1">
          {isEditing ? 'Edit Your Review' : 'Write a Verified Review'}
        </h3>
        <p className="text-xs text-sub mb-5">
          Share your experience renting <span className="font-semibold text-ink">{gardenName}</span>
        </p>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700 border border-red-200">
            <AlertCircle className="h-4 w-4 flex-none" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Overall Rating */}
          <div className="rounded-xl bg-chip/60 p-4 border border-sand/60 text-center">
            <label className="block text-xs font-bold uppercase tracking-wider text-faint mb-2">
              Overall Rating
            </label>
            <div className="flex justify-center">
              <StarRating
                value={rating}
                readOnly={false}
                size="lg"
                onChange={(val) => {
                  setRating(val);
                  if (!isEditing) {
                    setCleanliness(val);
                    setMaintenance(val);
                    setAccessibility(val);
                    setCommunication(val);
                  }
                }}
              />
            </div>
          </div>

          {/* Category Ratings */}
          <div className="space-y-3 rounded-xl bg-chip/30 p-4 border border-sand/60">
            <h4 className="text-xs font-bold uppercase tracking-wider text-faint mb-1">
              Category Ratings
            </h4>

            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-ink">Cleanliness</span>
              <StarRating value={cleanliness} readOnly={false} size="sm" onChange={setCleanliness} />
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-ink">Maintenance</span>
              <StarRating value={maintenance} readOnly={false} size="sm" onChange={setMaintenance} />
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-ink">Accessibility</span>
              <StarRating value={accessibility} readOnly={false} size="sm" onChange={setAccessibility} />
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-ink">Owner Communication</span>
              <StarRating value={communication} readOnly={false} size="sm" onChange={setCommunication} />
            </div>
          </div>

          {/* Written Comment */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-ink">Written Review</label>
              <span className="text-[11px] text-faint">{comment.length} / 2000</span>
            </div>
            <textarea
              rows={4}
              maxLength={2000}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Describe the condition of the orchard, fruit quality, owner support, and access roads..."
              className="w-full rounded-xl border border-sand bg-cream p-3 text-sm text-ink placeholder:text-faint focus:border-forest focus:outline-none focus:ring-1 focus:ring-forest"
            />
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-sand">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Submitting...' : isEditing ? 'Update Review' : 'Post Review'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
