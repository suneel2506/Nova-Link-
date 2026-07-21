/**
 * useConnectionStatus — Read connection state from the connectionStore.
 *
 * Usage:
 *   const { state, latency, quality, statusText } = useConnectionStatus();
 */

import useConnectionStore from '../stores/connectionStore';

export default function useConnectionStatus() {
  const connectionState = useConnectionStore((s) => s.connectionState);
  const latency = useConnectionStore((s) => s.latency);
  const connectionQuality = useConnectionStore((s) => s.connectionQuality);
  const missedHeartbeats = useConnectionStore((s) => s.missedHeartbeats);
  const lastConnected = useConnectionStore((s) => s.lastConnected);
  const getStatus = useConnectionStore((s) => s.getStatus);

  return {
    state: connectionState,
    latency,
    quality: connectionQuality,
    missedHeartbeats,
    lastConnected,
    statusText: getStatus(),
    isConnected: connectionState === 'connected',
    isReconnecting: connectionState === 'reconnecting',
  };
}
