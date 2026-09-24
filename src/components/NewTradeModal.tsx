import React, { useState } from 'react';
import { ChargesSettings, EmotionType, InstrumentType, PlanFollowedType, Segment, SetupType, Side, Trade } from '../types/trade';
import { calculateEstimatedCharges, calculateGrossPnL, calculateHoldTime } from '../utils/calculations';
import { X, Plus, Clock, Tag } from 'lucide-react';

interface NewTradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTrade: (trade: Trade) => void;
  settings: ChargesSettings;
}

export const NewTradeModal: React.FC<NewTradeModalProps> = ({
  isOpen,
  onClose,
  onAddTrade,
  settings,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const [date, setDate] = useState<string>(todayStr);
  const [entryTime, setEntryTime] = useState<string>('09:30');
  const [exitTime, setExitTime] = useState<string>('09:48');
  const [symbol, setSymbol] = useState<string>('NIFTY 25000 CE');
  const [segment, setSegment] = useState<Segment>('F&O');
  const [side, setSide] = useState<Side>('Long');
  
  // Equity Quantity vs F&O Lots/LotSize
  const [equityQuantity, setEquityQuantity] = useState<number>(100);
  const [lots, setLots] = useState<number>(2);
  const [lotSize, setLotSize] = useState<number>(75);

  const [entryPrice, setEntryPrice] = useState<number>(120);
  const [exitPrice, setExitPrice] = useState<number>(145);

  // Requirement 1: Default Setup, Emotion, and Plan Followed to 'Untagged'
  const [setup, setSetup] = useState<SetupType>('Untagged');
  const [emotion, setEmotion] = useState<EmotionType>('Untagged');
  const [followedPlan, setFollowedPlan] = useState<PlanFollowedType>('Untagged');
  const [note, setNote] = useState<string>('');

  if (!isOpen) return null;

  const handleSymbolChange = (sym: string) => {
    setSymbol(sym);
    if (sym.includes('BANKNIFTY')) {
      setSegment('F&O');
      setLotSize(30);
    } else if (sym.includes('NIFTY')) {
      setSegment('F&O');
      setLotSize(75);
    } else if (sym.includes('CRUDE') || sym.includes('GOLD') || sym.includes('SILVER')) {
      setSegment('MCX');
      setLotSize(100);
    } else {
      setSegment('Equity');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const isEquity = segment === 'Equity';
    const finalLots = isEquity ? 1 : Math.max(1, lots);
    const finalLotSize = isEquity ? Math.max(1, equityQuantity) : Math.max(1, lotSize);

    const gross_pnl = calculateGrossPnL(side, finalLots, finalLotSize, entryPrice, exitPrice);
    const charges = calculateEstimatedCharges(
      {
        segment,
        symbol: symbol.trim(),
        side,
        lots: finalLots,
        lot_size: finalLotSize,
        entry_price: entryPrice,
        exit_price: exitPrice,
      },
      settings
    );
    const net_pnl = Math.round((gross_pnl - charges) * 100) / 100;
    const hold_time = calculateHoldTime(entryTime, exitTime);

    const newTrade: Trade = {
      id: `trade-${Date.now()}`,
      date,
      entry_time: entryTime.length === 5 ? `${entryTime}:00` : entryTime,
      exit_time: exitTime.length === 5 ? `${exitTime}:00` : exitTime,
      symbol: symbol.trim(),
      segment,
      side,
      lots: finalLots,
      lot_size: finalLotSize,
      entry_price: entryPrice,
      exit_price: exitPrice,
      gross_pnl,
      charges,
      net_pnl,
      hold_time,
      setup,
      emotion,
      followed_plan: followedPlan,
      note: note.trim(),
    };

    onAddTrade(newTrade);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <Plus className="w-4 h-4 text-teal-600" />
            <span>Log New Trade</span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[36px] min-w-[36px] flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3.5 text-xs">
          {/* Symbol */}
          <div>
            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
              Symbol Name
            </label>
            <input
              type="text"
              required
              value={symbol}
              onChange={(e) => handleSymbolChange(e.target.value)}
              placeholder="e.g. NIFTY 15SEP 25000 CE, BANKNIFTY 29SEP 52500 PE, RELIANCE"
              className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                Segment
              </label>
              <select
                value={segment}
                onChange={(e) => setSegment(e.target.value as Segment)}
                className="w-full py-2 px-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200"
              >
                <option value="F&O">F&O (Options / Futures)</option>
                <option value="Equity">Equity (Cash)</option>
                <option value="MCX">MCX (Commodity)</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                Position Side
              </label>
              <div className="grid grid-cols-2 gap-1 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => setSide('Long')}
                  className={`py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    side === 'Long'
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Long
                </button>
                <button
                  type="button"
                  onClick={() => setSide('Short')}
                  className={`py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    side === 'Short'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Short
                </button>
              </div>
            </div>
          </div>

          {/* Requirement 2: For Equity segment, hide Lots & Lot Size everywhere; show only Quantity */}
          {segment === 'Equity' ? (
            <div>
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                Quantity (Number of Shares)
              </label>
              <input
                type="number"
                min="1"
                required
                value={equityQuantity}
                onChange={(e) => setEquityQuantity(Math.max(1, Number(e.target.value)))}
                placeholder="e.g. 100"
                className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white"
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                  Lots (Position Size)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={lots}
                  onChange={(e) => setLots(Math.max(1, Number(e.target.value)))}
                  className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                  Lot Size (Units / Lot)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={lotSize}
                  onChange={(e) => setLotSize(Math.max(1, Number(e.target.value)))}
                  className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Total qty: {lots * lotSize}
                </span>
              </div>
            </div>
          )}

          {/* Prices */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                Entry Price (₹)
              </label>
              <input
                type="number"
                step="0.05"
                min="0.05"
                required
                value={entryPrice}
                onChange={(e) => setEntryPrice(Number(e.target.value))}
                className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                Exit Price (₹)
              </label>
              <input
                type="number"
                step="0.05"
                min="0.05"
                required
                value={exitPrice}
                onChange={(e) => setExitPrice(Number(e.target.value))}
                className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Date & Times */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                Date
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full py-2 px-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-[11px] text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                Entry Time
              </label>
              <input
                type="time"
                step="1"
                required
                value={entryTime}
                onChange={(e) => setEntryTime(e.target.value)}
                className="w-full py-2 px-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-[11px] text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                Exit Time
              </label>
              <input
                type="time"
                step="1"
                required
                value={exitTime}
                onChange={(e) => setExitTime(e.target.value)}
                className="w-full py-2 px-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-[11px] text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Setup, Emotion, Plan - Defaulted to Untagged */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <div>
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                Setup
              </label>
              <select
                value={setup}
                onChange={(e) => setSetup(e.target.value as SetupType)}
                className="w-full py-1.5 px-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200"
              >
                <option value="Untagged">Untagged</option>
                <option value="Breakout">Breakout</option>
                <option value="Pullback">Pullback</option>
                <option value="Reversal">Reversal</option>
                <option value="Range">Range</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                Emotion
              </label>
              <select
                value={emotion}
                onChange={(e) => setEmotion(e.target.value as EmotionType)}
                className="w-full py-1.5 px-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200"
              >
                <option value="Untagged">Untagged</option>
                <option value="Calm">Calm</option>
                <option value="Fear">Fear</option>
                <option value="Greed">Greed</option>
                <option value="Revenge">Revenge</option>
                <option value="FOMO">FOMO</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                Plan Followed?
              </label>
              <select
                value={followedPlan}
                onChange={(e) => setFollowedPlan(e.target.value as PlanFollowedType)}
                className="w-full py-1.5 px-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-800 dark:text-slate-200"
              >
                <option value="Untagged">Untagged</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
              Trade Note & Reasoning
            </label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Why was this trade entered? What was the planned stop?"
              className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white resize-none"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow-xs transition-transform active:scale-95"
            >
              Save Trade
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
