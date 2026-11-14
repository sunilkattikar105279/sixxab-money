// Twelve Data (global markets). Free plan: 800 credits/day, 8/minute, delayed data; personal/non-commercial use.
import type { Bar } from '../ta/bars';

const TF: Record<string, string> = { '1m': '1min', '5m': '5min', '15m': '15min', '1h': '1h', '1d': '1day' };

export async function twelveBars(symbol: string, tf: '1m' | '5m' | '15m' | '1h' | '1d', outputsize = 5000): Promise<Bar[]> {
  const key = process.env.TWELVEDATA_API_KEY; if (!key) return [];
  const u = new URL('https://api.twelvedata.com/time_series');
  u.searchParams.set('symbol', symbol); u.searchParams.set('interval', TF[tf]); u.searchParams.set('outputsize', String(outputsize)); u.searchParams.set('apikey', key);
  const res = await fetch(u, { cache: 'no-store' }); if (!res.ok) return [];
  const j = (await res.json()) as { values?: { datetime: string; open: string; high: string; low: string; close: string; volume?: string }[] };
  return (j.values ?? []).map((v) => ({ t: Date.parse(v.datetime + (v.datetime.length === 10 ? 'T00:00:00Z' : 'Z')), o: +v.open, h: +v.high, l: +v.low, c: +v.close, v: v.volume ? +v.volume : 0 })).sort((a, b) => a.t - b.t);
}
