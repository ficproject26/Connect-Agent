import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-forge transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-950 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] shadow-[0_14px_30px_-16px_rgba(15,23,42,0.35)] hover:shadow-[0_18px_35px_-16px_rgba(15,23,42,0.28)] hover:-translate-y-0.5';

  const variants = {
    primary: 'bg-gradient-to-r from-primary to-amber-400 text-forgeGray-950 hover:from-primary-hover hover:to-amber-500 focus:ring-primary',
    secondary: 'bg-gradient-to-r from-secondary to-blue-600 text-white hover:from-secondary-hover hover:to-blue-700 focus:ring-secondary',
    outline: 'border border-forgeGray-300/80 dark:border-forgeGray-600/80 bg-white/80 dark:bg-forgeGray-900/40 text-forgeGray-700 dark:text-forgeGray-200 hover:bg-forgeGray-50 dark:hover:bg-forgeGray-800 focus:ring-forgeGray-500 shadow-[0_8px_22px_-16px_rgba(15,23,42,0.24)]',
    ghost: 'bg-transparent text-forgeGray-600 dark:text-forgeGray-300 hover:bg-forgeGray-100 dark:hover:bg-forgeGray-800/60 focus:ring-forgeGray-500 shadow-none hover:shadow-none hover:-translate-y-0',
    danger: 'bg-gradient-to-r from-red-500 to-rose-600 text-white hover:from-red-600 hover:to-rose-700 focus:ring-red-500',
    success: 'bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700 focus:ring-emerald-500',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-7 py-3.5 text-base',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      <span className="inline-flex items-center justify-center gap-2 whitespace-nowrap">
        {isLoading && (
          <svg className="animate-spin h-4 w-4 text-current shrink-0" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )}
        {!isLoading && leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>}
        <span className="inline-block">{children}</span>
        {!isLoading && rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
      </span>
    </button>
  );
};
