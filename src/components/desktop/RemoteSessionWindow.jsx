import React from 'react';
import { Play, Tv, Pin, Keyboard, Mouse, Folder, Mic, Volume2, Settings, Power, ShieldAlert, Smartphone } from 'lucide-react';

export default function RemoteSessionWindow() {
  const sidebarApps = [
    { label: 'This PC', icon: '💻' },
    { label: 'Chrome', icon: '🌐' },
    { label: 'VS Code', icon: '📝' },
    { label: 'Folder', icon: '📁' },
    { label: 'Apps', icon: '⚙️' },
  ];

  return (
    <div className="bg-slate-950/80 border border-slate-900 rounded-2xl overflow-hidden font-sans w-full shadow-2xl">
      {/* Title bar */}
      <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-900 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Smartphone size={14} className="text-blue-400" />
          <span className="text-white text-xs font-semibold tracking-wide">
            Remote Session <span className="text-slate-500 font-normal">(Connected to My Phone • 192.168.1.14)</span>
          </span>
        </div>
        {/* Window controls */}
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-slate-800"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-slate-800"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-slate-800"></div>
        </div>
      </div>

      {/* Screen Container */}
      <div className="relative h-[340px] bg-[#101b35] flex items-center justify-center select-none overflow-hidden p-4">
        
        {/* Windows 11 Bloom Wallpaper background */}
        <div className="absolute inset-0 bg-radial-gradient from-blue-600/30 via-indigo-950 to-slate-950 flex items-center justify-center">
          {/* Glowing circles */}
          <div className="absolute w-[360px] h-[360px] bg-blue-500/20 rounded-full blur-[100px]"></div>
          <div className="absolute w-[240px] h-[240px] bg-purple-500/20 rounded-full blur-[80px]"></div>
          
          {/* Stylized geometric bloom layers */}
          <div className="absolute w-[180px] h-[180px] bg-sky-400/10 rounded-3xl blur-2xl transform rotate-12"></div>
          <div className="absolute w-[140px] h-[140px] bg-blue-400/20 rounded-3xl blur-xl transform -rotate-45"></div>
        </div>

        {/* Pinned Desktop Apps Sidebar (Left) */}
        <div className="absolute left-4 top-4 bottom-4 w-12 bg-slate-950/40 border border-white/5 rounded-xl backdrop-blur-md flex flex-col items-center gap-4 py-4 z-10">
          {sidebarApps.map((app, idx) => (
            <div key={idx} className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center cursor-pointer text-base" title={app.label}>
              {app.icon}
            </div>
          ))}
        </div>

        {/* Floating Toolbar (Top) */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-950/90 border border-slate-800/80 rounded-2xl px-5 py-2.5 flex items-center gap-4.5 shadow-2xl backdrop-blur-lg z-10">
          <button className="text-slate-400 hover:text-white p-1 hover:bg-slate-900 rounded-lg cursor-pointer" title="Switch Display">
            <Tv size={15} />
          </button>
          <button className="text-slate-400 hover:text-white p-1 hover:bg-slate-900 rounded-lg cursor-pointer" title="Pin Session">
            <Pin size={15} />
          </button>
          <div className="w-[1px] h-4 bg-slate-800"></div>
          <button className="text-slate-400 hover:text-white p-1 hover:bg-slate-900 rounded-lg cursor-pointer" title="Virtual Keyboard">
            <Keyboard size={15} />
          </button>
          <button className="text-slate-400 hover:text-white p-1 hover:bg-slate-900 rounded-lg cursor-pointer" title="Virtual Mouse">
            <Mouse size={15} />
          </button>
          <button className="text-slate-400 hover:text-white p-1 hover:bg-slate-900 rounded-lg cursor-pointer" title="File System">
            <Folder size={15} />
          </button>
          <div className="w-[1px] h-4 bg-slate-800"></div>
          <button className="text-slate-400 hover:text-white p-1 hover:bg-slate-900 rounded-lg cursor-pointer" title="Toggle Mic">
            <Mic size={15} />
          </button>
          <button className="text-slate-400 hover:text-white p-1 hover:bg-slate-900 rounded-lg cursor-pointer" title="Toggle Audio">
            <Volume2 size={15} />
          </button>
          <button className="text-slate-400 hover:text-white p-1 hover:bg-slate-900 rounded-lg cursor-pointer" title="Session Settings">
            <Settings size={15} />
          </button>
          <button className="text-rose-500 hover:text-rose-400 p-1.5 bg-rose-500/10 hover:bg-rose-500/20 rounded-lg cursor-pointer ml-1" title="Disconnect Session">
            <Power size={14} className="stroke-[2.5]" />
          </button>
        </div>

        {/* Windows Pinned Taskbar (Bottom Centered) */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-48 h-8 bg-slate-950/70 border border-white/5 rounded-xl backdrop-blur-md flex items-center justify-center gap-3 px-3 z-10">
          <div className="w-3.5 h-3.5 grid grid-cols-2 gap-[1px]">
            <div className="bg-[#0078d4]"></div>
            <div className="bg-[#0078d4]"></div>
            <div className="bg-[#0078d4]"></div>
            <div className="bg-[#0078d4]"></div>
          </div>
          <div className="w-2.5 h-2.5 bg-yellow-500 rounded-sm"></div>
          <div className="w-2.5 h-2.5 bg-blue-500 rounded-sm"></div>
          <div className="w-2.5 h-2.5 bg-purple-500 rounded-sm"></div>
          <div className="w-2.5 h-2.5 bg-emerald-500 rounded-sm"></div>
        </div>

        {/* Connection Status Card (Bottom Right Floating) */}
        <div className="absolute bottom-4 right-4 bg-slate-950/90 border border-slate-800/80 rounded-xl p-3 flex items-center gap-3.5 shadow-xl backdrop-blur-lg z-10">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
            <Smartphone size={16} className="text-blue-400" />
          </div>
          <div className="pr-2">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">Connected</span>
            <span className="text-xs font-bold text-white block mt-0.5">My Phone</span>
            <span className="text-[9px] text-slate-400 font-mono block mt-0.5">192.168.1.14</span>
          </div>
        </div>

      </div>
    </div>
  );
}
