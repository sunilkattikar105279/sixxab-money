// Pivot · Levels agent: a nightly, multi-timeframe read of the US index ETFs (SPY, QQQ, DIA, IWM).
// Weekly trend → daily break levels → 4H/1H supply-demand zones → 1H-close triggers, plus Wyckoff phase and Elliott count.
// Output is an educational OUTLOOK with if/then scenarios. US only: India levels stay hidden (SEBI).
import type { TechReport } from './ta/analyze';
import type { Zone, Trend } from './ta/structure';

export interface PivotScenario { side: 'bull' | 'bear'; trigger: number; next: number | null; text: string }
export interface PivotRead {
  symbol: string; name: string; asOf: string; price: number; changePct: number | null;
  trends: { w: Trend; d: Trend; h4: Trend | null; h1: Trend | null };
  bias: 'up' | 'down' | 'mixed';
  daily: { up: number | null; down: number | null };
  supply: { low: number; high: number; tf: '4H' | '1H' | 'D' } | null;
  demand: { low: number; high: number; tf: '4H' | '1H' | 'D' } | null;
  wyckoff: { phase: string; confidence: string };
  elliott: { summary: string | null; invalidation: number | null; targets: number[] };
  scenarios: PivotScenario[];
  summary: string;
}
export interface PivotBoard { asOf: string; reads: PivotRead[] }

export const PIVOT_SYMBOLS = [
  { symbol: 'SPY', name: 'S&P 500 (SPY)' }, { symbol: 'QQQ', name: 'Nasdaq 100 (QQQ)' },
  { symbol: 'DIA', name: 'Dow (DIA)' }, { symbol: 'IWM', name: 'Russell 2000 (IWM)' },
];

const r2 = (v: number) => Math.round(v * 100) / 100;

/** Nearest zone of a kind on the given side of price, preferring 4H, then 1H, then daily. */
function nearest(t: TechReport, kind: 'supply' | 'demand'): PivotRead['supply'] {
  const p = t.price, reach = Math.max(3 * t.atrD, p * 0.03); // only zones close enough to act on this week
  const pick = (zs: Zone[], tf: '4H' | '1H' | 'D') => zs
    .filter((z) => z.kind === kind && (kind === 'supply' ? z.low >= p * 0.995 && z.low - p <= reach : z.high <= p * 1.005 && p - z.high <= reach))
    .sort((a, b) => (kind === 'supply' ? a.low - b.low : b.high - a.high))
    .map((z) => ({ low: r2(z.low), high: r2(z.high), tf }))[0];
  return pick(t.zones.h4 ?? [], '4H') ?? pick(t.zones.h1 ?? [], '1H') ?? pick(t.zones.d ?? [], 'D') ?? null;
}

export function pivotRead(t: TechReport, name: string, asOf: string): PivotRead {
  const w = t.trends.w, d = t.trends.d;
  const bias: PivotRead['bias'] = w === 'UP' && d !== 'DOWN' ? 'up' : w === 'DOWN' && d !== 'UP' ? 'down' : 'mixed';
  const up = t.breaks.d.up != null ? r2(t.breaks.d.up) : null, down = t.breaks.d.down != null ? r2(t.breaks.d.down) : null;
  const supply = nearest(t, 'supply'), demand = nearest(t, 'demand');
  const bullTrig = supply ? supply.high : up, bearTrig = demand ? demand.low : down;
  const scenarios: PivotScenario[] = [];
  if (bullTrig != null) scenarios.push({ side: 'bull', trigger: bullTrig, next: up != null && up > bullTrig ? up : null, text: `If a 1-hour candle closes above ${bullTrig}${supply ? ` (top of the ${supply.tf} supply zone)` : ''}, the bullish scenario opens${up != null && up > bullTrig ? ` toward the daily break level ${up}` : ''}.` });
  if (bearTrig != null) scenarios.push({ side: 'bear', trigger: bearTrig, next: down != null && down < bearTrig ? down : null, text: `If a 1-hour candle closes below ${bearTrig}${demand ? ` (bottom of the ${demand.tf} demand zone)` : ''}, the bearish scenario opens${down != null && down < bearTrig ? ` toward the daily break level ${down}` : ''}.` });
  const wv = t.waves;
  const trendWord = { UP: 'up', DOWN: 'down', RANGE: 'sideways' } as const;
  const summary = `${name}: weekly trend ${trendWord[w]}, daily ${trendWord[d]}. Wyckoff reads ${t.cycle.weekly.phase} on the weekly (${t.cycle.weekly.confidence} confidence)${wv?.summary ? `; Elliott: ${wv.summary}` : ''}. Between ${bearTrig ?? '—'} and ${bullTrig ?? '—'} price is in the middle; a 1-hour close outside that range decides the next scenario.`;
  return {
    symbol: t.symbol, name, asOf, price: r2(t.price), changePct: t.changePct,
    trends: { w, d, h4: t.trends.h4, h1: t.trends.h1 }, bias, daily: { up, down }, supply, demand,
    wyckoff: { phase: t.cycle.weekly.phase, confidence: t.cycle.weekly.confidence },
    elliott: { summary: wv?.summary ?? null, invalidation: wv?.invalidation != null ? r2(wv.invalidation) : null, targets: (wv?.targets ?? []).slice(0, 3).map((x) => r2(x.price)) },
    scenarios, summary,
  };
}
