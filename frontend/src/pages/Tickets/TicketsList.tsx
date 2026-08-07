import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardBody, Button } from '../../components/ui';
import { Ticket, Send, Eye, Loader2 } from 'lucide-react';
import api from '../../utils/api';

interface SupportTicket {
  _id: string;
  ticketId: string;
  category: string;
  description: string;
  status: 'open' | 'assigned' | 'in_progress' | 'resolved' | 'closed';
  createdAt: string;
  remarks?: string;
}

export const TicketsList: React.FC = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [category, setCategory] = useState('Vendor Query');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [ticketRaised, setTicketRaised] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [resolutionRemarks, setResolutionRemarks] = useState('');

  const handleResolveTicket = async (id: string) => {
    if (!resolutionRemarks.trim()) return;
    try {
      await api.patch(`/tickets/${id}/status`, {
        status: 'resolved',
        resolutionDetails: resolutionRemarks
      });
      setTickets(prev => prev.map(t => t._id === id ? { ...t, status: 'resolved', remarks: resolutionRemarks } : t));
      setSelectedTicket(prev => prev && prev._id === id ? { ...prev, status: 'resolved', remarks: resolutionRemarks } : prev);
      setResolutionRemarks('');
    } catch (err) {
      console.error('Failed to resolve ticket:', err);
    }
  };

  const fetchTickets = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const response = await api.get('/tickets');
      const backendTickets = response.data.tickets || [];
      
      const mapped: SupportTicket[] = backendTickets.map((t: any) => ({
        _id: t._id,
        ticketId: t.ticketId,
        category: t.category,
        description: t.description,
        status: t.status,
        createdAt: new Date(t.createdAt).toLocaleDateString(),
        remarks: t.resolutionDetails
      }));
      setTickets(mapped);
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Failed to load tickets from server.');
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
      setErrorMsg('Description must be at least 10 characters.');
      return;
    }
    
    setErrorMsg('');
    try {
      const response = await api.post('/tickets', {
        category,
        description,
        priority
      });
      const t = response.data.ticket;
      
      const newTicket: SupportTicket = {
        _id: t._id,
        ticketId: t.ticketId,
        category: t.category,
        description: t.description,
        status: t.status,
        createdAt: new Date(t.createdAt).toLocaleDateString()
      };
      
      setTickets([newTicket, ...tickets]);
      setTicketRaised(true);
      setDescription('');
      
      setTimeout(() => {
        setTicketRaised(false);
      }, 3000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Failed to submit ticket. Creating local record.');
      const local: SupportTicket = {
        _id: `TK-LOC-${Math.floor(1000 + Math.random() * 9000)}`,
        ticketId: `TKT-LOCAL`,
        category,
        description,
        status: 'open',
        createdAt: new Date().toLocaleDateString()
      };
      setTickets([local, ...tickets]);
      setTicketRaised(true);
      setDescription('');
      setTimeout(() => setTicketRaised(false), 3000);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-[#1b1c1c] font-sans">
      {/* HUD Header Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-[16px] border border-[#eae8e7] shadow-sm gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#1b1c1c] font-sans">Field Support & KYC Tickets Desk</h1>
          <p className="text-xs font-semibold text-[#52443a] mt-1 uppercase tracking-wider">
            Submit merchant queries, KYC document disputes, or account issues directly to the KYC & Support Desk.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 bg-amber-50 text-amber-800 text-xs font-bold rounded-xl border border-amber-200">
          ⚠️ {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Ticket List Log Table */}
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
                  No tickets found. Submit a ticket on the right panel.
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#eae8e7] bg-[#fbf9f8] text-[9px] font-black uppercase text-[#52443a] tracking-wider">
                      <th className="py-3 px-4">Ticket ID</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Description</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#eae8e7]">
                    {tickets.map((ticket) => (
                      <tr key={ticket._id} className="text-xs hover:bg-slate-50/50 transition">
                        <td className="py-3.5 px-4 font-bold text-[#864f19]">{ticket.ticketId}</td>
                        <td className="py-3.5 px-4 font-extrabold text-slate-700">{ticket.category}</td>
                        <td className="py-3.5 px-4 max-w-[200px] truncate text-slate-500 font-semibold">{ticket.description}</td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                            ticket.status === 'resolved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            ticket.status === 'in_progress' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                            'bg-red-50 text-red-700 border border-red-200'
                          }`}>
                            {ticket.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => setSelectedTicket(ticket)}
                            className="p-1.5 text-slate-500 hover:text-[#864f19] transition cursor-pointer bg-transparent border-none flex items-center justify-center ml-auto"
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
                    Inspecting Ticket <span className="text-[#864f19] font-black">{selectedTicket.ticketId}</span>
                  </span>
                  <button
                    onClick={() => setSelectedTicket(null)}
                    className="text-xs font-bold text-[#864f19] hover:underline cursor-pointer bg-transparent border-none whitespace-nowrap flex items-center gap-1"
                  >
                    Close Inspect Panel ✕
                  </button>
                </div>
                <CardTitle className="text-sm font-extrabold text-slate-800 mt-1">
                  {selectedTicket.category} (Submitted {selectedTicket.createdAt})
                </CardTitle>
              </CardHeader>
              <CardBody className="py-4 space-y-3 text-xs">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Description Details</span>
                  <p className="text-slate-700 font-semibold leading-relaxed bg-[#fbf9f8] p-3 rounded-xl border border-slate-100">
                    {selectedTicket.description}
                  </p>
                </div>
                {selectedTicket.remarks && (
                  <div className="space-y-1 pt-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Admin Remarks & Logs</span>
                    <p className="text-slate-600 font-semibold leading-relaxed bg-[#fef9f5] p-3 rounded-xl border border-[#eae8e7]">
                      {selectedTicket.remarks}
                    </p>
                  </div>
                )}
                {/* Read-Only Notice for Agents: Ticket Resolution is handled by KYC/Support Team */}
                {selectedTicket.status !== 'resolved' && selectedTicket.status !== 'closed' ? (
                  <div className="border-t border-slate-100 pt-4 space-y-2">
                    <div className="bg-amber-50/90 p-3.5 rounded-xl border border-amber-200 text-xs font-bold text-amber-900 flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm text-amber-700">shield</span>
                      <span>Assigned to KYC Team: This ticket has been submitted to the KYC Verification Desk. Resolution and updates are managed by the KYC team.</span>
                    </div>
                  </div>
                ) : (
                  <div className="border-t border-slate-100 pt-4">
                    <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-200 text-xs font-bold text-emerald-900 flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm text-emerald-700">check_circle</span>
                      <span>Ticket Resolved by KYC & Support Team.</span>
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
              <Ticket className="w-4 h-4 text-[#864f19]" /> Raise New Ticket
            </h3>
            <p className="text-[10px] text-slate-500 mt-0.5 font-medium">Submit verification queries or hardware replacement requests.</p>
          </div>
          
          <form onSubmit={handleRaiseTicket} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Select Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl py-2.5 px-3 text-xs text-[#1b1c1c] focus:outline-none focus:ring-1 focus:ring-[#864f19]"
              >
                <option>Vendor Query</option>
                <option>KYC Document Issue</option>
                <option>Portal Account Block</option>
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
              <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Provide Ticket Details</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Submit full details regarding duplicate shop, validation block or API error logs (minimum 10 chars)..."
                rows={4}
                className="w-full bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl py-2.5 px-3 text-xs text-[#1b1c1c] focus:outline-none focus:ring-1 focus:ring-[#864f19] resize-none"
              />
            </div>

            {ticketRaised && (
              <p className="text-[10px] text-green-600 font-bold text-center">Ticket Submitted!</p>
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
