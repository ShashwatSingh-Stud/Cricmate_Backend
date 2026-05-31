import cron from 'node-cron';
import { prisma } from '../server';
import { getWeatherForecast, shouldSendAlert } from '../services/weather.service';
import { createInAppNotification, sendWhatsApp, templates } from '../services/notification.service';
import logger from '../utils/logger';

export function startWeatherAlertJob() {
  // Run every day at 8:00 PM for tomorrow's matches
  cron.schedule('0 20 * * *', async () => {
    logger.info('Starting weather alert job');
    
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      
      const dayAfter = new Date(tomorrow);
      dayAfter.setDate(dayAfter.getDate() + 1);

      // Find all confirmed bookings for tomorrow
      const bookings = await prisma.booking.findMany({
        where: {
          date: { gte: tomorrow, lt: dayAfter },
          status: 'CONFIRMED'
        },
        include: {
          ground: true,
          user: true, // the captain who booked
        }
      });

      // Cache forecasts by ground to avoid duplicate API calls
      const forecastCache = new Map<string, any>();

      for (const booking of bookings) {
        const { ground, user } = booking;
        
        let forecast;
        if (forecastCache.has(ground.id)) {
          forecast = forecastCache.get(ground.id);
        } else {
          forecast = await getWeatherForecast(ground.latitude, ground.longitude);
          forecastCache.set(ground.id, forecast);
        }

        if (shouldSendAlert(forecast)) {
          const dateStr = tomorrow.toISOString().split('T')[0];
          
          // Send notification to captain
          await createInAppNotification(
            user.id,
            'WEATHER_ALERT',
            'Weather Alert for Tomorrow',
            'कल के मैच के लिए मौसम चेतावनी',
            `High chance of rain (${forecast.rainProbability}%) at ${ground.name}.`,
            `${ground.name} पर बारिश की ${forecast.rainProbability}% संभावना है।`,
          );

          if (user.phone) {
            await sendWhatsApp(
              user.phone,
              templates.weatherAlert(ground.name, dateStr, forecast.rainProbability)
            );
          }
        }
      }

      logger.info(`Completed weather alert job for ${bookings.length} bookings`);
    } catch (error) {
      logger.error('Failed in weather alert job', { error });
    }
  });
}
