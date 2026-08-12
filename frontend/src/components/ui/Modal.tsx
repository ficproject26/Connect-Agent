import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  size = 'md',
  children,
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'w-full h-full m-0 rounded-none max-w-none',
  };

  const isFullPage = size === 'full';

  if (typeof document === 'undefined') return null;

  return ReactDOM.createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className={`fixed inset-0 z-[99999] flex items-center justify-center ${isFullPage ? 'p-0' : 'p-4 sm:p-6 overflow-y-auto'}`}>
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[99998]"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className={`relative w-full bg-white shadow-2xl overflow-hidden z-[99999] flex flex-col border border-[#eae8e7] ${isFullPage ? 'h-full max-h-full rounded-none' : 'rounded-3xl my-auto max-h-[90vh]'} ${sizeClasses[size]}`}
          >
            {/* Header */}
            {title && (
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#eae8e7] bg-[#fbf9f8] shrink-0">
                <h3 className="text-base font-black text-[#1b1c1c] font-sans flex items-center gap-2">
                  {title}
                </h3>
                <button
                  onClick={onClose}
                  aria-label="Close dialog"
                  title="Close"
                  className="text-slate-400 hover:text-slate-600 transition-colors duration-200 p-1 rounded-lg hover:bg-slate-100 cursor-pointer border-none bg-transparent text-lg font-bold"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* Content Body */}
            <div className="p-6 sm:p-7 overflow-y-auto flex-1 space-y-4 max-h-[calc(90vh-70px)]">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

