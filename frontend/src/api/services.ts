import api from './client';

// ── Notification Endpoints ──
export const notificationService = {
  getAll: (params?: { page?: number; limit?: number; unreadOnly?: boolean }) =>
    api.get('/notifications', { params }),

  markRead: (id: string) =>
    api.patch(`/notifications/${id}/read`),

  markAllRead: () =>
    api.post('/notifications/read-all'),

  clear: () =>
    api.delete('/notifications'),
};

// ── Subscription Endpoints ──
export const subscriptionService = {
  getCurrent: () =>
    api.get('/subscription'),

  subscribe: (planId: 'silver' | 'gold' | 'diamond') =>
    api.post('/subscription', { plan: planId }),

  getPlans: () =>
    api.get('/subscription/plans'),
};

// ── Wallet / Revenue Endpoints ──
export const walletService = {
  getBalance: () =>
    api.get('/wallet/balance'),

  getTransactions: (page = 1, limit = 20) =>
    api.get('/wallet/transactions', { params: { page, limit } }),

  requestCashout: (amount: number) =>
    api.post('/wallet/cashout', { amount }),
};

// ── Referral Endpoints ──
export const referralService = {
  getCode: () =>
    api.get('/referrals/code'),

  getStats: () =>
    api.get('/referrals/stats'),

  applyCode: (code: string) =>
    api.post('/referrals/apply', { code }),
};
