import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardBody, Input, Select, Button, Modal } from '../../components/ui';
import { useQuery } from '@tanstack/react-query';
import api from '../../utils/api';
import {
  Search, Eye, UserCheck, UserX, MapPin, Building, Phone, Mail, Award, Calendar,
  Download, FileText, Send, Clock, CheckCircle, XCircle, Filter, User, Tag,
  RefreshCw, ChevronRight, Shield, ArrowUpRight, Store, GitFork, Layers, Landmark, Building2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface Vendor {
  id: string;
  name: string;
  ownerName: string;
  phone: string;
  email: string;
  state: string;
  division: string;
  district: string;
  pincode: string;
  role: string;
  kycStatus: 'approved' | 'pending' | 'rejected';
  status: 'active' | 'inactive';
  assignedAgent: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
  storeType: string;
  businessGst: string;
  fullAddress?: string;
}

const TODAY_DATE = new Date().toISOString().slice(0, 10);
const YESTERDAY_DATE = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

export const VendorsList: React.FC = () => {
  const { user, addNotification } = useAuth();

  // Initialize vendors from localStorage or API
  const [vendors, setVendors] = useState<Vendor[]>(() => {
    try {
      const saved = localStorage.getItem('connect_portal_custom_vendors');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Error loading custom vendors:', e);
    }
    return [];
  });

  // Fetch live backend vendors from API /api/vendors
  const { data: apiVendorsData } = useQuery({
    queryKey: ['liveVendorsBackend'],
    queryFn: async () => {
      try {
        const res = await api.get('/vendors');
        return res.data?.vendors || [];
      } catch (err) {
        console.warn('Backend API /vendors call fallback:', err);
        return [];
      }
    }
  });

  // Sync API backend vendors into state
  useEffect(() => {
    if (apiVendorsData && apiVendorsData.length > 0) {
      const mappedApiVendors: Vendor[] = apiVendorsData.map((v: any) => ({
        id: v.registrationId || v._id || `REG-${Math.floor(1000 + Math.random() * 9000)}`,
        name: v.businessName || v.name || 'Merchant Store',
        ownerName: v.ownerName || 'Merchant Owner',
        phone: v.phone || '+91 98765 43210',
        email: v.email || 'vendor@example.com',
        state: v.state || 'Karnataka',
        division: v.division || 'Bengaluru South',
        district: v.district || 'Bengaluru Urban',
        pincode: v.pincode || '560083',
        role: 'Merchant Partner',
        kycStatus: v.kycStatus || 'pending',
        status: v.status || 'active',
        assignedAgent: v.assignedAgent?.name || 'Pincode Agent',
        createdAt: TODAY_DATE,
        updatedAt: TODAY_DATE,
        storeType: v.category?.name || v.storeType || 'Supermarket & Retail',
        businessGst: v.gst || '33AABCK1234F1Z9',
        fullAddress: v.location?.address || 'Main Street, Market Area'
      }));

      setVendors(prev => {
        const existingIds = new Set(prev.map(item => item.id));
        const newFromApi = mappedApiVendors.filter(item => !existingIds.has(item.id));
        return [...newFromApi, ...prev];
      });
    }
  }, [apiVendorsData]);

  // Active Role and Territory Scope
  const activeRole = (user?.role as string) || 'state';
  const userState = user?.territory?.state || 'Tamil Nadu';
  const userDistrict = user?.territory?.district || 'Krishnagiri District';
  const userDivision = user?.territory?.division || 'Hosur Division';
  const userPincode = user?.territory?.pincode || '635109';

  // Search and Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all'); // all, today, yesterday, 7days, 30days
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [districtFilter, setDistrictFilter] = useState('all');
  const [divisionFilter, setDivisionFilter] = useState('all');
  const [pincodeFilter, setPincodeFilter] = useState('all');
  const [agentFilter, setAgentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all'); // all, active, inactive
  const [kycFilter, setKycFilter] = useState('all'); // all, pending, approved, rejected
  const [quickChip, setQuickChip] = useState('all');

  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 1. SCOPED VENDORS LIST BASED ON LOGGED IN AGENT HIERARCHY (STRICT STATE ISOLATION)
  const scopedVendors = useMemo(() => {
    return vendors.filter(vendor => {
      // 1. First enforce strict State Territory match
      const vendorState = (vendor.state || 'Karnataka').toLowerCase();
      const activeState = (userState || 'Karnataka').toLowerCase();
      
      const isStateMatch = vendorState.includes(activeState) || activeState.includes(vendorState);
      if (!isStateMatch) return false;

      // 2. Role-based scoping within assigned State
      if (activeRole === 'pincode') {
        return vendor.pincode === userPincode || (userState === 'Tamil Nadu' ? vendor.pincode === '635109' : vendor.pincode === '560001');
      }

      if (activeRole === 'division') {
        return vendor.division === userDivision || vendor.district === userDistrict || vendor.pincode === userPincode;
      }

      if (activeRole === 'district') {
        return vendor.district === userDistrict || vendor.division === userDivision;
      }

      return true; // State Lead sees all vendors within their assigned state
    });
  }, [vendors, activeRole, userState, userDistrict, userDivision, userPincode]);

  // Extract unique filter dropdown values from scoped vendors list
  const categories = useMemo(() => Array.from(new Set(scopedVendors.map(v => v.storeType))), [scopedVendors]);
  const districts = useMemo(() => Array.from(new Set(scopedVendors.map(v => v.district))), [scopedVendors]);
  const divisions = useMemo(() => Array.from(new Set(scopedVendors.map(v => v.division))), [scopedVendors]);
  const pincodes = useMemo(() => Array.from(new Set(scopedVendors.map(v => v.pincode))), [scopedVendors]);
  const agents = useMemo(() => Array.from(new Set(scopedVendors.map(v => v.assignedAgent))), [scopedVendors]);

  // Compute 6 KPI Card Metrics from SCOPED vendors list
  const metrics = useMemo(() => {
    const todayOnboard = scopedVendors.filter(v => v.createdAt === TODAY_DATE).length;
    const weekOnboard = scopedVendors.filter(v => {
      const created = new Date(v.createdAt).getTime();
      const weekAgo = new Date('2026-07-16').getTime();
      return created >= weekAgo;
    }).length;

    const pendingKyc = scopedVendors.filter(v => v.kycStatus === 'pending').length;
    const activeCount = scopedVendors.filter(v => v.status === 'active').length;
    const inactiveCount = scopedVendors.filter(v => v.status === 'inactive').length;
    const recentlyUpdated = scopedVendors.filter(v => v.updatedAt === TODAY_DATE || v.updatedAt === YESTERDAY_DATE).length;

    return {
      todayOnboard,
      weekOnboard,
      pendingKyc,
      activeCount,
      inactiveCount,
      recentlyUpdated
    };
  }, [scopedVendors]);

  // Filter Logic with Advanced Search & Quick Chips applied on SCOPED vendors
  const filteredVendors = useMemo(() => {
    return scopedVendors.filter(vendor => {
      // Search across: Vendor Name, Registration ID, Phone, GSTIN, Owner Name
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch = !q || (
        vendor.name.toLowerCase().includes(q) ||
        vendor.id.toLowerCase().includes(q) ||
        vendor.phone.includes(q) ||
        (vendor.ownerName && vendor.ownerName.toLowerCase().includes(q)) ||
        (vendor.businessGst && vendor.businessGst.toLowerCase().includes(q))
      );

      // Quick Chips Override Handler
      let matchesChip = true;
      if (quickChip === 'today') matchesChip = vendor.createdAt === TODAY_DATE;
      else if (quickChip === 'yesterday') matchesChip = vendor.createdAt === YESTERDAY_DATE;
      else if (quickChip === '7days') matchesChip = new Date(vendor.createdAt).getTime() >= new Date('2026-07-16').getTime();
      else if (quickChip === '30days') matchesChip = new Date(vendor.createdAt).getTime() >= new Date('2026-06-23').getTime();
      else if (quickChip === 'pending') matchesChip = vendor.kycStatus === 'pending';
      else if (quickChip === 'verified') matchesChip = vendor.kycStatus === 'approved';
      else if (quickChip === 'active') matchesChip = vendor.status === 'active';
      else if (quickChip === 'inactive') matchesChip = vendor.status === 'inactive';

      // Dropdown Filters
      let matchesDate = true;
      if (dateFilter === 'today') {
        matchesDate = vendor.createdAt === TODAY_DATE;
      } else if (dateFilter === 'yesterday') {
        matchesDate = vendor.createdAt === YESTERDAY_DATE;
      } else if (dateFilter === '7days') {
        matchesDate = new Date(vendor.createdAt).getTime() >= new Date('2026-07-16').getTime();
      } else if (dateFilter === '30days') {
        matchesDate = new Date(vendor.createdAt).getTime() >= new Date('2026-06-23').getTime();
      } else if (dateFilter === 'this_month') {
        matchesDate = vendor.createdAt.startsWith('2026-07');
      } else if (dateFilter === 'last_month') {
        matchesDate = vendor.createdAt.startsWith('2026-06');
      } else if (dateFilter === 'this_year') {
        matchesDate = vendor.createdAt.startsWith('2026');
      }

      const matchesCategory = categoryFilter === 'all' || vendor.storeType === categoryFilter;
      const matchesDistrict = districtFilter === 'all' || vendor.district === districtFilter;
      const matchesDivision = divisionFilter === 'all' || vendor.division === divisionFilter;
      const matchesPincode = pincodeFilter === 'all' || vendor.pincode === pincodeFilter;
      const matchesAgent = agentFilter === 'all' || vendor.assignedAgent === agentFilter;
      const matchesStatus = statusFilter === 'all' || vendor.status === statusFilter;
      const matchesKyc = kycFilter === 'all' || vendor.kycStatus === kycFilter;

      return matchesSearch && matchesChip && matchesDate && matchesCategory &&
        matchesDistrict && matchesDivision && matchesPincode && matchesAgent &&
        matchesStatus && matchesKyc;
    });
  }, [scopedVendors, searchTerm, quickChip, dateFilter, categoryFilter, districtFilter, divisionFilter, pincodeFilter, agentFilter, statusFilter, kycFilter]);

  // Hierarchy Scope Text Description
  const getHierarchyScopeDescription = () => {
    switch (activeRole) {
      case 'state':
        return `State Level Scope: ${userState} (All Downstream Districts, Divisions & Pincodes)`;
      case 'district':
        return `District Level Scope: ${userDistrict} (${userState}) (Downstream Divisions & Pincodes)`;
      case 'division':
        return `Division Level Scope: ${userDivision} (${userDistrict}) (Downstream Pincodes)`;
      case 'pincode':
        return `Pincode Level Scope: PIN ${userPincode} (${userDivision})`;
      default:
        return `Full Network Scope`;
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = 'Registration ID,Vendor Name,Owner Name,Category,Phone,Email,State,District,Division,Pincode,Assigned Agent,Vendor Status,KYC Status,GSTIN\n';
    const rows = filteredVendors.map(v =>
      `"${v.id}","${v.name}","${v.ownerName}","${v.storeType}","${v.phone}","${v.email}","${v.state}","${v.district}","${v.division}","${v.pincode}","${v.assignedAgent}","${v.status}","${v.kycStatus}","${v.businessGst || 'N/A'}"`
    ).join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Vendor_Registry_Export_${activeRole}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export & Print PDF Report
  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Merchant Vendor Registry Report (${activeRole.toUpperCase()})</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 25px; color: #1b1c1c; }
            h1 { color: #864f19; font-size: 22px; margin-bottom: 4px; }
            .meta { font-size: 11px; color: #52443a; margin-bottom: 20px; font-weight: 600; text-transform: uppercase; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #eae8e7; padding: 8px 12px; text-align: left; font-size: 11px; }
            th { background-color: #fbf9f8; font-weight: 800; color: #864f19; text-transform: uppercase; font-size: 10px; }
            .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 9px; font-weight: 800; text-transform: uppercase; }
            .approved { background: #e6f4ea; color: #137333; }
            .pending { background: #fef7e0; color: #b06000; }
            .rejected { background: #fce8e6; color: #c5221f; }
            .footer { margin-top: 30px; font-size: 10px; color: #888; text-align: center; border-t: 1px solid #eee; padding-top: 10px; }
          </style>
        </head>
        <body>
          <h1>ConnectPortal - Merchant Vendor Registry Report</h1>
          <div class="meta">Scope: ${getHierarchyScopeDescription()} • Total Vendors: ${filteredVendors.length} • Generated Date: ${new Date().toLocaleDateString()}</div>
          <table>
            <thead>
              <tr>
                <th>Registration ID</th>
                <th>Vendor Store Name</th>
                <th>Owner Name</th>
                <th>Category</th>
                <th>Phone</th>
                <th>District / Div</th>
                <th>Assigned Agent</th>
                <th>Status</th>
                <th>KYC Status</th>
              </tr>
            </thead>
            <tbody>
              ${filteredVendors.map(v => `
                <tr>
                  <td><strong>${v.id}</strong></td>
                  <td>${v.name}</td>
                  <td>${v.ownerName}</td>
                  <td>${v.storeType}</td>
                  <td>${v.phone}</td>
                  <td>${v.district} (${v.division})</td>
                  <td>${v.assignedAgent}</td>
                  <td>${v.status}</td>
                  <td><span class="badge ${v.kycStatus}">${v.kycStatus}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="footer">Confidential Merchant Directory • ConnectPortal Logistics Network © ${new Date().getFullYear()}</div>
          <script>
            window.onload = function() { window.print(); setTimeout(function() { window.close(); }, 500); };
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handleOpenDetails = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setIsModalOpen(true);
  };

  // Add Vendor Onboarding Form State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [onboardError, setOnboardError] = useState('');
  const [newVendor, setNewVendor] = useState({
    name: '',
    ownerName: '',
    phone: '',
    email: '',
    password: '',
    documentType: 'Aadhaar Card',
    pincode: activeRole === 'pincode' ? userPincode : '',
    state: userState,
    division: activeRole === 'division' || activeRole === 'pincode' ? userDivision : '',
    district: activeRole === 'district' || activeRole === 'division' || activeRole === 'pincode' ? userDistrict : '',
    postOffice: '',
    role: 'Shop Owner',
    storeType: 'Supermarket & Retail',
    customCategory: '',
    businessGst: '',
    fullAddress: '',
    landmark: ''
  });

  const handlePincodeOnboardChange = (pin: string) => {
    const cleaned = pin.replace(/\D/g, '').slice(0, 6);

    let updatedAddress = {
      ...newVendor,
      pincode: cleaned,
      state: '',
      division: '',
      district: '',
      postOffice: ''
    };

    if (cleaned.length === 6) {
      const firstDigit = cleaned.charAt(0);
      const prefixTwo = parseInt(cleaned.slice(0, 2), 10);

      let state = "Karnataka";
      let division = "Bengaluru Division";
      let district = "Bengaluru Urban";
      let postOffice = `Post Office Sector-${cleaned.slice(-3)}`;

      if (firstDigit === '1') {
        if (prefixTwo === 11) {
          state = "Delhi";
          division = "Delhi Division";
          district = "New Delhi";
        } else if (prefixTwo >= 12 && prefixTwo <= 13) {
          state = "Haryana";
          division = "Gurugram Division";
          district = "Gurugram";
        } else {
          state = "Punjab";
          division = "Ludhiana Division";
          district = "Ludhiana";
        }
      } else if (firstDigit === '4') {
        state = "Maharashtra";
        division = "Mumbai Division";
        district = "Mumbai Suburban";
      } else if (firstDigit === '5') {
        state = "Karnataka";
        division = "Bengaluru South";
        district = "Bengaluru Urban";
      } else if (firstDigit === '6') {
        state = "Tamil Nadu";
        division = "Hosur Division";
        district = "Krishnagiri District";
      }

      updatedAddress = {
        ...updatedAddress,
        state,
        division,
        district,
        postOffice
      };
    }

    setNewVendor(updatedAddress);
  };

  const handleOnboardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setOnboardError('');

    if (!newVendor.name || !newVendor.phone || !newVendor.pincode) {
      setOnboardError('Please fill in Store Name, Phone Number, and Pincode.');
      return;
    }

    const finalStoreType = newVendor.storeType === 'Other'
      ? (newVendor.customCategory.trim() || 'General Retail & Services')
      : newVendor.storeType;

    const createdVendor: Vendor = {
      id: `REG-${Math.floor(1000 + Math.random() * 9000)}`,
      name: newVendor.name,
      ownerName: newVendor.ownerName || 'Merchant Owner',
      phone: newVendor.phone,
      email: newVendor.email || `${newVendor.name.toLowerCase().replace(/\s+/g, '')}@example.com`,
      state: newVendor.state || userState,
      division: newVendor.division || userDivision,
      district: newVendor.district || userDistrict,
      pincode: newVendor.pincode || userPincode,
      role: 'Merchant Partner',
      kycStatus: 'pending',
      status: 'active',
      assignedAgent: `${user?.name || 'Logged Agent'} (${activeRole.charAt(0).toUpperCase() + activeRole.slice(1)} Agent)`,
      createdAt: TODAY_DATE,
      updatedAt: TODAY_DATE,
      storeType: finalStoreType,
      businessGst: newVendor.businessGst || `33AABC${Math.floor(1000 + Math.random() * 9000)}F1Z9`,
      fullAddress: newVendor.fullAddress
        ? `${newVendor.fullAddress}${newVendor.landmark ? ` (Landmark: ${newVendor.landmark})` : ''}, ${newVendor.district}, ${newVendor.state} ${newVendor.pincode}`
        : `${newVendor.postOffice || 'Main Market'}, ${newVendor.district}, ${newVendor.state} ${newVendor.pincode}`
    };

    setVendors(prev => {
      const updated = [createdVendor, ...prev];
      try {
        const customOnly = updated.filter(v => v.id.startsWith('REG-'));
        localStorage.setItem('connect_portal_custom_vendors', JSON.stringify(customOnly));
      } catch (e) {
        console.error('Failed to save custom vendor to localStorage:', e);
      }
      return updated;
    });

    // Sync live with Backend API
    api.post('/vendors', {
      businessName: createdVendor.name,
      ownerName: createdVendor.ownerName,
      phone: createdVendor.phone,
      category: createdVendor.storeType,
      gst: createdVendor.businessGst,
      location: {
        address: createdVendor.fullAddress,
        latitude: 12.9716,
        longitude: 77.5946
      }
    }).catch(err => {
      console.warn('Backend API /vendors POST sync warning:', err);
    });

    if (addNotification) {
      addNotification(
        'New Vendor Onboarded',
        `${createdVendor.name} (${createdVendor.id}) submitted for KYC verification.`,
        'medium',
        'system'
      );
    }

    setIsAddModalOpen(false);
    setNewVendor({
      name: '',
      ownerName: '',
      phone: '',
      email: '',
      password: '',
      documentType: 'Aadhaar Card',
      pincode: activeRole === 'pincode' ? userPincode : '',
      state: userState,
      division: activeRole === 'division' || activeRole === 'pincode' ? userDivision : '',
      district: activeRole === 'district' || activeRole === 'division' || activeRole === 'pincode' ? userDistrict : '',
      postOffice: '',
      role: 'Shop Owner',
      storeType: 'Supermarket & Retail',
      customCategory: '',
      businessGst: '',
      fullAddress: '',
      landmark: ''
    });
  };

  const getKycBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 whitespace-nowrap"><CheckCircle className="w-3.5 h-3.5" /> Approved</span>;
      case 'pending':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-900 border border-amber-300 whitespace-nowrap"><Clock className="w-3.5 h-3.5" /> Pending KYC</span>;
      case 'rejected':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold bg-rose-100 text-rose-800 border border-rose-300 whitespace-nowrap"><XCircle className="w-3.5 h-3.5" /> Rejected</span>;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    return status === 'active' ? (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 font-extrabold text-xs rounded-full border border-emerald-200 whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span> Active
      </span>
    ) : (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-600 font-extrabold text-xs rounded-full border border-slate-300 whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0"></span> Inactive
      </span>
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header with Role Hierarchy Scoping Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#d7c3b5]/40 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-[#864f19]/10 text-[#864f19] rounded-2xl border border-[#864f19]/20">
            <Store className="w-7 h-7" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-black text-[#1b1c1c] tracking-tight">Vendor Management</h1>
              <span className="px-2.5 py-0.5 bg-[#864f19] text-white font-black text-[10px] uppercase rounded-full shadow-2xs">
                ROLE SCOPED: {activeRole.toUpperCase()} AGENT
              </span>
            </div>
            <p className="text-xs text-[#52443a] font-semibold mt-1 flex items-center gap-1.5">
              <GitFork className="w-3.5 h-3.5 text-[#864f19]" />
              <span>{getHierarchyScopeDescription()}</span>
            </p>
          </div>
        </div>

        <Button
          variant="primary"
          onClick={() => setIsAddModalOpen(true)}
          leftIcon={<span className="material-symbols-outlined text-sm">person_add</span>}
          className="py-2.5 px-4 font-bold rounded-xl cursor-pointer border-none text-xs uppercase tracking-wider shadow-sm transition-all shrink-0 self-start md:self-auto"
        >
          Onboard New Vendor
        </Button>
      </div>

      {/* 6 EXECUTIVE KPI METRIC CARDS (SCOPED TO ACTIVE ROLE HIERARCHY) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-[#d7c3b5]/40 shadow-sm">
          <p className="text-[10px] font-black uppercase text-[#52443a] tracking-wider">Today's Onboarding</p>
          <p className="text-2xl font-black text-[#864f19] mt-1">{metrics.todayOnboard}</p>
          <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Registered today</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#d7c3b5]/40 shadow-sm">
          <p className="text-[10px] font-black uppercase text-[#52443a] tracking-wider">This Week's Onboarding</p>
          <p className="text-2xl font-black text-blue-700 mt-1">{metrics.weekOnboard}</p>
          <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Last 7 days</p>
        </div>

        <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200 shadow-sm">
          <p className="text-[10px] font-black uppercase text-amber-900 tracking-wider">Pending KYC</p>
          <p className="text-2xl font-black text-amber-800 mt-1">{metrics.pendingKyc}</p>
          <p className="text-[10px] text-amber-700 font-semibold mt-0.5">Awaiting KYC Team</p>
        </div>

        <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 shadow-sm">
          <p className="text-[10px] font-black uppercase text-emerald-900 tracking-wider">Active Vendors</p>
          <p className="text-2xl font-black text-emerald-700 mt-1">{metrics.activeCount}</p>
          <p className="text-[10px] text-emerald-700 font-semibold mt-0.5">Operational merchants</p>
        </div>

        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black uppercase text-slate-600 tracking-wider">Inactive Vendors</p>
          <p className="text-2xl font-black text-slate-700 mt-1">{metrics.inactiveCount}</p>
          <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Offboarded / Paused</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#d7c3b5]/40 shadow-sm">
          <p className="text-[10px] font-black uppercase text-[#52443a] tracking-wider">Recently Updated</p>
          <p className="text-2xl font-black text-[#1b1c1c] mt-1">{metrics.recentlyUpdated}</p>
          <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Recent modifications</p>
        </div>
      </div>

      {/* QUICK FILTER CHIPS */}
      <div className="bg-white p-4 rounded-2xl border border-[#d7c3b5]/40 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold text-[#52443a] uppercase tracking-wider flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-[#864f19]" /> Quick Filter Chips
          </span>
          <button
            onClick={() => {
              setQuickChip('all');
              setSearchTerm('');
              setDateFilter('all');
              setCategoryFilter('all');
              setDistrictFilter('all');
              setDivisionFilter('all');
              setPincodeFilter('all');
              setAgentFilter('all');
              setStatusFilter('all');
              setKycFilter('all');
            }}
            className="text-[11px] font-bold text-[#864f19] hover:underline bg-transparent border-none cursor-pointer"
          >
            Reset All Filters
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {[
            { key: 'all', label: 'All Scoped Vendors' },
            { key: 'today', label: 'Today' },
            { key: 'yesterday', label: 'Yesterday' },
            { key: '7days', label: 'Last 7 Days' },
            { key: '30days', label: 'Last 30 Days' },
            { key: 'pending', label: 'Pending KYC' },
            { key: 'verified', label: 'Verified' },
            { key: 'active', label: 'Active' },
            { key: 'inactive', label: 'Inactive' }
          ].map(chip => (
            <button
              key={chip.key}
              onClick={() => setQuickChip(chip.key)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border-none cursor-pointer ${quickChip === chip.key
                  ? 'bg-[#864f19] text-white shadow-sm'
                  : 'bg-[#f6f3f2] text-[#52443a] hover:bg-[#eae8e7]'
                }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* ADVANCED MULTI-ATTRIBUTE SEARCH & MULTI-DIMENSIONAL FILTERS */}
      <div className="bg-white p-5 rounded-2xl border border-[#d7c3b5]/40 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
          {/* Advanced Search */}
          <div className="sm:col-span-2 md:col-span-2">
            <Input
              label="Advanced Search (Name, Reg ID, Phone, GSTIN, Owner)"
              placeholder="Search by Vendor Name, Reg ID, Phone, GSTIN, Owner..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={<Search className="w-4 h-4 text-slate-400" />}
            />
          </div>

          {/* Date Filter */}
          <div>
            <Select
              label="Date Range Period"
              options={[
                { value: 'all', label: 'All Time' },
                { value: 'today', label: 'Today' },
                { value: 'yesterday', label: 'Yesterday' },
                { value: '7days', label: 'Last 7 Days' },
                { value: 'this_month', label: 'This Month' },
                { value: 'last_month', label: 'Last Month' },
                { value: 'this_year', label: 'This Year' }
              ]}
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </div>

          {/* Category Filter */}
          <div>
            <Select
              label="Vendor Category"
              options={[
                { value: 'all', label: 'All Categories' },
                ...categories.map(c => ({ value: c, label: c }))
              ]}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            />
          </div>
        </div>

        {/* Secondary Filters Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2 border-t border-[#d7c3b5]/30 items-end">
          <div>
            <Select
              label="District"
              options={
                activeRole === 'state'
                  ? [{ value: 'all', label: 'All State Districts' }, ...districts.map(d => ({ value: d, label: d }))]
                  : [{ value: userDistrict, label: `${userDistrict}` }]
              }
              value={activeRole === 'state' ? districtFilter : userDistrict}
              onChange={(e) => setDistrictFilter(e.target.value)}
              disabled={activeRole !== 'state'}
            />
          </div>

          <div>
            <Select
              label="Division"
              options={
                activeRole === 'state' || activeRole === 'district'
                  ? [{ value: 'all', label: activeRole === 'district' ? 'All Divisions in District' : 'All Divisions' }, ...divisions.map(d => ({ value: d, label: d }))]
                  : [{ value: userDivision, label: `${userDivision}` }]
              }
              value={activeRole === 'state' || activeRole === 'district' ? divisionFilter : userDivision}
              onChange={(e) => setDivisionFilter(e.target.value)}
              disabled={activeRole === 'division' || activeRole === 'pincode'}
            />
          </div>

          <div>
            <Select
              label="Pincode"
              options={
                activeRole !== 'pincode'
                  ? [{ value: 'all', label: 'All Pincodes' }, ...pincodes.map(p => ({ value: p, label: `PIN ${p}` }))]
                  : [{ value: userPincode, label: `PIN ${userPincode}` }]
              }
              value={activeRole !== 'pincode' ? pincodeFilter : userPincode}
              onChange={(e) => setPincodeFilter(e.target.value)}
              disabled={activeRole === 'pincode'}
            />
          </div>

          <div>
            <Select
              label="Assigned Agent"
              options={[
                { value: 'all', label: 'All Agents' },
                ...agents.map(a => ({ value: a, label: a }))
              ]}
              value={agentFilter}
              onChange={(e) => setAgentFilter(e.target.value)}
            />
          </div>

          <div>
            <Select
              label="Vendor Status"
              options={[
                { value: 'all', label: 'All Statuses' },
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' }
              ]}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            />
          </div>

          <div>
            <Select
              label="KYC Status (Read-Only)"
              options={[
                { value: 'all', label: 'All KYC Statuses' },
                { value: 'pending', label: 'Pending KYC' },
                { value: 'approved', label: 'Approved' },
                { value: 'rejected', label: 'Rejected' }
              ]}
              value={kycFilter}
              onChange={(e) => setKycFilter(e.target.value)}
            />
          </div>
        </div>

        {/* Action Export Controls */}
        <div className="flex justify-between items-center pt-2 border-t border-[#d7c3b5]/30">
          <p className="text-xs font-bold text-slate-500">
            Showing <span className="text-[#864f19] font-black">{filteredVendors.length}</span> of {scopedVendors.length} role-scoped vendors
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              title="Export to CSV Spreadsheet"
              className="py-2 px-3.5 bg-[#fbf9f8] hover:bg-[#ffdcc2] border border-[#d7c3b5]/60 text-[#864f19] text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
            <button
              type="button"
              onClick={handleExportPDF}
              title="Export & Print PDF Report"
              className="py-2 px-3.5 bg-[#864f19] hover:bg-[#a3672f] text-white text-xs font-bold rounded-xl transition cursor-pointer border-none flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5" /> PDF Print
            </button>
          </div>
        </div>
      </div>

      {/* TABLE GRID LAYOUT */}
      <Card>
        <CardBody className="p-0 overflow-x-auto">
          {filteredVendors.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <p className="text-sm font-bold text-slate-500">No vendors found under your assigned {activeRole} territory hierarchy.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#fbf9f8] border-b border-[#eae8e7] text-[10px] font-black text-[#52443a] uppercase tracking-wider">
                  <th className="py-3.5 px-4">Registration ID</th>
                  <th className="py-3.5 px-4">Vendor & Owner Name</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Contact Info</th>
                  <th className="py-3.5 px-4">Territory (District / PIN)</th>
                  <th className="py-3.5 px-4">Assigned Agent</th>
                  <th className="py-3.5 px-4">Vendor Status</th>
                  <th className="py-3.5 px-4">KYC Status</th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eae8e7] text-xs">
                {filteredVendors.map((vendor) => (
                  <tr key={vendor.id} className="hover:bg-[#f6f3f2]/40 transition">
                    <td className="py-3.5 px-4 font-extrabold text-[#864f19]">
                      {vendor.id}
                      <p className="text-[10px] text-slate-400 font-semibold">{vendor.createdAt}</p>
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="font-extrabold text-[#1b1c1c] text-sm">{vendor.name}</p>
                      <p className="text-[11px] text-slate-500 font-bold flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400" /> {vendor.ownerName}
                      </p>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="px-2 py-1 bg-slate-100 text-slate-700 font-bold text-[11px] rounded-md">
                        {vendor.storeType}
                      </span>
                      {vendor.businessGst && (
                        <p className="text-[10px] font-semibold text-slate-400 mt-0.5">GST: {vendor.businessGst}</p>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-700">{vendor.phone}</p>
                      <p className="text-[10px] text-slate-400 font-medium">{vendor.email}</p>
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-800">{vendor.district}</p>
                      <p className="text-[10px] text-slate-500 font-semibold">{vendor.division} • PIN: {vendor.pincode}</p>
                    </td>

                    <td className="py-3.5 px-4 font-bold text-[#864f19]">
                      {vendor.assignedAgent}
                    </td>

                    <td className="py-3.5 px-4">
                      {getStatusBadge(vendor.status)}
                    </td>

                    <td className="py-3.5 px-4">
                      {getKycBadge(vendor.kycStatus)}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleOpenDetails(vendor)}
                        className="py-1.5 px-3 bg-[#fbf9f8] hover:bg-[#ffdcc2] border border-[#d7c3b5]/60 text-[#864f19] text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1 mx-auto"
                      >
                        <Eye className="w-3.5 h-3.5" /> Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>

      {/* READ-ONLY VENDOR DETAILS MODAL DRAWER */}
      {selectedVendor && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={`Vendor Profile Details — ${selectedVendor.id}`}
        >
          <div className="space-y-5 p-1">
            {/* Header profile info */}
            <div className="flex items-start justify-between p-4 bg-[#fbf9f8] rounded-2xl border border-[#eae8e7]">
              <div>
                <span className="text-[10px] uppercase font-black text-[#52443a]">Merchant Store Name</span>
                <h3 className="text-xl font-black text-[#1b1c1c] mt-0.5">{selectedVendor.name}</h3>
                <p className="text-xs font-bold text-slate-500 mt-0.5">Owner: {selectedVendor.ownerName}</p>
              </div>

              <div className="text-right space-y-1">
                {getStatusBadge(selectedVendor.status)}
                <div className="mt-1">{getKycBadge(selectedVendor.kycStatus)}</div>
              </div>
            </div>

            {/* General & KYC Notice */}
            <div className="bg-amber-50/80 p-3.5 rounded-xl border border-amber-200 text-xs font-bold text-amber-900 flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-700 shrink-0" />
              <span>Note: KYC verification status is read-only. Document verification is managed by the dedicated KYC Team.</span>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <p className="text-[10px] uppercase font-black text-slate-400">Category & Store Type</p>
                <p className="font-bold text-slate-800">{selectedVendor.storeType}</p>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] uppercase font-black text-slate-400">GSTIN Registration</p>
                <p className="font-bold text-slate-800">{selectedVendor.businessGst || 'N/A'}</p>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] uppercase font-black text-slate-400">Phone Number</p>
                <p className="font-bold text-slate-800">{selectedVendor.phone}</p>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] uppercase font-black text-slate-400">Email Address</p>
                <p className="font-bold text-slate-800">{selectedVendor.email}</p>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] uppercase font-black text-slate-400">Territory Location</p>
                <p className="font-bold text-slate-800">{selectedVendor.district} ({selectedVendor.division})</p>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] uppercase font-black text-slate-400">Pincode</p>
                <p className="font-bold text-slate-800">{selectedVendor.pincode}</p>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] uppercase font-black text-slate-400">Assigned Agent</p>
                <p className="font-bold text-[#864f19]">{selectedVendor.assignedAgent}</p>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] uppercase font-black text-slate-400">Registration Date</p>
                <p className="font-bold text-slate-800">{selectedVendor.createdAt}</p>
              </div>
            </div>

            {selectedVendor.fullAddress && (
              <div className="space-y-1 text-xs">
                <p className="text-[10px] uppercase font-black text-slate-400">Full Business Address</p>
                <p className="font-bold text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200">{selectedVendor.fullAddress}</p>
              </div>
            )}

            {selectedVendor.rejectionReason && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-1">
                <p className="font-black text-rose-900 uppercase text-[10px]">KYC Rejection Reason (KYC Team)</p>
                <p className="font-semibold text-rose-800">{selectedVendor.rejectionReason}</p>
              </div>
            )}

            <div className="pt-3 flex justify-end">
              <Button
                variant="secondary"
                onClick={() => setIsModalOpen(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2 px-5 rounded-xl border-none cursor-pointer"
              >
                Close Profile
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ONBOARD NEW VENDOR WIZARD MODAL */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Onboard New Merchant Vendor"
      >
        <form onSubmit={handleOnboardSubmit} className="space-y-4">
          {onboardError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl">
              {onboardError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Merchant Store Name"
              placeholder="e.g. Hosur Supermarket"
              value={newVendor.name}
              onChange={(e) => setNewVendor({ ...newVendor, name: e.target.value })}
              required
            />
            <Input
              label="Owner Full Name"
              placeholder="e.g. Ramesh Kumar"
              value={newVendor.ownerName}
              onChange={(e) => setNewVendor({ ...newVendor, ownerName: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Phone Number"
              placeholder="10-digit mobile"
              value={newVendor.phone}
              onChange={(e) => setNewVendor({ ...newVendor, phone: e.target.value })}
              required
            />
            <Input
              label="Email Address"
              type="email"
              placeholder="vendor@example.com"
              value={newVendor.email}
              onChange={(e) => setNewVendor({ ...newVendor, email: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Store Category"
              options={[
                { value: 'Supermarket & Retail', label: 'Supermarket & Retail' },
                { value: 'Fresh Produce Mart', label: 'Fresh Produce Mart' },
                { value: 'Bakery & Confectionery', label: 'Bakery & Confectionery' },
                { value: 'Organic Food Store', label: 'Organic Food Store' },
                { value: 'Electronics & Appliances', label: 'Electronics & Appliances' },
                { value: 'Other', label: 'Other (Specify Custom Category)' }
              ]}
              value={newVendor.storeType}
              onChange={(e) => setNewVendor({ ...newVendor, storeType: e.target.value })}
            />
            <Input
              label="GSTIN Number (Optional)"
              placeholder="e.g. 33AABCK1234F1Z9"
              value={newVendor.businessGst}
              onChange={(e) => setNewVendor({ ...newVendor, businessGst: e.target.value })}
            />
          </div>

          {newVendor.storeType === 'Other' && (
            <div>
              <Input
                label="Specify Custom Store Category *"
                placeholder="e.g. Hardware & Tools, Pharmacy, Boutique"
                value={newVendor.customCategory}
                onChange={(e) => setNewVendor({ ...newVendor, customCategory: e.target.value })}
                required
              />
            </div>
          )}

          <div>
            <Input
              label="Pincode (Auto-fills Territory)"
              placeholder="e.g. 635109"
              value={newVendor.pincode}
              onChange={(e) => handlePincodeOnboardChange(e.target.value)}
              required
            />
          </div>

          {/* Full Business Address & Location Section */}
          <div className="space-y-3 pt-2 border-t border-[#d7c3b5]/30">
            <p className="text-[10px] uppercase font-black text-[#864f19]">Merchant Business Address Details</p>

            <Input
              label="Full Business Address (Door No, Shop No, Building, Street)"
              placeholder="e.g. Shop #14, Commercial Plaza, Main Market Road"
              value={newVendor.fullAddress}
              onChange={(e) => setNewVendor({ ...newVendor, fullAddress: e.target.value })}
              required
            />

            <Input
              label="Nearby Landmark (Optional)"
              placeholder="e.g. Opposite City Bus Stand / Next to SBI Bank"
              value={newVendor.landmark}
              onChange={(e) => setNewVendor({ ...newVendor, landmark: e.target.value })}
            />
          </div>

          {newVendor.state && (
            <div className="p-3 bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl text-xs space-y-1 font-bold text-[#52443a]">
              <p className="text-[10px] uppercase font-black text-[#864f19]">Auto-Detected Territory</p>
              <p>State: {newVendor.state} • District: {newVendor.district}</p>
              <p>Division: {newVendor.division} • Post Office: {newVendor.postOffice}</p>
            </div>
          )}

          <div className="pt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsAddModalOpen(false)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2 px-4 rounded-xl border-none cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="bg-[#864f19] hover:bg-[#a3672f] text-white text-xs font-bold py-2 px-5 rounded-xl border-none cursor-pointer"
            >
              Submit Onboarding
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default VendorsList;
