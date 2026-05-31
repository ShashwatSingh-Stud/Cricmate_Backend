import { Response, NextFunction } from 'express';
import { MatchStatus } from '@prisma/client';
import { prisma } from '../server';
import { AuthenticatedRequest, MatchFilters, parsePagination } from '../types';
import { sendSuccess, sendPaginated, buildPagination } from '../utils/response';
import { NotFoundError, BadRequestError, ForbiddenError } from '../utils/errors';
import { buildScorecard } from '../services/scoring.service';

// ─── Discovery & Retrieval ────────────────────────────────────────────────────

export const getFeed = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const filters = req.query as MatchFilters;
    const paginationParams = parsePagination(req.query);

    const where: any = { 
      status: 'OPEN',
      isPublic: true,
    };

    if (filters.city) {
      where.city = { equals: filters.city, mode: 'insensitive' };
    }
    if (filters.format) where.format = filters.format;
    if (filters.skillLevel) where.skillLevel = filters.skillLevel;
    if (filters.type) where.type = filters.type;

    const [matches, total] = await Promise.all([
      prisma.match.findMany({
        where,
        skip: paginationParams.skip,
        take: paginationParams.limit,
        include: {
          captain: { select: { name: true, avatarUrl: true, trustScore: true } },
          rolesNeeded: true,
          _count: { select: { players: true } }
        },
        orderBy: { date: 'asc' },
      }),
      prisma.match.count({ where }),
    ]);

    sendPaginated(res, matches, buildPagination(paginationParams.page, paginationParams.limit, total));
  } catch (error) {
    next(error);
  }
};

export const getMyMatches = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const paginationParams = parsePagination(req.query);
    
    const now = new Date();
    const isPast = req.query.past === 'true';

    const where: any = {
      players: { some: { userId } },
    };

    if (isPast) {
      where.OR = [
        { status: 'COMPLETED' as MatchStatus },
        { date: { lt: now } }
      ];
    } else {
      where.status = { in: ['OPEN', 'FULL', 'CONFIRMED', 'LIVE'] as MatchStatus[] };
      where.date = { gte: now };
    }

    const [matches, total] = await Promise.all([
      prisma.match.findMany({
        where,
        skip: paginationParams.skip,
        take: paginationParams.limit,
        include: {
          booking: { include: { ground: { select: { name: true, city: true } } } },
          result: true,
        },
        orderBy: isPast ? { date: 'desc' } : { date: 'asc' },
      }),
      prisma.match.count({ where }),
    ]);

    sendPaginated(res, matches, buildPagination(paginationParams.page, paginationParams.limit, total));
  } catch (error) {
    next(error);
  }
};

export const getMatch = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const matchId = req.params.id as string;
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        captain: { select: { id: true, name: true, avatarUrl: true, trustScore: true } },
        booking: { include: { ground: { select: { id: true, name: true, addressLine: true, city: true } } } },
        rolesNeeded: true,
        players: {
          include: { user: { select: { id: true, name: true, avatarUrl: true, roles: true } } }
        },
        applications: {
          include: { applicant: { select: { id: true, name: true, avatarUrl: true, trustScore: true, roles: true } } }
        },
        result: true,
      },
    });

    if (!match) throw new NotFoundError('Match');

    // Remove applications array if user is not captain
    if (match.captainId !== req.userId) {
      (match as any).applications = undefined;
    }

    sendSuccess(res, { match });
  } catch (error) {
    next(error);
  }
};

export const getScorecard = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const matchId = req.params.id as string;
    const scorecard = await buildScorecard(matchId);
    if (!scorecard) throw new NotFoundError('Match scorecard');
    sendSuccess(res, { scorecard });
  } catch (error) {
    next(error);
  }
};

// ─── Match Management ─────────────────────────────────────────────────────────

export const createMatch = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { rolesNeeded, ...matchData } = req.body;
    
    const match = await prisma.$transaction(async (tx) => {
      const newMatch = await tx.match.create({
        data: {
          ...matchData,
          captainId: req.userId!,
        },
      });

      // Add captain as first player
      await tx.matchPlayer.create({
        data: {
          matchId: newMatch.id,
          userId: req.userId!,
          isCaptain: true,
          teamNumber: 1,
        }
      });

      if (rolesNeeded && rolesNeeded.length > 0) {
        await tx.matchRoleNeeded.createMany({
          data: rolesNeeded.map((r: any) => ({
            matchId: newMatch.id,
            role: r.role,
            count: r.count,
          }))
        });
      }

      return newMatch;
    });

    sendSuccess(res, { match }, 'Match created successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const updateMatch = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const matchId = req.params.id as string;
    
    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match) throw new NotFoundError('Match');
    if (match.captainId !== req.userId) throw new ForbiddenError('Only captain can update match');
    if (match.status !== 'OPEN') throw new BadRequestError('Cannot update match that is no longer open');

    const updated = await prisma.match.update({
      where: { id: matchId },
      data: req.body,
    });

    sendSuccess(res, { match: updated }, 'Match updated successfully');
  } catch (error) {
    next(error);
  }
};

