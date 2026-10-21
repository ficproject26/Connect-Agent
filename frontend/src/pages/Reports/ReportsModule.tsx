import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Store,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  Download,
  FileText,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye,
  Printer,
  ArrowRight,
  Loader2,
  Sparkles,
  AlertCircle,
  Info,
  RefreshCw,
  Volume2,
  ShieldCheck,
  User,
  MapPin,
  Building,
  Phone,
  ExternalLink,
  X,
  FileSpreadsheet,
  ChevronDown,
  Layers,
  Award
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardBody, Button } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import GenerateReportModal from './GenerateReportModal';

// Canonical Categories supported across Connect Platform
const CANONICAL_CATEGORIES = [
  'Services',
  'Products',
  'Daily Needs',
  'Food',
  'Stay',
  'Travel',
  'Jobs'
];

interface FieldShopVisit {
  _id: string;
  shopName: string;
  category: string;
  storefrontPhoto?: string;
  audioVoiceNote?: string;
  voiceNoteUrl?: string;
  interestedStatus: 'YES' | 'NO';
  notInterestedReason?: string;
  remarks?: string;
  visitDate: string;
  createdAt?: string;
  agent?: {
    _id?: string;
    name?: string;
    email?: string;
    role?: string;
    phone?: string;
    registrationId?: string;
    assignedTerritory?: any;
    territory?: any;
  };
  vendor?: {
    _id?: string;
    storeName?: string;
    businessName?: string;
    phone?: string;
    pincode?: string;
    district?: string;
    division?: string;
    state?: string;
    address?: string;
    kycStatus?: string;
    status?: string;
  };
  vendorId?: string;
  isEligibleForResume?: boolean;
  isOnboardingCompleted?: boolean;
  onboardingStatus?: string;
  state?: string;
  district?: string;
  division?: string;
  pincode?: string;
  storeAddress?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  gstStatus?: string;
  bankAccount?: string;
  bankIfsc?: string;
}

interface SubmittedReport {
  _id: string;
  id?: string;
  reportNumber: string;
  reportCode?: string;
  periodLabel: string;
  dateRange?: string;
  startDate?: string;
  endDate?: string;
  summary: {
    totalVisits: number;
    interested: number;
    notInterested: number;
    newTieups: number;
    tasksAssigned?: number;
    tasksCompleted?: number;
    tasksPending?: number;
  };
  shopVisits: any[];
  tasks: any[];
  agentId?: string;
  agentName: string;
  agentRole: string;
  state: string;
  district: string;
  division?: string;
  pincode?: string;
  status: string;
  submittedAt: string;
  createdAt: string;
}

