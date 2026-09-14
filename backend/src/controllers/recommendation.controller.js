import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import recommendationService from '../services/recommendation.service.js';

/**
 * @desc Get personalized orchard recommendations for renter or guest
 * @route GET /api/recommendations
 * @access Public / Authenticated Renter
 */
export const getPersonalizedRecommendations = asyncHandler(async (req, res) => {
  const result = await recommendationService.getPersonalizedRecommendations(
    req.user || null,
    req.query
  );

  return res
    .status(200)
    .json(
      ApiResponse.success(
        result,
        'Personalized recommendations fetched successfully'
      )
    );
});

/**
 * @desc Get similar orchards for a target orchard
 * @route GET /api/recommendations/similar/:orchardId
 * @access Public
 */
export const getSimilarOrchards = asyncHandler(async (req, res) => {
  const { orchardId } = req.params;
  const limit = Number(req.query.limit) || 6;

  const result = await recommendationService.getSimilarOrchards(orchardId, limit);

  return res
    .status(200)
    .json(
      ApiResponse.success(
        result,
        'Similar orchards fetched successfully'
      )
    );
});

export default {
  getPersonalizedRecommendations,
  getSimilarOrchards,
};
