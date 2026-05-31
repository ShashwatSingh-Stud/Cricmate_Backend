import { Router } from 'express';
import { requireAuth, optionalAuth } from '../middleware/auth.middleware';
import * as playersController from '../controllers/players.controller';

const router = Router();

// Player Discovery
router.get('/', optionalAuth, playersController.discoverPlayers);

// Mentors
router.get('/mentors', optionalAuth, playersController.listMentors);
router.post('/mentor-session', requireAuth, playersController.bookMentorSession);

// Player Profile & Stats
router.get('/:id', optionalAuth, playersController.getPlayerProfile);
router.get('/:id/stats', optionalAuth, playersController.getPlayerStats);
router.get('/:id/badges', optionalAuth, playersController.getPlayerBadges);
router.get('/:id/matches', optionalAuth, playersController.getPlayerMatches);
router.get('/:id/wrapped', requireAuth, playersController.getPlayerWrapped);

export default router;
