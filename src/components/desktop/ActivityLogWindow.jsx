import React, { useState } from 'react';
import { Clock, FileText, Settings, ShieldAlert, Trash2, Link, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import ConfirmModal from '../ui/ConfirmModal';
import activityData from '../../data/activity.json';

export default function ActivityLogWindow() {
  const [logs, setLogs] = useState([...activityData]);
  const [filter, setFilter] = useState('All Activities');
  const [showClearModal, setShowClearModal] = useState(false);

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
      case 'device_paired':
        return <Link className="text-cyan-400 w-3.5 h-3.5" />;
      case 'system':
      case 'power':
        return <Zap className="text-amber-400 w-3.5 h-3.5" />;
      default:
        return <ShieldAlert className="text-slate-400 w-3.5 h-3.5" />;
    }
  };

  const filteredLogs = filter === 'All Activities'
    ? logs
    : filter === 'Connections'
      ? logs.filter(l => ['session_start', 'session_end', 'device_paired'].includes(l.type))
      : logs.filter(l => ['file_transfer', 'file_download'].includes(l.type));

  const handleClear = () => {
    setLogs([]);
    setShowClearModal(false);
    toast.success('Activity log cleared');
  };

  return (
    <div className="bg-slate-950/80 border border-slate-900 rounded-2xl overflow-hidden font-sans w-full shadow-lg flex flex-col justify-between h-[300px]">
      {/* Title bar */}
      <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-900 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-white text-xs font-bold tracking-wide">Activity Log</span>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-slate-900 border border-slate-850 text-[9px] font-semibold text-slate-400 rounded px-1.5 py-0.5 outline-none cursor-pointer"
          >
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
        {filteredLogs.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-slate-600 text-xs py-8">
            No activity to show
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div key={log.id} className="flex items-start gap-3 text-xs leading-normal">
              <div className="w-6.5 h-6.5 rounded bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                {getLogIcon(log.type)}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-slate-300 font-medium block">{log.description}</span>
              </div>
              <span className="text-[9px] text-slate-500 font-mono shrink-0">{log.time}</span>
            </div>
          ))
        )}
      </div>

      {/* Footer Clear */}
      <div className="p-3 border-t border-slate-900 shrink-0 text-center">
        <motion.button
          onClick={() => setShowClearModal(true)}
          className="text-[10px] text-blue-400 hover:text-blue-300 font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
          whileTap={{ scale: 0.95 }}
        >
          <Trash2 size={12} />
          Clear Log
        </motion.button>
      </div>

      <ConfirmModal
        isOpen={showClearModal}
        title="Clear Activity Log"
        message="Are you sure you want to clear all activity entries? This cannot be undone."
        confirmLabel="Clear All"
        variant="danger"
        onConfirm={handleClear}
        onCancel={() => setShowClearModal(false)}
      />
    </div>
  );
}
