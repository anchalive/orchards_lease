import api from '@/lib/apiClient';
import type { ApiResponse, WeatherData } from '@/types';

export const weatherService = {
  async getWeather(orchardId: string) {
    const { data } = await api.get<ApiResponse<WeatherData>>(`/weather/${orchardId}`);
    return data.data;
  },
};
