import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckSquare,
  Clock,
  AlertTriangle,
  Send,
  Plus,
  RefreshCw,
  Search,
  Filter,
  UserCheck,
  XCircle,
  CheckCircle2,
  Calendar,
  MapPin,
  Camera,
  Mic,
  RotateCcw,
  History,
  Eye,
  FileText,
  AlertCircle,
  Building,
  ArrowRight,
  ShieldAlert,
  ChevronRight,
  Upload,
  User
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardBody, Button, Modal } from '../../components/ui';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import {
  getActiveStates,
  getActiveDistricts,
  getActiveDivisions,
  getActivePincodes
} from '../../utils/territoryService';

export interface TaskItem {
  _id: string;
  taskNumber: string;
  title: string;
  description: string;
  priority: 'High' | 'Medium' | 'Low';
  dueDate: string;
  taskType: 'admin_direct' | 'agent_request';
  requestStatus: 'pending' | 'approved' | 'rejected' | 'n/a';
  status:
    | 'Pending Admin Review'
    | 'Assigned'
    | 'In Progress'
    | 'Rework'
    | 'Submitted for Review'
    | 'Approved'
    | 'Rejected'
    | 'Closed'
    | 'Completed'
    | 'Accepted';
  hierarchyLevel: 'state' | 'district' | 'division' | 'pincode';
  state?: string;
  district?: string;
  division?: string;
  pincode?: string;
  location?: string;
  vendor?: string;
  category?: string;
  createdById?: string;
  createdByName?: string;
  createdByRole?: string;
  receivingAdminId?: string;
  receivingAdminName?: string;
  receivingAdminRole?: string;
  assignedAgentId?: string;
  assignedAgentName?: string;
  assignedAgentRole?: string;
  assignedDate?: string;
  photos?: string[];
  voiceNote?: string;
  completionDetails?: {
    remarks?: string;
    workCompleted?: string;
    photos?: string[];
    voiceNote?: string;
    submittedAt?: string;
    completedAt?: string;
    completedBy?: string;
  };
  reworkDetails?: {
    reason?: string;
    reworkRemarks?: string;
    requestedBy?: string;
    requestedAt?: string;
    previousSubmissions?: Array<{
      remarks?: string;
      photos?: string[];
      voiceNote?: string;
      submittedAt?: string;
      submittedBy?: string;
      reviewNotes?: string;
    }>;
  };
  rejectionReason?: string;
  rejectionDetails?: {
    reason: string;
    rejectedBy?: string;
    rejectedAt?: string;
    rejectionType?: string;
  };
  history?: Array<{
    action: string;
    performedBy: string;
    performedRole?: string;
    timestamp: string;
    details?: any;
  }>;
  isOverdue?: boolean;
  permissions?: {
    canApproveRequest: boolean;
    canRejectRequest: boolean;
    canAccept: boolean;
    canRejectTask: boolean;
    canSubmitEvidence: boolean;
    canReviewEvidence: boolean;
    canExecute?: boolean;
    isHighPriority: boolean;
    isInitiator: boolean;
    isAssignedAgent: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

const getMinDateTimeString = () => {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
};

export const TaskWorkflowModule: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Tab State
  const [activeTab, setActiveTab] = useState<'my_tasks' | 'created' | 'requests' | 'territory'>('my_tasks');

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isRejectRequestModalOpen, setIsRejectRequestModalOpen] = useState(false);
  const [isRejectTaskModalOpen, setIsRejectTaskModalOpen] = useState(false);
  const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState(false);
  const [isReviewEvidenceModalOpen, setIsReviewEvidenceModalOpen] = useState(false);

  // Form States for Actions
  const [actionReason, setActionReason] = useState('');
  const [actionNotes, setActionNotes] = useState('');
  const [selectedEligibleAgentId, setSelectedEligibleAgentId] = useState('');
  const [evidenceRemarks, setEvidenceRemarks] = useState('');
  const [evidencePhotos, setEvidencePhotos] = useState<string[]>([]);
  const [evidenceVoiceNote, setEvidenceVoiceNote] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Determine user role details
  const rawRole = (user?.role as string) || (user as any)?.level || 'pincode';
  const userRole = (rawRole === 'agent' ? ((user as any)?.level || 'pincode') : rawRole).toLowerCase();
  const adminRegex = /state\s*admin|state_manager|district\s*admin|district_manager|division\s*admin|divisional\s*admin|division_manager|pincode\s*admin|pincode_manager|super\s*admin|^admin$/i;
  const isAdmin = adminRegex.test(rawRole);
  const isAgent = !isAdmin;

  let userLevel: 'state' | 'district' | 'division' | 'pincode' = 'pincode';
  if (userRole.includes('state')) userLevel = 'state';
  else if (userRole.includes('district')) userLevel = 'district';
  else if (userRole.includes('division') || userRole.includes('divisional')) userLevel = 'division';
  else if (userRole.includes('pincode')) userLevel = 'pincode';

  const userTerritory = useMemo(() => ({
    state: user?.assignedTerritory?.state || user?.territory?.state || (user as any)?.assignedState || (user as any)?.state || '',
    district: user?.assignedTerritory?.district || user?.territory?.district || (user as any)?.assignedDistrict || (user as any)?.district || '',
    division: user?.assignedTerritory?.division || user?.territory?.division || (user as any)?.assignedDivision || (user as any)?.division || '',
    pincode: user?.assignedTerritory?.pincode || user?.territory?.pincode || (user as any)?.assignedPincode || (user as any)?.pincode || ''
  }), [user]);

  // Next level for Agent request
  const nextLowerLevel = useMemo(() => {
    if (userLevel === 'state') return 'district';
    if (userLevel === 'district') return 'division';
    if (userLevel === 'division') return 'pincode';
    return null; // Pincode has no lower level
  }, [userLevel]);

  // Fetch Tasks Query
  const {
    data: tasksData,
    isLoading,
    isFetching,
    refetch
  } = useQuery({
    queryKey: ['hierarchicalTasks', activeTab, statusFilter, priorityFilter, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('tab', activeTab);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (priorityFilter !== 'all') params.append('priority', priorityFilter);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const res = await api.get(`/tasks?${params.toString()}`);
      return res.data;
    },
    staleTime: 5000
  });

  const tasks: TaskItem[] = tasksData?.tasks || [];

