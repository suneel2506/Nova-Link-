import React from 'react';
import { ChevronLeft, Info, Lock, RotateCw, Power, Moon, HardDrive, LogOut } from 'lucide-react';

export default function PowerControl({ onBack, onLogout }) {
  const actions = [
    { id: 'lock', name: 'Lock', icon: Lock, desc: 'Secure the desktop session', color: 'text-purple-400 bg-purple-500/10' },
    { id: 'restart', name: 'Restart', icon: RotateCw, desc: 'Reboot the host machine', color: 'text-blue-400 bg-blue-500/10' },
    { id: 'shutdown', name: 'Shutdown', icon: Power, desc: 'Power down the device', color: 'text-rose-500 bg-rose-500/10' },
    { id: 'sleep', name: 'Sleep', icon: Moon, desc: 'Put device to low power', color: 'text-orange-400 bg-orange-500/10' },
    { id: 'hibernate', name: 'Hibernate', icon: HardDrive, desc: 'Save state and power down', color: 'text-cyan-400 bg-cyan-500/10' },
    { id: 'logout', name: 'Sign Out', icon: LogOut, desc: 'Log out from host OS', color: 'text-slate-400 bg-slate-500/10' }
  ];

  const handleAction = (id) => {
    if (id === 'logout' || id === 'shutdown') {
      onLogout();
    } else {
      alert(`Power action triggered: ${id.toUpperCase()}`);
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
          <span className="text-white text-sm font-semibold">Power Control</span>
        </div>
        <button className="text-slate-400 hover:text-white p-1">
          <Info size={18} />
        </button>
      </div>

      {/* Power Options list */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
        {actions.map((act) => {
          const IconComp = act.icon;
          return (
            <button
              key={act.id}
              onClick={() => handleAction(act.id)}
              className="w-full text-left bg-slate-900/20 border border-slate-900 hover:bg-slate-900/40 hover:border-slate-800 rounded-xl p-4 flex items-center justify-between cursor-pointer transition-all duration-150 active:scale-[0.99]"
            >
              <div className="flex items-center gap-3.5">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${act.color} border-white/5`}>
                  <IconComp size={18} className="stroke-[2]" />
                </div>
                <div>
                  <h5 className="text-xs font-semibold text-white">{act.name}</h5>
                  <p className="text-slate-500 text-[9px] mt-0.5">{act.desc}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
