import { ChargesSettings, EmotionType, InstrumentType, PlanFollowedType, Segment, SetupType, Side, Trade } from '../types/trade';
import { calculateEstimatedCharges, calculateGrossPnL, calculateHoldTime } from './calculations';

export const CSV_HEADERS = [
  'date',
  'entry_time',
  'exit_time',
  'symbol',
  'segment',
  'side',
  'lots',
  'lot_size',
  'entry_price',
  'exit_price',
  'setup',
  'emotion',
  'followed_plan',
  'note',
];

/**
 * Generates CSV string for exporting trades
 */
export function exportTradesToCSV(trades: Trade[]): string {
  const rows = [
    [
      'date',
      'entry_time',
      'exit_time',
      'symbol',
      'segment',
      'side',
      'lots',
      'lot_size',
      'entry_price',
      'exit_price',
      'gross_pnl',
      'estimated_charges',
      'net_pnl',
      'hold_time',
      'setup',
      'emotion',
      'followed_plan',
      'note',
    ].join(','),
  ];

  for (const t of trades) {
    const cleanNote = `"${(t.note || '').replace(/"/g, '""')}"`;
    rows.push(
      [
        t.date,
        t.entry_time,
        t.exit_time,
        `"${t.symbol}"`,
        t.segment,
        t.side,
        t.lots,
        t.lot_size,
        t.entry_price,
        t.exit_price,
        t.gross_pnl,
        t.charges,
        t.net_pnl,
        t.hold_time,
        t.setup,
        t.emotion,
        t.followed_plan,
        cleanNote,
      ].join(',')
    );
  }

  return rows.join('\n');
}

/**
 * Returns a template CSV string with headers and sample rows for the user
 */
export function getCSVTemplate(): string {
  return [
    CSV_HEADERS.join(','),
    '2026-09-08,09:25:00,09:48:30,NIFTY 08SEP 24850 CE,F&O,Long,2,75,120.50,165.00,Untagged,Untagged,Untagged,"Tuesday weekly expiry breakout"',
    '2026-09-08,10:15:00,10:32:00,BANKNIFTY 29SEP 52200 PE,F&O,Long,2,30,240.00,210.00,Untagged,Untagged,Untagged,"Stop loss hit cleanly at 210"',
    '2026-09-09,11:30:00,12:15:00,RELIANCE,Equity,Long,1,100,2980.00,3012.00,Untagged,Untagged,Untagged,"VWAP bounce trend trade"',
  ].join('\n');
}

/**
 * Triggers a file download in the browser
 */
export function downloadFile(content: string, filename: string, mimeType: string = 'text/csv;charset=utf-8;') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Parses a CSV string and returns validated Trade objects
 * Default Emotion, Setup and Plan Followed to 'Untagged'
 */
