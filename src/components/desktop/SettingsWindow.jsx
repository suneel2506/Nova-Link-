import React from 'react';
import { ToggleRight, ToggleLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import useSettingsStore from '../../stores/settingsStore';

export default function SettingsWindow() {
  const { general, activeTab, setActiveTab, updateSetting, display } = useSettingsStore();

  const handleToggle = (section, key, label) => {
    const current = useSettingsStore.getState()[section]?.[key];
    updateSetting(section, key, !current);
    toast.success(`${label} ${!current ? 'enabled' : 'disabled'}`, { duration: 1500 });
  };

  const handleThemeChange = (e) => {
    updateSetting('display', 'theme', e.target.value);
    toast(`Theme set to ${e.target.value}`, { icon: '🎨' });
  };

  const handleLanguageChange = (e) => {
    updateSetting('general', 'language', e.target.value);
    toast(`Language set to ${e.target.value}`, { icon: '🌐' });
  };

  const handleCheckUpdate = () => {
    toast('Checking for updates...', { icon: '🔄', duration: 1500 });
    setTimeout(() => toast.success('You are on the latest version!'), 2000);
  };

  const tabContents = {
    general: (
      <>
        <ToggleRow label="Start with Windows" isOn={general?.startWithWindows ?? true} onToggle={() => handleToggle('general', 'startWithWindows', 'Start with Windows')} />
        <ToggleRow label="Minimize to tray" isOn={general?.minimizeToTray ?? true} onToggle={() => handleToggle('general', 'minimizeToTray', 'Minimize to tray')} />
        <ToggleRow label="Run in background" isOn={general?.runInBackground ?? true} onToggle={() => handleToggle('general', 'runInBackground', 'Run in background')} />

        <div className="flex items-center justify-between">
          <span className="font-medium text-slate-200">Theme</span>
          <select
            value={display?.theme ?? 'dark'}
            onChange={handleThemeChange}
            className="bg-slate-900 border border-slate-850 text-slate-300 rounded px-2.5 py-1 text-[11px] outline-none cursor-pointer"
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
            <option value="system">System</option>
          </select>
        </div>

        <div className="flex items-center justify-between">
          <span className="font-medium text-slate-200">Language</span>
          <select
            value={general?.language ?? 'en'}
            onChange={handleLanguageChange}
            className="bg-slate-900 border border-slate-850 text-slate-300 rounded px-2.5 py-1 text-[11px] outline-none cursor-pointer"
          >
            <option value="en">English</option>
            <option value="es">Español</option>
            <option value="fr">Français</option>
          </select>
        </div>
      </>
    ),
    security: (
      <>
        <ToggleRow label="Require password on connect" isOn={useSettingsStore.getState().security?.requirePassword ?? true} onToggle={() => handleToggle('security', 'requirePassword', 'Require password')} />
        <ToggleRow label="Two-factor authentication" isOn={useSettingsStore.getState().security?.twoFactorAuth ?? false} onToggle={() => handleToggle('security', 'twoFactorAuth', 'Two-factor auth')} />
        <ToggleRow label="Encrypt file transfers" isOn={useSettingsStore.getState().security?.encryptTransfers ?? true} onToggle={() => handleToggle('security', 'encryptTransfers', 'Encrypt transfers')} />
      </>
    ),
    network: (
      <>
        <div className="text-slate-500 text-[11px] py-4 text-center">
          Network configuration uses system defaults.
        </div>
      </>
    ),
    advanced: (
      <>
        <ToggleRow label="Auto-update agent" isOn={useSettingsStore.getState().general?.autoUpdate ?? true} onToggle={() => handleToggle('general', 'autoUpdate', 'Auto-update')} />
        <div className="text-slate-500 text-[11px]">
          Advanced settings for power users. <button className="text-blue-400 hover:underline cursor-pointer" onClick={() => toast('Logs exported', { icon: '📁' })}>Export Logs</button>
        </div>
      </>
    ),
  };

  return (
    <div className="bg-slate-950/80 border border-slate-900 rounded-2xl overflow-hidden font-sans w-full shadow-lg flex flex-col justify-between h-[300px]">
      {/* Title bar */}
      <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-900 flex items-center justify-between shrink-0">
        <span className="text-white text-xs font-bold tracking-wide">Settings</span>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-slate-800"></div>
          <div className="w-2 h-2 rounded-full bg-slate-800"></div>
          <div className="w-2 h-2 rounded-full bg-slate-800"></div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-slate-950 border-b border-slate-900 flex items-center justify-between text-[9px] font-semibold tracking-wider uppercase text-slate-500 shrink-0 select-none">
        {['general', 'security', 'network', 'advanced'].map((tab) => (
          <motion.button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 cursor-pointer text-center transition-colors ${activeTab === tab ? 'text-blue-400 bg-blue-500/5 font-bold border-b border-blue-500' : 'hover:text-slate-350'}`}
            whileTap={{ scale: 0.97 }}
          >
            {tab}
          </motion.button>
        ))}
      </div>

      {/* Body Content */}
      <div className="p-4 flex-1 overflow-y-auto space-y-3.5 text-xs text-slate-300">
        {tabContents[activeTab]}
      </div>

      {/* Footer Updater */}
      <div className="px-4 py-2.5 border-t border-slate-900 shrink-0 flex items-center justify-between text-[10px] text-slate-500">
        <div className="flex items-center gap-1">
          <span>Check for updates</span>
          <motion.button
            onClick={handleCheckUpdate}
            className="text-blue-400 font-bold hover:underline cursor-pointer"
            whileTap={{ scale: 0.95 }}
          >
            Check Now
          </motion.button>
        </div>
        <span className="font-mono">v1.0.0</span>
      </div>
    </div>
  );
}

// Reusable toggle row component
function ToggleRow({ label, isOn, onToggle }) {
  return (
    <div className="flex items-center justify-between">
      <span className="font-medium text-slate-200">{label}</span>
      <motion.button
        onClick={onToggle}
        className={`cursor-pointer ${isOn ? 'text-blue-500 hover:text-blue-400' : 'text-slate-650 hover:text-slate-500'}`}
        whileTap={{ scale: 0.9 }}
      >
        {isOn ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
      </motion.button>
    </div>
  );
}
