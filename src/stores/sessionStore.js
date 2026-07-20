import { create } from 'zustand';
import { startRemoteSession, endRemoteSession } from '../services/mockApi';

const useSessionStore = create((set) => ({
  isConnected: false,
  sessionId: null,
  sessionDevice: null,
  zoomLevel: 100,
  isFullscreen: false,
  isMuted: false,
  isSpeakerOn: true,
  isRecording: false,
  quality: '1080p',
  isLoading: false,

  connect: async (device) => {
    set({ isLoading: true });
    try {
      const result = await startRemoteSession(device.id);
      set({
        isConnected: true,
        sessionId: result.sessionId,
        sessionDevice: device,
        isLoading: false,
      });
      return result;
    } catch {
      set({ isLoading: false });
      throw new Error('Failed to connect');
    }
  },

  disconnect: async () => {
    const sessionId = useSessionStore.getState().sessionId;
    set({ isLoading: true });
    try {
      if (sessionId) await endRemoteSession(sessionId);
      set({
        isConnected: false,
        sessionId: null,
        sessionDevice: null,
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
}));

export default useSessionStore;
