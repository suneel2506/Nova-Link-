/**
 * useWebSocket — Subscribe to WebSocket events with automatic cleanup.
 *
 * Usage:
 *   useWebSocket('system_updated', (data) => { ... });
 *   useWebSocket(['device_connected', 'device_disconnected'], (data) => { ... });
 */

import { useEffect } from 'react';
import websocketManager from '../services/websocketManager';

export default function useWebSocket(events, callback) {
  useEffect(() => {
    if (!callback) return;

    const eventList = Array.isArray(events) ? events : [events];
    const unsubs = eventList.map((event) => websocketManager.on(event, callback));

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, [events, callback]);
}
