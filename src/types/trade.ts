export type Segment = 'Equity' | 'F&O' | 'MCX';
export type Side = 'Long' | 'Short';
export type SetupType = 'Breakout' | 'Pullback' | 'Reversal' | 'Range' | 'Other' | 'Untagged';
export type EmotionType = 'Calm' | 'Fear' | 'Greed' | 'Revenge' | 'FOMO' | 'Untagged';
export type PlanFollowedType = 'Yes' | 'No' | 'Untagged';

export type InstrumentType = 'Equity Intraday' | 'Equity Delivery' | 'F&O Futures' | 'F&O Options' | 'MCX';

export type FlagType = 'Revenge' | 'Overtrade' | 'Size jump' | 'Plan break' | 'Loss streak';

export interface FlagDetail {
  type: FlagType;
  title: string;
  description: string;
  severity: 'danger' | 'warning' | 'caution';
}

export interface Trade {
  id: string;
  date: string; // YYYY-MM-DD
  entry_time: string; // HH:mm:ss or HH:mm
  exit_time: string; // HH:mm:ss or HH:mm
  symbol: string;
  segment: Segment;
  instrument_type?: InstrumentType;
  side: Side;
  lots: number;
  lot_size: number;
  entry_price: number;
  exit_price: number;
  gross_pnl: number;
  charges: number; // estimated
  net_pnl: number;
  hold_time: string; // auto calculated
  setup: SetupType;
  emotion: EmotionType;
  followed_plan: PlanFollowedType;
  note: string;
  triggered_flags?: FlagType[];
}

export interface DailyPlan {
  date: string; // YYYY-MM-DD
  tomorrow_plan: string;
}

export interface SegmentChargeRate {
  brokeragePerOrder: number; // ₹ per executed order
  sttRatePct: number; // %
  exchangeRatePct: number; // %
  gstRatePct: number; // %
  stampDutyPct: number; // %
}

export interface ChargesSettings {
  equityIntraday: SegmentChargeRate;
  equityDelivery: SegmentChargeRate;
  foFutures: SegmentChargeRate;
  foOptions: SegmentChargeRate;
  mcx: SegmentChargeRate;
}

export interface ChargesBreakdown {
  brokerage: number;
  stt: number;
  exchange: number;
  gst: number;
  stampDuty: number;
  total: number;
}

export const DEFAULT_CHARGES_SETTINGS: ChargesSettings = {
  equityIntraday: {
    brokeragePerOrder: 20,
    sttRatePct: 0.025, // STT on sell side only
    exchangeRatePct: 0.00345, // NSE cash exchange turnover
    gstRatePct: 18,
    stampDutyPct: 0.003, // Buy side only
  },
  equityDelivery: {
    brokeragePerOrder: 20,
    sttRatePct: 0.1, // STT on both buy and sell
    exchangeRatePct: 0.00345,
    gstRatePct: 18,
    stampDutyPct: 0.015, // Buy side only
  },
  foFutures: {
    brokeragePerOrder: 20,
    sttRatePct: 0.02, // STT on sell side only
    exchangeRatePct: 0.0019,
    gstRatePct: 18,
    stampDutyPct: 0.002, // Buy side only
  },
  foOptions: {
    brokeragePerOrder: 20,
    sttRatePct: 0.0625, // STT on sell side premium turnover
    exchangeRatePct: 0.053, // Premium turnover
    gstRatePct: 18,
    stampDutyPct: 0.003, // Buy side premium only
  },
  mcx: {
    brokeragePerOrder: 20,
    sttRatePct: 0.01, // CTT on sell side only
    exchangeRatePct: 0.021,
    gstRatePct: 18,
    stampDutyPct: 0.002, // Buy side only
  },
};

export type ActiveTab = 'dashboard' | 'trades' | 'trade-detail' | 'weekly-report' | 'daily-plan';