export function parseTradesCSV(csvText: string, settings: ChargesSettings): { trades: Trade[]; error?: string } {
  try {
    const lines = csvText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length < 2) {
      return { trades: [], error: 'CSV file is empty or missing data rows.' };
    }

    const headerLine = lines[0].toLowerCase();
    const headers = headerLine.split(',').map((h) => h.trim().replace(/^"|"$/g, ''));

    // Check required columns
    const dateIdx = headers.indexOf('date');
    const entryTimeIdx = headers.indexOf('entry_time');
    const exitTimeIdx = headers.indexOf('exit_time');
    const symbolIdx = headers.indexOf('symbol');
    const sideIdx = headers.indexOf('side');
    const lotsIdx = headers.indexOf('lots');
    const lotSizeIdx = headers.indexOf('lot_size');
    const entryPriceIdx = headers.indexOf('entry_price');
    const exitPriceIdx = headers.indexOf('exit_price');

    if (
      dateIdx === -1 ||
      entryTimeIdx === -1 ||
      exitTimeIdx === -1 ||
      symbolIdx === -1 ||
      entryPriceIdx === -1 ||
      exitPriceIdx === -1
    ) {
      return {
        trades: [],
        error: 'Missing required columns. Please use the downloadable template format (date, entry_time, exit_time, symbol, entry_price, exit_price, etc.)',
      };
    }

    const segmentIdx = headers.indexOf('segment');
    const setupIdx = headers.indexOf('setup');
    const emotionIdx = headers.indexOf('emotion');
    const planIdx = headers.indexOf('followed_plan');
    const noteIdx = headers.indexOf('note');

    const parsedTrades: Trade[] = [];

    for (let r = 1; r < lines.length; r++) {
      const line = lines[r];
      // Regex CSV line split handling quotes
      const cells: string[] = [];
      let current = '';
      let insideQuote = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (insideQuote && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            insideQuote = !insideQuote;
          }
        } else if (char === ',' && !insideQuote) {
          cells.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      cells.push(current.trim());

      const date = cells[dateIdx] || new Date().toISOString().split('T')[0];
      const entryTime = cells[entryTimeIdx] || '09:30:00';
      const exitTime = cells[exitTimeIdx] || '10:00:00';
      const symbol = cells[symbolIdx]?.replace(/^"|"$/g, '') || 'NIFTY 25000 CE';
      
      const rawSide = cells[sideIdx]?.toLowerCase();
      const side: Side = rawSide === 'short' || rawSide === 'sell' ? 'Short' : 'Long';

      const lots = Math.max(1, Number(cells[lotsIdx]) || 1);
      const lotSize = Math.max(1, Number(cells[lotSizeIdx]) || 25);
      const entryPrice = Math.max(0.05, Number(cells[entryPriceIdx]) || 100);
      const exitPrice = Math.max(0.05, Number(cells[exitPriceIdx]) || 100);

      const rawSegment = cells[segmentIdx]?.toLowerCase() || '';
      let segment: Segment = 'F&O';
      if (rawSegment.includes('equity') || rawSegment.includes('cash')) segment = 'Equity';
      else if (rawSegment.includes('mcx') || rawSegment.includes('comm')) segment = 'MCX';

      // Default Setup, Emotion, and Plan Followed to 'Untagged'
      const rawSetup = setupIdx !== -1 && cells[setupIdx] ? cells[setupIdx] : 'Untagged';
      const validSetups: SetupType[] = ['Breakout', 'Pullback', 'Reversal', 'Range', 'Other', 'Untagged'];
      const setup = validSetups.find((s) => s.toLowerCase() === rawSetup.toLowerCase()) || 'Untagged';

      const rawEmotion = emotionIdx !== -1 && cells[emotionIdx] ? cells[emotionIdx] : 'Untagged';
      const validEmotions: EmotionType[] = ['Calm', 'Fear', 'Greed', 'Revenge', 'FOMO', 'Untagged'];
      const emotion = validEmotions.find((e) => e.toLowerCase() === rawEmotion.toLowerCase()) || 'Untagged';

      const rawPlan = planIdx !== -1 && cells[planIdx] ? cells[planIdx] : 'Untagged';
      const validPlans: PlanFollowedType[] = ['Yes', 'No', 'Untagged'];
      const followedPlan = validPlans.find((p) => p.toLowerCase() === rawPlan.toLowerCase()) || 'Untagged';

      const note = (noteIdx !== -1 && cells[noteIdx] ? cells[noteIdx].replace(/^"|"$/g, '') : '');

      const gross_pnl = calculateGrossPnL(side, lots, lotSize, entryPrice, exitPrice);
      const charges = calculateEstimatedCharges(
        { segment, symbol, side, lots, lot_size: lotSize, entry_price: entryPrice, exit_price: exitPrice },
        settings
      );
      const net_pnl = Math.round((gross_pnl - charges) * 100) / 100;
      const hold_time = calculateHoldTime(entryTime, exitTime);

      parsedTrades.push({
        id: `csv-${Date.now()}-${r}`,
        date,
        entry_time: entryTime,
        exit_time: exitTime,
        symbol,
        segment,
        side,
        lots,
        lot_size: lotSize,
        entry_price: entryPrice,
        exit_price: exitPrice,
        gross_pnl,
        charges,
        net_pnl,
        hold_time,
        setup,
        emotion,
        followed_plan: followedPlan,
        note,
      });
    }

    return { trades: parsedTrades };
  } catch (err: any) {
    return { trades: [], error: `Failed to parse CSV: ${err.message || 'Unknown format'}` };
  }
}
