import React from 'react';
import { ChevronLeft, Search, Laptop, Monitor } from 'lucide-react';
import BottomNavigation from '../../components/BottomNavigation';
import { devices } from '../../data/mockData';

export default function Devices({ onBack, setScreen }) {
  const renderDeviceIcon = (type) => {
    if (type === 'laptop') return <Laptop className="w-5 h-5 text-slate-400" />;
    return <Monitor className="w-5 h-5 text-slate-400" />;
  };

  return (
    <div className="flex-1 flex flex-col justify-between overflow-hidden bg-[#070b13]">
      {/* Header */}
      <div className="px-5 py-3 flex items-center justify-between border-b border-slate-900/50 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-slate-400 hover:text-white">
            <ChevronLeft size={20} />
          </button>
          <span className="text-white text-base font-semibold">Devices</span>
        </div>
        <button className="text-slate-400 hover:text-white p-1">
          <Search size={18} />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {/* Section: This Device */}
        <div>
          <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2.5">This Device</h4>
          <div className="bg-blue-600/5 border border-blue-500/10 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                <Laptop className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h5 className="text-sm font-semibold text-white">{devices.thisDevice.name}</h5>
                <p className="text-slate-400 text-xs mt-0.5">{devices.thisDevice.os}</p>
                <p className="text-slate-500 text-[10px] mt-0.5 font-mono">{devices.thisDevice.ip}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 px-2 py-0.5 bg-green-500/10 border border-green-500/20 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
              <span className="text-green-400 text-[9px] font-semibold uppercase tracking-wider">Online</span>
            </div>
          </div>
        </div>

        {/* Section: Other Devices */}
        <div>
          <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2.5">Other Devices</h4>
          <div className="space-y-2">
            {devices.otherDevices.map((dev) => (
              <div key={dev.id} className="bg-slate-900/30 border border-slate-900 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center border border-slate-800">
                    {renderDeviceIcon(dev.type)}
                  </div>
                  <div>
                    <h5 className="text-sm font-semibold text-white">{dev.name}</h5>
                    <p className="text-slate-400 text-xs mt-0.5">{dev.os}</p>
                    <p className="text-slate-500 text-[10px] mt-0.5 font-mono">{dev.ip}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 px-2 py-0.5 bg-slate-950 border border-slate-900 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
                  <span className="text-slate-500 text-[9px] font-semibold uppercase tracking-wider">{dev.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Nav */}
      <BottomNavigation activeTab="devices" onChange={setScreen} />
    </div>
  );
}
