import mongoose from 'mongoose';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import { ok } from '../utils/ApiResponse.js';

import Booking from '../models/Booking.js';
import Orchard from '../models/Orchard.js';
import Question from '../models/Question.js';
import {
  getSellerOverview,
  getSellerRevenueSeries,
  getSellerOrchardPerformance,
  getOrchardAnalytics as _getOrchardAnalytics,
  getSellerInquiryAnalytics,
} from '../services/analytics.service.js';
import { ROLES } from '../utils/constants.js';

/* --------------------------- Overview ------------------------------ */
export const getOverview = asyncHandler(async (req, res) => {
  const data = await getSellerOverview(req.user._id);
  return ok(res, data, 'Seller overview');
});

/* ------------------------ Revenue series --------------------------- */
export const getRevenue = asyncHandler(async (req, res) => {
  const months = Math.min(parseInt(req.query.months, 10) || 6, 24);
  const data = await getSellerRevenueSeries(req.user._id, months);
  return ok(res, data, 'Revenue series');
});

/* --------------------- Orchard performance ------------------------- */
export const getPerformance = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);
  const data = await getSellerOrchardPerformance(req.user._id, limit);
  return ok(res, data, 'Orchard performance');
});

/* --------------------- Export bookings CSV ------------------------- */
export const exportBookingsCsv = asyncHandler(async (req, res) => {
  const bookings = await Booking.find({ sellerId: req.user._id })
    .populate('orchardId', 'gardenName')
    .populate('renterId', 'name email')
    .sort({ createdAt: -1 })
    .lean();

  const header = [
    'Booking ID',
    'Orchard',
    'Renter',
    'Renter Email',
    'Start Date',
    'End Date',
    'Status',
    'Payment',
    'Amount',
    'Created',
  ];

  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = bookings.map((b) =>
    [
      b._id,
      b.orchardId?.gardenName || '',
      b.renterId?.name || '',
      b.renterId?.email || '',
      b.startDate?.toISOString().slice(0, 10),
      b.endDate?.toISOString().slice(0, 10),
      b.bookingStatus,
      b.paymentStatus,
      b.totalAmount,
      b.createdAt?.toISOString().slice(0, 10),
    ]
      .map(escape)
      .join(',')
  );

  const csv = [header.map(escape).join(','), ...rows].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="orchardlease-bookings.csv"');
  return res.send(csv);
});

/* ----------------------- Inquiry Analytics (Issue #118) ------------ */
export const getInquiryAnalytics = asyncHandler(async (req, res) => {
  const months = Number(req.query.months) || 6;
  const data = await getSellerInquiryAnalytics(req.user._id, months);
  return ok(res, data);
});

export const exportInquiriesCsv = asyncHandler(async (req, res) => {
  const orchards = await Orchard.find({ sellerId: req.user._id, deletedAt: null }).select('_id').lean();
  const orchardIds = orchards.map((o) => o._id);

  const questions = await Question.find({ orchard: { $in: orchardIds } })
    .populate('orchard', 'gardenName')
    .populate('askedBy', 'name email')
    .sort({ createdAt: -1 })
    .lean();

  const header = ['Question ID', 'Orchard', 'Asked By', 'Question', 'Answered', 'Response Time (hrs)', 'Asked On'];
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

  const rows = questions.map((q) => {
    const responseHours = q.answeredAt
      ? Math.round(((new Date(q.answeredAt) - new Date(q.createdAt)) / (1000 * 60 * 60)) * 10) / 10
      : '';
    return [
      q._id,
      q.orchard?.gardenName || '',
      q.askedBy?.name || '',
      q.question,
      q.answer ? 'Yes' : 'No',
      responseHours,
      q.createdAt?.toISOString().slice(0, 10),
    ]
      .map(escape)
      .join(',');
  });

  const csv = [header.map(escape).join(','), ...rows].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="orchardlease-inquiries.csv"');
  return res.send(csv);
});

/* ----------------------- Seller Reviews Overview ------------------- */
export const getSellerReviews = asyncHandler(async (req, res) => {
  const sellerId = req.user._id;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const filter = { sellerId: new mongoose.Types.ObjectId(sellerId), isHidden: false };

  const [reviews, total, statsAgg] = await Promise.all([
    mongoose.model('Review').find(filter)
      .populate('renterId', 'name avatar')
      .populate('orchardId', 'gardenName slug')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    mongoose.model('Review').countDocuments(filter),
    mongoose.model('Review').aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$sellerId',
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

  const totalPages = Math.ceil(total / limit) || 1;
  return ok(res, { reviews, summary }, 'Seller reviews overview', {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  });
});

/* -------------- Per-orchard analytics  (Feature #28) -------------- */
export const getOrchardAnalytics = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const orchard = await Orchard.findOne({ _id: id, deletedAt: null }).select('sellerId').lean();
  if (!orchard) throw ApiError.notFound('Orchard not found');
  if (req.user.role !== ROLES.ADMIN && String(orchard.sellerId) !== String(req.user._id)) {
    throw ApiError.forbidden('You do not own this orchard');
  }

  const months = Math.min(parseInt(req.query.months, 10) || 6, 24);
  const data = await _getOrchardAnalytics(id, months);
  return ok(res, data, 'Orchard analytics');
});

/* -------------- Per-orchard bookings  (Feature #28) --------------- */
export const getOrchardBookings = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const orchard = await Orchard.findOne({ _id: id, deletedAt: null }).select('sellerId').lean();
  if (!orchard) throw ApiError.notFound('Orchard not found');
  if (req.user.role !== ROLES.ADMIN && String(orchard.sellerId) !== String(req.user._id)) {
    throw ApiError.forbidden('You do not own this orchard');
  }

  const page   = parseInt(req.query.page, 10) || 1;
  const limit  = Math.min(parseInt(req.query.limit, 10) || 10, 50);
  const skip   = (page - 1) * limit;

  const filter = { orchardId: new mongoose.Types.ObjectId(id) };
  if (req.query.status) filter.bookingStatus = req.query.status;

  const [bookings, total] = await Promise.all([
    Booking.find(filter)
      .populate('renterId', 'name email avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Booking.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;
  return ok(res, bookings, 'Orchard bookings', {
    page, limit, total, totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  });
});
