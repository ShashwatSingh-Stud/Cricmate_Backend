import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../server';
import { AuthenticatedRequest } from '../types';
import { sendSuccess } from '../utils/response';
import { BadRequestError, NotFoundError } from '../utils/errors';
import { verifyPaymentSignature, verifyWebhookSignature, createSplitPaymentLinks } from '../services/payment.service';
import logger from '../utils/logger';

export const verifyPayment = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      throw new BadRequestError('Missing payment verification parameters');
    }

    const isValid = verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);

    if (!isValid) {
      throw new BadRequestError('Invalid payment signature');
    }

    // Find the pending booking
    const booking = await prisma.booking.findUnique({
      where: { razorpayOrderId }
    });

    if (!booking) {
      throw new NotFoundError('Booking for this order not found');
    }

    // Mark booking as CONFIRMED
    const updatedBooking = await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: 'CONFIRMED',
        razorpayPaymentId,
        qrCode: uuidv4(), // Generate unique QR code for check-in
      }
    });

    // Record the payment
    await prisma.payment.create({
      data: {
        senderId: req.userId,
        bookingId: booking.id,
        amount: booking.totalAmount,
        type: 'BOOKING',
        status: 'PAID',
        razorpayOrderId,
        razorpayPaymentId,
        description: 'Ground Booking Payment',
      }
    });

    // TODO: Phase 7 - Trigger WhatsApp confirmation via NotificationService

    sendSuccess(res, { booking: updatedBooking }, 'Payment verified and booking confirmed');
  } catch (error) {
    next(error);
  }
};

export const splitRequest = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { bookingId, players } = req.body;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId }
    });

    if (!booking || booking.userId !== req.userId) {
      throw new BadRequestError('Booking not found or unauthorized');
    }

    if (booking.status !== 'CONFIRMED') {
      throw new BadRequestError('Cannot split unconfirmed booking');
    }

    // Create payment links via Razorpay
    const links = await createSplitPaymentLinks(players, bookingId);

    // Save pending split payments
    await prisma.payment.createMany({
      data: players.map((player: any, i: number) => ({
        bookingId,
        amount: player.amount,
        type: 'SPLIT_SHARE',
        status: 'PENDING',
        razorpayLinkId: links[i].id,
        description: `Split share for ${player.name}`,
      }))
    });

    sendSuccess(res, { message: 'Split payment links sent successfully' });
  } catch (error) {
    next(error);
  }
};

export const myPayments = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const payments = await prisma.payment.findMany({
      where: { 
        OR: [
          { senderId: req.userId },
          { receiverId: req.userId }
        ]
      },
      orderBy: { createdAt: 'desc' }
    });

    sendSuccess(res, { payments });
  } catch (error) {
    next(error);
  }
};

export const razorpayWebhook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const signature = req.headers['x-razorpay-signature'] as string;
    
    // We need the raw body as a string for webhook verification
    // Express raw middleware should be used on this route in app.ts
    const bodyStr = req.body.toString('utf8');
    
    if (!verifyWebhookSignature(bodyStr, signature)) {
      throw new BadRequestError('Invalid webhook signature');
    }

    const event = JSON.parse(bodyStr);

    switch (event.event) {
      case 'payment.captured':
        await handlePaymentCaptured(event.payload.payment.entity);
        break;
      case 'payment.failed':
        await handlePaymentFailed(event.payload.payment.entity);
        break;
      case 'refund.created':
        await handleRefundCreated(event.payload.refund.entity);
        break;
    }

    res.status(200).send('OK');
  } catch (error) {
    logger.error('Webhook error', { error });
    res.status(400).send('Webhook Error');
  }
};

async function handlePaymentCaptured(paymentEntity: any) {
  // In a real app, you'd match notes.bookingId to confirm booking or split payment
  logger.info('Payment captured webhook', { paymentId: paymentEntity.id });
  
  if (paymentEntity.notes && paymentEntity.notes.split === 'true') {
    // This is a split payment being captured
    await prisma.payment.updateMany({
      where: { razorpayLinkId: paymentEntity.notes.link_id },
      data: { status: 'PAID', razorpayPaymentId: paymentEntity.id }
    });
    
    // Also update match_player payment status if applicable
  }
}

async function handlePaymentFailed(paymentEntity: any) {
  logger.info('Payment failed webhook', { paymentId: paymentEntity.id });
}

async function handleRefundCreated(refundEntity: any) {
  logger.info('Refund created webhook', { refundId: refundEntity.id });
}
