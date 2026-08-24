import axios from 'axios';

const getAgentBackendUrl = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const isLocalDev =
      !hostname ||
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.');

    if (isLocalDev) {
      const envUrl = typeof import.meta !== 'undefined' && import.meta.env ? (import.meta.env.VITE_API_URL || import.meta.env.NEXT_PUBLIC_API_URL) : null;
      if (envUrl && envUrl.includes('localhost')) {
        return envUrl.endsWith('/api') ? envUrl : `${envUrl.replace(/\/$/, '')}/api`;
      }
      return 'http://localhost:8003/api';
    }
  }

  let url = (typeof import.meta !== 'undefined' && import.meta.env ? (import.meta.env.VITE_API_URL || import.meta.env.NEXT_PUBLIC_API_URL) : null) || 'http://13.203.197.69:8003/api';
  url = url.trim().replace(/\/+$/, '');
  if (!url.endsWith('/api')) {
    url += '/api';
  }
  return url;
};

/**
 * Pre-configured Axios instance for all API calls.
 * - Base URL dynamically selected based on environment
 * - Automatically attaches JWT auth token from localStorage
 * - Intercepts responses to handle error responses
 */
const api = axios.create({
  baseURL: getAgentBackendUrl(),
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Request Interceptor: attach auth token ──
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('agent_token') || localStorage.getItem('auth_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response Interceptor: handle errors ──
api.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
