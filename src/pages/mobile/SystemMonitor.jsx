import React from 'react';
import { ChevronLeft, Info, Cpu, HardDrive, Network } from 'lucide-react';
import { systemMetrics } from '../../data/mockData';

export default function SystemMonitor({ onBack }) {
  // Simple helper to draw a random-looking SVG sparkline
  const drawSparkline = (points, colorClass) => {
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

  const cpuPoints = [15, 28, 20, 35, 45, 23, 23, 18, 25, 23];
  const ramPoints = [40, 42, 43, 44, 45, 45, 45, 45, 45, 45];
  const diskPoints = [62, 62, 62, 62, 62, 62, 62, 62, 62, 62];
  const netPoints = [10, 30, 20, 80, 50, 90, 40, 60, 35, 75];

  return (
    <div className="flex-1 flex flex-col justify-between overflow-hidden bg-[#070b13]">
      {/* Header */}
      <div className="px-5 py-3 flex items-center justify-between border-b border-slate-900/50 shrink-0 bg-slate-950/20">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-slate-400 hover:text-white">
            <ChevronLeft size={20} />
          </button>
          <span className="text-white text-sm font-semibold">System Monitor</span>
        </div>
        <button className="text-slate-400 hover:text-white p-1">
          <Info size={18} />
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 font-sans">
        
        {/* CPU Card */}
        <div className="bg-slate-900/20 border border-slate-900 rounded-2xl p-4 flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-blue-400">
              <Cpu size={16} />
              <span className="text-xs font-semibold uppercase tracking-wider">CPU</span>
            </div>
            <div className="text-2xl font-bold text-white">{systemMetrics.cpu.usage}%</div>
            <div className="text-[10px] text-slate-500 font-medium">{systemMetrics.cpu.model}</div>
          </div>
          <div>
            {drawSparkline(cpuPoints, 'stroke-blue-500')}
          </div>
        </div>

        {/* RAM Card */}
        <div className="bg-slate-900/20 border border-slate-900 rounded-2xl p-4 flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-indigo-400">
              <Cpu size={16} />
              <span className="text-xs font-semibold uppercase tracking-wider">RAM</span>
            </div>
            <div className="text-2xl font-bold text-white">{systemMetrics.ram.usage}%</div>
            <div className="text-[10px] text-slate-500 font-medium">{systemMetrics.ram.used} / {systemMetrics.ram.total}</div>
          </div>
          <div>
            {drawSparkline(ramPoints, 'stroke-indigo-500')}
          </div>
        </div>

        {/* Disk Card */}
        <div className="bg-slate-900/20 border border-slate-900 rounded-2xl p-4 flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-green-400">
              <HardDrive size={16} />
              <span className="text-xs font-semibold uppercase tracking-wider">Disk</span>
            </div>
            <div className="text-2xl font-bold text-white">{systemMetrics.disk.usage}%</div>
            <div className="text-[10px] text-slate-500 font-medium">{systemMetrics.disk.used} / {systemMetrics.disk.total}</div>
          </div>
          <div>
            {drawSparkline(diskPoints, 'stroke-green-500')}
          </div>
        </div>

        {/* Network Card */}
        <div className="bg-slate-900/20 border border-slate-900 rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 text-cyan-400">
              <Network size={16} />
              <span className="text-xs font-semibold uppercase tracking-wider">Network</span>
            </div>
            <div className="flex gap-4 text-[10px] font-mono text-slate-400">
              <span>↑ {systemMetrics.network.upload}</span>
              <span>↓ {systemMetrics.network.download}</span>
            </div>
          </div>
          <div className="flex justify-between items-end">
            <span className="text-[10px] text-slate-500 font-medium">Real-time throughput</span>
            {drawSparkline(netPoints, 'stroke-cyan-500')}
          </div>
        </div>

      </div>
    </div>
  );
}
