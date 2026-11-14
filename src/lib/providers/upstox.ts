// Upstox (India, NSE/BSE). Free API with an Upstox account; historical candles (1-minute kept ~6 months) and intraday candles.
// Access tokens are issued per login; set UPSTOX_ACCESS_TOKEN (refresh it when it expires).
import type { Bar } from '../ta/bars';

let instruments: Map<string, string> | null = null;

/** Maps NSE trading symbols (e.g. RELIANCE) to Upstox instrument keys (e.g. NSE_EQ|INE002A01018). */
async function instrumentKey(symbol: string): Promise<string | null> {
  if (symbol.includes('|')) return symbol; // already an instrument key, e.g. NSE_INDEX|Nifty 50
  if (!instruments) {
    instruments = new Map();
    const res = await fetch('https://assets.upstox.com/market-quote/instruments/exchange/NSE.json.gz');
    if (res.ok && res.body) {
      const text = await new Response(res.body.pipeThrough(new DecompressionStream('gzip'))).text();
      for (const r of JSON.parse(text) as { segment: string; trading_symbol: string; instrument_key: string; instrument_type: string }[]) {
        if (r.segment === 'NSE_EQ' && r.instrument_type === 'EQ') instruments.set(r.trading_symbol, r.instrument_key);
      }
    }
  }
  return instruments.get(symbol) ?? null;
}

const UNIT: Record<string, [string, number]> = { '1m': ['minutes', 1], '5m': ['minutes', 5], '15m': ['minutes', 15], '1h': ['hours', 1], '1d': ['days', 1] };

export async function upstoxBars(symbol: string, tf: '1m' | '5m' | '15m' | '1h' | '1d', fromISO: string): Promise<Bar[]> {
  const token = process.env.UPSTOX_ACCESS_TOKEN; if (!token) return [];
  const key = await instrumentKey(symbol); if (!key) return [];
  const [unit, n] = UNIT[tf];
  const to = new Date().toISOString().slice(0, 10), from = fromISO.slice(0, 10);
  const headers = { Accept: 'application/json', Authorization: `Bearer ${token}` };
  const parse = (j: { data?: { candles?: [string, number, number, number, number, number][] } }) => (j.data?.candles ?? []).map(([t, o, h, l, c, v]) => ({ t: Date.parse(t), o, h, l, c, v }));
  const hist = await fetch(`https://api.upstox.com/v3/historical-candle/${encodeURIComponent(key)}/${unit}/${n}/${to}/${from}`, { headers, cache: 'no-store' });
  const bars: Bar[] = hist.ok ? parse(await hist.json()) : [];
  if (tf !== '1d') {
    const intra = await fetch(`https://api.upstox.com/v3/historical-candle/intraday/${encodeURIComponent(key)}/${unit}/${n}`, { headers, cache: 'no-store' });
    if (intra.ok) bars.push(...parse(await intra.json()));
  }
  return bars.sort((a, b) => a.t - b.t);
}
