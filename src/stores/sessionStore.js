/**
 * Session Store — manages remote session lifecycle with real-time updates.
 *
 * State: currentSession, sessionStatus, connectionQuality, isConnecting, error
 * Methods: createSession, connectSession, endSession, restoreSession
 * WS Events: session_created, session_accepted, session_rejected, session_ended,
 *            session_connected, session_disconnected, session_timeout, session_error
 */

import { create } from 'zustand';
import { startRemoteSession, endRemoteSession } from '../services/api';
import api from '../services/api';
import websocketManager from '../services/websocketManager';

const SESSION_HEARTBEAT_INTERVAL = 5000; // 5 seconds

const useSessionStore = create((set, get) => ({
  // ── Core Session State ────────────────────────────
  currentSession: null,
  sessionStatus: 'disconnected', // disconnected | creating | waiting | connecting | connected | paused | reconnecting | ended | expired
  connectionQuality: 'good',
  isConnecting: false,
  isConnected: false,
  error: null,

  // ── Legacy compat ─────────────────────────────────
  sessionId: null,
  sessionDevice: null,
  connectionState: 'disconnected',
  zoomLevel: 100,
  isFullscreen: false,
  isMuted: false,
  isSpeakerOn: true,
  isRecording: false,
  quality: '1080p',
  isLoading: false,

  // ── Sprint 5: Remote Desktop State ────────────────
  screenFrame: null,
  screenWidth: 0,
  screenHeight: 0,
  frameNumber: 0,
  streamQuality: 50,
  streamStatus: 'idle', // idle | streaming | paused | error
  clipboardText: '',
  processList: null,
  lastFileResult: null,
  lastPowerResult: null,
  lastAppResult: null,

  // ── Internal ──────────────────────────────────────
  _heartbeatInterval: null,
  _reconnectAttempts: 0,
  _maxReconnectAttempts: 5,

  // ── Create Session ────────────────────────────────
  createSession: async (device) => {
    const { currentSession } = get();
    if (currentSession && ['connected', 'connecting', 'waiting'].includes(get().sessionStatus)) {
      set({ error: 'A session is already active' });
      return null;
    }

    set({
      isConnecting: true,
      isLoading: true,
      sessionStatus: 'creating',
      connectionState: 'connecting',
      error: null,
    });

    try {
      const { data } = await api.post('/session/create', {
        desktopDeviceId: device.deviceUuid || device.id,
        mobileDeviceId: null,
      });

      if (data.success) {
        set({
          currentSession: data,
          sessionId: data.id || data.sessionId,
          sessionDevice: device,
          sessionStatus: 'waiting',
          connectionState: 'connecting',
          isLoading: false,
        });

        // Start session heartbeat
        get()._startHeartbeat(data.id || data.sessionId);

        return data;
      } else {
        set({
          isConnecting: false,
          isLoading: false,
          sessionStatus: 'disconnected',
          connectionState: 'disconnected',
          error: data.error || 'Failed to create session',
        });
        return null;
      }
    } catch (err) {
      set({
        isConnecting: false,
        isLoading: false,
        sessionStatus: 'disconnected',
        connectionState: 'disconnected',
        error: err.message || 'Failed to create session',
      });
      throw err;
    }
  },

  // ── Connect (legacy compat) ───────────────────────
  connect: async (device) => {
    set({ isLoading: true, connectionState: 'connecting', sessionStatus: 'creating' });
    try {
      const result = await startRemoteSession(device.id || device.deviceUuid);

      websocketManager.send('session_create', {
        deviceId: device.deviceUuid || device.id,
        sessionId: result.sessionId,
      });

      set({
        isConnected: true,
        sessionId: result.sessionId,
        sessionDevice: device,
        connectionState: 'connected',
        sessionStatus: 'connected',
        isLoading: false,
        isConnecting: false,
        currentSession: result,
      });

      get()._startHeartbeat(result.sessionId);
      return result;
    } catch {
      set({
        isLoading: false,
        connectionState: 'disconnected',
        sessionStatus: 'disconnected',
        isConnecting: false,
      });
      throw new Error('Failed to connect');
    }
  },

  // ── End Session ───────────────────────────────────
  endSession: async (reason = 'user_ended') => {
    const { sessionId, sessionDevice } = get();
    set({ isLoading: true });

    try {
      if (sessionId) {
        await api.post('/session/end', { sessionId, reason });
      }

      websocketManager.send('session_close', {
        sessionId,
        deviceId: sessionDevice?.deviceUuid || sessionDevice?.id,
        reason,
      });

      get()._stopHeartbeat();
      get()._resetSession();
    } catch {
      get()._stopHeartbeat();
      get()._resetSession();
    }
  },

  // ── Disconnect (legacy compat) ────────────────────
  disconnect: async () => {
    return get().endSession('user_disconnected');
  },

  // ── Restore Session ───────────────────────────────
  restoreSession: async (sessionId) => {
    const id = sessionId || get().sessionId;
    if (!id) return null;

    set({ sessionStatus: 'reconnecting', connectionState: 'reconnecting', isConnecting: true });

    try {
      const { data } = await api.post('/session/restore', { sessionId: id });

      if (data.success) {
        set({
          currentSession: data,
          sessionStatus: data.status || 'reconnecting',
          connectionState: data.status === 'connected' ? 'connected' : 'reconnecting',
          isConnecting: data.status !== 'connected',
          isConnected: data.status === 'connected',
        });
        get()._startHeartbeat(id);
        return data;
      }
    } catch {
      set({
        sessionStatus: 'disconnected',
        connectionState: 'disconnected',
        isConnecting: false,
      });
    }
    return null;
  },

  // ── UI Controls ───────────────────────────────────
  toggleMute: () => set((s) => ({ isMuted: !s.isMuted })),
  toggleSpeaker: () => set((s) => ({ isSpeakerOn: !s.isSpeakerOn })),
  toggleFullscreen: () => set((s) => ({ isFullscreen: !s.isFullscreen })),
  toggleRecording: () => set((s) => ({ isRecording: !s.isRecording })),
  setZoom: (level) => set({ zoomLevel: level }),
  setQuality: (q) => set({ quality: q }),
  clearError: () => set({ error: null }),

  // ── Internal Methods ──────────────────────────────

  _startHeartbeat: (sessionId) => {
    get()._stopHeartbeat();
    const interval = setInterval(() => {
      if (websocketManager.isConnected()) {
        websocketManager.send('session_heartbeat', {
          sessionId,
          source: 'mobile',
        });
      }
    }, SESSION_HEARTBEAT_INTERVAL);
    set({ _heartbeatInterval: interval });
  },

  _stopHeartbeat: () => {
    const { _heartbeatInterval } = get();
    if (_heartbeatInterval) {
      clearInterval(_heartbeatInterval);
      set({ _heartbeatInterval: null });
    }
  },

  _resetSession: () => {
    set({
      currentSession: null,
      sessionId: null,
      sessionDevice: null,
      sessionStatus: 'disconnected',
      connectionState: 'disconnected',
      isConnected: false,
      isConnecting: false,
      isLoading: false,
      error: null,
      _reconnectAttempts: 0,
    });
  },

  _onSessionAccepted: (data) => {
    set({
      currentSession: data,
      sessionStatus: 'connected',
      connectionState: 'connected',
      isConnected: true,
      isConnecting: false,
      isLoading: false,
      _reconnectAttempts: 0,
    });
  },

  _onSessionRejected: (data) => {
    get()._stopHeartbeat();
    set({
      sessionStatus: 'ended',
      connectionState: 'disconnected',
      isConnected: false,
      isConnecting: false,
      isLoading: false,
      error: data.reason || data.terminationReason || 'Session rejected by desktop',
    });
  },

  _onSessionEnded: (data) => {
    const { sessionId } = get();
    if (data.sessionId === sessionId || !sessionId) {
      get()._stopHeartbeat();
      set({
        currentSession: null,
        sessionId: null,
        sessionDevice: null,
        sessionStatus: 'ended',
        connectionState: 'disconnected',
        isConnected: false,
        isConnecting: false,
        isLoading: false,
      });
    }
  },

  _onSessionDisconnected: (data) => {
    const { sessionId, _reconnectAttempts, _maxReconnectAttempts } = get();
    if (data.sessionId !== sessionId) return;

    set({
      sessionStatus: 'disconnected',
      connectionState: 'reconnecting',
      isConnected: false,
    });

    // Auto-reconnect
    if (_reconnectAttempts < _maxReconnectAttempts) {
      set({ _reconnectAttempts: _reconnectAttempts + 1 });
      setTimeout(() => {
        const current = get();
        if (current.sessionStatus === 'disconnected' && current.sessionId) {
          current.restoreSession(current.sessionId);
        }
      }, Math.min(2000 * Math.pow(2, _reconnectAttempts), 30000));
    }
  },

  // ── Legacy compat ─────────────────────────────────
  _onSessionCreated: (data) => {
    set({
      isConnected: true,
      sessionId: data.sessionId,
      connectionState: 'connected',
      sessionStatus: 'connected',
    });
  },

  _onSessionClosed: (data) => {
    const { sessionId } = get();
    if (data.sessionId === sessionId || !sessionId) {
      get()._stopHeartbeat();
      get()._resetSession();
    }
  },
}));

