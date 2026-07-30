import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Terminal, Shield, Map, Compass, MapPin } from 'lucide-react';

export const DevRoleSwitcher: React.FC = () => {
  // Only render in development mode
  if (!import.meta.env.DEV) return null;

  const { login, user, logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const handleRoleSwitch = async (email: string) => {
    try {
      const success = await login(email, 'password123');
      if (success) {
        navigate('/dashboard');
        setIsOpen(false);
      }
    } catch (err) {
      console.error('Failed to switch role in dev mode:', err);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    setIsOpen(false);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white font-mono text-xs px-3.5 py-2.5 rounded-xl border border-slate-700 shadow-xl transition-all duration-200"
        title="Developer Role Switcher"
        aria-label="Toggle role switcher menu"
      >
        <Terminal className="w-4 h-4 text-blue-400 animate-pulse" />
        <span className="font-extrabold uppercase tracking-wider">Dev Switch</span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute bottom-14 right-0 w-64 bg-slate-950/95 border border-slate-800 backdrop-blur-md rounded-2xl p-4 shadow-2xl space-y-3 animate-fade-in text-white font-sans">
          <div className="border-b border-slate-850 pb-2 mb-2">
            <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Current Session</p>
            {user ? (
              <div className="mt-1">
                <p className="text-xs font-bold text-white truncate">{user.name}</p>
                <p className="text-[9px] text-blue-400 font-bold uppercase tracking-wider mt-0.5">
                  {user.role} Agent
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic mt-1">Not logged in</p>
            )}
          </div>

          <p className="text-[10px] text-amber-400 uppercase font-black tracking-widest">Tamil Nadu Sandbox Accounts</p>
          
          <div className="space-y-1">
            <button
              onClick={() => handleRoleSwitch('tn_state@forge.in')}
              className={`w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-xl text-left text-xs font-semibold transition-all ${
                user?.role === 'state' && user?.territory?.state === 'Tamil Nadu'
                  ? 'bg-amber-600 text-white font-bold' 
                  : 'hover:bg-white/5 text-slate-300'
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <span>TN State Lead (Siddharth)</span>
            </button>

            <button
              onClick={() => handleRoleSwitch('tn_district@forge.in')}
              className={`w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-xl text-left text-xs font-semibold transition-all ${
                user?.role === 'district' && user?.territory?.state === 'Tamil Nadu'
                  ? 'bg-amber-600 text-white font-bold' 
                  : 'hover:bg-white/5 text-slate-300'
              }`}
            >
              <Map className="w-3.5 h-3.5 text-amber-400" />
              <span>TN District Lead (Karthik)</span>
            </button>
          </div>

          <p className="text-[10px] text-blue-400 uppercase font-black tracking-widest pt-1">Karnataka Sandbox Accounts</p>
          
          <div className="space-y-1">
            <button
              onClick={() => handleRoleSwitch('state@forge.in')}
              className={`w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-xl text-left text-xs font-semibold transition-all ${
                user?.role === 'state' && user?.territory?.state === 'Karnataka'
                  ? 'bg-blue-600 text-white font-bold' 
                  : 'hover:bg-white/5 text-slate-300'
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-blue-400" />
              <span>KA State Lead (Rajesh)</span>
            </button>

            <button
              onClick={() => handleRoleSwitch('district@forge.in')}
              className={`w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-xl text-left text-xs font-semibold transition-all ${
                user?.role === 'district' && user?.territory?.state === 'Karnataka'
                  ? 'bg-blue-600 text-white font-bold' 
                  : 'hover:bg-white/5 text-slate-300'
              }`}
            >
              <Map className="w-3.5 h-3.5 text-blue-400" />
              <span>KA District Lead (Amit)</span>
            </button>

            <button
              onClick={() => handleRoleSwitch('pincode@forge.in')}
              className={`w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-xl text-left text-xs font-semibold transition-all ${
                user?.role === 'pincode' && user?.territory?.state === 'Karnataka'
                  ? 'bg-blue-600 text-white font-bold' 
                  : 'hover:bg-white/5 text-slate-300'
              }`}
            >
              <MapPin className="w-3.5 h-3.5 text-blue-400" />
              <span>KA Pincode Agent (Anil)</span>
            </button>
          </div>

          {user && (
            <div className="border-t border-slate-850 pt-2 mt-2">
              <button
                onClick={handleLogout}
                className="w-full text-center py-2 text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all"
              >
                Reset Session (Logout)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
