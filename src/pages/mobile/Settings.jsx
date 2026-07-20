import React from 'react';
import { ChevronLeft, Settings as SettingsIcon, Shield, Monitor, Volume2, Bell, Info, LogOut, ChevronRight } from 'lucide-react';
import BottomNavigation from '../../components/BottomNavigation';

export default function Settings({ onBack, onLogout, setScreen }) {
  const menuItems = [
    { id: 'general', name: 'General', icon: SettingsIcon, color: 'text-slate-300' },
    { id: 'security', name: 'Security', icon: Shield, color: 'text-slate-300' },
    { id: 'display', name: 'Display', icon: Monitor, color: 'text-slate-300' },
    { id: 'audio', name: 'Audio', icon: Volume2, color: 'text-slate-300' },
    { id: 'notifications', name: 'Notifications', icon: Bell, color: 'text-slate-300' },
    { id: 'about', name: 'About Nova Link', icon: Info, color: 'text-slate-300' }
  ];

  return (
    <div className="flex-1 flex flex-col justify-between overflow-hidden bg-[#070b13]">
      {/* Header */}
      <div className="px-5 py-3 flex items-center justify-between border-b border-slate-900/50 shrink-0 bg-slate-950/20">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-slate-400 hover:text-white">
            <ChevronLeft size={20} />
          </button>
          <span className="text-white text-sm font-semibold">Settings</span>
        </div>
        <div></div> {/* Spacer */}
      </div>

      {/* Settings list */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        <div className="space-y-1">
          {menuItems.map((item) => {
            const IconComp = item.icon;
            return (
              <button
                key={item.id}
                className="w-full bg-slate-900/10 border border-slate-900/40 hover:bg-slate-900/30 rounded-xl px-4 py-3.5 flex items-center justify-between cursor-pointer transition-all duration-150 active:scale-[0.99] mb-1.5"
              >
                <div className="flex items-center gap-3.5">
                  <IconComp size={16} className={`${item.color} stroke-[2]`} />
                  <span className="text-xs font-semibold text-slate-200">{item.name}</span>
                </div>
                <ChevronRight size={14} className="text-slate-600" />
              </button>
            );
          })}
        </div>

        {/* Log Out button */}
        <button
          onClick={onLogout}
          className="w-full bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/15 rounded-xl px-4 py-3.5 flex items-center justify-between cursor-pointer transition-all duration-150 active:scale-[0.99]"
        >
          <div className="flex items-center gap-3.5 text-rose-400">
            <LogOut size={16} className="stroke-[2]" />
            <span className="text-xs font-semibold">Log Out</span>
          </div>
          <ChevronRight size={14} className="text-rose-950" />
        </button>
      </div>

      {/* Bottom Nav */}
      <BottomNavigation activeTab="settings" onChange={setScreen} />
    </div>
  );
}
