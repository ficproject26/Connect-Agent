import axios from 'axios';

/**
 * Pre-configured Axios instance for all API calls.
 * - Base URL sourced from VITE_API_URL env variable
 * - Automatically attaches JWT auth token from localStorage
 * - Intercepts 401 responses to trigger logout / redirect
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8001/api',
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
