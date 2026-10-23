import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import {
  Trophy, Medal, Award, Search, Filter, RefreshCw, MapPin, CheckCircle,
  Clock, XCircle, ArrowUpRight, ArrowDownRight, BarChart3, Building2,
  TrendingUp, Users, Target, Shield, Zap, Globe, Landmark, Building, Layers,
  Download, FileText, Calendar
} from 'lucide-react';
import { formatRegistrationDate } from '../../utils/date';

interface LeaderboardItem {
  _id: string;
  rank: number;
  name: string;
  email?: string;
  phone?: string;
  registrationId?: string;
  role: 'state' | 'district' | 'division' | 'pincode';
  tierRole?: string;
  district?: string;
  division?: string;
  pincode?: string;
  parentState?: string;
  parentDistrict?: string;
  parentDivision?: string;
  agentsCount?: number;
  kycStatus?: 'approved' | 'pending' | 'rejected';
  registrationFeePaid?: boolean;
  performanceScore: number;
  weeklyEarnings: number;
  targetsCompleted: number;
  targetsTotal: number;
  territory: {
    state?: string;
    district?: string;
    division?: string;
    pincode?: string;
  };
  trend: 'up' | 'down' | 'stable';
  createdAt?: string;
}

// Calculate dynamic dates relative to current local date
const formatDynamicDate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const getDynamicDateRanges = () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const dayOfWeek = now.getDay(); // 0 is Sun, 1 is Mon, ... 6 is Sat

  // 1. Today
  const todayStr = formatDynamicDate(now);

  // 2. This Week (Monday through Sunday)
  const diffToMonday = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const monShort = monday.toLocaleDateString('en-US', { month: 'short' });
  const sunShort = sunday.toLocaleDateString('en-US', { month: 'short' });
  const weekLabelDates = monShort === sunShort
    ? `${monShort} ${monday.getDate()}–${sunday.getDate()}, ${sunday.getFullYear()}`
    : `${monShort} ${monday.getDate()} – ${sunShort} ${sunday.getDate()}, ${sunday.getFullYear()}`;

  // 3. This Month (First to last day of current calendar month)
  const firstOfMonth = new Date(currentYear, currentMonth, 1);
  const lastOfMonth = new Date(currentYear, currentMonth + 1, 0);
  const monthName = now.toLocaleDateString('en-US', { month: 'long' });

  // 4. This Year (Jan 1 to Dec 31 of current calendar year)
  const firstOfYear = new Date(currentYear, 0, 1);
  const lastOfYear = new Date(currentYear, 11, 31);

  return {
    today: {
      label: 'Today',
      startDate: todayStr,
      endDate: todayStr
    },
    this_week: {
      label: `This Week (${weekLabelDates})`,
      startDate: formatDynamicDate(monday),
      endDate: formatDynamicDate(sunday)
    },
    this_month: {
      label: `This Month (${monthName} ${currentYear})`,
      startDate: formatDynamicDate(firstOfMonth),
      endDate: formatDynamicDate(lastOfMonth)
    },
    this_year: {
      label: `This Year (${currentYear})`,
      startDate: formatDynamicDate(firstOfYear),
      endDate: formatDynamicDate(lastOfYear)
    }
  };
};

const formatCustomDisplayRange = (startStr: string, endStr: string) => {
  if (!startStr || !endStr) return 'Custom Date Range';
  const s = new Date(startStr);
  const e = new Date(endStr);
  const sMon = s.toLocaleDateString('en-US', { month: 'short' });
  const eMon = e.toLocaleDateString('en-US', { month: 'short' });
  const sDay = String(s.getDate()).padStart(2, '0');
  const eDay = String(e.getDate()).padStart(2, '0');
  const sYear = s.getFullYear();
  const eYear = e.getFullYear();

  if (sYear === eYear) {
    if (sMon === eMon) {
      return `${sMon} ${sDay} – ${eDay}, ${sYear}`;
    }
    return `${sMon} ${sDay} – ${eMon} ${eDay}, ${sYear}`;
  }
  return `${sMon} ${sDay}, ${sYear} – ${eMon} ${eDay}, ${eYear}`;
};

