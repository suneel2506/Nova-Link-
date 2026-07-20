import React from 'react';
import { ChevronLeft, Trash2, Clock, FileText, Settings, ShieldAlert } from 'lucide-react';
import BottomNavigation from '../../components/BottomNavigation';
import { activityLogs } from '../../data/mockData';

export default function ActivityLogMobile({ onBack, setScreen }) {
  const getLogIcon = (type) => {
    switch (type) {
      case 'session_start':
      case 'session_end':
        return <Clock className="text-blue-400 w-4 h-4" />;
      case 'file_transfer':
      case 'file_download':
        return <FileText className="text-emerald-400 w-4 h-4" />;
      case 'settings':
        return <Settings className="text-purple-400 w-4 h-4" />;
      default:
        return <ShieldAlert className="text-slate-400 w-4 h-4" />;
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between overflow-hidden bg-[#070b13]">
      {/* Header */}
      <div className="px-5 py-3 flex items-center justify-between border-b border-slate-900/50 shrink-0 bg-slate-950/20">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-slate-400 hover:text-white">
            <ChevronLeft size={20} />
          </button>
          <span className="text-white text-sm font-semibold">Activity Log</span>
        </div>
        <button className="text-slate-400 hover:text-rose-400 p-1">
          <Trash2 size={16} />
        </button>
      </div>

      {/* Main logs */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 font-sans">
        {activityLogs.map((log) => (
          <div key={log.id} className="bg-slate-900/20 border border-slate-900 rounded-xl p-3.5 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-850 flex items-center justify-center shrink-0 mt-0.5">
              {getLogIcon(log.type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-200 font-medium leading-relaxed">{log.description}</p>
              <span className="text-[9px] text-slate-500 font-mono mt-1 block">{log.time}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Nav */}
      <BottomNavigation activeTab="activity" onChange={setScreen} />
    </div>
  );
}
