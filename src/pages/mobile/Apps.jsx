import React, { useState } from 'react';
import { ChevronLeft, Search, Code, Globe, Music, Layers, FileText, MessageCircle, Send, MessageSquare, Video } from 'lucide-react';
import { apps } from '../../data/mockData';

export default function Apps({ onBack }) {
  const [search, setSearch] = useState('');

  // Map icon strings to Lucide components
  const iconMap = {
    Code: { icon: Code, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
    Chrome: { icon: Globe, color: 'text-red-400 bg-red-500/10 border-red-500/20' },
    Music: { icon: Music, color: 'text-green-400 bg-green-500/10 border-green-500/20' },
    Layers: { icon: Layers, color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
    FileText: { icon: FileText, color: 'text-slate-300 bg-slate-500/10 border-slate-500/20' },
    MessageCircle: { icon: MessageCircle, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
    Send: { icon: Send, color: 'text-sky-400 bg-sky-500/10 border-sky-500/20' },
    Slack: { icon: MessageSquare, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
    Video: { icon: Video, color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' }
  };

  const filteredApps = apps.filter(app => 
    app.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col justify-between overflow-hidden bg-[#070b13]">
      {/* Header */}
      <div className="px-5 py-3 flex items-center justify-between border-b border-slate-900/50 shrink-0 bg-slate-950/20">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-slate-400 hover:text-white">
            <ChevronLeft size={20} />
          </button>
          <span className="text-white text-sm font-semibold">Apps</span>
        </div>
        <button className="text-slate-400 hover:text-white p-1">
          <Search size={18} />
        </button>
      </div>

      {/* Main Apps View */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {/* Search Input */}
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search apps"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900/60 border border-slate-800/80 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all duration-200"
          />
        </div>

        {/* Section Title */}
        <div>
          <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-3">Installed Apps</h4>
          
          {/* Apps Grid */}
          <div className="grid grid-cols-3 gap-3">
            {filteredApps.map((app) => {
              const iconConfig = iconMap[app.icon] || { icon: Code, color: 'text-slate-400 bg-slate-500/10' };
              const IconComp = iconConfig.icon;
              
              return (
                <div 
                  key={app.id}
                  className="bg-slate-900/25 border border-slate-900/60 rounded-2xl p-4 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-900/40 hover:border-slate-800 transition-all duration-200"
                >
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center border mb-2.5 ${iconConfig.color}`}>
                    <IconComp size={22} className="stroke-[1.8]" />
                  </div>
                  <span className="text-[10px] font-medium text-slate-200 tracking-wide truncate w-full">
                    {app.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* View All Button */}
        <button className="w-full py-3 bg-slate-950 border border-slate-900 text-blue-400 hover:text-blue-300 font-semibold rounded-xl text-xs transition-all duration-150 cursor-pointer mt-4">
          View All Apps
        </button>
      </div>
    </div>
  );
}
