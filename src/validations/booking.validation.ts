import { z } from 'zod';
import { MatchFormat } from '@prisma/client';

export const initiateBookingSchema = z.object({
  groundId: z.string().uuid(),
  slotId: z.string().uuid(),
  date: z.string().datetime(),
  format: z.nativeEnum(MatchFormat).optional(),
  playersExpected: z.number().int().min(2).max(22).optional(),
  rentals: z.array(z.object({
    equipmentRentalId: z.string().uuid(),
    quantity: z.number().int().min(1),
  })).optional(),
});

export const cancelBookingSchema = z.object({
  reason: z.string().min(5, 'Cancellation reason must be provided'),
});

export const checkinSchema = z.object({
  qrCode: z.string().min(1, 'QR Code is required'),
  lat: z.number().optional(), // For geofencing
  lng: z.number().optional(), // For geofencing
});

export const splitRequestSchema = z.object({
  bookingId: z.string().uuid(),
  players: z.array(z.object({
    phone: z.string().min(10),
    name: z.string(),
    amount: z.number().min(1),
  })).min(1, 'At least one player is required for split payment'),
});
