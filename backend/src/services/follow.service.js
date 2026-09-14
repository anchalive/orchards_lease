import mongoose from 'mongoose';
import ApiError from '../utils/ApiError.js';
import { ROLES, ORCHARD_STATUS, NOTIFICATION_TYPE } from '../utils/constants.js';
import { getPagination, buildPageMeta } from '../utils/helpers.js';
import Follow from '../models/Follow.js';
import User from '../models/User.js';
import Orchard from '../models/Orchard.js';
import { notifyMany } from './notification.service.js';

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

export const followSeller = async ({ followerUser, sellerId }) => {
  if (!isValidObjectId(sellerId)) {
    throw ApiError.badRequest('Invalid seller ID format');
  }

  if (followerUser.role !== ROLES.RENTER) {
    throw ApiError.forbidden('Only renters can follow sellers');
  }

  if (String(followerUser._id) === String(sellerId)) {
    throw ApiError.badRequest('You cannot follow yourself');
  }

  const seller = await User.findById(sellerId);
  if (!seller || seller.deletedAt || seller.isBlocked) {
    throw ApiError.notFound('Seller not found');
  }

  if (seller.role !== ROLES.SELLER) {
    throw ApiError.badRequest('Only sellers can be followed');
  }

  const existingFollow = await Follow.findOne({ follower: followerUser._id, seller: sellerId });
  if (existingFollow) {
    throw ApiError.badRequest('You are already following this seller');
  }

  const follow = await Follow.create({
    follower: followerUser._id,
    seller: sellerId,
  });

  return { followed: true, sellerId, followId: follow._id };
};

export const unfollowSeller = async ({ followerUser, sellerId }) => {
  if (!isValidObjectId(sellerId)) {
    throw ApiError.badRequest('Invalid seller ID format');
  }

  if (followerUser.role !== ROLES.RENTER) {
    throw ApiError.forbidden('Only renters can unfollow sellers');
  }

  const deletedFollow = await Follow.findOneAndDelete({
    follower: followerUser._id,
    seller: sellerId,
  });

  if (!deletedFollow) {
    throw ApiError.notFound('You are not following this seller');
  }

  return { followed: false, sellerId };
};

export const getFollowingSellers = async (followerId) => {
  const follows = await Follow.find({ follower: followerId })
    .populate('seller', 'name email avatar bio createdAt')
    .sort({ createdAt: -1 })
    .lean();

  const items = await Promise.all(
    follows.map(async (f) => {
      if (!f.seller) return null;
      const sellerId = f.seller._id;

      const [followerCount, orchardCount, latestOrchard] = await Promise.all([
        Follow.countDocuments({ seller: sellerId }),
        Orchard.countDocuments({ sellerId, status: ORCHARD_STATUS.PUBLISHED, deletedAt: null }),
        Orchard.findOne({ sellerId, status: ORCHARD_STATUS.PUBLISHED, deletedAt: null })
          .sort({ createdAt: -1 })
          .lean(),
      ]);

      return {
        _id: f._id,
        seller: f.seller,
        followerCount,
        orchardCount,
        latestOrchard: latestOrchard || null,
        createdAt: f.createdAt,
      };
    })
  );

  return items.filter(Boolean);
};

export const getSellerFollowersStats = async (sellerId, currentUserId = null) => {
  if (!isValidObjectId(sellerId)) {
    throw ApiError.badRequest('Invalid seller ID format');
  }

  const seller = await User.findById(sellerId).lean();
  if (!seller || seller.deletedAt || seller.isBlocked) {
    throw ApiError.notFound('Seller not found');
  }

  const [followerCount, orchardCount, isFollowing] = await Promise.all([
    Follow.countDocuments({ seller: sellerId }),
    Orchard.countDocuments({ sellerId, status: ORCHARD_STATUS.PUBLISHED, deletedAt: null }),
    currentUserId ? Follow.exists({ follower: currentUserId, seller: sellerId }) : Promise.resolve(null),
  ]);

  return {
    sellerId,
    seller: {
      _id: seller._id,
      name: seller.name,
      avatar: seller.avatar,
      bio: seller.bio,
      createdAt: seller.createdAt,
    },
    followerCount,
    orchardCount,
    isFollowing: Boolean(isFollowing),
  };
};

export const getFollowingOrchards = async (followerId, query = {}) => {
  const { page, limit, skip } = getPagination(query);
  const follows = await Follow.find({ follower: followerId }).select('seller').lean();
  const sellerIds = follows.map((f) => f.seller);

  if (!sellerIds.length) {
    return {
      items: [],
      meta: buildPageMeta({ page, limit, total: 0 }),
    };
  }

  const filter = {
    sellerId: { $in: sellerIds },
    status: ORCHARD_STATUS.PUBLISHED,
    deletedAt: null,
  };

  const [items, total] = await Promise.all([
    Orchard.find(filter)
      .populate('sellerId', 'name avatar bio')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Orchard.countDocuments(filter),
  ]);

  return {
    items,
    meta: buildPageMeta({ page, limit, total }),
  };
};

export const notifyFollowersOfOrchard = async ({ sellerId, orchard, isNew = true }) => {
  try {
    const seller = await User.findById(sellerId).select('name').lean();
    if (!seller) return;

    const follows = await Follow.find({ seller: sellerId }).select('follower').lean();
    if (!follows.length) return;

    const notifications = follows.map((f) => ({
      user: f.follower,
      type: NOTIFICATION_TYPE.SYSTEM,
      title: isNew ? `New Orchard by ${seller.name}` : `Orchard Update by ${seller.name}`,
      message: isNew
        ? `${seller.name} has published a new orchard: "${orchard.gardenName}".`
        : `${seller.name} updated listing information for "${orchard.gardenName}".`,
      link: `/orchards/${orchard.slug}`,
      meta: { sellerId, orchardId: orchard._id },
    }));

    await notifyMany(notifications);
  } catch (err) {
    // Fail-safe log notification errors without interrupting main flow
  }
};

export default {
  followSeller,
  unfollowSeller,
  getFollowingSellers,
  getSellerFollowersStats,
  getFollowingOrchards,
  notifyFollowersOfOrchard,
};
