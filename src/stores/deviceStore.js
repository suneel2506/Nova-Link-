import { create } from 'zustand';
import { fetchDevices, pairDevice } from '../services/api';

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
}));

export default useDeviceStore;
