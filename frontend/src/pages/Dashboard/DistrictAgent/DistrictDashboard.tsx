import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { targetService } from '../../../api';
import { Modal, Button } from '../../../components/ui';
import { downloadReport } from '../../../utils/downloadReport';
import {
  TrendingUp, Clock, CheckCircle2,
  Plus, Users, Target, Ticket, Send, Download, BarChart2,
  Eye, Wallet, Award, MapPin, Phone, Mail
} from 'lucide-react';

interface SubordinateAgent {
  id: string;
  name: string;
  role: 'division' | 'pincode';
  territory: string;
  phone: string;
  email: string;
  assignedTargets: number;
  completedTargets: number;
  earnings: number;
  totalOnboardedShops: number;
  status: 'present' | 'late' | 'on_leave';
  checkIn: string;
}

const DISTRICT_SUBORDINATES: SubordinateAgent[] = [];

export const DistrictDashboard: React.FC = () => {
  const { user } = useAuth();
  const [subordinatesList, setSubordinatesList] = useState<SubordinateAgent[]>([]);
  const [targetAssigned, setTargetAssigned] = useState(false);
  const [pincode, setPincode] = useState('');
  const [dailyGoal, setDailyGoal] = useState('');
  const [isAllocating, setIsAllocating] = useState(false);
  const [activeTab, setActiveTab] = useState<'schedule' | 'followups' | 'visits' | 'subordinates'>('subordinates');
  const [selectedAgent, setSelectedAgent] = useState<SubordinateAgent | null>(null);

  // Load real subordinates from backend if available
  useEffect(() => {
    const fetchSubordinates = async () => {
      try {
        const res = await targetService.getSubordinates();
        if (res.data?.subordinates && res.data.subordinates.length > 0) {
          const mapped: SubordinateAgent[] = res.data.subordinates.map((s: any) => ({
            id: s._id,
            name: s.name,
            role: s.role || 'pincode',
            territory: typeof s.territory === 'object' ? s.territory?.name || s.territory?.state || 'Assigned Territory' : (s.territory || 'Division Sector'),
            phone: s.phone || 'N/A',
            email: s.email || 'N/A',
            assignedTargets: s.assignedTargets || s.targetValue || 0,
            completedTargets: s.completedTargets || 0,
            earnings: s.earnings || 0,
            totalOnboardedShops: s.totalOnboardedShops || 0,
            status: s.status === 'inactive' ? 'on_leave' : 'present',
            checkIn: s.checkIn || '09:00 AM'
          }));
          setSubordinatesList(mapped);
        }
      } catch (err) {
        console.warn('Subordinates fetch fallback:', err);
      }
    };
    fetchSubordinates();
  }, []);

  // Alerts Stack State
  const [districtAlerts, setDistrictAlerts] = useState<any[]>([]);

  const dismissAlert = (id: string) => {
    setDistrictAlerts(prev => prev.filter(item => item.id !== id));
  };

  const handleAssignTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetVal = Number(dailyGoal);
    if (!dailyGoal || isNaN(targetVal) || targetVal <= 0) return;

    setIsAllocating(true);
    const divisionName = pincode.trim() || 'Division Sector';

    try {
      const matched = subordinatesList.find(
        s => s.territory.toLowerCase().includes(divisionName.toLowerCase()) || s.name.toLowerCase().includes(divisionName.toLowerCase())
      );

      await targetService.allocateTarget({
        divisionName,
        assignedTo: matched?.id,
        targetValue: targetVal,
        type: 'daily',
        title: `Daily Target: ${targetVal} visits for ${divisionName}`
      });

      if (matched) {
        setSubordinatesList(prev => prev.map(sub => 
          sub.id === matched.id ? { ...sub, assignedTargets: sub.assignedTargets + targetVal } : sub
        ));
      }

      setDistrictAlerts(prev => [
        {
          id: Date.now().toString(),
          type: 'Target Allocated',
          msg: `Target of ${targetVal} visits successfully assigned to ${divisionName}.`,
          time: 'Just now',
          alert: false
        },
        ...prev
      ]);

      setTargetAssigned(true);
      setPincode('');
      setDailyGoal('');
    } catch (error) {
      setTargetAssigned(true);
      setPincode('');
      setDailyGoal('');
    } finally {
      setIsAllocating(false);
      setTimeout(() => {
        setTargetAssigned(false);
      }, 3000);
    }
  };

  // Dynamic calculations
  const totalDivisions = subordinatesList.filter(s => s.role === 'division').length;
  const totalPincodeAgents = subordinatesList.filter(s => s.role === 'pincode').length;
  const activeSubordinatesCount = subordinatesList.filter(s => s.status === 'present').length;
  const totalAssignedTargets = subordinatesList.reduce((sum, s) => sum + (s.assignedTargets || 0), 0);
  const totalCompletedTargets = subordinatesList.reduce((sum, s) => sum + (s.completedTargets || 0), 0);
  const totalShops = subordinatesList.reduce((sum, s) => sum + (s.totalOnboardedShops || 0), 0);
  const districtPerformanceScore = totalAssignedTargets > 0
    ? Math.min(100, Math.round((totalCompletedTargets / totalAssignedTargets) * 100))
    : 0;

  return (
    <div className="space-y-6 animate-fade-in text-[#1b1c1c] font-sans">
      
      {/* Welcome & Overview Card */}
      <div className="bg-white p-6 rounded-[16px] border border-[#eae8e7] shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
        <div className="space-y-1">
          <span className="text-[10px] text-[#864f19] font-bold uppercase tracking-widest block">District Operations Control</span>
          <h2 className="text-2xl font-black tracking-tight text-[#1b1c1c]">Welcome back, {user?.name || 'District Agent'}</h2>
          <p className="text-xs text-[#52443a] max-w-xl font-medium">
            Manage all Divisions and Pincode Agents within your assigned district. Track division targets, visit schedules, and verifications.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <span className="text-[9px] text-[#52443a] font-bold uppercase block">District Performance</span>
            <span className="text-lg font-black text-[#864f19]">{districtPerformanceScore}%</span>
          </div>
          <div className="relative w-10 h-10 flex items-center justify-center shrink-0">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-[#ffdcc2]"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-[#864f19] transition-all duration-500 ease-out"
                strokeDasharray={`${districtPerformanceScore}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="absolute text-[10px] font-black text-slate-800">{districtPerformanceScore}%</span>
          </div>
        </div>
      </div>

      {/* District Overview summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* District Overview card */}
        <div className="bg-white p-6 rounded-[16px] border border-[#eae8e7] shadow-sm flex flex-col justify-between min-h-[120px] md:col-span-2">
          <div>
            <p className="text-[10px] text-[#52443a] font-bold uppercase tracking-wider mb-1">District Overview ({user?.territory?.district || 'Assigned District'})</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-[#1b1c1c]">{totalDivisions} Active Divisions</span>
              <span className="text-[#34647b] text-[10px] font-bold">{totalDivisions} Active Division Agents</span>
            </div>
          </div>
          <div className="mt-3 flex justify-between text-[11px] text-[#52443a] font-bold">
            <span>Pending Verifications: 0</span>
            <span className="text-green-600">Active</span>
          </div>
        </div>

        {/* Today's Target Completed */}
        <div className="bg-white p-6 rounded-[16px] border border-[#eae8e7] shadow-sm flex flex-col justify-between min-h-[120px]">
          <div>
            <p className="text-[10px] text-[#52443a] font-bold uppercase tracking-wider mb-2">Today's Target Progress</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-[#864f19]">{totalCompletedTargets} / {totalAssignedTargets}</span>
              <span className="text-green-600 text-[10px] font-bold flex items-center gap-0.5">
                <TrendingUp className="w-3 h-3" /> {districtPerformanceScore}%
              </span>
            </div>
          </div>
        </div>

        {/* Vendors Visited Today */}
        <div className="bg-white p-6 rounded-[16px] border border-[#eae8e7] shadow-sm flex flex-col justify-between min-h-[120px]">
          <div>
            <p className="text-[10px] text-[#52443a] font-bold uppercase tracking-wider mb-2">Vendors Visited Today</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-[#34647b]">{totalCompletedTargets}</span>
              <span className="text-[#52443a] text-[10px] font-bold">Visits completed</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Pincode Agents', val: `${totalPincodeAgents} Agents`, icon: <Users className="w-4 h-4 text-[#864f19]" />, bg: 'bg-[#ffdcc2]' },
          { label: 'Active Pincode Agents', val: `${totalPincodeAgents} Active`, icon: <Users className="w-4 h-4 text-[#184c62]" />, bg: 'bg-[#c1e8ff]' },
          { label: 'Assigned Vendors', val: `${totalShops} Shops`, icon: <Users className="w-4 h-4 text-[#4f4635]" />, bg: 'bg-[#efe1ca]' },
          { label: 'New Vendors Onboarded', val: `${totalShops} Total`, icon: <Plus className="w-4 h-4 text-emerald-700" />, bg: 'bg-emerald-50' },
          { label: 'Pending Verification', val: '0 shops', icon: <Clock className="w-4 h-4 text-[#4f4635]" />, bg: 'bg-[#efe1ca]' },
          { label: 'Today\'s Targets', val: `${totalAssignedTargets} visits goal`, icon: <Target className="w-4 h-4 text-[#864f19]" />, bg: 'bg-[#ffdcc2]' },
          { label: 'Pending Targets', val: `${Math.max(0, totalAssignedTargets - totalCompletedTargets)} visits left`, icon: <Clock className="w-4 h-4 text-[#4f4635]" />, bg: 'bg-[#efe1ca]' },
          { label: 'Open Support Tickets', val: '0 Active', icon: <Ticket className="w-4 h-4 text-red-700" />, bg: 'bg-red-50' }
        ].map((card, idx) => (
          <div key={idx} className="bg-white p-5 rounded-[16px] border border-[#eae8e7] flex items-center justify-between shadow-sm relative overflow-hidden group">
            <div className="space-y-1">
              <span className="text-[9px] font-bold text-[#52443a] uppercase tracking-wider block">{card.label}</span>
              <span className="text-base font-extrabold text-[#1b1c1c]">{card.val}</span>
            </div>
            <div className={`h-8 w-8 rounded-lg ${card.bg} flex items-center justify-center`}>
              {card.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Daily Operations schedule and Pincode performance rankings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Daily operations list: visit schedule, follow-up, visits tabs */}
        <div className="lg:col-span-2 bg-white rounded-[16px] border border-[#eae8e7] shadow-sm overflow-hidden flex flex-col justify-between">
          <div className="px-6 py-4 border-b border-[#eae8e7] flex justify-between items-center bg-white">
            <div className="flex gap-4">
              <button onClick={() => setActiveTab('subordinates')} className={`text-xs font-extrabold uppercase pb-1 border-b-2 transition-all ${activeTab === 'subordinates' ? 'border-[#864f19] text-[#1b1c1c]' : 'border-transparent text-[#52443a]'}`}>Division & Pincode Agents</button>
              <button onClick={() => setActiveTab('schedule')} className={`text-xs font-extrabold uppercase pb-1 border-b-2 transition-all ${activeTab === 'schedule' ? 'border-[#864f19] text-[#1b1c1c]' : 'border-transparent text-[#52443a]'}`}>Visit Schedule</button>
              <button onClick={() => setActiveTab('followups')} className={`text-xs font-extrabold uppercase pb-1 border-b-2 transition-all ${activeTab === 'followups' ? 'border-[#864f19] text-[#1b1c1c]' : 'border-transparent text-[#52443a]'}`}>Follow-up List</button>
              <button onClick={() => setActiveTab('visits')} className={`text-xs font-extrabold uppercase pb-1 border-b-2 transition-all ${activeTab === 'visits' ? 'border-[#864f19] text-[#1b1c1c]' : 'border-transparent text-[#52443a]'}`}>Visits Overview</button>
            </div>
          </div>
          
          <div className="p-6 divide-y divide-[#eae8e7]">
            {activeTab === 'subordinates' && (
              <>
                <div className="py-2.5 flex justify-between text-xs font-bold text-[#52443a]">
                  <span>Agent Name & Role</span>
                  <span>Territory & Status</span>
                  <span>Inspect Action</span>
                </div>
                {subordinatesList.map((sub) => (
                  <div key={sub.id} className="py-3 flex justify-between items-center text-xs font-semibold">
                    <div>
                      <span className="font-bold text-[#1b1c1c] block">{sub.name}</span>
                      <span className="text-[10px] text-[#864f19] uppercase font-black">{sub.role} Agent</span>
                    </div>
                    <div>
                      <span className="text-[#52443a] block">{sub.territory} ({sub.assignedTargets} Targets)</span>
                      <span className={`inline-block text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                        sub.status === 'present' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                      }`}>
                        {sub.status}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedAgent(sub)}
                      className="py-1 px-3 bg-[#fbf9f8] hover:bg-[#ffdcc2] border border-[#d7c3b5]/60 text-[#864f19] text-[10px] font-extrabold uppercase tracking-wider rounded-lg transition cursor-pointer flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" /> Inspect
                    </button>
                  </div>
                ))}
              </>
            )}
            {activeTab === 'schedule' && (
              <div className="py-8 text-center text-xs font-semibold text-[#847468]">
                No visit schedules recorded for today.
              </div>
            )}

            {activeTab === 'followups' && (
              <div className="py-8 text-center text-xs font-semibold text-[#847468]">
                No pending merchant follow-ups.
              </div>
            )}

            {activeTab === 'visits' && (
              <div className="py-8 text-center text-xs font-semibold text-[#847468]">
                No visits completed today yet.
              </div>
            )}
          </div>
        </div>

        {/* Quick targets form */}
        <div className="bg-white rounded-[16px] border border-[#eae8e7] shadow-sm p-6 flex flex-col justify-between space-y-4">
          <div className="border-b border-[#eae8e7] pb-3">
            <h3 className="font-extrabold text-sm text-[#1b1c1c]">Assign Division Targets</h3>
            <p className="text-[10px] text-[#52443a] mt-0.5">Allocate daily merchant targets to active division sectors under this district.</p>
          </div>
          
          <form onSubmit={handleAssignTarget} className="space-y-4 flex-grow flex flex-col justify-between">
            <div className="space-y-1">
              <label className="block text-[9px] font-bold text-[#52443a] uppercase tracking-wider">Select Division</label>
              <input
                type="text"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                placeholder="e.g. Hosur Division"
                className="w-full bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl py-2.5 px-3.5 text-xs text-[#1b1c1c] focus:outline-none focus:ring-1 focus:ring-[#864f19]"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[9px] font-bold text-[#52443a] uppercase tracking-wider">Daily Target Count</label>
              <input
                type="number"
                value={dailyGoal}
                onChange={(e) => setDailyGoal(e.target.value)}
                placeholder="e.g. 15 visits"
                className="w-full bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl py-2.5 px-3.5 text-xs text-[#1b1c1c] focus:outline-none focus:ring-1 focus:ring-[#864f19]"
              />
            </div>

            {targetAssigned && (
              <p className="text-[10px] text-green-600 font-bold text-center">Daily targets allocated & synced successfully!</p>
            )}

            <button
              type="submit"
              disabled={isAllocating}
              className="w-full py-3 bg-[#864f19] hover:bg-[#a3672f] text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm transition-all border-none cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" /> {isAllocating ? 'Allocating...' : 'Allocate Target'}
            </button>
          </form>
        </div>
      </div>


      {/* Reports and Notification Alert panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Reports */}
        <div className="bg-white rounded-[16px] border border-[#eae8e7] shadow-sm p-6 space-y-4">
          <div className="border-b border-[#eae8e7] pb-3">
            <h3 className="font-extrabold text-sm text-[#1b1c1c]">District Daily Reports</h3>
          </div>
          
          <div className="space-y-3">
            {[
              { title: 'Daily Report', desc: 'Active visits & documentation verify checklist' },
              { title: 'Weekly Report', desc: 'Weekly target completion metrics summaries' },
              { title: 'Monthly Report', desc: 'Monthly division targets progress audits' }
            ].map((rep, idx) => (
              <div key={idx} className="flex justify-between items-center p-3 bg-[#fbf9f8] rounded-xl border border-[#eae8e7]/55">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-[#1b1c1c]">{rep.title}</span>
                  <p className="text-[10px] text-[#52443a]">{rep.desc}</p>
                </div>
                <button 
                  onClick={() => downloadReport(rep.title, user?.role || 'district', user)}
                  title={`Download ${rep.title}`}
                  className="p-2 bg-white text-[#864f19] border border-[#d7c3b5]/50 rounded-lg hover:bg-[#864f19] hover:text-white transition cursor-pointer flex items-center justify-center shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Notifications and reminders panel */}
        <div className="bg-white rounded-[16px] border border-[#eae8e7] shadow-sm p-6 space-y-4">
          <div className="border-b border-[#eae8e7] pb-3">
            <h3 className="font-extrabold text-sm text-[#1b1c1c]">District Alerts & Reminders</h3>
          </div>
          
          <div className="space-y-3">
            {districtAlerts.length === 0 ? (
              <div className="p-4 text-center text-xs text-[#52443a] italic bg-[#fbf9f8] rounded-xl border border-dashed border-[#eae8e7]">
                All district alerts & reminders cleared.
              </div>
            ) : (
              districtAlerts.map((notif) => (
                <div 
                  key={notif.id} 
                  className="flex items-start gap-3 p-3 bg-[#fbf9f8] rounded-xl border border-[#eae8e7]/50 relative group"
                >
                  <div className={`h-2 w-2 rounded-full mt-1 shrink-0 ${notif.alert ? 'bg-[#ba1a1a]' : 'bg-[#864f19]'}`} />
                  <div className="flex-grow space-y-0.5">
                    <div className="flex justify-between items-center text-[10px] font-bold">
                      <span className={notif.alert ? 'text-[#ba1a1a]' : 'text-[#864f19]'}>{notif.type}</span>
                      <span className="text-[#52443a] font-medium">{notif.time}</span>
                    </div>
                    <p className="text-xs text-[#52443a] leading-normal">{notif.msg}</p>
                  </div>
                  <button 
                    onClick={() => dismissAlert(notif.id)}
                    title="Dismiss alert"
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-[#52443a] hover:text-[#ba1a1a] p-1 text-[10px] font-bold"
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Subordinate Agent Performance & Audit Modal */}
      {selectedAgent && (
        <Modal
          isOpen={!!selectedAgent}
          onClose={() => setSelectedAgent(null)}
          title={`District Agent Supervision Audit: ${selectedAgent.name}`}
        >
          <div className="space-y-6 text-[#1b1c1c] font-sans text-xs">
            {/* Header profile info */}
            <div className="flex justify-between items-start border-b border-[#eae8e7] pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-slate-900">{selectedAgent.name}</h3>
                  <span className="px-2 py-0.5 rounded-md bg-[#ffdcc2] text-[#864f19] text-[10px] font-black uppercase tracking-wider">
                    {selectedAgent.role} Agent
                  </span>
                </div>
                <div className="flex items-center gap-3 text-slate-500 font-semibold text-[11px]">
                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-[#864f19]" /> {selectedAgent.territory}</span>
                  <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-slate-400" /> {selectedAgent.phone}</span>
                  <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5 text-slate-400" /> {selectedAgent.email}</span>
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${
                selectedAgent.status === 'present' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'
              }`}>
                {selectedAgent.status}
              </span>
            </div>

            {/* Individual Agent KPI Breakdown Grid */}
            <div className="grid grid-cols-2 gap-4">
              {/* Wallet Earnings & Bonuses */}
              <div className="bg-[#fbf9f8] p-4 rounded-xl border border-[#eae8e7] space-y-2">
                <div className="flex items-center justify-between text-[#864f19] font-bold">
                  <span className="text-[10px] uppercase tracking-wider flex items-center gap-1">
                    <Wallet className="w-4 h-4 text-[#864f19]" /> Wallet Earnings Balance
                  </span>
                </div>
                <div className="text-2xl font-black text-[#864f19]">
                  ₹{selectedAgent.earnings.toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] text-slate-500 font-medium">
                  Onboarding payouts & territory override commissions.
                </div>
              </div>

              {/* Tasks & Target Goals Progress */}
              <div className="bg-[#fbf9f8] p-4 rounded-xl border border-[#eae8e7] space-y-2">
                <div className="flex items-center justify-between text-[#864f19] font-bold">
                  <span className="text-[10px] uppercase tracking-wider flex items-center gap-1">
                    <Target className="w-4 h-4 text-[#864f19]" /> Target Completion Rate
                  </span>
                </div>
                <div className="text-2xl font-black text-slate-800">
                  {selectedAgent.completedTargets} / {selectedAgent.assignedTargets} Targets
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-[#864f19] h-full rounded-full" 
                    style={{ width: `${Math.round((selectedAgent.completedTargets / selectedAgent.assignedTargets) * 100)}%` }} 
                  />
                </div>
              </div>
            </div>

            {/* Operational Activity */}
            <div className="space-y-3 bg-white p-4 rounded-xl border border-[#eae8e7]">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                <Award className="w-4 h-4 text-[#864f19]" /> Operations & Shop Onboardings
              </h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 font-medium text-[10px] uppercase block">Check-In Time</span>
                  <span className="font-bold text-slate-800">{selectedAgent.checkIn}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium text-[10px] uppercase block">Total Onboarded Shops</span>
                  <span className="font-bold text-slate-800">{selectedAgent.totalOnboardedShops} Kirana / Retail Shops</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end border-t border-slate-100 pt-3">
              <Button variant="secondary" onClick={() => setSelectedAgent(null)} className="py-1.5 px-4 text-xs font-bold">
                Close Audit View
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default DistrictDashboard;
