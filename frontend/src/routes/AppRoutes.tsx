import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { DashboardLayout } from '../components/layout/DashboardLayout';

// Loading Fallback Component
const PageLoader = () => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
    <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#864f19] border-t-transparent shadow-lg" />
    <p className="text-sm font-semibold text-slate-500 font-sans tracking-wide">
      Loading Connect Portal...
    </p>
  </div>
);

// Helper for retryable lazy imports (auto-reloads page if deployment updated chunk hashes)
const lazyWithRetry = (componentImport: () => Promise<any>) =>
  lazy(async () => {
    const pageHasBeenRefreshed = JSON.parse(
      window.sessionStorage.getItem('retry-lazy-refreshed') || 'false'
    );
    try {
      const component = await componentImport();
      window.sessionStorage.setItem('retry-lazy-refreshed', 'false');
      return component;
    } catch (error) {
      if (!pageHasBeenRefreshed) {
        window.sessionStorage.setItem('retry-lazy-refreshed', 'true');
        window.location.reload();
        return new Promise(() => {});
      }
      throw error;
    }
  });

// Lazy Loaded Pages
const Welcome = lazyWithRetry(() => import('../pages/Auth/Welcome'));
const Login = lazyWithRetry(() => import('../pages/Auth/Login'));
const ForgotPassword = lazyWithRetry(() => import('../pages/Auth/ForgotPassword'));
const OTPVerification = lazyWithRetry(() => import('../pages/Auth/OTPVerification'));
const RegisterWizard = lazyWithRetry(() => import('../pages/Auth/RegisterWizard'));
const PendingApproval = lazyWithRetry(() => import('../pages/Auth/PendingApproval'));
const NotFound = lazyWithRetry(() => import('../pages/NotFound'));

// Agent Dashboard Overview Routing Dynamic Gateway
const DashboardOverview = lazyWithRetry(() => import('../pages/Dashboard/DashboardOverview'));

// Custom page components
const VendorsList = lazyWithRetry(() => import('../pages/Vendors/VendorsList'));
const TargetsList = lazyWithRetry(() => import('../pages/Tasks/TargetsList'));
const TicketsList = lazyWithRetry(() => import('../pages/Tickets/TicketsList'));
const KycVerification = lazyWithRetry(() => import('../pages/Kyc/KycVerification'));
const WalletDashboard = lazyWithRetry(() => import('../pages/Wallet/WalletDashboard'));

// Placeholder modules for other agent views
const UnderConstruction = lazyWithRetry(() => import('../pages/UnderConstruction'));
const ProfileModule = lazyWithRetry(() => import('../pages/Profile/ProfileModule'));
const SettingsModule = lazyWithRetry(() => import('../pages/Settings/SettingsModule'));
const ReportsModule = lazyWithRetry(() => import('../pages/Reports/ReportsModule'));
const NotificationCenter = lazyWithRetry(() => import('../pages/Notifications/NotificationCenter'));
const AttendanceLogs = lazyWithRetry(() => import('../pages/Attendance/AttendanceLogs'));
const FieldVisitsModule = lazyWithRetry(() => import('../pages/FieldVisits/FieldVisitsModule'));
const AgentManagement = lazyWithRetry(() => import('../pages/Agents/AgentManagement'));
const LeaderboardModule = lazyWithRetry(() => import('../pages/Leaderboard/LeaderboardModule'));

export const AppRoutes: React.FC = () => {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* PUBLIC ROUTING GATEWAYS */}
        <Route path="/" element={<Login />} />
        <Route path="/welcome" element={<Welcome />} />
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/otp-verification" element={<OTPVerification />} />
        <Route path="/register" element={<RegisterWizard />} />

        {/* REGISTRATION PENDING REDIRECT */}
        <Route element={<ProtectedRoute />}>
          <Route path="/pending" element={<PendingApproval />} />
        </Route>

        {/* PROTECTED AGENT ROUTES */}
        <Route element={<ProtectedRoute />}>
          <Route
            path="/*"
            element={
              <DashboardLayout>
                <Routes>
                  {/* Dynamic role dashboard rendering */}
                  <Route path="dashboard" element={<DashboardOverview />} />
                  
                  {/* Common Agent pages */}
                  <Route path="agents" element={<AgentManagement />} />
                  <Route path="leaderboard" element={<LeaderboardModule />} />
                  <Route path="kyc" element={<KycVerification />} />
                  <Route path="vendors" element={<VendorsList />} />
                  <Route path="targets" element={<TargetsList />} />
                  <Route path="tickets" element={<TicketsList />} />
                  <Route path="wallet" element={<WalletDashboard />} />
                  <Route path="reports" element={<ReportsModule />} />
                  
                  {/* Shared Profile & Settings */}
                  <Route path="shared/profile" element={<ProfileModule />} />
                  <Route path="shared/settings" element={<SettingsModule />} />
                  <Route path="shared/notifications" element={<NotificationCenter />} />
                  <Route path="field-visits" element={<FieldVisitsModule />} />

                  {/* Fallback to dashboard */}
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </DashboardLayout>
            }
          />
        </Route>

        {/* CATCH ALL — 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
