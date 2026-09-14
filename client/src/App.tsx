import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/ProtectedRoute';

import ExplorePage from '@/pages/ExplorePage';
import OrchardDetailPage from '@/pages/OrchardDetailPage';
import ProfilePage from '@/pages/ProfilePage';
import NotFoundPage from '@/pages/NotFoundPage';

import WishlistPage from '@/pages/renter/WishlistPage';
import ComparePage from '@/pages/renter/ComparePage';
import BookingsPage from '@/pages/renter/BookingsPage';
import LeaseHistoryPage from '@/pages/renter/LeaseHistoryPage';
import FollowingPage from '@/pages/renter/FollowingPage';
import SellerProfilePage from '@/pages/SellerProfilePage';

import AuthPage from '@/pages/auth/AuthPage';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage';

import SellerOverview from '@/pages/seller/SellerOverview';
import SellerOrchards from '@/pages/seller/SellerOrchards';
import OrchardForm from '@/pages/seller/OrchardForm';
import HarvestSchedulePage from '@/pages/seller/HarvestSchedulePage';
import SellerBookings from '@/pages/seller/SellerBookings';
import SellerLeaseHistory from '@/pages/seller/SellerLeaseHistory';
import SellerQuestions from '@/pages/seller/SellerQuestions';

import AdminOverview from '@/pages/admin/AdminOverview';
import AdminUsers from '@/pages/admin/AdminUsers';
import AdminModeration from '@/pages/admin/AdminModeration';
import AdminAnalytics from '@/pages/admin/AdminAnalytics';
import AdminSystem from '@/pages/admin/AdminSystem';
import AddImageForm from '@/components/AddImageForm';

export default function App() {
  return (
    <Routes>
      {/* Auth (no chrome) */}
      <Route path="/login" element={<AuthPage key="signin" initialMode="signin" />} />
      <Route path="/register" element={<AuthPage key="signup" initialMode="signup" />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* App shell (role-aware header) */}
      <Route element={<Layout />}>
        {/* Marketplace */}
        <Route index element={<ExplorePage />} />
        <Route path="explore" element={<ExplorePage />} />
        <Route path="orchards/:slug" element={<OrchardDetailPage />} />
        <Route path="sellers/:sellerId" element={<SellerProfilePage />} />

        {/* Renter Specific Dashboard Routes */}
        <Route
          path="wishlist"
          element={
            <ProtectedRoute roles={['renter']}>
              <WishlistPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="compare"
          element={
            <ProtectedRoute roles={['renter']}>
              <ComparePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="bookings"
          element={
            <ProtectedRoute roles={['renter']}>
              <BookingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="lease-history"
          element={
            <ProtectedRoute roles={['renter']}>
              <LeaseHistoryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="following"
          element={
            <ProtectedRoute roles={['renter']}>
              <FollowingPage />
            </ProtectedRoute>
          }
        />
        
        {/* Renter Specific Profile Navigation Target */}
        <Route
          path="renter/profile"
          element={
            <ProtectedRoute roles={['renter']}>
              <ProfilePage />
            </ProtectedRoute>
          }
        />

        {/* Seller */}
        <Route
          path="seller"
          element={
            <ProtectedRoute roles={['seller']}>
              <Outlet />
            </ProtectedRoute>
          }
        >
          <Route index element={<SellerOverview />} />
          <Route path="orchards" element={<SellerOrchards />} />
          <Route path="orchards/new" element={<OrchardForm />} />
          <Route path="orchards/:id/edit" element={<OrchardForm />} />
          <Route path="orchards/:id/harvest" element={<HarvestSchedulePage />} />
          <Route path="add-image" element={<AddImageForm />} />
          <Route path="bookings" element={<SellerBookings />} />
          <Route path="lease-history" element={<SellerLeaseHistory />} />
          <Route path="questions" element={<SellerQuestions />} />

          {/* Seller Specific Profile Route (Resolves to /seller/profile) */}
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        {/* Admin */}
        <Route
          path="admin"
          element={
            <ProtectedRoute roles={['admin']}>
              <Outlet />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/admin/overview" replace />} />
          <Route path="overview" element={<AdminOverview />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="moderation" element={<AdminModeration />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="system" element={<AdminSystem />} />
        </Route>
      </Route>

      <Route path="/404" element={<NotFoundPage />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}
