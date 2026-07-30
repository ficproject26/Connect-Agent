import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Truck, Wrench, Shield, ArrowRight } from 'lucide-react';
import { useAuth, UserRole } from '../../context/AuthContext';

export const Welcome: React.FC = () => {
  const navigate = useNavigate();
  const { role: currentRole } = useAuth();
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  // If already logged in, redirect straight to their dashboard
  React.useEffect(() => {
    if (currentRole) {
      navigate(`/${currentRole === 'executive' ? 'executive' : currentRole === 'technician' ? 'technician' : 'delivery'}/dashboard`);
    }
  }, [currentRole, navigate]);

  const handleNext = () => {
    if (selectedRole) {
      navigate('/login', { state: { role: selectedRole } });
    }
  };

  const handleRegister = () => {
    if (selectedRole && selectedRole !== 'executive') {
      navigate('/register', { state: { role: selectedRole } });
    }
  };

  return (
    <div className="min-h-screen bg-[#fbf9f8] flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Decorative Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#864f19]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[55%] h-[55%] bg-[#34647b]/08 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-2xl text-center z-10 space-y-8">
        {/* Brand Banner */}
        <div className="flex flex-col items-center">
          <img src="/logo.jpg" alt="Connect App Logo" className="h-16 w-16 rounded-2xl shadow-md border border-[#d7c3b5]/50 mb-4 object-cover" />
          <h1 className="text-4xl md:text-5xl font-black font-sans tracking-wide text-[#1b1c1c] leading-tight">
            CONNECT <span className="text-[#864f19]">APP</span>
          </h1>
          <p className="text-[#52443a] font-semibold tracking-wide text-sm md:text-base mt-2 max-w-md">
            Production-Ready Unified Workforce & Delivery Management SaaS Platform.
          </p>
        </div>

        {/* Profile/Role Select Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">

          {/* Card 1: Delivery Partner */}
          <Card
            hoverEffect
            onClick={() => setSelectedRole('delivery_partner')}
            className={`cursor-pointer transition-all duration-300 rounded-2xl shadow-sm ${
              selectedRole === 'delivery_partner'
                ? 'bg-[#ffdcc2] border-2 border-[#864f19] text-[#1b1c1c]'
                : 'bg-white border border-[#eae8e7] text-[#1b1c1c] hover:border-[#d7c3b5] hover:shadow-md'
            }`}
          >
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="p-3 bg-[#ffdcc2] text-[#864f19] rounded-2xl">
                <Truck className="w-8 h-8" />
              </div>
              <h3 className="font-extrabold text-lg text-[#1b1c1c]">Delivery Partner</h3>
              <p className="text-xs text-[#52443a] leading-relaxed">
                Join our logistics fleet delivering food, products, and packages across India.
              </p>
            </div>
          </Card>

          {/* Card 2: Technician */}
          <Card
            hoverEffect
            onClick={() => setSelectedRole('technician')}
            className={`cursor-pointer transition-all duration-300 rounded-2xl shadow-sm ${
              selectedRole === 'technician'
                ? 'bg-[#c1e8ff] border-2 border-[#34647b] text-[#1b1c1c]'
                : 'bg-white border border-[#eae8e7] text-[#1b1c1c] hover:border-[#d7c3b5] hover:shadow-md'
            }`}
          >
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="p-3 bg-[#c1e8ff] text-[#34647b] rounded-2xl">
                <Wrench className="w-8 h-8" />
              </div>
              <h3 className="font-extrabold text-lg text-[#1b1c1c]">Technician</h3>
              <p className="text-xs text-[#52443a] leading-relaxed">
                Offer household repair, AC tuning, plumbing, and tech support duties.
              </p>
            </div>
          </Card>

          {/* Card 3: Executive */}
          <Card
            hoverEffect
            onClick={() => setSelectedRole('executive')}
            className={`cursor-pointer transition-all duration-300 rounded-2xl shadow-sm ${
              selectedRole === 'executive'
                ? 'bg-[#efe1ca] border-2 border-[#655b49] text-[#1b1c1c]'
                : 'bg-white border border-[#eae8e7] text-[#1b1c1c] hover:border-[#d7c3b5] hover:shadow-md'
            }`}
          >
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="p-3 bg-[#efe1ca] text-[#655b49] rounded-2xl">
                <Shield className="w-8 h-8" />
              </div>
              <h3 className="font-extrabold text-lg text-[#1b1c1c]">Executive</h3>
              <p className="text-xs text-[#52443a] leading-relaxed">
                Manage hotel operations, room bookings, fleet scheduling, and verifications.
              </p>
            </div>
          </Card>

        </div>

        {/* Next/Action triggers */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          {selectedRole ? (
            <>
              <Button
                variant="outline"
                onClick={handleNext}
                rightIcon={<ArrowRight className="w-4 h-4" />}
                className="w-full sm:w-auto py-3.5 border-[#d7c3b5] text-[#52443a] hover:bg-[#ffdcc2] hover:text-[#864f19] hover:border-[#864f19]"
              >
                Sign In as {selectedRole.replace('_', ' ')}
              </Button>
              {selectedRole !== 'executive' && (
                <Button
                  variant="primary"
                  onClick={handleRegister}
                  className="w-full sm:w-auto py-3.5 shadow-md bg-[#864f19] hover:bg-[#a3672f] text-white"
                >
                  Register New Account
                </Button>
              )}
            </>
          ) : (
            <p className="text-xs font-semibold text-[#847468] uppercase tracking-widest animate-pulse">
              Please choose a role to proceed
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Welcome;
