/**
 * Nova Link — Centralized Axios API Client.
 *
 * Features:
 *   - Automatic JWT attachment
 *   - Automatic token refresh on 401
 *   - Retry failed request after refresh
 *   - Proper error extraction
 *   - Consistent API for all services
 */

import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

// ── Token Helpers ───────────────────────────────────

function getAuthState() {
  try {
    const stored = JSON.parse(localStorage.getItem('nova-link-auth') || '{}');
    return stored?.state || {};
  } catch {
    return {};
  }
}

function getToken() {
  return getAuthState()?.user?.token || null;
}

function getRefreshToken() {
  return getAuthState()?.user?.refresh_token || null;
}

function updateStoredTokens(token, refreshToken) {
  try {
    const stored = JSON.parse(localStorage.getItem('nova-link-auth') || '{}');
    if (stored.state?.user) {
      stored.state.user.token = token;
      stored.state.user.refresh_token = refreshToken;
      localStorage.setItem('nova-link-auth', JSON.stringify(stored));
    }
  } catch {
    // Silent fail
  }
}

function clearStoredAuth() {
  localStorage.removeItem('nova-link-auth');
}

// ── Axios Instance ──────────────────────────────────

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// ── Request Interceptor: Attach JWT ─────────────────

api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response Interceptor: Token Refresh ─────────────

let isRefreshing = false;
let failedQueue = [];

function processQueue(error, token = null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  failedQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Only attempt refresh on 401 and not on auth endpoints
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/register') &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      if (isRefreshing) {
        // Queue this request until the refresh completes
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        isRefreshing = false;
        clearStoredAuth();
        window.dispatchEvent(new CustomEvent('auth:expired'));
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });

        const newToken = data.token;
        const newRefresh = data.refresh_token;

        updateStoredTokens(newToken, newRefresh);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;

        processQueue(null, newToken);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearStoredAuth();
        window.dispatchEvent(new CustomEvent('auth:expired'));
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ── Error Extractor ─────────────────────────────────

function extractError(error) {
  if (error.response?.data?.detail) {
    const detail = error.response.data.detail;
    // Pydantic validation errors come as an array
    if (Array.isArray(detail)) {
      return detail.map((d) => d.msg || d.message || JSON.stringify(d)).join('; ');
    }
    return detail;
  }
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.message === 'Network Error') {
    return 'Unable to connect to server';
  }
  if (error.code === 'ECONNABORTED') {
    return 'Request timed out';
  }
  return error.message || 'An unexpected error occurred';
}

// ── Auth ─────────────────────────────────────────────

export async function loginUser(email, password) {
  try {
    const { data } = await api.post('/auth/login', { email, password });
    return data;
  } catch (error) {
    throw new Error(extractError(error));
  }
}

export async function registerUser(email, password, name = 'User') {
  try {
    const { data } = await api.post('/auth/register', { email, password, name });
    return data;
  } catch (error) {
    throw new Error(extractError(error));
  }
}

export async function refreshUserToken(refreshToken) {
  try {
    const { data } = await api.post('/auth/refresh', { refresh_token: refreshToken });
    return data;
  } catch (error) {
    throw new Error(extractError(error));
  }
}

export async function logoutUser() {
  try {
    const { data } = await api.post('/auth/logout');
    return data;
  } catch (error) {
    throw new Error(extractError(error));
  }
}

export async function fetchCurrentUser() {
  try {
    const { data } = await api.get('/auth/me');
    return data;
  } catch (error) {
    throw new Error(extractError(error));
  }
}

// ── Devices ──────────────────────────────────────────

export async function fetchDevices() {
  try {
    const { data } = await api.get('/devices');
    return data;
  } catch (error) {
    throw new Error(extractError(error));
  }
}

export async function pairDevice(deviceInfo) {
  try {
    const params = new URLSearchParams({
      name: deviceInfo.name || 'New Device',
      type: deviceInfo.type || 'phone',
      os: deviceInfo.os || 'Unknown',
    });
    const { data } = await api.post(`/devices/pair?${params}`);
    return data;
  } catch (error) {
    throw new Error(extractError(error));
  }
}

// ── Files ────────────────────────────────────────────

export async function fetchFiles(path = '/') {
  try {
    const { data } = await api.get(`/files?path=${encodeURIComponent(path)}`);
    return data;
  } catch (error) {
    throw new Error(extractError(error));
  }
}

export async function fetchDrives() {
  try {
    const { data } = await api.get('/files/drives');
    return data;
  } catch (error) {
    throw new Error(extractError(error));
  }
}

export async function fetchTransfers() {
  try {
    const { data } = await api.get('/files/transfers');
    return data;
  } catch (error) {
    throw new Error(extractError(error));
  }
}

