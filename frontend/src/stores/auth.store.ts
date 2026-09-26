import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  loginUser,
  registerUser,
  logoutUser,
  persistAuth,
  clearAuth,
  type AuthUser,
  type LoginPayload,
  type RegisterPayload,
} from '@/lib/auth';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;

  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,

      login: async (payload) => {
        set({ isLoading: true, error: null });
        try {
          const { token, user } = await loginUser(payload);
          persistAuth(token);
          set({ user, token, isLoading: false });
        } catch (err) {
          set({
            isLoading: false,
            error: err instanceof Error ? err.message : 'Login failed',
          });
          throw err;
        }
      },

      register: async (payload) => {
        set({ isLoading: true, error: null });
        try {
          const { token, user } = await registerUser(payload);
          persistAuth(token);
          set({ user, token, isLoading: false });
        } catch (err) {
          set({
            isLoading: false,
            error: err instanceof Error ? err.message : 'Registration failed',
          });
          throw err;
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          await logoutUser();
        } finally {
          clearAuth();
          set({ user: null, token: null, isLoading: false, error: null });
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      // Only persist user + token, not transient UI state
      partialize: (state) => ({ user: state.user, token: state.token }),
    }
  )
);

/** Selector helpers */
export const selectUser = (s: AuthState) => s.user;
export const selectIsAuthenticated = (s: AuthState) => !!s.token;
export const selectAuthLoading = (s: AuthState) => s.isLoading;
export const selectAuthError = (s: AuthState) => s.error;
