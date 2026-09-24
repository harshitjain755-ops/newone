import React, { useState, useMemo } from 'react';
import { DailyPlan, Trade } from '../types/trade';
import { formatINR } from '../utils/calculations';
import { evaluateDayFlags, getBaselineProgress, getUniqueTradingDays } from '../utils/flags';
import { 
  CalendarCheck, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  History, 
  ArrowRight, 
  Flame,
  FileEdit,
  Sparkles
} from 'lucide-react';

interface DailyPlanScreenProps {
  trades: Trade[];
  dailyPlans: DailyPlan[];
  onSavePlan: (plan: DailyPlan) => void;
  onSelectTrade: (trade: Trade) => void;
}

export const DailyPlanScreen: React.FC<DailyPlanScreenProps> = ({
  trades,
  dailyPlans,
  onSavePlan,
  onSelectTrade,
}) => {
  const uniqueDays = useMemo(() => getUniqueTradingDays(trades), [trades]);
  const baselineInfo = useMemo(() => getBaselineProgress(trades), [trades]);

  const latestDate = uniqueDays.length > 0 ? uniqueDays[uniqueDays.length - 1] : '';
  const [selectedDay, setSelectedDay] = useState<string>(latestDate);

  const dayIndex = uniqueDays.indexOf(selectedDay);
  const yesterdayDate = dayIndex > 0 ? uniqueDays[dayIndex - 1] : null;

  const yesterdayPlanObj = yesterdayDate ? dailyPlans.find((p) => p.date === yesterdayDate) : null;

  const existingTodayPlanObj = dailyPlans.find((p) => p.date === selectedDay);
  const [tomorrowPlanInput, setTomorrowPlanInput] = useState<string>(
    existingTodayPlanObj ? existingTodayPlanObj.tomorrow_plan : ''
  );
  const [isSavedNotice, setIsSavedNotice] = useState<boolean>(false);

  const todayTrades = useMemo(() => {
    return trades.filter((t) => t.date === selectedDay);
  }, [trades, selectedDay]);

  const todayNetPnL = useMemo(() => {
    return todayTrades.reduce((sum, t) => sum + t.net_pnl, 0);
  }, [todayTrades]);

  const todayPlanYesCount = useMemo(() => {
    return todayTrades.filter((t) => t.followed_plan === 'Yes').length;
  }, [todayTrades]);

  const todayDisciplinePct = todayTrades.length > 0 
    ? Math.round((todayPlanYesCount / todayTrades.length) * 100) 
    : 100;

  const todayFlags = useMemo(() => {
    if (!baselineInfo.isReady || !selectedDay) return [];
    return evaluateDayFlags(selectedDay, trades);
  }, [baselineInfo.isReady, selectedDay, trades]);

  const handleSaveTomorrowPlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tomorrowPlanInput.trim() || !selectedDay) return;

    onSavePlan({
      date: selectedDay,
      tomorrow_plan: tomorrowPlanInput.trim(),
    });
    setIsSavedNotice(true);
    setTimeout(() => setIsSavedNotice(false), 2500);
  };

  return (
    <div className="space-y-4 pb-24">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">
            Daily Execution Plan
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Pre-commit your trading rules and audit execution against yesterday's promise
          </p>
        </div>

        {/* Date Selector */}
        <select
          value={selectedDay}
          onChange={(e) => {
            const newDate = e.target.value;
            setSelectedDay(newDate);
            const found = dailyPlans.find((p) => p.date === newDate);
            setTomorrowPlanInput(found ? found.tomorrow_plan : '');
          }}
          className="text-xs py-1.5 px-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 font-mono"
        >
          {uniqueDays.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      {/* 1. Comparison Card: Yesterday's Written Plan vs. Today's Actual Trades */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Plan vs. Actual Review ({selectedDay})
            </h2>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            {todayTrades.length} trades taken
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Left Column: Yesterday's Written Commitment */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Yesterday's Plan for Today
              {yesterdayDate && <span className="normal-case font-normal text-slate-400"> (set on {yesterdayDate})</span>}
            </span>

            {yesterdayPlanObj?.tomorrow_plan ? (
              <p className="mt-2 text-xs text-slate-800 dark:text-slate-200 font-medium italic leading-relaxed border-l-2 border-teal-500 pl-2.5">
                "{yesterdayPlanObj.tomorrow_plan}"
              </p>
            ) : (
              <p className="mt-2 text-xs text-slate-400 dark:text-slate-500 italic">
                No pre-written plan was saved for this day.
              </p>
            )}
          </div>

          {/* Right Column: Today's Actual Execution */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Today's Actual Outcome
            </span>

            <div className="mt-2 flex items-baseline justify-between">
              <span
                className={`text-lg font-bold font-mono tabular-nums ${
                  todayNetPnL >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {formatINR(todayNetPnL)}
              </span>
              <span className="text-xs font-semibold font-mono text-slate-700 dark:text-slate-300">
                Discipline: {todayDisciplinePct}%
              </span>
            </div>

            <div className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span>{todayPlanYesCount} of {todayTrades.length} trades followed plan</span>
              {todayFlags.length > 0 ? (
                <span className="text-rose-600 dark:text-rose-400 font-semibold">
                  {todayFlags.length} flag(s) triggered
                </span>
              ) : (
                <span className="text-teal-600 dark:text-teal-400 font-semibold">
                  Clean rules
                </span>
              )}
            </div>
          </div>
        </div>

        {/* List of Today's Trades with Quick Plan Status */}
        {todayTrades.length > 0 && (
          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-[11px] text-slate-400 dark:text-slate-500 block mb-1.5">
              Trades executed on {selectedDay}:
            </span>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {todayTrades.map((t) => {
                const isEquity = t.segment === 'Equity';
                const totalQty = t.lots * t.lot_size;

                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onSelectTrade(t)}
                    className="w-full p-2 text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs flex items-center justify-between hover:border-teal-500 transition-colors"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className={`w-2 h-2 rounded-full ${t.followed_plan === 'Yes' ? 'bg-teal-500' : t.followed_plan === 'No' ? 'bg-rose-500' : 'bg-slate-400'}`} />
                      <span className="font-semibold text-slate-900 dark:text-white truncate">
                        {t.symbol}
                      </span>
                      {/* For Equity segment hide lots, show qty */}
                      <span className="text-[11px] text-slate-400 font-mono">
                        {isEquity ? `${totalQty} shares` : `${t.lots} ${t.lots === 1 ? 'lot' : 'lots'}`}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`font-mono font-bold tabular-nums ${
                          t.net_pnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {formatINR(t.net_pnl)}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${t.followed_plan === 'Yes' ? 'bg-teal-50 dark:bg-teal-950 text-teal-600' : t.followed_plan === 'No' ? 'bg-rose-50 dark:bg-rose-950 text-rose-600' : 'bg-slate-100 text-slate-500'}`}>
                        {t.followed_plan === 'Yes' ? 'Planned' : t.followed_plan === 'No' ? 'Impulse' : 'Untagged'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* 2. Text Box: "Tomorrow I will trade…" */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <label htmlFor="tomorrow-plan-input" className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
            <FileEdit className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            <span>Tomorrow I will trade…</span>
          </label>
          <span className="text-[11px] text-slate-400">One-line rule / plan</span>
        </div>

        <form onSubmit={handleSaveTomorrowPlan} className="space-y-3">
          <textarea
            id="tomorrow-plan-input"
            rows={3}
            value={tomorrowPlanInput}
            onChange={(e) => setTomorrowPlanInput(e.target.value)}
            placeholder="e.g. Max 3 trades, only Pullbacks after 10:30 AM, strict 20 pt stop loss, no trades on 0-DTE hero options."
            className="w-full text-xs p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500 resize-none leading-relaxed"
          />

          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 dark:text-slate-500">
              {isSavedNotice ? (
                <span className="text-teal-600 dark:text-teal-400 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Plan saved for tomorrow</span>
                </span>
              ) : (
                'Review tomorrow before taking your first trade'
              )}
            </span>

            <button
              type="submit"
              disabled={!tomorrowPlanInput.trim()}
              className="min-h-[40px] px-4 py-1.5 text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-xl transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Save Plan</span>
            </button>
          </div>
        </form>
      </section>

      {/* 3. History of Past Daily Commitments */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <History className="w-4 h-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Daily Commitments History
          </h2>
        </div>

        <div className="space-y-2">
          {dailyPlans
            .slice()
            .sort((a, b) => b.date.localeCompare(a.date))
            .map((plan) => (
              <div
                key={plan.date}
                className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-xs"
              >
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 font-mono text-[11px] mb-1">
                  <span>Planned on {plan.date}</span>
                </div>
                <p className="text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                  "{plan.tomorrow_plan}"
                </p>
              </div>
            ))}
        </div>
      </section>
    </div>
  );
};
