import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import { ok } from '../utils/ApiResponse.js';
import Orchard from '../models/Orchard.js';
import { calculateHealthScore } from '../services/healthScore.service.js';

/**
 * Get dynamic health score for a specific orchard.
 * GET /api/orchards/:id/health-score
 */
export const getHealthScore = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const orchard = await Orchard.findOne({ _id: id, deletedAt: null });
  if (!orchard) {
    throw ApiError.notFound('Orchard not found');
  }

  // Calculate if not present (backward compatibility)
  let healthScore = orchard.healthScore;
  if (!healthScore || healthScore.score === undefined || healthScore.score === null) {
    healthScore = calculateHealthScore(orchard);
    orchard.healthScore = healthScore;
    await orchard.save();
  }

  return ok(res, {
    score: healthScore.score,
    rating: healthScore.rating,
    breakdown: healthScore.breakdown,
  }, 'Orchard health score retrieved successfully');
});
