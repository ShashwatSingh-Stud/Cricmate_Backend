import { Response, NextFunction } from 'express';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../server';
import { AuthenticatedRequest } from '../types';
import { sendSuccess } from '../utils/response';
import { NotFoundError, BadRequestError } from '../utils/errors';
import { createOrder, processRefund } from '../services/payment.service';
import { PLATFORM_FEE_PERCENT, MIN_PLATFORM_FEE, CANCELLATION } from '../utils/constants';

// ─── User Booking Flow ────────────────────────────────────────────────────────

export const initiateBooking = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { groundId, slotId, date, format, playersExpected, rentals } = req.body;
    const parsedDate = new Date(date);
    
    // Validate slot availability
    const slot = await prisma.slot.findUnique({
      where: { id: slotId },
      include: { ground: true }
    });

    if (!slot || slot.groundId !== groundId || !slot.isActive) {
      throw new BadRequestError('Invalid or inactive slot');
    }

    // Check for blocked dates
    const blocked = await prisma.blockedDate.findFirst({
      where: { groundId, date: parsedDate }
    });

    if (blocked) {
      throw new BadRequestError('Ground is blocked on this date');
    }

    // Check if slot already booked
    const startOfDay = new Date(parsedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(parsedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const existingBooking = await prisma.booking.findFirst({
      where: {
        slotId,
        date: { gte: startOfDay, lte: endOfDay },
        status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] }
      }
    });

    if (existingBooking) {
      throw new BadRequestError('Slot is already booked for this date');
    }

    // Calculate amounts
    const baseAmount = slot.ground.pricePerSlot;
    let rentalAmount = 0;

    if (rentals && rentals.length > 0) {
      for (const item of rentals) {
        const equipment = await prisma.equipmentRental.findUnique({
          where: { id: item.equipmentRentalId }
        });
        if (equipment && equipment.isAvailable) {
          rentalAmount += equipment.pricePerDay * item.quantity;
        }
      }
    }

    const platformFee = Math.max(MIN_PLATFORM_FEE, Math.round((baseAmount + rentalAmount) * (PLATFORM_FEE_PERCENT / 100)));
    const totalAmount = baseAmount + rentalAmount + platformFee;

    // Create DB Booking (PENDING)
    const booking = await prisma.booking.create({
      data: {
        groundId,
        slotId,
        userId: req.userId!,
        date: parsedDate,
        startTime: slot.startTime,
        endTime: slot.endTime,
        format,
        playersExpected,
        baseAmount,
        rentalAmount,
        platformFee,
        totalAmount,
        status: 'PENDING',
      }
    });

    // Handle rentals if any
    if (rentals && rentals.length > 0) {
      await prisma.bookingRental.createMany({
        data: rentals.map((r: any) => ({
          bookingId: booking.id,
          equipmentRentalId: r.equipmentRentalId,
          quantity: r.quantity,
          totalPrice: 0, // Simplified for now
        }))
      });
    }

    // Create Razorpay Order
    const order = await createOrder(totalAmount, booking.id);

    // Update booking with Razorpay Order ID
    const updatedBooking = await prisma.booking.update({
      where: { id: booking.id },
      data: { razorpayOrderId: order.id }
    });

    sendSuccess(res, { booking: updatedBooking, orderId: order.id, amount: totalAmount }, 'Booking initiated', 201);
  } catch (error) {
    next(error);
  }
};

