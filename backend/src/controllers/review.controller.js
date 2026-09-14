import mongoose from 'mongoose';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import { ok, created } from '../utils/ApiResponse.js';
import { getPagination, buildPageMeta } from '../utils/helpers.js';
import { BOOKING_STATUS, NOTIFICATION_TYPE, ROLES } from '../utils/constants.js';

import Review from '../models/Review.js';
import Booking from '../models/Booking.js';
import Orchard from '../models/Orchard.js';
import { notify } from '../services/notification.service.js';

/* --------------------------- Create -------------------------------- */
export const createReview = asyncHandler(async (req, res) => {
  const targetOrchardId = req.params.id || req.params.orchardId || req.body.orchardId;
  const {
    bookingId,
    rating,
    cleanlinessRating = rating,
    maintenanceRating = rating,
    accessibilityRating = rating,
    communicationRating = rating,
    comment = '',
  } = req.body;

  if (!targetOrchardId) {
    throw ApiError.badRequest('Orchard ID is required');
  }

  const orchard = await Orchard.findById(targetOrchardId);
  if (!orchard) throw ApiError.notFound('Orchard not found');

  if (!bookingId) {
    throw ApiError.badRequest('Booking ID is required to leave a review');
  }

  const booking = await Booking.findById(bookingId);
  if (!booking) throw ApiError.notFound('Booking not found');

  if (booking.renterId.toString() !== req.user._id.toString()) {
    throw ApiError.forbidden('You can only review your own bookings');
  }

  if (booking.orchardId.toString() !== targetOrchardId.toString()) {
    throw ApiError.badRequest('Booking does not belong to this orchard');
  }

  if (booking.bookingStatus !== BOOKING_STATUS.COMPLETED) {
    throw ApiError.forbidden('Only completed bookings can be reviewed');
  }

  const existingBookingReview = await Review.findOne({ bookingId });
  if (existingBookingReview) {
    throw ApiError.conflict('You have already submitted a review for this booking');
  }

  const review = await Review.create({
    orchardId: targetOrchardId,
    renterId: req.user._id,
    sellerId: orchard.sellerId,
    bookingId,
    rating,
    cleanlinessRating,
    maintenanceRating,
    accessibilityRating,
    communicationRating,
    comment,
    status: 'approved',
  });

  await notify({
    user: orchard.sellerId,
    type: NOTIFICATION_TYPE.REVIEW,
    title: 'New Review Received',
    message: `Your orchard "${orchard.gardenName}" received a ${rating}★ review from ${req.user.name || 'a renter'}.`,
    link: `/seller/reviews`,
  });

  await Review.recalculateRating(targetOrchardId);

  const populatedReview = await Review.findById(review._id)
    .populate('renterId', 'name avatar')
    .lean();

  return created(res, populatedReview, 'Review submitted successfully');
});

/* ----------------------- List by orchard --------------------------- */
export const listOrchardReviews = asyncHandler(async (req, res) => {
  const targetOrchardId = req.params.orchardId || req.params.id;
  const { page, limit, skip } = getPagination(req.query);
  const sortBy = req.query.sort === 'lowest' ? { rating: 1, createdAt: -1 } : req.query.sort === 'highest' ? { rating: -1, createdAt: -1 } : { createdAt: -1 };

  const filter = {
    orchardId: targetOrchardId,
    isHidden: false,
    status: 'approved',
  };

  const [items, total, statsAgg] = await Promise.all([
    Review.find(filter)
      .populate('renterId', 'name avatar')
      .sort(sortBy)
      .skip(skip)
      .limit(limit)
      .lean(),
    Review.countDocuments(filter),
    Review.aggregate([
      { $match: { orchardId: new mongoose.Types.ObjectId(targetOrchardId), isHidden: false, status: 'approved' } },
      {
        $group: {
          _id: '$orchardId',
          ratingAverage: { $avg: '$rating' },
          ratingCount: { $sum: 1 },
          avgCleanliness: { $avg: '$cleanlinessRating' },
          avgMaintenance: { $avg: '$maintenanceRating' },
          avgAccessibility: { $avg: '$accessibilityRating' },
          avgCommunication: { $avg: '$communicationRating' },
          star5: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
          star4: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
          star3: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
          star2: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
          star1: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } },
        },
      },
    ]),
  ]);

  const summaryData = statsAgg[0] || {};
  const summary = {
    ratingAverage: summaryData.ratingAverage ? Number(summaryData.ratingAverage.toFixed(2)) : 0,
    ratingCount: summaryData.ratingCount || 0,
    categoryAverages: {
      cleanliness: summaryData.avgCleanliness ? Number(summaryData.avgCleanliness.toFixed(1)) : 0,
      maintenance: summaryData.avgMaintenance ? Number(summaryData.avgMaintenance.toFixed(1)) : 0,
      accessibility: summaryData.avgAccessibility ? Number(summaryData.avgAccessibility.toFixed(1)) : 0,
      communication: summaryData.avgCommunication ? Number(summaryData.avgCommunication.toFixed(1)) : 0,
    },
    distribution: {
      5: summaryData.star5 || 0,
      4: summaryData.star4 || 0,
      3: summaryData.star3 || 0,
      2: summaryData.star2 || 0,
      1: summaryData.star1 || 0,
    },
  };

  return res.json({
    success: true,
    message: 'Reviews fetched',
    data: items,
    summary,
    meta: buildPageMeta({ page, limit, total }),
  });
});

