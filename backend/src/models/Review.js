import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    orchardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Orchard',
      required: true,
      index: true,
    },
    renterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
    },

    rating: { type: Number, required: true, min: 1, max: 5 },
    cleanlinessRating: { type: Number, required: true, min: 1, max: 5, default: 5 },
    maintenanceRating: { type: Number, required: true, min: 1, max: 5, default: 5 },
    accessibilityRating: { type: Number, required: true, min: 1, max: 5, default: 5 },
    communicationRating: { type: Number, required: true, min: 1, max: 5, default: 5 },
    comment: { type: String, default: '', maxlength: 2000 },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'approved',
      index: true,
    },
    isReported: { type: Boolean, default: false, index: true },
    isHidden: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

// One review per completed booking
reviewSchema.index({ bookingId: 1 }, { unique: true });
reviewSchema.index({ orchardId: 1, status: 1, isHidden: 1 });

/**
 * Recompute and persist an orchard's aggregate rating after a review change.
 */
reviewSchema.statics.recalculateRating = async function recalculateRating(orchardId) {
  if (!orchardId) return;

  const [agg] = await this.aggregate([
    {
      $match: {
        orchardId: new mongoose.Types.ObjectId(orchardId),
        isHidden: false,
        status: 'approved',
      },
    },
    {
      $group: {
        _id: '$orchardId',
        ratingAverage: { $avg: '$rating' },
        ratingCount: { $sum: 1 },
      },
    },
  ]);

  const Orchard = mongoose.model('Orchard');
  await Orchard.findByIdAndUpdate(orchardId, {
    ratingAverage: agg ? Number(agg.ratingAverage.toFixed(2)) : 0,
    ratingCount: agg ? agg.ratingCount : 0,
  });
};

reviewSchema.post('save', function afterSave() {
  this.constructor.recalculateRating(this.orchardId);
});

reviewSchema.post('findOneAndDelete', function afterRemove(doc) {
  if (doc && doc.orchardId) {
    doc.constructor.recalculateRating(doc.orchardId);
  }
});

const Review = mongoose.model('Review', reviewSchema);
export default Review;

