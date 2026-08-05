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
    pending: 'bg-amber-100 text-amber-800 border border-amber-200/50',
    preparing: 'bg-blue-100 text-blue-800 border border-blue-200/50',
    'on-the-way': 'bg-primary-light text-primary-hover border border-primary/20',
    delivered: 'bg-emerald-100 text-emerald-800 border border-emerald-200/50',
    active: 'bg-cyan-100 text-cyan-800 border border-cyan-200/50',
    completed: 'bg-emerald-100 text-emerald-800 border border-emerald-200/50',
    cancelled: 'bg-red-100 text-red-800 border border-red-200/50',
    
    // Shift States
    online: 'bg-emerald-100 text-emerald-800 border border-emerald-200/50',
    busy: 'bg-rose-100 text-rose-800 border border-rose-200/50',
    break: 'bg-amber-100 text-amber-800 border border-amber-200/50',
    offline: 'bg-forgeGray-200 text-forgeGray-700 border border-forgeGray-300/40',
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

  const defaultStyle = 'bg-forgeGray-100 text-forgeGray-800';

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
