import { Request, Response, NextFunction } from 'express';
import { prisma } from '../server';
import { sendSuccess } from '../utils/response';
import { NotFoundError } from '../utils/errors';

export const getUserProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params as { id: string };

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        city: true,
        colony: true,
        trustScore: true,
        trustMatchCount: true,
        isMentor: true,
        roles: true,
        badgesEarned: {
          include: { badge: true }
        }
      },
    });

    if (!user) {
      throw new NotFoundError('User profile');
    }

    sendSuccess(res, { user });
  } catch (error) {
    next(error);
  }
};
