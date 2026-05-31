import twilio from 'twilio';
import { prisma } from '../server';
import { NotificationType } from '@prisma/client';
import logger from '../utils/logger';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID || 'mock_sid',
  process.env.TWILIO_AUTH_TOKEN || 'mock_token'
);

export async function sendWhatsApp(to: string, message: string): Promise<boolean> {
  try {
    if (!process.env.TWILIO_ACCOUNT_SID) {
      logger.info('Twilio not configured, skipping WhatsApp message', { to, message });
      return true;
    }

    const formattedTo = to.startsWith('+') ? to : `+91${to}`;

    await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_FROM,
      to: `whatsapp:${formattedTo}`,
      body: message
    });
    
    return true;
  } catch (error) {
    logger.error('Failed to send WhatsApp message', { error, to });
    return false;
  }
}

export async function createInAppNotification(
  userId: string,
  type: NotificationType,
  title: string,
  titleHi: string,
  body: string,
  bodyHi: string,
  data?: any
) {
  try {
    return await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        titleHi,
        body,
        bodyHi,
        data: data || {},
      }
    });
  } catch (error) {
    logger.error('Failed to create in-app notification', { error, userId, type });
    return null;
  }
}

export const templates = {
  bookingConfirmed: (groundName: string, date: string, time: string, bookingId: string) =>
    `✅ *CricMate Booking Confirmed!*\n\nGround: ${groundName}\nDate: ${date}\nTime: ${time}\nBooking ID: ${bookingId}\n\nShow your QR code at the ground for check-in.\n\nTeam cricket khelo! 🏏`,

  matchApplication: (captainName: string, matchDate: string, format: string) =>
    `🏏 *New Match Application - CricMate*\n\n${captainName} ke match mein ek player apply kiya hai.\nDate: ${matchDate} | Format: ${format}\n\nApp open karo accept/decline karne ke liye.`,

  paymentRequest: (amount: number, captainName: string, groundName: string, link: string) =>
    `💰 *Ground Booking Payment - CricMate*\n\n${captainName} ne aapko ${groundName} ke liye ₹${amount} ka payment request bheja hai.\n\nPay karo: ${link}`,

  weatherAlert: (groundName: string, date: string, rainChance: number) =>
    `🌧️ *CricMate Weather Alert*\n\nAapka match ${date} ko book hai ${groundName} mein.\n\nKal ${rainChance}% baarish ki sambhavna hai. Match plan check karo!`,

  badgeEarned: (badgeName: string, badgeNameHi: string) =>
    `🏆 *Naya Badge Mila! - CricMate*\n\nBadhaai ho! Aapne "${badgeName}" (${badgeNameHi}) badge earn kiya!\n\nApp mein dekho aur share karo!`,
};
