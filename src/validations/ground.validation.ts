import { z } from 'zod';
import { PitchType } from '@prisma/client';

export const createGroundSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  description: z.string().optional(),
  addressLine: z.string().min(5),
  city: z.string().min(2),
  colony: z.string().optional(),
  state: z.string().min(2),
  pincode: z.string().length(6, 'Pincode must be 6 digits'),
  pitchType: z.nativeEnum(PitchType),
  hasLighting: z.boolean().default(false),
  hasNets: z.boolean().default(false),
  hasParking: z.boolean().default(false),
  hasChangingRoom: z.boolean().default(false),
  hasDrinkingWater: z.boolean().default(false),
  capacityPlayers: z.number().int().min(2).default(22),
  pricePerSlot: z.number().int().min(0),
  slotDuration: z.number().int().min(30).default(120),
  openTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Must be in HH:MM format'),
  closeTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Must be in HH:MM format'),
});

export const updateGroundSchema = createGroundSchema.partial();

export const blockDateSchema = z.object({
  date: z.string().datetime(),
  reason: z.string().optional(),
});

export const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional(),
});

export const groundFiltersSchema = z.object({
  city: z.string().optional(),
  pitchType: z.nativeEnum(PitchType).optional(),
  hasLighting: z.enum(['true', 'false']).transform(v => v === 'true').optional(),
  hasNets: z.enum(['true', 'false']).transform(v => v === 'true').optional(),
  priceMin: z.string().transform(v => parseInt(v, 10)).optional(),
  priceMax: z.string().transform(v => parseInt(v, 10)).optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

export const nearbyGroundsSchema = z.object({
  lat: z.string().transform(v => parseFloat(v)),
  lng: z.string().transform(v => parseFloat(v)),
  radiusKm: z.string().transform(v => parseFloat(v)).optional(),
});
