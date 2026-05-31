import { Response, NextFunction } from 'express';
import { prisma } from '../server';
import { AuthenticatedRequest, PlayerFilters, parsePagination } from '../types';
import { sendSuccess, sendPaginated, buildPagination } from '../utils/response';
import { NotFoundError, BadRequestError } from '../utils/errors';
import { createOrder } from '../services/payment.service';

export const discoverPlayers = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const filters = req.query as PlayerFilters;
    const paginationParams = parsePagination(req.query);

    const where: any = { isActive: true };

    if (filters.city) {
      where.city = { equals: filters.city, mode: 'insensitive' };
    }
    if (filters.role) {
      where.roles = { some: { role: filters.role } };
    }

    const [players, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: paginationParams.skip,
        take: paginationParams.limit,
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          city: true,
          trustScore: true,
          roles: true,
        },
        orderBy: { trustScore: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    sendPaginated(res, players, buildPagination(paginationParams.page, paginationParams.limit, total));
  } catch (error) {
    next(error);
  }
};

export const getPlayerProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const playerId = req.params.id as string;
    const player = await prisma.user.findUnique({
      where: { id: playerId },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        city: true,
        colony: true,
        trustScore: true,
        roles: true,
        badgesEarned: { include: { badge: true } },
      }
    });

    if (!player) throw new NotFoundError('Player');

    sendSuccess(res, { player });
  } catch (error) {
    next(error);
  }
};

export const getPlayerStats = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const playerId = req.params.id as string;
    const stats = await prisma.leaderboardEntry.findMany({
      where: { userId: playerId, season: '2024' }
    });

    sendSuccess(res, { stats });
  } catch (error) {
    next(error);
  }
};

export const getPlayerBadges = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const playerId = req.params.id as string;
    const badges = await prisma.playerBadge.findMany({
      where: { userId: playerId },
      include: { badge: true },
      orderBy: { earnedAt: 'desc' }
    });

    sendSuccess(res, { badges });
  } catch (error) {
    next(error);
  }
};

export const getPlayerMatches = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const playerId = req.params.id as string;
    const paginationParams = parsePagination(req.query);

    const [matches, total] = await Promise.all([
      prisma.matchPlayer.findMany({
        where: { userId: playerId },
        skip: paginationParams.skip,
        take: paginationParams.limit,
        include: { match: { include: { booking: { include: { ground: { select: { name: true } } } }, result: true } } },
        orderBy: { joinedAt: 'desc' }
      }),
      prisma.matchPlayer.count({ where: { userId: playerId } }),
    ]);

    sendPaginated(res, matches, buildPagination(paginationParams.page, paginationParams.limit, total));
  } catch (error) {
    next(error);
  }
};

export const getPlayerWrapped = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, { message: 'Wrapped data not available yet' });
  } catch (error) {
    next(error);
  }
};

// ─── Mentors ──────────────────────────────────────────────────────────────────

export const listMentors = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const city = req.query.city as string | undefined;
    
    const where: any = { isActive: true, isMentor: true };
    if (city) {
      where.city = { equals: city, mode: 'insensitive' };
    }

    const mentors = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        city: true,
        mentorRate: true,
        roles: true,
      }
    });

    sendSuccess(res, { mentors });
  } catch (error) {
    next(error);
  }
};

export const bookMentorSession = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { mentorId, groundId, date, durationMinutes } = req.body;

    const mentor = await prisma.user.findUnique({ where: { id: mentorId } });
    if (!mentor || !mentor.isMentor || !mentor.mentorRate) {
      throw new BadRequestError('Invalid mentor selected');
    }

    const totalAmount = Math.round((mentor.mentorRate / 60) * durationMinutes);

    const session = await prisma.mentorSession.create({
      data: {
        mentorId,
        playerId: req.userId!,
        groundId,
        date: new Date(date),
        durationMinutes,
        ratePerHour: mentor.mentorRate,
        totalAmount,
        status: 'PENDING',
      }
    });

    const order = await createOrder(totalAmount, session.id);

    await prisma.mentorSession.update({
      where: { id: session.id },
      data: { razorpayOrderId: order.id }
    });

    sendSuccess(res, { session, orderId: order.id, amount: totalAmount }, 'Mentor session initiated', 201);
  } catch (error) {
    next(error);
  }
};
