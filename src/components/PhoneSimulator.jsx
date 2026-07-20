import React from 'react';
import { Wifi, Battery, Signal } from 'lucide-react';

export default function PhoneSimulator({ children, currentScreenId, setScreen }) {
  const screens = [
    { id: 'splash', name: '1. Splash Screen' },
    { id: 'login', name: '2. Login Screen' },
    { id: 'dashboard', name: '3. Dashboard' },
    { id: 'devices', name: '4. Devices' },
    { id: 'live', name: '5. Live Screen' },
    { id: 'trackpad', name: '6. Trackpad' },
    { id: 'keyboard', name: '7. Keyboard' },
    { id: 'files', name: '8. Files' },
    { id: 'apps', name: '9. Apps' },
    { id: 'system', name: '10. System Monitor' },
    { id: 'power', name: '11. Power Control' },
    { id: 'settings', name: '12. Settings' },
  ];

  return (
    <div className="flex flex-col lg:flex-row items-center justify-center gap-8 py-6 px-4 max-w-6xl mx-auto">
      {/* Screen Selector Sidebar (Only visible in developer portal) */}
      <div className="w-full lg:w-64 bg-slate-900/80 border border-slate-800 rounded-2xl p-4 self-start lg:sticky lg:top-24">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Jump to Mobile Screen</h3>
        <div className="space-y-1 font-sans">
          {screens.map((screen) => (
            <button
              key={screen.id}
              onClick={() => setScreen(screen.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                currentScreenId === screen.id
                  ? 'bg-blue-600/20 text-blue-400 border-l-2 border-blue-500 pl-4'
                  : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
              }`}
            >
              {screen.name}
            </button>
          ))}
        </div>
      </div>

      {/* Phone Simulator Casing */}
      <div className="relative mx-auto bg-slate-950 w-[375px] h-[780px] rounded-[52px] border-[10px] border-slate-900 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] ring-4 ring-slate-800 flex flex-col overflow-hidden select-none">
        
        {/* Dynamic Island / Notch */}
        <div className="absolute top-3 left-1/2 transform -translate-x-1/2 w-28 h-6 bg-black rounded-full z-50 flex items-center justify-center">
          <div className="w-2.5 h-2.5 bg-slate-900 rounded-full absolute right-4"></div>
          <div className="w-1.5 h-1.5 bg-blue-950 rounded-full absolute right-4 blur-[1px]"></div>
        </div>

        {/* Status Bar */}
        <div className="h-11 px-6 pt-3 flex items-center justify-between text-xs text-white font-medium bg-transparent z-40 shrink-0">
          <span>9:41</span>
          <div className="flex items-center gap-1.5">
            <Signal size={12} className="text-white fill-white" />
            <Wifi size={12} className="text-white fill-white" />
            <Battery size={16} className="text-white" />
          </div>
        </div>

        {/* Screen Content Wrapper */}
        <div className="flex-1 w-full overflow-hidden flex flex-col relative bg-slate-950 text-slate-100 font-sans">
          {children}
        </div>

        {/* Home Indicator Bar */}
        <div className="h-6 w-full flex items-center justify-center bg-transparent z-40 shrink-0">
          <div className="w-32 h-1 bg-white rounded-full opacity-60"></div>
        </div>
      </div>
    </div>
  );
}