// ── WebSocket Event Subscriptions ───────────────────

websocketManager.on('session_created', (data) => {
  const current = useSessionStore.getState();
  if (!current.sessionId && data.sessionId) {
    useSessionStore.getState()._onSessionCreated(data);
  }
});

websocketManager.on('session_accepted', (data) => {
  useSessionStore.getState()._onSessionAccepted(data);
});

websocketManager.on('session_rejected', (data) => {
  useSessionStore.getState()._onSessionRejected(data);
});

websocketManager.on('session_connected', (data) => {
  useSessionStore.getState()._onSessionAccepted(data);
});

websocketManager.on('session_ended', (data) => {
  useSessionStore.getState()._onSessionEnded(data);
});

websocketManager.on('session_closed', (data) => {
  useSessionStore.getState()._onSessionClosed(data);
});

websocketManager.on('session_disconnected', (data) => {
  useSessionStore.getState()._onSessionDisconnected(data);
});

websocketManager.on('session_timeout', (data) => {
  useSessionStore.getState()._onSessionEnded({ ...data, reason: 'timeout' });
});

websocketManager.on('session_error', (data) => {
  useSessionStore.setState({
    error: data.message || 'Session error',
    isConnecting: false,
    isLoading: false,
  });
});

// ── Sprint 5: Screen Streaming ──────────────────────

