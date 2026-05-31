import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import * as notificationsController from '../controllers/notifications.controller';

const router = Router();

router.use(requireAuth);

router.get('/', notificationsController.getNotifications);
router.post('/read-all', notificationsController.markAllAsRead);
router.post('/:id/read', notificationsController.markAsRead);

export default router;
