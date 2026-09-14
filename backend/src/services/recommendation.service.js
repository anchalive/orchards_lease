import mongoose from 'mongoose';
import Orchard from '../models/Orchard.js';
import Booking from '../models/Booking.js';
import Wishlist from '../models/Wishlist.js';
import { ORCHARD_STATUS, BOOKING_STATUS, RECOMMENDATION_WEIGHTS } from '../utils/constants.js';

/**
 * Helper to calculate percentage price difference
 */
const priceDiffRatio = (p1, p2) => {
  if (!p1 || !p2) return 1;
  return Math.abs(p1 - p2) / Math.max(p1, p2);
};

/**
 * Format currency string for fallback reason generation
 */
const formatPrice = (val) => `₹${Number(val).toLocaleString('en-IN')}`;

/**
 * Generate personalized orchard recommendations for a user.
 */
export const getPersonalizedRecommendations = async (user = null, options = {}) => {
  const limit = Math.min(Math.max(Number(options.limit) || 10, 1), 50);
  const userId = user?._id || user?.id || null;

  let bookedOrchardIds = new Set();
  let bookedFruits = new Set();
  let bookedDistricts = new Set();
  let bookedStates = new Set();
  let bookedPrices = [];

  let wishlistedOrchardIds = new Set();
  let wishlistedFruits = new Set();
  let wishlistedDistricts = new Set();
  let recentlyViewedFruits = new Set();
  let wishlistedPrices = [];

  let hasUserActivity = false;

  if (userId && mongoose.Types.ObjectId.isValid(userId)) {
    // 1. Gather Booking History
    const userBookings = await Booking.find({
      renterId: userId,
      bookingStatus: { $ne: BOOKING_STATUS.CANCELLED },
    })
      .populate('orchardId', 'fruitTypes district state price')
      .lean();

    if (userBookings.length > 0) {
      hasUserActivity = true;
      userBookings.forEach((b) => {
        if (b.orchardId && typeof b.orchardId === 'object') {
          bookedOrchardIds.add(b.orchardId._id.toString());
          (b.orchardId.fruitTypes || []).forEach((f) => bookedFruits.add(f.toLowerCase()));
          if (b.orchardId.district) bookedDistricts.add(b.orchardId.district.toLowerCase());
          if (b.orchardId.state) bookedStates.add(b.orchardId.state.toLowerCase());
          if (b.orchardId.price) bookedPrices.push(b.orchardId.price);
        }
      });
    }

    // 2. Gather Wishlist & Recently Viewed Activity
    const userWishlist = await Wishlist.findOne({ user: userId })
      .populate('orchards', 'fruitTypes district state price')
      .populate('recentlyViewed.orchard', 'fruitTypes district state price')
      .lean();

    if (userWishlist) {
      if (userWishlist.orchards && userWishlist.orchards.length > 0) {
        hasUserActivity = true;
        userWishlist.orchards.forEach((o) => {
          if (o && o._id) {
            wishlistedOrchardIds.add(o._id.toString());
            (o.fruitTypes || []).forEach((f) => wishlistedFruits.add(f.toLowerCase()));
            if (o.district) wishlistedDistricts.add(o.district.toLowerCase());
            if (o.price) wishlistedPrices.push(o.price);
          }
        });
      }

      if (userWishlist.recentlyViewed && userWishlist.recentlyViewed.length > 0) {
        hasUserActivity = true;
        userWishlist.recentlyViewed.forEach((rv) => {
          if (rv.orchard && rv.orchard._id) {
            (rv.orchard.fruitTypes || []).forEach((f) => recentlyViewedFruits.add(f.toLowerCase()));
          }
        });
      }
    }
  }

  // Combine target fruit & location preferences
  const targetFruits = new Set([
    ...bookedFruits,
    ...wishlistedFruits,
    ...recentlyViewedFruits,
    ...(options.fruit ? [options.fruit.toLowerCase()] : []),
  ]);

  const targetDistricts = new Set([
    ...bookedDistricts,
    ...wishlistedDistricts,
    ...(options.district ? [options.district.toLowerCase()] : []),
  ]);

  const targetStates = new Set([
    ...bookedStates,
    ...(options.state ? [options.state.toLowerCase()] : []),
  ]);

  const allPrices = [...bookedPrices, ...wishlistedPrices];
  const avgPrice = allPrices.length > 0
    ? allPrices.reduce((a, b) => a + b, 0) / allPrices.length
    : options.maxPrice ? Number(options.maxPrice) * 0.8 : null;

  // 3. Build Orchard DB Query
  const query = {
    status: ORCHARD_STATUS.PUBLISHED,
    available: true,
    deletedAt: null,
  };

  if (options.fruit) {
    query.fruitTypes = { $in: [new RegExp(`^${options.fruit}$`, 'i')] };
  }
  if (options.state) {
    query.state = new RegExp(`^${options.state}$`, 'i');
  }
  if (options.district) {
    query.district = new RegExp(`^${options.district}$`, 'i');
  }
  if (options.maxPrice) {
    query.price = { $lte: Number(options.maxPrice) };
  }

  const candidateOrchards = await Orchard.find(query)
    .populate('sellerId', 'name avatar bio')
    .lean();

  const weights = RECOMMENDATION_WEIGHTS;

  // 4. Score Candidate Orchards
  const scoredItems = candidateOrchards.map((orchard) => {
    let score = 0;
    const reasons = [];

    const orchardIdStr = orchard._id.toString();
    const orchardFruits = (orchard.fruitTypes || []).map((f) => f.toLowerCase());
    const orchardDistrict = (orchard.district || '').toLowerCase();
    const orchardState = (orchard.state || '').toLowerCase();

    if (!hasUserActivity && !options.fruit && !options.district && !options.state) {
      // -------------------------------------------------------------
      // COLD START FALLBACK SCORING
      // -------------------------------------------------------------
      // Rating (max 40 pts)
      const ratingScore = ((orchard.ratingAverage || 0) / 5) * 40;
      score += ratingScore;

      // Popularity (max 30 pts)
      const popularityRaw = (orchard.favouriteCount || 0) * 3 + (orchard.viewCount || 0) * 0.2 + (orchard.ratingCount || 0) * 2;
      const popularityScore = Math.min(30, popularityRaw);
      score += popularityScore;

      // Featured (max 15 pts)
      if (orchard.isFeatured) {
        score += 15;
      }

      // Recency (max 15 pts)
      const daysOld = (Date.now() - new Date(orchard.createdAt || Date.now()).getTime()) / (1000 * 3600 * 24);
      const recencyScore = Math.max(0, 15 - daysOld * 0.2);
      score += recencyScore;

      // Reasons for cold start
      if (orchard.ratingAverage >= 4.5) {
        reasons.push(`Top rated orchard (${orchard.ratingAverage.toFixed(1)}★)`);
      }
      if (orchard.isFeatured) {
        reasons.push('Featured by OrchardLease');
      }
      if ((orchard.favouriteCount || 0) > 3 || (orchard.ratingCount || 0) > 5) {
        reasons.push('Popular among renters');
      }
      if (recencyScore > 10) {
        reasons.push('Recently listed on platform');
      }
      if (reasons.length === 0) {
        reasons.push('Verified quality orchard');
      }
    } else {
      // -------------------------------------------------------------
      // PERSONALIZED WEIGHTED SCORING
      // -------------------------------------------------------------

      // 1. Booking History (Weight: 30%)
      let bookingScore = 0;
      const matchingBookedFruit = orchardFruits.find((f) => bookedFruits.has(f));
      if (matchingBookedFruit) {
        bookingScore += 18;
        reasons.push(`Matches fruit from your booking history (${matchingBookedFruit})`);
      }
      if (bookedDistricts.has(orchardDistrict) || bookedStates.has(orchardState)) {
        bookingScore += 12;
        if (!reasons.some((r) => r.includes('booking'))) {
          reasons.push('Located in region of your previous booking');
        }
      }
      score += Math.min(weights.BOOKING_HISTORY, bookingScore);

      // 2. Wishlist & History (Weight: 20%)
      let wishlistScore = 0;
      if (wishlistedOrchardIds.has(orchardIdStr)) {
        wishlistScore += 20;
        reasons.push('Currently saved in your wishlist');
      } else {
        const matchingWishFruit = orchardFruits.find((f) => wishlistedFruits.has(f));
        if (matchingWishFruit) {
          wishlistScore += 12;
          reasons.push(`Matches fruit in your wishlist (${matchingWishFruit})`);
        }
        const matchingViewFruit = orchardFruits.find((f) => recentlyViewedFruits.has(f));
        if (matchingViewFruit && wishlistScore < 12) {
          wishlistScore += 8;
          reasons.push(`Similar to recently viewed orchards`);
        }
      }
      score += Math.min(weights.WISHLIST, wishlistScore);

      // 3. Preferred Fruits (Weight: 15%)
      let fruitScore = 0;
      const matchedFruit = orchardFruits.find((f) => targetFruits.has(f));
      if (matchedFruit) {
        fruitScore += 15;
        if (!reasons.some((r) => r.includes(matchedFruit))) {
          reasons.push(`Matches preferred fruit (${matchedFruit})`);
        }
      }
      score += Math.min(weights.PREFERRED_FRUITS, fruitScore);

      // 4. Location Match (Weight: 10%)
      let locationScore = 0;
      if (targetDistricts.has(orchardDistrict)) {
        locationScore += 10;
        reasons.push(`Matches preferred district (${orchard.district})`);
      } else if (targetStates.has(orchardState)) {
        locationScore += 6;
        reasons.push(`Located in ${orchard.state}`);
      }
      score += Math.min(weights.LOCATION, locationScore);

      // 5. Budget Match (Weight: 10%)
      let budgetScore = 0;
      if (avgPrice) {
        const diffRatio = priceDiffRatio(orchard.price, avgPrice);
        if (diffRatio <= 0.15) {
          budgetScore = 10;
          reasons.push(`Within your budget range (${formatPrice(orchard.price)})`);
        } else if (diffRatio <= 0.35) {
          budgetScore = 6;
        }
      } else if (options.maxPrice && orchard.price <= Number(options.maxPrice)) {
        budgetScore = 10;
        reasons.push(`Within your price limit (${formatPrice(orchard.price)})`);
      }
      score += Math.min(weights.BUDGET, budgetScore);

      // 6. Ratings (Weight: 10%)
      const ratingScore = ((orchard.ratingAverage || 0) / 5) * weights.RATINGS;
      score += ratingScore;
      if (orchard.ratingAverage >= 4.5 && !reasons.some((r) => r.includes('rating'))) {
        reasons.push(`Highly rated (${orchard.ratingAverage.toFixed(1)}★)`);
      }

      // 7. Popularity (Weight: 5%)
      const popRaw = (orchard.favouriteCount || 0) * 0.4 + (orchard.ratingCount || 0) * 0.3 + (orchard.isFeatured ? 2 : 0);
      const popularityScore = Math.min(weights.POPULARITY, popRaw);
      score += popularityScore;
      if (popularityScore >= 3 && !reasons.some((r) => r.includes('Popular'))) {
        reasons.push('Popular choice among renters');
      }
    }

    // Ensure score is capped between 0 and 100
    const finalScore = Number(Math.min(100, Math.max(10, score)).toFixed(1));

    // Deduplicate reasons and limit to top 3
    const uniqueReasons = [...new Set(reasons)].slice(0, 3);
    if (uniqueReasons.length === 0) {
      uniqueReasons.push('Recommended based on platform trends');
    }

    return {
      orchard,
      score: finalScore,
      reasons: uniqueReasons,
    };
  });

  // Sort by recommendation score descending
  scoredItems.sort((a, b) => b.score - a.score);

  return {
    recommendations: scoredItems.slice(0, limit),
  };
};

