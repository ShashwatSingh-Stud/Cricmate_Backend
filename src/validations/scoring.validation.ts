import { z } from 'zod';
import { DismissalType, ExtraType } from '@prisma/client';

export const startInningsSchema = z.object({
  inningsNumber: z.number().int().min(1).max(4),
  battingTeam: z.number().int().min(1).max(2),
});

export const recordDeliverySchema = z.object({
  overNumber: z.number().int().min(0),
  ballNumber: z.number().int().min(1),
  batsmanId: z.string().uuid(),
  bowlerId: z.string().uuid(),
  runs: z.number().int().min(0).max(6).default(0),
  isWicket: z.boolean().default(false),
  dismissalType: z.nativeEnum(DismissalType).optional(),
  dismissedPlayerId: z.string().uuid().optional(),
  fielderId: z.string().uuid().optional(),
  extras: z.number().int().min(0).default(0),
  extraType: z.nativeEnum(ExtraType).optional(),
  isLegal: z.boolean().default(true),
});

export const syncScoringSchema = z.object({
  inningsId: z.string().uuid(),
  lastSyncedAt: z.string().datetime(),
  deliveries: z.array(recordDeliverySchema),
});
