import api from '@/lib/apiClient';
import type { ApiResponse, Booking } from '@/types';

export interface SellerOverview {
  totalOrchards: number;
  activeListings: number;
  totalViews: number;
  totalBookings: number;
  bookingsByStatus: Record<string, number>;
  revenue: number;
  completedBookings: number;
  pendingApprovals: number;
}

export interface RevenuePoint {
  label: string;
  revenue: number;
  bookings: number;
}

export interface PerformanceRow {
  _id: string;
  gardenName: string;
  slug: string;
  thumbnail: string;
  status: string;
  viewCount: number;
  favouriteCount: number;
  ratingAverage: number;
  revenue: number;
  bookings: number;
}
export interface InquiryAnalytics {
  totalInquiries: number;
  avgResponseTimeHours: number | null;
  conversionRate: number;
  monthlyInquiryTrends: { label: string; count: number }[];
}

/* Feature #28 — per-orchard types */
export interface OrchardAnalytics {
  gardenName: string;
  viewCount: number;
  favouriteCount: number;
  ratingAverage: number;
  ratingCount: number;
  totalBookings: number;
  bookingsByStatus: Record<string, number>;
  revenue: number;
  completedBookings: number;
  pendingApprovals: number;
  revenueSeries: RevenuePoint[];
}

export const sellerService = {
  async overview() {
    const { data } = await api.get<ApiResponse<SellerOverview>>('/seller/overview');
    return data.data;
  },

  async revenue(months = 6) {
    const { data } = await api.get<ApiResponse<RevenuePoint[]>>('/seller/revenue', {
      params: { months },
    });
    return data.data;
  },

  async performance(limit = 10) {
    const { data } = await api.get<ApiResponse<PerformanceRow[]>>('/seller/performance', {
      params: { limit },
    });
    return data.data;
  },
  async inquiryAnalytics(months = 6) {
    const { data } = await api.get<ApiResponse<InquiryAnalytics>>('/seller/inquiries/analytics', {
      params: { months },
    });
    return data.data;
  },

  exportInquiriesUrl: `${import.meta.env.VITE_API_URL || '/api/v1'}/seller/inquiries/export`,

  /* Feature #28 — per-orchard analytics */
  async getOrchardAnalytics(id: string, months = 6) {
    const { data } = await api.get<ApiResponse<OrchardAnalytics>>(
      `/seller/orchards/${id}/analytics`,
      { params: { months } }
    );
    return data.data;
  },

  /* Feature #28 — per-orchard bookings */
  async getOrchardBookings(
    id: string,
    params: { page?: number; limit?: number; status?: string } = {}
  ) {
    const { data } = await api.get<ApiResponse<Booking[]>>(
      `/seller/orchards/${id}/bookings`,
      { params }
    );
    return data;
  },

  exportBookingsUrl: `${import.meta.env.VITE_API_URL || '/api/v1'}/seller/export/bookings`,
};
