import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardBody, Button, Input, Modal } from '../../components/ui';
import { Wallet, ArrowUpRight, ArrowDownLeft, Clock, CheckCircle2, XCircle, Send, Loader2, Download, Building, CreditCard, User, Landmark, Search, Filter } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

interface Transaction {
  transactionId: string;
  amount: number;
  type: 'credit' | 'debit';
  description: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;
}

export const WalletDashboard: React.FC = () => {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Filter state for transactions
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Bank details state (User profile / real dynamic data)
  const [bankDetails, setBankDetails] = useState({
    bankName: user?.bankDetails?.bankName || '',
    accountNumber: user?.bankDetails?.accountNumber || '',
    ifscCode: user?.bankDetails?.ifscCode || '',
    holderName: user?.name || ''
  });

  const [isEditBankOpen, setIsEditBankOpen] = useState(false);
  const [editBankForm, setEditBankForm] = useState({ ...bankDetails });

  // Cashout Modal State
  const [isCashoutOpen, setIsCashoutOpen] = useState(false);
  const [cashoutAmount, setCashoutAmount] = useState('');
  const [cashoutLoading, setCashoutLoading] = useState(false);
  const [cashoutSuccess, setCashoutSuccess] = useState(false);

  const fetchWalletDetails = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const balanceRes = await api.get('/wallet/balance');
      const txRes = await api.get('/wallet/transactions');
      
      setBalance(balanceRes.data.balance || 0);
      
      const mappedTx: Transaction[] = (txRes.data.transactions || []).map((t: any) => ({
        transactionId: t.transactionId,
        amount: t.amount,
        type: t.type,
        description: t.description,
        status: t.status,
        createdAt: new Date(t.createdAt).toLocaleDateString() + ' ' + new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }));
      
      setTransactions(mappedTx);
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Failed to sync wallet data.');
      setBalance(0);
      setTransactions([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWalletDetails();
  }, []);

  const handleCashoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(cashoutAmount);
    
    if (isNaN(amountNum) || amountNum <= 0) {
      setErrorMsg('Please enter a valid payout amount.');
      return;
    }
    
    if (amountNum > balance) {
      setErrorMsg('Insufficient wallet balance.');
      return;
    }

    setCashoutLoading(true);
    setErrorMsg('');
    try {
      const res = await api.post('/wallet/cashout', { amount: amountNum });
      const addedTx = res.data.transaction;
      
      setBalance(res.data.balance);
      
      const mappedNewTx: Transaction = {
        transactionId: addedTx.transactionId,
        amount: addedTx.amount,
        type: addedTx.type,
        description: addedTx.description,
        status: addedTx.status,
        createdAt: new Date(addedTx.createdAt).toLocaleDateString() + ' ' + new Date(addedTx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      
      setTransactions([mappedNewTx, ...transactions]);
      setCashoutSuccess(true);
      setCashoutAmount('');
      
      setTimeout(() => {
        setIsCashoutOpen(false);
        setCashoutSuccess(false);
      }, 2000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || 'Payout request failed.');
    } finally {
      setCashoutLoading(false);
    }
  };

  const handleSaveBankDetails = (e: React.FormEvent) => {
    e.preventDefault();
    setBankDetails({ ...editBankForm });
    setIsEditBankOpen(false);
  };

  // CSV Statement Downloader
  const handleDownloadCSV = () => {
    const headers = 'Transaction ID,Date & Time,Description,Type,Amount (INR),Status\n';
    const rows = transactions.map(tx => 
      `"${tx.transactionId}","${tx.createdAt}","${tx.description.replace(/"/g, '""')}","${tx.type}",${tx.amount},"${tx.status}"`
    ).join('\n');
    
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Wallet_Statement_${user?.name || 'Agent'}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch = 
      tx.transactionId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || tx.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || tx.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded text-[10px] font-black uppercase"><CheckCircle2 className="w-3 h-3" /> Completed</span>;
      case 'pending':
        return <span className="inline-flex items-center gap-1 text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded text-[10px] font-black uppercase"><Clock className="w-3 h-3" /> Pending</span>;
      default:
        return <span className="inline-flex items-center gap-1 text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded text-[10px] font-black uppercase"><XCircle className="w-3 h-3" /> Failed</span>;
    }
  };

  // Calculated earnings breakdown based on transactions
  const todayEarnings = transactions.filter(t => t.type === 'credit' && t.createdAt.includes(new Date().toLocaleDateString())).reduce((acc, t) => acc + t.amount, 0);
  const weekEarnings = transactions.filter(t => t.type === 'credit').reduce((acc, t) => acc + t.amount, 0);
  const monthEarnings = weekEarnings;
  const pendingPayouts = transactions.filter(t => t.type === 'debit' && t.status === 'pending').reduce((acc, t) => acc + t.amount, 0);

  return (
    <div className="space-y-6 animate-fade-in text-[#1b1c1c] font-sans">
      
      {/* HUD Header Panel */}
      <div className="bg-white p-6 rounded-[16px] border border-[#eae8e7] shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
        <div className="space-y-1">
          <span className="text-[10px] text-[#864f19] font-bold uppercase tracking-widest block">AGENT REVENUE & PAYOUT HUB</span>
          <h2 className="text-2xl font-black tracking-tight text-[#1b1c1c]">E-Wallet & Earnings</h2>
          <p className="text-xs text-[#52443a] max-w-xl font-medium">
            Assigned Agent: <strong className="text-[#1b1c1c]">{user?.name || 'Logged Agent'}</strong> ({user?.territory?.pincode ? `PIN: ${user.territory.pincode}` : 'Pincode Scope'})
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 bg-[#fbf9f8] text-[#864f19] text-xs font-bold rounded-xl border border-[#d7c3b5]">
          ℹ️ {errorMsg}
        </div>
      )}

      {/* Earnings Overview Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-[#eae8e7] shadow-sm">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">TODAY'S EARNINGS</span>
          <p className="text-xl font-black text-emerald-700 mt-1">₹{todayEarnings.toLocaleString('en-IN')}</p>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-[#eae8e7] shadow-sm">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">THIS WEEK</span>
          <p className="text-xl font-black text-[#864f19] mt-1">₹{weekEarnings.toLocaleString('en-IN')}</p>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-[#eae8e7] shadow-sm">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">THIS MONTH</span>
          <p className="text-xl font-black text-slate-800 mt-1">₹{monthEarnings.toLocaleString('en-IN')}</p>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-[#eae8e7] shadow-sm">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">PENDING PAYOUTS</span>
          <p className="text-xl font-black text-amber-600 mt-1">₹{pendingPayouts.toLocaleString('en-IN')}</p>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-[#eae8e7] shadow-sm">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">NEXT PAYOUT DATE</span>
          <p className="text-sm font-extrabold text-blue-700 mt-2">
            {pendingPayouts > 0 ? new Date(Date.now() + 7 * 86400000).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) : '--'}
          </p>
        </div>
      </div>

      {/* Main Dashboard Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Wallet Balance Card */}
        <div className="bg-white p-6 rounded-[16px] border border-[#eae8e7] shadow-sm lg:col-span-2 flex flex-col justify-between min-h-[160px]">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Available Wallet Balance</span>
            <div className="text-4xl font-black text-[#864f19]">₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
          <div className="flex gap-3 mt-4">
            <Button
              variant="primary"
              onClick={() => setIsCashoutOpen(true)}
              className="bg-[#864f19] hover:bg-[#a3672f] text-white border-none py-2.5 px-5 text-xs font-bold uppercase tracking-wider cursor-pointer flex items-center gap-2"
              leftIcon={<ArrowUpRight className="w-4 h-4" />}
            >
              Request Cashout
            </Button>
            <Button
              variant="secondary"
              onClick={handleDownloadCSV}
              className="border border-[#864f19] text-[#864f19] hover:bg-orange-50/50 py-2.5 px-5 text-xs font-bold uppercase tracking-wider cursor-pointer flex items-center gap-2"
              leftIcon={<Download className="w-4 h-4" />}
            >
              Download Statement
            </Button>
          </div>
        </div>

        {/* Linked Bank Details Card */}
        <div className="bg-white p-5 rounded-[16px] border border-[#eae8e7] shadow-sm flex flex-col justify-between min-h-[160px]">
          <div className="space-y-3">
            <div className="flex justify-between items-center border-b border-slate-50 pb-2">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1">
                <Landmark className="w-3.5 h-3.5 text-[#864f19]" /> Linked Settlement Bank
              </span>
              <button 
                onClick={() => {
                  setEditBankForm({ ...bankDetails });
                  setIsEditBankOpen(true);
                }} 
                className="text-[10px] font-black text-[#864f19] hover:underline cursor-pointer bg-transparent border-none"
              >
                Change
              </button>
            </div>
            
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Bank Name</span>
                <span className="font-bold text-slate-800">{bankDetails.bankName || user?.bankDetails?.bankName || 'Not Linked'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Account No.</span>
                <span className="font-bold text-slate-800">
                  {(bankDetails.accountNumber || user?.bankDetails?.accountNumber) ? `••••••${(bankDetails.accountNumber || user?.bankDetails?.accountNumber).slice(-4)}` : 'Not Linked'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">IFSC Code</span>
                <span className="font-bold text-slate-800">{bankDetails.ifscCode || user?.bankDetails?.ifscCode || 'Not Linked'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Account Holder</span>
                <span className="font-bold text-slate-800 truncate max-w-[120px]">{user?.name || bankDetails.holderName || 'Agent'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Log Table */}
      <Card>
        <CardHeader className="border-b border-[#eae8e7] pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <CardTitle className="text-sm font-extrabold text-[#1b1c1c]">Transaction History Log</CardTitle>
            <p className="text-[10px] text-[#52443a] font-semibold mt-0.5">Filter by transaction type, payout status, or reference query</p>
          </div>

          {/* Filter Controls Bar */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="relative flex-grow md:w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search Txn ID / desc..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#864f19]"
              />
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl py-1.5 px-3 text-xs text-[#1b1c1c] focus:outline-none focus:ring-1 focus:ring-[#864f19]"
            >
              <option value="all">All Types</option>
              <option value="credit">Credits (+)</option>
              <option value="debit">Debits (-)</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl py-1.5 px-3 text-xs text-[#1b1c1c] focus:outline-none focus:ring-1 focus:ring-[#864f19]"
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>

            <span className="text-[10px] text-slate-400 font-bold uppercase shrink-0 bg-slate-50 py-1.5 px-2.5 rounded-xl border border-slate-100">
              {filteredTransactions.length} of {transactions.length} Records
            </span>
          </div>
        </CardHeader>
        <CardBody className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-8 h-8 text-[#864f19] animate-spin" />
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="py-12 text-center text-slate-500 font-bold text-xs">
              No matching transactions found.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#eae8e7] bg-[#fbf9f8] text-[9px] font-black uppercase text-[#52443a] tracking-wider">
                  <th className="py-3.5 px-6">Transaction ID</th>
                  <th className="py-3.5 px-6">Date & Time</th>
                  <th className="py-3.5 px-6">Description</th>
                  <th className="py-3.5 px-6 text-center">Type</th>
                  <th className="py-3.5 px-6 text-right">Amount (₹)</th>
                  <th className="py-3.5 px-6 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eae8e7] text-xs">
                {filteredTransactions.map((tx) => (
                  <tr key={tx.transactionId} className="hover:bg-slate-50/50 transition">
                    <td className="py-4 px-6 font-bold text-slate-800">{tx.transactionId}</td>
                    <td className="py-4 px-6 font-semibold text-slate-500">{tx.createdAt}</td>
                    <td className="py-4 px-6 font-semibold text-slate-700 max-w-[240px] truncate">{tx.description}</td>
                    <td className="py-4 px-6 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-black text-[9px] uppercase tracking-wider ${
                        tx.type === 'credit' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                      }`}>
                        {tx.type === 'credit' ? <ArrowDownLeft className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                        {tx.type}
                      </span>
                    </td>
                    <td className={`py-4 px-6 text-right font-black text-sm ${
                      tx.type === 'credit' ? 'text-emerald-600' : 'text-slate-800'
                    }`}>
                      {tx.type === 'credit' ? '+' : '-'} ₹{tx.amount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-4 px-6 text-center">{getStatusBadge(tx.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>

      {/* Edit Bank Details Modal */}
      <Modal
        isOpen={isEditBankOpen}
        onClose={() => setIsEditBankOpen(false)}
        title="Edit Linked Bank Details"
      >
        <form onSubmit={handleSaveBankDetails} className="space-y-4 font-sans text-xs">
          <div className="space-y-3">
            <div>
              <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Bank Name</label>
              <Input
                label=""
                placeholder="e.g. State Bank of India"
                value={editBankForm.bankName}
                onChange={(e) => setEditBankForm({ ...editBankForm, bankName: e.target.value })}
                className="mb-0 animate-none"
              />
            </div>
            
            <div>
              <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Account Number</label>
              <Input
                label=""
                placeholder="e.g. 123456789012"
                value={editBankForm.accountNumber}
                onChange={(e) => setEditBankForm({ ...editBankForm, accountNumber: e.target.value })}
                className="mb-0 animate-none"
              />
            </div>
            
            <div>
              <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">IFSC Code</label>
              <Input
                label=""
                placeholder="e.g. SBIN0004821"
                value={editBankForm.ifscCode}
                onChange={(e) => setEditBankForm({ ...editBankForm, ifscCode: e.target.value.toUpperCase() })}
                className="mb-0 animate-none"
              />
            </div>
            
            <div>
              <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Account Holder Name</label>
              <Input
                label=""
                placeholder="Holder Name"
                value={editBankForm.holderName}
                onChange={(e) => setEditBankForm({ ...editBankForm, holderName: e.target.value })}
                className="mb-0 animate-none"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 bg-[#864f19] hover:bg-[#a3672f] text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm transition-all border-none cursor-pointer flex items-center justify-center gap-2 mt-4"
          >
            Save Bank Details
          </button>
        </form>
      </Modal>

      {/* Payout Cashout Modal */}
      <Modal
        isOpen={isCashoutOpen}
        onClose={() => setIsCashoutOpen(false)}
        title="Submit Cashout Payout Request"
      >
        {cashoutSuccess ? (
          <div className="py-8 text-center space-y-3">
            <div className="inline-flex p-4 bg-emerald-50 text-emerald-500 rounded-full animate-bounce">
              <CheckCircle2 className="w-12 h-12" />
            </div>
            <h3 className="text-sm font-extrabold text-slate-900">Payout Submitted Successfully!</h3>
            <p className="text-xs text-slate-500 font-semibold">The request has been queued to: {bankDetails.bankName} ({bankDetails.accountNumber.slice(-4)})</p>
          </div>
        ) : (
          <form onSubmit={handleCashoutSubmit} className="space-y-4 font-sans text-xs">
            <div className="p-3.5 bg-[#fbf9f8] rounded-xl border border-[#eae8e7] space-y-2 mb-3">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Target Account Details</span>
              <div className="font-extrabold text-slate-700">{bankDetails.bankName}</div>
              <div className="text-slate-500 font-semibold">No: {bankDetails.accountNumber} • IFSC: {bankDetails.ifscCode}</div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Withdrawal Amount (₹)</label>
                <span className="text-[10px] text-[#864f19] font-bold">Balance: ₹{balance.toLocaleString('en-IN')}</span>
              </div>
              <Input
                label=""
                type="number"
                placeholder="e.g. 2000"
                value={cashoutAmount}
                onChange={(e) => setCashoutAmount(e.target.value)}
                className="mb-0 animate-none"
              />
              <div className="flex gap-2 pt-1">
                {[500, 1000, 2000, 5000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setCashoutAmount(amt.toString())}
                    className="py-1 px-2.5 bg-[#fbf9f8] hover:bg-[#ffdcc2] border border-[#d7c3b5]/60 text-[#864f19] text-[10px] font-extrabold rounded-lg transition cursor-pointer"
                  >
                    ₹{amt}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setCashoutAmount(balance.toString())}
                  className="py-1 px-2.5 bg-[#864f19] text-white text-[10px] font-extrabold rounded-lg transition cursor-pointer border-none"
                >
                  Max (₹{balance})
                </button>
              </div>
            </div>
            
            <button
              type="submit"
              disabled={cashoutLoading}
              className="w-full py-3.5 bg-[#864f19] hover:bg-[#a3672f] text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm transition-all border-none cursor-pointer flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
            >
              {cashoutLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Submit Payout Request
            </button>
          </form>
        )}
      </Modal>

    </div>
  );
};

export default WalletDashboard;
