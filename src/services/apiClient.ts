import axios from 'axios';

const envApiUrl = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_URL || 
  (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_BASE_URL;

// Use configured environment URL or relative /api/v1 for Vite proxy & reverse proxy compatibility
const API_URL = envApiUrl || '/api/v1';

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn('Unauthorized access, token may be expired.');
      try {
        localStorage.removeItem('auth_token');
      } catch {}
    }
    return Promise.reject(error);
  }
);

