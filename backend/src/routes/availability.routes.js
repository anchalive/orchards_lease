import { Router } from 'express';
import {
  getOrchardAvailability,
  createBlockedDate,
  updateBlockedDate,
  deleteBlockedDate,
  updateOrchardAvailability,
} from '../controllers/availability.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

import { validate } from '../middleware/validate.middleware.js';
import {
  createBlockDateSchema,
  updateBlockDateSchema,
  blockIdParamSchema,
} from '../validators/availability.validator.js';

const router = Router({ mergeParams: true });

// GET /api/orchards/:id/availability (Public)
router.get('/:id/availability', getOrchardAvailability);

// PUT /api/orchards/:id/availability (requireAuthed / Seller)
router.put('/:id/availability', requireAuth, updateOrchardAvailability);
// POST /api/orchards/:id/block-dates (requireAuthed / Seller / Admin)
router.post('/:id/block-dates', requireAuth, validate(createBlockDateSchema), createBlockedDate);

// PUT /api/orchards/:id/block-dates/:blockId (requireAuthed / Seller / Admin)
router.put('/:id/block-dates/:blockId', requireAuth, validate(updateBlockDateSchema), updateBlockedDate);

// DELETE /api/orchards/:id/block-dates/:blockId (requireAuthed / Seller / Admin)
router.delete('/:id/block-dates/:blockId', requireAuth, validate(blockIdParamSchema), deleteBlockedDate);

// PUT /api/orchards/:id/availability (Legacy / requireAuthed)
router.put('/:id/availability', requireAuth, updateOrchardAvailability);

export default router;