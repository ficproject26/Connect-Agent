import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle2, AlertCircle, Info, ShieldAlert } from 'lucide-react';

export type ToastType = 'success' | 'info' | 'warning' | 'error';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto dismiss after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />;
      case 'warning':
        return <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-sky-600 shrink-0" />;
    }
  };

  const getBgColor = (type: ToastType) => {
    switch (type) {
      case 'success':
        return 'bg-emerald-50 border-emerald-100';
      case 'warning':
        return 'bg-amber-50 border-amber-100';
      case 'error':
        return 'bg-red-50 border-red-100';
      case 'info':
      default:
        return 'bg-sky-50 border-sky-100';
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast Portal Container Floating Top-Right */}
      <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 w-full max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-start gap-3 p-4 rounded-2xl border shadow-lg transition-all duration-350 ease-in-out pointer-events-auto transform translate-y-0 animate-fade-in ${getBgColor(
              toast.type
            )}`}
            role="alert"
          >
            {getIcon(toast.type)}
            <div className="flex-1 text-xs font-semibold text-slate-800 leading-normal">
              {toast.message}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-slate-600 transition border-none bg-transparent cursor-pointer p-0.5"
              aria-label="Dismiss toast"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
