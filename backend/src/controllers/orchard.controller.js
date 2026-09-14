import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import { ok, created } from '../utils/ApiResponse.js';
import { slugify, getPagination, buildPageMeta, toArray, pick } from '../utils/helpers.js';
import { ORCHARD_STATUS, ROLES } from '../utils/constants.js';

import Orchard from '../models/Orchard.js';
import Wishlist from '../models/Wishlist.js';
import Setting from '../models/Setting.js';
import { uploadMany } from '../services/upload.service.js';
import { notifyFollowersOfOrchard } from '../services/follow.service.js';

const EDITABLE_FIELDS = [
  'gardenName', 'description', 'district', 'state', 'country', 'latitude', 'longitude',
  'address', 'fruitTypes', 'totalTrees', 'averageFruitPerTree', 'expectedYield',
  'estimatedHarvestDate', 'totalArea', 'areaUnit', 'rentType', 'price', 'pricingRules',
  'images', 'thumbnail', 'amenities', 'available', 'seo',
  'soilFertility', 'waterSourceQuality', 'pestHistory', 'diseaseHistory',
  'maintenanceStatus', 'orchardAge', 'harvestSeasons',
];

const SORT_MAP = {
  newest:     { createdAt: -1 },
  oldest:     { createdAt: 1 },
  price_asc:  { price: 1 },
  price_desc: { price: -1 },
  rating:     { ratingAverage: -1 },
  popular:    { viewCount: -1 },
  yield:      { expectedYield: -1 },
};

/* ----------------------- Build public filter ----------------------- */
const buildPublicFilter = (q = {}) => {
  const filter = { status: ORCHARD_STATUS.PUBLISHED, deletedAt: null };

  if (q.search) filter.$text = { $search: q.search };
  
  const fruits = toArray(q.fruit);
  if (fruits) {
    const fruitRegexes = fruits.map((f) => new RegExp(`^${f.trim()}$`, 'i'));
    filter.$or = [
      { fruitTypes: { $in: fruits } },
      { 'harvestSeasons.fruitName': { $in: fruitRegexes } },
    ];
  }
  
  if (q.state)    filter.state    = new RegExp(`^${q.state}$`, 'i');
  if (q.district) filter.district = new RegExp(q.district.trim(), 'i');
  if (q.available !== undefined) filter.available  = q.available;
  if (q.featured  !== undefined) filter.isFeatured = q.featured;
  if (q.sellerId) filter.sellerId = q.sellerId;

  // Rent type: "season" | "month" | "year" | "harvest"
  if (q.rentType) filter.rentType = q.rentType;

  if (q.harvestThisMonth) {
    const currentMonth = new Date().getMonth() + 1;
    filter.$expr = {
      $anyElementTrue: {
        $map: {
          input: { $ifNull: ['$harvestSeasons', []] },
          as: 'season',
          in: {
            $or: [
              {
                $and: [
                  { $lte: ['$$season.startMonth', '$$season.endMonth'] },
                  { $lte: ['$$season.startMonth', currentMonth] },
                  { $gte: ['$$season.endMonth', currentMonth] },
                ],
              },
              {
                $and: [
                  { $gt: ['$$season.startMonth', '$$season.endMonth'] },
                  {
                    $or: [
                      { $lte: ['$$season.startMonth', currentMonth] },
                      { $gte: ['$$season.endMonth', currentMonth] },
                    ],
                  },
                ],
              },
            ],
          },
        },
      },
    };
  }

  if (q.upcomingHarvest) {
    const currentMonth = new Date().getMonth() + 1;
    const upcomingMonths = [
      (currentMonth % 12) + 1,
      ((currentMonth + 1) % 12) + 1,
      ((currentMonth + 2) % 12) + 1,
    ];
    filter['harvestSeasons.startMonth'] = { $in: upcomingMonths };
  }

  if (q.peakSeason) {
    const currentMonth = new Date().getMonth() + 1;
    const peakExpr = {
      $anyElementTrue: {
        $map: {
          input: { $ifNull: ['$harvestSeasons', []] },
          as: 'season',
          in: {
            $or: [
              {
                $and: [
                  { $lte: ['$$season.peakStartMonth', '$$season.peakEndMonth'] },
                  { $lte: ['$$season.peakStartMonth', currentMonth] },
                  { $gte: ['$$season.peakEndMonth', currentMonth] },
                ],
              },
              {
                $and: [
                  { $gt: ['$$season.peakStartMonth', '$$season.peakEndMonth'] },
                  {
                    $or: [
                      { $lte: ['$$season.peakStartMonth', currentMonth] },
                      { $gte: ['$$season.peakEndMonth', currentMonth] },
                    ],
                  },
                ],
              },
            ],
          },
        },
      },
    };

    if (filter.$expr) {
      filter.$expr = { $and: [filter.$expr, peakExpr] };
    } else {
      filter.$expr = peakExpr;
    }
  }


  // Amenities: comma-separated — orchard must have ALL selected ($all)
  if (q.amenities) {
    const amenityList = q.amenities.split(',').map((a) => a.trim()).filter(Boolean);
    if (amenityList.length) filter.amenities = { $all: amenityList };
  }

  if (q.minPrice != null || q.maxPrice != null) {
    filter.price = {};
    if (q.minPrice != null) filter.price.$gte = q.minPrice;
    if (q.maxPrice != null) filter.price.$lte = q.maxPrice;
  }
  if (q.minTrees != null || q.maxTrees != null) {
    filter.totalTrees = {};
    if (q.minTrees != null) filter.totalTrees.$gte = q.minTrees;
    if (q.maxTrees != null) filter.totalTrees.$lte = q.maxTrees;
  }
  if (q.minArea != null || q.maxArea != null) {
    filter.totalArea = {};
    if (q.minArea != null) filter.totalArea.$gte = q.minArea;
    if (q.maxArea != null) filter.totalArea.$lte = q.maxArea;
  }
  if (q.minYield != null) filter.expectedYield  = { $gte: q.minYield };
  if (q.rating   != null) filter.ratingAverage  = { $gte: q.rating };

  return filter;
};

