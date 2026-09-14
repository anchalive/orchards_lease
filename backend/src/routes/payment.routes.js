import { Router } from 'express';
import * as payment from '../controllers/payment.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { paymentInitializeSchema, paymentVerifySchema } from '../validators/payment.validator.js';

const router = Router();
router.use(requireAuth);

router.post('/initialize', validate(paymentInitializeSchema), payment.initializePayment);
router.post('/verify', validate(paymentVerifySchema), payment.verifyAndCompletePayment);
router.get('/', payment.getPaymentHistory);
router.get('/:id/receipt', payment.getPaymentReceipt);

export default router;
