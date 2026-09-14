import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import { ok } from '../utils/ApiResponse.js';
import { getPagination, buildPageMeta } from '../utils/helpers.js';
import {
  ROLES,
  ACCOUNT_STATUS,
  ORCHARD_STATUS,
  AUDIT_ACTION,
  NOTIFICATION_TYPE,
} from '../utils/constants.js';

import User from '../models/User.js';
import Orchard from '../models/Orchard.js';
import Booking from '../models/Booking.js';
import Review from '../models/Review.js';
import AuditLog from '../models/AuditLog.js';
import Setting from '../models/Setting.js';

import {
  getAdminKpis,
  getUserGrowthSeries,
  getRevenueSeries,
  getGeographicDistribution,
  getTopSellers,
  getTopFruitCategories,
  getDailyTraffic,
} from '../services/analytics.service.js';
import { recordAudit } from '../services/audit.service.js';
import { notify } from '../services/notification.service.js';
import { notifyFollowersOfOrchard } from '../services/follow.service.js';
import { invalidateMaintenanceCache } from '../middleware/maintenance.middleware.js';
import { revokeAllSessions } from '../services/token.service.js';

/* =================================================================== */
/*  DASHBOARD / ANALYTICS                                               */
/* =================================================================== */

export const getDashboard = asyncHandler(async (_req, res) => {
  const [kpis, userGrowth, revenue, geo, topSellers, topFruits, traffic] = await Promise.all([
    getAdminKpis(),
    getUserGrowthSeries(12),
    getRevenueSeries(12),
    getGeographicDistribution(),
    getTopSellers(5),
    getTopFruitCategories(8),
    getDailyTraffic(30),
  ]);

  return ok(
    res,
    { kpis, userGrowth, revenue, geographic: geo, topSellers, topFruits, dailyTraffic: traffic },
    'Admin dashboard'
  );
});

export const getAnalytics = asyncHandler(async (req, res) => {
  const months = Math.min(parseInt(req.query.months, 10) || 12, 24);
  const [revenue, userGrowth, geo, topSellers, topFruits] = await Promise.all([
    getRevenueSeries(months),
    getUserGrowthSeries(months),
    getGeographicDistribution(),
    getTopSellers(10),
    getTopFruitCategories(10),
  ]);
  return ok(res, { revenue, userGrowth, geographic: geo, topSellers, topFruits }, 'Analytics');
});

/* =================================================================== */
/*  USER MANAGEMENT                                                     */
/* =================================================================== */

export const listUsers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = { deletedAt: null };

  if (req.query.role) filter.role = req.query.role;
  if (req.query.status) filter.accountStatus = req.query.status;
  if (req.query.blocked === 'true') filter.isBlocked = true;
  if (req.query.search) {
    filter.$or = [
      { name: new RegExp(req.query.search, 'i') },
      { email: new RegExp(req.query.search, 'i') },
    ];
  }

  const [items, total, roleInsights] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    User.countDocuments(filter),
    User.aggregate([
      { $match: { deletedAt: null } },
      { $group: { _id: '$role', count: { $sum: 1 } } },
    ]),
  ]);

  const insights = roleInsights.reduce((acc, r) => ({ ...acc, [r._id]: r.count }), {});
  return ok(res, items, 'Users', { ...buildPageMeta({ page, limit, total }), roleInsights: insights });
});

export const getUserDetail = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).lean();
  if (!user) throw ApiError.notFound('User not found');

  const [orchards, bookings] = await Promise.all([
    user.role === ROLES.SELLER ? Orchard.countDocuments({ sellerId: user._id, deletedAt: null }) : 0,
    Booking.find(user.role === ROLES.SELLER ? { sellerId: user._id } : { renterId: user._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('orchardId', 'gardenName slug')
      .lean(),
  ]);

  return ok(res, { user, stats: { orchards, recentBookings: bookings } }, 'User detail');
});

