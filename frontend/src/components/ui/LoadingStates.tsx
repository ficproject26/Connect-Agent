import React from 'react';

// ─── Skeleton ─────────────────────────────────────────────────────────────────
interface SkeletonProps {
  width?: string;
  height?: string;
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = 'w-full',
  height = 'h-4',
  rounded = 'md',
  className = '',
}) => {
  const radii = {
    sm:   'rounded',
    md:   'rounded-lg',
    lg:   'rounded-xl',
    xl:   'rounded-2xl',
    full: 'rounded-full',
  };

  return (
    <div
      className={`animate-pulse bg-forgeGray-100 dark:bg-slate-800/70 ${radii[rounded]} ${width} ${height} ${className}`}
    />
  );
};

// ─── Card Skeleton ────────────────────────────────────────────────────────────
interface CardSkeletonProps {
  rows?: number;
  showAvatar?: boolean;
  className?: string;
}

export const CardSkeleton: React.FC<CardSkeletonProps> = ({
  rows = 3,
  showAvatar = false,
  className = '',
}) => (
  <div
    className={`surface-card rounded-[24px] p-6 border border-white/70 dark:border-forgeGray-800/70 shadow-[0_20px_45px_-24px_rgba(15,23,42,0.18)] space-y-4 ${className}`}
  >
    {showAvatar && (
      <div className="flex items-center gap-3 mb-4">
        <Skeleton width="w-10" height="h-10" rounded="full" />
        <div className="flex-1 space-y-2">
          <Skeleton width="w-32" height="h-3" />
          <Skeleton width="w-20" height="h-2.5" />
        </div>
      </div>
    )}
    <Skeleton width="w-3/4" height="h-4" />
    {Array.from({ length: rows }).map((_, i) => (
      <Skeleton
        key={i}
        width={i % 2 === 0 ? 'w-full' : 'w-5/6'}
        height="h-3"
      />
    ))}
    <div className="pt-2 flex gap-3">
      <Skeleton width="w-24" height="h-8" rounded="xl" />
      <Skeleton width="w-20" height="h-8" rounded="xl" />
    </div>
  </div>
);

// ─── Table Skeleton ───────────────────────────────────────────────────────────
interface TableSkeletonProps {
  rows?: number;
  cols?: number;
  className?: string;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({
  rows = 5,
  cols = 4,
  className = '',
}) => (
  <div
    className={`surface-card rounded-[24px] overflow-hidden border border-white/70 dark:border-forgeGray-800/70 ${className}`}
  >
    {/* Header */}
    <div className="flex gap-4 px-6 py-4 bg-forgeGray-50/60 dark:bg-slate-800/30 border-b border-forgeGray-100 dark:border-slate-800">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} width="flex-1" height="h-3" className="flex-1" />
      ))}
    </div>
    {/* Rows */}
    {Array.from({ length: rows }).map((_, rowIdx) => (
      <div
        key={rowIdx}
        className="flex gap-4 items-center px-6 py-4 border-b border-forgeGray-100/70 dark:border-slate-800/50 last:border-none"
      >
        {Array.from({ length: cols }).map((_, colIdx) => (
          <Skeleton
            key={colIdx}
            width="flex-1"
            height="h-3"
            className={`flex-1 ${colIdx === 0 ? 'w-8 flex-none' : ''}`}
          />
        ))}
      </div>
    ))}
  </div>
);

// ─── Stat Card Skeleton ───────────────────────────────────────────────────────
export const StatCardSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div
    className={`surface-card rounded-[24px] p-6 border border-white/70 dark:border-forgeGray-800/70 shadow-[0_20px_45px_-24px_rgba(15,23,42,0.18)] ${className}`}
  >
    <div className="flex items-center justify-between mb-4">
      <Skeleton width="w-10" height="h-10" rounded="xl" />
      <Skeleton width="w-16" height="h-5" rounded="full" />
    </div>
    <Skeleton width="w-28" height="h-8" className="mb-2" />
    <Skeleton width="w-20" height="h-3" />
  </div>
);

