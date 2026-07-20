import React, { useEffect, useState } from 'react';
import { ToggleLeft, ToggleRight, RefreshCw, Smartphone, Globe, Clock, Lock, RotateCw, Power, Moon } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import RadialGauge from '../ui/RadialGauge';
import ConfirmModal from '../ui/ConfirmModal';
import useDeviceStore from '../../stores/deviceStore';
import useSystemStore from '../../stores/systemStore';
import useSettingsStore from '../../stores/settingsStore';
import { generateOTP } from '../../utils/helpers';
import activityData from '../../data/activity.json';
import { executePowerAction } from '../../services/api';

export default function DashboardWindow() {
  const { pairedDevices, fetchDevices } = useDeviceStore();
  const { metrics, startPolling, stopPolling } = useSystemStore();
  const { security, updateSetting } = useSettingsStore();
  const [otp, setOtp] = useState('7K4L9P');
  const [remoteAccess, setRemoteAccess] = useState(true);
  const [powerModal, setPowerModal] = useState(null);

  useEffect(() => {
    fetchDevices();
    startPolling(3000);
    return () => stopPolling();
  }, []);

  const refreshOtp = () => {
    const newOtp = generateOTP();
    setOtp(newOtp);
    toast.success('OTP refreshed');
  };

  const toggleRemoteAccess = () => {
    const newVal = !remoteAccess;
    setRemoteAccess(newVal);
    updateSetting('security', 'allowRemoteAccess', newVal);
    toast(newVal ? 'Remote access enabled' : 'Remote access disabled', { icon: newVal ? '🔓' : '🔒' });
  };

  const quickActions = [
    { id: 'lock', name: 'Lock', icon: Lock, color: 'bg-purple-600/10 hover:bg-purple-600/20 border-purple-500/20 text-purple-400 hover:text-purple-300', variant: 'info' },
    { id: 'restart', name: 'Restart', icon: RotateCw, color: 'bg-blue-600/10 hover:bg-blue-600/20 border-blue-500/20 text-blue-400 hover:text-blue-300', variant: 'warning' },
    { id: 'shutdown', name: 'Power', icon: Power, color: 'bg-rose-600/10 hover:bg-rose-600/20 border-rose-500/20 text-rose-400 hover:text-rose-300', variant: 'danger' },
    { id: 'sleep', name: 'Sleep', icon: Moon, color: 'bg-orange-600/10 hover:bg-orange-600/20 border-orange-500/20 text-orange-400 hover:text-orange-300', variant: 'info' },
  ];

  const handlePowerConfirm = async () => {
    if (!powerModal) return;
    try {
      await executePowerAction(powerModal.id);
      toast.success(`${powerModal.name} command sent`);
    } catch {
      toast.error('Action failed');
    }
    setPowerModal(null);
  };

  const cpu = metrics?.cpu?.usage ?? 23;
  const ram = metrics?.ram?.usage ?? 45;
  const disk = metrics?.disk?.usage ?? 62;
  const battery = metrics?.battery?.level ?? 78;
  const uptime = metrics?.uptime ?? '2h 48m';
  const cpuModel = metrics?.cpu?.model ?? 'Intel i5-1135G7';
  const ramUsed = metrics?.ram?.used ?? '7.2 GB';
  const ramTotal = metrics?.ram?.total ?? '16 GB';
  const diskUsed = metrics?.disk?.used ?? '312 GB';
  const diskTotal = metrics?.disk?.total ?? '512 GB';
  const batteryStatus = metrics?.battery?.status ?? 'Charging';

  return (
    <div className="bg-slate-950/80 border border-slate-900 rounded-2xl overflow-hidden font-sans w-full shadow-2xl">
      {/* Title bar */}
      <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-900 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-white text-sm font-bold tracking-wide">Dashboard</span>
        </div>
        {/* Window actions */}
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-slate-800"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-slate-800"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-slate-800"></div>
        </div>
      </div>

      {/* Grid Content */}
      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Col 1: System Status & Access */}
        <div className="space-y-5">
          {/* Status Header */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-900/35 border border-slate-900/60 rounded-xl p-3.5">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">Status</span>
              <span className="text-sm font-bold text-green-400 mt-1 block flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> Online
              </span>
              <span className="text-[9px] text-slate-400 mt-0.5 block">Your device is accessible</span>
            </div>
            
            <div className="bg-slate-900/35 border border-slate-900/60 rounded-xl p-3.5">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">Device Name</span>
              <span className="text-sm font-bold text-white mt-1 block truncate">My Laptop</span>
              <span className="text-[9px] text-slate-400 mt-0.5 block">Windows 11 Pro</span>
            </div>

            <div className="bg-slate-900/35 border border-slate-900/60 rounded-xl p-3.5">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">Uptime</span>
              <motion.span className="text-sm font-bold text-white mt-1 block" key={uptime}>{uptime}</motion.span>
              <span className="text-[9px] text-slate-400 mt-0.5 block">Since last boot</span>
            </div>

            <div className="bg-slate-900/35 border border-slate-900/60 rounded-xl p-3.5">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">Agent Version</span>
              <span className="text-sm font-bold text-white mt-1 block">1.0.0</span>
              <span className="text-[9px] text-slate-400 mt-0.5 block text-blue-400 font-semibold">Latest version</span>
            </div>
          </div>

          {/* Remote Access Credentials */}
          <div className="bg-slate-900/20 border border-slate-900 rounded-xl p-4 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-300">Allow Remote Access</span>
              <motion.button
                onClick={toggleRemoteAccess}
                className={`cursor-pointer ${remoteAccess ? 'text-blue-500 hover:text-blue-400' : 'text-slate-600 hover:text-slate-500'}`}
                whileTap={{ scale: 0.9 }}
                aria-label="Toggle remote access"
              >
                {remoteAccess ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
              </motion.button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-950 border border-slate-900 p-3 rounded-lg">
                <span className="text-[9px] text-slate-500 uppercase tracking-wider block">Your ID</span>
                <span className="text-sm font-bold text-blue-400 tracking-wide font-mono mt-0.5 block">784 512 963</span>
              </div>
              <div className="bg-slate-950 border border-slate-900 p-3 rounded-lg relative">
                <span className="text-[9px] text-slate-500 uppercase tracking-wider block font-semibold">One-time Password</span>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-sm font-bold text-white tracking-wider font-mono">{otp}</span>
                  <motion.button
                    onClick={refreshOtp}
                    whileTap={{ scale: 0.9, rotate: 180 }}
                    className="cursor-pointer"
                    aria-label="Refresh OTP"
                  >
                    <RefreshCw size={12} className="text-slate-500 hover:text-slate-300" />
                  </motion.button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Col 2: Connected Devices & System Overview */}
        <div className="space-y-5">
          {/* Connected Devices */}
          <div className="bg-slate-900/20 border border-slate-900 rounded-xl p-4">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Connected Devices</h4>
              <button className="text-[10px] text-blue-400 font-semibold hover:underline cursor-pointer" onClick={() => toast('Navigating to devices', { icon: '📱' })}>View All</button>
            </div>
            
            <div className="space-y-2.5">
              {pairedDevices.map((dev) => (
                <motion.div
                  key={dev.id}
                  className="flex items-center justify-between p-2 hover:bg-slate-900/30 rounded-lg cursor-pointer"
                  whileTap={{ scale: 0.98 }}
                  onClick={() => toast(`Selected ${dev.name}`, { icon: '📱' })}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-850 flex items-center justify-center">
                      {dev.type === 'phone' ? <Smartphone size={15} className="text-blue-400" /> : <Globe size={15} className="text-emerald-400" />}
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-white block">{dev.name}</span>
                      <span className="text-[9px] text-slate-500 font-mono block mt-0.5">{dev.os}</span>
                    </div>
                  </div>
                  <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${dev.isActive ? 'bg-green-500/10 text-green-400 border border-green-500/10' : 'bg-slate-950 text-slate-500'}`}>
                    {dev.status}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* System Overview */}
          <div className="bg-slate-900/20 border border-slate-900 rounded-xl p-4">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">System Overview</h4>
            <div className="grid grid-cols-4 gap-1.5">
              <RadialGauge value={cpu} label="CPU" color="blue" />
              <RadialGauge value={ram} label="RAM" color="purple" />
              <RadialGauge value={disk} label="Disk" color="cyan" />
              <RadialGauge value={battery} label="Battery" color="green" />
            </div>
            <div className="mt-4 pt-3 border-t border-slate-900/80 flex items-center justify-between text-[9px] text-slate-500 font-mono">
              <span>{cpuModel}</span>
              <span>{ramUsed} / {ramTotal}</span>
              <span>{diskUsed} / {diskTotal}</span>
              <span>{batteryStatus}</span>
            </div>
          </div>
        </div>

        {/* Col 3: Live Activity & Quick Actions */}
        <div className="space-y-5">
          {/* Live Activity */}
          <div className="bg-slate-900/20 border border-slate-900 rounded-xl p-4">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Live Activity</h4>
              <button className="text-[10px] text-blue-400 font-semibold hover:underline cursor-pointer" onClick={() => toast('Activity log opened', { icon: '📋' })}>View All</button>
            </div>
            
            <div className="space-y-3">
              {activityData.slice(0, 4).map((log) => (
                <div key={log.id} className="flex items-start gap-2.5 text-[11px]">
                  <Clock size={12} className="text-slate-500 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <span className="text-slate-300 font-medium block leading-normal">{log.description}</span>
                  </div>
                  <span className="text-[9px] text-slate-500 font-mono shrink-0">{log.time}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-slate-900/20 border border-slate-900 rounded-xl p-4">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">Quick Actions</h4>
            <div className="grid grid-cols-4 gap-2">
              {quickActions.map((action) => {
                const IconComp = action.icon;
                return (
                  <motion.button
                    key={action.id}
                    onClick={() => setPowerModal(action)}
                    className={`flex flex-col items-center justify-center p-3.5 border rounded-xl transition-colors cursor-pointer ${action.color}`}
                    whileTap={{ scale: 0.9 }}
                    aria-label={action.name}
                  >
                    <IconComp size={18} className="mb-1.5" />
                    <span className="text-[10px] font-semibold">{action.name}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>

      </div>

      {/* Power Action Confirmation */}
      <ConfirmModal
        isOpen={!!powerModal}
        title={`Confirm ${powerModal?.name || ''}`}
        message={`Are you sure you want to ${(powerModal?.name || '').toLowerCase()} the host machine?`}
        confirmLabel={powerModal?.name || 'Confirm'}
        variant={powerModal?.variant || 'info'}
        onConfirm={handlePowerConfirm}
        onCancel={() => setPowerModal(null)}
      />
    </div>
  );
}
