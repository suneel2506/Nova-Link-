import React, { useState, useRef, useCallback } from 'react';
import { ChevronLeft, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import websocketManager from '../../services/websocketManager';

export default function Trackpad({ onBack }) {
  const [pointer, setPointer] = useState({ x: 150, y: 200 });
  const [clickFeedback, setClickFeedback] = useState(null); // 'left' | 'right' | null
  const [scrollY, setScrollY] = useState(0);
  const padRef = useRef(null);
  const lastTouchY = useRef(null);

  const handlePointerMove = useCallback((e) => {
    if (!padRef.current) return;
    const rect = padRef.current.getBoundingClientRect();
    
    // Support touch and mouse events
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(clientY - rect.top, rect.height));
    
    setPointer({ x, y });

    // Send mouse move via WS
    websocketManager.send('mouse_event', {
      action: 'move',
      x: Math.round(x),
      y: Math.round(y),
      screenWidth: Math.round(rect.width),
      screenHeight: Math.round(rect.height),
    });
  }, []);

  const handleTouchStart = useCallback((e) => {
    handlePointerMove(e);
  }, [handlePointerMove]);

  const handleClick = (type) => {
    setClickFeedback(type);
    toast(`${type === 'left' ? 'Left' : 'Right'} click sent`, { icon: type === 'left' ? '🖱️' : '📋' });
    setTimeout(() => setClickFeedback(null), 200);

    // Send click via WS
    websocketManager.send('mouse_event', {
      action: type === 'right' ? 'right_click' : 'click',
      button: type === 'right' ? 'right' : 'left',
      x: Math.round(pointer.x),
      y: Math.round(pointer.y),
      screenWidth: padRef.current?.clientWidth || 300,
      screenHeight: padRef.current?.clientHeight || 400,
    });
  };

  const handleScrollTouchStart = (e) => {
    lastTouchY.current = e.touches[0].clientY;
  };

  const handleScrollTouchMove = (e) => {
    if (lastTouchY.current === null) return;
    const deltaY = lastTouchY.current - e.touches[0].clientY;
    lastTouchY.current = e.touches[0].clientY;
    setScrollY((prev) => prev + deltaY);

    // Send scroll via WS
    if (Math.abs(deltaY) > 2) {
      websocketManager.send('mouse_event', {
        action: 'scroll',
        deltaY: Math.round(deltaY / 3),
      });
    }
  };

  const handleScrollTouchEnd = () => {
    lastTouchY.current = null;
  };

  return (
    <motion.div
      className="flex-1 flex flex-col justify-between overflow-hidden bg-[#070b13]"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="px-5 py-3 flex items-center justify-between border-b border-slate-900/50 shrink-0 z-10 bg-slate-950/20">
        <div className="flex items-center gap-3">
          <motion.button onClick={onBack} className="text-slate-400 hover:text-white" whileTap={{ scale: 0.9 }} aria-label="Go back">
            <ChevronLeft size={20} />
          </motion.button>
          <span className="text-white text-sm font-semibold">Trackpad</span>
        </div>
        <motion.button className="text-slate-400 hover:text-white p-1" whileTap={{ scale: 0.9 }} aria-label="Info">
          <Info size={18} />
        </motion.button>
      </div>

      {/* Coordinates Display */}
      <div className="px-5 pt-3 flex items-center justify-between">
        <span className="text-[9px] text-slate-500 font-mono">X: {Math.round(pointer.x)} Y: {Math.round(pointer.y)}</span>
        <span className="text-[9px] text-slate-500 font-mono">Scroll: {Math.round(scrollY)}</span>
      </div>

      {/* Main Touch Area */}
      <div className="flex-1 px-5 py-3 flex flex-col gap-4 overflow-hidden">
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
          <motion.div
            className="absolute w-8 h-8 rounded-full bg-blue-500/20 border border-blue-400 flex items-center justify-center pointer-events-none shadow-lg shadow-blue-500/20"
            animate={{
              left: pointer.x - 16,
              top: pointer.y - 16,
            }}
            transition={{ type: 'spring', damping: 30, stiffness: 500 }}
          >
            <div className="w-2.5 h-2.5 bg-blue-400 rounded-full"></div>
          </motion.div>
        </div>

        {/* Clicks & Scroll Row */}
        <div className="space-y-3 shrink-0">
          {/* Left / Right Click buttons */}
          <div className="grid grid-cols-2 gap-3">
            <motion.button
              onClick={() => handleClick('left')}
              className={`py-4 border rounded-xl font-medium text-xs cursor-pointer transition-all ${
                clickFeedback === 'left'
                  ? 'bg-blue-600/20 border-blue-500/40 text-blue-300'
                  : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800/40'
              }`}
              whileTap={{ scale: 0.95 }}
              aria-label="Left click"
            >
              Left Click
            </motion.button>
            <motion.button
              onClick={() => handleClick('right')}
              className={`py-4 border rounded-xl font-medium text-xs cursor-pointer transition-all ${
                clickFeedback === 'right'
                  ? 'bg-blue-600/20 border-blue-500/40 text-blue-300'
                  : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800/40'
              }`}
              whileTap={{ scale: 0.95 }}
              aria-label="Right click"
            >
              Right Click
            </motion.button>
          </div>

          {/* Scroll Area */}
          <div
            className="w-full py-3 bg-slate-950 border border-slate-900 rounded-xl flex items-center justify-center gap-2 select-none cursor-ns-resize"
            onTouchStart={handleScrollTouchStart}
            onTouchMove={handleScrollTouchMove}
            onTouchEnd={handleScrollTouchEnd}
          >
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">↕ Scroll Wheel</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}