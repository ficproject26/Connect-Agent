import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth, isAgentApproved } from '../context/AuthContext';

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

  const userKycStatus = (user.kycStatus || '').toLowerCase().trim();
  const userStatus = String(user.status || '').toLowerCase().trim();

  const isRejectedOrSuspended = userKycStatus === 'rejected' || userStatus === 'rejected' || 
                                userStatus === 'suspended' || userStatus === 'inactive' || 
                                userStatus === 'revoked' || userStatus === 'deleted' || userKycStatus === 'revoked';

  const isApproved = !isRejectedOrSuspended && isAgentApproved(user);
  const isPending = !isApproved && !isRejectedOrSuspended;

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
