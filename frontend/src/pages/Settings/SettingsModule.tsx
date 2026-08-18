import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { 
  Settings, Volume2, Globe, Shield, HelpCircle, 
  ChevronRight, Phone, Mail, Award, BookOpen,
  Bell, User, AlertTriangle, RefreshCw, Info, Check, Clock, Lock, LogOut, FileText
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
  const userState = user?.territory?.state || 'Andhra Pradesh';

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
                <a href="#privacy" className="flex items-center justify-between p-3 hover:bg-[#fbf9f8] rounded-xl text-slate-700 border border-slate-100">
                  <span className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-[#864f19]" /> Privacy & Telemetry Policies
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </a>
                <a href="#terms" className="flex items-center justify-between p-3 hover:bg-[#fbf9f8] rounded-xl text-slate-700 border border-slate-100">
                  <span className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[#864f19]" /> State Agent Terms & Compliance Guidelines
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </a>
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
                <a href="#privacy" className="flex items-center justify-between p-3 hover:bg-[#fbf9f8] rounded-xl text-slate-700 border border-slate-100">
                  <span>Privacy Policy</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </a>
                <a href="#terms" className="flex items-center justify-between p-3 hover:bg-[#fbf9f8] rounded-xl text-slate-700 border border-slate-100">
                  <span>Pincode Agent Terms & Guidelines</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </a>
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
                <a href="#privacy" className="flex items-center justify-between p-2.5 hover:bg-forgeGray-50 rounded-xl text-forgeGray-650">
                  <span>Privacy & Telemetry Policies</span>
                  <ChevronRight className="w-4 h-4 text-forgeGray-400" />
                </a>
                <a href="#terms" className="flex items-center justify-between p-2.5 hover:bg-forgeGray-50 rounded-xl text-forgeGray-650">
                  <span>Agent Terms & Guidelines</span>
                  <ChevronRight className="w-4 h-4 text-forgeGray-400" />
                </a>
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

    </div>
  );
};

export default SettingsModule;
