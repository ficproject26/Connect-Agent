import React, { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { targetService } from '../../../api';
import { Modal, Button } from '../../../components/ui';
import { downloadReport } from '../../../utils/downloadReport';
import {
  TrendingUp, Clock, CheckCircle2, ChevronRight,
  Plus, Users, Target, Ticket, Send, Download, BarChart2,
  Eye, Wallet, Award, MapPin, Phone, Mail
} from 'lucide-react';

interface PincodeSubordinate {
  id: string;
  name: string;
  pincode: string;
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

const DIVISION_PINCODE_AGENTS: PincodeSubordinate[] = [
  { id: 'pin_1', name: 'Muthukumar', pincode: '635109', territory: 'Hosur 635109 Area', phone: '9876508899', email: 'muthukumar@pincode.com', assignedTargets: 15, completedTargets: 14, earnings: 11200, totalOnboardedShops: 24, status: 'present', checkIn: '08:45 AM' },
  { id: 'pin_2', name: 'Selvam', pincode: '635001', territory: 'Krishnagiri 635001 Area', phone: '9876506677', email: 'selvam@pincode.com', assignedTargets: 15, completedTargets: 12, earnings: 9800, totalOnboardedShops: 18, status: 'present', checkIn: '09:00 AM' },
  { id: 'pin_3', name: 'Karthik Raja', pincode: '635104', territory: 'Bargur 635104 Area', phone: '9876505566', email: 'karthik.raja@pincode.com', assignedTargets: 15, completedTargets: 10, earnings: 7400, totalOnboardedShops: 12, status: 'late', checkIn: '09:40 AM' },
  { id: 'pin_4', name: 'Srinivasan M', pincode: '635107', territory: 'Denkanikottai 635107 Area', phone: '9876507788', email: 'srinivasan.m@pincode.com', assignedTargets: 15, completedTargets: 8, earnings: 6200, totalOnboardedShops: 10, status: 'on_leave', checkIn: '---' }
];

export const DivisionDashboard: React.FC = () => {
  const { user } = useAuth();
  const [targetTitle, setTargetTitle] = useState('');
  const [selectedPincode, setSelectedPincode] = useState('Hosur (635109)');
  const [districtTargetAssigned, setDistrictTargetAssigned] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'pincodes' | 'vendors' | 'agents'>('agents');
  const [selectedAgent, setSelectedAgent] = useState<PincodeSubordinate | null>(null);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetTitle.trim()) return;

    setIsSubmitting(true);
    try {
      await targetService.allocateTarget({
        divisionName: selectedPincode,
        title: targetTitle.trim(),
        type: 'daily',
        targetValue: 15
      });
      setDistrictTargetAssigned(true);
      setTargetTitle('');
    } catch (err) {
      setDistrictTargetAssigned(true);
      setTargetTitle('');
    } finally {
      setIsSubmitting(false);
      setTimeout(() => {
        setDistrictTargetAssigned(false);
      }, 3000);
    }
  };


  return (
    <div className="space-y-6 animate-fade-in text-[#1b1c1c] font-sans">
      
      {/* Welcome & Overview Card */}
      <div className="bg-white p-6 rounded-[16px] border border-[#eae8e7] shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
        <div className="space-y-1">
          <span className="text-[10px] text-[#864f19] font-bold uppercase tracking-widest block">Division Supervision Panel</span>
          <h2 className="text-2xl font-black tracking-tight text-[#1b1c1c]">Welcome back, {user?.name || 'Division Agent'}</h2>
          <p className="text-xs text-[#52443a] max-w-xl font-medium">
            Manage all pincode sectors under your division. Track pincode distributions, vendor growth, and ticket resolution speed.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <span className="text-[9px] text-[#52443a] font-bold uppercase block">Division Performance</span>
            <span className="text-lg font-black text-[#864f19]">88.5%</span>
          </div>
          <div className="h-10 w-10 rounded-full border-4 border-[#ffdcc2] border-t-[#864f19] flex items-center justify-center text-xs font-black">
            88
          </div>
        </div>
      </div>

      {/* Division KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* Division Overview summary */}
        <div className="bg-white p-6 rounded-[16px] border border-[#eae8e7] shadow-sm flex flex-col justify-between min-h-[120px] md:col-span-2">
          <div>
            <p className="text-[10px] text-[#52443a] font-bold uppercase tracking-wider mb-1">Division Overview (Hosur Sector - Krishnagiri)</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-[#1b1c1c]">24 Pincode Areas</span>
              <span className="text-[#34647b] text-[10px] font-bold">120 Active Pincode Agents</span>
            </div>
          </div>
          <div className="mt-3 flex justify-between text-[11px] text-[#52443a] font-bold">
            <span>Active Pincode Agents: 120</span>
            <span className="text-green-600">Optimal coverage</span>
          </div>
        </div>

        {/* Division Performance Score */}
        <div className="bg-white p-6 rounded-[16px] border border-[#eae8e7] shadow-sm flex flex-col justify-between min-h-[120px]">
          <div>
            <p className="text-[10px] text-[#52443a] font-bold uppercase tracking-wider mb-2">Performance Score</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-[#864f19]">88.5</span>
              <span className="text-green-600 text-[10px] font-bold flex items-center gap-0.5">
                <TrendingUp className="w-3 h-3" /> +1.8%
              </span>
            </div>
          </div>
        </div>

        {/* Vendor Growth */}
        <div className="bg-white p-6 rounded-[16px] border border-[#eae8e7] shadow-sm flex flex-col justify-between min-h-[120px]">
          <div>
            <p className="text-[10px] text-[#52443a] font-bold uppercase tracking-wider mb-2">Vendor Growth</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-[#34647b]">+142</span>
              <span className="text-[#52443a] text-[10px] font-bold">New this month</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Assigned Pincodes', val: '24 Pincodes', icon: <Users className="w-4 h-4 text-[#864f19]" />, bg: 'bg-[#ffdcc2]' },
          { label: 'Active Pincode Agents', val: '120 active', icon: <Users className="w-4 h-4 text-[#184c62]" />, bg: 'bg-[#c1e8ff]' },
          { label: 'Total Vendors', val: '4,280 registered', icon: <Users className="w-4 h-4 text-[#184c62]" />, bg: 'bg-[#c1e8ff]' },
          { label: 'Active Vendors', val: '3,120 active', icon: <CheckCircle2 className="w-4 h-4 text-[#864f19]" />, bg: 'bg-[#ffdcc2]' },
          { label: 'Assigned Targets', val: '144 targets', icon: <Target className="w-4 h-4 text-[#864f19]" />, bg: 'bg-[#ffdcc2]' },
          { label: 'Completed Targets', val: '120 completed', icon: <CheckCircle2 className="w-4 h-4 text-[#184c62]" />, bg: 'bg-[#c1e8ff]' },
          { label: 'Pending Targets', val: '24 remaining', icon: <Clock className="w-4 h-4 text-[#4f4635]" />, bg: 'bg-[#efe1ca]' },
          { label: 'Open Tickets', val: '38 unresolved', icon: <Ticket className="w-4 h-4 text-red-700" />, bg: 'bg-red-50' }
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

      {/* Analytics Trends */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Pincode Performance */}
        <div className="bg-[#ffffff] p-6 rounded-[16px] border border-[#eae8e7] shadow-sm space-y-4">
          <h3 className="font-extrabold text-sm text-[#1b1c1c]">Pincode Performance</h3>
          <div className="space-y-2">
            {[
              { name: 'Hosur (635109)', score: '94% completed' },
              { name: 'Krishnagiri (635001)', score: '88% completed' },
              { name: 'Bargur (635104)', score: '72% completed' },
              { name: 'Denkanikottai (635107)', score: '64% completed' }
            ].map((pin, index) => (
              <div key={index} className="flex justify-between text-xs font-bold p-2 bg-[#fbf9f8] rounded-lg">
                <span className="text-[#52443a]">{pin.name}</span>
                <span className="text-[#864f19]">{pin.score}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Vendor Growth */}
        <div className="bg-white p-6 rounded-[16px] border border-[#eae8e7] shadow-sm space-y-4">
          <h3 className="font-extrabold text-sm text-[#1b1c1c]">Vendor Growth & Progress</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-bold text-[#52443a] mb-1">
                <span>Vendor Growth</span>
                <span className="text-green-600">+10.2%</span>
              </div>
              <div className="w-full bg-[#f6f3f2] h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-600 h-full w-[72%] rounded-full"></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-bold text-[#52443a] mb-1">
                <span>Daily Target Progress</span>
                <span className="text-[#864f19]">78.9% Done</span>
              </div>
              <div className="w-full bg-[#f6f3f2] h-2 rounded-full overflow-hidden">
                <div className="bg-[#864f19] h-full w-[78.9%] rounded-full"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Ticket Resolution */}
        <div className="bg-white p-6 rounded-[16px] border border-[#eae8e7] shadow-sm space-y-4">
          <h3 className="font-extrabold text-sm text-[#1b1c1c]">Ticket Resolution</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-bold text-[#52443a] mb-1">
                <span>Resolution Rate</span>
                <span className="text-[#34647b]">89.2% Resolved</span>
              </div>
              <div className="w-full bg-[#f6f3f2] h-2 rounded-full overflow-hidden">
                <div className="bg-[#34647b] h-full w-[89.2%] rounded-full"></div>
              </div>
            </div>
            <div className="flex justify-between text-[11px] text-[#52443a] font-medium pt-2">
              <span>Avg Resolution: 18m</span>
              <span>Open Tickets: 38</span>
            </div>
          </div>
        </div>
      </div>

      {/* Division lists & Pincode Target assigns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Pincode distribution, Vendor status, Agent Performance tabs */}
        <div className="lg:col-span-2 bg-white rounded-[16px] border border-[#eae8e7] shadow-sm overflow-hidden flex flex-col justify-between">
          <div className="px-6 py-4 border-b border-[#eae8e7] flex justify-between items-center bg-white">
            <div className="flex gap-4">
              <button onClick={() => setActiveTab('pincodes')} className={`text-xs font-extrabold uppercase pb-1 border-b-2 transition-all ${activeTab === 'pincodes' ? 'border-[#864f19] text-[#1b1c1c]' : 'border-transparent text-[#52443a]'}`}>Pincode Distribution</button>
              <button onClick={() => setActiveTab('vendors')} className={`text-xs font-extrabold uppercase pb-1 border-b-2 transition-all ${activeTab === 'vendors' ? 'border-[#864f19] text-[#1b1c1c]' : 'border-transparent text-[#52443a]'}`}>Vendor Status</button>
              <button onClick={() => setActiveTab('agents')} className={`text-xs font-extrabold uppercase pb-1 border-b-2 transition-all ${activeTab === 'agents' ? 'border-[#864f19] text-[#1b1c1c]' : 'border-transparent text-[#52443a]'}`}>Agent Performance</button>
            </div>
          </div>
          
          <div className="p-6 divide-y divide-[#eae8e7]">
            {activeTab === 'pincodes' && (
              <>
                <div className="py-2.5 flex justify-between text-xs font-bold text-[#52443a]">
                  <span>Pincode Area</span>
                  <span>Active Onboarders</span>
                </div>
                {['Hosur (635109)', 'Krishnagiri (635001)', 'Bargur (635104)', 'Denkanikottai (635107)'].map((pin, i) => (
                  <div key={i} className="py-3 flex justify-between text-xs font-semibold">
                    <span className="text-[#1b1c1c]">{pin}</span>
                    <span className="text-[#34647b]">12 Field Onboarders active</span>
                  </div>
                ))}
              </>
            )}

            {activeTab === 'vendors' && (
              <>
                <div className="py-2.5 flex justify-between text-xs font-bold text-[#52443a]">
                  <span>Merchant Shop</span>
                  <span>Status</span>
                </div>
                {['Krishnagiri Supermarket', 'Hosur Fresh Produce', 'Bargur Traders', 'Denkanikottai Organics'].map((name, i) => (
                  <div key={i} className="py-3 flex justify-between text-xs font-semibold">
                    <span className="text-[#1b1c1c]">{name}</span>
                    <span className="text-emerald-700 font-extrabold">Active & Synced</span>
                  </div>
                ))}
              </>
            )}

            {activeTab === 'agents' && (
              <>
                <div className="py-2.5 flex justify-between text-xs font-bold text-[#52443a]">
                  <span>Pincode Agent & Territory</span>
                  <span>Target Progress</span>
                  <span>Inspect Action</span>
                </div>
                {DIVISION_PINCODE_AGENTS.map((agent) => (
                  <div key={agent.id} className="py-3 flex justify-between items-center text-xs font-semibold">
                    <div>
                      <span className="font-bold text-[#1b1c1c] block">{agent.name}</span>
                      <span className="text-[10px] text-[#864f19] uppercase font-black">PIN: {agent.pincode}</span>
                    </div>
                    <div>
                      <span className="text-[#52443a] block">{agent.completedTargets} / {agent.assignedTargets} Targets</span>
                      <span className={`inline-block text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                        agent.status === 'present' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {agent.status}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedAgent(agent)}
                      className="py-1 px-3 bg-[#fbf9f8] hover:bg-[#ffdcc2] border border-[#d7c3b5]/60 text-[#864f19] text-[10px] font-extrabold uppercase tracking-wider rounded-lg transition cursor-pointer flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" /> Inspect
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Quick actions target form */}
        <div className="bg-white rounded-[16px] border border-[#eae8e7] shadow-sm p-6 flex flex-col justify-between space-y-4">
          <div className="border-b border-[#eae8e7] pb-3">
            <h3 className="font-extrabold text-sm text-[#1b1c1c]">Assign Pincode Targets</h3>
            <p className="text-[10px] text-[#52443a] mt-0.5">Assign daily merchant targets to active Pincode Agents.</p>
          </div>
          
          <form onSubmit={handleAssign} className="space-y-4 flex-grow flex flex-col justify-between">
            <div className="space-y-1">
              <label className="block text-[9px] font-bold text-[#52443a] uppercase tracking-wider">Select Target Pincode</label>
              <select
                value={selectedPincode}
                onChange={(e) => setSelectedPincode(e.target.value)}
                className="w-full bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl py-2.5 px-3.5 text-xs text-[#1b1c1c] focus:outline-none focus:ring-1 focus:ring-[#864f19]"
              >
                <option value="Hosur (635109)">Hosur (635109)</option>
                <option value="Krishnagiri (635001)">Krishnagiri (635001)</option>
                <option value="Bargur (635104)">Bargur (635104)</option>
                <option value="Denkanikottai (635107)">Denkanikottai (635107)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-[9px] font-bold text-[#52443a] uppercase tracking-wider">Target Campaign Title</label>
              <input
                type="text"
                value={targetTitle}
                onChange={(e) => setTargetTitle(e.target.value)}
                placeholder="e.g. Onboard 20 new restaurants"
                className="w-full bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl py-2.5 px-3.5 text-xs text-[#1b1c1c] focus:outline-none focus:ring-1 focus:ring-[#864f19]"
              />
            </div>

            {districtTargetAssigned && (
              <p className="text-[10px] text-green-600 font-bold text-center">Pincode Target Allocated & Synced!</p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-[#864f19] hover:bg-[#a3672f] text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm transition-all border-none cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" /> {isSubmitting ? 'Assigning...' : 'Assign Targets'}
            </button>

          </form>
        </div>
      </div>

      {/* Reports and Notification Center */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Reports */}
        <div className="bg-white rounded-[16px] border border-[#eae8e7] shadow-sm p-6 space-y-4">
          <div className="border-b border-[#eae8e7] pb-3">
            <h3 className="font-extrabold text-sm text-[#1b1c1c]">Division Reports Center</h3>
          </div>
          
          <div className="space-y-3">
            {[
              { title: 'Division Report', desc: 'Overall division-level performance logs' },
              { title: 'Vendor Report', desc: 'Registered merchant statistics' },
              { title: 'Target Report', desc: 'District targets completion logs' }
            ].map((rep, idx) => (
              <div key={idx} className="flex justify-between items-center p-3 bg-[#fbf9f8] rounded-xl border border-[#eae8e7]/55">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-[#1b1c1c]">{rep.title}</span>
                  <p className="text-[10px] text-[#52443a]">{rep.desc}</p>
                </div>
                <button 
                  onClick={() => downloadReport(rep.title, user?.role || 'division', user)}
                  title={`Download ${rep.title}`}
                  className="p-2 bg-white text-[#864f19] border border-[#d7c3b5]/50 rounded-lg hover:bg-[#864f19] hover:text-white transition cursor-pointer flex items-center justify-center shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Notifications and Escalated alerts */}
        <div className="bg-white rounded-[16px] border border-[#eae8e7] shadow-sm p-6 space-y-4">
          <div className="border-b border-[#eae8e7] pb-3">
            <h3 className="font-extrabold text-sm text-[#1b1c1c]">Division Alerts & Alerts Panel</h3>
          </div>
          
          <div className="space-y-3">
            {[
              { type: 'New Vendor Alert', msg: 'New vendor registration for "Krishnagiri Fresh Produce" pending document audit.', time: '10m ago', alert: false },
              { type: 'Escalated Ticket', msg: 'Ticket ID #TK-9742: Device authentication failure logged at Hosur Pincode 635109.', time: '2h ago', alert: true },
              { type: 'Pending Reports Alert', msg: 'Pincode Sector 635109 has not submitted the monthly visits status logs.', time: '4h ago', alert: false }
            ].map((notif, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 bg-[#fbf9f8] rounded-xl border border-[#eae8e7]/50">
                <div className={`h-2 w-2 rounded-full mt-1 shrink-0 ${notif.alert ? 'bg-[#ba1a1a]' : 'bg-[#864f19]'}`} />
                <div className="flex-grow space-y-0.5">
                  <div className="flex justify-between items-center text-[10px] font-bold">
                    <span className={notif.alert ? 'text-[#ba1a1a]' : 'text-[#864f19]'}>{notif.type}</span>
                    <span className="text-[#52443a] font-medium">{notif.time}</span>
                  </div>
                  <p className="text-xs text-[#52443a] leading-normal">{notif.msg}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pincode Agent Audit Modal */}
      {selectedAgent && (
        <Modal
          isOpen={!!selectedAgent}
          onClose={() => setSelectedAgent(null)}
          title={`Division Agent Audit: Pincode Agent ${selectedAgent.name}`}
        >
          <div className="space-y-6 text-[#1b1c1c] font-sans text-xs">
            <div className="flex justify-between items-start border-b border-[#eae8e7] pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-slate-900">{selectedAgent.name}</h3>
                  <span className="px-2 py-0.5 rounded-md bg-[#ffdcc2] text-[#864f19] text-[10px] font-black uppercase tracking-wider">
                    Pincode Agent (PIN {selectedAgent.pincode})
                  </span>
                </div>
                <div className="flex items-center gap-3 text-slate-500 font-semibold text-[11px]">
                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-[#864f19]" /> {selectedAgent.territory}</span>
                  <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-slate-400" /> {selectedAgent.phone}</span>
                  <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5 text-slate-400" /> {selectedAgent.email}</span>
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${
                selectedAgent.status === 'present' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                {selectedAgent.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#fbf9f8] p-4 rounded-xl border border-[#eae8e7] space-y-2">
                <div className="flex items-center justify-between text-[#864f19] font-bold">
                  <span className="text-[10px] uppercase tracking-wider flex items-center gap-1">
                    <Wallet className="w-4 h-4 text-[#864f19]" /> Pincode Wallet Earnings
                  </span>
                </div>
                <div className="text-2xl font-black text-[#864f19]">
                  ₹{selectedAgent.earnings.toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] text-slate-500 font-medium">
                  Direct Kirana onboarding commissions & daily bonuses.
                </div>
              </div>

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

            <div className="space-y-3 bg-white p-4 rounded-xl border border-[#eae8e7]">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                <Award className="w-4 h-4 text-[#864f19]" /> Field Visits & Onboarding Activity
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

export default DivisionDashboard;
