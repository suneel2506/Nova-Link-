import React, { useState } from 'react';
import { Upload, FileText, Image, ChevronRight, CheckCircle, X } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { fileTransfers } from '../../data/mockData';

export default function FileTransferWindow() {
  const [activeTab, setActiveTab] = useState('send');
  const [isDragOver, setIsDragOver] = useState(false);
  const [transfers, setTransfers] = useState([...fileTransfers]);
  const [uploadProgress, setUploadProgress] = useState(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    simulateUpload('dropped_file.pdf');
  };

  const handleBrowse = () => {
    simulateUpload('selected_file.png');
  };

  const simulateUpload = (fileName) => {
    setUploadProgress(0);
    toast(`Sending ${fileName}...`, { icon: '📤' });

    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setUploadProgress(null);
          toast.success(`${fileName} sent successfully`);
          // Add to top of transfers
          setTransfers((prev) => [
            {
              id: Date.now(),
              name: fileName,
              size: '2.4 MB',
              type: fileName.endsWith('.pdf') ? 'pdf' : 'image',
              direction: 'to',
              time: 'Just now',
            },
            ...prev,
          ]);
          return 100;
        }
        return prev + 20;
      });
    }, 300);
  };

  const removeTransfer = (id) => {
    setTransfers((prev) => prev.filter((t) => t.id !== id));
    toast.success('Transfer removed');
  };

  return (
    <div className="bg-slate-950/80 border border-slate-900 rounded-2xl overflow-hidden font-sans w-full shadow-lg flex flex-col justify-between h-[300px]">
      {/* Title bar */}
      <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-900 flex items-center justify-between shrink-0">
        <span className="text-white text-xs font-bold tracking-wide">File Transfer</span>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-slate-800"></div>
          <div className="w-2 h-2 rounded-full bg-slate-800"></div>
          <div className="w-2 h-2 rounded-full bg-slate-800"></div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-slate-950 border-b border-slate-900 grid grid-cols-2 text-center text-[10px] font-semibold tracking-wider uppercase shrink-0 select-none">
        <button
          onClick={() => setActiveTab('send')}
          className={`py-2 cursor-pointer transition-colors ${activeTab === 'send' ? 'text-blue-400 bg-blue-500/5 font-bold border-b border-blue-500' : 'text-slate-500 hover:text-slate-350'}`}
        >
          Send to Device
        </button>
        <button
          onClick={() => setActiveTab('receive')}
          className={`py-2 cursor-pointer transition-colors ${activeTab === 'receive' ? 'text-blue-400 bg-blue-500/5 font-bold border-b border-blue-500' : 'text-slate-500 hover:text-slate-350'}`}
        >
          Receive from Device
        </button>
      </div>

      {/* Body Content */}
      <div className="p-4 flex-1 overflow-y-auto space-y-3 flex flex-col">
        {/* Drop Zone */}
        <motion.div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleBrowse}
          className={`border border-dashed rounded-xl p-3 flex flex-col items-center justify-center text-center cursor-pointer group py-4 transition-colors ${
            isDragOver
              ? 'border-blue-500/60 bg-blue-500/5'
              : 'border-slate-800/80 hover:border-blue-500/30 bg-slate-900/10'
          }`}
          whileTap={{ scale: 0.98 }}
        >
          <Upload size={18} className={`mb-1 transition-colors ${isDragOver ? 'text-blue-400' : 'text-slate-650 group-hover:text-blue-400'}`} />
          <span className="text-[10px] text-slate-400 font-medium leading-relaxed">
            Drag & drop files to send or <span className="text-blue-400 group-hover:underline">Browse Files</span>
          </span>
        </motion.div>

        {/* Upload progress */}
        {uploadProgress !== null && (
          <div>
            <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-blue-500 rounded-full"
                animate={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-[9px] text-slate-500 mt-1 text-right">{uploadProgress}%</p>
          </div>
        )}

        {/* Recent Transfers */}
        <div className="flex-1 flex flex-col min-h-0">
          <span className="text-[9px] text-slate-500 uppercase tracking-widest font-semibold block mb-2">Recent Transfers</span>
          <div className="space-y-2 overflow-y-auto flex-1 pr-0.5">
            {transfers.length === 0 ? (
              <div className="text-center text-slate-600 text-[10px] py-4">No transfers yet</div>
            ) : (
              transfers.map((ft) => (
                <motion.div
                  key={ft.id}
                  className="flex items-center justify-between p-2 hover:bg-slate-900/20 rounded-lg text-xs border border-transparent hover:border-slate-900/40 group"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
                      {ft.type === 'pdf' ? <FileText size={14} className="text-red-400" /> : <Image size={14} className="text-green-400" />}
                    </div>
                    <div className="min-w-0">
                      <span className="text-slate-200 font-semibold truncate block max-w-[110px]">{ft.name}</span>
                      <span className="text-[9px] text-slate-500 block mt-0.5 font-mono">{ft.size} • {ft.direction === 'to' ? 'To My Phone' : 'From My Phone'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <motion.button
                      onClick={() => removeTransfer(ft.id)}
                      className="text-slate-700 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      whileTap={{ scale: 0.9 }}
                      aria-label={`Remove ${ft.name}`}
                    >
                      <X size={12} />
                    </motion.button>
                    <span className="text-[9px] text-slate-550 font-mono shrink-0">{ft.time}</span>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Footer Link */}
      <div className="p-2.5 border-t border-slate-900 shrink-0 text-center">
        <motion.button
          className="text-[9px] text-slate-450 hover:text-slate-300 font-bold uppercase tracking-wider flex items-center justify-center gap-0.5 mx-auto cursor-pointer"
          whileTap={{ scale: 0.95 }}
          onClick={() => toast('Viewing all transfers', { icon: '📁' })}
        >
          View All Transfers
          <ChevronRight size={12} />
        </motion.button>
      </div>
    </div>
  );
}
