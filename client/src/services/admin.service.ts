import api from '@/lib/apiClient';
import type { ApiResponse, Orchard, User, PageMeta } from '@/types';

export interface AdminKpis {
  totalUsers: number;
  userGrowthPercent: number;
  totalOrchards: number;
  orchardGrowthPercent: number;
  activeRentals: number;
  totalRevenue: number;
  totalBookings: number;
  conversionRate: number;
  pendingModeration: number;
}

export interface SeriesPoint {
  label: string;
  revenue?: number;
  bookings?: number;
  count?: number;
  sellers?: number;
  renters?: number;
}

export interface GeoRow {
  state: string;
  orchards: number;
  avgPrice: number;
}

export interface TopSeller {
  sellerId: string;
  name: string;
  email: string;
  revenue: number;
  bookings: number;
}

export interface FruitRow {
  fruit: string;
  count: number;
}

export interface AdminDashboard {
  kpis: AdminKpis;
  userGrowth: SeriesPoint[];
  revenue: SeriesPoint[];
  geographic: GeoRow[];
  topSellers: TopSeller[];
  topFruits: FruitRow[];
  dailyTraffic: { date: string; bookings: number }[];
}

export interface AuditLog {
  _id: string;
  actorLabel: string;
  actorRole: string;
  action: string;
  targetType: string;
  description: string;
  createdAt: string;
  actor?: { name: string; email: string };
}

export interface PlatformSettings {
  maintenanceMode: boolean;
  maintenanceMessage: string;
  announcement: { enabled: boolean; message: string; level: 'info' | 'warning' | 'critical' };
  autoApproveOrchards: boolean;
  featuredLimit: number;
  supportEmail: string;
  commissionPercent: number;
  advancePaymentPercent: number;
  balanceDueDaysBeforeLease: number;
}

export const adminService = {
  async dashboard() {
    const { data } = await api.get<ApiResponse<AdminDashboard>>('/admin/dashboard');
    return data.data;
  },

  async analytics(months = 12) {
    const { data } = await api.get<ApiResponse<Omit<AdminDashboard, 'kpis' | 'dailyTraffic'>>>('/admin/analytics', {
      params: { months },
    });
    return data.data;
  },

  async users(params: { search?: string; role?: string; status?: string; blocked?: boolean; page?: number } = {}) {
    const { data } = await api.get<ApiResponse<User[]>>('/admin/users', { params });
    return data as ApiResponse<User[]> & { meta?: PageMeta };
  },

  async updateUserStatus(id: string, action: 'block' | 'unblock' | 'suspend' | 'activate', reason?: string) {
    const { data } = await api.patch<ApiResponse<User>>(`/admin/users/${id}/status`, { action, reason });
    return data.data;
  },

  async deleteUser(id: string) {
    await api.delete(`/admin/users/${id}`);
  },

  async moderationQueue() {
    const { data } = await api.get<ApiResponse<Orchard[]>>('/admin/orchards/queue');
    return data.data;
  },

  async orchards(params: { status?: string; search?: string; page?: number } = {}) {
    const { data } = await api.get<ApiResponse<Orchard[]>>('/admin/orchards', { params });
    return data as ApiResponse<Orchard[]> & { meta?: PageMeta };
  },

  async moderate(id: string, action: 'approve' | 'reject' | 'feature' | 'unfeature' | 'archive' | 'delete', reason?: string) {
    const { data } = await api.patch<ApiResponse<Orchard>>(`/admin/orchards/${id}/moderate`, { action, reason });
    return data.data;
  },

  async reportedReviews() {
    const { data } = await api.get<ApiResponse<unknown[]>>('/admin/reviews/reported');
    return data.data;
  },

  async auditLogs(page = 1) {
    const { data } = await api.get<ApiResponse<AuditLog[]>>('/admin/audit-logs', { params: { page } });
    return data.data;
  },

  async getSettings() {
    const { data } = await api.get<ApiResponse<PlatformSettings>>('/admin/settings');
    return data.data;
  },

  async updateSettings(patch: Partial<PlatformSettings>) {
    const { data } = await api.patch<ApiResponse<PlatformSettings>>('/admin/settings', patch);
    return data.data;
  },
};
