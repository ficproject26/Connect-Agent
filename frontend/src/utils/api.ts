import axios from 'axios';

const getAgentBackendUrl = () => {
  let url = import.meta.env.VITE_API_URL || 'https://connect-agent-1.onrender.com/api';
  url = url.trim().replace(/\/+$/, '');
  if (!url.endsWith('/api')) {
    url += '/api';
  }
  return url;
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

