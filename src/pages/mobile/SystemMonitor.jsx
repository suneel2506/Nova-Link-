import React, { useEffect } from 'react';
import { ChevronLeft, Info, Cpu, HardDrive, Network, RefreshCw, Battery, Wifi } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import useSystemStore from '../../stores/systemStore';

export default function SystemMonitor({ onBack }) {
  const { metrics, history, startPolling, stopPolling, fetchMetrics } = useSystemStore();

  useEffect(() => {
    startPolling(3000);
    return () => stopPolling();
  }, []);

  const handleRefresh = () => {
    fetchMetrics();
    toast.success('Metrics refreshed');
  };

  // Draw SVG sparkline from an array of values
  const drawSparkline = (points, colorClass) => {
    if (!points || points.length < 2) return null;
    const width = 120;
    const height = 30;
    const path = points.map((p, i) => {
      const x = (i / (points.length - 1)) * width;
      const y = height - (p / 100) * height;
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');

    return (
      <svg className="w-[120px] h-[30px] overflow-visible">
        <path
          d={path}
          fill="none"
          className={`${colorClass} stroke-[2]`}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  };

  const cpu = metrics?.cpu || { usage: 23, model: 'Intel i5-1135G7' };
  const ram = metrics?.ram || { usage: 45, used: '7.2 GB', total: '16 GB' };
  const disk = metrics?.disk || { usage: 62, used: '312 GB', total: '512 GB' };
  const network = metrics?.network || { upload: '12.4 Mbps', download: '8.6 Mbps' };
  const battery = metrics?.battery || { level: 78, status: 'Charging' };

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
          <span className="text-white text-sm font-semibold">System Monitor</span>
        </div>
        <motion.button
          onClick={handleRefresh}
          className="text-slate-400 hover:text-white p-1"
          whileTap={{ scale: 0.9, rotate: 180 }}
          aria-label="Refresh metrics"
        >
          <RefreshCw size={18} />
        </motion.button>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 font-sans">
        
        {/* CPU Card */}
        <motion.div
          className="bg-slate-900/20 border border-slate-900 rounded-2xl p-4 flex items-center justify-between"
          whileTap={{ scale: 0.98 }}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-blue-400">
              <Cpu size={16} />
              <span className="text-xs font-semibold uppercase tracking-wider">CPU</span>
            </div>
            <motion.div
              className="text-2xl font-bold text-white"
              key={cpu.usage}
              initial={{ opacity: 0.5 }}
              animate={{ opacity: 1 }}
            >
              {cpu.usage}%
            </motion.div>
            <div className="text-[10px] text-slate-500 font-medium">{cpu.model}</div>
          </div>
          <div>
            {drawSparkline(history.cpu, 'stroke-blue-500')}
          </div>
        </motion.div>

        {/* RAM Card */}
        <motion.div
          className="bg-slate-900/20 border border-slate-900 rounded-2xl p-4 flex items-center justify-between"
          whileTap={{ scale: 0.98 }}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-indigo-400">
              <Cpu size={16} />
              <span className="text-xs font-semibold uppercase tracking-wider">RAM</span>
            </div>
            <motion.div
              className="text-2xl font-bold text-white"
              key={ram.usage}
              initial={{ opacity: 0.5 }}
              animate={{ opacity: 1 }}
            >
              {ram.usage}%
            </motion.div>
            <div className="text-[10px] text-slate-500 font-medium">{ram.used} / {ram.total}</div>
          </div>
          <div>
            {drawSparkline(history.ram, 'stroke-indigo-500')}
          </div>
        </motion.div>

        {/* Disk Card */}
        <motion.div
          className="bg-slate-900/20 border border-slate-900 rounded-2xl p-4 flex items-center justify-between"
          whileTap={{ scale: 0.98 }}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-green-400">
              <HardDrive size={16} />
              <span className="text-xs font-semibold uppercase tracking-wider">Disk</span>
            </div>
            <div className="text-2xl font-bold text-white">{disk.usage}%</div>
            <div className="text-[10px] text-slate-500 font-medium">{disk.used} / {disk.total}</div>
          </div>
          <div>
            {drawSparkline(history.disk, 'stroke-green-500')}
          </div>
        </motion.div>

        {/* Battery Card */}
        <motion.div
          className="bg-slate-900/20 border border-slate-900 rounded-2xl p-4 flex items-center justify-between"
          whileTap={{ scale: 0.98 }}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-amber-400">
              <Battery size={16} />
              <span className="text-xs font-semibold uppercase tracking-wider">Battery</span>
            </div>
            <div className="text-2xl font-bold text-white">{battery.level}%</div>
            <div className="text-[10px] text-slate-500 font-medium">{battery.status}</div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="w-[60px] h-2 bg-slate-800 rounded-full overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${battery.level > 20 ? 'bg-amber-400' : 'bg-rose-500'}`}
                animate={{ width: `${battery.level}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <span className="text-[9px] text-slate-600 font-mono">{battery.status}</span>
          </div>
        </motion.div>

        {/* Network Card */}
        <motion.div
          className="bg-slate-900/20 border border-slate-900 rounded-2xl p-4 flex flex-col gap-3"
          whileTap={{ scale: 0.98 }}
        >
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 text-cyan-400">
              <Network size={16} />
              <span className="text-xs font-semibold uppercase tracking-wider">Network</span>
            </div>
            <div className="flex gap-4 text-[10px] font-mono text-slate-400">
              <span>↑ {network.upload}</span>
              <span>↓ {network.download}</span>
            </div>
          </div>
          <div className="flex justify-between items-end">
            <span className="text-[10px] text-slate-500 font-medium">Real-time throughput</span>
            {drawSparkline(history.network, 'stroke-cyan-500')}
          </div>
        </motion.div>

      </div>
    </motion.div>
  );
}
