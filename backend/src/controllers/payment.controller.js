import Payment from '../models/Payment.js';
import Booking from '../models/Booking.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import { ok, created } from '../utils/ApiResponse.js';
import { notify } from '../services/notification.service.js';
import { NOTIFICATION_TYPE, BOOKING_STATUS } from '../utils/constants.js';
import { calculatePaymentSchedule } from '../utils/paymentSchedule.js';

export const initializePayment = asyncHandler(async (req, res) => {
  const { bookingId, paymentMethod = 'UPI', amount } = req.body;

  const booking = await Booking.findById(bookingId).populate('orchardId', 'gardenName');
  if (!booking) throw ApiError.notFound('Booking not found');

  if (String(booking.renterId) !== String(req.user._id)) {
    throw ApiError.forbidden('Only the renter can initialize payment for this lease');
  }

  if ([BOOKING_STATUS.REJECTED, BOOKING_STATUS.CANCELLED, BOOKING_STATUS.COMPLETED].includes(booking.bookingStatus)) {
    throw ApiError.badRequest('Payments are not available for this booking');
  }

  const schedule = calculatePaymentSchedule(booking);
  const amountDueNow = booking.bookingStatus === BOOKING_STATUS.REQUESTED
    ? Math.max(0, schedule.advanceAmount - booking.amountPaid)
    : schedule.remainingAmount;
  if (amountDueNow <= 0) throw ApiError.badRequest('There is no payment due for this booking');
  const requestedAmount = amount === undefined ? amountDueNow : Number(amount);
  if (!Number.isFinite(requestedAmount) || requestedAmount <= 0 || requestedAmount > amountDueNow) {
    throw ApiError.badRequest(`Payment amount must be between ₹1 and ₹${amountDueNow}`);
  }

  const transactionId = `TXN_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
  const receiptNumber = `RCP_${Date.now()}`;

  const payment = await Payment.create({
    bookingId: booking._id,
    payerId: req.user._id,
    recipientId: booking.sellerId,
    amount: requestedAmount,
    paymentType: booking.bookingStatus === BOOKING_STATUS.REQUESTED
      ? 'ADVANCE'
      : requestedAmount === schedule.remainingAmount ? 'BALANCE' : 'PARTIAL',
    currency: 'INR',
    paymentGateway: 'MockGateway',
    paymentMethod,
    transactionId,
    receiptNumber,
    status: 'PENDING',
  });

  return created(res, {
    paymentId: payment._id,
    transactionId: payment.transactionId,
    amount: payment.amount,
    currency: payment.currency,
    receiptNumber: payment.receiptNumber,
    paymentType: payment.paymentType,
    amountDueNow,
    remainingAmount: schedule.remainingAmount,
  }, 'Payment order initialized');
});

export const verifyAndCompletePayment = asyncHandler(async (req, res) => {
  const { paymentId, status = 'SUCCESS', failureReason } = req.body;

  const payment = await Payment.findById(paymentId);
  if (!payment) throw ApiError.notFound('Payment transaction record not found');

  if (String(payment.payerId) !== String(req.user._id)) {
    throw ApiError.forbidden('Unauthorized payment confirmation request');
  }

  if (payment.status === 'SUCCESS') {
    const booking = await Booking.findById(payment.bookingId);
    return ok(res, { payment, booking }, 'Payment already processed successfully');
  }

  if (status === 'FAILED') {
    payment.status = 'FAILED';
    payment.failureReason = failureReason || 'Transaction declined or cancelled by user';
    await payment.save();

    return ok(res, payment, 'Payment recorded as failed');
  }

  payment.status = 'SUCCESS';
  payment.paidAt = new Date();
  await payment.save();

  const booking = await Booking.findById(payment.bookingId);
  if (!booking) throw ApiError.notFound('Booking not found for this payment');
  booking.amountPaid = Math.min(booking.totalAmount, booking.amountPaid + payment.amount);
  booking.addTimeline(
    'PAYMENT_RECEIVED',
    `Online payment of ₹${payment.amount} completed via ${payment.paymentMethod} (Txn: ${payment.transactionId})`,
    req.user._id
  );
  await booking.save();

  // Trigger Notifications
  await notify({
    user: payment.recipientId,
    type: NOTIFICATION_TYPE.BOOKING,
    title: 'Payment Received',
    message: `Payment of ₹${payment.amount} received for lease booking. Receipt: ${payment.receiptNumber}`,
    link: `/seller/bookings/${payment.bookingId}`,
    email: true,
  });

  return ok(res, { payment, booking }, 'Payment confirmed successfully');
});

export const getPaymentReceipt = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id)
    .populate('bookingId', 'gardenName startDate endDate')
    .populate('payerId', 'name email phone')
    .populate('recipientId', 'name email');

  if (!payment) throw ApiError.notFound('Receipt not found');

  const userId = String(req.user._id);
  if (userId !== String(payment.payerId._id) && userId !== String(payment.recipientId._id) && req.user.role !== 'admin') {
    throw ApiError.forbidden('Access denied to this payment receipt');
  }

  return ok(res, payment, 'Payment receipt retrieved');
});

export const getPaymentHistory = asyncHandler(async (req, res) => {
  const { search, status, startDate, endDate } = req.query;
  const userId = req.user._id;
  const filter = { $or: [{ payerId: userId }, { recipientId: userId }] };

  if (status) filter.status = status;
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setDate(end.getDate() + 1);
      filter.createdAt.$lt = end;
    }
  }
  if (search) {
    filter.$and = [{ $or: [{ transactionId: new RegExp(search, 'i') }, { receiptNumber: new RegExp(search, 'i') }] }];
  }

  const [payments, total] = await Promise.all([
    Payment.find(filter).sort({ createdAt: -1 }).lean(),
    Payment.countDocuments(filter),
  ]);

  return ok(res, { payments, total }, 'Payment history retrieved');
});
