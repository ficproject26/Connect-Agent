import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Clock, CheckCircle2, LogOut } from 'lucide-react';

export const PendingApproval: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen auth-bg flex flex-col justify-center items-center p-4 relative overflow-hidden">
      
      {/* visual elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-amber-500/10 rounded-full blur-[100px]" />
      
      <div className="w-full max-w-xl z-10 space-y-6 text-center">
        <Card className="glass-card-auth text-white relative">
          
          <div className="inline-flex p-4 bg-amber-500/10 text-amber-400 rounded-full mb-4 animate-pulse">
            <Clock className="w-12 h-12" />
          </div>

          <h2 className="text-2xl font-black font-sans tracking-wide text-white uppercase">
            YOUR REQUEST IS UNDER REVIEW
          </h2>
          <div className="text-xs font-semibold text-forgeGray-300 mt-3 max-w-md mx-auto space-y-2 leading-relaxed">
            <p>Your agent registration request has been successfully submitted.</p>
            <p>Your request is currently under review by the administration.</p>
            <p>Please contact the administration for further assistance.</p>
          </div>

          <div className="mt-4 inline-block bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-black px-4 py-1.5 rounded-full uppercase tracking-wider">
            Status: PENDING REVIEW
          </div>

          {/* Action triggers */}
          <div className="flex justify-center space-x-4">
            <Button variant="outline" size="md" onClick={handleLogout} className="border-forgeGray-500 text-white hover:bg-white/10">
              <LogOut className="w-4 h-4 mr-2" /> Logout
            </Button>
          </div>

        </Card>
      </div>
    </div>
  );
};

export default PendingApproval;
