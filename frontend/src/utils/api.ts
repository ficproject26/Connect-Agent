import axios from 'axios';

const getAgentBackendUrl = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const isLocal = !hostname || 
      hostname === 'localhost' || 
      hostname === '127.0.0.1' || 
      hostname.startsWith('192.168.') || 
      hostname.startsWith('10.') || 
      hostname.startsWith('172.');
      
    if (!isLocal) {
      if (import.meta.env.VITE_API_URL && !import.meta.env.VITE_API_URL.includes('localhost')) {
        return import.meta.env.VITE_API_URL;
      }
      return 'https://connect-agent-oy0d.onrender.com/api';
    }
  }
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  return 'http://localhost:8001/api';
};

const api = axios.create({
  baseURL: getAgentBackendUrl(),
  timeout: 60000, // 60s timeout for large KYC document uploads
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add interceptor to inject JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('agent_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add interceptor to handle 401 response status gracefully without unhandled rejection noise
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      error.isAuthError = true;
    }
    return Promise.reject(error);
  }
);

export default api;

