import api from './client';

// ── Types ──
export interface Job {
  id: string;
  category: string;
  status: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  fare: number;
  brand: string;
  model: string;
  problemDescription: string;
}

// ── Job Endpoints ──
export const jobService = {
  getAll: (params?: Record<string, string>) =>
    api.get('/jobs', { params }),

  getById: (id: string) =>
    api.get(`/jobs/${id}`),

  accept: (id: string) =>
    api.post(`/jobs/${id}/accept`),

  reject: (id: string) =>
    api.post(`/jobs/${id}/reject`),

  updateStatus: (id: string, status: string) =>
    api.patch(`/jobs/${id}/status`, { status }),

  submitReview: (id: string, review: Record<string, string>) =>
    api.post(`/jobs/${id}/review`, review),

  uploadPhoto: (id: string, type: 'before' | 'after', file: File) => {
    const formData = new FormData();
    formData.append('photo', file);
    formData.append('type', type);
    return api.post(`/jobs/${id}/photo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  uploadSignature: (id: string, signatureData: string) =>
    api.post(`/jobs/${id}/signature`, { signature: signatureData }),
};
