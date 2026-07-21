/**
 * Nova Link — WebSocket Manager (Singleton).
 *
 * Manages a single persistent WebSocket connection with:
 *   - Auto-connect on auth
 *   - Auto-reconnect with exponential backoff
 *   - Connection state machine
 *   - Heartbeat ping/pong
 *   - Event emitter for real-time store updates
 *   - Connection quality monitoring
 */

// ── Connection States ───────────────────────────────
export const ConnectionState = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  AUTHENTICATING: 'authenticating',
  CONNECTED: 'connected',
  RECONNECTING: 'reconnecting',
  FAILED: 'failed',
};

// ── Singleton State ─────────────────────────────────
let ws = null;
let state = ConnectionState.DISCONNECTED;
let reconnectAttempts = 0;
let reconnectTimer = null;
let heartbeatTimer = null;
let heartbeatTimeout = null;
let lastPongTime = 0;
let latency = 0;
let missedHeartbeats = 0;
let listeners = {};          // event → Set<callback>
let stateListeners = new Set();
let intentionalClose = false;

// ── Config ──────────────────────────────────────────
const WS_BASE = (location.protocol === 'https:' ? 'wss:' : 'ws:') + '//' + location.host;
const HEARTBEAT_INTERVAL = 10000;  // 10s
const HEARTBEAT_TIMEOUT = 5000;    // 5s to receive pong
const RECONNECT_BASE = 1000;       // 1s initial
const RECONNECT_MAX = 30000;       // 30s max
const MAX_MISSED_HEARTBEATS = 3;

// ── Helpers ─────────────────────────────────────────
function getToken() {
  try {
    const stored = JSON.parse(localStorage.getItem('nova-link-auth') || '{}');
    return stored?.state?.user?.token || null;
  } catch {
    return null;
  }
}

function setState(newState) {
  if (state === newState) return;
  const prev = state;
  state = newState;
  stateListeners.forEach((cb) => {
    try { cb(newState, prev); } catch (e) { console.error('State listener error:', e); }
  });
}

function getReconnectDelay() {
  const delay = Math.min(RECONNECT_BASE * Math.pow(2, reconnectAttempts), RECONNECT_MAX);
  // Add jitter: ±25%
  return delay * (0.75 + Math.random() * 0.5);
}

// ── Event Emitter ───────────────────────────────────

/**
 * Subscribe to a WebSocket event type.
 * @param {string} event - Event type (e.g. 'device_connected', 'system_updated')
 * @param {function} callback - Handler receiving the event's data payload
 * @returns {function} Unsubscribe function
 */
export function on(event, callback) {
  if (!listeners[event]) listeners[event] = new Set();
  listeners[event].add(callback);
  return () => listeners[event]?.delete(callback);
}

/**
 * Unsubscribe from a WebSocket event type.
 */
export function off(event, callback) {
  listeners[event]?.delete(callback);
}

/**
 * Subscribe to connection state changes.
 * @param {function} callback - Receives (newState, prevState)
 * @returns {function} Unsubscribe function
 */
export function onStateChange(callback) {
  stateListeners.add(callback);
  return () => stateListeners.delete(callback);
}

function emit(event, data) {
  const handlers = listeners[event];
  if (handlers) {
    handlers.forEach((cb) => {
      try { cb(data); } catch (e) { console.error(`WS event handler error [${event}]:`, e); }
    });
  }
}

// ── Heartbeat ───────────────────────────────────────

function startHeartbeat() {
  stopHeartbeat();
  heartbeatTimer = setInterval(() => {
    if (ws?.readyState === WebSocket.OPEN) {
      const pingTime = Date.now();
      send('ping', { t: pingTime });

      heartbeatTimeout = setTimeout(() => {
        missedHeartbeats++;
        if (missedHeartbeats >= MAX_MISSED_HEARTBEATS) {
          console.warn('[WS] Too many missed heartbeats, reconnecting...');
          ws?.close();
        }
      }, HEARTBEAT_TIMEOUT);
    }
  }, HEARTBEAT_INTERVAL);
}

function stopHeartbeat() {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  if (heartbeatTimeout) clearTimeout(heartbeatTimeout);
  heartbeatTimer = null;
  heartbeatTimeout = null;
}

