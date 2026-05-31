import { z } from 'zod';
import { MatchFormat, MatchType, SkillLevel, Role } from '@prisma/client';

export const createMatchSchema = z.object({
  format: z.nativeEnum(MatchFormat),
  date: z.string().datetime(),
  city: z.string().min(2),
  colony: z.string().optional(),
  skillLevel: z.nativeEnum(SkillLevel),
  maxPlayers: z.number().int().min(2).max(22).default(11),
  description: z.string().optional(),
  type: z.nativeEnum(MatchType),
  isPublic: z.boolean().default(true),
  rolesNeeded: z.array(z.object({
    role: z.nativeEnum(Role),
    count: z.number().int().min(1).default(1),
  })).optional(),
});

export const updateMatchSchema = createMatchSchema.partial();

export const applyToMatchSchema = z.object({
  role: z.nativeEnum(Role).optional(),
  message: z.string().max(500).optional(),
});

export const applicationActionSchema = z.object({
  status: z.enum(['ACCEPTED', 'DECLINED']),
});
