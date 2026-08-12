import React, { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { downloadReport } from '../../../utils/downloadReport';
import {
  TrendingUp, Download, ShieldAlert, Award,
  Clock, CheckCircle2, ChevronRight, Users, Target, Ticket, FileText, Plus, Landmark, Megaphone, Send, BarChart2, Briefcase, ListCollapse
} from 'lucide-react';

import { useQuery } from '@tanstack/react-query';
import api from '../../../utils/api';

export const StateDashboard: React.FC = () => {
  const { user } = useAuth();
  const [announcementText, setAnnouncementText] = useState('');
  const [broadcasted, setBroadcasted] = useState(false);
  const [activeTab, setActiveTab] = useState<'districts' | 'divisions' | 'rankings'>('districts');

  const userState = user?.territory?.state || 'Karnataka';

  // Fetch live agent hierarchy from backend
  const { data: hierarchyRes } = useQuery({
    queryKey: ['stateDashboardHierarchy'],
    queryFn: async () => {
      try {
        const res = await api.get('/admin/hierarchy');
        return res.data;
      } catch (e) {
        return null;
      }
    },
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 401) return false;
      return failureCount < 1;
    }
  });

  // Fetch live vendor partners from backend
  const { data: vendorsRes } = useQuery({
    queryKey: ['stateDashboardVendors'],
    queryFn: async () => {
      try {
        const res = await api.get('/vendors');
        return res.data;
      } catch (e) {
        return null;
      }
    },
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 401) return false;
      return failureCount < 1;
    }
  });

  // Compute live metrics from API data
  const metrics = React.useMemo(() => {
    const districts = hierarchyRes?.districts || [];
    const divisions = hierarchyRes?.divisions || [];
    const pincodes = hierarchyRes?.pincodes || [];
    const vendors = vendorsRes?.vendors || [];

    const activeVendors = vendors.filter((v: any) => v.status === 'active' || v.status === 'approved').length;
    const inactiveVendors = vendors.filter((v: any) => v.status === 'inactive').length;
    const pendingVendors = vendors.filter((v: any) => v.kycStatus === 'pending' || v.status === 'pending').length;

    return {
      totalDistricts: districts.length,
      totalDivisions: divisions.length,
      totalPincodes: pincodes.length,
      totalVendors: vendors.length,
      activeVendors,
      inactiveVendors,
      pendingVendors
    };
  }, [hierarchyRes, vendorsRes]);

  const districtsList = React.useMemo(() => {
    if (hierarchyRes?.districts && hierarchyRes.districts.length > 0) {
      return hierarchyRes.districts.map((d: any) => ({
        name: d.name || d.territory?.district || 'District Area',
        val: `${d.performanceScore || 100}% Score`,
        divs: `${d.divisions?.length || 0} Divisions active`
      }));
    }
    return [];
  }, [hierarchyRes]);

  const divisionsList = React.useMemo(() => {
    if (hierarchyRes?.divisions && hierarchyRes.divisions.length > 0) {
      return hierarchyRes.divisions.map((div: any) => ({
        name: div.name || div.territory?.division || 'Division Sector',
        score: `${div.performanceScore || 100}%`,
        pins: `${div.pincodes?.length || 0} Pincodes assigned`
      }));
    }
    return [];
  }, [hierarchyRes]);

  const handleBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementText.trim()) return;
    setBroadcasted(true);
    setTimeout(() => {
      setBroadcasted(false);
      setAnnouncementText('');
    }, 3000);
  };

  return (
    <div className="space-y-6 animate-fade-in text-[#1b1c1c] font-sans">
      
      {/* Welcome Card & Summary */}
      <div className="bg-white p-6 rounded-[16px] border border-[#eae8e7] shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
        <div className="space-y-1">
          <span className="text-[10px] text-[#864f19] font-bold uppercase tracking-widest block">State Level Supervision Desk</span>
          <h2 className="text-2xl font-black tracking-tight text-[#1b1c1c]">Welcome back, {user?.name || 'State Agent'}</h2>
          <p className="text-xs text-[#52443a] max-w-xl font-medium">
            Overall state-level monitoring, planning, analytics, and division performance tracking for {userState}.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <span className="text-[9px] text-[#52443a] font-bold uppercase block">State Coverage</span>
            <span className="text-lg font-black text-[#864f19]">{userState}</span>
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
                strokeDasharray="100, 100"
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="absolute text-[10px] font-black text-slate-800">100%</span>
          </div>
        </div>
      </div>

      {/* State Overview & KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* KPI: State Overview card */}
        <div className="bg-white p-6 rounded-[16px] border border-[#eae8e7] shadow-sm flex flex-col justify-between min-h-[120px] md:col-span-2">
          <div>
            <p className="text-[10px] text-[#52443a] font-bold uppercase tracking-wider mb-1">State Overview ({userState.toUpperCase()} REGION)</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-[#1b1c1c]">Active Coverage</span>
              <span className="text-green-600 text-xs font-bold flex items-center gap-0.5">
                <TrendingUp className="w-3.5 h-3.5" /> Live
              </span>
            </div>
          </div>
          <div className="mt-3 w-full bg-[#f6f3f2] h-1.5 rounded-full overflow-hidden">
            <div className="bg-[#864f19] h-full w-full rounded-full"></div>
          </div>
        </div>

        {/* State Performance Score */}
        <div className="bg-white p-6 rounded-[16px] border border-[#eae8e7] shadow-sm flex flex-col justify-between min-h-[120px]">
          <div>
            <p className="text-[10px] text-[#52443a] font-bold uppercase tracking-wider mb-2">State Performance Score</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-[#864f19]">{user?.performanceScore || 100}%</span>
              <span className="text-[#34647b] text-[10px] font-bold">Active Status</span>
            </div>
          </div>
        </div>

        {/* Overall Completion Percentage */}
        <div className="bg-white p-6 rounded-[16px] border border-[#eae8e7] shadow-sm flex flex-col justify-between min-h-[120px]">
          <div>
            <p className="text-[10px] text-[#52443a] font-bold uppercase tracking-wider mb-2">Assigned Territory</p>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-extrabold text-[#34647b]">{userState}</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total District Leads', val: metrics.totalDistricts.toString(), icon: <Landmark className="w-4 h-4 text-[#184c62]" />, bg: 'bg-[#c1e8ff]' },
          { label: 'Total Division Managers', val: metrics.totalDivisions.toString(), icon: <Users className="w-4 h-4 text-[#864f19]" />, bg: 'bg-[#ffdcc2]' },
          { label: 'Total Pincode Agents', val: metrics.totalPincodes.toString(), icon: <Users className="w-4 h-4 text-[#4f4635]" />, bg: 'bg-[#efe1ca]' },
          { label: 'Total Registered Vendors', val: metrics.totalVendors.toString(), icon: <Users className="w-4 h-4 text-[#184c62]" />, bg: 'bg-[#c1e8ff]' },
          { label: 'Active Vendors', val: metrics.activeVendors.toString(), icon: <CheckCircle2 className="w-4 h-4 text-[#864f19]" />, bg: 'bg-[#ffdcc2]' },
          { label: 'Pending Vendor Approvals', val: metrics.pendingVendors.toString(), icon: <Plus className="w-4 h-4 text-emerald-700" />, bg: 'bg-emerald-50' },
        ].map((card, idx) => (
          <div key={idx} className="bg-white p-4 rounded-xl border border-[#eae8e7] flex items-center justify-between shadow-sm relative overflow-hidden group">
            <div className="space-y-1">
              <span className="text-[9px] font-bold text-[#52443a] uppercase tracking-wider block">{card.label}</span>
              <span className="text-lg font-black text-[#1b1c1c]">{card.val}</span>
            </div>
            <div className={`h-8 w-8 rounded-lg ${card.bg} flex items-center justify-center`}>
              {card.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Analytics Trends */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Vendor Growth & Target Completion trends */}
        <div className="bg-white p-6 rounded-[16px] border border-[#eae8e7] shadow-sm space-y-4">
          <h3 className="font-extrabold text-sm text-[#1b1c1c] flex items-center gap-1.5">
            <BarChart2 className="w-4 h-4 text-[#864f19]" /> Trend Analysis
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-bold text-[#52443a] mb-1">
                <span>Vendor Active Rate</span>
                <span className="text-green-600">
                  {metrics.totalVendors > 0 ? Math.round((metrics.activeVendors / metrics.totalVendors) * 100) : 0}% Active
                </span>
              </div>
              <div className="w-full bg-[#f6f3f2] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${metrics.totalVendors > 0 ? Math.round((metrics.activeVendors / metrics.totalVendors) * 100) : 0}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-bold text-[#52443a] mb-1">
                <span>Territory Division Coverage</span>
                <span className="text-[#864f19]">
                  {metrics.totalDistricts > 0 ? Math.min(100, Math.round((metrics.totalDivisions / Math.max(1, metrics.totalDistricts * 2)) * 100)) : 0}% Coverage
                </span>
              </div>
              <div className="w-full bg-[#f6f3f2] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#864f19] h-full rounded-full transition-all duration-500"
                  style={{ width: `${metrics.totalDistricts > 0 ? Math.min(100, Math.round((metrics.totalDivisions / Math.max(1, metrics.totalDistricts * 2)) * 100)) : 0}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-bold text-[#52443a] mb-1">
                <span>Pending Approvals Ratio</span>
                <span className="text-[#34647b]">
                  {metrics.totalVendors > 0 ? Math.round((metrics.pendingVendors / metrics.totalVendors) * 100) : 0}% Pending
                </span>
              </div>
              <div className="w-full bg-[#f6f3f2] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#34647b] h-full rounded-full transition-all duration-500"
                  style={{ width: `${metrics.totalVendors > 0 ? Math.round((metrics.pendingVendors / metrics.totalVendors) * 100) : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* District-wise Performance list */}
        <div className="bg-white p-6 rounded-[16px] border border-[#eae8e7] shadow-sm space-y-4">
          <h3 className="font-extrabold text-sm text-[#1b1c1c]">District-wise Performance</h3>
          <div className="space-y-2">
            {districtsList.map((dist, index) => (
              <div key={index} className="flex justify-between text-xs font-semibold p-2 bg-[#fbf9f8] rounded-lg">
                <span className="text-[#52443a] truncate">{dist.name}</span>
                <span className="text-[#34647b]">{dist.val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Division-wise Performance rankings */}
        <div className="bg-white p-6 rounded-[16px] border border-[#eae8e7] shadow-sm space-y-4">
          <h3 className="font-extrabold text-sm text-[#1b1c1c]">Division-wise Performance</h3>
          <div className="space-y-2">
            {divisionsList.map((div, index) => (
              <div key={index} className="flex justify-between text-xs font-bold p-2 bg-[#fbf9f8] rounded-lg">
                <span className="text-[#52443a]">{div.name}</span>
                <span className="text-[#864f19]">{div.score}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

        {/* Management overview lists & Announcement Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Territory management sub lists */}
        <div className="lg:col-span-2 bg-white rounded-[16px] border border-[#eae8e7] shadow-sm overflow-hidden flex flex-col justify-start">
          <div className="px-6 py-4 border-b border-[#eae8e7] flex justify-between items-center bg-white">
            <div className="flex gap-4">
              <button onClick={() => setActiveTab('districts')} className={`text-xs font-extrabold uppercase pb-1 border-b-2 transition-all ${activeTab === 'districts' ? 'border-[#864f19] text-[#1b1c1c]' : 'border-transparent text-[#52443a]'}`}>District List</button>
              <button onClick={() => setActiveTab('divisions')} className={`text-xs font-extrabold uppercase pb-1 border-b-2 transition-all ${activeTab === 'divisions' ? 'border-[#864f19] text-[#1b1c1c]' : 'border-transparent text-[#52443a]'}`}>Division List</button>
              <button onClick={() => setActiveTab('rankings')} className={`text-xs font-extrabold uppercase pb-1 border-b-2 transition-all ${activeTab === 'rankings' ? 'border-[#864f19] text-[#1b1c1c]' : 'border-transparent text-[#52443a]'}`}>Agent Rankings</button>
            </div>
          </div>
          
          <div className="p-6 pt-3 divide-y divide-[#eae8e7]">
            {activeTab === 'districts' && (
              <>
                <div className="py-2.5 flex justify-between text-xs font-bold text-[#52443a]">
                  <span>District Area</span>
                  <span>Active Divisions</span>
                </div>
                {districtsList.map((item, i) => (
                  <div key={i} className="py-3 flex justify-between text-xs font-semibold">
                    <span className="text-[#1b1c1c]">{item.name}</span>
                    <span className="text-[#34647b]">{item.divs}</span>
                  </div>
                ))}
              </>
            )}

            {activeTab === 'divisions' && (
              <>
                <div className="py-2.5 flex justify-between text-xs font-bold text-[#52443a]">
                  <span>Division Name</span>
                  <span>Pincodes Assigned</span>
                </div>
                {divisionsList.map((item, i) => (
                  <div key={i} className="py-3 flex justify-between text-xs font-semibold">
                    <span className="text-[#1b1c1c]">{item.name}</span>
                    <span className="text-[#34647b]">{item.pins}</span>
                  </div>
                ))}
              </>
            )}

            {activeTab === 'rankings' && (
              <>
                <div className="py-2.5 flex justify-between text-xs font-bold text-[#52443a]">
                  <span>Top Performing Areas</span>
                  <span>Performance Rating</span>
                </div>
                {divisionsList.length === 0 ? (
                  <p className="py-6 text-center text-xs text-slate-400 font-semibold">No active rankings recorded under this state yet.</p>
                ) : (
                  divisionsList.map((item, i) => (
                    <div key={i} className="py-3 flex justify-between text-xs font-semibold">
                      <span className="text-[#1b1c1c]">{item.name}</span>
                      <span className="text-[#864f19] font-bold">{item.score}</span>
                    </div>
                  ))
                )}
              </>
            )}
          </div>
        </div>

        {/* Quick Action Announcement broadcasting form */}
        <div className="bg-white rounded-[16px] border border-[#eae8e7] shadow-sm p-6 flex flex-col justify-between space-y-4">
          <div className="border-b border-[#eae8e7] pb-3">
            <h3 className="font-extrabold text-sm text-[#1b1c1c]">State Quick Actions</h3>
            <p className="text-[10px] text-[#52443a] mt-0.5">Push announcements, view reports, or assign targets.</p>
          </div>
          
          <form onSubmit={handleBroadcast} className="space-y-3 flex-grow flex flex-col justify-between">
            <div className="space-y-1">
              <label className="block text-[9px] font-bold text-[#52443a] uppercase tracking-wider">Assign State Target Goal</label>
              <input type="text" placeholder="e.g. Target: Onboard 500 new vendors" className="w-full bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl py-2.5 px-3.5 text-xs text-[#1b1c1c] focus:outline-none focus:ring-1 focus:ring-[#864f19]" />
            </div>

            <div className="space-y-1">
              <label className="block text-[9px] font-bold text-[#52443a] uppercase tracking-wider">Broadcast Announcement text</label>
              <textarea
                value={announcementText}
                onChange={(e) => setAnnouncementText(e.target.value)}
                placeholder="Broadcast notification text to all divisions and pincodes..."
                rows={2}
                className="w-full bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl py-2.5 px-3.5 text-xs text-[#1b1c1c] focus:outline-none focus:ring-1 focus:ring-[#864f19] resize-none"
              />
            </div>

            {broadcasted && (
              <p className="text-[10px] text-green-600 font-bold text-center">Alert broadcasted successfully!</p>
            )}

            <button type="submit" className="w-full py-3.5 bg-[#864f19] hover:bg-[#a3672f] text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm transition-all border-none cursor-pointer flex items-center justify-center gap-2">
              <Send className="w-3.5 h-3.5" /> Broadcast Announcement
            </button>
          </form>
        </div>
      </div>

      {/* Reports and Notification Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Reports Download list */}
        <div className="bg-white rounded-[16px] border border-[#eae8e7] shadow-sm p-6 space-y-4">
          <div className="border-b border-[#eae8e7] pb-3">
            <h3 className="font-extrabold text-sm text-[#1b1c1c]">Statewide Reports Center</h3>
          </div>
          
          <div className="space-y-3">
            {[
              { title: 'State Report', desc: 'Overall state-level KPI performance logs' },
              { title: 'Vendor Report', desc: 'Active/inactive merchant statistics & verification logs' },
              { title: 'Agent Performance Report', desc: 'Division/District rankings efficiency score' },
              { title: 'Target Report', desc: 'Assigned, completed, pending, and overdue targets logs' }
            ].map((rep, idx) => (
              <div key={idx} className="flex justify-between items-center p-3 bg-[#fbf9f8] rounded-xl border border-[#eae8e7]/55">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-[#1b1c1c]">{rep.title}</span>
                  <p className="text-[10px] text-[#52443a]">{rep.desc}</p>
                </div>
                <button 
                  onClick={() => downloadReport(rep.title, user?.role || 'state', user)}
                  title={`Download ${rep.title}`}
                  className="p-2 bg-white text-[#864f19] border border-[#d7c3b5]/50 rounded-lg hover:bg-[#864f19] hover:text-white transition cursor-pointer flex items-center justify-center shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Notifications and Announcements alerts */}
        <div className="bg-white rounded-[16px] border border-[#eae8e7] shadow-sm p-6 space-y-4">
          <div className="border-b border-[#eae8e7] pb-3">
            <h3 className="font-extrabold text-sm text-[#1b1c1c]">Escalated Alerts & Notifications</h3>
          </div>
          
          <div className="space-y-3">
            <div className="p-4 text-center text-xs text-[#52443a] italic bg-[#fbf9f8] rounded-xl border border-dashed border-[#eae8e7]">
              All escalated state alerts & notifications cleared.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StateDashboard;
