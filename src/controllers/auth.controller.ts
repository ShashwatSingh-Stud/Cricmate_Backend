import { Response, NextFunction } from 'express';
import { prisma } from '../server';
import { AuthenticatedRequest } from '../types';
import { sendSuccess } from '../utils/response';
import { NotFoundError } from '../utils/errors';

export const syncUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const supabaseUser = req.supabaseUser!;
    const phone = supabaseUser.phone || req.body.phone;

    let user = await prisma.user.findUnique({
      where: { supabaseId: supabaseUser.id },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          supabaseId: supabaseUser.id,
          phone: phone,
          name: req.body.name,
        },
      });
    }

    sendSuccess(res, { user }, 'User synced successfully');
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: {
        roles: true,
        badgesEarned: {
          include: { badge: true }
        }
      },
    });

    if (!user) {
      throw new NotFoundError('User');
    }

    sendSuccess(res, { user });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { roles, ...profileData } = req.body;

    const user = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: req.userId },
        data: profileData,
      });

      if (roles && Array.isArray(roles)) {
        await tx.playerRole.deleteMany({
          where: { userId: req.userId },
        });

        if (roles.length > 0) {
          await tx.playerRole.createMany({
            data: roles.map((role: any) => ({
              userId: req.userId!,
              role: role.role,
              isPrimary: role.isPrimary,
            })),
          });
        }
      }

      return await tx.user.findUnique({
        where: { id: req.userId },
        include: { roles: true },
      });
    });

    sendSuccess(res, { user }, 'Profile updated successfully');
  } catch (error) {
    next(error);
  }
};

export const saveFcmToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.user.update({
      where: { id: req.userId },
      data: { fcmToken: req.body.fcmToken },
    });

    sendSuccess(res, null, 'FCM token saved');
  } catch (error) {
    next(error);
  }
};

export const deleteAccount = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.user.update({
      where: { id: req.userId },
      data: { isActive: false },
    });

    sendSuccess(res, null, 'Account deactivated successfully');
  } catch (error) {
    next(error);
  }
};