function handlePong(data) {
  if (heartbeatTimeout) {
    clearTimeout(heartbeatTimeout);
    heartbeatTimeout = null;
  }
  missedHeartbeats = 0;
  const sentTime = data?.t;
  if (sentTime) {
    latency = Date.now() - sentTime;
  }
  lastPongTime = Date.now();
}

// ── Connection ──────────────────────────────────────

/**
 * Connect to the WebSocket server.
 * Called automatically on login; can also be called manually.
 */
export function connect() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return; // Already connected or connecting
  }

  const token = getToken();
  if (!token) {
    setState(ConnectionState.DISCONNECTED);
    return;
  }

  intentionalClose = false;
  setState(reconnectAttempts > 0 ? ConnectionState.RECONNECTING : ConnectionState.CONNECTING);

  const url = `${WS_BASE}/ws/browser?token=${encodeURIComponent(token)}`;

  try {
    ws = new WebSocket(url);
  } catch (e) {
    console.error('[WS] Failed to create WebSocket:', e);
    scheduleReconnect();
    return;
  }

  ws.onopen = () => {
    console.log('[WS] Connected');
    setState(ConnectionState.AUTHENTICATING);
    // The server auto-authenticates via the token query param.
    // We'll receive an 'authenticated' message.
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      const type = msg.type;
      const data = msg.data || {};

      if (type === 'authenticated') {
        setState(ConnectionState.CONNECTED);
        reconnectAttempts = 0;
        missedHeartbeats = 0;
        startHeartbeat();
        emit('authenticated', data);
        console.log('[WS] Authenticated:', data.clientId);
        return;
      }

      if (type === 'auth_failed') {
        console.error('[WS] Auth failed:', data.message);
        setState(ConnectionState.FAILED);
        intentionalClose = true;
        ws.close();
        return;
      }

      if (type === 'pong') {
        handlePong(data);
        return;
      }

      // Emit to all listeners for this event type
      emit(type, data);
    } catch (e) {
      console.error('[WS] Message parse error:', e);
    }
  };

  ws.onclose = (event) => {
    console.log(`[WS] Closed: code=${event.code} reason=${event.reason}`);
    stopHeartbeat();
    ws = null;

    if (!intentionalClose) {
      scheduleReconnect();
    } else {
      setState(ConnectionState.DISCONNECTED);
    }
  };

  ws.onerror = (error) => {
    console.error('[WS] Error:', error);
  };
}

/**
 * Disconnect from the WebSocket server.
 * Called on logout.
 */
export function disconnect() {
  intentionalClose = true;
  stopHeartbeat();
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  reconnectAttempts = 0;
  if (ws) {
    ws.close();
    ws = null;
  }
  setState(ConnectionState.DISCONNECTED);
}

function scheduleReconnect() {
  if (intentionalClose) return;

  const delay = getReconnectDelay();
  reconnectAttempts++;
  setState(ConnectionState.RECONNECTING);
  console.log(`[WS] Reconnecting in ${(delay / 1000).toFixed(1)}s (attempt ${reconnectAttempts})...`);

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, delay);
}

// ── Send ─────────────────────────────────────────────

/**
 * Send a typed message through the WebSocket.
 * @param {string} type - Event type
 * @param {object} data - Payload
 */
export function send(type, data = {}) {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type, data, ts: Date.now() }));
    return true;
  }
  console.warn(`[WS] Cannot send '${type}' — not connected (state=${state})`);
  return false;
}

// ── Status Queries ──────────────────────────────────

/** Get current connection state. */
export function getState() {
  return state;
}

/** Get measured latency in ms. */
export function getLatency() {
  return latency;
}

/** Get number of missed heartbeats. */
export function getMissedHeartbeats() {
  return missedHeartbeats;
}

/**
 * Get connection quality: excellent | good | poor | critical
 */
export function getConnectionQuality() {
  if (state !== ConnectionState.CONNECTED) return 'critical';
  if (missedHeartbeats >= 2) return 'critical';
  if (latency > 500 || missedHeartbeats >= 1) return 'poor';
  if (latency > 200) return 'good';
  return 'excellent';
}

/** Check if connected and authenticated. */
export function isConnected() {
  return state === ConnectionState.CONNECTED;
}

// ── Default Export ───────────────────────────────────
const websocketManager = {
  connect,
  disconnect,
  send,
  on,
  off,
  onStateChange,
  getState,
  getLatency,
  getMissedHeartbeats,
  getConnectionQuality,
  isConnected,
  ConnectionState,
};

export default websocketManager;
