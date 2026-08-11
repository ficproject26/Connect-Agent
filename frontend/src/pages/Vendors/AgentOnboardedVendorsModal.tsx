import React, { useState, useMemo, useEffect } from 'react';
import { Search, X, CheckCircle2, Clock, XCircle, MapPin, Phone, Mail, User, Store, Check, UserCheck, RefreshCw } from 'lucide-react';
import api from '../../utils/api';

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
            arr.forEach((v: VendorItem) => {
              if (v && (v.id || v.name)) {
                map.set(v.id || v.name, v);
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
        const item: VendorItem = {
          id: v.registrationId || v._id || `REG-${Math.floor(1000 + Math.random() * 9000)}`,
          name: v.businessName || v.name || '',
          ownerName: v.ownerName || 'Merchant Owner',
          phone: v.phone || '',
          email: v.email || '',
          state: v.state || '',
          district: v.district || '',
          division: v.division || '',
          pincode: v.pincode || '',
          role: 'Merchant Partner',
          kycStatus: v.kycStatus || 'pending',
          status: v.status || 'active',
          assignedAgent: v.assignedAgent?.name ? `${v.assignedAgent.name} (${v.assignedAgent.role || 'Agent'})` : (typeof v.assignedAgent === 'string' ? v.assignedAgent : 'Field Agent'),
          createdAt: v.createdAt ? new Date(v.createdAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
          updatedAt: v.updatedAt ? new Date(v.updatedAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
          storeType: v.category?.name || v.storeType || 'General Store',
          businessGst: v.gst || v.businessGst || '',
          fullAddress: v.location?.address || ''
        };
        map.set(item.id || item.name, item);
      });
    } catch (e) {
      console.warn('API fetch vendors in modal warning:', e);
    }

    setVendorsList(Array.from(map.values()));
    setIsLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      loadVendors();
    }
  }, [isOpen, userVendorsKey]);

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
      v.email.toLowerCase().includes(q) ||
      v.assignedAgent.toLowerCase().includes(q)
    );
  }, [vendorsList, searchTerm]);

  // Counts
  const totalCount = vendorsList.length;
  const activeCount = vendorsList.filter(v => v.status === 'active' || v.kycStatus === 'approved').length;
  const pendingCount = vendorsList.filter(v => v.kycStatus === 'pending' || v.status === 'pending').length;

  const handleApprove = (vId: string) => {
    setVendorsList(prev => prev.map(v => v.id === vId ? { ...v, kycStatus: 'approved', status: 'active' } : v));
    
    // Update local storage queues
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in font-sans">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl border border-slate-200 flex flex-col">
        
        {/* Header */}
        <div className="p-6 pb-4 border-b border-slate-100 flex items-start justify-between bg-white">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center shrink-0">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Agent Onboarded Vendors</h2>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">
                {totalCount} vendors onboarded by field agents
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
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* Search Field */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by vendor name, agent name, agent ID, pincode, email..."
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
              <span className="text-[9px] uppercase font-black tracking-wider text-purple-700 block">Total Agent Onboarded</span>
              <span className="text-2xl font-black text-purple-900">{totalCount}</span>
            </div>

            <div className="bg-emerald-50/70 border border-emerald-100 p-4 rounded-2xl text-center space-y-0.5">
              <span className="text-[9px] uppercase font-black tracking-wider text-emerald-700 block">Active</span>
              <span className="text-2xl font-black text-emerald-900">{activeCount}</span>
            </div>

            <div className="bg-amber-50/70 border border-amber-100 p-4 rounded-2xl text-center space-y-0.5">
              <span className="text-[9px] uppercase font-black tracking-wider text-amber-700 block">Pending / Others</span>
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
                      <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-slate-400" /> +91 {vendor.phone}</span>
                      <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-purple-600" /> PIN: {vendor.pincode} ({vendor.district})</span>
                    </div>

                    <div className="text-[11px] text-slate-400 font-medium">
                      Onboarded by: <span className="font-bold text-slate-700">{vendor.assignedAgent}</span> • ID: <span className="font-bold text-slate-700">{vendor.id}</span>
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
        <div className="p-4 px-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
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
    </div>
  );
};

export default AgentOnboardedVendorsModal;
