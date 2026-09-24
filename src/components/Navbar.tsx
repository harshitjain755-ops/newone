import React from 'react';
import { Plus, Settings, Sun, Moon } from 'lucide-react';

interface NavbarProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenSettings: () => void;
  onOpenNewTrade: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  darkMode,
  onToggleDarkMode,
  onOpenSettings,
  onOpenNewTrade,
}) => {
  return (
    <header className="sticky top-0 z-30 w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
        {/* Brand Zone: Clean single wordmark */}
        <div className="flex items-center gap-2">
          <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-teal-500 inline-block" />
            TradeLog AI
          </span>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium tracking-tight">
            NSE · BSE · MCX
          </span>
        </div>

        {/* Action Zone */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onOpenNewTrade}
            title="Log New Trade"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/40 rounded-full transition-colors active:scale-95"
            aria-label="Add Trade"
          >
            <Plus className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={onToggleDarkMode}
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors active:scale-95"
            aria-label="Toggle Theme"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            title="Settings & Charges"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors active:scale-95"
            aria-label="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
