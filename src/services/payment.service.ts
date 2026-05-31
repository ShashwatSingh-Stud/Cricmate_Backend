import Razorpay from 'razorpay';
import crypto from 'crypto';
import logger from '../utils/logger';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'mock_key_id',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'mock_key_secret',
});

/**
 * Creates a Razorpay order for ground booking or mentor session.
 * @param amount Amount in Rupees (will be converted to paise internally)
 * @param receiptId Internal ID (bookingId or mentorSessionId)
 */
export async function createOrder(amount: number, receiptId: string) {
  try {
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // convert to paise
      currency: 'INR',
      receipt: receiptId,
      notes: { receiptId },
    });
    return order;
  } catch (error) {
    logger.error('Failed to create Razorpay order', { error, amount, receiptId });
    throw error;
  }
}

/**
 * Verifies Razorpay signature coming from frontend success callback or webhook.
 */
export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
  try {
    const body = orderId + '|' + paymentId;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'mock_key_secret')
      .update(body.toString())
      .digest('hex');
    
    return expectedSignature === signature;
  } catch (error) {
    logger.error('Signature verification failed', { error });
    return false;
  }
}

/**
 * Verifies Razorpay webhook signature.
 */
export function verifyWebhookSignature(body: string, signature: string): boolean {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET || 'mock_webhook_secret')
      .update(body)
      .digest('hex');
    
    return expectedSignature === signature;
  } catch (error) {
    return false;
  }
}

export interface SplitPlayer {
  phone: string;
  amount: number;
  name: string;
}

/**
 * Creates Payment Links for splitting ground booking cost among players.
 */
export async function createSplitPaymentLinks(players: SplitPlayer[], bookingId: string) {
  try {
    const links = await Promise.all(
      players.map(player =>
        razorpay.paymentLink.create({
          amount: Math.round(player.amount * 100),
          currency: 'INR',
          description: 'CricMate ground booking share',
          customer: { 
            contact: player.phone, 
            name: player.name 
          },
          notify: { 
            sms: true, 
            email: false // Twilio/WhatsApp integration might handle this separately if needed
          },
          reminder_enable: true,
          notes: { bookingId, split: 'true', playerPhone: player.phone },
        })
      )
    );
    return links;
  } catch (error) {
    logger.error('Failed to create split payment links', { error, bookingId });
    throw error;
  }
}

/**
 * Processes a refund (full or partial)
 * @param paymentId Razorpay payment ID
 * @param amount Amount in Rupees to refund
 */
export async function processRefund(paymentId: string, amount: number) {
  try {
    const refund = await razorpay.payments.refund(paymentId, {
      amount: Math.round(amount * 100),
    });
    return refund;
  } catch (error) {
    logger.error('Refund failed', { error, paymentId, amount });
    throw error;
  }
}
