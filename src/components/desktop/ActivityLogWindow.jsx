import React from 'react';
import { Clock, FileText, Settings, ShieldAlert, Trash2 } from 'lucide-react';
import { activityLogs } from '../../data/mockData';

export default function ActivityLogWindow() {
  const getLogIcon = (type) => {
    switch (type) {
      case 'session_start':
      case 'session_end':
        return <Clock className="text-blue-400 w-3.5 h-3.5" />;
      case 'file_transfer':
      case 'file_download':
        return <FileText className="text-emerald-400 w-3.5 h-3.5" />;
      case 'settings':
        return <Settings className="text-purple-400 w-3.5 h-3.5" />;
      default:
        return <ShieldAlert className="text-slate-400 w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="bg-slate-950/80 border border-slate-900 rounded-2xl overflow-hidden font-sans w-full shadow-lg flex flex-col justify-between h-[300px]">
      {/* Title bar */}
      <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-900 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-white text-xs font-bold tracking-wide">Activity Log</span>
          <select className="bg-slate-900 border border-slate-850 text-[9px] font-semibold text-slate-400 rounded px-1.5 py-0.5 outline-none">
            <option>All Activities</option>
            <option>Connections</option>
            <option>File Transfers</option>
          </select>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-slate-800"></div>
          <div className="w-2 h-2 rounded-full bg-slate-800"></div>
          <div className="w-2 h-2 rounded-full bg-slate-800"></div>
        </div>
      </div>

      {/* Body Content */}
      <div className="p-4 flex-1 overflow-y-auto space-y-3.5">
        {activityLogs.map((log) => (
          <div key={log.id} className="flex items-start gap-3 text-xs leading-normal">
            <div className="w-6.5 h-6.5 rounded bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 mt-0.5">
              {getLogIcon(log.type)}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-slate-300 font-medium block">{log.description}</span>
            </div>
            <span className="text-[9px] text-slate-500 font-mono shrink-0">{log.time}</span>
          </div>
        ))}
      </div>

      {/* Footer Clear */}
      <div className="p-3 border-t border-slate-900 shrink-0 text-center">
        <button className="text-[10px] text-blue-400 hover:text-blue-300 font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 mx-auto cursor-pointer">
          <Trash2 size={12} />
          Clear Log
        </button>
      </div>
    </div>
  );
}
