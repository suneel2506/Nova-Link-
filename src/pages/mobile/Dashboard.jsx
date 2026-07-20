import React from 'react';
import { Search, Monitor, Mouse, Keyboard, Folder, Grid, Terminal, Cpu, Film, Power } from 'lucide-react';
import RadialGauge from '../../components/ui/RadialGauge';
import BottomNavigation from '../../components/BottomNavigation';

export default function Dashboard({ onNavigate, setScreen }) {
  const tiles = [
    { id: 'live', name: 'Live Screen', icon: Monitor, color: 'bg-indigo-600/10 text-indigo-400 border-indigo-500/20' },
    { id: 'trackpad', name: 'Trackpad', icon: Mouse, color: 'bg-emerald-600/10 text-emerald-400 border-emerald-500/20' },
    { id: 'keyboard', name: 'Keyboard', icon: Keyboard, color: 'bg-blue-600/10 text-blue-400 border-blue-500/20' },
    { id: 'files', name: 'Files', icon: Folder, color: 'bg-amber-600/10 text-amber-400 border-amber-500/20' },
    { id: 'apps', name: 'Apps', icon: Grid, color: 'bg-pink-600/10 text-pink-400 border-pink-500/20' },
    { id: 'terminal', name: 'Terminal', icon: Terminal, color: 'bg-slate-600/10 text-slate-400 border-slate-500/20' },
    { id: 'system', name: 'System', icon: Cpu, color: 'bg-cyan-600/10 text-cyan-400 border-cyan-500/20' },
    { id: 'media', name: 'Media', icon: Film, color: 'bg-orange-600/10 text-orange-400 border-orange-500/20' },
    { id: 'power', name: 'Power', icon: Power, color: 'bg-rose-600/10 text-rose-400 border-rose-500/20' },
  ];

  return (
    <div className="flex-1 flex flex-col justify-between overflow-hidden bg-[#070b13]">
      {/* Header */}
      <div className="px-5 py-3 flex items-center justify-between border-b border-slate-900/50 shrink-0">
        <div className="flex items-center gap-2">
          {/* Logo Icon */}
          <div className="w-5 h-6">
            <svg viewBox="0 0 100 115" className="w-full h-full" fill="none">
              <linearGradient id="headerLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#7c3aed" />
              </linearGradient>
              <path d="M50 0 L100 28.87 L100 86.6 L50 115.47 L0 86.6 L0 28.87 Z" fill="url(#headerLogoGrad)" />
              <path d="M30 30 L45 30 L70 70 L70 30 L80 30 L80 85 L65 85 L40 45 L40 85 L30 85 Z" fill="#ffffff" />
            </svg>
          </div>
          <span className="text-white text-sm font-bold tracking-wider">NOVA LINK</span>
        </div>
        <button className="text-slate-400 hover:text-white p-1 rounded-lg bg-slate-900/40 border border-slate-800/40">
          <Search size={16} />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {/* Device Card */}
        <div 
          onClick={() => onNavigate('live')}
          className="relative h-28 rounded-2xl overflow-hidden cursor-pointer border border-blue-500/20 shadow-lg shadow-blue-950/20 flex flex-col justify-end p-4 group active:scale-[0.98] transition-transform duration-100"
        >
          {/* Wallpaper background gradient (Windows bloom emulation) */}
          <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-blue-900 to-indigo-950 group-hover:opacity-95 transition-opacity">
            <div className="absolute top-1/2 left-1/2 w-48 h-48 -translate-x-1/2 -translate-y-1/2 bg-blue-500/20 rounded-full blur-3xl"></div>
          </div>
          
          <div className="relative z-10 flex justify-between items-end">
            <div>
              <h3 className="text-white text-sm font-bold tracking-wide">My Laptop</h3>
              <p className="text-slate-400 text-[10px] mt-0.5">Windows 11 Pro</p>
              <p className="text-slate-500 text-[9px] mt-0.5 font-mono">192.168.1.10</p>
            </div>
            
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
              <span className="text-green-400 text-[9px] font-semibold uppercase tracking-wider">Online</span>
            </div>
          </div>
        </div>

        {/* Actions Grid */}
        <div className="grid grid-cols-3 gap-2.5">
          {tiles.map((tile) => {
            const Icon = tile.icon;
            return (
              <button
                key={tile.id}
                onClick={() => onNavigate(tile.id)}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border border-transparent cursor-pointer active:scale-95 transition-all duration-100 ${tile.color}`}
              >
                <Icon size={20} className="mb-1.5 stroke-[2]" />
                <span className="text-[10px] font-medium text-slate-300 text-center tracking-wide">{tile.name}</span>
              </button>
            );
          })}
        </div>

        {/* System Overview */}
        <div 
          onClick={() => onNavigate('system')}
          className="bg-slate-900/40 border border-slate-900 rounded-2xl p-4 cursor-pointer hover:bg-slate-900/50"
        >
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">System Overview</h4>
            <span className="text-[10px] text-blue-400 font-semibold hover:underline">Detail &gt;</span>
          </div>
          <div className="grid grid-cols-4 gap-1">
            <RadialGauge value={23} label="CPU" color="blue" />
            <RadialGauge value={45} label="RAM" color="purple" />
            <RadialGauge value={76} label="Battery" color="green" />
            <RadialGauge value={62} label="Storage" color="cyan" />
          </div>
        </div>
      </div>

      {/* Bottom Nav */}
      <BottomNavigation activeTab="dashboard" onChange={setScreen} />
    </div>
  );
}