export const ReportsModule: React.FC = () => {
  const { user, addNotification } = useAuth();
  const navigate = useNavigate();

  // 1. Derive Authenticated Agent's Role and Territory Scope
  const rawRole = (user?.role as string) || (user as any)?.level || 'pincode';
  const activeRole = (rawRole === 'agent' ? ((user as any)?.level || 'pincode') : rawRole).toLowerCase();

  const isStateAgent = activeRole.includes('state');
  const isDistrictAgent = activeRole.includes('district');
  const isDivisionAgent = activeRole.includes('division');
  const isPincodeAgent = !isStateAgent && !isDistrictAgent && !isDivisionAgent;

  const roleDisplayName = isStateAgent
    ? 'State Agent'
    : isDistrictAgent
    ? 'District Agent'
    : isDivisionAgent
    ? 'Division Agent'
    : 'Pincode Agent';

  const userTerritory = user?.assignedTerritory || user?.territory || {
    state: (user as any)?.assignedState,
    district: (user as any)?.assignedDistrict,
    division: (user as any)?.assignedDivision,
    pincode: (user as any)?.assignedPincode
  };

  const userState = (
    userTerritory?.state ||
    (user as any)?.assignedState ||
    (user as any)?.state ||
    user?.address?.state ||
    'Tamil Nadu'
  ).trim();

  const userDistrict = (
    userTerritory?.district ||
    (user as any)?.assignedDistrict ||
    (user as any)?.district ||
    ''
  ).trim();

  const userDivision = (
    userTerritory?.division ||
    (user as any)?.assignedDivision ||
    (user as any)?.division ||
    ''
  ).trim();

  const userPincode = (
    userTerritory?.pincode ||
    (user as any)?.assignedPincode ||
    (user as any)?.pincode ||
    ''
  ).trim();

  // Navigation Tabs: View A (Field Shop Visits) vs View B (Team Reports / Report History)
  const [activeTab, setActiveTab] = useState<'visits' | 'team_reports'>('visits');

  // Modal Visibility States
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [selectedVisitAudit, setSelectedVisitAudit] = useState<FieldShopVisit | null>(null);
  const [selectedReportAudit, setSelectedReportAudit] = useState<SubmittedReport | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isCheckingEligibilityId, setIsCheckingEligibilityId] = useState<string | null>(null);

  // ──────────────────────────────────────────────────────────────────────────
  // VIEW A: FIELD SHOP VISITS STATE & QUERIES
  // ──────────────────────────────────────────────────────────────────────────
  const [visits, setVisits] = useState<FieldShopVisit[]>([]);
  const [isLoadingVisits, setIsLoadingVisits] = useState(false);
  const [visitsError, setVisitsError] = useState('');
  const [kpiCounts, setKpiCounts] = useState({ total: 0, interested: 0, notInterested: 0 });

  // Filters for View A
  const [scopeFilter, setScopeFilter] = useState<string>(isPincodeAgent ? 'self' : 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [interestFilter, setInterestFilter] = useState('all');
  const [pageSize, setPageSize] = useState<'15' | '25' | '50' | '100' | 'all'>('15');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Fetch Visits from Backend
  const fetchFieldVisits = useCallback(async () => {
    setIsLoadingVisits(true);
    setVisitsError('');
    try {
      const params: any = {
        page: page,
        limit: pageSize === 'all' ? 1000 : parseInt(pageSize, 10),
        search: searchQuery.trim() || undefined,
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
        status: interestFilter !== 'all' ? interestFilter : undefined,
        scope: scopeFilter !== 'all' ? scopeFilter : undefined
      };

      const res = await api.get('/field-visits', { params });
      if (res && res.data) {
        const rawList = res.data.visits || res.data.data || [];
        setVisits(rawList);
        if (res.data.kpi) {
          setKpiCounts({
            total: res.data.kpi.total || 0,
            interested: res.data.kpi.interested || 0,
            notInterested: res.data.kpi.notInterested || 0
          });
        }
        if (res.data.pagination) {
          setTotalPages(res.data.pagination.pages || 1);
          setTotalCount(res.data.pagination.total || rawList.length);
        } else {
          setTotalCount(rawList.length);
          setTotalPages(Math.ceil(rawList.length / (pageSize === 'all' ? 1000 : parseInt(pageSize, 10))) || 1);
        }
      }
    } catch (err: any) {
      console.error('Failed to load field visits:', err);
      setVisitsError('Failed to load field visits. Please retry.');
    } finally {
      setIsLoadingVisits(false);
    }
  }, [page, pageSize, searchQuery, categoryFilter, interestFilter, scopeFilter]);

  // Debounced search trigger for View A
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchFieldVisits();
    }, 280);
    return () => clearTimeout(timer);
  }, [fetchFieldVisits]);

  // ──────────────────────────────────────────────────────────────────────────
  // VIEW B: TEAM REPORTS / REPORT HISTORY STATE & QUERIES
  // ──────────────────────────────────────────────────────────────────────────
  const [submittedReports, setSubmittedReports] = useState<SubmittedReport[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  const [reportSearchQuery, setReportSearchQuery] = useState('');
  const [reportDistrictFilter, setReportDistrictFilter] = useState('all');
  const [reportDivisionFilter, setReportDivisionFilter] = useState('all');
  const [reportPincodeFilter, setReportPincodeFilter] = useState('all');
  const [reportRoleFilter, setReportRoleFilter] = useState('all');

  const [hierarchyData, setHierarchyData] = useState<{
    districts: any[];
    divisions: any[];
    pincodes: any[];
  }>({ districts: [], divisions: [], pincodes: [] });

  const fetchSubmittedReports = useCallback(async () => {
    setIsLoadingReports(true);
    try {
      const params: any = {
        search: reportSearchQuery.trim() || undefined,
        district: reportDistrictFilter !== 'all' ? reportDistrictFilter : undefined,
        division: reportDivisionFilter !== 'all' ? reportDivisionFilter : undefined,
        pincode: reportPincodeFilter !== 'all' ? reportPincodeFilter : undefined,
        role: reportRoleFilter !== 'all' ? reportRoleFilter : undefined
      };

      const res = await api.get('/reports/submitted', { params });
      if (res && res.data) {
        const reps = res.data.reports || res.data.data || [];
        setSubmittedReports(reps);
        if (res.data.hierarchy) {
          setHierarchyData(res.data.hierarchy);
        }
      }
    } catch (err) {
      console.error('Failed to load submitted reports:', err);
    } finally {
      setIsLoadingReports(false);
    }
  }, [reportSearchQuery, reportDistrictFilter, reportDivisionFilter, reportPincodeFilter, reportRoleFilter]);

  useEffect(() => {
    if (activeTab === 'team_reports') {
      const timer = setTimeout(() => {
        fetchSubmittedReports();
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [activeTab, fetchSubmittedReports]);

  // ──────────────────────────────────────────────────────────────────────────
  // RESUME ONBOARDING HANDLER (With Real-Time Backend Eligibility Revalidation)
  // ──────────────────────────────────────────────────────────────────────────
  const handleResumeOnboarding = async (visit: FieldShopVisit) => {
    if (!visit || !visit._id) return;
    setIsCheckingEligibilityId(visit._id);

    try {
      const res = await api.get(`/field-visits/shop-visit/${visit._id}/eligibility`);
      const isEligible = res.data?.isEligible || res.data?.eligible;

      if (!isEligible) {
        const msg = res.data?.message || 'This merchant is ineligible or onboarding has already been completed.';
        addNotification(
          'Onboarding Ineligible',
          msg,
          'medium',
          'system'
        );
        fetchFieldVisits();
        if (selectedVisitAudit) {
          setSelectedVisitAudit(null);
        }
        return;
      }

      // Prepopulate supported fields
      const prefill = {
        shopName: visit.shopName || visit.vendor?.storeName || '',
        businessName: visit.shopName || visit.vendor?.businessName || '',
        category: visit.category || 'Services',
        storefrontPhoto: visit.storefrontPhoto || '',
        mobile: visit.vendor?.phone || visit.agent?.phone || '',
        pincode: visit.pincode || visit.vendor?.pincode || userPincode,
        district: visit.district || visit.vendor?.district || userDistrict,
        division: visit.division || visit.vendor?.division || userDivision,
        state: visit.state || visit.vendor?.state || userState,
        address: visit.address || visit.storeAddress || visit.vendor?.address || '',
        fieldVisitId: visit._id
      };

      try {
        sessionStorage.setItem('connect_resume_onboard', JSON.stringify(prefill));
      } catch (e) {}

      addNotification(
        'Eligible for Onboarding',
        `Revalidated ${visit.shopName}. Redirecting to Vendor Onboarding wizard...`,
        'low',
        'system'
      );

      navigate(`/vendors?action=new&fieldVisitId=${visit._id}`);
    } catch (err: any) {
      console.error('Eligibility check failed:', err);
      addNotification(
        'Eligibility Check Failed',
        'Could not verify merchant eligibility at this moment. Please retry.',
        'high',
        'system'
      );
    } finally {
      setIsCheckingEligibilityId(null);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // CSV EXPORT MODAL STATE & LOGIC
  // ──────────────────────────────────────────────────────────────────────────
  const [exportStartDate, setExportStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [exportEndDate, setExportEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [exportError, setExportError] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const handleDownloadCsv = async () => {
    setExportError('');

    if (!exportStartDate || !exportEndDate) {
      setExportError('Both Start Date and End Date are strictly required.');
      return;
    }

    if (exportStartDate > exportEndDate) {
      setExportError('Start Date cannot be later than End Date.');
      return;
    }

    // Asia/Kolkata timezone validation: prevent future dates
    const kolkataToday = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    if (exportStartDate > kolkataToday || exportEndDate > kolkataToday) {
      setExportError(`Dates cannot be in the future. Today in India is ${kolkataToday}.`);
      return;
    }

    setIsExporting(true);
    try {
      // Fetch matching authorized visits for date range
      const params: any = {
        limit: 2000,
        startDate: exportStartDate,
        endDate: exportEndDate,
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
        status: interestFilter !== 'all' ? interestFilter : undefined,
        scope: scopeFilter !== 'all' ? scopeFilter : undefined
      };

      const res = await api.get('/field-visits', { params });
      const exportList: FieldShopVisit[] = res.data?.visits || visits;

      // Filter by date range strictly
      const startMs = new Date(exportStartDate).setHours(0, 0, 0, 0);
      const endMs = new Date(exportEndDate).setHours(23, 59, 59, 999);

      const filtered = exportList.filter(v => {
        const vDate = v.visitDate || v.createdAt;
        if (!vDate) return true;
        const vMs = new Date(vDate).getTime();
        return isNaN(vMs) || (vMs >= startMs && vMs <= endMs);
      });

      if (filtered.length === 0) {
        setExportError('No field visits found within the selected date range.');
        setIsExporting(false);
        return;
      }

      // Build CSV
      const headers = [
        'Visit ID',
        'Shop Name',
        'Category',
        'Interested Status',
        'Not Interested Reason',
        'Visiting Agent Name',
        'Visiting Agent Role',
        'State',
        'District',
        'Division',
        'Pincode',
        'Visit Date',
        'Onboarding Status',
        'Store Address'
      ];

      const sanitize = (val: any) => {
        if (val === null || val === undefined) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      };

      const rows = filtered.map(v => [
        sanitize(v._id),
        sanitize(v.shopName || v.vendor?.storeName || 'N/A'),
        sanitize(v.category || 'Services'),
        sanitize(v.interestedStatus || 'N/A'),
        sanitize(v.notInterestedReason || ''),
        sanitize(v.agent?.name || 'N/A'),
        sanitize(v.agent?.role || 'Agent'),
        sanitize(v.state || userState),
        sanitize(v.district || userDistrict),
        sanitize(v.division || userDivision),
        sanitize(v.pincode || userPincode),
        sanitize(v.visitDate ? new Date(v.visitDate).toLocaleDateString('en-GB') : 'N/A'),
        sanitize(v.onboardingStatus || (v.isOnboardingCompleted ? 'COMPLETED' : 'PENDING')),
        sanitize(v.address || v.storeAddress || v.vendor?.address || '')
      ]);

      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `field_shop_visits_${exportStartDate}_to_${exportEndDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setIsExportModalOpen(false);
      addNotification(
        'CSV Export Complete',
        `Successfully downloaded ${filtered.length} field visit records for ${exportStartDate} to ${exportEndDate}.`,
        'low',
        'system'
      );
    } catch (err) {
      console.error('CSV Export failed:', err);
      setExportError('Export failed. Please check connection and retry.');
    } finally {
      setIsExporting(false);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // OFFICIAL REPORT PRINT HANDLER
  // ──────────────────────────────────────────────────────────────────────────
  const handlePrintReport = (report: SubmittedReport) => {
    setSelectedReportAudit(report);
    setTimeout(() => {
      window.print();
    }, 300);
  };

  return (
    <div className="space-y-6 animate-fade-in text-[#1b1c1c] pb-12">
      {/* ── Dynamic Embedded Print CSS ── */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          .official-report-printable, .official-report-printable * {
            visibility: visible !important;
          }
          .official-report-printable {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 24px !important;
            background: #ffffff !important;
            box-shadow: none !important;
            border: none !important;
            display: block !important;
            z-index: 999999 !important;
          }
          .no-print {
            display: none !important;
          }
          table {
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
        }
      `}</style>

      {/* ──────────────────────────────────────────────────────────────────── */}
      {/* HEADER: Title, Role Badge, Territory Scope, and Action Buttons       */}
      {/* ──────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#eae8e7] pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-[#1b1c1c] tracking-tight">Reports & Audits</h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-[#864f19]/10 text-[#864f19] border border-[#864f19]/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              {roleDisplayName}
            </span>
          </div>
          <p className="text-xs text-[#52443a] font-medium mt-1">
            {isStateAgent && `State Jurisdiction: ${userState} Network (Districts, Divisions & Pincodes)`}
            {isDistrictAgent && `District Jurisdiction: ${userDistrict} District Scope`}
            {isDivisionAgent && `Division Jurisdiction: ${userDivision} Division Scope`}
            {isPincodeAgent && `Pincode Territory: PIN ${userPincode || 'Assigned'} Records`}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsGenerateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#864f19] hover:bg-[#a3672f] text-white rounded-xl text-xs font-black shadow-md shadow-[#864f19]/15 transition-all cursor-pointer border-none"
          >
            <Sparkles className="w-4 h-4 text-amber-200" />
            Generate Report
          </button>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────── */}
      {/* PRIMARY VIEW SWITCHER TABS: View A vs View B                         */}
      {/* ──────────────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 p-1 bg-[#f0eded] rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('visits')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer border-none ${
            activeTab === 'visits'
              ? 'bg-white text-[#864f19] shadow-sm'
              : 'bg-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Store className="w-4 h-4" />
          Field Shop Visits
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            activeTab === 'visits' ? 'bg-[#864f19]/10 text-[#864f19]' : 'bg-slate-200 text-slate-600'
          }`}>
            {kpiCounts.total}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('team_reports')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer border-none ${
            activeTab === 'team_reports'
              ? 'bg-white text-[#864f19] shadow-sm'
              : 'bg-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          Team Reports / Report History
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            activeTab === 'team_reports' ? 'bg-[#864f19]/10 text-[#864f19]' : 'bg-slate-200 text-slate-600'
          }`}>
            {submittedReports.length}
          </span>
        </button>
      </div>

      {/* ──────────────────────────────────────────────────────────────────── */}
      {/* VIEW A: FIELD SHOP VISITS WORKFLOW                                   */}
      {/* ──────────────────────────────────────────────────────────────────── */}
      {activeTab === 'visits' && (
        <div className="space-y-5 animate-fade-in">
          {/* Sub-Scope Filter Buttons (Based on Agent Hierarchy Level) */}
          {!isPincodeAgent && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">Scope:</span>
              <button
                onClick={() => { setScopeFilter('all'); setPage(1); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                  scopeFilter === 'all'
                    ? 'bg-[#864f19] text-white border-[#864f19]'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                All Territory Visits
              </button>

              {isStateAgent && (
                <button
                  onClick={() => { setScopeFilter('district_agents'); setPage(1); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                    scopeFilter === 'district_agents'
                      ? 'bg-[#864f19] text-white border-[#864f19]'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  District Agents
                </button>
              )}

              {(isStateAgent || isDistrictAgent) && (
                <button
                  onClick={() => { setScopeFilter('division_agents'); setPage(1); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                    scopeFilter === 'division_agents'
                      ? 'bg-[#864f19] text-white border-[#864f19]'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Division Agents
                </button>
              )}

              <button
                onClick={() => { setScopeFilter('pincode_agents'); setPage(1); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                  scopeFilter === 'pincode_agents'
                    ? 'bg-[#864f19] text-white border-[#864f19]'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Pincode Agents
              </button>

              <button
                onClick={() => { setScopeFilter('self'); setPage(1); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                  scopeFilter === 'self'
                    ? 'bg-[#864f19] text-white border-[#864f19]'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                My Direct Visits
              </button>
            </div>
          )}

          {/* Dynamic KPI Cards (Matches Current Scope and Active Filters) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-[#eae8e7] p-5 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Visits Recorded</p>
                <h3 className="text-2xl font-black text-[#1b1c1c] mt-1">{kpiCounts.total}</h3>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">Authoritative scope count</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-[#864f19]/10 text-[#864f19] flex items-center justify-center">
                <Store className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-emerald-100 p-5 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Interested</p>
                <h3 className="text-2xl font-black text-emerald-600 mt-1">{kpiCounts.interested}</h3>
                <p className="text-[10px] text-emerald-600/70 font-medium mt-0.5">
                  {kpiCounts.total > 0 ? `${Math.round((kpiCounts.interested / kpiCounts.total) * 100)}% conversion rate` : '0% conversion'}
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-rose-100 p-5 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">Not Interested</p>
                <h3 className="text-2xl font-black text-rose-600 mt-1">{kpiCounts.notInterested}</h3>
                <p className="text-[10px] text-rose-600/70 font-medium mt-0.5">
                  {kpiCounts.total > 0 ? `${Math.round((kpiCounts.notInterested / kpiCounts.total) * 100)}% rejection rate` : '0% rejection'}
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <XCircle className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Filter Bar: Debounced Search, Category, Interest, Page Size, and CSV Export */}
          <div className="bg-white rounded-2xl border border-[#eae8e7] p-4 shadow-sm space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
              {/* Debounced Search */}
              <div className="md:col-span-4 relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                  placeholder="Search shop, category, agent..."
                  className="w-full pl-9 pr-4 py-2 bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl text-xs text-[#1b1c1c] placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#864f19]"
                />
                {searchQuery && (
                  <button
                    onClick={() => { setSearchQuery(''); setPage(1); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer border-none bg-transparent"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Category Filter */}
              <div className="md:col-span-3">
                <select
                  value={categoryFilter}
                  onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
                  className="w-full bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl py-2 px-3 text-xs text-[#1b1c1c] focus:outline-none focus:ring-1 focus:ring-[#864f19]"
                >
                  <option value="all">All 7 Categories</option>
                  {CANONICAL_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Interest Filter */}
              <div className="md:col-span-2">
                <select
                  value={interestFilter}
                  onChange={(e) => { setInterestFilter(e.target.value); setPage(1); }}
                  className="w-full bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl py-2 px-3 text-xs text-[#1b1c1c] focus:outline-none focus:ring-1 focus:ring-[#864f19]"
                >
                  <option value="all">All Interest Status</option>
                  <option value="YES">Interested (YES)</option>
                  <option value="NO">Not Interested (NO)</option>
                </select>
              </div>

              {/* Page Size */}
              <div className="md:col-span-1">
                <select
                  value={pageSize}
                  onChange={(e) => { setPageSize(e.target.value as any); setPage(1); }}
                  className="w-full bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl py-2 px-2 text-xs text-[#1b1c1c] focus:outline-none focus:ring-1 focus:ring-[#864f19]"
                >
                  <option value="15">15</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                  <option value="all">All</option>
                </select>
              </div>

              {/* Export to CSV Action */}
              <div className="md:col-span-2 flex justify-end">
                <button
                  onClick={() => setIsExportModalOpen(true)}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer border-none"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export to CSV
                </button>
              </div>
            </div>
          </div>

          {/* Visits Data Table */}
          <div className="bg-white rounded-2xl border border-[#eae8e7] shadow-sm overflow-hidden">
            {isLoadingVisits ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
                <Loader2 className="w-7 h-7 animate-spin text-[#864f19]" />
                <span className="text-xs font-bold text-slate-600">Loading field visits records...</span>
              </div>
            ) : visitsError ? (
              <div className="p-8 text-center text-rose-600">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 text-rose-500" />
                <p className="font-bold text-xs">{visitsError}</p>
                <button
                  onClick={() => fetchFieldVisits()}
                  className="mt-3 px-3 py-1.5 bg-[#864f19] text-white rounded-xl text-xs font-bold border-none cursor-pointer"
                >
                  Retry
                </button>
              </div>
            ) : visits.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
                <Store className="w-10 h-10 text-slate-300" />
                <p className="font-bold text-xs text-slate-600">No field visits match the active filters or scope</p>
                <p className="text-[10px] text-slate-450">Try clearing your filters or switching your search term</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100">
                      <th className="py-3.5 px-4">Merchant / Shop</th>
                      <th className="py-3.5 px-4">Visiting Agent</th>
                      <th className="py-3.5 px-4">Visit Date & Time</th>
                      <th className="py-3.5 px-4 text-center">Audio Note</th>
                      <th className="py-3.5 px-4">Interest Status</th>
                      <th className="py-3.5 px-4">Onboarding</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-medium">
                    {visits.map((visit) => {
                      const isInterested = visit.interestedStatus === 'YES';
                      const hasVoiceNote = !!(visit.audioVoiceNote || visit.voiceNoteUrl);

                      return (
                        <tr key={visit._id} className="hover:bg-[#fbf9f8] transition-colors">
                          {/* Merchant / Shop Information */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              {visit.storefrontPhoto ? (
                                <img
                                  src={visit.storefrontPhoto}
                                  alt={visit.shopName}
                                  className="w-10 h-10 rounded-xl object-cover border border-slate-200"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200">
                                  <Store className="w-5 h-5" />
                                </div>
                              )}
                              <div>
                                <h4 className="font-bold text-[#1b1c1c] text-xs">
                                  {visit.shopName || visit.vendor?.storeName || 'Merchant Store'}
                                </h4>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600">
                                    {visit.category || 'Services'}
                                  </span>
                                  <span className="text-[10px] text-slate-400">
                                    {visit.pincode ? `PIN ${visit.pincode}` : visit.district || ''}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Visiting Agent Details */}
                          <td className="py-3 px-4">
                            <div className="font-bold text-[#1b1c1c]">
                              {visit.agent?.name || 'Field Agent'}
                            </div>
                            <div className="text-[10px] text-slate-450 mt-0.5 flex items-center gap-1">
                              <span className="capitalize">{visit.agent?.role || 'Agent'}</span>
                              {visit.agent?.phone && <span>• {visit.agent.phone}</span>}
                            </div>
                          </td>

                          {/* Visit Date & Time */}
                          <td className="py-3 px-4 text-slate-600">
                            <div className="font-bold text-[#1b1c1c]">
                              {visit.visitDate ? new Date(visit.visitDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                            </div>
                            <div className="text-[10px] text-slate-450 mt-0.5">
                              {visit.visitDate ? new Date(visit.visitDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                            </div>
                          </td>

                          {/* Voice Note Indicator */}
                          <td className="py-3 px-4 text-center">
                            {hasVoiceNote ? (
                              <button
                                onClick={() => setSelectedVisitAudit(visit)}
                                title="Play voice note in audit modal"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer"
                              >
                                <Volume2 className="w-3.5 h-3.5 text-amber-700" />
                                Audio Note
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-normal">None</span>
                            )}
                          </td>

                          {/* Interested Status */}
                          <td className="py-3 px-4">
                            {isInterested ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Interested
                              </span>
                            ) : (
                              <div>
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
                                  <XCircle className="w-3 h-3 text-rose-600" />
                                  Not Interested
                                </span>
                                {visit.notInterestedReason && (
                                  <p className="text-[9px] text-slate-450 mt-1 max-w-[150px] truncate" title={visit.notInterestedReason}>
                                    {visit.notInterestedReason}
                                  </p>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Vendor Onboarding Status */}
                          <td className="py-3 px-4">
                            {visit.isOnboardingCompleted || visit.onboardingStatus === 'COMPLETED' ? (
                              <span className="inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Onboarded
                              </span>
                            ) : isInterested ? (
                              <span className="inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase bg-amber-50 text-amber-700 border border-amber-200">
                                Pending
                              </span>
                            ) : (
                              <span className="inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase bg-slate-100 text-slate-500">
                                Ineligible
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {/* Audit Modal Button */}
                              <button
                                onClick={() => setSelectedVisitAudit(visit)}
                                title="View Visit Audit"
                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors border-none cursor-pointer"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              {/* Resume Onboarding (Only shown when eligible) */}
                              {visit.isEligibleForResume && (
                                <button
                                  onClick={() => handleResumeOnboarding(visit)}
                                  disabled={isCheckingEligibilityId === visit._id}
                                  className="flex items-center gap-1 px-2.5 py-1.5 bg-[#864f19] hover:bg-[#a3672f] text-white rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-sm transition-all border-none cursor-pointer disabled:opacity-50"
                                >
                                  {isCheckingEligibilityId === visit._id ? (
                                    <>
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                      Validating...
                                    </>
                                  ) : (
                                    <>
                                      Resume
                                      <ArrowRight className="w-3 h-3" />
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {pageSize !== 'all' && totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-t border-slate-100 text-xs text-slate-500 font-semibold">
                <div>
                  Showing {Math.min((page - 1) * parseInt(pageSize, 10) + 1, totalCount)} to{' '}
                  {Math.min(page * parseInt(pageSize, 10), totalCount)} of {totalCount} visits
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg font-bold text-[#864f19]">
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────── */}
      {/* VIEW B: TEAM REPORTS / REPORT HISTORY WORKFLOW                       */}
      {/* ──────────────────────────────────────────────────────────────────── */}
      {activeTab === 'team_reports' && (
        <div className="space-y-5 animate-fade-in">
          {/* Cascading Filter Bar for Submitted Reports */}
          <div className="bg-white rounded-2xl border border-[#eae8e7] p-4 shadow-sm space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
              {/* Search by Report Number or Submitting Agent */}
              <div className="md:col-span-3 relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={reportSearchQuery}
                  onChange={(e) => setReportSearchQuery(e.target.value)}
                  placeholder="Report # or Agent name..."
                  className="w-full pl-9 pr-4 py-2 bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl text-xs text-[#1b1c1c] placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#864f19]"
                />
              </div>

              {/* State Agent: District Cascading Dropdown */}
              {isStateAgent && (
                <div className="md:col-span-2">
                  <select
                    value={reportDistrictFilter}
                    onChange={(e) => {
                      setReportDistrictFilter(e.target.value);
                      setReportDivisionFilter('all');
                      setReportPincodeFilter('all');
                    }}
                    className="w-full bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl py-2 px-3 text-xs text-[#1b1c1c] focus:outline-none focus:ring-1 focus:ring-[#864f19]"
                  >
                    <option value="all">All Districts</option>
                    {hierarchyData.districts.map((d: any) => (
                      <option key={d._id || d.name} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* State or District Agent: Division Cascading Dropdown */}
              {(isStateAgent || isDistrictAgent) && (
                <div className="md:col-span-2">
                  <select
                    value={reportDivisionFilter}
                    onChange={(e) => {
                      setReportDivisionFilter(e.target.value);
                      setReportPincodeFilter('all');
                    }}
                    className="w-full bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl py-2 px-3 text-xs text-[#1b1c1c] focus:outline-none focus:ring-1 focus:ring-[#864f19]"
                  >
                    <option value="all">All Divisions</option>
                    {hierarchyData.divisions.map((div: any) => (
                      <option key={div._id || div.name} value={div.name}>{div.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Division / District / State Agent: Pincode Cascading Dropdown */}
              {!isPincodeAgent && (
                <div className="md:col-span-2">
                  <select
                    value={reportPincodeFilter}
                    onChange={(e) => setReportPincodeFilter(e.target.value)}
                    className="w-full bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl py-2 px-3 text-xs text-[#1b1c1c] focus:outline-none focus:ring-1 focus:ring-[#864f19]"
                  >
                    <option value="all">All Pincodes</option>
                    {hierarchyData.pincodes.map((pin: any) => (
                      <option key={pin._id || pin.code} value={pin.code}>PIN {pin.code} {pin.name ? `(${pin.name})` : ''}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Role / Hierarchy Tier Filter */}
              <div className={isPincodeAgent ? 'md:col-span-9' : 'md:col-span-3'}>
                <select
                  value={reportRoleFilter}
                  onChange={(e) => setReportRoleFilter(e.target.value)}
                  className="w-full bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl py-2 px-3 text-xs text-[#1b1c1c] focus:outline-none focus:ring-1 focus:ring-[#864f19]"
                >
                  <option value="all">All Reporting Tiers</option>
                  {isStateAgent && <option value="district">District Agent Reports</option>}
                  {(isStateAgent || isDistrictAgent) && <option value="division">Division Agent Reports</option>}
                  <option value="pincode">Pincode Agent Reports</option>
                </select>
              </div>
            </div>
          </div>

          {/* Submitted Reports Table */}
          <div className="bg-white rounded-2xl border border-[#eae8e7] shadow-sm overflow-hidden">
            {isLoadingReports ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
                <Loader2 className="w-7 h-7 animate-spin text-[#864f19]" />
                <span className="text-xs font-bold text-slate-600">Syncing authorized submitted reports...</span>
              </div>
            ) : submittedReports.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
                <FileSpreadsheet className="w-10 h-10 text-slate-300" />
                <p className="font-bold text-xs text-slate-600">No submitted reports found in your territory</p>
                <p className="text-[10px] text-slate-450">Use the 'Generate Report' wizard above to create and submit an official report</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100">
                      <th className="py-3.5 px-4">Report Number</th>
                      <th className="py-3.5 px-4">Reporting Agent</th>
                      <th className="py-3.5 px-4">Level</th>
                      <th className="py-3.5 px-4">Reporting Period</th>
                      <th className="py-3.5 px-4">Submitted At</th>
                      <th className="py-3.5 px-4">Territory</th>
                      <th className="py-3.5 px-4">Performance Summary</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-medium">
                    {submittedReports.map((report) => (
                      <tr key={report._id} className="hover:bg-[#fbf9f8] transition-colors">
                        {/* Report Number */}
                        <td className="py-3 px-4 font-black text-[#864f19]">
                          <button
                            onClick={() => setSelectedReportAudit(report)}
                            className="hover:underline flex items-center gap-1.5 bg-transparent border-none p-0 cursor-pointer text-[#864f19]"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            {report.reportNumber}
                          </button>
                        </td>

                        {/* Reporting Agent Name */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-[#1b1c1c]">{report.agentName || 'Reporting Agent'}</div>
                        </td>

                        {/* Level / Role Badge */}
                        <td className="py-3 px-4">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                            report.agentRole?.toLowerCase().includes('state')
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : report.agentRole?.toLowerCase().includes('district')
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : report.agentRole?.toLowerCase().includes('division')
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}>
                            {report.agentRole || 'Agent'}
                          </span>
                        </td>

                        {/* Reporting Period */}
                        <td className="py-3 px-4 text-slate-600">
                          <div className="font-bold text-[#1b1c1c]">{report.periodLabel}</div>
                          <div className="text-[10px] text-slate-450 mt-0.5">{report.dateRange || ''}</div>
                        </td>

                        {/* Submission Timestamp */}
                        <td className="py-3 px-4 text-slate-500 font-semibold text-[11px]">
                          {report.submittedAt ? new Date(report.submittedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                        </td>

                        {/* Territory */}
                        <td className="py-3 px-4 text-slate-600">
                          <div className="font-bold text-[#1b1c1c]">{report.district || report.state}</div>
                          {report.pincode && (
                            <div className="text-[10px] text-slate-450">PIN {report.pincode}</div>
                          )}
                        </td>

                        {/* Summary Badges */}
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">
                              Visits: {report.summary?.totalVisits || 0}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                              YES: {report.summary?.interested || 0}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 text-[10px] font-bold">
                              Tie-ups: {report.summary?.newTieups || 0}
                            </span>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setSelectedReportAudit(report)}
                              title="View Official Report"
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors border-none cursor-pointer"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handlePrintReport(report)}
                              title="Print / Save PDF"
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors border-none cursor-pointer"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────── */}
      {/* MODAL 1: INDIVIDUAL FIELD VISIT AUDIT MODAL                          */}
      {/* ──────────────────────────────────────────────────────────────────── */}
      {selectedVisitAudit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-slate-100 p-5 flex items-center justify-between z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#864f19]/10 text-[#864f19] flex items-center justify-center">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#1b1c1c]">Field Visit Audit Details</h3>
                  <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                    Visit ID: {selectedVisitAudit._id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedVisitAudit(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer border-none"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6 text-xs text-slate-700">
              {/* Storefront Photo Display */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2">Storefront Photo</label>
                {selectedVisitAudit.storefrontPhoto ? (
                  <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 max-h-64 flex items-center justify-center">
                    <img
                      src={selectedVisitAudit.storefrontPhoto}
                      alt={selectedVisitAudit.shopName}
                      className="w-full h-full object-contain max-h-64"
                    />
                  </div>
                ) : (
                  <div className="p-8 rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center text-slate-400 font-semibold flex flex-col items-center justify-center gap-2">
                    <Store className="w-8 h-8 text-slate-300" />
                    <span>No storefront photo captured for this visit</span>
                  </div>
                )}
              </div>

              {/* Shop & Location Profile */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100 font-semibold">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Shop / Business Name</span>
                  <p className="text-sm font-black text-[#1b1c1c] mt-0.5">
                    {selectedVisitAudit.shopName || selectedVisitAudit.vendor?.storeName || 'Merchant Store'}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Category</span>
                  <p className="text-sm font-black text-[#864f19] mt-0.5">
                    {selectedVisitAudit.category || 'Services'}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Store Address</span>
                  <p className="text-xs text-slate-800 mt-0.5">
                    {selectedVisitAudit.address || selectedVisitAudit.storeAddress || selectedVisitAudit.vendor?.address || 'Not specified'}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Territory Jurisdiction</span>
                  <p className="text-xs text-slate-800 mt-0.5">
                    {selectedVisitAudit.district || userDistrict}, {selectedVisitAudit.state || userState} (PIN {selectedVisitAudit.pincode || userPincode})
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Visit Date & Time</span>
                  <p className="text-xs text-slate-800 mt-0.5">
                    {selectedVisitAudit.visitDate ? new Date(selectedVisitAudit.visitDate).toLocaleString('en-GB') : 'N/A'}
                  </p>
                </div>
              </div>

              {/* Visiting Agent Details */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#864f19] block">Visiting Agent Profile</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-semibold">
                  <div>
                    <span className="text-slate-400 text-[10px]">Name:</span>
                    <p className="text-slate-900">{selectedVisitAudit.agent?.name || 'Field Agent'}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px]">Role:</span>
                    <p className="text-slate-900 capitalize">{selectedVisitAudit.agent?.role || 'Agent'}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px]">Phone:</span>
                    <p className="text-slate-900">{selectedVisitAudit.agent?.phone || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Interest Status & Reason */}
              <div className="p-4 rounded-xl border border-slate-200 space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Merchant Interest & Feedback</span>
                <div className="flex items-center gap-2">
                  {selectedVisitAudit.interestedStatus === 'YES' ? (
                    <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Interested in Onboarding
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1.5">
                      <XCircle className="w-3.5 h-3.5 text-rose-600" />
                      Not Interested
                    </span>
                  )}
                </div>

                {selectedVisitAudit.notInterestedReason && (
                  <div className="mt-2 text-rose-800 bg-rose-50/50 p-2.5 rounded-lg border border-rose-100">
                    <span className="font-bold text-[10px] block uppercase">Reason recorded:</span>
                    <p className="text-xs font-semibold mt-0.5">{selectedVisitAudit.notInterestedReason}</p>
                  </div>
                )}
                {selectedVisitAudit.remarks && (
                  <div className="mt-1 text-slate-600 text-xs">
                    <span className="font-bold text-[10px] uppercase text-slate-400">Agent Remarks:</span> {selectedVisitAudit.remarks}
                  </div>
                )}
              </div>

              {/* Audio Voice Note Playback */}
              <div className="p-4 rounded-xl border border-slate-200 space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-amber-600" />
                  Voice Note Playback
                </span>
                {selectedVisitAudit.audioVoiceNote || selectedVisitAudit.voiceNoteUrl ? (
                  <audio
                    controls
                    src={selectedVisitAudit.audioVoiceNote || selectedVisitAudit.voiceNoteUrl}
                    className="w-full mt-1"
                  />
                ) : (
                  <p className="text-slate-400 font-semibold italic text-xs">No audio note recorded during this visit.</p>
                )}
              </div>

              {/* Vendor & KYC Status (Masked Sensitive Data) */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3 font-semibold">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Vendor ID</span>
                  <p className="text-xs font-bold text-slate-800 mt-0.5">
                    {selectedVisitAudit.vendorId || selectedVisitAudit.vendor?._id || 'Not Linked'}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">GST Status</span>
                  <p className="text-xs font-bold text-slate-800 mt-0.5">
                    {selectedVisitAudit.gstStatus || 'Unregistered'}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Bank Account</span>
                  <p className="text-xs font-bold text-slate-800 mt-0.5">
                    {selectedVisitAudit.bankAccount ? `•••• •••• •••• ${selectedVisitAudit.bankAccount.slice(-4)}` : 'Not Provided'}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-white border-t border-slate-100 p-4 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setSelectedVisitAudit(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold border-none cursor-pointer"
              >
                Close
              </button>

              {selectedVisitAudit.isEligibleForResume && (
                <button
                  onClick={() => handleResumeOnboarding(selectedVisitAudit)}
                  disabled={isCheckingEligibilityId === selectedVisitAudit._id}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#864f19] hover:bg-[#a3672f] text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm transition-all border-none cursor-pointer disabled:opacity-50"
                >
                  {isCheckingEligibilityId === selectedVisitAudit._id ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Validating Eligibility...
                    </>
                  ) : (
                    <>
                      <ArrowRight className="w-3.5 h-3.5" />
                      Resume Onboarding
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────── */}
      {/* MODAL 2: OFFICIAL SUBMITTED REPORT AUDIT & PRINT VIEW                 */}
      {/* ──────────────────────────────────────────────────────────────────── */}
      {selectedReportAudit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="official-report-printable bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200">
            {/* Modal Action Bar (Hidden during printing via .no-print) */}
            <div className="no-print sticky top-0 bg-white border-b border-slate-100 p-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#864f19]" />
                <h3 className="text-base font-black text-[#1b1c1c]">Official Field Report</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#864f19] hover:bg-[#a3672f] text-white rounded-xl text-xs font-bold border-none cursor-pointer shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print / Save PDF
                </button>
                <button
                  onClick={() => setSelectedReportAudit(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer border-none"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Document Header */}
            <div className="p-6 border-b border-slate-200 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#864f19]">Connect App Official Report</span>
                  <h2 className="text-2xl font-black text-[#1b1c1c] tracking-tight">{selectedReportAudit.reportNumber}</h2>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">
                    {selectedReportAudit.periodLabel} {selectedReportAudit.dateRange ? `(${selectedReportAudit.dateRange})` : ''}
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Status: {selectedReportAudit.status || 'Submitted'}
                  </span>
                  <p className="text-[10px] text-slate-400 font-bold mt-1">
                    Submitted: {new Date(selectedReportAudit.submittedAt || selectedReportAudit.createdAt).toLocaleString('en-GB')}
                  </p>
                </div>
              </div>

              {/* Author & Territory Metadata */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs font-semibold">
                <div>
                  <span className="text-[9px] font-black uppercase text-slate-400 block">Reporting Agent</span>
                  <p className="text-slate-900 mt-0.5">{selectedReportAudit.agentName}</p>
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase text-slate-400 block">Agent Tier</span>
                  <p className="text-[#864f19] mt-0.5 uppercase font-bold">{selectedReportAudit.agentRole}</p>
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase text-slate-400 block">District / Division</span>
                  <p className="text-slate-900 mt-0.5">{selectedReportAudit.district || 'All Districts'} {selectedReportAudit.division ? `• ${selectedReportAudit.division}` : ''}</p>
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase text-slate-400 block">Assigned Territory</span>
                  <p className="text-slate-900 mt-0.5">{selectedReportAudit.pincode ? `PIN ${selectedReportAudit.pincode}` : selectedReportAudit.state}</p>
                </div>
              </div>
            </div>

            {/* Performance Summary Grid (6 KPI Cards) */}
            <div className="p-6 space-y-6">
              <div>
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">Performance Metrics Summary</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Visits</span>
                    <span className="text-xl font-black text-slate-900 mt-1 block">
                      {selectedReportAudit.summary?.totalVisits || 0}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 text-center">
                    <span className="text-[10px] font-bold text-emerald-700 uppercase block">Interested</span>
                    <span className="text-xl font-black text-emerald-700 mt-1 block">
                      {selectedReportAudit.summary?.interested || 0}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-rose-50/60 border border-rose-100 text-center">
                    <span className="text-[10px] font-bold text-rose-700 uppercase block">Not Interested</span>
                    <span className="text-xl font-black text-rose-700 mt-1 block">
                      {selectedReportAudit.summary?.notInterested || 0}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-100 text-center">
                    <span className="text-[10px] font-bold text-amber-700 uppercase block">Tie-ups</span>
                    <span className="text-xl font-black text-amber-700 mt-1 block">
                      {selectedReportAudit.summary?.newTieups || 0}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 text-center">
                    <span className="text-[10px] font-bold text-blue-700 uppercase block">Tasks Done</span>
                    <span className="text-xl font-black text-blue-700 mt-1 block">
                      {selectedReportAudit.summary?.tasksCompleted || 0}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-100 text-center">
                    <span className="text-[10px] font-bold text-purple-700 uppercase block">Tasks Pending</span>
                    <span className="text-xl font-black text-purple-700 mt-1 block">
                      {selectedReportAudit.summary?.tasksPending || 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* Embedded Shop Visits Section */}
              <div>
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Embedded Shop Visits ({selectedReportAudit.shopVisits?.length || 0})</span>
                </h4>
                {selectedReportAudit.shopVisits && selectedReportAudit.shopVisits.length > 0 ? (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">Shop Name</th>
                          <th className="py-2.5 px-3">Category</th>
                          <th className="py-2.5 px-3">Interest</th>
                          <th className="py-2.5 px-3">Onboarding</th>
                          <th className="py-2.5 px-3">Visit Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                        {selectedReportAudit.shopVisits.map((v: any, idx: number) => (
                          <tr key={v._id || idx}>
                            <td className="py-2 px-3 font-bold text-slate-900">{v.shopName || 'Shop'}</td>
                            <td className="py-2 px-3">{v.category || 'Services'}</td>
                            <td className="py-2 px-3">
                              {v.interestedStatus === 'YES' ? (
                                <span className="text-emerald-700 font-bold">YES</span>
                              ) : (
                                <span className="text-rose-600 font-bold">NO</span>
                              )}
                            </td>
                            <td className="py-2 px-3">
                              {v.vendorId ? 'Linked' : 'Not Linked'}
                            </td>
                            <td className="py-2 px-3 text-slate-500">
                              {v.visitDate ? new Date(v.visitDate).toLocaleDateString('en-GB') : 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No shop visits recorded during this specific reporting period.</p>
                )}
              </div>

              {/* Task Execution Log */}
              <div>
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">
                  Task Execution Log ({selectedReportAudit.tasks?.length || 0})
                </h4>
                {selectedReportAudit.tasks && selectedReportAudit.tasks.length > 0 ? (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">Task Title</th>
                          <th className="py-2.5 px-3">Due Date</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3">Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                        {selectedReportAudit.tasks.map((t: any, idx: number) => (
                          <tr key={t._id || idx}>
                            <td className="py-2 px-3 font-bold text-slate-900">{t.title || 'Task'}</td>
                            <td className="py-2 px-3 text-slate-500">{t.dueDate ? new Date(t.dueDate).toLocaleDateString('en-GB') : 'N/A'}</td>
                            <td className="py-2 px-3 font-bold">{t.status || 'Pending'}</td>
                            <td className="py-2 px-3 text-slate-450">{t.remarks || 'None'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No tasks logged during this period.</p>
                )}
              </div>

              {/* Official Sign-off Notice */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-slate-500 text-[10px] font-semibold space-y-1">
                <p className="uppercase tracking-wider font-bold text-slate-600">Connect Portal Field Audit Verification</p>
                <p>This document is an authoritative system-generated performance audit authenticated for {selectedReportAudit.agentName} ({selectedReportAudit.agentRole}).</p>
              </div>
            </div>

            {/* Modal Footer (Hidden in print) */}
            <div className="no-print sticky bottom-0 bg-white border-t border-slate-100 p-4 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setSelectedReportAudit(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold border-none cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#864f19] hover:bg-[#a3672f] text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm transition-all border-none cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                Print / Save PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────── */}
      {/* MODAL 3: EXPORT TO CSV DATE-RANGE SELECTION MODAL                    */}
      {/* ──────────────────────────────────────────────────────────────────── */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Download className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-black text-[#1b1c1c]">Export Field Visits to CSV</h3>
              </div>
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer border-none"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 font-semibold">
              Select date range to export field shop visits strictly within your authorized territory.
            </p>

            {exportError && (
              <div className="p-3 bg-rose-50 text-rose-700 rounded-xl text-xs font-semibold border border-rose-200">
                {exportError}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Start Date *
                </label>
                <input
                  type="date"
                  value={exportStartDate}
                  onChange={(e) => setExportStartDate(e.target.value)}
                  className="w-full bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl py-2 px-3 text-xs text-[#1b1c1c] focus:outline-none focus:ring-1 focus:ring-[#864f19]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  End Date *
                </label>
                <input
                  type="date"
                  value={exportEndDate}
                  onChange={(e) => setExportEndDate(e.target.value)}
                  className="w-full bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl py-2 px-3 text-xs text-[#1b1c1c] focus:outline-none focus:ring-1 focus:ring-[#864f19]"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-[11px] font-semibold text-slate-600 space-y-1">
                <span className="font-bold text-[#864f19] uppercase text-[9px] block">Active Filters Applied:</span>
                <p>Category: <strong>{categoryFilter === 'all' ? 'All Categories' : categoryFilter}</strong></p>
                <p>Interest: <strong>{interestFilter === 'all' ? 'All Records' : interestFilter}</strong></p>
                <p>Scope: <strong>{scopeFilter.replace('_', ' ').toUpperCase()}</strong></p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold border-none cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDownloadCsv}
                disabled={isExporting}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm transition-all border-none cursor-pointer disabled:opacity-50"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Generating CSV...
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    Download CSV
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────── */}
      {/* MODAL 4: GENERATE REPORT 4-STEP WIZARD MODAL                         */}
      {/* ──────────────────────────────────────────────────────────────────── */}
      {isGenerateModalOpen && (
        <GenerateReportModal
          onClose={() => setIsGenerateModalOpen(false)}
          onReportSubmitted={(newReport) => {
            setIsGenerateModalOpen(false);
            setActiveTab('team_reports');
            fetchSubmittedReports();
            addNotification(
              'Report Submitted Successfully',
              `Report ${newReport?.reportNumber || ''} has been persisted to the audit registry.`,
              'medium',
              'system'
            );
          }}
          allVisits={visits}
        />
      )}
    </div>
  );
};

export default ReportsModule;