websocketManager.on('screen_frame', (data) => {
  useSessionStore.setState({
    screenFrame: data.image,
    screenWidth: data.width,
    screenHeight: data.height,
    frameNumber: data.frameNumber,
    streamQuality: data.quality,
    streamStatus: 'streaming',
  });
});

// ── Sprint 5: Clipboard Sync ────────────────────────

websocketManager.on('clipboard_update', (data) => {
  if (data.source === 'agent') {
    useSessionStore.setState({ clipboardText: data.text });
  }
});

// ── Sprint 5: File Results ──────────────────────────

websocketManager.on('file_result', (data) => {
  // Forward to fileStore
  const fileStore = window.__novaFileStore;
  if (fileStore) {
    fileStore(data);
  }
  // Also store on session for any listening components
  useSessionStore.setState({ lastFileResult: data });
});

// ── Sprint 5: Power/App Results ─────────────────────

websocketManager.on('power_result', (data) => {
  useSessionStore.setState({ lastPowerResult: data });
});

websocketManager.on('app_result', (data) => {
  useSessionStore.setState({ lastAppResult: data });
});

// ── Sprint 5: Process List ──────────────────────────

websocketManager.on('process_list', (data) => {
  useSessionStore.setState({ processList: data });
});

export default useSessionStore;

