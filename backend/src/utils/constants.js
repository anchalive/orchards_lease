export const ROLES = Object.freeze({
  SELLER: 'seller',
  RENTER: 'renter',
  ADMIN: 'admin',
});

export const ACCOUNT_STATUS = Object.freeze({
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  PENDING: 'pending',
  DEACTIVATED: 'deactivated',
});

export const ORCHARD_STATUS = Object.freeze({
  DRAFT: 'draft',
  PENDING: 'pending', // awaiting admin moderation
  PUBLISHED: 'published',
  UNPUBLISHED: 'unpublished',
  REJECTED: 'rejected',
  ARCHIVED: 'archived',
});

export const BOOKING_STATUS = Object.freeze({
  REQUESTED: 'requested',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
});

export const OCCUPANCY_STATUS = Object.freeze({
  AVAILABLE: 'available',
  RESERVED: 'reserved',
  LEASED: 'leased',
  MAINTENANCE: 'maintenance',
});

export const PAYMENT_STATUS = Object.freeze({
  UNPAID: 'unpaid',
  PENDING: 'pending',
  PAID: 'paid',
  REFUNDED: 'refunded',
});

export const RENT_TYPE = Object.freeze({
  SEASON: 'season',
  MONTH: 'month',
  YEAR: 'year',
  HARVEST: 'harvest',
});

export const AREA_UNIT = Object.freeze({
  ACRE: 'acre',
  HECTARE: 'hectare',
  BIGHA: 'bigha',
  SQM: 'sqm',
});

export const NOTIFICATION_TYPE = Object.freeze({
  BOOKING: 'booking',
  APPROVAL: 'approval',
  SYSTEM: 'system',
  REVIEW: 'review',
  ACCOUNT: 'account',
});

export const AUDIT_ACTION = Object.freeze({
  LOGIN: 'login',
  LOGOUT: 'logout',
  USER_BLOCK: 'user.block',
  USER_UNBLOCK: 'user.unblock',
  USER_SUSPEND: 'user.suspend',
  USER_DELETE: 'user.delete',
  ORCHARD_APPROVE: 'orchard.approve',
  ORCHARD_REJECT: 'orchard.reject',
  ORCHARD_FEATURE: 'orchard.feature',
  ORCHARD_DELETE: 'orchard.delete',
  SETTINGS_UPDATE: 'settings.update',
  MAINTENANCE_TOGGLE: 'maintenance.toggle',
});

export const TOKEN_TYPE = Object.freeze({
  ACCESS: 'access',
  REFRESH: 'refresh',
  RESET: 'reset',
  VERIFY: 'verify',
});

export const FRUIT_TYPES = Object.freeze([
  'apple',
  'mango',
  'orange',
  'guava',
  'banana',
  'pomegranate',
  'litchi',
  'grape',
  'pear',
  'plum',
  'cherry',
  'apricot',
  'peach',
  'fig',
  'date',
  'walnut',
  'almond',
]);

export const AMENITIES = Object.freeze([
  'irrigation',
  'fencing',
  'storage',
  'electricity',
  'water_source',
  'road_access',
  'farmhouse',
  'security',
  'cold_storage',
  'parking',
]);

export const DEFAULT_PAGE_SIZE = 12;
export const MAX_PAGE_SIZE = 100;

export const HEALTH_SCORE_WEIGHTS = Object.freeze({
  soilFertility: 20,
  maintenanceStatus: 20,
  irrigation: 15,
  waterSourceQuality: 10,
  pestHistory: 10,
  diseaseHistory: 10,
  organicCertification: 5,
  productionEstimate: 5,
  orchardAge: 5,
});

export const SOIL_FERTILITY_SCORES = Object.freeze({
  High: 20,
  Medium: 12,
  Low: 5,
  Unknown: 0,
});

export const MAINTENANCE_STATUS_SCORES = Object.freeze({
  Good: 20,
  Average: 12,
  Poor: 5,
  Unknown: 0,
});

export const WATER_SOURCE_QUALITY_SCORES = Object.freeze({
  High: 10,
  Medium: 6,
  Low: 2,
  Unknown: 0,
});

export const PEST_HISTORY_SCORES = Object.freeze({
  Low: 10,
  Medium: 6,
  High: 2,
  Unknown: 0,
});

export const DISEASE_HISTORY_SCORES = Object.freeze({
  Low: 10,
  Medium: 6,
  High: 2,
  Unknown: 0,
});

export const RECOMMENDATION_WEIGHTS = Object.freeze({
  BOOKING_HISTORY: 30,
  WISHLIST: 20,
  PREFERRED_FRUITS: 15,
  LOCATION: 10,
  BUDGET: 10,
  RATINGS: 10,
  POPULARITY: 5,
});


