import React from 'react';
import { ActiveTab } from '../types/trade';
import { 
  LayoutDashboard, 
  ArrowLeftRight, 
  FileText, 
  TrendingUp, 
  CalendarCheck 
} from 'lucide-react';

interface BottomTabBarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  hasSelectedTrade: boolean;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({
  activeTab,
  onTabChange,
  hasSelectedTrade,
}) => {
  const tabs = [
    {
      id: 'dashboard' as ActiveTab,
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'trades' as ActiveTab,
      label: 'Trades',
      icon: ArrowLeftRight,
    },
    {
      id: 'trade-detail' as ActiveTab,
      label: 'Detail',
      icon: FileText,
      disabled: !hasSelectedTrade,
    },
    {
      id: 'weekly-report' as ActiveTab,
      label: 'Report',
      icon: TrendingUp,
    },
    {
      id: 'daily-plan' as ActiveTab,
      label: 'Plan',
      icon: CalendarCheck,
    },
  ];

  return (
    <nav
      aria-label="Bottom Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 shadow-lg select-none pb-safe"
    >
      <div className="max-w-md mx-auto grid grid-cols-5 h-16 items-center px-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const isDisabled = tab.disabled;

          return (
            <button
              key={tab.id}
              type="button"
              disabled={isDisabled}
              onClick={() => onTabChange(tab.id)}
              className={`min-h-[48px] flex flex-col items-center justify-center transition-colors relative ${
                isDisabled
                  ? 'opacity-35 cursor-not-allowed text-slate-400 dark:text-slate-600'
                  : isActive
                  ? 'text-teal-600 dark:text-teal-400 font-semibold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-teal-600 dark:bg-teal-400" />
                )}
              </div>
              <span className="text-[10px] tracking-tight mt-1 leading-none">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
