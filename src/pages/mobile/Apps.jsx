import React, { useEffect } from 'react';
import { ChevronLeft, Search, Code, Globe, Music, Layers, FileText, MessageCircle, Send, MessageSquare, Video, Heart, Terminal, FileEdit, PlayCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import useAppStore from '../../stores/appStore';
import { useDebounce } from '../../hooks/useDebounce';
import EmptyState from '../../components/ui/EmptyState';

export default function Apps({ onBack }) {
  const {
    categories, activeCategory, launchingApp, isLoading,
    fetchApps, setSearchQuery, setActiveCategory, toggleFavorite, launchApp, getFilteredApps,
  } = useAppStore();
  const [localSearch, setLocalSearch] = React.useState('');
  const debouncedSearch = useDebounce(localSearch, 300);

  useEffect(() => {
    fetchApps();
  }, []);

  useEffect(() => {
    setSearchQuery(debouncedSearch);
  }, [debouncedSearch]);

  const filteredApps = getFilteredApps();

  // Map icon strings to Lucide components
  const iconMap = {
    Code: { icon: Code, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
    Chrome: { icon: Globe, color: 'text-red-400 bg-red-500/10 border-red-500/20' },
    Music: { icon: Music, color: 'text-green-400 bg-green-500/10 border-green-500/20' },
    Layers: { icon: Layers, color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
    FileText: { icon: FileText, color: 'text-slate-300 bg-slate-500/10 border-slate-500/20' },
    MessageCircle: { icon: MessageCircle, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
    Send: { icon: Send, color: 'text-sky-400 bg-sky-500/10 border-sky-500/20' },
    Slack: { icon: MessageSquare, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
    Video: { icon: Video, color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' },
    Terminal: { icon: Terminal, color: 'text-slate-300 bg-slate-500/10 border-slate-500/20' },
    FileEdit: { icon: FileEdit, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
    PlayCircle: { icon: PlayCircle, color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
  };

  const handleLaunch = async (app) => {
    await launchApp(app.id);
    toast.success(`Launching ${app.name}...`);
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
          <span className="text-white text-sm font-semibold">Apps</span>
        </div>
        <motion.button className="text-slate-400 hover:text-white p-1" whileTap={{ scale: 0.9 }} aria-label="Search">
          <Search size={18} />
        </motion.button>
      </div>

      {/* Main Apps View */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {/* Search Input */}
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search apps"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900/60 border border-slate-800/80 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all duration-200"
            aria-label="Search apps"
          />
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {categories.map((cat) => (
            <motion.button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider cursor-pointer transition-colors ${
                activeCategory === cat
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-900/40 text-slate-500 hover:text-slate-300 border border-slate-900'
              }`}
              whileTap={{ scale: 0.95 }}
            >
              {cat}
            </motion.button>
          ))}
        </div>

        {/* Section Title */}
        <div>
          <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-3">
            {activeCategory === 'All' ? 'Installed Apps' : activeCategory}
          </h4>
          
          {filteredApps.length === 0 ? (
            <EmptyState type="noResults" message={`No apps found${localSearch ? ` matching "${localSearch}"` : ''}`} />
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {filteredApps.map((app) => {
                const iconConfig = iconMap[app.icon] || { icon: Code, color: 'text-slate-400 bg-slate-500/10' };
                const IconComp = iconConfig.icon;
                const isLaunching = launchingApp === app.id;
                
                return (
                  <motion.div 
                    key={app.id}
                    className="bg-slate-900/25 border border-slate-900/60 rounded-2xl p-4 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-900/40 hover:border-slate-800 transition-all duration-200 relative"
                    onClick={() => handleLaunch(app)}
                    whileTap={{ scale: 0.9 }}
                    animate={isLaunching ? { scale: [1, 1.1, 1] } : {}}
                    transition={isLaunching ? { duration: 0.4 } : {}}
                  >
                    {/* Favorite toggle */}
                    <motion.button
                      onClick={(e) => { e.stopPropagation(); toggleFavorite(app.id); }}
                      className="absolute top-2 right-2 cursor-pointer"
                      whileTap={{ scale: 1.3 }}
                      aria-label={app.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <Heart size={10} className={app.isFavorite ? 'text-rose-400 fill-rose-400' : 'text-slate-700'} />
                    </motion.button>

                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center border mb-2.5 ${iconConfig.color}`}>
                      <IconComp size={22} className="stroke-[1.8]" />
                    </div>
                    <span className="text-[10px] font-medium text-slate-200 tracking-wide truncate w-full">
                      {app.name}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* View All Button */}
        <motion.button
          className="w-full py-3 bg-slate-950 border border-slate-900 text-blue-400 hover:text-blue-300 font-semibold rounded-xl text-xs transition-all duration-150 cursor-pointer mt-4"
          whileTap={{ scale: 0.98 }}
          onClick={() => { setActiveCategory('All'); toast('Showing all apps', { icon: '📱' }); }}
        >
          View All Apps
        </motion.button>
      </div>
    </motion.div>
  );
}
