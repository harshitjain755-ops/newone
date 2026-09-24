import { ChargesBreakdown, ChargesSettings, DEFAULT_CHARGES_SETTINGS, InstrumentType, Side, Trade } from '../types/trade';

/**
 * Calculates human readable hold time between HH:mm:ss or HH:mm strings
 */
export function calculateHoldTime(entryTime: string, exitTime: string): string {
  if (!entryTime || !exitTime) return '0m';

  const parseTimeToSeconds = (t: string): number => {
    const parts = t.trim().split(':').map(Number);
    const h = parts[0] || 0;
    const m = parts[1] || 0;
    const s = parts[2] || 0;
    return h * 3600 + m * 60 + s;
  };

  let diffSeconds = parseTimeToSeconds(exitTime) - parseTimeToSeconds(entryTime);
  if (diffSeconds < 0) {
    diffSeconds += 24 * 3600; // handle midnight wrap if any
  }

  const hours = Math.floor(diffSeconds / 3600);
  const minutes = Math.floor((diffSeconds % 3600) / 60);
  const seconds = diffSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
  }
  return `${seconds}s`;
}

/**
 * Resolves instrument type for a trade
 */
export function resolveInstrumentType(trade: {
  segment: string;
  symbol: string;
  instrument_type?: InstrumentType;
}): InstrumentType {
  if (trade.instrument_type) return trade.instrument_type;

  const seg = trade.segment;
  const sym = trade.symbol.toUpperCase();

  if (seg === 'Equity') {
    return 'Equity Intraday'; // default for intraday journal
  }
  if (seg === 'MCX') {
    return 'MCX';
  }
  // F&O
  if (sym.includes(' CE') || sym.includes(' PE') || sym.endsWith('CE') || sym.endsWith('PE')) {
    return 'F&O Options';
  }
  return 'F&O Futures';
}

/**
 * Calculates itemized charges breakdown based on segment-specific settings
 * - STT applied ONLY on the side where it applies
 * - Stamp duty applied ONLY on the BUY side
 */
export function calculateItemizedCharges(
  trade: {
    segment: string;
    symbol: string;
    side: Side;
    lots: number;
    lot_size: number;
    entry_price: number;
    exit_price: number;
    instrument_type?: InstrumentType;
  },
  settings: ChargesSettings
): ChargesBreakdown {
  const instrumentType = resolveInstrumentType(trade);
  
  // Safe rate retrieval with fallback
  let rates = settings?.equityIntraday;
  if (instrumentType === 'Equity Delivery') rates = settings?.equityDelivery || DEFAULT_CHARGES_SETTINGS.equityDelivery;
  else if (instrumentType === 'F&O Futures') rates = settings?.foFutures || DEFAULT_CHARGES_SETTINGS.foFutures;
  else if (instrumentType === 'F&O Options') rates = settings?.foOptions || DEFAULT_CHARGES_SETTINGS.foOptions;
  else if (instrumentType === 'MCX') rates = settings?.mcx || DEFAULT_CHARGES_SETTINGS.mcx;
  else rates = settings?.equityIntraday || DEFAULT_CHARGES_SETTINGS.equityIntraday;

  const qty = Math.max(1, trade.lots * trade.lot_size);
  const buyPrice = trade.side === 'Long' ? trade.entry_price : trade.exit_price;
  const sellPrice = trade.side === 'Long' ? trade.exit_price : trade.entry_price;

  const buyTurnover = buyPrice * qty;
  const sellTurnover = sellPrice * qty;
  const totalTurnover = buyTurnover + sellTurnover;

  // 1. Brokerage: buy order + sell order (round trip = 2 orders)
  const brokerage = rates.brokeragePerOrder * 2;

  // 2. Exchange turnover charges: on total turnover
  const exchange = (totalTurnover * rates.exchangeRatePct) / 100;

  // 3. GST: 18% on (Brokerage + Exchange charges)
  const gst = ((brokerage + exchange) * rates.gstRatePct) / 100;

  // 4. STT / CTT:
  // - Equity Intraday: STT on SELL side only
  // - Equity Delivery: STT on BOTH Buy and Sell
  // - F&O Futures: STT on SELL side only
  // - F&O Options: STT on SELL side only (on premium)
  // - MCX: CTT on SELL side only
  let stt = 0;
  if (instrumentType === 'Equity Delivery') {
    stt = ((buyTurnover + sellTurnover) * rates.sttRatePct) / 100;
  } else {
    // Intraday, F&O, MCX: Sell side only
    stt = (sellTurnover * rates.sttRatePct) / 100;
  }

  // 5. Stamp Duty: BUY side only
  const stampDuty = (buyTurnover * rates.stampDutyPct) / 100;

  const total = Math.round((brokerage + exchange + gst + stt + stampDuty) * 100) / 100;

  return {
    brokerage: Math.round(brokerage * 100) / 100,
    exchange: Math.round(exchange * 100) / 100,
    gst: Math.round(gst * 100) / 100,
    stt: Math.round(stt * 100) / 100,
    stampDuty: Math.round(stampDuty * 100) / 100,
    total,
  };
}

/**
 * Calculates estimated Indian regulatory & brokerage charges based on editable settings
 */
export function calculateEstimatedCharges(
  trade: {
    segment: string;
    symbol: string;
    side: Side;
    lots: number;
    lot_size: number;
    entry_price: number;
    exit_price: number;
    instrument_type?: InstrumentType;
  },
  settings: ChargesSettings
): number {
  const breakdown = calculateItemizedCharges(trade, settings);
  return breakdown.total;
}

/**
 * Calculates gross P&L
 */
export function calculateGrossPnL(
  side: Side,
  lots: number,
  lot_size: number,
  entry_price: number,
  exit_price: number
): number {
  const qty = lots * lot_size;
  const pnl = side === 'Long' 
    ? (exit_price - entry_price) * qty
    : (entry_price - exit_price) * qty;
  return Math.round(pnl * 100) / 100;
}

/**
 * Formats Indian Rupee currency with standard Indian grouping
 */
export function formatINR(val: number, showSign: boolean = true): string {
  const isNegative = val < 0;
  const absVal = Math.abs(val);
  
  const formatted = absVal.toLocaleString('en-IN', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  });

  if (val === 0) return '₹0';
  if (isNegative) return `-₹${formatted}`;
  return showSign ? `+₹${formatted}` : `₹${formatted}`;
}

/**
 * Format currency with decimals for small trade stats
 */
export function formatINRWithDecimals(val: number, showSign: boolean = true): string {
  const isNegative = val < 0;
  const absVal = Math.abs(val);
  
  const formatted = absVal.toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });

  if (val === 0) return '₹0.00';
  if (isNegative) return `-₹${formatted}`;
  return showSign ? `+₹${formatted}` : `₹${formatted}`;
}
