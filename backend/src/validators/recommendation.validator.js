import { z } from 'zod';
import { objectId } from './common.validator.js';

export const recommendationQuerySchema = {
  query: z.object({
    limit: z.coerce.number().int().min(1).max(50).optional().default(10),
    fruit: z.string().trim().optional(),
    state: z.string().trim().optional(),
    district: z.string().trim().optional(),
    maxPrice: z.coerce.number().min(0).optional(),
  }),
};

export const similarOrchardParamSchema = {
  params: z.object({
    orchardId: objectId,
  }),
  query: z.object({
    limit: z.coerce.number().int().min(1).max(20).optional().default(6),
  }),
};
