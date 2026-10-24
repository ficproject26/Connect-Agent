import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../context/AuthContext';
import { targetService } from '../../../api';
import { Modal, Button } from '../../../components/ui';
import { downloadReport } from '../../../utils/downloadReport';
import {
  TrendingUp, Clock, CheckCircle2,
  Plus, Users, Target, Ticket, Send, Download, BarChart2,
  Eye, Wallet, Award, MapPin, Phone, Mail, ChevronDown, ChevronUp, Layers, AlertCircle
} from 'lucide-react';
import api from '../../../utils/api';

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
  const [activeTab, setActiveTab] = useState<'divisions' | 'pincodes'>('divisions');
  const [selectedAgent, setSelectedAgent] = useState<SubordinateAgent | null>(null);

  const INITIAL_LIMIT = 10;
  const [showAllSubordinates, setShowAllSubordinates] = useState(false);
  const [showAllDivisions, setShowAllDivisions] = useState(false);
  const [showAllPincodes, setShowAllPincodes] = useState(false);
  const [showAllDistrictAlerts, setShowAllDistrictAlerts] = useState(false);

  // Silent 45s background auto-refresh for subordinates with tab visibility management
  useQuery({
    queryKey: ['districtSubordinates', user?.territory?.district || 'district'],
    queryFn: async () => {
      try {
        const res = await targetService.getSubordinates();
        if (res.data?.subordinates) {
          const uDist = (user?.territory?.district || '').trim().toLowerCase();
          const uState = (user?.territory?.state || '').trim().toLowerCase();

          // Strict territory filtering: only allow division and pincode agents within this assigned district and state
          const filteredSubs = res.data.subordinates.filter((s: any) => {
            const sId = String(s._id || s.id || '');
            const sRegId = String(s.registrationId || '');
            const sRole = (s.role || '').toLowerCase();

            // Strictly exclude non-agent IDs, prefixes, or roles
            if (/^(ADM-|usr_mgr|MGR-|cust_|ven-|FIC-CUS-)/i.test(sId) || /^(ADM-|usr_mgr|MGR-|cust_|ven-|FIC-CUS-)/i.test(sRegId)) return false;
            if (/admin|manager|vendor|customer|delivery|technician|executive/i.test(sRole)) return false;

            if (sRole !== 'division' && sRole !== 'pincode') return false;

            const sState = (typeof s.territory === 'object' ? s.territory?.state : s.state || '').trim().toLowerCase();
            const sDist = (typeof s.territory === 'object' ? s.territory?.district : s.district || '').trim().toLowerCase();

            if (uState && sState && !sState.includes(uState) && !uState.includes(sState)) return false;
            if (uDist && sDist && !sDist.includes(uDist) && !uDist.includes(sDist)) return false;

            return true;
          });

          const mapped: SubordinateAgent[] = filteredSubs.map((s: any) => ({
            id: s._id,
            name: s.name,
            role: s.role || 'pincode',
            territory: typeof s.territory === 'object'
              ? (s.territory?.division ? `${s.territory.division}${s.territory.pincode ? ` (${s.territory.pincode})` : ''}` : (s.territory?.district || s.territory?.state || 'Assigned Territory'))
              : (s.territory || 'Division Sector'),
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
          if (selectedAgent) {
            const fresh = mapped.find(m => m.id === selectedAgent.id);
            setSelectedAgent(fresh || null);
          }
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

  // Hierarchy query for dynamic canonical divisions and pincodes in assigned district
  const { data: hierarchyRes } = useQuery({
    queryKey: ['districtHierarchy', user?.territory?.district || 'district'],
    queryFn: async () => {
      try {
        const res = await api.get('/admin/hierarchy');
        return res.data;
      } catch (_) {
        return null;
      }
    },
    staleTime: 60000
  });

  // Backend stats for vendor approval and KYC breakdowns
  const { data: statsRes } = useQuery({
    queryKey: ['districtStats', user?._id],
    queryFn: async () => {
      try {
        const res = await api.get('/dashboard/stats');
        return res.data;
      } catch (_) {
        return null;
      }
    },
    staleTime: 30000
  });

  // Scoped vendors query for fallback accurate counts
  const { data: vendorsRes } = useQuery({
    queryKey: ['districtVendors', user?.territory?.district || 'district'],
    queryFn: async () => {
      try {
        const res = await api.get('/vendors', { params: { limit: 1000 } });
        return res.data?.vendors || [];
      } catch (_) {
        return [];
      }
    },
    staleTime: 60000
  });

  const userDistrict = (user?.territory?.district || (user as any)?.assignedDistrict || '').trim();

  // Find current district in hierarchy
  const currentDistrict = React.useMemo(() => {
    if (!hierarchyRes?.districts) return null;
    const uDistNorm = userDistrict.toLowerCase().replace(/district/g, '').trim();
    return hierarchyRes.districts.find((d: any) => {
      const dName = (d.territory?.district || d.district || d.name || '').toLowerCase().replace(/district/g, '').trim();
      return dName && (dName === uDistNorm || dName.includes(uDistNorm) || uDistNorm.includes(dName));
    }) || null;
  }, [hierarchyRes, userDistrict]);

  // Registered divisions under assigned district
  const divisionItems = React.useMemo(() => {
    const list: any[] = [];
    if (currentDistrict?.divisions && Array.isArray(currentDistrict.divisions)) {
      currentDistrict.divisions.forEach((div: any) => {
        const divName = div.territory?.division || div.division || div.name || 'Division Sector';
        const agentName = div.name && div.name !== 'old' ? div.name : 'Division Management';
        list.push({
          id: div._id || div.id,
          name: divName,
          agentName,
          pincodesCount: div.pincodes?.length || 0,
          pincodes: div.pincodes || []
        });
      });
    }
    if (list.length === 0) {
      subordinatesList.filter(s => s.role === 'division').forEach(s => {
        list.push({
          id: s.id,
          name: s.territory,
          agentName: s.name,
          pincodesCount: 1,
          pincodes: []
        });
      });
    }
    return list;
  }, [currentDistrict, subordinatesList]);

  // Registered pincodes under assigned district
  const districtPincodes = React.useMemo(() => {
    const list: any[] = [];
    const divList = currentDistrict?.divisions || [];
    divList.forEach((div: any) => {
      (div.pincodes || []).forEach((pin: any) => {
        list.push({
          ...pin,
          divisionName: div.territory?.division || div.name || 'Division Sector'
        });
      });
    });
    if (list.length === 0 && hierarchyRes?.pincodes) {
      const uDist = userDistrict.toLowerCase().replace(/district/g, '').trim();
      return hierarchyRes.pincodes.filter((p: any) => {
        const pDist = (p.territory?.district || p.district || '').toLowerCase().replace(/district/g, '').trim();
        return !uDist || pDist.includes(uDist) || uDist.includes(pDist);
      });
    }
    if (list.length === 0) {
      return subordinatesList.filter(s => s.role === 'pincode').map(s => ({
        id: s.id,
        name: s.name,
        pincode: s.territory,
        divisionName: 'Division Sector'
      }));
    }
    return list;
  }, [currentDistrict, hierarchyRes, subordinatesList, userDistrict]);

  // Dynamic vendor KPI counts
  const vendorCounts = React.useMemo(() => {
    const list = Array.isArray(vendorsRes) ? vendorsRes : [];
    const uDist = userDistrict.toLowerCase().replace(/district/g, '').trim();
    const districtVendors = list.filter((v: any) => {
      const d = String(v.district || v.assignedDistrict || '').toLowerCase().replace(/district/g, '').trim();
      return !uDist || d.includes(uDist) || uDist.includes(d);
    });

    const total = statsRes?.stats?.vendors?.total ?? districtVendors.length;
    const active = statsRes?.stats?.vendors?.active ?? districtVendors.filter((v: any) => {
      const s = String(v.status || '').toLowerCase().trim();
      const k = String(v.kycStatus || '').toLowerCase().trim();
      return (s === 'active' || s === 'approved') && (k === 'approved' || k === 'verified');
    }).length;

    const adminPending = statsRes?.stats?.vendors?.adminPending ?? districtVendors.filter((v: any) => {
      const s = String(v.status || '').toLowerCase().trim();
      const a = String(v.approvalStatus || '').toLowerCase().trim();
      const isAdminApproved = a === 'approved' || (s === 'active' && a !== 'pending_pincode_approval' && a !== 'pending');
      return !isAdminApproved || a.includes('pending') || s === 'pending';
    }).length;

    const kycPending = statsRes?.stats?.vendors?.kycPending ?? districtVendors.filter((v: any) => {
      const s = String(v.status || '').toLowerCase().trim();
      const k = String(v.kycStatus || '').toLowerCase().trim();
      const a = String(v.approvalStatus || '').toLowerCase().trim();
      const isAdminApproved = a === 'approved' || (s === 'active' && a !== 'pending_pincode_approval' && a !== 'pending');
      const isKycApproved = k === 'approved' || k === 'verified';
      return isAdminApproved && !isKycApproved;
    }).length;

    return { total, active, adminPending, kycPending };
  }, [vendorsRes, statsRes, userDistrict]);

  // Total divisions available in this district
  const totalDistrictDivisions = typeof currentDistrict?.totalDivisions === 'number'
    ? currentDistrict.totalDivisions
    : (divisionItems.length > 0 ? divisionItems.length : subordinatesList.filter(s => s.role === 'division').length);

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

      {/* 6 KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total Divisions', val: totalDistrictDivisions.toString(), icon: <Layers className="w-4 h-4 text-[#864f19]" />, bg: 'bg-[#ffdcc2]' },
          { label: 'Total Pincodes', val: districtPincodes.length.toString(), icon: <MapPin className="w-4 h-4 text-[#184c62]" />, bg: 'bg-[#c1e8ff]' },
          { label: 'Total Registered Vendors', val: vendorCounts.total.toString(), icon: <Users className="w-4 h-4 text-[#4f4635]" />, bg: 'bg-[#efe1ca]' },
          { label: 'Total Active Vendors', val: vendorCounts.active.toString(), icon: <CheckCircle2 className="w-4 h-4 text-[#864f19]" />, bg: 'bg-[#ffdcc2]' },
          { label: 'Admin Pending Approvals', val: vendorCounts.adminPending.toString(), icon: <Clock className="w-4 h-4 text-amber-700" />, bg: 'bg-amber-50' },
          { label: 'KYC Pending', val: vendorCounts.kycPending.toString(), icon: <AlertCircle className="w-4 h-4 text-blue-700" />, bg: 'bg-blue-50' },
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

      {/* Daily Operations schedule and Pincode performance rankings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Daily operations list: visit schedule, follow-up, visits tabs */}
        <div className="lg:col-span-2 bg-white rounded-[16px] border border-[#eae8e7] shadow-sm overflow-hidden flex flex-col justify-between">
          <div className="px-6 py-4 border-b border-[#eae8e7] flex justify-between items-center bg-white">
            <div className="flex gap-4">
              <button onClick={() => setActiveTab('divisions')} className={`text-xs font-extrabold uppercase pb-1 border-b-2 transition-all ${activeTab === 'divisions' ? 'border-[#864f19] text-[#1b1c1c]' : 'border-transparent text-[#52443a]'}`}>Division List ({divisionItems.length})</button>
              <button onClick={() => setActiveTab('pincodes')} className={`text-xs font-extrabold uppercase pb-1 border-b-2 transition-all ${activeTab === 'pincodes' ? 'border-[#864f19] text-[#1b1c1c]' : 'border-transparent text-[#52443a]'}`}>Pincode List ({districtPincodes.length})</button>
            </div>
          </div>
          
          <div className="p-6 divide-y divide-[#eae8e7]">
            {activeTab === 'divisions' && (
              <>
                <div className="py-2.5 flex justify-between text-xs font-bold text-[#52443a]">
                  <span>Division Sector & Management</span>
                  <span>Assigned Pincodes</span>
                </div>
                {divisionItems.length === 0 ? (
                  <div className="py-8 text-center text-xs font-semibold text-[#847468]">
                    No divisions registered under {userDistrict || 'assigned district'}.
                  </div>
                ) : (
                  (showAllDivisions ? divisionItems : divisionItems.slice(0, INITIAL_LIMIT)).map((div: any, i: number) => (
                    <div key={div.id || i} className="py-3 flex justify-between items-center text-xs font-semibold">
                      <div>
                        <span className="font-bold text-[#1b1c1c] block">{div.name}</span>
                        <span className="text-[10px] text-slate-500 font-medium">{div.agentName}</span>
                      </div>
                      <span className="text-[#34647b] font-extrabold">{div.pincodesCount} Pincodes</span>
                    </div>
                  ))
                )}
                {divisionItems.length > INITIAL_LIMIT && (
                  <div className="pt-3 flex justify-center">
                    <button
                      type="button"
                      onClick={() => setShowAllDivisions(!showAllDivisions)}
                      className="px-4 py-2 text-xs font-bold text-[#864f19] bg-[#fbf9f8] hover:bg-[#ffdcc2] border border-[#d7c3b5]/60 rounded-xl transition cursor-pointer shadow-2xs inline-flex items-center gap-1.5"
                    >
                      {showAllDivisions ? <>Show Less</> : <>View All ({divisionItems.length})</>}
                    </button>
                  </div>
                )}
              </>
            )}

            {activeTab === 'pincodes' && (
              <>
                <div className="py-2.5 flex justify-between text-xs font-bold text-[#52443a]">
                  <span>Pincode Area & Pincode Agent</span>
                  <span>Division Sector</span>
                </div>
                {districtPincodes.length === 0 ? (
                  <div className="py-8 text-center text-xs font-semibold text-[#847468]">
                    No pincodes registered under {userDistrict || 'assigned district'}.
                  </div>
                ) : (
                  (showAllPincodes ? districtPincodes : districtPincodes.slice(0, INITIAL_LIMIT)).map((pin: any, i: number) => {
                    const pinCodeStr = pin.territory?.pincode || pin.pincode || 'Sector';
                    const agentName = pin.name || 'Pincode Agent';
                    const divName = pin.divisionName || pin.territory?.division || pin.division || 'Division Sector';
                    return (
                      <div key={pin.id || pin._id || i} className="py-3 flex justify-between items-center text-xs font-semibold">
                        <div>
                          <span className="font-bold text-[#1b1c1c] block">PIN {pinCodeStr}</span>
                          <span className="text-[10px] text-slate-500 font-medium">{agentName}</span>
                        </div>
                        <span className="text-[#34647b] font-extrabold">{divName}</span>
                      </div>
                    );
                  })
                )}
                {districtPincodes.length > INITIAL_LIMIT && (
                  <div className="pt-3 flex justify-center">
                    <button
                      type="button"
                      onClick={() => setShowAllPincodes(!showAllPincodes)}
                      className="px-4 py-2 text-xs font-bold text-[#864f19] bg-[#fbf9f8] hover:bg-[#ffdcc2] border border-[#d7c3b5]/60 rounded-xl transition cursor-pointer shadow-2xs inline-flex items-center gap-1.5"
                    >
                      {showAllPincodes ? <>Show Less</> : <>View All ({districtPincodes.length})</>}
                    </button>
                  </div>
                )}
              </>
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
              (showAllDistrictAlerts ? districtAlerts : districtAlerts.slice(0, INITIAL_LIMIT)).map((notif) => (
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
            {districtAlerts.length > INITIAL_LIMIT && (
              <div className="pt-2 flex justify-center">
                <button
                  type="button"
                  onClick={() => setShowAllDistrictAlerts(!showAllDistrictAlerts)}
                  className="px-3 py-1.5 text-[11px] font-bold text-[#864f19] bg-[#fbf9f8] hover:bg-[#ffdcc2] border border-[#d7c3b5]/60 rounded-lg transition cursor-pointer inline-flex items-center gap-1"
                >
                  {showAllDistrictAlerts ? (
                    <>
                      <ChevronUp className="w-3 h-3" /> Show Less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3 h-3" /> View All ({districtAlerts.length})
                    </>
                  )}
                </button>
              </div>
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