export const cancelBooking = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { reason } = req.body;
    const bookingId = req.params.id as string;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) throw new NotFoundError('Booking');
    if (booking.userId !== req.userId) throw new BadRequestError('You cannot cancel this booking');
    if (booking.status !== 'CONFIRMED') throw new BadRequestError('Only confirmed bookings can be cancelled');

    // Calculate time difference
    const bookingDateTimeStr = `${booking.date.toISOString().split('T')[0]}T${booking.startTime}:00`;
    const bookingDate = new Date(bookingDateTimeStr);
    const now = new Date();
    
    const diffHours = (bookingDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (diffHours < 0) throw new BadRequestError('Cannot cancel a past booking');

    let refundAmount = 0;
    
    if (diffHours > CANCELLATION.FULL_REFUND_HOURS) {
      refundAmount = booking.baseAmount + booking.rentalAmount;
    } else if (diffHours >= CANCELLATION.PARTIAL_REFUND_HOURS) {
      refundAmount = Math.round((booking.baseAmount + booking.rentalAmount) * (CANCELLATION.PARTIAL_REFUND_PERCENT / 100));
    }

    let refundId = null;
    let newStatus: any = 'CANCELLED';

    if (refundAmount > 0 && booking.razorpayPaymentId) {
      try {
        const refund = await processRefund(booking.razorpayPaymentId, refundAmount);
        refundId = refund.id;
        newStatus = 'REFUNDED';
      } catch (err) {
        newStatus = 'CANCELLED'; 
      }
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: newStatus,
        cancelledAt: new Date(),
        cancellationReason: reason,
        refundAmount,
        refundId,
      }
    });

    sendSuccess(res, { booking: updatedBooking }, 'Booking cancelled successfully');
  } catch (error) {
    next(error);
  }
};

export const checkinBooking = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { qrCode, lat, lng } = req.body;
    const bookingId = req.params.id as string;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId, qrCode },
    });

    if (!booking) {
      throw new BadRequestError('Invalid QR code for this booking');
    }

    if (booking.status !== 'CONFIRMED') {
      throw new BadRequestError('Booking is not in CONFIRMED state');
    }

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: { 
        status: 'CHECKED_IN',
        checkedInAt: new Date(),
      }
    });

    sendSuccess(res, { booking: updated }, 'Checked in successfully');
  } catch (error) {
    next(error);
  }
};

export const getBookingQr = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const bookingId = req.params.id as string;
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId, userId: req.userId }
    });

    if (!booking) throw new NotFoundError('Booking');
    if (!booking.qrCode) throw new BadRequestError('No QR code generated for this booking');

    const qrDataUrl = await QRCode.toDataURL(booking.qrCode);

    sendSuccess(res, { qrCodeDataUrl: qrDataUrl });
  } catch (error) {
    next(error);
  }
};

export const getMyBookings = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const bookings = await prisma.booking.findMany({
      where: { userId: req.userId },
      include: {
        ground: { select: { id: true, name: true, city: true, photos: { take: 1, where: { isPrimary: true } } } },
        slot: true,
      },
      orderBy: { date: 'desc' }
    });

    sendSuccess(res, { bookings });
  } catch (error) {
    next(error);
  }
};

export const getBookingDetail = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const bookingId = req.params.id as string;
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        ground: true,
        slot: true,
        rentedItems: true,
      }
    });

    if (!booking) throw new NotFoundError('Booking');
    
    if (booking.userId !== req.userId && booking.ground.ownerId !== req.userId) {
      throw new BadRequestError('Unauthorized to view this booking');
    }

    sendSuccess(res, { booking });
  } catch (error) {
    next(error);
  }
};

// ─── Ground Owner Analytics ───────────────────────────────────────────────────

export const getGroundBookings = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const groundId = req.params.groundId as string;

    const bookings = await prisma.booking.findMany({
      where: { groundId },
      include: { user: { select: { name: true, phone: true } }, slot: true },
      orderBy: { date: 'desc' },
      take: 50,
    });

    sendSuccess(res, { bookings });
  } catch (error) {
    next(error);
  }
};

export const getGroundTodaySchedule = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const groundId = req.params.groundId as string;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const bookings = await prisma.booking.findMany({
      where: {
        groundId,
        date: { gte: today, lt: tomorrow },
        status: { in: ['CONFIRMED', 'CHECKED_IN'] }
      },
      include: { user: { select: { name: true, phone: true } }, slot: true },
      orderBy: { slot: { startTime: 'asc' } }
    });

    sendSuccess(res, { bookings });
  } catch (error) {
    next(error);
  }
};

export const getGroundRevenue = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const groundId = req.params.groundId as string;

    const aggr = await prisma.booking.aggregate({
      where: {
        groundId,
        status: { in: ['CONFIRMED', 'CHECKED_IN', 'COMPLETED'] }
      },
      _sum: { baseAmount: true, rentalAmount: true }
    });

    const revenue = (aggr._sum?.baseAmount || 0) + (aggr._sum?.rentalAmount || 0);

    sendSuccess(res, { totalRevenue: revenue });
  } catch (error) {
    next(error);
  }
};