export const updateUserStatus = asyncHandler(async (req, res) => {
  const { action, reason } = req.body;
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');
  if (user.role === ROLES.ADMIN) throw ApiError.forbidden('Cannot modify an admin account');

  let auditAction;
  switch (action) {
    case 'block':
      user.isBlocked = true;
      auditAction = AUDIT_ACTION.USER_BLOCK;
      break;
    case 'unblock':
      user.isBlocked = false;
      auditAction = AUDIT_ACTION.USER_UNBLOCK;
      break;
    case 'suspend':
      user.accountStatus = ACCOUNT_STATUS.SUSPENDED;
      auditAction = AUDIT_ACTION.USER_SUSPEND;
      break;
    case 'activate':
      user.accountStatus = ACCOUNT_STATUS.ACTIVE;
      user.isBlocked = false;
      auditAction = 'user.activate';
      break;
    default:
      throw ApiError.badRequest('Unknown action');
  }
  await user.save();

  if (action === 'block' || action === 'suspend') await revokeAllSessions(user._id);

  await recordAudit({
    actorLabel: req.user.email,
    actorRole: ROLES.ADMIN,
    action: auditAction,
    targetType: 'User',
    targetId: user._id,
    description: reason || '',
    req,
  });
  await notify({
    user: user._id,
    type: NOTIFICATION_TYPE.ACCOUNT,
    title: `Account ${action}`,
    message: reason || `Your account was ${action}ed by an administrator.`,
  });

  return ok(res, user, `User ${action} done`);
});

export const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');
  if (user.role === ROLES.ADMIN) throw ApiError.forbidden('Cannot delete an admin account');

  user.deletedAt = new Date();
  user.accountStatus = ACCOUNT_STATUS.DEACTIVATED;
  user.email = `deleted_${user._id}@orchardlease.invalid`;
  await user.save();
  await Orchard.updateMany({ sellerId: user._id }, { status: ORCHARD_STATUS.ARCHIVED });
  await revokeAllSessions(user._id);

  await recordAudit({
    actorLabel: req.user.email,
    actorRole: ROLES.ADMIN,
    action: AUDIT_ACTION.USER_DELETE,
    targetType: 'User',
    targetId: user._id,
    req,
  });

  return ok(res, null, 'User deleted');
});

/* =================================================================== */
/*  ORCHARD MODERATION                                                  */
/* =================================================================== */

export const listOrchardsForModeration = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = { deletedAt: null };
  if (req.query.status) filter.status = req.query.status;
  if (req.query.search) filter.gardenName = new RegExp(req.query.search, 'i');

  const [items, total] = await Promise.all([
    Orchard.find(filter)
      .populate('sellerId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Orchard.countDocuments(filter),
  ]);

  return ok(res, items, 'Orchards for moderation', buildPageMeta({ page, limit, total }));
});

export const getApprovalQueue = asyncHandler(async (req, res) => {
  const items = await Orchard.find({ status: ORCHARD_STATUS.PENDING, deletedAt: null })
    .populate('sellerId', 'name email')
    .sort({ createdAt: 1 })
    .limit(50)
    .lean();
  return ok(res, items, 'Approval queue');
});

const applyModeration = async (orchard, action, reason, admin, req) => {
  let auditAction;
  switch (action) {
    case 'approve':
      orchard.status = ORCHARD_STATUS.PUBLISHED;
      orchard.publishedAt = new Date();
      orchard.rejectionReason = '';
      auditAction = AUDIT_ACTION.ORCHARD_APPROVE;
      break;
    case 'reject':
      orchard.status = ORCHARD_STATUS.REJECTED;
      orchard.rejectionReason = reason || '';
      auditAction = AUDIT_ACTION.ORCHARD_REJECT;
      break;
    case 'feature':
      orchard.isFeatured = true;
      auditAction = AUDIT_ACTION.ORCHARD_FEATURE;
      break;
    case 'unfeature':
      orchard.isFeatured = false;
      auditAction = AUDIT_ACTION.ORCHARD_FEATURE;
      break;
    case 'archive':
      orchard.status = ORCHARD_STATUS.ARCHIVED;
      orchard.archivedAt = new Date();
      auditAction = 'orchard.archive';
      break;
    case 'delete':
      orchard.deletedAt = new Date();
      orchard.status = ORCHARD_STATUS.ARCHIVED;
      auditAction = AUDIT_ACTION.ORCHARD_DELETE;
      break;
    default:
      throw ApiError.badRequest('Unknown action');
  }
  await orchard.save();
  await recordAudit({
    actorLabel: admin.email,
    actorRole: ROLES.ADMIN,
    action: auditAction,
    targetType: 'Orchard',
    targetId: orchard._id,
    description: reason || '',
    req,
  });
};

export const moderateOrchard = asyncHandler(async (req, res) => {
  const { action, reason } = req.body;
  const orchard = await Orchard.findById(req.params.id);
  if (!orchard) throw ApiError.notFound('Orchard not found');

  await applyModeration(orchard, action, reason, req.user, req);

  if (action === 'approve' || action === 'reject') {
    await notify({
      user: orchard.sellerId,
      type: NOTIFICATION_TYPE.APPROVAL,
      title: `Orchard ${action}ed`,
      message:
        action === 'approve'
          ? `Your orchard "${orchard.gardenName}" is now live.`
          : `Your orchard "${orchard.gardenName}" was rejected. ${reason || ''}`,
      link: '/seller/orchards',
      email: true,
    });

    if (action === 'approve') {
      await notifyFollowersOfOrchard({ sellerId: orchard.sellerId, orchard, isNew: true });
    }
  }

  return ok(res, orchard, `Orchard ${action} done`);
});

