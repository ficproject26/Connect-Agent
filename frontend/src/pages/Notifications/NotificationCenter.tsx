import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card, CardHeader, CardTitle, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { StatusChip } from '../../components/ui/StatusChip';
import { Bell, Search, Trash2, CheckCircle2, ShieldAlert } from 'lucide-react';

export const NotificationCenter: React.FC = () => {
  const { notifications, markNotificationRead, clearNotifications } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');

  const filteredNotifs = notifications.filter((notif) => {
    const matchesSearch = 
      notif.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      notif.message.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesPriority = priorityFilter === 'all' || notif.priority === priorityFilter;

    return matchesSearch && matchesPriority;
  });

  return (
    <div className="space-y-6">
      
      <div className="flex justify-between items-center bg-white dark:bg-background-cardDark p-6 rounded-forge border border-forgeGray-200/40 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-forgeGray-900 dark:text-white font-sans">
            Notification Center
          </h1>
          <p className="text-xs font-semibold text-forgeGray-450 dark:text-forgeGray-400 mt-1 uppercase tracking-wider">
            Review critical system dispatches and priority service alert records
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Side Filters Sidebar (1 col) */}
        <div className="space-y-6">
          <Card variant="default">
            <CardHeader>
              <CardTitle>Filters & Config</CardTitle>
            </CardHeader>
            <CardBody className="space-y-4 text-xs font-semibold">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-forgeGray-400" />
                <input
                  type="text"
                  placeholder="Search dispatches..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-forgeGray-50 dark:bg-slate-800 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary dark:text-white"
                />
              </div>

              <div className="space-y-2 pt-2">
                <label className="block text-forgeGray-450 dark:text-forgeGray-400 uppercase text-[9px] font-bold ml-1">Priority Tags</label>
                <div className="flex flex-col space-y-1.5">
                  {[
                    { id: 'all', label: 'All Alerts' },
                    { id: 'high', label: 'High Priority' },
                    { id: 'medium', label: 'Medium Priority' },
                    { id: 'low', label: 'Low Priority' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setPriorityFilter(p.id)}
                      className={`text-left px-3 py-2 rounded-xl text-xs font-bold transition ${
                        priorityFilter === p.id 
                          ? 'bg-primary text-forgeGray-950 shadow-sm' 
                          : 'hover:bg-forgeGray-50 dark:hover:bg-slate-800 text-forgeGray-650'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={clearNotifications}
                leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                className="w-full py-2.5 mt-4 text-red-500 border-red-200/50 hover:bg-red-50"
              >
                Clear History Logs
              </Button>
            </CardBody>
          </Card>
        </div>

        {/* Right Side Alerts feed (3 cols) */}
        <div className="lg:col-span-3 space-y-4">
          {filteredNotifs.length > 0 ? (
            filteredNotifs.map((notif) => (
              <Card
                key={notif.id}
                variant="default"
                className={`border transition duration-150 ${
                  !notif.read ? 'border-primary/20 bg-primary/5' : 'border-forgeGray-100'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center space-x-2">
                    <span className={`inline-block h-2 w-2 rounded-full ${
                      notif.priority === 'high' ? 'bg-red-500 animate-ping' : 'bg-forgeGray-400'
                    }`} />
                    <h3 className="font-extrabold text-sm text-forgeGray-900 dark:text-white leading-tight">
                      {notif.title}
                    </h3>
                  </div>
                  
                  <span className="text-[10px] text-forgeGray-450 dark:text-forgeGray-400 font-semibold uppercase">
                    {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <p className="text-xs text-forgeGray-600 dark:text-forgeGray-400 leading-relaxed font-semibold">
                  {notif.message}
                </p>

                <div className="flex justify-between items-center border-t border-forgeGray-100 dark:border-slate-850/80 pt-3 mt-3 text-xs font-semibold">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                    notif.priority === 'high' ? 'bg-red-100 text-red-750 dark:bg-red-950/20' : 'bg-forgeGray-100'
                  }`}>
                    {notif.priority} Priority
                  </span>
                  
                  {!notif.read && (
                    <button
                      onClick={() => markNotificationRead(notif.id)}
                      className="text-secondary dark:text-primary hover:underline flex items-center space-x-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Mark Read</span>
                    </button>
                  )}
                </div>
              </Card>
            ))
          ) : (
            <Card variant="default" className="text-center py-20 text-forgeGray-400">
              <Bell className="w-12 h-12 mx-auto mb-2 text-forgeGray-300" />
              <p className="text-sm font-semibold">No alerts found matching filters</p>
            </Card>
          )}
        </div>

      </div>

    </div>
  );
};

export default NotificationCenter;
