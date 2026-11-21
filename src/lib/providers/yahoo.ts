// Yahoo Finance chart API: free, keyless fallback for India (NSE/BSE) when the Upstox token is not set.
// Data is delayed and unofficial, so it is used for end-of-day analysis only, never for live quotes or trading.
import type { Bar } from '../ta/bars';

const INDEX: Record<string, string> = {
  'Nifty 50': '^NSEI', 'Nifty Bank': '^NSEBANK', SENSEX: '^BSESN', 'India VIX': '^INDIAVIX',
  'Nifty IT': '^CNXIT', 'Nifty Auto': '^CNXAUTO', 'Nifty Pharma': '^CNXPHARMA', 'Nifty FMCG': '^CNXFMCG',
  'Nifty Metal': '^CNXMETAL', 'Nifty Energy': '^CNXENERGY', 'Nifty Realty': '^CNXREALTY',
  'Nifty PSU Bank': '^CNXPSUBANK', 'Nifty Media': '^CNXMEDIA',
};

/** 'NSE_INDEX|Nifty 50' → '^NSEI'; 'RELIANCE' → 'RELIANCE.NS'; 'M&M' → 'M%26M.NS' after encoding. */
export function yahooSymbol(symbol: string): string | null {
  if (symbol.startsWith('^') || symbol.includes('=')) return symbol; // already a Yahoo symbol (global indexes, futures)
  if (symbol.includes('|')) { const name = symbol.split('|')[1]; return INDEX[name] ?? null; }
  return `${symbol}.NS`;
}

const INTERVAL: Record<string, string> = { '1m': '1m', '5m': '5m', '15m': '15m', '1h': '60m', '1d': '1d' };
// Yahoo caps intraday history: 1m ≈ 7 days, 5m/15m ≈ 60 days, 60m ≈ 730 days
const MAX_DAYS: Record<string, number> = { '1m': 7, '5m': 59, '15m': 59, '1h': 729, '1d': 3650 };

type Meta = { regularMarketPrice?: number; regularMarketTime?: number; regularMarketDayHigh?: number; regularMarketDayLow?: number; regularMarketVolume?: number; currentTradingPeriod?: { regular?: { start: number; end: number } } };
type Chart = { chart?: { result?: { meta?: Meta; timestamp?: number[]; indicators?: { quote?: { open: (number | null)[]; high: (number | null)[]; low: (number | null)[]; close: (number | null)[]; volume: (number | null)[] }[] } }[] } };

export async function yahooBars(symbol: string, tf: '1m' | '5m' | '15m' | '1h' | '1d', fromISO: string): Promise<Bar[]> {
  const y = yahooSymbol(symbol); if (!y) return [];
  const now = Math.floor(Date.now() / 1000);
  const from = Math.max(Math.floor(Date.parse(fromISO) / 1000), now - MAX_DAYS[tf] * 86_400);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(y)}?interval=${INTERVAL[tf]}&period1=${from}&period2=${now}&includePrePost=false`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SIXXAB-Money/1.0)', Accept: 'application/json' }, cache: 'no-store', signal: AbortSignal.timeout(20_000) });
      if (res.status === 429 || res.status >= 500) { await new Promise((r) => setTimeout(r, 2000 * (attempt + 1))); continue; }
      if (!res.ok) return [];
      const r = ((await res.json()) as Chart).chart?.result?.[0];
      const ts = r?.timestamp ?? [], q = r?.indicators?.quote?.[0];
      if (!q) return [];
      const bars: Bar[] = [];
      const m = r?.meta, end = m?.currentTradingPeriod?.regular?.end, start = m?.currentTradingPeriod?.regular?.start;
      ts.forEach((t, i) => {
        let o = q.open[i], h = q.high[i], l = q.low[i], c = q.close[i];
        const last = i === ts.length - 1;
        if (tf === '1d' && last && start != null && end != null && t >= start - 86_400 && t <= end) {
          // Today's daily bar: keep it only once the session has closed (never a mid-session price as a "close"),
          // and fill it from the quote summary because Yahoo often leaves the bar's own close empty for hours.
          if (now < end && !y.includes('=')) return; // futures (gold, Brent) trade nearly round the clock: keep the latest settle
          if (c == null && m?.regularMarketPrice != null && (m.regularMarketTime ?? 0) >= start) {
            c = m.regularMarketPrice; h = h ?? m.regularMarketDayHigh ?? c; l = l ?? m.regularMarketDayLow ?? c;
            o = o ?? bars.at(-1)?.c ?? c;
          }
        }
        if (o == null || h == null || l == null || c == null) return;
        bars.push({ t: t * 1000, o, h, l, c, v: q.volume[i] ?? (last ? m?.regularMarketVolume ?? 0 : 0) });
      });
      await new Promise((r) => setTimeout(r, 300)); // gentle pacing
      return bars;
    } catch { await new Promise((r) => setTimeout(r, 1500)); }
  }
  return [];
}
