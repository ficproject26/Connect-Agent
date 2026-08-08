import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardBody, Button, Modal } from '../../components/ui';
import {
  MapPin, Navigation, Camera, CheckCircle2, Clock, Plus, Search, Store,
  AlertCircle, ArrowRight, Download, FileText, Printer, User, Filter, RotateCcw,
  Building, Calendar, ShieldCheck, X, Eye
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
  territoryDistrict: string;
  territoryPincode: string;
  photoBeforeVisit?: string;
  photoAfterVisit?: string;
  visitPurpose?: string;
}

export const FieldVisitsModule: React.FC = () => {
  const { user } = useAuth();
  const activeRole = (user?.role as string) || 'state';
  const userState = user?.territory?.state || 'Karnataka';

  const defaultVisits: FieldVisitRecord[] = [
    {
      _id: 'VIS-5321',
      vendorId: 'VEND-501',
      vendorName: 'cxghjk',
      storeAddress: 'cxvghjkl;kghfd',
      visitDate: '06 Aug 2026',
      visitTime: '11:45 AM',
      status: 'completed',
      latitude: 12.9716,
      longitude: 77.5946,
      visitedBy: 'Dhanu',
      visitedByRole: 'Pincode Agent',
      territoryDistrict: 'Bengaluru Urban',
      territoryPincode: '560096',
      remarks: 'KYC Audit & QR Code Onboarding completed successfully',
      visitPurpose: 'KYC Audit & QR Code Onboarding'
    },
    {
      _id: 'VIS-5319',
      vendorId: 'VEND-502',
      vendorName: 'Shree Provisions',
      storeAddress: 'Shop #4, Main Market, Bengaluru Urban, TN 560045',
      visitDate: '06 Aug 2026',
      visitTime: '10:30 AM',
      status: 'completed',
      latitude: 12.9508,
      longitude: 77.6101,
      visitedBy: 'Mano',
      visitedByRole: 'Pincode Agent',
      territoryDistrict: 'Bengaluru Urban',
      territoryPincode: '560045',
      remarks: 'Merchant agreement signed and store poster installed',
      visitPurpose: 'Merchant Agreement & Branding'
    },
    {
      _id: 'VIS-5318',
      vendorId: 'VEND-503',
      vendorName: 'Daily Needs Mart',
      storeAddress: 'Plot #18, High Street, Tumakuru 572101',
      visitDate: '06 Aug 2026',
      visitTime: '10:05 AM',
      status: 'in_progress',
      latitude: 13.3389,
      longitude: 77.1017,
      visitedBy: 'Arun',
      visitedByRole: 'District Agent',
      territoryDistrict: 'Tumakuru',
      territoryPincode: '572101',
      remarks: 'Stock verification and POS terminal installation in progress',
      visitPurpose: 'POS Terminal Setup'
    },
    {
      _id: 'VIS-5317',
      vendorId: 'VEND-504',
      vendorName: 'Krishna Stores',
      storeAddress: 'Near Bus Stand, Mysuru 570017',
      visitDate: '06 Aug 2026',
      visitTime: '09:20 AM',
      status: 'in_progress',
      latitude: 12.2958,
      longitude: 76.6394,
      visitedBy: 'Priya',
      visitedByRole: 'Pincode Agent',
      territoryDistrict: 'Mysuru',
      territoryPincode: '570017',
      remarks: 'Aadhaar document OCR re-verification',
      visitPurpose: 'Document Dispute Audit'
    },
    {
      _id: 'VIS-5316',
      vendorId: 'VEND-505',
      vendorName: 'Ramesh Traders',
      storeAddress: 'Station Road, Dharwad 580001',
      visitDate: '06 Aug 2026',
      visitTime: '09:10 AM',
      status: 'overdue',
      latitude: 15.4589,
      longitude: 75.0078,
      visitedBy: 'Savitha',
      visitedByRole: 'District Agent',
      territoryDistrict: 'Dharwad',
      territoryPincode: '580001',
      remarks: 'Follow up pending for merchant bank account update',
      visitPurpose: 'Bank Details Verification'
    },
    {
      _id: 'VIS-5315',
      vendorId: 'VEND-506',
      vendorName: 'Lakshmi Supermart',
      storeAddress: 'Nehru Chowk, Belagavi 590001',
      visitDate: '06 Aug 2026',
      visitTime: '08:50 AM',
      status: 'completed',
      latitude: 15.8497,
      longitude: 74.4977,
      visitedBy: 'Rakesh',
      visitedByRole: 'Pincode Agent',
      territoryDistrict: 'Belagavi',
      territoryPincode: '590001',
      remarks: 'Store verification completed and active status enabled',
      visitPurpose: 'Store Verification'
    }
  ];

  const [visits, setVisits] = useState<FieldVisitRecord[]>(() => {
    try {
      const saved = localStorage.getItem('connect_portal_field_visits');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error loading custom field visits:', e);
    }
    return defaultVisits;
  });

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

  // Start Form State
  const [vendorName, setVendorName] = useState('');
  const [storeAddress, setStoreAddress] = useState('');
  const [latitude, setLatitude] = useState<number | ''>('');
  const [longitude, setLongitude] = useState<number | ''>('');
  const [remarks, setRemarks] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [gpsPhoto, setGpsPhoto] = useState<string>('https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=400&q=80');

  // Complete Form State
  const [completeRemarks, setCompleteRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load visits from API or merge
  const fetchVisits = async () => {
    try {
      const res = await api.get('/field-visits');
      const backendVisits = res.data.visits || [];
      if (backendVisits.length > 0) {
        const mapped: FieldVisitRecord[] = backendVisits.map((v: any) => ({
          _id: v._id,
          vendorId: v.vendor?._id || 'VEND-REF',
          vendorName: v.vendor?.storeName || 'Merchant Store',
          storeAddress: v.vendor?.address || 'Territory Address',
          visitDate: new Date(v.visitDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
          visitTime: new Date(v.visitDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: v.status === 'started' ? 'in_progress' : v.status,
          latitude: v.checkInLocation?.latitude || 12.9716,
          longitude: v.checkInLocation?.longitude || 77.5946,
          remarks: v.remarks || 'Field audit visit',
          visitedBy: v.agent?.name || 'Pincode Agent',
          visitedByRole: v.agent?.role ? `${v.agent.role.charAt(0).toUpperCase() + v.agent.role.slice(1)} Agent` : 'Agent',
          territoryDistrict: v.vendor?.district || 'Bengaluru Urban',
          territoryPincode: v.vendor?.pincode || '560096',
          visitPurpose: 'Store KYC Audit & QR Onboarding'
        }));

        setVisits(prev => {
          const apiIds = new Set(mapped.map(m => m._id));
          const localOnly = prev.filter(p => !apiIds.has(p._id));
          const combined = [...mapped, ...localOnly];
          try {
            localStorage.setItem('connect_portal_field_visits', JSON.stringify(combined));
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
          setLatitude(12.9716);
          setLongitude(77.5946);
          setIsLocating(false);
        },
        { timeout: 8000 }
      );
    } else {
      setLatitude(12.9716);
      setLongitude(77.5946);
      setIsLocating(false);
    }
  };

  const handleStartVisitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorName || !storeAddress) return;

    setIsSubmitting(true);
    const newVisit: FieldVisitRecord = {
      _id: `VIS-${Math.floor(1000 + Math.random() * 9000)}`,
      vendorId: `VEND-${Math.floor(100 + Math.random() * 900)}`,
      vendorName,
      storeAddress,
      visitDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      visitTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'in_progress',
      latitude: typeof latitude === 'number' ? latitude : 12.9716,
      longitude: typeof longitude === 'number' ? longitude : 77.5946,
      remarks: remarks || 'Store audit & KYC visit check-in',
      visitedBy: user?.name || 'Logged Agent',
      visitedByRole: `${activeRole.charAt(0).toUpperCase() + activeRole.slice(1)} Agent`,
      territoryDistrict: user?.territory?.district || 'Bengaluru Urban',
      territoryPincode: user?.territory?.pincode || '560096',
      visitPurpose: remarks || 'KYC Audit & QR Code Onboarding'
    };

    try {
      await api.post('/field-visits/start', {
        vendorId: newVisit.vendorId,
        latitude: newVisit.latitude,
        longitude: newVisit.longitude,
        photoBeforeVisit: gpsPhoto || 'https://via.placeholder.com/300'
      });
    } catch (e) {
      console.log('Simulated local visit creation');
    }

    setVisits(prev => {
      const updated = [newVisit, ...prev];
      try {
        localStorage.setItem('connect_portal_field_visits', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    setIsStartModalOpen(false);
    setIsSubmitting(false);
    setVendorName('');
    setStoreAddress('');
    setRemarks('');
  };

  const handleCompleteVisitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVisitToComplete) return;

    setIsSubmitting(true);
    try {
      await api.post(`/field-visits/${selectedVisitToComplete._id}/complete`, {
        remarks: completeRemarks || 'Completed store visit audit',
        latitude: selectedVisitToComplete.latitude,
        longitude: selectedVisitToComplete.longitude
      });
    } catch (e) {
      console.log('Simulated visit completion');
    }

    setVisits(prev => {
      const updated = prev.map(v =>
        v._id === selectedVisitToComplete._id
          ? { ...v, status: 'completed' as const, remarks: completeRemarks || v.remarks }
          : v
      );
      try {
        localStorage.setItem('connect_portal_field_visits', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    setSelectedVisitToComplete(null);
    setCompleteRemarks('');
    setIsSubmitting(false);
  };

  // Printable PDF Export function
  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const rowsHtml = filteredVisits.map((v, i) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold; color: #864f19;">${v._id}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>${v.vendorName}</strong><br><small style="color: #666;">${v.storeAddress}</small></td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${v.visitedBy} (${v.visitedByRole})</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${v.territoryDistrict} • ${v.territoryPincode}</td>
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
          <div class="footer">Confidential Field Visit Audit Document • Generated by ${user?.name || 'Agent'}</div>
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

  // Filtered visits list
  const filteredVisits = useMemo(() => {
    return visits.filter(v => {
      const matchesSearch = v.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            v.storeAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            v._id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            v.visitedBy.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || v.status === statusFilter;
      const matchesDistrict = districtFilter === 'all' || v.territoryDistrict === districtFilter;
      const matchesPincode = pincodeFilter === 'all' || v.territoryPincode === pincodeFilter;
      const matchesAgent = agentFilter === 'all' || v.visitedBy === agentFilter;
      return matchesSearch && matchesStatus && matchesDistrict && matchesPincode && matchesAgent;
    });
  }, [visits, searchTerm, statusFilter, districtFilter, pincodeFilter, agentFilter]);

  // KPI Metrics Calculation
  const totalVisitsCount = visits.length;
  const completedCount = visits.filter(v => v.status === 'completed').length;
  const inProgressCount = visits.filter(v => v.status === 'in_progress' || v.status === 'started').length;
  const overdueCount = visits.filter(v => v.status === 'overdue').length;
  const complianceRate = totalVisitsCount > 0 ? Math.round((completedCount / totalVisitsCount) * 100) : 86;

  const activeVisit = visits.find(v => v.status === 'started' || v.status === 'in_progress');

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

      {/* KPI Cards Summary Grid (Matching Screenshot 10) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* KPI 1: Visits Today */}
        <div className="bg-white p-4 rounded-xl border border-[#eae8e7] shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[9px] font-bold text-[#52443a] uppercase tracking-wider block mb-1">FIELD VISITS TODAY</span>
            <span className="text-2xl font-black text-[#1b1c1c]">{totalVisitsCount}</span>
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
            <span className="text-2xl font-black text-emerald-700">{completedCount}</span>
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
            <span className="text-2xl font-black text-amber-700">{inProgressCount}</span>
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
            <span className="text-2xl font-black text-rose-700">{overdueCount}</span>
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
            <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
              <div className="md:col-span-2 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by Vendor Name, ID, or Location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl text-xs text-[#1b1c1c] focus:outline-none focus:ring-1 focus:ring-[#864f19]"
                />
              </div>

              <div>
                <select
                  value={districtFilter}
                  onChange={(e) => setDistrictFilter(e.target.value)}
                  className="w-full bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl py-2 px-3 text-xs text-[#1b1c1c] focus:outline-none focus:ring-1 focus:ring-[#864f19]"
                >
                  <option value="all">All Districts</option>
                  {districts.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div>
                <select
                  value={pincodeFilter}
                  onChange={(e) => setPincodeFilter(e.target.value)}
                  className="w-full bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl py-2 px-3 text-xs text-[#1b1c1c] focus:outline-none focus:ring-1 focus:ring-[#864f19]"
                >
                  <option value="all">All Pincodes</option>
                  {pincodes.map(p => <option key={p} value={p}>PIN {p}</option>)}
                </select>
              </div>

              <div>
                <select
                  value={agentFilter}
                  onChange={(e) => setAgentFilter(e.target.value)}
                  className="w-full bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl py-2 px-3 text-xs text-[#1b1c1c] focus:outline-none focus:ring-1 focus:ring-[#864f19]"
                >
                  <option value="all">All Agents</option>
                  {agents.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>

              <div>
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

          {/* Field Visits History Ledger Table */}
          <Card>
            <CardHeader className="border-b border-[#eae8e7] pb-3">
              <CardTitle className="text-sm font-extrabold text-[#1b1c1c] flex items-center gap-2">
                <Store className="w-4.5 h-4.5 text-[#864f19]" /> Field Visits Ledger
              </CardTitle>
            </CardHeader>
            <CardBody className="p-0 overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-bold text-[#52443a] uppercase tracking-wider border-b border-slate-100">
                    <th className="py-3.5 px-4">Visit ID</th>
                    <th className="py-3.5 px-4">Vendor</th>
                    <th className="py-3.5 px-4">Visited By</th>
                    <th className="py-3.5 px-4">Territory</th>
                    <th className="py-3.5 px-4">GPS</th>
                    <th className="py-3.5 px-4">Visit Date</th>
                    <th className="py-3.5 px-4">Status</th>
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
                        <td className="py-3.5 px-4 font-bold text-[#864f19]">{v._id}</td>
                        <td className="py-3.5 px-4 font-bold text-[#1b1c1c]">{v.vendorName}</td>
                        <td className="py-3.5 px-4">
                          <p className="font-extrabold text-[#1b1c1c]">{v.visitedBy}</p>
                          <p className="text-[10px] text-slate-400 font-bold">{v.visitedByRole}</p>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          <p className="font-bold text-slate-800">{v.territoryDistrict}</p>
                          <p className="text-[10px] text-slate-400 font-medium">{v.territoryPincode}</p>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                          {v.latitude}, {v.longitude}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          <p>{v.visitDate}</p>
                          {v.visitTime && <p className="text-[10px] text-slate-400 font-semibold">{v.visitTime}</p>}
                        </td>
                        <td className="py-3.5 px-4">
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
                        <td className="py-3.5 px-4 text-center">
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

        {/* Right Column: Field Visit Details Side Drawer (Matching Screenshot 10) */}
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

            {/* Vendor & Visited By Details */}
            <div className="space-y-3 text-xs font-semibold">
              <div className="flex items-start gap-2">
                <Store className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">VENDOR</span>
                  <span className="font-extrabold text-slate-800 text-sm">{selectedVisitDetails.vendorName}</span>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <User className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">VISITED BY</span>
                  <span className="font-extrabold text-slate-800">{selectedVisitDetails.visitedBy}</span>
                  <span className="text-[10px] text-slate-400 font-bold block">{selectedVisitDetails.visitedByRole}</span>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Building className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">TERRITORY</span>
                  <span className="text-slate-600 block">State: {userState}</span>
                  <span className="text-slate-600 block">District: {selectedVisitDetails.territoryDistrict}</span>
                  <span className="text-slate-600 block">Pincode: {selectedVisitDetails.territoryPincode}</span>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Calendar className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">VISIT DATE & TIME</span>
                  <span className="font-bold text-slate-800">{selectedVisitDetails.visitDate}, {selectedVisitDetails.visitTime || '11:45 AM'}</span>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">VISIT PURPOSE</span>
                  <span className="font-bold text-slate-800">{selectedVisitDetails.visitPurpose || 'KYC Audit & QR Code Onboarding'}</span>
                </div>
              </div>

              <div className="flex items-start gap-2">
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
                <img
                  src={selectedVisitDetails.photoBeforeVisit || 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=400&q=80'}
                  alt="Store Audit"
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                />
                <button
                  onClick={() => window.open(selectedVisitDetails.photoBeforeVisit || 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=400&q=80', '_blank')}
                  className="absolute bottom-2 right-2 px-2.5 py-1 bg-black/70 hover:bg-black text-white text-[10px] font-bold rounded-lg backdrop-blur-sm cursor-pointer border-none flex items-center gap-1"
                >
                  <Eye className="w-3 h-3" /> View Photo
                </button>
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

            <div className="pt-2">
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
        size="md"
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

          <div className="p-3 bg-[#fbf9f8] rounded-xl border border-[#eae8e7] space-y-2.5">
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

            <div className="relative rounded-xl overflow-hidden border border-[#d7c3b5]/60 bg-slate-900 group h-32">
              <img
                src={gpsPhoto}
                alt="Geotagged Store Front"
                className="w-full h-full object-cover opacity-85 group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute top-2 left-2 bg-black/75 backdrop-blur-sm text-white px-2 py-1 rounded-lg text-[9px] font-extrabold flex items-center gap-1 border border-white/20">
                <MapPin className="w-3 h-3 text-amber-400" />
                <span>Lat: {latitude || '12.9716'}, Lng: {longitude || '77.5946'}</span>
              </div>
              <div className="absolute bottom-2 left-2 bg-emerald-600/90 text-white px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider flex items-center gap-1 shadow">
                <CheckCircle2 className="w-3 h-3" /> Geotagged Photo Captured
              </div>
              <label className="absolute bottom-2 right-2 bg-white/90 hover:bg-white text-slate-800 px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer border border-slate-200 flex items-center gap-1 shadow transition">
                <Camera className="w-3 h-3 text-[#864f19]" />
                <span>Upload Photo</span>
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
            <label className="block text-[#52443a] uppercase text-[10px] font-bold">Visit Purpose</label>
            <input
              type="text"
              placeholder="e.g. KYC audit & QR code onboarding"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl py-2 px-3 focus:outline-none focus:ring-1 focus:ring-[#864f19]"
            />
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

      {/* MODAL: Complete Field Visit */}
      <Modal
        isOpen={!!selectedVisitToComplete}
        onClose={() => setSelectedVisitToComplete(null)}
        title="Complete Field Visit"
        size="md"
      >
        {selectedVisitToComplete && (
          <form onSubmit={handleCompleteVisitSubmit} className="space-y-4 text-xs font-semibold">
            <div className="p-3 bg-slate-50 rounded-xl space-y-1 border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Target Merchant</span>
              <p className="font-bold text-slate-800 text-sm">{selectedVisitToComplete.vendorName}</p>
              <p className="text-slate-500 text-[11px]">{selectedVisitToComplete.storeAddress}</p>
            </div>

            <div className="space-y-1">
              <label className="block text-[#52443a] uppercase text-[10px] font-bold">Completion Notes & Findings *</label>
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

    </div>
  );
};

export default FieldVisitsModule;
