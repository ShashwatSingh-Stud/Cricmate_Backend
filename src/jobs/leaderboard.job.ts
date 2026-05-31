import cron from 'node-cron';
import { rebuildCurrentMonthLeaderboard, rebuildAnnualLeaderboard } from '../services/leaderboard.service';
import logger from '../utils/logger';

export function startLeaderboardJobs() {
  // Monthly Leaderboard - Run daily at 1:00 AM to keep current month updated
  cron.schedule('0 1 * * *', async () => {
    logger.info('Starting monthly leaderboard update job');
    await rebuildCurrentMonthLeaderboard();
  });

  // Annual Leaderboard - Run on the 1st of every month at 2:00 AM
  cron.schedule('0 2 1 * *', async () => {
    logger.info('Starting annual leaderboard update job');
    await rebuildAnnualLeaderboard();
  });
}
