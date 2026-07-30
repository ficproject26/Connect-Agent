import React from 'react';
import { useAuth } from '../../context/AuthContext';

import StateDashboard from './StateAgent/StateDashboard';
import DivisionDashboard from './DivisionAgent/DivisionDashboard';
import DistrictDashboard from './DistrictAgent/DistrictDashboard';
import PincodeDashboard from './PincodeAgent/PincodeDashboard';

export const DashboardOverview: React.FC = () => {
  const { user } = useAuth();

  const renderDashboard = () => {
    switch (user?.role) {
      case 'state':
        return <StateDashboard />;
      case 'division':
        return <DivisionDashboard />;
      case 'district':
        return <DistrictDashboard />;
      case 'pincode':
        return <PincodeDashboard />;
      default:
        return <PincodeDashboard />;
    }
  };

  return (
    <div className="w-full">
      {renderDashboard()}
    </div>
  );
};

export default DashboardOverview;
