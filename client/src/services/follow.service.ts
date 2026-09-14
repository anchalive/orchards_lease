import api from '@/lib/apiClient';
import type { ApiResponse, FollowedSeller, SellerFollowStats, Orchard } from '@/types';

export const followService = {
  async followSeller(sellerId: string) {
    const { data } = await api.post<ApiResponse<{ followed: boolean; sellerId: string }>>(
      `/follow/${sellerId}`
    );
    return data;
  },

  async unfollowSeller(sellerId: string) {
    const { data } = await api.delete<ApiResponse<{ followed: boolean; sellerId: string }>>(
      `/follow/${sellerId}`
    );
    return data;
  },

  async getFollowing() {
    const { data } = await api.get<ApiResponse<FollowedSeller[]>>('/following');
    return data.data;
  },

  async getSellerFollowersStats(sellerId: string) {
    const { data } = await api.get<ApiResponse<SellerFollowStats>>(`/followers/${sellerId}`);
    return data.data;
  },

  async getFollowingOrchards(params: { page?: number; limit?: number } = {}) {
    const { data } = await api.get<ApiResponse<Orchard[]>>('/following/orchards', { params });
    return data;
  },
};
