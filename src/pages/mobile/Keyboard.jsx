import React, { useState } from 'react';
import { ChevronLeft, Info, HelpCircle } from 'lucide-react';

export default function Keyboard({ onBack }) {
  const [typedText, setTypedText] = useState('');

  const keyrows = [
    ['Esc', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'Del'],
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'enter'],
    ['shift', 'z', 'x', 'c', 'v', 'b', 'n', 'm', 'backspace'],
    ['ctrl', 'alt', 'space', 'alt', 'fn', 'ctrl']
  ];

  const handleKeyPress = (key) => {
    if (key === 'space') {
      setTypedText((prev) => prev + ' ');
    } else if (key === 'backspace') {
      setTypedText((prev) => prev.slice(0, -1));
    } else if (key === 'enter') {
      setTypedText((prev) => prev + '\n');
    } else if (['ctrl', 'alt', 'fn', 'shift', 'Esc', 'Del', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10'].includes(key)) {
      // Modifier keys
    } else {
      setTypedText((prev) => prev + key);
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
          <span className="text-white text-sm font-semibold">Keyboard</span>
        </div>
        <button className="text-slate-400 hover:text-white p-1">
          <Info size={18} />
        </button>
      </div>

      {/* Top half: Small screen view + typed text box */}
      <div className="flex-1 p-4 flex flex-col gap-3 overflow-hidden">
        {/* Remote Screen Mockup */}
        <div className="h-32 bg-[#101b35] border border-slate-900 rounded-xl relative overflow-hidden flex items-end p-2 select-none shrink-0">
          <div className="absolute inset-0 bg-radial-gradient from-blue-600/30 via-indigo-950 to-slate-950"></div>
          {/* Windows Bloom Center */}
          <div className="absolute top-1/2 left-1/2 w-24 h-24 -translate-x-1/2 -translate-y-1/2 bg-blue-500/20 rounded-full blur-2xl"></div>
          
          <div className="relative z-10 w-full bg-slate-950/70 border border-white/5 rounded-lg p-2 flex flex-col gap-1 text-[10px] text-slate-300 font-mono h-14 overflow-y-auto">
            {typedText ? typedText + '▋' : 'Type on virtual keyboard below...'}
          </div>
        </div>

        {/* Info panel */}
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-[10px] text-slate-500 text-center font-medium max-w-[200px]">
            Input characters are routed to the connected session host in real-time.
          </p>
        </div>
      </div>

      {/* Keyboard Area */}
      <div className="bg-slate-950 border-t border-slate-900 p-2 space-y-1.5 shrink-0 pb-4">
        {keyrows.map((row, rowIdx) => (
          <div key={rowIdx} className="flex justify-center gap-1">
            {row.map((key, keyIdx) => {
              const isSpecial = ['ctrl', 'alt', 'fn', 'shift', 'backspace', 'enter', 'space', 'Esc', 'Del', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10'].includes(key);
              
              let keyWidth = 'flex-1';
              if (key === 'space') keyWidth = 'w-32';
              if (key === 'enter') keyWidth = 'w-14';
              if (key === 'backspace') keyWidth = 'w-14';
              if (key === 'shift') keyWidth = 'w-12';
              
              return (
                <button
                  key={keyIdx}
                  onClick={() => handleKeyPress(key)}
                  className={`h-9 ${keyWidth} rounded-lg flex items-center justify-center text-[10px] font-semibold tracking-wide border cursor-pointer select-none active:bg-blue-600 active:text-white active:scale-95 transition-all duration-75 ${
                    isSpecial
                      ? 'bg-slate-900 text-slate-400 border-slate-800'
                      : 'bg-slate-800/80 text-white border-slate-800/50 hover:bg-slate-700/80'
                  }`}
                >
                  {key === 'space' ? 'space' : key}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
