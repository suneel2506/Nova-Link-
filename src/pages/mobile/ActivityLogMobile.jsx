import React, { useEffect, useState } from 'react';
import { ChevronLeft, Trash2, Clock, FileText, Settings, ShieldAlert, Filter, Link, Zap, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import BottomNavigation from '../../components/BottomNavigation';
import ConfirmModal from '../../components/ui/ConfirmModal';
import EmptyState from '../../components/ui/EmptyState';
import activityData from '../../data/activity.json';

export default function ActivityLogMobile({ onBack, setScreen }) {
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState('all');
  const [showClearModal, setShowClearModal] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  useEffect(() => {
    setLogs([...activityData]);
  }, []);

  const filterOptions = [
    { id: 'all', label: 'All', icon: null },
    { id: 'session', label: 'Sessions', types: ['session_start', 'session_end'] },
    { id: 'file', label: 'Files', types: ['file_transfer', 'file_download'] },
    { id: 'settings', label: 'Settings', types: ['settings'] },
    { id: 'system', label: 'System', types: ['system', 'power', 'device_paired'] },
  ];

  const filteredLogs = filter === 'all'
    ? logs
    : logs.filter((log) => {
        const opt = filterOptions.find((f) => f.id === filter);
        return opt?.types?.includes(log.type);
      });

  const handleClear = () => {
    setLogs([]);
    setShowClearModal(false);
    toast.success('Activity log cleared');
  };

  const handleRefresh = () => {
    setLogs([...activityData]);
    toast.success('Activity log refreshed');
  };

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
      case 'device_paired':
        return <Link className="text-cyan-400 w-4 h-4" />;
      case 'system':
        return <Zap className="text-amber-400 w-4 h-4" />;
      case 'power':
        return <Zap className="text-orange-400 w-4 h-4" />;
      default:
        return <ShieldAlert className="text-slate-400 w-4 h-4" />;
    }
  };

  return (
    <motion.div
      className="flex-1 flex flex-col justify-between overflow-hidden bg-[#070b13]"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="px-5 py-3 flex items-center justify-between border-b border-slate-900/50 shrink-0 bg-slate-950/20">
        <div className="flex items-center gap-3">
          <motion.button onClick={onBack} className="text-slate-400 hover:text-white" whileTap={{ scale: 0.9 }} aria-label="Go back">
            <ChevronLeft size={20} />
          </motion.button>
          <span className="text-white text-sm font-semibold">Activity Log</span>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            onClick={handleRefresh}
            className="text-slate-400 hover:text-white p-1"
            whileTap={{ scale: 0.9, rotate: 180 }}
            aria-label="Refresh"
          >
            <RefreshCw size={14} />
          </motion.button>
          <motion.button
            onClick={() => setShowClearModal(true)}
            className="text-slate-400 hover:text-rose-400 p-1"
            whileTap={{ scale: 0.9 }}
            aria-label="Clear all logs"
          >
            <Trash2 size={16} />
          </motion.button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-5 py-2 flex gap-2 overflow-x-auto border-b border-slate-900/30">
        {filterOptions.map((opt) => (
          <motion.button
            key={opt.id}
            onClick={() => setFilter(opt.id)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider cursor-pointer transition-colors ${
              filter === opt.id
                ? 'bg-blue-600 text-white'
                : 'bg-slate-900/40 text-slate-500 hover:text-slate-300 border border-slate-900'
            }`}
            whileTap={{ scale: 0.95 }}
          >
            {opt.label}
          </motion.button>
        ))}
      </div>

      {/* Main logs */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 font-sans">
        {filteredLogs.length === 0 ? (
          <EmptyState type={filter !== 'all' ? 'noResults' : 'empty'} message={filter !== 'all' ? 'No activity matching this filter' : 'No activity recorded yet'} />
        ) : (
          filteredLogs.map((log, idx) => (
            <motion.div
              key={log.id}
              className="bg-slate-900/20 border border-slate-900 rounded-xl p-3.5 flex items-start gap-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
            >
              <div className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-850 flex items-center justify-center shrink-0 mt-0.5">
                {getLogIcon(log.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-200 font-medium leading-relaxed">{log.description}</p>
                <span className="text-[9px] text-slate-500 font-mono mt-1 block">{log.time}</span>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Bottom Nav */}
      <BottomNavigation activeTab="activity" onChange={setScreen} />

      {/* Clear Confirmation */}
      <ConfirmModal
        isOpen={showClearModal}
        title="Clear Activity Log"
        message="Are you sure you want to clear the entire activity log? This action cannot be undone."
        confirmLabel="Clear All"
        variant="danger"
        onConfirm={handleClear}
        onCancel={() => setShowClearModal(false)}
      />
    </motion.div>
  );
}
