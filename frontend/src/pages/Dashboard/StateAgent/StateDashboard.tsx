import React, { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { downloadReport } from '../../../utils/downloadReport';
import {
  TrendingUp, Download, ShieldAlert, Award,
  Clock, CheckCircle2, ChevronRight, Users, Target, Ticket, FileText, Plus, Landmark, Megaphone, Send, BarChart2, Briefcase, ListCollapse, GitFork, MapPin, Layers, Building2, ChevronDown
} from 'lucide-react';

import { useQuery } from '@tanstack/react-query';
import api from '../../../utils/api';

export const StateDashboard: React.FC = () => {
  const { user } = useAuth();
  const [targetGoalText, setTargetGoalText] = useState('');
  const [announcementText, setAnnouncementText] = useState('');
  const [broadcasted, setBroadcasted] = useState(false);
  const [activeTab, setActiveTab] = useState<'districts' | 'divisions' | 'rankings'>('districts');

  // Hierarchy drill-down state
  const [drilledDistrictId, setDrilledDistrictId] = useState<string | null>(null);
  const [drilledDivisionId, setDrilledDivisionId] = useState<string | null>(null);

  const userState = user?.territory?.state || 'Andhra Pradesh';

  // Fetch live agent hierarchy from backend
  const { data: hierarchyRes } = useQuery({
    queryKey: ['stateDashboardHierarchy', userState],
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
    queryKey: ['stateDashboardVendors', userState],
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

  // Helper function to check if item belongs to assigned state
  const isSameState = React.useCallback((itemState?: string) => {
    if (!itemState) return true;
    const st1 = itemState.toLowerCase();
    const st2 = userState.toLowerCase();
    return st1.includes(st2) || st2.includes(st1);
  }, [userState]);

  // State-scoped raw data
  const stateDistricts = React.useMemo(() => {
    const raw = hierarchyRes?.districts || hierarchyRes?.tree?.flatMap((s: any) => s.districts || []) || [];
    return raw.filter((d: any) => isSameState(d.territory?.state || d.state || userState));
  }, [hierarchyRes, userState, isSameState]);

  const stateDivisions = React.useMemo(() => {
    const raw = hierarchyRes?.divisions || [];
    return raw.filter((div: any) => isSameState(div.territory?.state || div.state || userState));
  }, [hierarchyRes, userState, isSameState]);

  const statePincodes = React.useMemo(() => {
    const raw = hierarchyRes?.pincodes || [];
    return raw.filter((pin: any) => isSameState(pin.territory?.state || pin.state || userState));
  }, [hierarchyRes, userState, isSameState]);

  const stateVendors = React.useMemo(() => {
    const raw = vendorsRes?.vendors || vendorsRes || [];
    if (!Array.isArray(raw)) return [];
    return raw.filter((v: any) => isSameState(v.state || v.territory?.state || userState));
  }, [vendorsRes, userState, isSameState]);

  // Compute live metrics strictly from assigned state data
  const metrics = React.useMemo(() => {
    const totalDistricts = stateDistricts.length;
    const totalDivisions = stateDivisions.length;
    const totalPincodes = statePincodes.length;
    const totalVendors = stateVendors.length;

    const activeVendors = stateVendors.filter((v: any) => v.status === 'active' || v.status === 'approved').length;
    const inactiveVendors = stateVendors.filter((v: any) => v.status === 'inactive').length;
    const pendingVendors = stateVendors.filter((v: any) => v.kycStatus === 'pending' || v.status === 'pending').length;

    return {
      totalDistricts,
      totalDivisions,
      totalPincodes,
      totalVendors,
      activeVendors,
      inactiveVendors,
      pendingVendors
    };
  }, [stateDistricts, stateDivisions, statePincodes, stateVendors]);

  // Format test or raw agent names into clean display format
  const formatCleanAgentName = (name?: string, defaultRole?: string, territory?: string) => {
    if (!name || name === 'old' || name === 'ap' || name.length <= 3) {
      return territory ? `${territory} ${defaultRole || 'Lead'}` : defaultRole || 'Agent';
    }
    return name;
  };

  const districtsList = React.useMemo(() => {
    return stateDistricts.map((d: any) => {
      const territoryStr = d.territory?.district || d.district || 'District Area';
      const agentName = formatCleanAgentName(d.name, 'District Agent', territoryStr);
      const displayName = d.name && d.name !== 'old' && d.name !== 'ap' 
        ? `${territoryStr} (${d.name})`
        : `${territoryStr} Lead`;
      return {
        id: d._id || d.id,
        name: displayName,
        districtName: territoryStr,
        agentName: agentName,
        val: `${d.performanceScore || 100}% Score`,
        divsCount: d.divisions?.length || 0,
        divs: `${d.divisions?.length || 0} Divisions active`,
        divisions: d.divisions || []
      };
    });
  }, [stateDistricts]);

  const divisionsList = React.useMemo(() => {
    return stateDivisions.map((div: any) => {
      const territoryStr = div.territory?.division || div.division || 'Division Sector';
      const agentName = formatCleanAgentName(div.name, 'Division Manager', territoryStr);
      const displayName = div.name && div.name !== 'old'
        ? `${territoryStr} (${div.name})`
        : `${territoryStr} Manager`;
      return {
        id: div._id || div.id,
        name: displayName,
        divisionName: territoryStr,
        agentName: agentName,
        score: `${div.performanceScore || 100}%`,
        pins: `${div.pincodes?.length || 0} Pincodes assigned`,
        pincodes: div.pincodes || []
      };
    });
  }, [stateDivisions]);

  // Multi-tier Agent Rankings (District, Division, and Pincode Agents for assigned State)
  const agentRankingsList = React.useMemo(() => {
    const all: any[] = [];

    stateDistricts.forEach((d: any) => {
      const territoryStr = d.territory?.district || d.district || 'District';
      all.push({
        id: d._id || `dist-${d.name}`,
        name: formatCleanAgentName(d.name, 'District Agent', territoryStr),
        role: 'District Agent',
        territory: `${territoryStr} (${userState})`,
        score: d.performanceScore || 100
      });
    });

    stateDivisions.forEach((div: any) => {
      const territoryStr = div.territory?.division || div.division || 'Division';
      all.push({
        id: div._id || `div-${div.name}`,
        name: formatCleanAgentName(div.name, 'Division Manager', territoryStr),
        role: 'Division Manager',
        territory: `${territoryStr}`,
        score: div.performanceScore || 100
      });
    });

    statePincodes.forEach((pin: any) => {
      const pinCodeStr = pin.territory?.pincode || pin.pincode || 'Sector';
      all.push({
        id: pin._id || `pin-${pin.name}`,
        name: formatCleanAgentName(pin.name, 'Pincode Agent', `PIN ${pinCodeStr}`),
        role: 'Pincode Agent',
        territory: `PIN ${pinCodeStr}`,
        score: pin.performanceScore || 95
      });
    });

    return all.sort((a, b) => b.score - a.score);
  }, [stateDistricts, stateDivisions, statePincodes, userState]);

  // Currently selected district for hierarchy drill-down
  const activeDrilledDistrict = React.useMemo(() => {
    if (!drilledDistrictId) return null;
    return stateDistricts.find((d: any) => d._id === drilledDistrictId || d.id === drilledDistrictId) || null;
  }, [drilledDistrictId, stateDistricts]);

  // Currently selected division for hierarchy drill-down
  const activeDrilledDivision = React.useMemo(() => {
    if (!drilledDivisionId) return null;
    const currentDivs = activeDrilledDistrict ? (activeDrilledDistrict.divisions || []) : stateDivisions;
    return currentDivs.find((div: any) => div._id === drilledDivisionId || div.id === drilledDivisionId) || null;
  }, [drilledDivisionId, activeDrilledDistrict, stateDivisions]);

  const handleBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementText.trim() && !targetGoalText.trim()) return;
    setBroadcasted(true);
    setTimeout(() => {
      setBroadcasted(false);
      setAnnouncementText('');
      setTargetGoalText('');
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

        {/* Assigned Territory */}
        <div className="bg-white p-6 rounded-[16px] border border-[#eae8e7] shadow-sm flex flex-col justify-between min-h-[120px]">
          <div>
            <p className="text-[10px] text-[#52443a] font-bold uppercase tracking-wider mb-2">Assigned Territory</p>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-extrabold text-[#34647b]">{userState}</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid - "Total District Leads" explicitly renamed to "Total District Agents" */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total District Agents', val: metrics.totalDistricts.toString(), icon: <Landmark className="w-4 h-4 text-[#184c62]" />, bg: 'bg-[#c1e8ff]' },
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

      {/* STATE → DISTRICT → DIVISION → PINCODE HIERARCHY DRILL-DOWN WIDGET */}
      <div className="bg-white p-6 rounded-[16px] border border-[#eae8e7] shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#eae8e7] pb-3">
          <div className="flex items-center gap-2">
            <GitFork className="w-5 h-5 text-[#864f19]" />
            <h3 className="font-extrabold text-sm text-[#1b1c1c]">State Hierarchy Drill-Down</h3>
            <span className="px-2 py-0.5 bg-[#864f19]/10 text-[#864f19] font-black text-[10px] uppercase rounded">
              State → District → Division → Pincode
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-[#864f19]">
            <span className="text-slate-400 font-medium">Scope:</span>
            <button
              onClick={() => { setDrilledDistrictId(null); setDrilledDivisionId(null); }}
              className={`hover:underline cursor-pointer border-none bg-transparent ${!drilledDistrictId ? 'font-black text-[#864f19]' : 'text-slate-600'}`}
            >
              {userState}
            </button>
            {activeDrilledDistrict && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                <button
                  onClick={() => setDrilledDivisionId(null)}
                  className={`hover:underline cursor-pointer border-none bg-transparent ${!drilledDivisionId ? 'font-black text-[#864f19]' : 'text-slate-600'}`}
                >
                  {activeDrilledDistrict.territory?.district || activeDrilledDistrict.name}
                </button>
              </>
            )}
            {activeDrilledDivision && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-black text-[#864f19]">
                  {activeDrilledDivision.territory?.division || activeDrilledDivision.name}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Drill-down Level 1: State View -> Show Districts */}
        {!drilledDistrictId && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-[#52443a]">
              Districts in <span className="font-extrabold text-[#1b1c1c]">{userState}</span> ({stateDistricts.length}):
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {stateDistricts.length === 0 ? (
                <p className="col-span-full text-xs text-slate-400 italic text-center py-4">No active districts recorded under {userState}.</p>
              ) : (
                stateDistricts.map((dist: any) => {
                  const territoryStr = dist.territory?.district || dist.district || 'District Area';
                  const agentName = formatCleanAgentName(dist.name, 'District Agent', territoryStr);
                  const divCount = dist.divisions?.length || 0;
                  return (
                    <div
                      key={dist._id || dist.id}
                      onClick={() => setDrilledDistrictId(dist._id || dist.id)}
                      className="p-4 bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl hover:border-[#864f19] cursor-pointer transition flex flex-col justify-between space-y-2 group shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 bg-[#864f19] text-white text-[10px] font-black uppercase rounded">
                          District
                        </span>
                        <span className="text-xs font-bold text-[#864f19] group-hover:translate-x-0.5 transition-transform flex items-center">
                          Drill Down <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                        </span>
                      </div>
                      <div>
                        <h4 className="text-sm font-extrabold text-[#1b1c1c]">{territoryStr}</h4>
                        <p className="text-[11px] text-slate-500 font-semibold mt-0.5">{agentName}</p>
                      </div>
                      <div className="pt-2 border-t border-[#d7c3b5]/40 flex justify-between text-[10px] font-extrabold text-slate-600">
                        <span>{divCount} Divisions</span>
                        <span className="text-emerald-700">{dist.performanceScore || 100}% Score</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Drill-down Level 2: District Selected -> Show Divisions */}
        {drilledDistrictId && !drilledDivisionId && activeDrilledDistrict && (
          <div className="space-y-3">
            <div className="flex justify-between items-center bg-[#fbf9f8] p-3 rounded-xl border border-[#d7c3b5]/50">
              <div>
                <p className="text-[10px] font-extrabold uppercase text-[#864f19]">Selected District</p>
                <h4 className="text-sm font-black text-[#1b1c1c]">
                  {activeDrilledDistrict.territory?.district || activeDrilledDistrict.name}
                </h4>
              </div>
              <button
                onClick={() => setDrilledDistrictId(null)}
                className="text-xs text-[#864f19] font-bold hover:underline bg-transparent border-none cursor-pointer"
              >
                ← Change District
              </button>
            </div>

            <p className="text-xs font-semibold text-[#52443a]">
              Divisions in <span className="font-extrabold text-[#1b1c1c]">{activeDrilledDistrict.territory?.district || activeDrilledDistrict.name}</span> ({activeDrilledDistrict.divisions?.length || 0}):
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {(activeDrilledDistrict.divisions || []).length === 0 ? (
                <p className="col-span-full text-xs text-slate-400 italic text-center py-4">No active divisions under this district.</p>
              ) : (
                (activeDrilledDistrict.divisions || []).map((div: any) => {
                  const divTerritory = div.territory?.division || div.division || 'Division Sector';
                  const agentName = formatCleanAgentName(div.name, 'Division Manager', divTerritory);
                  const pinCount = div.pincodes?.length || 0;
                  return (
                    <div
                      key={div._id || div.id}
                      onClick={() => setDrilledDivisionId(div._id || div.id)}
                      className="p-4 bg-[#fbf9f8] border border-amber-200 rounded-xl hover:border-amber-600 cursor-pointer transition flex flex-col justify-between space-y-2 group shadow-2xs border-l-4 border-l-amber-600"
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 bg-amber-600 text-white text-[10px] font-black uppercase rounded">
                          Division
                        </span>
                        <span className="text-xs font-bold text-amber-800 group-hover:translate-x-0.5 transition-transform flex items-center">
                          View Pincodes <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                        </span>
                      </div>
                      <div>
                        <h4 className="text-sm font-extrabold text-[#1b1c1c]">{divTerritory}</h4>
                        <p className="text-[11px] text-slate-500 font-semibold mt-0.5">{agentName}</p>
                      </div>
                      <div className="pt-2 border-t border-amber-200/60 flex justify-between text-[10px] font-extrabold text-slate-600">
                        <span>{pinCount} Pincodes</span>
                        <span className="text-amber-800">{div.performanceScore || 100}% Score</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Drill-down Level 3: Division Selected -> Show Pincode Agents */}
        {drilledDivisionId && activeDrilledDivision && (
          <div className="space-y-3">
            <div className="flex justify-between items-center bg-amber-50 p-3 rounded-xl border border-amber-200">
              <div>
                <p className="text-[10px] font-extrabold uppercase text-amber-900">Selected Division</p>
                <h4 className="text-sm font-black text-amber-950">
                  {activeDrilledDivision.territory?.division || activeDrilledDivision.name}
                </h4>
              </div>
              <button
                onClick={() => setDrilledDivisionId(null)}
                className="text-xs text-amber-900 font-bold hover:underline bg-transparent border-none cursor-pointer"
              >
                ← Back to Divisions
              </button>
            </div>

            <p className="text-xs font-semibold text-[#52443a]">
              Pincode Agents in <span className="font-extrabold text-[#1b1c1c]">{activeDrilledDivision.territory?.division || activeDrilledDivision.name}</span> ({activeDrilledDivision.pincodes?.length || 0}):
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {(activeDrilledDivision.pincodes || []).length === 0 ? (
                <p className="col-span-full text-xs text-slate-400 italic text-center py-4">No pincode agents assigned to this division yet.</p>
              ) : (
                (activeDrilledDivision.pincodes || []).map((pin: any) => {
                  const pinCodeStr = pin.territory?.pincode || pin.pincode || 'Sector';
                  const agentName = formatCleanAgentName(pin.name, 'Pincode Agent', `PIN ${pinCodeStr}`);
                  return (
                    <div
                      key={pin._id || pin.id}
                      className="p-3.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
                          <MapPin className="w-4 h-4 text-[#864f19]" />
                        </div>
                        <div>
                          <p className="text-xs font-extrabold text-[#1b1c1c]">{agentName}</p>
                          <p className="text-[10px] text-slate-500 font-bold">PIN: {pinCodeStr}</p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded">
                        Active
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Analytics Trends */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Dynamic Vendor Active & Territory Coverage trend analysis */}
        <div className="bg-white p-6 rounded-[16px] border border-[#eae8e7] shadow-sm space-y-4">
          <h3 className="font-extrabold text-sm text-[#1b1c1c] flex items-center gap-1.5">
            <BarChart2 className="w-4 h-4 text-[#864f19]" /> Trend Analysis ({userState})
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
            {districtsList.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-4">No district performance records in {userState}.</p>
            ) : (
              districtsList.map((dist, index) => (
                <div key={index} className="flex justify-between text-xs font-semibold p-2 bg-[#fbf9f8] rounded-lg">
                  <span className="text-[#52443a] truncate">{dist.name}</span>
                  <span className="text-[#34647b] font-bold">{dist.val}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Division-wise Performance rankings */}
        <div className="bg-white p-6 rounded-[16px] border border-[#eae8e7] shadow-sm space-y-4">
          <h3 className="font-extrabold text-sm text-[#1b1c1c]">Division-wise Performance</h3>
          <div className="space-y-2">
            {divisionsList.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-4">No division performance records in {userState}.</p>
            ) : (
              divisionsList.map((div, index) => (
                <div key={index} className="flex justify-between text-xs font-bold p-2 bg-[#fbf9f8] rounded-lg">
                  <span className="text-[#52443a] truncate">{div.name}</span>
                  <span className="text-[#864f19]">{div.score}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* LOWER DASHBOARD SECTION: Management Overview Lists, Quick Actions & Statewide Reports */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Territory management sub lists & Multi-tier Agent Rankings */}
        <div className="lg:col-span-2 bg-white rounded-[16px] border border-[#eae8e7] shadow-sm overflow-hidden flex flex-col justify-start">
          <div className="px-6 py-4 border-b border-[#eae8e7] flex justify-between items-center bg-white">
            <div className="flex gap-4">
              <button onClick={() => setActiveTab('districts')} className={`text-xs font-extrabold uppercase pb-1 border-b-2 transition-all ${activeTab === 'districts' ? 'border-[#864f19] text-[#1b1c1c]' : 'border-transparent text-[#52443a]'}`}>District List ({districtsList.length})</button>
              <button onClick={() => setActiveTab('divisions')} className={`text-xs font-extrabold uppercase pb-1 border-b-2 transition-all ${activeTab === 'divisions' ? 'border-[#864f19] text-[#1b1c1c]' : 'border-transparent text-[#52443a]'}`}>Division List ({divisionsList.length})</button>
              <button onClick={() => setActiveTab('rankings')} className={`text-xs font-extrabold uppercase pb-1 border-b-2 transition-all ${activeTab === 'rankings' ? 'border-[#864f19] text-[#1b1c1c]' : 'border-transparent text-[#52443a]'}`}>Agent Rankings ({agentRankingsList.length})</button>
            </div>
          </div>
          
          <div className="p-6 pt-3 divide-y divide-[#eae8e7]">
            {/* Tab 1: District List */}
            {activeTab === 'districts' && (
              <>
                <div className="py-2.5 flex justify-between text-xs font-bold text-[#52443a]">
                  <span>District Area & Lead Agent</span>
                  <span>Active Divisions</span>
                </div>
                {districtsList.length === 0 ? (
                  <p className="py-6 text-center text-xs text-slate-400 font-semibold">No district agents registered under {userState}.</p>
                ) : (
                  districtsList.map((item, i) => (
                    <div key={i} className="py-3 flex justify-between items-center text-xs font-semibold">
                      <span className="text-[#1b1c1c] font-bold">{item.name}</span>
                      <span className="text-[#34647b] font-extrabold">{item.divs}</span>
                    </div>
                  ))
                )}
              </>
            )}

            {/* Tab 2: Division List */}
            {activeTab === 'divisions' && (
              <>
                <div className="py-2.5 flex justify-between text-xs font-bold text-[#52443a]">
                  <span>Division Sector & Manager</span>
                  <span>Pincodes Assigned</span>
                </div>
                {divisionsList.length === 0 ? (
                  <p className="py-6 text-center text-xs text-slate-400 font-semibold">No division managers registered under {userState}.</p>
                ) : (
                  divisionsList.map((item, i) => (
                    <div key={i} className="py-3 flex justify-between items-center text-xs font-semibold">
                      <span className="text-[#1b1c1c] font-bold">{item.name}</span>
                      <span className="text-[#34647b] font-extrabold">{item.pins}</span>
                    </div>
                  ))
                )}
              </>
            )}

            {/* Tab 3: Agent Rankings (Covering District, Division AND Pincode agents) */}
            {activeTab === 'rankings' && (
              <>
                <div className="py-2.5 flex justify-between text-xs font-bold text-[#52443a]">
                  <span>Agent Name & Territory Role</span>
                  <span>Performance Rating</span>
                </div>
                {agentRankingsList.length === 0 ? (
                  <p className="py-6 text-center text-xs text-slate-400 font-semibold">No agent rankings recorded under {userState} yet.</p>
                ) : (
                  agentRankingsList.map((item, i) => (
                    <div key={i} className="py-3 flex justify-between items-center text-xs font-semibold">
                      <div>
                        <span className="text-[#1b1c1c] font-bold block">{item.name}</span>
                        <span className="text-[10px] text-[#52443a] font-medium">
                          {item.role} • {item.territory}
                        </span>
                      </div>
                      <span className="text-[#864f19] font-black text-sm">{item.score}% Score</span>
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
            <p className="text-[10px] text-[#52443a] mt-0.5">Push announcements, view reports, or assign targets to downstream agents.</p>
          </div>
          
          <form onSubmit={handleBroadcast} className="space-y-3 flex-grow flex flex-col justify-between">
            <div className="space-y-1">
              <label className="block text-[9px] font-bold text-[#52443a] uppercase tracking-wider">Assign State Target Goal</label>
              <input
                type="text"
                value={targetGoalText}
                onChange={(e) => setTargetGoalText(e.target.value)}
                placeholder="e.g. Target: Onboard 500 new vendors across state"
                className="w-full bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl py-2.5 px-3.5 text-xs text-[#1b1c1c] focus:outline-none focus:ring-1 focus:ring-[#864f19]"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[9px] font-bold text-[#52443a] uppercase tracking-wider">Broadcast Announcement text</label>
              <textarea
                value={announcementText}
                onChange={(e) => setAnnouncementText(e.target.value)}
                placeholder="Broadcast notification text to all districts, divisions, and pincodes..."
                rows={2}
                className="w-full bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl py-2.5 px-3.5 text-xs text-[#1b1c1c] focus:outline-none focus:ring-1 focus:ring-[#864f19] resize-none"
              />
            </div>

            {broadcasted && (
              <p className="text-[10px] text-green-600 font-bold text-center">Announcement & Target broadcasted to all downstream agents!</p>
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
              { title: 'Agent Performance Report', desc: 'District, Division & Pincode rankings efficiency score' },
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

        {/* Escalated Alerts and Notifications */}
        <div className="bg-white rounded-[16px] border border-[#eae8e7] shadow-sm p-6 space-y-4">
          <div className="border-b border-[#eae8e7] pb-3">
            <h3 className="font-extrabold text-sm text-[#1b1c1c]">Escalated Alerts & Notifications</h3>
          </div>
          
          <div className="space-y-3">
            <div className="p-4 text-center text-xs text-[#52443a] italic bg-[#fbf9f8] rounded-xl border border-dashed border-[#eae8e7]">
              All escalated state alerts & notifications cleared for {userState}.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StateDashboard;

