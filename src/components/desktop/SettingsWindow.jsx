import React, { useState } from 'react';
import { ToggleRight, ToggleLeft, ChevronRight } from 'lucide-react';

export default function SettingsWindow() {
  const [activeTab, setActiveTab] = useState('general');
  const [startWithWin, setStartWithWin] = useState(true);
  const [minToTray, setMinToTray] = useState(true);
  const [runInBackground, setRunInBackground] = useState(true);

  return (
    <div className="bg-slate-950/80 border border-slate-900 rounded-2xl overflow-hidden font-sans w-full shadow-lg flex flex-col justify-between h-[300px]">
      {/* Title bar */}
      <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-900 flex items-center justify-between shrink-0">
        <span className="text-white text-xs font-bold tracking-wide">Settings</span>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-slate-800"></div>
          <div className="w-2 h-2 rounded-full bg-slate-800"></div>
          <div className="w-2 h-2 rounded-full bg-slate-800"></div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-slate-950 border-b border-slate-900 flex items-center justify-between text-[9px] font-semibold tracking-wider uppercase text-slate-500 shrink-0 select-none">
        {['general', 'security', 'network', 'advanced'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 cursor-pointer text-center transition-colors ${activeTab === tab ? 'text-blue-400 bg-blue-500/5 font-bold border-b border-blue-500' : 'hover:text-slate-350'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Body Content */}
      <div className="p-4 flex-1 overflow-y-auto space-y-3.5 text-xs text-slate-300">
        {/* Start with Windows */}
        <div className="flex items-center justify-between">
          <span className="font-medium text-slate-200">Start with Windows</span>
          <button onClick={() => setStartWithWin(!startWithWin)} className="text-blue-500 hover:text-blue-400 cursor-pointer">
            {startWithWin ? <ToggleRight size={24} /> : <ToggleLeft size={24} className="text-slate-650" />}
          </button>
        </div>

        {/* Minimize to tray */}
        <div className="flex items-center justify-between">
          <span className="font-medium text-slate-200">Minimize to tray</span>
          <button onClick={() => setMinToTray(!minToTray)} className="text-blue-500 hover:text-blue-400 cursor-pointer">
            {minToTray ? <ToggleRight size={24} /> : <ToggleLeft size={24} className="text-slate-650" />}
          </button>
        </div>

        {/* Run in background */}
        <div className="flex items-center justify-between">
          <span className="font-medium text-slate-200">Run in background</span>
          <button onClick={() => setRunInBackground(!runInBackground)} className="text-blue-500 hover:text-blue-400 cursor-pointer">
            {runInBackground ? <ToggleRight size={24} /> : <ToggleLeft size={24} className="text-slate-650" />}
          </button>
        </div>

        {/* Theme select */}
        <div className="flex items-center justify-between">
          <span className="font-medium text-slate-200">Theme</span>
          <select className="bg-slate-900 border border-slate-850 text-slate-300 rounded px-2.5 py-1 text-[11px] outline-none">
            <option value="dark">Dark</option>
            <option value="light">Light</option>
            <option value="system">System</option>
          </select>
        </div>

        {/* Language select */}
        <div className="flex items-center justify-between">
          <span className="font-medium text-slate-200">Language</span>
          <select className="bg-slate-900 border border-slate-850 text-slate-300 rounded px-2.5 py-1 text-[11px] outline-none">
            <option value="en">English</option>
            <option value="es">Español</option>
            <option value="fr">Français</option>
          </select>
        </div>
      </div>

      {/* Footer Updater */}
      <div className="px-4 py-2.5 border-t border-slate-900 shrink-0 flex items-center justify-between text-[10px] text-slate-500">
        <div className="flex items-center gap-1">
          <span>Check for updates</span>
          <button className="text-blue-400 font-bold hover:underline cursor-pointer">Check Now</button>
        </div>
        <span className="font-mono">v1.0.0</span>
      </div>
    </div>
  );
}
