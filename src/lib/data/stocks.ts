import { adminClient } from '../supabase/admin';
import type { Market } from './market';
import { UNIVERSE } from './universe';

export interface StockRow { symbol: string; name: string; sector: string; price: number | null; changePct: number | null; marketCap: number | null }
export interface StockBoard { market: Market; asOf: string; source: string; sample: boolean; rows: StockRow[] }

// Until a data provider writes stock_quotes, US shows a fixed Nov 13, 2026 sample; other markets wait for data.
const US_SAMPLE: Record<string, number> = { NVDA: -2.01, AAPL: 0.39, AVGO: -4.76, AMD: -8.75, MU: -2.52, GOOGL: -0.98, META: 2.9, LLY: 1.14, JNJ: 0.79, ABBV: 0.2 };

export async function getStocks(market: Market): Promise<StockBoard> {
  const universe = UNIVERSE[market];
  const db = adminClient();
  if (db) {
    const { data: latest } = await db.from('stock_quotes').select('as_of').eq('market', market).order('as_of', { ascending: false }).limit(1).maybeSingle();
    if (latest) {
      const { data } = await db.from('stock_quotes').select('symbol, name, sector, price, change_pct, market_cap, source').eq('market', market).eq('as_of', latest.as_of);
      if (data && data.length) {
        return {
          market, asOf: latest.as_of, source: data[0].source, sample: false,
          rows: data.map((r) => ({ symbol: r.symbol, name: r.name, sector: r.sector, price: r.price, changePct: r.change_pct, marketCap: r.market_cap })),
        };
      }
    }
  }
  const sample = market === 'US' ? US_SAMPLE : {};
  return {
    market,
    asOf: market === 'US' ? '2026-11-13' : '',
    source: market === 'US' ? 'Sample snapshot, Nov 13, 2026 close' : 'Connect a data provider to see live moves',
    sample: true,
    rows: universe.map((l) => ({ ...l, price: null, changePct: l.symbol in sample ? sample[l.symbol] : null, marketCap: null })),
  };
}

export interface SectorGroup { sector: string; weight: number; avgChange: number | null; rows: StockRow[] }

/** Groups by sector; weight = total market cap when known, else number of stocks. */
export function bySector(rows: StockRow[]): SectorGroup[] {
  const map = new Map<string, StockRow[]>();
  rows.forEach((r) => map.set(r.sector, [...(map.get(r.sector) ?? []), r]));
  return [...map.entries()].map(([sector, list]) => {
    const known = list.filter((r) => r.changePct !== null);
    const capKnown = list.every((r) => r.marketCap);
    const weight = capKnown ? list.reduce((a, r) => a + (r.marketCap ?? 0), 0) : list.length;
    let avg: number | null = null;
    if (known.length) {
      const w = known.map((r) => (capKnown ? r.marketCap ?? 1 : 1));
      avg = known.reduce((a, r, i) => a + (r.changePct ?? 0) * w[i], 0) / w.reduce((a, b) => a + b, 0);
    }
    return { sector, weight, avgChange: avg, rows: list };
  }).sort((a, b) => b.weight - a.weight);
}

/** Tile colour for a % change: green up, red down, slate when unknown. */
export function heatColor(pct: number | null): string {
  if (pct === null) return '#22314A';
  if (pct >= 3) return '#0FA968';
  if (pct >= 1) return '#13854F';
  if (pct > 0) return '#1A5E40';
  if (pct === 0) return '#3A4A60';
  if (pct > -1) return '#7E2A2A';
  if (pct > -3) return '#B42828';
  return '#E02D2D';
}
