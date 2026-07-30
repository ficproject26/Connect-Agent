import React from 'react';
import { AlertCircle } from 'lucide-react';

interface UnderConstructionProps {
  featureName: string;
}

export const UnderConstruction: React.FC<UnderConstructionProps> = ({ featureName }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4 text-slate-100">
      <div className="h-16 w-16 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20 shadow-lg animate-pulse">
        <AlertCircle className="w-8 h-8" />
      </div>
      <h2 className="text-xl font-bold tracking-tight">{featureName}</h2>
      <p className="text-sm text-slate-500 max-w-sm leading-relaxed">
        This section is part of the upcoming development sprints. Rest assured, the core foundation and authentication layers are fully functional!
      </p>
    </div>
  );
};

export default UnderConstruction;
