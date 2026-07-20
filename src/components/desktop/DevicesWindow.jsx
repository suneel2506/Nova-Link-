import React from 'react';
import { Laptop, Smartphone, Globe, Plus } from 'lucide-react';
import { devices } from '../../data/mockData';

export default function DevicesWindow() {
  return (
    <div className="bg-slate-950/80 border border-slate-900 rounded-2xl overflow-hidden font-sans w-full shadow-lg flex flex-col justify-between h-[300px]">
      {/* Title bar */}
      <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-900 flex items-center justify-between shrink-0">
        <span className="text-white text-xs font-bold tracking-wide">Devices</span>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-slate-800"></div>
          <div className="w-2 h-2 rounded-full bg-slate-800"></div>
          <div className="w-2 h-2 rounded-full bg-slate-800"></div>
        </div>
      </div>

      {/* Body Content */}
      <div className="p-4 flex-1 overflow-y-auto space-y-3.5">
        {/* Section: This Device */}
        <div>
          <span className="text-[9px] text-slate-500 uppercase tracking-widest font-semibold block mb-1.5">This Device</span>
          <div className="flex items-center justify-between p-2 bg-blue-500/5 border border-blue-500/10 rounded-xl">
            <div className="flex items-center gap-2.5">
              <Laptop size={15} className="text-blue-400" />
              <div>
                <span className="text-xs font-semibold text-white block">{devices.thisDevice.name}</span>
                <span className="text-[9px] text-slate-500 font-mono block mt-0.5">{devices.thisDevice.ip}</span>
              </div>
            </div>
            <span className="text-[9px] font-semibold text-green-400 bg-green-500/10 border border-green-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
              Online
            </span>
          </div>
        </div>

        {/* Section: Paired Devices */}
        <div>
          <span className="text-[9px] text-slate-500 uppercase tracking-widest font-semibold block mb-1.5">Paired Devices</span>
          <div className="space-y-1.5">
            {devices.pairedDevices.map((dev) => (
              <div key={dev.id} className="flex items-center justify-between p-2 hover:bg-slate-900/30 border border-transparent hover:border-slate-900 rounded-xl">
                <div className="flex items-center gap-2.5">
                  {dev.type === 'phone' ? <Smartphone size={15} className="text-blue-400" /> : <Globe size={15} className="text-emerald-400" />}
                  <div>
                    <span className="text-xs font-semibold text-white block">{dev.name}</span>
                    <span className="text-[9px] text-slate-500 font-mono block mt-0.5">{dev.os}</span>
                  </div>
                </div>
                <span className={`text-[9px] font-semibold ${dev.isActive ? 'text-green-400 bg-green-500/10 border border-green-500/10' : 'text-slate-500'} px-2 py-0.5 rounded-full`}>
                  {dev.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer Button */}
      <div className="p-3 border-t border-slate-900 shrink-0">
        <button className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer">
          <Plus size={14} />
          Pair New Device
        </button>
      </div>
    </div>
  );
}
