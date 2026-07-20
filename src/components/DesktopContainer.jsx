import React, { useState } from 'react';
import Sidebar from './desktop/Sidebar';
import DashboardWindow from './desktop/DashboardWindow';
import RemoteSessionWindow from './desktop/RemoteSessionWindow';
import DevicesWindow from './desktop/DevicesWindow';
import ActivityLogWindow from './desktop/ActivityLogWindow';
import FileTransferWindow from './desktop/FileTransferWindow';
import SettingsWindow from './desktop/SettingsWindow';
import AgentFeatures from './desktop/AgentFeatures';
import { Layout, Maximize2, Minimize2, X, Laptop } from 'lucide-react';

export default function DesktopContainer() {
  const [activeSection, setActiveSection] = useState('dashboard');

  // We can let the user jump to specific sections by scrolling them into view,
  // or we can show a single unified layout matching the design. Recreating the
  // exact mockup showing all widgets is best, so we will show all widgets, 
  // and clicking sidebar items will highlight or scroll to the relevant widget!
  const handleSectionChange = (id) => {
    setActiveSection(id);
    const element = document.getElementById(`desktop-${id}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 lg:p-6 font-sans">
      {/* High-fidelity Laptop App Casing */}
      <div className="bg-[#0b0f19] border border-slate-800/80 rounded-2xl shadow-[0_30px_60px_-15px_rgba(0,0,0,0.7)] flex flex-col overflow-hidden h-[900px]">
        
        {/* App Titlebar */}
        <div className="h-11 px-5 bg-slate-950 border-b border-slate-900 flex items-center justify-between shrink-0 select-none">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-600/10 border border-blue-500/20 flex items-center justify-center">
              <Laptop size={10} className="text-blue-400" />
            </div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
              Nova Link — Laptop Agent (v1.0.0)
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button className="text-slate-500 hover:text-white p-0.5 cursor-pointer">
              <Minimize2 size={12} />
            </button>
            <button className="text-slate-500 hover:text-white p-0.5 cursor-pointer">
              <Maximize2 size={12} />
            </button>
            <button className="text-slate-500 hover:text-rose-500 p-0.5 cursor-pointer">
              <X size={12} />
            </button>
          </div>
        </div>

        {/* Client Shell Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
          <Sidebar activeSection={activeSection} onSectionChange={handleSectionChange} />

          {/* Main scrollable viewport */}
          <div className="flex-1 overflow-y-auto bg-[#070b13] p-6 space-y-6">
            
            {/* Top Navigation / Breadcrumb */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-900/60 shrink-0">
              <div>
                <h2 className="text-xl font-bold text-white tracking-wide capitalize">{activeSection}</h2>
                <p className="text-[10px] text-slate-500 mt-0.5">Manage remote client interactions and view metrics</p>
              </div>
              <div className="flex gap-2 text-[10px] font-mono bg-slate-950 border border-slate-900 rounded-lg px-3 py-1 text-slate-400">
                <span>HOST: 192.168.1.10</span>
                <span className="text-slate-700">|</span>
                <span className="text-green-400">CONNECTED</span>
              </div>
            </div>

            {/* Dashboard Window Section */}
            <div id="desktop-dashboard" className="transition-all duration-300">
              <DashboardWindow />
            </div>

            {/* Remote Session Section */}
            <div id="desktop-remote" className="transition-all duration-300">
              <RemoteSessionWindow />
            </div>

            {/* Grid of bottom panels */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
              <div id="desktop-devices">
                <DevicesWindow />
              </div>
              <div id="desktop-activity">
                <ActivityLogWindow />
              </div>
              <div id="desktop-files">
                <FileTransferWindow />
              </div>
              <div id="desktop-settings">
                <SettingsWindow />
              </div>
            </div>

            {/* Agent Features Footer */}
            <div id="desktop-about">
              <AgentFeatures />
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
