import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass' | 'accent' | 'outlined';
  hoverEffect?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  hoverEffect = false,
  padding = 'md',
  className = '',
  ...props
}) => {
  const bgStyles = {
    default: 'surface-card rounded-[24px] border border-white/70 dark:border-forgeGray-800/70',
    glass: 'glass-panel rounded-[24px] border border-white/70 dark:border-white/10',
    accent: 'glass-panel-accent rounded-[24px] border border-primary/25 dark:border-primary/20',
    outlined: 'border border-forgeGray-200/80 dark:border-forgeGray-700/70 bg-white/80 dark:bg-forgeGray-900/30 rounded-[24px]',
  };

  const paddings = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  const hoverStyle = hoverEffect
    ? 'hover:shadow-[0_24px_55px_-24px_rgba(15,23,42,0.28)] hover:-translate-y-1 transition-all duration-300 cursor-pointer'
    : 'transition-all duration-300';

  return (
    <div
      className={`shadow-[0_20px_45px_-24px_rgba(15,23,42,0.18)] ${bgStyles[variant]} ${paddings[padding]} ${hoverStyle} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, className = '', ...props }) => (
  <div className={`flex items-center justify-between border-b border-forgeGray-100 dark:border-forgeGray-800/80 pb-4 mb-4 ${className}`} {...props}>
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({ children, className = '', ...props }) => (
  <h3 className={`text-base font-bold font-sans text-forgeGray-900 dark:text-white ${className}`} {...props}>
    {children}
  </h3>
);

export const CardBody: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, className = '', ...props }) => (
  <div className={`${className}`} {...props}>
    {children}
  </div>
);

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, className = '', ...props }) => (
  <div className={`border-t border-forgeGray-100 dark:border-forgeGray-800/80 pt-4 mt-4 flex items-center justify-end space-x-2 ${className}`} {...props}>
    {children}
  </div>
);
