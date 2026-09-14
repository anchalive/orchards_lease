import { Router } from 'express';
import * as seller from '../controllers/seller.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { restrictTo } from '../middleware/role.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { idParam } from '../validators/common.validator.js';
import { ROLES } from '../utils/constants.js';

const router = Router();
router.use(requireAuth, restrictTo(ROLES.SELLER, ROLES.ADMIN));

router.get('/overview', seller.getOverview);
router.get('/revenue', seller.getRevenue);
router.get('/inquiries/analytics', seller.getInquiryAnalytics);
router.get('/inquiries/export', seller.exportInquiriesCsv);
router.get('/performance', seller.getPerformance);
router.get('/reviews', seller.getSellerReviews);
router.get('/export/bookings', seller.exportBookingsCsv);

/* ---- Per-orchard routes (Feature #28) ---- */
router.get('/orchards/:id/analytics', validate({ params: idParam }), seller.getOrchardAnalytics);
router.get('/orchards/:id/bookings',  validate({ params: idParam }), seller.getOrchardBookings);

export default router;