export const bulkModerateOrchards = asyncHandler(async (req, res) => {
  const { ids, action, reason } = req.body;
  const orchards = await Orchard.find({ _id: { $in: ids } });

  await Promise.all(orchards.map((o) => applyModeration(o, action, reason, req.user, req)));

  return ok(res, { affected: orchards.length }, `Bulk ${action} done`);
});

export const getReportedReviews = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {};
  if (req.query.status === 'reported') filter.isReported = true;
  else if (req.query.status === 'hidden') filter.isHidden = true;
  else if (req.query.status === 'pending') filter.status = 'pending';
  else filter.$or = [{ isReported: true }, { isHidden: true }];

  const [items, total] = await Promise.all([
    Review.find(filter)
      .populate('renterId', 'name email avatar')
      .populate('sellerId', 'name email')
      .populate('orchardId', 'gardenName slug')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Review.countDocuments(filter),
  ]);
  return ok(res, items, 'Reported reviews', buildPageMeta({ page, limit, total }));
});

export const moderateReview = asyncHandler(async (req, res) => {
  const { action } = req.body; // 'approve' | 'reject' | 'hide' | 'unhide' | 'dismiss' | 'delete'
  const review = await Review.findById(req.params.id);
  if (!review) throw ApiError.notFound('Review not found');

  const orchardId = review.orchardId;
  if (action === 'hide') {
    review.isHidden = true;
    await review.save();
  } else if (action === 'unhide') {
    review.isHidden = false;
    await review.save();
  } else if (action === 'dismiss') {
    review.isReported = false;
    await review.save();
  } else if (action === 'approve') {
    review.status = 'approved';
    review.isHidden = false;
    review.isReported = false;
    await review.save();
  } else if (action === 'reject') {
    review.status = 'rejected';
    review.isHidden = true;
    await review.save();
  } else if (action === 'delete') {
    await Review.findByIdAndDelete(req.params.id);
  } else {
    throw ApiError.badRequest('Unknown action');
  }

  await Review.recalculateRating(orchardId);
  return ok(res, null, `Review ${action} action completed`);
});


/* =================================================================== */
/*  AUDIT LOGS                                                          */
/* =================================================================== */

export const listAuditLogs = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {};
  if (req.query.action) filter.action = req.query.action;
  const [items, total] = await Promise.all([
    AuditLog.find(filter)
      .populate('actor', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    AuditLog.countDocuments(filter),
  ]);
  return ok(res, items, 'Audit logs', buildPageMeta({ page, limit, total }));
});

/* =================================================================== */
/*  SETTINGS                                                            */
/* =================================================================== */

export const getSettings = asyncHandler(async (_req, res) => {
  const settings = await Setting.getSingleton();
  return ok(res, settings, 'Global settings');
});

export const updateSettings = asyncHandler(async (req, res) => {
  const settings = await Setting.getSingleton();
  const before = { maintenanceMode: settings.maintenanceMode };

  Object.entries(req.body).forEach(([key, value]) => {
    if (key === 'announcement' && value) {
      settings.announcement = { ...settings.announcement.toObject(), ...value };
    } else {
      settings[key] = value;
    }
  });
  await settings.save();
  invalidateMaintenanceCache();

  await recordAudit({
    actorLabel: req.user.email,
    actorRole: ROLES.ADMIN,
    action:
      before.maintenanceMode !== settings.maintenanceMode
        ? AUDIT_ACTION.MAINTENANCE_TOGGLE
        : AUDIT_ACTION.SETTINGS_UPDATE,
    description: JSON.stringify(req.body),
    req,
  });

  return ok(res, settings, 'Settings updated');
});

/* ---------------- Export analytics report (CSV) -------------------- */
export const exportReport = asyncHandler(async (req, res) => {
  const revenue = await getRevenueSeries(12);
  const header = ['Month', 'Revenue', 'Bookings'];
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = revenue.map((r) => [r.label, r.revenue, r.bookings].map(escape).join(','));
  const csv = [header.map(escape).join(','), ...rows].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="orchardlease-report.csv"');
  return res.send(csv);
});
