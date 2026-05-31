import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import * as adminController from '../controllers/admin.controller';

const router = Router();

router.use(requireAuth);
router.use(adminController.requireAdmin);

router.get('/stats', adminController.getDashboardStats);

export default router;
