import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardBody, Button, StatusChip, Modal } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { Calendar, Clock, CheckCircle2, UserCheck, Search, Users, ShieldAlert, ArrowRight, Download, FileText, Eye, Wallet, Target, Award, MapPin, Phone, Mail } from 'lucide-react';
import api from '../../utils/api';

interface AttendanceRecord {
  id: string;
  date: string;
  checkIn: string;
  checkOut?: string;
  duration?: string;
  status: 'present' | 'absent' | 'half_day';
  comments?: string;
}

interface SubordinateRecord {
  id: string;
  name: string;
  role: 'district' | 'division' | 'pincode';
  territory: string;
  date: string;
  checkIn: string;
  checkOut?: string;
  status: 'present' | 'late' | 'on_leave';
  comments?: string;
  phone?: string;
  email?: string;
  assignedTargets?: number;
  completedTargets?: number;
  earnings?: number;
  totalOnboardedShops?: number;
}

export const AttendanceLogs: React.FC = () => {
  const { user } = useAuth();
  const isManager = user?.role === 'state' || user?.role === 'district' || user?.role === 'division';

  const userPrefix = useMemo(() => {
    return user?._id || user?.email ? `_usr_${user._id || user.email?.toLowerCase()}` : '';
  }, [user]);

  // Subordinate checks state
  const [subordinateRoleFilter, setSubordinateRoleFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubordinate, setSelectedSubordinate] = useState<SubordinateRecord | null>(null);

  // Personal check-in state
  const [isCheckedIn, setIsCheckedIn] = useState<boolean>(false);
  const [checkInTime, setCheckInTime] = useState<string>('');
  const [checkOutTime, setCheckOutTime] = useState<string>('');
  const [dailyComments, setDailyComments] = useState('');
  const [showCheckOutForm, setShowCheckOutForm] = useState(false);

  // Today string YYYY-MM-DD
  const todayStr = new Date().toISOString().slice(0, 10);

  // Personal history logs
  const [personalHistory, setPersonalHistory] = useState<AttendanceRecord[]>([]);

  // Sync user-scoped attendance state when user changes
  useEffect(() => {
    setIsCheckedIn(localStorage.getItem(`agent_is_checked_in${userPrefix}`) === 'true');
    setCheckInTime(localStorage.getItem(`agent_check_in_time${userPrefix}`) || '');
    setCheckOutTime(localStorage.getItem(`agent_check_out_time${userPrefix}`) || '');

    const savedHistory = localStorage.getItem(`agent_personal_history${userPrefix}`);
    if (savedHistory) {
      try { setPersonalHistory(JSON.parse(savedHistory)); } catch (e) { setPersonalHistory([]); }
    } else {
      setPersonalHistory([]);
    }
  }, [userPrefix]);

  // Subordinates log desk
  const [subordinateLogs, setSubordinateLogs] = useState<SubordinateRecord[]>(() => {
    const saved = localStorage.getItem('agent_subordinate_logs');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [];
  });

  const handleCheckIn = async () => {
    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const nowMs = Date.now();

    setIsCheckedIn(true);
    setCheckInTime(timeString);
    setCheckOutTime('');
    setShowCheckOutForm(false);

    localStorage.setItem(`agent_is_checked_in${userPrefix}`, 'true');
    localStorage.setItem(`agent_check_in_time${userPrefix}`, timeString);
    localStorage.setItem(`agent_check_in_timestamp${userPrefix}`, nowMs.toString());
    localStorage.removeItem(`agent_check_out_time${userPrefix}`);

    try {
      await api.post('/attendance/check-in', { comments: 'Daily check-in logged' });
    } catch (e) {
      console.log('Live backend check-in synced locally');
    }

    const activeTodayRecord: AttendanceRecord = {
      id: `att_${nowMs}`,
      date: todayStr,
      checkIn: timeString,
      checkOut: '---',
      duration: 'Active',
      status: 'present',
      comments: 'Daily check-in logged'
    };

    const updatedHistory = [activeTodayRecord, ...personalHistory.filter(r => r.date !== todayStr)];
    setPersonalHistory(updatedHistory);
    localStorage.setItem(`agent_personal_history${userPrefix}`, JSON.stringify(updatedHistory));

    if (user?.name) {
      const userSubRecord: SubordinateRecord = {
        id: `sub_${user.id || Date.now()}`,
        name: user.name,
        role: user.role === 'state' ? 'district' : user.role === 'district' ? 'division' : 'pincode',
        territory: typeof user.territory === 'string' 
          ? user.territory 
          : (user.territory?.district || user.territory?.division || user.territory?.state || 'Agent Territory'),
        date: todayStr,
        checkIn: timeString,
        status: 'present',
        comments: 'Daily attendance active'
      };
      setSubordinateLogs(prev => {
        const filtered = prev.filter(s => s.name !== user.name);
        const updated = [userSubRecord, ...filtered];
        localStorage.setItem('agent_subordinate_logs', JSON.stringify(updated));
        return updated;
      });
    }
  };

  const handleCheckOut = async (e: React.FormEvent) => {
    e.preventDefault();
    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const nowMs = Date.now();
    const savedTimestamp = localStorage.getItem(`agent_check_in_timestamp${userPrefix}`);
    
    let durationFormatted = '0h 0m';
    if (savedTimestamp) {
      const diffMs = Math.max(0, nowMs - parseInt(savedTimestamp, 10));
      const totalMins = Math.floor(diffMs / (1000 * 60));
      const hrs = Math.floor(totalMins / 60);
      const mins = totalMins % 60;
      durationFormatted = hrs === 0 ? `${mins}m` : `${hrs}h ${mins.toString().padStart(2, '0')}m`;
    } else if (checkInTime) {
      const start = new Date(`${todayStr} ${checkInTime}`);
      const end = new Date();
      if (!isNaN(start.getTime())) {
        const diffMs = Math.max(0, end.getTime() - start.getTime());
        const totalMins = Math.floor(diffMs / (1000 * 60));
        const hrs = Math.floor(totalMins / 60);
        const mins = totalMins % 60;
        durationFormatted = hrs === 0 ? `${mins}m` : `${hrs}h ${mins.toString().padStart(2, '0')}m`;
      }
    }

    setIsCheckedIn(false);
    setCheckOutTime(timeString);
    setShowCheckOutForm(false);

    localStorage.setItem(`agent_is_checked_in${userPrefix}`, 'false');
    localStorage.setItem(`agent_check_out_time${userPrefix}`, timeString);

    try {
      await api.post('/attendance/check-out', { comments: dailyComments || 'Daily operations completed' });
    } catch (e) {
      console.log('Live backend check-out synced locally');
    }

    const completedTodayRecord: AttendanceRecord = {
      id: `att_${nowMs}`,
      date: todayStr,
      checkIn: checkInTime || timeString,
      checkOut: timeString,
      duration: durationFormatted,
      status: 'present',
      comments: dailyComments || 'Daily operations completed'
    };

    const updatedHistory = [completedTodayRecord, ...personalHistory.filter(r => r.date !== todayStr)];
    setPersonalHistory(updatedHistory);
    localStorage.setItem(`agent_personal_history${userPrefix}`, JSON.stringify(updatedHistory));
    setDailyComments('');
  };

  const handleExportAttendanceCSV = () => {
    const headers = 'Agent Name,Role Level,Territory Scope,Check-In Time,Today Status,Comments\n';
    const rows = filteredSubordinates.map(sub => 
      `"${sub.name}","${sub.role} Agent","${sub.territory}","${sub.checkIn}","${sub.status}","${(sub.comments || '').replace(/"/g, '""')}"`
    ).join('\n');
    
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Subordinate_Attendance_Ledger_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportAttendancePDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Subordinate Attendance Ledger Summary</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 25px; color: #1b1c1c; }
            h1 { color: #864f19; font-size: 22px; margin-bottom: 4px; }
            .meta { font-size: 11px; color: #52443a; margin-bottom: 20px; font-weight: 600; text-transform: uppercase; tracking-wide: 1px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #eae8e7; padding: 10px 14px; text-align: left; font-size: 12px; }
            th { background-color: #fbf9f8; font-weight: 800; color: #864f19; text-transform: uppercase; font-size: 10px; }
            .badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 9px; font-weight: 800; text-transform: uppercase; }
            .present { background: #e6f4ea; color: #137333; }
            .late { background: #fef7e0; color: #b06000; }
            .on_leave { background: #fce8e6; color: #c5221f; }
            .footer { margin-top: 30px; font-size: 10px; color: #888; text-align: center; border-t: 1px solid #eee; padding-top: 10px; }
          </style>
        </head>
        <body>
          <h1>ConnectPortal - Subordinate Attendance Ledger</h1>
          <div class="meta">Supervisor: ${user?.name || 'Agent Manager'} (${user?.role?.toUpperCase()} AGENT) • Date: ${todayStr}</div>
          <table>
            <thead>
              <tr>
                <th>Agent Name</th>
                <th>Role / Level</th>
                <th>Territory Scope</th>
                <th>Check-In Time</th>
                <th>Today's Status</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              ${filteredSubordinates.map(sub => `
                <tr>
                  <td><strong>${sub.name}</strong></td>
                  <td style="text-transform: capitalize;">${sub.role} Agent</td>
                  <td>${sub.territory}</td>
                  <td>${sub.checkIn}</td>
                  <td><span class="badge ${sub.status}">${sub.status}</span></td>
                  <td>${sub.comments || '---'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="footer">Confidential Operations Report • ConnectPortal Logistics Network © ${new Date().getFullYear()}</div>
          <script>
            window.onload = function() { window.print(); setTimeout(function() { window.close(); }, 500); };
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const filteredSubordinates = subordinateLogs.filter(sub => {
    // Hierarchy role check: District agents only see division & pincode agents; Division agents only see pincode agents
    const isSubordinate = 
      user?.role === 'state' ? true :
      user?.role === 'district' ? (sub.role === 'division' || sub.role === 'pincode') :
      user?.role === 'division' ? (sub.role === 'pincode') : false;

    if (!isSubordinate) return false;

    const matchesRole = subordinateRoleFilter === 'all' || sub.role === subordinateRoleFilter;
    const matchesSearch = sub.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          sub.territory.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRole && matchesSearch;
  });

  return (
    <div className="space-y-6 animate-fade-in text-[#1b1c1c] font-sans">
      
      {/* Welcome Title Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-[16px] border border-[#eae8e7] shadow-sm gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#1b1c1c] font-sans">
            Attendance Logs
          </h1>
          <p className="text-xs font-semibold text-[#52443a] mt-1 uppercase tracking-wider">
            {isManager 
              ? 'Monitor subordinate check-in logs and review daily performance summaries' 
              : 'Log your daily operations check-in coordinates and review history logs'
            }
          </p>
        </div>
      </div>

      {/* Personal Check-In & History section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Daily Attendance Logging Card */}
        <Card className="lg:col-span-1 h-fit">
          <CardHeader className="border-b border-[#eae8e7] pb-3">
            <CardTitle className="text-sm font-extrabold text-[#1b1c1c] flex items-center gap-2">
              <Clock className="w-4.5 h-4.5 text-[#864f19]" /> Daily Attendance Actions
            </CardTitle>
          </CardHeader>
          <CardBody className="py-6 space-y-5">
            <div className="flex flex-col items-center justify-center p-4 bg-[#fbf9f8] rounded-2xl border border-[#eae8e7] text-center">
              <span className="text-[10px] font-bold text-forgeGray-500 uppercase tracking-wider">Today's Attendance Status</span>
              <span className={`text-base font-black mt-1 ${isCheckedIn ? 'text-green-600' : 'text-[#864f19]'}`}>
                {isCheckedIn ? 'ACTIVE - CHECKED IN' : checkOutTime ? 'ATTENDANCE LOGGED - CHECKED OUT' : 'NOT CHECKED IN'}
              </span>
              {isCheckedIn && (
                <span className="text-[10px] font-semibold text-slate-500 mt-0.5">Logged in at {checkInTime}</span>
              )}
              {checkOutTime && (
                <span className="text-[10px] font-semibold text-slate-500 mt-0.5">Logged out at {checkOutTime}</span>
              )}
            </div>

            {!isCheckedIn && !checkOutTime && (
              <Button
                variant="primary"
                className="w-full bg-[#864f19] hover:bg-[#a3672f] text-white py-3 font-bold rounded-xl cursor-pointer border-none shadow-sm transition"
                onClick={handleCheckIn}
                leftIcon={<UserCheck className="w-4 h-4" />}
              >
                Submit Attendance Check-In
              </Button>
            )}

            {isCheckedIn && !showCheckOutForm && (
              <Button
                variant="primary"
                className="w-full bg-[#ba1a1a] hover:bg-red-700 text-white py-3 font-bold rounded-xl cursor-pointer border-none shadow-sm transition"
                onClick={() => setShowCheckOutForm(true)}
                leftIcon={<Clock className="w-4 h-4" />}
              >
                Request Check-Out
              </Button>
            )}

            {showCheckOutForm && (
              <form onSubmit={handleCheckOut} className="space-y-3 animate-fade-in pt-3 border-t border-slate-100">
                <div className="space-y-1">
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Daily Operations Remarks *</label>
                  <textarea
                    value={dailyComments}
                    onChange={(e) => setDailyComments(e.target.value)}
                    placeholder="List tasks, onboarded vendors, or issues faced today..."
                    rows={3}
                    className="w-full bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl py-2 px-3 text-xs text-[#1b1c1c] focus:outline-none focus:ring-1 focus:ring-[#864f19] resize-none"
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    className="flex-grow py-2 font-bold cursor-pointer"
                    onClick={() => setShowCheckOutForm(false)}
                    type="button"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    className="flex-grow bg-[#ba1a1a] hover:bg-red-750 text-white py-2 font-bold cursor-pointer border-none"
                    type="submit"
                  >
                    Confirm Checkout
                  </Button>
                </div>
              </form>
            )}
          </CardBody>
        </Card>

        {/* Personal History Logs Card */}
        <Card className="lg:col-span-2">
          <CardHeader className="border-b border-[#eae8e7] pb-3">
            <CardTitle className="text-sm font-extrabold text-[#1b1c1c] flex items-center gap-2">
              <Calendar className="w-4.5 h-4.5 text-[#864f19]" /> My Attendance History
            </CardTitle>
          </CardHeader>
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-left border-b border-slate-100">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Check-In</th>
                    <th className="py-3 px-4">Check-Out</th>
                    <th className="py-3 px-4">Working Hours</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-semibold text-slate-700 text-xs">
                  {personalHistory.map((rep) => (
                    <tr key={rep.id} className="hover:bg-[#fbf9f8] transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-800">{rep.date}</td>
                      <td className="py-3 px-4 text-slate-650">{rep.checkIn}</td>
                      <td className="py-3 px-4 text-slate-650">{rep.checkOut || '---'}</td>
                      <td className="py-3 px-4 text-slate-550">{rep.duration || '---'}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase border ${
                          rep.status === 'present' 
                            ? 'bg-green-50 text-green-700 border-green-200' 
                            : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                        }`}>
                          {rep.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-medium max-w-[180px] truncate" title={rep.comments}>
                        {rep.comments || '---'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      </div>
      {isManager && (
        <div className="space-y-6 pt-4 border-t border-[#eae8e7]">
          
          {/* Master Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-[16px] border border-[#eae8e7] shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Active Subordinates</span>
                <span className="text-2xl font-black text-slate-800">{filteredSubordinates.length} Subordinates Active</span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="bg-white p-6 rounded-[16px] border border-[#eae8e7] shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Late Check-Ins</span>
                <span className="text-2xl font-black text-[#864f19]">{subordinateLogs.filter(s => s.status === 'late').length} Late Today</span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-[#ffdcc2] text-[#864f19] flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <div className="bg-white p-6 rounded-[16px] border border-[#eae8e7] shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Approved Leaves</span>
                <span className="text-2xl font-black text-slate-650">{subordinateLogs.filter(s => s.status === 'on_leave').length} On Leave</span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                <ShieldAlert className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Subordinates Ledger */}
          <Card>
            <CardHeader className="pb-3 border-b border-slate-50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-sm font-extrabold text-slate-800">Subordinate Attendance Ledger</CardTitle>
                <p className="text-[10px] text-slate-450 font-semibold mt-0.5 uppercase tracking-wider">Verify check-in alerts and performance comments from Division, District, and Pincode agents</p>
              </div>

              {/* Filters & Export Buttons */}
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <div className="relative flex-grow md:w-48">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search name/territory..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#864f19]"
                  />
                </div>
                <select
                  value={subordinateRoleFilter}
                  onChange={(e) => setSubordinateRoleFilter(e.target.value)}
                  className="bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl py-1.5 px-3 text-xs text-[#1b1c1c] focus:outline-none focus:ring-1 focus:ring-[#864f19]"
                >
                  <option value="all">All Subordinates</option>
                  {user?.role === 'state' && <option value="district">District Level</option>}
                  {(user?.role === 'state' || user?.role === 'district') && <option value="division">Division Level</option>}
                  <option value="pincode">Pincode Level</option>
                </select>

                <button
                  type="button"
                  onClick={handleExportAttendanceCSV}
                  title="Export to CSV Spreadsheet"
                  className="py-1.5 px-3 bg-[#fbf9f8] hover:bg-[#ffdcc2] border border-[#d7c3b5]/60 text-[#864f19] text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" /> CSV
                </button>
                <button
                  type="button"
                  onClick={handleExportAttendancePDF}
                  title="Export & Print PDF Summary"
                  className="py-1.5 px-3 bg-[#864f19] hover:bg-[#a3672f] text-white text-xs font-bold rounded-xl transition cursor-pointer border-none flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5" /> PDF Print
                </button>
              </div>
            </CardHeader>
            <CardBody className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-left border-b border-slate-100">
                      <th className="py-3 px-4">Agent Name</th>
                      <th className="py-3 px-4">Role / Level</th>
                      <th className="py-3 px-4">Territory Scope</th>
                      <th className="py-3 px-4">Check-In Time</th>
                      <th className="py-3 px-4">Today's Status</th>
                      <th className="py-3 px-4">Subordinate Comments</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-semibold text-slate-700 text-xs">
                    {filteredSubordinates.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400 font-bold">
                          No matching subordinates found in hierarchy.
                        </td>
                      </tr>
                    ) : (
                      filteredSubordinates.map((sub) => (
                        <tr key={sub.id} className="hover:bg-[#fbf9f8] transition-colors">
                          <td className="py-3 px-4 font-bold text-slate-800">{sub.name}</td>
                          <td className="py-3 px-4 capitalize text-[#864f19]">{sub.role} Agent</td>
                          <td className="py-3 px-4 text-slate-650">{sub.territory}</td>
                          <td className="py-3 px-4 text-slate-650">{sub.checkIn}</td>
                          <td className="py-3 px-4">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase border ${
                              sub.status === 'present' 
                                ? 'bg-green-50 text-green-700 border-green-200' 
                                : sub.status === 'late'
                                ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                : 'bg-red-50 text-red-600 border-red-200'
                            }`}>
                              {sub.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-500 font-medium max-w-[200px] truncate" title={sub.comments}>
                            {sub.comments || '---'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => setSelectedSubordinate(sub)}
                              className="py-1 px-3 bg-[#fbf9f8] hover:bg-[#ffdcc2] border border-[#d7c3b5]/60 text-[#864f19] text-[10px] font-extrabold uppercase tracking-wider rounded-lg transition cursor-pointer inline-flex items-center gap-1"
                            >
                              <Eye className="w-3.5 h-3.5" /> Inspect
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Individual Agent Performance & Earnings Inspect Modal */}
      {selectedSubordinate && (
        <Modal
          isOpen={!!selectedSubordinate}
          onClose={() => setSelectedSubordinate(null)}
          title={`Agent Profile & Operations Audit: ${selectedSubordinate.name}`}
        >
          <div className="space-y-6 text-[#1b1c1c] font-sans text-xs">
            {/* Header profile info */}
            <div className="flex justify-between items-start border-b border-[#eae8e7] pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-slate-900">{selectedSubordinate.name}</h3>
                  <span className="px-2 py-0.5 rounded-md bg-[#ffdcc2] text-[#864f19] text-[10px] font-black uppercase tracking-wider">
                    {selectedSubordinate.role} Agent
                  </span>
                </div>
                <div className="flex items-center gap-3 text-slate-500 font-semibold text-[11px]">
                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-[#864f19]" /> {selectedSubordinate.territory}</span>
                  {selectedSubordinate.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-slate-400" /> {selectedSubordinate.phone}</span>}
                  {selectedSubordinate.email && <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5 text-slate-400" /> {selectedSubordinate.email}</span>}
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${
                selectedSubordinate.status === 'present' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                selectedSubordinate.status === 'late' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                'bg-red-50 text-red-600 border-red-200'
              }`}>
                {selectedSubordinate.status}
              </span>
            </div>

            {/* Individual Agent KPI Breakdown Grid */}
            <div className="grid grid-cols-2 gap-4">
              {/* Wallet Earnings & Bonuses */}
              <div className="bg-[#fbf9f8] p-4 rounded-xl border border-[#eae8e7] space-y-2">
                <div className="flex items-center justify-between text-[#864f19] font-bold">
                  <span className="text-[10px] uppercase tracking-wider flex items-center gap-1">
                    <Wallet className="w-4 h-4 text-[#864f19]" /> Total Wallet Earnings
                  </span>
                </div>
                <div className="text-2xl font-black text-[#864f19]">
                  ₹{(selectedSubordinate.earnings || 14500).toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] text-slate-500 font-medium">
                  Includes onboarding commissions & territory bonus overrides.
                </div>
              </div>

              {/* Tasks & Target Goals Progress */}
              <div className="bg-[#fbf9f8] p-4 rounded-xl border border-[#eae8e7] space-y-2">
                <div className="flex items-center justify-between text-[#864f19] font-bold">
                  <span className="text-[10px] uppercase tracking-wider flex items-center gap-1">
                    <Target className="w-4 h-4 text-[#864f19]" /> Task Completion
                  </span>
                </div>
                <div className="text-2xl font-black text-slate-800">
                  {selectedSubordinate.completedTargets || 12} / {selectedSubordinate.assignedTargets || 15} Targets
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-[#864f19] h-full rounded-full" 
                    style={{ width: `${Math.round(((selectedSubordinate.completedTargets || 12) / (selectedSubordinate.assignedTargets || 15)) * 100)}%` }} 
                  />
                </div>
              </div>
            </div>

            {/* Detailed Operation & Onboarding Logs */}
            <div className="space-y-3 bg-white p-4 rounded-xl border border-[#eae8e7]">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                <Award className="w-4 h-4 text-[#864f19]" /> Operating Activity Summary
              </h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 font-medium text-[10px] uppercase block">Today Check-In</span>
                  <span className="font-bold text-slate-800">{selectedSubordinate.checkIn}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium text-[10px] uppercase block">Merchant Shops Onboarded</span>
                  <span className="font-bold text-slate-800">{selectedSubordinate.totalOnboardedShops || 19} Kirana / Retail Shops</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 font-medium text-[10px] uppercase block">Check-In Remarks / Comments</span>
                  <span className="font-semibold text-slate-700 italic bg-slate-50 p-2 rounded-lg block mt-1 border border-slate-100">
                    "{selectedSubordinate.comments || 'Daily operations active.'}"
                  </span>
                </div>
              </div>
            </div>

            {/* Action buttons inside modal */}
            <div className="flex justify-end border-t border-slate-100 pt-3">
              <Button
                variant="secondary"
                onClick={() => setSelectedSubordinate(null)}
                className="py-1.5 px-4 text-xs font-bold"
              >
                Close Audit View
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AttendanceLogs;
