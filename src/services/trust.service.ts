import { prisma } from '../server';
import { TRUST_SCORE } from '../utils/constants';
import logger from '../utils/logger';

export async function recalculateTrustScore(userId: string): Promise<number> {
  try {
    // 1. Fetch user to check current matches count
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { trustMatchCount: true }
    });

    if (!user) return TRUST_SCORE.DEFAULT;

    // 2. Fetch last 20 matches the player was confirmed for
    const recentMatches = await prisma.matchPlayer.findMany({
      where: { userId },
      take: TRUST_SCORE.RECENT_MATCHES_WINDOW,
      orderBy: { match: { date: 'desc' } },
      include: {
        match: {
          include: { checkIns: { where: { userId } } }
        }
      }
    });

    if (recentMatches.length === 0) {
      return TRUST_SCORE.DEFAULT;
    }

    let score: number = TRUST_SCORE.DEFAULT;
    let newMatchCount = user.trustMatchCount;
    let noShows = 0;

    for (const matchPlayer of recentMatches) {
      const match = matchPlayer.match;
      
      if (match.status === 'COMPLETED' || match.status === 'LIVE') {
        newMatchCount++;
        
        // Did they check in?
        if (match.checkIns.length > 0) {
          const checkIn = match.checkIns[0];
          // On-time if checked in before match starts (simplified: within 1 hour before)
          // In real implementation, compare checkIn.checkedAt with match.date
          score += TRUST_SCORE.ON_TIME_BONUS;
        } else {
          // No-show
          score += TRUST_SCORE.NO_SHOW_PENALTY;
          noShows++;
        }
      } else if (match.status === 'CANCELLED') {
        // Did this user cancel it? (Assuming captain cancellation)
        // Needs more complex logic for late cancellation penalties
      }
    }

    // Milestone bonus
    const milestones = Math.floor(newMatchCount / TRUST_SCORE.MILESTONE_INTERVAL);
    score += milestones * TRUST_SCORE.MILESTONE_BONUS;

    // Apply bounds
    score = Math.max(1.0, Math.min(score, 5.0));

    // Update DB
    await prisma.user.update({
      where: { id: userId },
      data: {
        trustScore: parseFloat(score.toFixed(2)),
        trustMatchCount: newMatchCount,
        noShowCount: { increment: noShows },
      }
    });

    return score;
  } catch (error) {
    logger.error('Failed to recalculate trust score', { error, userId });
    return TRUST_SCORE.DEFAULT;
  }
}
