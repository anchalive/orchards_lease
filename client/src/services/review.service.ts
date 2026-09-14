import apiClient from '@/lib/apiClient';
import type { ApiResponse, Review, ReviewSummary, Booking } from '@/types';

export interface CreateReviewPayload {
  orchardId?: string;
  bookingId: string;
  rating: number;
  cleanlinessRating?: number;
  maintenanceRating?: number;
  accessibilityRating?: number;
  communicationRating?: number;
  comment?: string;
}

export interface UpdateReviewPayload {
  rating?: number;
  cleanlinessRating?: number;
  maintenanceRating?: number;
  accessibilityRating?: number;
  communicationRating?: number;
  comment?: string;
}

export interface ReviewableBookingResult {
  canReview: boolean;
  booking: Booking | null;
}

export const reviewService = {
  async getOrchardReviews(orchardId: string, page = 1, limit = 10, sort?: 'newest' | 'highest' | 'lowest') {
    const { data } = await apiClient.get<ApiResponse<Review[]> & { summary?: ReviewSummary }>(
      `/orchards/${orchardId}/reviews`,
      { params: { page, limit, sort } }
    );
    return {
      reviews: data.data || [],
      summary: data.summary,
      meta: data.meta,
    };
  },

  async getReviewableBooking(orchardId: string) {
    const { data } = await apiClient.get<ApiResponse<ReviewableBookingResult>>(
      `/orchards/${orchardId}/reviewable-booking`
    );
    return data.data;
  },

  async createReview(orchardId: string, payload: CreateReviewPayload) {
    const { data } = await apiClient.post<ApiResponse<Review>>(
      `/orchards/${orchardId}/reviews`,
      payload
    );
    return data.data;
  },

  async updateReview(reviewId: string, payload: UpdateReviewPayload) {
    const { data } = await apiClient.put<ApiResponse<Review>>(`/reviews/${reviewId}`, payload);
    return data.data;
  },

  async deleteReview(reviewId: string) {
    const { data } = await apiClient.delete<ApiResponse<null>>(`/reviews/${reviewId}`);
    return data;
  },

  async reportReview(reviewId: string) {
    const { data } = await apiClient.post<ApiResponse<null>>(`/reviews/${reviewId}/report`);
    return data;
  },

  async getSellerReviews(page = 1, limit = 10) {
    const { data } = await apiClient.get<
      ApiResponse<{ reviews: Review[]; summary: ReviewSummary }>
    >('/seller/reviews', { params: { page, limit } });
    return data.data;
  },

  async getAdminReportedReviews(page = 1, limit = 10, status?: string) {
    const { data } = await apiClient.get<ApiResponse<Review[]>>('/admin/moderation/reviews', {
      params: { page, limit, status },
    });
    return data;
  },

  async moderateReview(reviewId: string, action: 'approve' | 'reject' | 'hide' | 'unhide' | 'dismiss' | 'delete') {
    const { data } = await apiClient.patch<ApiResponse<null>>(`/reviews/${reviewId}/moderate`, {
      action,
    });
    return data;
  },
};
