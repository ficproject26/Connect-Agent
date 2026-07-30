import React from 'react';
import { motion } from 'framer-motion';

interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (id: string) => void;
  variant?: 'pills' | 'underline';
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  variant = 'underline',
  className = '',
}) => {
  return (
    <div className={`flex border-b border-forgeGray-200 dark:border-forgeGray-800/80 ${className}`}>
      <nav className="-mb-px flex space-x-4 md:space-x-8" aria-label="Tabs">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`relative py-4 px-2 text-sm font-semibold flex items-center space-x-2 transition-all duration-200 focus:outline-none ${
                isActive
                  ? 'text-secondary dark:text-primary'
                  : 'text-forgeGray-500 dark:text-forgeGray-450 hover:text-forgeGray-700 dark:hover:text-forgeGray-300'
              }`}
            >
              {tab.icon && <span className="w-4 h-4">{tab.icon}</span>}
              <span>{tab.label}</span>
              
              {isActive && variant === 'underline' && (
                <motion.div
                  layoutId="activeTabUnderline"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-secondary dark:bg-primary"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              
              {isActive && variant === 'pills' && (
                <motion.div
                  layoutId="activeTabPills"
                  className="absolute inset-0 bg-secondary/5 dark:bg-primary/10 rounded-lg -z-10"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
};
