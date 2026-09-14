import api from '@/lib/apiClient';
import type {
  ApiResponse,
  OrchardAvailabilityResponse,
  BlockedDate,
  BlockedDateReason,
} from '@/types';

export interface CreateBlockDateDto {
  startDate: string;
  endDate: string;
  reason?: BlockedDateReason;
  note?: string;
}

export interface UpdateBlockDateDto {
  startDate?: string;
  endDate?: string;
  reason?: BlockedDateReason;
  note?: string;
}

export const availabilityService = {
  async getAvailability(orchardId: string) {
    const { data } = await api.get<ApiResponse<OrchardAvailabilityResponse>>(
      `/orchards/${orchardId}/availability`
    );
    return data.data;
  },

  async createBlockedDate(orchardId: string, payload: CreateBlockDateDto) {
    const { data } = await api.post<ApiResponse<BlockedDate>>(
      `/orchards/${orchardId}/block-dates`,
      payload
    );
    return data.data;
  },

  async updateBlockedDate(orchardId: string, blockId: string, payload: UpdateBlockDateDto) {
    const { data } = await api.put<ApiResponse<BlockedDate>>(
      `/orchards/${orchardId}/block-dates/${blockId}`,
      payload
    );
    return data.data;
  },

  async deleteBlockedDate(orchardId: string, blockId: string) {
    const { data } = await api.delete<ApiResponse<null>>(
      `/orchards/${orchardId}/block-dates/${blockId}`
    );
    return data;
  },

  async bulkUpdateAvailability(
    orchardId: string,
    payload: {
      availabilityDates?: { startDate: string; endDate: string; note?: string }[];
      blockedDates?: BlockedDate[];
    }
  ) {
    const { data } = await api.put<
      ApiResponse<{
        availabilityDates: { startDate: string; endDate: string; note?: string }[];
        blockedDates: BlockedDate[];
      }>
    >(`/orchards/${orchardId}/availability`, payload);
    return data.data;
  },
};