export const deleteMatch = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const matchId = req.params.id as string;
    
    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match) throw new NotFoundError('Match');
    if (match.captainId !== req.userId) throw new ForbiddenError('Only captain can cancel match');

    await prisma.match.update({
      where: { id: matchId },
      data: { status: 'CANCELLED' }
    });

    sendSuccess(res, null, 'Match cancelled successfully');
  } catch (error) {
    next(error);
  }
};

// ─── Applications ─────────────────────────────────────────────────────────────

export const applyToMatch = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const matchId = req.params.id as string;
    const { role, message } = req.body;

    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match) throw new NotFoundError('Match');
    if (match.status !== 'OPEN') throw new BadRequestError('Match is not accepting applications');
    
    if (match.captainId === req.userId) {
      throw new BadRequestError('Captain cannot apply to their own match');
    }

    const existingApp = await prisma.matchApplication.findFirst({
      where: { matchId, applicantId: req.userId! }
    });

    if (existingApp) {
      throw new BadRequestError('You have already applied to this match');
    }

    const application = await prisma.matchApplication.create({
      data: {
        matchId,
        applicantId: req.userId!,
        captainId: match.captainId,
        role,
        message,
      }
    });

    sendSuccess(res, { application }, 'Application sent successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const handleApplication = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const matchId = req.params.id as string;
    const appId = req.params.appId as string;
    const { status } = req.body;

    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match || match.captainId !== req.userId) {
      throw new ForbiddenError('Only captain can manage applications');
    }

    const application = await prisma.matchApplication.findUnique({ where: { id: appId } });
    if (!application || application.matchId !== matchId) {
      throw new NotFoundError('Application');
    }

    await prisma.$transaction(async (tx) => {
      await tx.matchApplication.update({
        where: { id: appId },
        data: { status },
      });

      if (status === 'ACCEPTED') {
        await tx.matchPlayer.create({
          data: {
            matchId,
            userId: application.applicantId,
            role: application.role,
          }
        });

        if (application.role) {
          const roleNeeded = await tx.matchRoleNeeded.findFirst({
            where: { matchId, role: application.role }
          });
          
          if (roleNeeded && roleNeeded.filled < roleNeeded.count) {
            await tx.matchRoleNeeded.update({
              where: { id: roleNeeded.id },
              data: { filled: { increment: 1 } }
            });
          }
        }
      }
    });

    sendSuccess(res, null, `Application ${status.toLowerCase()} successfully`);
  } catch (error) {
    next(error);
  }
};

export const withdrawApplication = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const matchId = req.params.id as string;
    const application = await prisma.matchApplication.findFirst({
      where: { matchId, applicantId: req.userId! }
    });

    if (!application) throw new NotFoundError('Application');
    if (application.status === 'ACCEPTED') throw new BadRequestError('Cannot withdraw an accepted application');

    await prisma.matchApplication.update({
      where: { id: application.id },
      data: { status: 'WITHDRAWN' }
    });

    sendSuccess(res, null, 'Application withdrawn');
  } catch (error) {
    next(error);
  }
};

// ─── Match Flow ───────────────────────────────────────────────────────────────

export const startMatch = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const matchId = req.params.id as string;
    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match || match.captainId !== req.userId) throw new ForbiddenError('Unauthorized');

    const updated = await prisma.match.update({
      where: { id: matchId },
      data: { status: 'LIVE' }
    });

    sendSuccess(res, { match: updated }, 'Match started. Scoring can now begin.');
  } catch (error) {
    next(error);
  }
};

export const completeMatch = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const matchId = req.params.id as string;
    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match || match.captainId !== req.userId) throw new ForbiddenError('Unauthorized');

    const updated = await prisma.match.update({
      where: { id: matchId },
      data: { status: 'COMPLETED' }
    });

    sendSuccess(res, { match: updated }, 'Match completed');
  } catch (error) {
    next(error);
  }
};

export const postResult = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const matchId = req.params.id as string;
    const { winnerTeam, resultType, margin, marginType, playerOfMatch, summary } = req.body;
    
    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match || match.captainId !== req.userId) throw new ForbiddenError('Unauthorized');

    const result = await prisma.matchResult.upsert({
      where: { matchId },
      update: { winnerTeam, resultType, margin, marginType, playerOfMatch, summary },
      create: { 
        matchId, 
        winnerTeam, resultType, margin, marginType, playerOfMatch, summary 
      },
    });

    sendSuccess(res, { result }, 'Match result posted successfully', 201);
  } catch (error) {
    next(error);
  }
};
