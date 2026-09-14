import { z } from 'zod';

export const userActionSchema = {
  body: z.object({
    action: z.enum(['block', 'unblock', 'suspend', 'activate']),
    reason: z.string().max(500).optional(),
  }),
};

export const settingsSchema = {
  body: z.object({
    maintenanceMode: z.boolean().optional(),
    maintenanceMessage: z.string().max(500).optional(),
    announcement: z
      .object({
        enabled: z.boolean().optional(),
        message: z.string().max(500).optional(),
        level: z.enum(['info', 'warning', 'critical']).optional(),
      })
      .optional(),
    autoApproveOrchards: z.boolean().optional(),
    featuredLimit: z.number().int().min(0).max(100).optional(),
    supportEmail: z.string().email().optional(),
    commissionPercent: z.number().min(0).max(100).optional(),
    advancePaymentPercent: z.number().min(0).max(100).optional(),
    balanceDueDaysBeforeLease: z.number().int().min(0).max(365).optional(),
  }),
};

export const bulkOrchardSchema = {
  body: z.object({
    ids: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/)).min(1),
    action: z.enum(['approve', 'reject', 'feature', 'unfeature', 'archive', 'delete']),
    reason: z.string().max(500).optional(),
  }),
};
