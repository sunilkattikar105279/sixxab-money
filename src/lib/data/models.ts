import { unstable_cache } from 'next/cache';
import { getBars } from '../providers';
import { MODEL_SETS, align, rebalancedCurve, stats, type HistoryStats, type ModelKey, type ModelMarket, type Series } from '../models';

export interface ModelHistory {
  market: ModelMarket;
  available: boolean;
  asOf: string | null;
  prices: Record<string, number>;           // latest close per asset key (for paper portfolios)
  stats: Partial<Record<ModelKey, HistoryStats>>;
  missing: string[];                         // proxies with no price history from the feed
  days: number;                              // trading days shared by every proxy
}

const YEARS = 5;

async function load(market: ModelMarket): Promise<ModelHistory> {
  const set = MODEL_SETS[market];
  const series: Record<string, Series> = {};
  const prices: Record<string, number> = {};
  await Promise.all(set.assets.map(async (a) => {
    try {
      const bars = await getBars(set.fetchMarket, a.proxy, '1d', Math.round(YEARS * 366) + 10);
      if (bars.length) { series[a.key] = { t: bars.map((b) => b.t), c: bars.map((b) => b.c) }; prices[a.key] = bars[bars.length - 1].c; }
    } catch { /* a missing proxy only removes that asset from the history */ }
  }));
  const complete = set.assets.every((a) => series[a.key]);
  const aligned = align(series);
  const out: ModelHistory = { market, available: complete && aligned.t.length > 250, asOf: aligned.t.length ? new Date(aligned.t[aligned.t.length - 1]).toISOString().slice(0, 10) : null, prices, stats: {}, missing: set.assets.filter((a) => !series[a.key]).map((a) => a.proxy), days: aligned.t.length };
  if (!out.available) return out;
  for (const m of set.models) {
    const s = stats(rebalancedCurve(m.weights, aligned));
    if (s) out.stats[m.key] = s;
  }
  return out;
}

/** Five years of model history per market, recomputed at most every 12 hours. */
export const modelHistory = (market: ModelMarket) => unstable_cache(() => load(market), ['model-history-v2', market], { revalidate: 43_200 })();
