import React from 'react';
import { ChevronLeft, Info, Volume2, Video, Sliders, Play, Maximize2, Monitor } from 'lucide-react';

export default function LiveScreen({ onBack }) {
  // Mock windows desktop icons
  const desktopIcons = [
    { name: 'This PC', icon: '💻' },
    { name: 'Recycle Bin', icon: '🗑️' },
    { name: 'Google Chrome', icon: '🌐' },
    { name: 'VS Code', icon: '📝' },
    { name: 'Folder', icon: '📁' },
  ];

  return (
    <div className="flex-1 flex flex-col justify-between overflow-hidden bg-black relative">
      {/* Header */}
      <div className="px-5 py-3 flex items-center justify-between bg-slate-950/80 border-b border-slate-900/50 shrink-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-slate-400 hover:text-white">
            <ChevronLeft size={20} />
          </button>
          <div>
            <span className="text-white text-sm font-semibold block">My Laptop</span>
            <span className="text-[9px] text-green-400 font-mono flex items-center gap-1">
              <span className="w-1 h-1 bg-green-500 rounded-full"></span> Live
            </span>
          </div>
        </div>
        <button className="text-slate-400 hover:text-white p-1">
          <Info size={18} />
        </button>
      </div>

      {/* Simulated Windows 11 Desktop Screen */}
      <div className="flex-1 relative overflow-hidden bg-[#101b35] flex flex-col justify-between p-4 select-none">
        
        {/* Windows 11 Blue Bloom Wallpaper graphic */}
        <div className="absolute inset-0 bg-radial-gradient from-blue-600/40 via-indigo-950 to-slate-950 flex items-center justify-center">
          {/* Stylized Bloom shapes */}
          <div className="absolute w-[220px] h-[220px] bg-blue-500/20 rounded-full blur-[80px] animate-pulse"></div>
          <div className="absolute w-[180px] h-[180px] bg-purple-500/20 rounded-full blur-[60px]"></div>
          <div className="absolute w-[80px] h-[100px] bg-[#38bdf8]/30 rounded-full blur-2xl transform rotate-45"></div>
        </div>

        {/* Desktop Icons (Left Side Column) */}
        <div className="relative z-10 flex flex-col gap-4 items-start pt-2">
          {desktopIcons.map((item, idx) => (
            <div key={idx} className="flex flex-col items-center justify-center w-14 h-14 rounded hover:bg-white/10 active:bg-white/20 p-1 cursor-pointer">
              <span className="text-lg">{item.icon}</span>
              <span className="text-[8px] text-white/95 font-medium tracking-wide mt-1 text-center truncate w-full shadow-sm">
                {item.name}
              </span>
            </div>
          ))}
        </div>

        {/* Windows Taskbar at the bottom of the remote screen */}
        <div className="relative z-10 w-full h-8 bg-slate-900/80 backdrop-blur-md border-t border-white/5 rounded-md flex items-center justify-between px-3 mt-auto">
          {/* Start Menu & Icons Centered */}
          <div className="flex-1 flex justify-center items-center gap-2">
            {/* Windows 11 Start Logo representation */}
            <div className="w-3.5 h-3.5 grid grid-cols-2 gap-[1px] cursor-pointer">
              <div className="bg-[#0078d4]"></div>
              <div className="bg-[#0078d4]"></div>
              <div className="bg-[#0078d4]"></div>
              <div className="bg-[#0078d4]"></div>
            </div>
            
            {/* Taskbar pinned apps */}
            <div className="w-2.5 h-2.5 bg-yellow-500 rounded-sm"></div>
            <div className="w-2.5 h-2.5 bg-blue-500 rounded-sm"></div>
            <div className="w-2.5 h-2.5 bg-purple-500 rounded-sm"></div>
            <div className="w-2.5 h-2.5 bg-emerald-500 rounded-sm"></div>
          </div>
          
          {/* System Tray (Clock / Battery / Status) */}
          <div className="flex items-center gap-1.5 text-[8px] text-white/80 font-medium">
            <span>ENG</span>
            <span>9:41 AM</span>
          </div>
        </div>
      </div>

      {/* Floating Control Toolbar */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 bg-slate-950/90 border border-slate-800/80 px-4 py-2.5 rounded-2xl shadow-xl backdrop-blur-lg">
        <button className="text-slate-400 hover:text-white p-1 bg-slate-900 rounded-lg hover:bg-slate-800 cursor-pointer">
          <Volume2 size={16} />
        </button>
        <button className="text-slate-400 hover:text-white p-1 bg-slate-900 rounded-lg hover:bg-slate-800 cursor-pointer">
          <Video size={16} />
        </button>
        <button className="text-slate-400 hover:text-white p-1 bg-slate-900 rounded-lg hover:bg-slate-800 cursor-pointer">
          <Sliders size={16} />
        </button>
        <div className="w-[1px] h-5 bg-slate-800 mx-1"></div>
        <button className="text-blue-400 hover:text-blue-300 font-semibold text-[10px] px-2 py-1 bg-blue-500/10 rounded-lg cursor-pointer">
          1080p
        </button>
        <button className="text-slate-400 hover:text-white p-1 bg-slate-900 rounded-lg hover:bg-slate-800 cursor-pointer">
          <Maximize2 size={14} />
        </button>
      </div>
    </div>
  );
}
