/**
 * Device Store — manages device state, pairing, and trust with real-time updates.
 *
 * State: thisDevice, pairedDevices, otherDevices, selectedDevice, loading, error,
 *        pairingState, trustedDevices
 * Methods: fetchDevices, registerDevice, updateDevice, deleteDevice, selectDevice,
 *          requestPairing, cancelPairing, fetchTrustedDevices, removeTrust, renameTrust
 */

import { create } from 'zustand';
import { fetchDevices, pairDevice, requestPairing, getTrustedDevices, removeTrustedDevice, renameTrustedDevice, checkDeviceTrust, getPairingStatus } from '../services/api';
import websocketManager from '../services/websocketManager';
import api from '../services/api';

const useDeviceStore = create((set, get) => ({
  thisDevice: null,
  pairedDevices: [],
  otherDevices: [],
  selectedDevice: null,
  searchQuery: '',
  sortBy: 'name',
  filterBy: 'all',
  loading: false,
  isLoading: false,
  error: null,

  // ── Pairing State ─────────────────────────────────
  pairingState: null, // null | { status, requestId, code, desktopDeviceId, desktopDeviceName, expiresAt }
  trustedDevices: [],

  // ── Fetch all devices from backend ────────────────
  fetchDevices: async () => {
    set({ loading: true, isLoading: true, error: null });
    try {
      const data = await fetchDevices();
      set({
        thisDevice: data.thisDevice,
        pairedDevices: data.pairedDevices || [],
        otherDevices: data.otherDevices || [],
        loading: false,
        isLoading: false,
      });
    } catch (err) {
      set({ loading: false, isLoading: false, error: err.message });
    }
  },

  // ── Register a new device ─────────────────────────
  registerDevice: async (deviceInfo) => {
    set({ loading: true, error: null });
    try {
      const { data } = await api.post('/devices/register', deviceInfo);
      if (data.success && data.device) {
        set((state) => ({
          pairedDevices: [...state.pairedDevices, data.device],
          loading: false,
        }));
      }
      return data.device;
    } catch (err) {
      set({ loading: false, error: err.response?.data?.detail || err.message });
      throw err;
    }
  },

  // ── Update a device ───────────────────────────────
  updateDevice: async (deviceId, updates) => {
    try {
      const { data } = await api.patch(`/devices/${deviceId}`, updates);
      if (data.success && data.device) {
        get()._updateDeviceStatus(deviceId, data.device);
      }
      return data.device;
    } catch (err) {
      set({ error: err.response?.data?.detail || err.message });
      throw err;
    }
  },

  // ── Delete a device ───────────────────────────────
  deleteDevice: async (deviceId) => {
    try {
      await api.delete(`/devices/${deviceId}`);
      set((state) => ({
        pairedDevices: state.pairedDevices.filter((d) => d.id !== deviceId),
        otherDevices: state.otherDevices.filter((d) => d.id !== deviceId),
        selectedDevice: state.selectedDevice?.id === deviceId ? null : state.selectedDevice,
      }));
      return true;
    } catch (err) {
      set({ error: err.response?.data?.detail || err.message });
      throw err;
    }
  },

  // ── Select a device ───────────────────────────────
  selectDevice: (deviceId) => {
    const { pairedDevices, otherDevices } = get();
    const all = [...pairedDevices, ...otherDevices];
    const device = all.find((d) => d.id === deviceId) || null;
    set({ selectedDevice: device });
  },

  // ── Pair a new device ─────────────────────────────
  pairNewDevice: async (deviceInfo) => {
    set({ loading: true, error: null });
    try {
      const result = await pairDevice(deviceInfo);
      if (result.device) {
        set((state) => ({
          pairedDevices: [...state.pairedDevices, result.device],
          loading: false,
        }));
      }
      return result.device;
    } catch (err) {
      set({ loading: false, error: err.message });
      throw err;
    }
  },

  // ── Pairing Flow ──────────────────────────────────

  requestPairing: async (desktopDeviceId, mobileName = 'Mobile App') => {
    set({
      pairingState: { status: 'requesting', desktopDeviceId },
      error: null,
    });
    try {
      const result = await requestPairing(desktopDeviceId, mobileName);
      set({
        pairingState: {
          status: 'waiting',
          requestId: result.id,
          code: result.code,
          desktopDeviceId: result.desktopDeviceId,
          desktopDeviceName: result.desktopDeviceName,
          expiresAt: result.expiresAt,
        },
      });

      // Auto-expire after 60 seconds
      setTimeout(() => {
        const { pairingState } = get();
        if (pairingState?.status === 'waiting' && pairingState?.requestId === result.id) {
          set({ pairingState: { ...pairingState, status: 'expired' } });
        }
      }, 60000);

      return result;
    } catch (err) {
      set({
        pairingState: { status: 'error', message: err.message },
        error: err.message,
      });
      throw err;
    }
  },

  cancelPairing: () => {
    set({ pairingState: null });
  },

  pollPairingStatus: async (requestId) => {
    try {
      const result = await getPairingStatus(requestId);
      if (result.status === 'approved') {
        set({ pairingState: { status: 'approved', ...result } });
        // Refresh devices to get updated trust info
        get().fetchDevices();
        get().fetchTrustedDevices();
      } else if (result.status === 'rejected') {
        set({ pairingState: { status: 'rejected', ...result } });
      } else if (result.status === 'expired') {
        set({ pairingState: { status: 'expired', ...result } });
      }
      return result;
    } catch {
      return null;
    }
  },

  // ── Trusted Devices ───────────────────────────────

  fetchTrustedDevices: async () => {
    try {
      const data = await getTrustedDevices();
      set({ trustedDevices: data });
    } catch {
      // silent fail
    }
  },

  removeTrust: async (trustId) => {
    try {
      await removeTrustedDevice(trustId);
      set((state) => ({
        trustedDevices: state.trustedDevices.filter((t) => t.id !== trustId),
      }));
      return true;
    } catch (err) {
      set({ error: err.message });
      throw err;
    }
  },

  renameTrust: async (trustId, nickname) => {
    try {
      await renameTrustedDevice(trustId, nickname);
      set((state) => ({
        trustedDevices: state.trustedDevices.map((t) =>
          t.id === trustId ? { ...t, nickname } : t
        ),
      }));
      return true;
    } catch (err) {
      set({ error: err.message });
      throw err;
    }
  },

  isDeviceTrusted: (deviceId) => {
    const { trustedDevices } = get();
    return trustedDevices.some(
      (t) => t.desktopDeviceId === deviceId && t.isActive
    );
  },

  // ── Filters ───────────────────────────────────────
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSortBy: (sortBy) => set({ sortBy }),
  setFilterBy: (filterBy) => set({ filterBy }),

  getFilteredDevices: () => {
    const { pairedDevices, otherDevices, searchQuery, sortBy, filterBy } = get();
    let all = [...pairedDevices, ...otherDevices];

    if (filterBy === 'online') {
      all = all.filter((d) => d.isActive || d.isOnline);
    } else if (filterBy === 'offline') {
      all = all.filter((d) => !d.isActive && !d.isOnline);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      all = all.filter(
        (d) =>
          (d.name || '').toLowerCase().includes(q) ||
          (d.os || '').toLowerCase().includes(q) ||
          (d.hostname || '').toLowerCase().includes(q) ||
          (d.ip || '').includes(q)
      );
    }

    all.sort((a, b) => {
      if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'status') return (b.isActive ? 1 : 0) - (a.isActive ? 1 : 0);
      return 0;
    });

    return all;
  },

  // ── Internal updaters (called by WS events) ──────

  _updateDeviceStatus: (deviceId, updates) => {
    set((state) => {
      const updateDevice = (d) => {
        if (d.id === deviceId || d.deviceUuid === deviceId) {
          return { ...d, ...updates };
        }
        return d;
      };

      return {
        thisDevice:
          state.thisDevice && (state.thisDevice.id === deviceId || state.thisDevice.deviceUuid === deviceId)
            ? { ...state.thisDevice, ...updates }
            : state.thisDevice,
        pairedDevices: state.pairedDevices.map(updateDevice),
        otherDevices: state.otherDevices.map(updateDevice),
        selectedDevice:
          state.selectedDevice && (state.selectedDevice.id === deviceId || state.selectedDevice.deviceUuid === deviceId)
            ? { ...state.selectedDevice, ...updates }
            : state.selectedDevice,
      };
    });
  },

  _addDevice: (device) => {
    set((state) => {
      const exists =
        state.pairedDevices.some((d) => d.id === device.id || d.deviceUuid === device.deviceUuid) ||
        state.otherDevices.some((d) => d.id === device.id || d.deviceUuid === device.deviceUuid);
      if (exists) {
        get()._updateDeviceStatus(device.id || device.deviceUuid, device);
        return {};
      }
      return { pairedDevices: [...state.pairedDevices, device] };
    });
  },

  clearError: () => set({ error: null }),
}));

