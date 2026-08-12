import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardBody } from '../../components/ui';
import { Ticket, Send, Eye, Loader2, Paperclip, FileText, X } from 'lucide-react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

interface SupportTicket {
  _id: string;
  ticketId: string;
  vendorName?: string;
  category: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  createdAt: string;
  remarks?: string;
  attachmentName?: string;
}

export const TicketsList: React.FC = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [assignedVendors, setAssignedVendors] = useState<any[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [category, setCategory] = useState('Vendor Query');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [vendorName, setVendorName] = useState('');
  const [vendorShopName, setVendorShopName] = useState('');
  const [vendorAddress, setVendorAddress] = useState('');
  const [vendorPhone, setVendorPhone] = useState('');
  const [attachment, setAttachment] = useState<{ fileName: string; dataUrl: string } | null>(null);
  
  const [ticketRaised, setTicketRaised] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

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

  const handleVendorSelect = (vId: string) => {
    setSelectedVendorId(vId);
    if (!vId) {
      setVendorName('');
      setVendorShopName('');
      setVendorAddress('');
      setVendorPhone('');
      return;
    }
    const matched = assignedVendors.find(v => v._id === vId || v.id === vId);
    if (matched) {
      setVendorName(matched.ownerName || matched.name || 'Merchant Owner');
      setVendorShopName(matched.businessName || matched.name || 'Merchant Store');
      setVendorAddress(`${matched.fullAddress || matched.address || 'Assigned Territory'}, ${matched.pincode || ''}`);
      setVendorPhone(matched.phone || 'N/A');
    }
  };

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
        vendorName: t.vendorName || t.vendor?.name || 'Assigned Merchant',
        category: t.category || 'Vendor Query',
        description: t.description || 'Query details',
        priority: t.priority || 'medium',
        status: t.status === 'assigned' ? 'in_progress' : (t.status || 'open'),
        createdAt: t.createdAt ? new Date(t.createdAt).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB'),
        remarks: t.resolutionDetails,
        attachmentName: t.attachmentName
      }));
      setTickets(mapped);
    } catch (err: any) {
      setTickets([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

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
      vendorName: vendorShopName || 'Assigned Merchant',
      category,
      description,
      priority,
      status: 'open',
      createdAt: new Date().toLocaleDateString('en-GB'),
      attachmentName: attachment?.fileName
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

  return (
    <div className="space-y-6 animate-fade-in text-[#1b1c1c] font-sans">
      {/* HUD Header Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-[16px] border border-[#eae8e7] shadow-sm gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-[#1b1c1c] font-sans">Division Support & Escalation Desk</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#864f19] text-white">
              DIVISION SCOPE
            </span>
          </div>
          <p className="text-xs font-semibold text-[#52443a] mt-1 uppercase tracking-wider">
            SUBMIT MERCHANT QUERIES, KYC DOCUMENT DISPUTES, OR ESCALATE TICKETS ACROSS ASSIGNED DIVISION AND DOWNSTREAM PINCODE AGENTS.
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
            <CardHeader className="border-b border-slate-50 pb-3">
              <CardTitle className="text-sm font-extrabold text-slate-800">Support Ticket Logs</CardTitle>
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
                      <th className="py-3 px-4">Vendor</th>
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
                        <td className="py-3.5 px-4 font-bold text-[#864f19]">{ticket.ticketId}</td>
                        <td className="py-3.5 px-4 font-bold text-slate-800">{ticket.vendorName || 'Assigned Merchant'}</td>
                        <td className="py-3.5 px-4 font-bold text-slate-700">{ticket.category}</td>
                        <td className="py-3.5 px-4 uppercase text-[10px] font-black">
                          <span className={ticket.priority === 'critical' || ticket.priority === 'high' ? 'text-rose-600' : 'text-slate-600'}>
                            {ticket.priority}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                            ticket.status === 'resolved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            ticket.status === 'in_progress' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            'bg-blue-50 text-blue-700 border-blue-200'
                          }`}>
                            {ticket.status === 'open' ? 'Open' : ticket.status === 'in_progress' ? 'In Progress' : 'Resolved'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right text-slate-500 text-[11px]">{ticket.createdAt}</td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => setSelectedTicket(ticket)}
                            className="p-1.5 text-slate-500 hover:text-[#864f19] transition cursor-pointer bg-transparent border-none flex items-center justify-center mx-auto"
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

          {/* Expanded inspect card */}
          {selectedTicket && (
            <Card className="border-l-4 border-l-[#864f19] animate-fade-in">
              <CardHeader className="pb-2 border-b border-slate-50">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-2">
                  <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                    Ticket Log <span className="text-[#864f19] font-black">{selectedTicket.ticketId}</span>
                  </span>
                  <button
                    onClick={() => setSelectedTicket(null)}
                    className="text-xs font-bold text-[#864f19] hover:underline cursor-pointer bg-transparent border-none"
                  >
                    Close ✕
                  </button>
                </div>
                <CardTitle className="text-sm font-extrabold text-slate-800 mt-1">
                  {selectedTicket.category} • Merchant: {selectedTicket.vendorName}
                </CardTitle>
              </CardHeader>
              <CardBody className="py-4 space-y-3 text-xs">
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
              </CardBody>
            </Card>
          )}
        </div>

        {/* Raise Ticket Form Widget */}
        <div className="bg-white rounded-[16px] border border-[#eae8e7] p-6 shadow-sm h-fit space-y-4">
          <div className="border-b border-[#eae8e7] pb-3">
            <h3 className="font-extrabold text-sm text-[#1b1c1c] flex items-center gap-1.5">
              <Ticket className="w-4 h-4 text-[#864f19]" /> Raise Support Ticket
            </h3>
            <p className="text-[10px] text-slate-500 mt-0.5 font-medium">Select assigned merchant and describe the issue.</p>
          </div>
          
          <form onSubmit={handleRaiseTicket} className="space-y-4 text-xs font-semibold">
            {/* Manual Merchant Name Input */}
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

            {/* Territory Location Details & Agent Assignment */}
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

            <div className="space-y-1">
              <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Select Issue Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl py-2.5 px-3 text-xs text-[#1b1c1c] focus:outline-none focus:ring-1 focus:ring-[#864f19]"
              >
                <option value="Vendor Query">Vendor Query</option>
                <option value="KYC Document Issue">KYC Document Issue</option>
                <option value="Portal Account Block">Portal Account Block</option>
                <option value="Hardware / QR Standee Request">Hardware / QR Standee Request</option>
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
              <p className="text-xs text-emerald-700 font-bold text-center bg-emerald-50 p-2 rounded-lg">✓ Ticket Successfully Submitted!</p>
            )}

            <button type="submit" className="w-full py-3 bg-[#864f19] hover:bg-[#a3672f] text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm transition-all border-none cursor-pointer flex items-center justify-center gap-2">
              <Send className="w-3.5 h-3.5" /> Submit Support Ticket
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};

export default TicketsList;
