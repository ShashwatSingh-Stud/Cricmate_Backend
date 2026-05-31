import { Response, NextFunction } from 'express';
import { prisma } from '../server';
import { AuthenticatedRequest } from '../types';
import { ForbiddenError, NotFoundError } from '../utils/errors';

/**
 * Middleware to ensure the authenticated user owns the ground they are trying to modify.
 * Requires `requireAuth` to be run before this.
 * Expects the ground ID to be in `req.params.id` or `req.params.groundId`.
 */
export const requireGroundOwner = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
) => {
  try {
    const groundId = (req.params.id || req.params.groundId) as string;
    const userId = req.userId;

    if (!userId) {
      throw new ForbiddenError('User not authenticated');
    }

    if (!groundId) {
      return next(); // Pass if no ground ID is in params
    }

    const ground = await prisma.ground.findUnique({
      where: { id: groundId },
      select: { ownerId: true },
    });

    if (!ground) {
      throw new NotFoundError('Ground');
    }

    if (ground.ownerId !== userId) {
      throw new ForbiddenError('You do not have permission to manage this ground');
    }

    next();
  } catch (error) {
    next(error);
  }
};
