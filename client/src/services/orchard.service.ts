import api from '@/lib/apiClient';
import type { ApiResponse, Orchard, Review, FilterOptions, HealthScoreData, HarvestSeason, HarvestInfo, OrchardAvailabilityResponse } from '@/types';

export interface OrchardFilters {
  page?: number;
  limit?: number;
  sort?: string;
  search?: string;
  fruit?: string;
  state?: string;
  district?: string;
  rentType?: string;
  amenities?: string;
  minPrice?: number;
  maxPrice?: number;
  minTrees?: number;
  maxTrees?: number;
  minArea?: number;
  maxArea?: number;
  minYield?: number;
  rating?: number;
  available?: boolean;
  featured?: boolean;
  harvestThisMonth?: boolean;
  upcomingHarvest?: boolean;
  peakSeason?: boolean;
  sellerId?: string;
}

const cleanParams = (f: object) =>
  Object.fromEntries(
    Object.entries(f).filter(([, v]) => v !== undefined && v !== '' && v !== null)
  );

export const orchardService = {
  async list(filters: OrchardFilters = {}) {
    const { data } = await api.get<ApiResponse<Orchard[]>>('/orchards', {
      params: cleanParams(filters),
    });
    return data;
  },

  async getBySlug(slug: string) {
    const { data } = await api.get<ApiResponse<Orchard>>(`/orchards/${slug}`);
    return data.data;
  },

  async getHealthScore(id: string) {
    const { data } = await api.get<ApiResponse<HealthScoreData>>(`/orchards/${id}/health-score`);
    return data.data;
  },

  async getAvailability(id: string) {
    const { data } = await api.get<ApiResponse<OrchardAvailabilityResponse>>(`/orchards/${id}/availability`);
    return data.data;
  },

  async getRelated(slug: string) {
    const { data } = await api.get<ApiResponse<Orchard[]>>(`/orchards/${slug}/related`);
    return data.data;
  },

  async getReviews(orchardId: string, page = 1) {
    const { data } = await api.get<ApiResponse<Review[]>>(`/orchards/${orchardId}/reviews`, {
      params: { page },
    });
    return data;
  },

  async getFeatured() {
    const { data } = await api.get<ApiResponse<Orchard[]>>('/meta/featured');
    return data.data;
  },

  async getFilterOptions() {
    const { data } = await api.get<ApiResponse<FilterOptions>>('/meta/filters');
    return data.data;
  },

  /* ----------------------- Seller-owned ---------------------------- */
  async listMine(params: { status?: string; search?: string; page?: number } = {}) {
    const { data } = await api.get<ApiResponse<Orchard[]>>('/orchards/mine/list', {
      params: cleanParams(params),
    });
    return data;
  },

  async create(body: Partial<Orchard>) {
    const { data } = await api.post<ApiResponse<Orchard>>('/orchards', body);
    return data.data;
  },

  async update(id: string, body: Partial<Orchard>) {
    const { data } = await api.patch<ApiResponse<Orchard>>(`/orchards/${id}`, body);
    return data.data;
  },

  async remove(id: string) {
    await api.delete(`/orchards/${id}`);
  },

  async clone(id: string) {
    const { data } = await api.post<ApiResponse<Orchard>>(`/orchards/${id}/clone`);
    return data.data;
  },

  async setStatus(id: string, action: 'publish' | 'unpublish' | 'archive') {
    const { data } = await api.post<ApiResponse<Orchard>>(`/orchards/${id}/${action}`);
    return data.data;
  },

  async toggleAvailability(id: string) {
    const { data } = await api.post<ApiResponse<{ available: boolean }>>(
      `/orchards/${id}/toggle-availability`
    );
    return data.data;
  },

  async getHarvest(id: string) {
    const { data } = await api.get<ApiResponse<HarvestInfo>>(`/orchards/${id}/harvest`);
    return data.data;
  },

  async updateHarvest(id: string, harvestSeasons: HarvestSeason[]) {
    const { data } = await api.put<ApiResponse<{ orchard: Orchard; harvestData: HarvestInfo }>>(
      `/orchards/${id}/harvest`,
      { harvestSeasons }
    );
    return data.data;
  },

  async patchHarvest(id: string, harvestSeasons?: HarvestSeason[]) {
    const { data } = await api.patch<ApiResponse<{ orchard: Orchard; harvestData: HarvestInfo }>>(
      `/orchards/${id}/harvest`,
      { harvestSeasons }
    );
    return data.data;
  },

  async uploadImages(files: FileList | File[]) {
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('images', files[i]);
    }
    const { data } = await api.post<ApiResponse<{ url: string; publicId: string }[]>>('/orchards/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return data.data;
  },
};

