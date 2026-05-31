import { Response, NextFunction } from 'express';
import { prisma } from '../server';
import { AuthenticatedRequest, parsePagination } from '../types';
import { sendSuccess, sendPaginated, buildPagination } from '../utils/response';

export const getNotifications = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const paginationParams = parsePagination(req.query);

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: req.userId },
        skip: paginationParams.skip,
        take: paginationParams.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where: { userId: req.userId } }),
    ]);

    sendPaginated(res, notifications, buildPagination(paginationParams.page, paginationParams.limit, total));
  } catch (error) {
    next(error);
  }
};

export const markAsRead = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.notification.updateMany({
      where: { 
        userId: req.userId,
        id: req.params.id as string,
      },
      data: { isRead: true }
    });

    sendSuccess(res, null, 'Notification marked as read');
  } catch (error) {
    next(error);
  }
};

export const markAllAsRead = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.notification.updateMany({
      where: { 
        userId: req.userId,
        isRead: false,
      },
      data: { isRead: true }
    });

    sendSuccess(res, null, 'All notifications marked as read');
  } catch (error) {
    next(error);
  }
};
