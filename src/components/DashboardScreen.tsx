import React, { useState, useMemo } from 'react';
import { ActiveTab, FlagType, Trade } from '../types/trade';
import { formatINR, formatINRWithDecimals } from '../utils/calculations';
import { evaluateAllTradesFlags, evaluateDayFlags, FLAG_DEFINITIONS, getBaselineProgress, getUniqueTradingDays } from '../utils/flags';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2, 
  Flame, 
  Scale, 
  Calendar, 
  ShieldAlert, 
  ArrowRight,
  Info
} from 'lucide-react';

interface DashboardScreenProps {
  trades: Trade[];
  onNavigateTab: (tab: ActiveTab) => void;
  onSelectDateFilter: (date: string) => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  trades,
  onNavigateTab,
  onSelectDateFilter,
}) => {
  const uniqueDays = useMemo(() => getUniqueTradingDays(trades), [trades]);
  const baselineInfo = useMemo(() => getBaselineProgress(trades), [trades]);
  const flagMap = useMemo(() => evaluateAllTradesFlags(trades), [trades]);

  // Selected date defaults to the latest trading date available in data
  const latestDate = uniqueDays.length > 0 ? uniqueDays[uniqueDays.length - 1] : '';
  const [selectedDay, setSelectedDay] = useState<string>(latestDate || '');

  // Calculate this week's trades (last 5 trading days or matching latest week)
  const thisWeekDays = useMemo(() => {
    if (uniqueDays.length <= 5) return uniqueDays;
    return uniqueDays.slice(-5);
  }, [uniqueDays]);

  const thisWeekTrades = useMemo(() => {
    return trades.filter((t) => thisWeekDays.includes(t.date));
  }, [trades, thisWeekDays]);

  // Net P&L this week
  const thisWeekNetPnL = useMemo(() => {
    return thisWeekTrades.reduce((sum, t) => sum + t.net_pnl, 0);
  }, [thisWeekTrades]);

  const thisWeekGrossPnL = useMemo(() => {
    return thisWeekTrades.reduce((sum, t) => sum + t.gross_pnl, 0);
  }, [thisWeekTrades]);

  const thisWeekEstimatedCharges = useMemo(() => {
    return thisWeekTrades.reduce((sum, t) => sum + t.charges, 0);
  }, [thisWeekTrades]);

  // Discipline Score: Count ONLY trades explicitly tagged "Yes" as followed
  const disciplineScore = useMemo(() => {
    if (thisWeekTrades.length === 0) return 0;
    const planYesCount = thisWeekTrades.filter((t) => t.followed_plan === 'Yes').length;
    return Math.round((planYesCount / thisWeekTrades.length) * 100);
  }, [thisWeekTrades]);

  const planStats = useMemo(() => {
    const total = thisWeekTrades.length;
    const followed = thisWeekTrades.filter((t) => t.followed_plan === 'Yes').length;
    const broken = thisWeekTrades.filter((t) => t.followed_plan === 'No').length;
    const untagged = thisWeekTrades.filter((t) => t.followed_plan === 'Untagged').length;
    return { total, followed, broken, untagged };
  }, [thisWeekTrades]);

  // Daily PnL summary for heatmap (NIFTY weekly options expire on Tuesday)
  const dailyHeatmapData = useMemo(() => {
    return uniqueDays.map((date) => {
      const dayTrades = trades.filter((t) => t.date === date);
      const net = dayTrades.reduce((sum, t) => sum + t.net_pnl, 0);
      const gross = dayTrades.reduce((sum, t) => sum + t.gross_pnl, 0);
      const charges = dayTrades.reduce((sum, t) => sum + t.charges, 0);
      const count = dayTrades.length;
      const flags = baselineInfo.isReady ? evaluateDayFlags(date, trades) : [];

      const parsedDate = new Date(date + 'T00:00:00');
      const weekdayName = parsedDate.toLocaleDateString('en-US', { weekday: 'short' });
      const dayOfMonth = parsedDate.getDate();

      return {
        date,
        weekdayName,
        dayOfMonth,
        net,
        gross,
        charges,
        count,
        flags,
        isTuesdayExpiry: weekdayName === 'Tue',
      };
    });
  }, [uniqueDays, trades, baselineInfo.isReady]);

  // Today's (or selected day's) flags
  const activeInspectionDate = selectedDay || latestDate;
  const currentDayFlags = useMemo(() => {
    if (!baselineInfo.isReady || !activeInspectionDate) return [];
    return evaluateDayFlags(activeInspectionDate, trades);
  }, [baselineInfo.isReady, activeInspectionDate, trades]);

  // Cumulative Equity Curve calculation
  const equityPoints = useMemo(() => {
    const sorted = [...trades].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.entry_time.localeCompare(b.entry_time);
    });

    let runningNet = 0;
    const points = [{ index: 0, date: 'Start', net: 0, running: 0, symbol: '' }];

    sorted.forEach((t, i) => {
      runningNet += t.net_pnl;
      points.push({
        index: i + 1,
        date: t.date,
        net: t.net_pnl,
        running: Math.round(runningNet),
        symbol: t.symbol,
      });
    });

    return points;
  }, [trades]);

  // Equity Curve SVG calculation
  const svgDimensions = { width: 340, height: 130, padding: 12 };
  const { pathD, areaD, zeroY } = useMemo(() => {
    if (equityPoints.length < 2) {
      return { minRunning: 0, maxRunning: 0, pathD: '', areaD: '', zeroY: 65 };
    }

    const values = equityPoints.map((p) => p.running);
    let min = Math.min(...values, 0);
    let max = Math.max(...values, 0);

    const range = max - min || 1;
    const pTop = svgDimensions.padding;
    const pBottom = svgDimensions.height - svgDimensions.padding;
    const pLeft = svgDimensions.padding;
    const pRight = svgDimensions.width - svgDimensions.padding;

    const getY = (val: number) => {
      return pBottom - ((val - min) / range) * (pBottom - pTop);
    };

    const getX = (index: number) => {
      return pLeft + (index / (equityPoints.length - 1)) * (pRight - pLeft);
    };

    const zeroCoord = getY(0);

    const coords = equityPoints.map((p, idx) => `${getX(idx).toFixed(1)},${getY(p.running).toFixed(1)}`);
    const linePath = `M ${coords.join(' L ')}`;
    const areaPath = `M ${coords[0]} L ${coords.join(' L ')} L ${getX(equityPoints.length - 1).toFixed(1)},${zeroCoord.toFixed(1)} L ${getX(0).toFixed(1)},${zeroCoord.toFixed(1)} Z`;

    return {
      minRunning: min,
      maxRunning: max,
      pathD: linePath,
      areaD: areaPath,
      zeroY: zeroCoord,
    };
  }, [equityPoints, svgDimensions.height, svgDimensions.padding, svgDimensions.width]);

  const totalTradesCount = trades.length;
  const winningTrades = trades.filter((t) => t.net_pnl > 0).length;
  const winRate = totalTradesCount > 0 ? Math.round((winningTrades / totalTradesCount) * 100) : 0;

  return (
    <div className="space-y-4 pb-20">
      {/* 1. Week Net P&L Summary Hero */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs transition-colors">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
              <span>This Week's Net P&L</span>
              <span aria-hidden="true">·</span>
              <span>{thisWeekTrades.length} Trades</span>
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span
                className={`text-3xl font-bold tracking-tight font-mono tabular-nums ${
                  thisWeekNetPnL >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {formatINR(thisWeekNetPnL)}
              </span>
            </div>
          </div>

          <div
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 ${
              thisWeekNetPnL >= 0
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400'
            }`}
          >
            {thisWeekNetPnL >= 0 ? (
              <TrendingUp className="w-3.5 h-3.5" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5" />
            )}
            <span>{thisWeekNetPnL >= 0 ? 'Net Green' : 'Net Red'}</span>
          </div>
        </div>

        {/* Hairline breakdown of gross and estimated charges */}
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-3 gap-2 text-xs">
          <div>
            <span className="text-slate-400 dark:text-slate-500 block text-[11px]">Gross P&L</span>
            <span className={`font-mono tabular-nums font-medium ${thisWeekGrossPnL >= 0 ? 'text-slate-700 dark:text-slate-300' : 'text-rose-600 dark:text-rose-400'}`}>
              {formatINR(thisWeekGrossPnL)}
            </span>
          </div>
          <div>
            <span className="text-slate-400 dark:text-slate-500 block text-[11px]">Est. Charges</span>
            <span className="font-mono tabular-nums font-medium text-slate-600 dark:text-slate-400">
              -₹{thisWeekEstimatedCharges.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
          </div>
          <div>
            <span className="text-slate-400 dark:text-slate-500 block text-[11px]">Win Rate</span>
            <span className="font-mono tabular-nums font-medium text-slate-700 dark:text-slate-300">
              {winRate}%
            </span>
          </div>
        </div>
      </section>

      {/* 2. Discipline Score Card */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Discipline Score
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span
                className={`text-4xl font-extrabold tracking-tight font-mono tabular-nums ${
                  disciplineScore >= 75
                    ? 'text-teal-600 dark:text-teal-400'
                    : disciplineScore >= 50
                    ? 'text-amber-500 dark:text-amber-400'
                    : 'text-rose-500 dark:text-rose-400'
                }`}
              >
                {disciplineScore}%
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                followed trading plan
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs text-slate-500 dark:text-slate-400 block font-mono tabular-nums">
              {planStats.followed} / {planStats.total} trades
            </span>
            <span
              className={`inline-block mt-1 text-[11px] font-medium px-2 py-0.5 rounded-md ${
                disciplineScore >= 70
                  ? 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300'
                  : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300'
              }`}
            >
              {disciplineScore >= 70 ? 'Rule Abiding' : 'Needs Restraint'}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              disciplineScore >= 75
                ? 'bg-teal-500'
                : disciplineScore >= 50
                ? 'bg-amber-500'
                : 'bg-rose-500'
            }`}
            style={{ width: `${disciplineScore}%` }}
          />
        </div>

        {/* Explicit Requirement: Show below the score: "X trades still untagged" */}
        <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span className="text-[11px]">
            {planStats.untagged === 1
              ? '1 trade still untagged'
              : `${planStats.untagged} trades still untagged`}
          </span>
          <button
            type="button"
            onClick={() => onNavigateTab('trades')}
            className="text-[11px] font-medium text-teal-600 dark:text-teal-400 hover:underline"
          >
            Review Trades →
          </button>
        </div>
      </section>

      {/* 3. Equity Curve (Net P&L Cumulative) */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Cumulative Equity Curve
            </h2>
            <div className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1.5 mt-0.5">
              <span>{equityPoints.length - 1} trades logged</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                Current: {formatINR(equityPoints[equityPoints.length - 1]?.running || 0)}
              </span>
            </div>
          </div>
        </div>

        {/* SVG Equity Graph */}
        <div className="w-full relative mt-1 bg-slate-50/50 dark:bg-slate-950/40 rounded-xl p-2 border border-slate-100 dark:border-slate-800/80">
          <svg
            viewBox={`0 0 ${svgDimensions.width} ${svgDimensions.height}`}
            className="w-full h-32 overflow-visible"
            aria-label="Cumulative Equity Curve"
          >
            <line
              x1={svgDimensions.padding}
              y1={zeroY}
              x2={svgDimensions.width - svgDimensions.padding}
              y2={zeroY}
              stroke="#94a3b8"
              strokeDasharray="3 3"
              strokeWidth="1"
              strokeOpacity="0.4"
            />
            <text
              x={svgDimensions.width - svgDimensions.padding}
              y={zeroY - 4}
              textAnchor="end"
              className="text-[9px] fill-slate-400 font-mono"
            >
              ₹0 Break-even
            </text>

            {areaD && (
              <path
                d={areaD}
                fill={equityPoints[equityPoints.length - 1]?.running >= 0 ? '#10b981' : '#f43f5e'}
                fillOpacity="0.12"
              />
            )}

            {pathD && (
              <path
                d={pathD}
                fill="none"
                stroke={equityPoints[equityPoints.length - 1]?.running >= 0 ? '#059669' : '#e11d48'}
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </svg>

          <div className="flex justify-between items-center text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-mono">
            <span>{uniqueDays[0] || 'Day 1'}</span>
            <span>{uniqueDays[Math.floor(uniqueDays.length / 2)] || 'Mid'}</span>
            <span>{uniqueDays[uniqueDays.length - 1] || 'Latest'}</span>
          </div>
        </div>
      </section>

      {/* 4. Calendar P&L Heatmap */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Daily Heatmap (10 Trading Days)
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Tap any day to inspect trades & triggered flags
            </p>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {dailyHeatmapData.map((day) => {
            const isGreen = day.net >= 0;
            const isSelected = activeInspectionDate === day.date;
            const hasFlags = day.flags.length > 0;

            return (
              <button
                key={day.date}
                type="button"
                onClick={() => {
                  setSelectedDay(day.date);
                  onSelectDateFilter(day.date);
                }}
                className={`p-2.5 rounded-xl border text-left transition-all active:scale-95 flex flex-col justify-between min-h-[72px] ${
                  isSelected
                    ? 'ring-2 ring-teal-500 dark:ring-teal-400 border-teal-500 bg-teal-50/30 dark:bg-teal-950/20'
                    : isGreen
                    ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                    : 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase">
                    {day.weekdayName} {day.dayOfMonth}
                  </span>
                  {hasFlags && (
                    <span
                      title="Triggered behavior flags"
                      className="w-1.5 h-1.5 rounded-full bg-rose-500"
                    />
                  )}
                </div>

                <div className="mt-1">
                  <span
                    className={`text-xs font-bold font-mono tabular-nums block truncate ${
                      isGreen
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-rose-700 dark:text-rose-400'
                    }`}
                  >
                    {formatINR(day.net)}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-mono">
                    {day.count} trds
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Day Quick Action */}
        {activeInspectionDate && (
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Active Date: <strong className="text-slate-800 dark:text-slate-200">{activeInspectionDate}</strong>
            </span>
            <button
              type="button"
              onClick={() => onNavigateTab('trades')}
              className="text-xs font-medium text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1 min-h-[40px] px-2"
            >
              <span>View Day Trades</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </section>

      {/* 5. Behaviour Flags Section */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-slate-700 dark:text-slate-300" />
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Behaviour Flags
            </h2>
          </div>
          <span className="text-[11px] text-slate-400 dark:text-slate-500">
            For {activeInspectionDate || 'Today'}
          </span>
        </div>

        {!baselineInfo.isReady ? (
          <div className="p-3.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-amber-900 dark:text-amber-200">
            <div className="flex items-start gap-2.5">
              <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-semibold">Building your baseline</p>
                <p className="mt-0.5 text-amber-800/80 dark:text-amber-300/80 leading-relaxed">
                  You have logged {baselineInfo.currentDays} of {baselineInfo.requiredDays} required trading days. 
                  Behavioural alerts (revenge re-entries, overtrading sprees, lot size jumps) will unlock once your 5-day baseline is complete.
                </p>
              </div>
            </div>
          </div>
        ) : currentDayFlags.length === 0 ? (
          <div className="p-3.5 rounded-xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-900/40 flex items-center gap-2.5 text-teal-800 dark:text-teal-300">
            <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
            <div className="text-xs">
              <span className="font-semibold block">Clean Execution</span>
              <span className="text-teal-700/80 dark:text-teal-400/80">
                No emotional triggers or rule breaks detected on this day.
              </span>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {currentDayFlags.map((flag) => {
              const def = FLAG_DEFINITIONS[flag];
              return (
                <div
                  key={flag}
                  className={`p-3 rounded-xl border text-xs transition-colors ${
                    def.severity === 'danger'
                      ? 'bg-rose-50/50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50 text-rose-950 dark:text-rose-200'
                      : def.severity === 'warning'
                      ? 'bg-amber-50/50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50 text-amber-950 dark:text-amber-200'
                      : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between font-semibold">
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle
                        className={`w-3.5 h-3.5 ${
                          def.severity === 'danger'
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-amber-600 dark:text-amber-400'
                        }`}
                      />
                      <span>{def.title}</span>
                    </div>
                    <span className="text-[10px] uppercase font-mono tracking-wider opacity-70">
                      {flag}
                    </span>
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
    </div>
  );
};
