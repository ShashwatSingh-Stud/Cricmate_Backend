import { Router } from 'express';
import { optionalAuth } from '../middleware/auth.middleware';
import * as usersController from '../controllers/users.controller';

const router = Router();

// Public user profile lookup
router.get('/:id', optionalAuth, usersController.getUserProfile);

export default router;
