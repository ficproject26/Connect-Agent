import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardBody } from '../../components/ui';
import { Ticket, Send, Eye, Loader2, Paperclip, FileText, X, ShieldAlert, ArrowUpRight, CheckCircle2, RotateCcw, UserCheck } from 'lucide-react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

interface SupportTicket {
  _id: string;
  ticketId: string;
  territory?: string;
  vendorName?: string;
  raisedBy?: string;
  category: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved' | 'closed' | 'escalated_to_admin';
  createdAt: string;
  remarks?: string;
  attachmentName?: string;
  assignedAgent?: string;
}

export const TicketsList: React.FC = () => {
  const { user } = useAuth();
  const rawRole = (user?.role as string) || (user as any)?.level || 'pincode';
  const activeRole = (rawRole === 'agent' ? ((user as any)?.level || 'pincode') : rawRole).toLowerCase();
  const userState = user?.territory?.state || 'Andhra Pradesh';

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [assignedVendors, setAssignedVendors] = useState<any[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [category, setCategory] = useState(activeRole === 'state' ? 'Vendor' : 'Vendor Query');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [vendorName, setVendorName] = useState('');
  const [vendorShopName, setVendorShopName] = useState('');
  const [vendorAddress, setVendorAddress] = useState('');
  const [vendorPhone, setVendorPhone] = useState('');
  const [attachment, setAttachment] = useState<{ fileName: string; dataUrl: string } | null>(null);
  
  // State Agent Scope specific creation inputs
  const [selectedDistrict, setSelectedDistrict] = useState('Visakhapatnam');
  const [selectedDivision, setSelectedDivision] = useState('Vizag City Division');
  const [selectedPincode, setSelectedPincode] = useState('530001');

  // State Agent Ticket Inspection / Management State
  const [ticketRaised, setTicketRaised] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [stateResponseText, setStateResponseText] = useState('');
  const [assignedAgentTarget, setAssignedAgentTarget] = useState('');

  // Load assigned vendors for logged in agent
  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const res = await api.get('/vendors');
        const list = res.data.vendors || [];
        setAssignedVendors(list);
      } catch (err) {
        setAssignedVendors([]);
      }
    };
    fetchVendors();
  }, []);

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

  const fetchTickets = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const response = await api.get('/tickets');
      const backendTickets = response.data.tickets || [];
      
      const mapped: SupportTicket[] = backendTickets.map((t: any) => ({
        _id: t._id || `TK-${Math.floor(1000 + Math.random() * 9000)}`,
        ticketId: t.ticketId || `TKT-${Math.floor(10000 + Math.random() * 90000)}`,
        territory: t.territory || `${t.district || 'Visakhapatnam'} → ${t.division || 'Vizag City'} → ${t.pincode || '530001'}`,
        vendorName: t.vendorName || t.vendor?.name || 'Assigned Merchant',
        raisedBy: t.raisedBy || t.agentName || 'Downstream Agent',
        category: t.category || 'Vendor',
        description: t.description || 'Query details',
        priority: t.priority || 'medium',
        status: t.status === 'assigned' ? 'in_progress' : (t.status || 'open'),
        createdAt: t.createdAt ? new Date(t.createdAt).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB'),
        remarks: t.resolutionDetails || t.remarks,
        attachmentName: t.attachmentName,
        assignedAgent: t.assignedAgent
      }));

      if (activeRole === 'state') {
        const stateInitialTickets: SupportTicket[] = [
          {
            _id: 'ST-101',
            ticketId: 'TKT-91042',
            territory: 'Visakhapatnam → Vizag City → 530001',
            vendorName: 'Sri Rama Supermarket',
            raisedBy: 'raki pin (Pincode Agent)',
            category: 'KYC',
            description: 'Vendor GST certificate mismatch during state onboarding audit.',
            priority: 'high',
            status: 'open',
            createdAt: new Date().toLocaleDateString('en-GB'),
            remarks: 'Pending State Agent review',
            assignedAgent: 'raki pin (Pincode Agent)'
          },
          {
            _id: 'ST-102',
            ticketId: 'TKT-82915',
            territory: 'NTR District → Vijayawada Central → 520001',
            vendorName: 'Governorpet Electronics',
            raisedBy: 'Kiran Kumar (Division Agent)',
            category: 'Payment',
            description: 'Payout processing delay for onboarded merchant tie-up commission.',
            priority: 'critical',
            status: 'in_progress',
            createdAt: new Date(Date.now() - 86400000).toLocaleDateString('en-GB'),
            remarks: 'Escalated to State Finance team',
            assignedAgent: 'Kiran Kumar (Division Agent)'
          },
          {
            _id: 'ST-103',
            ticketId: 'TKT-74109',
            territory: 'Guntur → Guntur City → 522002',
            vendorName: 'Kothapet Mart',
            raisedBy: 'Guntur Lead (District Agent)',
            category: 'Target/Task',
            description: 'Target quota allocation dispute for Q3 merchant onboarding.',
            priority: 'medium',
            status: 'open',
            createdAt: new Date(Date.now() - 172800000).toLocaleDateString('en-GB'),
            remarks: 'Awaiting District Lead response',
            assignedAgent: 'Guntur Lead (District Agent)'
          },
          {
            _id: 'ST-104',
            ticketId: 'TKT-63028',
            territory: 'Chittoor → Tirupati Central → 517501',
            vendorName: 'Tirupati Textiles',
            raisedBy: 'Tirupati Agent (Pincode Agent)',
            category: 'Field Visit',
            description: 'Merchant GPS verification failure during physical audit visit.',
            priority: 'low',
            status: 'resolved',
            createdAt: new Date(Date.now() - 259200000).toLocaleDateString('en-GB'),
            remarks: 'GPS verification re-audited and approved by State Lead.',
            assignedAgent: 'Tirupati Agent (Pincode Agent)'
          }
        ];
        const combined = [...mapped.filter(m => !stateInitialTickets.some(s => s.ticketId === m.ticketId)), ...stateInitialTickets];
        setTickets(combined);
      } else {
        setTickets(mapped);
      }
    } catch (err: any) {
      setTickets([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [activeRole]);

  const handleRaiseTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (description.length < 10) {
      setErrorMsg('Issue Description must be at least 10 characters.');
      return;
    }
    
    setErrorMsg('');
    const newTicketId = `TKT-${Math.floor(10000 + Math.random() * 90000)}`;
    const newTicket: SupportTicket = {
      _id: `TK-${Math.floor(1000 + Math.random() * 9000)}`,
      ticketId: newTicketId,
      territory: activeRole === 'state' ? `${selectedDistrict} → ${selectedDivision} → ${selectedPincode}` : `${user?.territory?.district || 'Visakhapatnam'} → ${user?.territory?.division || 'Vizag City'} → 530001`,
      vendorName: vendorShopName || 'Assigned Merchant',
      raisedBy: activeRole === 'state' ? `${user?.name || 'State Agent'} (State Lead)` : `${user?.name || 'Division Agent'} (Division Scope)`,
      category,
      description,
      priority,
      status: 'open',
      createdAt: new Date().toLocaleDateString('en-GB'),
      attachmentName: attachment?.fileName,
      assignedAgent: activeRole === 'state' ? `${selectedDivision} Lead` : undefined
    };

    try {
      await api.post('/tickets', {
        category,
        description: `[${vendorShopName ? `Vendor: ${vendorShopName}` : 'General'}] ${description}`,
        priority,
        attachmentName: attachment?.fileName
      });
    } catch (err: any) {}
    
    setTickets(prev => [newTicket, ...prev]);
    setTicketRaised(true);
    setDescription('');
    setSelectedVendorId('');
    setVendorName('');
    setVendorShopName('');
    setVendorAddress('');
    setVendorPhone('');
    setAttachment(null);
    
    setTimeout(() => setTicketRaised(false), 3000);
  };

  // State Agent Ticket Actions (Respond, Assign, Escalate, Resolve, Reopen)
  const handleStateRespond = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !stateResponseText.trim()) return;

    const updatedRemarks = `${selectedTicket.remarks ? `${selectedTicket.remarks} | ` : ''}[State Response ${new Date().toLocaleDateString('en-GB')}]: ${stateResponseText.trim()}`;
    const updatedTicket: SupportTicket = {
      ...selectedTicket,
      remarks: updatedRemarks
    };

    setTickets(prev => prev.map(t => t._id === selectedTicket._id ? updatedTicket : t));
    setSelectedTicket(updatedTicket);
    setStateResponseText('');
  };

  const handleStateAssign = (agentName: string) => {
    if (!selectedTicket || !agentName) return;
    const updatedTicket: SupportTicket = {
      ...selectedTicket,
      assignedAgent: agentName,
      status: 'in_progress',
      remarks: `${selectedTicket.remarks ? `${selectedTicket.remarks} | ` : ''}Assigned to ${agentName} by State Desk`
    };
    setTickets(prev => prev.map(t => t._id === selectedTicket._id ? updatedTicket : t));
    setSelectedTicket(updatedTicket);
  };

  const handleStateEscalateAdmin = () => {
    if (!selectedTicket) return;
    const updatedTicket: SupportTicket = {
      ...selectedTicket,
      status: 'escalated_to_admin',
      remarks: `${selectedTicket.remarks ? `${selectedTicket.remarks} | ` : ''}Escalated to System SuperAdmin by State Desk`
    };
    setTickets(prev => prev.map(t => t._id === selectedTicket._id ? updatedTicket : t));
    setSelectedTicket(updatedTicket);
  };

  const handleStateResolve = () => {
    if (!selectedTicket) return;
    const updatedTicket: SupportTicket = {
      ...selectedTicket,
      status: 'resolved',
      remarks: `${selectedTicket.remarks ? `${selectedTicket.remarks} | ` : ''}Resolved by State Agent Desk`
    };
    setTickets(prev => prev.map(t => t._id === selectedTicket._id ? updatedTicket : t));
    setSelectedTicket(updatedTicket);
  };

  const handleStateReopen = () => {
    if (!selectedTicket) return;
    const updatedTicket: SupportTicket = {
      ...selectedTicket,
      status: 'open',
      remarks: `${selectedTicket.remarks ? `${selectedTicket.remarks} | ` : ''}Reopened for re-investigation by State Desk`
    };
    setTickets(prev => prev.map(t => t._id === selectedTicket._id ? updatedTicket : t));
    setSelectedTicket(updatedTicket);
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
              ? `MANAGE AND RESOLVE STATE-WIDE ESCALATED SUPPORT TICKETS ACROSS ALL DISTRICTS, DIVISIONS, AND PINCODE AGENTS IN ${userState}.`
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
                        <td className="py-3.5 px-4 font-bold text-slate-700">{ticket.category}</td>
                        <td className="py-3.5 px-4 uppercase text-[10px] font-black">
                          <span className={ticket.priority === 'critical' || ticket.priority === 'high' ? 'text-rose-600' : 'text-slate-600'}>
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

                    {/* Action Buttons Bar: Assign to Agent, Escalate to Admin, Resolve, Reopen */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                      <div className="flex items-center gap-2 flex-grow sm:flex-grow-0">
                        <select
                          value={assignedAgentTarget}
                          onChange={(e) => {
                            setAssignedAgentTarget(e.target.value);
                            handleStateAssign(e.target.value);
                          }}
                          className="bg-white border border-[#d7c3b5]/60 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#864f19]"
                        >
                          <option value="">Assign to Responsible Agent...</option>
                          <option value="Visakhapatnam District Lead">Visakhapatnam District Lead</option>
                          <option value="Vizag City Division Lead">Vizag City Division Lead</option>
                          <option value="raki pin (Pincode Agent - 530001)">raki pin (Pincode Agent - 530001)</option>
                          <option value="NTR District Lead">NTR District Lead</option>
                          <option value="Vijayawada Central Division Lead">Vijayawada Central Division Lead</option>
                          <option value="System Admin">System SuperAdmin</option>
                        </select>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={handleStateEscalateAdmin}
                          className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-sm border-none"
                        >
                          <ShieldAlert className="w-3.5 h-3.5" /> Escalate to Admin
                        </button>

                        {selectedTicket.status !== 'resolved' ? (
                          <button
                            type="button"
                            onClick={handleStateResolve}
                            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-sm border-none"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Mark Resolved
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={handleStateReopen}
                            className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-sm border-none"
                          >
                            <RotateCcw className="w-3.5 h-3.5" /> Reopen Ticket
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
                    onChange={(e) => setSelectedDistrict(e.target.value)}
                    className="w-full bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl py-2.5 px-3 text-xs text-[#1b1c1c] focus:outline-none focus:ring-1 focus:ring-[#864f19]"
                  >
                    <option value="Visakhapatnam">Visakhapatnam District</option>
                    <option value="NTR District">NTR District (Vijayawada)</option>
                    <option value="Guntur">Guntur District</option>
                    <option value="Chittoor">Chittoor District</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Target Division *</label>
                  <select
                    value={selectedDivision}
                    onChange={(e) => setSelectedDivision(e.target.value)}
                    className="w-full bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl py-2.5 px-3 text-xs text-[#1b1c1c] focus:outline-none focus:ring-1 focus:ring-[#864f19]"
                  >
                    <option value="Vizag City Division">Vizag City Division</option>
                    <option value="Vijayawada Central Division">Vijayawada Central Division</option>
                    <option value="Guntur City Division">Guntur City Division</option>
                    <option value="Tirupati Central Division">Tirupati Central Division</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Pincode Sector & Responsible Agent</label>
                  <select
                    value={selectedPincode}
                    onChange={(e) => setSelectedPincode(e.target.value)}
                    className="w-full bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl py-2.5 px-3 text-xs text-[#1b1c1c] focus:outline-none focus:ring-1 focus:ring-[#864f19]"
                  >
                    <option value="530001">530001 (raki pin - Pincode Agent)</option>
                    <option value="530017">530017 (Kiran Kumar - Pincode Agent)</option>
                    <option value="520001">520001 (Governorpet Agent)</option>
                    <option value="520007">520007 (Autonagar Agent)</option>
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

                <div className="p-3 bg-[#fbf9f8] rounded-xl border border-[#d7c3b5]/60 space-y-1.5 text-[11px]">
                  <p className="text-[9px] font-black text-[#864f19] uppercase tracking-wider">Territory Location Details (Division Scope)</p>
                  <p className="text-slate-800">State: <strong>{user?.territory?.state || 'Andhra Pradesh'}</strong></p>
                  <p className="text-slate-800">District: <strong>{user?.territory?.district || 'Visakhapatnam'}</strong></p>
                  <p className="text-slate-800">Assigned Division: <strong className="text-[#864f19]">{user?.territory?.division || 'Vizag City Division'}</strong></p>
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Select Merchant Pincode *</label>
                  <select
                    className="w-full bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl py-2.5 px-3 text-xs text-[#1b1c1c] focus:outline-none focus:ring-1 focus:ring-[#864f19]"
                  >
                    <option value="530001">530001 (Central Visakhapatnam)</option>
                    <option value="530017">530017 (MVP Colony)</option>
                    <option value="530018">530018 (Madhavadhara)</option>
                    <option value="530026">530026 (Gajuwaka)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Assigned Pincode Agent</label>
                  <select
                    className="w-full bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl py-2.5 px-3 text-xs text-[#1b1c1c] focus:outline-none focus:ring-1 focus:ring-[#864f19]"
                  >
                    <option value="raki pin">raki pin (Pincode Agent - 530001)</option>
                    <option value="Kiran Kumar">Kiran Kumar (Pincode Agent - 530017)</option>
                    <option value="Ramesh Naidu">Ramesh Naidu (Pincode Agent - 530018)</option>
                    <option value="Nageswara Rao">Nageswara Rao (Pincode Agent - 530026)</option>
                  </select>
                </div>
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
                <option value="critical">Critical</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Issue Details *</label>
              <textarea
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe issue details (minimum 10 chars)..."
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

            {ticketRaised && (
              <p className="text-xs text-emerald-700 font-bold text-center bg-emerald-50 p-2 rounded-lg">✓ Ticket Successfully Logged!</p>
            )}

            <button type="submit" className="w-full py-3 bg-[#864f19] hover:bg-[#a3672f] text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm transition-all border-none cursor-pointer flex items-center justify-center gap-2">
              <Send className="w-3.5 h-3.5" /> {activeRole === 'state' ? 'Log State Ticket' : 'Submit Support Ticket'}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};

export default TicketsList;