// ── WebSocket Event Subscriptions ───────────────────

websocketManager.on('device_connected', (data) => {
  if (data.deviceId) {
    useDeviceStore.getState()._addDevice({
      id: data.deviceId,
      deviceUuid: data.deviceId,
      name: data.name || 'Unknown Device',
      type: data.type || 'desktop',
      os: data.os || 'Unknown',
      ip: data.ip || '',
      status: 'Online',
      isActive: true,
      isOnline: true,
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
      isOnline: false,
      status: data.status || 'Offline',
      lastSeen: data.lastSeen || 'Just now',
    });
  }
});

websocketManager.on('device_status_changed', (data) => {
  if (data.deviceId) {
    useDeviceStore.getState()._updateDeviceStatus(data.deviceId, {
      isActive: data.isActive !== undefined ? data.isActive : true,
      isOnline: true,
      isBusy: data.isBusy || false,
      status: data.status || 'Online',
      lastSeen: data.lastSeen || 'Now',
    });
  }
});

// ── Pairing WS Events ──────────────────────────────

websocketManager.on('pairing_requested', (data) => {
  useDeviceStore.setState({
    pairingState: {
      status: 'waiting',
      requestId: data.id,
      code: data.code,
      desktopDeviceId: data.desktopDeviceId,
      desktopDeviceName: data.desktopDeviceName,
      expiresAt: data.expiresAt,
    },
  });
});

websocketManager.on('pairing_approved', (data) => {
  useDeviceStore.setState({
    pairingState: {
      status: 'approved',
      requestId: data.requestId || data.id,
      desktopDeviceId: data.desktopDeviceId,
    },
  });
  // Refresh devices + trusted
  useDeviceStore.getState().fetchDevices();
  useDeviceStore.getState().fetchTrustedDevices();
});

websocketManager.on('pairing_rejected', (data) => {
  useDeviceStore.setState({
    pairingState: {
      status: 'rejected',
      requestId: data.requestId,
      reason: data.reason || 'Denied by desktop user',
    },
  });
});

websocketManager.on('pairing_error', (data) => {
  useDeviceStore.setState({
    pairingState: {
      status: 'error',
      message: data.message,
    },
    error: data.message,
  });
});

// When authenticated, auto-fetch devices + trusted
websocketManager.on('authenticated', () => {
  useDeviceStore.getState().fetchDevices();
  useDeviceStore.getState().fetchTrustedDevices();
});

export default useDeviceStore;
