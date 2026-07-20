import React, { useState, useEffect } from 'react';
import { ChevronLeft, Info, Volume2, VolumeX, Video, VideoOff, Sliders, Maximize2, Minimize2, Camera } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import useSessionStore from '../../stores/sessionStore';

export default function LiveScreen({ onBack }) {
  const { isMuted, isSpeakerOn, isFullscreen, quality, toggleMute, toggleSpeaker, toggleFullscreen, setQuality } = useSessionStore();
  const [currentTime, setCurrentTime] = useState('9:41 AM');

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }));
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const qualityOptions = ['720p', '1080p', '4K'];
  const currentQualityIdx = qualityOptions.indexOf(quality);

  const cycleQuality = () => {
    const next = qualityOptions[(currentQualityIdx + 1) % qualityOptions.length];
    setQuality(next);
    toast(`Quality: ${next}`, { icon: '📺' });
  };

  const handleScreenshot = () => {
    toast.success('Screenshot saved');
  };

  // Mock windows desktop icons
  const desktopIcons = [
    { name: 'This PC', icon: '💻' },
    { name: 'Recycle Bin', icon: '🗑️' },
    { name: 'Google Chrome', icon: '🌐' },
    { name: 'VS Code', icon: '📝' },
    { name: 'Folder', icon: '📁' },
  ];

  return (
    <motion.div
      className="flex-1 flex flex-col justify-between overflow-hidden bg-black relative"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="px-5 py-3 flex items-center justify-between bg-slate-950/80 border-b border-slate-900/50 shrink-0 z-10">
        <div className="flex items-center gap-3">
          <motion.button onClick={onBack} className="text-slate-400 hover:text-white" whileTap={{ scale: 0.9 }} aria-label="Go back">
            <ChevronLeft size={20} />
          </motion.button>
          <div>
            <span className="text-white text-sm font-semibold block">My Laptop</span>
            <span className="text-[9px] text-green-400 font-mono flex items-center gap-1">
              <span className="w-1 h-1 bg-green-500 rounded-full"></span> Live
            </span>
          </div>
        </div>
        <motion.button
          className="text-slate-400 hover:text-white p-1"
          onClick={handleScreenshot}
          whileTap={{ scale: 0.9 }}
          aria-label="Take screenshot"
        >
          <Camera size={18} />
        </motion.button>
      </div>

      {/* Simulated Windows 11 Desktop Screen */}
      <div className={`flex-1 relative overflow-hidden bg-[#101b35] flex flex-col justify-between p-4 select-none ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
        
        {/* Windows 11 Blue Bloom Wallpaper graphic */}
        <div className="absolute inset-0 bg-radial-gradient from-blue-600/40 via-indigo-950 to-slate-950 flex items-center justify-center">
          {/* Stylized Bloom shapes */}
          <div className="absolute w-[220px] h-[220px] bg-blue-500/20 rounded-full blur-[80px] animate-pulse"></div>
          <div className="absolute w-[180px] h-[180px] bg-purple-500/20 rounded-full blur-[60px]"></div>
          <div className="absolute w-[80px] h-[100px] bg-[#38bdf8]/30 rounded-full blur-2xl transform rotate-45"></div>
        </div>

        {/* Desktop Icons (Left Side Column) */}
        <div className="relative z-10 flex flex-col gap-4 items-start pt-2">
          {desktopIcons.map((item, idx) => (
            <motion.div
              key={idx}
              className="flex flex-col items-center justify-center w-14 h-14 rounded hover:bg-white/10 active:bg-white/20 p-1 cursor-pointer"
              whileTap={{ scale: 0.9 }}
              onClick={() => toast(`Opened ${item.name}`, { icon: item.icon })}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="text-[8px] text-white/95 font-medium tracking-wide mt-1 text-center truncate w-full shadow-sm">
                {item.name}
              </span>
            </motion.div>
          ))}
        </div>

        {/* Windows Taskbar at the bottom of the remote screen */}
        <div className="relative z-10 w-full h-8 bg-slate-900/80 backdrop-blur-md border-t border-white/5 rounded-md flex items-center justify-between px-3 mt-auto">
          {/* Start Menu & Icons Centered */}
          <div className="flex-1 flex justify-center items-center gap-2">
            {/* Windows 11 Start Logo representation */}
            <div className="w-3.5 h-3.5 grid grid-cols-2 gap-[1px] cursor-pointer">
              <div className="bg-[#0078d4]"></div>
              <div className="bg-[#0078d4]"></div>
              <div className="bg-[#0078d4]"></div>
              <div className="bg-[#0078d4]"></div>
            </div>
            
            {/* Taskbar pinned apps */}
            <div className="w-2.5 h-2.5 bg-yellow-500 rounded-sm"></div>
            <div className="w-2.5 h-2.5 bg-blue-500 rounded-sm"></div>
            <div className="w-2.5 h-2.5 bg-purple-500 rounded-sm"></div>
            <div className="w-2.5 h-2.5 bg-emerald-500 rounded-sm"></div>
          </div>
          
          {/* System Tray (Clock / Battery / Status) */}
          <div className="flex items-center gap-1.5 text-[8px] text-white/80 font-medium">
            <span>ENG</span>
            <span>{currentTime}</span>
          </div>
        </div>
      </div>

      {/* Floating Control Toolbar */}
      <motion.div
        className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 bg-slate-950/90 border border-slate-800/80 px-4 py-2.5 rounded-2xl shadow-xl backdrop-blur-lg"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <motion.button
          onClick={() => { toggleSpeaker(); toast(isSpeakerOn ? 'Speaker muted' : 'Speaker on', { icon: isSpeakerOn ? '🔇' : '🔊' }); }}
          className={`p-1 rounded-lg cursor-pointer ${isSpeakerOn ? 'text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800' : 'text-rose-400 bg-rose-500/10'}`}
          whileTap={{ scale: 0.9 }}
          aria-label="Toggle speaker"
        >
          {isSpeakerOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
        </motion.button>
        <motion.button
          onClick={() => { toggleMute(); toast(isMuted ? 'Mic unmuted' : 'Mic muted', { icon: isMuted ? '🎤' : '🔇' }); }}
          className={`p-1 rounded-lg cursor-pointer ${!isMuted ? 'text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800' : 'text-rose-400 bg-rose-500/10'}`}
          whileTap={{ scale: 0.9 }}
          aria-label="Toggle microphone"
        >
          {!isMuted ? <Video size={16} /> : <VideoOff size={16} />}
        </motion.button>
        <motion.button
          className="text-slate-400 hover:text-white p-1 bg-slate-900 rounded-lg hover:bg-slate-800 cursor-pointer"
          whileTap={{ scale: 0.9 }}
          aria-label="Settings"
        >
          <Sliders size={16} />
        </motion.button>
        <div className="w-[1px] h-5 bg-slate-800 mx-1"></div>
        <motion.button
          onClick={cycleQuality}
          className="text-blue-400 hover:text-blue-300 font-semibold text-[10px] px-2 py-1 bg-blue-500/10 rounded-lg cursor-pointer"
          whileTap={{ scale: 0.9 }}
          aria-label="Cycle quality"
        >
          {quality}
        </motion.button>
        <motion.button
          onClick={() => { toggleFullscreen(); toast(isFullscreen ? 'Exited fullscreen' : 'Fullscreen mode', { icon: '🖥️' }); }}
          className="text-slate-400 hover:text-white p-1 bg-slate-900 rounded-lg hover:bg-slate-800 cursor-pointer"
          whileTap={{ scale: 0.9 }}
          aria-label="Toggle fullscreen"
        >
          {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
