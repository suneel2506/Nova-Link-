import React, { useState, useRef } from 'react';
import { ChevronLeft, Info, HelpCircle } from 'lucide-react';

export default function Trackpad({ onBack }) {
  const [pointer, setPointer] = useState({ x: 150, y: 200 });
  const padRef = useRef(null);

  const handlePointerMove = (e) => {
    if (!padRef.current) return;
    const rect = padRef.current.getBoundingClientRect();
    
    // Support touch and mouse events
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(clientY - rect.top, rect.height));
    
    setPointer({ x, y });
  };

  const handleTouchStart = (e) => {
    handlePointerMove(e);
  };

  return (
    <div className="flex-1 flex flex-col justify-between overflow-hidden bg-[#070b13]">
      {/* Header */}
      <div className="px-5 py-3 flex items-center justify-between border-b border-slate-900/50 shrink-0 z-10 bg-slate-950/20">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-slate-400 hover:text-white">
            <ChevronLeft size={20} />
          </button>
          <span className="text-white text-sm font-semibold">Trackpad</span>
        </div>
        <button className="text-slate-400 hover:text-white p-1">
          <Info size={18} />
        </button>
      </div>

      {/* Main Touch Area */}
      <div className="flex-1 px-5 py-4 flex flex-col gap-4 overflow-hidden">
        <div
          ref={padRef}
          onMouseMove={handlePointerMove}
          onTouchMove={handlePointerMove}
          onTouchStart={handleTouchStart}
          className="flex-1 bg-slate-950 border border-slate-900 rounded-2xl relative overflow-hidden cursor-crosshair flex flex-col items-center justify-center"
        >
          {/* Subtle grid bg dots */}
          <div className="absolute inset-0 opacity-15" style={{
            backgroundImage: 'radial-gradient(#3b82f6 1px, transparent 1px)',
            backgroundSize: '16px 16px'
          }}></div>

          <div className="text-slate-600 text-[10px] uppercase tracking-widest text-center select-none pointer-events-none z-0">
            Drag here to control mouse
          </div>

          {/* Interactive Cursor Dot */}
          <div
            className="absolute w-8 h-8 rounded-full bg-blue-500/20 border border-blue-400 flex items-center justify-center pointer-events-none transition-transform duration-75 shadow-lg shadow-blue-500/20"
            style={{
              left: pointer.x - 16,
              top: pointer.y - 16,
            }}
          >
            <div className="w-2.5 h-2.5 bg-blue-400 rounded-full"></div>
          </div>
        </div>

        {/* Clicks & Scroll Row */}
        <div className="space-y-3 shrink-0">
          {/* Left / Right Click buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button className="py-4 bg-slate-900/60 border border-slate-800 rounded-xl text-slate-300 font-medium text-xs hover:bg-slate-800/40 active:bg-blue-600/10 active:border-blue-500/30 cursor-pointer">
              Left Click
            </button>
            <button className="py-4 bg-slate-900/60 border border-slate-800 rounded-xl text-slate-300 font-medium text-xs hover:bg-slate-800/40 active:bg-blue-600/10 active:border-blue-500/30 cursor-pointer">
              Right Click
            </button>
          </div>

          {/* Scroll Area */}
          <div className="w-full py-3 bg-slate-950 border border-slate-900 rounded-xl flex items-center justify-center gap-2 select-none">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">↕ Scroll Wheel</span>
          </div>
        </div>
      </div>
    </div>
  );
}