/* ----------------------- List / search public --------------------- */
export const listOrchards = asyncHandler(async (req, res) => {
  const q = req.validatedQuery || req.query;
  const { page, limit, skip } = getPagination(q);
  const filter = buildPublicFilter(q);
  const sort = SORT_MAP[q.sort] || (filter.$text ? { score: { $meta: 'textScore' } } : SORT_MAP.newest);

  const projection = filter.$text ? { score: { $meta: 'textScore' } } : {};

  const [items, total] = await Promise.all([
    Orchard.find(filter, projection)
      .populate('sellerId', 'name avatar')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Orchard.countDocuments(filter),
  ]);

  return ok(res, items, 'Orchards', buildPageMeta({ page, limit, total }));
});

/* ----------------------- Get one (by slug) ------------------------- */
export const getOrchardBySlug = asyncHandler(async (req, res) => {
  const orchard = await Orchard.findOne({ slug: req.params.slug, deletedAt: null })
    .populate('sellerId', 'name avatar bio createdAt')
    .lean();
  if (!orchard) throw ApiError.notFound('Orchard not found');

  const isOwner = req.user && String(orchard.sellerId?._id) === String(req.user._id);
  const isAdmin = req.user?.role === ROLES.ADMIN;
  if (orchard.status !== ORCHARD_STATUS.PUBLISHED && !isOwner && !isAdmin) {
    throw ApiError.notFound('Orchard not found');
  }

  // increment view count (not for owner) + recently viewed
  if (!isOwner) {
    Orchard.updateOne({ _id: orchard._id }, { $inc: { viewCount: 1 } }).catch(() => {});
    if (req.user && req.user.role === ROLES.RENTER) {
      await Wishlist.findOneAndUpdate(
        { user: req.user._id },
        { $pull: { recentlyViewed: { orchard: orchard._id } } },
        { upsert: true }
      );
      await Wishlist.updateOne(
        { user: req.user._id },
        {
          $push: {
            recentlyViewed: {
              $each: [{ orchard: orchard._id, viewedAt: new Date() }],
              $position: 0,
              $slice: 20,
            },
          },
        }
      );
    }
  }

  return ok(res, orchard);
});

/* --------------------------- Related ------------------------------- */
export const getRelatedOrchards = asyncHandler(async (req, res) => {
  const orchard = await Orchard.findOne({ slug: req.params.slug, deletedAt: null }).lean();
  if (!orchard) throw ApiError.notFound('Orchard not found');

  const related = await Orchard.find({
    _id: { $ne: orchard._id },
    status: ORCHARD_STATUS.PUBLISHED,
    deletedAt: null,
    $or: [
      { fruitTypes: { $in: orchard.fruitTypes } },
      { state: orchard.state },
    ],
  })
    .sort({ ratingAverage: -1, viewCount: -1 })
    .limit(6)
    .lean();

  return ok(res, related, 'Related orchards');
});

/* ---------------------------- Create ------------------------------- */
export const createOrchard = asyncHandler(async (req, res) => {
  const settings = await Setting.getSingleton();
  const data = pick(req.body, [...EDITABLE_FIELDS, 'status']);

  data.sellerId = req.user._id;
  data.slug = slugify(data.gardenName);
  if (!data.thumbnail && data.images?.length) data.thumbnail = data.images[0].url;

  // A submitted (non-draft) orchard goes to PENDING, unless auto-approve is on
  if (data.status === ORCHARD_STATUS.PENDING) {
    if (settings.autoApproveOrchards) {
      data.status = ORCHARD_STATUS.PUBLISHED;
      data.publishedAt = new Date();
    }
  }

  const orchard = await Orchard.create(data);
  if (orchard.status === ORCHARD_STATUS.PUBLISHED) {
    notifyFollowersOfOrchard({ sellerId: req.user._id, orchard, isNew: true });
  }
  return created(res, orchard, 'Orchard created');
});

