import Booking from '../models/Booking.js';
import { BOOKING_STATUS, NOTIFICATION_TYPE } from '../utils/constants.js';
import { notify } from './notification.service.js';

export const sendOutstandingPaymentReminders = async () => {
  const now = new Date();
  const bookings = await Booking.find({
    bookingStatus: BOOKING_STATUS.APPROVED,
    remainingAmount: { $gt: 0 },
    balanceDueDate: { $lte: now },
    $or: [{ lastPaymentReminderAt: null }, { lastPaymentReminderAt: { $lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) } }],
  }).populate('orchardId', 'gardenName');

  await Promise.all(bookings.map(async (booking) => {
    await notify({
      user: booking.renterId,
      type: NOTIFICATION_TYPE.BOOKING,
      title: 'Lease balance due',
      message: `₹${booking.remainingAmount} remains due for ${booking.orchardId?.gardenName || 'your orchard lease'}.`,
      link: `/bookings/${booking._id}`,
      email: true,
    });
    booking.lastPaymentReminderAt = now;
    await booking.save();
  }));

  return bookings.length;
};