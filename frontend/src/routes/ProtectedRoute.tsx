import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  allowedRoles?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { user, token, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0d0f14] text-white">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#3b82f6] border-t-transparent"></div>
      </div>
    );
  }

  // If not logged in, redirect to login
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  const userKycStatus = (user.kycStatus || '').toLowerCase();
  const userStatus = String(user.status || '').toLowerCase();

  const isPending = userKycStatus === 'pending' || userStatus === 'pending_approval' || userStatus === 'pending';
  const isRejectedOrSuspended = userKycStatus === 'rejected' || userStatus === 'rejected' || userStatus === 'suspended' || userStatus === 'inactive';
  const isApproved = (userKycStatus === 'approved' || userStatus === 'approved' || userStatus === 'active') && !isPending && !isRejectedOrSuspended;

  // Handle pending verification redirects (except for the pending page itself)
  if (isPending && window.location.pathname !== '/pending') {
    return <Navigate to="/pending" replace />;
  }

  // Handle rejected/suspended accounts going to dashboard
  if (isRejectedOrSuspended) {
    return <Navigate to="/login" replace />;
  }

  // Handle active/approved accounts going to pending page
  if (isApproved && window.location.pathname === '/pending') {
    return <Navigate to="/dashboard" replace />;
  }

  // If role is not allowed, redirect to login or dashboard
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};
