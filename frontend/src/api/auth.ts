import api from './client';

// ── Types ──
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
  };
}

export interface RegisterRequest {
  name: string;
  email: string;
  mobile: string;
  password: string;
  role: 'delivery_partner' | 'technician';
  [key: string]: unknown;
}

// ── Auth Endpoints ──
export const authService = {
  login: (data: LoginRequest) =>
    api.post<LoginResponse>('/auth/login', data),

  register: (data: RegisterRequest) =>
    api.post('/auth/register', data),

  getProfile: () =>
    api.get('/auth/profile'),

  updateProfile: (data: Record<string, unknown>) =>
    api.put('/auth/profile', data),

  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),

  verifyOtp: (email: string, otp: string) =>
    api.post('/auth/verify-otp', { email, otp }),

  resetPassword: (email: string, otp: string, newPassword: string) =>
    api.post('/auth/reset-password', { email, otp, newPassword }),
};
