import { getActiveDistricts, getActiveDivisions, getActivePincodes, TerritoryPincode } from '../../utils/territoryService';
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardBody } from '../../components/ui';
import { Ticket, Send, Eye, Loader2, Paperclip, FileText, X, ShieldAlert, ArrowUpRight, CheckCircle2, RotateCcw, UserCheck } from 'lucide-react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface SupportTicket {
  _id: string;
  ticketId: string;
  territory?: string;
  vendorName?: string;
  raisedBy?: string;
  category: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  status: 'open' | 'in_progress' | 'resolved' | 'closed' | 'escalated_to_admin';
  createdAt: string;
  remarks?: string;
  attachmentName?: string;
  assignedAgent?: string;
  assignedAgentName?: string;
  assignedAgentId?: string;
  assignedAgentRole?: string;
  assignedAgentPhone?: string;
  assignedAgentPincode?: string;
  assignedAgentDistrict?: string;
  assignedAgentDivision?: string;
  assignedAgentState?: string;
  assignmentStatus?: string;
}

export const TicketsList: React.FC = () => {
  const { user } = useAuth();
  const rawRole = (user?.role as string) || (user as any)?.level || 'pincode';
  const activeRole = (rawRole === 'agent' ? ((user as any)?.level || 'pincode') : rawRole).toLowerCase();
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
    ''
  ).trim();
  const userDistrict = (
    userTerritory?.district ||
    (user as any)?.assignedDistrict ||
    (user as any)?.district ||
    user?.address?.district ||
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

  const [effectiveState, setEffectiveState] = useState<string>(userState);
  const [resolvedDivision, setResolvedDivision] = useState<string>(userDivision);

  useEffect(() => {
    if (userState) {
      setEffectiveState(userState);
    } else {
      // Fetch hierarchy to resolve the authenticated State Agent's assigned state
      api.get('/territory/hierarchy').then(res => {
        const hierarchy = res.data?.hierarchy;
        if (Array.isArray(hierarchy) && hierarchy.length > 0 && hierarchy[0]?.name) {
          setEffectiveState(hierarchy[0].name.trim());
        }
      }).catch(() => {});
    }
  }, [userState]);

  useEffect(() => {
    if (userDivision) {
      setResolvedDivision(userDivision);
    } else if (userPincode) {
      api.get(`/territory/lookup/${userPincode}`)
        .then(res => {
          if (res.data?.division) {
            setResolvedDivision(res.data.division.trim());
          } else {
            setResolvedDivision('Unavailable');
          }
        })
        .catch(() => {
          setResolvedDivision('Unavailable');
        });
    } else {
      setResolvedDivision('Unavailable');
    }
  }, [userDivision, userPincode]);

  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [merchantPincode, setMerchantPincode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  
  const [category, setCategory] = useState(activeRole === 'state' ? 'Vendor' : 'Vendor Query');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [vendorName, setVendorName] = useState('');
  const [vendorShopName, setVendorShopName] = useState('');
  const [vendorAddress, setVendorAddress] = useState('');
  const [vendorPhone, setVendorPhone] = useState('');
  const [attachment, setAttachment] = useState<{ fileName: string; dataUrl: string } | null>(null);
  
  // State Agent Scope specific creation inputs (Admin Master Territory Driven)
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedDivision, setSelectedDivision] = useState('');
  const [selectedPincode, setSelectedPincode] = useState('');
  const [availableDistricts, setAvailableDistricts] = useState<string[]>([]);
  const [availableDivisions, setAvailableDivisions] = useState<string[]>([]);
  const [availablePincodes, setAvailablePincodes] = useState<TerritoryPincode[]>([]);

  const [isLoadingDistricts, setIsLoadingDistricts] = useState(false);
  const [isLoadingDivisions, setIsLoadingDivisions] = useState(false);
  const [isLoadingPincodes, setIsLoadingPincodes] = useState(false);
  const [districtError, setDistrictError] = useState('');

  // District Agent Scope cascading Division -> Pincode state
  const [districtSelectedDivision, setDistrictSelectedDivision] = useState('');
  const [districtAvailableDivisions, setDistrictAvailableDivisions] = useState<string[]>([]);
  const [districtAvailablePincodes, setDistrictAvailablePincodes] = useState<TerritoryPincode[]>([]);
  const [isLoadingDistrictDivs, setIsLoadingDistrictDivs] = useState(false);
  const [isLoadingDistrictPins, setIsLoadingDistrictPins] = useState(false);

  // Load Active Divisions for District Agent
  useEffect(() => {
    if (activeRole === 'district' && (userState || effectiveState) && userDistrict) {
      setIsLoadingDistrictDivs(true);
      getActiveDivisions(effectiveState || userState, userDistrict)
        .then(divs => {
          setDistrictAvailableDivisions(divs);
          if (districtSelectedDivision && !divs.includes(districtSelectedDivision)) {
            setDistrictSelectedDivision('');
          }
        })
        .catch(err => {
          console.error('Failed to load divisions for district agent:', err);
        })
        .finally(() => {
          setIsLoadingDistrictDivs(false);
        });
    }
  }, [activeRole, effectiveState, userState, userDistrict]);

  // Load Active Pincodes when District Agent selects a Division
  useEffect(() => {
    if (activeRole === 'district' && (userState || effectiveState) && userDistrict && districtSelectedDivision) {
      setIsLoadingDistrictPins(true);
      getActivePincodes(effectiveState || userState, userDistrict, districtSelectedDivision)
        .then(pins => {
          setDistrictAvailablePincodes(pins);
        })
        .catch(err => {
          console.error('Failed to load pincodes for district division:', err);
        })
        .finally(() => {
          setIsLoadingDistrictPins(false);
        });
    } else if (activeRole === 'district') {
      setDistrictAvailablePincodes([]);
    }
  }, [activeRole, effectiveState, userState, userDistrict, districtSelectedDivision]);

  // Load Active Districts for userState or effectiveState
  useEffect(() => {
    if (activeRole === 'state') {
      setIsLoadingDistricts(true);
      setDistrictError('');
      getActiveDistricts(effectiveState || userState)
        .then(dists => {
          setAvailableDistricts(dists);
          if (selectedDistrict && !dists.includes(selectedDistrict)) {
            setSelectedDistrict('');
          }
        })
        .catch(err => {
          console.error('Failed to load districts:', err);
          setDistrictError('Failed to load districts from territory records.');
        })
        .finally(() => {
          setIsLoadingDistricts(false);
        });
    }
  }, [activeRole, effectiveState, userState]);

  // Load Active Divisions when District changes (with child reset)
  useEffect(() => {
    if (activeRole === 'state' && selectedDistrict) {
      setIsLoadingDivisions(true);
      getActiveDivisions(effectiveState || userState, selectedDistrict)
        .then(divs => {
          setAvailableDivisions(divs);
          if (selectedDivision && !divs.includes(selectedDivision)) {
            setSelectedDivision('');
          }
        })
        .catch(err => {
          console.error('Failed to load divisions:', err);
        })
        .finally(() => {
          setIsLoadingDivisions(false);
        });
    } else {
      setAvailableDivisions([]);
      setSelectedDivision('');
      setSelectedPincode('');
    }
  }, [activeRole, effectiveState, userState, selectedDistrict]);

  // Load Active Pincodes when Division changes (with child reset)
  useEffect(() => {
    if (activeRole === 'state' && selectedDistrict && selectedDivision) {
      setIsLoadingPincodes(true);
      getActivePincodes(effectiveState || userState, selectedDistrict, selectedDivision)
        .then(pins => {
          setAvailablePincodes(pins);
          if (selectedPincode && !pins.some(p => p.code === selectedPincode)) {
            setSelectedPincode('');
          }
        })
        .catch(err => {
          console.error('Failed to load pincodes:', err);
        })
        .finally(() => {
          setIsLoadingPincodes(false);
        });
    } else {
      setAvailablePincodes([]);
      setSelectedPincode('');
    }
  }, [activeRole, effectiveState, userState, selectedDistrict, selectedDivision]);

  // State Agent Ticket Inspection / Management State
  const [ticketRaised, setTicketRaised] = useState(false);
  const [stateResponseText, setStateResponseText] = useState('');
  const [assignedAgentTarget, setAssignedAgentTarget] = useState('');
  const [isActionProcessing, setIsActionProcessing] = useState(false);

  // Fast, cached useQuery for ticket data with timeout safeguard
  const {
    data: rawTickets = [],
    isLoading,
    isFetching,
    isError,
    refetch: refetchTickets
  } = useQuery({
    queryKey: ['ticketsListLive', activeRole, userState, userDistrict, userDivision, userPincode],
    queryFn: async () => {
      const res = await api.get('/tickets', { timeout: 8000 });
      return res.data?.tickets || [];
    },
    staleTime: 5000,
    retry: 1,
    refetchOnWindowFocus: false
  });

  const tickets: SupportTicket[] = React.useMemo(() => {
    return (rawTickets || []).map((t: any) => ({
      _id: t._id || `TK-${Math.floor(1000 + Math.random() * 9000)}`,
      ticketId: t.ticketId || `TKT-${Math.floor(10000 + Math.random() * 90000)}`,
      territory: t.territory || [t.district, t.division, t.pincode].filter(Boolean).join(' → ') || (t.state ? `${t.state} Scope` : `${userState} Scope`),
      vendorName: t.storeName || t.vendorName || t.vendor?.name || 'Assigned Merchant',
      raisedBy: t.creatorName
        ? `${t.creatorName} (${(t.creatorRole || 'Agent').toUpperCase()})`
        : (t.creator?.name ? `${t.creator.name} (${(t.creator.role || 'Agent').toUpperCase()})` : (t.raisedBy || 'Downstream Agent')),
      category: t.category || 'Vendor',
      description: t.description || 'Query details',
      priority: t.priority || 'medium',
      status: t.status === 'assigned' ? 'in_progress' : (t.status || 'open'),
      createdAt: t.createdAt ? new Date(t.createdAt).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB'),
      remarks: t.resolutionDetails || t.remarks,
      attachmentName: t.attachmentName,
      assignedAgent: t.assignedAgent,
      assignedAgentName: t.assignedAgentName || t.assignedAgent || (t.assignedAgentId?.name),
      assignedAgentId: t.assignedAgentIdStr || (t.assignedAgentId?._id) || t.assignedAgentId,
      assignedAgentRole: t.assignedAgentRole || (t.assignedAgentId?.role) || (t.assignedAgentId?.level),
      assignedAgentPhone: t.assignedAgentPhone || (t.assignedAgentId?.phone),
      assignedAgentPincode: t.assignedAgentPincode || (t.assignedAgentId?.pincode) || t.pincode,
      assignedAgentDistrict: t.assignedAgentDistrict || (t.assignedAgentId?.district) || t.district,
      assignedAgentDivision: t.assignedAgentDivision || (t.assignedAgentId?.division) || t.division,
      assignedAgentState: t.assignedAgentState || (t.assignedAgentId?.state) || t.state,
      assignmentStatus: t.assignmentStatus || (t.assignedAgent || t.assignedAgentName || t.assignedAgentId ? 'Assigned' : 'Unassigned')
    }));
  }, [rawTickets, userState]);

  // Keep inspected ticket updated when query refetches
  useEffect(() => {
    if (selectedTicket) {
      const fresh = tickets.find(t => t._id === selectedTicket._id || t.ticketId === selectedTicket.ticketId);
      if (fresh) setSelectedTicket(fresh);
    }
  }, [tickets]);

  const handleAttachmentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setAttachment({
        fileName: file.name,
        dataUrl: ev.target?.result as string
      });
    };
    reader.readAsDataURL(file);
  };

  const handleRaiseTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setFormError('');
    setFormSuccess('');

    if (activeRole === 'state') {
      if (!selectedDistrict.trim()) {
        setFormError('Please select or enter the Target District.');
        return;
      }
      if (!selectedDivision.trim()) {
        setFormError('Please enter the Target Division.');
        return;
      }
    } else if (activeRole === 'district') {
      if (!vendorShopName.trim()) {
        setFormError('Please enter the Store Name.');
        return;
      }
      if (!districtSelectedDivision.trim()) {
        setFormError('Please select a Target Division.');
        return;
      }
      if (!merchantPincode.trim()) {
        setFormError('Please select a Target Pincode.');
        return;
      }
    } else {
      if (!vendorShopName.trim()) {
        setFormError('Please enter the Store Name.');
        return;
      }
    }

    if (!description.trim() || description.trim().length < 10) {
      setFormError('Please provide Issue Details (minimum 10 characters required).');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: any = {
        category,
        description: description.trim(),
        priority,
        attachmentName: attachment?.fileName,
        vendorName: vendorName || (user?.name ? `${user.name} Merchant` : 'Assigned Merchant'),
        storeName: vendorShopName.trim()
      };

      if (activeRole === 'state') {
        payload.state = effectiveState || userState;
        payload.district = selectedDistrict.trim();
        payload.division = selectedDivision.trim();
        payload.pincode = selectedPincode.trim();
        payload.territory = `${selectedDistrict.trim()} → ${selectedDivision.trim()}${selectedPincode.trim() ? ` → ${selectedPincode.trim()}` : ''}`;
        payload.assignedAgent = selectedDivision.trim() ? `${selectedDivision.trim()} Lead` : undefined;
      } else {
        payload.state = userState;
        payload.district = userDistrict;
        payload.division = activeRole === 'district' ? (districtSelectedDivision.trim() || userDivision) : userDivision;
        payload.pincode = merchantPincode.trim() || userPincode;
        payload.territory = [payload.district, payload.division, payload.pincode].filter(Boolean).join(' → ');
      }

      await api.post('/tickets', payload);

      setFormSuccess('Support ticket successfully logged!');
      setTicketRaised(true);

      // Reset form fields
      setDescription('');
      setVendorShopName('');
      setVendorAddress('');
      setVendorPhone('');
      setMerchantPincode('');
      setAttachment(null);

      // Immediately refresh the tickets list from backend API
      await refetchTickets();

      setTimeout(() => {
        setTicketRaised(false);
        setFormSuccess('');
      }, 4000);
    } catch (err: any) {
      console.error('Submit ticket error:', err);
      const errData = err.response?.data;
      const fieldError = Array.isArray(errData?.errors) && errData.errors.length > 0
        ? errData.errors.map((e: any) => e.message).join(', ')
        : null;
      const backendMsg = fieldError || errData?.message || errData?.error || err.message || 'Failed to submit support ticket. Please try again.';
      setFormError(backendMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // State Agent Ticket Actions (Respond, Assign, Resolve, Reopen)
  const handleStateRespond = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !stateResponseText.trim() || isActionProcessing) return;

    setIsActionProcessing(true);
    try {
      const responseNote = `[State Response ${new Date().toLocaleDateString('en-GB')}]: ${stateResponseText.trim()}`;
      await api.patch(`/tickets/${selectedTicket._id}/status`, {
        remarks: responseNote
      });
      await refetchTickets();
      setStateResponseText('');
    } catch (err: any) {
      console.error('State respond error:', err);
    } finally {
      setIsActionProcessing(false);
    }
  };

  const handleStateAssign = async (agentName: string) => {
    if (!selectedTicket || !agentName || isActionProcessing) return;
    setIsActionProcessing(true);
    try {
      await api.patch(`/tickets/${selectedTicket._id}/status`, {
        status: 'in_progress',
        assignedAgent: agentName,
        remarks: `Assigned to ${agentName} by State Desk`
      });
      await refetchTickets();
    } catch (err: any) {
      console.error('State assign error:', err);
    } finally {
      setIsActionProcessing(false);
    }
  };

  const handleStateResolve = async () => {
    if (!selectedTicket || isActionProcessing) return;
    setIsActionProcessing(true);
    try {
      await api.patch(`/tickets/${selectedTicket._id}/status`, {
        status: 'resolved',
        remarks: 'Resolved by State Agent Desk'
      });
      await refetchTickets();
    } catch (err: any) {
      console.error('State resolve error:', err);
    } finally {
      setIsActionProcessing(false);
    }
  };

  const handleStateReopen = async () => {
    if (!selectedTicket || isActionProcessing) return;
    setIsActionProcessing(true);
    try {
      await api.patch(`/tickets/${selectedTicket._id}/status`, {
        status: 'open',
        remarks: 'Reopened for re-investigation by State Desk'
      });
      await refetchTickets();
    } catch (err: any) {
      console.error('State reopen error:', err);
    } finally {
      setIsActionProcessing(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-[#1b1c1c] font-sans">
      {/* HUD Header Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-[16px] border border-[#eae8e7] shadow-sm gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-[#1b1c1c] font-sans">
              {activeRole.charAt(0).toUpperCase() + activeRole.slice(1)} Support & Escalation Desk
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#864f19] text-white">
              {activeRole.toUpperCase()} SCOPE
            </span>
          </div>
          <p className="text-xs font-semibold text-[#52443a] mt-1 uppercase tracking-wider">
            {activeRole === 'state'
              ? `MANAGE AND RESOLVE STATE-WIDE ESCALATED SUPPORT TICKETS ACROSS ALL DISTRICTS, DIVISIONS, AND PINCODE AGENTS IN ${(effectiveState || userState || 'Assigned State').toUpperCase()}.`
              : `SUBMIT MERCHANT QUERIES, KYC DOCUMENT DISPUTES, OR ESCALATE TICKETS ACROSS ASSIGNED ${activeRole.toUpperCase()} TERRITORY.`}
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 bg-rose-50 text-rose-800 text-xs font-bold rounded-xl border border-rose-200">
          ⚠️ {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Support Ticket Logs Table */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="border-b border-slate-50 pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-extrabold text-slate-800">
                {activeRole.charAt(0).toUpperCase() + activeRole.slice(1)} Support & Escalation Logs
              </CardTitle>
              {activeRole === 'state' && (
                <span className="text-[10px] font-black text-[#864f19] bg-[#ffdcc2] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  State Escalation Desk
                </span>
              )}
            </CardHeader>
            <CardBody className="p-0 overflow-x-auto">
              {isLoading ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="w-8 h-8 text-[#864f19] animate-spin" />
                </div>
              ) : isError ? (
                <div className="py-12 text-center space-y-3">
                  <p className="text-xs font-bold text-rose-700">Failed to load support tickets from server.</p>
                  <button
                    onClick={() => refetchTickets()}
                    className="px-4 py-2 bg-[#864f19] hover:bg-[#a3672f] text-white text-xs font-bold rounded-xl cursor-pointer border-none shadow-sm inline-flex items-center gap-1.5 mx-auto"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Retry Loading Tickets
                  </button>
                </div>
              ) : tickets.length === 0 ? (
                <div className="py-12 text-center text-slate-500 font-bold text-xs">
                  No tickets logged. Submit a support ticket on the right panel.
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#eae8e7] bg-[#fbf9f8] text-[9px] font-black uppercase text-[#52443a] tracking-wider">
                      <th className="py-3 px-4">Ticket ID</th>
                      {activeRole === 'state' && <th className="py-3 px-4">Territory (District → Division → Pincode)</th>}
                      <th className="py-3 px-4">Vendor</th>
                      {activeRole === 'state' && <th className="py-3 px-4">Raised By</th>}
                      <th className="py-3 px-4">Assigned Agent</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Priority</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Date</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#eae8e7] text-xs font-semibold">
                    {tickets.map((ticket) => (
                      <tr key={ticket._id} className="hover:bg-slate-50/50 transition">
                        <td className="py-3.5 px-4 font-bold text-[#864f19] whitespace-nowrap">{ticket.ticketId}</td>
                        {activeRole === 'state' && (
                          <td className="py-3.5 px-4 font-bold text-slate-800 text-[11px] min-w-[200px]">
                            {ticket.territory || `${userState} Scope`}
                          </td>
                        )}
                        <td className="py-3.5 px-4 font-bold text-slate-800">{ticket.vendorName || 'Assigned Merchant'}</td>
                        {activeRole === 'state' && (
                          <td className="py-3.5 px-4 font-extrabold text-[#34647b] text-[11px]">
                            {ticket.raisedBy || 'Downstream Agent'}
                          </td>
                        )}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {ticket.assignedAgentName || ticket.assignedAgent ? (
                            <div className="space-y-0.5">
                              <p className="font-extrabold text-[#1b1c1c] text-xs flex items-center gap-1">
                                <UserCheck className="w-3.5 h-3.5 text-[#864f19]" />
                                {ticket.assignedAgentName || ticket.assignedAgent}
                              </p>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[9px] font-black uppercase px-1.5 py-0.5 bg-[#ffdcc2] text-[#864f19] rounded">
                                  {ticket.assignedAgentRole || 'Agent'}
                                </span>
                                {ticket.assignedAgentPincode && (
                                  <span className="text-[10px] text-slate-500 font-semibold">
                                    PIN: {ticket.assignedAgentPincode}
                                  </span>
                                )}
                              </div>
                              {ticket.assignedAgentPhone && (
                                <p className="text-[10px] text-slate-400 font-medium">📞 {ticket.assignedAgentPhone}</p>
                              )}
                            </div>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-slate-100 text-slate-500 border border-slate-200">
                              Unassigned
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-700">{ticket.category}</td>
                        <td className="py-3.5 px-4 uppercase text-[10px] font-black">
                          <span className={ticket.priority === 'high' ? 'text-rose-600' : 'text-slate-600'}>
                            {ticket.priority}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                            ticket.status === 'resolved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            ticket.status === 'in_progress' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            ticket.status === 'escalated_to_admin' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                            'bg-blue-50 text-blue-700 border-blue-200'
                          }`}>
                            {ticket.status === 'open' ? 'Open' :
                             ticket.status === 'in_progress' ? 'In Progress' :
                             ticket.status === 'escalated_to_admin' ? 'Escalated to Admin' :
                             'Resolved'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right text-slate-500 text-[11px] whitespace-nowrap">{ticket.createdAt}</td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => setSelectedTicket(ticket)}
                            className="p-1.5 text-slate-500 hover:text-[#864f19] transition cursor-pointer bg-transparent border-none flex items-center justify-center mx-auto"
                            title="Inspect & Manage Ticket"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardBody>
          </Card>

          {/* Expanded inspect & state action card */}
          {selectedTicket && (
            <Card className="border-l-4 border-l-[#864f19] animate-fade-in">
              <CardHeader className="pb-2 border-b border-slate-50">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-2">
                  <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    Ticket Log <span className="text-[#864f19] font-black">{selectedTicket.ticketId}</span>
                    {selectedTicket.assignedAgent && (
                      <span className="text-[10px] bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-full">
                        Assigned To: {selectedTicket.assignedAgent}
                      </span>
                    )}
                  </span>
                  <button
                    onClick={() => setSelectedTicket(null)}
                    className="text-xs font-bold text-[#864f19] hover:underline cursor-pointer bg-transparent border-none"
                  >
                    Close ✕
                  </button>
                </div>
                <CardTitle className="text-sm font-extrabold text-slate-800 mt-1">
                  Category: {selectedTicket.category} • Merchant: {selectedTicket.vendorName}
                </CardTitle>
                {selectedTicket.territory && (
                  <p className="text-[10px] font-bold text-[#864f19] mt-0.5">
                    Territory Scope: {selectedTicket.territory} {selectedTicket.raisedBy ? `• Raised By: ${selectedTicket.raisedBy}` : ''}
                  </p>
                )}
              </CardHeader>
              <CardBody className="py-4 space-y-4 text-xs">
                {/* Dedicated Responsible Agent Information Card */}
                <div className="p-3.5 bg-[#fbf9f8] rounded-xl border border-[#eae8e7] space-y-2">
                  <span className="text-[10px] font-black text-[#864f19] uppercase tracking-wider block">
                    Responsible Agent Details
                  </span>
                  {selectedTicket.assignedAgentName || selectedTicket.assignedAgent ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase font-bold block">Agent Name</span>
                        <p className="font-extrabold text-slate-800 text-xs">{selectedTicket.assignedAgentName || selectedTicket.assignedAgent}</p>
                        {selectedTicket.assignedAgentId && (
                          <p className="text-[10px] text-slate-400 font-mono">ID: {selectedTicket.assignedAgentId}</p>
                        )}
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase font-bold block">Role & Tier</span>
                        <p className="font-bold text-[#864f19] uppercase">{selectedTicket.assignedAgentRole || 'Pincode Agent'}</p>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase font-bold block">Registered Mobile</span>
                        <p className="font-semibold text-slate-700">{selectedTicket.assignedAgentPhone || 'Not Available'}</p>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase font-bold block">Territory Scope</span>
                        <p className="font-semibold text-slate-700">
                          PIN: {selectedTicket.assignedAgentPincode || '—'}
                          {selectedTicket.assignedAgentDivision && ` • ${selectedTicket.assignedAgentDivision}`}
                          {selectedTicket.assignedAgentDistrict && ` • ${selectedTicket.assignedAgentDistrict}`}
                        </p>
                      </div>
                      <div className="sm:col-span-2 pt-1 border-t border-slate-200/60 flex items-center justify-between">
                        <span className="text-[9px] text-slate-400 uppercase font-bold">Assignment Status:</span>
                        <span className="inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {selectedTicket.assignmentStatus || 'Assigned'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2.5 bg-slate-100 rounded-lg text-slate-600 font-bold text-xs flex items-center justify-between">
                      <span>No agent currently assigned to this ticket.</span>
                      <span className="text-[9px] uppercase px-2 py-0.5 bg-slate-200 rounded text-slate-600 font-black">Unassigned</span>
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Issue Details</span>
                  <p className="text-slate-700 font-semibold leading-relaxed bg-[#fbf9f8] p-3 rounded-xl border border-slate-100">
                    {selectedTicket.description}
                  </p>
                </div>
                {selectedTicket.attachmentName && (
                  <p className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                    <Paperclip className="w-3.5 h-3.5" /> Attachment: {selectedTicket.attachmentName}
                  </p>
                )}
                {selectedTicket.remarks && (
                  <div className="space-y-1 pt-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Support Resolution Logs</span>
                    <p className="text-slate-600 font-semibold leading-relaxed bg-[#fef9f5] p-3 rounded-xl border border-[#eae8e7]">
                      {selectedTicket.remarks}
                    </p>
                  </div>
                )}

                {/* State Agent Exclusive Interactive Ticket Management Controls */}
                {activeRole === 'state' && (
                  <div className="pt-4 border-t border-[#eae8e7] space-y-4 bg-[#fbf9f8] p-4 rounded-xl">
                    <span className="text-[10px] font-black uppercase text-[#864f19] tracking-wider block">
                      State Desk Escalation Actions
                    </span>

                    {/* Respond / Add Remarks Form */}
                    <form onSubmit={handleStateRespond} className="space-y-2">
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">State Response & Remarks</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={stateResponseText}
                          onChange={(e) => setStateResponseText(e.target.value)}
                          placeholder="Type State Desk response or instructions..."
                          className="flex-grow bg-white border border-[#d7c3b5]/60 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#864f19]"
                        />
                        <button
                          type="submit"
                          className="px-4 py-2 bg-[#864f19] hover:bg-[#a3672f] text-white rounded-xl font-bold text-xs shadow-sm cursor-pointer whitespace-nowrap"
                        >
                          Add Response Note
                        </button>
                      </div>
                    </form>

                    {/* Action Buttons Bar: Assign to Agent, Resolve, Reopen */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                      <div className="flex items-center gap-2 flex-grow sm:flex-grow-0">
                        <select
                          disabled={isActionProcessing}
                          value={assignedAgentTarget}
                          onChange={(e) => {
                            setAssignedAgentTarget(e.target.value);
                            handleStateAssign(e.target.value);
                          }}
                          className="bg-white border border-[#d7c3b5]/60 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#864f19] disabled:opacity-50"
                        >
                          <option value="">Assign to Responsible Agent...</option>
                          <option value="District Lead">District Lead ({selectedDistrict || userState})</option>
                          <option value="Division Lead">Division Lead</option>
                          <option value="Pincode Agent">Pincode Agent</option>
                          <option value="System Admin">System SuperAdmin</option>
                        </select>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {selectedTicket.status !== 'resolved' ? (
                          <button
                            type="button"
                            disabled={isActionProcessing}
                            onClick={handleStateResolve}
                            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-sm border-none disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> {isActionProcessing ? 'Updating...' : 'Mark Resolved'}
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={isActionProcessing}
                            onClick={handleStateReopen}
                            className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-sm border-none disabled:opacity-50"
                          >
                            <RotateCcw className="w-3.5 h-3.5" /> {isActionProcessing ? 'Updating...' : 'Reopen Ticket'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

              </CardBody>
            </Card>
          )}
        </div>

        {/* Raise Ticket Form Widget */}
        <div className="bg-white rounded-[16px] border border-[#eae8e7] p-6 shadow-sm h-fit space-y-4">
          <div className="border-b border-[#eae8e7] pb-3">
            <h3 className="font-extrabold text-sm text-[#1b1c1c] flex items-center gap-1.5">
              <Ticket className="w-4 h-4 text-[#864f19]" /> {activeRole === 'state' ? 'Create State Support Ticket' : 'Raise Support Ticket'}
            </h3>
            <p className="text-[10px] text-slate-500 mt-0.5 font-medium">
              {activeRole === 'state' ? 'Log a state-wide ticket or issue for downstream agents and merchants.' : 'Select assigned merchant and describe the issue.'}
            </p>
          </div>
          
          <form onSubmit={handleRaiseTicket} className="space-y-4 text-xs font-semibold">
            {activeRole === 'state' ? (
              <>
                {/* State Agent Scope Territory Selectors */}
                <div className="space-y-1">
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Target District *</label>
                  <select
                    value={selectedDistrict}
                    onChange={(e) => {
                      setSelectedDistrict(e.target.value);
                      setSelectedDivision('');
                      setSelectedPincode('');
                    }}
                    disabled={isLoadingDistricts}
                    className="w-full bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl py-2.5 px-3 text-xs text-[#1b1c1c] focus:outline-none focus:ring-1 focus:ring-[#864f19]"
                  >
                    <option value="">-- Select District --</option>
                    {isLoadingDistricts ? (
                      <option value="" disabled>Loading districts...</option>
                    ) : districtError ? (
                      <option value="" disabled>{districtError}</option>
                    ) : availableDistricts.length === 0 ? (
                      <option value="" disabled>No districts configured for {effectiveState || userState || 'assigned state'}</option>
                    ) : (
                      availableDistricts.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))
                    )}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Target Division *</label>
                  <select
                    value={selectedDivision}
                    onChange={(e) => {
                      setSelectedDivision(e.target.value);
                      setSelectedPincode('');
                    }}
                    disabled={!selectedDistrict || isLoadingDivisions}
                    className="w-full bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl py-2.5 px-3 text-xs text-[#1b1c1c] focus:outline-none focus:ring-1 focus:ring-[#864f19] disabled:opacity-50"
                  >
                    <option value="">-- Select Division --</option>
                    {isLoadingDivisions ? (
                      <option value="" disabled>Loading divisions...</option>
                    ) : selectedDistrict && availableDivisions.length === 0 ? (
                      <option value="" disabled>No divisions configured for {selectedDistrict}</option>
                    ) : (
                      availableDivisions.map(v => (
                        <option key={v} value={v}>{v}</option>
                      ))
                    )}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Pincode Sector & Responsible Agent (Optional)</label>
                  <select
                    value={selectedPincode}
                    onChange={(e) => setSelectedPincode(e.target.value)}
                    disabled={!selectedDivision || isLoadingPincodes}
                    className="w-full bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl py-2.5 px-3 text-xs text-[#1b1c1c] focus:outline-none focus:ring-1 focus:ring-[#864f19] disabled:opacity-50"
                  >
                    <option value="">-- Select Pincode (Optional) --</option>
                    {isLoadingPincodes ? (
                      <option value="" disabled>Loading pincodes...</option>
                    ) : selectedDivision && availablePincodes.length === 0 ? (
                      <option value="" disabled>No pincodes configured for {selectedDivision}</option>
                    ) : (
                      availablePincodes.map(p => {
                        const agentLabel = p.activeAgentId?.name ? ` (${p.activeAgentId.name} - Pincode Agent)` : '';
                        return (
                          <option key={p.code} value={p.code}>
                            {p.code}{p.area ? ` - ${p.area}` : ''}{agentLabel}
                          </option>
                        );
                      })
                    )}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Merchant / Store Name (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Sri Rama Supermarket"
                    value={vendorShopName}
                    onChange={(e) => setVendorShopName(e.target.value)}
                    className="w-full bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl py-2.5 px-3 text-xs text-[#1b1c1c] focus:outline-none focus:ring-1 focus:ring-[#864f19]"
                  />
                </div>
              </>
            ) : (
              <>
                {activeRole === 'pincode' ? (
                  <>
                    <div className="space-y-1">
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Vendor Name *</label>
                      <input
                        type="text"
                        readOnly
                        value={user?.name ? `${user.name} Merchant` : 'Pincodeagent Merchant'}
                        className="w-full bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl py-2.5 px-3 text-xs font-bold text-[#1b1c1c] focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Store Name *</label>
                      <input
                        type="text"
                        required
                        value={vendorShopName}
                        onChange={(e) => setVendorShopName(e.target.value)}
                        placeholder="Enter store name..."
                        className="w-full bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl py-2.5 px-3 text-xs font-bold text-[#864f19] focus:outline-none focus:ring-1 focus:ring-[#864f19]"
                      />
                    </div>

                    <div className="p-3 bg-[#fbf9f8] rounded-xl border border-[#d7c3b5]/60 space-y-1.5 text-[11px]">
                      <p className="text-[9px] font-black text-[#864f19] uppercase tracking-wider">Territory Location Details (Pincode Scope)</p>
                      <p className="text-slate-800">State: <strong>{userState || '—'}</strong></p>
                      <p className="text-slate-800">District: <strong>{userDistrict || '—'}</strong></p>
                      <p className="text-slate-800">Division: <strong>{resolvedDivision || userDivision || 'Unavailable'}</strong></p>
                      <p className="text-slate-800">Assigned Pincode: <strong className="text-[#864f19]">PIN {userPincode || '—'}</strong></p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-1">
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Assigned Merchant Store Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="Enter merchant / store name..."
                        value={vendorShopName}
                        onChange={(e) => setVendorShopName(e.target.value)}
                        className="w-full bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl py-2.5 px-3 text-xs text-[#1b1c1c] focus:outline-none focus:ring-1 focus:ring-[#864f19]"
                      />
                    </div>

                    {activeRole === 'district' ? (
                      <div className="p-3 bg-[#fbf9f8] rounded-xl border border-[#d7c3b5]/60 space-y-1.5 text-[11px]">
                        <p className="text-[9px] font-black text-[#864f19] uppercase tracking-wider">Territory Location Details (District Scope)</p>
                        <p className="text-slate-800">State: <strong>{userState || '—'}</strong></p>
                        <p className="text-slate-800">District: <strong className="text-[#864f19]">{userDistrict || '—'}</strong></p>
                      </div>
                    ) : (
                      <div className="p-3 bg-[#fbf9f8] rounded-xl border border-[#d7c3b5]/60 space-y-1.5 text-[11px]">
                        <p className="text-[9px] font-black text-[#864f19] uppercase tracking-wider">Territory Location Details (Division Scope)</p>
                        <p className="text-slate-800">State: <strong>{userState || '—'}</strong></p>
                        <p className="text-slate-800">District: <strong>{userDistrict || '—'}</strong></p>
                        <p className="text-slate-800">Assigned Division: <strong className="text-[#864f19]">{userDivision || '—'}</strong></p>
                      </div>
                    )}

                    {activeRole === 'district' ? (
                      <>
                        <div className="space-y-1">
                          <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Select Division *</label>
                          <select
                            value={districtSelectedDivision}
                            onChange={(e) => {
                              setDistrictSelectedDivision(e.target.value);
                              setMerchantPincode('');
                            }}
                            disabled={isLoadingDistrictDivs}
                            className="w-full bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl py-2.5 px-3 text-xs text-[#1b1c1c] focus:outline-none focus:ring-1 focus:ring-[#864f19]"
                          >
                            <option value="">-- Select Division --</option>
                            {isLoadingDistrictDivs ? (
                              <option value="" disabled>Loading divisions...</option>
                            ) : districtAvailableDivisions.length === 0 ? (
                              <option value="" disabled>No divisions found for {userDistrict}</option>
                            ) : (
                              districtAvailableDivisions.map(v => (
                                <option key={v} value={v}>{v}</option>
                              ))
                            )}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Select Pincode *</label>
                          <select
                            value={merchantPincode}
                            onChange={(e) => setMerchantPincode(e.target.value)}
                            disabled={!districtSelectedDivision || isLoadingDistrictPins}
                            className="w-full bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl py-2.5 px-3 text-xs text-[#1b1c1c] focus:outline-none focus:ring-1 focus:ring-[#864f19] disabled:opacity-50"
                          >
                            <option value="">-- Select Pincode --</option>
                            {isLoadingDistrictPins ? (
                              <option value="" disabled>Loading pincodes...</option>
                            ) : districtSelectedDivision && districtAvailablePincodes.length === 0 ? (
                              <option value="" disabled>No pincodes found for {districtSelectedDivision}</option>
                            ) : (
                              districtAvailablePincodes.map(p => (
                                <option key={p.code} value={p.code}>
                                  {p.code}{p.area ? ` - ${p.area}` : ''}
                                </option>
                              ))
                            )}
                          </select>
                        </div>
                      </>
                    ) : (
                      <div className="space-y-1">
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Select Merchant Pincode *</label>
                        <input
                          type="text"
                          value={merchantPincode}
                          onChange={(e) => setMerchantPincode(e.target.value)}
                          placeholder={`Enter pincode (your territory: ${userPincode || '—'})`}
                          className="w-full bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl py-2.5 px-3 text-xs text-[#1b1c1c] focus:outline-none focus:ring-1 focus:ring-[#864f19]"
                        />
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Assigned Pincode Agent</label>
                      <input
                        type="text"
                        placeholder="Enter agent name (optional)..."
                        className="w-full bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl py-2.5 px-3 text-xs text-[#1b1c1c] focus:outline-none focus:ring-1 focus:ring-[#864f19]"
                      />
                    </div>
                  </>
                )}
              </>
            )}

            <div className="space-y-1">
              <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Select Issue Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl py-2.5 px-3 text-xs text-[#1b1c1c] focus:outline-none focus:ring-1 focus:ring-[#864f19]"
              >
                {activeRole === 'state' ? (
                  <>
                    <option value="Vendor">Vendor</option>
                    <option value="KYC">KYC</option>
                    <option value="Agent">Agent</option>
                    <option value="Target/Task">Target/Task</option>
                    <option value="Field Visit">Field Visit</option>
                    <option value="Payment">Payment</option>
                    <option value="System">System</option>
                    <option value="Other">Other</option>
                  </>
                ) : (
                  <>
                    <option value="Vendor Query">Vendor Query</option>
                    <option value="KYC Document Issue">KYC Document Issue</option>
                    <option value="Portal Account Block">Portal Account Block</option>
                    <option value="Hardware / QR Standee Request">Hardware / QR Standee Request</option>
                    <option value="Payment Issue">Payment Issue</option>
                  </>
                )}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Select Priority</label>
              <select
                value={priority}
                onChange={(e: any) => setPriority(e.target.value)}
                className="w-full bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl py-2.5 px-3 text-xs text-[#1b1c1c] focus:outline-none focus:ring-1 focus:ring-[#864f19]"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Issue Details (Minimum 10 characters) *</label>
              <textarea
                required
                minLength={10}
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (formError) setFormError('');
                }}
                placeholder="Please describe the issue in detail (at least 10 characters)..."
                rows={3}
                className="w-full bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl py-2.5 px-3 text-xs text-[#1b1c1c] focus:outline-none focus:ring-1 focus:ring-[#864f19] resize-none"
              />
            </div>

            {/* Optional Attachment Upload */}
            <div className="space-y-1">
              <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Optional Attachment (JPG/PNG/PDF)</label>
              <div className="flex items-center gap-2">
                <label className="px-3 py-1.5 bg-[#fbf9f8] hover:bg-[#eae8e7] border border-[#d7c3b5] rounded-xl font-bold text-xs cursor-pointer flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5 text-[#864f19]" />
                  <span>{attachment ? 'Change Attachment' : 'Upload File'}</span>
                  <input type="file" accept=".jpg,.jpeg,.png,.pdf" className="hidden" onChange={handleAttachmentUpload} />
                </label>
                {attachment && (
                  <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg">
                    <FileText className="w-3 h-3" />
                    <span className="truncate max-w-[100px]">{attachment.fileName}</span>
                    <button type="button" onClick={() => setAttachment(null)} className="text-rose-600 hover:text-rose-800 bg-transparent border-none cursor-pointer">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 text-rose-800 text-xs font-bold rounded-xl border border-rose-200 animate-fade-in">
                ⚠️ {formError}
              </div>
            )}

            {(formSuccess || ticketRaised) && (
              <div className="p-3 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200 animate-fade-in">
                ✓ {formSuccess || 'Ticket successfully logged!'}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-3 bg-[#864f19] hover:bg-[#a3672f] text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm transition-all border-none flex items-center justify-center gap-2 ${
                isSubmitting ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting Ticket...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>{activeRole === 'state' ? 'Log State Ticket' : 'Submit Support Ticket'}</span>
                </>
              )}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};

export default TicketsList;
