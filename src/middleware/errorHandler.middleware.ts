import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { AppError } from '../utils/errors';
import logger from '../utils/logger';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // ─── Zod Validation Errors ────────────────────────────────────────────
  if (err instanceof ZodError) {
    const messages = err.errors.map(e => `${e.path.join('.')}: ${e.message}`);
    res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: messages,
    });
    return;
  }

  // ─── Custom App Errors ────────────────────────────────────────────────
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.errorCode,
      message: err.message,
    });
    return;
  }

  // ─── Prisma Known Request Errors ──────────────────────────────────────
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002': {
        const target = (err.meta?.target as string[])?.join(', ') || 'field';
        res.status(409).json({
          success: false,
          error: 'CONFLICT',
          message: `A record with this ${target} already exists`,
        });
        return;
      }
      case 'P2025': {
        res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: 'Record not found',
        });
        return;
      }
      default: {
        logger.error('Prisma error', { code: err.code, meta: err.meta });
        res.status(500).json({
          success: false,
          error: 'DATABASE_ERROR',
          message: 'A database error occurred',
        });
        return;
      }
    }
  }

  // ─── Prisma Validation Errors ─────────────────────────────────────────
  if (err instanceof Prisma.PrismaClientValidationError) {
    logger.error('Prisma validation error', { message: err.message });
    res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Invalid data provided',
    });
    return;
  }

  // ─── Unhandled Errors ─────────────────────────────────────────────────
  logger.error('Unhandled error', {
    name: err.name,
    message: err.message,
    stack: err.stack,
  });

  res.status(500).json({
    success: false,
    error: 'INTERNAL_ERROR',
    message: process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred'
      : err.message,
  });
}
