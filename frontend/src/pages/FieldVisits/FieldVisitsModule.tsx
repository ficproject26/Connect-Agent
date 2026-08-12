import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardBody, Button, Modal } from '../../components/ui';
import {
  MapPin, Navigation, Camera, CheckCircle2, Clock, Plus, Search, Store,
  AlertCircle, ArrowRight, Download, FileText, Printer, User, Filter, RotateCcw,
  Building, Calendar, ShieldCheck, X, Eye, LogOut, Check, ThumbsUp, ThumbsDown
} from 'lucide-react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

interface FieldVisitRecord {
  _id: string;
  vendorId: string;
  vendorName: string;
  storeAddress: string;
  visitDate: string;
  visitTime?: string;
  status: 'started' | 'completed' | 'in_progress' | 'overdue';
  latitude: number;
  longitude: number;
  remarks?: string;
  visitedBy: string;
  visitedByRole: string;
  state: string;
  territoryDistrict: string;
  territoryPincode: string;
  photoBeforeVisit?: string;
  photoAfterVisit?: string;
  visitPurpose?: string;
}

export const FieldVisitsModule: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const activeRole = (user?.role as string) || 'state';
  const userState = user?.territory?.state || 'Andhra Pradesh';
  const userDistrict = user?.territory?.district || 'NTR District';
  const userPincode = user?.territory?.pincode || '520001';
  const userName = user?.name || 'Logged Agent';

  const userVisitsKey = useMemo(() => {
    return user?._id || user?.email ? `connect_portal_field_visits_${user._id || user.email?.toLowerCase()}` : 'connect_portal_field_visits';
  }, [user]);

  const [visits, setVisits] = useState<FieldVisitRecord[]>(() => {
    try {
      const userKey = user?._id || user?.email ? `connect_portal_field_visits_${user._id || user.email?.toLowerCase()}` : 'connect_portal_field_visits';
      const saved = localStorage.getItem(userKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error loading custom field visits:', e);
    }
    return [];
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(userVisitsKey);
      if (saved) {
        setVisits(JSON.parse(saved));
      } else {
        setVisits([]);
      }
    } catch (e) {}
  }, [userVisitsKey]);

  const [searchTerm, setSearchTerm] = useState('');
  const [districtFilter, setDistrictFilter] = useState('all');
  const [divisionFilter, setDivisionFilter] = useState('all');
  const [pincodeFilter, setPincodeFilter] = useState('all');
  const [agentFilter, setAgentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('today');

  // Drawer & Modal State
  const [selectedVisitDetails, setSelectedVisitDetails] = useState<FieldVisitRecord | null>(null);
  const [isStartModalOpen, setIsStartModalOpen] = useState(false);
  const [selectedVisitToComplete, setSelectedVisitToComplete] = useState<FieldVisitRecord | null>(null);

  // Check Out Modal States (Requirement 4)
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [checkoutVisit, setCheckoutVisit] = useState<FieldVisitRecord | null>(null);
  const [checkoutOutcome, setCheckoutOutcome] = useState<'interested' | 'not_interested' | null>(null);
  const [notInterestedReason, setNotInterestedReason] = useState<string>('');
  const [customReason, setCustomReason] = useState<string>('');

  // Start Form State
  const [vendorName, setVendorName] = useState('');
  const [storeAddress, setStoreAddress] = useState('');
  const [latitude, setLatitude] = useState<number | ''>('');
  const [longitude, setLongitude] = useState<number | ''>('');
  const [remarks, setRemarks] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [gpsPhoto, setGpsPhoto] = useState<string>('');

  // Complete Form State
  const [completeRemarks, setCompleteRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch real visits from API or sync
  const fetchVisits = async () => {
    try {
      const res = await api.get('/field-visits');
      const backendVisits = res.data.visits || [];
      if (backendVisits.length > 0) {
        const mapped: FieldVisitRecord[] = backendVisits.map((v: any) => {
          const agentName = v.agent?.name || v.visitedBy || userName;
          const agentRoleStr = v.agent?.role
            ? `${v.agent.role.charAt(0).toUpperCase() + v.agent.role.slice(1)} Agent`
            : v.visitedByRole || `${activeRole.charAt(0).toUpperCase() + activeRole.slice(1)} Agent`;
          const vStoreName = v.vendor?.storeName || v.vendor?.businessName || v.vendorName || 'Merchant Store';
          const vState = v.vendor?.state || v.state || userState;
          const vDistrict = v.vendor?.district || v.territoryDistrict || userDistrict;
          const vPincode = v.vendor?.pincode || v.territoryPincode || userPincode;
          const vAddress = v.vendor?.address || v.vendor?.fullAddress || v.storeAddress || 'Store Address';

          return {
            _id: v._id || `VIS-${Math.floor(1000 + Math.random() * 9000)}`,
            vendorId: v.vendor?._id || 'VEND-REF',
            vendorName: vStoreName,
            storeAddress: vAddress,
            visitDate: v.visitDate ? new Date(v.visitDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
            visitTime: v.visitDate ? new Date(v.visitDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
            status: v.status === 'started' ? 'in_progress' : (v.status || 'completed'),
            latitude: v.checkInLocation?.latitude || v.latitude || 0,
            longitude: v.checkInLocation?.longitude || v.longitude || 0,
            remarks: v.remarks || '',
            visitedBy: agentName,
            visitedByRole: agentRoleStr,
            state: vState,
            territoryDistrict: vDistrict,
            territoryPincode: vPincode,
            visitPurpose: v.visitPurpose || v.remarks || ''
          };
        });

        setVisits(prev => {
          const apiIds = new Set(mapped.map(m => m._id));
          const localOnly = prev.filter(p => !apiIds.has(p._id)).map(p => ({
            ...p,
            visitedBy: p.visitedBy || userName,
            visitedByRole: p.visitedByRole || `${activeRole.charAt(0).toUpperCase() + activeRole.slice(1)} Agent`,
            state: p.state || userState,
            territoryDistrict: p.territoryDistrict || userDistrict,
            territoryPincode: p.territoryPincode || userPincode
          }));
          const combined = [...mapped, ...localOnly];
          try {
            localStorage.setItem(userVisitsKey, JSON.stringify(combined));
          } catch (e) {}
          return combined;
        });
      }
    } catch (e) {
      console.log('Using local field visits state');
    }
  };

  useEffect(() => {
    fetchVisits();
  }, []);

  // Fetch live browser geolocation
  const handleFetchLocation = () => {
    setIsLocating(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLatitude(parseFloat(pos.coords.latitude.toFixed(6)));
          setLongitude(parseFloat(pos.coords.longitude.toFixed(6)));
          setIsLocating(false);
        },
        () => {
          setLatitude('');
          setLongitude('');
          setIsLocating(false);
        },
        { timeout: 8000 }
      );
    } else {
      setLatitude('');
      setLongitude('');
      setIsLocating(false);
    }
  };

  // Scoped visits based on role & assigned territory
  const scopedVisits = useMemo(() => {
    return visits.filter(v => {
      if (activeRole === 'pincode') {
        return v.territoryPincode === userPincode || v.visitedBy === userName;
      }
      if (activeRole === 'division') {
        return v.territoryDistrict === userDistrict || v.state === userState;
      }
      return true;
    });
  }, [visits, activeRole, userPincode, userDistrict, userState, userName]);

  // Filtered visits
  const filteredVisits = useMemo(() => {
    return scopedVisits.filter(v => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch = !q || (
        v.vendorName.toLowerCase().includes(q) ||
        v._id.toLowerCase().includes(q) ||
        v.storeAddress.toLowerCase().includes(q)
      );

      let matchesStatus = true;
      if (statusFilter !== 'all') {
        matchesStatus = v.status === statusFilter;
      }

      return matchesSearch && matchesStatus;
    });
  }, [scopedVisits, searchTerm, statusFilter]);

  const visitsTodayCount = scopedVisits.length;
  const completedVisitsCount = scopedVisits.filter(v => v.status === 'completed').length;
  const inProgressVisitsCount = scopedVisits.filter(v => v.status === 'in_progress' || v.status === 'started').length;
  const overdueVisitsCount = scopedVisits.filter(v => v.status === 'overdue').length;
  const complianceRate = visitsTodayCount > 0
    ? Math.round((completedVisitsCount / visitsTodayCount) * 100)
    : 100;

  const handleStartVisitSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorName.trim() || !storeAddress.trim() || !remarks) return;

    setIsSubmitting(true);
    const newVisit: FieldVisitRecord = {
      _id: `VIS-${Math.floor(10000 + Math.random() * 90000)}`,
      vendorId: `VEND-${Math.floor(1000 + Math.random() * 9000)}`,
      vendorName: vendorName.trim(),
      storeAddress: storeAddress.trim(),
      visitDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      visitTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'in_progress',
      latitude: Number(latitude) || 17.6868,
      longitude: Number(longitude) || 83.2185,
      remarks: remarks,
      visitedBy: userName,
      visitedByRole: `${activeRole.charAt(0).toUpperCase() + activeRole.slice(1)} Agent`,
      state: userState,
      territoryDistrict: userDistrict,
      territoryPincode: userPincode,
      photoBeforeVisit: gpsPhoto,
      visitPurpose: remarks
    };

    const updatedVisits = [newVisit, ...visits];
    setVisits(updatedVisits);
    try {
      localStorage.setItem(userVisitsKey, JSON.stringify(updatedVisits));
    } catch (e) {}

    setIsSubmitting(false);
    setIsStartModalOpen(false);

    // Prompt Check-Out modal directly for seamless Check-In -> Check-Out flow
    setSelectedVisitToComplete(newVisit);
  };

  const handleCompleteVisitSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVisitToComplete) return;

    setIsSubmitting(true);
    const checkoutTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setVisits(prev => {
      const updated = prev.map(v =>
        v._id === selectedVisitToComplete._id
          ? {
              ...v,
              status: 'completed' as const,
              remarks: completeRemarks.trim() || v.remarks,
              visitTime: `${v.visitTime || 'Checked-In'} → Checked-Out at ${checkoutTime}`
            }
          : v
      );
      try {
        localStorage.setItem(userVisitsKey, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    setSelectedVisitToComplete(null);
    setCompleteRemarks('');
    setIsSubmitting(false);
  };

  // Check Out handlers for Field Visit details drawer (Requirement 4)
  const handleOpenCheckoutModal = (visit: FieldVisitRecord) => {
    setCheckoutVisit(visit);
    setCheckoutOutcome(null);
    setNotInterestedReason('');
    setCustomReason('');
    setIsCheckoutModalOpen(true);
  };

  const handleInterestedSubmit = () => {
    if (!checkoutVisit) return;
    const checkoutTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setVisits(prev => {
      const updated = prev.map(v =>
        v._id === checkoutVisit._id
          ? {
              ...v,
              status: 'completed' as const,
              remarks: 'Interested - Proceeding to Vendor Onboarding',
              visitTime: `${v.visitTime || 'Checked-In'} → Checked-Out (Interested) at ${checkoutTime}`
            }
          : v
      );
      try {
        localStorage.setItem(userVisitsKey, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    setIsCheckoutModalOpen(false);
    setSelectedVisitDetails(null);
    navigate('/vendors');
  };

  const handleNotInterestedSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutVisit) return;

    const finalReason = notInterestedReason === 'Other'
      ? (customReason.trim() || 'Merchant not interested')
      : (notInterestedReason || 'Merchant not interested');

    const checkoutTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setVisits(prev => {
      const updated = prev.map(v =>
        v._id === checkoutVisit._id
          ? {
              ...v,
              status: 'completed' as const,
              remarks: `Not Interested: ${finalReason}`,
              visitTime: `${v.visitTime || 'Checked-In'} → Checked-Out (Not Interested) at ${checkoutTime}`
            }
          : v
      );
      try {
        localStorage.setItem(userVisitsKey, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    setIsCheckoutModalOpen(false);
    setSelectedVisitDetails(null);
  };

  // Printable PDF Export function
  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const rowsHtml = filteredVisits.map((v) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold; color: #864f19;">${v._id}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>${v.vendorName}</strong><br><small style="color: #666;">${v.storeAddress}</small></td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${v.visitedBy || userName} (${v.visitedByRole})</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${v.state || userState} • ${v.territoryDistrict || userDistrict} • ${v.territoryPincode || userPincode}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${v.latitude}, ${v.longitude}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${v.visitDate} ${v.visitTime || ''}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-transform: uppercase; font-weight: bold;">${v.status}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Field Visits Audit Report - Connect Agent Portal</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; color: #1b1c1c; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #864f19; padding-bottom: 12px; margin-bottom: 20px; }
            .title { font-size: 20px; font-weight: bold; color: #864f19; }
            .subtitle { font-size: 11px; color: #555; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th { background: #f6f3f2; padding: 8px; text-align: left; border-bottom: 2px solid #ddd; text-transform: uppercase; font-size: 10px; }
            .footer { margin-top: 30px; text-align: right; font-size: 10px; color: #888; border-top: 1px solid #ddd; padding-top: 8px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">CONNECT AGENT PORTAL — FIELD VISITS MONITORING</div>
              <div class="subtitle">Territory: ${userState} Region | Report Generated: ${new Date().toLocaleString()}</div>
            </div>
            <div>
              <strong>Total Audits: ${filteredVisits.length}</strong>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Visit ID</th>
                <th>Vendor Store</th>
                <th>Visited By</th>
                <th>Territory</th>
                <th>GPS</th>
                <th>Visit Date & Time</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <div class="footer">Confidential Field Visit Audit Document • Generated by ${userName}</div>
          <script>
            window.onload = function() { window.print(); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Distinct Filter options
  const districts = useMemo(() => Array.from(new Set(visits.map(v => v.territoryDistrict).filter(Boolean))), [visits]);
  const pincodes = useMemo(() => Array.from(new Set(visits.map(v => v.territoryPincode).filter(Boolean))), [visits]);
  const agents = useMemo(() => Array.from(new Set(visits.map(v => v.visitedBy).filter(Boolean))), [visits]);



  return (
    <div className="space-y-6 animate-fade-in text-[#1b1c1c] font-sans">
      
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-[16px] border border-[#eae8e7] shadow-sm gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-[#1b1c1c]">Field Visit Monitoring</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#864f19] text-white">
              ROLE: {activeRole.toUpperCase()} AGENT
            </span>
          </div>
          <p className="text-xs font-semibold text-[#52443a] mt-1 uppercase tracking-wider">
            MONITOR FIELD VISITS, VERIFY AGENT ACTIVITY, AND REVIEW MERCHANT AUDIT REPORTS ACROSS {userState.toUpperCase()}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleExportPDF}
            leftIcon={<FileText className="w-4 h-4 text-[#864f19]" />}
            className="py-2.5 px-4 font-bold rounded-xl cursor-pointer text-xs uppercase tracking-wider border-[#d7c3b5] hover:bg-[#f6f3f2]"
          >
            Export PDF
          </Button>

          <Button
            variant="primary"
            onClick={() => {
              handleFetchLocation();
              setIsStartModalOpen(true);
            }}
            leftIcon={<Plus className="w-4 h-4" />}
            className="py-2.5 px-4 font-bold rounded-xl cursor-pointer border-none text-xs uppercase tracking-wider shadow-sm transition bg-[#864f19] hover:bg-[#a3672f] text-white"
          >
            Assign Field Visit
          </Button>
        </div>
      </div>

      {/* KPI Cards Summary Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* KPI 1: Visits Today */}
        <div className="bg-white p-4 rounded-xl border border-[#eae8e7] shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[9px] font-bold text-[#52443a] uppercase tracking-wider block mb-1">FIELD VISITS TODAY</span>
            <span className="text-2xl font-black text-[#1b1c1c]">{visitsTodayCount}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Total visits today</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <MapPin className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 2: Completed */}
        <div className="bg-white p-4 rounded-xl border border-[#eae8e7] shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[9px] font-bold text-[#52443a] uppercase tracking-wider block mb-1">COMPLETED</span>
            <span className="text-2xl font-black text-emerald-700">{completedVisitsCount}</span>
            <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">Successfully completed</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 3: In Progress */}
        <div className="bg-white p-4 rounded-xl border border-[#eae8e7] shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[9px] font-bold text-[#52443a] uppercase tracking-wider block mb-1">IN PROGRESS</span>
            <span className="text-2xl font-black text-amber-700">{inProgressVisitsCount}</span>
            <span className="text-[10px] text-amber-600 font-semibold block mt-0.5">Visits in progress</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 4: Overdue */}
        <div className="bg-white p-4 rounded-xl border border-[#eae8e7] shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[9px] font-bold text-[#52443a] uppercase tracking-wider block mb-1">OVERDUE</span>
            <span className="text-2xl font-black text-rose-700">{overdueVisitsCount}</span>
            <span className="text-[10px] text-rose-600 font-semibold block mt-0.5">Overdue visits</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 5: Compliance */}
        <div className="bg-white p-4 rounded-xl border border-[#eae8e7] shadow-sm flex items-center justify-between col-span-2 md:col-span-1">
          <div>
            <span className="text-[9px] font-bold text-[#52443a] uppercase tracking-wider block mb-1">AGENT COMPLIANCE</span>
            <span className="text-2xl font-black text-[#864f19]">{complianceRate}%</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Average compliance</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-[#ffdcc2]/40 flex items-center justify-center text-[#864f19]">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Container with Sidebar Details Drawer Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* Left Column: Ledger Table */}
        <div className={`${selectedVisitDetails ? 'lg:col-span-8' : 'lg:col-span-12'} space-y-4 transition-all duration-300`}>

          {/* Search & Filter Controls Bar */}
          <div className="bg-white p-4 rounded-[16px] border border-[#eae8e7] shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="flex-1 relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by Vendor Name, ID, or Location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl text-xs text-[#1b1c1c] focus:outline-none focus:ring-1 focus:ring-[#864f19]"
                />
              </div>

              {/* Hide District, Pincode, and Agent filters for Pincode Agent */}
              {activeRole !== 'pincode' && (
                <>
                  <div className="w-full sm:w-40">
                    <select
                      value={districtFilter}
                      onChange={(e) => setDistrictFilter(e.target.value)}
                      className="w-full bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl py-2 px-3 text-xs text-[#1b1c1c] focus:outline-none focus:ring-1 focus:ring-[#864f19]"
                    >
                      <option value="all">All Districts</option>
                      {districts.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>

                  <div className="w-full sm:w-40">
                    <select
                      value={pincodeFilter}
                      onChange={(e) => setPincodeFilter(e.target.value)}
                      className="w-full bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl py-2 px-3 text-xs text-[#1b1c1c] focus:outline-none focus:ring-1 focus:ring-[#864f19]"
                    >
                      <option value="all">All Pincodes</option>
                      {pincodes.map(p => <option key={p} value={p}>PIN {p}</option>)}
                    </select>
                  </div>

                  <div className="w-full sm:w-40">
                    <select
                      value={agentFilter}
                      onChange={(e) => setAgentFilter(e.target.value)}
                      className="w-full bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl py-2 px-3 text-xs text-[#1b1c1c] focus:outline-none focus:ring-1 focus:ring-[#864f19]"
                    >
                      <option value="all">All Agents</option>
                      {agents.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                </>
              )}

              <div className="w-full sm:w-40">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl py-2 px-3 text-xs text-[#1b1c1c] focus:outline-none focus:ring-1 focus:ring-[#864f19]"
                >
                  <option value="all">All Statuses</option>
                  <option value="completed">Completed</option>
                  <option value="in_progress">In Progress</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>
            </div>

            <div className="flex justify-between items-center pt-1 border-t border-slate-100 text-xs">
              <span className="text-[11px] font-bold text-slate-500">
                Showing <strong className="text-[#1b1c1c]">{filteredVisits.length}</strong> of {visits.length} field visits
              </span>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setDistrictFilter('all');
                  setPincodeFilter('all');
                  setAgentFilter('all');
                  setStatusFilter('all');
                }}
                className="text-xs font-bold text-[#864f19] hover:underline flex items-center gap-1 bg-transparent border-none cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset Filters
              </button>
            </div>
          </div>

          {/* Field Visits History Ledger Table with Proper Alignments */}
          <Card>
            <CardHeader className="border-b border-[#eae8e7] pb-3">
              <CardTitle className="text-sm font-extrabold text-[#1b1c1c] flex items-center gap-2">
                <Store className="w-4.5 h-4.5 text-[#864f19]" /> Field Visits Ledger
              </CardTitle>
            </CardHeader>
            <CardBody className="p-0 overflow-x-auto">
              <table className="w-full border-collapse text-left align-middle">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-bold text-[#52443a] uppercase tracking-wider border-b border-slate-100">
                    <th className="py-3.5 px-4 text-left">Visit ID</th>
                    <th className="py-3.5 px-4 text-left">Vendor</th>
                    <th className="py-3.5 px-4 text-left">Visited By</th>
                    <th className="py-3.5 px-4 text-left">Territory</th>
                    <th className="py-3.5 px-4 text-left">GPS</th>
                    <th className="py-3.5 px-4 text-left">Visit Date</th>
                    <th className="py-3.5 px-4 text-left">Status</th>
                    <th className="py-3.5 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold">
                  {filteredVisits.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400 font-bold">
                        No field visit records match criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredVisits.map((v) => (
                      <tr key={v._id} className="hover:bg-[#fbf9f8] transition-colors">
                        <td className="py-3.5 px-4 font-bold text-[#864f19] align-middle">{v._id}</td>
                        <td className="py-3.5 px-4 align-middle">
                          <p className="font-extrabold text-[#1b1c1c]">{v.vendorName}</p>
                          <p className="text-[10px] text-slate-400 font-normal truncate max-w-[150px]">{v.storeAddress}</p>
                        </td>
                        <td className="py-3.5 px-4 align-middle">
                          <p className="font-extrabold text-[#1b1c1c]">{v.visitedBy || userName}</p>
                          <p className="text-[10px] text-slate-400 font-bold">{v.visitedByRole || `${activeRole.charAt(0).toUpperCase() + activeRole.slice(1)} Agent`}</p>
                        </td>
                        <td className="py-3.5 px-4 align-middle text-slate-600">
                          <p className="font-bold text-slate-800">{v.territoryDistrict || userDistrict}</p>
                          <p className="text-[10px] text-slate-400 font-medium">PIN: {v.territoryPincode || userPincode}</p>
                        </td>
                        <td className="py-3.5 px-4 align-middle text-slate-500 font-mono text-[11px]">
                          {v.latitude}, {v.longitude}
                        </td>
                        <td className="py-3.5 px-4 align-middle text-slate-600">
                          <p>{v.visitDate}</p>
                          {v.visitTime && <p className="text-[10px] text-slate-400 font-semibold">{v.visitTime}</p>}
                        </td>
                        <td className="py-3.5 px-4 align-middle">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase border ${
                            v.status === 'completed'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : v.status === 'in_progress' || v.status === 'started'
                              ? 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}>
                            {v.status === 'in_progress' ? 'In Progress' : v.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center align-middle">
                          <button
                            onClick={() => setSelectedVisitDetails(v)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-[#864f19] hover:text-white text-slate-700 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 mx-auto cursor-pointer border-none"
                          >
                            <Eye className="w-3.5 h-3.5" /> View Details
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </CardBody>
          </Card>
        </div>

        {/* Right Column: Field Visit Details Side Drawer */}
        {selectedVisitDetails && (
          <div className="lg:col-span-4 bg-white rounded-[16px] border border-[#eae8e7] shadow-lg p-5 space-y-5 animate-fade-in relative sticky top-6">
            
            {/* Drawer Header */}
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-[#1b1c1c]">Field Visit Details</h3>
                <span className="text-xs font-bold text-slate-400">{selectedVisitDetails._id}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase border ${
                  selectedVisitDetails.status === 'completed'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  {selectedVisitDetails.status}
                </span>
                <button
                  onClick={() => setSelectedVisitDetails(null)}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer border-none"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Vendor, Visited By, and Territory Details Panel */}
            <div className="space-y-3.5 text-xs font-semibold">
              {/* Vendor Name */}
              <div className="flex items-start gap-2.5 p-2.5 bg-[#fbf9f8] rounded-xl border border-slate-100">
                <Store className="w-4 h-4 text-[#864f19] shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">VENDOR</span>
                  <span className="font-extrabold text-[#1b1c1c] text-sm">{selectedVisitDetails.vendorName || 'Merchant Store'}</span>
                </div>
              </div>

              {/* Visited By */}
              <div className="flex items-start gap-2.5 p-2.5 bg-[#fbf9f8] rounded-xl border border-slate-100">
                <User className="w-4 h-4 text-[#864f19] shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">VISITED BY</span>
                  <span className="font-extrabold text-[#1b1c1c] text-sm block">{selectedVisitDetails.visitedBy || userName}</span>
                  <span className="text-[10px] text-[#864f19] font-black uppercase tracking-wider block mt-0.5">
                    {selectedVisitDetails.visitedByRole || `${activeRole.charAt(0).toUpperCase() + activeRole.slice(1)} Agent`}
                  </span>
                </div>
              </div>

              {/* Territory: State, District, Pincode */}
              <div className="flex items-start gap-2.5 p-2.5 bg-[#fbf9f8] rounded-xl border border-slate-100">
                <Building className="w-4 h-4 text-[#864f19] shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">TERRITORY</span>
                  <p className="text-slate-800">State: <strong className="text-[#1b1c1c]">{selectedVisitDetails.state || userState}</strong></p>
                  <p className="text-slate-800">District: <strong className="text-[#1b1c1c]">{selectedVisitDetails.territoryDistrict || userDistrict}</strong></p>
                  <p className="text-slate-800">Pincode: <strong className="text-[#1b1c1c]">{selectedVisitDetails.territoryPincode || userPincode}</strong></p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Calendar className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">VISIT DATE & TIME</span>
                  <span className="font-bold text-slate-800">{selectedVisitDetails.visitDate}{selectedVisitDetails.visitTime ? `, ${selectedVisitDetails.visitTime}` : ''}</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">VISIT PURPOSE</span>
                  <span className="font-bold text-slate-800">{selectedVisitDetails.visitPurpose || '—'}</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div className="w-full">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">GPS LOCATION</span>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="font-mono text-[11px] text-slate-700">{selectedVisitDetails.latitude}, {selectedVisitDetails.longitude}</span>
                    <button
                      onClick={() => window.open(`https://maps.google.com/?q=${selectedVisitDetails.latitude},${selectedVisitDetails.longitude}`, '_blank')}
                      className="text-[10px] font-bold text-[#864f19] hover:underline cursor-pointer border border-[#d7c3b5] px-2 py-0.5 rounded-md bg-transparent"
                    >
                      View on Map
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Store Photo Card */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">STORE PHOTO</span>
              <div className="relative rounded-xl overflow-hidden border border-slate-200 h-32 group bg-slate-100">
                {selectedVisitDetails.photoBeforeVisit ? (
                  <>
                    <img
                      src={selectedVisitDetails.photoBeforeVisit}
                      alt="Store Audit"
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                    <button
                      onClick={() => window.open(selectedVisitDetails.photoBeforeVisit!, '_blank')}
                      className="absolute bottom-2 right-2 px-2.5 py-1 bg-black/70 hover:bg-black text-white text-[10px] font-bold rounded-lg backdrop-blur-sm cursor-pointer border-none flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3" /> View Photo
                    </button>
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-slate-400">
                    <Camera className="w-8 h-8 opacity-40" />
                    <span className="text-[10px]">No photo available</span>
                  </div>
                )}
              </div>
            </div>

            {/* Audit Report PDF Section */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">AUDIT REPORT</span>
              <div className="p-3 bg-[#fbf9f8] rounded-xl border border-[#eae8e7] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#864f19]" />
                  <div>
                    <p className="font-extrabold text-slate-800 text-xs truncate max-w-[140px]">
                      KYC Audit Report - {selectedVisitDetails._id}.pdf
                    </p>
                    <p className="text-[10px] text-slate-400">Official Signed Audit Sheet</p>
                  </div>
                </div>
                <button
                  onClick={handleExportPDF}
                  className="px-2.5 py-1 bg-[#864f19] hover:bg-[#a3672f] text-white text-[10px] font-bold rounded-lg cursor-pointer border-none shadow-sm flex items-center gap-1"
                >
                  <Download className="w-3 h-3" /> Download PDF
                </button>
              </div>
            </div>

            <div className="pt-3 space-y-2 border-t border-slate-100">
              <button
                onClick={() => handleOpenCheckoutModal(selectedVisitDetails)}
                className="w-full py-2.5 bg-[#864f19] hover:bg-[#a3672f] text-white font-extrabold rounded-xl text-xs cursor-pointer border-none shadow flex items-center justify-center gap-2 uppercase tracking-wider transition"
              >
                <LogOut className="w-4 h-4" /> Check Out Field Visit
              </button>
              <button
                onClick={() => setSelectedVisitDetails(null)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer border-none"
              >
                Close
              </button>
            </div>

          </div>
        )}

      </div>

      {/* MODAL: Start New Field Visit */}
      <Modal
        isOpen={isStartModalOpen}
        onClose={() => setIsStartModalOpen(false)}
        title="Start New Store Visit"
        size="full"
      >
        <form onSubmit={handleStartVisitSubmit} className="space-y-4 text-xs font-semibold">
          <div className="space-y-1">
            <label className="block text-[#52443a] uppercase text-[10px] font-bold">Merchant Store Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Metro Mart & Groceries"
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
              className="w-full bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl py-2 px-3 focus:outline-none focus:ring-1 focus:ring-[#864f19]"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[#52443a] uppercase text-[10px] font-bold">Full Store Address *</label>
            <textarea
              required
              rows={2}
              placeholder="Shop number, street, landmark, area pincode..."
              value={storeAddress}
              onChange={(e) => setStoreAddress(e.target.value)}
              className="w-full bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl py-2 px-3 focus:outline-none focus:ring-1 focus:ring-[#864f19] resize-none"
            />
          </div>

          <div className="p-3.5 bg-[#fbf9f8] rounded-xl border border-[#eae8e7] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#52443a] uppercase tracking-wider flex items-center gap-1">
                <Camera className="w-3.5 h-3.5 text-[#864f19]" /> Geotagged Store Photo & GPS *
              </span>
              <button
                type="button"
                onClick={handleFetchLocation}
                disabled={isLocating}
                className="text-[#864f19] font-bold hover:underline text-[10px] flex items-center gap-1 cursor-pointer bg-transparent border-none"
              >
                <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
                {isLocating ? 'Locating...' : 'Refresh GPS'}
              </button>
            </div>

            <div className="relative rounded-xl overflow-hidden border border-[#d7c3b5]/60 bg-slate-100 group min-h-[140px] flex items-center justify-center">
              {gpsPhoto ? (
                <img
                  src={gpsPhoto}
                  alt="Geotagged Store Front"
                  className="w-full h-40 object-cover rounded-xl"
                />
              ) : (
                <div className="w-full py-8 flex flex-col items-center justify-center gap-1 text-slate-400">
                  <Camera className="w-8 h-8 opacity-40 text-[#864f19]" />
                  <span className="text-xs font-bold text-slate-500">No store photo uploaded</span>
                </div>
              )}

              {/* Single GPS Status Badge */}
              <div className="absolute top-2 left-2 z-10">
                {latitude && longitude ? (
                  <span className="bg-emerald-600/90 backdrop-blur-sm text-white px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow">
                    <CheckCircle2 className="w-3 h-3 text-white" />
                    GPS Captured ({latitude.toString().slice(0, 7)}, {longitude.toString().slice(0, 7)} • Acc: ±10m)
                  </span>
                ) : (
                  <span className="bg-slate-800/80 backdrop-blur-sm text-amber-300 px-2.5 py-1 rounded-lg text-[10px] font-extrabold flex items-center gap-1 border border-white/10">
                    <MapPin className="w-3 h-3 text-amber-400" />
                    GPS not yet captured
                  </span>
                )}
              </div>

              <label className="absolute bottom-2 right-2 z-10 bg-white hover:bg-slate-50 text-slate-800 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer border border-slate-300 flex items-center gap-1.5 shadow transition">
                <Camera className="w-3.5 h-3.5 text-[#864f19]" />
                <span>{gpsPhoto ? 'Change Photo' : 'Upload Store Photo'}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        if (ev.target?.result) setGpsPhoto(ev.target.result as string);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </label>
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-[#52443a] uppercase text-[10px] font-bold">Visit Purpose *</label>
            <select
              required
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl py-2 px-3 text-xs text-[#1b1c1c] focus:outline-none focus:ring-1 focus:ring-[#864f19]"
            >
              <option value="">-- Select Visit Purpose --</option>
              <option value="KYC Verification">KYC Verification</option>
              <option value="Vendor Onboarding">Vendor Onboarding</option>
              <option value="Document Verification">Document Verification</option>
              <option value="Routine Visit">Routine Visit</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#eae8e7]">
            <Button variant="outline" type="button" onClick={() => setIsStartModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={isSubmitting} className="bg-[#864f19] text-white font-bold">
              {isSubmitting ? 'Starting...' : 'Check-In & Start Visit'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Active Visit Check-Out */}
      <Modal
        isOpen={!!selectedVisitToComplete}
        onClose={() => setSelectedVisitToComplete(null)}
        title="Active Store Visit — Check-Out"
        size="md"
      >
        {selectedVisitToComplete && (
          <form onSubmit={handleCompleteVisitSubmit} className="space-y-4 text-xs font-semibold">
            <div className="p-3.5 bg-amber-50 rounded-xl space-y-1 border border-amber-200">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-amber-800 uppercase tracking-wider">ACTIVE VISIT IN PROGRESS</span>
                <span className="text-[10px] font-bold text-amber-700">Check-In: {selectedVisitToComplete.visitTime}</span>
              </div>
              <p className="font-extrabold text-slate-800 text-sm">{selectedVisitToComplete.vendorName}</p>
              <p className="text-slate-600 text-[11px]">{selectedVisitToComplete.storeAddress}</p>
              <p className="text-slate-600 text-[11px]">Purpose: <strong>{selectedVisitToComplete.visitPurpose}</strong></p>
            </div>

            <div className="space-y-1">
              <label className="block text-[#52443a] uppercase text-[10px] font-bold">Checkout Notes & Audit Findings *</label>
              <textarea
                required
                rows={3}
                placeholder="Record outcome of audit, merchant feedback, or onboarding status..."
                value={completeRemarks}
                onChange={(e) => setCompleteRemarks(e.target.value)}
                className="w-full bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl py-2 px-3 focus:outline-none focus:ring-1 focus:ring-[#864f19] resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#eae8e7]">
              <Button variant="outline" type="button" onClick={() => setSelectedVisitToComplete(null)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold border-none">
                {isSubmitting ? 'Saving...' : 'Finalize Visit'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* MODAL: Check Out Flow (Interested / Not Interested - Requirement 4) */}
      <Modal
        isOpen={isCheckoutModalOpen}
        onClose={() => setIsCheckoutModalOpen(false)}
        title="Field Visit Check-Out"
        size="md"
      >
        {checkoutVisit && (
          <div className="space-y-5 font-sans text-xs">
            <div className="p-3.5 bg-[#fbf9f8] rounded-2xl border border-[#eae8e7] space-y-1">
              <span className="text-[10px] text-[#864f19] font-black uppercase tracking-wider block">STORE VISIT DETAILS</span>
              <p className="font-extrabold text-[#1b1c1c] text-sm">{checkoutVisit.vendorName}</p>
              <p className="text-slate-500 text-xs font-medium">{checkoutVisit.storeAddress}</p>
            </div>

            {!checkoutOutcome ? (
              <div className="space-y-4">
                <p className="text-xs font-bold text-slate-700 text-center uppercase tracking-wider">
                  Is the merchant interested in onboarding?
                </p>

                <div className="grid grid-cols-2 gap-4">
                  {/* Interested Option */}
                  <button
                    type="button"
                    onClick={handleInterestedSubmit}
                    className="p-5 rounded-2xl border-2 border-emerald-500/40 bg-emerald-50/50 hover:bg-emerald-100/70 hover:border-emerald-600 transition text-center cursor-pointer space-y-2 group"
                  >
                    <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto shadow group-hover:scale-110 transition">
                      <ThumbsUp className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-black text-emerald-900 text-sm uppercase tracking-wide">Interested</p>
                      <p className="text-[10px] text-emerald-700 font-semibold mt-0.5">Proceed to Vendor Onboarding</p>
                    </div>
                  </button>

                  {/* Not Interested Option */}
                  <button
                    type="button"
                    onClick={() => setCheckoutOutcome('not_interested')}
                    className="p-5 rounded-2xl border-2 border-rose-400/40 bg-rose-50/50 hover:bg-rose-100/70 hover:border-rose-500 transition text-center cursor-pointer space-y-2 group"
                  >
                    <div className="w-10 h-10 rounded-full bg-rose-600 text-white flex items-center justify-center mx-auto shadow group-hover:scale-110 transition">
                      <ThumbsDown className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-black text-rose-900 text-sm uppercase tracking-wide">Not Interested</p>
                      <p className="text-[10px] text-rose-700 font-semibold mt-0.5">Record Reason & Complete</p>
                    </div>
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleNotInterestedSubmit} className="space-y-4 font-semibold">
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
                  <p className="text-xs font-black text-rose-900 uppercase">Merchant Status: Not Interested</p>
                  <p className="text-[11px] text-rose-700 font-medium mt-0.5">Please specify the reason for declining onboarding.</p>
                </div>

                <div className="space-y-1">
                  <label className="block text-[#52443a] uppercase text-[10px] font-bold">Reason for Rejection / Decline *</label>
                  <select
                    required
                    value={notInterestedReason}
                    onChange={(e) => setNotInterestedReason(e.target.value)}
                    className="w-full bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl py-2.5 px-3 focus:outline-none focus:ring-1 focus:ring-[#864f19]"
                  >
                    <option value="">-- Select Reason --</option>
                    <option value="Not interested in digital onboarding">Not interested in digital onboarding</option>
                    <option value="High commission or subscription fee concerns">High commission / fee concerns</option>
                    <option value="Already using competitor POS platform">Already using competitor platform</option>
                    <option value="Lack of smartphone or technical literacy">No smartphone / technical literacy</option>
                    <option value="Business owner unavailable / absent">Business owner unavailable</option>
                    <option value="Other">Other (Custom Reason)</option>
                  </select>
                </div>

                {notInterestedReason === 'Other' && (
                  <div className="space-y-1">
                    <label className="block text-[#52443a] uppercase text-[10px] font-bold">Custom Reason Remarks *</label>
                    <textarea
                      required
                      rows={3}
                      placeholder="Enter detailed reason..."
                      value={customReason}
                      onChange={(e) => setCustomReason(e.target.value)}
                      className="w-full bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl py-2 px-3 focus:outline-none focus:ring-1 focus:ring-[#864f19] resize-none"
                    />
                  </div>
                )}

                <div className="flex justify-between items-center pt-3 border-t border-[#eae8e7]">
                  <button
                    type="button"
                    onClick={() => setCheckoutOutcome(null)}
                    className="text-xs font-bold text-slate-500 hover:text-slate-700 cursor-pointer bg-transparent border-none"
                  >
                    ← Back
                  </button>
                  <Button variant="primary" type="submit" className="bg-rose-600 hover:bg-rose-700 text-white font-bold border-none">
                    Save Reason & Complete
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}
      </Modal>

    </div>
  );
};

export default FieldVisitsModule;
