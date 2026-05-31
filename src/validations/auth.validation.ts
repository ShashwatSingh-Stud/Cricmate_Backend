import { z } from 'zod';
import { Role } from '@prisma/client';

export const syncUserSchema = z.object({
  phone: z.string().min(10, 'Phone number must be at least 10 characters'),
  name: z.string().optional(),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  city: z.string().min(2).optional(),
  colony: z.string().optional(),
  dateOfBirth: z.string().datetime().optional(),
  language: z.enum(['en', 'hi']).optional(),
  roles: z.array(
    z.object({
      role: z.nativeEnum(Role),
      isPrimary: z.boolean().default(false),
    })
  ).max(3, 'Maximum 3 roles allowed').optional(),
});

export const fcmTokenSchema = z.object({
  fcmToken: z.string().min(1, 'Token is required'),
});
