import { FlagDetail, FlagType, Trade } from '../types/trade';

export const FLAG_DEFINITIONS: Record<FlagType, { title: string; description: string; severity: 'danger' | 'warning' | 'caution' }> = {
  'Revenge': {
    title: 'Revenge Re-Entry',
    description: 'New trade entered within 2 minutes of exiting a losing trade. Emotional urge to recover capital rapidly.',
    severity: 'danger',
  },
  'Overtrade': {
    title: 'Overtrading Spree',
    description: "Daily trade count exceeded 2× your prior 10-day baseline average. High transaction churn.",
    severity: 'danger',
  },
  'Size jump': {
    title: 'Lot Size Jump After Loss',
    description: 'Position size increased by > 1.5× your average lots right after a losing trade (martingale tendency).',
    severity: 'warning',
  },
  'Plan break': {
    title: 'Trading Plan Violation',
    description: 'Trade taken without meeting pre-defined setup rules or contrary to daily trading plan.',
    severity: 'caution',
  },
  'Loss streak': {
    title: '3+ Consecutive Losses',
    description: 'Three or more consecutive losing trades. Prime risk window for psychological tilt.',
    severity: 'warning',
  },
};

/**
 * Returns sorted unique dates (chronological) from trades
 */
export function getUniqueTradingDays(trades: Trade[]): string[] {
  const dates = Array.from(new Set(trades.map((t) => t.date)));
  return dates.sort((a, b) => a.localeCompare(b));
}

/**
 * Baseline check: Trader needs at least 5 trading days of data
 */
export function hasCompletedBaseline(trades: Trade[]): boolean {
  return getUniqueTradingDays(trades).length >= 5;
}

export function getBaselineProgress(trades: Trade[]): { currentDays: number; requiredDays: number; isReady: boolean } {
  const currentDays = getUniqueTradingDays(trades).length;
  const requiredDays = 5;
  return {
    currentDays,
    requiredDays,
    isReady: currentDays >= requiredDays,
  };
}

/**
 * Helper to convert HH:mm:ss or HH:mm to absolute seconds from midnight
 */
function parseTimeToSeconds(t: string): number {
  if (!t) return 0;
  const parts = t.split(':').map(Number);
  const h = parts[0] || 0;
  const m = parts[1] || 0;
  const s = parts[2] || 0;
  return h * 3600 + m * 60 + s;
}

/**
 * Evaluates behaviour flags for all trades across the dataset
 */
export function evaluateAllTradesFlags(trades: Trade[]): Map<string, FlagType[]> {
  const flagMap = new Map<string, FlagType[]>();

  if (!hasCompletedBaseline(trades)) {
    // If under baseline, do not assign any active behavioral flags
    trades.forEach((t) => flagMap.set(t.id, []));
    return flagMap;
  }

  // Sort trades chronologically
  const sorted = [...trades].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return parseTimeToSeconds(a.entry_time) - parseTimeToSeconds(b.entry_time);
  });

  const uniqueDays = getUniqueTradingDays(sorted);

  // Calculate overall baseline average lot size
  const totalLots = sorted.reduce((sum, t) => sum + t.lots, 0);
  const overallAvgLots = sorted.length > 0 ? totalLots / sorted.length : 1;

  // Group trades by date
  const tradesByDate = new Map<string, Trade[]>();
  for (const t of sorted) {
    const list = tradesByDate.get(t.date) || [];
    list.push(t);
    tradesByDate.set(t.date, list);
  }

  // Calculate prior 10-day trade count average per day
  const dailyAvgCountMap = new Map<string, number>();
  for (let i = 0; i < uniqueDays.length; i++) {
    const currentDate = uniqueDays[i];
    const prevDays = uniqueDays.slice(Math.max(0, i - 10), i);
    if (prevDays.length > 0) {
      const prevTotalTrades = prevDays.reduce(
        (sum, d) => sum + (tradesByDate.get(d)?.length || 0),
        0
      );
      dailyAvgCountMap.set(currentDate, prevTotalTrades / prevDays.length);
    } else {
      dailyAvgCountMap.set(currentDate, 5); // sensible default
    }
  }

  // Evaluate trade-by-trade flags
  for (const [date, dayTrades] of tradesByDate.entries()) {
    let consecutiveLosses = 0;

    for (let i = 0; i < dayTrades.length; i++) {
      const trade = dayTrades[i];
      const triggered: FlagType[] = [];

      // Flag 4: Plan break
      if (trade.followed_plan === 'No') {
        triggered.push('Plan break');
      }

      // Check consecutive losses
      if (trade.net_pnl < 0) {
        consecutiveLosses++;
        if (consecutiveLosses >= 3) {
          triggered.push('Loss streak');
        }
      } else {
        consecutiveLosses = 0;
      }

      // Check relative to previous trade on same day
      if (i > 0) {
        const prevTrade = dayTrades[i - 1];
        const prevExitSec = parseTimeToSeconds(prevTrade.exit_time);
        const currEntrySec = parseTimeToSeconds(trade.entry_time);
        const diffSeconds = currEntrySec - prevExitSec;

        // Flag 1: Revenge trade (re-entry within 2 minutes / 120s after a losing trade)
        if (prevTrade.net_pnl < 0 && diffSeconds >= 0 && diffSeconds <= 120) {
          triggered.push('Revenge');
        }

        // Flag 3: Size jump (lots after a loss > 1.5× trader's average lots)
        if (prevTrade.net_pnl < 0 && trade.lots > 1.5 * overallAvgLots) {
          triggered.push('Size jump');
        }
      }

      flagMap.set(trade.id, triggered);
    }
  }

  return flagMap;
}

/**
 * Evaluates day-level flags for a given date
 */
export function evaluateDayFlags(date: string, trades: Trade[]): FlagType[] {
  if (!hasCompletedBaseline(trades)) {
    return [];
  }

  const dayTrades = trades.filter((t) => t.date === date);
  if (dayTrades.length === 0) return [];

  const uniqueDays = getUniqueTradingDays(trades);
  const dayIndex = uniqueDays.indexOf(date);
  const flags = new Set<FlagType>();

  // Overtrade check: today's count > 2x average of previous up to 10 days
  const prevDays = uniqueDays.slice(Math.max(0, dayIndex - 10), dayIndex);
  if (prevDays.length >= 3) {
    const prevTradesCount = prevDays.reduce(
      (sum, d) => sum + trades.filter((t) => t.date === d).length,
      0
    );
    const prevAvg = prevTradesCount / prevDays.length;
    if (dayTrades.length > 2 * prevAvg) {
      flags.add('Overtrade');
    }
  }

  // Collect trade-level flags triggered today
  const tradeFlags = evaluateAllTradesFlags(trades);
  for (const t of dayTrades) {
    const tFlags = tradeFlags.get(t.id) || [];
    tFlags.forEach((f) => flags.add(f));
  }

  return Array.from(flags);
}