export async function uploadFile(fileName) {
  try {
    const formData = new FormData();
    const blob = new Blob([''], { type: 'application/octet-stream' });
    formData.append('file', blob, fileName);

    const { data } = await api.post('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  } catch (error) {
    throw new Error(extractError(error));
  }
}

export async function deleteFile(fileId) {
  try {
    const { data } = await api.delete(`/files/${fileId}`);
    return data;
  } catch (error) {
    throw new Error(extractError(error));
  }
}

export async function downloadFile(fileName) {
  try {
    const { data } = await api.get(`/files/download/${encodeURIComponent(fileName)}`);
    return data;
  } catch (error) {
    throw new Error(extractError(error));
  }
}

// ── Apps ─────────────────────────────────────────────

export async function fetchApps() {
  try {
    const { data } = await api.get('/apps');
    return data;
  } catch (error) {
    throw new Error(extractError(error));
  }
}

export async function launchApp(appId) {
  try {
    const { data } = await api.post(`/apps/${appId}/launch`);
    return data;
  } catch (error) {
    throw new Error(extractError(error));
  }
}

// ── Activity ─────────────────────────────────────────

export async function fetchActivity() {
  try {
    const { data } = await api.get('/activity');
    return data;
  } catch (error) {
    throw new Error(extractError(error));
  }
}

export async function clearActivity() {
  try {
    const { data } = await api.delete('/activity');
    return data;
  } catch (error) {
    throw new Error(extractError(error));
  }
}

// ── Notifications ────────────────────────────────────

export async function fetchNotifications() {
  try {
    const { data } = await api.get('/notifications');
    return data;
  } catch (error) {
    throw new Error(extractError(error));
  }
}

// ── System Metrics ───────────────────────────────────

export async function fetchSystemMetrics() {
  try {
    const { data } = await api.get('/system');
    return data;
  } catch (error) {
    throw new Error(extractError(error));
  }
}

// ── Settings ─────────────────────────────────────────

export async function fetchSettings() {
  try {
    const { data } = await api.get('/settings');
    return data;
  } catch (error) {
    throw new Error(extractError(error));
  }
}

export async function saveSettings(settings) {
  try {
    const { data } = await api.put('/settings', settings);
    return data;
  } catch (error) {
    throw new Error(extractError(error));
  }
}

// ── Power Actions ────────────────────────────────────

export async function executePowerAction(action) {
  try {
    const { data } = await api.post(`/power/${action}`);
    return data;
  } catch (error) {
    throw new Error(extractError(error));
  }
}

// ── Session ──────────────────────────────────────────

export async function startRemoteSession(deviceId) {
  try {
    const { data } = await api.post(`/session/connect?device_id=${deviceId}`);
    return data;
  } catch (error) {
    throw new Error(extractError(error));
  }
}

export async function endRemoteSession(sessionId) {
  try {
    const { data } = await api.post(`/session/disconnect?session_id=${sessionId}`);
    return data;
  } catch (error) {
    throw new Error(extractError(error));
  }
}

export async function createRemoteSession(desktopDeviceId, mobileDeviceId = null) {
  try {
    const { data } = await api.post('/session/create', { desktopDeviceId, mobileDeviceId });
    return data;
  } catch (error) {
    throw new Error(extractError(error));
  }
}

export async function getSessionStatus() {
  try {
    const { data } = await api.get('/session/status');
    return data;
  } catch (error) {
    throw new Error(extractError(error));
  }
}

export async function getActiveSessions() {
  try {
    const { data } = await api.get('/session/active');
    return data;
  } catch (error) {
    throw new Error(extractError(error));
  }
}

export async function getSessionById(sessionId) {
  try {
    const { data } = await api.get(`/session/${sessionId}`);
    return data;
  } catch (error) {
    throw new Error(extractError(error));
  }
}

export async function sendSessionHeartbeat(sessionId, source = 'mobile') {
  try {
    const { data } = await api.post('/session/heartbeat', { sessionId, source });
    return data;
  } catch (error) {
    throw new Error(extractError(error));
  }
}

export async function restoreRemoteSession(sessionId) {
  try {
    const { data } = await api.post('/session/restore', { sessionId });
    return data;
  } catch (error) {
    throw new Error(extractError(error));
  }
}

export async function acceptSession(sessionId) {
  try {
    const { data } = await api.post('/session/accept', { sessionId });
    return data;
  } catch (error) {
    throw new Error(extractError(error));
  }
}

export async function rejectSession(sessionId, reason = 'rejected') {
  try {
    const { data } = await api.post('/session/reject', { sessionId, reason });
    return data;
  } catch (error) {
    throw new Error(extractError(error));
  }
}

// ── Pairing ──────────────────────────────────────────

export async function requestPairing(desktopDeviceId, mobileName = 'Mobile App') {
  try {
    const { data } = await api.post('/pairing/request', { desktopDeviceId, mobileName });
    return data;
  } catch (error) {
    throw new Error(extractError(error));
  }
}

export async function approvePairing(requestId, code = null) {
  try {
    const { data } = await api.post('/pairing/approve', { requestId, code });
    return data;
  } catch (error) {
    throw new Error(extractError(error));
  }
}

export async function rejectPairing(requestId, code = null, reason = 'denied') {
  try {
    const { data } = await api.post('/pairing/reject', { requestId, code, reason });
    return data;
  } catch (error) {
    throw new Error(extractError(error));
  }
}

export async function getPairingStatus(requestId) {
  try {
    const { data } = await api.get(`/pairing/status/${requestId}`);
    return data;
  } catch (error) {
    throw new Error(extractError(error));
  }
}

export async function getTrustedDevices() {
  try {
    const { data } = await api.get('/pairing/trusted');
    return data;
  } catch (error) {
    throw new Error(extractError(error));
  }
}

export async function removeTrustedDevice(trustId) {
  try {
    const { data } = await api.delete(`/pairing/trusted/${trustId}`);
    return data;
  } catch (error) {
    throw new Error(extractError(error));
  }
}

export async function renameTrustedDevice(trustId, nickname) {
  try {
    const { data } = await api.patch(`/pairing/trusted/${trustId}/nickname`, { nickname });
    return data;
  } catch (error) {
    throw new Error(extractError(error));
  }
}

export async function checkDeviceTrust(deviceId) {
  try {
    const { data } = await api.get(`/pairing/check/${deviceId}`);
    return data;
  } catch (error) {
    throw new Error(extractError(error));
  }
}

// Export the Axios instance for advanced usage
export default api;