/**
 * Generate similar orchard recommendations for a given orchard.
 */
export const getSimilarOrchards = async (targetOrchardId, limit = 6) => {
  if (!targetOrchardId || !mongoose.Types.ObjectId.isValid(targetOrchardId)) {
    return { recommendations: [] };
  }

  const target = await Orchard.findById(targetOrchardId).lean();
  if (!target || target.deletedAt) {
    return { recommendations: [] };
  }

  const candidates = await Orchard.find({
    _id: { $ne: target._id },
    status: ORCHARD_STATUS.PUBLISHED,
    available: true,
    deletedAt: null,
  })
    .populate('sellerId', 'name avatar bio')
    .lean();

  const targetFruits = new Set((target.fruitTypes || []).map((f) => f.toLowerCase()));
  const targetDistrict = (target.district || '').toLowerCase();
  const targetState = (target.state || '').toLowerCase();

  const scored = candidates.map((orchard) => {
    let score = 0;
    const reasons = [];

    const orchardFruits = (orchard.fruitTypes || []).map((f) => f.toLowerCase());
    const orchardDistrict = (orchard.district || '').toLowerCase();
    const orchardState = (orchard.state || '').toLowerCase();

    // 1. Fruit variety match (max 40 pts)
    const commonFruit = orchardFruits.find((f) => targetFruits.has(f));
    if (commonFruit) {
      score += 40;
      reasons.push(`Same fruit variety (${commonFruit})`);
    }

    // 2. Location match (max 30 pts)
    if (orchardDistrict === targetDistrict) {
      score += 30;
      reasons.push(`Same district (${orchard.district})`);
    } else if (orchardState === targetState) {
      score += 15;
      reasons.push(`Same state (${orchard.state})`);
    }

    // 3. Price similarity (max 15 pts)
    const diff = priceDiffRatio(orchard.price, target.price);
    const priceScore = Math.max(0, 15 * (1 - diff));
    score += priceScore;
    if (diff <= 0.25) {
      reasons.push(`Similar price range (${formatPrice(orchard.price)})`);
    }

    // 4. Rating & Condition similarity (max 15 pts)
    const ratingDiff = Math.abs((orchard.ratingAverage || 0) - (target.ratingAverage || 0));
    const ratingScore = Math.max(0, 15 * (1 - ratingDiff / 5));
    score += ratingScore;

    if (orchard.ratingAverage >= 4.5) {
      reasons.push(`High guest rating (${orchard.ratingAverage.toFixed(1)}★)`);
    }

    const finalScore = Number(Math.min(100, Math.max(15, score)).toFixed(1));
    const uniqueReasons = [...new Set(reasons)].slice(0, 3);
    if (uniqueReasons.length === 0) {
      uniqueReasons.push('Similar orchard features');
    }

    return {
      orchard,
      score: finalScore,
      reasons: uniqueReasons,
    };
  });

  scored.sort((a, b) => b.score - a.score);

  return {
    recommendations: scored.slice(0, Math.min(limit, 20)),
  };
};

export default {
  getPersonalizedRecommendations,
  getSimilarOrchards,
};
