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

          <h2 className="text-2xl font-black font-sans tracking-wide text-white">
            Application Pending Approval
          </h2>
          <p className="text-xs font-semibold text-forgeGray-300 mt-2 max-w-md mx-auto leading-relaxed">
            Thank you, <span className="font-bold text-white">{user?.name}</span>! Your registration details have been submitted. Our executive operations team is currently reviewing your credentials.
          </p>

          {/* Checklist of verification states */}
          <div className="my-6 max-w-sm mx-auto space-y-3 text-left">
            <div className="flex items-center space-x-3 p-3 bg-white/5 rounded-xl border border-white/10">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <p className="text-xs font-bold text-white">Form Details Completed</p>
                <p className="text-[9px] text-forgeGray-300">All application fields validated successfully</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-3 bg-white/5 rounded-xl border border-white/10">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <p className="text-xs font-bold text-white">Verification Selfie Uploaded</p>
                <p className="text-[9px] text-forgeGray-300">Facial matching verification processed</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3 bg-white/5 rounded-xl border border-white/10">
              <Clock className="w-5 h-5 text-amber-450 shrink-0 animate-spin" />
              <div>
                <p className="text-xs font-bold text-white">Background Check Verification</p>
                <p className="text-[9px] text-forgeGray-300">Identity document lookup in progress (DL/Certificates)</p>
              </div>
            </div>
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
