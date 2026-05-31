import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireGroundOwner } from '../middleware/groundOwner.middleware';
import { validateBody } from '../middleware/validate.middleware';
import { initiateBookingSchema, cancelBookingSchema, checkinSchema } from '../validations/booking.validation';
import * as bookingsController from '../controllers/bookings.controller';

const router = Router();

// User Booking Flow
router.get('/', requireAuth, bookingsController.getMyBookings);
router.get('/:id', requireAuth, bookingsController.getBookingDetail);
router.post('/initiate', requireAuth, validateBody(initiateBookingSchema), bookingsController.initiateBooking);
router.post('/:id/cancel', requireAuth, validateBody(cancelBookingSchema), bookingsController.cancelBooking);
router.post('/:id/checkin', requireAuth, validateBody(checkinSchema), bookingsController.checkinBooking);
router.get('/:id/qr', requireAuth, bookingsController.getBookingQr);

// Ground Owner Analytics
router.get('/ground/:groundId', requireAuth, requireGroundOwner, bookingsController.getGroundBookings);
router.get('/ground/:groundId/today', requireAuth, requireGroundOwner, bookingsController.getGroundTodaySchedule);
router.get('/ground/:groundId/revenue', requireAuth, requireGroundOwner, bookingsController.getGroundRevenue);

export default router;
