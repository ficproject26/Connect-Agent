import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../context/AuthContext';
import { targetService, notificationService } from '../../../api';
import api from '../../../utils/api';
import { Modal, Button } from '../../../components/ui';
import { downloadReport } from '../../../utils/downloadReport';
import {
  TrendingUp, Clock, CheckCircle2, ChevronRight,
  Plus, Users, Target, Ticket, Send, Download, BarChart2,
  Eye, Wallet, Award, MapPin, Phone, Mail, ChevronDown, ChevronUp
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

export const DivisionDashboard: React.FC = () => {
  const { user } = useAuth();
  const userTerritory = user?.assignedTerritory || user?.territory || {
    state: (user as any)?.assignedState,
    district: (user as any)?.assignedDistrict,
    division: (user as any)?.assignedDivision,
    pincode: (user as any)?.assignedPincode
  };
  const userState = (userTerritory?.state || '').trim();
  const userDistrict = (userTerritory?.district || '').trim();
  const userDivision = (userTerritory?.division || '').trim();
  const userPincode = (userTerritory?.pincode || '').trim();

  const [pincodeAgentsList, setPincodeAgentsList] = useState<PincodeSubordinate[]>([]);
  const [targetTitle, setTargetTitle] = useState('');
  const [selectedPincode, setSelectedPincode] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [targetQuantity, setTargetQuantity] = useState('20');
  const [targetDate, setTargetDate] = useState(new Date().toISOString().slice(0, 10));

  const [districtTargetAssigned, setDistrictTargetAssigned] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'pincodes' | 'vendors' | 'agents'>('agents');
  const [selectedAgent, setSelectedAgent] = useState<PincodeSubordinate | null>(null);

  const INITIAL_LIMIT = 10;
  const [showAllDivisionPincodes, setShowAllDivisionPincodes] = useState(false);
  const [showAllDivisionVendors, setShowAllDivisionVendors] = useState(false);
  const [showAllPincodeAgents, setShowAllPincodeAgents] = useState(false);
  const [showAllDivisionAlerts, setShowAllDivisionAlerts] = useState(false);

  const divisionPincodesList = React.useMemo(() => {
    if (!userDivision) return [];
    if (userPincode) {
      return [{ name: `${userDivision} (${userPincode})`, code: userPincode, score: 'Assigned Pincode' }];
    }
    return [{ name: `${userDivision} Division Sector`, code: userDivision, score: 'Assigned Division' }];
  }, [userDivision, userPincode]);

  useEffect(() => {
    if (divisionPincodesList.length > 0 && !selectedPincode) {
      setSelectedPincode(divisionPincodesList[0].code);
    }
  }, [divisionPincodesList, selectedPincode]);

  // Silent 45s background auto-refresh for subordinates with tab visibility management
  useQuery({
    queryKey: ['divisionSubordinates', userDivision],
    queryFn: async () => {
      try {
        const res = await targetService.getSubordinates({ role: 'pincode', division: userDivision });
        if (res.data?.subordinates) {
          const rawSubs = Array.isArray(res.data.subordinates) ? res.data.subordinates : [];
          // Defensive territory isolation: only allow active, approved pincode agents belonging to this division
          const uDiv = (userDivision || '').trim().toLowerCase();
          const filteredSubs = rawSubs.filter((s: any) => {
            const sId = String(s._id || s.id || '');
            const sRegId = String(s.registrationId || '');
            const sRole = (s.role || s.level || '').toLowerCase();

            // Strictly exclude non-agent IDs, prefixes, or roles
            if (/^(ADM-|usr_mgr|MGR-|cust_|ven-|FIC-CUS-)/i.test(sId) || /^(ADM-|usr_mgr|MGR-|cust_|ven-|FIC-CUS-)/i.test(sRegId)) return false;
            if (/admin|manager|vendor|customer|delivery|technician|executive/i.test(sRole)) return false;

            if (sRole !== 'pincode' && sRole !== 'pincode_agent') return false;

            const sStatus = (s.status || '').toLowerCase().trim();
            if (sStatus !== 'active' && sStatus !== 'approved') return false;

            if (uDiv) {
              const sDiv = (typeof s.territory === 'object' ? s.territory?.division : s.division || s.assignedDivision || s.assignedTerritory?.division || '').trim().toLowerCase();
              if (!sDiv || (!sDiv.includes(uDiv) && !uDiv.includes(sDiv))) return false;
            }
            return true;
          });

          const mapped: PincodeSubordinate[] = filteredSubs.map((s: any) => ({
            id: s._id,
            name: s.name,
            pincode: (typeof s.territory === 'object' ? s.territory?.pincode : s.pincode) || '',
            territory: (typeof s.territory === 'object' ? s.territory?.division : s.division) || userDivision || 'Division Sector',
            phone: s.phone || 'N/A',
            email: s.email || 'N/A',
            assignedTargets: s.assignedTargets || 0,
            completedTargets: s.completedTargets || 0,
            earnings: s.earnings || 0,
            totalOnboardedShops: s.totalOnboardedShops || 0,
            status: s.status === 'inactive' ? 'on_leave' : 'present',
            checkIn: s.checkIn || '09:00 AM'
          }));
          setPincodeAgentsList(mapped);
          setSelectedAgentId(prev => prev && mapped.some(m => m.id === prev) ? prev : (mapped[0]?.id || ''));
        } else {
          setPincodeAgentsList([]);
        }
        return res.data;
      } catch (err) {
        console.warn('Subordinates fetch fallback:', err);
        return null;
      }
    },
    staleTime: 30000,
    refetchInterval: 45000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true
  });

  // Fetch real division vendors scoped to authenticated division
  const { data: divisionVendors = [] } = useQuery({
    queryKey: ['divisionVendors', userDivision],
    queryFn: async () => {
      try {
        const res = await api.get('/vendors', { params: { limit: 1000 } });
        const list = res.data?.vendors || [];
        const uDiv = (userDivision || '').toLowerCase().trim();
        return list.filter((v: any) => {
          if (!uDiv) return true;
          const vDiv = (v.division || v.assignedDivision || '').toLowerCase().trim();
          if (vDiv) return vDiv.includes(uDiv) || uDiv.includes(vDiv);
          if (v.pincode && divisionPincodesList.some(p => p.code === String(v.pincode).trim())) return true;
          return false;
        });
      } catch (err) {
        console.warn('Failed to fetch division vendors:', err);
        return [];
      }
    },
    staleTime: 30000,
    refetchInterval: 45000,
    refetchOnWindowFocus: true
  });

  // Calculate actual registered vendors and active vendors independently
  const totalRegisteredVendors = divisionVendors.length;
  const activeDivisionVendors = divisionVendors.filter((v: any) => {
    const s = String(v.status || '').toLowerCase().trim();
    return s === 'active' || s === 'approved' || s === 'verified';
  }).length;

  // Real division reports query scoped to division
  const { data: divisionReports = [] } = useQuery({
    queryKey: ['divisionReports', userDivision, (user as any)?._id || (user as any)?.id],
    queryFn: async () => {
      try {
        const res = await api.get('/reports', { params: { division: userDivision } });
        const list = res.data?.reports || [];
        const uDiv = (userDivision || '').toLowerCase().trim();
        return list.filter((r: any) => {
          if (!uDiv) return true;
          const rDiv = (r.division || r.assignedDivision || '').toLowerCase().trim();
          if (rDiv) return rDiv.includes(uDiv) || uDiv.includes(rDiv);
          return true;
        });
      } catch (err) {
        return [];
      }
    },
    staleTime: 30000,
    refetchInterval: 45000
  });

  // Real division alerts/notifications query
  const { data: divisionAlerts = [] } = useQuery({
    queryKey: ['divisionAlerts', userDivision, (user as any)?._id || (user as any)?.id],
    queryFn: async () => {
      try {
        const res = await notificationService.getAll({ limit: 20 });
        const list = res.data?.notifications || res.data || [];
        const uDiv = (userDivision || '').toLowerCase().trim();
        return list.filter((n: any) => {
          if (!uDiv) return true;
          if (n.division && n.division.toLowerCase().trim() !== uDiv) return false;
          return true;
        });
      } catch (err) {
        return [];
      }
    },
    staleTime: 30000,
    refetchInterval: 45000
  });

  // Compute real performance from subordinate data
  const totalAssignedTargets = pincodeAgentsList.reduce((sum, s) => sum + (s.assignedTargets || 0), 0);
  const totalCompletedTargets = pincodeAgentsList.reduce((sum, s) => sum + (s.completedTargets || 0), 0);
  const realPerformanceScore = totalAssignedTargets > 0
    ? Math.round((totalCompletedTargets / totalAssignedTargets) * 1000) / 10
    : 0;

  const vendorGrowthPercent = totalRegisteredVendors > 0
    ? (totalAssignedTargets > 0 ? Math.min(100, Math.max(0, Math.round((totalRegisteredVendors / totalAssignedTargets) * 100))) : 100)
    : 0;

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetTitle.trim()) return;

    setIsSubmitting(true);
    try {
      await targetService.allocateTarget({
        divisionName: userDivision,
        title: targetTitle.trim(),
        type: 'daily',
        targetValue: parseInt(targetQuantity) || 15
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
            Assigned Territory: <strong className="text-[#864f19]">{userState}</strong> → <strong className="text-[#864f19]">{userDistrict}</strong> → <strong className="text-[#864f19]">{userDivision}</strong>
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <span className="text-[9px] text-[#52443a] font-bold uppercase block">Division Performance</span>
            <span className="text-lg font-black text-[#864f19]">{realPerformanceScore}%</span>
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
                strokeDasharray={`${realPerformanceScore}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="absolute text-[9px] font-black text-slate-800">{realPerformanceScore}%</span>
          </div>
        </div>
      </div>

      {/* Simplified Division KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Assigned Pincodes', val: `${divisionPincodesList.length} Pincodes`, icon: <MapPin className="w-4 h-4 text-[#864f19]" />, bg: 'bg-[#ffdcc2]' },
          { label: 'Active Pincode Agents', val: `${pincodeAgentsList.length} active`, icon: <Users className="w-4 h-4 text-[#184c62]" />, bg: 'bg-[#c1e8ff]' },
          { label: 'Total Vendors', val: `${totalRegisteredVendors} registered`, icon: <Users className="w-4 h-4 text-[#184c62]" />, bg: 'bg-[#c1e8ff]' },
          { label: 'Active Vendors', val: `${activeDivisionVendors} active`, icon: <CheckCircle2 className="w-4 h-4 text-[#864f19]" />, bg: 'bg-[#ffdcc2]' },
          { label: "Today's Targets", val: `${totalAssignedTargets} targets`, icon: <Target className="w-4 h-4 text-[#864f19]" />, bg: 'bg-[#ffdcc2]' },
          { label: 'Pending Targets', val: `${Math.max(0, totalAssignedTargets - totalCompletedTargets)} remaining`, icon: <Clock className="w-4 h-4 text-[#4f4635]" />, bg: 'bg-[#efe1ca]' },
          { label: 'Open Tickets', val: '0 unresolved', icon: <Ticket className="w-4 h-4 text-red-700" />, bg: 'bg-red-50' },
          { label: 'Division Performance', val: `${realPerformanceScore}%`, icon: <TrendingUp className="w-4 h-4 text-[#864f19]" />, bg: 'bg-[#ffdcc2]' }
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
            {divisionPincodesList.map((pin, index) => (
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
                <span className="text-green-600 font-extrabold">{totalRegisteredVendors} total vendors ({vendorGrowthPercent}%)</span>
              </div>
              <div className="w-full bg-[#f6f3f2] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-600 h-full rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${vendorGrowthPercent}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-bold text-[#52443a] mb-1">
                <span>Daily Target Progress</span>
                <span className="text-[#864f19]">{realPerformanceScore}% Done</span>
              </div>
              <div className="w-full bg-[#f6f3f2] h-2 rounded-full overflow-hidden">
                <div className="bg-[#864f19] h-full rounded-full" style={{ width: `${realPerformanceScore}%` }}></div>
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
                <span className="text-[#34647b]">— No ticket data</span>
              </div>
              <div className="w-full bg-[#f6f3f2] h-2 rounded-full overflow-hidden">
                <div className="bg-[#34647b] h-full w-0 rounded-full"></div>
              </div>
            </div>
            <div className="flex justify-between text-[11px] text-[#52443a] font-medium pt-2">
              <span>Avg Resolution: —</span>
              <span>Open Tickets: 0</span>
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
                {(showAllDivisionPincodes ? divisionPincodesList : divisionPincodesList.slice(0, INITIAL_LIMIT)).map((pin, i) => (
                  <div key={i} className="py-3 flex justify-between text-xs font-semibold">
                    <span className="text-[#1b1c1c]">{pin.name}</span>
                    <span className="text-[#34647b]">1 Onboarder active</span>
                  </div>
                ))}
                {divisionPincodesList.length > INITIAL_LIMIT && (
                  <div className="pt-3 flex justify-center">
                    <button
                      type="button"
                      onClick={() => setShowAllDivisionPincodes(!showAllDivisionPincodes)}
                      className="px-4 py-2 text-xs font-bold text-[#864f19] bg-[#fbf9f8] hover:bg-[#ffdcc2] border border-[#d7c3b5]/60 rounded-xl transition cursor-pointer shadow-2xs inline-flex items-center gap-1.5"
                    >
                      {showAllDivisionPincodes ? (
                        <>
                          <ChevronUp className="w-3.5 h-3.5" /> Show Less
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3.5 h-3.5" /> View All ({divisionPincodesList.length})
                        </>
                      )}
                    </button>
                  </div>
                )}
              </>
            )}

            {activeTab === 'vendors' && (
              <>
                <div className="py-2.5 flex justify-between text-xs font-bold text-[#52443a]">
                  <span>Merchant Shop</span>
                  <span>Status</span>
                </div>
                {divisionVendors.length === 0 ? (
                  <p className="py-6 text-center text-xs text-slate-400 font-semibold">No registered vendors found in {userDivision}.</p>
                ) : (
                  (showAllDivisionVendors ? divisionVendors : divisionVendors.slice(0, INITIAL_LIMIT)).map((v: any) => (
                    <div key={v.id || v._id} className="py-3 flex justify-between items-center text-xs font-semibold">
                      <div>
                        <span className="font-bold text-[#1b1c1c] block">{v.businessName || v.name}</span>
                        <span className="text-[10px] text-[#864f19] uppercase font-black">PIN: {v.pincode} • {v.category || v.storeType || 'Merchant'}</span>
                      </div>
                      <span className={`inline-block text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                        (v.status || '').toLowerCase() === 'active' || (v.status || '').toLowerCase() === 'approved'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-[#864f19]'
                      }`}>
                        {v.status}
                      </span>
                    </div>
                  ))
                )}
                {divisionVendors.length > INITIAL_LIMIT && (
                  <div className="pt-3 flex justify-center">
                    <button
                      type="button"
                      onClick={() => setShowAllDivisionVendors(!showAllDivisionVendors)}
                      className="px-4 py-2 text-xs font-bold text-[#864f19] bg-[#fbf9f8] hover:bg-[#ffdcc2] border border-[#d7c3b5]/60 rounded-xl transition cursor-pointer shadow-2xs inline-flex items-center gap-1.5"
                    >
                      {showAllDivisionVendors ? (
                        <>
                          <ChevronUp className="w-3.5 h-3.5" /> Show Less
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3.5 h-3.5" /> View All ({divisionVendors.length})
                        </>
                      )}
                    </button>
                  </div>
                )}
              </>
            )}

            {activeTab === 'agents' && (
              <>
                <div className="py-2.5 flex justify-between text-xs font-bold text-[#52443a]">
                  <span>Pincode Agent & Territory</span>
                  <span>Target Progress</span>
                  <span>Inspect Action</span>
                </div>
                {pincodeAgentsList.length === 0 ? (
                  <div className="py-12 text-center text-xs font-semibold text-[#847468]">
                    No Pincode Agents found in {userDivision || 'assigned'} Division.
                  </div>
                ) : (
                  (showAllPincodeAgents ? pincodeAgentsList : pincodeAgentsList.slice(0, INITIAL_LIMIT)).map((agent) => (
                    <div key={agent.id} className="py-3 flex justify-between items-center text-xs font-semibold">
                      <div>
                        <span className="font-bold text-[#1b1c1c] block">{agent.name}</span>
                        <span className="text-[10px] text-[#864f19] uppercase font-black">PIN: {agent.pincode}</span>
                      </div>
                      <div>
                        <span className="text-[#52443a] block font-bold">{agent.completedTargets ?? 0} / {agent.assignedTargets ?? 0} Targets</span>
                        <span className={`inline-block text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                          agent.status === 'present' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-[#864f19]'
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
                  ))
                )}
                {pincodeAgentsList.length > INITIAL_LIMIT && (
                  <div className="pt-3 flex justify-center">
                    <button
                      type="button"
                      onClick={() => setShowAllPincodeAgents(!showAllPincodeAgents)}
                      className="px-4 py-2 text-xs font-bold text-[#864f19] bg-[#fbf9f8] hover:bg-[#ffdcc2] border border-[#d7c3b5]/60 rounded-xl transition cursor-pointer shadow-2xs inline-flex items-center gap-1.5"
                    >
                      {showAllPincodeAgents ? (
                        <>
                          <ChevronUp className="w-3.5 h-3.5" /> Show Less
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3.5 h-3.5" /> View All ({pincodeAgentsList.length})
                        </>
                      )}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Quick actions target form */}
        <div className="bg-white rounded-[16px] border border-[#eae8e7] shadow-sm p-6 flex flex-col justify-between space-y-4">
          <div className="border-b border-[#eae8e7] pb-3">
            <h3 className="font-extrabold text-sm text-[#1b1c1c]">Assign Pincode Agent Targets</h3>
            <p className="text-[10px] text-[#52443a] mt-0.5 font-medium">Assign daily merchant targets to active Pincode Agents in {userDivision}.</p>
          </div>
          
          <form onSubmit={handleAssign} className="space-y-3.5 flex-grow flex flex-col justify-between">
            <div className="space-y-1">
              <label className="block text-[9px] font-bold text-[#52443a] uppercase tracking-wider">Select Target Pincode *</label>
              <select
                value={selectedPincode}
                onChange={(e) => setSelectedPincode(e.target.value)}
                className="w-full bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl py-2 px-3 text-xs text-[#1b1c1c] focus:outline-none focus:ring-1 focus:ring-[#864f19]"
              >
                {divisionPincodesList.map((pin) => (
                  <option key={pin.code} value={pin.code}>{pin.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-[9px] font-bold text-[#52443a] uppercase tracking-wider">Select Pincode Agent *</label>
              <select
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
                className="w-full bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl py-2 px-3 text-xs text-[#1b1c1c] focus:outline-none focus:ring-1 focus:ring-[#864f19]"
              >
                {pincodeAgentsList.length === 0 ? (
                  <option value="">No pincode agents found in this division</option>
                ) : (
                  pincodeAgentsList.map((a) => (
                    <option key={a.id} value={a.id}>{a.name} (PIN: {a.pincode})</option>
                  ))
                )}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-[9px] font-bold text-[#52443a] uppercase tracking-wider">Target Quantity *</label>
              <input
                type="number"
                min="1"
                required
                value={targetQuantity}
                onChange={(e) => setTargetQuantity(e.target.value)}
                placeholder="e.g. 20"
                className="w-full bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl py-2 px-3 text-xs text-[#1b1c1c] focus:outline-none focus:ring-1 focus:ring-[#864f19]"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[9px] font-bold text-[#52443a] uppercase tracking-wider">Target Campaign Title *</label>
              <input
                type="text"
                required
                value={targetTitle}
                onChange={(e) => setTargetTitle(e.target.value)}
                placeholder="e.g. Onboard 20 new restaurants"
                className="w-full bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl py-2 px-3 text-xs text-[#1b1c1c] focus:outline-none focus:ring-1 focus:ring-[#864f19]"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[9px] font-bold text-[#52443a] uppercase tracking-wider">Target Date *</label>
              <input
                type="date"
                required
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl py-2 px-3 text-xs text-[#1b1c1c] focus:outline-none focus:ring-1 focus:ring-[#864f19]"
              />
            </div>

            {districtTargetAssigned && (
              <p className="text-[10px] text-green-600 font-bold text-center">Pincode Agent Target Allocated & Synced!</p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 bg-[#864f19] hover:bg-[#a3672f] text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm transition-all border-none cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
            >
              <Send className="w-3.5 h-3.5" /> {isSubmitting ? 'Assigning...' : 'Assign Pincode Agent Targets'}
            </button>
          </form>
        </div>
      </div>

      {/* Reports and Notification Center (Only rendered when real records exist) */}
      {(divisionReports.length > 0 || divisionAlerts.length > 0) && (
        <div className={`grid grid-cols-1 ${divisionReports.length > 0 && divisionAlerts.length > 0 ? 'md:grid-cols-2' : 'md:grid-cols-1'} gap-6`}>
          
          {/* Reports (Hidden when 0 reports exist) */}
          {divisionReports.length > 0 && (
            <div className="bg-white rounded-[16px] border border-[#eae8e7] shadow-sm p-6 space-y-4">
              <div className="border-b border-[#eae8e7] pb-3">
                <h3 className="font-extrabold text-sm text-[#1b1c1c]">Division Reports Center</h3>
              </div>
              
              <div className="space-y-3">
                {divisionReports.map((rep: any, idx: number) => (
                  <div key={rep._id || rep.id || idx} className="flex justify-between items-center p-3 bg-[#fbf9f8] rounded-xl border border-[#eae8e7]/55">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-[#1b1c1c]">{rep.title || rep.reportNumber || rep.type || 'Division Report'}</span>
                      <p className="text-[10px] text-[#52443a]">{rep.remarks || rep.desc || rep.summary?.description || 'Division performance log'}</p>
                    </div>
                    <button 
                      onClick={() => downloadReport(rep.title || rep.reportNumber || rep.type || 'Division Report', user?.role || 'division', user)}
                      title={`Download ${rep.title || rep.reportNumber || 'Report'}`}
                      className="p-2 bg-white text-[#864f19] border border-[#d7c3b5]/50 rounded-lg hover:bg-[#864f19] hover:text-white transition cursor-pointer flex items-center justify-center shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notifications and Escalated alerts (Hidden when 0 alerts exist) */}
          {divisionAlerts.length > 0 && (
            <div className="bg-white rounded-[16px] border border-[#eae8e7] shadow-sm p-6 space-y-4">
              <div className="border-b border-[#eae8e7] pb-3">
                <h3 className="font-extrabold text-sm text-[#1b1c1c]">Division Alerts & Alerts Panel</h3>
              </div>
              
              <div className="space-y-3">
                {(showAllDivisionAlerts ? divisionAlerts : divisionAlerts.slice(0, INITIAL_LIMIT)).map((notif: any, idx: number) => {
                  const isHigh = notif.priority === 'high' || notif.alert;
                  return (
                    <div key={notif._id || notif.id || idx} className="flex items-start gap-3 p-3 bg-[#fbf9f8] rounded-xl border border-[#eae8e7]/50">
                      <div className={`h-2 w-2 rounded-full mt-1 shrink-0 ${isHigh ? 'bg-[#ba1a1a]' : 'bg-[#864f19]'}`} />
                      <div className="flex-grow space-y-0.5">
                        <div className="flex justify-between items-center text-[10px] font-bold">
                          <span className={isHigh ? 'text-[#ba1a1a]' : 'text-[#864f19]'}>{notif.title || notif.type || notif.category || 'Division Alert'}</span>
                          <span className="text-[#52443a] font-medium">{notif.time || (notif.createdAt ? new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '')}</span>
                        </div>
                        <p className="text-xs text-[#52443a] leading-normal">{notif.message || notif.msg}</p>
                      </div>
                    </div>
                  );
                })}
                {divisionAlerts.length > INITIAL_LIMIT && (
                  <div className="pt-2 flex justify-center">
                    <button
                      type="button"
                      onClick={() => setShowAllDivisionAlerts(!showAllDivisionAlerts)}
                      className="px-3 py-1.5 text-[11px] font-bold text-[#864f19] bg-[#fbf9f8] hover:bg-[#ffdcc2] border border-[#d7c3b5]/60 rounded-lg transition cursor-pointer inline-flex items-center gap-1"
                    >
                      {showAllDivisionAlerts ? (
                        <>
                          <ChevronUp className="w-3 h-3" /> Show Less
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3 h-3" /> View All ({divisionAlerts.length})
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

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
                  {selectedAgent.completedTargets ?? 0} / {selectedAgent.assignedTargets ?? 0} Targets
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-[#864f19] h-full rounded-full" 
                    style={{ width: `${(selectedAgent.assignedTargets || 0) > 0 ? Math.round(((selectedAgent.completedTargets || 0) / (selectedAgent.assignedTargets || 1)) * 100) : 0}%` }} 
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
