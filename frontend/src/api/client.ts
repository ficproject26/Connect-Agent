import axios from 'axios';

const getAgentBackendUrl = () => {
  let url = import.meta.env.VITE_API_URL || import.meta.env.NEXT_PUBLIC_API_URL;
  if (!url) {
    if (typeof window === 'undefined') {
      url = 'http://localhost:8001/api';
    } else {
      const hostname = window.location.hostname;
      if (
        !hostname || 
        hostname === 'localhost' || 
        hostname === '127.0.0.1' || 
        hostname.startsWith('192.168.') || 
        hostname.startsWith('10.') || 
        hostname.startsWith('172.')
      ) {
        url = `http://${hostname || 'localhost'}:8001/api`;
      } else {
        url = 'https://connect-agent-oy0d.onrender.com/api';
      }
    }
  }
  url = url.trim();
  if (!url.endsWith('/api')) {
    url = url.endsWith('/') ? `${url}api` : `${url}/api`;
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
