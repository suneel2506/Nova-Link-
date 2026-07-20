import React, { useState } from 'react';
import { ChevronLeft, Search, HardDrive, Folder, ChevronRight } from 'lucide-react';
import { fileSystem } from '../../data/mockData';

export default function Files({ onBack }) {
  const [search, setSearch] = useState('');

  return (
    <div className="flex-1 flex flex-col justify-between overflow-hidden bg-[#070b13]">
      {/* Header */}
      <div className="px-5 py-3 flex items-center justify-between border-b border-slate-900/50 shrink-0 bg-slate-950/20">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-slate-400 hover:text-white">
            <ChevronLeft size={20} />
          </button>
          <span className="text-white text-sm font-semibold">Files</span>
        </div>
        <button className="text-slate-400 hover:text-white p-1">
          <Search size={18} />
        </button>
      </div>

      {/* Main Files View */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {/* Search Input */}
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search files and folders"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900/60 border border-slate-800/80 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all duration-200"
          />
        </div>

        {/* Section: This PC */}
        <div>
          <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-3">This PC</h4>
          
          <div className="space-y-2">
            {/* Hard Drives */}
            {fileSystem.drives.map((drive, idx) => (
              <div 
                key={idx}
                className="bg-slate-900/20 border border-slate-900/60 rounded-xl p-3.5 flex items-center justify-between hover:bg-slate-900/40 cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/15">
                    <HardDrive className="w-4.5 h-4.5 text-blue-400" />
                  </div>
                  <div>
                    <h5 className="text-xs font-semibold text-white">{drive.name}</h5>
                    <p className="text-slate-400 text-[10px] mt-0.5">{drive.size}</p>
                  </div>
                </div>
                <ChevronRight size={14} className="text-slate-600" />
              </div>
            ))}

            {/* Folders */}
            {fileSystem.folders.map((folder, idx) => (
              <div 
                key={idx}
                className="bg-slate-900/20 border border-slate-900/60 rounded-xl p-3.5 flex items-center justify-between hover:bg-slate-900/40 cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/15">
                    <Folder className="w-4.5 h-4.5 text-amber-400 fill-amber-400/10" />
                  </div>
                  <div>
                    <h5 className="text-xs font-semibold text-white">{folder.name}</h5>
                    <p className="text-slate-400 text-[10px] mt-0.5">{folder.items}</p>
                  </div>
                </div>
                <ChevronRight size={14} className="text-slate-600" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
