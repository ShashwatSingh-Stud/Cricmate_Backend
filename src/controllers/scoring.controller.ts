import { Response, NextFunction } from 'express';
import { prisma } from '../server';
import { AuthenticatedRequest } from '../types';
import { sendSuccess } from '../utils/response';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { calculateInningsTotals, generateCommentary, buildScorecard } from '../services/scoring.service';

const requireScorer = async (matchId: string, userId: string) => {
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match || match.captainId !== userId) {
    throw new ForbiddenError('Only the captain can score the match');
  }
};

export const startInnings = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const matchId = req.params.matchId as string;
    await requireScorer(matchId, req.userId!);

    const innings = await prisma.innings.create({
      data: {
        matchId,
        inningsNumber: req.body.inningsNumber,
        battingTeam: req.body.battingTeam,
      }
    });

    sendSuccess(res, { innings }, 'Innings started', 201);
  } catch (error) {
    next(error);
  }
};

export const recordDelivery = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const matchId = req.params.matchId as string;
    const inningsId = req.params.inningsId as string;
    await requireScorer(matchId, req.userId!);

    const commentary = generateCommentary(req.body);

    const delivery = await prisma.delivery.create({
      data: {
        ...req.body,
        inningsId,
        commentary,
      }
    });

    const totals = await calculateInningsTotals(inningsId);

    sendSuccess(res, { delivery, totals }, 'Delivery recorded', 201);
  } catch (error) {
    next(error);
  }
};

export const undoLastDelivery = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const matchId = req.params.matchId as string;
    const inningsId = req.params.inningsId as string;
    await requireScorer(matchId, req.userId!);

    const lastDelivery = await prisma.delivery.findFirst({
      where: { inningsId },
      orderBy: { createdAt: 'desc' }
    });

    if (!lastDelivery) {
      throw new NotFoundError('No deliveries found to undo');
    }

    await prisma.delivery.delete({ where: { id: lastDelivery.id } });
    
    const totals = await calculateInningsTotals(inningsId);

    sendSuccess(res, { totals }, 'Last delivery undone successfully');
  } catch (error) {
    next(error);
  }
};

export const completeInnings = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const matchId = req.params.matchId as string;
    const inningsId = req.params.inningsId as string;
    await requireScorer(matchId, req.userId!);

    const updated = await prisma.innings.update({
      where: { id: inningsId },
      data: { isCompleted: true }
    });

    sendSuccess(res, { innings: updated }, 'Innings completed');
  } catch (error) {
    next(error);
  }
};

export const syncOfflineScoring = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const matchId = req.params.matchId as string;
    const { inningsId, deliveries } = req.body;
    
    await requireScorer(matchId, req.userId!);
    
    if (deliveries && deliveries.length > 0) {
      const existing = await prisma.delivery.findMany({
        where: { inningsId },
        select: { overNumber: true, ballNumber: true }
      });
      
      const existingSet = new Set(existing.map(d => `${d.overNumber}-${d.ballNumber}`));
      
      const newDeliveries = deliveries.filter((d: any) => !existingSet.has(`${d.overNumber}-${d.ballNumber}`));
      
      if (newDeliveries.length > 0) {
        await prisma.delivery.createMany({
          data: newDeliveries.map((d: any) => ({
            ...d,
            inningsId,
            commentary: generateCommentary(d),
          }))
        });
        
        await calculateInningsTotals(inningsId);
      }
    }

    sendSuccess(res, null, 'Offline scoring synced successfully');
  } catch (error) {
    next(error);
  }
};

export const getLiveScorecard = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const matchId = req.params.matchId as string;
    const scorecard = await buildScorecard(matchId);
    
    if (!scorecard) throw new NotFoundError('Match');
    
    sendSuccess(res, { scorecard });
  } catch (error) {
    next(error);
  }
};
