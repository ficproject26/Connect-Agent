import axios from 'axios';

const getAgentBackendUrl = () => {
  let url = import.meta.env.VITE_API_URL || 'http://3.110.88.42:8083/api';
  url = url.trim().replace(/\/+$/, '');
  if (!url.endsWith('/api')) {
    url += '/api';
  }
  return url;
};

const api = axios.create({
  baseURL: getAgentBackendUrl(),
  timeout: 15000, // 15s timeout for fast failover and responsive UI
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

// In-flight GET request deduplication map to prevent multiple identical requests
const inFlightRequests = new Map<string, Promise<any>>();

const originalRequest = api.request.bind(api);
api.request = function (configOrUrl: any, maybeConfig?: any) {
  const config = typeof configOrUrl === 'string'
    ? { ...(maybeConfig || {}), url: configOrUrl }
    : { ...(configOrUrl || {}) };
  const method = (config.method || 'get').toLowerCase();

  if (method === 'get') {
    const key = `${config.baseURL || ''}:${config.url || ''}:${config.params ? JSON.stringify(config.params) : ''}`;
    const existing = inFlightRequests.get(key);
    if (existing) {
      return existing;
    }

    const requestPromise = originalRequest(config).finally(() => {
      inFlightRequests.delete(key);
    });
    inFlightRequests.set(key, requestPromise);
    return requestPromise;
  }

  return originalRequest(config);
};

export default api;

