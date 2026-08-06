import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardBody, Button } from '../../components/ui';
import { Target, CheckCircle2, Calendar, Check, MapPin, Loader2, Plus, Users, Award } from 'lucide-react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

interface Allocation {
  _id: string;
  vendorName: string;
  location: string;
  dueDate: string;
  status: 'assigned' | 'accepted' | 'in_progress' | 'completed' | 'pending' | 'overdue';
  priority: 'high' | 'medium' | 'low';
  taskDescription: string;
  targetValue?: number;
}

export const TargetsList: React.FC = () => {
  const { user } = useAuth();
  const isManager = user?.role === 'state' || user?.role === 'district' || user?.role === 'division';

  const defaultInitialTargets: Allocation[] = [
    {
      _id: "TSK-0911",
      vendorName: "Hosur Onboarding Quota",
      location: "Krishnagiri District (635109 Hosur)",
      dueDate: "Today, 5:00 PM",
      status: "assigned",
      priority: "high",
      taskDescription: "Onboard 10 verified Kirana merchant shops in territory.",
      targetValue: 10
    },
    {
      _id: "TSK-3342",
      vendorName: "KYC Verification Goal",
      location: "Krishnagiri Central (635001)",
      dueDate: "Today, 7:00 PM",
      status: "completed",
      priority: "medium",
      taskDescription: "Complete physical document audits for 5 regional partners.",
      targetValue: 5
    }
  ];

  const [allocations, setAllocations] = useState<Allocation[]>(() => {
    try {
      const saved = localStorage.getItem('connect_portal_target_allocations');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return defaultInitialTargets;
  });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeTab, setActiveTab] = useState<'today' | 'upcoming' | 'completed'>('today');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);

  // New target form
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [targetValue, setTargetValue] = useState<number>(10);
  const [description, setDescription] = useState('');

  // Assignment form
  const [assignedAgentEmail, setAssignedAgentEmail] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchAssignments = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const response = await api.get('/targets/assignments/mine');
      const backendAssignments = response.data.assignments || [];
      
      if (backendAssignments.length > 0) {
        const mapped: Allocation[] = backendAssignments.map((a: any) => ({
          _id: a._id,
          vendorName: a.target?.title || 'Merchant Onboarding Target',
          location: 'Territory Jurisdiction Scope',
          dueDate: new Date(a.dueDate).toLocaleDateString() + ' ' + new Date(a.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: a.status,
          priority: a.target?.type === 'daily' ? 'high' : 'medium',
          taskDescription: a.target?.description || 'Achieve merchant onboarding quota target goal.',
          targetValue: a.target?.targetValue || 10
        }));

        setAllocations(prev => {
          const apiIds = new Set(mapped.map(m => m._id));
          const localOnly = prev.filter(p => !apiIds.has(p._id));
          const combined = [...localOnly, ...mapped];
          try {
            localStorage.setItem('connect_portal_target_allocations', JSON.stringify(combined));
          } catch (e) {}
          return combined;
        });
      }
    } catch (err: any) {
      console.log('Using local targets allocations');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  const handleMarkCompleted = async (id: string) => {
    try {
      await api.patch(`/targets/assignments/${id}/status`, { status: 'completed' });
    } catch (e) {
      console.log('Simulated status update locally');
    }
    setAllocations(prev => {
      const updated = prev.map(a => a._id === id ? { ...a, status: 'completed' as const } : a);
      try {
        localStorage.setItem('connect_portal_target_allocations', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  const handleCreateTargetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    setIsSubmitting(true);
    const newAlloc: Allocation = {
      _id: `TSK-${Math.floor(1000 + Math.random() * 9000)}`,
      vendorName: title,
      location: 'Assigned Territory Scope',
      dueDate: 'Today, 6:00 PM',
      status: 'assigned',
      priority: type === 'daily' ? 'high' : 'medium',
      taskDescription: description || `Achieve ${type} quota target goal of ${targetValue} onboarding logs.`,
      targetValue
    };

    try {
      await api.post('/targets', {
        title,
        description,
        type,
        targetValue
      });
    } catch (e) {
      console.log('Simulated local target creation');
    }

    setAllocations(prev => {
      const updated = [newAlloc, ...prev];
      try {
        localStorage.setItem('connect_portal_target_allocations', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
    setIsCreateModalOpen(false);
    setIsSubmitting(false);
    
    // Reset form
    setTitle('');
    setDescription('');
    setTargetValue(10);
  };

  const getFilteredAllocations = () => {
    if (activeTab === 'completed') {
      return allocations.filter(a => a.status === 'completed');
    }
    if (activeTab === 'upcoming') {
      return allocations.filter(a => a.status !== 'completed' && !a.dueDate.includes('Today') && !a.dueDate.includes('Yesterday'));
    }
    return allocations.filter(a => a.status !== 'completed');
  };

  const currentTasks = getFilteredAllocations();
  const completedCount = allocations.filter(a => a.status === 'completed').length;
  const progressPercent = allocations.length ? Math.round((completedCount / allocations.length) * 100) : 0;

  return (
    <div className="space-y-6 animate-fade-in text-[#1b1c1c] font-sans">
      
      {/* Header HUD */}
      <div className="bg-white p-6 rounded-[16px] border border-[#eae8e7] shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-black text-[#1b1c1c] tracking-tight">Targets & Task Allocations</h1>
          <p className="text-xs text-[#52443a] font-semibold uppercase tracking-wider">
            Review allocated field visits, view quota progress, and submit verification updates.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 shrink-0 w-full md:w-auto">
          <div className="flex items-center gap-4 bg-[#fbf9f8] p-3 px-4 rounded-xl border border-[#eae8e7] w-full sm:w-auto">
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Target Quota</span>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-black text-[#864f19]">{completedCount} of {allocations.length}</span>
                <span className="text-slate-400 text-xs font-semibold">({progressPercent}%)</span>
              </div>
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
                  strokeDasharray={`${progressPercent}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="absolute text-[10px] font-black text-slate-800">{progressPercent}</span>
            </div>
          </div>

          {isManager && (
            <Button
              variant="primary"
              onClick={() => setIsCreateModalOpen(true)}
              leftIcon={<Plus className="w-4 h-4" />}
              className="py-2.5 px-4 font-bold rounded-xl border-none text-xs uppercase tracking-wider shadow-sm transition w-full sm:w-auto justify-center"
            >
              Create Target Goal
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-[#eae8e7] pb-px">
        <button
          onClick={() => setActiveTab('today')}
          className={`text-xs font-extrabold uppercase pb-3.5 border-b-2 transition-all cursor-pointer ${
            activeTab === 'today' ? 'border-[#864f19] text-[#864f19]' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Today's Schedule & Active
        </button>
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`text-xs font-extrabold uppercase pb-3.5 border-b-2 transition-all cursor-pointer ${
            activeTab === 'upcoming' ? 'border-[#864f19] text-[#864f19]' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Upcoming Allocations
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`text-xs font-extrabold uppercase pb-3.5 border-b-2 transition-all cursor-pointer ${
            activeTab === 'completed' ? 'border-[#864f19] text-[#864f19]' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Completed History
        </button>
      </div>

      {/* Task Cards Grid */}
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="w-8 h-8 text-[#864f19] animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {currentTasks.length === 0 ? (
            <div className="col-span-full bg-white p-12 text-center rounded-[16px] border border-[#eae8e7] space-y-2">
              <Target className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-500">No active tasks match this filter list.</p>
            </div>
          ) : (
            currentTasks.map((task) => (
              <Card key={task._id} className="relative overflow-hidden flex flex-col justify-between">
                <CardHeader className="flex justify-between items-start border-b border-slate-50 pb-3">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">{task._id}</span>
                    <CardTitle className="text-sm font-extrabold text-slate-900 mt-0.5">{task.vendorName}</CardTitle>
                  </div>
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                    task.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                    task.status === 'overdue' ? 'bg-red-50 text-red-700 border border-red-100' :
                    'bg-blue-50 text-blue-700 border border-blue-100'
                  }`}>
                    {task.status}
                  </span>
                </CardHeader>

                <CardBody className="py-4 space-y-3">
                  <p className="text-xs text-slate-600 font-medium leading-relaxed">{task.taskDescription}</p>

                  <div className="space-y-1.5 pt-1 text-[11px] font-semibold text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" /> {task.location}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" /> Due: <span className={task.status === 'overdue' ? 'text-red-600 font-bold' : ''}>{task.dueDate}</span>
                    </div>
                  </div>
                </CardBody>

                <div className="p-4 bg-slate-50 border-t border-slate-100/80 flex items-center justify-between gap-3">
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                    task.priority === 'high' ? 'bg-red-100 text-red-700' :
                    task.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                    'bg-slate-200 text-slate-600'
                  }`}>
                    {task.priority} priority
                  </span>
                  
                  {task.status !== 'completed' && (
                    <Button
                      variant="primary"
                      className="py-1 px-3 text-[10px] h-auto font-bold uppercase tracking-wider bg-[#864f19] hover:bg-[#a3672f] text-white border-none cursor-pointer flex items-center gap-1"
                      onClick={() => handleMarkCompleted(task._id)}
                      leftIcon={<Check className="w-3.5 h-3.5" />}
                    >
                      Done
                    </Button>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* MODAL: Create Target Goal (Manager Only) */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-[#eae8e7] space-y-5">
            <div className="flex justify-between items-center border-b border-[#eae8e7] pb-3">
              <h3 className="text-base font-black text-[#1b1c1c] flex items-center gap-2">
                <Target className="w-5 h-5 text-[#864f19]" /> Create Target Goal
              </h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer">×</button>
            </div>

            <form onSubmit={handleCreateTargetSubmit} className="space-y-4 text-xs font-semibold">
              <div className="space-y-1">
                <label className="block text-[#52443a] uppercase text-[10px] font-bold">Target Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Weekly Merchant Onboarding Target"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl py-2 px-3 focus:outline-none focus:ring-1 focus:ring-[#864f19]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[#52443a] uppercase text-[10px] font-bold">Frequency Type</label>
                  <select
                    value={type}
                    onChange={(e: any) => setType(e.target.value)}
                    className="w-full bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl py-2 px-3 focus:outline-none focus:ring-1 focus:ring-[#864f19]"
                  >
                    <option value="daily">Daily Goal</option>
                    <option value="weekly">Weekly Goal</option>
                    <option value="monthly">Monthly Goal</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[#52443a] uppercase text-[10px] font-bold">Target Quota Value</label>
                  <input
                    type="number"
                    min={1}
                    value={targetValue}
                    onChange={(e) => setTargetValue(parseInt(e.target.value, 10) || 1)}
                    className="w-full bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl py-2 px-3 focus:outline-none focus:ring-1 focus:ring-[#864f19]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[#52443a] uppercase text-[10px] font-bold">Goal Description & Instructions</label>
                <textarea
                  rows={3}
                  placeholder="Describe goal criteria, required documents, or onboard merchant quota..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl py-2 px-3 focus:outline-none focus:ring-1 focus:ring-[#864f19] resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#eae8e7]">
                <Button variant="outline" type="button" onClick={() => setIsCreateModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={isSubmitting} className="bg-[#864f19] text-white font-bold">
                  {isSubmitting ? 'Creating...' : 'Save Target Goal'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default TargetsList;
