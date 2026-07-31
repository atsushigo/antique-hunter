import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  timeout: 30000,
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const payload = err.response?.data || { error: err.code || 'network_error', message: err.message };
    return Promise.reject(payload);
  }
);
