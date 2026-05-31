import { Router } from 'express';
import { requireAuth, optionalAuth } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validate.middleware';
import { startInningsSchema, recordDeliverySchema, syncScoringSchema } from '../validations/scoring.validation';
import * as scoringController from '../controllers/scoring.controller';

const router = Router();

router.get('/:matchId/live', optionalAuth, scoringController.getLiveScorecard);
router.post('/:matchId/innings', requireAuth, validateBody(startInningsSchema), scoringController.startInnings);
router.post('/:matchId/innings/:inningsId/delivery', requireAuth, validateBody(recordDeliverySchema), scoringController.recordDelivery);
router.delete('/:matchId/innings/:inningsId/delivery/last', requireAuth, scoringController.undoLastDelivery);
router.post('/:matchId/innings/:inningsId/complete', requireAuth, scoringController.completeInnings);
router.post('/:matchId/sync', requireAuth, validateBody(syncScoringSchema), scoringController.syncOfflineScoring);

export default router;
