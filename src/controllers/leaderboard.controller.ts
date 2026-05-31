import { Response, NextFunction } from 'express';
import { prisma } from '../server';
import { AuthenticatedRequest, LeaderboardFilters, parsePagination } from '../types';
import { sendSuccess, sendPaginated, buildPagination } from '../utils/response';

export const getLeaderboard = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const filters = req.query as unknown as LeaderboardFilters;
    const paginationParams = parsePagination(req.query);

    const where: any = { 
      city: { equals: filters.city, mode: 'insensitive' },
      season: filters.season || '2024',
    };

    if (filters.colony) {
      where.colony = { equals: filters.colony, mode: 'insensitive' };
    }

    // Determine sort field based on category
    let orderBy: any = { runsScored: 'desc' }; // default batting
    if (filters.category === 'bowling') {
      orderBy = { wicketsTaken: 'desc' };
    } else if (filters.category === 'allround') {
      // Simplified: order by sum of runs and wickets*10
      // Requires raw SQL for precise custom sorting in real app
    }

    const [entries, total] = await Promise.all([
      prisma.leaderboardEntry.findMany({
        where,
        skip: paginationParams.skip,
        take: paginationParams.limit,
        include: { user: { select: { name: true, avatarUrl: true } } },
        orderBy,
      }),
      prisma.leaderboardEntry.count({ where }),
    ]);

    // Add rank property
    const rankedEntries = entries.map((entry, index) => ({
      ...entry,
      rank: paginationParams.skip + index + 1,
    }));

    sendPaginated(res, rankedEntries, buildPagination(paginationParams.page, paginationParams.limit, total));
  } catch (error) {
    next(error);
  }
};

export const getMyRank = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { city, season, category } = req.query as { city: string, season: string, category: string };

    const entry = await prisma.leaderboardEntry.findFirst({
      where: { 
        userId: req.userId,
        city: city as string,
        season: (season as string) || '2024',
      }
    });

    if (!entry) {
      return sendSuccess(res, { rank: null, entry: null });
    }

    // Determine rank (requires counting users above this entry)
    let whereHigher: any = {
      city: city as string,
      season: (season as string) || '2024',
    };

    if (category === 'bowling') {
      whereHigher.wicketsTaken = { gt: entry.wicketsTaken };
    } else {
      whereHigher.runsScored = { gt: entry.runsScored };
    }

    const higherUsersCount = await prisma.leaderboardEntry.count({ where: whereHigher });
    const rank = higherUsersCount + 1;

    sendSuccess(res, { rank, entry });
  } catch (error) {
    next(error);
  }
};
