import { create } from 'zustand';
import { fetchNotifications } from '../services/api';
import { generateId } from '../utils/helpers';
import websocketManager from '../services/websocketManager';

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

// ── WebSocket Event Subscriptions ───────────────────
// Real-time notifications pushed from the backend.

websocketManager.on('notification', (data) => {
  useNotificationStore.getState().addNotification(data);
});

// Auto-generate notifications for key events
websocketManager.on('device_connected', (data) => {
  useNotificationStore.getState().addNotification({
    title: 'Device Connected',
    message: `${data.name || 'A device'} is now online`,
    type: 'info',
    icon: 'wifi',
  });
});

websocketManager.on('device_disconnected', (data) => {
  useNotificationStore.getState().addNotification({
    title: 'Device Disconnected',
    message: `${data.name || 'A device'} went offline`,
    type: 'warning',
    icon: 'wifi-off',
  });
});

websocketManager.on('session_created', (data) => {
  useNotificationStore.getState().addNotification({
    title: 'Session Started',
    message: `Remote session ${data.sessionId?.slice(-6) || ''} is active`,
    type: 'success',
    icon: 'play',
  });
});

websocketManager.on('clipboard_updated', (data) => {
  useNotificationStore.getState().addNotification({
    title: 'Clipboard Synced',
    message: `Clipboard updated from ${data.source || 'remote device'}`,
    type: 'info',
    icon: 'clipboard',
  });
});

export default useNotificationStore;
