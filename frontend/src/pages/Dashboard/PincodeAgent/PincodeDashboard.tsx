import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { downloadReport } from '../../../utils/downloadReport';
import {
  TrendingUp, Clock, CheckCircle2,
  Plus, Users, Target, Ticket, Send, ShieldAlert, FileText, Camera, Download, Loader2, MessageSquare
} from 'lucide-react';
import api from '../../../utils/api';

export const PincodeDashboard: React.FC = () => {
  const { user, addNotification } = useAuth();
  const { showToast } = useToast();
  
  // Dashboard Live Stats State
  const [stats, setStats] = useState<any>(null);
  const [recentAssignments, setRecentAssignments] = useState<any[]>([]);
  const [recentVendors, setRecentVendors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Ticket submission state
  const [ticketRaised, setTicketRaised] = useState(false);
  const [ticketDesc, setTicketDesc] = useState('');
  const [category, setCategory] = useState('Vendor Query');
  const [activeTab, setActiveTab] = useState<'vendors' | 'schedule' | 'support' | 'chat'>('vendors');

  // Live Help Desk Chat State
  const [chatMessages, setChatMessages] = useState<any[]>([
    { sender: 'assistant', text: 'Hello! I am your ConnectPortal Support Assistant. How can I help you today with your field operations?', time: 'Just now' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Field Alerts State (Stack behavior: newest items stack on top)
  const [fieldAlerts, setFieldAlerts] = useState<any[]>([]);

  const dismissAlert = (id: string) => {
    setFieldAlerts(prev => prev.filter(item => item.id !== id));
  };

  const fetchDashboardStats = async () => {
    try {
      const response = await api.get('/dashboard/stats');
      const backendStats = response.data.stats;
      
      const defaultStats = {
        targets: { total: 0, completed: 0, completionRate: 0 },
        vendors: { total: 0, pending: 0 },
        notifications: { unread: 0 },
        tickets: { open: 0, resolved: 0 }
      };

      if (!backendStats || (backendStats.targets?.total === 0 && backendStats.vendors?.total === 0)) {
        setStats(defaultStats);
        setRecentVendors([]);
        setRecentAssignments([]);
      } else {
        setStats(backendStats);
        setRecentVendors(response.data.recentVendors && response.data.recentVendors.length > 0 ? response.data.recentVendors : []);
        setRecentAssignments(response.data.recentAssignments && response.data.recentAssignments.length > 0 ? response.data.recentAssignments : []);
      }
    } catch (err: any) {
      if (err?.response?.status !== 401) {
        console.error('Failed to fetch dashboard stats:', err);
      }
      setStats({
        targets: { total: 0, completed: 0, completionRate: 0 },
        vendors: { total: 0, pending: 0 },
        notifications: { unread: 0 },
        tickets: { open: 0, resolved: 0 }
      });
      setRecentVendors([]);
      setRecentAssignments([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
    
    // Simulate real-time target assignment notification after 5 seconds
    const timer = setTimeout(() => {
      showToast("New Target Assigned: Validate Aadhaar QR Scan for Sree Balaji Groceries", "info");
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  const handleRaiseTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketDesc.trim()) return;
    
    try {
      await api.post('/tickets', {
        category,
        description: ticketDesc,
        priority: 'medium'
      });
      setTicketRaised(true);
      setTicketDesc('');
      addNotification(
        'Support Ticket Raised',
        `Support ticket for ${category} successfully logged in the system.`,
        'medium',
        'system'
      );
      showToast(`Support ticket for ${category} successfully raised!`, 'success');
      fetchDashboardStats(); // Refresh stats counters
      setTimeout(() => {
        setTicketRaised(false);
      }, 3000);
    } catch (err) {
      console.error('Failed to submit ticket:', err);
      showToast("Failed to raise support ticket. Please try again.", "error");
    }
  };

  const handleSendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMessage = { sender: 'agent', text: chatInput, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setChatMessages((prev) => [...prev, userMessage]);
    const queryText = chatInput.toLowerCase();
    setChatInput('');
    setIsTyping(true);

    setTimeout(() => {
      let replyText = "I understand your query. Let me escalate this request directly to our backend operations desk. Could you please provide your transaction/merchant ID?";
      if (queryText.includes('aadhaar') || queryText.includes('kyc') || queryText.includes('document')) {
        replyText = "For KYC issues, please ensure documents are high-resolution PDFs or JPEGs under 5MB. Manual verification normally completes in 2-4 working hours.";
      } else if (queryText.includes('payout') || queryText.includes('wallet') || queryText.includes('cash')) {
        replyText = "Wallet payout requests are settled inside 30 minutes. Please check that your linked bank IFSC and account details are correct in the Wallet tab.";
      } else if (queryText.includes('pincode') || queryText.includes('district') || queryText.includes('territory')) {
        replyText = "All territory bounds and pincode scopes are allocated directly by your District Supervisor. You can view your current assigned bounds in your Profile.";
      } else if (queryText.includes('target') || queryText.includes('task')) {
        replyText = "Your daily targets represent merchant validation tasks. Please upload signature coordinates or photos to mark each visit completed.";
      }

      setChatMessages((prev) => [
        ...prev,
        { sender: 'assistant', text: replyText, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
      ]);
      setIsTyping(false);
    }, 1000);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-450 gap-2">
        <Loader2 className="w-8 h-8 animate-spin text-[#864f19]" />
        <span className="font-bold text-xs font-sans">Syncing portal execution metrics...</span>
      </div>
    );
  }

  const remainingTasks = (stats?.targets?.total || 0) - (stats?.targets?.completed || 0);

  return (
    <div className="space-y-6 animate-fade-in text-[#1b1c1c] font-sans">
      
      {/* Welcome Card & Summary */}
      <div className="bg-white p-6 rounded-[16px] border border-[#eae8e7] shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
        <div className="space-y-1">
          <span className="text-[10px] text-[#864f19] font-bold uppercase tracking-widest block">Field Execution Desk</span>
          <h2 className="text-2xl font-black tracking-tight text-[#1b1c1c]">Welcome back, {user?.name || 'Field Agent'}</h2>
          <p className="text-xs text-[#52443a] max-w-xl font-medium">
            Manage onsite merchant registrations, upload verification documents, submit daily logs, and raise support tickets.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <span className="text-[9px] text-[#52443a] font-bold uppercase block">Field Performance</span>
            <span className="text-lg font-black text-[#864f19]">{user?.performanceScore || '85.4'}</span>
          </div>
          <div className="relative w-10 h-10 flex items-center justify-center shrink-0">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-[#ffdcc2]"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-[#864f19] transition-all duration-500 ease-out"
                strokeDasharray={`${user?.performanceScore || 85.4}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="absolute text-[10px] font-black text-slate-800">{Math.round(user?.performanceScore || 85)}%</span>
          </div>
        </div>
      </div>

      {/* Clean KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Field Visits', val: `${stats?.targets?.total || 0} Visits`, icon: <Target className="w-4 h-4 text-[#864f19]" />, bg: 'bg-[#ffdcc2]' },
          { label: 'Completed Visits', val: `${stats?.targets?.completed || 0} Done`, icon: <CheckCircle2 className="w-4 h-4 text-emerald-700" />, bg: 'bg-emerald-50' },
          { label: 'Pending Verifications', val: `${stats?.vendors?.pending || 0} Pending`, icon: <Clock className="w-4 h-4 text-[#4f4635]" />, bg: 'bg-[#efe1ca]' },
          { label: 'Assigned Vendors', val: `${stats?.vendors?.total || 0} Shops`, icon: <Users className="w-4 h-4 text-[#184c62]" />, bg: 'bg-[#c1e8ff]' },
          { label: 'New Registrations', val: `${stats?.vendors?.pending || 0} New`, icon: <Plus className="w-4 h-4 text-emerald-700" />, bg: 'bg-emerald-50' },
          { label: 'Open Tickets', val: `${stats?.tickets?.open || 0} Active`, icon: <Ticket className="w-4 h-4 text-red-700" />, bg: 'bg-red-50' },
          { label: 'Resolved Tickets', val: `${stats?.tickets?.resolved || 0} Resolved`, icon: <CheckCircle2 className="w-4 h-4 text-[#184c62]" />, bg: 'bg-[#c1e8ff]' },
          { label: 'My Targets Progress', val: `${stats?.targets?.completionRate || 0}% Done`, icon: <TrendingUp className="w-4 h-4 text-[#864f19]" />, bg: 'bg-[#ffdcc2]' }
        ].map((card, idx) => (
          <div key={idx} className="bg-white p-5 rounded-[16px] border border-[#eae8e7] flex items-center justify-between shadow-sm relative overflow-hidden group">
            <div className="space-y-1">
              <span className="text-[9px] font-bold text-[#52443a] uppercase tracking-wider block">{card.label}</span>
              <span className="text-base font-extrabold text-[#1b1c1c]">{card.val}</span>
            </div>
            <div className={`h-8 w-8 rounded-lg ${card.bg} flex items-center justify-center`}>
              {card.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Lists tabs & support forms */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Vendor directory, Schedule timelines, Support logs */}
        <div className="lg:col-span-2 bg-white rounded-[16px] border border-[#eae8e7] shadow-sm overflow-hidden flex flex-col justify-between">
          <div className="px-6 py-4 border-b border-[#eae8e7] flex justify-between items-center bg-white">
            <div className="flex gap-4">
              <button onClick={() => setActiveTab('vendors')} className={`text-xs font-extrabold uppercase pb-1 border-b-2 transition-all ${activeTab === 'vendors' ? 'border-[#864f19] text-[#1b1c1c]' : 'border-transparent text-[#52443a]'}`}>Assigned Vendors</button>
              <button onClick={() => setActiveTab('schedule')} className={`text-xs font-extrabold uppercase pb-1 border-b-2 transition-all ${activeTab === 'schedule' ? 'border-[#864f19] text-[#1b1c1c]' : 'border-transparent text-[#52443a]'}`}>Today's Schedule</button>
              <button onClick={() => setActiveTab('support')} className={`text-xs font-extrabold uppercase pb-1 border-b-2 transition-all ${activeTab === 'support' ? 'border-[#864f19] text-[#1b1c1c]' : 'border-transparent text-[#52443a]'}`}>My Support Tickets</button>
              <button onClick={() => setActiveTab('chat')} className={`text-xs font-extrabold uppercase pb-1 border-b-2 transition-all ${activeTab === 'chat' ? 'border-[#864f19] text-[#1b1c1c]' : 'border-transparent text-[#52443a]'} flex items-center gap-1`}><MessageSquare className="w-3 h-3" /> Live Help Desk</button>
            </div>
          </div>
          
          <div className="p-6 divide-y divide-[#eae8e7]">
            {activeTab === 'vendors' && (
              <>
                <div className="py-2.5 flex justify-between text-xs font-bold text-[#52443a]">
                  <span>Shop Name</span>
                  <span>KYC Status</span>
                </div>
                {recentVendors.length === 0 ? (
                  <p className="py-3 text-center text-xs text-slate-400">No active assigned merchants in registry.</p>
                ) : (
                  recentVendors.map((item, i) => (
                    <div key={i} className="py-3 flex justify-between text-xs font-semibold">
                      <span className="text-[#1b1c1c]">{item.name}</span>
                      <span className={`font-bold ${item.kycStatus === 'approved' ? 'text-green-600' : 'text-[#864f19]'}`}>
                        {item.kycStatus === 'approved' ? 'Approved & Synced' : `KYC ${item.kycStatus}`}
                      </span>
                    </div>
                  ))
                )}
              </>
            )}

            {activeTab === 'schedule' && (
              <>
                <div className="py-2.5 flex justify-between text-xs font-bold text-[#52443a]">
                  <span>Visit Shop Name</span>
                  <span>Target Value / Action</span>
                </div>
                {recentAssignments.length === 0 ? (
                  <p className="py-3 text-center text-xs text-slate-400">No task schedules assigned for today.</p>
                ) : (
                  recentAssignments.map((item, i) => (
                    <div key={i} className="py-3 flex justify-between text-xs font-semibold">
                      <span className="text-[#1b1c1c]">{item.target?.title || 'Territory Audit Visit'}</span>
                      <span className="text-[#34647b]">{item.status === 'completed' ? 'Completed' : 'Upcoming'} • Value: {item.target?.targetValue || 0}</span>
                    </div>
                  ))
                )}
              </>
            )}

            {activeTab === 'support' && (
              <>
                <div className="py-2.5 flex justify-between text-xs font-bold text-[#52443a]">
                  <span>Support Ticket ID</span>
                  <span>Resolution State</span>
                </div>
                {[
                  { id: '#TK-9812: Aadhaar verification issue', status: 'Pending Supervisor review' },
                  { id: '#TK-9742: Merchant sign-up block', status: 'Resolved' }
                ].map((item, i) => (
                  <div key={i} className="py-3 flex justify-between text-xs font-semibold">
                    <span className="text-[#1b1c1c]">{item.id}</span>
                    <span className="text-emerald-700 font-extrabold">{item.status}</span>
                  </div>
                ))}
              </>
            )}

            {activeTab === 'chat' && (
              <div className="space-y-4 pt-1 animate-fade-in">
                <div className="h-[200px] overflow-y-auto space-y-2.5 pr-2">
                  {chatMessages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.sender === 'agent' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`p-2.5 rounded-2xl max-w-[80%] space-y-1 ${
                        msg.sender === 'agent' 
                          ? 'bg-[#864f19] text-white rounded-tr-none' 
                          : 'bg-[#fbf9f8] text-slate-700 border border-slate-100 rounded-tl-none'
                      }`}>
                        <p className="font-semibold text-xs leading-normal">{msg.text}</p>
                        <span className="block text-[8px] text-right opacity-60 font-bold">{msg.time}</span>
                      </div>
                    </div>
                  ))}
                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="bg-[#fbf9f8] text-slate-400 p-2.5 rounded-2xl rounded-tl-none border border-slate-100 flex items-center gap-1">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#864f19]" />
                        <span className="text-[10px] font-bold">Support Assistant is typing...</span>
                      </div>
                    </div>
                  )}
                </div>

                <form onSubmit={handleSendChatMessage} className="flex gap-2 border-t border-slate-100 pt-3">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask about KYC verification, payouts, or pincodes..."
                    className="flex-grow bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl px-3 text-xs text-[#1b1c1c] focus:outline-none focus:ring-1 focus:ring-[#864f19]"
                  />
                  <button type="submit" className="p-2.5 bg-[#864f19] text-white rounded-xl hover:bg-[#a3672f] border-none cursor-pointer flex items-center justify-center shadow-sm transition">
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* Raise Ticket Quick Widget Form */}
        <div className="bg-white rounded-[16px] border border-[#eae8e7] shadow-sm p-6 flex flex-col justify-between space-y-4">
          <div className="border-b border-[#eae8e7] pb-3">
            <h3 className="font-extrabold text-sm text-[#1b1c1c]">Field Support Desk</h3>
            <p className="text-[10px] text-[#52443a] mt-0.5">Submit merchant disputes or verification issues.</p>
          </div>
          
          <form onSubmit={handleRaiseTicket} className="space-y-4 flex-grow flex flex-col justify-between">
            <div className="space-y-1">
              <label className="block text-[9px] font-bold text-[#52443a] uppercase tracking-wider">Ticket Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl py-2.5 px-3.5 text-xs text-[#1b1c1c] focus:outline-none focus:ring-1 focus:ring-[#864f19]"
              >
                <option>Vendor Query</option>
                <option>KYC Document Issue</option>
                <option>Portal Account Block</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-[9px] font-bold text-[#52443a] uppercase tracking-wider">Ticket Details</label>
              <textarea
                value={ticketDesc}
                onChange={(e) => setTicketDesc(e.target.value)}
                placeholder="Details of the issue..."
                rows={3}
                className="w-full bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl py-2.5 px-3.5 text-xs text-[#1b1c1c] focus:outline-none focus:ring-1 focus:ring-[#864f19] resize-none"
              />
            </div>

            {ticketRaised && (
              <p className="text-[10px] text-green-600 font-bold text-center">Ticket Submitted to Supervisor!</p>
            )}

            <button type="submit" className="w-full py-3 bg-[#864f19] hover:bg-[#a3672f] text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm transition-all border-none cursor-pointer flex items-center justify-center gap-2">
              <Send className="w-3.5 h-3.5" /> Raise Ticket
            </button>
          </form>
        </div>
      </div>

      {/* Reports and Notification Alert panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Submit Reports */}
        <div className="bg-white rounded-[16px] border border-[#eae8e7] shadow-sm p-6 space-y-4">
          <div className="border-b border-[#eae8e7] pb-3">
            <h3 className="font-extrabold text-sm text-[#1b1c1c]">Field Reports Center</h3>
          </div>
          
          <div className="space-y-3">
            {[
              { title: 'Submit Daily Report', desc: 'Active verification logs & proof of visits logs' },
              { title: 'Visit Report', desc: 'Vendor document check lists' },
              { title: 'Activity Report', desc: 'Pincode performance and targets sync logs' }
            ].map((rep, idx) => (
              <div key={idx} className="flex justify-between items-center p-3 bg-[#fbf9f8] rounded-xl border border-[#eae8e7]/55">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-[#1b1c1c]">{rep.title}</span>
                  <p className="text-[10px] text-[#52443a]">{rep.desc}</p>
                </div>
                <button 
                  onClick={() => downloadReport(rep.title, user?.role || 'pincode', user)}
                  title={`Download ${rep.title}`}
                  className="p-2 bg-white text-[#864f19] border border-[#d7c3b5]/50 rounded-lg hover:bg-[#864f19] hover:text-white transition cursor-pointer flex items-center justify-center shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Notifications and reminders panel */}
        <div className="bg-white rounded-[16px] border border-[#eae8e7] shadow-sm p-6 space-y-4">
          <div className="border-b border-[#eae8e7] pb-3">
            <h3 className="font-extrabold text-sm text-[#1b1c1c]">Field Alerts & Reminders</h3>
          </div>
          
          <div className="space-y-3">
            {fieldAlerts.length === 0 ? (
              <div className="p-4 text-center text-xs text-[#52443a] italic bg-[#fbf9f8] rounded-xl border border-dashed border-[#eae8e7]">
                All field alerts & reminders cleared.
              </div>
            ) : (
              fieldAlerts.map((notif) => (
                <div 
                  key={notif.id} 
                  className="flex items-start gap-3 p-3 bg-[#fbf9f8] rounded-xl border border-[#eae8e7]/50 relative group"
                >
                  <div className={`h-2 w-2 rounded-full mt-1 shrink-0 ${notif.alert ? 'bg-[#ba1a1a]' : 'bg-[#864f19]'}`} />
                  <div className="flex-grow space-y-0.5">
                    <div className="flex justify-between items-center text-[10px] font-bold">
                      <span className={notif.alert ? 'text-[#ba1a1a]' : 'text-[#864f19]'}>{notif.type}</span>
                      <span className="text-[#52443a] font-medium">{notif.time}</span>
                    </div>
                    <p className="text-xs text-[#52443a] leading-normal">{notif.msg}</p>
                  </div>
                  <button 
                    onClick={() => dismissAlert(notif.id)}
                    title="Dismiss alert"
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-[#52443a] hover:text-[#ba1a1a] p-1 text-[10px] font-bold"
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PincodeDashboard;
