import React from 'react';
import { ToggleRight, Shield, UserCheck, RefreshCw, Clock, Laptop, Cpu, Moon } from 'lucide-react';

export default function AgentFeatures() {
  const features = [
    { label: 'Auto Start', icon: ToggleRight, color: 'text-green-400 border-green-500/20 bg-green-500/5' },
    { label: 'Secure Connection', icon: Shield, color: 'text-blue-400 border-blue-500/20 bg-blue-500/5' },
    { label: 'Unattended Access', icon: UserCheck, color: 'text-purple-400 border-purple-500/20 bg-purple-500/5' },
    { label: 'File Transfer', icon: RefreshCw, color: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5' },
    { label: 'Session Logs', icon: Clock, color: 'text-cyan-400 border-cyan-500/20 bg-cyan-500/5' },
    { label: 'Multi Platform', icon: Laptop, color: 'text-orange-400 border-orange-500/20 bg-orange-500/5' },
    { label: 'Low Resource Usage', icon: Cpu, color: 'text-indigo-400 border-indigo-500/20 bg-indigo-500/5' },
    { label: 'Dark Mode', icon: Moon, color: 'text-amber-400 border-amber-500/20 bg-amber-500/5' },
  ];

  return (
    <div className="bg-slate-950/40 border border-slate-900 rounded-2xl p-6 font-sans w-full">
      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">
        Agent Features
      </h4>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
        {features.map((feat, idx) => {
          const Icon = feat.icon;
          return (
            <div 
              key={idx} 
              className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-900 bg-slate-950/50 text-center hover:border-slate-800 transition-colors cursor-pointer"
            >
              <div className={`w-10 h-10 rounded-full border flex items-center justify-center mb-2.5 ${feat.color}`}>
                <Icon size={16} className="stroke-[2]" />
              </div>
              <span className="text-[10px] font-semibold text-slate-300 leading-tight">
                {feat.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
