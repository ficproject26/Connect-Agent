import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { 
  Settings, Volume2, Globe, Shield, HelpCircle, 
  ChevronRight, Phone, Mail, Award, BookOpen,
  Bell, User, AlertTriangle, RefreshCw, Info, Check, Clock, Lock, LogOut, FileText, Printer, Download, CheckCircle2, X
} from 'lucide-react';

export const SettingsModule: React.FC = () => {
  const { language, setLanguage } = useTheme();
  const { 
    user, 
    addNotification, 
    notifications,
    soundProfile,
    soundVolume,
    setSoundProfile,
    setSoundVolume,
    triggerSound,
    logout
  } = useAuth();
  const rawRole = (user?.role as string) || (user as any)?.level || 'pincode';
  const activeRole = (rawRole === 'agent' ? ((user as any)?.level || 'pincode') : rawRole).toLowerCase();
  const userTerritory = user?.assignedTerritory || user?.territory || {
    state: (user as any)?.assignedState,
    district: (user as any)?.assignedDistrict,
    division: (user as any)?.assignedDivision,
    pincode: (user as any)?.assignedPincode
  };
  const userState = (userTerritory?.state || (user as any)?.assignedState || '').trim();

  // Platform Legalities Document Viewer Modal State
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);
  const [activeLegalTab, setActiveLegalTab] = useState<'privacy' | 'terms'>('privacy');

  // Sync with URL Hash (#privacy, #terms) for direct navigation and refresh support
  useEffect(() => {
    const handleHashSync = () => {
      const hash = (window.location.hash || '').toLowerCase();
      if (hash.includes('privacy')) {
        setActiveLegalTab('privacy');
        setIsLegalModalOpen(true);
      } else if (hash.includes('terms') || hash.includes('guidelines')) {
        setActiveLegalTab('terms');
        setIsLegalModalOpen(true);
      }
    };
    handleHashSync();
    window.addEventListener('hashchange', handleHashSync);
    return () => window.removeEventListener('hashchange', handleHashSync);
  }, []);

  const openPrivacyModal = (e: React.MouseEvent) => {
    e.preventDefault();
    setActiveLegalTab('privacy');
    setIsLegalModalOpen(true);
    window.history.pushState(null, '', '#privacy');
  };

  const openTermsModal = (e: React.MouseEvent) => {
    e.preventDefault();
    setActiveLegalTab('terms');
    setIsLegalModalOpen(true);
    window.history.pushState(null, '', '#terms');
  };

  const closeLegalModal = () => {
    setIsLegalModalOpen(false);
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  };

  // Pincode Agent Alert Toggles State
  const [fieldVisitAlerts, setFieldVisitAlerts] = useState(true);
  const [vendorKycAlerts, setVendorKycAlerts] = useState(true);
  const [targetTaskAlerts, setTargetTaskAlerts] = useState(true);

  // State Agent Operational Preferences State
  const [autoEscalateAdmin, setAutoEscalateAdmin] = useState(true);
  const [stateAuditAlerts, setStateAuditAlerts] = useState(true);
  const [districtPerformanceAlerts, setDistrictPerformanceAlerts] = useState(true);

  const handleSoundTest = () => {
    triggerSound();
    addNotification('Test Sound', `Testing ${soundProfile} tone at ${Math.round(soundVolume * 100)}% volume.`, 'high', 'system');
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans text-[#1b1c1c]">
      
      {/* Page Title */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#eae8e7] pb-6">
        <div>
          <h1 className="text-3xl font-black text-[#1b1c1c] leading-tight">
            Settings
          </h1>
          <p className="text-[#52443a] mt-1 font-semibold text-sm">
            Manage your profile, preferences, and support options.
          </p>
        </div>
      </div>

      {/* ==================== STATE AGENT SETTINGS VIEW ==================== */}
      {activeRole === 'state' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Left Column: System Preferences, State Operational Preferences, Security & Legalities */}
          <div className="space-y-6">
            
            {/* System Preferences & Notification Alert Settings */}
            <Card variant="default">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Settings className="w-5 h-5 text-[#864f19]" />
                  <CardTitle className="text-base font-extrabold text-[#1b1c1c]">System Preferences</CardTitle>
                </div>
              </CardHeader>
              <CardBody className="space-y-4 text-xs font-semibold">
                
                {/* Language Selection */}
                <div className="flex items-center justify-between p-3 bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-[#864f19]" />
                    <div>
                      <p className="text-xs font-bold text-[#1b1c1c]">Preferred Portal Language</p>
                      <p className="text-[10px] text-slate-500">Interface language selection</p>
                    </div>
                  </div>
                  <select
                    value={language}
                    onChange={(e: any) => setLanguage(e.target.value)}
                    className="bg-white border border-[#d7c3b5] rounded-lg py-1.5 px-3 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#864f19]"
                  >
                    <option value="en">English</option>
                    <option value="te">Telugu (తెలుగు)</option>
                    <option value="hi">Hindi (हिंदी)</option>
                    <option value="kn">Kannada (ಕನ್ನಡ)</option>
                    <option value="ta">Tamil (தமிழ்)</option>
                  </select>
                </div>

                {/* Sound Alert System */}
                <div className="flex flex-col space-y-3 p-3 bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs font-bold text-[#1b1c1c]">Sound Alert System</p>
                      <p className="text-[10px] text-slate-500">Play configured alert notifications</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleSoundTest} className="border-[#d7c3b5] text-[#864f19] hover:bg-[#eae8e7]">
                      Test Sound
                    </Button>
                  </div>
                  
                  {/* Alert Tone Selection */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#d7c3b5]/40">
                    {(['chirp', 'melody', 'siren'] as const).map((tone) => (
                      <button
                        key={tone}
                        type="button"
                        onClick={() => setSoundProfile(tone)}
                        className={`py-2 px-3 text-xs font-bold rounded-xl border transition capitalize cursor-pointer ${
                          soundProfile === tone
                            ? 'bg-[#295468] border-transparent text-white shadow-sm'
                            : 'bg-white border-[#d7c3b5] text-slate-700 hover:bg-[#fbf9f8]'
                        }`}
                      >
                        {tone}
                      </button>
                    ))}
                  </div>

                  {/* Volume Slider Control */}
                  <div className="flex items-center space-x-3 pt-2">
                    <span className="text-[10px] text-slate-500 font-bold uppercase w-12">Volume</span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={soundVolume}
                      title="Sound Volume"
                      aria-label="Sound Volume"
                      onChange={(e) => setSoundVolume(parseFloat(e.target.value))}
                      className="flex-1 h-1.5 bg-[#d7c3b5]/50 rounded-full appearance-none cursor-pointer accent-[#295468] focus:outline-none"
                    />
                    <span className="text-[10px] font-black text-[#1b1c1c] w-8 text-right font-sans">
                      {Math.round(soundVolume * 100)}%
                    </span>
                  </div>
                </div>

              </CardBody>
            </Card>

            {/* State-Level Operational Preferences */}
            <Card variant="default">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Shield className="w-5 h-5 text-[#864f19]" />
                  <CardTitle className="text-base font-extrabold text-[#1b1c1c]">State-Level Operational Preferences</CardTitle>
                </div>
              </CardHeader>
              <CardBody className="space-y-3 text-xs font-semibold">
                
                {/* Auto-Escalation Toggle */}
                <div className="flex items-center justify-between p-3 bg-[#fbf9f8] rounded-xl border border-[#d7c3b5]/40">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-purple-50 text-purple-700 rounded-lg">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#1b1c1c]">Auto-Escalate Unresolved Tickets</p>
                      <p className="text-[10px] text-slate-500">Auto-escalate unresolved state tickets to SuperAdmin after 24h</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoEscalateAdmin}
                      onChange={(e) => setAutoEscalateAdmin(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#864f19]"></div>
                  </label>
                </div>

                {/* State Audit Alerts Toggle */}
                <div className="flex items-center justify-between p-3 bg-[#fbf9f8] rounded-xl border border-[#d7c3b5]/40">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-blue-50 text-blue-700 rounded-lg">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#1b1c1c]">State Field Audit Alerts</p>
                      <p className="text-[10px] text-slate-500">Real-time notifications on submitted district audit reports</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={stateAuditAlerts}
                      onChange={(e) => setStateAuditAlerts(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#864f19]"></div>
                  </label>
                </div>

                {/* District & Division Performance Digest Toggle */}
                <div className="flex items-center justify-between p-3 bg-[#fbf9f8] rounded-xl border border-[#d7c3b5]/40">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
                      <Award className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#1b1c1c]">District & Division Performance Digest</p>
                      <p className="text-[10px] text-slate-500">Daily performance summary across all assigned state districts</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={districtPerformanceAlerts}
                      onChange={(e) => setDistrictPerformanceAlerts(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#864f19]"></div>
                  </label>
                </div>

              </CardBody>
            </Card>

            {/* Privacy, Security & Terms */}
            <Card variant="default">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <BookOpen className="w-5 h-5 text-[#864f19]" />
                  <CardTitle className="text-base font-extrabold text-[#1b1c1c]">Privacy & Security Legalities</CardTitle>
                </div>
              </CardHeader>
              <CardBody className="space-y-3 text-xs font-semibold">
                <button
                  type="button"
                  onClick={openPrivacyModal}
                  className="w-full flex items-center justify-between p-3 hover:bg-[#fbf9f8] rounded-xl text-slate-700 border border-slate-100 bg-transparent text-left cursor-pointer transition"
                >
                  <span className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-[#864f19]" /> Privacy & Telemetry Policies
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
                <button
                  type="button"
                  onClick={openTermsModal}
                  className="w-full flex items-center justify-between p-3 hover:bg-[#fbf9f8] rounded-xl text-slate-700 border border-slate-100 bg-transparent text-left cursor-pointer transition"
                >
                  <span className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[#864f19]" /> State Agent Terms & Compliance Guidelines
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              </CardBody>
            </Card>

            {/* Logout Session Button */}
            <button
              onClick={() => logout()}
              className="w-full py-3.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 border border-rose-200 cursor-pointer transition shadow-sm"
            >
              <LogOut className="w-4 h-4" /> Logout Session
            </button>

          </div>

          {/* Right Column: Helpline & Support Center (State Scope) */}
          <div className="space-y-6">
            <Card variant="default" className="h-full">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <HelpCircle className="w-5 h-5 text-[#864f19]" />
                  <CardTitle className="text-base font-extrabold text-[#1b1c1c]">Help & Support Center</CardTitle>
                </div>
              </CardHeader>
              <CardBody className="space-y-4 text-xs font-semibold">
                <p className="text-slate-600 leading-relaxed font-medium">
                  Need assistance with state-wide escalations, district performance audits, agent quota disputes, or payout reconciliations? Contact our state operations support desk.
                </p>

                <div className="space-y-3">
                  <div className="flex items-center space-x-3 p-3 bg-[#fbf9f8] rounded-xl border border-[#d7c3b5]/50">
                    <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-black">STATE OPERATIONS HELPDESK</p>
                      <p className="font-extrabold text-[#1b1c1c] text-xs mt-0.5">Mon – Sat (9:00 AM – 7:00 PM IST)</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-3 bg-[#fbf9f8] rounded-xl border border-[#d7c3b5]/50">
                    <div className="p-2.5 bg-blue-50 text-blue-700 rounded-xl">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-black">STATE SUPPORT EMAIL</p>
                      <p className="font-extrabold text-[#1b1c1c] text-xs mt-0.5">state-support@connectagent.in</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-3 bg-[#fbf9f8] rounded-xl border border-[#d7c3b5]/50">
                    <div className="p-2.5 bg-amber-50 text-amber-700 rounded-xl">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-black">STATE ESCALATION HELPLINE</p>
                      <p className="font-extrabold text-[#864f19] text-xs mt-0.5">1800-STATE-AGENT</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-[#ffdcc2]/30 rounded-xl border border-[#d7c3b5]/50 text-[11px] text-[#52443a] space-y-1">
                  <p className="font-bold text-[#864f19] flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5" /> State Jurisdiction Notice
                  </p>
                  <p className="text-[10px] font-medium leading-normal">
                    Your account is registered with State Lead Jurisdiction for <strong>{userState}</strong>. All support tickets, audit logs, and performance metrics cover all districts, divisions, and pincode sectors within the state.
                  </p>
                </div>
              </CardBody>
            </Card>
          </div>

        </div>
      ) : activeRole === 'pincode' ? (
        /* ==================== PINCODE AGENT SETTINGS VIEW ==================== */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Left Column: Preferences, Alert Categories, Legalities & App Version */}
          <div className="space-y-6">
            
            {/* System Preferences & Notification Alert Settings */}
            <Card variant="default">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Settings className="w-5 h-5 text-[#864f19]" />
                  <CardTitle className="text-base font-extrabold text-[#1b1c1c]">Notification & Sound Preferences</CardTitle>
                </div>
              </CardHeader>
              <CardBody className="space-y-4 text-xs font-semibold">
                
                {/* Sound Alert System */}
                <div className="flex flex-col space-y-3 p-3 bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs font-bold text-[#1b1c1c]">Sound Alert System</p>
                      <p className="text-[10px] text-slate-500">Play configured alert notifications</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleSoundTest} className="border-[#d7c3b5] text-[#864f19] hover:bg-[#eae8e7]">
                      Test Sound
                    </Button>
                  </div>
                  
                  {/* Alert Tone Selection */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#d7c3b5]/40">
                    {(['chirp', 'melody', 'siren'] as const).map((tone) => (
                      <button
                        key={tone}
                        type="button"
                        onClick={() => setSoundProfile(tone)}
                        className={`py-2 px-3 text-xs font-bold rounded-xl border transition capitalize cursor-pointer ${
                          soundProfile === tone
                            ? 'bg-[#295468] border-transparent text-white shadow-sm'
                            : 'bg-white border-[#d7c3b5] text-slate-700 hover:bg-[#fbf9f8]'
                        }`}
                      >
                        {tone}
                      </button>
                    ))}
                  </div>

                  {/* Volume Slider Control */}
                  <div className="flex items-center space-x-3 pt-2">
                    <span className="text-[10px] text-slate-500 font-bold uppercase w-12">Volume</span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={soundVolume}
                      title="Sound Volume"
                      aria-label="Sound Volume"
                      onChange={(e) => setSoundVolume(parseFloat(e.target.value))}
                      className="flex-1 h-1.5 bg-[#d7c3b5]/50 rounded-full appearance-none cursor-pointer accent-[#295468] focus:outline-none"
                    />
                    <span className="text-[10px] font-black text-[#1b1c1c] w-8 text-right font-sans">
                      {Math.round(soundVolume * 100)}%
                    </span>
                  </div>
                </div>

                {/* Role-Specific Alert Toggles */}
                <div className="space-y-3 pt-2">
                  <span className="text-[10px] font-black uppercase text-[#864f19] tracking-wider block">Pincode Agent Alerts</span>
                  
                  {/* Field Visit Alerts Toggle */}
                  <div className="flex items-center justify-between p-3 bg-[#fbf9f8] rounded-xl border border-[#d7c3b5]/40">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-blue-50 text-blue-700 rounded-lg">
                        <Bell className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#1b1c1c]">Field Visit Alerts</p>
                        <p className="text-[10px] text-slate-500">Notifications for scheduled visits and check-in reminders</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={fieldVisitAlerts}
                        onChange={(e) => setFieldVisitAlerts(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#864f19]"></div>
                    </label>
                  </div>

                  {/* Vendor/KYC Alerts Toggle */}
                  <div className="flex items-center justify-between p-3 bg-[#fbf9f8] rounded-xl border border-[#d7c3b5]/40">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#1b1c1c]">Vendor / KYC Alerts</p>
                        <p className="text-[10px] text-slate-500">Alerts on vendor onboardings and KYC review status</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={vendorKycAlerts}
                        onChange={(e) => setVendorKycAlerts(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#864f19]"></div>
                    </label>
                  </div>

                  {/* Target & Task Alerts Toggle */}
                  <div className="flex items-center justify-between p-3 bg-[#fbf9f8] rounded-xl border border-[#d7c3b5]/40">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-amber-50 text-amber-700 rounded-lg">
                        <Award className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#1b1c1c]">Target & Task Alerts</p>
                        <p className="text-[10px] text-slate-500">Daily target progress updates and deadline notifications</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={targetTaskAlerts}
                        onChange={(e) => setTargetTaskAlerts(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#864f19]"></div>
                    </label>
                  </div>
                </div>

              </CardBody>
            </Card>

            {/* Platform Legalities */}
            <Card variant="default">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <BookOpen className="w-5 h-5 text-[#864f19]" />
                  <CardTitle className="text-base font-extrabold text-[#1b1c1c]">Platform Legalities</CardTitle>
                </div>
              </CardHeader>
              <CardBody className="space-y-3 text-xs font-semibold">
                <button
                  type="button"
                  onClick={openPrivacyModal}
                  className="w-full flex items-center justify-between p-3 hover:bg-[#fbf9f8] rounded-xl text-slate-700 border border-slate-100 bg-transparent text-left cursor-pointer transition"
                >
                  <span className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-[#864f19]" /> Privacy & Telemetry Policies
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
                <button
                  type="button"
                  onClick={openTermsModal}
                  className="w-full flex items-center justify-between p-3 hover:bg-[#fbf9f8] rounded-xl text-slate-700 border border-slate-100 bg-transparent text-left cursor-pointer transition"
                >
                  <span className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[#864f19]" /> Pincode Agent Terms & Guidelines
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              </CardBody>
            </Card>

            {/* App Version Info */}
            <div className="p-4 bg-[#fbf9f8] rounded-2xl border border-[#d7c3b5]/60 flex items-center justify-between text-xs font-semibold">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-[#864f19]" />
                <div>
                  <p className="font-extrabold text-[#1b1c1c]">Connect Agent App</p>
                  <p className="text-[10px] text-slate-500">App Version v2.4.0 (Pincode Field Agent Build)</p>
                </div>
              </div>
              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-extrabold text-[10px] rounded-lg">
                System Operational
              </span>
            </div>

          </div>

          {/* Right Column: Helpline & Support Center (Role-Specific to Pincode Agent) */}
          <div className="space-y-6">
            <Card variant="default" className="h-full">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <HelpCircle className="w-5 h-5 text-[#864f19]" />
                  <CardTitle className="text-base font-extrabold text-[#1b1c1c]">Support & Helpdesk</CardTitle>
                </div>
              </CardHeader>
              <CardBody className="space-y-4 text-xs font-semibold">
                <p className="text-slate-600 leading-relaxed font-medium">
                  Need help with vendor onboarding, field visits, KYC document verification, targets, or support tickets? Contact our agent operations help desk.
                </p>

                <div className="space-y-3">
                  <div className="flex items-center space-x-3 p-3 bg-[#fbf9f8] rounded-xl border border-[#d7c3b5]/50">
                    <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-black">AGENT OPERATIONS HELPDESK</p>
                      <p className="font-extrabold text-[#1b1c1c] text-xs mt-0.5">Mon – Sat (9:00 AM – 7:00 PM IST)</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-3 bg-[#fbf9f8] rounded-xl border border-[#d7c3b5]/50">
                    <div className="p-2.5 bg-blue-50 text-blue-700 rounded-xl">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-black">AGENT SUPPORT EMAIL</p>
                      <p className="font-extrabold text-[#1b1c1c] text-xs mt-0.5">support@connectagent.in</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-3 bg-[#fbf9f8] rounded-xl border border-[#d7c3b5]/50">
                    <div className="p-2.5 bg-amber-50 text-amber-700 rounded-xl">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-black">AGENT TOLL-FREE HELPLINE</p>
                      <p className="font-extrabold text-[#864f19] text-xs mt-0.5">1800-419-PINCODE</p>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-[#ffdcc2]/30 rounded-xl border border-[#d7c3b5]/50 text-[11px] text-[#52443a]">
                  <p className="font-bold text-[#864f19] flex items-center gap-1 mb-1">
                    <Shield className="w-3.5 h-3.5" /> Pincode Territory Scope Notice
                  </p>
                  <p className="text-[10px] font-medium leading-normal">
                    Your account is registered as a Pincode Field Agent. Support requests are routed directly to your assigned Division Manager for fast resolution.
                  </p>
                </div>
              </CardBody>
            </Card>
          </div>

        </div>
      ) : (
        /* ==================== ORIGINAL SETTINGS FOR ALL OTHER ROLES ==================== */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-6">
            <Card variant="default">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Settings className="w-5 h-5 text-secondary" />
                  <CardTitle>System Preferences</CardTitle>
                </div>
              </CardHeader>
              <CardBody className="space-y-4 text-xs font-semibold">
                
                <div className="flex flex-col space-y-3 p-3 bg-forgeGray-55 border border-forgeGray-100 rounded-xl">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs font-bold">Sound Alert System</p>
                      <p className="text-[10px] text-forgeGray-455">Play configured alert notifications</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleSoundTest} className="border-forgeGray-250">
                      Test Sound
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-forgeGray-100">
                    {(['chirp', 'melody', 'siren'] as const).map((tone) => (
                      <button
                        key={tone}
                        type="button"
                        onClick={() => setSoundProfile(tone)}
                        className={`py-1.5 px-2.5 text-[10px] font-black rounded-lg border transition capitalize ${
                          soundProfile === tone
                            ? 'bg-secondary border-transparent text-forgeGray-950 shadow-sm'
                            : 'bg-white border-forgeGray-200 text-forgeGray-750 hover:bg-forgeGray-100'
                        }`}
                      >
                        {tone}
                      </button>
                    ))}
                  </div>

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
                      className="flex-1 h-1 bg-forgeGray-200 rounded-full appearance-none cursor-pointer accent-secondary focus:outline-none"
                    />
                    <span className="text-[10px] font-black text-forgeGray-750 w-8 text-right font-sans">
                      {Math.round(soundVolume * 100)}%
                    </span>
                  </div>
                </div>

              </CardBody>
            </Card>

            <Card variant="default">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <BookOpen className="w-5 h-5 text-secondary" />
                  <CardTitle>Platform Legalities</CardTitle>
                </div>
              </CardHeader>
              <CardBody className="space-y-3 text-xs font-semibold">
                <button
                  type="button"
                  onClick={openPrivacyModal}
                  className="w-full flex items-center justify-between p-2.5 hover:bg-forgeGray-50 rounded-xl text-forgeGray-650 bg-transparent text-left cursor-pointer transition border border-transparent"
                >
                  <span className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-secondary" /> Privacy & Telemetry Policies
                  </span>
                  <ChevronRight className="w-4 h-4 text-forgeGray-400" />
                </button>
                <button
                  type="button"
                  onClick={openTermsModal}
                  className="w-full flex items-center justify-between p-2.5 hover:bg-forgeGray-50 rounded-xl text-forgeGray-650 bg-transparent text-left cursor-pointer transition border border-transparent"
                >
                  <span className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-secondary" /> Agent Terms & Guidelines
                  </span>
                  <ChevronRight className="w-4 h-4 text-forgeGray-400" />
                </button>
              </CardBody>
            </Card>
          </div>

          <div className="space-y-6">
            <Card variant="default" className="h-full">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <HelpCircle className="w-5 h-5 text-secondary" />
                  <CardTitle>Helpline & Support Center</CardTitle>
                </div>
              </CardHeader>
              <CardBody className="space-y-4 text-xs font-semibold">
                <p className="text-forgeGray-550 leading-relaxed font-medium">
                  Need help with vendor onboarding, field visits, KYC document verification, targets, or support tickets? Contact our agent operations help desk.
                </p>

                <div className="space-y-3">
                  <div className="flex items-center space-x-3 p-3 bg-forgeGray-50 rounded-xl border border-forgeGray-100">
                    <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-lg">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[10px] text-forgeGray-450 uppercase font-extrabold">Agent Operations Helpdesk</p>
                      <p className="font-extrabold text-forgeGray-950">Mon – Sat (9:00 AM – 7:00 PM IST)</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-3 bg-forgeGray-50 rounded-xl border border-forgeGray-100">
                    <div className="p-2 bg-secondary/10 text-secondary rounded-lg">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[10px] text-forgeGray-450 uppercase font-extrabold">Agent Support Email</p>
                      <p className="font-extrabold text-forgeGray-950">support@connectagent.in</p>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      )}

      {/* Platform Legalities & Compliance Viewer Modal */}
      <Modal
        isOpen={isLegalModalOpen}
        onClose={closeLegalModal}
        title="Platform Legalities & Compliance Documents"
      >
        <div className="space-y-4 font-sans text-xs">
          {/* Tab Navigation */}
          <div className="flex border-b border-slate-200 gap-2 pb-2">
            <button
              type="button"
              onClick={() => {
                setActiveLegalTab('privacy');
                window.history.replaceState(null, '', '#privacy');
              }}
              className={`px-3 py-2 text-xs font-bold rounded-xl transition cursor-pointer border-none flex items-center gap-1.5 ${
                activeLegalTab === 'privacy'
                  ? 'bg-[#864f19] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Lock className="w-3.5 h-3.5" /> Privacy & Telemetry Policies
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveLegalTab('terms');
                window.history.replaceState(null, '', '#terms');
              }}
              className={`px-3 py-2 text-xs font-bold rounded-xl transition cursor-pointer border-none flex items-center gap-1.5 ${
                activeLegalTab === 'terms'
                  ? 'bg-[#864f19] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Shield className="w-3.5 h-3.5" /> Agent Terms & Guidelines
            </button>
          </div>

          {/* Document Content Viewer */}
          <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-4 text-slate-700 leading-relaxed font-normal bg-[#fbf9f8] p-4 rounded-xl border border-slate-200">
            {activeLegalTab === 'privacy' ? (
              <div className="space-y-3.5">
                <div className="border-b border-slate-200 pb-2">
                  <h3 className="text-sm font-extrabold text-[#1b1c1c]">Forge India Connect Platform — Privacy & Telemetry Policies</h3>
                  <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Version 2.4.0 • Updated October 2026 • Applicable to all State, District, Division, and Pincode Field Agents</p>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 text-xs mb-1">1. Scope of Privacy & Telemetry Collection</h4>
                  <p>This policy outlines the processing of personal data, device telemetry, and location metadata collected through the Connect Agent web portal and field operations suite. By accessing or operating under your assigned agent profile, you consent to telemetry collection necessary for field verification, store audits, and merchant onboarding operations.</p>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 text-xs mb-1">2. GPS Location & Telemetry Geotagging</h4>
                  <p>Accurate field operations require the acquisition of device GPS coordinates during store visits, merchant KYC document verification, and check-in / check-out events. Location telemetry is captured exclusively during active field operational actions and includes latitude, longitude, reading timestamp, and accuracy in meters. Coordinates are strictly used to authenticate physical visits and prevent unauthorized cross-territory data falsification.</p>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 text-xs mb-1">3. KYC Document Privacy & Confidentiality</h4>
                  <p>Field agents collect sensitive merchant documents including PAN cards, Aadhaar IDs, GST registration records, and settlement bank passbooks. All merchant documentation uploaded through this portal is encrypted in transit via TLS 1.3 and stored in compliant secure object storage. Agents are strictly prohibited from storing, duplicating, or transmitting merchant PII outside the Connect platform.</p>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 text-xs mb-1">4. Role-Based Access & Territory Isolation</h4>
                  <p>To uphold data privacy, the Connect Platform implements granular Role-Based Access Control (RBAC). State, District, Division, and Pincode Agents can only access merchant and agent data within their authorized geographical jurisdiction. Inter-district or inter-division data leakage is actively prevented through backend query assertions.</p>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 text-xs mb-1">5. Data Retention, Audit Trails & Incident Reporting</h4>
                  <p>All support resolution logs, agent attendance records, wallet cashouts, and territory task assignments generate immutable audit trails. Inquiries regarding telemetry privacy or incident reports can be directed to privacy@connectagent.in or our Data Protection Officer.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3.5">
                <div className="border-b border-slate-200 pb-2">
                  <h3 className="text-sm font-extrabold text-[#1b1c1c]">Forge India Connect Platform — Agent Terms of Engagement & Guidelines</h3>
                  <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Version 2.4.0 • Updated October 2026 • Operational Guidelines for Workforce & Agents</p>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 text-xs mb-1">1. Professional Code of Conduct & Representation</h4>
                  <p>All registered State Agents, District Leads, Division Managers, and Pincode Field Agents represent Forge India Connect Pvt Ltd when interacting with merchants and commercial retail partners. Agents must conduct all merchant onboarding, document audits, and store visits with utmost integrity, punctuality, and professional decorum.</p>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 text-xs mb-1">2. Territory Jurisdiction & Non-Compete Compliance</h4>
                  <p>Agents are strictly bound to their assigned territorial sector as governed by the Admin Territory Database (State, District, Division, Taluk, and PIN Code). Onboarding merchants, executing store visits, or logging tickets outside your authorized territory boundaries is considered a breach of service and may result in immediate suspension.</p>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 text-xs mb-1">3. Field Visit Check-In & Check-Out Mandate</h4>
                  <p>Store audits require mandatory check-in with high-accuracy GPS capture, geotagged store front photography, and explicit checkout recording the merchant's outcome (Interested or Not Interested with reason). Fabricated visits, ghost check-ins, or simulated GPS readings are subject to zero-tolerance disciplinary action.</p>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 text-xs mb-1">4. Wallet Earnings, Commissions & Payout Settlement</h4>
                  <p>Agent compensation, onboarding commissions, and target incentives accrue directly in the Agent Wallet. To initiate cashout transfers, agents must link a valid settlement bank account in their own legal name with verified IFSC code. Cashout requests undergo automated fraud screening and are disbursed per scheduled payout cycles.</p>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 text-xs mb-1">5. Support Escalation & Ticket Resolution SLA</h4>
                  <p>Support queries submitted through the portal must adhere to designated SLA timeframes. Pincode and Division Agents must address merchant concerns promptly; unresolved disputes may be escalated through designated division and state support desks.</p>
                </div>
              </div>
            )}
          </div>

          {/* Action Bar */}
          <div className="flex justify-between items-center pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer border-none"
            >
              <Printer className="w-3.5 h-3.5" /> Print / Save as PDF
            </button>
            <button
              type="button"
              onClick={closeLegalModal}
              className="px-5 py-2 bg-[#864f19] hover:bg-[#a3672f] text-white font-bold rounded-xl text-xs cursor-pointer border-none shadow-xs"
            >
              Close Document
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
};

export default SettingsModule;
