import asyncHandler from '../utils/asyncHandler.js';
import { ok, created } from '../utils/ApiResponse.js';
import {
  followSeller as followSellerService,
  unfollowSeller as unfollowSellerService,
  getFollowingSellers as getFollowingSellersService,
  getSellerFollowersStats as getSellerFollowersStatsService,
  getFollowingOrchards as getFollowingOrchardsService,
} from '../services/follow.service.js';

export const followSeller = asyncHandler(async (req, res) => {
  const result = await followSellerService({
    followerUser: req.user,
    sellerId: req.params.sellerId,
  });
  return created(res, result, 'Followed seller successfully');
});

export const unfollowSeller = asyncHandler(async (req, res) => {
  const result = await unfollowSellerService({
    followerUser: req.user,
    sellerId: req.params.sellerId,
  });
  return ok(res, result, 'Unfollowed seller successfully');
});

export const getFollowing = asyncHandler(async (req, res) => {
  const items = await getFollowingSellersService(req.user._id);
  return ok(res, items, 'Following sellers');
});

export const getSellerFollowers = asyncHandler(async (req, res) => {
  const stats = await getSellerFollowersStatsService(
    req.params.sellerId,
    req.user ? req.user._id : null
  );
  return ok(res, stats, 'Seller followers stats');
});

export const getFollowingOrchards = asyncHandler(async (req, res) => {
  const { items, meta } = await getFollowingOrchardsService(req.user._id, req.query);
  return ok(res, items, 'Following seller orchards', meta);
});
