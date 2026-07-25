import React, { useState, useEffect } from 'react';
import PhoneSimulator from './PhoneSimulator';
import SplashScreen from '../pages/mobile/SplashScreen';
import LoginScreen from '../pages/mobile/LoginScreen';
import Dashboard from '../pages/mobile/Dashboard';
import Devices from '../pages/mobile/Devices';
import LiveScreen from '../pages/mobile/LiveScreen';
import Trackpad from '../pages/mobile/Trackpad';
import Keyboard from '../pages/mobile/Keyboard';
import Files from '../pages/mobile/Files';
import Apps from '../pages/mobile/Apps';
import SystemMonitor from '../pages/mobile/SystemMonitor';
import PowerControl from '../pages/mobile/PowerControl';
import Settings from '../pages/mobile/Settings';
import ActivityLogMobile from '../pages/mobile/ActivityLogMobile';
import useAuthStore from '../stores/authStore';
import LoadingSpinner from './ui/LoadingSpinner';

// Protected screens that require authentication
const PROTECTED_SCREENS = new Set([
  'dashboard', 'devices', 'live', 'trackpad', 'keyboard',
  'files', 'apps', 'system', 'power', 'settings', 'activity',
]);

export default function PhoneContainer() {
  const [currentScreen, setCurrentScreen] = useState('splash');
  const { isAuthenticated, initialized, logout } = useAuthStore();

  // Redirect to login if trying to access a protected screen while unauthenticated
  useEffect(() => {
    if (initialized && !isAuthenticated && PROTECTED_SCREENS.has(currentScreen)) {
      setCurrentScreen('login');
    }
  }, [isAuthenticated, initialized, currentScreen]);

  // Auto-navigate to dashboard if already authenticated (after splash)
  useEffect(() => {
    if (initialized && isAuthenticated && (currentScreen === 'splash' || currentScreen === 'login')) {
      setCurrentScreen('dashboard');
    }
  }, [initialized, isAuthenticated]);

  // Safety fallback: ensure initialized is set even if rehydration fired before listener
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!useAuthStore.getState().initialized) {
        useAuthStore.getState().initialize();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const handleLogout = async () => {
    await logout();
    setCurrentScreen('login');
  };

  const handleBack = () => {
    setCurrentScreen('dashboard');
  };

  const handleNavigate = (id) => {
    // Guard: require auth for protected screens
    if (PROTECTED_SCREENS.has(id) && !isAuthenticated) {
      setCurrentScreen('login');
      return;
    }
    setCurrentScreen(id);
  };

  const renderScreen = () => {
    // Show loading while initializing auth
    if (!initialized && PROTECTED_SCREENS.has(currentScreen)) {
      return (
        <div className="flex-1 flex items-center justify-center bg-[#070b13]">
          <LoadingSpinner size={32} className="text-blue-500" />
        </div>
      );
    }

    switch (currentScreen) {
      case 'splash':
        return <SplashScreen onNext={() => setCurrentScreen('login')} />;
      case 'login':
        return (
          <LoginScreen 
            onBack={() => setCurrentScreen('splash')} 
            onLogin={() => setCurrentScreen('dashboard')} 
          />
        );
      case 'dashboard':
        return (
          <Dashboard 
            onNavigate={handleNavigate} 
            setScreen={handleNavigate} 
          />
        );
      case 'devices':
        return <Devices onBack={handleBack} setScreen={handleNavigate} />;
      case 'live':
        return <LiveScreen onBack={handleBack} />;
      case 'trackpad':
        return <Trackpad onBack={handleBack} />;
      case 'keyboard':
        return <Keyboard onBack={handleBack} />;
      case 'files':
        return <Files onBack={handleBack} />;
      case 'apps':
        return <Apps onBack={handleBack} />;
      case 'system':
        return <SystemMonitor onBack={handleBack} />;
      case 'power':
        return <PowerControl onBack={handleBack} onLogout={handleLogout} />;
      case 'settings':
        return (
          <Settings 
            onBack={handleBack} 
            onLogout={handleLogout} 
            setScreen={handleNavigate} 
          />
        );
      case 'activity':
        return (
          <ActivityLogMobile 
            onBack={handleBack} 
            setScreen={handleNavigate} 
          />
        );
      default:
        return <SplashScreen onNext={() => setCurrentScreen('login')} />;
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      <PhoneSimulator currentScreenId={currentScreen} setScreen={setCurrentScreen}>
        {renderScreen()}
      </PhoneSimulator>
      
      {/* Key Features footer representing the mobile key features */}
      <div className="w-full max-w-6xl mt-12 bg-slate-900/40 border border-slate-900 p-6 rounded-2xl">
        <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-widest text-center mb-4">
          Key Features
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          {[
            { label: 'Ultra Low Latency', desc: 'Real-time performance' },
            { label: 'Secure Connection', desc: 'AES 256-bit encryption' },
            { label: 'File Transfer', desc: 'Drag-and-drop support' },
            { label: 'Multi Platform', desc: 'iOS, Android & Web' },
            { label: 'Voice Commands', desc: 'Hands-free execution' },
            { label: 'System Monitor', desc: 'Resource usage charts' },
            { label: 'Power Control', desc: 'Remote power states' },
            { label: 'End to End Encryption', desc: 'Peer-to-peer security' },
          ].map((feat, idx) => (
            <div key={idx} className="p-3 bg-slate-950/60 border border-slate-800/60 rounded-xl">
              <span className="text-xs font-semibold text-blue-400 block">{feat.label}</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">{feat.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
