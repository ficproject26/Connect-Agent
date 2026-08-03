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

// Complete 4-Level Demo Fallback Tree (State -> District -> Division -> Pincode)
const DEMO_HIERARCHY: AgentNode[] = [
  {
    _id: 'state-01',
    name: 'Siddharth Menon (State Lead)',
    email: 'siddharth.m@forge.in',
    phone: '+91 98765 11111',
    registrationId: 'AG-STATE-101',
    role: 'state',
    kycStatus: 'approved',
    registrationFeePaid: true,
    performanceScore: 96,
    earnings: 95000,
    territory: { state: 'Tamil Nadu' },
    plusPoints: ['KYC Verified', 'State Top Leader', 'Reg. Fee Paid', 'Network Leader'],
    minusPoints: [],
    teamSize: 15,
    teamEarnings: 312500,
    teamPendingKyc: 2,
    teamApprovedKyc: 13,
    districts: [
      {
        _id: 'dist-101',
        name: 'Karthik Raja (District Lead)',
        email: 'karthik.raja@connect.com',
        phone: '+91 98765 43210',
        registrationId: 'AG-DIST-501',
        role: 'district',
        kycStatus: 'approved',
        registrationFeePaid: true,
        performanceScore: 94,
        earnings: 52500,
        territory: { state: 'Tamil Nadu', district: 'Krishnagiri District' },
        plusPoints: ['KYC Verified', 'High Performance (94%)', 'Reg. Fee Paid', 'High Team Earnings'],
        minusPoints: [],
        teamSize: 6,
        teamEarnings: 158000,
        teamPendingKyc: 1,
        teamApprovedKyc: 5,
        divisions: [
          {
            _id: 'div-201',
            name: 'Suresh Patil (Hosur Division Manager)',
            email: 'suresh.patil@agent.com',
            phone: '+91 98765 03344',
            registrationId: 'AG-DIV-301',
            role: 'division',
            kycStatus: 'approved',
            registrationFeePaid: true,
            performanceScore: 91,
            earnings: 34000,
            territory: { state: 'Tamil Nadu', district: 'Krishnagiri District', division: 'Hosur Industrial Division' },
            plusPoints: ['KYC Verified', 'High Performance (91%)', 'Reg. Fee Paid'],
            minusPoints: [],
            teamSize: 3,
            teamEarnings: 68000,
            teamPendingKyc: 0,
            teamApprovedKyc: 3,
            pincodes: [
              {
                _id: 'pin-301',
                name: 'Anil Kumar',
                email: 'anil.k@connect.com',
                phone: '+91 97654 32109',
                registrationId: 'AG-PIN-101',
                role: 'pincode',
                kycStatus: 'approved',
                registrationFeePaid: true,
                performanceScore: 88,
                earnings: 16500,
                territory: { state: 'Tamil Nadu', district: 'Krishnagiri District', division: 'Hosur Industrial Division', pincode: '635109' },
                plusPoints: ['KYC Verified', 'Target Achieved'],
                minusPoints: []
              },
              {
                _id: 'pin-302',
                name: 'Priya Sundaram',
                email: 'priya.s@connect.com',
                phone: '+91 96543 21098',
                registrationId: 'AG-PIN-102',
                role: 'pincode',
                kycStatus: 'approved',
                registrationFeePaid: true,
                performanceScore: 85,
                earnings: 14200,
                territory: { state: 'Tamil Nadu', district: 'Krishnagiri District', division: 'Hosur Industrial Division', pincode: '635126' },
                plusPoints: ['Active Field Visits', 'KYC Verified'],
                minusPoints: []
              },
              {
                _id: 'pin-303',
                name: 'Venkatesan R',
                email: 'venkat.r@connect.com',
                phone: '+91 95432 10987',
                registrationId: 'AG-PIN-103',
                role: 'pincode',
                kycStatus: 'approved',
                registrationFeePaid: true,
                performanceScore: 82,
                earnings: 12800,
                territory: { state: 'Tamil Nadu', district: 'Krishnagiri District', division: 'Hosur Industrial Division', pincode: '635110' },
                plusPoints: ['KYC Verified', 'Reg. Fee Paid'],
                minusPoints: []
              }
            ]
          },
          {
            _id: 'div-202',
            name: 'Muthukumar (Bargur Division Lead)',
            email: 'muthukumar@agent.com',
            phone: '+91 98765 04455',
            registrationId: 'AG-DIV-302',
            role: 'division',
            kycStatus: 'approved',
            registrationFeePaid: true,
            performanceScore: 87,
            earnings: 29000,
            territory: { state: 'Tamil Nadu', district: 'Krishnagiri District', division: 'Bargur Sector Division' },
            plusPoints: ['Reg. Fee Paid', 'Strong Merchant Onboarding'],
            minusPoints: [],
            teamSize: 2,
            teamEarnings: 42000,
            teamPendingKyc: 1,
            teamApprovedKyc: 1,
            pincodes: [
              {
                _id: 'pin-304',
                name: 'Kavitha Natarajan',
                email: 'kavitha.n@connect.com',
                phone: '+91 93210 98765',
                registrationId: 'AG-PIN-104',
                role: 'pincode',
                kycStatus: 'approved',
                registrationFeePaid: true,
                performanceScore: 92,
                earnings: 18200,
                territory: { state: 'Tamil Nadu', district: 'Krishnagiri District', division: 'Bargur Sector Division', pincode: '635104' },
                plusPoints: ['KYC Verified', 'High Performance (92%)'],
                minusPoints: []
              },
              {
                _id: 'pin-305',
                name: 'Rohan Sharma',
                email: 'rohan.s@connect.com',
                phone: '+91 92109 87654',
                registrationId: 'AG-PIN-105',
                role: 'pincode',
                kycStatus: 'pending',
                registrationFeePaid: true,
                performanceScore: 65,
                earnings: 5800,
                territory: { state: 'Tamil Nadu', district: 'Krishnagiri District', division: 'Bargur Sector Division', pincode: '635001' },
                plusPoints: ['Reg. Fee Paid'],
                minusPoints: ['KYC PENDING']
              }
            ]
          }
        ]
      },
      {
        _id: 'dist-102',
        name: 'Murugan V (District Lead)',
        email: 'murugan.v@connect.com',
        phone: '+91 91098 76543',
        registrationId: 'AG-DIST-502',
        role: 'district',
        kycStatus: 'approved',
        registrationFeePaid: true,
        performanceScore: 90,
        earnings: 46800,
        territory: { state: 'Tamil Nadu', district: 'Chennai District' },
        plusPoints: ['KYC Verified', 'High Performance (90%)', 'Reg. Fee Paid'],
        minusPoints: [],
        teamSize: 4,
        teamEarnings: 94500,
        teamPendingKyc: 0,
        teamApprovedKyc: 4,
        divisions: [
          {
            _id: 'div-203',
            name: 'Saravanan K (T. Nagar Division)',
            email: 'saravanan.k@connect.com',
            phone: '+91 90987 65432',
            registrationId: 'AG-DIV-303',
            role: 'division',
            kycStatus: 'approved',
            registrationFeePaid: true,
            performanceScore: 89,
            earnings: 31500,
            territory: { state: 'Tamil Nadu', district: 'Chennai District', division: 'T. Nagar Commercial Sector' },
            plusPoints: ['KYC Verified', 'Reg. Fee Paid'],
            minusPoints: [],
            teamSize: 2,
            teamEarnings: 48000,
            teamPendingKyc: 0,
            teamApprovedKyc: 2,
            pincodes: [
              {
                _id: 'pin-306',
                name: 'Deepak Subhash',
                email: 'deepak.s@connect.com',
                phone: '+91 89876 54321',
                registrationId: 'AG-PIN-106',
                role: 'pincode',
                kycStatus: 'approved',
                registrationFeePaid: true,
                performanceScore: 89,
                earnings: 16800,
                territory: { state: 'Tamil Nadu', district: 'Chennai District', division: 'T. Nagar Commercial Sector', pincode: '600017' },
                plusPoints: ['KYC Verified', 'High Performance'],
                minusPoints: []
              },
              {
                _id: 'pin-307',
                name: 'Sunita Raman',
                email: 'sunita.r@connect.com',
                phone: '+91 88765 43210',
                registrationId: 'AG-PIN-107',
                role: 'pincode',
                kycStatus: 'approved',
                registrationFeePaid: true,
                performanceScore: 84,
                earnings: 13500,
                territory: { state: 'Tamil Nadu', district: 'Chennai District', division: 'T. Nagar Commercial Sector', pincode: '600018' },
                plusPoints: ['Reg. Fee Paid', 'KYC Approved'],
                minusPoints: []
              }
            ]
          }
        ]
      },
      {
        _id: 'dist-103',
        name: 'Senthamizhan (District Lead)',
        email: 'senthamizhan@connect.com',
        phone: '+91 94432 10987',
        registrationId: 'AG-DIST-503',
        role: 'district',
        kycStatus: 'approved',
        registrationFeePaid: true,
        performanceScore: 88,
        earnings: 41000,
        territory: { state: 'Tamil Nadu', district: 'Madurai District' },
        plusPoints: ['KYC Verified', 'Reg. Fee Paid'],
        minusPoints: [],
        teamSize: 3,
        teamEarnings: 76000,
        teamPendingKyc: 1,
        teamApprovedKyc: 2,
        divisions: [
          {
            _id: 'div-204',
            name: 'Kannan (Madurai Central Division)',
            email: 'kannan.m@connect.com',
            phone: '+91 93421 09876',
            registrationId: 'AG-DIV-304',
            role: 'division',
            kycStatus: 'approved',
            registrationFeePaid: true,
            performanceScore: 86,
            earnings: 28500,
            territory: { state: 'Tamil Nadu', district: 'Madurai District', division: 'Madurai Central Division' },
            plusPoints: ['KYC Verified'],
            minusPoints: [],
            teamSize: 2,
            teamEarnings: 39000,
            teamPendingKyc: 1,
            teamApprovedKyc: 1,
            pincodes: [
              {
                _id: 'pin-308',
                name: 'Vijay Kumar',
                email: 'vijay.k@connect.com',
                phone: '+91 92410 98765',
                registrationId: 'AG-PIN-108',
                role: 'pincode',
                kycStatus: 'approved',
                registrationFeePaid: true,
                performanceScore: 87,
                earnings: 14800,
                territory: { state: 'Tamil Nadu', district: 'Madurai District', division: 'Madurai Central Division', pincode: '625001' },
                plusPoints: ['KYC Verified'],
                minusPoints: []
              }
            ]
          }
        ]
      },
      {
        _id: 'dist-104',
        name: 'Gopalakrishnan (District Lead)',
        email: 'gopal.k@connect.com',
        phone: '+91 97890 12345',
        registrationId: 'AG-DIST-504',
        role: 'district',
        kycStatus: 'approved',
        registrationFeePaid: true,
        performanceScore: 91,
        earnings: 49000,
        territory: { state: 'Tamil Nadu', district: 'Coimbatore District' },
        plusPoints: ['KYC Verified', 'Top Industrial Growth'],
        minusPoints: [],
        teamSize: 2,
        teamEarnings: 62000,
        teamPendingKyc: 0,
        teamApprovedKyc: 2,
        divisions: [
          {
            _id: 'div-205',
            name: 'Velumani (Gandhipuram Division)',
            email: 'velumani@connect.com',
            phone: '+91 96789 01234',
            registrationId: 'AG-DIV-305',
            role: 'division',
            kycStatus: 'approved',
            registrationFeePaid: true,
            performanceScore: 90,
            earnings: 32000,
            territory: { state: 'Tamil Nadu', district: 'Coimbatore District', division: 'Gandhipuram Sector Division' },
            plusPoints: ['KYC Verified', 'High Performance'],
            minusPoints: [],
            teamSize: 1,
            teamEarnings: 18000,
            teamPendingKyc: 0,
            teamApprovedKyc: 1,
            pincodes: [
              {
                _id: 'pin-309',
                name: 'Manikandan P',
                email: 'mani.p@connect.com',
                phone: '+91 95678 90123',
                registrationId: 'AG-PIN-109',
                role: 'pincode',
                kycStatus: 'approved',
                registrationFeePaid: true,
                performanceScore: 89,
                earnings: 18000,
                territory: { state: 'Tamil Nadu', district: 'Coimbatore District', division: 'Gandhipuram Sector Division', pincode: '641012' },
                plusPoints: ['KYC Verified', 'Reg. Fee Paid'],
                minusPoints: []
              }
            ]
          }
        ]
      }
    ]
  },
  // KARNATAKA / BENGALURU STATE HIERARCHY TREE
  {
    _id: 'state-02',
    name: 'Rajesh Kumar (State Lead)',
    email: 'rajesh.state@forge.in',
    phone: '+91 98765 00000',
    registrationId: 'AG-STATE-102',
    role: 'state',
    kycStatus: 'approved',
    registrationFeePaid: true,
    performanceScore: 95,
    earnings: 88000,
    territory: { state: 'Karnataka' },
    plusPoints: ['KYC Verified', 'High State Earnings', 'Reg. Fee Paid', 'Network Leader'],
    minusPoints: [],
    teamSize: 11,
    teamEarnings: 245000,
    teamPendingKyc: 2,
    teamApprovedKyc: 9,
    districts: [
      {
        _id: 'dist-201',
        name: 'Amit Gowda (District Lead)',
        email: 'amit.gowda@connect.com',
        phone: '+91 98765 43210',
        registrationId: 'AG-DIST-601',
        role: 'district',
        kycStatus: 'approved',
        registrationFeePaid: true,
        performanceScore: 93,
        earnings: 51000,
        territory: { state: 'Karnataka', district: 'Bengaluru Urban' },
        plusPoints: ['KYC Verified', 'High Performance (93%)', 'Reg. Fee Paid', 'High Team Earnings'],
        minusPoints: [],
        teamSize: 5,
        teamEarnings: 124000,
        teamPendingKyc: 1,
        teamApprovedKyc: 4,
        divisions: [
          {
            _id: 'div-301',
            name: 'Meena Rao (Bengaluru North Division)',
            email: 'meena.rao@connect.com',
            phone: '+91 94321 09876',
            registrationId: 'AG-DIV-401',
            role: 'division',
            kycStatus: 'approved',
            registrationFeePaid: true,
            performanceScore: 89,
            earnings: 31000,
            territory: { state: 'Karnataka', district: 'Bengaluru Urban', division: 'Bengaluru North Division' },
            plusPoints: ['KYC Verified', 'High Performance'],
            minusPoints: [],
            teamSize: 2,
            teamEarnings: 46000,
            teamPendingKyc: 0,
            teamApprovedKyc: 2,
            pincodes: [
              {
                _id: 'pin-401',
                name: 'Kavitha N',
                email: 'kavitha.n@connect.com',
                phone: '+91 93210 98765',
                registrationId: 'AG-PIN-201',
                role: 'pincode',
                kycStatus: 'approved',
                registrationFeePaid: true,
                performanceScore: 90,
                earnings: 16500,
                territory: { state: 'Karnataka', district: 'Bengaluru Urban', division: 'Bengaluru North Division', pincode: '560004' },
                plusPoints: ['KYC Verified', 'High Onboarding'],
                minusPoints: []
              },
              {
                _id: 'pin-402',
                name: 'Rohan Verma',
                email: 'rohan.v@connect.com',
                phone: '+91 92109 87654',
                registrationId: 'AG-PIN-202',
                role: 'pincode',
                kycStatus: 'approved',
                registrationFeePaid: true,
                performanceScore: 86,
                earnings: 14200,
                territory: { state: 'Karnataka', district: 'Bengaluru Urban', division: 'Bengaluru North Division', pincode: '560005' },
                plusPoints: ['KYC Verified', 'Reg. Fee Paid'],
                minusPoints: []
              }
            ]
          },
          {
            _id: 'div-302',
            name: 'Suresh Patil (Bengaluru South Division)',
            email: 'suresh.patil.kar@connect.com',
            phone: '+91 98123 45678',
            registrationId: 'AG-DIV-402',
            role: 'division',
            kycStatus: 'approved',
            registrationFeePaid: true,
            performanceScore: 88,
            earnings: 29500,
            territory: { state: 'Karnataka', district: 'Bengaluru Urban', division: 'Bengaluru South Division' },
            plusPoints: ['KYC Verified', 'Reg. Fee Paid'],
            minusPoints: [],
            teamSize: 2,
            teamEarnings: 38000,
            teamPendingKyc: 1,
            teamApprovedKyc: 1,
            pincodes: [
              {
                _id: 'pin-403',
                name: 'Anil Mehta',
                email: 'anil.m@connect.com',
                phone: '+91 97654 32109',
                registrationId: 'AG-PIN-203',
                role: 'pincode',
                kycStatus: 'approved',
                registrationFeePaid: true,
                performanceScore: 84,
                earnings: 15200,
                territory: { state: 'Karnataka', district: 'Bengaluru Urban', division: 'Bengaluru South Division', pincode: '560001' },
                plusPoints: ['KYC Verified', 'Target Achieved'],
                minusPoints: []
              }
            ]
          }
        ]
      },
      {
        _id: 'dist-202',
        name: 'Vikram Singh (District Lead)',
        email: 'vikram.singh@connect.com',
        phone: '+91 91098 76543',
        registrationId: 'AG-DIST-602',
        role: 'district',
        kycStatus: 'approved',
        registrationFeePaid: true,
        performanceScore: 89,
        earnings: 43500,
        territory: { state: 'Karnataka', district: 'Mysuru District' },
        plusPoints: ['KYC Verified', 'High Performance (89%)', 'Reg. Fee Paid'],
        minusPoints: [],
        teamSize: 3,
        teamEarnings: 75000,
        teamPendingKyc: 1,
        teamApprovedKyc: 2,
        divisions: [
          {
            _id: 'div-303',
            name: 'Arjun Das (Mysuru City Division)',
            email: 'arjun.das@connect.com',
            phone: '+91 90987 65432',
            registrationId: 'AG-DIV-403',
            role: 'division',
            kycStatus: 'approved',
            registrationFeePaid: true,
            performanceScore: 85,
            earnings: 28000,
            territory: { state: 'Karnataka', district: 'Mysuru District', division: 'Mysuru City Division' },
            plusPoints: ['KYC Verified', 'Reg. Fee Paid'],
            minusPoints: [],
            teamSize: 2,
            teamEarnings: 42000,
            teamPendingKyc: 1,
            teamApprovedKyc: 1,
            pincodes: [
              {
                _id: 'pin-404',
                name: 'Deepak Gowda',
                email: 'deepak.g@connect.com',
                phone: '+91 89876 54321',
                registrationId: 'AG-PIN-204',
                role: 'pincode',
                kycStatus: 'approved',
                registrationFeePaid: true,
                performanceScore: 86,
                earnings: 14800,
                territory: { state: 'Karnataka', district: 'Mysuru District', division: 'Mysuru City Division', pincode: '570001' },
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

  // Pincode agents do not manage teams below them, so redirect away from Agent Hierarchy
  if ((activeRole as string) === 'pincode') {
    return <Navigate to="/dashboard" replace />;
  }

  const [searchTerm, setSearchTerm] = useState('');
  const [kycFilter, setKycFilter] = useState<string>('all');
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    'state-01': true,
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#d7c3b5]/30 gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-extrabold text-[#52443a] uppercase tracking-wider">HIERARCHY SCOPE:</span>
            {activeRole === 'state' || activeRole === 'executive' || (activeRole as any) === 'admin' ? (
              <>
                <span className="px-2 py-0.5 bg-blue-600 text-white rounded text-xs font-black">State Level</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
                <span className="px-2 py-0.5 bg-[#864f19] text-white rounded text-xs font-black">District Level</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
                <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded text-xs font-extrabold">Division Level</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
                <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded text-xs font-extrabold">Pincode Level</span>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  All 3 Downstream Tiers
                </span>
              </>
            ) : activeRole === 'district' ? (
              <>
                <span className="px-2 py-0.5 bg-[#864f19] text-white rounded text-xs font-black">District Level</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
                <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded text-xs font-extrabold">Division Level</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
                <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded text-xs font-extrabold">Pincode Level</span>
                <span className="text-[10px] font-bold text-[#864f19] bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  Next 2 Downstream Tiers
                </span>
              </>
            ) : (
              <>
                <span className="px-2 py-0.5 bg-amber-600 text-white rounded text-xs font-black">Division Level</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
                <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded text-xs font-extrabold">Pincode Level</span>
                <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  Only Pincode Downstream Tier
                </span>
              </>
            )}
          </div>
        </div>

        {/* Tree Content */}
        <div className="space-y-4">
          {rootNodes.length === 0 ? (
            <p className="text-center text-xs font-semibold text-slate-400 py-8">No agents found for this role hierarchy.</p>
          ) : (
            rootNodes.map((node) => {
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
