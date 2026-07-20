import React from 'react';
import { ToggleLeft, ToggleRight, RefreshCw, Smartphone, Globe, Clock, Lock, RotateCw, Power, Moon } from 'lucide-react';
import RadialGauge from '../ui/RadialGauge';
import { devices, activityLogs, systemMetrics } from '../../data/mockData';

export default function DashboardWindow() {
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
              <span className="text-sm font-bold text-white mt-1 block">{systemMetrics.uptime}</span>
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
              <button className="text-blue-500 hover:text-blue-400 cursor-pointer">
                <ToggleRight size={28} />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-950 border border-slate-900 p-3 rounded-lg">
                <span className="text-[9px] text-slate-500 uppercase tracking-wider block">Your ID</span>
                <span className="text-sm font-bold text-blue-400 tracking-wide font-mono mt-0.5 block">784 512 963</span>
              </div>
              <div className="bg-slate-950 border border-slate-900 p-3 rounded-lg relative">
                <span className="text-[9px] text-slate-500 uppercase tracking-wider block font-semibold">One-time Password</span>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-sm font-bold text-white tracking-wider font-mono">7K4L9P</span>
                  <RefreshCw size={12} className="text-slate-500 cursor-pointer hover:text-slate-300" />
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
              <button className="text-[10px] text-blue-400 font-semibold hover:underline">View All</button>
            </div>
            
            <div className="space-y-2.5">
              {devices.pairedDevices.map((dev) => (
                <div key={dev.id} className="flex items-center justify-between p-2 hover:bg-slate-900/30 rounded-lg">
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
                </div>
              ))}
            </div>
          </div>

          {/* System Overview */}
          <div className="bg-slate-900/20 border border-slate-900 rounded-xl p-4">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">System Overview</h4>
            <div className="grid grid-cols-4 gap-1.5">
              <RadialGauge value={23} label="CPU" color="blue" />
              <RadialGauge value={45} label="RAM" color="purple" />
              <RadialGauge value={62} label="Disk" color="cyan" />
              <RadialGauge value={78} label="Battery" color="green" />
            </div>
            <div className="mt-4 pt-3 border-t border-slate-900/80 flex items-center justify-between text-[9px] text-slate-500 font-mono">
              <span>{systemMetrics.cpu.model}</span>
              <span>{systemMetrics.ram.used} / {systemMetrics.ram.total}</span>
              <span>{systemMetrics.disk.used} / {systemMetrics.disk.total}</span>
              <span>{systemMetrics.battery.status}</span>
            </div>
          </div>
        </div>

        {/* Col 3: Live Activity & Quick Actions */}
        <div className="space-y-5">
          {/* Live Activity */}
          <div className="bg-slate-900/20 border border-slate-900 rounded-xl p-4">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Live Activity</h4>
              <button className="text-[10px] text-blue-400 font-semibold hover:underline">View All</button>
            </div>
            
            <div className="space-y-3">
              {activityLogs.slice(0, 4).map((log) => (
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
              <button className="flex flex-col items-center justify-center p-3.5 bg-purple-600/10 hover:bg-purple-600/20 border border-purple-500/20 rounded-xl text-purple-400 hover:text-purple-300 transition-colors cursor-pointer">
                <Lock size={18} className="mb-1.5" />
                <span className="text-[10px] font-semibold">Lock</span>
              </button>
              <button className="flex flex-col items-center justify-center p-3.5 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/20 rounded-xl text-blue-400 hover:text-blue-300 transition-colors cursor-pointer">
                <RotateCw size={18} className="mb-1.5" />
                <span className="text-[10px] font-semibold">Restart</span>
              </button>
              <button className="flex flex-col items-center justify-center p-3.5 bg-rose-600/10 hover:bg-rose-600/20 border border-rose-500/20 rounded-xl text-rose-400 hover:text-rose-300 transition-colors cursor-pointer">
                <Power size={18} className="mb-1.5" />
                <span className="text-[10px] font-semibold">Power</span>
              </button>
              <button className="flex flex-col items-center justify-center p-3.5 bg-orange-600/10 hover:bg-orange-600/20 border border-orange-500/20 rounded-xl text-orange-400 hover:text-orange-300 transition-colors cursor-pointer">
                <Moon size={18} className="mb-1.5" />
                <span className="text-[10px] font-semibold">Sleep</span>
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
