import { Router } from 'express';
import * as orchard from '../controllers/orchard.controller.js';
import * as review from '../controllers/review.controller.js';
import * as question from '../controllers/question.controller.js';
import * as health from '../controllers/health.controller.js';
import * as harvest from '../controllers/harvest.controller.js';
import { requireAuth, optionalAuth } from '../middleware/auth.middleware.js';
import { restrictTo } from '../middleware/role.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { uploadImages } from '../middleware/upload.middleware.js';
import { ROLES } from '../utils/constants.js';
import {
  createOrchardSchema,
  updateOrchardSchema,
  orchardQuerySchema,
  updateHarvestSchema,
  patchHarvestSchema,
} from '../validators/orchard.validator.js';
import { idParam, slugParam } from '../validators/common.validator.js';
import {
  listQuestionsQuerySchema,
  createQuestionSchema,
} from '../validators/question.validator.js';
import { createReviewSchema } from '../validators/review.validator.js';

const router = Router();


/* ----------------------------- Public ------------------------------ */
/**
 * @openapi
 * /orchards:
 *   get:
 *     tags: [Orchards]
 *     summary: Search & list published orchards
 *     responses:
 *       200: { description: Orchard list with pagination meta }
 */
router.get('/', validate(orchardQuerySchema), orchard.listOrchards);

/* ------------------ Seller-owned (place before :slug) --------------- */
router.get('/mine/list', requireAuth, restrictTo(ROLES.SELLER, ROLES.ADMIN), orchard.listMyOrchards);
router.post(
  '/',
  requireAuth,
  restrictTo(ROLES.SELLER, ROLES.ADMIN),
  validate(createOrchardSchema),
  orchard.createOrchard
);
router.post(
  '/upload',
  requireAuth,
  restrictTo(ROLES.SELLER, ROLES.ADMIN),
  uploadImages.array('images', 10),
  orchard.uploadOrchardImages
);

router.patch(
  '/:id',
  requireAuth,
  restrictTo(ROLES.SELLER, ROLES.ADMIN),
  validate({ params: idParam, ...updateOrchardSchema }),
  orchard.updateOrchard
);
router.delete('/:id', requireAuth, restrictTo(ROLES.SELLER, ROLES.ADMIN), validate({ params: idParam }), orchard.deleteOrchard);
router.post('/:id/clone', requireAuth, restrictTo(ROLES.SELLER, ROLES.ADMIN), validate({ params: idParam }), orchard.cloneOrchard);
router.post('/:id/publish', requireAuth, restrictTo(ROLES.SELLER, ROLES.ADMIN), validate({ params: idParam }), orchard.setOrchardStatus('publish'));
router.post('/:id/unpublish', requireAuth, restrictTo(ROLES.SELLER, ROLES.ADMIN), validate({ params: idParam }), orchard.setOrchardStatus('unpublish'));
router.post('/:id/archive', requireAuth, restrictTo(ROLES.SELLER, ROLES.ADMIN), validate({ params: idParam }), orchard.setOrchardStatus('archive'));
router.post('/:id/toggle-availability', requireAuth, restrictTo(ROLES.SELLER, ROLES.ADMIN), validate({ params: idParam }), orchard.toggleAvailability);

/* ------------------------- Public by slug -------------------------- */
router.get('/:slug', validate({ params: slugParam }), optionalAuth, orchard.getOrchardBySlug);
router.get('/:slug/related', validate({ params: slugParam }), orchard.getRelatedOrchards);

/* ------------------------ Nested reviews --------------------------- */
router.get('/:orchardId/reviews', review.listOrchardReviews);
router.get('/:id/reviews', validate({ params: idParam }), review.listOrchardReviews);
router.post('/:id/reviews', requireAuth, restrictTo(ROLES.RENTER), validate({ params: idParam, ...createReviewSchema }), review.createReview);
router.get('/:id/reviewable-booking', requireAuth, validate({ params: idParam }), review.getReviewableBooking);


/* ------------------------ Health Score ----------------------------- */
router.get('/:id/health-score', optionalAuth, validate({ params: idParam }), health.getHealthScore);

/* ------------------------ Harvest Schedule ------------------------- */
router.get('/:id/harvest', optionalAuth, validate({ params: idParam }), harvest.getHarvestSchedule);
router.put('/:id/harvest', requireAuth, restrictTo(ROLES.SELLER, ROLES.ADMIN), validate({ params: idParam, ...updateHarvestSchema }), harvest.updateHarvestSchedule);
router.patch('/:id/harvest', requireAuth, restrictTo(ROLES.SELLER, ROLES.ADMIN), validate({ params: idParam, ...patchHarvestSchema }), harvest.patchHarvestSchedule);


/* -------------------------- Nested Q&As ---------------------------- */
router.get('/:id/questions', optionalAuth, validate({ params: idParam, ...listQuestionsQuerySchema }), question.listOrchardQuestions);
router.post('/:id/questions', requireAuth, validate({ params: idParam, ...createQuestionSchema }), question.createQuestion);

export default router;
