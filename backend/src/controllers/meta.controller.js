import asyncHandler from '../utils/asyncHandler.js';
import { ok } from '../utils/ApiResponse.js';
import { FRUIT_TYPES, AMENITIES, RENT_TYPE, AREA_UNIT } from '../utils/constants.js';
import Orchard from '../models/Orchard.js';
import Setting from '../models/Setting.js';
import { ORCHARD_STATUS } from '../utils/constants.js';

/** Static + dynamic options for building search filters on the client. */
export const getFilterOptions = asyncHandler(async (_req, res) => {
  const publishedFilter = { status: ORCHARD_STATUS.PUBLISHED, deletedAt: null };

  const [states, fruitFacets, rentTypeFacets, amenityFacets, priceAgg, treeAgg] =
    await Promise.all([
      Orchard.distinct('state',      publishedFilter),
      Orchard.distinct('fruitTypes', publishedFilter),
      Orchard.distinct('rentType',   publishedFilter),
      Orchard.distinct('amenities',  publishedFilter),
      // price range
      Orchard.aggregate([
        { $match: publishedFilter },
        { $group: { _id: null, min: { $min: '$price' }, max: { $max: '$price' } } },
      ]),
      // tree range
      Orchard.aggregate([
        { $match: { ...publishedFilter, totalTrees: { $gt: 0 } } },
        { $group: { _id: null, min: { $min: '$totalTrees' }, max: { $max: '$totalTrees' } } },
      ]),
    ]);

  const priceRange = priceAgg[0]
    ? { min: Math.floor(priceAgg[0].min / 1000) * 1000, max: Math.ceil(priceAgg[0].max / 1000) * 1000 }
    : { min: 0, max: 200000 };

  const treeRange = treeAgg[0]
    ? { min: 0, max: Math.ceil(treeAgg[0].max / 50) * 50 }
    : { min: 0, max: 500 };

  return ok(res, {
    // Static enum lists (all possible values)
    fruitTypes:          FRUIT_TYPES,
    amenities:           AMENITIES,
    rentTypes:           Object.values(RENT_TYPE),
    areaUnits:           Object.values(AREA_UNIT),
    // Live facets (only what's actually in published orchards)
    availableFruitTypes: fruitFacets.sort(),
    availableRentTypes:  rentTypeFacets,
    availableAmenities:  amenityFacets.sort(),
    states:              states.sort(),
    priceRange,
    treeRange,
  });
});

/** Public-facing settings — announcement banner + maintenance flag. */
export const getPublicSettings = asyncHandler(async (_req, res) => {
  const s = await Setting.getSingleton();
  return ok(res, {
    maintenanceMode: s.maintenanceMode,
    maintenanceMessage: s.maintenanceMessage,
    announcement: s.announcement,
    supportEmail: s.supportEmail,
  });
});

/** Featured orchards for the homepage. */
export const getFeaturedOrchards = asyncHandler(async (_req, res) => {
  const items = await Orchard.find({
    isFeatured: true,
    status: ORCHARD_STATUS.PUBLISHED,
    deletedAt: null,
  })
    .populate('sellerId', 'name avatar')
    .sort({ ratingAverage: -1 })
    .limit(8)
    .lean();
  return ok(res, items, 'Featured orchards');
});

export const healthCheck = (_req, res) =>
  res.json({ success: true, status: 'ok', service: 'orchardlease-api', time: new Date().toISOString() });
