import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import {
  Users, Search, Filter, ChevronRight, ChevronDown, Award, TrendingUp,
  AlertTriangle, CheckCircle, Clock, XCircle, DollarSign, ShieldAlert,
  Building2, MapPin, Phone, Mail, ArrowUpRight, ArrowDownRight, User, Eye, RefreshCw, GitFork, Shield,
  ArrowLeft, Layers, Compass
} from 'lucide-react';

export interface AgentNode {
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

// Comprehensive Demo Hierarchy Tree covering Tamil Nadu and Karnataka
const DEMO_HIERARCHY: AgentNode[] = [
  {
    _id: 'state-tn',
    name: 'Siddharth (TN State Lead)',
    email: 'tn_state@forge.in',
    phone: '+91 98765 00001',
    registrationId: 'REG-TN-STATE',
    role: 'state',
    kycStatus: 'approved',
    registrationFeePaid: true,
    performanceScore: 96,
    earnings: 85000,
    tieupsToday: 42,
    tieupsYesterday: 38,
    totalTieups: 420,
    territory: { state: 'Tamil Nadu' },
    plusPoints: ['KYC Verified', 'Top State Lead', 'High Growth Territory'],
    minusPoints: [],
    districts: [
      {
        _id: 'dist-tn-krishnagiri',
        name: 'Muthuswamy (District Lead)',
        email: 'muthuswamy@connect.in',
        phone: '+91 90123 45678',
        registrationId: 'REG-DIST-TN01',
        role: 'district',
        kycStatus: 'approved',
        registrationFeePaid: true,
        performanceScore: 92,
        earnings: 48000,
        tieupsToday: 22,
        tieupsYesterday: 19,
        totalTieups: 215,
        territory: { state: 'Tamil Nadu', district: 'Krishnagiri District' },
        plusPoints: ['KYC Verified', '100% Target Rate'],
        minusPoints: [],
        divisions: [
          {
            _id: 'div-tn-hosur',
            name: 'Priya Sharma (Hosur Division Lead)',
            email: 'hosur.div@connect.in',
            phone: '+91 91234 56780',
            registrationId: 'REG-DIV-TN101',
            role: 'division',
            kycStatus: 'approved',
            registrationFeePaid: true,
            performanceScore: 88,
            earnings: 28000,
            tieupsToday: 12,
            tieupsYesterday: 10,
            totalTieups: 120,
            territory: { state: 'Tamil Nadu', district: 'Krishnagiri District', division: 'Hosur Division' },
            plusPoints: ['KYC Verified', 'Active Subordinates'],
            minusPoints: [],
            pincodes: [
              {
                _id: 'pin-tn-635109',
                name: 'Anil Kumar (Pincode Agent 635109)',
                email: 'anil.635109@connect.in',
                phone: '+91 99887 76655',
                registrationId: 'REG-PIN-635109',
                role: 'pincode',
                kycStatus: 'approved',
                registrationFeePaid: true,
                performanceScore: 94,
                earnings: 14500,
                tieupsToday: 6,
                tieupsYesterday: 5,
                totalTieups: 62,
                territory: { state: 'Tamil Nadu', district: 'Krishnagiri District', division: 'Hosur Division', pincode: '635109' },
                plusPoints: ['KYC Verified', 'Top Merchant Converter'],
                minusPoints: []
              },
              {
                _id: 'pin-tn-635126',
                name: 'Ramesh V (Pincode Agent 635126)',
                email: 'ramesh.635126@connect.in',
                phone: '+91 99887 76677',
                registrationId: 'REG-PIN-635126',
                role: 'pincode',
                kycStatus: 'approved',
                registrationFeePaid: true,
                performanceScore: 85,
                earnings: 11200,
                tieupsToday: 4,
                tieupsYesterday: 4,
                totalTieups: 48,
                territory: { state: 'Tamil Nadu', district: 'Krishnagiri District', division: 'Hosur Division', pincode: '635126' },
                plusPoints: ['KYC Verified'],
                minusPoints: []
              }
            ]
          },
          {
            _id: 'div-tn-bargur',
            name: 'Karthik Raja (Bargur Division Lead)',
            email: 'bargur.div@connect.in',
            phone: '+91 98765 05566',
            registrationId: 'REG-DIV-TN102',
            role: 'division',
            kycStatus: 'approved',
            registrationFeePaid: true,
            performanceScore: 82,
            earnings: 22000,
            tieupsToday: 8,
            tieupsYesterday: 7,
            totalTieups: 85,
            territory: { state: 'Tamil Nadu', district: 'Krishnagiri District', division: 'Bargur Division' },
            plusPoints: ['KYC Verified'],
            minusPoints: [],
            pincodes: [
              {
                _id: 'pin-tn-635104',
                name: 'Senthil M (Pincode Agent 635104)',
                email: 'senthil.635104@connect.in',
                phone: '+91 97654 32109',
                registrationId: 'REG-PIN-635104',
                role: 'pincode',
                kycStatus: 'approved',
                registrationFeePaid: true,
                performanceScore: 80,
                earnings: 9800,
                tieupsToday: 3,
                tieupsYesterday: 4,
                totalTieups: 41,
                territory: { state: 'Tamil Nadu', district: 'Krishnagiri District', division: 'Bargur Division', pincode: '635104' },
                plusPoints: ['KYC Verified'],
                minusPoints: []
              }
            ]
          }
        ]
      },
      {
        _id: 'dist-tn-dharmapuri',
        name: 'Venkatesh (Dharmapuri District Lead)',
        email: 'dharmapuri.dist@connect.in',
        phone: '+91 91234 99887',
        registrationId: 'REG-DIST-TN02',
        role: 'district',
        kycStatus: 'approved',
        registrationFeePaid: true,
        performanceScore: 86,
        earnings: 36000,
        tieupsToday: 14,
        tieupsYesterday: 12,
        totalTieups: 155,
        territory: { state: 'Tamil Nadu', district: 'Dharmapuri District' },
        plusPoints: ['KYC Verified'],
        minusPoints: [],
        divisions: [
          {
            _id: 'div-tn-dharmapuri-sec',
            name: 'Manjunath (Dharmapuri Division Lead)',
            email: 'dharmapuri.sec@connect.in',
            phone: '+91 94433 22110',
            registrationId: 'REG-DIV-TN201',
            role: 'division',
            kycStatus: 'approved',
            registrationFeePaid: true,
            performanceScore: 84,
            earnings: 19500,
            tieupsToday: 7,
            tieupsYesterday: 6,
            totalTieups: 72,
            territory: { state: 'Tamil Nadu', district: 'Dharmapuri District', division: 'Dharmapuri Division' },
            plusPoints: ['KYC Verified'],
            minusPoints: [],
            pincodes: [
              {
                _id: 'pin-tn-636701',
                name: 'Vijay K (Pincode Agent 636701)',
                email: 'vijay.636701@connect.in',
                phone: '+91 93322 11009',
                registrationId: 'REG-PIN-636701',
                role: 'pincode',
                kycStatus: 'approved',
                registrationFeePaid: true,
                performanceScore: 83,
                earnings: 9200,
                tieupsToday: 3,
                tieupsYesterday: 3,
                totalTieups: 38,
                territory: { state: 'Tamil Nadu', district: 'Dharmapuri District', division: 'Dharmapuri Division', pincode: '636701' },
                plusPoints: ['KYC Verified'],
                minusPoints: []
              }
            ]
          }
        ]
      }
    ]
  },
  {
    _id: 'state-ka',
    name: 'Rajesh (KA State Lead)',
    email: 'state@forge.in',
    phone: '+91 98765 00002',
    registrationId: 'REG-KA-STATE',
    role: 'state',
    kycStatus: 'approved',
    registrationFeePaid: true,
    performanceScore: 94,
    earnings: 78000,
    tieupsToday: 36,
    tieupsYesterday: 32,
    totalTieups: 380,
    territory: { state: 'Karnataka' },
    plusPoints: ['KYC Verified', 'Top Metro Territory'],
    minusPoints: [],
    districts: [
      {
        _id: 'dist-ka-bengaluru',
        name: 'Amit (Bengaluru Urban District Lead)',
        email: 'district@forge.in',
        phone: '+91 98765 43210',
        registrationId: 'REG-DIST-KA01',
        role: 'district',
        kycStatus: 'approved',
        registrationFeePaid: true,
        performanceScore: 91,
        earnings: 45000,
        tieupsToday: 20,
        tieupsYesterday: 18,
        totalTieups: 195,
        territory: { state: 'Karnataka', district: 'Bengaluru Urban' },
        plusPoints: ['KYC Verified'],
        minusPoints: [],
        divisions: [
          {
            _id: 'div-ka-south',
            name: 'Kiran (Bengaluru South Division Lead)',
            email: 'bengaluru.south@connect.in',
            phone: '+91 97654 00112',
            registrationId: 'REG-DIV-KA101',
            role: 'division',
            kycStatus: 'approved',
            registrationFeePaid: true,
            performanceScore: 89,
            earnings: 26000,
            tieupsToday: 10,
            tieupsYesterday: 9,
            totalTieups: 110,
            territory: { state: 'Karnataka', district: 'Bengaluru Urban', division: 'Bengaluru South' },
            plusPoints: ['KYC Verified'],
            minusPoints: [],
            pincodes: [
              {
                _id: 'pin-ka-560083',
                name: 'Anil (Pincode Agent 560083)',
                email: 'pincode@forge.in',
                phone: '+91 99887 00111',
                registrationId: 'REG-PIN-560083',
                role: 'pincode',
                kycStatus: 'approved',
                registrationFeePaid: true,
                performanceScore: 90,
                earnings: 13800,
                tieupsToday: 5,
                tieupsYesterday: 5,
                totalTieups: 55,
                territory: { state: 'Karnataka', district: 'Bengaluru Urban', division: 'Bengaluru South', pincode: '560083' },
                plusPoints: ['KYC Verified'],
                minusPoints: []
              }
            ]
          }
        ]
      }
    ]
  }
];

export const AgentManagement: React.FC = () => {
  const { user } = useAuth();
  const activeRole = user?.role || 'state';

  // Logged-in Agent's Territory Parameters
  const userState = user?.territory?.state || 'Tamil Nadu';
  const userDistrict = user?.territory?.district || 'Krishnagiri District';
  const userDivision = user?.territory?.division || 'Hosur Division';
  const userPincode = user?.territory?.pincode || '635109';

  // Search & Filter controls
  const [searchTerm, setSearchTerm] = useState('');
  const [kycFilter, setKycFilter] = useState<string>('all');
  const [selectedAgent, setSelectedAgent] = useState<AgentNode | null>(null);

  // Drill-down selection states
  const [selectedDistrictId, setSelectedDistrictId] = useState<string | null>(null);
  const [selectedDivisionId, setSelectedDivisionId] = useState<string | null>(null);

  // Fetch live backend hierarchy
  const { data: hierarchyData, isLoading: isHierarchyLoading, refetch: refetchHierarchy } = useQuery({
    queryKey: ['agentHierarchy', kycFilter],
    queryFn: async () => {
      try {
        const res = await api.get(`/admin/hierarchy?status=${kycFilter}`);
        return res.data;
      } catch (err: any) {
        if (err?.response?.status !== 401) {
          console.warn('Hierarchy fetch fallback to demo structure:', err);
        }
        return null;
      }
    },
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 401) return false;
      return failureCount < 1;
    }
  });

  // Extract base tree states array
  const allStates: AgentNode[] = useMemo(() => {
    const apiTree: AgentNode[] = hierarchyData?.states || hierarchyData?.tree || [];
    return apiTree.length > 0 ? apiTree : DEMO_HIERARCHY;
  }, [hierarchyData]);

  // 1. STATE AGENT SCOPING: Strictly isolate assigned State
  const assignedStateNode = useMemo(() => {
    const targetState = userState.toLowerCase();
    const found = allStates.find(s => {
      const sState = (s.territory?.state || s.name || '').toLowerCase();
      return sState.includes(targetState) || targetState.includes(sState);
    });

    if (found) return found;

    // Construct self-node fallback for state agent if not found in list
    return {
      _id: 'state-user-assigned',
      name: user?.name || 'State Agent',
      email: user?.email || '',
      phone: user?.phone || user?.mobile || '',
      registrationId: user?.registrationId || 'REG-STATE',
      role: 'state' as const,
      kycStatus: user?.kycStatus || 'approved',
      registrationFeePaid: true,
      performanceScore: 95,
      earnings: 50000,
      tieupsToday: 10,
      tieupsYesterday: 8,
      totalTieups: 100,
      territory: { state: userState },
      plusPoints: ['KYC Verified', 'Assigned State Lead'],
      minusPoints: [],
      districts: DEMO_HIERARCHY[0].districts
    };
  }, [allStates, userState, user]);

  // 2. DISTRICT AGENT SCOPING: Strictly isolate assigned District
  const assignedDistrictNode = useMemo(() => {
    const targetDist = userDistrict.toLowerCase();
    const allDistricts = assignedStateNode.districts || allStates.flatMap(s => s.districts || []);
    const found = allDistricts.find(d => {
      const dDist = (d.territory?.district || d.name || '').toLowerCase();
      return dDist.includes(targetDist) || targetDist.includes(dDist);
    });

    if (found) return found;

    return {
      _id: 'dist-user-assigned',
      name: user?.name || 'District Agent',
      email: user?.email || '',
      phone: user?.phone || user?.mobile || '',
      registrationId: user?.registrationId || 'REG-DIST',
      role: 'district' as const,
      kycStatus: user?.kycStatus || 'approved',
      registrationFeePaid: true,
      performanceScore: 92,
      earnings: 40000,
      tieupsToday: 8,
      tieupsYesterday: 6,
      totalTieups: 80,
      territory: { state: userState, district: userDistrict },
      plusPoints: ['KYC Verified', 'Assigned District Lead'],
      minusPoints: [],
      divisions: DEMO_HIERARCHY[0].districts?.[0].divisions
    };
  }, [assignedStateNode, allStates, userDistrict, userState, user]);

  // 3. DIVISION AGENT SCOPING: Strictly isolate assigned Division
  const assignedDivisionNode = useMemo(() => {
    const targetDiv = userDivision.toLowerCase();
    const allDivisions = assignedDistrictNode.divisions || allStates.flatMap(s => s.districts?.flatMap(d => d.divisions || []) || []);
    const found = allDivisions.find(div => {
      const divName = (div.territory?.division || div.name || '').toLowerCase();
      return divName.includes(targetDiv) || targetDiv.includes(divName);
    });

    if (found) return found;

    return {
      _id: 'div-user-assigned',
      name: user?.name || 'Division Agent',
      email: user?.email || '',
      phone: user?.phone || user?.mobile || '',
      registrationId: user?.registrationId || 'REG-DIV',
      role: 'division' as const,
      kycStatus: user?.kycStatus || 'approved',
      registrationFeePaid: true,
      performanceScore: 88,
      earnings: 25000,
      tieupsToday: 5,
      tieupsYesterday: 4,
      totalTieups: 50,
      territory: { state: userState, district: userDistrict, division: userDivision },
      plusPoints: ['KYC Verified', 'Assigned Division Manager'],
      minusPoints: [],
      pincodes: DEMO_HIERARCHY[0].districts?.[0].divisions?.[0].pincodes
    };
  }, [assignedDistrictNode, allStates, userDivision, userDistrict, userState, user]);

  // 4. PINCODE AGENT SCOPING: Strictly isolate assigned Pincode
  const assignedPincodeNode = useMemo(() => {
    const targetPin = userPincode;
    const allPincodes = assignedDivisionNode.pincodes || allStates.flatMap(s => s.districts?.flatMap(d => d.divisions?.flatMap(p => p.pincodes || []) || []) || []);
    const found = allPincodes.find(pin => pin.territory?.pincode === targetPin);

    if (found) return found;

    return {
      _id: 'pin-user-assigned',
      name: user?.name || 'Pincode Agent',
      email: user?.email || '',
      phone: user?.phone || user?.mobile || '',
      registrationId: user?.registrationId || 'REG-PIN',
      role: 'pincode' as const,
      kycStatus: user?.kycStatus || 'approved',
      registrationFeePaid: true,
      performanceScore: 90,
      earnings: 14000,
      tieupsToday: 4,
      tieupsYesterday: 3,
      totalTieups: 40,
      territory: { state: userState, district: userDistrict, division: userDivision, pincode: userPincode },
      plusPoints: ['KYC Verified', 'Assigned Pincode Agent'],
      minusPoints: []
    };
  }, [assignedDivisionNode, allStates, userPincode, userDivision, userDistrict, userState, user]);

  // Currently Selected District object for Drill-down
  const activeDistrictNode = useMemo(() => {
    if (activeRole === 'district') return assignedDistrictNode;
    if (!selectedDistrictId) return null;
    const dists = assignedStateNode.districts || [];
    return dists.find(d => d._id === selectedDistrictId) || null;
  }, [activeRole, assignedDistrictNode, selectedDistrictId, assignedStateNode]);

  // Currently Selected Division object for Drill-down
  const activeDivisionNode = useMemo(() => {
    if (activeRole === 'division') return assignedDivisionNode;
    if (!selectedDivisionId) return null;
    const currentDivs = activeDistrictNode ? (activeDistrictNode.divisions || []) : (assignedDistrictNode.divisions || []);
    return currentDivs.find(d => d._id === selectedDivisionId) || null;
  }, [activeRole, assignedDivisionNode, selectedDivisionId, activeDistrictNode, assignedDistrictNode]);

  // Helper metric calculator
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

    if (node.role === 'state') {
      if (distCount === 0) distCount = node.districts?.length || 0;
      if (divCount === 0) divCount = node.districts?.reduce((acc, d) => acc + (d.divisions?.length || 0), 0) || (node.divisions?.length || 0);
      if (pinCount === 0) pinCount = node.districts?.reduce((acc, d) => acc + (d.divisions?.reduce((a2, div) => a2 + (div.pincodes?.length || 0), 0) || 0), 0) || node.divisions?.reduce((acc, div) => acc + (div.pincodes?.length || 0), 0) || (node.pincodes?.length || 0);
    } else if (node.role === 'district') {
      if (divCount === 0) divCount = node.divisions?.length || 0;
      if (pinCount === 0) pinCount = node.divisions?.reduce((acc, div) => acc + (div.pincodes?.length || 0), 0) || 0;
    } else if (node.role === 'division') {
      if (pinCount === 0) pinCount = node.pincodes?.length || 0;
    }

    const tieupsToday = node.tieupsToday ?? 0;
    const tieupsYesterday = node.tieupsYesterday ?? 0;
    const totalTieups = node.totalTieups ?? 0;
    const totalRevenue = node.teamEarnings ?? node.earnings ?? 0;

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

  // Filter items by search & KYC filter
  const filterList = (items: AgentNode[]) => {
    return items.filter(item => {
      if (kycFilter !== 'all' && item.kycStatus !== kycFilter) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const name = (item.name || '').toLowerCase();
        const email = (item.email || '').toLowerCase();
        const regId = (item.registrationId || '').toLowerCase();
        const pincode = (item.territory?.pincode || '').toLowerCase();
        const dist = (item.territory?.district || '').toLowerCase();
        const div = (item.territory?.division || '').toLowerCase();
        return name.includes(q) || email.includes(q) || regId.includes(q) || pincode.includes(q) || dist.includes(q) || div.includes(q);
      }
      return true;
    });
  };

  return (
    <div className="space-y-6 pb-12 text-[#1b1c1c] font-sans">
      
      {/* Header Management Bar */}
      <div className="bg-white p-6 rounded-2xl border border-[#d7c3b5]/40 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#864f19]/10 text-[#864f19] rounded-xl">
              <GitFork className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-[#1b1c1c] tracking-tight">Role-Based Agent Directory</h1>
                <span className="px-2.5 py-0.5 bg-[#864f19]/10 text-[#864f19] font-black text-[10px] uppercase rounded-full border border-[#864f19]/20">
                  Role: {activeRole.toUpperCase()} AGENT
                </span>
              </div>
              <p className="text-xs text-[#52443a] font-semibold mt-0.5">
                Territory-Scoped Drill-Down Directory: {activeRole === 'state' ? `Assigned State (${userState})` : activeRole === 'district' ? `Assigned District (${userDistrict})` : activeRole === 'division' ? `Assigned Division (${userDivision})` : `Assigned Pincode (${userPincode})`}
              </p>
            </div>
          </div>

          <button
            onClick={() => refetchHierarchy()}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-[#864f19] bg-[#864f19]/10 hover:bg-[#864f19]/20 rounded-xl transition border-none cursor-pointer shrink-0 self-start md:self-auto"
          >
            <RefreshCw className={`w-4 h-4 ${isHierarchyLoading ? 'animate-spin' : ''}`} /> Refresh Directory
          </button>
        </div>

        {/* Territory Drill-Down Breadcrumb Trail */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-extrabold bg-[#fbf9f8] p-3.5 rounded-xl border border-[#d7c3b5]/40 text-[#864f19]">
          <span className="text-slate-400 uppercase text-[10px] tracking-wider font-black mr-1 flex items-center gap-1">
            <Compass className="w-3.5 h-3.5 text-[#864f19]" /> Territory Scope:
          </span>

          {/* Level 1: State */}
          {(activeRole === 'state' || (activeRole as string) === 'admin' || activeRole === 'executive') && (
            <button
              onClick={() => { setSelectedDistrictId(null); setSelectedDivisionId(null); }}
              className={`hover:underline flex items-center gap-1 cursor-pointer border-none bg-transparent ${!selectedDistrictId ? 'text-[#864f19] font-black' : 'text-slate-600 font-semibold'}`}
            >
              <Building2 className="w-3.5 h-3.5" /> State: {assignedStateNode.territory?.state || userState}
            </button>
          )}

          {/* Level 2: District */}
          {(activeRole === 'district' || activeDistrictNode) && (
            <>
              {(activeRole === 'state' || (activeRole as string) === 'admin' || activeRole === 'executive') && (
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              )}
              <button
                onClick={() => setSelectedDivisionId(null)}
                className={`hover:underline flex items-center gap-1 cursor-pointer border-none bg-transparent ${!selectedDivisionId ? 'text-[#864f19] font-black' : 'text-slate-600 font-semibold'}`}
              >
                <MapPin className="w-3.5 h-3.5 text-[#864f19]" /> District: {activeDistrictNode?.territory?.district || userDistrict}
              </button>
            </>
          )}

          {/* Level 3: Division */}
          {(activeRole === 'division' || activeDivisionNode) && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[#864f19] font-black flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-amber-600" /> Division: {activeDivisionNode?.territory?.division || userDivision}
              </span>
            </>
          )}

          {/* Level 4: Pincode */}
          {activeRole === 'pincode' && (
            <span className="text-slate-800 font-black flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-700" /> Pincode Sector: {userPincode}
            </span>
          )}
        </div>
      </div>

      {/* Main Hierarchy Container */}
      <div className="bg-white rounded-2xl border border-[#d7c3b5]/40 p-6 shadow-sm space-y-6">
        
        {/* Search Box & KYC Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#d7c3b5]/30">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Box */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#847468] pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filter by name, email, ID, pincode..."
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

            {/* KYC Status Filter */}
            <select
              value={kycFilter}
              onChange={(e) => setKycFilter(e.target.value)}
              className="bg-[#fbf9f8] border border-[#d7c3b5]/70 text-[#1b1c1c] text-xs font-extrabold rounded-xl py-2 px-3 focus:outline-none focus:ring-1 focus:ring-[#864f19] cursor-pointer shadow-2xs"
            >
              <option value="all">🌐 All KYC Statuses</option>
              <option value="approved">✓ Approved KYC</option>
              <option value="pending">⏳ Pending Verification</option>
              <option value="rejected">✕ Rejected</option>
            </select>
          </div>

          {(selectedDistrictId || selectedDivisionId) && (
            <button
              onClick={() => { setSelectedDistrictId(null); setSelectedDivisionId(null); }}
              className="px-3.5 py-1.5 bg-[#fbf9f8] hover:bg-[#eae8e7] text-[#864f19] border border-[#d7c3b5] font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to {selectedDivisionId ? 'Divisions List' : 'Districts List'}
            </button>
          )}
        </div>

        {/* ------------------------------------------------------------- */}
        {/* ROLE VIEW 1: STATE AGENT                                     */}
        {/* ------------------------------------------------------------- */}
        {(activeRole === 'state' || (activeRole as string) === 'admin' || activeRole === 'executive') && (
          <div className="space-y-6">
            
            {/* LEVEL A: STATE DRILL-DOWN STEP 1 — Show Districts in Assigned State */}
            {!selectedDistrictId && (
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-[#fbf9f8] p-4 rounded-xl border border-[#d7c3b5]/40">
                  <div>
                    <h3 className="text-base font-black text-[#1b1c1c] flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-blue-600" />
                      Assigned State: {assignedStateNode.territory?.state || userState}
                    </h3>
                    <p className="text-xs font-semibold text-[#52443a] mt-0.5">
                      Select a District to view its Divisions and Pincodes.
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-blue-100 text-blue-900 font-extrabold text-xs rounded-lg border border-blue-200">
                    {assignedStateNode.districts?.length || 0} Districts Total
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {filterList(assignedStateNode.districts || []).length === 0 ? (
                    <p className="text-center text-xs font-semibold text-slate-400 py-8 bg-slate-50 rounded-xl border border-slate-200">
                      No districts found matching filters under {userState}.
                    </p>
                  ) : (
                    filterList(assignedStateNode.districts || []).map((dist) => {
                      const metrics = getNodeTierCounts(dist);
                      return (
                        <div
                          key={dist._id}
                          className="border border-[#d7c3b5]/50 rounded-2xl overflow-hidden bg-white shadow-xs transition-all hover:border-[#864f19] hover:shadow-md"
                        >
                          <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-l-4 border-l-[#864f19]">
                            <div>
                              <div className="flex items-center gap-2">
                                {getRoleBadge('district')}
                                <span className="text-xs font-semibold text-slate-400">ID: {dist.registrationId}</span>
                                {getKycBadge(dist.kycStatus)}
                              </div>
                              <h3 className="text-base font-black text-[#1b1c1c] mt-1">{dist.name}</h3>
                              <p className="text-xs font-bold text-[#52443a] flex items-center gap-1.5 mt-0.5">
                                <MapPin className="w-3.5 h-3.5 text-[#864f19]" />
                                District: {dist.territory?.district || dist.name} ({userState})
                              </p>
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
                                <p className="text-[10px] uppercase font-extrabold text-slate-400">Sub-Divisions</p>
                                <span className="px-2 py-0.5 bg-amber-600 text-white font-black text-[10px] rounded">
                                  {metrics.divCount} Divisions
                                </span>
                              </div>

                              <div className="flex gap-2 border-l border-slate-200 pl-3">
                                <button
                                  onClick={() => setSelectedAgent(dist)}
                                  className="px-3 py-1.5 bg-[#fbf9f8] hover:bg-[#eae8e7] text-[#864f19] font-bold text-xs rounded-xl border border-[#d7c3b5] transition cursor-pointer flex items-center gap-1"
                                >
                                  <Eye className="w-3.5 h-3.5" /> Details
                                </button>
                                <button
                                  onClick={() => setSelectedDistrictId(dist._id)}
                                  className="px-4 py-1.5 bg-[#864f19] hover:bg-[#a3672f] text-white font-extrabold text-xs rounded-xl transition cursor-pointer shadow-2xs flex items-center gap-1"
                                >
                                  <span>Explore Divisions</span>
                                  <ChevronRight className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* LEVEL B: STATE DRILL-DOWN STEP 2 — Show Divisions within Selected District */}
            {selectedDistrictId && !selectedDivisionId && activeDistrictNode && (
              <div className="space-y-4">
                <div className="bg-[#fbf9f8] p-5 rounded-2xl border border-[#d7c3b5]/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-black uppercase text-[#864f19] tracking-wider block">Selected District Level</span>
                    <h3 className="text-lg font-black text-[#1b1c1c] flex items-center gap-2 mt-0.5">
                      <MapPin className="w-5 h-5 text-[#864f19]" />
                      District: {activeDistrictNode.territory?.district || activeDistrictNode.name}
                    </h3>
                    <p className="text-xs font-semibold text-[#52443a] mt-0.5">
                      District Lead: {activeDistrictNode.name} ({activeDistrictNode.email})
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedAgent(activeDistrictNode)}
                    className="px-3.5 py-2 bg-white hover:bg-[#f6f3f2] text-[#864f19] font-extrabold text-xs rounded-xl border border-[#d7c3b5] transition cursor-pointer flex items-center gap-1.5 self-start md:self-auto shadow-2xs"
                  >
                    <Eye className="w-4 h-4" /> View District Scorecard
                  </button>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-[#864f19] flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-amber-600" />
                    Divisions within {activeDistrictNode.territory?.district || activeDistrictNode.name} ({activeDistrictNode.divisions?.length || 0})
                  </h4>

                  {filterList(activeDistrictNode.divisions || []).length === 0 ? (
                    <p className="text-center text-xs font-semibold text-slate-400 py-8 bg-slate-50 rounded-xl border border-slate-200">
                      No division agents registered in this district.
                    </p>
                  ) : (
                    filterList(activeDistrictNode.divisions || []).map((div) => {
                      const metrics = getNodeTierCounts(div);
                      return (
                        <div
                          key={div._id}
                          className="border border-[#d7c3b5]/40 rounded-xl bg-white p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs hover:border-[#864f19]/60 transition border-l-4 border-l-amber-600"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              {getRoleBadge('division')}
                              <span className="text-[11px] font-semibold text-slate-400">{div.registrationId}</span>
                              {getKycBadge(div.kycStatus)}
                            </div>
                            <h4 className="text-sm font-bold text-[#1b1c1c] mt-1">{div.name}</h4>
                            <p className="text-[11px] text-slate-500 font-medium">
                              Division: <span className="font-bold text-slate-700">{div.territory?.division || div.name}</span>
                            </p>
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
                              <p className="text-[9px] uppercase font-bold text-slate-400">Pincode Sectors</p>
                              <span className="px-2 py-0.5 bg-slate-700 text-white font-black text-[10px] rounded">
                                {metrics.pinCount} Pincodes
                              </span>
                            </div>

                            <div className="flex gap-2 border-l border-slate-200 pl-3">
                              <button
                                onClick={() => setSelectedAgent(div)}
                                className="px-3 py-1.5 bg-[#fbf9f8] hover:bg-[#eae8e7] text-[#864f19] font-bold text-xs rounded-xl border border-[#d7c3b5] transition cursor-pointer flex items-center gap-1"
                              >
                                <Eye className="w-3.5 h-3.5" /> Details
                              </button>
                              <button
                                onClick={() => setSelectedDivisionId(div._id)}
                                className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-xl transition cursor-pointer shadow-2xs flex items-center gap-1"
                              >
                                <span>Explore Pincodes</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* LEVEL C: STATE DRILL-DOWN STEP 3 — Show Pincodes within Selected Division */}
            {selectedDivisionId && activeDivisionNode && (
              <div className="space-y-4">
                <div className="bg-amber-50/60 p-5 rounded-2xl border border-amber-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-black uppercase text-amber-900 tracking-wider block">Selected Division Level</span>
                    <h3 className="text-lg font-black text-amber-950 flex items-center gap-2 mt-0.5">
                      <Layers className="w-5 h-5 text-amber-600" />
                      Division: {activeDivisionNode.territory?.division || activeDivisionNode.name}
                    </h3>
                    <p className="text-xs font-semibold text-amber-800 mt-0.5">
                      Division Manager: {activeDivisionNode.name} ({activeDivisionNode.email})
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedAgent(activeDivisionNode)}
                    className="px-3.5 py-2 bg-white hover:bg-amber-50 text-amber-900 font-extrabold text-xs rounded-xl border border-amber-300 transition cursor-pointer flex items-center gap-1.5 self-start md:self-auto shadow-2xs"
                  >
                    <Eye className="w-4 h-4 text-amber-600" /> View Division Scorecard
                  </button>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-[#864f19] flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-slate-700" />
                    Pincode Agents in {activeDivisionNode.territory?.division || activeDivisionNode.name} ({activeDivisionNode.pincodes?.length || 0})
                  </h4>

                  {filterList(activeDivisionNode.pincodes || []).length === 0 ? (
                    <p className="text-center text-xs font-semibold text-slate-400 py-8 bg-slate-50 rounded-xl border border-slate-200">
                      No pincode agents registered under this division.
                    </p>
                  ) : (
                    filterList(activeDivisionNode.pincodes || []).map((pin) => {
                      const metrics = getNodeTierCounts(pin);
                      return (
                        <div
                          key={pin._id}
                          onClick={() => setSelectedAgent(pin)}
                          className="p-4 bg-white border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-[#864f19] cursor-pointer transition shadow-2xs"
                        >
                          <div className="flex items-center gap-3">
                            <span className="p-2 bg-slate-100 text-slate-700 rounded-lg">
                              <MapPin className="w-4 h-4" />
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-xs text-[#1b1c1c]">{pin.name}</span>
                                <span className="px-2 py-0.5 bg-slate-800 text-white text-[10px] font-black rounded">
                                  PIN: {pin.territory?.pincode || 'N/A'}
                                </span>
                                {getKycBadge(pin.kycStatus)}
                              </div>
                              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{pin.phone} • ID: {pin.registrationId}</p>
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

                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setSelectedAgent(pin); }}
                              className="px-3 py-1 bg-[#fbf9f8] hover:bg-[#eae8e7] text-[#864f19] font-bold text-xs rounded-lg border border-[#d7c3b5] transition cursor-pointer flex items-center gap-1"
                            >
                              <Eye className="w-3.5 h-3.5" /> Profile
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* ROLE VIEW 2: DISTRICT AGENT                                  */}
        {/* ------------------------------------------------------------- */}
        {activeRole === 'district' && (
          <div className="space-y-6">
            
            {/* DISTRICT LEVEL VIEW 1: Show District Details Header & List of Divisions */}
            {!selectedDivisionId && (
              <div className="space-y-5">
                {/* District Details Header (Only District Agent's assigned District is shown) */}
                <div className="border border-[#d7c3b5]/60 rounded-2xl overflow-hidden bg-gradient-to-r from-[#fbf9f8] to-white p-5 shadow-xs border-l-4 border-l-[#864f19]">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        {getRoleBadge('district')}
                        <span className="text-xs font-semibold text-slate-400">ID: {assignedDistrictNode.registrationId}</span>
                        {getKycBadge(assignedDistrictNode.kycStatus)}
                      </div>
                      <h3 className="text-xl font-black text-[#1b1c1c] mt-1">{assignedDistrictNode.name}</h3>
                      <p className="text-xs font-bold text-[#52443a] flex items-center gap-1.5 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-[#864f19]" />
                        Assigned District: {assignedDistrictNode.territory?.district || userDistrict} ({assignedDistrictNode.territory?.state || userState})
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                      {(() => {
                        const metrics = getNodeTierCounts(assignedDistrictNode);
                        return (
                          <>
                            <div className="text-right">
                              <p className="text-[10px] uppercase font-extrabold text-slate-400">Revenue</p>
                              <p className="text-base font-black text-emerald-700">₹{metrics.totalRevenue.toLocaleString()}</p>
                            </div>
                            <div className="text-right border-l border-slate-200 pl-3">
                              <p className="text-[10px] uppercase font-extrabold text-slate-400">Divisions</p>
                              <span className="px-2 py-0.5 bg-amber-600 text-white font-black text-[10px] rounded">
                                {assignedDistrictNode.divisions?.length || 0} Divisions
                              </span>
                            </div>
                            <button
                              onClick={() => setSelectedAgent(assignedDistrictNode)}
                              className="px-3.5 py-1.5 bg-[#fbf9f8] hover:bg-[#eae8e7] text-[#864f19] font-bold text-xs rounded-xl border border-[#d7c3b5] transition cursor-pointer flex items-center gap-1"
                            >
                              <Eye className="w-3.5 h-3.5" /> Scorecard
                            </button>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* List of Divisions under this District */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-[#864f19] flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-amber-600" />
                    Divisions within {userDistrict} ({assignedDistrictNode.divisions?.length || 0})
                  </h4>

                  {filterList(assignedDistrictNode.divisions || []).length === 0 ? (
                    <p className="text-center text-xs font-semibold text-slate-400 py-8 bg-slate-50 rounded-xl border border-slate-200">
                      No divisions registered under {userDistrict}.
                    </p>
                  ) : (
                    filterList(assignedDistrictNode.divisions || []).map((div) => {
                      const metrics = getNodeTierCounts(div);
                      return (
                        <div
                          key={div._id}
                          className="border border-[#d7c3b5]/40 rounded-xl bg-white p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs hover:border-[#864f19]/60 transition border-l-4 border-l-amber-600"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              {getRoleBadge('division')}
                              <span className="text-[11px] font-semibold text-slate-400">{div.registrationId}</span>
                              {getKycBadge(div.kycStatus)}
                            </div>
                            <h4 className="text-sm font-bold text-[#1b1c1c] mt-1">{div.name}</h4>
                            <p className="text-[11px] text-slate-500 font-medium">
                              Division: <span className="font-bold text-slate-700">{div.territory?.division || div.name}</span>
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-4">
                            <div className="text-right">
                              <p className="text-[9px] uppercase font-bold text-slate-400">Revenue</p>
                              <p className="text-sm font-black text-emerald-700">₹{metrics.totalRevenue.toLocaleString()}</p>
                            </div>

                            <div className="text-right border-l border-slate-200 pl-3">
                              <p className="text-[9px] uppercase font-bold text-slate-400">Pincode Agents</p>
                              <span className="px-2 py-0.5 bg-slate-700 text-white font-black text-[10px] rounded">
                                {metrics.pinCount} Pincodes
                              </span>
                            </div>

                            <div className="flex gap-2 border-l border-slate-200 pl-3">
                              <button
                                onClick={() => setSelectedAgent(div)}
                                className="px-3 py-1.5 bg-[#fbf9f8] hover:bg-[#eae8e7] text-[#864f19] font-bold text-xs rounded-xl border border-[#d7c3b5] transition cursor-pointer flex items-center gap-1"
                              >
                                <Eye className="w-3.5 h-3.5" /> Details
                              </button>
                              <button
                                onClick={() => setSelectedDivisionId(div._id)}
                                className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-xl transition cursor-pointer shadow-2xs flex items-center gap-1"
                              >
                                <span>Explore Pincodes</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* DISTRICT LEVEL VIEW 2: Division Selected -> Show Pincodes in Selected Division */}
            {selectedDivisionId && activeDivisionNode && (
              <div className="space-y-4">
                <div className="bg-amber-50/60 p-5 rounded-2xl border border-amber-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-black uppercase text-amber-900 tracking-wider block">Selected Division Level</span>
                    <h3 className="text-lg font-black text-amber-950 flex items-center gap-2 mt-0.5">
                      <Layers className="w-5 h-5 text-amber-600" />
                      Division: {activeDivisionNode.territory?.division || activeDivisionNode.name}
                    </h3>
                    <p className="text-xs font-semibold text-amber-800 mt-0.5">
                      Division Manager: {activeDivisionNode.name} ({activeDivisionNode.email})
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedAgent(activeDivisionNode)}
                    className="px-3.5 py-2 bg-white hover:bg-amber-50 text-amber-900 font-extrabold text-xs rounded-xl border border-amber-300 transition cursor-pointer flex items-center gap-1.5 self-start md:self-auto shadow-2xs"
                  >
                    <Eye className="w-4 h-4 text-amber-600" /> View Division Scorecard
                  </button>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-[#864f19] flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-slate-700" />
                    Pincode Agents in {activeDivisionNode.territory?.division || activeDivisionNode.name} ({activeDivisionNode.pincodes?.length || 0})
                  </h4>

                  {filterList(activeDivisionNode.pincodes || []).length === 0 ? (
                    <p className="text-center text-xs font-semibold text-slate-400 py-8 bg-slate-50 rounded-xl border border-slate-200">
                      No pincode agents registered under this division.
                    </p>
                  ) : (
                    filterList(activeDivisionNode.pincodes || []).map((pin) => {
                      const metrics = getNodeTierCounts(pin);
                      return (
                        <div
                          key={pin._id}
                          onClick={() => setSelectedAgent(pin)}
                          className="p-4 bg-white border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-[#864f19] cursor-pointer transition shadow-2xs"
                        >
                          <div className="flex items-center gap-3">
                            <span className="p-2 bg-slate-100 text-slate-700 rounded-lg">
                              <MapPin className="w-4 h-4" />
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-xs text-[#1b1c1c]">{pin.name}</span>
                                <span className="px-2 py-0.5 bg-slate-800 text-white text-[10px] font-black rounded">
                                  PIN: {pin.territory?.pincode || 'N/A'}
                                </span>
                                {getKycBadge(pin.kycStatus)}
                              </div>
                              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{pin.phone} • ID: {pin.registrationId}</p>
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

                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setSelectedAgent(pin); }}
                              className="px-3 py-1 bg-[#fbf9f8] hover:bg-[#eae8e7] text-[#864f19] font-bold text-xs rounded-lg border border-[#d7c3b5] transition cursor-pointer flex items-center gap-1"
                            >
                              <Eye className="w-3.5 h-3.5" /> Profile
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* ROLE VIEW 3: DIVISIONAL AGENT                                */}
        {/* ------------------------------------------------------------- */}
        {activeRole === 'division' && (
          <div className="space-y-5">
            {/* Division Header (Only assigned Division is shown) */}
            <div className="bg-amber-50/60 p-5 rounded-2xl border border-amber-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  {getRoleBadge('division')}
                  <span className="text-xs font-semibold text-slate-400">ID: {assignedDivisionNode.registrationId}</span>
                  {getKycBadge(assignedDivisionNode.kycStatus)}
                </div>
                <h3 className="text-xl font-black text-amber-950 mt-1">{assignedDivisionNode.name}</h3>
                <p className="text-xs font-bold text-amber-800 flex items-center gap-1.5 mt-0.5">
                  <Layers className="w-3.5 h-3.5 text-amber-600" />
                  Assigned Division: {assignedDivisionNode.territory?.division || userDivision} ({userDistrict}, {userState})
                </p>
              </div>
              <button
                onClick={() => setSelectedAgent(assignedDivisionNode)}
                className="px-3.5 py-2 bg-white hover:bg-amber-50 text-amber-900 font-extrabold text-xs rounded-xl border border-amber-300 transition cursor-pointer flex items-center gap-1.5 self-start md:self-auto shadow-2xs"
              >
                <Eye className="w-4 h-4 text-amber-600" /> Scorecard
              </button>
            </div>

            {/* List of Pincode Agents in Division */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-[#864f19] flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-slate-700" />
                Pincode Agents in {userDivision} ({assignedDivisionNode.pincodes?.length || 0})
              </h4>

              {filterList(assignedDivisionNode.pincodes || []).length === 0 ? (
                <p className="text-center text-xs font-semibold text-slate-400 py-8 bg-slate-50 rounded-xl border border-slate-200">
                  No pincode agents registered under {userDivision}.
                </p>
              ) : (
                filterList(assignedDivisionNode.pincodes || []).map((pin) => {
                  const metrics = getNodeTierCounts(pin);
                  return (
                    <div
                      key={pin._id}
                      onClick={() => setSelectedAgent(pin)}
                      className="p-4 bg-white border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-[#864f19] cursor-pointer transition shadow-2xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="p-2 bg-slate-100 text-slate-700 rounded-lg">
                          <MapPin className="w-4 h-4" />
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-xs text-[#1b1c1c]">{pin.name}</span>
                            <span className="px-2 py-0.5 bg-slate-800 text-white text-[10px] font-black rounded">
                              PIN: {pin.territory?.pincode || 'N/A'}
                            </span>
                            {getKycBadge(pin.kycStatus)}
                          </div>
                          <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{pin.phone} • ID: {pin.registrationId}</p>
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

                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setSelectedAgent(pin); }}
                          className="px-3 py-1 bg-[#fbf9f8] hover:bg-[#eae8e7] text-[#864f19] font-bold text-xs rounded-lg border border-[#d7c3b5] transition cursor-pointer flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" /> Profile
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* ROLE VIEW 4: PINCODE AGENT                                    */}
        {/* ------------------------------------------------------------- */}
        {activeRole === 'pincode' && (
          <div className="space-y-5">
            <div className="bg-[#fbf9f8] p-6 rounded-2xl border border-slate-200 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#864f19]/10 text-[#864f19] font-black text-xl flex items-center justify-center">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      {getRoleBadge('pincode')}
                      <span className="px-2 py-0.5 bg-slate-800 text-white font-black text-[10px] rounded">
                        PIN: {userPincode}
                      </span>
                      {getKycBadge(assignedPincodeNode.kycStatus)}
                    </div>
                    <h3 className="text-xl font-black text-[#1b1c1c] mt-1">{assignedPincodeNode.name}</h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      {assignedPincodeNode.email} • {assignedPincodeNode.phone}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedAgent(assignedPincodeNode)}
                  className="px-4 py-2 bg-[#864f19] text-white font-extrabold text-xs rounded-xl transition border-none cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <Eye className="w-4 h-4" /> View Full Profile Scorecard
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-200">
                <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                  <p className="text-[9px] uppercase font-bold text-slate-400">Pincode Territory</p>
                  <p className="text-sm font-black text-slate-800 mt-1">{userPincode}</p>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                  <p className="text-[9px] uppercase font-bold text-slate-400">Assigned Division</p>
                  <p className="text-sm font-black text-slate-800 mt-1">{userDivision}</p>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                  <p className="text-[9px] uppercase font-bold text-slate-400">Assigned District</p>
                  <p className="text-sm font-black text-slate-800 mt-1">{userDistrict}</p>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                  <p className="text-[9px] uppercase font-bold text-slate-400">Earnings</p>
                  <p className="text-sm font-black text-emerald-700 mt-1">₹{assignedPincodeNode.earnings?.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        )}

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
                <span>State: {selectedAgent.territory?.state || userState}</span>
                {selectedAgent.territory?.district && <span>› District: {selectedAgent.territory.district}</span>}
                {selectedAgent.territory?.division && <span>› Division: {selectedAgent.territory.division}</span>}
                {selectedAgent.territory?.pincode && <span>› PIN: {selectedAgent.territory.pincode}</span>}
              </div>

              {/* Merchant Tie-ups Status */}
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
