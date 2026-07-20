import { create } from 'zustand';
import { fetchSystemMetrics } from '../services/api';

const useSystemStore = create((set, get) => ({
  metrics: null,
  history: { cpu: [], ram: [], disk: [], network: [] },
  isLoading: false,
  pollingInterval: null,

  fetchMetrics: async () => {
    set({ isLoading: true });
    try {
      const data = await fetchSystemMetrics();
      set({
        metrics: {
          cpu: data.cpu,
          ram: data.ram,
          disk: data.disk,
          battery: data.battery,
          network: data.network,
          uptime: data.uptime,
          os: data.os,
          hostname: data.hostname,
        },
        history: data.history,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  startPolling: (intervalMs = 3000) => {
    // Clear any existing interval
    const existing = get().pollingInterval;
    if (existing) clearInterval(existing);

    // Fetch immediately
    get().fetchMetrics();

    // Set up recurring fetch
    const id = setInterval(() => {
      get().fetchMetrics();
    }, intervalMs);

    set({ pollingInterval: id });
  },

  stopPolling: () => {
    const id = get().pollingInterval;
    if (id) {
      clearInterval(id);
      set({ pollingInterval: null });
    }
  },
}));

export default useSystemStore;
