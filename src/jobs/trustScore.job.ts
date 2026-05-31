import cron from 'node-cron';
import { prisma } from '../server';
import { recalculateTrustScore } from '../services/trust.service';
import logger from '../utils/logger';

export function startTrustScoreJob() {
  // Run every Sunday at 3:00 AM
  cron.schedule('0 3 * * 0', async () => {
    logger.info('Starting weekly trust score recalculation job');
    
    try {
      // In a real app, this should be done in batches
      const users = await prisma.user.findMany({
        where: { isActive: true },
        select: { id: true }
      });

      for (const user of users) {
        await recalculateTrustScore(user.id);
      }

      logger.info(`Completed trust score recalculation for ${users.length} users`);
    } catch (error) {
      logger.error('Failed in trust score job', { error });
    }
  });
}
