import { Router } from 'express';
import { requireAuth, optionalAuth } from '../middleware/auth.middleware';
import * as leaderboardController from '../controllers/leaderboard.controller';

const router = Router();

router.get('/', optionalAuth, leaderboardController.getLeaderboard);
router.get('/my-rank', requireAuth, leaderboardController.getMyRank);

export default router;
