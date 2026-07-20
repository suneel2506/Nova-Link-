import React, { useState } from 'react';
import { ChevronLeft, Settings as SettingsIcon, Shield, Monitor, Volume2, Bell, Info, LogOut, ChevronRight, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import BottomNavigation from '../../components/BottomNavigation';
import ConfirmModal from '../../components/ui/ConfirmModal';
import useSettingsStore from '../../stores/settingsStore';
import useAuthStore from '../../stores/authStore';

export default function Settings({ onBack, onLogout, setScreen }) {
  const [expandedSection, setExpandedSection] = useState(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const settings = useSettingsStore();
  const { logout } = useAuthStore();

  const menuItems = [
    {
      id: 'general', name: 'General', icon: SettingsIcon, color: 'text-slate-300',
      toggles: [
        { key: 'startWithWindows', label: 'Start with Windows' },
        { key: 'minimizeToTray', label: 'Minimize to Tray' },
        { key: 'runInBackground', label: 'Run in Background' },
        { key: 'autoUpdate', label: 'Auto Update' },
      ]
    },
    {
      id: 'security', name: 'Security', icon: Shield, color: 'text-slate-300',
      toggles: [
        { key: 'allowRemoteAccess', label: 'Allow Remote Access' },
        { key: 'requirePassword', label: 'Require Password' },
        { key: 'twoFactorAuth', label: 'Two-Factor Auth' },
        { key: 'encryptTransfers', label: 'Encrypt Transfers' },
      ]
    },
    {
      id: 'display', name: 'Display', icon: Monitor, color: 'text-slate-300',
      toggles: []
    },
    { id: 'audio', name: 'Audio', icon: Volume2, color: 'text-slate-300', toggles: [] },
    {
      id: 'notifications', name: 'Notifications', icon: Bell, color: 'text-slate-300',
      toggles: [
        { key: 'enabled', label: 'Enable Notifications' },
        { key: 'sound', label: 'Notification Sound' },
        { key: 'sessionAlerts', label: 'Session Alerts' },
        { key: 'fileTransferAlerts', label: 'File Transfer Alerts' },
        { key: 'systemAlerts', label: 'System Alerts' },
      ]
    },
    {
      id: 'about', name: 'About Nova Link', icon: Info, color: 'text-slate-300',
      toggles: []
    }
  ];

  const toggleSetting = (section, key) => {
    const current = settings[section]?.[key];
    settings.updateSetting(section, key, !current);
    toast.success(`${key} ${!current ? 'enabled' : 'disabled'}`, { duration: 1500 });
  };

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    setShowLogoutModal(false);
    onLogout();
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
          <span className="text-white text-sm font-semibold">Settings</span>
        </div>
        <div></div> {/* Spacer */}
      </div>

      {/* Settings list */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        <div className="space-y-1">
          {menuItems.map((item) => {
            const IconComp = item.icon;
            const isExpanded = expandedSection === item.id;
            return (
              <div key={item.id}>
                <motion.button
                  onClick={() => setExpandedSection(isExpanded ? null : item.id)}
                  className="w-full bg-slate-900/10 border border-slate-900/40 hover:bg-slate-900/30 rounded-xl px-4 py-3.5 flex items-center justify-between cursor-pointer transition-all duration-150 mb-1.5"
                  whileTap={{ scale: 0.99 }}
                >
                  <div className="flex items-center gap-3.5">
                    <IconComp size={16} className={`${item.color} stroke-[2]`} />
                    <span className="text-xs font-semibold text-slate-200">{item.name}</span>
                  </div>
                  <motion.div animate={{ rotate: isExpanded ? 90 : 0 }}>
                    <ChevronRight size={14} className="text-slate-600" />
                  </motion.div>
                </motion.button>

                {/* Expanded toggles */}
                {isExpanded && item.toggles && item.toggles.length > 0 && (
                  <motion.div
                    className="ml-6 mb-3 space-y-1"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    {item.toggles.map((toggle) => {
                      const isOn = settings[item.id]?.[toggle.key] ?? false;
                      return (
                        <button
                          key={toggle.key}
                          onClick={() => toggleSetting(item.id, toggle.key)}
                          className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-950/40 border border-slate-900/30 rounded-lg cursor-pointer hover:bg-slate-900/30 transition-colors"
                        >
                          <span className="text-[11px] text-slate-400 font-medium">{toggle.label}</span>
                          <div className={`w-9 h-5 rounded-full flex items-center px-0.5 transition-colors duration-200 ${isOn ? 'bg-blue-600' : 'bg-slate-800'}`}>
                            <motion.div
                              className="w-4 h-4 bg-white rounded-full shadow-sm"
                              animate={{ x: isOn ? 16 : 0 }}
                              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                            />
                          </div>
                        </button>
                      );
                    })}
                  </motion.div>
                )}

                {/* About section content */}
                {isExpanded && item.id === 'about' && (
                  <motion.div
                    className="ml-6 mb-3 space-y-1.5"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                  >
                    {Object.entries(settings.about || {}).map(([key, val]) => (
                      <div key={key} className="flex items-center justify-between px-3 py-2 bg-slate-950/40 border border-slate-900/30 rounded-lg">
                        <span className="text-[11px] text-slate-500 font-medium capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                        <span className="text-[11px] text-slate-300 font-medium">{val}</span>
                      </div>
                    ))}
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>

        {/* Log Out button */}
        <motion.button
          onClick={() => setShowLogoutModal(true)}
          className="w-full bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/15 rounded-xl px-4 py-3.5 flex items-center justify-between cursor-pointer transition-all duration-150"
          whileTap={{ scale: 0.99 }}
        >
          <div className="flex items-center gap-3.5 text-rose-400">
            <LogOut size={16} className="stroke-[2]" />
            <span className="text-xs font-semibold">Log Out</span>
          </div>
          <ChevronRight size={14} className="text-rose-950" />
        </motion.button>
      </div>

      {/* Bottom Nav */}
      <BottomNavigation activeTab="settings" onChange={setScreen} />

      {/* Logout Confirmation */}
      <ConfirmModal
        isOpen={showLogoutModal}
        title="Log Out"
        message="Are you sure you want to log out? You will need to sign in again to access Nova Link."
        confirmLabel="Log Out"
        variant="danger"
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutModal(false)}
      />
    </motion.div>
  );
}
