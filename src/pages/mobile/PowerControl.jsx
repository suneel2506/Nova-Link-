import React, { useState } from 'react';
import { ChevronLeft, Info, Lock, RotateCw, Power, Moon, HardDrive, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import ConfirmModal from '../../components/ui/ConfirmModal';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { executePowerAction } from '../../services/mockApi';
import useAuthStore from '../../stores/authStore';

export default function PowerControl({ onBack, onLogout }) {
  const [activeModal, setActiveModal] = useState(null);
  const [loadingAction, setLoadingAction] = useState(null);
  const { logout } = useAuthStore();

  const actions = [
    { id: 'lock', name: 'Lock', icon: Lock, desc: 'Secure the desktop session', color: 'text-purple-400 bg-purple-500/10', variant: 'info' },
    { id: 'restart', name: 'Restart', icon: RotateCw, desc: 'Reboot the host machine', color: 'text-blue-400 bg-blue-500/10', variant: 'warning' },
    { id: 'shutdown', name: 'Shutdown', icon: Power, desc: 'Power down the device', color: 'text-rose-500 bg-rose-500/10', variant: 'danger' },
    { id: 'sleep', name: 'Sleep', icon: Moon, desc: 'Put device to low power', color: 'text-orange-400 bg-orange-500/10', variant: 'info' },
    { id: 'hibernate', name: 'Hibernate', icon: HardDrive, desc: 'Save state and power down', color: 'text-cyan-400 bg-cyan-500/10', variant: 'info' },
    { id: 'signout', name: 'Sign Out', icon: LogOut, desc: 'Log out from Nova Link', color: 'text-slate-400 bg-slate-500/10', variant: 'danger' }
  ];

  const handleAction = (action) => {
    setActiveModal(action);
  };

  const handleConfirm = async () => {
    if (!activeModal) return;
    setLoadingAction(activeModal.id);
    setActiveModal(null);

    try {
      if (activeModal.id === 'signout') {
        logout();
        toast.success('Signed out successfully');
        onLogout();
      } else {
        await executePowerAction(activeModal.id);
        toast.success(`${activeModal.name} command sent`);
      }
    } catch {
      toast.error(`Failed to execute ${activeModal.name}`);
    }
    setLoadingAction(null);
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
          <span className="text-white text-sm font-semibold">Power Control</span>
        </div>
        <motion.button className="text-slate-400 hover:text-white p-1" whileTap={{ scale: 0.9 }} aria-label="Info">
          <Info size={18} />
        </motion.button>
      </div>

      {/* Power Options list */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
        {actions.map((act) => {
          const IconComp = act.icon;
          const isLoading = loadingAction === act.id;
          return (
            <motion.button
              key={act.id}
              onClick={() => handleAction(act)}
              disabled={isLoading}
              className="w-full text-left bg-slate-900/20 border border-slate-900 hover:bg-slate-900/40 hover:border-slate-800 rounded-xl p-4 flex items-center justify-between cursor-pointer transition-all duration-150 disabled:opacity-50"
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center gap-3.5">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${act.color} border-white/5`}>
                  {isLoading ? <LoadingSpinner size={18} className={act.color.split(' ')[0]} /> : <IconComp size={18} className="stroke-[2]" />}
                </div>
                <div>
                  <h5 className="text-xs font-semibold text-white">{act.name}</h5>
                  <p className="text-slate-500 text-[9px] mt-0.5">{act.desc}</p>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={!!activeModal}
        title={`Confirm ${activeModal?.name || ''}`}
        message={`Are you sure you want to ${(activeModal?.name || '').toLowerCase()}? ${
          activeModal?.id === 'shutdown' ? 'The remote device will be powered off.' :
          activeModal?.id === 'signout' ? 'You will be logged out of Nova Link.' :
          'This action will be sent to the host machine.'
        }`}
        confirmLabel={activeModal?.name || 'Confirm'}
        variant={activeModal?.variant || 'info'}
        onConfirm={handleConfirm}
        onCancel={() => setActiveModal(null)}
      />
    </motion.div>
  );
}
