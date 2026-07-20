import { create } from 'zustand';
import { fetchNotifications } from '../services/mockApi';
import { generateId } from '../utils/helpers';

const useNotificationStore = create((set, get) => ({
  notifications: [],
  isLoading: false,

  get unreadCount() {
    return get().notifications.filter((n) => !n.read).length;
  },

  fetchNotifications: async () => {
    set({ isLoading: true });
    try {
      const data = await fetchNotifications();
      set({ notifications: data, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  addNotification: (notification) => {
    const newNotif = {
      id: generateId('notif'),
      time: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
      read: false,
      ...notification,
    };
    set((state) => ({
      notifications: [newNotif, ...state.notifications],
    }));
  },

  markRead: (id) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    }));
  },

  markAllRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
    }));
  },

  clearAll: () => set({ notifications: [] }),
}));

export default useNotificationStore;
