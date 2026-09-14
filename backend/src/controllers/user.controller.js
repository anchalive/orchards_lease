import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import { ok } from '../utils/ApiResponse.js';
import { pick } from '../utils/helpers.js';

import User from '../models/User.js';
import Booking from '../models/Booking.js';
import Notification from '../models/Notification.js';
import Orchard from '../models/Orchard.js';
import Review from '../models/Review.js';
import Follow from '../models/Follow.js';
import Question from '../models/Question.js';

import { uploadBuffer } from '../services/upload.service.js';
import { revokeAllSessions } from '../services/token.service.js';

/* --------------------------- Get profile --------------------------- */
export const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) throw ApiError.notFound('User not found');
  return ok(res, user);
});

/* -------------------------- Update profile ------------------------- */
export const updateProfile = asyncHandler(async (req, res) => {
  const updates = pick(req.body, ['name', 'bio', 'phone', 'language', 'avatar']);
  const user = await User.findByIdAndUpdate(req.user._id, updates, {
    new: true,
    runValidators: true,
  });
  if (!user) throw ApiError.notFound('User not found');
  return ok(res, user, 'Profile updated');
});

/* -------------------------- Upload avatar -------------------------- */
export const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No image uploaded');
  const result = await uploadBuffer(req.file, 'avatars');
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { avatar: result.url },
    { new: true }
  );
  return ok(res, { avatar: user.avatar }, 'Avatar updated');
});

/* --------------------- Notification settings ----------------------- */
export const updateNotificationSettings = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) throw ApiError.notFound('User not found');
  user.notificationSettings = { ...user.notificationSettings.toObject(), ...req.body };
  await user.save();
  return ok(res, user.notificationSettings, 'Notification settings updated');
});

/* ------------------------- Delete account -------------------------- */
export const deleteAccount = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+password');
  if (!user) throw ApiError.notFound('User not found');

  const match = await user.comparePassword(req.body.password);
  if (!match) throw ApiError.badRequest('Password is incorrect');

  // soft delete + anonymize email so it can be reused
  user.deletedAt = new Date();
  user.accountStatus = 'deactivated';
  user.email = `deleted_${user._id}@orchardlease.invalid`;
  await user.save();

  // archive seller's orchards
  await Orchard.updateMany(
    { sellerId: user._id, deletedAt: null },
    { status: 'archived', archivedAt: new Date() }
  );
  await revokeAllSessions(user._id);

  return ok(res, null, 'Account deleted');
});

/* ----------------------- Activity timeline ------------------------- */
export const getActivityTimeline = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const isSeller = req.user.role === 'seller';

  const bookingFilter = isSeller ? { sellerId: userId } : { renterId: userId };
  const reviewFilter = isSeller ? { sellerId: userId } : { renterId: userId };
  const followFilter = isSeller ? { seller: userId } : { follower: userId };
  const questionFilter = isSeller ? { answeredBy: userId } : { askedBy: userId };

  const [bookings, notifications, reviews, follows, questions] = await Promise.all([
    Booking.find(bookingFilter)
      .populate('orchardId', 'gardenName slug')
      .sort({ updatedAt: -1 })
      .limit(15)
      .lean(),
    Notification.find({ user: userId }).sort({ createdAt: -1 }).limit(15).lean(),
    Review.find(reviewFilter)
      .populate('orchardId', 'gardenName slug')
      .sort({ createdAt: -1 })
      .limit(15)
      .lean(),
    Follow.find(followFilter)
      .populate(isSeller ? 'follower' : 'seller', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(15)
      .lean(),
    Question.find(questionFilter)
      .populate('orchard', 'gardenName slug')
      .sort({ createdAt: -1 })
      .limit(15)
      .lean(),
  ]);

  const events = [
    ...bookings.map((b) => ({
      type: 'booking',
      action: b.bookingStatus,
      title: `Booking ${b.bookingStatus}`,
      detail: b.orchardId?.gardenName || 'Orchard',
      link: b.orchardId?.slug ? `/orchards/${b.orchardId.slug}` : '',
      at: b.updatedAt,
    })),
    ...notifications.map((n) => ({
      type: 'notification',
      action: n.type,
      title: n.title,
      detail: n.message,
      link: n.link,
      at: n.createdAt,
    })),
    ...reviews.map((r) => ({
      type: 'review',
      action: r.status,
      title: `Reviewed ${r.orchardId?.gardenName || 'Orchard'} (${r.rating}★)`,
      detail: r.comment || 'Submitted a review',
      link: r.orchardId?.slug ? `/orchards/${r.orchardId.slug}` : '',
      at: r.createdAt,
    })),
    ...follows.map((f) => {
      const targetUser = isSeller ? f.follower : f.seller;
      const name = targetUser?.name || (isSeller ? 'A renter' : 'A seller');
      return {
        type: 'follow',
        action: 'followed',
        title: isSeller ? `${name} started following you` : `Following ${name}`,
        detail: isSeller ? 'New follower' : 'Added to your followed orchardists',
        link: !isSeller && f.seller?._id ? `/sellers/${f.seller._id}` : '/following',
        at: f.createdAt,
      };
    }),
    ...questions.map((q) => ({
      type: 'question',
      action: q.status,
      title: `Asked about ${q.orchard?.gardenName || 'Orchard'}`,
      detail: q.question,
      link: q.orchard?.slug ? `/orchards/${q.orchard.slug}` : '',
      at: q.createdAt,
    })),
  ]
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .slice(0, 20);

  return ok(res, events, 'Activity timeline');
});
