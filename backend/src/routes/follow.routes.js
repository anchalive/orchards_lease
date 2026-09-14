import { Router } from 'express';
import { requireAuth, optionalAuth } from '../middleware/auth.middleware.js';
import { restrictTo } from '../middleware/role.middleware.js';
import { ROLES } from '../utils/constants.js';
import {
  followSeller,
  unfollowSeller,
  getFollowing,
  getSellerFollowers,
  getFollowingOrchards,
} from '../controllers/follow.controller.js';

const router = Router();

// Renter follow / unfollow seller
router.post('/follow/:sellerId', requireAuth, restrictTo(ROLES.RENTER), followSeller);
router.delete('/follow/:sellerId', requireAuth, restrictTo(ROLES.RENTER), unfollowSeller);

// Renter following list and orchards
router.get('/following/orchards', requireAuth, restrictTo(ROLES.RENTER), getFollowingOrchards);
router.get('/following', requireAuth, restrictTo(ROLES.RENTER), getFollowing);

// Public / optional auth seller follower stats
router.get('/followers/:sellerId', optionalAuth, getSellerFollowers);

export default router;
