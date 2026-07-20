/**
 * Shared utility functions used across the application.
 */

/** Generate a random integer between min and max (inclusive) */
export function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Generate a unique ID */
export function generateId(prefix = 'id') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

/** Format bytes into human-readable string */
export function formatBytes(bytes, decimals = 1) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
}

/** Format milliseconds into a human-readable time string */
export function formatTime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

/** Clamp a value between min and max */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/** Capitalize first letter */
export function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/** Get file extension icon color class */
export function getFileIconColor(ext) {
  const map = {
    pdf: 'text-red-400',
    doc: 'text-blue-400',
    docx: 'text-blue-400',
    xls: 'text-green-400',
    xlsx: 'text-green-400',
    ppt: 'text-orange-400',
    pptx: 'text-orange-400',
    jpg: 'text-emerald-400',
    jpeg: 'text-emerald-400',
    png: 'text-emerald-400',
    svg: 'text-pink-400',
    zip: 'text-yellow-400',
    exe: 'text-slate-400',
    csv: 'text-teal-400',
  };
  return map[ext] || 'text-slate-400';
}

/** Generate random OTP code */
export function generateOTP() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
