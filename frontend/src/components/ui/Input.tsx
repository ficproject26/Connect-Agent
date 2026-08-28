import React, { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, leftIcon, rightIcon, className = '', id, placeholder = ' ', type, onChange, value, ...props }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
    const isEmail = type === 'email' || (label && label.toLowerCase().includes('email'));

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (isEmail && e.target.value) {
        e.target.value = e.target.value.toLowerCase().trim();
      }
      if (onChange) {
        onChange(e);
      }
    };

    return (
      <div className="relative w-full animate-fade-in text-left">
        {label && (
          <label
            htmlFor={inputId}
            className={`block text-xs font-bold text-slate-600 uppercase mb-1.5 pl-1 ${
              error ? 'text-red-500' : ''
            }`}
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 text-slate-400 pointer-events-none">
              {leftIcon}
            </div>
          )}

          <input
            id={inputId}
            ref={ref}
            type={type}
            value={value}
            onChange={handleChange}
            placeholder={placeholder === ' ' ? '' : placeholder}
            className={`block w-full px-4 py-2.5 text-sm rounded-2xl bg-white/80 border border-slate-200/90 text-slate-900 shadow-[0_12px_30px_-18px_rgba(15,23,42,0.28)] placeholder:text-slate-400 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 ${
              isEmail ? 'lowercase' : ''
            } ${
              leftIcon ? 'pl-10' : ''
            } ${rightIcon ? 'pr-10' : ''} ${
              error ? 'border-red-400 focus:ring-red-400 focus:border-transparent' : ''
            } ${className}`}
            {...props}
          />

          {rightIcon && (
            <div className="absolute right-3 text-forgeGray-400">
              {rightIcon}
            </div>
          )}
        </div>

        {error && (
          <p className="mt-1 text-xs text-red-500 font-medium pl-1">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
