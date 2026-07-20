import React, { useState } from 'react';
import { Upload, FileText, Image, ChevronRight } from 'lucide-react';
import { fileTransfers } from '../../data/mockData';

export default function FileTransferWindow() {
  const [activeTab, setActiveTab] = useState('send');

  return (
    <div className="bg-slate-950/80 border border-slate-900 rounded-2xl overflow-hidden font-sans w-full shadow-lg flex flex-col justify-between h-[300px]">
      {/* Title bar */}
      <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-900 flex items-center justify-between shrink-0">
        <span className="text-white text-xs font-bold tracking-wide">File Transfer</span>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-slate-800"></div>
          <div className="w-2 h-2 rounded-full bg-slate-800"></div>
          <div className="w-2 h-2 rounded-full bg-slate-800"></div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-slate-950 border-b border-slate-900 grid grid-cols-2 text-center text-[10px] font-semibold tracking-wider uppercase shrink-0">
        <button
          onClick={() => setActiveTab('send')}
          className={`py-2 cursor-pointer transition-colors ${activeTab === 'send' ? 'text-blue-400 bg-blue-500/5 font-bold border-b border-blue-500' : 'text-slate-500 hover:text-slate-350'}`}
        >
          Send to Device
        </button>
        <button
          onClick={() => setActiveTab('receive')}
          className={`py-2 cursor-pointer transition-colors ${activeTab === 'receive' ? 'text-blue-400 bg-blue-500/5 font-bold border-b border-blue-500' : 'text-slate-500 hover:text-slate-350'}`}
        >
          Receive from Device
        </button>
      </div>

      {/* Body Content */}
      <div className="p-4 flex-1 overflow-y-auto space-y-3 flex flex-col">
        {/* Drop Zone */}
        <div className="border border-dashed border-slate-800/80 hover:border-blue-500/30 rounded-xl p-3 flex flex-col items-center justify-center text-center bg-slate-900/10 cursor-pointer group py-4">
          <Upload size={18} className="text-slate-650 group-hover:text-blue-400 mb-1 transition-colors" />
          <span className="text-[10px] text-slate-400 font-medium leading-relaxed">
            Drag & drop files to send or <span className="text-blue-400 group-hover:underline">Browse Files</span>
          </span>
        </div>

        {/* Recent Transfers */}
        <div className="flex-1 flex flex-col min-h-0">
          <span className="text-[9px] text-slate-500 uppercase tracking-widest font-semibold block mb-2">Recent Transfers</span>
          <div className="space-y-2 overflow-y-auto flex-1 pr-0.5">
            {fileTransfers.map((ft) => (
              <div key={ft.id} className="flex items-center justify-between p-2 hover:bg-slate-900/20 rounded-lg text-xs border border-transparent hover:border-slate-900/40">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
                    {ft.type === 'pdf' ? <FileText size={14} className="text-red-400" /> : <Image size={14} className="text-green-400" />}
                  </div>
                  <div className="min-w-0">
                    <span className="text-slate-200 font-semibold truncate block max-w-[110px]">{ft.name}</span>
                    <span className="text-[9px] text-slate-500 block mt-0.5 font-mono">{ft.size} • {ft.direction === 'to' ? 'To My Phone' : 'From My Phone'}</span>
                  </div>
                </div>
                <span className="text-[9px] text-slate-550 font-mono shrink-0">{ft.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer Link */}
      <div className="p-2.5 border-t border-slate-900 shrink-0 text-center">
        <button className="text-[9px] text-slate-450 hover:text-slate-300 font-bold uppercase tracking-wider flex items-center justify-center gap-0.5 mx-auto cursor-pointer">
          View All Transfers
          <ChevronRight size={12} />
        </button>
      </div>
    </div>
  );
}
