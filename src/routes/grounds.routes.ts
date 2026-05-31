import { Router } from 'express';
import { requireAuth, optionalAuth } from '../middleware/auth.middleware';
import { requireGroundOwner } from '../middleware/groundOwner.middleware';
import { validateBody, validateQuery } from '../middleware/validate.middleware';
import {
  createGroundSchema,
  updateGroundSchema,
  blockDateSchema,
  reviewSchema,
  groundFiltersSchema,
  nearbyGroundsSchema,
} from '../validations/ground.validation';
import * as groundsController from '../controllers/grounds.controller';

const router = Router();

// ─── Search & Discovery (Public / Optional Auth) ──────────────────────────────
router.get('/', validateQuery(groundFiltersSchema), groundsController.listGrounds);
router.get('/nearby', validateQuery(nearbyGroundsSchema), groundsController.nearbyGrounds);
router.get('/:id', optionalAuth, groundsController.getGround);

// ─── Owner Management (Require Auth & Owner) ──────────────────────────────────
router.post('/', requireAuth, validateBody(createGroundSchema), groundsController.createGround);
router.put('/:id', requireAuth, requireGroundOwner, validateBody(updateGroundSchema), groundsController.updateGround);
router.delete('/:id', requireAuth, requireGroundOwner, groundsController.deleteGround);

// ─── Slots & Availability ─────────────────────────────────────────────────────
router.get('/:id/slots', groundsController.getSlots); // public
router.post('/:id/block-dates', requireAuth, requireGroundOwner, validateBody(blockDateSchema), groundsController.blockDates);
router.delete('/:id/block-dates/:dateId', requireAuth, requireGroundOwner, groundsController.unblockDate);

// ─── Photos ───────────────────────────────────────────────────────────────────
router.post('/:id/photos', requireAuth, requireGroundOwner, groundsController.uploadPhoto);
router.delete('/:id/photos/:photoId', requireAuth, requireGroundOwner, groundsController.removePhoto);

// ─── Reviews ──────────────────────────────────────────────────────────────────
router.get('/:id/reviews', groundsController.getReviews);
router.post('/:id/reviews', requireAuth, validateBody(reviewSchema), groundsController.postReview);

export default router;
