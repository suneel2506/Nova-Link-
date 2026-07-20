import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { loginUser } from '../services/api';

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
          return user;
        } catch (err) {
          set({ isLoading: false, error: err.message });
          throw err;
        }
      },

      logout: () => {
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
    }
  )
);

export default useAuthStore;
