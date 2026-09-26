import axios from 'axios';

const getAgentBackendUrl = () => {
  const envUrl =
    typeof import.meta !== 'undefined' && import.meta.env
      ? (import.meta.env.VITE_API_URL || import.meta.env.NEXT_PUBLIC_API_URL)
      : null;

  let url = envUrl || '/api';
  // Guard against insecure HTTP when page is loaded over HTTPS (Mixed Content prevention)
  if (url.includes('3.110.88.42:8083')) {
    url = 'https://agent.ficapp.in/api';
  } else if (typeof window !== 'undefined' && window.location.protocol === 'https:' && url.startsWith('http://')) {
    url = url.replace(/^http:\/\//, 'https://');
  }
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
