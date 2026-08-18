import React, { useState, useMemo, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Search, X, CheckCircle2, Clock, XCircle, MapPin, Phone, Mail, User, Store, Check, UserCheck, RefreshCw, Building2 } from 'lucide-react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

export interface VendorItem {
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
  status: 'active' | 'inactive' | 'pending';
  assignedAgent: string;
  onboardedBy?: string;
  agentRole?: string;
  createdAt: string;
  updatedAt: string;
  storeType: string;
  businessGst?: string;
  fullAddress?: string;
}

interface AgentOnboardedVendorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userVendorsKey?: string;
  onStatusChange?: (vendorId: string, newKycStatus: 'approved' | 'rejected') => void;
}

export const AgentOnboardedVendorsModal: React.FC<AgentOnboardedVendorsModalProps> = ({
  isOpen,
  onClose,
  userVendorsKey,
  onStatusChange
}) => {
  const { user } = useAuth();
  
  const rawRole = (user?.role as string) || (user as any)?.level || 'pincode';
  const effectiveRole = (rawRole === 'agent' ? ((user as any)?.level || 'pincode') : rawRole).toLowerCase();
  const userState = user?.territory?.state || 'Andhra Pradesh';

  const [searchTerm, setSearchTerm] = useState('');
  const [vendorsList, setVendorsList] = useState<VendorItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Helper to collect all onboarded vendors from localStorage and live API
  const loadVendors = async () => {
    setIsLoading(true);
    const map = new Map<string, VendorItem>();

    // 1. Gather local storage sources
    const storageKeys = [
      'connect_portal_pending_vendor_onboardings',
      'pending_merchant_onboardings',
      userVendorsKey
    ].filter(Boolean) as string[];

    storageKeys.forEach(key => {
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const arr = JSON.parse(raw);
          if (Array.isArray(arr)) {
            arr.forEach((v: any) => {
              if (v && (v.id || v.name)) {
                const itemKey = v.id || v.registrationId || v.name;
                const item: VendorItem = {
                  id: v.id || v.registrationId || `REG-${Math.floor(1000 + Math.random() * 9000)}`,
                  name: v.name || v.businessName || '',
                  ownerName: v.ownerName || 'Merchant Owner',
                  phone: v.phone || '',
                  email: v.email || '',
                  state: v.state || userState,
                  district: v.district || 'Visakhapatnam',
                  division: v.division || 'Vizag City Division',
                  pincode: v.pincode || '530001',
                  role: 'Merchant Partner',
                  kycStatus: v.kycStatus || 'pending',
                  status: v.status || 'pending',
                  assignedAgent: v.agentName || (typeof v.assignedAgent === 'string' ? v.assignedAgent : (v.assignedAgent?.name || 'Field Agent')),
                  onboardedBy: v.agentName || v.onboardedBy || (typeof v.assignedAgent === 'string' ? v.assignedAgent : v.assignedAgent?.name || 'Field Agent'),
                  agentRole: v.agentRole || (v.assignedAgent?.role ? (v.assignedAgent.role === 'district' ? 'District Agent' : v.assignedAgent.role === 'division' ? 'Division Manager' : 'Pincode Agent') : 'Pincode Agent'),
                  createdAt: v.createdAt || new Date().toISOString().slice(0, 10),
                  updatedAt: v.updatedAt || new Date().toISOString().slice(0, 10),
                  storeType: v.storeType || 'General Store',
                  businessGst: v.businessGst || '',
                  fullAddress: v.fullAddress || v.address || ''
                };
                map.set(itemKey, item);
              }
            });
          }
        }
      } catch (e) {}
    });

    // 2. Fetch live vendors from API
    try {
      const res = await api.get('/vendors');
      const apiVendors = res.data?.vendors || [];
      apiVendors.forEach((v: any) => {
        const rawAgentRole = v.assignedAgent?.role || v.agentRole || '';
        let formattedAgentRole = 'Pincode Agent';
        if (rawAgentRole === 'district') formattedAgentRole = 'District Agent';
        else if (rawAgentRole === 'division') formattedAgentRole = 'Division Manager';
        else if (rawAgentRole === 'pincode') formattedAgentRole = 'Pincode Agent';
        else if (rawAgentRole === 'state') formattedAgentRole = 'State Agent';
        else if (v.assignedAgent?.name) {
          const lower = v.assignedAgent.name.toLowerCase();
          if (lower.includes('district')) formattedAgentRole = 'District Agent';
          else if (lower.includes('division') || lower.includes('manager')) formattedAgentRole = 'Division Manager';
        }

        const agentNameStr = v.agentName 
          ? v.agentName
          : (v.assignedAgent?.name ? v.assignedAgent.name : (typeof v.assignedAgent === 'string' ? v.assignedAgent : 'Field Agent'));

        const itemKey = v.registrationId || v._id || v.businessName || v.name;
        const item: VendorItem = {
          id: v.registrationId || v._id || `REG-${Math.floor(1000 + Math.random() * 9000)}`,
          name: v.businessName || v.name || '',
          ownerName: v.ownerName || 'Merchant Owner',
          phone: v.phone || '',
          email: v.email || '',
          state: v.state || userState,
          district: v.district || 'Visakhapatnam',
          division: v.division || 'Vizag City Division',
          pincode: v.pincode || '530001',
          role: 'Merchant Partner',
          kycStatus: v.kycStatus || 'pending',
          status: v.status || 'pending',
          assignedAgent: agentNameStr,
          onboardedBy: agentNameStr,
          agentRole: formattedAgentRole,
          createdAt: v.createdAt ? new Date(v.createdAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
          updatedAt: v.updatedAt ? new Date(v.updatedAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
          storeType: v.category?.name || v.category || v.storeType || 'General Store',
          businessGst: v.gst || v.businessGst || '',
          fullAddress: v.location?.address || v.address || ''
        };
        map.set(itemKey, item);
      });
    } catch (e) {
      console.warn('API fetch vendors in modal warning:', e);
    }

    const rawList = Array.from(map.values());

    // Role-based territory filter without dropping valid onboardings
    let scopedList = rawList;

    if (effectiveRole === 'district') {
      const dist = user?.territory?.district;
      if (dist) {
        scopedList = rawList.filter(v => !v.district || v.district.toLowerCase().includes(dist.toLowerCase()) || dist.toLowerCase().includes(v.district.toLowerCase()));
      }
    } else if (effectiveRole === 'division') {
      const div = user?.territory?.division;
      if (div) {
        scopedList = rawList.filter(v => !v.division || v.division.toLowerCase().includes(div.toLowerCase()) || div.toLowerCase().includes(v.division.toLowerCase()));
      }
    }

    // Safety guarantee: If scoped list is empty but raw list contains vendors, display rawList so no vendor is hidden!
    if (scopedList.length === 0 && rawList.length > 0) {
      scopedList = rawList;
    }

    setVendorsList(scopedList);
    setIsLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      loadVendors();
    }
  }, [isOpen, userVendorsKey, effectiveRole, userState]);

  // Real-time listener for vendor onboarding events & storage updates
  useEffect(() => {
    const handleOnboardEvent = () => {
      if (isOpen) loadVendors();
    };

    window.addEventListener('vendorOnboarded', handleOnboardEvent);
    window.addEventListener('storage', handleOnboardEvent);

    return () => {
      window.removeEventListener('vendorOnboarded', handleOnboardEvent);
      window.removeEventListener('storage', handleOnboardEvent);
    };
  }, [isOpen]);

  // Filtered vendors based on search query
  const filteredVendors = useMemo(() => {
    if (!searchTerm.trim()) return vendorsList;
    const q = searchTerm.toLowerCase().trim();
    return vendorsList.filter(v => 
      v.name.toLowerCase().includes(q) ||
      v.ownerName.toLowerCase().includes(q) ||
      v.id.toLowerCase().includes(q) ||
      v.phone.includes(q) ||
      v.pincode.includes(q) ||
      v.district.toLowerCase().includes(q) ||
      v.division.toLowerCase().includes(q) ||
      v.email.toLowerCase().includes(q) ||
      v.assignedAgent.toLowerCase().includes(q) ||
      (v.agentRole && v.agentRole.toLowerCase().includes(q))
    );
  }, [vendorsList, searchTerm]);

  // Counts
  const totalCount = vendorsList.length;
  const activeCount = vendorsList.filter(v => v.status === 'active' || v.kycStatus === 'approved').length;
  const pendingCount = vendorsList.filter(v => v.kycStatus === 'pending' || v.status === 'pending').length;

  const modalTitle = effectiveRole === 'state' ? 'Agent Onboarded Vendors' : 'Division Vendors';
  const modalSubtitle = effectiveRole === 'state'
    ? `Vendors onboarded by District, Division, and Pincode agents across ${userState}`
    : 'Vendors onboarded within the assigned territory';

  const handleApprove = (vId: string) => {
    setVendorsList(prev => prev.map(v => v.id === vId ? { ...v, kycStatus: 'approved', status: 'active' } : v));
    
    ['connect_portal_pending_vendor_onboardings', 'pending_merchant_onboardings', userVendorsKey].forEach(key => {
      if (!key) return;
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const arr = JSON.parse(raw);
          if (Array.isArray(arr)) {
            const updated = arr.map((item: any) => item.id === vId ? { ...item, kycStatus: 'approved', status: 'active' } : item);
            localStorage.setItem(key, JSON.stringify(updated));
          }
        }
      } catch (e) {}
    });

    if (onStatusChange) onStatusChange(vId, 'approved');
  };

  const handleReject = (vId: string) => {
    setVendorsList(prev => prev.map(v => v.id === vId ? { ...v, kycStatus: 'rejected', status: 'inactive' } : v));
    
    ['connect_portal_pending_vendor_onboardings', 'pending_merchant_onboardings', userVendorsKey].forEach(key => {
      if (!key) return;
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const arr = JSON.parse(raw);
          if (Array.isArray(arr)) {
            const updated = arr.map((item: any) => item.id === vId ? { ...item, kycStatus: 'rejected', status: 'inactive' } : item);
            localStorage.setItem(key, JSON.stringify(updated));
          }
        }
      } catch (e) {}
    });

    if (onStatusChange) onStatusChange(vId, 'rejected');
  };

  if (!isOpen || typeof document === 'undefined') return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in font-sans">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl border border-slate-200 flex flex-col z-[99999]">
        
        {/* Header */}
        <div className="p-6 pb-4 border-b border-slate-100 flex items-start justify-between bg-white shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center shrink-0">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">{modalTitle}</h2>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">
                {modalSubtitle}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadVendors}
              className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-700 transition cursor-pointer border-none bg-transparent"
              title="Refresh onboarding list"
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-700 transition cursor-pointer border-none bg-transparent"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 max-h-[calc(90vh-140px)]">
          
          {/* Search Field */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by vendor name, agent name, agent ID, pincode, district, division, email..."
              className="w-full bg-slate-50/80 border border-slate-200/90 rounded-2xl py-2.5 pl-10 pr-4 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full border-none bg-transparent cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* 3 KPI Summary Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-purple-50/70 border border-purple-100 p-4 rounded-2xl text-center space-y-0.5">
              <span className="text-[9px] uppercase font-black tracking-wider text-purple-700 block">Total Vendors</span>
              <span className="text-2xl font-black text-purple-900">{totalCount}</span>
            </div>

            <div className="bg-emerald-50/70 border border-emerald-100 p-4 rounded-2xl text-center space-y-0.5">
              <span className="text-[9px] uppercase font-black tracking-wider text-emerald-700 block">Active</span>
              <span className="text-2xl font-black text-emerald-900">{activeCount}</span>
            </div>

            <div className="bg-amber-50/70 border border-amber-100 p-4 rounded-2xl text-center space-y-0.5">
              <span className="text-[9px] uppercase font-black tracking-wider text-amber-700 block">Pending Review</span>
              <span className="text-2xl font-black text-amber-900">{pendingCount}</span>
            </div>
          </div>

          {/* Vendors List or Empty State */}
          {filteredVendors.length === 0 ? (
            <div className="py-16 px-4 text-center space-y-3 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
              <div className="w-14 h-14 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                <UserCheck className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-black text-slate-800">No agent-onboarded vendors found in the directory yet.</h3>
                <p className="text-xs text-slate-500 font-medium">Try a different search term.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredVendors.map((vendor) => (
                <div
                  key={vendor.id}
                  className="bg-white border border-slate-200 hover:border-purple-300 rounded-2xl p-4 transition shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-black text-sm text-slate-900 truncate">{vendor.name}</span>
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-bold text-[10px] rounded-full border border-slate-200">
                        {vendor.storeType}
                      </span>

                      {/* Vendor Status Badge */}
                      <span className={`px-2 py-0.5 font-bold text-[10px] rounded-full border ${
                        vendor.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        vendor.status === 'inactive' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                        'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        Status: {(vendor.status || 'pending').toUpperCase()}
                      </span>

                      {/* KYC Status Badge */}
                      {vendor.kycStatus === 'approved' && (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-extrabold text-[10px] rounded-full flex items-center gap-1 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> Approved KYC
                        </span>
                      )}
                      {vendor.kycStatus === 'pending' && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-extrabold text-[10px] rounded-full flex items-center gap-1 border border-amber-200">
                          <Clock className="w-3 h-3" /> Pending Review
                        </span>
                      )}
                      {vendor.kycStatus === 'rejected' && (
                        <span className="px-2 py-0.5 bg-rose-100 text-rose-800 font-extrabold text-[10px] rounded-full flex items-center gap-1 border border-rose-200">
                          <XCircle className="w-3 h-3" /> Rejected
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-600">
                      <span className="flex items-center gap-1"><User className="w-3.5 h-3.5 text-slate-400" /> {vendor.ownerName}</span>
                      <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-slate-400" /> {vendor.phone ? `+91 ${vendor.phone}` : 'N/A'}</span>
                      {vendor.email && <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5 text-slate-400" /> {vendor.email}</span>}
                      <span className="flex items-center gap-1 text-purple-700 font-bold">
                        <MapPin className="w-3.5 h-3.5 text-purple-600" />
                        District: {vendor.district} • Division: {vendor.division} • PIN: {vendor.pincode}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 font-medium">
                      Onboarded by: <span className="font-extrabold text-slate-800">{vendor.onboardedBy || vendor.assignedAgent}</span> <span className="text-purple-700 font-bold">({vendor.agentRole || 'Pincode Agent'})</span> • Registration ID: <span className="font-extrabold text-slate-800">{vendor.id}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {vendor.kycStatus === 'pending' && (
                      <span className="text-[11px] font-extrabold text-amber-800 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-600" /> Pending Admin Approval
                      </span>
                    )}
                    {vendor.kycStatus === 'approved' && (
                      <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                        ✓ KYC Verified
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 px-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
          <span className="text-xs font-bold text-slate-500">
            Showing {filteredVendors.length} of {totalCount} agent-onboarded vendors
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl transition border-none cursor-pointer shadow-sm"
          >
            Close
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
};

export default AgentOnboardedVendorsModal;
