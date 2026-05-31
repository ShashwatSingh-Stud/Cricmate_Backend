import cron from 'node-cron';
import { prisma } from '../server';
import { generateWrappedData } from '../services/wrapped.service';
import { createInAppNotification } from '../services/notification.service';
import logger from '../utils/logger';

export function startWrappedJob() {
  // Run on December 1st every year at 00:00
  cron.schedule('0 0 1 12 *', async () => {
    logger.info('Starting annual CricMate Wrapped generation job');
    
    try {
      const year = new Date().getFullYear();
      
      const users = await prisma.user.findMany({
        where: { isActive: true },
        select: { id: true }
      });

      for (const user of users) {
        // In a real app, save this to a Wrapped database table
        const wrappedData = await generateWrappedData(user.id, year);
        
        if (wrappedData && wrappedData.totalMatches > 0) {
          // Notify user
          await createInAppNotification(
            user.id,
            'BADGE_EARNED',
            `Your ${year} CricMate Wrapped is Here!`,
            `आपका ${year} CricMate रैप्ड आ गया है!`,
            'Tap to see your cricket journey this year.',
            'इस साल अपनी क्रिकेट यात्रा देखने के लिए टैप करें।',
            { type: 'WRAPPED', year }
          );
        }
      }

      logger.info(`Completed Wrapped generation for ${year}`);
    } catch (error) {
      logger.error('Failed in Wrapped job', { error });
    }
  });
}
