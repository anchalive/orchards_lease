import Orchard from '../models/Orchard.js';
import { ROLES } from '../utils/constants.js';
import {
  fetchOrchardAvailability,
  hasBlockedDateOverlap,
  hasActiveBookingOverlap,
} from '../services/availability.service.js';

/**
 * Helper to verify requester is orchard owner or admin
 */
const verifyOwnership = (orchard, user) => {
  const isOwner = orchard.sellerId.toString() === user._id.toString();
  const isAdmin = user.role === ROLES.ADMIN;
  if (!isOwner && !isAdmin) {
    const error = new Error('Not authorized to modify availability for this orchard.');
    error.statusCode = 403;
    throw error;
  }
};

/**
 * @desc Get availability & blocked dates for an orchard (Public)
 * @route GET /api/orchards/:id/availability
 */
export const getOrchardAvailability = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = await fetchOrchardAvailability(id);

    if (!data) {
      return res.status(404).json({ success: false, message: 'Orchard not found' });
    }

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Create a new blocked date period (Seller / Admin only)
 * @route POST /api/orchards/:id/block-dates
 */
export const createBlockedDate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { startDate, endDate, reason, note } = req.body;

    const orchard = await Orchard.findById(id);
    if (!orchard) {
      return res.status(404).json({ success: false, message: 'Orchard not found' });
    }

    verifyOwnership(orchard, req.user);

    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid date format provided.' });
    }
    if (start >= end) {
      return res.status(400).json({ success: false, message: 'Start date must be before end date.' });
    }
    if (start < today) {
      return res.status(400).json({ success: false, message: 'Cannot block past dates.' });
    }

    // Check overlaps with existing blocked dates
    if (hasBlockedDateOverlap(orchard.blockedDates, start, end)) {
      return res.status(400).json({
        success: false,
        message: 'The selected range overlaps with an existing blocked period.',
      });
    }

    // Check overlaps with active bookings
    const hasBookingConflict = await hasActiveBookingOverlap(orchard._id, start, end);
    if (hasBookingConflict) {
      return res.status(409).json({
        success: false,
        message: 'The selected range overlaps with an active booking.',
      });
    }

    const newBlock = {
      startDate: start,
      endDate: end,
      reason: reason || 'Personal',
      note: note || '',
      blockedBy: req.user._id,
    };

    orchard.blockedDates.push(newBlock);
    await orchard.save();

    const createdBlock = orchard.blockedDates[orchard.blockedDates.length - 1];

    return res.status(201).json({
      success: true,
      message: 'Blocked period created successfully.',
      data: createdBlock,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

/**
 * @desc Update an existing blocked date period (Seller / Admin only)
 * @route PUT /api/orchards/:id/block-dates/:blockId
 */
export const updateBlockedDate = async (req, res, next) => {
  try {
    const { id, blockId } = req.params;
    const { startDate, endDate, reason, note } = req.body;

    const orchard = await Orchard.findById(id);
    if (!orchard) {
      return res.status(404).json({ success: false, message: 'Orchard not found' });
    }

    verifyOwnership(orchard, req.user);

    const blockItem = orchard.blockedDates.id(blockId);
    if (!blockItem) {
      return res.status(404).json({ success: false, message: 'Blocked date entry not found' });
    }

    const start = startDate ? new Date(startDate) : new Date(blockItem.startDate);
    const end = endDate ? new Date(endDate) : new Date(blockItem.endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid date format provided.' });
    }
    if (start >= end) {
      return res.status(400).json({ success: false, message: 'Start date must be before end date.' });
    }

    // Check overlap with other blocked dates excluding blockId
    if (hasBlockedDateOverlap(orchard.blockedDates, start, end, blockId)) {
      return res.status(400).json({
        success: false,
        message: 'The updated range overlaps with another blocked period.',
      });
    }

    // Check overlap with active bookings
    const hasBookingConflict = await hasActiveBookingOverlap(orchard._id, start, end);
    if (hasBookingConflict) {
      return res.status(409).json({
        success: false,
        message: 'The updated range overlaps with an active booking.',
      });
    }

    blockItem.startDate = start;
    blockItem.endDate = end;
    if (reason !== undefined) blockItem.reason = reason;
    if (note !== undefined) blockItem.note = note;

    await orchard.save();

    return res.status(200).json({
      success: true,
      message: 'Blocked period updated successfully.',
      data: blockItem,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

/**
 * @desc Remove a blocked date period (Seller / Admin only)
 * @route DELETE /api/orchards/:id/block-dates/:blockId
 */
export const deleteBlockedDate = async (req, res, next) => {
  try {
    const { id, blockId } = req.params;

    const orchard = await Orchard.findById(id);
    if (!orchard) {
      return res.status(404).json({ success: false, message: 'Orchard not found' });
    }

    verifyOwnership(orchard, req.user);

    const blockItem = orchard.blockedDates.id(blockId);
    if (!blockItem) {
      return res.status(404).json({ success: false, message: 'Blocked date entry not found' });
    }

    orchard.blockedDates.pull({ _id: blockId });
    await orchard.save();

    return res.status(200).json({
      success: true,
      message: 'Blocked period removed successfully.',
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

/**
 * @desc Bulk update availability & blocked dates (Legacy / Owner only)
 * @route PUT /api/orchards/:id/availability
 */
export const updateOrchardAvailability = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { availabilityDates, blockedDates } = req.body;

    const orchard = await Orchard.findById(id);
    if (!orchard) {
      return res.status(404).json({ success: false, message: 'Orchard not found' });
    }

    verifyOwnership(orchard, req.user);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const validateDatesNotPast = (dateRanges = [], label) => {
      for (const range of dateRanges) {
        const start = new Date(range.startDate);
        const end = new Date(range.endDate);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          throw new Error(`Invalid date format in ${label}.`);
        }
        if (start >= end) {
          throw new Error(`Start date must be before end date in ${label}.`);
        }
        if (start < today) {
          throw new Error(`Past dates cannot be modified in ${label}.`);
        }
      }
    };

    if (availabilityDates) {
      validateDatesNotPast(availabilityDates, 'availabilityDates');
      orchard.availabilityDates = availabilityDates;
    }

    if (blockedDates) {
      validateDatesNotPast(blockedDates, 'blockedDates');
      orchard.blockedDates = blockedDates.map((b) => ({
        ...b,
        reason: b.reason || 'Personal',
        blockedBy: req.user._id,
      }));
    }

    await orchard.save();

    return res.status(200).json({
      success: true,
      message: 'Availability updated successfully.',
      data: {
        availabilityDates: orchard.availabilityDates,
        blockedDates: orchard.blockedDates,
      },
    });
  } catch (error) {
    if (
      error.message &&
      (error.message.includes('Past dates') ||
        error.message.includes('Invalid date') ||
        error.message.includes('Start date'))
    ) {
      return res.status(400).json({ success: false, message: error.message });
    }
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};