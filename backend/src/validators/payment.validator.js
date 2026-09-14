import { z } from 'zod';
import { objectId } from './common.validator.js';

export const paymentInitializeSchema = {
  body: z.object({
    bookingId: objectId,
    paymentMethod: z.enum(['CARD', 'UPI', 'NET_BANKING', 'WALLET', 'OTHER']).optional().default('UPI'),
    amount: z.number().positive().optional(),
  }),
};

export const paymentVerifySchema = {
  body: z.object({
    paymentId: objectId,
    status: z.enum(['SUCCESS', 'FAILED']).optional().default('SUCCESS'),
    failureReason: z.string().max(500).optional(),
  }),
};