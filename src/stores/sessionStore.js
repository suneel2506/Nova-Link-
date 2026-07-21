import { create } from 'zustand';
import { startRemoteSession, endRemoteSession } from '../services/api';
import websocketManager from '../services/websocketManager';

const useSessionStore = create((set) => ({
  isConnected: false,
  sessionId: null,
  sessionDevice: null,
  connectionState: 'disconnected', // disconnected | connecting | connected | reconnecting
  zoomLevel: 100,
  isFullscreen: false,
  isMuted: false,
  isSpeakerOn: true,
  isRecording: false,
  quality: '1080p',
  isLoading: false,

  connect: async (device) => {
    set({ isLoading: true, connectionState: 'connecting' });
    try {
      const result = await startRemoteSession(device.id);

      // Also notify via WebSocket for real-time sync
      websocketManager.send('session_create', {
        deviceId: device.id,
        sessionId: result.sessionId,
      });

      set({
        isConnected: true,
        sessionId: result.sessionId,
        sessionDevice: device,
        connectionState: 'connected',
        isLoading: false,
      });
      return result;
    } catch {
      set({ isLoading: false, connectionState: 'disconnected' });
      throw new Error('Failed to connect');
    }
  },

  disconnect: async () => {
    const sessionId = useSessionStore.getState().sessionId;
    const deviceId = useSessionStore.getState().sessionDevice?.id;
    set({ isLoading: true });
    try {
      if (sessionId) await endRemoteSession(sessionId);

      // Notify via WebSocket
      websocketManager.send('session_close', { sessionId, deviceId });

      set({
        isConnected: false,
        sessionId: null,
        sessionDevice: null,
        connectionState: 'disconnected',
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  toggleMute: () => set((s) => ({ isMuted: !s.isMuted })),
  toggleSpeaker: () => set((s) => ({ isSpeakerOn: !s.isSpeakerOn })),
  toggleFullscreen: () => set((s) => ({ isFullscreen: !s.isFullscreen })),
  toggleRecording: () => set((s) => ({ isRecording: !s.isRecording })),
  setZoom: (level) => set({ zoomLevel: level }),
  setQuality: (q) => set({ quality: q }),

  // ── Real-time updaters ────────────────────────────
  _onSessionCreated: (data) => {
    set({
      isConnected: true,
      sessionId: data.sessionId,
      connectionState: 'connected',
    });
  },

  _onSessionClosed: (data) => {
    const { sessionId } = useSessionStore.getState();
    if (data.sessionId === sessionId || !sessionId) {
      set({
        isConnected: false,
        sessionId: null,
        sessionDevice: null,
        connectionState: 'disconnected',
      });
    }
  },
}));

// ── WebSocket Event Subscriptions ───────────────────

websocketManager.on('session_created', (data) => {
  // Only update if this was initiated by someone else (e.g., session created by another browser tab)
  const current = useSessionStore.getState();
  if (!current.sessionId && data.sessionId) {
    useSessionStore.getState()._onSessionCreated(data);
  }
});

websocketManager.on('session_closed', (data) => {
  useSessionStore.getState()._onSessionClosed(data);
});

export default useSessionStore;
