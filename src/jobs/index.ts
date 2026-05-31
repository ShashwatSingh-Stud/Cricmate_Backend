import logger from '../utils/logger';
import { startTrustScoreJob } from './trustScore.job';
import { startWeatherAlertJob } from './weatherAlert.job';
import { startLeaderboardJobs } from './leaderboard.job';
import { startWrappedJob } from './wrappedGenerate.job';

/**
 * Initialize all background cron jobs.
 * Each job module registers its own schedule via node-cron.
 */
export function initCronJobs(): void {
  logger.info('Initializing background cron jobs...');

  startTrustScoreJob();
  startWeatherAlertJob();
  startLeaderboardJobs();
  startWrappedJob();

  logger.info('   ✅ Background jobs registered successfully');
}
