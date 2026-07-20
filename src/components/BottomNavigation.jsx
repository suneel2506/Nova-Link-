import React from 'react';
import { Home, Laptop, Clock, Settings } from 'lucide-react';

export default function BottomNavigation({ activeTab, onChange }) {
  const tabs = [
    { id: 'dashboard', label: 'Home', icon: Home },
    { id: 'devices', label: 'Devices', icon: Laptop },
    { id: 'activity', label: 'Activity', icon: Clock },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="h-16 bg-slate-950 border-t border-slate-900 flex items-center justify-around px-4 shrink-0 z-40">
      {tabs.map((tab) => {
        const IconComponent = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className="flex flex-col items-center justify-center gap-1 w-16 h-full text-slate-400 hover:text-white cursor-pointer transition-colors duration-150"
          >
            <div className={`p-1.5 rounded-xl transition-all duration-200 ${isActive ? 'text-blue-500 bg-blue-500/10' : 'text-slate-400'}`}>
              <IconComponent size={20} />
            </div>
            <span className={`text-[10px] font-medium tracking-wide ${isActive ? 'text-blue-400 font-semibold' : 'text-slate-500'}`}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
