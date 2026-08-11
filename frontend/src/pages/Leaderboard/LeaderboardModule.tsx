import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import {
  Trophy, Medal, Award, Search, Filter, RefreshCw, MapPin, CheckCircle,
  Clock, XCircle, ArrowUpRight, ArrowDownRight, BarChart3, Building2,
  TrendingUp, Users, Target, Shield, Zap, Globe, Landmark, Building, Layers,
  Download, FileText
} from 'lucide-react';

interface LeaderboardItem {
  _id: string;
  rank: number;
  name: string;
  email: string;
  phone: string;
  registrationId: string;
  role: 'state' | 'district' | 'division' | 'pincode';
  kycStatus: 'approved' | 'pending' | 'rejected';
  registrationFeePaid: boolean;
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
}


export const LeaderboardModule: React.FC = () => {
  const { user, addNotification } = useAuth();

  // Active 4-Tier Tab: 'overall' | 'state' | 'district' | 'division' | 'pincode'
  const [tierTab, setTierTab] = useState<'overall' | 'state' | 'district' | 'division' | 'pincode'>('overall');
  const [timeframe, setTimeframe] = useState<string>('this_week');
  const [sortBy, setSortBy] = useState<string>('performanceScore');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<LeaderboardItem | null>(null);

  // Query leaderboard data
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['leaderboard', tierTab, timeframe, sortBy],
    queryFn: async () => {
      try {
        const roleQuery = tierTab === 'overall' ? 'all' : tierTab;
        const res = await api.get(`/admin/leaderboard?role=${roleQuery}&timeframe=${timeframe}&sortBy=${sortBy}`);
        return res.data;
      } catch (err: any) {
        if (err?.response?.status !== 401) {
          console.warn('Leaderboard API fallback to demo data:', err);
        }
        return null;
      }
    },
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 401) return false;
      return failureCount < 1;
    }
  });

  // Filtered & Sorted Leaderboard List based on Active 4-Tier Tab
  const leaderboardList: LeaderboardItem[] = useMemo(() => {
    let list: LeaderboardItem[] = data?.leaderboard || [];

    // Filter by Tier Tab
    if (tierTab !== 'overall') {
      list = list.filter(item => item.role === tierTab);
    }

    // Filter by Search Query
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(item =>
        item.name.toLowerCase().includes(q) ||
        item.phone.includes(q) ||
        item.registrationId.toLowerCase().includes(q) ||
        (item.territory?.district && item.territory.district.toLowerCase().includes(q)) ||
        (item.territory?.state && item.territory.state.toLowerCase().includes(q))
      );
    }

    // Sort accordingly
    list = [...list].sort((a, b) => {
      if (sortBy === 'weeklyEarnings') return b.weeklyEarnings - a.weeklyEarnings;
      if (sortBy === 'targetsCompleted') return b.targetsCompleted - a.targetsCompleted;
      return b.performanceScore - a.performanceScore;
    });

    // Re-rank dynamically for the active view
    return list.map((item, idx) => ({ ...item, rank: idx + 1 }));
  }, [data, tierTab, searchTerm, sortBy]);

  const topPerformers = useMemo(() => {
    return leaderboardList.slice(0, 3);
  }, [leaderboardList]);

  const getRoleBadge = (role: string) => {
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
        return null;
    }
  };

  const renderTierTabIcon = (tabKey: string) => {
    switch (tabKey) {
      case 'overall': return <Globe className="w-4 h-4 shrink-0" />;
      case 'state': return <Landmark className="w-4 h-4 shrink-0" />;
      case 'district': return <Building2 className="w-4 h-4 shrink-0" />;
      case 'division': return <Building className="w-4 h-4 shrink-0" />;
      case 'pincode': return <MapPin className="w-4 h-4 shrink-0" />;
      default: return null;
    }
  };

  const getTierTabLabel = (tabKey: string) => {
    switch (tabKey) {
      case 'overall': return 'Overall Network';
      case 'state': return 'State Tier';
      case 'district': return 'District Tier';
      case 'division': return 'Division Tier';
      case 'pincode': return 'Pincode Tier';
      default: return tabKey;
    }
  };

  // Export Leaderboard CSV Spreadsheet
  const handleExportCSV = () => {
    const headers = 'Rank,Registration ID,Agent Name,Role,Territory,Targets Achieved,Weekly Earnings (INR),Performance Score (%)\n';
    const rows = leaderboardList.map(item =>
      `"${item.rank}","${item.registrationId}","${item.name}","${item.role.toUpperCase()}","${item.territory?.district || item.territory?.state || 'N/A'}","${item.targetsCompleted}/${item.targetsTotal}","${item.weeklyEarnings}","${item.performanceScore}%"`
    ).join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Weekly_Leaderboard_Report_${tierTab}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (addNotification) {
      addNotification(
        'Leaderboard CSV Exported',
        `Exported weekly agent leaderboard rankings for ${getTierTabLabel(tierTab)}.`,
        'low',
        'system'
      );
    }
  };

  // Export Printable PDF Executive Report
  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Weekly Agent Performance & Territory Growth Report</title>
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
          <div class="meta">Active Tier Scope: ${getTierTabLabel(tierTab)} • Period: ${timeframe.replace('_', ' ')} • Total Agents: ${leaderboardList.length} • Generated: ${new Date().toLocaleDateString()}</div>
          
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
                <th>Reg ID</th>
                <th>Agent Name</th>
                <th>Role Tier</th>
                <th>Territory</th>
                <th>Targets</th>
                <th>Weekly Earnings</th>
                <th>Performance</th>
              </tr>
            </thead>
            <tbody>
              ${leaderboardList.map(item => `
                <tr>
                  <td><strong>#${item.rank}</strong></td>
                  <td>${item.registrationId}</td>
                  <td>${item.name}</td>
                  <td>${item.role.toUpperCase()}</td>
                  <td>${item.territory?.district || item.territory?.state || 'Karnataka'}</td>
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
        `Printed weekly executive performance report for ${getTierTabLabel(tierTab)}.`,
        'high',
        'system'
      );
    }
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

        {/* 4-TIER HIERARCHY SWITCHER TABS (Clean Vector Icons) */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pt-2 border-t border-[#d7c3b5]/30">
          {(['overall', 'state', 'district', 'division', 'pincode'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setTierTab(tab)}
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
              placeholder="Search agent by name, phone, or region..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-[#d7c3b5]/60 rounded-xl pl-10 pr-4 py-2 text-xs font-semibold text-[#1b1c1c] focus:outline-none focus:ring-2 focus:ring-[#864f19]/30"
            />
          </div>

          {/* Timeframe Filter */}
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="bg-white border border-[#d7c3b5]/60 rounded-xl px-3 py-2 text-xs font-bold text-[#52443a] focus:outline-none focus:ring-2 focus:ring-[#864f19]/30"
          >
            <option value="this_week">This Week (Jul 20 - 26)</option>
            <option value="last_week">Last Week (Jul 13 - 19)</option>
            <option value="this_month">This Month (July 2026)</option>
          </select>

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
          <p className="text-xs font-black text-[#864f19] uppercase">{getTierTabLabel(tierTab)} ({leaderboardList.length} AGENTS)</p>
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
              <div className="mt-1">{getRoleBadge(topPerformers[1].role)}</div>
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
              <div className="mt-1">{getRoleBadge(topPerformers[0].role)}</div>
              <p className="text-[11px] font-bold text-amber-800 mt-1 flex items-center justify-center gap-1">
                <MapPin className="w-3 h-3" /> {topPerformers[0].territory?.district || topPerformers[0].territory?.state || 'Karnataka'}
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
              <div className="mt-1">{getRoleBadge(topPerformers[2].role)}</div>
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
            Rankings ({getTierTabLabel(tierTab)} — {leaderboardList.length} Agents)
          </h3>
          <span className="text-xs font-bold text-slate-500 uppercase">Period: {timeframe.replace('_', ' ')}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f6f3f2] text-[#52443a] font-black uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4 text-center">Rank</th>
                <th className="py-3.5 px-4">Agent Name</th>
                <th className="py-3.5 px-4">Tier Role</th>
                <th className="py-3.5 px-4">Territory</th>
                <th className="py-3.5 px-4 text-center">Targets Achieved</th>
                <th className="py-3.5 px-4 text-right">Weekly Earnings</th>
                <th className="py-3.5 px-4 text-center">Performance Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leaderboardList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs font-semibold text-slate-400">
                    No agents ranked under this tier tab.
                  </td>
                </tr>
              ) : (
                leaderboardList.map((item) => (
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
                        <div className="w-8 h-8 rounded-full bg-[#ffdcc2] text-[#864f19] font-black text-xs flex items-center justify-center uppercase shadow-2xs">
                          {item.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-extrabold text-xs text-[#1b1c1c]">{item.name}</p>
                          <p className="text-[10px] text-slate-400 font-semibold">{item.registrationId}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4">{getRoleBadge(item.role)}</td>

                    <td className="py-4 px-4 font-semibold text-slate-600">
                      {item.territory?.district || item.territory?.state || 'Karnataka'}
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
                    {getRoleBadge(selectedAgent.role)}
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

            <div className="bg-[#fbf9f8] p-3.5 rounded-xl border border-[#d7c3b5]/40 flex flex-wrap items-center gap-2 text-xs font-bold text-[#52443a]">
              <MapPin className="w-4 h-4 text-[#864f19]" />
              <span>State: {selectedAgent.territory?.state || 'Karnataka'}</span>
              {selectedAgent.territory?.district && <span>› District: {selectedAgent.territory.district}</span>}
              {selectedAgent.territory?.division && <span>› Division: {selectedAgent.territory.division}</span>}
              {selectedAgent.territory?.pincode && <span>› PIN: {selectedAgent.territory.pincode}</span>}
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
    </div>
  );
};

export default LeaderboardModule;
