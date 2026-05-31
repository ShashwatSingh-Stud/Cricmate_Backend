import { Response, NextFunction } from 'express';
import { prisma } from '../server';
import { AuthenticatedRequest } from '../types';
import { sendSuccess } from '../utils/response';
import { ForbiddenError } from '../utils/errors';

// Example middleware inside the controller file for brevity (in a real app, put in middleware folder)
export const requireAdmin = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    // In production, add an `isAdmin` Boolean field to the User model.
    // For now, we use a simple phone-number whitelist or a dedicated field.
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { phone: true }
    });

    const adminPhones = (process.env.ADMIN_PHONES || '').split(',').filter(Boolean);
    const isAdmin = user && adminPhones.includes(user.phone);
    if (!isAdmin) {
      throw new ForbiddenError('Admin access required');
    }

    next();
  } catch (error) {
    next(error);
  }
};

export const getDashboardStats = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const [userCount, groundCount, matchCount, bookingCount] = await Promise.all([
      prisma.user.count(),
      prisma.ground.count(),
      prisma.match.count(),
      prisma.booking.count(),
    ]);

    sendSuccess(res, {
      users: userCount,
      grounds: groundCount,
      matches: matchCount,
      bookings: bookingCount,
    });
  } catch (error) {
    next(error);
  }
};
