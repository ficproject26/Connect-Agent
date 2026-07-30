import React from 'react';

type StatusType = 
  | 'pending'
  | 'preparing'
  | 'on-the-way'
  | 'delivered'
  | 'active'
  | 'completed'
  | 'cancelled'
  | 'online'
  | 'busy'
  | 'break'
  | 'offline'
  | string;

interface StatusChipProps {
  status: StatusType;
  className?: string;
}

export const StatusChip: React.FC<StatusChipProps> = ({ status, className = '' }) => {
  const normalized = status.toLowerCase();

  const chipStyles: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200/50 dark:border-amber-500/20',
    preparing: 'bg-blue-100 text-blue-800 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-200/50 dark:border-blue-500/20',
    'on-the-way': 'bg-primary-light text-primary-hover dark:bg-primary/10 dark:text-primary border border-primary/20',
    delivered: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-500/20',
    active: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-500/10 dark:text-cyan-400 border border-cyan-200/50 dark:border-cyan-500/20',
    completed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-500/20',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-400 border border-red-200/50 dark:border-red-500/20',
    
    // Shift States
    online: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-500/20',
    busy: 'bg-rose-100 text-rose-800 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-200/50 dark:border-rose-500/20',
    break: 'bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200/50 dark:border-amber-500/20',
    offline: 'bg-forgeGray-200 text-forgeGray-700 dark:bg-forgeGray-800 dark:text-forgeGray-450 border border-forgeGray-300/40 dark:border-forgeGray-700/50',
  };

  const label: Record<string, string> = {
    pending: 'Pending',
    preparing: 'Preparing',
    'on-the-way': 'On The Way',
    delivered: 'Delivered',
    active: 'Active',
    completed: 'Completed',
    cancelled: 'Cancelled',
    online: 'Online',
    busy: 'Busy (On Job)',
    break: 'On Break',
    offline: 'Offline',
  };

  const defaultStyle = 'bg-forgeGray-100 text-forgeGray-800 dark:bg-forgeGray-800 dark:text-forgeGray-300';

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide capitalize ${
        chipStyles[normalized] || defaultStyle
      } ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5" />
      {label[normalized] || status}
    </span>
  );
};
