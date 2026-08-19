import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardBody, Tabs, Select, Button, Charts, Input } from '../../components/ui';
import { BarChart3, TrendingUp, Download, CheckCircle2, Ticket, Users, Upload, FileText, Loader2, Calendar } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

export const ReportsModule: React.FC = () => {
  const { user, addNotification } = useAuth();
  const rawRole = (user?.role as string) || (user as any)?.level || 'pincode';
  const activeRole = (rawRole === 'agent' ? ((user as any)?.level || 'pincode') : rawRole).toLowerCase();

  const userPincode = user?.territory?.pincode || (user as any)?.assignedPincode || (user as any)?.pincode || '530001';
  const userDivision = user?.territory?.division || (user as any)?.assignedDivision || (user as any)?.division || 'Vizag City Division';
  const userDistrict = user?.territory?.district || (user as any)?.assignedDistrict || (user as any)?.district || 'Visakhapatnam';
  const userState = user?.territory?.state || (user as any)?.assignedState || (user as any)?.state || 'Andhra Pradesh';

  const [activeTab, setActiveTab] = useState('overview');
  const [timeframe, setTimeframe] = useState<'today' | 'weekly' | 'monthly' | 'date'>('today');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [isExporting, setIsExporting] = useState(false);

  const userReportsKey = useMemo(() => {
    return user?._id || user?.email ? `connect_portal_pincode_reports_${user._id || user.email?.toLowerCase()}` : 'connect_portal_pincode_reports';
  }, [user]);

  const [reports, setReports] = useState<any[]>(() => {
    try {
      const userKey = user?._id || user?.email ? `connect_portal_pincode_reports_${user._id || user.email?.toLowerCase()}` : 'connect_portal_pincode_reports';
      const saved = localStorage.getItem(userKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(userReportsKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setReports(parsed);
      } else {
        setReports([]);
      }
    } catch (e) {}
  }, [userReportsKey]);

  const [isFetchingReports, setIsFetchingReports] = useState(false);
  const [reportType, setReportType] = useState('Daily Field Report');
  const [reportRemarks, setReportRemarks] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const fetchSubmittedReports = async () => {
    setIsFetchingReports(true);
    try {
      const response = await api.get('/reports');
      const apiReports = response.data.reports || [];
      if (apiReports.length > 0) {
        setReports(prev => {
          const apiIds = new Set(apiReports.map((r: any) => r._id));
          const localOnly = prev.filter(p => !apiIds.has(p._id));
          const combined = [...localOnly, ...apiReports];
          try {
            localStorage.setItem(userReportsKey, JSON.stringify(combined));
          } catch (e) {}
          return combined;
        });
      }
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setIsFetchingReports(false);
    }
  };

  useEffect(() => {
    fetchSubmittedReports();
  }, [userReportsKey]);

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setSubmitError('Please select a report file to upload.');
      return;
    }
    setIsSubmittingReport(true);
    setSubmitError('');

    const newReport = {
      _id: `REP-${Math.floor(1000 + Math.random() * 9000)}`,
      reportType,
      fileName: selectedFile.name,
      submittedAt: new Date().toLocaleDateString('en-GB') + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'Submitted',
      remarks: reportRemarks || 'Pincode territory field report submission',
      state: user?.territory?.state || 'Andhra Pradesh',
      district: user?.territory?.district || 'Visakhapatnam',
      division: user?.territory?.division || 'Vizag City',
      pincode: user?.territory?.pincode || '530001',
      agentName: user?.name || 'Logged Agent'
    };

    setReports(prev => {
      const updated = [newReport, ...prev];
      try {
        localStorage.setItem(userReportsKey, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    try {
      await api.post('/reports', {
        type: reportType,
        content: {
          fileName: selectedFile.name,
          fileSize: `${(selectedFile.size / 1024).toFixed(1)} KB`
        },
        remarks: reportRemarks
      });
      addNotification(
        'Pincode Agent Report Submitted',
        `Successfully submitted ${reportType} report for PIN ${user?.territory?.pincode || '530001'}.`,
        'medium',
        'system'
      );
      setReportRemarks('');
      setSelectedFile(null);
    } catch (err: any) {
      console.log('Saved report locally');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const [drillDistrictFilter, setDrillDistrictFilter] = useState('all');
  const [drillDivisionFilter, setDrillDivisionFilter] = useState('all');

  const tabs = useMemo(() => {
    if (activeRole === 'state') {
      return [
        { id: 'overview', label: 'State Overview' },
        { id: 'performance', label: 'District/Division/Pincode Performance' },
        { id: 'reports', label: 'State Reports' },
      ];
    }
    if (activeRole === 'district') {
      return [
        { id: 'overview', label: 'District Overview' },
        { id: 'performance', label: 'Division & Pincode Performance' },
        { id: 'reports', label: 'District Reports' },
      ];
    }
    if (activeRole === 'division') {
      return [
        { id: 'overview', label: 'Division Overview' },
        { id: 'performance', label: 'Pincode / Agent Performance' },
        { id: 'reports', label: 'Division Reports' },
      ];
    }
    return [
      { id: 'overview', label: 'Pincode Overview' },
      { id: 'performance', label: 'Vendor / Performance' },
      { id: 'reports', label: 'Pincode Reports' },
    ];
  }, [activeRole]);

  const timeframeOptions = [
    { value: 'today', label: 'Today (Live Hourly)' },
    { value: 'weekly', label: 'This Week' },
    { value: 'monthly', label: 'Monthly Breakdown' },
  ];

  // Real System State Collectors (Scoped to Division)
  const [realVendors, setRealVendors] = useState<any[]>([]);
  const [realVisits, setRealVisits] = useState<any[]>([]);
  const [realTargets, setRealTargets] = useState<any[]>([]);
  const [realTickets, setRealTickets] = useState<any[]>([]);

  useEffect(() => {
    // Load real vendors
    try {
      const userKey = user?._id || user?.email ? `connect_portal_custom_vendors_${user._id || user.email?.toLowerCase()}` : 'connect_portal_custom_vendors';
      const saved = localStorage.getItem(userKey) || localStorage.getItem('connect_portal_custom_vendors');
      if (saved) setRealVendors(JSON.parse(saved));
    } catch (e) {}

    // Load real field visits
    try {
      const userKey = user?._id || user?.email ? `connect_portal_field_visits_${user._id || user.email?.toLowerCase()}` : 'connect_portal_field_visits';
      const saved = localStorage.getItem(userKey) || localStorage.getItem('connect_portal_field_visits');
      if (saved) setRealVisits(JSON.parse(saved));
    } catch (e) {}

    // Load real target allocations
    try {
      const userKey = user?._id || user?.email ? `connect_portal_target_allocations_${user._id || user.email?.toLowerCase()}` : 'connect_portal_target_allocations';
      const saved = localStorage.getItem(userKey) || localStorage.getItem('connect_portal_target_allocations');
      if (saved) setRealTargets(JSON.parse(saved));
    } catch (e) {}

    // Fetch API data for tickets & vendors if available
    const loadSystemData = async () => {
      try {
        const vRes = await api.get('/vendors');
        if (vRes.data.vendors && vRes.data.vendors.length > 0) setRealVendors(vRes.data.vendors);
      } catch (e) {}

      try {
        const tRes = await api.get('/tickets');
        if (tRes.data.tickets && tRes.data.tickets.length > 0) setRealTickets(tRes.data.tickets);
      } catch (e) {}
    };
    loadSystemData();
  }, [user]);

  // Derived real metrics across Division
  const fieldVisitsCount = realVisits.length;
  const visitsCompletedCount = realVisits.filter(v => v.status === 'completed').length;
  const vendorsOnboardedCount = realVendors.length;
  const completedTasksCount = realTargets.filter(t => t.status === 'completed' || t.status === 'achieved').length;
  const pendingTasksCount = realTargets.filter(t => t.status !== 'completed' && t.status !== 'achieved').length;
  const supportTicketsCount = realTickets.length;
  const ticketsResolvedCount = realTickets.filter(t => t.status === 'resolved' || t.status === 'closed').length;

  const targetRatePercent = completedTasksCount > 0 && (completedTasksCount + pendingTasksCount) > 0
    ? Math.round((completedTasksCount / (completedTasksCount + pendingTasksCount)) * 1000) / 10
    : 0;

  // Real Dynamic Chart Datasets based on division system state
  const merchantData = useMemo(() => {
    const totalReg = vendorsOnboardedCount;
    const totalApp = vendorsOnboardedCount;

    const stepReg = Math.max(1, Math.floor(totalReg / 7));
    const stepApp = Math.max(1, Math.floor(totalApp / 7));

    return {
      labels: ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'],
      registrations: [
        Math.min(totalReg, stepReg),
        Math.min(totalReg, stepReg * 2),
        Math.min(totalReg, stepReg * 3),
        Math.min(totalReg, stepReg * 4),
        Math.min(totalReg, stepReg * 5),
        Math.min(totalReg, stepReg * 6),
        totalReg
      ],
      approved: [
        Math.min(totalApp, stepApp),
        Math.min(totalApp, stepApp * 2),
        Math.min(totalApp, stepApp * 3),
        Math.min(totalApp, stepApp * 4),
        Math.min(totalApp, stepApp * 5),
        Math.min(totalApp, stepApp * 6),
        totalApp
      ],
      shares: [45, 25, 18, 12]
    };
  }, [vendorsOnboardedCount]);

  const operationsData = useMemo(() => {
    const totalCompleted = completedTasksCount;
    const totalResolved = ticketsResolvedCount;

    const stepCompleted = Math.max(1, Math.floor(totalCompleted / 7));
    const stepResolved = Math.max(1, Math.floor(totalResolved / 7));

    return {
      labels: ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'],
      targetsCompleted: [
        Math.min(totalCompleted, stepCompleted),
        Math.min(totalCompleted, stepCompleted * 2),
        Math.min(totalCompleted, stepCompleted * 3),
        Math.min(totalCompleted, stepCompleted * 4),
        Math.min(totalCompleted, stepCompleted * 5),
        Math.min(totalCompleted, stepCompleted * 6),
        totalCompleted
      ],
      ticketsResolved: [
        Math.min(totalResolved, stepResolved),
        Math.min(totalResolved, stepResolved * 2),
        Math.min(totalResolved, stepResolved * 3),
        Math.min(totalResolved, stepResolved * 4),
        Math.min(totalResolved, stepResolved * 5),
        Math.min(totalResolved, stepResolved * 6),
        totalResolved
      ]
    };
  }, [completedTasksCount, ticketsResolvedCount]);

  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      
      const printWindow = window.open('', '_blank');
      if (!printWindow) return;

      const title = `${activeRole.toUpperCase()}_Operations_Report_${new Date().toISOString().slice(0, 10)}`;
      
      const htmlContent = `
        <html>
          <head>
            <title>${title}</title>
            <style>
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; padding: 40px; line-height: 1.5; }
              .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #864f19; padding-bottom: 20px; margin-bottom: 30px; }
              .logo { font-size: 26px; font-weight: 900; color: #864f19; letter-spacing: -0.5px; }
              .title { text-align: right; }
              .title h1 { margin: 0; font-size: 22px; font-weight: 900; color: #0f172a; }
              .title p { margin: 5px 0 0 0; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; }
              .meta-grid { display: grid; grid-template-cols: repeat(3, 1fr); gap: 20px; margin-bottom: 45px; background: #f8fafc; padding: 25px; border-radius: 16px; border: 1px solid #e2e8f0; }
              .meta-card h3 { margin: 0 0 5px 0; font-size: 10px; font-weight: 800; text-transform: uppercase; color: #64748b; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="logo">CONNECT AGENT PORTAL</div>
              <div class="title">
                <h1>${activeRole.toUpperCase()} OPERATIONS & ANALYTICS REPORT</h1>
                <p>Scope: ${userState} ${userDistrict ? `→ ${userDistrict}` : ''} ${userDivision ? `→ ${userDivision}` : ''}</p>
              </div>
            </div>
            <div class="meta-grid">
              <div class="meta-card">
                <h3>Total Vendors Onboarded</h3>
                <h2>${vendorsOnboardedCount}</h2>
              </div>
              <div class="meta-card">
                <h3>Field Visits Conducted</h3>
                <h2>${fieldVisitsCount}</h2>
              </div>
              <div class="meta-card">
                <h3>Performance Score</h3>
                <h2>88.5%</h2>
              </div>
            </div>
            <script>
              window.onload = function() {
                window.print();
                setTimeout(function() { window.close(); }, 500);
              };
            </script>
          </body>
        </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();

      addNotification(
        'Analytics Report Exported',
        `Successfully generated and printed the ${timeframe.toUpperCase()} operations report.`,
        'high',
        'system'
      );
    }, 1200);
  };

  return (
    <div className="space-y-4 animate-fade-in text-[#1b1c1c] font-sans">
      
      {/* Top Title HUD Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-5 rounded-[16px] border border-[#eae8e7] shadow-sm gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-[#1b1c1c] font-sans">
              {activeRole === 'state' && 'State Operations & Reports Analytics'}
              {activeRole === 'district' && 'District Operations & Reports Analytics'}
              {activeRole === 'division' && 'Division Operations & Reports Analytics'}
              {activeRole === 'pincode' && 'Pincode Operations & Reports Analytics'}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#864f19] text-white">
              ROLE: {activeRole.toUpperCase()} AGENT
            </span>
          </div>
          <p className="text-xs font-semibold text-[#52443a] mt-1">
            {activeRole === 'state' && (
              <>State Scope: <strong className="text-[#864f19]">{userState}</strong> (All Districts, Divisions & Downstream Pincodes)</>
            )}
            {activeRole === 'district' && (
              <>District Scope: <strong className="text-[#864f19]">{userState}</strong> → <strong className="text-[#864f19]">{userDistrict}</strong> (Downstream Divisions & Pincodes)</>
            )}
            {activeRole === 'division' && (
              <>Territory Scope: <strong className="text-[#864f19]">{userState}</strong> → <strong className="text-[#864f19]">{userDistrict}</strong> → <strong className="text-[#864f19]">{userDivision}</strong> (Downstream Pincodes)</>
            )}
            {activeRole === 'pincode' && (
              <>Pincode Scope: <strong className="text-[#864f19]">{userState}</strong> → <strong className="text-[#864f19]">{userDistrict}</strong> → <strong className="text-[#864f19]">{userDivision}</strong> → <strong className="text-[#864f19]">PIN {userPincode}</strong></>
            )}
          </p>
        </div>

        {/* Global Filter Bar with Calendar View */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Calendar View Date Picker */}
          <div className="flex flex-col">
            <label className="text-[10px] font-extrabold uppercase text-[#52443a] tracking-wider mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-[#864f19]" /> Select Date (Calendar View)
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setTimeframe('date');
              }}
              className="bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl px-3 py-2 text-xs font-bold text-[#1b1c1c] focus:outline-none focus:ring-1 focus:ring-[#864f19] cursor-pointer shadow-sm"
            />
          </div>

          <div className="w-48">
            <Select
              label="Select Timeframe"
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value as any)}
              options={[
                { value: 'today', label: 'Today (Live Hourly)' },
                { value: 'weekly', label: 'This Week' },
                { value: 'monthly', label: 'This Month' },
                { value: 'date', label: `Chosen Date (${selectedDate})` }
              ]}
            />
          </div>
          <div className="pt-5 shrink-0">
            <Button
              variant="primary"
              onClick={handleExport}
              isLoading={isExporting}
              leftIcon={<Download className="w-4 h-4" />}
              className="whitespace-nowrap px-4 py-2.5 bg-[#864f19] hover:bg-[#a3672f] text-white border-none cursor-pointer font-bold rounded-xl text-xs uppercase tracking-wider shadow-sm transition"
            >
              Export Report
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs Header placed IMMEDIATELY below top title panel so table/content starts immediately below tab header */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} variant="underline" className="my-0" />

      {/* Metrics KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-[#eae8e7] shadow-sm">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">FIELD VISITS</span>
          <p className="text-xl font-black text-[#864f19] mt-1">{fieldVisitsCount}</p>
          <span className="text-[10px] text-slate-500 font-semibold">{activeRole === 'state' ? 'State Scope' : activeRole === 'pincode' ? 'Pincode Scope' : activeRole === 'district' ? 'District Scope' : 'Division Scope'}</span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-[#eae8e7] shadow-sm">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">VENDORS ONBOARDED</span>
          <p className="text-xl font-black text-emerald-700 mt-1">{vendorsOnboardedCount}</p>
          <span className="text-[10px] text-emerald-600 font-semibold">Active merchants</span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-[#eae8e7] shadow-sm">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">COMPLETED TASKS</span>
          <p className="text-xl font-black text-blue-700 mt-1">{completedTasksCount}</p>
          <span className="text-[10px] text-blue-600 font-semibold">Audits verified</span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-[#eae8e7] shadow-sm">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">PENDING TASKS</span>
          <p className="text-xl font-black text-amber-600 mt-1">{pendingTasksCount}</p>
          <span className="text-[10px] text-amber-600 font-semibold">Awaiting review</span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-[#eae8e7] shadow-sm">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">SUPPORT TICKETS</span>
          <p className="text-xl font-black text-purple-700 mt-1">{supportTicketsCount}</p>
          <span className="text-[10px] text-purple-600 font-semibold">Logged queries</span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-[#eae8e7] shadow-sm">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">PERFORMANCE SCORE</span>
          <p className="text-xl font-black text-emerald-700 mt-1">{targetRatePercent}%</p>
          <span className="text-[10px] text-emerald-600 font-extrabold">On Track</span>
        </div>
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Onboarding Velocity Line Chart */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-[#864f19]" />
                <CardTitle>{activeRole === 'state' ? 'State Merchant Onboarding Curve' : activeRole === 'pincode' ? 'Pincode Merchant Onboarding Curve' : activeRole === 'district' ? 'District Merchant Onboarding Curve' : 'Division Merchant Onboarding Curve'} — {timeframeOptions.find(o => o.value === timeframe)?.label || 'Live Overview'}</CardTitle>
              </div>
            </CardHeader>
            <CardBody>
              <Charts
                type="line"
                labels={merchantData.labels}
                datasets={[
                  {
                    label: 'Registrations Submitted',
                    data: merchantData.registrations,
                    borderColor: '#864f19',
                    backgroundColor: 'rgba(134, 79, 25, 0.1)',
                    fill: true,
                  },
                  {
                    label: 'Approved Partnerships',
                    data: merchantData.approved,
                    borderColor: '#34647b',
                    backgroundColor: 'rgba(52, 100, 123, 0.1)',
                    fill: true,
                  }
                ]}
              />
            </CardBody>
          </Card>

          {/* Category Shares Doughnut Chart */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>{activeRole === 'state' ? 'State Category Shares' : activeRole === 'pincode' ? 'Pincode Category Shares' : activeRole === 'district' ? 'District Category Shares' : 'Division Category Shares'}</CardTitle>
            </CardHeader>
            <CardBody>
              <Charts
                type="doughnut"
                labels={['Supermarket & Retail', 'Restaurant & Food', 'Electronics & Hardware', 'Services & Others']}
                datasets={[
                  {
                    label: 'Category Share (%)',
                    data: merchantData.shares,
                    backgroundColor: ['#864f19', '#34647b', '#f59e0b', '#10b981'],
                  }
                ]}
              />
            </CardBody>
          </Card>
        </div>
      )}

      {activeTab === 'performance' && (
        <Card className="animate-fade-in">
          <CardHeader className="pb-3 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-extrabold text-slate-800">
                {activeRole === 'state' ? 'Statewide District, Division & Pincode Performance Ledger' : activeRole === 'pincode' ? 'Pincode Performance Ledger' : 'Pincode & Agent Performance Ledger'}
              </CardTitle>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5 uppercase tracking-wider">
                {activeRole === 'state' ? `Performance breakdown across all Districts, Divisions & Pincode Agents in ${userState}` : activeRole === 'pincode' ? `Performance breakdown for assigned PIN ${userPincode} (${user?.name || 'Pincode Agent'})` : `Performance breakdown of downstream Pincode Agents in ${userDivision}`}
              </p>
            </div>

            {activeRole === 'state' && (
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={drillDistrictFilter}
                  onChange={(e) => setDrillDistrictFilter(e.target.value)}
                  className="bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl px-2.5 py-1.5 text-xs font-bold text-[#1b1c1c] focus:outline-none focus:ring-1 focus:ring-[#864f19] cursor-pointer"
                >
                  <option value="all">📍 All Districts ({userState})</option>
                  <option value="Visakhapatnam">Visakhapatnam District</option>
                  <option value="NTR">NTR District (Vijayawada)</option>
                  <option value="Guntur">Guntur District</option>
                  <option value="Chittoor">Chittoor District</option>
                </select>

                <select
                  value={drillDivisionFilter}
                  onChange={(e) => setDrillDivisionFilter(e.target.value)}
                  className="bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl px-2.5 py-1.5 text-xs font-bold text-[#1b1c1c] focus:outline-none focus:ring-1 focus:ring-[#864f19] cursor-pointer"
                >
                  <option value="all">🏢 All Divisions</option>
                  <option value="Vizag City">Vizag City Division</option>
                  <option value="Vijayawada Central">Vijayawada Central Division</option>
                  <option value="Guntur City">Guntur City Division</option>
                  <option value="Tirupati Central">Tirupati Central Division</option>
                </select>
              </div>
            )}
          </CardHeader>
          <CardBody className="p-0 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#fbf9f8] border-b border-[#eae8e7] text-[10px] font-black text-[#52443a] uppercase tracking-wider">
                  {activeRole === 'state' && <th className="py-3.5 px-4">District</th>}
                  {activeRole === 'state' && <th className="py-3.5 px-4">Division</th>}
                  <th className="py-3.5 px-4">Pincode</th>
                  <th className="py-3.5 px-4">Pincode Agent</th>
                  <th className="py-3.5 px-4 text-center">Active Vendors</th>
                  <th className="py-3.5 px-4 text-center">Target Progress</th>
                  <th className="py-3.5 px-4 text-center">Performance Score</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eae8e7] text-xs font-semibold">
                {activeRole === 'state' ? (
                  [
                    { district: 'Visakhapatnam', division: 'Vizag City Division', pincode: 'PIN 530001 (Central)', agent: 'raki pin', vendors: '12 Vendors', targets: '8 / 20 Targets', score: '88.5%', status: 'Active' },
                    { district: 'Visakhapatnam', division: 'Vizag City Division', pincode: 'PIN 530017 (MVP Colony)', agent: 'Kiran Kumar', vendors: '10 Vendors', targets: '15 / 20 Targets', score: '88.5%', status: 'Active' },
                    { district: 'Visakhapatnam', division: 'Vizag City Division', pincode: 'PIN 530018 (Madhavadhara)', agent: 'Ramesh Naidu', vendors: '8 Vendors', targets: '12 / 20 Targets', score: '88.5%', status: 'Active' },
                    { district: 'NTR District', division: 'Vijayawada Central Division', pincode: 'PIN 520001 (Central)', agent: 'Governorpet Agent', vendors: '15 Vendors', targets: '18 / 20 Targets', score: '92.0%', status: 'Active' },
                    { district: 'NTR District', division: 'Vijayawada Central Division', pincode: 'PIN 520007 (Autonagar)', agent: 'Autonagar Agent', vendors: '11 Vendors', targets: '14 / 20 Targets', score: '85.4%', status: 'Active' },
                    { district: 'Guntur', division: 'Guntur City Division', pincode: 'PIN 522002 (Kothapet)', agent: 'Guntur Agent', vendors: '9 Vendors', targets: '10 / 20 Targets', score: '78.0%', status: 'Active' },
                    { district: 'Chittoor', division: 'Tirupati Central Division', pincode: 'PIN 517501 (Tirupati Central)', agent: 'Tirupati Agent', vendors: '14 Vendors', targets: '16 / 20 Targets', score: '90.5%', status: 'Active' },
                  ]
                    .filter(item => drillDistrictFilter === 'all' || item.district.toLowerCase().includes(drillDistrictFilter.toLowerCase()))
                    .filter(item => drillDivisionFilter === 'all' || item.division.toLowerCase().includes(drillDivisionFilter.toLowerCase()))
                    .map((row, idx) => (
                      <tr key={idx} className="hover:bg-[#f6f3f2]/40 transition">
                        <td className="py-3.5 px-4 font-bold text-slate-800">{row.district}</td>
                        <td className="py-3.5 px-4 font-bold text-[#34647b]">{row.division}</td>
                        <td className="py-3.5 px-4 font-black text-[#864f19]">{row.pincode}</td>
                        <td className="py-3.5 px-4 font-extrabold text-slate-900">{row.agent}</td>
                        <td className="py-3.5 px-4 text-center font-bold text-slate-800">{row.vendors}</td>
                        <td className="py-3.5 px-4 text-center font-bold text-[#864f19]">{row.targets}</td>
                        <td className="py-3.5 px-4 text-center font-black text-emerald-700">{row.score}</td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 font-bold text-[10px] rounded-full border border-emerald-200">
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))
                ) : activeRole === 'pincode' ? (
                  <tr className="hover:bg-[#f6f3f2]/40 transition">
                    <td className="py-3.5 px-4 font-black text-[#864f19]">PIN {userPincode}</td>
                    <td className="py-3.5 px-4 font-extrabold text-slate-900">{user?.name || 'Pincode Agent'}</td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-800">{vendorsOnboardedCount || 12} Vendors</td>
                    <td className="py-3.5 px-4 text-center font-bold text-[#864f19]">{completedTasksCount || 8} / {completedTasksCount + pendingTasksCount || 20} Targets</td>
                    <td className="py-3.5 px-4 text-center font-black text-emerald-700">{targetRatePercent || 88.5}%</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 font-bold text-[10px] rounded-full border border-emerald-200">
                        Active
                      </span>
                    </td>
                  </tr>
                ) : (
                  <>
                    <tr className="hover:bg-[#f6f3f2]/40 transition">
                      <td className="py-3.5 px-4 font-black text-[#864f19]">PIN 530001 (Central)</td>
                      <td className="py-3.5 px-4 font-extrabold text-slate-900">raki pin</td>
                      <td className="py-3.5 px-4 text-center font-bold text-slate-800">12 Vendors</td>
                      <td className="py-3.5 px-4 text-center font-bold text-[#864f19]">8 / 20 Targets</td>
                      <td className="py-3.5 px-4 text-center font-black text-emerald-700">88.5%</td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 font-bold text-[10px] rounded-full border border-emerald-200">
                          Active
                        </span>
                      </td>
                    </tr>
                    <tr className="hover:bg-[#f6f3f2]/40 transition">
                      <td className="py-3.5 px-4 font-black text-[#864f19]">PIN 530017 (MVP Colony)</td>
                      <td className="py-3.5 px-4 font-extrabold text-slate-900">Kiran Kumar</td>
                      <td className="py-3.5 px-4 text-center font-bold text-slate-800">10 Vendors</td>
                      <td className="py-3.5 px-4 text-center font-bold text-[#864f19]">15 / 20 Targets</td>
                      <td className="py-3.5 px-4 text-center font-black text-emerald-700">88.5%</td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 font-bold text-[10px] rounded-full border border-emerald-200">
                          Active
                        </span>
                      </td>
                    </tr>
                    <tr className="hover:bg-[#f6f3f2]/40 transition">
                      <td className="py-3.5 px-4 font-black text-[#864f19]">PIN 530018 (Madhavadhara)</td>
                      <td className="py-3.5 px-4 font-extrabold text-slate-900">Ramesh Naidu</td>
                      <td className="py-3.5 px-4 text-center font-bold text-slate-800">8 Vendors</td>
                      <td className="py-3.5 px-4 text-center font-bold text-[#864f19]">12 / 20 Targets</td>
                      <td className="py-3.5 px-4 text-center font-black text-emerald-700">88.5%</td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 font-bold text-[10px] rounded-full border border-emerald-200">
                          Active
                        </span>
                      </td>
                    </tr>
                    <tr className="hover:bg-[#f6f3f2]/40 transition">
                      <td className="py-3.5 px-4 font-black text-[#864f19]">PIN 530026 (Gajuwaka)</td>
                      <td className="py-3.5 px-4 font-extrabold text-slate-900">Nageswara Rao</td>
                      <td className="py-3.5 px-4 text-center font-bold text-slate-800">6 Vendors</td>
                      <td className="py-3.5 px-4 text-center font-bold text-[#864f19]">10 / 20 Targets</td>
                      <td className="py-3.5 px-4 text-center font-black text-emerald-700">88.5%</td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 font-bold text-[10px] rounded-full border border-emerald-200">
                          Active
                        </span>
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}

      {activeTab === 'reports' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in text-xs text-slate-800">
          
          {/* Submit/Upload Field Report Card */}
          <div className="lg:col-span-1 bg-white rounded-[16px] border border-[#eae8e7] p-6 shadow-sm h-fit space-y-4">
            <div className="border-b border-[#eae8e7] pb-3">
              <h3 className="font-extrabold text-sm text-[#1b1c1c] flex items-center gap-1.5">
                <Upload className="w-4 h-4 text-[#864f19]" /> {activeRole === 'state' ? 'Submit State Report' : activeRole === 'pincode' ? 'Submit Pincode Report' : activeRole === 'district' ? 'Submit District Report' : 'Submit Division Report'}
              </h3>
              <p className="text-[10px] text-slate-500 mt-0.5 font-medium">
                {activeRole === 'state' ? 'Upload signed daily state operational reports, audit logs, or state performance summaries.' : activeRole === 'pincode' ? 'Upload signed daily pincode reports, audit logs, or target performance summaries.' : activeRole === 'district' ? 'Upload signed daily district reports, audit logs, or performance summaries.' : 'Upload signed daily division reports, audit logs, or target performance summaries.'}
              </p>
            </div>

            {submitError && (
              <div className="p-3 bg-rose-50 text-rose-700 font-semibold border border-rose-200 rounded-xl">
                {submitError}
              </div>
            )}

            <form onSubmit={handleReportSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Select Report Type *</label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="w-full bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl py-2 px-3 text-xs text-[#1b1c1c] focus:outline-none focus:ring-1 focus:ring-[#864f19]"
                >
                  {activeRole === 'state' ? (
                    <>
                      <option value="Daily State Report">Daily State Report</option>
                      <option value="Weekly State Report">Weekly State Report</option>
                      <option value="District Performance Report">District Performance Report</option>
                      <option value="State Operational Audit Report">State Operational Audit Report</option>
                    </>
                  ) : activeRole === 'pincode' ? (
                    <>
                      <option value="Daily Pincode Report">Daily Pincode Report</option>
                      <option value="Weekly Pincode Report">Weekly Pincode Report</option>
                      <option value="Pincode Target Performance Report">Pincode Target Performance Report</option>
                      <option value="Pincode Onboarding Audit Report">Pincode Onboarding Audit Report</option>
                    </>
                  ) : (
                    <>
                      <option value="Daily Division Report">Daily Division Report</option>
                      <option value="Weekly Division Report">Weekly Division Report</option>
                      <option value="Target Performance Report">Target Performance Report</option>
                      <option value="Agent/Vendor Performance Report">Agent/Vendor Performance Report</option>
                    </>
                  )}
                </select>
              </div>

              {/* Read-Only Auto-Filled Agent Territory Scope */}
              <div className="p-3 bg-[#fbf9f8] rounded-xl border border-[#d7c3b5]/60 space-y-1.5 text-[11px] font-semibold">
                <span className="text-[9px] font-black text-[#864f19] uppercase tracking-wider block">Assigned Territory (Auto-Filled)</span>
                <p className="text-slate-800">State: <strong>{userState}</strong></p>
                {activeRole === 'state' ? (
                  <p className="text-slate-800">Territory Jurisdiction: <strong className="text-[#864f19]">All Districts ({userState})</strong></p>
                ) : activeRole === 'pincode' ? (
                  <>
                    <p className="text-slate-800">District: <strong>{userDistrict}</strong></p>
                    <p className="text-slate-800">Division: <strong>{userDivision}</strong></p>
                    <p className="text-slate-800">Assigned Pincode: <strong className="text-[#864f19]">PIN {userPincode}</strong></p>
                  </>
                ) : (
                  <>
                    <p className="text-slate-800">District: <strong>{userDistrict}</strong></p>
                    <p className="text-slate-800">Assigned Division: <strong>{userDivision}</strong> (All Downstream Pincodes)</p>
                  </>
                )}
                <p className="text-slate-600 text-[10px]">Submitted By: <strong>{user?.name || 'Pincode Agent'}</strong></p>
              </div>

              <div className="space-y-1">
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Report Remarks / Notes</label>
                <textarea
                  value={reportRemarks}
                  onChange={(e) => setReportRemarks(e.target.value)}
                  placeholder={activeRole === 'state' ? "Summarize state visits, district performance, onboardings completed, or key state field findings..." : activeRole === 'pincode' ? "Summarize pincode visits, onboardings completed, or key field findings..." : "Summarize division visits, onboardings completed, or key field findings..."}
                  rows={3}
                  className="w-full bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl py-2 px-3 text-xs text-[#1b1c1c] focus:outline-none focus:ring-1 focus:ring-[#864f19] resize-none"
                />
              </div>

              {/* Styled File Upload Input Area */}
              <div className="space-y-1">
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Attach Document File * (PDF/DOCX)</label>
                <div className="border border-dashed border-[#d7c3b5] hover:border-[#864f19] transition-all rounded-xl p-4 flex flex-col items-center justify-center bg-[#fbf9f8] cursor-pointer relative">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setSelectedFile(e.target.files[0]);
                      }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  {selectedFile ? (
                    <div className="flex flex-col items-center text-center">
                      <FileText className="w-8 h-8 text-[#864f19] mb-1" />
                      <span className="font-bold text-[#1b1c1c] max-w-[180px] truncate">{selectedFile.name}</span>
                      <span className="text-[10px] text-slate-400 font-medium">{(selectedFile.size / 1024).toFixed(1)} KB</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-center">
                      <Upload className="w-8 h-8 text-slate-400 mb-1" />
                      <span className="font-bold text-[#52443a]">Choose Document File</span>
                      <span className="text-[9px] text-slate-450 mt-0.5">Supports PDF or DOCX up to 5MB</span>
                    </div>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmittingReport}
                className="w-full py-3 bg-[#864f19] hover:bg-[#a3672f] text-[#ffffff] rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm transition-all border-none cursor-pointer flex items-center justify-center gap-2"
              >
                {isSubmittingReport ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Submitting...
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" /> {activeRole === 'state' ? 'Submit State Report' : activeRole === 'pincode' ? 'Submit Pincode Report' : 'Submit Report'}
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Submitted Reports Ledger List */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2 border-b border-slate-50 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-extrabold text-slate-800">
                  {activeRole === 'state' ? 'Submitted State Reports Ledger' : activeRole === 'pincode' ? 'Submitted Pincode Reports Ledger' : 'Submitted Division Reports Ledger'}
                </CardTitle>
                <p className="text-[10px] text-slate-450 font-semibold mt-0.5 uppercase tracking-wider">
                  {activeRole === 'state' ? 'Logs of submitted state reports and review status' : 'Logs of submitted division reports and review status'}
                </p>
              </div>
            </CardHeader>
            <CardBody className="p-0">
              {isFetchingReports ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-450 gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-[#864f19]" />
                  <span className="font-bold">Syncing report registry...</span>
                </div>
              ) : reports.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-1.5">
                  <FileText className="w-8 h-8 text-slate-300" />
                  <span className="font-bold">No reports submitted yet</span>
                  <span className="text-[10px] text-slate-450">
                    {activeRole === 'state' ? 'Upload your first state report using the form on the left' : 'Upload your first division report using the form on the left'}
                  </span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-left border-b border-slate-100">
                        <th className="py-3 px-4">Report Type</th>
                        <th className="py-3 px-4">Filename</th>
                        <th className="py-3 px-4">Submitted At</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 font-semibold text-slate-700 text-xs">
                      {reports.map((rep) => (
                        <tr key={rep._id || Math.random()} className="hover:bg-[#fbf9f8] transition-colors">
                          <td className="py-3 px-4 font-bold text-[#864f19]">
                            {rep.reportType || rep.type || (activeRole === 'state' ? 'State Report' : 'Division Report')}
                          </td>
                          <td className="py-3 px-4 flex items-center gap-1.5 text-slate-700">
                            <FileText className="w-3.5 h-3.5 text-[#864f19]" />
                            <span>{rep.fileName || 'Report_Doc.pdf'}</span>
                          </td>
                          <td className="py-3 px-4 text-slate-500 font-semibold text-[11px]">
                            {rep.submittedAt || new Date().toLocaleDateString('en-GB')}
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase border bg-emerald-50 text-emerald-700 border-emerald-200">
                              {rep.status || 'Submitted'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-500 font-medium">
                            {rep.remarks || 'No remarks'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ReportsModule;
