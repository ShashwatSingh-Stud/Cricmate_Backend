import { prisma } from '../server';
import logger from '../utils/logger';

export async function calculateInningsTotals(inningsId: string) {
  try {
    const deliveries = await prisma.delivery.findMany({
      where: { inningsId },
    });

    let totalRuns = 0;
    let totalWickets = 0;
    let extras = 0;
    let legalBalls = 0;

    for (const d of deliveries) {
      totalRuns += d.runs + d.extras;
      extras += d.extras;
      if (d.isWicket) totalWickets += 1;
      if (d.isLegal) legalBalls += 1;
    }

    const overs = Math.floor(legalBalls / 6);
    const remainingBalls = legalBalls % 6;
    const totalOvers = parseFloat(`${overs}.${remainingBalls}`);

    await prisma.innings.update({
      where: { id: inningsId },
      data: {
        totalRuns,
        totalWickets,
        totalOvers,
        extras,
      },
    });

    return { totalRuns, totalWickets, totalOvers, extras };
  } catch (error) {
    logger.error('Failed to calculate innings totals', { error, inningsId });
    throw error;
  }
}

export function generateCommentary(delivery: any): string {
  let text = '';
  
  if (delivery.isWicket) {
    text += `WICKET! ${delivery.dismissalType || ''}. `;
  } else if (delivery.runs === 4) {
    text += 'FOUR! Beautiful shot. ';
  } else if (delivery.runs === 6) {
    text += 'SIX! That is out of the ground! ';
  } else if (delivery.runs > 0) {
    text += `${delivery.runs} runs. `;
  } else {
    text += 'Dot ball. ';
  }

  if (delivery.extras > 0) {
    text += `(${delivery.extras} ${delivery.extraType || 'extras'})`;
  }

  return text.trim();
}

export async function buildScorecard(matchId: string) {
  try {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        innings: {
          include: {
            deliveries: {
              orderBy: [
                { overNumber: 'asc' },
                { ballNumber: 'asc' }
              ]
            }
          },
          orderBy: { inningsNumber: 'asc' }
        },
        players: {
          include: {
            user: { select: { id: true, name: true, avatarUrl: true } }
          }
        },
        result: true,
      }
    });

    if (!match) return null;

    // Process batting and bowling stats from deliveries
    const scorecard = match.innings.map(inning => {
      const battingStats = new Map();
      const bowlingStats = new Map();

      for (const d of inning.deliveries) {
        // Batting stats
        if (!battingStats.has(d.batsmanId)) {
          battingStats.set(d.batsmanId, { runs: 0, balls: 0, fours: 0, sixes: 0, dismissed: false });
        }
        const b = battingStats.get(d.batsmanId);
        if (d.isLegal || d.extraType === 'NO_BALL') {
          b.balls += 1;
          b.runs += d.runs;
          if (d.runs === 4) b.fours += 1;
          if (d.runs === 6) b.sixes += 1;
        }
        if (d.isWicket && d.dismissedPlayerId === d.batsmanId) {
          b.dismissed = true;
        }

        // Bowling stats
        if (!bowlingStats.has(d.bowlerId)) {
          bowlingStats.set(d.bowlerId, { runs: 0, legalBalls: 0, wickets: 0, extras: 0 });
        }
        const bw = bowlingStats.get(d.bowlerId);
        bw.runs += d.runs + (['WIDE', 'NO_BALL'].includes(d.extraType as string) ? d.extras : 0);
        bw.extras += d.extras;
        if (d.isLegal) bw.legalBalls += 1;
        if (d.isWicket && !['RUN_OUT', 'OBSTRUCTING_FIELD', 'HANDLED_BALL'].includes(d.dismissalType as string)) {
          bw.wickets += 1;
        }
      }

      return {
        inningsNumber: inning.inningsNumber,
        battingTeam: inning.battingTeam,
        totalRuns: inning.totalRuns,
        totalWickets: inning.totalWickets,
        totalOvers: inning.totalOvers,
        extras: inning.extras,
        batting: Array.from(battingStats.entries()).map(([id, stats]) => ({
          player: match.players.find(p => p.userId === id)?.user,
          ...stats,
          strikeRate: stats.balls > 0 ? ((stats.runs / stats.balls) * 100).toFixed(2) : '0.00'
        })),
        bowling: Array.from(bowlingStats.entries()).map(([id, stats]) => ({
          player: match.players.find(p => p.userId === id)?.user,
          ...stats,
          overs: `${Math.floor(stats.legalBalls / 6)}.${stats.legalBalls % 6}`,
          economy: stats.legalBalls > 0 ? ((stats.runs / stats.legalBalls) * 6).toFixed(2) : '0.00'
        })),
      };
    });

    return {
      matchInfo: {
        format: match.format,
        date: match.date,
        city: match.city,
        status: match.status,
      },
      result: match.result,
      scorecard,
    };
  } catch (error) {
    logger.error('Failed to build scorecard', { error, matchId });
    return null;
  }
}
