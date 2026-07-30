import api from './client';

// ── Types ──
export interface Order {
  id: string;
  type: 'food' | 'product';
  status: string;
  pickupName: string;
  dropName: string;
  customerName: string;
  customerPhone: string;
  fare: number;
  distance: string;
}

// ── Order Endpoints ──
export const orderService = {
  getAll: (params?: Record<string, string>) =>
    api.get('/orders', { params }),

  getById: (id: string) =>
    api.get(`/orders/${id}`),

  accept: (id: string) =>
    api.post(`/orders/${id}/accept`),

  reject: (id: string) =>
    api.post(`/orders/${id}/reject`),

  updateStatus: (id: string, status: string) =>
    api.patch(`/orders/${id}/status`, { status }),

  uploadPhoto: (id: string, type: 'pickup' | 'delivery', file: File) => {
    const formData = new FormData();
    formData.append('photo', file);
    formData.append('type', type);
    return api.post(`/orders/${id}/photo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  getHistory: (page = 1, limit = 20) =>
    api.get('/orders/history', { params: { page, limit } }),
};
