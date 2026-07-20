import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { fetchSettings, saveSettings } from '../services/mockApi';

const useSettingsStore = create(
  persist(
    (set, get) => ({
      general: {
        startWithWindows: true,
        minimizeToTray: true,
        runInBackground: true,
        autoUpdate: true,
      },
      display: {
        theme: 'dark',
        language: 'en',
        fontSize: 'medium',
      },
      notifications: {
        enabled: true,
        sound: true,
        sessionAlerts: true,
        fileTransferAlerts: true,
        systemAlerts: true,
      },
      security: {
        allowRemoteAccess: true,
        requirePassword: true,
        twoFactorAuth: false,
        autoLockTimeout: 5,
        encryptTransfers: true,
      },
      about: {
        appName: 'Nova Link',
        version: '1.0.0',
        buildNumber: '2026.07.20',
        license: 'Premium',
      },
      activeTab: 'general',
      isLoading: false,

      setActiveTab: (tab) => set({ activeTab: tab }),

      fetchSettings: async () => {
        set({ isLoading: true });
        try {
          const data = await fetchSettings();
          set({ ...data, isLoading: false });
        } catch {
          set({ isLoading: false });
        }
      },

      updateSetting: (section, key, value) => {
        set((state) => ({
          [section]: { ...state[section], [key]: value },
        }));
      },

      saveAll: async () => {
        const { general, display, notifications, security, about } = get();
        set({ isLoading: true });
        try {
          await saveSettings({ general, display, notifications, security, about });
          set({ isLoading: false });
        } catch {
          set({ isLoading: false });
        }
      },

      resetSettings: async () => {
        const data = await fetchSettings();
        set(data);
      },
    }),
    {
      name: 'nova-link-settings',
      partialize: (state) => ({
        general: state.general,
        display: state.display,
        notifications: state.notifications,
        security: state.security,
      }),
    }
  )
);

export default useSettingsStore;
