import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardBody, Tabs, Select, Button, Charts, Input } from '../../components/ui';
import { BarChart3, TrendingUp, Download, CheckCircle2, Ticket, Users, Upload, FileText, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

export const ReportsModule: React.FC = () => {
  const { addNotification } = useAuth();
  const [activeTab, setActiveTab] = useState('merchants');
  const [timeframe, setTimeframe] = useState('monthly');
  const [isExporting, setIsExporting] = useState(false);

  const [reports, setReports] = useState<any[]>([]);
  const [isFetchingReports, setIsFetchingReports] = useState(false);
  const [reportMonth, setReportMonth] = useState('June');
  const [reportYear, setReportYear] = useState('2026');
  const [reportRemarks, setReportRemarks] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const fetchSubmittedReports = async () => {
    setIsFetchingReports(true);
    try {
      const response = await api.get('/reports');
      setReports(response.data.reports || []);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setIsFetchingReports(false);
    }
  };

  useEffect(() => {
    fetchSubmittedReports();
  }, []);

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setSubmitError('Please select a report file to upload.');
      return;
    }
    setIsSubmittingReport(true);
    setSubmitError('');
    try {
      await api.post('/reports', {
        type: 'monthly',
        content: {
          fileName: selectedFile.name,
          fileSize: `${(selectedFile.size / 1024).toFixed(1)} KB`,
          month: reportMonth,
          year: reportYear
        },
        remarks: reportRemarks
      });
      addNotification(
        'Monthly Report Submitted',
        `Successfully submitted operations summary report for ${reportMonth} ${reportYear}.`,
        'medium',
        'system'
      );
      setReportRemarks('');
      setSelectedFile(null);
      fetchSubmittedReports();
    } catch (err: any) {
      console.error(err);
      setSubmitError('Failed to submit monthly report to the server.');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const tabs = [
    { id: 'merchants', label: 'Merchant Onboarding' },
    { id: 'operations', label: 'Operations & Tickets' },
    { id: 'submissions', label: 'Report Submissions' },
  ];

  const timeframeOptions = [
    { value: 'today', label: 'Today (Live Hourly)' },
    { value: 'weekly', label: 'Weekly Overview' },
    { value: 'monthly', label: 'Monthly Breakdown' },
  ];

  // Dynamic datasets based on timeframe selection (Agent Portal merchant growth)
  const merchantData = {
    today: {
      labels: ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'],
      registrations: [2, 4, 8, 12, 18, 22, 26],
      approved: [1, 3, 6, 9, 14, 18, 22],
      shares: [50, 20, 20, 10], // Category shares
    },
    weekly: {
      labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6', 'Week 7'],
      registrations: [15, 28, 42, 59, 78, 92, 110],
      approved: [12, 22, 35, 48, 64, 80, 95],
      shares: [45, 25, 20, 10],
    },
    monthly: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
      registrations: [80, 150, 220, 310, 420, 560, 680],
      approved: [70, 130, 190, 270, 370, 500, 610],
      shares: [40, 30, 20, 10],
    },
  }[timeframe as 'today' | 'weekly' | 'monthly'] || {
    labels: [],
    registrations: [],
    approved: [],
    shares: [25, 25, 25, 25],
  };

  const operationsData = {
    today: {
      labels: ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'],
      targetsCompleted: [3, 8, 15, 24, 32, 40, 45],
      ticketsResolved: [2, 5, 9, 14, 18, 22, 25],
    },
    weekly: {
      labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6', 'Week 7'],
      targetsCompleted: [25, 42, 60, 78, 95, 112, 130],
      ticketsResolved: [18, 30, 45, 58, 72, 85, 98],
    },
    monthly: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
      targetsCompleted: [120, 210, 320, 440, 580, 720, 850],
      ticketsResolved: [95, 160, 240, 330, 450, 560, 670],
    },
  }[timeframe as 'today' | 'weekly' | 'monthly'] || {
    labels: [],
    targetsCompleted: [],
    ticketsResolved: [],
  };

  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      
      const printWindow = window.open('', '_blank');
      if (!printWindow) return;

      const title = `ConnectPortal_${timeframe.toUpperCase()}_Report_${new Date().toISOString().slice(0, 10)}`;
      const isMerchants = activeTab === 'merchants';
      
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
              .meta-card p { margin: 0; font-size: 15px; font-weight: 700; color: #0f172a; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 35px; }
              th, td { padding: 14px 18px; text-align: left; font-size: 12px; }
              th { background: #f1f5f9; color: #475569; font-weight: 800; text-transform: uppercase; border-bottom: 2px solid #cbd5e1; }
              td { border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #334155; }
              .total-row { font-weight: 800; background: #f8fafc; }
              .total-row td { border-top: 2px solid #cbd5e1; color: #0f172a; font-weight: 800; }
              .footer { text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 25px; margin-top: 60px; line-height: 1.6; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="logo">ConnectPortal</div>
              <div class="title">
                <h1>Operations Summary Report</h1>
                <p>${timeframe} overview • Generated on ${new Date().toLocaleDateString()}</p>
              </div>
            </div>
            
            <div class="meta-grid">
              <div class="meta-card">
                <h3>State Jurisdiction</h3>
                <p>Tamil Nadu Sector</p>
              </div>
              <div class="meta-card">
                <h3>Report Segment</h3>
                <p>${isMerchants ? 'Merchant Onboarding' : 'Operations & Ticket Audits'}</p>
              </div>
              <div class="meta-card">
                <h3>Fulfillment Score</h3>
                <p>${isMerchants ? '95.6% Onboarded' : '92.4% Target Efficiency'}</p>
              </div>
            </div>

            <h2>${isMerchants ? 'Merchant Growth Logs' : 'Fulfillment Summary'}</h2>
            <table>
              <thead>
                <tr>
                  <th>Timeframe Interval</th>
                  ${isMerchants ? '<th>Registrations Submitted</th><th>Approved Partners</th><th>Target Conversion Rate</th>' : '<th>Targets Completed</th><th>Support Tickets Resolved</th><th>Resolution Rate</th>'}
                </tr>
              </thead>
              <tbody>
                ${(isMerchants ? merchantData.labels : operationsData.labels).map((label, idx) => `
                  <tr>
                    <td><strong>${label}</strong></td>
                    ${isMerchants ? `
                      <td>${merchantData.registrations[idx] || 0}</td>
                      <td>${merchantData.approved[idx] || 0}</td>
                      <td>${Math.round(((merchantData.approved[idx] || 0) / (merchantData.registrations[idx] || 1)) * 100)}%</td>
                    ` : `
                      <td>${operationsData.targetsCompleted[idx] || 0}</td>
                      <td>${operationsData.ticketsResolved[idx] || 0}</td>
                      <td>${Math.round(((operationsData.ticketsResolved[idx] || 0) / (operationsData.targetsCompleted[idx] || 1)) * 100)}%</td>
                    `}
                  </tr>
                `).join('')}
                <tr class="total-row">
                  <td>Total Sum</td>
                  ${isMerchants ? `
                    <td>${merchantData.registrations.reduce((a, b) => a + b, 0)}</td>
                    <td>${merchantData.approved.reduce((a, b) => a + b, 0)}</td>
                    <td>${Math.round((merchantData.approved.reduce((a, b) => a + b, 0) / merchantData.registrations.reduce((a, b) => a + b, 1)) * 100)}%</td>
                  ` : `
                    <td>${operationsData.targetsCompleted.reduce((a, b) => a + b, 0)}</td>
                    <td>${operationsData.ticketsResolved.reduce((a, b) => a + b, 0)}</td>
                    <td>${Math.round((operationsData.ticketsResolved.reduce((a, b) => a + b, 0) / operationsData.targetsCompleted.reduce((a, b) => a + b, 1)) * 100)}%</td>
                  `}
                </tr>
              </tbody>
            </table>

            <div class="footer">
              This is a system generated operations audit summary sheet from ConnectPortal.<br/>
              © ${new Date().getFullYear()} ConnectPortal Logistics Network. Confidential.
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
    <div className="space-y-6 animate-fade-in text-[#1b1c1c] font-sans">
      
      {/* Top Title HUD Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-[16px] border border-[#eae8e7] shadow-sm gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#1b1c1c] font-sans">
            Merchant Operations Analytics
          </h1>
          <p className="text-xs font-semibold text-[#52443a] mt-1 uppercase tracking-wider">
            Visualize merchant onboarding velocity, category distributions, and target completion stats
          </p>
        </div>

        {/* Global Filter Bar */}
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <div className="w-52">
            <Select
              label="Select Timeframe"
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              options={timeframeOptions}
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

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} variant="underline" className="mb-4" />

      {activeTab === 'merchants' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Onboarding Velocity Line Chart */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-[#864f19]" />
                <CardTitle>Merchant Onboarding Curve — {timeframeOptions.find(o => o.value === timeframe)?.label}</CardTitle>
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

          {/* Breakdown summary */}
          <Card className="lg:col-span-1 flex flex-col justify-between">
            <CardHeader>
              <CardTitle>Category Shares</CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              <Charts
                type="doughnut"
                labels={['Retail Shop', 'Local Distributor', 'Wholesale Merchant', 'Franchise Retailer']}
                datasets={[
                  {
                    label: 'Merchant Share (%)',
                    data: merchantData.shares,
                    backgroundColor: ['#864f19', '#34647b', '#ffdcc2', '#efe1ca'],
                  }
                ]}
                className="h-[220px]"
              />
            </CardBody>
          </Card>
        </div>
      )}

      {activeTab === 'operations' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          {/* Operations Bar Chart */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <BarChart3 className="w-5 h-5 text-[#864f19]" />
                <CardTitle>Fulfillment Logs — {timeframeOptions.find(o => o.value === timeframe)?.label}</CardTitle>
              </div>
            </CardHeader>
            <CardBody>
              <Charts
                type="bar"
                labels={operationsData.labels}
                datasets={[
                  {
                    label: 'Target Assignments Completed',
                    data: operationsData.targetsCompleted,
                    backgroundColor: '#864f19',
                  },
                  {
                    label: 'Support Tickets Resolved',
                    data: operationsData.ticketsResolved,
                    backgroundColor: '#34647b',
                  }
                ]}
              />
            </CardBody>
          </Card>

          {/* Satisfaction Indexes */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Merchant Trust Ratings</CardTitle>
            </CardHeader>
            <CardBody className="space-y-3 text-xs font-semibold">
              <div className="p-3 bg-[#fbf9f8] rounded-xl border border-[#eae8e7] flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#864f19]" />
                  <span>Agent Onboarding Rating</span>
                </div>
                <span className="text-[#864f19] font-extrabold">4.89 / 5.0</span>
              </div>
              <div className="p-3 bg-[#fbf9f8] rounded-xl border border-[#eae8e7] flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#34647b]" />
                  <span>Target Completion Efficiency</span>
                </div>
                <span className="text-[#34647b] font-extrabold">92.4%</span>
              </div>
              <div className="p-3 bg-[#fbf9f8] rounded-xl border border-[#eae8e7] flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Ticket className="w-4 h-4 text-red-700" />
                  <span>Ticket Resolution Speed</span>
                </div>
                <span className="text-red-700 font-extrabold">14 mins Avg</span>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {activeTab === 'submissions' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in text-xs text-slate-800">
          
          {/* Submit/Upload Monthly Report Card */}
          <div className="lg:col-span-1 bg-white rounded-[16px] border border-[#eae8e7] p-6 shadow-sm h-fit space-y-4">
            <div className="border-b border-[#eae8e7] pb-3">
              <h3 className="font-extrabold text-sm text-[#1b1c1c] flex items-center gap-1.5">
                <Upload className="w-4 h-4 text-[#864f19]" /> Upload Monthly Summary
              </h3>
              <p className="text-[10px] text-slate-500 mt-0.5 font-medium">Submit your signed territory audit sheets and vendor registration counts.</p>
            </div>

            {submitError && (
              <div className="p-3 bg-red-50 text-red-700 font-semibold border border-red-200 rounded-xl">
                {submitError}
              </div>
            )}

            <form onSubmit={handleReportSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Target Month</label>
                  <select
                    value={reportMonth}
                    onChange={(e) => setReportMonth(e.target.value)}
                    className="w-full bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl py-2 px-3 text-xs text-[#1b1c1c] focus:outline-none focus:ring-1 focus:ring-[#864f19]"
                  >
                    {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Report Year</label>
                  <select
                    value={reportYear}
                    onChange={(e) => setReportYear(e.target.value)}
                    className="w-full bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl py-2 px-3 text-xs text-[#1b1c1c] focus:outline-none focus:ring-1 focus:ring-[#864f19]"
                  >
                    {['2025', '2026', '2027'].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Remarks / Summary Details</label>
                <textarea
                  value={reportRemarks}
                  onChange={(e) => setReportRemarks(e.target.value)}
                  placeholder="Summarize key metrics, approvals, or operational hurdles..."
                  rows={3}
                  className="w-full bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl py-2 px-3 text-xs text-[#1b1c1c] focus:outline-none focus:ring-1 focus:ring-[#864f19] resize-none"
                />
              </div>

              {/* Styled File Upload Input Area */}
              <div className="space-y-1">
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Attach PDF Document *</label>
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
                      <span className="text-[9px] text-slate-450 mt-0.5">Supports PDF or DOC up to 5MB</span>
                    </div>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmittingReport}
                className="w-full py-3 bg-[#864f19] hover:bg-[#a3672f] text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm transition-all border-none cursor-pointer flex items-center justify-center gap-2"
              >
                {isSubmittingReport ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Submitting...
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" /> Submit Report
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Submitted Reports Ledger List */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2 border-b border-slate-50 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-extrabold text-slate-800">Submitted Reports Ledger</CardTitle>
                <p className="text-[10px] text-slate-450 font-semibold mt-0.5 uppercase tracking-wider">Logs of submitted monthly audits and approval review history</p>
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
                  <span className="text-[10px] text-slate-450">Select a timeframe to upload your first summary document</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-left border-b border-slate-100">
                        <th className="py-3 px-4">Period</th>
                        <th className="py-3 px-4">Filename</th>
                        <th className="py-3 px-4">Submitted At</th>
                        <th className="py-3 px-4">Review Status</th>
                        <th className="py-3 px-4">Review Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 font-semibold text-slate-700">
                      {reports.map((rep) => {
                        const content = rep.content || {};
                        return (
                          <tr key={rep._id} className="hover:bg-[#fbf9f8] transition-colors">
                            <td className="py-3 px-4 font-bold text-slate-800">
                              {content.month} {content.year}
                            </td>
                            <td className="py-3 px-4 flex items-center gap-1.5 text-slate-650">
                              <FileText className="w-3.5 h-3.5 text-[#864f19]" />
                              <span>{content.fileName}</span>
                            </td>
                            <td className="py-3 px-4 text-slate-450">
                              {new Date(rep.createdAt).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4">
                              <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase border ${
                                rep.reviewedBy 
                                  ? 'bg-green-50 text-green-700 border-green-200' 
                                  : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                              }`}>
                                {rep.reviewedBy ? 'Reviewed' : 'Pending Review'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-500 font-medium">
                              {rep.remarks ? rep.remarks : <span className="text-slate-350 italic">No feedback remarks</span>}
                            </td>
                          </tr>
                        );
                      })}
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