/* ----------------------------- Update ------------------------------ */
const findOwnedOrchard = async (id, user) => {
  const orchard = await Orchard.findOne({ _id: id, deletedAt: null });
  if (!orchard) throw ApiError.notFound('Orchard not found');
  if (user.role !== ROLES.ADMIN && String(orchard.sellerId) !== String(user._id)) {
    throw ApiError.forbidden('You do not own this orchard');
  }
  return orchard;
};

export const updateOrchard = asyncHandler(async (req, res) => {
  const orchard = await findOwnedOrchard(req.params.id, req.user);
  const updates = pick(req.body, EDITABLE_FIELDS);
  Object.assign(orchard, updates);
  if (!orchard.thumbnail && orchard.images?.length) orchard.thumbnail = orchard.images[0].url;
  await orchard.save();

  if (orchard.status === ORCHARD_STATUS.PUBLISHED) {
    notifyFollowersOfOrchard({ sellerId: orchard.sellerId, orchard, isNew: false });
  }

  return ok(res, orchard, 'Orchard updated');
});

/* ----------------------------- Delete ------------------------------ */
export const deleteOrchard = asyncHandler(async (req, res) => {
  const orchard = await findOwnedOrchard(req.params.id, req.user);
  orchard.deletedAt = new Date();
  orchard.status = ORCHARD_STATUS.ARCHIVED;
  await orchard.save();
  return ok(res, null, 'Orchard deleted');
});

/* ----------------------------- Clone ------------------------------- */
export const cloneOrchard = asyncHandler(async (req, res) => {
  const orchard = await findOwnedOrchard(req.params.id, req.user);
  const obj = orchard.toObject();
  delete obj._id;
  delete obj.createdAt;
  delete obj.updatedAt;
  delete obj.id;

  obj.gardenName = `${obj.gardenName} (Copy)`;
  obj.slug = slugify(obj.gardenName);
  obj.status = ORCHARD_STATUS.DRAFT;
  obj.viewCount = 0;
  obj.favouriteCount = 0;
  obj.ratingAverage = 0;
  obj.ratingCount = 0;
  obj.isFeatured = false;
  obj.publishedAt = undefined;

  const clone = await Orchard.create(obj);
  return created(res, clone, 'Orchard cloned');
});

/* ------------------ Publish / Unpublish / Archive ------------------ */
export const setOrchardStatus = (targetStatus) =>
  asyncHandler(async (req, res) => {
    const orchard = await findOwnedOrchard(req.params.id, req.user);
    const settings = await Setting.getSingleton();

    if (targetStatus === 'publish') {
      // Seller publishing => pending moderation (or auto-approve)
      if (settings.autoApproveOrchards || req.user.role === ROLES.ADMIN) {
        orchard.status = ORCHARD_STATUS.PUBLISHED;
        orchard.publishedAt = new Date();
      } else {
        orchard.status = ORCHARD_STATUS.PENDING;
      }
    } else if (targetStatus === 'unpublish') {
      orchard.status = ORCHARD_STATUS.UNPUBLISHED;
    } else if (targetStatus === 'archive') {
      orchard.status = ORCHARD_STATUS.ARCHIVED;
      orchard.archivedAt = new Date();
    }

    await orchard.save();

    if (orchard.status === ORCHARD_STATUS.PUBLISHED) {
      notifyFollowersOfOrchard({ sellerId: orchard.sellerId, orchard, isNew: true });
    }

    return ok(res, orchard, `Orchard ${targetStatus} done`);
  });

/* --------------------- Availability toggle ------------------------- */
export const toggleAvailability = asyncHandler(async (req, res) => {
  const orchard = await findOwnedOrchard(req.params.id, req.user);
  orchard.available = !orchard.available;
  await orchard.save();
  return ok(res, { available: orchard.available }, 'Availability toggled');
});

/* ------------------------- Upload images --------------------------- */
export const uploadOrchardImages = asyncHandler(async (req, res) => {
  if (!req.files?.length) throw ApiError.badRequest('No images uploaded');
  const results = await uploadMany(req.files, 'orchards');
  return ok(res, results, 'Images uploaded');
});

/* -------------- Seller's own orchards (incl. drafts) --------------- */
export const listMyOrchards = asyncHandler(async (req, res) => {
  const q = req.validatedQuery || req.query;
  const { page, limit, skip } = getPagination(q);
  const filter = { sellerId: req.user._id, deletedAt: null };
  if (q.status) filter.status = q.status;
  if (q.search) filter.gardenName = new RegExp(q.search, 'i');

  const [items, total] = await Promise.all([
    Orchard.find(filter).sort(SORT_MAP[q.sort] || SORT_MAP.newest).skip(skip).limit(limit).lean(),
    Orchard.countDocuments(filter),
  ]);

  return ok(res, items, 'My orchards', buildPageMeta({ page, limit, total }));
});
