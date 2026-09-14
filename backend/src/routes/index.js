import { Router } from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import orchardRoutes from './orchard.routes.js';
import bookingRoutes from './booking.routes.js';
import reviewRoutes from './review.routes.js';
import wishlistRoutes from './wishlist.routes.js';
import notificationRoutes from './notification.routes.js';
import sellerRoutes from './seller.routes.js';
import adminRoutes from './admin.routes.js';
import metaRoutes from './meta.routes.js';
import imageRoutes from './imageRoutes.js';
import availabilityRoutes from './availability.routes.js';
import weatherRoutes from './weather.routes.js';
import questionRoutes from './question.routes.js';
import followRoutes from './follow.routes.js';
import recommendationRoutes from './recommendation.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/orchards', orchardRoutes);
router.use('/bookings', bookingRoutes);
router.use('/reviews', reviewRoutes);
router.use('/wishlist', wishlistRoutes);
router.use('/notifications', notificationRoutes);
router.use('/seller', sellerRoutes);
router.use('/admin', adminRoutes);
router.use('/meta', metaRoutes);
router.use('/images', imageRoutes);
router.use('/orchards', availabilityRoutes);
router.use('/weather', weatherRoutes);
router.use('/questions', questionRoutes);
router.use('/recommendations', recommendationRoutes);
router.use('/', followRoutes);
export default router;

