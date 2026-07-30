import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { 
  Settings, Volume2, Globe, Shield, HelpCircle, 
  ChevronRight, Phone, Mail, Award, BookOpen,
  Bell, User, AlertTriangle, RefreshCw, Info, Check, Clock
} from 'lucide-react';

export const SettingsModule: React.FC = () => {
  const { theme, toggleTheme, language, setLanguage } = useTheme();
  const { 
    user, 
    addNotification, 
    notifications,
    soundProfile,
    soundVolume,
    setSoundProfile,
    setSoundVolume,
    triggerSound
  } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'notifications' | 'account'>('notifications');

  const handleSoundTest = () => {
    triggerSound();
    addNotification('Test Sound', `Testing ${soundProfile} tone at ${Math.round(soundVolume * 100)}% volume.`, 'high', 'system');
  };

  // Static Activity Heatmap data
  const heatmapRows = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const colors = [
    'bg-forgeGray-100 dark:bg-slate-800/80',
    'bg-secondary/20 dark:bg-secondary/15',
    'bg-secondary/50 dark:bg-secondary/35',
    'bg-secondary dark:bg-secondary-hover'
  ];
  
  const activityData = React.useMemo(() => {
    // Generates a mock pattern of peak activity
    return Array.from({ length: 7 }, (_, dayIdx) => 
      Array.from({ length: 24 }, (_, hourIdx) => {
        // Peak hours: 9 AM to 12 PM (hours 9-12) and 5 PM to 8 PM (hours 17-20)
        const isPeak = (hourIdx >= 9 && hourIdx <= 12) || (hourIdx >= 17 && hourIdx <= 20);
        const rand = Math.random();
        if (isPeak) return rand > 0.3 ? 3 : 2;
        return rand > 0.7 ? 1 : 0;
      })
    );
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Page Title & Subtabs */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-forgeGray-200/50 dark:border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-black font-sans text-forgeGray-900 dark:text-white leading-tight">
            Partner Settings
          </h1>
          <p className="text-forgeGray-450 dark:text-forgeGray-400 mt-1 font-semibold text-sm">
            Manage your enterprise profile, operational alerts, and compliance standards.
          </p>
        </div>
        <div className="flex gap-2 bg-forgeGray-100 dark:bg-slate-900 p-1 rounded-xl border border-forgeGray-200/50 dark:border-slate-800/80 shrink-0">
          <button 
            onClick={() => setActiveSubTab('notifications')}
            className={`px-4 py-2 shadow-sm rounded-lg font-bold flex items-center gap-2 text-xs transition-all ${
              activeSubTab === 'notifications'
                ? 'bg-white dark:bg-slate-850 text-secondary dark:text-primary'
                : 'text-forgeGray-450 hover:text-forgeGray-600 dark:hover:text-white'
            }`}
          >
            <Bell className="w-4 h-4" />
            Notifications
          </button>
          <button 
            onClick={() => setActiveSubTab('account')}
            className={`px-4 py-2 shadow-sm rounded-lg font-bold flex items-center gap-2 text-xs transition-all ${
              activeSubTab === 'account'
                ? 'bg-white dark:bg-slate-850 text-secondary dark:text-primary'
                : 'text-forgeGray-450 hover:text-forgeGray-600 dark:hover:text-white'
            }`}
          >
            <User className="w-4 h-4" />
            Account Settings
          </button>
        </div>
      </div>

      {activeSubTab === 'notifications' ? (
        /* ==================== NOTIFICATIONS GRID ==================== */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Alert Priority Center */}
            <Card variant="default" className="overflow-hidden">
              <CardHeader className="flex justify-between items-center border-b border-forgeGray-100 dark:border-slate-800/80 pb-4">
                <CardTitle className="text-base font-bold">Alert Priority Center</CardTitle>
                <button 
                  onClick={() => addNotification('All Read', 'All alerts have been marked as read.', 'low', 'system')}
                  className="text-xs font-bold text-secondary dark:text-primary hover:underline"
                >
                  Mark all as read
                </button>
              </CardHeader>
              <CardBody className="divide-y divide-forgeGray-100 dark:divide-slate-800/60 p-0">
                {/* Urgent Alert */}
                <div className="p-6 flex gap-4 bg-red-500/5 border-l-4 border-red-500">
                  <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/40 flex items-center justify-center shrink-0 text-red-600 dark:text-red-400">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-bold text-forgeGray-900 dark:text-white text-sm">Route Congestion: Northern Corridor</h4>
                      <span className="text-[10px] text-red-500 font-extrabold uppercase tracking-wide">Urgent</span>
                    </div>
                    <p className="text-xs text-forgeGray-550 dark:text-forgeGray-400 leading-relaxed mb-4">
                      Severe weather alert detected near Hub-22. 14 dispatches require immediate rerouting to avoid a 4-hour delay.
                    </p>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => addNotification('Rerouted', 'Active dispatches were successfully rerouted.', 'high', 'delivery')}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-colors"
                      >
                        Reroute All
                      </button>
                      <button className="px-4 py-2 border border-forgeGray-250 dark:border-slate-800 hover:bg-forgeGray-50 dark:hover:bg-slate-850 rounded-lg text-xs font-semibold text-forgeGray-650 dark:text-forgeGray-300 transition-all">
                        Dismiss
                      </button>
                    </div>
                  </div>
                  <span className="text-[10px] text-forgeGray-400 font-bold">2m ago</span>
                </div>

                {/* System Alert */}
                <div className="p-6 flex gap-4 hover:bg-forgeGray-50/50 dark:hover:bg-slate-800/10 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-secondary-light/60 dark:bg-secondary/15 flex items-center justify-center shrink-0 text-secondary dark:text-primary">
                    <RefreshCw className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-bold text-forgeGray-900 dark:text-white text-sm">API Integration Synchronized</h4>
                      <span className="text-[10px] text-secondary dark:text-primary font-extrabold uppercase tracking-wide">System</span>
                    </div>
                    <p className="text-xs text-forgeGray-550 dark:text-forgeGray-400">
                      The billing data sync for Q3 has successfully completed. 1,240 records updated.
                    </p>
                  </div>
                  <span className="text-[10px] text-forgeGray-400 font-bold">1h ago</span>
                </div>

                {/* Standard Alert */}
                <div className="p-6 flex gap-4 hover:bg-forgeGray-50/50 dark:hover:bg-slate-800/10 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-forgeGray-100 dark:bg-slate-800 flex items-center justify-center shrink-0 text-forgeGray-500">
                    <Info className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-bold text-forgeGray-900 dark:text-white text-sm">Manifest Uploaded</h4>
                      <span className="text-[10px] text-forgeGray-450 font-extrabold uppercase tracking-wide">Standard</span>
                    </div>
                    <p className="text-xs text-forgeGray-550 dark:text-forgeGray-400">
                      Partner ID: PX-992 has uploaded a new manifest for 'Direct Delivery' route.
                    </p>
                  </div>
                  <span className="text-[10px] text-forgeGray-400 font-bold">4h ago</span>
                </div>
              </CardBody>
              <div className="p-4 bg-forgeGray-50/50 dark:bg-slate-800/20 text-center border-t border-forgeGray-100 dark:border-slate-800/80">
                <button className="text-xs font-bold text-secondary dark:text-primary hover:underline">
                  View full notification history
                </button>
              </div>
            </Card>

            {/* Peak Operational Hours Chart */}
            <Card variant="default">
              <CardHeader className="flex justify-between items-center mb-4">
                <div>
                  <CardTitle className="text-base font-bold">Peak Operational Hours</CardTitle>
                  <p className="text-xs text-forgeGray-450 dark:text-forgeGray-400">Fleet activity concentration over the last 7 days.</p>
                </div>
                <select 
                  title="Select time range"
                  aria-label="Select time range for operational hours"
                  className="text-xs font-bold p-2 rounded-xl border border-forgeGray-250 dark:border-slate-800 bg-forgeGray-50 dark:bg-slate-800 cursor-pointer"
                >
                  <option>Last 7 Days</option>
                  <option>Last 30 Days</option>
                </select>
              </CardHeader>
              <CardBody className="space-y-4">
                {/* Heatmap Grid */}
                <div className="space-y-2 overflow-x-auto">
                  {/* Hours Row Header */}
                  <div className="grid grid-cols-24 gap-1 min-w-[400px]">
                    {Array.from({ length: 24 }).map((_, hourIdx) => (
                      <span key={hourIdx} className="text-[9px] text-center text-forgeGray-400 font-bold">
                        {hourIdx === 0 ? '12A' : hourIdx === 6 ? '6A' : hourIdx === 12 ? '12P' : hourIdx === 18 ? '6P' : hourIdx % 4 === 0 ? `${hourIdx}` : ''}
                      </span>
                    ))}
                  </div>

                  {/* Heatmap Rows */}
                  {heatmapRows.map((day, dayIdx) => (
                    <div key={day} className="flex items-center gap-2 min-w-[450px]">
                      <span className="w-8 text-[10px] text-forgeGray-500 font-bold uppercase">{day}</span>
                      <div className="flex-1 grid grid-cols-24 gap-1 h-5">
                        {activityData[dayIdx].map((intensity, hourIdx) => (
                          <div 
                            key={hourIdx} 
                            className={`h-full rounded-sm transition-all duration-200 cursor-pointer hover:scale-110 hover:brightness-90 ${colors[intensity]}`}
                            title={`${day} ${hourIdx}:00 - Activity: Level ${intensity + 1}`}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Heatmap Legend */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <span className="text-[10px] text-forgeGray-400 font-bold">Less Active</span>
                  <div className="flex gap-1">
                    {colors.map((c, i) => (
                      <div key={i} className={`w-3.5 h-3.5 rounded-sm ${c}`} />
                    ))}
                  </div>
                  <span className="text-[10px] text-forgeGray-400 font-bold">Peak Active</span>
                </div>
              </CardBody>
            </Card>

          </div>

          {/* Right Column */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Compliance Widget */}
            <Card variant="default">
              <CardBody className="space-y-6">
                <h3 className="font-bold text-forgeGray-900 dark:text-white text-base">Compliance Status</h3>
                
                {/* Circular Progress Gauge */}
                <div className="flex items-center justify-center">
                  <div className="relative w-32 h-32 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                      {/* Grey Track */}
                      <circle 
                        className="text-forgeGray-100 dark:text-slate-800" 
                        cx="64" 
                        cy="64" 
                        fill="transparent" 
                        r="52" 
                        stroke="currentColor" 
                        strokeWidth="8"
                      />
                      {/* Primary Ring */}
                      <circle 
                        className="text-primary transition-all duration-1000" 
                        cx="64" 
                        cy="64" 
                        fill="transparent" 
                        r="52" 
                        stroke="currentColor" 
                        strokeDasharray="326.72" 
                        strokeDashoffset="65.34" 
                        strokeWidth="8"
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center">
                      <span className="text-2xl font-black text-forgeGray-950 dark:text-white font-sans">80%</span>
                      <span className="text-[9px] text-forgeGray-450 uppercase tracking-wider font-extrabold">Complete</span>
                    </div>
                  </div>
                </div>

                {/* Compliance Checklist */}
                <ul className="space-y-3 font-semibold text-xs text-forgeGray-750 dark:text-forgeGray-300">
                  <li className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                    <span>Entity Verification</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                    <span>Insurance Bonding</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 animate-pulse">
                      <div className="w-2 h-2 rounded-full bg-amber-500" />
                    </div>
                    <span>DOT Safety Cert (Pending)</span>
                  </li>
                  <li className="flex items-center gap-3 opacity-40">
                    <div className="w-6 h-6 rounded-full border border-forgeGray-250 dark:border-slate-800 flex items-center justify-center shrink-0">
                      <div className="w-2 h-2" />
                    </div>
                    <span>Fleet Emission Report</span>
                  </li>
                </ul>

                <button 
                  onClick={() => addNotification('Cert Refreshed', 'Resuming DOT safety certificate upload process.', 'medium', 'system')}
                  className="w-full py-2.5 bg-forgeGray-100 hover:bg-forgeGray-200/60 dark:bg-slate-800 dark:hover:bg-slate-850 text-forgeGray-950 dark:text-white rounded-xl text-xs font-bold transition-colors"
                >
                  Resume Certification
                </button>
              </CardBody>
            </Card>

            {/* Quick Profile Card (FastTrack card style) */}
            <div className="bg-secondary dark:bg-background-cardDark p-6 rounded-forge text-white relative overflow-hidden border border-white/5 shadow-lg">
              {/* Background grid pattern */}
              <div className="absolute inset-0 opacity-5 pointer-events-none">
                <svg height="100%" width="100%">
                  <pattern id="grid-pattern" height="20" width="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="white" strokeWidth="0.5"></path>
                  </pattern>
                  <rect fill="url(#grid-pattern)" height="100%" width="100%"></rect>
                </svg>
              </div>

              <div className="relative z-10 space-y-4">
                <div className="flex justify-between items-start">
                  <div className="h-10 w-10 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center text-white border border-white/15 shadow-sm">
                    <Shield className="w-5 h-5 text-primary" />
                  </div>
                  <span className="px-2 py-0.5 bg-white/10 text-[9px] uppercase font-black tracking-widest rounded border border-white/15">
                    Verified Partner
                  </span>
                </div>

                <div>
                  <h4 className="font-extrabold text-base truncate">{user?.name || 'FastTrack Logistics Ltd.'}</h4>
                  <p className="text-[10px] text-white/60 font-semibold mt-0.5">Member since October 2021</p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 text-xs font-bold">
                  <div className="p-2.5 bg-white/5 border border-white/5 rounded-xl">
                    <p className="text-[9px] text-white/50 uppercase mb-0.5">Daily Cap</p>
                    <p className="text-sm font-extrabold">₹18,500</p>
                  </div>
                  <div className="p-2.5 bg-white/5 border border-white/5 rounded-xl">
                    <p className="text-[9px] text-white/50 uppercase mb-0.5">Global Rank</p>
                    <p className="text-sm font-extrabold">Top 4%</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      ) : (
        /* ==================== ORIGINAL CONFIG SETTINGS ==================== */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Side App configuration */}
          <div className="space-y-6">
            <Card variant="default">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Settings className="w-5 h-5 text-secondary dark:text-primary" />
                  <CardTitle>System Preferences</CardTitle>
                </div>
              </CardHeader>
              <CardBody className="space-y-4 text-xs font-semibold">
                
                <div className="flex items-center justify-between p-3 bg-forgeGray-55 dark:bg-slate-800/40 border border-forgeGray-100 rounded-xl">
                  <div>
                    <p className="text-xs font-bold">Dark Theme Switcher</p>
                    <p className="text-[10px] text-forgeGray-450 dark:text-forgeGray-400">Toggle dark mode visual layout</p>
                  </div>
                  <button
                    onClick={toggleTheme}
                    className="px-4 py-2 border border-forgeGray-250 dark:border-slate-800 rounded-xl font-bold bg-white dark:bg-slate-900 transition-colors"
                  >
                    {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                  </button>
                </div>

                <div className="flex flex-col space-y-3 p-3 bg-forgeGray-55 dark:bg-slate-800/40 border border-forgeGray-100 rounded-xl">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs font-bold">Sound Alert System</p>
                      <p className="text-[10px] text-forgeGray-455 dark:text-forgeGray-400">Play configured alert notifications</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleSoundTest} className="border-forgeGray-250 dark:border-slate-800">
                      Test Sound
                    </Button>
                  </div>
                  
                  {/* Alert Tone Selection */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-forgeGray-100 dark:border-slate-850">
                    {(['chirp', 'melody', 'siren'] as const).map((tone) => (
                      <button
                        key={tone}
                        type="button"
                        onClick={() => setSoundProfile(tone)}
                        className={`py-1.5 px-2.5 text-[10px] font-black rounded-lg border transition capitalize ${
                          soundProfile === tone
                            ? 'bg-secondary dark:bg-primary border-transparent text-forgeGray-950 shadow-sm'
                            : 'bg-white dark:bg-slate-900 border-forgeGray-200 dark:border-slate-800 text-forgeGray-750 dark:text-forgeGray-350 hover:bg-forgeGray-100 dark:hover:bg-slate-750'
                        }`}
                      >
                        {tone}
                      </button>
                    ))}
                  </div>

                  {/* Volume Slider Control */}
                  <div className="flex items-center space-x-3 pt-2">
                    <span className="text-[10px] text-forgeGray-500 font-bold uppercase w-12">Volume</span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={soundVolume}
                      title="Sound Volume"
                      aria-label="Sound Volume"
                      onChange={(e) => setSoundVolume(parseFloat(e.target.value))}
                      className="flex-1 h-1 bg-forgeGray-200 dark:bg-forgeGray-700 rounded-full appearance-none cursor-pointer accent-secondary dark:accent-primary focus:outline-none"
                    />
                    <span className="text-[10px] font-black text-forgeGray-750 dark:text-white w-8 text-right font-sans">
                      {Math.round(soundVolume * 100)}%
                    </span>
                  </div>
                </div>

              </CardBody>
            </Card>

            {/* Legal / Policy Documentation */}
            <Card variant="default">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <BookOpen className="w-5 h-5 text-secondary dark:text-primary" />
                  <CardTitle>Platform Legalities</CardTitle>
                </div>
              </CardHeader>
              <CardBody className="space-y-3 text-xs font-semibold">
                <a href="#privacy" className="flex items-center justify-between p-2.5 hover:bg-forgeGray-50 dark:hover:bg-slate-800/30 rounded-xl text-forgeGray-650 dark:text-forgeGray-300">
                  <span>Privacy & Telemetry Policies</span>
                  <ChevronRight className="w-4 h-4 text-forgeGray-400" />
                </a>
                <a href="#terms" className="flex items-center justify-between p-2.5 hover:bg-forgeGray-50 dark:hover:bg-slate-800/30 rounded-xl text-forgeGray-650 dark:text-forgeGray-300">
                  <span>Partner Terms & Declaration Guidelines</span>
                  <ChevronRight className="w-4 h-4 text-forgeGray-400" />
                </a>
              </CardBody>
            </Card>
          </div>

          {/* Right Side Support Helpline */}
          <div className="space-y-6">
            <Card variant="default" className="h-full">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <HelpCircle className="w-5 h-5 text-secondary dark:text-primary" />
                  <CardTitle>Helpline & Support Center</CardTitle>
                </div>
              </CardHeader>
              <CardBody className="space-y-4 text-xs font-semibold">
                <p className="text-forgeGray-550 dark:text-forgeGray-400 leading-relaxed font-medium">
                  Need help with booking calculations, payouts, or active order navigations? Speak directly with our operational help desk.
                </p>

                <div className="space-y-3">
                  <div className="flex items-center space-x-3 p-3 bg-forgeGray-50 dark:bg-slate-800/40 rounded-xl border border-forgeGray-100 dark:border-slate-800/60">
                    <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-lg">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[10px] text-forgeGray-450 uppercase">Emergency hotline</p>
                      <p className="font-extrabold text-forgeGray-950 dark:text-white">+91 1800 200 4545</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-3 bg-forgeGray-50 dark:bg-slate-800/40 rounded-xl border border-forgeGray-100 dark:border-slate-800/60">
                    <div className="p-2 bg-secondary/10 text-secondary rounded-lg">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[10px] text-forgeGray-450 uppercase">Partner Support Email</p>
                      <p className="font-extrabold text-forgeGray-950 dark:text-white">support@forgeindia.in</p>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      )}

    </div>
  );
};

export default SettingsModule;
