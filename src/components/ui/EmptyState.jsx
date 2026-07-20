import React from 'react';
import { SearchX, WifiOff, Inbox } from 'lucide-react';

export default function EmptyState({ type = 'empty', message }) {
  const configs = {
    empty: { icon: Inbox, defaultMessage: 'Nothing here yet', color: 'text-slate-500' },
    noResults: { icon: SearchX, defaultMessage: 'No results found', color: 'text-slate-500' },
    offline: { icon: WifiOff, defaultMessage: 'Device is offline', color: 'text-amber-500' },
  };

  const config = configs[type] || configs.empty;
  const Icon = config.icon;

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center" role="status">
      <Icon size={32} className={`${config.color} mb-3 opacity-50`} />
      <p className="text-xs text-slate-500 font-medium">{message || config.defaultMessage}</p>
    </div>
  );
}
