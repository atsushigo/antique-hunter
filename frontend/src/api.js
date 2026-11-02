import axios from 'axios';

const apiKey = import.meta.env.VITE_API_KEY || '';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  timeout: 30000,
  headers: apiKey ? { 'X-API-Key': apiKey } : {},
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const payload = err.response?.data || { error: err.code || 'network_error', message: err.message };
    return Promise.reject(payload);
  }
);
