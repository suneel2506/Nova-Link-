import React, { useEffect, useState } from 'react';
import { ChevronLeft, Search, Laptop, Monitor, Smartphone, Globe } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import BottomNavigation from '../../components/BottomNavigation';
import useDeviceStore from '../../stores/deviceStore';
import { useDebounce } from '../../hooks/useDebounce';
import EmptyState from '../../components/ui/EmptyState';

export default function Devices({ onBack, setScreen }) {
  const { thisDevice, fetchDevices, setSearchQuery, searchQuery, getFilteredDevices, selectDevice, isLoading } = useDeviceStore();
  const [showSearch, setShowSearch] = useState(false);
  const [localSearch, setLocalSearch] = useState('');
  const debouncedSearch = useDebounce(localSearch, 300);

  useEffect(() => {
    fetchDevices();
  }, []);

  useEffect(() => {
    setSearchQuery(debouncedSearch);
  }, [debouncedSearch]);

  const filteredDevices = getFilteredDevices();

  const renderDeviceIcon = (type) => {
    const iconMap = {
      laptop: <Laptop className="w-5 h-5 text-slate-400" />,
      desktop: <Monitor className="w-5 h-5 text-slate-400" />,
      phone: <Smartphone className="w-5 h-5 text-slate-400" />,
      web: <Globe className="w-5 h-5 text-slate-400" />,
    };
    return iconMap[type] || <Monitor className="w-5 h-5 text-slate-400" />;
  };

  const handleDeviceTap = (device) => {
    selectDevice(device.id);
    if (device.isActive) {
      toast.success(`Connected to ${device.name}`);
    } else {
      toast(`${device.name} is ${device.status}`, { icon: '📡' });
    }
  };

  return (
    <motion.div
      className="flex-1 flex flex-col justify-between overflow-hidden bg-[#070b13]"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="px-5 py-3 flex items-center justify-between border-b border-slate-900/50 shrink-0">
        <div className="flex items-center gap-3">
          <motion.button onClick={onBack} className="text-slate-400 hover:text-white" whileTap={{ scale: 0.9 }} aria-label="Go back">
            <ChevronLeft size={20} />
          </motion.button>
          <span className="text-white text-base font-semibold">Devices</span>
        </div>
        <motion.button
          className="text-slate-400 hover:text-white p-1"
          onClick={() => setShowSearch(!showSearch)}
          whileTap={{ scale: 0.9 }}
          aria-label="Toggle search"
        >
          <Search size={18} />
        </motion.button>
      </div>

      {/* Search bar (toggled) */}
      {showSearch && (
        <motion.div
          className="px-5 pt-3"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
        >
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search devices..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              autoFocus
              className="w-full pl-9 pr-4 py-2 bg-slate-900/60 border border-slate-800/80 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all"
              aria-label="Search devices"
            />
          </div>
        </motion.div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {/* Section: This Device */}
        {thisDevice && (
          <div>
            <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2.5">This Device</h4>
            <div className="bg-blue-600/5 border border-blue-500/10 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                  <Laptop className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h5 className="text-sm font-semibold text-white">{thisDevice.name}</h5>
                  <p className="text-slate-400 text-xs mt-0.5">{thisDevice.os}</p>
                  <p className="text-slate-500 text-[10px] mt-0.5 font-mono">{thisDevice.ip}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 px-2 py-0.5 bg-green-500/10 border border-green-500/20 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                <span className="text-green-400 text-[9px] font-semibold uppercase tracking-wider">Online</span>
              </div>
            </div>
          </div>
        )}

        {/* Section: Other Devices */}
        <div>
          <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2.5">Other Devices</h4>
          {filteredDevices.length === 0 ? (
            <EmptyState type={localSearch ? 'noResults' : 'empty'} message={localSearch ? `No devices matching "${localSearch}"` : 'No other devices found'} />
          ) : (
            <div className="space-y-2">
              {filteredDevices.map((dev) => (
                <motion.div
                  key={dev.id}
                  onClick={() => handleDeviceTap(dev)}
                  className="bg-slate-900/30 border border-slate-900 rounded-xl p-4 flex items-center justify-between cursor-pointer hover:bg-slate-900/50 transition-colors"
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center border border-slate-800">
                      {renderDeviceIcon(dev.type)}
                    </div>
                    <div>
                      <h5 className="text-sm font-semibold text-white">{dev.name}</h5>
                      <p className="text-slate-400 text-xs mt-0.5">{dev.os}</p>
                      {dev.ip && <p className="text-slate-500 text-[10px] mt-0.5 font-mono">{dev.ip}</p>}
                    </div>
                  </div>
                  <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${dev.isActive ? 'bg-green-500/10 border border-green-500/20' : 'bg-slate-950 border border-slate-900'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${dev.isActive ? 'bg-green-500' : 'bg-slate-600'}`}></span>
                    <span className={`text-[9px] font-semibold uppercase tracking-wider ${dev.isActive ? 'text-green-400' : 'text-slate-500'}`}>{dev.status}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Nav */}
      <BottomNavigation activeTab="devices" onChange={setScreen} />
    </motion.div>
  );
}
