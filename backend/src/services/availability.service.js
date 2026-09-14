import Orchard from '../models/Orchard.js';
import Booking from '../models/Booking.js';
import { BOOKING_STATUS, OCCUPANCY_STATUS } from '../utils/constants.js';

/**
 * Checks whether two half-open date ranges [startA, endA) and [startB, endB) overlap.
 */
export const checkRangesOverlap = (startA, endA, startB, endB) => {
  const aStart = new Date(startA).getTime();
  const aEnd = new Date(endA).getTime();
  const bStart = new Date(startB).getTime();
  const bEnd = new Date(endB).getTime();

  return aStart < bEnd && aEnd > bStart;
};

/**
 * Validates whether a proposed range [start, end) overlaps with existing blocked dates on an orchard.
 */
export const hasBlockedDateOverlap = (blockedDates = [], startDate, endDate, excludeBlockId = null) => {
  return blockedDates.some((block) => {
    if (excludeBlockId && block._id && block._id.toString() === excludeBlockId.toString()) {
      return false;
    }
    return checkRangesOverlap(startDate, endDate, block.startDate, block.endDate);
  });
};

/**
 * Validates whether a proposed range [start, end) overlaps with active bookings for an orchard.
 */
export const hasActiveBookingOverlap = async (orchardId, startDate, endDate) => {
  const overlap = await Booking.findOne({
    orchardId,
    bookingStatus: { $in: [BOOKING_STATUS.APPROVED, BOOKING_STATUS.REQUESTED] },
    startDate: { $lt: endDate },
    endDate: { $gt: startDate },
  });

  return Boolean(overlap);
};

/**
 * Determines an orchard's current occupancy status for a given moment in time.
 */
export const computeOccupancyStatus = (blockedDates = [], activeBookings = [], atDate = new Date()) => {
  const covers = (start, end) => new Date(start) <= atDate && atDate < new Date(end);

  if (blockedDates.some((b) => b.reason === 'Maintenance' && covers(b.startDate, b.endDate))) {
    return OCCUPANCY_STATUS.MAINTENANCE;
  }
  if (activeBookings.some((b) => b.status === BOOKING_STATUS.APPROVED && covers(b.startDate, b.endDate))) {
    return OCCUPANCY_STATUS.LEASED;
  }
  if (activeBookings.some((b) => b.status === BOOKING_STATUS.REQUESTED && covers(b.startDate, b.endDate))) {
    return OCCUPANCY_STATUS.RESERVED;
  }
  return OCCUPANCY_STATUS.AVAILABLE;
};

/**
 * Assembles and returns full availability object for an orchard.
 */
export const fetchOrchardAvailability = async (orchardId) => {
  const orchard = await Orchard.findById(orchardId)
    .select('gardenName availabilityDates blockedDates available sellerId status harvestSeasons')
    .lean();

  if (!orchard) {
    return null;
  }

  // Active bookings (REQUESTED and APPROVED)
  const activeBookings = await Booking.find({
    orchardId,
    bookingStatus: { $in: [BOOKING_STATUS.APPROVED, BOOKING_STATUS.REQUESTED] },
  })
    .select('_id startDate endDate bookingStatus renterId')
    .sort({ startDate: 1 })
    .lean();

  const bookedDates = activeBookings.map((b) => ({
    _id: b._id,
    startDate: b.startDate,
    endDate: b.endDate,
    status: b.bookingStatus,
  }));

  const blockedDates = orchard.blockedDates || [];

  const maintenancePeriods = blockedDates.filter((b) => b.reason === 'Maintenance');
  const harvestPeriods = blockedDates.filter((b) => b.reason === 'Harvest');
  const personalPeriods = blockedDates.filter((b) => b.reason === 'Personal');
  const systemPeriods = blockedDates.filter((b) => b.reason === 'System');
  const occupancyStatus = computeOccupancyStatus(blockedDates, bookedDates);
  return {
    orchardId: orchard._id,
    gardenName: orchard.gardenName,
    available: orchard.available,
    occupancyStatus,
    availabilityDates: orchard.availabilityDates || [],
    blockedDates,
    bookedDates,
    maintenancePeriods,
    harvestPeriods,
    personalPeriods,
    systemPeriods,
    harvestSeasons: orchard.harvestSeasons || [],
  };
};
