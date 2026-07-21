/**
 * Connection state store — tracks WebSocket connection status.
 * 
 * Automatically syncs with websocketManager's state changes.
 * Components read from this store to display connection indicators.
 */

import { create } from 'zustand';
import websocketManager, { ConnectionState } from '../services/websocketManager';

const useConnectionStore = create((set, get) => ({
  connectionState: ConnectionState.DISCONNECTED,
  latency: 0,
  missedHeartbeats: 0,
  lastConnected: null,
  connectionQuality: 'critical', // excellent | good | poor | critical

  // Called by the init function below
  _updateState: (newState) => {
    set({
      connectionState: newState,
      latency: websocketManager.getLatency(),
      missedHeartbeats: websocketManager.getMissedHeartbeats(),
      connectionQuality: websocketManager.getConnectionQuality(),
      ...(newState === ConnectionState.CONNECTED ? { lastConnected: Date.now() } : {}),
    });
  },

  connect: () => {
    websocketManager.connect();
  },

  disconnect: () => {
    websocketManager.disconnect();
  },

  getStatus: () => {
    const { connectionState } = get();
    switch (connectionState) {
      case ConnectionState.CONNECTED: return 'Connected';
      case ConnectionState.CONNECTING: return 'Connecting...';
      case ConnectionState.AUTHENTICATING: return 'Authenticating...';
      case ConnectionState.RECONNECTING: return 'Reconnecting...';
      case ConnectionState.FAILED: return 'Connection Failed';
      default: return 'Disconnected';
    }
  },
}));

// ── Auto-sync with websocketManager ─────────────────
// Subscribe to state changes from the WS manager and update this store.
websocketManager.onStateChange((newState) => {
  useConnectionStore.getState()._updateState(newState);
});

// Periodically update latency/quality while connected (every 10s)
setInterval(() => {
  if (websocketManager.isConnected()) {
    useConnectionStore.setState({
      latency: websocketManager.getLatency(),
      missedHeartbeats: websocketManager.getMissedHeartbeats(),
      connectionQuality: websocketManager.getConnectionQuality(),
    });
  }
}, 10000);

export default useConnectionStore;
