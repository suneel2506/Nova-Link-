import { create } from 'zustand';
import { fetchSystemMetrics } from '../services/api';
import websocketManager from '../services/websocketManager';

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
      // Silently swallow errors — metrics are best-effort.
      // Do NOT propagate to auth interceptor to avoid logout cascades.
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

  // ── Real-time updater (called by WS push from agent) ───
  _updateMetrics: (data) => {
    set((state) => ({
      metrics: {
        ...state.metrics,
        cpu: data.cpu || state.metrics?.cpu,
        ram: data.ram || state.metrics?.ram,
        disk: data.disk || state.metrics?.disk,
        battery: data.battery || state.metrics?.battery,
        network: data.network || state.metrics?.network,
        uptime: data.uptime || state.metrics?.uptime,
        os: data.os || state.metrics?.os,
        hostname: data.hostname || state.metrics?.hostname,
      },
      history: data.history || state.history,
    }));
  },
}));

// ── WebSocket Event Subscription ────────────────────
// Agent pushes system metrics → backend relays → browser receives here.
websocketManager.on('system_updated', (data) => {
  useSystemStore.getState()._updateMetrics(data);
});

export default useSystemStore;
