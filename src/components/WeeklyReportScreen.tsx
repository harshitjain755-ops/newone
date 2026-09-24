import React, { useMemo } from 'react';
import { Trade } from '../types/trade';
import { formatINR, formatINRWithDecimals } from '../utils/calculations';
import { 
  BarChart3, 
  Clock, 
  CalendarDays, 
  Scale, 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  Flame, 
  TrendingUp, 
  TrendingDown,
  AlertOctagon
} from 'lucide-react';

interface WeeklyReportScreenProps {
  trades: Trade[];
}

export const WeeklyReportScreen: React.FC<WeeklyReportScreenProps> = ({ trades }) => {
  // 1. Planned vs Unplanned comparison
  const planComparison = useMemo(() => {
    const plannedTrades = trades.filter((t) => t.followed_plan === 'Yes');
    const unplannedTrades = trades.filter((t) => t.followed_plan === 'No');

    const plannedNet = plannedTrades.reduce((sum, t) => sum + t.net_pnl, 0);
    const unplannedNet = unplannedTrades.reduce((sum, t) => sum + t.net_pnl, 0);

    const plannedWins = plannedTrades.filter((t) => t.net_pnl > 0).length;
    const unplannedWins = unplannedTrades.filter((t) => t.net_pnl > 0).length;

    const plannedWinRate = plannedTrades.length > 0 ? Math.round((plannedWins / plannedTrades.length) * 100) : 0;
    const unplannedWinRate = unplannedTrades.length > 0 ? Math.round((unplannedWins / unplannedTrades.length) * 100) : 0;

    const plannedAvg = plannedTrades.length > 0 ? Math.round(plannedNet / plannedTrades.length) : 0;
    const unplannedAvg = unplannedTrades.length > 0 ? Math.round(unplannedNet / unplannedTrades.length) : 0;

    return {
      plannedTrades,
      unplannedTrades,
      plannedNet,
      unplannedNet,
      plannedWinRate,
      unplannedWinRate,
      plannedAvg,
      unplannedAvg,
    };
  }, [trades]);

  // 2. P&L by weekday (Tuesday is NIFTY Weekly Expiry!)
  const weekdayData = useMemo(() => {
    const days = [
      { key: 1, name: 'Monday', short: 'Mon' },
      { key: 2, name: 'Tuesday (Weekly Expiry)', short: 'Tue' },
      { key: 3, name: 'Wednesday', short: 'Wed' },
      { key: 4, name: 'Thursday', short: 'Thu' },
      { key: 5, name: 'Friday', short: 'Fri' },
    ];

    return days.map((d) => {
      const matchingTrades = trades.filter((t) => {
        const dayIdx = new Date(t.date + 'T00:00:00').getDay();
        return dayIdx === d.key;
      });

      const net = matchingTrades.reduce((sum, t) => sum + t.net_pnl, 0);
      const gross = matchingTrades.reduce((sum, t) => sum + t.gross_pnl, 0);
      const charges = matchingTrades.reduce((sum, t) => sum + t.charges, 0);
      const wins = matchingTrades.filter((t) => t.net_pnl > 0).length;
      const winRate = matchingTrades.length > 0 ? Math.round((wins / matchingTrades.length) * 100) : 0;

      return {
        ...d,
        count: matchingTrades.length,
        net,
        gross,
        charges,
        winRate,
        isExpiry: d.key === 2, // Tuesday is Weekly Expiry!
      };
    });
  }, [trades]);

  // 3. P&L by hour of day
  const hourlyData = useMemo(() => {
    const slots = [
      { name: '09:15 – 10:30', label: 'Opening Drive', start: 9 * 60 + 15, end: 10 * 60 + 30 },
      { name: '10:30 – 12:30', label: 'Morning Trend', start: 10 * 60 + 30, end: 12 * 60 + 30 },
      { name: '12:30 – 13:45', label: 'Lunch Chop', start: 12 * 60 + 30, end: 13 * 60 + 45 },
      { name: '13:45 – 15:30', label: 'Closing & Expiry', start: 13 * 60 + 45, end: 15 * 60 + 30 },
    ];

    const parseTimeToMins = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
    };

    return slots.map((slot) => {
      const slotTrades = trades.filter((t) => {
        const mins = parseTimeToMins(t.entry_time);
        return mins >= slot.start && mins < slot.end;
      });

      const net = slotTrades.reduce((sum, t) => sum + t.net_pnl, 0);
      const wins = slotTrades.filter((t) => t.net_pnl > 0).length;
      const winRate = slotTrades.length > 0 ? Math.round((wins / slotTrades.length) * 100) : 0;

      return {
        ...slot,
        count: slotTrades.length,
        net,
        winRate,
      };
    });
  }, [trades]);

  // 4. Expiry-day vs Non-expiry-day P&L (Tuesday is weekly expiry!)
  const expiryComparison = useMemo(() => {
    // Tuesday (day 2) is weekly expiry
    const expiryTrades = trades.filter((t) => {
      const dayIdx = new Date(t.date + 'T00:00:00').getDay();
      return dayIdx === 2;
    });

    const nonExpiryTrades = trades.filter((t) => {
      const dayIdx = new Date(t.date + 'T00:00:00').getDay();
      return dayIdx !== 2;
    });

    const expiryNet = expiryTrades.reduce((sum, t) => sum + t.net_pnl, 0);
    const nonExpiryNet = nonExpiryTrades.reduce((sum, t) => sum + t.net_pnl, 0);

    const expiryCharges = expiryTrades.reduce((sum, t) => sum + t.charges, 0);
    const nonExpiryCharges = nonExpiryTrades.reduce((sum, t) => sum + t.charges, 0);

    const expiryLotsTotal = expiryTrades.reduce((sum, t) => sum + t.lots, 0);
    const nonExpiryLotsTotal = nonExpiryTrades.reduce((sum, t) => sum + t.lots, 0);

    const expiryAvgLots = expiryTrades.length > 0 ? (expiryLotsTotal / expiryTrades.length).toFixed(1) : '0';
    const nonExpiryAvgLots = nonExpiryTrades.length > 0 ? (nonExpiryLotsTotal / nonExpiryTrades.length).toFixed(1) : '0';

    return {
      expiryTradesCount: expiryTrades.length,
      nonExpiryTradesCount: nonExpiryTrades.length,
      expiryNet,
      nonExpiryNet,
      expiryCharges,
      nonExpiryCharges,
      expiryAvgLots,
      nonExpiryAvgLots,
    };
  }, [trades]);

  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
      <div>
        <h1 className="text-lg font-bold text-slate-900 dark:text-white">
          Performance & Behavior Report
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Objective breakdown across setups, discipline compliance, and market schedules
        </p>
      </div>

      {/* 1. Planned vs Unplanned Trades Comparison */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <Scale className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Planned vs. Unplanned Trades
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Planned Box */}
          <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 font-semibold text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Followed Plan (Yes)</span>
            </div>
            <div className="mt-2">
              <span className={`text-xl font-bold font-mono tabular-nums block ${planComparison.plannedNet >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
                {formatINR(planComparison.plannedNet)}
              </span>
              <div className="mt-1.5 space-y-0.5 text-[11px] text-slate-600 dark:text-slate-400 font-mono">
                <div>Trades: <strong className="text-slate-800 dark:text-slate-200">{planComparison.plannedTrades.length}</strong></div>
                <div>Win Rate: <strong className="text-slate-800 dark:text-slate-200">{planComparison.plannedWinRate}%</strong></div>
                <div>Avg P&L: <strong className="text-slate-800 dark:text-slate-200">{formatINR(planComparison.plannedAvg)}/trd</strong></div>
              </div>
            </div>
          </div>

          {/* Unplanned Box */}
          <div className="bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-rose-800 dark:text-rose-300 font-semibold text-xs">
              <XCircle className="w-4 h-4 text-rose-600" />
              <span>Plan Broken (No)</span>
            </div>
            <div className="mt-2">
              <span className="text-xl font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400 block">
                {formatINR(planComparison.unplannedNet)}
              </span>
              <div className="mt-1.5 space-y-0.5 text-[11px] text-slate-600 dark:text-slate-400 font-mono">
                <div>Trades: <strong className="text-slate-800 dark:text-slate-200">{planComparison.unplannedTrades.length}</strong></div>
                <div>Win Rate: <strong className="text-slate-800 dark:text-slate-200">{planComparison.unplannedWinRate}%</strong></div>
                <div>Avg P&L: <strong className="text-slate-800 dark:text-slate-200">{formatINR(planComparison.unplannedAvg)}/trd</strong></div>
              </div>
            </div>
          </div>
        </div>

        {/* Behavioral Insight callout */}
        <div className="mt-3 p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          <strong className="text-slate-800 dark:text-slate-100 font-semibold">Cost of indiscipline: </strong>
          Trades where rules were violated resulted in a net drag of <span className="font-mono font-bold text-rose-600 dark:text-rose-400">{formatINR(planComparison.unplannedNet)}</span>. Sticking to defined setups accounts for your positive expectancy.
        </div>
      </section>

      {/* 2. P&L by Weekday (Tuesday Weekly Expiry Effect) */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <CalendarDays className="w-4 h-4 text-slate-700 dark:text-slate-300" />
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            P&L by Day of the Week
          </h2>
        </div>

        <div className="space-y-2">
          {weekdayData.map((day) => {
            const isGreen = day.net >= 0;
            return (
              <div
                key={day.name}
                className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                  day.isExpiry
                    ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-300/80 dark:border-amber-900/60'
                    : 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800'
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-white">
                    <span>{day.name}</span>
                    {day.isExpiry && (
                      <span className="text-[10px] bg-amber-200/60 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 px-1.5 py-0.2 rounded-sm font-medium">
                        Expiry
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">
                    {day.count} trades · Win rate {day.winRate}% · Est chg -₹{day.charges.toFixed(0)}
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`font-mono font-bold tabular-nums text-sm block ${
                      isGreen
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {formatINR(day.net)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. P&L by Hour of the Day */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-slate-700 dark:text-slate-300" />
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            P&L by Hour of the Day
          </h2>
        </div>

        <div className="space-y-2">
          {hourlyData.map((slot) => {
            const isGreen = slot.net >= 0;
            return (
              <div
                key={slot.name}
                className="p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="font-mono">{slot.name}</span>
                    <span className="text-slate-400 dark:text-slate-500 font-normal">
                      ({slot.label})
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">
                    {slot.count} trades · Win rate {slot.winRate}%
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`font-mono font-bold tabular-nums text-sm block ${
                      isGreen
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {formatINR(slot.net)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. Expiry-Day (Tuesday) vs Non-Expiry-Day P&L */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <Flame className="w-4 h-4 text-amber-500" />
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Tuesday Expiries vs. Normal Trading Days
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/30 dark:bg-amber-950/20">
            <span className="font-semibold text-amber-900 dark:text-amber-200 block">
              Tuesday Weekly Expiries
            </span>
            <span className="text-xl font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400 block mt-1">
              {formatINR(expiryComparison.expiryNet)}
            </span>
            <div className="mt-2 space-y-0.5 text-[11px] text-slate-600 dark:text-slate-400 font-mono">
              <div>Trades: <strong>{expiryComparison.expiryTradesCount}</strong></div>
              <div>Avg lots: <strong>{expiryComparison.expiryAvgLots} lots</strong></div>
              <div>Est charges: <strong>-₹{expiryComparison.expiryCharges.toFixed(0)}</strong></div>
            </div>
          </div>

          <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
            <span className="font-semibold text-slate-900 dark:text-white block">
              Non-Expiry (Mon, Wed-Fri)
            </span>
            <span className="text-xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 block mt-1">
              {formatINR(expiryComparison.nonExpiryNet)}
            </span>
            <div className="mt-2 space-y-0.5 text-[11px] text-slate-600 dark:text-slate-400 font-mono">
              <div>Trades: <strong>{expiryComparison.nonExpiryTradesCount}</strong></div>
              <div>Avg lots: <strong>{expiryComparison.nonExpiryAvgLots} lots</strong></div>
              <div>Est charges: <strong>-₹{expiryComparison.nonExpiryCharges.toFixed(0)}</strong></div>
            </div>
          </div>
        </div>

        <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
          NIFTY weekly options expire on Tuesday. Fast 0-DTE option decay and chasing sudden wicks drove outsized drawdowns. Non-expiry days show disciplined edge.
        </p>
      </section>

      {/* 5. Placeholder card titled: "AI weekly summary — coming soon" */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 text-white rounded-2xl p-5 shadow-sm border border-slate-800 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-teal-400" />
              <span>AI weekly summary — coming soon</span>
            </h2>
            <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 font-mono">
              Preview
            </span>
          </div>

          <p className="text-xs text-slate-300 mt-2 leading-relaxed">
            Automated psychological audit synthesized from your trade timestamps, hold durations, and emotional notes. Will identify your exact tilt trigger patterns, post-loss revenge windows, and position sizing leaks without giving buy/sell predictions.
          </p>

          <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-center justify-between text-[11px] text-slate-400">
            <span>Features in development: Tilt index, Expiry discipline auditor</span>
            <span className="text-teal-400 font-medium">Coming soon</span>
          </div>
        </div>
      </section>
    </div>
  );
};
