import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardBody, Button, Modal } from '../../components/ui';
import { Target, CheckCircle2, Calendar, Check, MapPin, Loader2, Plus, Users, Award, Eye, Building2 } from 'lucide-react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { getDistrictsForState, getDivisionsForDistrict, getPincodesForDivision } from '../../utils/locationData';

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
  
  // Compute precise normalized role & level
  const rawRole = (user?.role as string) || (user as any)?.level || 'pincode';
  const userRole = (rawRole === 'agent' ? ((user as any)?.level || 'pincode') : rawRole).toLowerCase();

  const isManager = userRole === 'state' || userRole === 'district' || userRole === 'division';

  const userState = user?.territory?.state || (user as any)?.assignedState || (user as any)?.state || 'Andhra Pradesh';
  const userDistrict = user?.territory?.district || (user as any)?.assignedDistrict || (user as any)?.district || 'Visakhapatnam';
  const userDivision = user?.territory?.division || (user as any)?.assignedDivision || (user as any)?.division || 'Vizag City Division';
  const userPincode = user?.territory?.pincode || (user as any)?.assignedPincode || (user as any)?.pincode || '530001';

  const userTargetsKey = useMemo(() => {
    return user?._id || user?.email ? `connect_portal_target_allocations_${user._id || user.email?.toLowerCase()}` : 'connect_portal_target_allocations';
  }, [user]);

  const [allocations, setAllocations] = useState<Allocation[]>(() => {
    try {
      const userKey = user?._id || user?.email ? `connect_portal_target_allocations_${user._id || user.email?.toLowerCase()}` : 'connect_portal_target_allocations';
      const saved = localStorage.getItem(userKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [];
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(userTargetsKey);
      if (saved) {
        setAllocations(JSON.parse(saved));
      } else {
        setAllocations([]);
      }
    } catch (e) {}
  }, [userTargetsKey]);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New target form
  const [title, setTitle] = useState('');
  const [targetMetric, setTargetMetric] = useState<'shop_tieups' | 'vendor_onboarding'>('shop_tieups');
  const [type, setType] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [targetValue, setTargetValue] = useState<number>(20);
  const [description, setDescription] = useState('');

  const defaultAgentType = userRole === 'state' ? 'district' : userRole === 'district' ? 'division' : 'pincode';
  const [agentType, setAgentType] = useState<'district' | 'division' | 'pincode'>(defaultAgentType);
  
  const [selectedDistrict, setSelectedDistrict] = useState<string>(userDistrict);
  const [selectedDivision, setSelectedDivision] = useState<string>(userDivision);
  const [selectedPincode, setSelectedPincode] = useState<string>(userPincode);
  const [selectedAgent, setSelectedAgent] = useState<string>('');

  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));

  // Dynamic Territory Lists based on Authorized Scope
  const availableDistricts = useMemo(() => {
    if (userRole === 'state') {
      return getDistrictsForState(userState);
    }
    return [userDistrict];
  }, [userRole, userState, userDistrict]);

  const availableDivisions = useMemo(() => {
    const currentDist = selectedDistrict || userDistrict;
    if (userRole === 'state') {
      return getDivisionsForDistrict(currentDist, userState);
    }
    if (userRole === 'district') {
      return getDivisionsForDistrict(userDistrict, userState);
    }
    return [userDivision];
  }, [userRole, selectedDistrict, userDistrict, userState, userDivision]);

  const availablePincodes = useMemo(() => {
    const currentDiv = selectedDivision || userDivision;
    return getPincodesForDivision(currentDiv);
  }, [selectedDivision, userDivision]);

  // Keep district/division/pincode selection valid on type or scope change
  useEffect(() => {
    if (availableDistricts.length > 0 && !availableDistricts.includes(selectedDistrict)) {
      setSelectedDistrict(availableDistricts[0]);
    }
  }, [availableDistricts, selectedDistrict]);

  useEffect(() => {
    if (availableDivisions.length > 0 && !availableDivisions.includes(selectedDivision)) {
      setSelectedDivision(availableDivisions[0]);
    }
  }, [availableDivisions, selectedDivision]);

  useEffect(() => {
    if (availablePincodes.length > 0 && !availablePincodes.includes(selectedPincode)) {
      setSelectedPincode(availablePincodes[0]);
    }
  }, [availablePincodes, selectedPincode]);

  // Dynamic AP Agent list based on selected Agent Type & Territory Scope
  const apAgents = useMemo(() => {
    if (agentType === 'district') {
      const dist = selectedDistrict || userDistrict;
      return [
        { id: 'agt-d1', name: 'Anu', role: 'District Agent', territory: `${dist} (${userState})` },
        { id: 'agt-d2', name: 'Rajesh Varma', role: 'District Agent', territory: `East Godavari (${userState})` },
        { id: 'agt-d3', name: 'Srinivas Rao', role: 'District Agent', territory: `Krishna District (${userState})` },
        { id: 'agt-d4', name: 'Prakash Naidu', role: 'District Agent', territory: `Guntur District (${userState})` }
      ];
    } else if (agentType === 'division') {
      const div = selectedDivision || userDivision;
      return [
        { id: 'agt-v1', name: 'goidhamma div', role: 'Division Agent', territory: `${div} (${selectedDistrict || userDistrict})` },
        { id: 'agt-v2', name: 'Ravi Manager', role: 'Division Agent', territory: `Gajuwaka Division (${selectedDistrict || userDistrict})` },
        { id: 'agt-v3', name: 'Kiran Division', role: 'Division Agent', territory: `Anakapalle Division (${selectedDistrict || userDistrict})` },
        { id: 'agt-v4', name: 'Suresh Division', role: 'Division Agent', territory: `Vijayawada Central Division (${selectedDistrict || userDistrict})` }
      ];
    } else {
      const pin = selectedPincode || userPincode;
      return [
        { id: 'agt-p1', name: 'raki pin', role: 'Pincode Agent', territory: `PIN ${pin} (${selectedDivision || userDivision})` },
        { id: 'agt-p2', name: 'Kiran Kumar', role: 'Pincode Agent', territory: `PIN 530017 (${selectedDivision || userDivision})` },
        { id: 'agt-p3', name: 'Ramesh Naidu', role: 'Pincode Agent', territory: `PIN 530018 (${selectedDivision || userDivision})` },
        { id: 'agt-p4', name: 'Nageswara Rao', role: 'Pincode Agent', territory: `PIN 530026 (${selectedDivision || userDivision})` }
      ];
    }
  }, [agentType, selectedDistrict, selectedDivision, selectedPincode, userDistrict, userDivision, userState, userPincode]);

  useEffect(() => {
    if (apAgents.length > 0) {
      setSelectedAgent(apAgents[0].name);
    }
  }, [apAgents]);

  useEffect(() => {
    if (isCreateModalOpen) {
      const def = userRole === 'state' ? 'district' : userRole === 'district' ? 'division' : 'pincode';
      setAgentType(def);
      setSelectedDistrict(userDistrict);
      setSelectedDivision(userDivision);
      setSelectedPincode(userPincode);
    }
  }, [isCreateModalOpen, userRole, userDistrict, userDivision, userPincode]);

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
          location: `PIN ${selectedPincode} (${userDivision})`,
          dueDate: new Date(a.dueDate).toLocaleDateString() + ' ' + new Date(a.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: a.status,
          priority: a.target?.type === 'daily' ? 'high' : 'medium',
          taskDescription: a.target?.description || 'Achieve merchant onboarding quota target goal.',
          targetValue: a.target?.targetValue || 20
        }));

        setAllocations(prev => {
          const apiIds = new Set(mapped.map(m => m._id));
          const localOnly = prev.filter(p => !apiIds.has(p._id));
          const combined = [...localOnly, ...mapped];
          try {
            localStorage.setItem(userTargetsKey, JSON.stringify(combined));
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

  const handleCreateTargetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !isManager) return;

    setIsSubmitting(true);
    const assignedAgentObj = apAgents.find(a => a.name === selectedAgent) || apAgents[0];

    const newAlloc: Allocation = {
      _id: `TSK-${Math.floor(1000 + Math.random() * 9000)}`,
      vendorName: title,
      location: `Assigned to: ${assignedAgentObj.name} (${assignedAgentObj.territory})`,
      dueDate: `${startDate} to ${endDate}`,
      status: 'assigned',
      priority: type === 'daily' ? 'high' : 'medium',
      taskDescription: description || `${targetMetric === 'shop_tieups' ? 'Shop Tie-ups' : 'Vendor Onboarding'} quota goal of ${targetValue} shops. Assigned to ${assignedAgentObj.name} (${assignedAgentObj.role}).`,
      targetValue
    };

    try {
      await api.post('/targets', {
        title,
        description,
        type,
        targetValue,
        assignedAgent: assignedAgentObj.name,
        agentRole: assignedAgentObj.role,
        agentTerritory: assignedAgentObj.territory,
        pincode: selectedPincode,
        startDate,
        endDate
      });
    } catch (e) {
      console.log('Simulated local target creation');
    }

    setAllocations(prev => {
      const updated = [newAlloc, ...prev];
      try {
        localStorage.setItem(userTargetsKey, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
    setIsCreateModalOpen(false);
    setIsSubmitting(false);
    
    // Reset form
    setTitle('');
    setDescription('');
    setTargetValue(20);
  };

  const [activeTab, setActiveTab] = useState<string>(() => {
    if (userRole === 'state') return 'district_allocations';
    if (userRole === 'district') return 'division_allocations';
    if (userRole === 'division') return 'pincode_allocations';
    return 'my_pincode_targets';
  });

  const [selectedTargetProgress, setSelectedTargetProgress] = useState<Allocation | null>(null);

  const getFilteredAllocations = () => {
    if (activeTab === 'completed') {
      return allocations.filter(a => a.status === 'completed');
    }
    if (activeTab === 'district_allocations') {
      return allocations.filter(a => a.status !== 'completed' && (a.taskDescription?.toLowerCase().includes('district') || a.location?.toLowerCase().includes('district')));
    }
    if (activeTab === 'division_allocations') {
      return allocations.filter(a => a.status !== 'completed' && (a.taskDescription?.toLowerCase().includes('division') || a.location?.toLowerCase().includes('division')));
    }
    if (activeTab === 'my_pincode_targets') {
      return allocations.filter(a => a.status !== 'completed');
    }
    // Default: pincode_allocations
    return allocations.filter(a => a.status !== 'completed' && !a.taskDescription?.toLowerCase().includes('district agent') && !a.taskDescription?.toLowerCase().includes('division agent'));
  };

  const currentTasks = getFilteredAllocations();
  const completedCount = allocations.filter(a => a.status === 'completed').length;
  const progressPercent = allocations.length ? Math.round((completedCount / allocations.length) * 100) : 0;

  return (
    <div className="space-y-6 animate-fade-in text-[#1b1c1c] font-sans">
      
      {/* Header HUD */}
      <div className="bg-white p-6 rounded-[16px] border border-[#eae8e7] shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-[#1b1c1c] tracking-tight">Targets & Task Allocations</h1>
            <span className="px-2.5 py-0.5 bg-[#864f19]/10 text-[#864f19] font-black text-[10px] uppercase rounded-full border border-[#864f19]/20">
              {userRole === 'state' ? 'STATE SUPERVISION' : userRole === 'district' ? 'DISTRICT SUPERVISION' : userRole === 'division' ? 'DIVISION MANAGEMENT' : 'PINCODE FIELD AGENT'}
            </span>
          </div>
          <p className="text-xs text-[#52443a] font-semibold uppercase tracking-wider">
            Authorized Scope: <strong className="text-[#864f19]">{userRole === 'state' ? userState : userRole === 'district' ? userDistrict : userRole === 'division' ? userDivision : `PIN ${userPincode} (${userDivision})`}</strong>
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

          {/* Only Managers can assign new targets. Pincode Agents cannot create or assign targets */}
          {isManager && (
            <Button
              variant="primary"
              onClick={() => setIsCreateModalOpen(true)}
              leftIcon={<Plus className="w-4 h-4" />}
              className="py-2.5 px-4 font-bold rounded-xl border-none text-xs uppercase tracking-wider shadow-sm transition w-full sm:w-auto justify-center bg-[#864f19] text-white cursor-pointer"
            >
              Assign New Target
            </Button>
          )}
        </div>
      </div>

      {/* Hierarchy Tabs (Role Scoped) */}
      <div className="flex flex-wrap gap-4 border-b border-[#eae8e7] pb-px">
        {userRole === 'state' && (
          <button
            onClick={() => setActiveTab('district_allocations')}
            className={`text-xs font-extrabold uppercase pb-3.5 border-b-2 transition-all cursor-pointer ${
              activeTab === 'district_allocations' ? 'border-[#864f19] text-[#864f19]' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            🏢 District Agent Allocations
          </button>
        )}

        {(userRole === 'state' || userRole === 'district') && (
          <button
            onClick={() => setActiveTab('division_allocations')}
            className={`text-xs font-extrabold uppercase pb-3.5 border-b-2 transition-all cursor-pointer ${
              activeTab === 'division_allocations' ? 'border-[#864f19] text-[#864f19]' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            🏛️ Division Agent Allocations
          </button>
        )}

        {userRole !== 'pincode' && (
          <button
            onClick={() => setActiveTab('pincode_allocations')}
            className={`text-xs font-extrabold uppercase pb-3.5 border-b-2 transition-all cursor-pointer ${
              activeTab === 'pincode_allocations' ? 'border-[#864f19] text-[#864f19]' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            📍 Pincode Agent Allocations
          </button>
        )}

        {userRole === 'pincode' && (
          <button
            onClick={() => setActiveTab('my_pincode_targets')}
            className={`text-xs font-extrabold uppercase pb-3.5 border-b-2 transition-all cursor-pointer ${
              activeTab === 'my_pincode_targets' ? 'border-[#864f19] text-[#864f19]' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            🎯 My Assigned Targets
          </button>
        )}

        <button
          onClick={() => setActiveTab('completed')}
          className={`text-xs font-extrabold uppercase pb-3.5 border-b-2 transition-all cursor-pointer ${
            activeTab === 'completed' ? 'border-[#864f19] text-[#864f19]' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          ✓ Completed History
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
            <div className="col-span-full bg-white/80 backdrop-blur-xs p-10 text-center rounded-[20px] border border-[#eae8e7] space-y-3 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-[#864f19]/10 text-[#864f19] flex items-center justify-center mx-auto">
                <Target className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-black text-slate-800">No target allocations found for this view.</p>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  {isManager ? 'Assign shop tie-up targets to downstream agents across your authorized territory.' : 'Your assigned quota goals will be listed here once allocated by your Division Manager.'}
                </p>
              </div>
            </div>
          ) : (
            currentTasks.map((task) => {
              const assignedVal = task.targetValue || 20;
              const achievedVal = task.status === 'completed' ? assignedVal : Math.min(8, assignedVal);
              const remainingVal = Math.max(0, assignedVal - achievedVal);
              const pctVal = Math.round((achievedVal / assignedVal) * 100);

              return (
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

                    {/* Progress Metrics */}
                    <div className="grid grid-cols-4 gap-1.5 bg-[#fbf9f8] p-2.5 rounded-xl border border-[#d7c3b5]/40 text-center">
                      <div>
                        <span className="text-[8px] uppercase font-bold text-slate-400 block">Assigned</span>
                        <span className="text-xs font-black text-slate-800">{assignedVal}</span>
                      </div>
                      <div className="border-l border-[#d7c3b5]/30">
                        <span className="text-[8px] uppercase font-bold text-emerald-600 block">Achieved</span>
                        <span className="text-xs font-black text-emerald-700">{achievedVal}</span>
                      </div>
                      <div className="border-l border-[#d7c3b5]/30">
                        <span className="text-[8px] uppercase font-bold text-[#864f19] block">Remaining</span>
                        <span className="text-xs font-black text-[#864f19]">{remainingVal}</span>
                      </div>
                      <div className="border-l border-[#d7c3b5]/30">
                        <span className="text-[8px] uppercase font-bold text-blue-600 block">Progress</span>
                        <span className="text-xs font-black text-blue-700">{pctVal}%</span>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-1 text-[11px] font-semibold text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" /> {task.location}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" /> Period: <span className={task.status === 'overdue' ? 'text-red-600 font-bold' : ''}>{task.dueDate}</span>
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
                    
                    <button
                      type="button"
                      onClick={() => setSelectedTargetProgress(task)}
                      className="py-1 px-3 bg-[#fbf9f8] hover:bg-[#ffdcc2] border border-[#d7c3b5]/60 text-[#864f19] font-bold text-[11px] rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                    >
                      <Eye className="w-3.5 h-3.5" /> View Progress
                    </button>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* Target Progress Drawer/Modal */}
      {selectedTargetProgress && (
        <Modal
          isOpen={Boolean(selectedTargetProgress)}
          onClose={() => setSelectedTargetProgress(null)}
          title="Target Quota & Audit Progress"
          size="md"
        >
          <div className="space-y-4 font-sans text-xs">
            <div className="bg-[#fbf9f8] p-4 rounded-2xl border border-[#d7c3b5]/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-sm text-[#1b1c1c]">{selectedTargetProgress.vendorName}</span>
                <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-black rounded-full uppercase">
                  {selectedTargetProgress.status}
                </span>
              </div>
              <p className="text-slate-600 text-xs font-medium">{selectedTargetProgress.taskDescription}</p>
              <p className="text-slate-400 text-[11px] font-semibold">{selectedTargetProgress.location}</p>
            </div>

            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[9px] uppercase font-bold text-slate-400 block">Assigned</span>
                <span className="text-lg font-black text-slate-900">{selectedTargetProgress.targetValue || 20}</span>
              </div>
              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                <span className="text-[9px] uppercase font-bold text-emerald-700 block">Achieved</span>
                <span className="text-lg font-black text-emerald-800">8</span>
              </div>
              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200">
                <span className="text-[9px] uppercase font-bold text-amber-700 block">Remaining</span>
                <span className="text-lg font-black text-amber-800">12</span>
              </div>
              <div className="bg-blue-50 p-3 rounded-xl border border-blue-200">
                <span className="text-[9px] uppercase font-bold text-blue-700 block">Progress</span>
                <span className="text-lg font-black text-blue-800">40%</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <Button variant="outline" onClick={() => setSelectedTargetProgress(null)}>
                Close Breakdown
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL: Create Target Goal (State / District / Division Managers Only) */}
      {isManager && (
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="Create Target Goal"
          size="md"
        >
          <div className="space-y-4 font-sans text-xs">
            <form onSubmit={handleCreateTargetSubmit} className="space-y-3.5 font-semibold">
              
              {/* Target Type Selection (Role-Based Downstream Agent Selection Only) */}
              <div className="space-y-1">
                <label className="block text-[#52443a] uppercase text-[10px] font-bold">Target Type *</label>
                <div className="flex flex-wrap gap-2">
                  {userRole === 'state' && (
                    <>
                      <button
                        type="button"
                        onClick={() => setAgentType('district')}
                        className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl border transition cursor-pointer text-center ${
                          agentType === 'district'
                            ? 'bg-[#864f19] text-white border-[#864f19]'
                            : 'bg-[#fbf9f8] text-[#52443a] border-[#d7c3b5]/60 hover:bg-[#eae8e7]'
                        }`}
                      >
                        District Agent Target
                      </button>
                      <button
                        type="button"
                        onClick={() => setAgentType('division')}
                        className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl border transition cursor-pointer text-center ${
                          agentType === 'division'
                            ? 'bg-[#864f19] text-white border-[#864f19]'
                            : 'bg-[#fbf9f8] text-[#52443a] border-[#d7c3b5]/60 hover:bg-[#eae8e7]'
                        }`}
                      >
                        Division Agent Target
                      </button>
                      <button
                        type="button"
                        onClick={() => setAgentType('pincode')}
                        className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl border transition cursor-pointer text-center ${
                          agentType === 'pincode'
                            ? 'bg-[#864f19] text-white border-[#864f19]'
                            : 'bg-[#fbf9f8] text-[#52443a] border-[#d7c3b5]/60 hover:bg-[#eae8e7]'
                        }`}
                      >
                        Pincode Agent Target
                      </button>
                    </>
                  )}

                  {userRole === 'district' && (
                    <>
                      <button
                        type="button"
                        onClick={() => setAgentType('division')}
                        className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl border transition cursor-pointer text-center ${
                          agentType === 'division'
                            ? 'bg-[#864f19] text-white border-[#864f19]'
                            : 'bg-[#fbf9f8] text-[#52443a] border-[#d7c3b5]/60 hover:bg-[#eae8e7]'
                        }`}
                      >
                        Division Agent Target
                      </button>
                      <button
                        type="button"
                        onClick={() => setAgentType('pincode')}
                        className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl border transition cursor-pointer text-center ${
                          agentType === 'pincode'
                            ? 'bg-[#864f19] text-white border-[#864f19]'
                            : 'bg-[#fbf9f8] text-[#52443a] border-[#d7c3b5]/60 hover:bg-[#eae8e7]'
                        }`}
                      >
                        Pincode Agent Target
                      </button>
                    </>
                  )}

                  {userRole === 'division' && (
                    <button
                      type="button"
                      onClick={() => setAgentType('pincode')}
                      className={`w-full py-2 px-3 text-xs font-bold rounded-xl border transition cursor-pointer text-center ${
                        agentType === 'pincode'
                          ? 'bg-[#864f19] text-white border-[#864f19]'
                          : 'bg-[#fbf9f8] text-[#52443a] border-[#d7c3b5]/60 hover:bg-[#eae8e7]'
                      }`}
                    >
                      Pincode Agent Target
                    </button>
                  )}
                </div>
              </div>

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

              {/* Target Metric & Frequency */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[#52443a] uppercase text-[10px] font-bold">Target Metric *</label>
                  <select
                    value={targetMetric}
                    onChange={(e: any) => setTargetMetric(e.target.value)}
                    className="w-full bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl py-2 px-3 focus:outline-none focus:ring-1 focus:ring-[#864f19]"
                  >
                    <option value="shop_tieups">Shop Tie-ups</option>
                    <option value="vendor_onboarding">Vendor Onboarding</option>
                  </select>
                </div>

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
              </div>

              {/* Dynamic Territory & Agent Selection based on selected Target Type */}
              {agentType === 'district' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[#52443a] uppercase text-[10px] font-bold">Target District *</label>
                    <select
                      value={selectedDistrict}
                      onChange={(e) => setSelectedDistrict(e.target.value)}
                      className="w-full bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl py-2 px-3 focus:outline-none focus:ring-1 focus:ring-[#864f19]"
                    >
                      {availableDistricts.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[#52443a] uppercase text-[10px] font-bold">Assign to District Agent *</label>
                    <select
                      value={selectedAgent}
                      onChange={(e) => setSelectedAgent(e.target.value)}
                      className="w-full bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl py-2 px-3 focus:outline-none focus:ring-1 focus:ring-[#864f19]"
                    >
                      {apAgents.map(agt => (
                        <option key={agt.id} value={agt.name}>
                          {agt.name} ({agt.territory})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {agentType === 'division' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-[#52443a] uppercase text-[10px] font-bold">Target District *</label>
                      <select
                        value={selectedDistrict}
                        onChange={(e) => setSelectedDistrict(e.target.value)}
                        className="w-full bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl py-2 px-3 focus:outline-none focus:ring-1 focus:ring-[#864f19]"
                      >
                        {availableDistricts.map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[#52443a] uppercase text-[10px] font-bold">Target Division *</label>
                      <select
                        value={selectedDivision}
                        onChange={(e) => setSelectedDivision(e.target.value)}
                        className="w-full bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl py-2 px-3 focus:outline-none focus:ring-1 focus:ring-[#864f19]"
                      >
                        {availableDivisions.map(div => (
                          <option key={div} value={div}>{div}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[#52443a] uppercase text-[10px] font-bold">Assign to Division Agent *</label>
                    <select
                      value={selectedAgent}
                      onChange={(e) => setSelectedAgent(e.target.value)}
                      className="w-full bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl py-2 px-3 focus:outline-none focus:ring-1 focus:ring-[#864f19]"
                    >
                      {apAgents.map(agt => (
                        <option key={agt.id} value={agt.name}>
                          {agt.name} ({agt.territory})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {agentType === 'pincode' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-[#52443a] uppercase text-[10px] font-bold">Target District *</label>
                      <select
                        value={selectedDistrict}
                        onChange={(e) => setSelectedDistrict(e.target.value)}
                        className="w-full bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl py-2 px-3 focus:outline-none focus:ring-1 focus:ring-[#864f19]"
                      >
                        {availableDistricts.map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[#52443a] uppercase text-[10px] font-bold">Target Division *</label>
                      <select
                        value={selectedDivision}
                        onChange={(e) => setSelectedDivision(e.target.value)}
                        className="w-full bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl py-2 px-3 focus:outline-none focus:ring-1 focus:ring-[#864f19]"
                      >
                        {availableDivisions.map(div => (
                          <option key={div} value={div}>{div}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-[#52443a] uppercase text-[10px] font-bold">Target Pincode *</label>
                      <select
                        value={selectedPincode}
                        onChange={(e) => setSelectedPincode(e.target.value)}
                        className="w-full bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl py-2 px-3 focus:outline-none focus:ring-1 focus:ring-[#864f19]"
                      >
                        {availablePincodes.map(pin => (
                          <option key={pin} value={pin}>PIN {pin}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[#52443a] uppercase text-[10px] font-bold">Assign to Pincode Agent *</label>
                      <select
                        value={selectedAgent}
                        onChange={(e) => setSelectedAgent(e.target.value)}
                        className="w-full bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl py-2 px-3 focus:outline-none focus:ring-1 focus:ring-[#864f19]"
                      >
                        {apAgents.map(agt => (
                          <option key={agt.id} value={agt.name}>
                            {agt.name} ({agt.territory})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Quantity, Start Date & End Date */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="block text-[#52443a] uppercase text-[10px] font-bold">Target Quantity *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={targetValue}
                    onChange={(e) => setTargetValue(parseInt(e.target.value, 10) || 1)}
                    className="w-full bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl py-2 px-3 focus:outline-none focus:ring-1 focus:ring-[#864f19]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[#52443a] uppercase text-[10px] font-bold">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl py-2 px-3 focus:outline-none focus:ring-1 focus:ring-[#864f19]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[#52443a] uppercase text-[10px] font-bold">End Date *</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
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

              <div className="flex justify-end gap-2 pt-3 border-t border-[#eae8e7]">
                <Button variant="outline" type="button" onClick={() => setIsCreateModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={isSubmitting} className="bg-[#864f19] text-white font-bold">
                  {isSubmitting ? 'Creating...' : 'Save Target Goal'}
                </Button>
              </div>
            </form>
          </div>
        </Modal>
      )}

    </div>
  );
};

export default TargetsList;
