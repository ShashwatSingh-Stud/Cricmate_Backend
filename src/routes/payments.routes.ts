import { Router, raw } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validate.middleware';
import { splitRequestSchema } from '../validations/booking.validation';
import * as paymentsController from '../controllers/payments.controller';

const router = Router();

// Used inside /api/payments but webhook shouldn't be nested here in production, 
// keeping it here for alignment with spec
router.post('/verify', requireAuth, paymentsController.verifyPayment);
router.post('/split-request', requireAuth, validateBody(splitRequestSchema), paymentsController.splitRequest);
router.get('/my-payments', requireAuth, paymentsController.myPayments);

export default router;
