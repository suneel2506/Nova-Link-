import React from 'react';
import { LayoutDashboard, Tv, Laptop, Clock, Folder, Cpu, Settings, Shield, Info } from 'lucide-react';

export default function Sidebar({ activeSection, onSectionChange }) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'remote', label: 'Remote Access', icon: Tv },
    { id: 'devices', label: 'Devices', icon: Laptop },
    { id: 'activity', label: 'Activity', icon: Clock },
    { id: 'files', label: 'Files', icon: Folder },
    { id: 'system', label: 'System', icon: Cpu },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'about', label: 'About', icon: Info },
  ];

  return (
    <div className="w-60 bg-slate-950 border-r border-slate-900 flex flex-col justify-between shrink-0 font-sans p-4.5">
      <div className="space-y-7">
        {/* Branding header */}
        <div className="flex items-center gap-2.5 px-2">
          {/* Glowing Hexagon Logo */}
          <div className="w-5.5 h-6.5 drop-shadow-[0_0_8px_rgba(59,130,246,0.3)]">
            <svg viewBox="0 0 100 115" className="w-full h-full" fill="none">
              <linearGradient id="sidebarLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#7c3aed" />
              </linearGradient>
              <path d="M50 0 L100 28.87 L100 86.6 L50 115.47 L0 86.6 L0 28.87 Z" fill="url(#sidebarLogoGrad)" />
              <path d="M30 30 L45 30 L70 70 L70 30 L80 30 L80 85 L65 85 L40 45 L40 85 L30 85 Z" fill="#ffffff" />
            </svg>
          </div>
          <span className="text-white text-sm font-bold tracking-wider">NOVA LINK</span>
        </div>

        {/* Menu Navigation */}
        <div className="space-y-1">
          {menuItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSectionChange(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-blue-600/10 text-blue-400 border-l-2 border-blue-500 pl-3.5'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                }`}
              >
                <IconComponent size={15} className={`stroke-[2] ${isActive ? 'text-blue-400' : 'text-slate-450'}`} />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sidebar Footer info */}
      <div className="px-2 py-1 text-[10px] text-slate-500 font-medium">
        <span>© 2026 Nova Link Inc.</span>
      </div>
    </div>
  );
}
