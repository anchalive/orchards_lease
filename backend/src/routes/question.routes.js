import { Router } from 'express';
import * as question from '../controllers/question.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { restrictTo } from '../middleware/role.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { ROLES } from '../utils/constants.js';
import {
  answerQuestionSchema,
  officialAnswerSchema,
} from '../validators/question.validator.js';
import { idParam } from '../validators/common.validator.js';

const router = Router();

// Seller-owned questions view
router.get(
  '/seller',
  requireAuth,
  restrictTo(ROLES.SELLER, ROLES.ADMIN),
  question.listSellerQuestions
);

// Admin view all questions
router.get(
  '/',
  requireAuth,
  restrictTo(ROLES.ADMIN),
  question.listAllQuestions
);

// Answer question
router.put(
  '/:id/answer',
  requireAuth,
  restrictTo(ROLES.SELLER, ROLES.ADMIN),
  validate({ params: idParam, ...answerQuestionSchema }),
  question.answerQuestion
);

// Delete answer / reply (Seller or Admin)
router.delete(
  '/:id/answer',
  requireAuth,
  restrictTo(ROLES.SELLER, ROLES.ADMIN),
  validate({ params: idParam }),
  question.deleteAnswer
);

// Toggle official answer
router.patch(
  '/:id/official',
  requireAuth,
  restrictTo(ROLES.SELLER, ROLES.ADMIN),
  validate({ params: idParam, ...officialAnswerSchema }),
  question.patchOfficialAnswer
);

// Report a question
router.patch(
  '/:id/report',
  requireAuth,
  validate({ params: idParam }),
  question.reportQuestion
);

// Dismiss report (Admin only)
router.patch(
  '/:id/dismiss',
  requireAuth,
  restrictTo(ROLES.ADMIN),
  validate({ params: idParam }),
  question.dismissReport
);

// Delete question (Admin only)
router.delete(
  '/:id',
  requireAuth,
  restrictTo(ROLES.ADMIN),
  validate({ params: idParam }),
  question.deleteQuestion
);

export default router;
