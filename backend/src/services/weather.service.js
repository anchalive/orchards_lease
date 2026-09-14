import logger from '../config/logger.js';
import ApiError from '../utils/ApiError.js';
import { weatherCache } from '../utils/cache.js';

const getWeatherCondition = (code) => {
  if (code === 0) return { condition: 'Clear', icon: 'sun' };
  if (code === 1) return { condition: 'Mainly Clear', icon: 'cloud-sun' };
  if (code === 2) return { condition: 'Partly Cloudy', icon: 'cloud-sun' };
  if (code === 3) return { condition: 'Overcast', icon: 'cloud' };
  if (code === 45 || code === 48) return { condition: 'Foggy', icon: 'cloud-fog' };
  if (code >= 51 && code <= 57) return { condition: 'Drizzle', icon: 'cloud-drizzle' };
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return { condition: 'Rainy', icon: 'cloud-rain' };
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return { condition: 'Snowy', icon: 'cloud-snow' };
  if (code >= 95 && code <= 99) return { condition: 'Thunderstorm', icon: 'cloud-lightning' };
  return { condition: 'Unknown', icon: 'cloud' };
};

const OpenMeteoProvider = {
  name: 'OpenMeteo',

  async geocode(query) {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`;
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!response.ok) {
        throw new Error(`Geocoding HTTP error ${response.status}`);
      }
      const data = await response.json();
      if (!data.results || data.results.length === 0) {
        return null;
      }
      const { latitude, longitude } = data.results[0];
      return { latitude, longitude };
    } catch (err) {
      logger.error(`Geocoding failed: ${err.message}`);
      if (err.name === 'TimeoutError') {
        throw new ApiError(504, 'Geocoding request timed out');
      }
      throw new ApiError(502, `Failed to geocode location: ${err.message}`);
    }
  },

  async fetchWeather(lat, lon) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,precipitation_probability,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max&timezone=auto`;
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!response.ok) {
        throw new Error(`Weather API HTTP error ${response.status}`);
      }
      const data = await response.json();
      return this.normalizeResponse(data);
    } catch (err) {
      logger.error(`Weather fetch failed: ${err.message}`);
      if (err.name === 'TimeoutError') {
        throw new ApiError(504, 'Weather API request timed out');
      }
      throw new ApiError(502, `Failed to fetch weather: ${err.message}`);
    }
  },

  normalizeResponse(data) {
    if (!data.current || !data.daily) {
      throw new ApiError(502, 'Invalid response structure from weather provider');
    }

    const { current, daily } = data;
    const currentCond = getWeatherCondition(current.weather_code);

    const formatTime = (isoString) => {
      if (!isoString) return '';
      try {
        const date = new Date(isoString);
        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      } catch {
        return isoString;
      }
    };

    const currentFormatted = {
      temperature: Math.round(current.temperature_2m),
      feelsLike: Math.round(current.apparent_temperature),
      humidity: current.relative_humidity_2m,
      windSpeed: Math.round(current.wind_speed_10m),
      rainChance: current.precipitation_probability || 0,
      condition: currentCond.condition,
      icon: currentCond.icon,
      sunrise: formatTime(daily.sunrise?.[0]),
      sunset: formatTime(daily.sunset?.[0]),
    };

    const forecastFormatted = (daily.time || []).map((date, idx) => {
      const cond = getWeatherCondition(daily.weather_code?.[idx]);
      return {
        date,
        tempMax: Math.round(daily.temperature_2m_max?.[idx] ?? 0),
        tempMin: Math.round(daily.temperature_2m_min?.[idx] ?? 0),
        condition: cond.condition,
        icon: cond.icon,
        rainChance: daily.precipitation_probability_max?.[idx] ?? 0,
      };
    });

    return {
      current: currentFormatted,
      forecast: forecastFormatted,
      alerts: [],
    };
  }
};

const providers = {
  OpenMeteo: OpenMeteoProvider,
};

let activeProviderName = 'OpenMeteo';

export const WeatherService = {
  setProvider(name) {
    if (!providers[name]) {
      throw new Error(`Provider ${name} not found`);
    }
    activeProviderName = name;
  },

  getProvider() {
    return providers[activeProviderName];
  },

  async getWeatherForCoordinates(lat, lon) {
    const roundedLat = Number(lat).toFixed(4);
    const roundedLon = Number(lon).toFixed(4);
    const cacheKey = `weather:${roundedLat}:${roundedLon}`;

    const cached = weatherCache.get(cacheKey);
    if (cached) {
      logger.info(`Serving weather from cache for ${roundedLat},${roundedLon}`);
      return cached;
    }

    const provider = this.getProvider();
    const data = await provider.fetchWeather(roundedLat, roundedLon);

    weatherCache.set(cacheKey, data, 30 * 60);
    return data;
  },

  async getWeatherForLocation(query) {
    const provider = this.getProvider();
    const coords = await provider.geocode(query);
    if (!coords) {
      throw ApiError.badRequest(`Could not find coordinates for the location: ${query}`);
    }
    return this.getWeatherForCoordinates(coords.latitude, coords.longitude);
  }
};

export default WeatherService;
