import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validate.middleware';
import { authLimiter } from '../middleware/rateLimit.middleware';
import { syncUserSchema, updateProfileSchema, fcmTokenSchema } from '../validations/auth.validation';
import * as authController from '../controllers/auth.controller';

const router = Router();

// Apply auth rate limiter to all auth routes
router.use(authLimiter);

router.post('/sync-user', requireAuth, validateBody(syncUserSchema), authController.syncUser);
router.get('/me', requireAuth, authController.getMe);
router.put('/profile', requireAuth, validateBody(updateProfileSchema), authController.updateProfile);
router.post('/fcm-token', requireAuth, validateBody(fcmTokenSchema), authController.saveFcmToken);
router.delete('/account', requireAuth, authController.deleteAccount);

export default router;