export const LeaderboardModule: React.FC = () => {
  const { user, addNotification } = useAuth();

  // Active Tier Tab: 'overall' | 'district' | 'division' | 'pincode'
  const [tierTab, setTierTab] = useState<'overall' | 'district' | 'division' | 'pincode'>('overall');
  const [timeframe, setTimeframe] = useState<string>('this_week');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [tempStartDate, setTempStartDate] = useState<string>('');
  const [tempEndDate, setTempEndDate] = useState<string>('');
  const [dateError, setDateError] = useState<string>('');

  const [sortBy, setSortBy] = useState<string>('performanceScore');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<LeaderboardItem | null>(null);
  const [showAllRows, setShowAllRows] = useState(false);

  const dynamicRanges = useMemo(() => getDynamicDateRanges(), []);

  const activeDateBoundaries = useMemo(() => {
    if (timeframe === 'custom' && customStartDate && customEndDate) {
      return {
        startDate: customStartDate,
        endDate: customEndDate,
        label: formatCustomDisplayRange(customStartDate, customEndDate)
      };
    }
    const standard = (dynamicRanges as any)[timeframe] || dynamicRanges.this_week;
    return {
      startDate: standard.startDate,
      endDate: standard.endDate,
      label: standard.label
    };
  }, [timeframe, customStartDate, customEndDate, dynamicRanges]);

  const rawRole = (user?.role as string) || (user as any)?.level || 'pincode';
  const effectiveRole = (rawRole === 'agent' ? ((user as any)?.level || 'pincode') : rawRole).toLowerCase();
  const userRole: 'state' | 'district' | 'division' | 'pincode' = effectiveRole.includes('state')
    ? 'state'
    : effectiveRole.includes('district')
    ? 'district'
    : effectiveRole.includes('division')
    ? 'division'
    : 'pincode';

  // Allowed Tier Tabs strictly based on logged-in Agent level
  const allowedTiers: Array<'overall' | 'district' | 'division' | 'pincode'> = useMemo(() => {
    if (userRole === 'state') return ['overall', 'district', 'division', 'pincode'];
    if (userRole === 'district') return ['overall', 'division', 'pincode'];
    if (userRole === 'division') return ['overall', 'pincode'];
    return ['overall'];
  }, [userRole]);

  // Ensure active tier is within allowed tabs
  useEffect(() => {
    if (!allowedTiers.includes(tierTab)) {
      setTierTab(allowedTiers[0]);
    }
  }, [allowedTiers, tierTab]);

  // Query leaderboard data from backend
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['leaderboard', tierTab, timeframe, activeDateBoundaries.startDate, activeDateBoundaries.endDate, sortBy],
    queryFn: async () => {
      try {
        const res = await api.get('/admin/leaderboard', {
          params: {
            tier: tierTab,
            role: tierTab === 'overall' ? 'all' : tierTab,
            timeframe,
            startDate: activeDateBoundaries.startDate,
            endDate: activeDateBoundaries.endDate,
            sortBy
          }
        });
        return res.data;
      } catch (err: any) {
        if (err?.response?.status !== 401) {
          console.warn('Leaderboard API error:', err);
        }
        return null;
      }
    },
    staleTime: 60000,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 401) return false;
      return failureCount < 1;
    }
  });

  // Defensive pure Agent verification safeguard
  const isPureAgentItem = (item: LeaderboardItem): boolean => {
    if (!item) return false;
    const idStr = String(item._id || '');
    const regIdStr = String(item.registrationId || '');
    const roleStr = String(item.role || item.tierRole || '').toLowerCase();
    const nameStr = String(item.name || '').toLowerCase();

    // Territory aggregated tier cards (district, division, pincode tiers)
    if (tierTab === 'district' && idStr.startsWith('district_')) return true;
    if (tierTab === 'division' && idStr.startsWith('division_')) return true;
    if (tierTab === 'pincode' && idStr.startsWith('pincode_')) return true;

    // Non-agent ID and registration ID prefixes
    if (/^(ADM-|usr_mgr|MGR-|cust_|ven-|FIC-CUS-)/i.test(idStr) || /^(ADM-|usr_mgr|MGR-|cust_|ven-|FIC-CUS-)/i.test(regIdStr)) {
      return false;
    }

    // Non-agent roles
    if (/admin|manager|vendor|customer|delivery|technician|executive/i.test(roleStr)) {
      return false;
    }

    // Non-agent name titles
    if (/^(main admin|super admin)$/i.test(nameStr)) {
      return false;
    }

    const validAgentRoles = ['state', 'district', 'division', 'pincode', 'agent', 'state_agent', 'district_agent', 'division_agent', 'pincode_agent'];
    return validAgentRoles.includes(roleStr);
  };

  // Filtered Leaderboard List based on Search Query, Role Verification, and Sorting
  const leaderboardList: LeaderboardItem[] = useMemo(() => {
    const rawList: LeaderboardItem[] = data?.leaderboard || [];
    let list: LeaderboardItem[] = rawList.filter(isPureAgentItem);

    // Filter by Search Query within authorized territory
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(item =>
        (item.name && item.name.toLowerCase().includes(q)) ||
        (item.phone && item.phone.includes(q)) ||
        (item.registrationId && item.registrationId.toLowerCase().includes(q)) ||
        (item.territory?.district && item.territory.district.toLowerCase().includes(q)) ||
        (item.territory?.state && item.territory.state.toLowerCase().includes(q)) ||
        (item.territory?.division && item.territory.division.toLowerCase().includes(q)) ||
        (item.territory?.pincode && item.territory.pincode.includes(q)) ||
        (item.district && item.district.toLowerCase().includes(q)) ||
        (item.division && item.division.toLowerCase().includes(q)) ||
        (item.pincode && item.pincode.includes(q))
      );
    }

    // Sort accordingly if changed on frontend
    list = [...list].sort((a, b) => {
      if (sortBy === 'weeklyEarnings') {
        if (b.weeklyEarnings !== a.weeklyEarnings) return b.weeklyEarnings - a.weeklyEarnings;
        if (b.performanceScore !== a.performanceScore) return b.performanceScore - a.performanceScore;
        return (b.targetsCompleted || 0) - (a.targetsCompleted || 0);
      }
      if (sortBy === 'targetsCompleted') {
        if ((b.targetsCompleted || 0) !== (a.targetsCompleted || 0)) return (b.targetsCompleted || 0) - (a.targetsCompleted || 0);
        if (b.performanceScore !== a.performanceScore) return b.performanceScore - a.performanceScore;
        return b.weeklyEarnings - a.weeklyEarnings;
      }
      if (b.performanceScore !== a.performanceScore) return b.performanceScore - a.performanceScore;
      if (b.weeklyEarnings !== a.weeklyEarnings) return b.weeklyEarnings - a.weeklyEarnings;
      return (b.targetsCompleted || 0) - (a.targetsCompleted || 0);
    });

    // Re-rank dynamically for the active view
    return list.map((item, idx) => ({ ...item, rank: idx + 1 }));
  }, [data, searchTerm, sortBy, tierTab]);

  const topPerformers = useMemo(() => {
    return leaderboardList.slice(0, 3);
  }, [leaderboardList]);

  // Display Top 3 performers in table by default, or all if user expands or searches
  const displayedRows = useMemo(() => {
    if (searchTerm.trim() || showAllRows) {
      return leaderboardList;
    }
    return leaderboardList.slice(0, 3);
  }, [leaderboardList, searchTerm, showAllRows]);

  const getRoleBadge = (item: LeaderboardItem) => {
    if (tierTab === 'district') {
      return <span className="px-2 py-0.5 bg-[#864f19] text-white font-black text-[10px] uppercase rounded shadow-2xs">District Tier</span>;
    }
    if (tierTab === 'division') {
      return <span className="px-2 py-0.5 bg-amber-600 text-white font-black text-[10px] uppercase rounded shadow-2xs">Division Tier</span>;
    }
    if (tierTab === 'pincode') {
      return <span className="px-2 py-0.5 bg-slate-700 text-white font-black text-[10px] uppercase rounded shadow-2xs">Pincode Tier</span>;
    }
    const role = item.role;
    switch (role) {
      case 'state':
        return <span className="px-2 py-0.5 bg-blue-600 text-white font-black text-[10px] uppercase rounded shadow-2xs">State Agent</span>;
      case 'district':
        return <span className="px-2 py-0.5 bg-[#864f19] text-white font-black text-[10px] uppercase rounded shadow-2xs">District Agent</span>;
      case 'division':
        return <span className="px-2 py-0.5 bg-amber-600 text-white font-black text-[10px] uppercase rounded shadow-2xs">Division Manager</span>;
      case 'pincode':
        return <span className="px-2 py-0.5 bg-slate-700 text-white font-black text-[10px] uppercase rounded shadow-2xs">Pincode Agent</span>;
      default:
        return <span className="px-2 py-0.5 bg-slate-600 text-white font-black text-[10px] uppercase rounded shadow-2xs">{role || 'Agent'}</span>;
    }
  };

  const renderTierTabIcon = (tabKey: string) => {
    switch (tabKey) {
      case 'overall': return <Globe className="w-4 h-4 shrink-0" />;
      case 'district': return <Building2 className="w-4 h-4 shrink-0" />;
      case 'division': return <Building className="w-4 h-4 shrink-0" />;
      case 'pincode': return <MapPin className="w-4 h-4 shrink-0" />;
      default: return null;
    }
  };

  const getTierTabLabel = (tabKey: string) => {
    switch (tabKey) {
      case 'overall': return 'Overall Network';
      case 'district': return 'District Tier';
      case 'division': return 'Division Tier';
      case 'pincode': return 'Pincode Tier';
      default: return tabKey;
    }
  };

  // Export Leaderboard CSV Spreadsheet (exports complete active view dataset, not just displayed rows)
  const handleExportCSV = () => {
    let headers = '';
    let rows = '';

    if (tierTab === 'district') {
      headers = 'Rank,District Name,Tier,Parent State,Active Agents,Targets Completed,Targets Total,Weekly Earnings (INR),Performance Score (%)\n';
      rows = leaderboardList.map(item =>
        `"${item.rank}","${item.name}","District Tier","${item.parentState || item.territory?.state || 'Tamil Nadu'}","${item.agentsCount || 0}","${item.targetsCompleted}","${item.targetsTotal}","${item.weeklyEarnings}","${item.performanceScore}%"`
      ).join('\n');
    } else if (tierTab === 'division') {
      headers = 'Rank,Division Name,Tier,Parent District,Active Agents,Targets Completed,Targets Total,Weekly Earnings (INR),Performance Score (%)\n';
      rows = leaderboardList.map(item =>
        `"${item.rank}","${item.name}","Division Tier","${item.parentDistrict || item.territory?.district || 'N/A'}","${item.agentsCount || 0}","${item.targetsCompleted}","${item.targetsTotal}","${item.weeklyEarnings}","${item.performanceScore}%"`
      ).join('\n');
    } else if (tierTab === 'pincode') {
      headers = 'Rank,Pincode,Tier,Parent Division,Parent District,Active Agents,Targets Completed,Targets Total,Weekly Earnings (INR),Performance Score (%)\n';
      rows = leaderboardList.map(item =>
        `"${item.rank}","${item.pincode || item.name}","Pincode Tier","${item.parentDivision || item.territory?.division || 'N/A'}","${item.parentDistrict || item.territory?.district || 'N/A'}","${item.agentsCount || 0}","${item.targetsCompleted}","${item.targetsTotal}","${item.weeklyEarnings}","${item.performanceScore}%"`
      ).join('\n');
    } else {
      headers = 'Rank,Registration ID,Agent Name,Role,Territory,Targets Achieved,Weekly Earnings (INR),Performance Score (%)\n';
      rows = leaderboardList.map(item =>
        `"${item.rank}","${item.registrationId || ''}","${item.name}","${(item.role || '').toUpperCase()}","${item.territory?.district || item.territory?.state || 'N/A'}","${item.targetsCompleted}/${item.targetsTotal}","${item.weeklyEarnings}","${item.performanceScore}%"`
      ).join('\n');
    }

    const cleanPeriod = activeDateBoundaries.label.replace(/[^a-zA-Z0-9_\-]/g, '_');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Leaderboard_Report_${tierTab}_${cleanPeriod}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (addNotification) {
      addNotification(
        'Leaderboard CSV Exported',
        `Exported weekly performance rankings for ${getTierTabLabel(tierTab)} (${leaderboardList.length} total records).`,
        'low',
        'system'
      );
    }
  };

  // Export Printable PDF Executive Report (exports complete active view dataset)
  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Agent Performance & Territory Growth Report</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 25px; color: #1b1c1c; }
            h1 { color: #864f19; font-size: 22px; margin-bottom: 4px; }
            .meta { font-size: 11px; color: #52443a; margin-bottom: 20px; font-weight: 600; text-transform: uppercase; }
            .podium { display: flex; gap: 15px; margin-bottom: 20px; }
            .card { flex: 1; padding: 12px; border-radius: 8px; border: 1px solid #d7c3b5; background: #fbf9f8; text-align: center; }
            .gold { background: #fff8e1; border-color: #ffb300; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #eae8e7; padding: 8px 12px; text-align: left; font-size: 11px; }
            th { background-color: #fbf9f8; font-weight: 800; color: #864f19; text-transform: uppercase; font-size: 10px; }
            .footer { margin-top: 30px; font-size: 10px; color: #888; text-align: center; border-t: 1px solid #eee; padding-top: 10px; }
          </style>
        </head>
        <body>
          <h1>ConnectPortal — Executive Performance Leaderboard Report</h1>
          <div class="meta">Active Tier Scope: ${getTierTabLabel(tierTab)} • Period: ${activeDateBoundaries.label} • Total Records: ${leaderboardList.length} • Generated: ${new Date().toLocaleDateString()}</div>
          
          ${topPerformers.length >= 3 ? `
            <div class="podium">
              <div class="card gold">
                <strong>🥇 #1 ${topPerformers[0].name}</strong><br/>
                <span style="font-size: 10px; color: #666;">Score: ${topPerformers[0].performanceScore}% • Earnings: ₹${topPerformers[0].weeklyEarnings.toLocaleString()}</span>
              </div>
              <div class="card">
                <strong>🥈 #2 ${topPerformers[1].name}</strong><br/>
                <span style="font-size: 10px; color: #666;">Score: ${topPerformers[1].performanceScore}% • Earnings: ₹${topPerformers[1].weeklyEarnings.toLocaleString()}</span>
              </div>
              <div class="card">
                <strong>🥉 #3 ${topPerformers[2].name}</strong><br/>
                <span style="font-size: 10px; color: #666;">Score: ${topPerformers[2].performanceScore}% • Earnings: ₹${topPerformers[2].weeklyEarnings.toLocaleString()}</span>
              </div>
            </div>
          ` : ''}

          <table>
            <thead>
              <tr>
                <th>Rank</th>
                ${tierTab === 'district' ? '<th>District Name</th><th>Parent State</th><th>Active Agents</th>' :
                  tierTab === 'division' ? '<th>Division Name</th><th>Parent District</th><th>Active Agents</th>' :
                  tierTab === 'pincode' ? '<th>Pincode Area</th><th>Division / District</th><th>Active Agents</th>' :
                  '<th>Reg ID</th><th>Agent Name</th><th>Role Tier</th><th>Territory</th>'}
                <th>Targets Achieved</th>
                <th>Weekly Earnings</th>
                <th>Performance Score</th>
              </tr>
            </thead>
            <tbody>
              ${leaderboardList.map(item => `
                <tr>
                  <td><strong>#${item.rank}</strong></td>
                  ${tierTab === 'district' ? `
                    <td><strong>${item.name}</strong></td>
                    <td>${item.parentState || item.territory?.state || 'Tamil Nadu'}</td>
                    <td>${item.agentsCount || 0} Agents</td>
                  ` : tierTab === 'division' ? `
                    <td><strong>${item.name}</strong></td>
                    <td>${item.parentDistrict || item.territory?.district || 'Salem'}</td>
                    <td>${item.agentsCount || 0} Agents</td>
                  ` : tierTab === 'pincode' ? `
                    <td><strong>${item.pincode || item.name}</strong></td>
                    <td>${item.parentDivision || ''} • ${item.parentDistrict || ''}</td>
                    <td>${item.agentsCount || 0} Agents</td>
                  ` : `
                    <td>${item.registrationId || '—'}</td>
                    <td>${item.name}</td>
                    <td>${(item.role || '').toUpperCase()}</td>
                    <td>${item.territory?.district || item.territory?.state || 'Tamil Nadu'}</td>
                  `}
                  <td>${item.targetsCompleted} / ${item.targetsTotal}</td>
                  <td>₹${item.weeklyEarnings.toLocaleString()}</td>
                  <td><strong>${item.performanceScore}%</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="footer">Confidential Performance Analytics • ConnectPortal Logistics & Operations Network © ${new Date().getFullYear()}</div>
          <script>
            window.onload = function() { window.print(); setTimeout(function() { window.close(); }, 500); };
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();

    if (addNotification) {
      addNotification(
        'Analytics Report Generated',
        `Printed weekly executive performance report for ${getTierTabLabel(tierTab)} (${leaderboardList.length} records).`,
        'high',
        'system'
      );
    }
  };

  const handleTimeframeChange = (val: string) => {
    if (val === 'custom') {
      const defaultStart = customStartDate || dynamicRanges.this_month.startDate;
      const defaultEnd = customEndDate || dynamicRanges.this_month.endDate;
      setTempStartDate(defaultStart);
      setTempEndDate(defaultEnd);
      setDateError('');
      setIsCustomModalOpen(true);
    } else {
      setTimeframe(val);
    }
  };

  const handleApplyCustomDates = () => {
    if (!tempStartDate || !tempEndDate) {
      setDateError('Please select both Start Date and End Date.');
      return;
    }
    if (new Date(tempEndDate) < new Date(tempStartDate)) {
      setDateError('End Date cannot be earlier than Start Date.');
      return;
    }
    setDateError('');
    setCustomStartDate(tempStartDate);
    setCustomEndDate(tempEndDate);
    setTimeframe('custom');
    setIsCustomModalOpen(false);
  };

  const handleCancelCustomDates = () => {
    setIsCustomModalOpen(false);
    setDateError('');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-white via-[#fbf9f8] to-white p-6 rounded-2xl border border-[#d7c3b5]/40 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-[#864f19]/10 text-[#864f19] rounded-2xl border border-[#864f19]/20 shadow-sm">
              <Trophy className="w-7 h-7 text-[#864f19]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-[#1b1c1c] tracking-tight">Performance Leaderboard</h1>
                <span className="px-2.5 py-0.5 bg-[#864f19]/10 text-[#864f19] font-black text-[10px] uppercase rounded-full border border-[#864f19]/20">
                  4-TIER HIERARCHY RANKINGS
                </span>
              </div>
              <p className="text-xs text-[#52443a] font-semibold mt-0.5">
                Weekly performance competitions for State Leads, District Leads, Division Managers, and Pincode Agents.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-start md:self-auto">
            <button
              onClick={() => refetch()}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-[#864f19] bg-[#864f19]/10 hover:bg-[#864f19]/20 rounded-xl transition border-none cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <button
              onClick={handleExportCSV}
              title="Export Rankings to CSV"
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-[#864f19] bg-[#fbf9f8] hover:bg-[#ffdcc2] border border-[#d7c3b5]/60 rounded-xl transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> CSV Export
            </button>
            <button
              onClick={handleExportPDF}
              title="Print Executive PDF Report"
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-[#864f19] hover:bg-[#a3672f] rounded-xl transition cursor-pointer border-none"
            >
              <FileText className="w-3.5 h-3.5" /> PDF Report
            </button>
          </div>
        </div>

        {/* DYNAMIC TIER HIERARCHY SWITCHER TABS (Clean Vector Icons) */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pt-2 border-t border-[#d7c3b5]/30">
          {allowedTiers.map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setTierTab(tab);
                setShowAllRows(false);
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all border-none cursor-pointer whitespace-nowrap ${
                tierTab === tab
                  ? 'bg-[#864f19] text-white shadow-md'
                  : 'bg-[#f6f3f2] text-[#52443a] hover:bg-[#eae8e7]'
              }`}
            >
              {renderTierTabIcon(tab)}
              <span>{getTierTabLabel(tab)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* FILTER BAR & SEARCH CONTROLS */}
      <div className="bg-white p-5 rounded-2xl border border-[#d7c3b5]/40 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Search Input */}
          <div className="relative flex-1 sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={`Search ${tierTab === 'overall' ? 'agent' : tierTab} by name, phone, or region...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-[#d7c3b5]/60 rounded-xl pl-10 pr-4 py-2 text-xs font-semibold text-[#1b1c1c] focus:outline-none focus:ring-2 focus:ring-[#864f19]/30"
            />
          </div>

          {/* Dynamic 5 Timeframe Filters & Custom Date Range */}
          <div className="flex items-center gap-1.5">
            <select
              value={timeframe}
              onChange={(e) => handleTimeframeChange(e.target.value)}
              className="bg-white border border-[#d7c3b5]/60 rounded-xl px-3 py-2 text-xs font-bold text-[#52443a] focus:outline-none focus:ring-2 focus:ring-[#864f19]/30"
            >
              <option value="today">{dynamicRanges.today.label}</option>
              <option value="this_week">{dynamicRanges.this_week.label}</option>
              <option value="this_month">{dynamicRanges.this_month.label}</option>
              <option value="this_year">{dynamicRanges.this_year.label}</option>
              <option value="custom">
                {customStartDate && customEndDate
                  ? formatCustomDisplayRange(customStartDate, customEndDate)
                  : 'Custom Date Range'}
              </option>
            </select>

            {timeframe === 'custom' && (
              <button
                type="button"
                onClick={() => {
                  setTempStartDate(customStartDate);
                  setTempEndDate(customEndDate);
                  setDateError('');
                  setIsCustomModalOpen(true);
                }}
                className="p-2 bg-[#864f19]/10 hover:bg-[#864f19]/20 text-[#864f19] rounded-xl border border-[#864f19]/30 transition cursor-pointer"
                title="Edit Custom Date Range"
              >
                <Calendar className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort By Metric Filter */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-white border border-[#d7c3b5]/60 rounded-xl px-3 py-2 text-xs font-bold text-[#52443a] focus:outline-none focus:ring-2 focus:ring-[#864f19]/30"
          >
            <option value="performanceScore">Sort by Performance Score (%)</option>
            <option value="weeklyEarnings">Sort by Weekly Earnings (₹)</option>
            <option value="targetsCompleted">Sort by Targets Completed</option>
          </select>
        </div>

        <div className="text-right shrink-0">
          <p className="text-[10px] uppercase font-extrabold text-slate-400">ACTIVE TAB SCOPE</p>
          <p className="text-xs font-black text-[#864f19] uppercase">
            {getTierTabLabel(tierTab)} ({leaderboardList.length} {tierTab === 'overall' ? 'AGENTS' : tierTab === 'district' ? 'DISTRICTS' : tierTab === 'division' ? 'DIVISIONS' : 'PINCODES'})
          </p>
        </div>
      </div>

      {/* TOP 3 PERFORMERS PODIUM FOR ACTIVE TIER */}
      {topPerformers.length >= 3 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end pt-2">
          {/* 2ND PLACE (SILVER) */}
          <div
            onClick={() => setSelectedAgent(topPerformers[1])}
            className="order-2 md:order-1 bg-gradient-to-b from-slate-50 to-slate-100 p-5 rounded-3xl border-2 border-slate-300 shadow-md relative flex flex-col items-center text-center space-y-2 cursor-pointer hover:border-slate-400 transition"
          >
            <div className="absolute -top-4 px-3.5 py-1 bg-slate-200 border border-slate-300 text-slate-800 text-[11px] font-black rounded-full uppercase flex items-center gap-1.5 shadow-sm">
              <Medal className="w-3.5 h-3.5 text-slate-600" /> Rank #2 • Silver Leader
            </div>
            <div className="w-16 h-16 rounded-full bg-slate-200 border-4 border-slate-300 text-slate-700 font-black text-2xl flex items-center justify-center uppercase mt-2 shadow-inner">
              {topPerformers[1].name.charAt(0)}
            </div>
            <div>
              <h3 className="font-black text-sm text-[#1b1c1c]">{topPerformers[1].name}</h3>
              <div className="mt-1">{getRoleBadge(topPerformers[1])}</div>
            </div>
            <div className="w-full pt-2 border-t border-slate-200 flex justify-between items-center text-xs">
              <span className="font-bold text-slate-500">Weekly Score:</span>
              <span className="font-black text-[#864f19]">{topPerformers[1].performanceScore}%</span>
            </div>
            <div className="w-full flex justify-between items-center text-xs">
              <span className="font-bold text-slate-500">Weekly Earnings:</span>
              <span className="font-black text-emerald-700">₹{topPerformers[1].weeklyEarnings.toLocaleString()}</span>
            </div>
          </div>

          {/* 1ST PLACE (GOLD PODIUM) */}
          <div
            onClick={() => setSelectedAgent(topPerformers[0])}
            className="order-1 md:order-2 bg-gradient-to-b from-amber-50 to-amber-100/90 p-6 rounded-3xl border-2 border-amber-400 shadow-xl relative flex flex-col items-center text-center space-y-3 transform -translate-y-2 cursor-pointer hover:border-amber-500 transition"
          >
            <div className="absolute -top-5 px-4 py-1.5 bg-[#864f19] text-white text-xs font-black rounded-full uppercase flex items-center gap-1.5 shadow-md">
              <Trophy className="w-4 h-4 text-amber-300 fill-amber-300" /> Rank #1 • Gold Champion
            </div>
            <div className="w-20 h-20 rounded-full bg-amber-200 border-4 border-amber-400 text-amber-900 font-black text-3xl flex items-center justify-center uppercase mt-2 shadow-inner">
              {topPerformers[0].name.charAt(0)}
            </div>
            <div>
              <h3 className="font-black text-base text-[#1b1c1c]">{topPerformers[0].name}</h3>
              <div className="mt-1">{getRoleBadge(topPerformers[0])}</div>
              <p className="text-[11px] font-bold text-amber-800 mt-1 flex items-center justify-center gap-1">
                <MapPin className="w-3 h-3" /> {topPerformers[0].territory?.district ? `${topPerformers[0].territory.district}, ${topPerformers[0].territory.state}` : (topPerformers[0].territory?.state || 'Tamil Nadu')}
              </p>
            </div>
            <div className="w-full pt-3 border-t border-amber-200/80 flex justify-between items-center text-xs">
              <span className="font-bold text-amber-900">Weekly Score:</span>
              <span className="font-black text-[#864f19] text-base">{topPerformers[0].performanceScore}%</span>
            </div>
            <div className="w-full flex justify-between items-center text-xs">
              <span className="font-bold text-amber-900">Weekly Earnings:</span>
              <span className="font-black text-emerald-800 text-base">₹{topPerformers[0].weeklyEarnings.toLocaleString()}</span>
            </div>
          </div>

          {/* 3RD PLACE (BRONZE) */}
          <div
            onClick={() => setSelectedAgent(topPerformers[2])}
            className="order-3 bg-gradient-to-b from-amber-900/5 to-amber-900/10 p-5 rounded-3xl border-2 border-amber-700/40 shadow-md relative flex flex-col items-center text-center space-y-2 cursor-pointer hover:border-amber-700/60 transition"
          >
            <div className="absolute -top-4 px-3.5 py-1 bg-amber-100 border border-amber-300 text-amber-900 text-[11px] font-black rounded-full uppercase flex items-center gap-1.5 shadow-sm">
              <Award className="w-3.5 h-3.5 text-amber-800" /> Rank #3 • Bronze Leader
            </div>
            <div className="w-16 h-16 rounded-full bg-amber-100 border-4 border-amber-700/50 text-amber-900 font-black text-2xl flex items-center justify-center uppercase mt-2 shadow-inner">
              {topPerformers[2].name.charAt(0)}
            </div>
            <div>
              <h3 className="font-black text-sm text-[#1b1c1c]">{topPerformers[2].name}</h3>
              <div className="mt-1">{getRoleBadge(topPerformers[2])}</div>
            </div>
            <div className="w-full pt-2 border-t border-amber-200/60 flex justify-between items-center text-xs">
              <span className="font-bold text-slate-500">Weekly Score:</span>
              <span className="font-black text-[#864f19]">{topPerformers[2].performanceScore}%</span>
            </div>
            <div className="w-full flex justify-between items-center text-xs">
              <span className="font-bold text-slate-500">Weekly Earnings:</span>
              <span className="font-black text-emerald-700">₹{topPerformers[2].weeklyEarnings.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* RANKINGS TABLE FOR SELECTED 4-TIER TAB */}
      <div className="bg-white rounded-2xl border border-[#d7c3b5]/40 overflow-hidden shadow-sm">
        <div className="p-4 bg-[#fbf9f8] border-b border-[#d7c3b5]/30 flex items-center justify-between">
          <h3 className="font-black text-sm text-[#1b1c1c] flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#864f19]" />
            Rankings ({getTierTabLabel(tierTab)} — Top 3 Performers)
          </h3>
          <span className="text-xs font-bold text-[#864f19] uppercase">Period: {activeDateBoundaries.label}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f6f3f2] text-[#52443a] font-black uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4 text-center">Rank</th>
                <th className="py-3.5 px-4">
                  {tierTab === 'district' ? 'District Name' : tierTab === 'division' ? 'Division Name' : tierTab === 'pincode' ? 'Pincode Area' : 'Agent Name'}
                </th>
                <th className="py-3.5 px-4">Tier Role</th>
                <th className="py-3.5 px-4">
                  {tierTab === 'district' ? 'Parent State' : tierTab === 'division' ? 'Parent District' : tierTab === 'pincode' ? 'Division / District' : 'Territory'}
                </th>
                <th className="py-3.5 px-4 text-center">Targets Achieved</th>
                <th className="py-3.5 px-4 text-right">Weekly Earnings</th>
                <th className="py-3.5 px-4 text-center">Performance Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs font-semibold text-slate-400">
                    No records ranked under this tier tab for {activeDateBoundaries.label}.
                  </td>
                </tr>
              ) : (
                displayedRows.map((item) => (
                  <tr
                    key={item._id}
                    onClick={() => setSelectedAgent(item)}
                    className="hover:bg-[#fbf9f8] transition cursor-pointer"
                  >
                    <td className="py-4 px-4 text-center">
                      {item.rank === 1 ? (
                        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-black text-xs border border-amber-300">
                          #1 GOLD
                        </span>
                      ) : item.rank === 2 ? (
                        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md bg-slate-200 text-slate-800 font-black text-xs border border-slate-300">
                          #2 SILVER
                        </span>
                      ) : item.rank === 3 ? (
                        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md bg-amber-900/10 text-amber-900 font-black text-xs border border-amber-900/20">
                          #3 BRONZE
                        </span>
                      ) : (
                        <span className="font-extrabold text-slate-500">#{item.rank}</span>
                      )}
                    </td>

                    <td className="py-4 px-4 font-bold text-[#1b1c1c]">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#ffdcc2] text-[#864f19] font-black text-xs flex items-center justify-center uppercase shadow-2xs shrink-0">
                          {item.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-extrabold text-xs text-[#1b1c1c]">{item.name}</p>
                          <p className="text-[10px] text-slate-400 font-semibold">
                            {tierTab === 'overall' ? (
                              <>
                                {item.registrationId}
                                {item.createdAt && ` • Reg: ${formatRegistrationDate(item.createdAt)}`}
                              </>
                            ) : (
                              `${item.agentsCount || 0} Active Agents in Territory`
                            )}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4">{getRoleBadge(item)}</td>

                    <td className="py-4 px-4 font-semibold text-slate-600">
                      {tierTab === 'district'
                        ? (item.parentState || item.territory?.state || 'Tamil Nadu')
                        : tierTab === 'division'
                        ? (item.parentDistrict ? `${item.parentDistrict}, ${item.parentState || 'Tamil Nadu'}` : (item.territory?.district || 'Tamil Nadu'))
                        : tierTab === 'pincode'
                        ? (item.parentDivision ? `${item.parentDivision} • ${item.parentDistrict || ''}` : (item.territory?.district || 'Tamil Nadu'))
                        : (item.territory?.district ? `${item.territory.district}, ${item.territory?.state || 'Tamil Nadu'}` : (item.territory?.state || 'Tamil Nadu'))}
                    </td>

                    <td className="py-4 px-4 text-center font-bold">
                      <span className="px-2 py-1 bg-blue-50 text-blue-700 font-black text-[11px] rounded-lg border border-blue-200">
                        {item.targetsCompleted} / {item.targetsTotal}
                      </span>
                    </td>

                    <td className="py-4 px-4 text-right font-black text-emerald-700 text-sm">
                      ₹{item.weeklyEarnings.toLocaleString()}
                    </td>

                    <td className="py-4 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-24 bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              item.performanceScore >= 90
                                ? 'bg-emerald-500'
                                : item.performanceScore >= 75
                                ? 'bg-[#864f19]'
                                : 'bg-amber-500'
                            }`}
                            style={{ width: `${item.performanceScore}%` }}
                          />
                        </div>
                        <span className="font-black text-xs text-[#1b1c1c]">{item.performanceScore}%</span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {leaderboardList.length > 3 && !searchTerm.trim() && (
          <div className="p-3 bg-[#fbf9f8] border-t border-[#d7c3b5]/30 flex items-center justify-between text-xs text-[#52443a]">
            <span className="font-semibold text-slate-500">
              Showing {showAllRows ? `all ${leaderboardList.length}` : 'Top 3'} ranked {tierTab === 'overall' ? 'agents' : 'entities'} within authorized territory.
            </span>
            <button
              onClick={() => setShowAllRows(!showAllRows)}
              className="px-3 py-1.5 bg-[#864f19]/10 hover:bg-[#864f19]/20 text-[#864f19] font-black rounded-lg transition border-none cursor-pointer"
            >
              {showAllRows ? 'Show Top 3 Only' : `View All (${leaderboardList.length})`}
            </button>
          </div>
        )}
      </div>

      {/* DETAILED AGENT DRILLDOWN MODAL */}
      {selectedAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-[#d7c3b5]/50 p-6 space-y-6">
            <div className="flex items-start justify-between border-b border-[#d7c3b5]/30 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#ffdcc2] text-[#864f19] font-black text-xl flex items-center justify-center uppercase shadow-2xs">
                  {selectedAgent.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    {getRoleBadge(selectedAgent)}
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-full border border-emerald-200">
                      Rank #{selectedAgent.rank}
                    </span>
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

            <div className="bg-[#fbf9f8] p-3.5 rounded-xl border border-[#d7c3b5]/40 flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-[#52443a]">
              <div className="flex flex-wrap items-center gap-2">
                <MapPin className="w-4 h-4 text-[#864f19]" />
                <span>State: {selectedAgent.territory?.state || (selectedAgent as any)?.assignedTerritory?.state || '—'}</span>
                {(selectedAgent.territory?.district || (selectedAgent as any)?.assignedTerritory?.district) && <span>› District: {selectedAgent.territory?.district || (selectedAgent as any)?.assignedTerritory?.district}</span>}
                {(selectedAgent.territory?.division || (selectedAgent as any)?.assignedTerritory?.division) && <span>› Division: {selectedAgent.territory?.division || (selectedAgent as any)?.assignedTerritory?.division}</span>}
                {(selectedAgent.territory?.pincode || (selectedAgent as any)?.assignedTerritory?.pincode) && <span>› PIN: {selectedAgent.territory?.pincode || (selectedAgent as any)?.assignedTerritory?.pincode}</span>}
              </div>
              <div className="text-[11px] font-black text-[#864f19] bg-white px-2.5 py-1 rounded-lg border border-[#d7c3b5]/50 shadow-2xs">
                Date of Registration: {formatRegistrationDate(selectedAgent.createdAt)}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="bg-emerald-50 p-3.5 rounded-2xl border border-emerald-200">
                <p className="text-[10px] uppercase font-extrabold text-emerald-800">Weekly Earnings</p>
                <p className="text-xl font-black text-emerald-700 mt-1">₹{selectedAgent.weeklyEarnings.toLocaleString()}</p>
              </div>

              <div className="bg-[#fbf9f8] p-3.5 rounded-2xl border border-[#d7c3b5]/30">
                <p className="text-[10px] uppercase font-extrabold text-[#52443a]">Performance Score</p>
                <p className="text-xl font-black text-[#864f19] mt-1">{selectedAgent.performanceScore}%</p>
              </div>

              <div className="bg-[#fbf9f8] p-3.5 rounded-2xl border border-[#d7c3b5]/30">
                <p className="text-[10px] uppercase font-extrabold text-[#52443a]">Targets Achieved</p>
                <p className="text-xl font-black text-blue-700 mt-1">{selectedAgent.targetsCompleted} / {selectedAgent.targetsTotal}</p>
              </div>
            </div>

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
      )}

      {/* CUSTOM DATE RANGE PICKER MODAL */}
      {isCustomModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-[#d7c3b5]/50 p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-[#eae8e7] pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#864f19]" />
                <h3 className="text-base font-black text-[#1b1c1c]">Select Custom Date Range</h3>
              </div>
              <button
                onClick={handleCancelCustomDates}
                className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-700 border-none bg-transparent cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-bold text-[#52443a]">
              <div>
                <label className="block text-[11px] uppercase tracking-wider mb-1 font-bold text-[#52443a]">
                  Start Date *
                </label>
                <input
                  type="date"
                  value={tempStartDate}
                  onChange={(e) => {
                    setTempStartDate(e.target.value);
                    setDateError('');
                  }}
                  className="w-full bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl px-3 py-2 text-xs font-semibold text-[#1b1c1c] focus:outline-none focus:ring-2 focus:ring-[#864f19]/30"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider mb-1 font-bold text-[#52443a]">
                  End Date *
                </label>
                <input
                  type="date"
                  value={tempEndDate}
                  onChange={(e) => {
                    setTempEndDate(e.target.value);
                    setDateError('');
                  }}
                  className="w-full bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl px-3 py-2 text-xs font-semibold text-[#1b1c1c] focus:outline-none focus:ring-2 focus:ring-[#864f19]/30"
                />
              </div>

              {dateError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                  <XCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{dateError}</span>
                </div>
              )}
            </div>

            <div className="flex justify-end items-center gap-2 pt-3 border-t border-[#eae8e7]">
              <button
                type="button"
                onClick={handleCancelCustomDates}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition border-none cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyCustomDates}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#864f19] hover:bg-[#a3672f] transition border-none cursor-pointer shadow-sm"
              >
                Apply Range
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaderboardModule;
