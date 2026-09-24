import React, { useState, useMemo } from 'react';
import { EmotionType, FlagType, SetupType, Trade } from '../types/trade';
import { formatINR, formatINRWithDecimals } from '../utils/calculations';
import { evaluateAllTradesFlags, getBaselineProgress, getUniqueTradingDays } from '../utils/flags';
import { 
  Filter, 
  Search, 
  X, 
  Clock, 
  ChevronRight, 
  AlertCircle, 
  ArrowUpRight, 
  ArrowDownRight,
  Plus
} from 'lucide-react';

interface TradesScreenProps {
  trades: Trade[];
  selectedDateFilter: string;
  onSelectDateFilter: (date: string) => void;
  onSelectTrade: (trade: Trade) => void;
  onOpenNewTrade: () => void;
}

export const TradesScreen: React.FC<TradesScreenProps> = ({
  trades,
  selectedDateFilter,
  onSelectDateFilter,
  onSelectTrade,
  onOpenNewTrade,
}) => {
  const [setupFilter, setSetupFilter] = useState<string>('All');
  const [emotionFilter, setEmotionFilter] = useState<string>('All');
  const [pnlFilter, setPnlFilter] = useState<'All' | 'Winners' | 'Losers'>('All');
  const [searchSymbol, setSearchSymbol] = useState<string>('');
  const [showFiltersModal, setShowFiltersModal] = useState<boolean>(false);

  const uniqueDays = useMemo(() => getUniqueTradingDays(trades), [trades]);
  const flagMap = useMemo(() => evaluateAllTradesFlags(trades), [trades]);
  const baselineInfo = useMemo(() => getBaselineProgress(trades), [trades]);

  // Filtered trades
  const filteredTrades = useMemo(() => {
    return trades
      .filter((t) => {
        // Date filter
        if (selectedDateFilter && selectedDateFilter !== 'All' && t.date !== selectedDateFilter) {
          return false;
        }
        // Symbol search
        if (searchSymbol.trim()) {
          const query = searchSymbol.toLowerCase().trim();
          if (!t.symbol.toLowerCase().includes(query)) return false;
        }
        // Setup filter
        if (setupFilter !== 'All' && t.setup !== setupFilter) {
          return false;
        }
        // Emotion filter
        if (emotionFilter !== 'All' && t.emotion !== emotionFilter) {
          return false;
        }
        // Winners/Losers filter
        if (pnlFilter === 'Winners' && t.net_pnl <= 0) return false;
        if (pnlFilter === 'Losers' && t.net_pnl >= 0) return false;

        return true;
      })
      .sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return b.entry_time.localeCompare(a.entry_time);
      });
  }, [trades, selectedDateFilter, searchSymbol, setupFilter, emotionFilter, pnlFilter]);

  const aggregateNet = useMemo(() => {
    return filteredTrades.reduce((sum, t) => sum + t.net_pnl, 0);
  }, [filteredTrades]);

  const activeFiltersCount = [
    selectedDateFilter !== 'All' && selectedDateFilter !== '',
    setupFilter !== 'All',
    emotionFilter !== 'All',
    pnlFilter !== 'All',
    searchSymbol.trim().length > 0,
  ].filter(Boolean).length;

  const resetAllFilters = () => {
    onSelectDateFilter('All');
    setSetupFilter('All');
    setEmotionFilter('All');
    setPnlFilter('All');
    setSearchSymbol('');
  };

  return (
    <div className="space-y-3 pb-20">
      {/* Search & Quick Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-xs space-y-2.5">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchSymbol}
              onChange={(e) => setSearchSymbol(e.target.value)}
              placeholder="Search symbol (NIFTY, BANKNIFTY, RELIANCE...)"
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-500 text-slate-900 dark:text-white placeholder:text-slate-400"
            />
            {searchSymbol && (
              <button
                type="button"
                onClick={() => setSearchSymbol('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Date Selector Dropdown */}
          <select
            value={selectedDateFilter}
            onChange={(e) => onSelectDateFilter(e.target.value)}
            className="text-xs py-2 px-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-teal-500 font-mono"
          >
            <option value="All">All Dates</option>
            {uniqueDays.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        {/* Segmented Filter Buttons (Winners / Losers / All) */}
        <div className="flex items-center justify-between gap-1 pt-1">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-medium">
            <button
              type="button"
              onClick={() => setPnlFilter('All')}
              className={`px-3 py-1 rounded-lg transition-colors whitespace-nowrap ${
                pnlFilter === 'All'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All ({trades.length})
            </button>
            <button
              type="button"
              onClick={() => setPnlFilter('Winners')}
              className={`px-3 py-1 rounded-lg transition-colors whitespace-nowrap ${
                pnlFilter === 'Winners'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600'
              }`}
            >
              Winners
            </button>
            <button
              type="button"
              onClick={() => setPnlFilter('Losers')}
              className={`px-3 py-1 rounded-lg transition-colors whitespace-nowrap ${
                pnlFilter === 'Losers'
                  ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-rose-600'
              }`}
            >
              Losers
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowFiltersModal(!showFiltersModal)}
            className={`min-h-[36px] px-3 py-1.5 text-xs font-medium rounded-xl border flex items-center gap-1.5 transition-colors ${
              setupFilter !== 'All' || emotionFilter !== 'All'
                ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300'
                : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Tag Filters</span>
            {(setupFilter !== 'All' || emotionFilter !== 'All') && (
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
            )}
          </button>
        </div>

        {/* Collapsible Secondary Filters for Setup & Emotion */}
        {showFiltersModal && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="text-[11px] text-slate-500 dark:text-slate-400 mb-1 block">
                Setup Type
              </label>
              <select
                value={setupFilter}
                onChange={(e) => setSetupFilter(e.target.value)}
                className="w-full py-1.5 px-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300"
              >
                <option value="All">All Setups</option>
                <option value="Breakout">Breakout</option>
                <option value="Pullback">Pullback</option>
                <option value="Reversal">Reversal</option>
                <option value="Range">Range</option>
                <option value="Other">Other</option>
                <option value="Untagged">Untagged</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] text-slate-500 dark:text-slate-400 mb-1 block">
                Emotion Tag
              </label>
              <select
                value={emotionFilter}
                onChange={(e) => setEmotionFilter(e.target.value)}
                className="w-full py-1.5 px-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300"
              >
                <option value="All">All Emotions</option>
                <option value="Calm">Calm</option>
                <option value="Fear">Fear</option>
                <option value="Greed">Greed</option>
                <option value="Revenge">Revenge</option>
                <option value="FOMO">FOMO</option>
                <option value="Untagged">Untagged</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Aggregate Bar */}
      <div className="flex items-center justify-between px-2 text-xs text-slate-500 dark:text-slate-400">
        <span>
          Showing <strong>{filteredTrades.length}</strong> trades
          {activeFiltersCount > 0 && (
            <button
              type="button"
              onClick={resetAllFilters}
              className="ml-2 text-teal-600 dark:text-teal-400 underline hover:no-underline"
            >
              Reset filters
            </button>
          )}
        </span>
        <span className="font-mono tabular-nums">
          Net: <strong className={aggregateNet >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
            {formatINR(aggregateNet)}
          </strong>
        </span>
      </div>

      {/* Trades List */}
      {filteredTrades.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            No trades match your filters
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            Try resetting your search query or date selector.
          </p>
          <button
            type="button"
            onClick={resetAllFilters}
            className="mt-3 text-xs font-semibold px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTrades.map((trade) => {
            const isWin = trade.net_pnl >= 0;
            const flags = flagMap.get(trade.id) || [];
            const hasFlags = baselineInfo.isReady && flags.length > 0;
            const isEquity = trade.segment === 'Equity';
            const totalQty = trade.lots * trade.lot_size;

            return (
              <button
                key={trade.id}
                type="button"
                onClick={() => onSelectTrade(trade)}
                className="w-full text-left bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-3.5 transition-all active:scale-[0.99] flex flex-col justify-between shadow-xs"
              >
                {/* Top Row: Symbol, Side, Position Size, Net P&L */}
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {trade.symbol}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded-sm ${
                          trade.side === 'Long'
                            ? 'text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60'
                            : 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60'
                        }`}
                      >
                        {trade.side}
                      </span>
                      {/* Requirement 2: For Equity show only Quantity; For F&O/MCX show Lots */}
                      {isEquity ? (
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 font-mono">
                          {totalQty} shares
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 font-mono">
                          {trade.lots} {trade.lots === 1 ? 'lot' : 'lots'}
                        </span>
                      )}
                    </div>

                    {/* Unboxed Metadata Line */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 mt-1 flex-wrap">
                      <span>{trade.date}</span>
                      <span aria-hidden="true">·</span>
                      <span>{trade.entry_time.slice(0, 5)}</span>
                      <span aria-hidden="true">·</span>
                      <span>Hold {trade.hold_time}</span>
                      <span aria-hidden="true">·</span>
                      <span>{trade.setup}</span>
                    </div>
                  </div>

                  {/* Net P&L & Estimated Charges */}
                  <div className="text-right shrink-0">
                    <div
                      className={`text-sm font-bold font-mono tabular-nums ${
                        isWin
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {formatINRWithDecimals(trade.net_pnl)}
                    </div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">
                      Est. charges -₹{trade.charges.toFixed(1)}
                    </div>
                  </div>
                </div>

                {/* Bottom Row */}
                <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                    <span>
                      Emotion: <strong className="text-slate-700 dark:text-slate-300">{trade.emotion}</strong>
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      Plan: <strong className={trade.followed_plan === 'Yes' ? 'text-teal-600 dark:text-teal-400' : trade.followed_plan === 'No' ? 'text-rose-500' : 'text-slate-400'}>{trade.followed_plan}</strong>
                    </span>
                  </div>

                  {hasFlags && (
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{flags[0]}{flags.length > 1 ? ` +${flags.length - 1}` : ''}</span>
                    </div>
                  )}

                  {!hasFlags && (
                    <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
