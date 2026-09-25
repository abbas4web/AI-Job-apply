import axios from 'axios';
import type { ApiResponse } from '@ai-job-apply/shared';

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Request interceptor — attach JWT from storage ─────────────
apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// ── Response interceptor — unwrap ApiResponse envelope ────────
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      (error.response?.data as ApiResponse)?.error ?? error.message;
    return Promise.reject(new Error(message));
  }
);
