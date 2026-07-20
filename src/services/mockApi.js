/**
 * Mock API service layer — simulates backend calls with artificial delay.
 * Every function returns a Promise. No real network requests.
 */

import devicesData from '../data/devices.json';
import filesData from '../data/files.json';
import appsData from '../data/apps.json';
import activityData from '../data/activity.json';
import notificationsData from '../data/notifications.json';
import settingsData from '../data/settings.json';
import systemData from '../data/system.json';
import { randomBetween } from '../utils/helpers';

const delay = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms));

// ── Auth ──────────────────────────────────────────────
export async function loginUser(email, password) {
  await delay(800);
  if (!email || !password) {
    throw new Error('Email and password are required');
  }
  if (password.length < 6) {
    throw new Error('Invalid credentials');
  }
  return {
    id: 'user-1',
    name: 'User',
    email,
    token: 'mock-jwt-token-' + Date.now(),
  };
}

// ── Devices ───────────────────────────────────────────
export async function fetchDevices() {
  await delay(500);
  return JSON.parse(JSON.stringify(devicesData));
}

// ── Files ─────────────────────────────────────────────
export async function fetchFiles(path = '/') {
  await delay(400);
  const items = filesData.folders[path] || [];
  return JSON.parse(JSON.stringify(items));
}

export async function fetchDrives() {
  await delay(300);
  return JSON.parse(JSON.stringify(filesData.drives));
}

export async function fetchTransfers() {
  await delay(300);
  return JSON.parse(JSON.stringify(filesData.transfers));
}

export async function uploadFile(fileName) {
  await delay(1200);
  return { success: true, name: fileName, message: `${fileName} uploaded successfully` };
}

export async function deleteFile(fileId) {
  await delay(600);
  return { success: true, message: 'File deleted successfully' };
}

export async function downloadFile(fileName) {
  await delay(800);
  return { success: true, name: fileName, message: `${fileName} download started` };
}

// ── Apps ──────────────────────────────────────────────
export async function fetchApps() {
  await delay(400);
  return JSON.parse(JSON.stringify(appsData));
}

export async function launchApp(appId) {
  await delay(600);
  return { success: true, appId, message: 'App launched successfully' };
}

// ── Activity ──────────────────────────────────────────
export async function fetchActivity() {
  await delay(400);
  return JSON.parse(JSON.stringify(activityData));
}

export async function clearActivity() {
  await delay(300);
  return { success: true, message: 'Activity log cleared' };
}

// ── Notifications ─────────────────────────────────────
export async function fetchNotifications() {
  await delay(300);
  return JSON.parse(JSON.stringify(notificationsData));
}

// ── System Metrics ────────────────────────────────────
export async function fetchSystemMetrics() {
  await delay(200);
  const base = JSON.parse(JSON.stringify(systemData));
  // Randomize current values slightly to simulate live data
  base.cpu.usage = Math.max(5, Math.min(95, base.cpu.usage + randomBetween(-8, 8)));
  base.ram.usage = Math.max(20, Math.min(90, base.ram.usage + randomBetween(-3, 3)));
  base.ram.used = (base.ram.usage / 100 * 16).toFixed(1) + ' GB';
  base.ram.available = ((100 - base.ram.usage) / 100 * 16).toFixed(1) + ' GB';
  base.battery.level = Math.max(10, Math.min(100, base.battery.level + randomBetween(-1, 2)));
  base.network.upload = (randomBetween(5, 25)).toFixed(1) + ' Mbps';
  base.network.download = (randomBetween(3, 15)).toFixed(1) + ' Mbps';
  base.network.latency = randomBetween(8, 35) + 'ms';
  // Push to history arrays (keep last 20)
  base.history.cpu = [...base.history.cpu.slice(1), base.cpu.usage];
  base.history.ram = [...base.history.ram.slice(1), base.ram.usage];
  base.history.network = [...base.history.network.slice(1), randomBetween(10, 90)];
  return base;
}

// ── Settings ──────────────────────────────────────────
export async function fetchSettings() {
  await delay(300);
  return JSON.parse(JSON.stringify(settingsData));
}

export async function saveSettings(settings) {
  await delay(400);
  return { success: true, message: 'Settings saved', settings };
}

// ── Power Actions ─────────────────────────────────────
export async function executePowerAction(action) {
  await delay(1000);
  return { success: true, action, message: `${action} command sent successfully` };
}

// ── Session ───────────────────────────────────────────
export async function startRemoteSession(deviceId) {
  await delay(800);
  return { success: true, sessionId: 'session-' + Date.now(), deviceId };
}

export async function endRemoteSession(sessionId) {
  await delay(500);
  return { success: true, message: 'Session ended' };
}

// ── Device Pairing ────────────────────────────────────
export async function pairDevice(deviceInfo) {
  await delay(1000);
  return {
    success: true,
    device: {
      id: 'new-' + Date.now(),
      name: deviceInfo.name || 'New Device',
      type: deviceInfo.type || 'phone',
      os: deviceInfo.os || 'Unknown',
      status: 'Online',
      ip: '192.168.1.' + randomBetween(30, 99),
      isActive: true,
      lastSeen: 'Now',
    },
  };
}
