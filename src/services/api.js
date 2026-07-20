/**
 * Real API service layer — replaces mockApi.js with actual HTTP calls.
 * Every function has the SAME signature and return shape as mockApi.js.
 */

const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

// ── Helpers ──────────────────────────────────────────
function getToken() {
  try {
    const stored = JSON.parse(localStorage.getItem('nova-link-auth') || '{}');
    return stored?.state?.user?.token || null;
  } catch {
    return null;
  }
}

function authHeaders() {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: authHeaders(),
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Auth ──────────────────────────────────────────────
export async function loginUser(email, password) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function registerUser(email, password, name = 'User') {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, name }),
  });
}

// ── Devices ───────────────────────────────────────────
export async function fetchDevices() {
  return request('/devices');
}

// ── Files ─────────────────────────────────────────────
export async function fetchFiles(path = '/') {
  return request(`/files?path=${encodeURIComponent(path)}`);
}

export async function fetchDrives() {
  return request('/files/drives');
}

export async function fetchTransfers() {
  return request('/files/transfers');
}

export async function uploadFile(fileName) {
  // For now, simulate upload via POST (real file upload requires FormData)
  const formData = new FormData();
  const blob = new Blob([''], { type: 'application/octet-stream' });
  formData.append('file', blob, fileName);

  const token = getToken();
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}/files/upload`, {
    method: 'POST',
    headers,
    body: formData,
  });
  if (!res.ok) throw new Error('Upload failed');
  return res.json();
}

export async function deleteFile(fileId) {
  return request(`/files/${fileId}`, { method: 'DELETE' });
}

export async function downloadFile(fileName) {
  return request(`/files/download/${encodeURIComponent(fileName)}`);
}

// ── Apps ──────────────────────────────────────────────
export async function fetchApps() {
  return request('/apps');
}

export async function launchApp(appId) {
  return request(`/apps/${appId}/launch`, { method: 'POST' });
}

// ── Activity ──────────────────────────────────────────
export async function fetchActivity() {
  return request('/activity');
}

export async function clearActivity() {
  return request('/activity', { method: 'DELETE' });
}

// ── Notifications ─────────────────────────────────────
export async function fetchNotifications() {
  return request('/notifications');
}

// ── System Metrics ────────────────────────────────────
export async function fetchSystemMetrics() {
  return request('/system');
}

// ── Settings ──────────────────────────────────────────
export async function fetchSettings() {
  return request('/settings');
}

export async function saveSettings(settings) {
  return request('/settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
}

// ── Power Actions ─────────────────────────────────────
export async function executePowerAction(action) {
  return request(`/power/${action}`, { method: 'POST' });
}

// ── Session ───────────────────────────────────────────
export async function startRemoteSession(deviceId) {
  return request(`/session/connect?device_id=${deviceId}`, { method: 'POST' });
}

export async function endRemoteSession(sessionId) {
  return request(`/session/disconnect?session_id=${sessionId}`, { method: 'POST' });
}

// ── Device Pairing ────────────────────────────────────
export async function pairDevice(deviceInfo) {
  const params = new URLSearchParams({
    name: deviceInfo.name || 'New Device',
    type: deviceInfo.type || 'phone',
    os: deviceInfo.os || 'Unknown',
  });
  return request(`/devices/pair?${params}`, { method: 'POST' });
}
