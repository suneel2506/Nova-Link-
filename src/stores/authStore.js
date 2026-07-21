import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { loginUser } from '../services/api';
import websocketManager from '../services/websocketManager';

const useAuthStore = create(
  persist(
    (set) => ({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      rememberMe: false,
      error: null,

      login: async (email, password, rememberMe = false) => {
        set({ isLoading: true, error: null });
        try {
          const user = await loginUser(email, password);
          set({ isAuthenticated: true, user, rememberMe, isLoading: false });
          // Connect WebSocket after successful login
          websocketManager.connect();
          return user;
        } catch (err) {
          set({ isLoading: false, error: err.message });
          throw err;
        }
      },

      logout: () => {
        // Disconnect WebSocket before clearing auth
        websocketManager.disconnect();
        set({ isAuthenticated: false, user: null, error: null });
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'nova-link-auth',
      partialize: (state) =>
        state.rememberMe
          ? { isAuthenticated: state.isAuthenticated, user: state.user, rememberMe: state.rememberMe }
          : { rememberMe: false },
      onRehydrate: () => {
        // After rehydration, auto-connect WS if user was remembered
        return (state) => {
          if (state?.isAuthenticated && state?.user?.token) {
            setTimeout(() => websocketManager.connect(), 100);
          }
        };
      },
    }
  )
);

export default useAuthStore;
