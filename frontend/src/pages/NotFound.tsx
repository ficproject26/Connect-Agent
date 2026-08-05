import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchX, ArrowLeft, Home } from 'lucide-react';
import { Button } from '../components/ui/Button';

export const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background relative overflow-hidden">
      {/* Background blurs */}
      <div className="absolute top-[-15%] left-[-10%] w-[45%] h-[45%] bg-primary/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[50%] h-[50%] bg-secondary/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center text-center space-y-8 max-w-lg">
        {/* Icon */}
        <div className="p-5 bg-primary/10 rounded-3xl shadow-md">
          <SearchX className="w-16 h-16 text-primary" strokeWidth={1.5} />
        </div>

        {/* Error code */}
        <h1 className="text-8xl font-black font-sans text-forgeGray-900 tracking-tighter leading-none">
          4<span className="text-primary">0</span>4
        </h1>

        {/* Message */}
        <div className="space-y-2">
          <h2 className="text-xl font-extrabold text-forgeGray-900 font-sans">
            Page Not Found
          </h2>
          <p className="text-sm font-semibold text-forgeGray-450 leading-relaxed max-w-sm">
            The page you're looking for doesn't exist or has been moved.
            Let's get you back on track.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <Button
            variant="primary"
            onClick={() => navigate('/')}
            className="px-6 py-2.5 font-bold shadow-md"
          >
            <Home className="w-4 h-4 mr-2" />
            Go Home
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="px-6 py-2.5 font-bold border-forgeGray-300"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>

        {/* Footer hint */}
        <p className="text-[10px] font-bold text-forgeGray-400 uppercase tracking-widest pt-4">
          Connect App — Workforce & Delivery Management
        </p>
      </div>
    </div>
  );
};

export default NotFound;
