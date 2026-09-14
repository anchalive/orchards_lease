import { z } from 'zod';
import { objectId } from './common.validator.js';

export const createReviewSchema = {
  body: z.object({
    orchardId: objectId.optional(),
    bookingId: objectId,
    rating: z.coerce.number().int().min(1).max(5),
    cleanlinessRating: z.coerce.number().int().min(1).max(5).optional().default(5),
    maintenanceRating: z.coerce.number().int().min(1).max(5).optional().default(5),
    accessibilityRating: z.coerce.number().int().min(1).max(5).optional().default(5),
    communicationRating: z.coerce.number().int().min(1).max(5).optional().default(5),
    comment: z.string().max(2000).optional().default(''),
  }),
};

export const updateReviewSchema = {
  body: z.object({
    rating: z.coerce.number().int().min(1).max(5).optional(),
    cleanlinessRating: z.coerce.number().int().min(1).max(5).optional(),
    maintenanceRating: z.coerce.number().int().min(1).max(5).optional(),
    accessibilityRating: z.coerce.number().int().min(1).max(5).optional(),
    communicationRating: z.coerce.number().int().min(1).max(5).optional(),
    comment: z.string().max(2000).optional(),
  }),
};

