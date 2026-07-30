import api from './client';

export interface AllocateTargetPayload {
  assignedTo?: string;
  divisionName?: string;
  title?: string;
  description?: string;
  type?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  targetValue: number;
  dueDate?: string;
}

export const targetService = {
  // Allocate target to division/pincode agent in one call
  allocateTarget: (payload: AllocateTargetPayload) =>
    api.post('/targets/allocate', payload),

  // Fetch list of subordinate agents for assignment dropdowns
  getSubordinates: () =>
    api.get('/targets/subordinates'),

  // Get all targets created by agent
  getTargets: (params?: { page?: number; limit?: number; type?: string }) =>
    api.get('/targets', { params }),

  // Get assignments assigned to current agent
  getMyAssignments: (params?: { page?: number; limit?: number; status?: string }) =>
    api.get('/targets/assignments/mine', { params }),

  // Assign existing target to agent
  assignTarget: (targetId: string, payload: { assignedTo: string; dueDate: string }) =>
    api.post(`/targets/${targetId}/assign`, payload),

  // Update target assignment status
  updateAssignmentStatus: (assignmentId: string, status: string) =>
    api.patch(`/targets/assignments/${assignmentId}/status`, { status }),
};

export default targetService;
