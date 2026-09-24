import React from 'react';
import { ChargesSettings, EmotionType, FlagType, PlanFollowedType, SetupType, Trade } from '../types/trade';
import { calculateItemizedCharges, formatINR, formatINRWithDecimals } from '../utils/calculations';
import { evaluateAllTradesFlags, FLAG_DEFINITIONS, getBaselineProgress } from '../utils/flags';
import { 
  ArrowLeft, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Calendar, 
  FileText,
  Save,
  Tag,
  Receipt,
  Info
} from 'lucide-react';

interface TradeDetailScreenProps {
  trade: Trade;
  allTrades: Trade[];
  settings: ChargesSettings;
  onUpdateTrade: (updated: Trade) => void;
  onBack: () => void;
}

export const TradeDetailScreen: React.FC<TradeDetailScreenProps> = ({
  trade,
  allTrades,
  settings,
  onUpdateTrade,
  onBack,
}) => {
  const baselineInfo = getBaselineProgress(allTrades);
  const flagMap = evaluateAllTradesFlags(allTrades);
  const flags = baselineInfo.isReady ? flagMap.get(trade.id) || [] : [];

  const handleUpdate = (fields: Partial<Trade>) => {
    onUpdateTrade({
      ...trade,
      ...fields,
    });
  };

  const setups: SetupType[] = ['Breakout', 'Pullback', 'Reversal', 'Range', 'Other', 'Untagged'];
  const emotions: EmotionType[] = ['Calm', 'Fear', 'Greed', 'Revenge', 'FOMO', 'Untagged'];
  const plans: PlanFollowedType[] = ['Yes', 'No', 'Untagged'];

  const isWin = trade.net_pnl >= 0;
  const isEquity = trade.segment === 'Equity';
  const totalQty = trade.lots * trade.lot_size;

  // Itemized charges calculation
  const chargesBreakdown = calculateItemizedCharges(trade, settings);

  return (
    <div className="space-y-4 pb-24">
      {/* Top Header with Back button */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="min-h-[44px] px-3 -ml-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Trades</span>
        </button>

        <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">
          ID: {trade.id}
        </span>
      </div>

      {/* Main Trade Summary Card */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                  trade.side === 'Long'
                    ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400'
                    : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                }`}
              >
                {trade.side.toUpperCase()}
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">
                {trade.segment}
              </span>
            </div>

            <h1 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
              {trade.symbol}
            </h1>

            {/* Requirement 2: For Equity hide Lots & Lot Size everywhere; show only Quantity */}
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1 font-mono">
              {isEquity ? (
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {totalQty} shares
                </span>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {trade.lots} {trade.lots === 1 ? 'lot' : 'lots'}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{trade.lot_size} qty/lot ({totalQty} total)</span>
                </div>
              )}
            </div>
          </div>

          {/* Net P&L */}
          <div className="text-right">
            <span className="text-[11px] text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              Net P&L
            </span>
            <span
              className={`text-2xl font-bold font-mono tabular-nums block ${
                isWin
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {formatINRWithDecimals(trade.net_pnl)}
            </span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-mono mt-0.5">
              Est. charges ₹{chargesBreakdown.total.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Trade Timing & Price Grid */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-3 text-xs">
          <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl">
            <span className="text-slate-400 dark:text-slate-500 block text-[11px]">Entry Price</span>
            <span className="font-mono font-semibold text-slate-900 dark:text-white block mt-0.5">
              ₹{trade.entry_price.toFixed(2)}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              {trade.date} · {trade.entry_time}
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl">
            <span className="text-slate-400 dark:text-slate-500 block text-[11px]">Exit Price</span>
            <span className="font-mono font-semibold text-slate-900 dark:text-white block mt-0.5">
              ₹{trade.exit_price.toFixed(2)}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              {trade.date} · {trade.exit_time}
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl">
            <span className="text-slate-400 dark:text-slate-500 block text-[11px]">Hold Duration</span>
            <span className="font-mono font-semibold text-slate-900 dark:text-white block mt-0.5 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              {trade.hold_time}
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl">
            <span className="text-slate-400 dark:text-slate-500 block text-[11px]">Gross P&L</span>
            <span className={`font-mono font-semibold block mt-0.5 ${trade.gross_pnl >= 0 ? 'text-slate-900 dark:text-white' : 'text-rose-600 dark:text-rose-400'}`}>
              {formatINRWithDecimals(trade.gross_pnl)}
            </span>
          </div>
        </div>
      </section>

      {/* Requirement 3: Itemized Estimated Charges Breakdown */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5">
            <Receipt className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <h2 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Estimated Charges Breakdown
            </h2>
          </div>
          <span className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
            Estimated
          </span>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
          <div className="py-1.5 flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400">Estimated Brokerage (Buy + Sell)</span>
            <span className="font-mono text-slate-800 dark:text-slate-200 tabular-nums">
              ₹{chargesBreakdown.brokerage.toFixed(2)}
            </span>
          </div>

          <div className="py-1.5 flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400">
              Estimated STT / CTT
              <span className="text-[10px] text-slate-400 block">
                {trade.segment === 'Equity' ? 'Applied on Sell turnover' : 'Applied on Sell premium'}
              </span>
            </span>
            <span className="font-mono text-slate-800 dark:text-slate-200 tabular-nums">
              ₹{chargesBreakdown.stt.toFixed(2)}
            </span>
          </div>

          <div className="py-1.5 flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400">Estimated Exchange Turnover</span>
            <span className="font-mono text-slate-800 dark:text-slate-200 tabular-nums">
              ₹{chargesBreakdown.exchange.toFixed(2)}
            </span>
          </div>

          <div className="py-1.5 flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400">Estimated GST (18%)</span>
            <span className="font-mono text-slate-800 dark:text-slate-200 tabular-nums">
              ₹{chargesBreakdown.gst.toFixed(2)}
            </span>
          </div>

          <div className="py-1.5 flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400">
              Estimated Stamp Duty
              <span className="text-[10px] text-slate-400 block">Applied on Buy turnover only</span>
            </span>
            <span className="font-mono text-slate-800 dark:text-slate-200 tabular-nums">
              ₹{chargesBreakdown.stampDuty.toFixed(2)}
            </span>
          </div>

          <div className="pt-2 pb-0.5 flex items-center justify-between font-semibold text-slate-900 dark:text-white">
            <span>Total Estimated Charges</span>
            <span className="font-mono text-rose-600 dark:text-rose-400 tabular-nums">
              -₹{chargesBreakdown.total.toFixed(2)}
            </span>
          </div>
        </div>
      </section>

      {/* Triggered Flags for This Trade (Revenge, Size jump, Plan break, Loss streak) */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
        <h2 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Behavior Flags Triggered</span>
        </h2>

        {!baselineInfo.isReady ? (
          <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-amber-900 dark:text-amber-200 text-xs">
            <p className="font-semibold">Building your baseline</p>
            <p className="mt-0.5 text-amber-800/80 dark:text-amber-300/80">
              {baselineInfo.currentDays}/5 days logged. Flags unlock after 5 trading days.
            </p>
          </div>
        ) : flags.length === 0 ? (
          <div className="p-3 rounded-xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-900/40 flex items-center gap-2 text-teal-800 dark:text-teal-300 text-xs">
            <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
            <span>No flags triggered on this trade. Execution met criteria.</span>
          </div>
        ) : (
          <div className="space-y-2">
            {flags.map((flag) => {
              const def = FLAG_DEFINITIONS[flag];
              return (
                <div
                  key={flag}
                  className={`p-3 rounded-xl border text-xs ${
                    def.severity === 'danger'
                      ? 'bg-rose-50/50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50 text-rose-950 dark:text-rose-200'
                      : 'bg-amber-50/50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50 text-amber-950 dark:text-amber-200'
                  }`}
                >
                  <div className="font-semibold flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                      {def.title}
                    </span>
                    <span className="text-[10px] uppercase font-mono">{flag}</span>
                  </div>
                  <p className="mt-1 text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                    {def.description}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Quick Tag Section 1: Followed Plan (Big Buttons) */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">
          Did this trade follow your plan? (Quick Tag)
        </label>
        <div className="grid grid-cols-3 gap-2">
          {plans.map((p) => {
            const isSelected = trade.followed_plan === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => handleUpdate({ followed_plan: p })}
                className={`min-h-[48px] px-3 py-2 text-xs font-semibold rounded-xl border transition-all active:scale-95 flex items-center justify-center gap-1.5 ${
                  isSelected
                    ? p === 'Yes'
                      ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                      : p === 'No'
                      ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                      : 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                }`}
              >
                {p === 'Yes' && '✓ Plan Followed'}
                {p === 'No' && '✕ Plan Broken'}
                {p === 'Untagged' && 'Untagged'}
              </button>
            );
          })}
        </div>
      </section>

      {/* Quick Tag Section 2: Emotion (Big Buttons) */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">
          Primary Emotion at Entry (One-tap Quick Tag)
        </label>
        <div className="grid grid-cols-3 gap-2">
          {emotions.map((emo) => {
            const isSelected = trade.emotion === emo;
            return (
              <button
                key={emo}
                type="button"
                onClick={() => handleUpdate({ emotion: emo })}
                className={`min-h-[46px] px-2.5 py-2 text-xs font-medium rounded-xl border transition-all active:scale-95 ${
                  isSelected
                    ? emo === 'Calm'
                      ? 'bg-emerald-600 text-white border-emerald-600 font-bold shadow-xs'
                      : emo === 'Revenge'
                      ? 'bg-rose-600 text-white border-rose-600 font-bold shadow-xs'
                      : emo === 'FOMO' || emo === 'Greed'
                      ? 'bg-amber-600 text-white border-amber-600 font-bold shadow-xs'
                      : emo === 'Fear'
                      ? 'bg-violet-600 text-white border-violet-600 font-bold shadow-xs'
                      : 'bg-slate-800 text-white border-slate-800 font-bold dark:bg-slate-200 dark:text-slate-900'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                }`}
              >
                {emo}
              </button>
            );
          })}
        </div>
      </section>

      {/* Quick Tag Section 3: Setup (Big Buttons) */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">
          Trading Setup / Pattern (One-tap Quick Tag)
        </label>
        <div className="grid grid-cols-3 gap-2">
          {setups.map((s) => {
            const isSelected = trade.setup === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => handleUpdate({ setup: s })}
                className={`min-h-[46px] px-2.5 py-2 text-xs font-medium rounded-xl border transition-all active:scale-95 ${
                  isSelected
                    ? s === 'Untagged'
                      ? 'bg-slate-800 text-white border-slate-800 font-bold dark:bg-slate-200 dark:text-slate-900'
                      : 'bg-teal-600 text-white border-teal-600 font-bold shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                }`}
              >
                {s}
              </button>
            );
          })}
        </div>
      </section>

      {/* Note Field */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">
          Trader Journal Reflection Note
        </label>
        <textarea
          rows={3}
          value={trade.note}
          onChange={(e) => handleUpdate({ note: e.target.value })}
          placeholder="What went well? Did you exit as planned? What would you do differently next time?"
          className="w-full text-xs p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500 resize-none leading-relaxed"
        />
        <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-1">
          <Save className="w-3 h-3 text-teal-500" />
          <span>Changes auto-save instantly</span>
        </div>
      </section>
    </div>
  );
};
