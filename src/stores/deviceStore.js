import { create } from 'zustand';
import { fetchDevices, pairDevice } from '../services/api';
import websocketManager from '../services/websocketManager';

const useDeviceStore = create((set, get) => ({
  thisDevice: null,
  pairedDevices: [],
  otherDevices: [],
  selectedDevice: null,
  searchQuery: '',
  sortBy: 'name', // 'name' | 'status' | 'lastSeen'
  filterBy: 'all', // 'all' | 'online' | 'offline'
  isLoading: false,

  fetchDevices: async () => {
    set({ isLoading: true });
    try {
      const data = await fetchDevices();
      set({
        thisDevice: data.thisDevice,
        pairedDevices: data.pairedDevices,
        otherDevices: data.otherDevices,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  selectDevice: (deviceId) => {
    const { pairedDevices, otherDevices } = get();
    const all = [...pairedDevices, ...otherDevices];
    const device = all.find((d) => d.id === deviceId) || null;
    set({ selectedDevice: device });
  },

  setSearchQuery: (query) => set({ searchQuery: query }),
  setSortBy: (sortBy) => set({ sortBy }),
  setFilterBy: (filterBy) => set({ filterBy }),

  getFilteredDevices: () => {
    const { pairedDevices, otherDevices, searchQuery, sortBy, filterBy } = get();
    let all = [...pairedDevices, ...otherDevices];

    // Filter
    if (filterBy === 'online') {
      all = all.filter((d) => d.isActive || d.status === 'Active now');
    } else if (filterBy === 'offline') {
      all = all.filter((d) => !d.isActive && d.status !== 'Active now');
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      all = all.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.os.toLowerCase().includes(q) ||
          (d.ip && d.ip.includes(q))
      );
    }

    // Sort
    all.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'status') return (b.isActive ? 1 : 0) - (a.isActive ? 1 : 0);
      return 0;
    });

    return all;
  },

  pairNewDevice: async (deviceInfo) => {
    set({ isLoading: true });
    try {
      const result = await pairDevice(deviceInfo);
      set((state) => ({
        pairedDevices: [...state.pairedDevices, result.device],
        isLoading: false,
      }));
      return result.device;
    } catch {
      set({ isLoading: false });
      throw new Error('Failed to pair device');
    }
  },

  // ── Real-time updaters (called by WS events) ─────

  _updateDeviceStatus: (deviceId, updates) => {
    set((state) => {
      const updateDevice = (d) =>
        d.id === deviceId ? { ...d, ...updates } : d;

      return {
        thisDevice:
          state.thisDevice?.id === deviceId
            ? { ...state.thisDevice, ...updates }
            : state.thisDevice,
        pairedDevices: state.pairedDevices.map(updateDevice),
        otherDevices: state.otherDevices.map(updateDevice),
        selectedDevice:
          state.selectedDevice?.id === deviceId
            ? { ...state.selectedDevice, ...updates }
            : state.selectedDevice,
      };
    });
  },

  _addDevice: (device) => {
    set((state) => {
      // Avoid duplicates
      const exists =
        state.pairedDevices.some((d) => d.id === device.id) ||
        state.otherDevices.some((d) => d.id === device.id);
      if (exists) {
        // Update existing instead
        get()._updateDeviceStatus(device.id, device);
        return {};
      }
      return { pairedDevices: [...state.pairedDevices, device] };
    });
  },
}));

// ── WebSocket Event Subscriptions ───────────────────
// These run once at module load and live for the app's lifetime.

websocketManager.on('device_connected', (data) => {
  const store = useDeviceStore.getState();
  if (data.deviceId) {
    store._addDevice({
      id: data.deviceId,
      name: data.name || 'Unknown Device',
      type: data.type || 'desktop',
      os: data.os || 'Unknown',
      ip: data.ip || '',
      status: data.status || 'Active now',
      isActive: true,
      lastSeen: 'Now',
      agentVersion: data.agentVersion || null,
      battery: data.battery || null,
    });
  }
});

websocketManager.on('device_disconnected', (data) => {
  if (data.deviceId) {
    useDeviceStore.getState()._updateDeviceStatus(data.deviceId, {
      isActive: false,
      status: data.status || 'Offline',
      lastSeen: data.lastSeen || 'Just now',
    });
  }
});

websocketManager.on('device_status_changed', (data) => {
  if (data.deviceId) {
    useDeviceStore.getState()._updateDeviceStatus(data.deviceId, {
      isActive: data.isActive !== undefined ? data.isActive : true,
      status: data.status || 'Online',
      lastSeen: data.lastSeen || 'Now',
    });
  }
});

export default useDeviceStore;
