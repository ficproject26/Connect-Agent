import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8001/api',
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
