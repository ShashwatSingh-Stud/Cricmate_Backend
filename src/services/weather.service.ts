import logger from '../utils/logger';
import { WEATHER } from '../utils/constants';

export interface WeatherForecast {
  rainProbability: number;
  condition: string;
}

export async function getWeatherForecast(lat: number, lng: number): Promise<WeatherForecast | null> {
  try {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) {
      logger.warn('OpenWeatherMap API key not configured, using mock forecast');
      return { rainProbability: Math.floor(Math.random() * 100), condition: 'Mock Condition' };
    }

    // Call One Call API or 5 day forecast
    // OpenWeather API endpoint: api.openweathermap.org/data/2.5/forecast?lat={lat}&lon={lon}&appid={API key}
    const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric`;
    const response = await fetch(url);
    const data = await response.json();

    if ((data as any).list && (data as any).list.length > 0) {
      // Find forecast for tomorrow (around afternoon time)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowDateStr = tomorrow.toISOString().split('T')[0];

      const tomorrowForecasts = (data as any).list.filter((f: any) => f.dt_txt.startsWith(tomorrowDateStr));
      
      if (tomorrowForecasts.length > 0) {
        // Find max rain probability (pop is probability of precipitation 0-1)
        const maxPop = Math.max(...tomorrowForecasts.map((f: any) => f.pop));
        return {
          rainProbability: Math.round(maxPop * 100),
          condition: tomorrowForecasts[0].weather[0].main,
        };
      }
    }

    return null;
  } catch (error) {
    logger.error('Failed to fetch weather forecast', { error, lat, lng });
    return null;
  }
}

export function shouldSendAlert(forecast: WeatherForecast | null): boolean {
  if (!forecast) return false;
  return forecast.rainProbability >= WEATHER.RAIN_ALERT_THRESHOLD;
}