// ─── Page Skeleton ────────────────────────────────────────────────────────────
export const PageSkeleton: React.FC = () => (
  <div className="space-y-6 animate-fade-in">
    {/* Page title area */}
    <div className="pb-6 border-b border-forgeGray-200/50 dark:border-slate-800 space-y-2">
      <Skeleton width="w-48" height="h-3" rounded="full" className="mb-3" />
      <Skeleton width="w-72" height="h-8" />
      <Skeleton width="w-96" height="h-3" />
    </div>
    {/* Stat cards row */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
    {/* Main content */}
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-8">
        <CardSkeleton rows={4} />
      </div>
      <div className="lg:col-span-4 space-y-4">
        <CardSkeleton rows={3} showAvatar />
        <CardSkeleton rows={2} />
      </div>
    </div>
  </div>
);

// ─── Spinner ───────────────────────────────────────────────────────────────────
interface SpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'primary' | 'secondary' | 'white' | 'muted';
  className?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  variant = 'primary',
  className = '',
}) => {
  const sizes = {
    xs: 'w-3 h-3 border-[1.5px]',
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-[3px]',
    xl: 'w-12 h-12 border-4',
  };

  const colors = {
    primary:   'border-primary/30 border-t-primary',
    secondary: 'border-secondary/30 border-t-secondary',
    white:     'border-white/30 border-t-white',
    muted:     'border-forgeGray-200 dark:border-forgeGray-700 border-t-forgeGray-500 dark:border-t-forgeGray-400',
  };

  return (
    <div
      className={`rounded-full animate-spin ${sizes[size]} ${colors[variant]} ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
};

// ─── Full-page Loading Overlay ────────────────────────────────────────────────
interface LoadingOverlayProps {
  message?: string;
  transparent?: boolean;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  message = 'Loading…',
  transparent = false,
}) => (
  <div
    className={`fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 ${
      transparent
        ? 'bg-white/60 dark:bg-slate-950/60 backdrop-blur-sm'
        : 'bg-background dark:bg-background-dark'
    }`}
  >
    <div className="relative flex items-center justify-center">
      {/* Outer ring */}
      <div className="w-14 h-14 rounded-full border-4 border-forgeGray-100 dark:border-slate-800 animate-spin border-t-primary" />
      {/* Logo center */}
      <span className="absolute h-7 w-7 rounded-xl bg-gradient-to-br from-primary to-amber-500 flex items-center justify-center font-extrabold text-forgeGray-950 text-xs shadow-lg">
        F
      </span>
    </div>
    <p className="text-xs font-bold text-forgeGray-500 dark:text-forgeGray-400 uppercase tracking-widest">
      {message}
    </p>
  </div>
);

// ─── Inline Loading Row ───────────────────────────────────────────────────────
interface InlineLoaderProps {
  message?: string;
  className?: string;
}

export const InlineLoader: React.FC<InlineLoaderProps> = ({
  message = 'Loading data…',
  className = '',
}) => (
  <div className={`flex items-center justify-center gap-3 py-12 ${className}`}>
    <Spinner size="sm" variant="secondary" />
    <span className="text-sm font-semibold text-forgeGray-500 dark:text-forgeGray-400">
      {message}
    </span>
  </div>
);

// ─── Empty State ──────────────────────────────────────────────────────────────
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = '',
  size = 'md',
}) => {
  const sizes = {
    sm: { wrapper: 'py-10', icon: 'w-10 h-10 mb-3', title: 'text-sm', desc: 'text-xs' },
    md: { wrapper: 'py-16', icon: 'w-14 h-14 mb-4', title: 'text-base', desc: 'text-sm' },
    lg: { wrapper: 'py-24', icon: 'w-20 h-20 mb-6', title: 'text-xl',  desc: 'text-base' },
  };

  const s = sizes[size];

  return (
    <div className={`flex flex-col items-center justify-center text-center ${s.wrapper} ${className}`}>
      {icon && (
        <div
          className={`flex items-center justify-center rounded-2xl bg-forgeGray-100 dark:bg-slate-800/60 text-forgeGray-400 dark:text-forgeGray-500 ${s.icon} p-3 mb-4`}
        >
          {icon}
        </div>
      )}
      <p className={`font-bold text-forgeGray-700 dark:text-forgeGray-200 ${s.title}`}>
        {title}
      </p>
      {description && (
        <p className={`mt-1.5 text-forgeGray-450 dark:text-forgeGray-400 max-w-xs leading-relaxed ${s.desc}`}>
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
};

// ─── Error State ──────────────────────────────────────────────────────────────
interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  description = 'An unexpected error occurred. Please try again.',
  onRetry,
  className = '',
}) => (
  <div className={`flex flex-col items-center justify-center text-center py-16 ${className}`}>
    <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center mb-4">
      <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
        />
      </svg>
    </div>
    <p className="font-bold text-forgeGray-900 dark:text-white text-base">{title}</p>
    <p className="mt-1.5 text-sm text-forgeGray-450 dark:text-forgeGray-400 max-w-xs leading-relaxed">
      {description}
    </p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="mt-5 px-5 py-2 text-xs font-bold rounded-xl border border-forgeGray-200 dark:border-forgeGray-700 bg-white dark:bg-slate-900 text-forgeGray-700 dark:text-forgeGray-300 hover:bg-forgeGray-50 dark:hover:bg-slate-800 transition-colors"
      >
        Try again
      </button>
    )}
  </div>
);

// ─── Dots Loader (inline) ─────────────────────────────────────────────────────
export const DotsLoader: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`flex items-center gap-1 ${className}`} aria-label="Loading">
    {[0, 1, 2].map((i) => (
      <span
        key={i}
        className="w-1.5 h-1.5 rounded-full bg-forgeGray-400 dark:bg-forgeGray-500 animate-bounce"
        style={{ animationDelay: `${i * 0.15}s` }}
      />
    ))}
  </div>
);
