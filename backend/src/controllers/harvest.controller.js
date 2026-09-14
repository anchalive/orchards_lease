import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import { ok } from '../utils/ApiResponse.js';
import Orchard from '../models/Orchard.js';
import { calculateHarvestStatus } from '../services/harvest.service.js';
import { ROLES } from '../utils/constants.js';

/**
 * Get dynamic harvest status and schedule for a specific orchard.
 * GET /api/orchards/:id/harvest
 */
export const getHarvestSchedule = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const orchard = await Orchard.findOne({ _id: id, deletedAt: null });
  if (!orchard) {
    throw ApiError.notFound('Orchard not found');
  }

  const data = calculateHarvestStatus(orchard.harvestSeasons);

  return ok(res, data, 'Orchard harvest schedule retrieved successfully');
});

/**
 * Update harvest schedule for a specific orchard.
 * PUT /api/orchards/:id/harvest
 */
export const updateHarvestSchedule = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const orchard = await Orchard.findOne({ _id: id, deletedAt: null });
  if (!orchard) {
    throw ApiError.notFound('Orchard not found');
  }

  // Authorize owner or admin
  if (req.user.role !== ROLES.ADMIN && String(orchard.sellerId) !== String(req.user._id)) {
    throw ApiError.forbidden('You do not own this orchard');
  }

  const { harvestSeasons } = req.body;

  orchard.harvestSeasons = harvestSeasons || [];
  await orchard.save();

  const harvestData = calculateHarvestStatus(orchard.harvestSeasons);

  return ok(
    res,
    {
      orchard,
      harvestData,
    },
    'Harvest schedule updated successfully'
  );
});

/**
 * Partially update harvest schedule for a specific orchard.
 * PATCH /api/orchards/:id/harvest
 */
export const patchHarvestSchedule = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const orchard = await Orchard.findOne({ _id: id, deletedAt: null });
  if (!orchard) {
    throw ApiError.notFound('Orchard not found');
  }

  // Authorize owner or admin
  if (req.user.role !== ROLES.ADMIN && String(orchard.sellerId) !== String(req.user._id)) {
    throw ApiError.forbidden('You do not own this orchard');
  }

  const { harvestSeasons } = req.body;

  if (harvestSeasons !== undefined) {
    orchard.harvestSeasons = harvestSeasons;
    await orchard.save();
  }

  const harvestData = calculateHarvestStatus(orchard.harvestSeasons);

  return ok(
    res,
    {
      orchard,
      harvestData,
    },
    'Harvest schedule updated successfully'
  );
});

