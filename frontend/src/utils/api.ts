import axios from 'axios';

const getAgentBackendUrl = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (typeof window === 'undefined') return 'http://localhost:8001/api';
  const hostname = window.location.hostname;
  if (
    !hostname || 
    hostname === 'localhost' || 
    hostname === '127.0.0.1' || 
    hostname.startsWith('192.168.') || 
    hostname.startsWith('10.') || 
    hostname.startsWith('172.')
  ) {
    return `http://${hostname || 'localhost'}:8001/api`;
  }
  return 'https://connect-admin-backend.onrender.com/api';
};

const api = axios.create({
  baseURL: getAgentBackendUrl(),
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

export default api;
