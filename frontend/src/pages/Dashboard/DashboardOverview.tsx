import React, { lazy, Suspense } from 'react';
import { useAuth } from '../../context/AuthContext';

const StateDashboard = lazy(() => import('./StateAgent/StateDashboard'));
const DivisionDashboard = lazy(() => import('./DivisionAgent/DivisionDashboard'));
const DistrictDashboard = lazy(() => import('./DistrictAgent/DistrictDashboard'));
const PincodeDashboard = lazy(() => import('./PincodeAgent/PincodeDashboard'));

export const DashboardOverview: React.FC = () => {
  const { user } = useAuth();

  const rawRole = (user?.role as string) || (user as any)?.level || 'pincode';
  const effectiveRole = (rawRole === 'agent' ? ((user as any)?.level || 'pincode') : rawRole).toLowerCase();

  const renderDashboard = () => {
    switch (effectiveRole) {
      case 'state':
        return <StateDashboard />;
      case 'division':
        return <DivisionDashboard />;
      case 'district':
        return <DistrictDashboard />;
      case 'pincode':
      default:
        return <PincodeDashboard />;
    }
  };

  return (
    <div className="w-full">
      <Suspense
        fallback={
          <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-3">
            <div className="animate-spin rounded-full h-8 w-8 border-3 border-[#864f19] border-t-transparent" />
            <span className="text-xs font-semibold text-slate-400 font-sans tracking-wide">
              Loading dashboard overview...
            </span>
          </div>
        }
      >
        {renderDashboard()}
      </Suspense>
    </div>
  );
};

export default DashboardOverview;
