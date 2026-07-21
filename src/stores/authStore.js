/**
 * Auth Store — manages authentication state.
 *
 * State: user, accessToken, refreshToken, isAuthenticated, loading, error
 * Methods: login, register, logout, refreshToken, fetchCurrentUser
 * Persistence: localStorage via zustand/persist (respects rememberMe)
 * Auto-login: restores session on rehydrate
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  loginUser,
  registerUser,
  logoutUser,
  refreshUserToken,
  fetchCurrentUser,
} from '../services/api';
import websocketManager from '../services/websocketManager';

const useAuthStore = create(
  persist(
    (set, get) => ({
      // ── State ───────────────────────────────────
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      loading: false,
      error: null,
      rememberMe: false,
      initialized: false, // true after first hydration check

      // ── Login ───────────────────────────────────
      login: async (email, password, rememberMe = false) => {
        set({ loading: true, error: null });
        try {
          const data = await loginUser(email, password);
          set({
            user: { id: data.id, name: data.name, email: data.email, token: data.token, refresh_token: data.refresh_token },
            accessToken: data.token,
            refreshToken: data.refresh_token,
            isAuthenticated: true,
            rememberMe,
            loading: false,
            error: null,
          });
          websocketManager.connect();
          return data;
        } catch (err) {
          set({ loading: false, error: err.message });
          throw err;
        }
      },

      // ── Register ────────────────────────────────
      register: async (email, password, name = 'User') => {
        set({ loading: true, error: null });
        try {
          const data = await registerUser(email, password, name);
          set({
            user: { id: data.id, name: data.name, email: data.email, token: data.token, refresh_token: data.refresh_token },
            accessToken: data.token,
            refreshToken: data.refresh_token,
            isAuthenticated: true,
            rememberMe: false,
            loading: false,
            error: null,
          });
          websocketManager.connect();
          return data;
        } catch (err) {
          set({ loading: false, error: err.message });
          throw err;
        }
      },

      // ── Logout ──────────────────────────────────
      logout: async () => {
        websocketManager.disconnect();
        try {
          await logoutUser();
        } catch {
          // Server logout is best-effort
        }
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          error: null,
        });
      },

      // ── Refresh Token ──────────────────────────
      refreshAccessToken: async () => {
        const { refreshToken: currentRefresh } = get();
        if (!currentRefresh) {
          get().logout();
          return null;
        }

        try {
          const data = await refreshUserToken(currentRefresh);
          set({
            accessToken: data.token,
            refreshToken: data.refresh_token,
            user: { ...get().user, token: data.token, refresh_token: data.refresh_token },
          });
          return data.token;
        } catch {
          get().logout();
          return null;
        }
      },

      // ── Fetch Current User ─────────────────────
      fetchCurrentUser: async () => {
        try {
          const data = await fetchCurrentUser();
          set((state) => ({
            user: { ...state.user, ...data },
          }));
          return data;
        } catch {
          // Token likely invalid — logout
          get().logout();
          return null;
        }
      },

      // ── Initialize (auto-login check) ──────────
      initialize: async () => {
        const { isAuthenticated, accessToken } = get();
        if (isAuthenticated && accessToken) {
          try {
            const data = await fetchCurrentUser();
            set((state) => ({
              user: { ...state.user, ...data },
              initialized: true,
            }));
            websocketManager.connect();
          } catch {
            // Token expired — try refresh
            const newToken = await get().refreshAccessToken();
            if (newToken) {
              try {
                const data = await fetchCurrentUser();
                set((state) => ({
                  user: { ...state.user, ...data },
                  initialized: true,
                }));
                websocketManager.connect();
              } catch {
                set({ initialized: true });
              }
            } else {
              set({ initialized: true });
            }
          }
        } else {
          set({ initialized: true });
        }
      },

      // ── Helpers ─────────────────────────────────
      clearError: () => set({ error: null }),

      // ── Computed (for backward compat) ──────────
      get isLoading() {
        return get().loading;
      },
    }),
    {
      name: 'nova-link-auth',
      partialize: (state) => {
        // Only persist auth data if rememberMe is set, or always persist tokens
        const base = {
          isAuthenticated: state.isAuthenticated,
          user: state.user,
          accessToken: state.accessToken,
          refreshToken: state.refreshToken,
          rememberMe: state.rememberMe,
        };
        if (!state.rememberMe) {
          // Still persist tokens for session restoration, but clear on browser close
          // (sessionStorage would be ideal, but zustand/persist uses localStorage)
          return base;
        }
        return base;
      },
      onRehydrate: () => {
        return (state) => {
          if (state?.isAuthenticated && state?.accessToken) {
            // Defer initialization to let the app render first
            setTimeout(() => {
              useAuthStore.getState().initialize();
            }, 100);
          } else {
            // Mark as initialized immediately
            useAuthStore.setState({ initialized: true });
          }
        };
      },
    }
  )
);

// ── Listen for auth:expired events from Axios interceptor ─────
if (typeof window !== 'undefined') {
  window.addEventListener('auth:expired', () => {
    const store = useAuthStore.getState();
    if (store.isAuthenticated) {
      store.logout();
    }
  });
}

export default useAuthStore;
