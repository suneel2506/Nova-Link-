import React from 'react';

export default function SplashScreen({ onNext }) {
  return (
    <div 
      className="flex-1 flex flex-col items-center justify-between py-16 px-6 relative cursor-pointer overflow-hidden bg-[#070b13]"
      onClick={onNext}
    >
      {/* Wave Circles Background */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="absolute w-[200px] h-[200px] rounded-full border border-blue-500/5"></div>
        <div className="absolute w-[300px] h-[300px] rounded-full border border-blue-500/10"></div>
        <div className="absolute w-[420px] h-[420px] rounded-full border border-blue-500/10"></div>
        <div className="absolute w-[560px] h-[560px] rounded-full border border-blue-500/5"></div>
        <div className="absolute w-[700px] h-[700px] rounded-full border border-blue-500/5"></div>
        
        {/* Glow point */}
        <div className="absolute bottom-24 w-32 h-32 bg-blue-600/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-24 w-12 h-12 bg-cyan-400/20 rounded-full blur-xl"></div>
        <div className="absolute bottom-24 w-4 h-4 bg-cyan-400 rounded-full opacity-60"></div>
      </div>

      <div></div> {/* Top spacer */}

      {/* Main Logo & Title */}
      <div className="flex flex-col items-center z-10">
        {/* Hexagon N Logo */}
        <div className="w-28 h-32 relative mb-6 drop-shadow-[0_0_20px_rgba(59,130,246,0.3)]">
          <svg viewBox="0 0 100 115" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="50%" stopColor="#1d4ed8" />
                <stop offset="100%" stopColor="#7c3aed" />
              </linearGradient>
            </defs>
            {/* Hexagon Path */}
            <path 
              d="M50 0 L100 28.87 L100 86.6 L50 115.47 L0 86.6 L0 28.87 Z" 
              fill="url(#logoGrad)" 
            />
            {/* Inner Stylized N Shape */}
            <path 
              d="M30 30 L45 30 L70 70 L70 30 L80 30 L80 85 L65 85 L40 45 L40 85 L30 85 Z" 
              fill="#ffffff" 
              opacity="0.9"
            />
          </svg>
        </div>
        
        <h1 className="text-2xl font-bold tracking-[0.2em] text-white">NOVA LINK</h1>
        <p className="text-slate-400 text-xs mt-3 tracking-wide text-center max-w-[200px]">
          Your Laptop. Anywhere. Anytime.
        </p>
      </div>

      {/* Tap Instruction */}
      <div className="text-slate-500 text-xs z-10 uppercase tracking-widest animate-pulse">
        Tap screen to begin
      </div>
    </div>
  );
}
