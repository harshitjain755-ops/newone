import React, { useState } from 'react';
import { ChargesSettings, DEFAULT_CHARGES_SETTINGS, SegmentChargeRate, Trade } from '../types/trade';
import { downloadFile, exportTradesToCSV, getCSVTemplate, parseTradesCSV } from '../utils/csv';
import { 
  X, 
  Download, 
  Upload, 
  RotateCcw, 
  Check, 
  AlertCircle, 
  FileSpreadsheet,
  Save,
  Calculator,
  Layers
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ChargesSettings;
  onSaveSettings: (settings: ChargesSettings, recalculateAll: boolean) => void;
  trades: Trade[];
  onImportTrades: (imported: Trade[]) => void;
  onResetSeedData: () => void;
}

type SegmentTab = 'equityIntraday' | 'equityDelivery' | 'foFutures' | 'foOptions' | 'mcx';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  trades,
  onImportTrades,
  onResetSeedData,
}) => {
  // Ensure formData has all 5 segments with defaults if migrating
  const [formData, setFormData] = useState<ChargesSettings>(() => {
    return {
      equityIntraday: settings?.equityIntraday || DEFAULT_CHARGES_SETTINGS.equityIntraday,
      equityDelivery: settings?.equityDelivery || DEFAULT_CHARGES_SETTINGS.equityDelivery,
      foFutures: settings?.foFutures || DEFAULT_CHARGES_SETTINGS.foFutures,
      foOptions: settings?.foOptions || DEFAULT_CHARGES_SETTINGS.foOptions,
      mcx: settings?.mcx || DEFAULT_CHARGES_SETTINGS.mcx,
    };
  });

  const [activeSegmentTab, setActiveSegmentTab] = useState<SegmentTab>('foOptions');
  const [recalculateAll, setRecalculateAll] = useState<boolean>(true);
  const [importStatus, setImportStatus] = useState<{ message: string; isError: boolean } | null>(null);
  const [savedSettingsNotice, setSavedSettingsNotice] = useState<boolean>(false);

  if (!isOpen) return null;

  const segmentTabs: { id: SegmentTab; label: string; sttNote: string }[] = [
    { id: 'equityIntraday', label: 'Equity Intraday', sttNote: 'STT on Sell side only (0.025%)' },
    { id: 'equityDelivery', label: 'Equity Delivery', sttNote: 'STT on both Buy & Sell (0.1%)' },
    { id: 'foFutures', label: 'F&O Futures', sttNote: 'STT on Sell side only (0.02%)' },
    { id: 'foOptions', label: 'F&O Options', sttNote: 'STT on Sell side premium (0.0625%)' },
    { id: 'mcx', label: 'MCX Commodity', sttNote: 'CTT on Sell side only (0.01%)' },
  ];

  const currentRate: SegmentChargeRate = formData[activeSegmentTab];

  const handleRateChange = (field: keyof SegmentChargeRate, value: number) => {
    setFormData((prev) => ({
      ...prev,
      [activeSegmentTab]: {
        ...prev[activeSegmentTab],
        [field]: value,
      },
    }));
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formData, recalculateAll);
    setSavedSettingsNotice(true);
    setTimeout(() => {
      setSavedSettingsNotice(false);
    }, 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const result = parseTradesCSV(text, formData);
      if (result.error) {
        setImportStatus({ message: result.error, isError: true });
      } else if (result.trades.length === 0) {
        setImportStatus({ message: 'No valid trades found in file.', isError: true });
      } else {
        onImportTrades(result.trades);
        setImportStatus({
          message: `Successfully imported ${result.trades.length} trades!`,
          isError: false,
        });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDownloadTemplate = () => {
    const templateContent = getCSVTemplate();
    downloadFile(templateContent, 'tradelog_ai_template.csv');
  };

  const handleExportTrades = () => {
    const csvContent = exportTradesToCSV(trades);
    downloadFile(csvContent, `tradelog_trades_${new Date().toISOString().split('T')[0]}.csv`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Modal Header */}
        <div className="sticky top-0 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Estimated Regulatory & Brokerage Charges
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[36px] min-w-[36px] flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-5 text-xs">
          {/* Segment Selector Tabs */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-teal-600" />
                <span>Segment Charge Profiles</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Estimated rates</span>
            </div>

            <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
              {segmentTabs.map((tab) => {
                const isActive = activeSegmentTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveSegmentTab(tab.id)}
                    className={`px-2.5 py-1.5 rounded-xl text-xs whitespace-nowrap transition-colors font-medium border ${
                      isActive
                        ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form for Active Segment */}
          <form onSubmit={handleSaveSettings} className="space-y-3.5 bg-slate-50/60 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center justify-between pb-1 border-b border-slate-200/60 dark:border-slate-700/60">
              <span className="font-semibold text-slate-900 dark:text-white text-xs">
                {segmentTabs.find((t) => t.id === activeSegmentTab)?.label} Rates
              </span>
              <span className="text-[10px] text-teal-600 dark:text-teal-400 font-mono">
                {segmentTabs.find((t) => t.id === activeSegmentTab)?.sttNote}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-medium text-slate-600 dark:text-slate-300 block mb-1">
                  Brokerage / Order (₹)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={currentRate.brokeragePerOrder}
                  onChange={(e) => handleRateChange('brokeragePerOrder', Number(e.target.value))}
                  className="w-full py-1.5 px-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Per executed order</span>
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-600 dark:text-slate-300 block mb-1">
                  STT / CTT Rate (%)
                </label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  value={currentRate.sttRatePct}
                  onChange={(e) => handleRateChange('sttRatePct', Number(e.target.value))}
                  className="w-full py-1.5 px-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Applied per regulatory side</span>
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-600 dark:text-slate-300 block mb-1">
                  Exchange Turnover (%)
                </label>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  value={currentRate.exchangeRatePct}
                  onChange={(e) => handleRateChange('exchangeRatePct', Number(e.target.value))}
                  className="w-full py-1.5 px-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Turnover transaction fees</span>
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-600 dark:text-slate-300 block mb-1">
                  GST Rate (%)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={currentRate.gstRatePct}
                  onChange={(e) => handleRateChange('gstRatePct', Number(e.target.value))}
                  className="w-full py-1.5 px-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">18% on (Brokerage + Txn)</span>
              </div>

              <div className="col-span-2">
                <label className="text-[11px] font-medium text-slate-600 dark:text-slate-300 block mb-1">
                  Stamp Duty Rate (%) <span className="text-slate-400 font-normal">(Applied on Buy side only)</span>
                </label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  value={currentRate.stampDutyPct}
                  onChange={(e) => handleRateChange('stampDutyPct', Number(e.target.value))}
                  className="w-full py-1.5 px-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="recalc-check"
                checked={recalculateAll}
                onChange={(e) => setRecalculateAll(e.target.checked)}
                className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              <label htmlFor="recalc-check" className="text-[11px] text-slate-600 dark:text-slate-400">
                Recalculate estimated charges on all existing trades immediately
              </label>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-teal-600 dark:text-teal-400">
                {savedSettingsNotice && '✓ Charges saved & updated'}
              </span>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-xl transition-all shadow-xs flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Rates</span>
              </button>
            </div>
          </form>

          {/* Section 2: CSV Import & Export */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-3">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white text-xs">
                CSV Import & Export
              </h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                Download the standardized CSV template or import external logs.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="flex-1 py-2 px-3 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200 font-medium rounded-xl flex items-center justify-center gap-1.5 transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-teal-600" />
                <span>Download Template</span>
              </button>

              <button
                type="button"
                onClick={handleExportTrades}
                className="flex-1 py-2 px-3 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200 font-medium rounded-xl flex items-center justify-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Export ({trades.length})</span>
              </button>
            </div>

            <div className="relative border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-3 text-center hover:border-teal-500 transition-colors">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Upload className="w-5 h-5 mx-auto text-slate-400 mb-1" />
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Tap or drag CSV file to import trades
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Defaults Setup, Emotion, and Plan Followed to "Untagged"
              </p>
            </div>

            {importStatus && (
              <div
                className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 ${
                  importStatus.isError
                    ? 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-200'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-200'
                }`}
              >
                {importStatus.isError ? (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                ) : (
                  <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                )}
                <span>{importStatus.message}</span>
              </div>
            )}
          </div>

          {/* Section 3: Reset Dataset */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Reset all trades and daily plans to the 10-day realistic seed data (with Tuesday expiries & monthly BankNifty)?')) {
                  onResetSeedData();
                  onClose();
                }
              }}
              className="w-full py-2 px-3 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restore Realistic 10-Day Seed Dataset</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
