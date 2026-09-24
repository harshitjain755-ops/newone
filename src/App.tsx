import React, { useState, useEffect } from 'react';
import { ActiveTab, ChargesSettings, DailyPlan, DEFAULT_CHARGES_SETTINGS, Trade } from './types/trade';
import { generateSeedTrades, SEED_DAILY_PLANS } from './data/seedTrades';
import { calculateEstimatedCharges } from './utils/calculations';
import { Navbar } from './components/Navbar';
import { BottomTabBar } from './components/BottomTabBar';
import { Footer } from './components/Footer';
import { DashboardScreen } from './components/DashboardScreen';
import { TradesScreen } from './components/TradesScreen';
import { TradeDetailScreen } from './components/TradeDetailScreen';
import { WeeklyReportScreen } from './components/WeeklyReportScreen';
import { DailyPlanScreen } from './components/DailyPlanScreen';
import { SettingsModal } from './components/SettingsModal';
import { NewTradeModal } from './components/NewTradeModal';

export default function App() {
  // 1. Theme State (Light + Dark mode)
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('tradelog_theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('tradelog_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('tradelog_theme', 'light');
    }
  }, [darkMode]);

  // 2. Settings State (with 5 segment charge profiles)
  const [settings, setSettings] = useState<ChargesSettings>(() => {
    try {
      const saved = localStorage.getItem('tradelog_settings_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.equityIntraday && parsed.foOptions) {
          return parsed;
        }
      }
    } catch (e) {
      // fallback
    }
    return DEFAULT_CHARGES_SETTINGS;
  });

  // 3. Trades State (Persisted in localStorage with Tuesday-expiry and current NSE lot sizes mock data)
  const [trades, setTrades] = useState<Trade[]>(() => {
    try {
      const saved = localStorage.getItem('tradelog_trades_v3');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // If any NIFTY option trade still has old lot size 25, refresh to updated seed
          const hasOldLotSizes = parsed.some((t: Trade) => t.symbol?.includes('NIFTY') && t.lot_size === 25);
          if (!hasOldLotSizes) return parsed;
        }
      }
    } catch (e) {
      // fallback
    }
    return generateSeedTrades();
  });

  useEffect(() => {
    localStorage.setItem('tradelog_trades_v3', JSON.stringify(trades));
  }, [trades]);

  // 4. Daily Plans State
  const [dailyPlans, setDailyPlans] = useState<DailyPlan[]>(() => {
    try {
      const saved = localStorage.getItem('tradelog_plans_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      // fallback
    }
    return SEED_DAILY_PLANS;
  });

  useEffect(() => {
    localStorage.setItem('tradelog_plans_v2', JSON.stringify(dailyPlans));
  }, [dailyPlans]);

  // 5. Navigation & Screen Selection
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(() => {
    return trades.length > 0 ? trades[trades.length - 1] : null;
  });
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('All');

  // 6. Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isNewTradeOpen, setIsNewTradeOpen] = useState<boolean>(false);

  // Update Settings with recalculation of estimated charges
  const handleSaveSettings = (newSettings: ChargesSettings, recalculateAll: boolean) => {
    setSettings(newSettings);
    localStorage.setItem('tradelog_settings_v2', JSON.stringify(newSettings));

    if (recalculateAll) {
      setTrades((prev) =>
        prev.map((trade) => {
          const estimatedCharges = calculateEstimatedCharges(
            {
              segment: trade.segment,
              symbol: trade.symbol,
              side: trade.side,
              lots: trade.lots,
              lot_size: trade.lot_size,
              entry_price: trade.entry_price,
              exit_price: trade.exit_price,
              instrument_type: trade.instrument_type,
            },
            newSettings
          );
          const net_pnl = Math.round((trade.gross_pnl - estimatedCharges) * 100) / 100;
          return {
            ...trade,
            charges: estimatedCharges,
            net_pnl,
          };
        })
      );
    }
  };

  // Update individual trade (e.g. from Trade Detail quick tags or note)
  const handleUpdateTrade = (updated: Trade) => {
    setTrades((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    setSelectedTrade(updated);
  };

  // Add new trade
  const handleAddTrade = (newTrade: Trade) => {
    setTrades((prev) => [newTrade, ...prev]);
    setSelectedTrade(newTrade);
    setSelectedDateFilter(newTrade.date);
    setActiveTab('trades');
  };

  // Import trades from CSV
  const handleImportTrades = (imported: Trade[]) => {
    setTrades((prev) => [...imported, ...prev]);
    if (imported.length > 0) {
      setSelectedTrade(imported[0]);
    }
    setActiveTab('trades');
  };

  // Reset seed dataset
  const handleResetSeedData = () => {
    const seed = generateSeedTrades();
    setTrades(seed);
    setDailyPlans(SEED_DAILY_PLANS);
    setSettings(DEFAULT_CHARGES_SETTINGS);
    setSelectedTrade(seed[seed.length - 1]);
    setSelectedDateFilter('All');
    setActiveTab('dashboard');
  };

  // Select a trade to view
  const handleSelectTrade = (trade: Trade) => {
    setSelectedTrade(trade);
    setActiveTab('trade-detail');
  };

  // Save / Update a daily plan
  const handleSavePlan = (plan: DailyPlan) => {
    setDailyPlans((prev) => {
      const exists = prev.some((p) => p.date === plan.date);
      if (exists) {
        return prev.map((p) => (p.date === plan.date ? plan : p));
      }
      return [...prev, plan];
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      {/* Top Bar Contract (Wordmark + Clean Actions) */}
      <Navbar
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenNewTrade={() => setIsNewTradeOpen(true)}
      />

      {/* Main Mobile-First Frame */}
      <main className="flex-1 w-full max-w-md mx-auto px-4 pt-4">
        {activeTab === 'dashboard' && (
          <DashboardScreen
            trades={trades}
            onNavigateTab={(tab) => setActiveTab(tab)}
            onSelectDateFilter={(date) => {
              setSelectedDateFilter(date);
              setActiveTab('trades');
            }}
          />
        )}

        {activeTab === 'trades' && (
          <TradesScreen
            trades={trades}
            selectedDateFilter={selectedDateFilter}
            onSelectDateFilter={setSelectedDateFilter}
            onSelectTrade={handleSelectTrade}
            onOpenNewTrade={() => setIsNewTradeOpen(true)}
          />
        )}

        {activeTab === 'trade-detail' && selectedTrade && (
          <TradeDetailScreen
            trade={selectedTrade}
            allTrades={trades}
            settings={settings}
            onUpdateTrade={handleUpdateTrade}
            onBack={() => setActiveTab('trades')}
          />
        )}

        {activeTab === 'weekly-report' && (
          <WeeklyReportScreen trades={trades} />
        )}

        {activeTab === 'daily-plan' && (
          <DailyPlanScreen
            trades={trades}
            dailyPlans={dailyPlans}
            onSavePlan={handleSavePlan}
            onSelectTrade={handleSelectTrade}
          />
        )}
      </main>

      {/* Footer on Every Screen: "For self-review only. Not investment advice." */}
      <div className="pb-16 max-w-md mx-auto w-full">
        <Footer />
      </div>

      {/* Fixed Bottom Tab Bar Navigation */}
      <BottomTabBar
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        hasSelectedTrade={selectedTrade !== null}
      />

      {/* Settings & Charges Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
        trades={trades}
        onImportTrades={handleImportTrades}
        onResetSeedData={handleResetSeedData}
      />

      {/* Manual New Trade Modal */}
      <NewTradeModal
        isOpen={isNewTradeOpen}
        onClose={() => setIsNewTradeOpen(false)}
        onAddTrade={handleAddTrade}
        settings={settings}
      />
    </div>
  );
}
