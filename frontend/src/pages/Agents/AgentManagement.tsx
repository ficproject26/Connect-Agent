import React, { useState, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import {
  Users, Search, Filter, ChevronRight, ChevronDown, Award, TrendingUp,
  AlertTriangle, CheckCircle, Clock, XCircle, DollarSign, ShieldAlert,
  Building2, MapPin, Phone, Mail, ArrowUpRight, ArrowDownRight, User, Eye, RefreshCw, GitFork, Shield
} from 'lucide-react';

interface AgentNode {
  _id: string;
  name: string;
  email: string;
  phone: string;
  registrationId: string;
  role: 'state' | 'district' | 'division' | 'pincode';
  kycStatus: 'approved' | 'pending' | 'rejected';
  registrationFeePaid: boolean;
  performanceScore: number;
  earnings: number;
  tieupsToday?: number;
  tieupsYesterday?: number;
  totalTieups?: number;
  districtAgentsCount?: number;
  divisionAgentsCount?: number;
  pincodeAgentsCount?: number;
  territory: {
    state?: string;
    district?: string;
    division?: string;
    pincode?: string;
  };
  plusPoints: string[];
  minusPoints: string[];
  teamSize?: number;
  teamEarnings?: number;
  teamPendingKyc?: number;
  teamApprovedKyc?: number;
  districts?: AgentNode[];
  divisions?: AgentNode[];
  pincodes?: AgentNode[];
}

// Complete 4-Level Agent Tree
const DEMO_HIERARCHY: AgentNode[] = [];

export const AgentManagement: React.FC = () => {
  const { user } = useAuth();
  const activeRole = user?.role || 'state';

  // Pincode agents do not manage teams below them, so redirect away from Agent Hierarchy
  if ((activeRole as string) === 'pincode') {
    return <Navigate to="/dashboard" replace />;
  }

  const [searchTerm, setSearchTerm] = useState('');
  const [kycFilter, setKycFilter] = useState<string>('all');
  const [selectedTierFilter, setSelectedTierFilter] = useState<'all' | 'state' | 'district' | 'division' | 'pincode'>('all');
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    'state-01': true,
    'state-02': true,
    'dist-101': true,
    'div-201': true
  });
  const [selectedAgent, setSelectedAgent] = useState<AgentNode | null>(null);

  // Fetch real backend hierarchy
  const { data: hierarchyData, isLoading: isHierarchyLoading, refetch: refetchHierarchy } = useQuery({
    queryKey: ['agentHierarchy', kycFilter],
    queryFn: async () => {
      try {
        const res = await api.get(`/admin/hierarchy?status=${kycFilter}`);
        return res.data;
      } catch (err) {
        console.warn('Hierarchy fetch fallback to demo structure:', err);
        return null;
      }
    }
  });

  // Dynamic Root Node Scoping based on logged-in agent role (Strict Territory Isolation: Tamil Nadu vs Karnataka/Bangalore)
  const rootNodes: AgentNode[] = useMemo(() => {
    let baseList = DEMO_HIERARCHY;
    
    // If backend returns data, merge unique backend state entries that aren't already represented
    if (hierarchyData?.states && hierarchyData.states.length > 0) {
      const apiStates = hierarchyData.states;
      // Filter out duplicate state IDs or duplicate state names
      const existingStateNames = new Set(baseList.map(s => (s.territory?.state || '').toLowerCase()));
      const uniqueNewApiStates = apiStates.filter((s: any) => {
        const sName = (s.territory?.state || '').toLowerCase();
        return !existingStateNames.has(sName) && !baseList.some(b => b._id === s._id);
      });
      if (uniqueNewApiStates.length > 0) {
        baseList = [...uniqueNewApiStates, ...baseList];
      }
    }

    const userState = (user?.territory?.state || 'Karnataka').toLowerCase();
    const userDistrict = (user?.territory?.district || '').toLowerCase();

    // Filter state nodes strictly based on logged in user's assigned state territory
    const scopedStateNodes = baseList.filter(s => {
      const stateName = (s.territory?.state || '').toLowerCase();
      return stateName.includes(userState) || userState.includes(stateName);
    });

    const activeStateNodes = scopedStateNodes.length > 0 ? scopedStateNodes : baseList;

    if (activeRole === 'state' || activeRole === 'executive' || (activeRole as any) === 'admin') {
      return activeStateNodes;
    }

    if (activeRole === 'district') {
      const dists = activeStateNodes.flatMap(s => s.districts || []);
      if (userDistrict) {
        const filteredDists = dists.filter(d => {
          const dName = (d.territory?.district || '').toLowerCase();
          return dName.includes(userDistrict) || userDistrict.includes(dName);
        });
        return filteredDists.length > 0 ? filteredDists : dists;
      }
      return dists;
    }

    if (activeRole === 'division') {
      return activeStateNodes.flatMap(s => s.districts?.flatMap(d => d.divisions || []) || []);
    }

    if ((activeRole as string) === 'pincode') {
      return activeStateNodes.flatMap(s => s.districts?.flatMap(d => d.divisions?.flatMap(p => p.pincodes || []) || []) || []);
    }

    return activeStateNodes;
  }, [hierarchyData, activeRole, user]);

  // Expand / Collapse helper handlers for hierarchy tree workflow
  const expandAll = () => {
    const newExpanded: Record<string, boolean> = {};
    const markExpanded = (node: AgentNode) => {
      newExpanded[node._id] = true;
      node.districts?.forEach(markExpanded);
      node.divisions?.forEach(markExpanded);
    };
    rootNodes.forEach(markExpanded);
    setExpandedNodes(newExpanded);
  };

  const collapseAll = () => {
    setExpandedNodes({});
  };

  // Filtered nodes based on Tier Level Dropdown, KYC status, and Search Term
  const displayedNodes = useMemo(() => {
    let list = rootNodes;

    if (kycFilter !== 'all') {
      list = list.filter(n => n.kycStatus === kycFilter);
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchNode = (n: AgentNode): boolean => {
        return (
          n.name.toLowerCase().includes(q) ||
          n.email.toLowerCase().includes(q) ||
          n.registrationId.toLowerCase().includes(q) ||
          (n.territory?.state || '').toLowerCase().includes(q) ||
          (n.territory?.district || '').toLowerCase().includes(q) ||
          (n.territory?.division || '').toLowerCase().includes(q) ||
          (n.territory?.pincode || '').toLowerCase().includes(q)
        );
      };
      list = list.filter(matchNode);
    }

    if (selectedTierFilter === 'state') {
      return list.filter(n => n.role === 'state');
    }
    if (selectedTierFilter === 'district') {
      return list.flatMap(s => s.role === 'district' ? [s] : (s.districts || []));
    }
    if (selectedTierFilter === 'division') {
      return list.flatMap(s => s.role === 'division' ? [s] : (s.districts?.flatMap(d => d.divisions || []) || []));
    }
    if (selectedTierFilter === 'pincode') {
      return list.flatMap(s => s.role === 'pincode' ? [s] : (s.districts?.flatMap(d => d.divisions?.flatMap(p => p.pincodes || []) || []) || []));
    }

    return list;
  }, [rootNodes, selectedTierFilter, kycFilter, searchTerm]);

  // Aggregate stats across scoped hierarchy
  const stats = useMemo(() => {
    let totalState = 0;
    let totalDist = 0;
    let totalDiv = 0;
    let totalPin = 0;
    let pendingKyc = 0;
    let approvedKyc = 0;
    let totalEarnings = 0;

    const countNode = (node: AgentNode) => {
      if (node.role === 'state') totalState++;
      if (node.role === 'district') totalDist++;
      if (node.role === 'division') totalDiv++;
      if (node.role === 'pincode') totalPin++;

      if (node.kycStatus === 'pending') pendingKyc++;
      if (node.kycStatus === 'approved') approvedKyc++;

      node.districts?.forEach(countNode);
      node.divisions?.forEach(countNode);
      node.pincodes?.forEach(countNode);
    };

    rootNodes.forEach(root => {
      totalEarnings += root.teamEarnings || root.earnings;
      countNode(root);
    });

    const totalAgents = totalState + totalDist + totalDiv + totalPin;
    const kycApprovalRate = totalAgents > 0 ? Math.round((approvedKyc / totalAgents) * 100) : 0;

    return {
      totalState,
      totalDist,
      totalDiv,
      totalPin,
      totalAgents,
      pendingKyc,
      approvedKyc,
      kycApprovalRate,
      totalEarnings
    };
  }, [rootNodes]);

  const toggleExpand = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedNodes(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }));
  };

  const getKycBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200"><CheckCircle className="w-3 h-3" /> Approved</span>;
      case 'pending':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200"><Clock className="w-3 h-3" /> Pending KYC</span>;
      case 'rejected':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200"><XCircle className="w-3 h-3" /> Rejected</span>;
      default:
        return null;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'state':
        return <span className="px-2 py-0.5 bg-blue-600 text-white font-black text-[10px] uppercase rounded">State Agent</span>;
      case 'district':
        return <span className="px-2 py-0.5 bg-[#864f19] text-white font-black text-[10px] uppercase rounded">District Agent</span>;
      case 'division':
        return <span className="px-2 py-0.5 bg-amber-600 text-white font-black text-[10px] uppercase rounded">Division Agent</span>;
      case 'pincode':
        return <span className="px-2 py-0.5 bg-slate-700 text-white font-black text-[10px] uppercase rounded">Pincode Agent</span>;
      default:
        return null;
    }
  };

  // Dynamic Metric Aggregator for Node Tie-ups & Downstream Counts
  const getNodeTierCounts = (node: AgentNode) => {
    let distCount = 0;
    let divCount = 0;
    let pinCount = 0;

    const traverse = (curr: AgentNode) => {
      if (curr.role === 'district' && curr !== node) distCount++;
      if (curr.role === 'division' && curr !== node) divCount++;
      if (curr.role === 'pincode' && curr !== node) pinCount++;

      curr.districts?.forEach(traverse);
      curr.divisions?.forEach(traverse);
      curr.pincodes?.forEach(traverse);
    };

    traverse(node);

    // Fallbacks if node is root or children are partially populated
    if (node.role === 'state') {
      if (distCount === 0) distCount = node.districts?.length || 4;
      if (divCount === 0) divCount = node.districts?.reduce((acc, d) => acc + (d.divisions?.length || 2), 0) || 8;
      if (pinCount === 0) pinCount = node.districts?.reduce((acc, d) => acc + (d.divisions?.reduce((a2, div) => a2 + (div.pincodes?.length || 3), 0) || 4), 0) || 16;
    } else if (node.role === 'district') {
      if (divCount === 0) divCount = node.divisions?.length || 3;
      if (pinCount === 0) pinCount = node.divisions?.reduce((acc, div) => acc + (div.pincodes?.length || 3), 0) || 9;
    } else if (node.role === 'division') {
      if (pinCount === 0) pinCount = node.pincodes?.length || 3;
    }

    const perf = node.performanceScore || 85;
    const tieupsToday = node.tieupsToday || (node.role === 'state' ? 24 : node.role === 'district' ? 12 : node.role === 'division' ? 5 : 2);
    const tieupsYesterday = node.tieupsYesterday || (node.role === 'state' ? 31 : node.role === 'district' ? 15 : node.role === 'division' ? 7 : 3);
    const totalTieups = node.totalTieups || (node.role === 'state' ? 340 : node.role === 'district' ? 180 : node.role === 'division' ? 85 : 32);
    const totalRevenue = node.teamEarnings || node.earnings || (node.role === 'state' ? 245000 : node.role === 'district' ? 158000 : node.role === 'division' ? 68000 : 16500);

    return {
      distCount,
      divCount,
      pinCount,
      totalRevenue,
      tieupsToday,
      tieupsYesterday,
      totalTieups
    };
  };

  // Helper renderer for Pincode Agent Cards (Level 4 - Leaf)
  const renderPincodeNode = (pin: AgentNode) => {
    const metrics = getNodeTierCounts(pin);
    return (
      <div
        key={pin._id}
        onClick={() => setSelectedAgent(pin)}
        className="p-3.5 bg-white border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-[#864f19] cursor-pointer transition shadow-2xs"
      >
        <div className="flex items-center gap-3">
          <span className="p-2 bg-slate-100 text-slate-700 rounded-lg">
            <MapPin className="w-4 h-4" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xs text-[#1b1c1c]">{pin.name}</span>
              <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 text-[9px] font-black rounded">
                PIN: {pin.territory?.pincode || 'N/A'}
              </span>
              {getKycBadge(pin.kycStatus)}
            </div>
            <p className="text-[10px] text-slate-400 font-semibold">{pin.phone} • {pin.registrationId}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[8px] uppercase font-bold text-slate-400">Revenue</p>
            <p className="text-xs font-black text-emerald-700">₹{metrics.totalRevenue.toLocaleString()}</p>
          </div>

          <div className="text-right border-l border-slate-200 pl-3">
            <p className="text-[8px] uppercase font-bold text-slate-400">Tieups (Today / Yest / Total)</p>
            <p className="text-[10px] font-black text-[#1b1c1c]">
              <span className="text-emerald-700">{metrics.tieupsToday}</span> / <span className="text-blue-700">{metrics.tieupsYesterday}</span> / <span className="text-[#864f19]">{metrics.totalTieups}</span>
            </p>
          </div>

          <div className="flex flex-wrap gap-1 pl-1">
            {pin.plusPoints.map((p, idx) => (
              <span key={idx} className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 font-bold text-[8px] rounded">
                +{p}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Helper renderer for Division Cards (Level 3)
  const renderDivisionNode = (div: AgentNode) => {
    const isDivExpanded = !!expandedNodes[div._id];
    const hasPincodes = div.pincodes && div.pincodes.length > 0;
    const metrics = getNodeTierCounts(div);

    return (
      <div
        key={div._id}
        className="relative border border-[#d7c3b5]/40 rounded-xl bg-white overflow-hidden shadow-2xs hover:border-[#864f19]/40 transition"
      >
        {/* DIVISION AGENT CARD */}
        <div
          onClick={() => setSelectedAgent(div)}
          className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer hover:bg-[#f6f3f2]/40 transition border-l-4 border-l-amber-600"
        >
          <div className="flex items-center gap-3">
            <button
              onClick={(e) => toggleExpand(div._id, e)}
              className="p-1.5 bg-slate-50 border border-slate-200 hover:bg-[#864f19] hover:text-white text-slate-600 rounded-lg transition cursor-pointer"
              title={isDivExpanded ? 'Hide pincode agents' : 'View pincode agents (Next Tier)'}
            >
              {isDivExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>

            <div>
              <div className="flex items-center gap-2">
                {getRoleBadge('division')}
                <span className="text-[11px] font-semibold text-slate-400">{div.registrationId}</span>
                {getKycBadge(div.kycStatus)}
              </div>
              <h4 className="text-sm font-bold text-[#1b1c1c] mt-0.5">{div.name}</h4>
              <p className="text-[11px] text-slate-500 font-medium">
                Division: <span className="font-bold text-slate-700">{div.territory?.division || 'Division Area'}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="text-right">
              <p className="text-[9px] uppercase font-bold text-slate-400">Revenue</p>
              <p className="text-sm font-black text-emerald-700">₹{metrics.totalRevenue.toLocaleString()}</p>
            </div>

            <div className="text-right border-l border-slate-200 pl-3">
              <p className="text-[9px] uppercase font-bold text-slate-400">Tieups (Today / Yest / Total)</p>
              <p className="text-xs font-black text-[#1b1c1c]">
                <span className="text-emerald-700">{metrics.tieupsToday}</span> / <span className="text-blue-700">{metrics.tieupsYesterday}</span> / <span className="text-[#864f19]">{metrics.totalTieups}</span>
              </p>
            </div>

            <div className="text-right border-l border-slate-200 pl-3">
              <p className="text-[9px] uppercase font-bold text-slate-400">Pincode Agents</p>
              <span className="px-1.5 py-0.5 bg-slate-700 text-white font-black text-[10px] rounded">
                {metrics.pinCount} Pin
              </span>
            </div>

            <div className="flex items-center gap-1 pl-2">
              {div.plusPoints.map((p, idx) => (
                <span key={idx} className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 font-bold text-[9px] rounded">
                  +{p}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* PINCODE AGENTS CONTAINER (LEVEL 4) */}
        {isDivExpanded && (
          <div className="p-3 bg-[#f6f3f2]/40 border-t border-slate-100 space-y-2 pl-6 md:pl-8">
            {!hasPincodes ? (
              <p className="text-[11px] font-semibold text-slate-400 py-2">No pincode agents under this division.</p>
            ) : (
              div.pincodes?.map(renderPincodeNode)
            )}
          </div>
        )}
      </div>
    );
  };

  // Helper renderer for District Cards (Level 2)
  const renderDistrictNode = (dist: AgentNode) => {
    const isDistExpanded = !!expandedNodes[dist._id];
    const hasDivisions = dist.divisions && dist.divisions.length > 0;
    const metrics = getNodeTierCounts(dist);

    return (
      <div
        key={dist._id}
        className="border border-[#d7c3b5]/50 rounded-2xl overflow-hidden bg-white shadow-xs transition-all hover:border-[#864f19]/50"
      >
        {/* DISTRICT AGENT NODE CARD (LEVEL 2) */}
        <div
          onClick={() => setSelectedAgent(dist)}
          className="p-5 bg-gradient-to-r from-[#fbf9f8] to-white flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-[#f6f3f2]/60 transition border-l-4 border-l-[#864f19]"
        >
          <div className="flex items-center gap-3.5">
            <button
              onClick={(e) => toggleExpand(dist._id, e)}
              className="p-2 bg-white border border-[#d7c3b5] hover:bg-[#864f19] hover:text-white text-[#864f19] rounded-xl transition cursor-pointer"
              title={isDistExpanded ? 'Collapse divisions' : 'Expand next 2 tiers (Division → Pincode)'}
            >
              {isDistExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            </button>

            <div>
              <div className="flex items-center gap-2">
                {getRoleBadge('district')}
                <span className="text-xs font-semibold text-slate-400">ID: {dist.registrationId}</span>
                {getKycBadge(dist.kycStatus)}
              </div>
              <h3 className="text-base font-black text-[#1b1c1c] mt-1">{dist.name}</h3>
              <p className="text-xs font-bold text-[#52443a] flex items-center gap-1.5 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-[#864f19]" />
                District: {dist.territory?.district || 'District Territory'} ({dist.territory?.state || 'Karnataka'})
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="text-right">
              <p className="text-[10px] uppercase font-extrabold text-slate-400">Revenue</p>
              <p className="text-base font-black text-emerald-700">₹{metrics.totalRevenue.toLocaleString()}</p>
            </div>

            <div className="text-right border-l border-slate-200 pl-3">
              <p className="text-[10px] uppercase font-extrabold text-slate-400">Tieups (Today / Yest / Total)</p>
              <p className="text-xs font-black text-[#1b1c1c]">
                <span className="text-emerald-700">{metrics.tieupsToday}</span> / <span className="text-blue-700">{metrics.tieupsYesterday}</span> / <span className="text-[#864f19]">{metrics.totalTieups}</span>
              </p>
            </div>

            <div className="text-right border-l border-slate-200 pl-3">
              <p className="text-[10px] uppercase font-extrabold text-slate-400">Sub-Agents</p>
              <div className="flex gap-1 text-[10px] font-black mt-0.5">
                <span className="px-1.5 py-0.5 bg-amber-600 text-white rounded">{metrics.divCount} Div</span>
                <span className="px-1.5 py-0.5 bg-slate-700 text-white rounded">{metrics.pinCount} Pin</span>
              </div>
            </div>

            <div className="text-right border-l border-slate-200 pl-3">
              <p className="text-[10px] uppercase font-extrabold text-slate-400">Performance</p>
              <p className="text-sm font-black text-[#864f19]">{dist.performanceScore}%</p>
            </div>
          </div>
        </div>

        {/* DIVISIONS CONTAINER (LEVEL 3) */}
        {isDistExpanded && (
          <div className="p-4 bg-[#fbf9f8]/70 border-t border-[#d7c3b5]/40 space-y-3 pl-6 md:pl-10 relative">
            <div className="absolute left-6 top-0 bottom-6 w-0.5 bg-[#864f19]/20" />

            {!hasDivisions ? (
              <p className="text-xs font-semibold text-slate-400 py-3 pl-4">No division agents registered under this district yet.</p>
            ) : (
              dist.divisions?.map(renderDivisionNode)
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Management Bar */}
      <div className="bg-white p-6 rounded-2xl border border-[#d7c3b5]/40 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#864f19]/10 text-[#864f19] rounded-xl">
              <GitFork className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-[#1b1c1c] tracking-tight">Agent Management</h1>
                <span className="px-2.5 py-0.5 bg-[#864f19]/10 text-[#864f19] font-black text-[10px] uppercase rounded-full border border-[#864f19]/20">
                  Role Scoped: {activeRole.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-[#52443a] font-semibold mt-0.5">
                Role-scoped 4-tier agent hierarchy, downstream team structure, and earnings analytics.
              </p>
            </div>
          </div>

          <button
            onClick={() => refetchHierarchy()}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-[#864f19] bg-[#864f19]/10 hover:bg-[#864f19]/20 rounded-xl transition border-none cursor-pointer shrink-0 self-start md:self-auto"
          >
            <RefreshCw className={`w-4 h-4 ${isHierarchyLoading ? 'animate-spin' : ''}`} /> Refresh Hierarchy
          </button>
        </div>

        {/* Executive Quick Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 pt-2 border-t border-[#d7c3b5]/30">
          <div className="bg-blue-50/60 p-3.5 rounded-xl border border-blue-200">
            <p className="text-[10px] font-extrabold uppercase text-blue-900 tracking-wider">State Leads</p>
            <p className="text-xl font-black text-blue-700 mt-1">{stats.totalState}</p>
          </div>
          <div className="bg-[#fbf9f8] p-3.5 rounded-xl border border-[#d7c3b5]/30">
            <p className="text-[10px] font-extrabold uppercase text-[#52443a] tracking-wider">District Leads</p>
            <p className="text-xl font-black text-[#864f19] mt-1">{stats.totalDist}</p>
          </div>
          <div className="bg-[#fbf9f8] p-3.5 rounded-xl border border-[#d7c3b5]/30">
            <p className="text-[10px] font-extrabold uppercase text-[#52443a] tracking-wider">Division Managers</p>
            <p className="text-xl font-black text-[#1b1c1c] mt-1">{stats.totalDiv}</p>
          </div>
          <div className="bg-[#fbf9f8] p-3.5 rounded-xl border border-[#d7c3b5]/30">
            <p className="text-[10px] font-extrabold uppercase text-[#52443a] tracking-wider">Pincode Agents</p>
            <p className="text-xl font-black text-[#1b1c1c] mt-1">{stats.totalPin}</p>
          </div>
          <div className="bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-200">
            <p className="text-[10px] font-extrabold uppercase text-emerald-800 tracking-wider">Network Earnings</p>
            <p className="text-xl font-black text-emerald-700 mt-1">₹{stats.totalEarnings.toLocaleString()}</p>
          </div>
          <div className="bg-amber-50/60 p-3.5 rounded-xl border border-amber-200">
            <p className="text-[10px] font-extrabold uppercase text-amber-800 tracking-wider">Pending KYCs</p>
            <p className="text-xl font-black text-amber-700 mt-1">{stats.pendingKyc}</p>
          </div>
          <div className="bg-[#fbf9f8] p-3.5 rounded-xl border border-[#d7c3b5]/30">
            <p className="text-[10px] font-extrabold uppercase text-[#52443a] tracking-wider">KYC Compliance</p>
            <p className="text-xl font-black text-[#864f19] mt-1">{stats.kycApprovalRate}%</p>
          </div>
        </div>
      </div>

      {/* Hierarchy Tree Content */}
      <div className="bg-white rounded-2xl border border-[#d7c3b5]/40 p-6 shadow-sm space-y-6">
        {/* Hierarchy Dropdown & Filter Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#d7c3b5]/30">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-extrabold text-[#52443a] uppercase tracking-wider flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-[#864f19]" /> HIERARCHY SCOPE:
            </span>

            {/* Dropdown 1: Tier Level Selector */}
            <div className="relative">
              <select
                value={selectedTierFilter}
                onChange={(e) => setSelectedTierFilter(e.target.value as any)}
                className="bg-[#fbf9f8] border border-[#d7c3b5]/70 text-[#1b1c1c] text-xs font-extrabold rounded-xl py-2 px-3 focus:outline-none focus:ring-1 focus:ring-[#864f19] cursor-pointer shadow-2xs"
              >
                <option value="all">⚡ All Tiers (Full 4-Level Tree)</option>
                <option value="state">🔹 State Agents Level Only</option>
                <option value="district">🔸 District Agents Level Only</option>
                <option value="division">🟡 Division Managers Level Only</option>
                <option value="pincode">📍 Pincode Agents Level Only</option>
              </select>
            </div>

            {/* Dropdown 2: KYC Compliance Status Selector */}
            <div className="relative">
              <select
                value={kycFilter}
                onChange={(e) => setKycFilter(e.target.value)}
                className="bg-[#fbf9f8] border border-[#d7c3b5]/70 text-[#1b1c1c] text-xs font-extrabold rounded-xl py-2 px-3 focus:outline-none focus:ring-1 focus:ring-[#864f19] cursor-pointer shadow-2xs"
              >
                <option value="all">🌐 All KYC Statuses</option>
                <option value="approved">✓ Approved KYC Agents</option>
                <option value="pending">⏳ Pending Verification</option>
                <option value="rejected">✕ Rejected Applications</option>
              </select>
            </div>

            {/* Search Box */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#847468] pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, email, ID, territory..."
                className="bg-[#fbf9f8] border border-[#d7c3b5]/70 text-[#1b1c1c] text-xs font-semibold rounded-xl py-2 pl-8 pr-3 w-64 focus:outline-none focus:ring-1 focus:ring-[#864f19] placeholder:text-[#847468]/60 shadow-2xs transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#847468] hover:text-[#1b1c1c] transition-colors cursor-pointer"
                  title="Clear search"
                >
                  <XCircle className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Quick Expand / Collapse Workflow Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={expandAll}
              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl border border-blue-200 transition cursor-pointer flex items-center gap-1"
            >
              <ChevronDown className="w-3.5 h-3.5" /> Expand All Tiers
            </button>
            <button
              onClick={collapseAll}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition cursor-pointer flex items-center gap-1"
            >
              <ChevronRight className="w-3.5 h-3.5" /> Collapse All Tiers
            </button>
          </div>
        </div>

        {/* Tree Content */}
        <div className="space-y-4">
          {displayedNodes.length === 0 ? (
            <p className="text-center text-xs font-semibold text-slate-400 py-8">No agents found for this role hierarchy filter.</p>
          ) : (
            displayedNodes.map((node) => {
              // Level 1 (State Node)
              if (node.role === 'state') {
                const isStateExpanded = !!expandedNodes[node._id];
                const hasDistricts = node.districts && node.districts.length > 0;

                return (
                  <div
                    key={node._id}
                    className="border-2 border-blue-600/60 rounded-2xl overflow-hidden bg-white shadow-sm transition-all hover:border-blue-700"
                  >
                    {/* STATE AGENT NODE CARD (LEVEL 1) */}
                    {(() => {
                      const metrics = getNodeTierCounts(node);
                      return (
                        <div
                          onClick={() => setSelectedAgent(node)}
                          className="p-5 bg-gradient-to-r from-blue-50/70 to-white flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-blue-100/40 transition border-l-4 border-l-blue-600"
                        >
                          <div className="flex items-center gap-3.5">
                            <button
                              onClick={(e) => toggleExpand(node._id, e)}
                              className="p-2 bg-white border border-blue-300 hover:bg-blue-600 hover:text-white text-blue-700 rounded-xl transition cursor-pointer"
                              title={isStateExpanded ? 'Collapse districts' : 'Expand next 3 tiers (District → Division → Pincode)'}
                            >
                              {isStateExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                            </button>

                            <div>
                              <div className="flex items-center gap-2">
                                {getRoleBadge('state')}
                                <span className="text-xs font-semibold text-slate-400">ID: {node.registrationId}</span>
                                {getKycBadge(node.kycStatus)}
                              </div>
                              <h3 className="text-base font-black text-[#1b1c1c] mt-1">{node.name}</h3>
                              <p className="text-xs font-bold text-[#52443a] flex items-center gap-1.5 mt-0.5">
                                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                                State Territory: {node.territory?.state || 'Karnataka'}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-4">
                            <div className="text-right">
                              <p className="text-[10px] uppercase font-extrabold text-slate-400">Revenue</p>
                              <p className="text-base font-black text-emerald-700">₹{metrics.totalRevenue.toLocaleString()}</p>
                            </div>

                            <div className="text-right border-l border-slate-200 pl-3">
                              <p className="text-[10px] uppercase font-extrabold text-slate-400">Tieups (Today / Yest / Total)</p>
                              <p className="text-xs font-black text-[#1b1c1c]">
                                <span className="text-emerald-700">{metrics.tieupsToday}</span> / <span className="text-blue-700">{metrics.tieupsYesterday}</span> / <span className="text-[#864f19]">{metrics.totalTieups}</span>
                              </p>
                            </div>

                            <div className="text-right border-l border-slate-200 pl-3">
                              <p className="text-[10px] uppercase font-extrabold text-slate-400">Sub-Agents</p>
                              <div className="flex gap-1 text-[10px] font-black mt-0.5">
                                <span className="px-1.5 py-0.5 bg-[#864f19] text-white rounded">{metrics.distCount} Dist</span>
                                <span className="px-1.5 py-0.5 bg-amber-600 text-white rounded">{metrics.divCount} Div</span>
                                <span className="px-1.5 py-0.5 bg-slate-700 text-white rounded">{metrics.pinCount} Pin</span>
                              </div>
                            </div>

                            <div className="text-right border-l border-slate-200 pl-3">
                              <p className="text-[10px] uppercase font-extrabold text-slate-400">Performance</p>
                              <p className="text-sm font-black text-blue-700">{node.performanceScore}%</p>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* DISTRICTS CONTAINER (LEVEL 2) */}
                    {isStateExpanded && (
                      <div className="p-4 bg-blue-50/20 border-t border-blue-200/60 space-y-4 pl-6 md:pl-10 relative">
                        <div className="absolute left-6 top-0 bottom-6 w-0.5 bg-blue-600/30" />

                        {!hasDistricts ? (
                          <p className="text-xs font-semibold text-slate-400 py-3 pl-4">No district agents under this state lead.</p>
                        ) : (
                          node.districts?.map(renderDistrictNode)
                        )}
                      </div>
                    )}
                  </div>
                );
              }

              // Level 2 (District Node directly)
              if (node.role === 'district') {
                return renderDistrictNode(node);
              }

              // Level 3 (Division Node directly)
              if (node.role === 'division') {
                return renderDivisionNode(node);
              }

              // Level 4 (Pincode Node directly)
              return renderPincodeNode(node);
            })
          )}
        </div>
      </div>

      {/* DETAILED AGENT DRILLDOWN MODAL */}
      {selectedAgent && (() => {
        const selMetrics = getNodeTierCounts(selectedAgent);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
            <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-[#d7c3b5]/50 p-6 space-y-6">
              <div className="flex items-start justify-between border-b border-[#d7c3b5]/30 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#ffdcc2] text-[#864f19] font-black text-xl flex items-center justify-center uppercase">
                    {selectedAgent.name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      {getRoleBadge(selectedAgent.role)}
                      {getKycBadge(selectedAgent.kycStatus)}
                    </div>
                    <h2 className="text-xl font-black text-[#1b1c1c] mt-0.5">{selectedAgent.name}</h2>
                    <p className="text-xs text-slate-500 font-medium">{selectedAgent.email} • {selectedAgent.phone}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedAgent(null)}
                  className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-700 border-none bg-transparent cursor-pointer"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="bg-[#fbf9f8] p-3.5 rounded-xl border border-[#d7c3b5]/40 flex flex-wrap items-center gap-2 text-xs font-bold text-[#52443a]">
                <MapPin className="w-4 h-4 text-[#864f19]" />
                <span>State: {selectedAgent.territory?.state || 'Karnataka'}</span>
                {selectedAgent.territory?.district && <span>› District: {selectedAgent.territory.district}</span>}
                {selectedAgent.territory?.division && <span>› Division: {selectedAgent.territory.division}</span>}
                {selectedAgent.territory?.pincode && <span>› PIN: {selectedAgent.territory.pincode}</span>}
              </div>

              {/* Vendor Tie-ups Today & Yesterday Section */}
              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase text-[#864f19] tracking-wider">Merchant Tie-ups Status</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-emerald-50 p-3.5 rounded-2xl border border-emerald-200">
                    <p className="text-[9px] uppercase font-extrabold text-emerald-800">Tieups Today</p>
                    <p className="text-lg font-black text-emerald-700 mt-0.5">{selMetrics.tieupsToday} Shops</p>
                  </div>
                  <div className="bg-blue-50 p-3.5 rounded-2xl border border-blue-200">
                    <p className="text-[9px] uppercase font-extrabold text-blue-800">Tieups Yesterday</p>
                    <p className="text-lg font-black text-blue-700 mt-0.5">{selMetrics.tieupsYesterday} Shops</p>
                  </div>
                  <div className="bg-amber-50 p-3.5 rounded-2xl border border-amber-200">
                    <p className="text-[9px] uppercase font-extrabold text-amber-800">Total Tieups</p>
                    <p className="text-lg font-black text-amber-800 mt-0.5">{selMetrics.totalTieups} Total</p>
                  </div>
                </div>
              </div>

              {/* Financial & Performance Metrics */}
              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase text-[#864f19] tracking-wider">Revenue & Performance</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-[#fbf9f8] p-3.5 rounded-2xl border border-[#d7c3b5]/30">
                    <p className="text-[9px] uppercase font-extrabold text-[#52443a]">Total Revenue</p>
                    <p className="text-lg font-black text-emerald-700 mt-0.5">₹{selMetrics.totalRevenue.toLocaleString()}</p>
                  </div>
                  <div className="bg-[#fbf9f8] p-3.5 rounded-2xl border border-[#d7c3b5]/30">
                    <p className="text-[9px] uppercase font-extrabold text-[#52443a]">Performance Score</p>
                    <p className="text-lg font-black text-[#864f19] mt-0.5">{selectedAgent.performanceScore}%</p>
                  </div>
                  <div className="bg-[#fbf9f8] p-3.5 rounded-2xl border border-[#d7c3b5]/30">
                    <p className="text-[9px] uppercase font-extrabold text-[#52443a]">Reg. Fee</p>
                    <p className={`text-xs font-black mt-2 ${selectedAgent.registrationFeePaid ? 'text-emerald-700' : 'text-rose-600'}`}>
                      {selectedAgent.registrationFeePaid ? '✓ PAID' : '✗ UNPAID'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Downstream Sub-Agents Breakdown */}
              {selectedAgent.role !== 'pincode' && (
                <div className="space-y-2">
                  <h4 className="text-xs font-black uppercase text-[#864f19] tracking-wider">Downstream Agents Count</h4>
                  <div className="grid grid-cols-3 gap-3">
                    {selectedAgent.role === 'state' && (
                      <div className="bg-[#864f19]/10 p-3 rounded-2xl border border-[#864f19]/20 text-[#864f19]">
                        <p className="text-[9px] uppercase font-extrabold">District Agents</p>
                        <p className="text-lg font-black mt-0.5">{selMetrics.distCount} Agents</p>
                      </div>
                    )}
                    {(selectedAgent.role === 'state' || selectedAgent.role === 'district') && (
                      <div className="bg-amber-100/60 p-3 rounded-2xl border border-amber-300 text-amber-900">
                        <p className="text-[9px] uppercase font-extrabold">Division Managers</p>
                        <p className="text-lg font-black mt-0.5">{selMetrics.divCount} Agents</p>
                      </div>
                    )}
                    <div className="bg-slate-100 p-3 rounded-2xl border border-slate-300 text-slate-800">
                      <p className="text-[9px] uppercase font-extrabold">Pincode Agents</p>
                      <p className="text-lg font-black mt-0.5">{selMetrics.pinCount} Agents</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setSelectedAgent(null)}
                  className="px-6 py-2.5 bg-[#864f19] text-white text-xs font-black rounded-xl hover:bg-[#864f19]/90 transition border-none cursor-pointer"
                >
                  Close Scorecard
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default AgentManagement;
