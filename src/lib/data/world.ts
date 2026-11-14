// World markets via country ETFs (one Alpaca snapshot call), plus FX and US yield curve from FRED.
import { getIndicator } from './fred';

export interface CountryTile { code: string; name: string; etf: string; col: number; row: number; changePct: number | null; price: number | null }

// Grid cartogram: col/row place each market roughly where it sits on a world map.
export const COUNTRIES: Omit<CountryTile, 'changePct' | 'price'>[] = [
  { code: 'CA', name: 'Canada', etf: 'EWC', col: 1, row: 0 },
  { code: 'US', name: 'United States', etf: 'SPY', col: 1, row: 1 },
  { code: 'MX', name: 'Mexico', etf: 'EWW', col: 1, row: 2 },
  { code: 'BR', name: 'Brazil', etf: 'EWZ', col: 2, row: 3 },
  { code: 'UK', name: 'United Kingdom', etf: 'EWU', col: 4, row: 0 },
  { code: 'FR', name: 'France', etf: 'EWQ', col: 4, row: 1 },
  { code: 'DE', name: 'Germany', etf: 'EWG', col: 5, row: 0 },
  { code: 'CH', name: 'Switzerland', etf: 'EWL', col: 5, row: 1 },
  { code: 'ZA', name: 'South Africa', etf: 'EZA', col: 5, row: 3 },
  { code: 'SA', name: 'Saudi Arabia', etf: 'KSA', col: 6, row: 2 },
  { code: 'IN', name: 'India', etf: 'INDA', col: 7, row: 2 },
  { code: 'CN', name: 'China', etf: 'FXI', col: 8, row: 1 },
  { code: 'KR', name: 'South Korea', etf: 'EWY', col: 9, row: 0 },
  { code: 'JP', name: 'Japan', etf: 'EWJ', col: 10, row: 1 },
  { code: 'TW', name: 'Taiwan', etf: 'EWT', col: 9, row: 2 },
  { code: 'AU', name: 'Australia', etf: 'EWA', col: 10, row: 3 },
];

export async function worldTiles(): Promise<{ tiles: CountryTile[]; asOf: string | null; source: string }> {
  const id = process.env.ALPACA_KEY_ID, secret = process.env.ALPACA_SECRET_KEY;
  const blank = COUNTRIES.map((c) => ({ ...c, changePct: null, price: null }));
  if (!id || !secret) return { tiles: blank, asOf: null, source: 'Add Alpaca keys to see live country moves' };
  try {
    const u = `https://data.alpaca.markets/v2/stocks/snapshots?symbols=${COUNTRIES.map((c) => c.etf).join(',')}&feed=${process.env.ALPACA_FEED || 'iex'}`;
    const res = await fetch(u, { headers: { 'APCA-API-KEY-ID': id, 'APCA-API-SECRET-KEY': secret }, signal: AbortSignal.timeout(15_000), next: { revalidate: 300 } });
    if (!res.ok) return { tiles: blank, asOf: null, source: `Alpaca error ${res.status}` };
    const j = (await res.json()) as Record<string, { dailyBar?: { c: number; t: string }; prevDailyBar?: { c: number } }>;
    let asOf: string | null = null;
    const tiles = COUNTRIES.map((c) => {
      const s = j[c.etf]; const d = s?.dailyBar?.c, p = s?.prevDailyBar?.c;
      if (s?.dailyBar?.t) asOf = s.dailyBar.t.slice(0, 10);
      return { ...c, price: d ?? null, changePct: d && p ? ((d - p) / p) * 100 : null };
    });
    return { tiles, asOf, source: 'Country ETFs via Alpaca (IEX feed)' };
  } catch {
    return { tiles: blank, asOf: null, source: 'Alpaca unreachable' };
  }
}

export const FX: { key: string; series: string; label: string; invert?: boolean }[] = [
  { key: 'usd_inr', series: 'DEXINUS', label: 'USD → INR' },
  { key: 'eur_usd', series: 'DEXUSEU', label: 'EUR → USD' },
  { key: 'gbp_usd', series: 'DEXUSUK', label: 'GBP → USD' },
  { key: 'usd_jpy', series: 'DEXJPUS', label: 'USD → JPY' },
  { key: 'usd_cny', series: 'DEXCHUS', label: 'USD → CNY' },
  { key: 'usd_cad', series: 'DEXCAUS', label: 'USD → CAD' },
];

export const CURVE: { label: string; series: string; years: number }[] = [
  { label: '1M', series: 'DGS1MO', years: 1 / 12 }, { label: '3M', series: 'DGS3MO', years: 0.25 }, { label: '6M', series: 'DGS6MO', years: 0.5 },
  { label: '1Y', series: 'DGS1', years: 1 }, { label: '2Y', series: 'DGS2', years: 2 }, { label: '5Y', series: 'DGS5', years: 5 },
  { label: '10Y', series: 'DGS10', years: 10 }, { label: '30Y', series: 'DGS30', years: 30 },
];

/** Latest value and change vs the previous observation for any FRED series. */
export async function fredSeries(series: string): Promise<{ value: number; prev: number | null; date: string } | null> {
  const key = process.env.FRED_API_KEY; if (!key) return null;
  try {
    const r = await fetch(`https://api.stlouisfed.org/fred/series/observations?series_id=${series}&api_key=${key}&file_type=json&sort_order=desc&limit=10`, { signal: AbortSignal.timeout(10_000), next: { revalidate: 3600 } });
    if (!r.ok) return null;
    const obs = ((await r.json()) as { observations?: { date: string; value: string }[] }).observations?.filter((o) => o.value !== '.') ?? [];
    if (!obs.length) return null;
    return { value: +obs[0].value, prev: obs[1] ? +obs[1].value : null, date: obs[0].date };
  } catch { return null; }
}
export { getIndicator };
