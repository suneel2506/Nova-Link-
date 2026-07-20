import React, { useEffect } from 'react';
import { ChevronLeft, Search, HardDrive, Folder, ChevronRight, File, Trash2, Upload, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import useFileStore from '../../stores/fileStore';
import { useDebounce } from '../../hooks/useDebounce';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmModal from '../../components/ui/ConfirmModal';
import { getFileIconColor } from '../../utils/helpers';

export default function Files({ onBack }) {
  const {
    currentPath, breadcrumbs, searchQuery, isLoading, isUploading, uploadProgress,
    navigate, setSearchQuery, getFilteredItems, deleteMockFile, uploadMockFile,
  } = useFileStore();

  const [localSearch, setLocalSearch] = React.useState('');
  const [deleteTarget, setDeleteTarget] = React.useState(null);
  const debouncedSearch = useDebounce(localSearch, 300);

  useEffect(() => {
    navigate('/');
  }, []);

  useEffect(() => {
    setSearchQuery(debouncedSearch);
  }, [debouncedSearch]);

  const items = getFilteredItems();

  const handleItemClick = (item) => {
    if (item.type === 'drive' || item.type === 'folder') {
      navigate(item.path);
    } else {
      toast(`Opening ${item.name}`, { icon: '📄' });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMockFile(deleteTarget.id);
      toast.success(`Deleted ${deleteTarget.name}`);
    } catch {
      toast.error('Delete failed');
    }
    setDeleteTarget(null);
  };

  const handleUpload = async () => {
    try {
      await uploadMockFile('NewFile_' + Date.now() + '.txt');
      toast.success('File uploaded successfully');
    } catch {
      toast.error('Upload failed');
    }
  };

  const goBack = () => {
    if (breadcrumbs.length > 1) {
      const parentPath = breadcrumbs[breadcrumbs.length - 2].path;
      navigate(parentPath);
    } else {
      onBack();
    }
  };

  const getItemIcon = (item) => {
    if (item.type === 'drive') return <HardDrive className="w-4.5 h-4.5 text-blue-400" />;
    if (item.type === 'folder') return <Folder className="w-4.5 h-4.5 text-amber-400 fill-amber-400/10" />;
    return <File className={`w-4.5 h-4.5 ${getFileIconColor(item.ext)}`} />;
  };

  const getItemBg = (item) => {
    if (item.type === 'drive') return 'bg-blue-500/10 border-blue-500/15';
    if (item.type === 'folder') return 'bg-amber-500/10 border-amber-500/15';
    return 'bg-slate-500/10 border-slate-500/15';
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
          <motion.button onClick={goBack} className="text-slate-400 hover:text-white" whileTap={{ scale: 0.9 }} aria-label="Go back">
            {breadcrumbs.length > 1 ? <ArrowLeft size={20} /> : <ChevronLeft size={20} />}
          </motion.button>
          <span className="text-white text-sm font-semibold">Files</span>
        </div>
        <motion.button
          onClick={handleUpload}
          className="text-slate-400 hover:text-white p-1"
          whileTap={{ scale: 0.9 }}
          aria-label="Upload file"
        >
          <Upload size={18} />
        </motion.button>
      </div>

      {/* Breadcrumbs */}
      {breadcrumbs.length > 1 && (
        <div className="px-5 py-2 flex items-center gap-1 overflow-x-auto border-b border-slate-900/30">
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={crumb.path}>
              {idx > 0 && <ChevronRight size={10} className="text-slate-600 shrink-0" />}
              <button
                onClick={() => navigate(crumb.path)}
                className={`text-[10px] font-medium whitespace-nowrap cursor-pointer ${
                  idx === breadcrumbs.length - 1 ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {crumb.name}
              </button>
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Upload progress bar */}
      {isUploading && (
        <div className="px-5 pt-2">
          <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-blue-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${uploadProgress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <p className="text-[9px] text-slate-500 mt-1">Uploading... {uploadProgress}%</p>
        </div>
      )}

      {/* Main Files View */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {/* Search Input */}
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search files and folders"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900/60 border border-slate-800/80 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all duration-200"
            aria-label="Search files"
          />
        </div>

        {/* Section */}
        <div>
          <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-3">
            {breadcrumbs.length > 1 ? breadcrumbs[breadcrumbs.length - 1].name : 'This PC'}
          </h4>
          
          {items.length === 0 ? (
            <EmptyState type={localSearch ? 'noResults' : 'empty'} message={localSearch ? 'No files match your search' : 'This folder is empty'} />
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <motion.div 
                  key={item.id}
                  className="bg-slate-900/20 border border-slate-900/60 rounded-xl p-3.5 flex items-center justify-between hover:bg-slate-900/40 cursor-pointer group"
                  onClick={() => handleItemClick(item)}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center gap-3.5">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center border ${getItemBg(item)}`}>
                      {getItemIcon(item)}
                    </div>
                    <div>
                      <h5 className="text-xs font-semibold text-white">{item.name}</h5>
                      <p className="text-slate-400 text-[10px] mt-0.5">
                        {item.type === 'file' ? item.size : item.items ? `${item.items} items` : item.size}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.type === 'file' && (
                      <motion.button
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(item); }}
                        className="text-slate-700 hover:text-rose-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        whileTap={{ scale: 0.9 }}
                        aria-label={`Delete ${item.name}`}
                      >
                        <Trash2 size={12} />
                      </motion.button>
                    )}
                    <ChevronRight size={14} className="text-slate-600" />
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Delete File"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </motion.div>
  );
}
