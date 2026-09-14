import api from '@/lib/apiClient';
import type { ApiResponse, RecommendationResponse } from '@/types';

export interface RecommendationParams {
  limit?: number;
  fruit?: string;
  state?: string;
  district?: string;
  maxPrice?: number;
}

const cleanParams = (f: object) =>
  Object.fromEntries(
    Object.entries(f).filter(([, v]) => v !== undefined && v !== '' && v !== null)
  );

export const recommendationService = {
  async getPersonalized(params: RecommendationParams = {}) {
    const { data } = await api.get<ApiResponse<RecommendationResponse>>('/recommendations', {
      params: cleanParams(params),
    });
    return data.data;
  },

  async getSimilar(orchardId: string, limit = 6) {
    const { data } = await api.get<ApiResponse<RecommendationResponse>>(
      `/recommendations/similar/${orchardId}`,
      {
        params: { limit },
      }
    );
    return data.data;
  },
};

export default recommendationService;
