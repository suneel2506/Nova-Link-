import React, { useState, useCallback } from 'react';
import { ChevronLeft, Info } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Keyboard({ onBack }) {
  const [typedText, setTypedText] = useState('');
  const [isShiftOn, setIsShiftOn] = useState(false);
  const [isCapsLock, setIsCapsLock] = useState(false);
  const [pressedKey, setPressedKey] = useState(null);

  const keyrows = [
    ['Esc', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'Del'],
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'enter'],
    ['shift', 'z', 'x', 'c', 'v', 'b', 'n', 'm', 'backspace'],
    ['ctrl', 'alt', 'space', 'alt', 'fn', 'ctrl']
  ];

  const handleKeyPress = useCallback((key) => {
    setPressedKey(key);
    setTimeout(() => setPressedKey(null), 150);

    if (key === 'space') {
      setTypedText((prev) => prev + ' ');
    } else if (key === 'backspace') {
      setTypedText((prev) => prev.slice(0, -1));
    } else if (key === 'enter') {
      setTypedText((prev) => prev + '\n');
    } else if (key === 'Del') {
      setTypedText('');
    } else if (key === 'shift') {
      setIsShiftOn((prev) => !prev);
    } else if (key === 'Esc') {
      setTypedText('');
    } else if (['ctrl', 'alt', 'fn', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10'].includes(key)) {
      // Modifier/function keys - no text output
    } else {
      const char = (isShiftOn || isCapsLock) ? key.toUpperCase() : key;
      setTypedText((prev) => prev + char);
      if (isShiftOn) setIsShiftOn(false); // Auto-release shift after one key
    }
  }, [isShiftOn, isCapsLock]);

  const getDisplayKey = (key) => {
    if (key === 'space') return 'space';
    if (key === 'backspace') return '⌫';
    if (key === 'enter') return '↵';
    if (key === 'shift') return '⇧';
    if ((isShiftOn || isCapsLock) && key.length === 1) return key.toUpperCase();
    return key;
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
          <span className="text-white text-sm font-semibold">Keyboard</span>
        </div>
        <div className="flex items-center gap-2">
          {isShiftOn && <span className="text-[9px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full font-semibold">SHIFT</span>}
          {isCapsLock && <span className="text-[9px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full font-semibold">CAPS</span>}
          <motion.button className="text-slate-400 hover:text-white p-1" whileTap={{ scale: 0.9 }} aria-label="Info">
            <Info size={18} />
          </motion.button>
        </div>
      </div>

      {/* Top half: Small screen view + typed text box */}
      <div className="flex-1 p-4 flex flex-col gap-3 overflow-hidden">
        {/* Remote Screen Mockup */}
        <div className="h-32 bg-[#101b35] border border-slate-900 rounded-xl relative overflow-hidden flex items-end p-2 select-none shrink-0">
          <div className="absolute inset-0 bg-radial-gradient from-blue-600/30 via-indigo-950 to-slate-950"></div>
          {/* Windows Bloom Center */}
          <div className="absolute top-1/2 left-1/2 w-24 h-24 -translate-x-1/2 -translate-y-1/2 bg-blue-500/20 rounded-full blur-2xl"></div>
          
          <div className="relative z-10 w-full bg-slate-950/70 border border-white/5 rounded-lg p-2 flex flex-col gap-1 text-[10px] text-slate-300 font-mono h-14 overflow-y-auto">
            {typedText ? (
              <span className="whitespace-pre-wrap break-all">{typedText}<span className="animate-pulse">▋</span></span>
            ) : (
              <span className="text-slate-600">Type on virtual keyboard below...</span>
            )}
          </div>
        </div>

        {/* Info panel */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <p className="text-[10px] text-slate-500 font-medium max-w-[200px]">
              Input characters are routed to the connected session host in real-time.
            </p>
            {typedText && (
              <p className="text-[9px] text-slate-600 mt-2 font-mono">{typedText.length} characters typed</p>
            )}
          </div>
        </div>
      </div>

      {/* Keyboard Area */}
      <div className="bg-slate-950 border-t border-slate-900 p-2 space-y-1.5 shrink-0 pb-4">
        {keyrows.map((row, rowIdx) => (
          <div key={rowIdx} className="flex justify-center gap-1">
            {row.map((key, keyIdx) => {
              const isSpecial = ['ctrl', 'alt', 'fn', 'shift', 'backspace', 'enter', 'space', 'Esc', 'Del', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10'].includes(key);
              const isPressed = pressedKey === key;
              const isShiftActive = key === 'shift' && isShiftOn;
              
              let keyWidth = 'flex-1';
              if (key === 'space') keyWidth = 'w-32';
              if (key === 'enter') keyWidth = 'w-14';
              if (key === 'backspace') keyWidth = 'w-14';
              if (key === 'shift') keyWidth = 'w-12';
              
              return (
                <motion.button
                  key={keyIdx}
                  onClick={() => handleKeyPress(key)}
                  className={`h-9 ${keyWidth} rounded-lg flex items-center justify-center text-[10px] font-semibold tracking-wide border cursor-pointer select-none transition-colors duration-75 ${
                    isPressed
                      ? 'bg-blue-600 text-white border-blue-500 scale-95'
                      : isShiftActive
                        ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                        : isSpecial
                          ? 'bg-slate-900 text-slate-400 border-slate-800'
                          : 'bg-slate-800/80 text-white border-slate-800/50 hover:bg-slate-700/80'
                  }`}
                  whileTap={{ scale: 0.9 }}
                >
                  {getDisplayKey(key)}
                </motion.button>
              );
            })}
          </div>
        ))}
      </div>
    </motion.div>
  );
}
