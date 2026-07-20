import React, { useState } from 'react';
import PhoneContainer from './components/PhoneContainer';
import DesktopContainer from './components/DesktopContainer';
import { Smartphone, Laptop, Sparkles } from 'lucide-react';

export default function App() {
  const [appMode, setAppMode] = useState('mobile'); // 'mobile' | 'desktop'

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col antialiased">
      {/* Developer Portal Header */}
      <header className="sticky top-0 z-50 bg-[#090d1a]/80 backdrop-blur-md border-b border-slate-900 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Sparkles size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-extrabold tracking-wider uppercase text-white flex items-center gap-1.5">
              Nova Link <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/20">UI Showcase</span>
            </h1>
            <p className="text-[9px] text-slate-500 font-medium mt-0.5">Pixel-perfect React re-creation of Mobile & Desktop screens</p>
          </div>
        </div>

        {/* View Switcher Segmented Control */}
        <div className="flex bg-slate-950 border border-slate-900 p-1 rounded-xl">
          <button
            onClick={() => setAppMode('mobile')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
              appMode === 'mobile'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone size={14} />
            Mobile App
          </button>
          <button
            onClick={() => setAppMode('desktop')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
              appMode === 'desktop'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Laptop size={14} />
            Laptop Agent
          </button>
        </div>

        <div className="hidden md:flex items-center gap-3 text-[10px] font-mono text-slate-500">
          <span>React 18</span>
          <span>•</span>
          <span>Vite</span>
          <span>•</span>
          <span>Tailwind v4</span>
        </div>
      </header>

      {/* Main Showcase viewport */}
      <main className="flex-1 w-full bg-[#050914] py-8 px-4 flex flex-col justify-center items-center overflow-x-hidden">
        {appMode === 'mobile' ? (
          <PhoneContainer />
        ) : (
          <DesktopContainer />
        )}
      </main>
    </div>
  );
}
