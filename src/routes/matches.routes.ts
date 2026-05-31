import { Router } from 'express';
import { requireAuth, optionalAuth } from '../middleware/auth.middleware';
import { validateBody, validateQuery } from '../middleware/validate.middleware';
import { createMatchSchema, updateMatchSchema, applyToMatchSchema, applicationActionSchema } from '../validations/match.validation';
import * as matchesController from '../controllers/matches.controller';

const router = Router();

// Feed & Discovery
router.get('/feed', optionalAuth, matchesController.getFeed);
router.get('/mine', requireAuth, matchesController.getMyMatches);
router.get('/:id', optionalAuth, matchesController.getMatch);
router.get('/:id/scorecard', optionalAuth, matchesController.getScorecard);

// Match Creation & Updates
router.post('/', requireAuth, validateBody(createMatchSchema), matchesController.createMatch);
router.put('/:id', requireAuth, validateBody(updateMatchSchema), matchesController.updateMatch);
router.delete('/:id', requireAuth, matchesController.deleteMatch);

// Applications
router.post('/:id/apply', requireAuth, validateBody(applyToMatchSchema), matchesController.applyToMatch);
router.delete('/:id/apply', requireAuth, matchesController.withdrawApplication);
router.put('/:id/applications/:appId', requireAuth, validateBody(applicationActionSchema), matchesController.handleApplication);

// Match Flow
router.post('/:id/start', requireAuth, matchesController.startMatch);
router.post('/:id/complete', requireAuth, matchesController.completeMatch);
router.post('/:id/result', requireAuth, matchesController.postResult);

export default router;
