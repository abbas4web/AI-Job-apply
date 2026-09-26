import { apiClient } from './api';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface AuthTokens {
  token: string;
  user: AuthUser;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

/** POST /auth/register */
export async function registerUser(payload: RegisterPayload): Promise<AuthTokens> {
  const res = await apiClient.post<{ success: boolean; data: AuthTokens }>(
    '/auth/register',
    payload
  );
  return res.data.data;
}

/** POST /auth/login */
export async function loginUser(payload: LoginPayload): Promise<AuthTokens> {
  const res = await apiClient.post<{ success: boolean; data: AuthTokens }>(
    '/auth/login',
    payload
  );
  return res.data.data;
}

/** POST /auth/logout */
export async function logoutUser(): Promise<void> {
  await apiClient.post('/auth/logout');
}

/** GET /auth/me */
export async function getCurrentUser(): Promise<AuthUser> {
  const res = await apiClient.get<{ success: boolean; data: AuthUser }>('/auth/me');
  return res.data.data;
}

/** Persist token to localStorage and set auth header */
export function persistAuth(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('token', token);
  }
}

/** Remove token from localStorage */
export function clearAuth(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
  }
}
