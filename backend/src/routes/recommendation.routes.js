import { Router } from 'express';
import * as recommendationController from '../controllers/recommendation.controller.js';
import { optionalAuth } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  recommendationQuerySchema,
  similarOrchardParamSchema,
} from '../validators/recommendation.validator.js';

const router = Router();

/**
 * @openapi
 * /recommendations:
 *   get:
 *     summary: Get personalized orchard recommendations
 *     tags: [Recommendations]
 *     responses:
 *       200: { description: Personalized orchard recommendations list }
 */
router.get(
  '/',
  optionalAuth,
  validate(recommendationQuerySchema),
  recommendationController.getPersonalizedRecommendations
);

/**
 * @openapi
 * /recommendations/similar/{orchardId}:
 *   get:
 *     summary: Get similar orchards for a target orchard
 *     tags: [Recommendations]
 *     responses:
 *       200: { description: Similar orchards list }
 */
router.get(
  '/similar/:orchardId',
  optionalAuth,
  validate(similarOrchardParamSchema),
  recommendationController.getSimilarOrchards
);

export default router;
