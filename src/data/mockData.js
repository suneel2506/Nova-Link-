/**
 * Re-exports mock data from JSON files for backward compatibility.
 * Existing components importing from this file continue to work.
 */
import devicesData from './devices.json';
import filesData from './files.json';
import appsRaw from './apps.json';
import activityData from './activity.json';
import systemData from './system.json';

export const devices = devicesData;

export const apps = appsRaw.apps;

export const fileSystem = {
  drives: filesData.drives,
  folders: filesData.folders['/C:'] || [],
};

export const activityLogs = activityData.slice(0, 5);

export const fileTransfers = filesData.transfers;

export const systemMetrics = {
  cpu: systemData.cpu,
  ram: systemData.ram,
  disk: systemData.disk,
  battery: systemData.battery,
  network: systemData.network,
  uptime: systemData.uptime,
};