/* -------------------- Get Reviewable Booking ---------------------- */
export const getReviewableBooking = asyncHandler(async (req, res) => {
  const targetOrchardId = req.params.orchardId || req.params.id;
  if (!req.user) {
    return ok(res, { canReview: false, booking: null }, 'Unauthenticated');
  }

  // Find all completed bookings for this user & orchard
  const completedBookings = await Booking.find({
    orchardId: targetOrchardId,
    renterId: req.user._id,
    bookingStatus: BOOKING_STATUS.COMPLETED,
  }).sort({ createdAt: -1 }).lean();

  if (!completedBookings.length) {
    return ok(res, { canReview: false, booking: null }, 'No completed bookings found');
  }

  // Check existing reviews for these bookings
  const bookingIds = completedBookings.map((b) => b._id);
  const existingReviews = await Review.find({ bookingId: { $in: bookingIds } }).lean();
  const reviewedBookingIds = new Set(existingReviews.map((r) => r.bookingId.toString()));

  const unreviewedBooking = completedBookings.find((b) => !reviewedBookingIds.has(b._id.toString()));

  if (!unreviewedBooking) {
    return ok(res, { canReview: false, booking: null }, 'All completed bookings already reviewed');
  }

  return ok(
    res,
    { canReview: true, booking: unreviewedBooking },
    'Eligible booking found for review'
  );
});

/* ----------------------------- Update ------------------------------ */
export const updateReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) throw ApiError.notFound('Review not found');

  if (review.renterId.toString() !== req.user._id.toString() && req.user.role !== ROLES.ADMIN) {
    throw ApiError.forbidden('You can only update your own review');
  }

  const fields = [
    'rating',
    'cleanlinessRating',
    'maintenanceRating',
    'accessibilityRating',
    'communicationRating',
    'comment',
  ];

  fields.forEach((field) => {
    if (req.body[field] !== undefined) {
      review[field] = req.body[field];
    }
  });

  await review.save();
  await Review.recalculateRating(review.orchardId);

  const updated = await Review.findById(review._id)
    .populate('renterId', 'name avatar')
    .lean();

  return ok(res, updated, 'Review updated successfully');
});

/* ----------------------------- Delete ------------------------------ */
export const deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) throw ApiError.notFound('Review not found');

  const isAuthor = review.renterId.toString() === req.user._id.toString();
  const isAdmin = req.user.role === ROLES.ADMIN;

  if (!isAuthor && !isAdmin) {
    throw ApiError.forbidden('You are not authorized to delete this review');
  }

  const orchardId = review.orchardId;
  await Review.findByIdAndDelete(req.params.id);
  await Review.recalculateRating(orchardId);

  return ok(res, null, 'Review deleted successfully');
});

/* ----------------------------- Report ------------------------------ */
export const reportReview = asyncHandler(async (req, res) => {
  const review = await Review.findByIdAndUpdate(
    req.params.id,
    { isReported: true },
    { new: true }
  );
  if (!review) throw ApiError.notFound('Review not found');
  return ok(res, null, 'Review reported to moderators');
});

/* ---------------------------- Moderate ----------------------------- */
export const moderateReview = asyncHandler(async (req, res) => {
  const { action } = req.body; // 'approve' | 'reject' | 'hide' | 'unhide' | 'delete'
  const review = await Review.findById(req.params.id);
  if (!review) throw ApiError.notFound('Review not found');

  if (action === 'approve') {
    review.status = 'approved';
    review.isHidden = false;
    review.isReported = false;
    await review.save();
  } else if (action === 'reject') {
    review.status = 'rejected';
    review.isHidden = true;
    await review.save();
  } else if (action === 'hide') {
    review.isHidden = true;
    await review.save();
  } else if (action === 'unhide') {
    review.isHidden = false;
    await review.save();
  } else if (action === 'delete') {
    const orchardId = review.orchardId;
    await Review.findByIdAndDelete(req.params.id);
    await Review.recalculateRating(orchardId);
    return ok(res, null, 'Review deleted by moderator');
  } else {
    throw ApiError.badRequest('Invalid moderation action');
  }

  await Review.recalculateRating(review.orchardId);
  return ok(res, review, `Review ${action} action completed`);
});