  // Create Task Form State
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    priority: 'Medium' as 'High' | 'Medium' | 'Low',
    dueDate: '',
    state: userTerritory.state,
    district: userTerritory.district,
    division: userTerritory.division,
    pincode: userTerritory.pincode,
    assignedAgentId: '',
    category: 'Field Operations & Verification',
    vendor: '',
    location: ''
  });

  // Helper to get local ISO string formatted for datetime-local min attribute (YYYY-MM-DDTHH:mm)
  const getMinDateTimeString = () => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  };

  // Cascading territory dropdown states for creation
  const [statesList, setStatesList] = useState<string[]>([]);
  const [districtsList, setDistrictsList] = useState<string[]>([]);
  const [divisionsList, setDivisionsList] = useState<string[]>([]);
  const [pincodesList, setPincodesList] = useState<string[]>([]);

  // Auto-fill createForm territory bounds when modal opens
  React.useEffect(() => {
    if (isCreateModalOpen) {
      setCreateForm(prev => ({
        ...prev,
        state: prev.state || userTerritory.state,
        district: prev.district || userTerritory.district,
        division: prev.division || userTerritory.division,
        pincode: prev.pincode || (userLevel === 'pincode' ? userTerritory.pincode : '')
      }));
      setActionError('');
    }
  }, [isCreateModalOpen, userTerritory, userLevel]);

  // Load States — only when Create Task modal is opened
  React.useEffect(() => {
    if (!isCreateModalOpen) return;
    getActiveStates().then(list => setStatesList(list)).catch(() => {});
  }, [isCreateModalOpen]);

  // Cascading Districts — only when Create Task modal is opened
  React.useEffect(() => {
    if (!isCreateModalOpen) return;
    const s = createForm.state || userTerritory.state;
    if (s) {
      getActiveDistricts(s).then(list => setDistrictsList(list)).catch(() => {});
    } else {
      setDistrictsList([]);
    }
  }, [isCreateModalOpen, createForm.state, userTerritory.state]);

  // Cascading Divisions — only when Create Task modal is opened
  React.useEffect(() => {
    if (!isCreateModalOpen) return;
    const s = createForm.state || userTerritory.state;
    const d = createForm.district || userTerritory.district;
    if (s && d) {
      getActiveDivisions(s, d).then(list => setDivisionsList(list)).catch(() => {});
    } else {
      setDivisionsList([]);
    }
  }, [isCreateModalOpen, createForm.state, createForm.district, userTerritory.state, userTerritory.district]);

  // Cascading Pincodes — only when Create Task modal is opened
  React.useEffect(() => {
    if (!isCreateModalOpen) return;
    const s = createForm.state || userTerritory.state;
    const d = createForm.district || userTerritory.district;
    const v = createForm.division || userTerritory.division;
    if (s && d && v) {
      getActivePincodes(s, d, v).then(list => setPincodesList(list.map((p: any) => typeof p === 'string' ? p : p.code || p.pincode || ''))).catch(() => {});
    } else {
      setPincodesList([]);
    }
  }, [isCreateModalOpen, createForm.state, createForm.district, createForm.division, userTerritory.state, userTerritory.district, userTerritory.division]);

  // Query eligible agents for Admin direct assignment or request approval
  const targetLevelForAgents = isAdmin ? userLevel : (nextLowerLevel || 'district');
  const targetStateForAgents = createForm.state || userTerritory.state;
  const targetDistrictForAgents = createForm.district || userTerritory.district;
  const targetDivisionForAgents = createForm.division || userTerritory.division;
  const targetPincodeForAgents = createForm.pincode || userTerritory.pincode;

  const { data: eligibleAgentsData } = useQuery({
    queryKey: ['eligibleAgents', targetLevelForAgents, targetStateForAgents, targetDistrictForAgents, targetDivisionForAgents, targetPincodeForAgents],
    queryFn: async () => {
      const p = new URLSearchParams();
      p.append('level', targetLevelForAgents);
      if (targetStateForAgents) p.append('state', targetStateForAgents);
      if (targetDistrictForAgents) p.append('district', targetDistrictForAgents);
      if (targetDivisionForAgents) p.append('division', targetDivisionForAgents);
      if (targetPincodeForAgents) p.append('pincode', targetPincodeForAgents);

      const res = await api.get(`/tasks/eligible-agents?${p.toString()}`);
      return res.data?.agents || [];
    },
    enabled: isCreateModalOpen || isAssignModalOpen
  });

  const eligibleAgents = eligibleAgentsData || [];

  const invalidateAllTaskRelatedQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['hierarchicalTasks'] });
    queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    queryClient.invalidateQueries({ queryKey: ['pincodeDashboardStats'] });
    queryClient.invalidateQueries({ queryKey: ['divisionSubordinates'] });
    queryClient.invalidateQueries({ queryKey: ['targetAssignmentsMine'] });
    queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
  };

  // MUTATIONS
  const createTaskMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/tasks', payload);
      return res.data;
    },
    onSuccess: (data) => {
      setActionSuccess(data.message || 'Task request submitted successfully!');
      setIsCreateModalOpen(false);
      setActionError('');
      setCreateForm({
        title: '',
        description: '',
        priority: 'Medium',
        dueDate: '',
        state: userTerritory.state,
        district: userTerritory.district,
        division: userTerritory.division,
        pincode: '',
        assignedAgentId: '',
        category: 'Field Operations & Verification',
        vendor: '',
        location: ''
      });
      if (!isAdmin) {
        setActiveTab('requests');
      }
      invalidateAllTaskRelatedQueries();
      refetch();
      setTimeout(() => setActionSuccess(''), 4000);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || 'Failed to submit task request';
      setActionError(msg);
      setTimeout(() => setActionError(''), 6000);
    }
  });

  const approveRequestMutation = useMutation({
    mutationFn: async ({ taskId, assignedAgentId }: { taskId: string; assignedAgentId: string }) => {
      const res = await api.post(`/tasks/${taskId}/approve-request`, { assignedAgentId });
      return res.data;
    },
    onSuccess: (data) => {
      setActionSuccess(data.message || 'Request approved and task assigned!');
      setIsAssignModalOpen(false);
      invalidateAllTaskRelatedQueries();
      setTimeout(() => setActionSuccess(''), 4000);
    },
    onError: (err: any) => {
      setActionError(err.response?.data?.message || err.message || 'Approval failed');
      setTimeout(() => setActionError(''), 5000);
    }
  });

  const rejectRequestMutation = useMutation({
    mutationFn: async ({ taskId, reason }: { taskId: string; reason: string }) => {
      const res = await api.post(`/tasks/${taskId}/reject-request`, { rejectionReason: reason });
      return res.data;
    },
    onSuccess: (data) => {
      setActionSuccess(data.message || 'Request rejected.');
      setIsRejectRequestModalOpen(false);
      setActionReason('');
      invalidateAllTaskRelatedQueries();
      setTimeout(() => setActionSuccess(''), 4000);
    },
    onError: (err: any) => {
      setActionError(err.response?.data?.message || err.message || 'Rejection failed');
      setTimeout(() => setActionError(''), 5000);
    }
  });

  const acceptTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const res = await api.post(`/tasks/${taskId}/accept`);
      return res.data;
    },
    onSuccess: (data) => {
      setActionSuccess(data.message || 'Task accepted! Moved to In Progress.');
      invalidateAllTaskRelatedQueries();
      setTimeout(() => setActionSuccess(''), 4000);
    },
    onError: (err: any) => {
      setActionError(err.response?.data?.message || err.message || 'Failed to accept task');
      setTimeout(() => setActionError(''), 5000);
    }
  });

  const rejectTaskMutation = useMutation({
    mutationFn: async ({ taskId, reason }: { taskId: string; reason: string }) => {
      const res = await api.post(`/tasks/${taskId}/reject-task`, { rejectionReason: reason });
      return res.data;
    },
    onSuccess: (data) => {
      setActionSuccess(data.message || 'Task rejected and closed.');
      setIsRejectTaskModalOpen(false);
      setActionReason('');
      invalidateAllTaskRelatedQueries();
      setTimeout(() => setActionSuccess(''), 4000);
    },
    onError: (err: any) => {
      setActionError(err.response?.data?.message || err.message || 'Failed to reject task');
      setTimeout(() => setActionError(''), 5000);
    }
  });

  const submitEvidenceMutation = useMutation({
    mutationFn: async ({ taskId, remarks, photos, voiceNote }: { taskId: string; remarks: string; photos: string[]; voiceNote: string }) => {
      const res = await api.post(`/tasks/${taskId}/submit-evidence`, { remarks, photos, voiceNote });
      return res.data;
    },
    onSuccess: (data) => {
      setActionSuccess(data.message || 'Completion evidence submitted for review!');
      setIsEvidenceModalOpen(false);
      setEvidenceRemarks('');
      setEvidencePhotos([]);
      setEvidenceVoiceNote('');
      invalidateAllTaskRelatedQueries();
      setTimeout(() => setActionSuccess(''), 4000);
    },
    onError: (err: any) => {
      setActionError(err.response?.data?.message || err.message || 'Failed to submit evidence');
      setTimeout(() => setActionError(''), 5000);
    }
  });

  const reviewEvidenceMutation = useMutation({
    mutationFn: async ({ taskId, decision, notes }: { taskId: string; decision: 'approve' | 'rework'; notes: string }) => {
      const res = await api.post(`/tasks/${taskId}/review-evidence`, { decision, notes });
      return res.data;
    },
    onSuccess: (data) => {
      setActionSuccess(data.message || 'Submission reviewed successfully.');
      setIsReviewEvidenceModalOpen(false);
      setActionNotes('');
      invalidateAllTaskRelatedQueries();
      setTimeout(() => setActionSuccess(''), 4000);
    },
    onError: (err: any) => {
      setActionError(err.response?.data?.message || err.message || 'Review action failed');
      setTimeout(() => setActionError(''), 5000);
    }
  });

  // Handle Photo Upload (Convert file to base64 preview)
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      if (file.size > 8 * 1024 * 1024) {
        setActionError('Photo file size exceeds 8MB limit.');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setEvidencePhotos(prev => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // Handle Voice Note Upload
  const handleVoiceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      setActionError('Voice note size exceeds 15MB limit.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setEvidenceVoiceNote(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle Create Form Submit
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActionError('');

    if (createTaskMutation.isPending) return;

    const trimmedTitle = createForm.title.trim();
    if (!trimmedTitle || trimmedTitle.length < 3) {
      setActionError('Task title must be at least 3 characters.');
      return;
    }
    const trimmedDesc = createForm.description.trim();
    if (!trimmedDesc || trimmedDesc.length < 5) {
      setActionError('Task description must be at least 5 characters.');
      return;
    }
    if (!createForm.dueDate) {
      setActionError('Please specify a task deadline date and time.');
      return;
    }
    const dueTime = new Date(createForm.dueDate).getTime();
    if (isNaN(dueTime) || dueTime <= Date.now()) {
      setActionError('Deadline must be in the future. Past dates or times are not permitted.');
      return;
    }

    const targetState = (createForm.state || userTerritory.state || '').trim();
    const targetDistrict = (createForm.district || userTerritory.district || '').trim();
    const targetDivision = (createForm.division || userTerritory.division || '').trim();
    const targetPincode = (createForm.pincode || (userLevel === 'pincode' ? userTerritory.pincode : '') || '').trim();

    if (!targetState) {
      setActionError('Please select a target State.');
      return;
    }

    if (!isAdmin) {
      if (!nextLowerLevel) {
        setActionError('Pincode Agents cannot initiate task requests as no lower hierarchy level exists.');
        return;
      }
      if (nextLowerLevel === 'pincode' && !targetPincode) {
        setActionError('Please select a target PIN code within your division.');
        return;
      }
    }

    const payload: any = {
      title: trimmedTitle,
      description: trimmedDesc,
      priority: createForm.priority,
      dueDate: new Date(createForm.dueDate).toISOString(),
      state: targetState,
      district: targetDistrict,
      division: targetDivision,
      pincode: targetPincode,
      category: createForm.category || 'Field Operations & Verification',
      vendor: createForm.vendor || '',
      location: createForm.location || [targetPincode, targetDivision, targetDistrict, targetState].filter(Boolean).join(', ')
    };

    if (isAdmin) {
      payload.targetLevel = userLevel;
      if (!createForm.assignedAgentId) {
        setActionError('Please select an eligible agent to directly assign this task.');
        return;
      }
      payload.assignedAgentId = createForm.assignedAgentId;
    } else {
      payload.targetLevel = nextLowerLevel;
    }

    createTaskMutation.mutate(payload);
  };

  // Helper: Status Badge Styling
  const renderStatusBadge = (status: string, isOverdue?: boolean) => {
    if (isOverdue) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-rose-50 text-rose-700 border border-rose-200">
          <Clock className="w-3.5 h-3.5 text-rose-600 animate-pulse" /> Overdue ({status})
        </span>
      );
    }

    switch (status) {
      case 'Pending Admin Review':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-amber-50 text-amber-800 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-600" /> Pending Admin Review
          </span>
        );
      case 'Assigned':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-blue-50 text-blue-700 border border-blue-200">
            <UserCheck className="w-3.5 h-3.5 text-blue-600" /> Assigned
          </span>
        );
      case 'In Progress':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200">
            <RefreshCw className="w-3.5 h-3.5 text-indigo-600 animate-spin" /> In Progress
          </span>
        );
      case 'Submitted for Review':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-purple-50 text-purple-700 border border-purple-200">
            <Send className="w-3.5 h-3.5 text-purple-600" /> Submitted for Review
          </span>
        );
      case 'Rework':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-orange-50 text-orange-800 border border-orange-200">
            <RotateCcw className="w-3.5 h-3.5 text-orange-600 animate-spin" /> Rework Required
          </span>
        );
      case 'Approved':
      case 'Completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Approved
          </span>
        );
      case 'Rejected':
      case 'Closed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3.5 h-3.5 text-rose-600" /> Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  const renderPriorityBadge = (priority: string) => {
    const p = (priority || 'medium').toLowerCase();
    if (p === 'high') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-red-100 text-red-800 border border-red-200">
          <AlertTriangle className="w-3 h-3 text-red-600" /> High (Mandatory)
        </span>
      );
    }
    if (p === 'medium') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
          Medium
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
        Low
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Toast Alert Banners */}
      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span className="text-xs font-bold">{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess('')} className="text-emerald-700 hover:text-emerald-900 font-bold text-xs">✕</button>
        </div>
      )}

      {actionError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600" />
            <span className="text-xs font-bold">{actionError}</span>
          </div>
          <button onClick={() => setActionError('')} className="text-rose-700 hover:text-rose-900 font-bold text-xs">✕</button>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[#1b1c1c] via-[#2c2b2b] to-[#864f19] p-6 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 transform skew-x-12 pointer-events-none" />
        <div className="space-y-1.5 z-10">
          <div className="flex items-center gap-2.5">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/10 text-white/90 border border-white/20">
              {userLevel.toUpperCase()} LEVEL • {isAdmin ? 'ADMINISTRATOR' : 'FIELD AGENT'}
            </span>
            <span className="text-xs text-amber-300 font-bold">
              {userTerritory.state} {userTerritory.district ? `› ${userTerritory.district}` : ''} {userTerritory.division ? `› ${userTerritory.division}` : ''}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <CheckSquare className="w-8 h-8 text-amber-400" />
            Hierarchical Task Assignment & Approvals
          </h1>
          <p className="text-xs sm:text-sm text-white/75 font-medium max-w-2xl leading-relaxed">
            {isAdmin
              ? `Manage and delegate tasks directly to ${userLevel.toUpperCase()} agents in your authorized territory, and review task requests initiated by higher-level field agents.`
              : `Execute assigned tasks with completion evidence, or submit task requests for next-level (${nextLowerLevel?.toUpperCase() || 'N/A'}) agents routed to the responsible Admin.`}
          </p>
        </div>

        <div className="flex items-center gap-3 z-10 self-start md:self-center">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl text-white transition border border-white/15 cursor-pointer"
            title="Refresh tasks list"
          >
            <RefreshCw className={`w-5 h-5 ${isFetching ? 'animate-spin' : ''}`} />
          </button>

          {/* Action Button: Create Task or Submit Request */}
          {userLevel !== 'pincode' || isAdmin ? (
            <button
              onClick={() => {
                setActionError('');
                setIsCreateModalOpen(true);
              }}
              className="py-3 px-5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-lg transition flex items-center gap-2 cursor-pointer border-none"
            >
              <Plus className="w-4 h-4" />
              {isAdmin ? 'Create & Assign Task' : 'Submit Task Request'}
            </button>
          ) : null}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('my_tasks')}
          className={`py-3 px-5 text-xs sm:text-sm font-extrabold rounded-t-xl transition cursor-pointer border-b-2 flex items-center gap-2 ${
            activeTab === 'my_tasks'
              ? 'border-[#864f19] text-[#864f19] bg-white shadow-sm'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          My Assigned Tasks
        </button>

        <button
          onClick={() => setActiveTab('created')}
          className={`py-3 px-5 text-xs sm:text-sm font-extrabold rounded-t-xl transition cursor-pointer border-b-2 flex items-center gap-2 ${
            activeTab === 'created'
              ? 'border-[#864f19] text-[#864f19] bg-white shadow-sm'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          Created / Initiated Tasks
        </button>

        <button
          onClick={() => setActiveTab('requests')}
          className={`py-3 px-5 text-xs sm:text-sm font-extrabold rounded-t-xl transition cursor-pointer border-b-2 flex items-center gap-2 ${
            activeTab === 'requests'
              ? 'border-[#864f19] text-[#864f19] bg-white shadow-sm'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Send className="w-4 h-4" />
          {isAdmin ? 'Incoming Requests (Approvals)' : 'My Outgoing Requests'}
        </button>

        <button
          onClick={() => setActiveTab('territory')}
          className={`py-3 px-5 text-xs sm:text-sm font-extrabold rounded-t-xl transition cursor-pointer border-b-2 flex items-center gap-2 ${
            activeTab === 'territory'
              ? 'border-[#864f19] text-[#864f19] bg-white shadow-sm'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building className="w-4 h-4" />
          Territory Task Monitoring
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by title, TSK number, agent..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#864f19]/30 focus:border-[#864f19]"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#864f19]/30"
            >
              <option value="all">All Statuses</option>
              <option value="Pending Admin Review">Pending Admin Review</option>
              <option value="Assigned">Assigned</option>
              <option value="In Progress">In Progress</option>
              <option value="Submitted for Review">Submitted for Review</option>
              <option value="Rework">Rework</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="overdue">Overdue Only</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#864f19]/30"
            >
              <option value="all">All Priorities</option>
              <option value="High">High (Mandatory)</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Task Cards Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] space-y-3 bg-white rounded-3xl border border-slate-200 p-12">
          <RefreshCw className="w-8 h-8 text-[#864f19] animate-spin" />
          <span className="text-xs font-bold text-slate-500">Loading hierarchical task queue...</span>
        </div>
      ) : tasks.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
            <CheckSquare className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-black text-slate-800">No Tasks Found</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              There are currently no tasks matching your selected filters or queue.
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="py-2.5 px-4 bg-[#864f19] hover:bg-[#a3672f] text-white text-xs font-extrabold rounded-xl transition cursor-pointer border-none"
            >
              Create New Task
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {tasks.map((task) => {
            const isAssignedToMe = task.permissions?.isAssignedAgent;
            const canApprove = task.permissions?.canApproveRequest;
            const canExecute = task.permissions?.canExecute;
            const canReviewEvidence = task.permissions?.canReviewEvidence;

            return (
              <div
                key={task._id}
                className={`bg-white rounded-2xl border transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-sm hover:shadow-md ${
                  task.isOverdue
                    ? 'border-rose-300 ring-1 ring-rose-300/50'
                    : 'border-slate-200/80 hover:border-slate-300'
                }`}
              >
                {/* Top Bar with Task Number and Badges */}
                <div className="p-5 pb-3 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[11px] font-black text-slate-400 tracking-wider">
                      {task.taskNumber}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {renderPriorityBadge(task.priority)}
                      {renderStatusBadge(task.status, task.isOverdue)}
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div className="space-y-1">
                    <h3 className="text-sm font-black text-slate-900 leading-snug line-clamp-2">
                      {task.title}
                    </h3>
                    <p className="text-xs text-slate-600 font-medium line-clamp-3 leading-relaxed">
                      {task.description}
                    </p>
                  </div>

                  {/* Territory & Hierarchy Tag */}
                  <div className="pt-2 flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500 font-bold">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 uppercase">
                      {task.hierarchyLevel} Level
                    </span>
                    <span className="flex items-center gap-1 text-slate-600">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {[task.state, task.district, task.division].filter(Boolean).join(' › ')} {task.pincode ? `(${task.pincode})` : ''}
                    </span>
                  </div>

                  {/* Due Date & Overdue Indicator */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Deadline:
                    </span>
                    <span className={`text-xs font-black ${task.isOverdue ? 'text-rose-600' : 'text-slate-700'}`}>
                      {new Date(task.dueDate).toLocaleDateString()} {new Date(task.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Assigned Agent / Requester Info */}
                  <div className="bg-slate-50 p-2.5 rounded-xl space-y-1 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-bold">Assigned Agent:</span>
                      <span className="font-extrabold text-slate-800">
                        {task.assignedAgentName ? (
                          task.assignedAgentName
                        ) : task.status === 'Pending Admin Review' ? (
                          <em className="text-amber-600 font-semibold">Awaiting Admin Review (Unassigned)</em>
                        ) : task.status === 'Rejected' ? (
                          <em className="text-rose-600 font-semibold">Rejected (Unassigned)</em>
                        ) : (
                          <em className="text-slate-500 font-semibold">Unassigned</em>
                        )}
                      </span>
                    </div>
                    {task.createdByName && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-bold">Requested By:</span>
                        <span className="font-bold text-slate-700">
                          {task.createdByName} ({task.createdByRole})
                        </span>
                      </div>
                    )}
                    {task.receivingAdminName && task.status === 'Pending Admin Review' && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-bold">Receiving Admin:</span>
                        <span className="font-bold text-amber-700">{task.receivingAdminName}</span>
                      </div>
                    )}
                  </div>

                  {/* Rejection / Rework Notes Preview */}
                  {task.status === 'Rework' && task.reworkDetails?.reason && (
                    <div className="p-2.5 rounded-xl bg-orange-50 border border-orange-200 text-orange-900 text-xs space-y-1">
                      <span className="font-black flex items-center gap-1 text-[11px] text-orange-800">
                        <RotateCcw className="w-3 h-3" /> Admin Rework Feedback:
                      </span>
                      <p className="text-[11px] font-semibold">{task.reworkDetails.reason}</p>
                    </div>
                  )}

                  {task.status === 'Rejected' && task.rejectionReason && (
                    <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs space-y-1">
                      <span className="font-black flex items-center gap-1 text-[11px] text-rose-800">
                        <XCircle className="w-3 h-3" /> Rejection Reason:
                      </span>
                      <p className="text-[11px] font-semibold">{task.rejectionReason}</p>
                    </div>
                  )}
                </div>

                {/* Bottom Action Footer */}
                <div className="p-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => {
                      setSelectedTask(task);
                      setIsDetailModalOpen(true);
                    }}
                    className="py-2 px-3 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-500" /> Details
                  </button>

                  <div className="flex items-center gap-2">
                    {/* Admin: Approve & Assign or Reject Request */}
                    {canApprove && (
                      <>
                        <button
                          onClick={() => {
                            setSelectedTask(task);
                            setSelectedEligibleAgentId('');
                            setIsAssignModalOpen(true);
                          }}
                          className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl transition flex items-center gap-1 cursor-pointer border-none shadow-sm"
                        >
                          <UserCheck className="w-3.5 h-3.5" /> Approve & Assign
                        </button>
                        <button
                          onClick={() => {
                            setSelectedTask(task);
                            setActionReason('');
                            setIsRejectRequestModalOpen(true);
                          }}
                          className="py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold rounded-xl transition flex items-center gap-1 cursor-pointer border-none shadow-sm"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Reject
                        </button>
                      </>
                    )}

                    {/* Assigned Agent: Start / Accept Task */}
                    {isAssignedToMe && task.status === 'Assigned' && (
                      <>
                        <button
                          onClick={() => acceptTaskMutation.mutate(task._id)}
                          className="py-2 px-3.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold rounded-xl transition flex items-center gap-1 cursor-pointer border-none shadow-sm"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Start Task
                        </button>

                        {/* If Medium or Low priority, allow rejection */}
                        {!task.permissions?.isHighPriority && (
                          <button
                            onClick={() => {
                              setSelectedTask(task);
                              setActionReason('');
                              setIsRejectTaskModalOpen(true);
                            }}
                            className="py-2 px-3 bg-slate-200 hover:bg-rose-100 hover:text-rose-700 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer border-none"
                          >
                            Reject
                          </button>
                        )}
                      </>
                    )}

                    {/* Assigned Agent: Submit Completion Evidence */}
                    {isAssignedToMe && ['In Progress', 'Rework'].includes(task.status) && (
                      <button
                        onClick={() => {
                          setSelectedTask(task);
                          setEvidenceRemarks('');
                          setEvidencePhotos([]);
                          setEvidenceVoiceNote('');
                          setIsEvidenceModalOpen(true);
                        }}
                        className="py-2 px-3.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-extrabold rounded-xl transition flex items-center gap-1 cursor-pointer border-none shadow-sm"
                      >
                        <Upload className="w-3.5 h-3.5" /> Submit Evidence
                      </button>
                    )}

                    {/* Admin: Review Evidence */}
                    {canReviewEvidence && (
                      <button
                        onClick={() => {
                          setSelectedTask(task);
                          setActionNotes('');
                          setIsReviewEvidenceModalOpen(true);
                        }}
                        className="py-2 px-3.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold rounded-xl transition flex items-center gap-1 cursor-pointer border-none shadow-sm"
                      >
                        <FileText className="w-3.5 h-3.5" /> Review Evidence
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: CREATE TASK / SUBMIT TASK REQUEST */}
      {isCreateModalOpen && (
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title={isAdmin ? `Create & Directly Assign ${userLevel.toUpperCase()} Task` : `Submit ${nextLowerLevel?.toUpperCase()} Task Request`}
          size="lg"
        >
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            {/* Banner explaining workflow */}
            <div className={`p-4 rounded-2xl text-xs font-medium space-y-1 ${isAdmin ? 'bg-blue-50 text-blue-900 border border-blue-200' : 'bg-amber-50 text-amber-900 border border-amber-200'}`}>
              <span className="font-extrabold block">
                {isAdmin ? 'Type A: Admin Direct Task Assignment' : 'Type B: Agent-Initiated Task Request Workflow'}
              </span>
              <p className="leading-relaxed">
                {isAdmin
                  ? `As an authorized ${userLevel.toUpperCase()} Admin, you are directly assigning this task to an active ${userLevel.toUpperCase()} agent in your territory (${userTerritory.state}).`
                  : `As a ${userLevel.toUpperCase()} Agent, your request will be routed to the responsible ${nextLowerLevel?.toUpperCase()} Admin for approval. The Admin will assign the task to an eligible agent in that territory.`}
              </p>
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Task Title *</label>
              <input
                type="text"
                required
                value={createForm.title}
                onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                placeholder="e.g., Deliver Acrylic QR Standees & Merchant Onboarding"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#864f19]/30"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Task Description *</label>
              <textarea
                required
                rows={3}
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                placeholder="Detailed instructions for field execution, evidence requirements, and deliverables..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#864f19]/30"
              />
            </div>

            {/* Priority & Deadline Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Priority *</label>
                <select
                  value={createForm.priority}
                  onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value as any })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#864f19]/30"
                >
                  <option value="High">High (Mandatory - Assigned Agent Cannot Reject)</option>
                  <option value="Medium">Medium (Agent May Accept or Reject with Reason)</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Deadline Date & Time *</label>
                <input
                  type="datetime-local"
                  required
                  min={getMinDateTimeString()}
                  value={createForm.dueDate}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val) {
                      const selectedTime = new Date(val).getTime();
                      if (isNaN(selectedTime) || selectedTime <= Date.now()) {
                        setActionError('Deadline must be in the future. Past dates or times cannot be selected.');
                      } else {
                        setActionError('');
                      }
                    }
                    setCreateForm({ ...createForm, dueDate: val });
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#864f19]/30"
                />
              </div>
            </div>

            {/* Territory Cascading Pickers */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
              <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider block">
                Target Territory Scope ({isAdmin ? `${userLevel.toUpperCase()} Territory` : `Target ${nextLowerLevel?.toUpperCase()} Territory`})
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* State */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">State</label>
                  <select
                    disabled={Boolean(userTerritory.state)}
                    value={createForm.state}
                    onChange={(e) => setCreateForm({ ...createForm, state: e.target.value, district: '', division: '', pincode: '' })}
                    className="w-full py-2 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 disabled:opacity-75"
                  >
                    <option value="">Select State</option>
                    {statesList.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                {/* District */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">District</label>
                  <select
                    disabled={userLevel === 'district' || userLevel === 'division' || userLevel === 'pincode'}
                    value={createForm.district}
                    onChange={(e) => setCreateForm({ ...createForm, district: e.target.value, division: '', pincode: '' })}
                    className="w-full py-2 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 disabled:opacity-75"
                  >
                    <option value="">Select District</option>
                    {districtsList.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                {/* Division */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Division</label>
                  <select
                    disabled={userLevel === 'division' || userLevel === 'pincode'}
                    value={createForm.division}
                    onChange={(e) => setCreateForm({ ...createForm, division: e.target.value, pincode: '' })}
                    className="w-full py-2 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 disabled:opacity-75"
                  >
                    <option value="">Select Division</option>
                    {divisionsList.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>

                {/* Pincode */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">PIN Code</label>
                  <select
                    disabled={userLevel === 'pincode'}
                    value={createForm.pincode}
                    onChange={(e) => setCreateForm({ ...createForm, pincode: e.target.value })}
                    className="w-full py-2 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 disabled:opacity-75"
                  >
                    <option value="">Select PIN</option>
                    {pincodesList.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* If Admin: Direct Agent Assignment Selector */}
            {isAdmin && (
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">Assign to Active Agent *</label>
                <select
                  required
                  value={createForm.assignedAgentId}
                  onChange={(e) => setCreateForm({ ...createForm, assignedAgentId: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#864f19]/30"
                >
                  <option value="">-- Choose Eligible Active Agent --</option>
                  {eligibleAgents.map((ag: any) => (
                    <option key={ag._id} value={ag._id}>
                      {ag.name} ({ag.role?.toUpperCase()} • {ag.territory?.district || ag.territory?.state}) — {ag.email}
                    </option>
                  ))}
                </select>
                {eligibleAgents.length === 0 && (
                  <p className="text-[11px] text-amber-600 font-semibold">
                    No active approved agents found in this exact territory. Please verify agent registrations.
                  </p>
                )}
              </div>
            )}

            {/* Inline Modal Error Banner */}
            {actionError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold flex items-center gap-2 animate-fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer border-none"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createTaskMutation.isPending}
                className="py-2.5 px-5 bg-[#864f19] hover:bg-[#a3672f] text-white font-extrabold text-xs rounded-xl transition cursor-pointer border-none flex items-center gap-2 shadow-sm disabled:opacity-60"
              >
                {createTaskMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {isAdmin ? 'Create & Assign Task' : 'Submit Task Request'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 2: ADMIN APPROVE & ASSIGN REQUEST */}
      {isAssignModalOpen && selectedTask && (
        <Modal
          isOpen={isAssignModalOpen}
          onClose={() => setIsAssignModalOpen(false)}
          title="Approve Request & Assign Eligible Agent"
        >
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-xl space-y-1 text-xs">
              <span className="font-bold text-slate-400 block text-[10px] uppercase">Task Request Details:</span>
              <p className="font-black text-slate-800 text-sm">{selectedTask.title}</p>
              <p className="text-slate-600 font-medium">{selectedTask.description}</p>
              <div className="pt-2 flex flex-wrap gap-2 text-[11px]">
                <span className="font-bold text-slate-500">Requested by: {selectedTask.createdByName}</span>
                <span>•</span>
                <span className="font-bold text-slate-500">Territory: {selectedTask.district || selectedTask.state}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Select Active {selectedTask.hierarchyLevel.toUpperCase()} Agent in Authorized Territory *
              </label>
              <select
                value={selectedEligibleAgentId}
                onChange={(e) => setSelectedEligibleAgentId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#864f19]/30"
              >
                <option value="">-- Choose Eligible Agent --</option>
                {eligibleAgents.map((ag: any) => (
                  <option key={ag._id} value={ag._id}>
                    {ag.name} ({ag.role?.toUpperCase()}) — {ag.email}
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer border-none"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedEligibleAgentId || approveRequestMutation.isPending}
                onClick={() => {
                  if (selectedEligibleAgentId) {
                    approveRequestMutation.mutate({ taskId: selectedTask._id, assignedAgentId: selectedEligibleAgentId });
                  }
                }}
                className="py-2.5 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl transition cursor-pointer border-none flex items-center gap-2 shadow-sm disabled:opacity-50"
              >
                {approveRequestMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                Approve & Assign Task
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 3: ADMIN REJECT REQUEST */}
      {isRejectRequestModalOpen && selectedTask && (
        <Modal
          isOpen={isRejectRequestModalOpen}
          onClose={() => setIsRejectRequestModalOpen(false)}
          title="Reject Task Request"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600 font-medium">
              Please specify the reason for rejecting this task request. The initiating agent will be able to view this reason in their task history.
            </p>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Mandatory Rejection Reason *</label>
              <textarea
                required
                rows={3}
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="e.g., Target territory merchant quota is already satisfied for this month..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/30"
              />
            </div>
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsRejectRequestModalOpen(false)}
                className="py-2 px-4 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl cursor-pointer border-none"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!actionReason.trim() || actionReason.length < 3 || rejectRequestMutation.isPending}
                onClick={() => rejectRequestMutation.mutate({ taskId: selectedTask._id, reason: actionReason.trim() })}
                className="py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl transition cursor-pointer border-none disabled:opacity-50"
              >
                {rejectRequestMutation.isPending ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 4: AGENT REJECT TASK ASSIGNMENT */}
      {isRejectTaskModalOpen && selectedTask && (
        <Modal
          isOpen={isRejectTaskModalOpen}
          onClose={() => setIsRejectTaskModalOpen(false)}
          title="Reject Task Assignment"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600 font-medium">
              As a Medium/Low priority task, you may reject this assignment by specifying a mandatory reason. Rejection will close this task.
            </p>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Mandatory Rejection Reason *</label>
              <textarea
                required
                rows={3}
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="e.g., Unable to reach location due to extreme weather / overlap with field audit..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/30"
              />
            </div>
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsRejectTaskModalOpen(false)}
                className="py-2 px-4 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl cursor-pointer border-none"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!actionReason.trim() || actionReason.length < 3 || rejectTaskMutation.isPending}
                onClick={() => rejectTaskMutation.mutate({ taskId: selectedTask._id, reason: actionReason.trim() })}
                className="py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl transition cursor-pointer border-none disabled:opacity-50"
              >
                {rejectTaskMutation.isPending ? 'Rejecting...' : 'Reject Task'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 5: SUBMIT COMPLETION EVIDENCE */}
      {isEvidenceModalOpen && selectedTask && (
        <Modal
          isOpen={isEvidenceModalOpen}
          onClose={() => setIsEvidenceModalOpen(false)}
          title="Submit Completion Evidence & Remarks"
          size="lg"
        >
          <div className="space-y-4">
            {/* If task is Rework, show prior review notes */}
            {selectedTask.status === 'Rework' && selectedTask.reworkDetails?.reason && (
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl text-xs space-y-1">
                <span className="font-black text-orange-900 flex items-center gap-1.5">
                  <RotateCcw className="w-4 h-4 text-orange-600" />
                  Rework Requested by Admin ({selectedTask.reworkDetails.requestedBy}):
                </span>
                <p className="text-orange-800 font-semibold">{selectedTask.reworkDetails.reason}</p>
                <span className="text-[10px] text-orange-700 font-bold block pt-1">
                  Previous submissions retained: {selectedTask.reworkDetails.previousSubmissions?.length || 0}
                </span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Completion Remarks & Verification Summary *</label>
              <textarea
                required
                rows={4}
                value={evidenceRemarks}
                onChange={(e) => setEvidenceRemarks(e.target.value)}
                placeholder="Describe work completed, merchant verification results, acrylic standee installation details, etc."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#864f19]/30"
              />
            </div>

            {/* Photo Evidence Upload */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">Photo Proof & Merchant Standee Images</label>
              <div className="flex items-center gap-3">
                <label className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer border border-slate-200 transition flex items-center gap-2">
                  <Camera className="w-4 h-4 text-slate-600" />
                  Upload Photo
                  <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" />
                </label>
                <span className="text-[11px] text-slate-400 font-semibold">
                  {evidencePhotos.length} photo(s) selected
                </span>
              </div>

              {/* Photo Previews */}
              {evidencePhotos.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {evidencePhotos.map((photo, i) => (
                    <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 group">
                      <img src={photo} alt={`Evidence ${i + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setEvidencePhotos(evidencePhotos.filter((_, idx) => idx !== i))}
                        className="absolute top-1 right-1 bg-black/60 hover:bg-rose-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Voice Note Upload */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">Audio / Voice Note Recording</label>
              <div className="flex items-center gap-3">
                <label className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer border border-slate-200 transition flex items-center gap-2">
                  <Mic className="w-4 h-4 text-slate-600" />
                  Upload Audio Note
                  <input type="file" accept="audio/*" onChange={handleVoiceUpload} className="hidden" />
                </label>
                {evidenceVoiceNote ? (
                  <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Audio Note Attached
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-400 font-semibold">Optional</span>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsEvidenceModalOpen(false)}
                className="py-2.5 px-4 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl cursor-pointer border-none"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!evidenceRemarks.trim() || evidenceRemarks.length < 3 || submitEvidenceMutation.isPending}
                onClick={() => submitEvidenceMutation.mutate({
                  taskId: selectedTask._id,
                  remarks: evidenceRemarks.trim(),
                  photos: evidencePhotos,
                  voiceNote: evidenceVoiceNote
                })}
                className="py-2.5 px-5 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs rounded-xl transition cursor-pointer border-none flex items-center gap-2 disabled:opacity-50"
              >
                {submitEvidenceMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Submit Evidence for Review
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 6: ADMIN REVIEW COMPLETION EVIDENCE */}
      {isReviewEvidenceModalOpen && selectedTask && (
        <Modal
          isOpen={isReviewEvidenceModalOpen}
          onClose={() => setIsReviewEvidenceModalOpen(false)}
          title="Review Evidence & Submission"
          size="lg"
        >
          <div className="space-y-4">
            {/* Submission preview */}
            <div className="p-4 bg-slate-50 rounded-2xl space-y-3 border border-slate-200/80">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-800">
                  Submission from {selectedTask.assignedAgentName}
                </span>
                <span className="text-[10px] text-slate-400 font-bold">
                  Submitted at: {selectedTask.completionDetails?.submittedAt ? new Date(selectedTask.completionDetails.submittedAt).toLocaleString() : 'N/A'}
                </span>
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase block mb-0.5">Remarks:</span>
                <p className="text-xs text-slate-700 font-semibold bg-white p-3 rounded-xl border border-slate-200">
                  {selectedTask.completionDetails?.remarks || selectedTask.completionDetails?.workCompleted || 'No remarks provided.'}
                </p>
              </div>

              {/* Photos */}
              {selectedTask.completionDetails?.photos && selectedTask.completionDetails.photos.length > 0 && (
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Proof Photos:</span>
                  <div className="flex flex-wrap gap-2">
                    {selectedTask.completionDetails.photos.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                        <img src={url} alt={`Proof ${i + 1}`} className="w-24 h-24 object-cover rounded-xl border border-slate-300 hover:opacity-90" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Audio Note */}
              {selectedTask.completionDetails?.voiceNote && (
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Voice Note:</span>
                  <audio controls src={selectedTask.completionDetails.voiceNote} className="w-full h-8" />
                </div>
              )}
            </div>

            {/* Previous rework iterations */}
            {selectedTask.reworkDetails?.previousSubmissions && selectedTask.reworkDetails.previousSubmissions.length > 0 && (
              <details className="text-xs font-semibold text-slate-700 bg-orange-50/50 p-3 rounded-xl border border-orange-200">
                <summary className="cursor-pointer font-bold text-orange-900">
                  View {selectedTask.reworkDetails.previousSubmissions.length} Prior Submission(s) & Rework Cycles
                </summary>
                <div className="pt-2 space-y-2">
                  {selectedTask.reworkDetails.previousSubmissions.map((sub, idx) => (
                    <div key={idx} className="p-2 bg-white rounded-lg border border-orange-100 text-[11px] space-y-0.5">
                      <span className="font-bold text-slate-500">Cycle {idx + 1} ({new Date(sub.submittedAt).toLocaleDateString()}):</span>
                      <p className="text-slate-800">{sub.remarks}</p>
                      {sub.reviewNotes && <p className="text-rose-700 italic">Feedback: {sub.reviewNotes}</p>}
                    </div>
                  ))}
                </div>
              </details>
            )}

            {/* Admin Decision Feedback Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Admin Review Notes / Rework Feedback
              </label>
              <textarea
                rows={3}
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                placeholder="If requesting rework, provide specific instructions. If approving, optional comments."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#864f19]/30"
              />
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsReviewEvidenceModalOpen(false)}
                className="py-2 px-4 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl cursor-pointer border-none"
              >
                Close
              </button>
              <button
                type="button"
                disabled={!actionNotes.trim() || actionNotes.length < 3 || reviewEvidenceMutation.isPending}
                onClick={() => reviewEvidenceMutation.mutate({ taskId: selectedTask._id, decision: 'rework', notes: actionNotes.trim() })}
                className="py-2.5 px-4 bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs rounded-xl transition cursor-pointer border-none flex items-center gap-1.5 disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Request Rework
              </button>
              <button
                type="button"
                disabled={reviewEvidenceMutation.isPending}
                onClick={() => reviewEvidenceMutation.mutate({ taskId: selectedTask._id, decision: 'approve', notes: actionNotes.trim() })}
                className="py-2.5 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl transition cursor-pointer border-none flex items-center gap-1.5 shadow-sm"
              >
                <CheckCircle2 className="w-4 h-4" /> Approve Submission
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 7: FULL TASK DETAILS & AUDIT HISTORY TIMELINE */}
      {isDetailModalOpen && selectedTask && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={`Task Details — ${selectedTask.taskNumber}`}
          size="lg"
        >
          <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
            <div className="flex items-center justify-between">
              <span className="text-base font-black text-slate-900">{selectedTask.title}</span>
              <div className="flex items-center gap-1.5">
                {renderPriorityBadge(selectedTask.priority)}
                {renderStatusBadge(selectedTask.status, selectedTask.isOverdue)}
              </div>
            </div>

            <p className="text-xs text-slate-700 font-medium leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
              {selectedTask.description}
            </p>

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl text-xs border border-slate-200/80">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Hierarchy Level</span>
                <span className="font-extrabold text-slate-800">{selectedTask.hierarchyLevel?.toUpperCase()}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Territory</span>
                <span className="font-extrabold text-slate-800">
                  {[selectedTask.state, selectedTask.district, selectedTask.division].filter(Boolean).join(' › ')} {selectedTask.pincode ? `(${selectedTask.pincode})` : ''}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Deadline</span>
                <span className={`font-extrabold ${selectedTask.isOverdue ? 'text-rose-600' : 'text-slate-800'}`}>
                  {new Date(selectedTask.dueDate).toLocaleDateString()}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Requester</span>
                <span className="font-extrabold text-slate-800">{selectedTask.createdByName || 'N/A'}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Receiving Admin</span>
                <span className="font-extrabold text-slate-800">{selectedTask.receivingAdminName || 'N/A'}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Assigned Agent</span>
                <span className="font-extrabold text-slate-800">
                  {selectedTask.assignedAgentName ? (
                    selectedTask.assignedAgentName
                  ) : selectedTask.status === 'Pending Admin Review' ? (
                    <em className="text-amber-600 font-semibold">Awaiting Admin Review (Unassigned)</em>
                  ) : selectedTask.status === 'Rejected' ? (
                    <em className="text-rose-600 font-semibold">Rejected (Unassigned)</em>
                  ) : (
                    'Unassigned'
                  )}
                </span>
              </div>
            </div>

            {/* Audit History Timeline */}
            <div className="pt-2">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider block mb-3 flex items-center gap-1.5">
                <History className="w-4 h-4 text-[#864f19]" /> Audit History & Lifecycle Log
              </span>
              <div className="space-y-2 border-l-2 border-slate-200 ml-2 pl-4">
                {(selectedTask.history || []).map((h, idx) => (
                  <div key={idx} className="relative text-xs space-y-0.5">
                    <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-[#864f19]" />
                    <div className="flex items-center justify-between">
                      <span className="font-black text-slate-800">{h.action}</span>
                      <span className="text-[10px] text-slate-400 font-bold">{new Date(h.timestamp).toLocaleString()}</span>
                    </div>
                    <p className="text-slate-600 font-medium">
                      By: <strong>{h.performedBy}</strong> ({h.performedRole || 'User'})
                    </p>
                    {h.details && (
                      <p className="text-[11px] text-slate-500 font-mono bg-slate-50 p-1.5 rounded">
                        {JSON.stringify(h.details)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default TaskWorkflowModule;
