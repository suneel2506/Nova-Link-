import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Info, Volume2, VolumeX, Video, VideoOff, Sliders, Maximize2, Minimize2, Camera } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import useSessionStore from '../../stores/sessionStore';

export default function LiveScreen({ onBack }) {
  const {
    isMuted, isSpeakerOn, isFullscreen, quality,
    toggleMute, toggleSpeaker, toggleFullscreen, setQuality,
    screenFrame, screenWidth, screenHeight, frameNumber, streamStatus, streamQuality,
    isConnected, sessionStatus,
  } = useSessionStore();
  const [currentTime, setCurrentTime] = useState('9:41 AM');
  const imgRef = useRef(null);

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
    if (screenFrame && imgRef.current) {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = imgRef.current.naturalWidth;
        canvas.height = imgRef.current.naturalHeight;
        canvas.getContext('2d').drawImage(imgRef.current, 0, 0);
        const link = document.createElement('a');
        link.download = `nova-screenshot-${Date.now()}.jpg`;
        link.href = canvas.toDataURL('image/jpeg', 0.9);
        link.click();
        toast.success('Screenshot saved');
      } catch {
        toast.error('Screenshot failed');
      }
    } else {
      toast.success('Screenshot saved');
    }
  };

  // Determine display status
  const isStreaming = streamStatus === 'streaming' && screenFrame;
  const statusText = isStreaming ? 'Live' :
    sessionStatus === 'connected' ? 'Connecting...' :
    sessionStatus === 'creating' || sessionStatus === 'waiting' ? 'Waiting...' :
    'Disconnected';
  const statusColor = isStreaming ? 'text-green-400' : sessionStatus === 'connected' ? 'text-yellow-400' : 'text-slate-500';
  const dotColor = isStreaming ? 'bg-green-500' : sessionStatus === 'connected' ? 'bg-yellow-500' : 'bg-slate-600';

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
            <span className="text-white text-sm font-semibold block">Remote Desktop</span>
            <span className={`text-[9px] ${statusColor} font-mono flex items-center gap-1`}>
              <span className={`w-1 h-1 ${dotColor} rounded-full ${isStreaming ? 'animate-pulse' : ''}`}></span>
              {statusText}
              {isStreaming && <span className="text-slate-600 ml-1">F{frameNumber} Q{streamQuality}</span>}
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

      {/* Screen Display Area */}
      <div className={`flex-1 relative overflow-hidden bg-[#101b35] flex items-center justify-center select-none ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
        {isStreaming ? (
          /* Real screen frame */
          <img
            ref={imgRef}
            src={`data:image/jpeg;base64,${screenFrame}`}
            alt="Remote Desktop"
            className="max-w-full max-h-full object-contain"
            draggable={false}
          />
        ) : (
          /* Placeholder / Status */
          <div className="flex flex-col items-center justify-center gap-4">
            {/* Bloom background */}
            <div className="absolute inset-0 bg-radial-gradient from-blue-600/40 via-indigo-950 to-slate-950 flex items-center justify-center">
              <div className="absolute w-[220px] h-[220px] bg-blue-500/20 rounded-full blur-[80px] animate-pulse"></div>
              <div className="absolute w-[180px] h-[180px] bg-purple-500/20 rounded-full blur-[60px]"></div>
            </div>
            <div className="relative z-10 text-center">
              {sessionStatus === 'connected' ? (
                <>
                  <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                  <p className="text-slate-400 text-xs">Starting stream...</p>
                </>
              ) : sessionStatus === 'creating' || sessionStatus === 'waiting' ? (
                <>
                  <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                  <p className="text-slate-400 text-xs">Waiting for desktop to accept...</p>
                </>
              ) : (
                <>
                  <div className="w-16 h-12 bg-slate-800 rounded border border-slate-700 mb-3 mx-auto flex items-center justify-center">
                    <div className="w-8 h-6 bg-slate-900 rounded-sm"></div>
                  </div>
                  <p className="text-slate-500 text-xs">No active session</p>
                  <p className="text-slate-600 text-[10px] mt-1">Connect from Devices page</p>
                </>
              )}
            </div>
          </div>
        )}
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
