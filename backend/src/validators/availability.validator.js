import { z } from 'zod';
import { objectId } from './common.validator.js';

export const createBlockDateSchema = {
  params: z.object({ id: objectId }),
  body: z
    .object({
      startDate: z.coerce.date(),
      endDate: z.coerce.date(),
      reason: z
        .enum(['Maintenance', 'Harvest', 'Personal', 'System'])
        .optional()
        .default('Personal'),
      note: z.string().max(500).optional().default(''),
    })
    .refine((data) => data.endDate > data.startDate, {
      message: 'End date must be after start date',
      path: ['endDate'],
    })
    .refine(
      (data) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return data.startDate >= today;
      },
      {
        message: 'Start date cannot be in the past',
        path: ['startDate'],
      }
    ),
};

export const updateBlockDateSchema = {
  params: z.object({ id: objectId, blockId: objectId }),
  body: z
    .object({
      startDate: z.coerce.date().optional(),
      endDate: z.coerce.date().optional(),
      reason: z
        .enum(['Maintenance', 'Harvest', 'Personal', 'System'])
        .optional(),
      note: z.string().max(500).optional(),
    })
    .refine(
      (data) => {
        if (data.startDate && data.endDate) {
          return data.endDate > data.startDate;
        }
        return true;
      },
      {
        message: 'End date must be after start date',
        path: ['endDate'],
      }
    ),
};

export const blockIdParamSchema = {
  params: z.object({ id: objectId, blockId: objectId }),
};
