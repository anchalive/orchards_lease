import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import { ok } from '../utils/ApiResponse.js';
import Orchard from '../models/Orchard.js';
import WeatherService from '../services/weather.service.js';

export const getWeatherForOrchard = asyncHandler(async (req, res) => {
  const { orchardId } = req.params;

  const orchard = await Orchard.findOne({ _id: orchardId, deletedAt: null }).lean();
  if (!orchard) {
    throw ApiError.notFound('Orchard not found');
  }

  let weatherData;
  if (orchard.latitude != null && orchard.longitude != null) {
    weatherData = await WeatherService.getWeatherForCoordinates(orchard.latitude, orchard.longitude);
  } else if (orchard.district && orchard.state) {
    const query = `${orchard.district}, ${orchard.state}, ${orchard.country || 'India'}`;
    weatherData = await WeatherService.getWeatherForLocation(query);
  } else {
    throw ApiError.badRequest('Orchard is missing location details and coordinates');
  }

  return ok(res, weatherData, 'Weather data retrieved successfully');
});
