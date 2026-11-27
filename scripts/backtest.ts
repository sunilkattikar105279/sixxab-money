// Backtest the swing engine: npx tsx scripts/backtest.ts US|IN [years]
// Uses the live screener universe, the owner limits (0.5% risk per trade, 2% daily stop, 6 positions) and
// writes backtest-<market>.json (summary + equity curve + trades) for the owner dashboard.
import { writeFileSync } from 'node:fs';
import { getBars } from '../src/lib/providers';
import { UNIVERSE } from '../src/lib/data/universe';
import { backtest } from '../src/lib/backtest';
import { maxDrawdownPct } from '../src/lib/autotrade';
import { DEFAULT_LIMITS } from '../src/lib/risk';
import type { Rules } from '../src/lib/autotrade';
import type { Bar } from '../src/lib/ta/bars';

const market = (process.argv[2] ?? 'US') as 'US' | 'IN';
const years = Number(process.argv[3] ?? 5);
const BENCH = { US: 'SPY', IN: 'NIFTYBEES' } as const;
const CASH = { US: 5000, IN: 400000 } as const;      // about $5k either way
const COST = { US: 0.05, IN: 0.15 } as const;        // % per side: slippage (US), STT + charges + slippage (India)
const istDay = (t: number) => new Date(t + 5.5 * 3600e3).toISOString().slice(0, 10);

async function main() {
  const days = Math.round(365 * (years + 1.2)); // + warmup year
  const list = UNIVERSE[market];
  const series: Record<string, Bar[]> = {};
  for (const l of list) {
    try { const b = await getBars(market, l.symbol, '1d', days); if (b.length > 300) series[l.symbol] = b; }
    catch (e) { console.warn(`${l.symbol}: ${e instanceof Error ? e.message : e}`); }
  }
  const benchmark = await getBars(market, BENCH[market], '1d', days);
  console.log(`${market}: ${Object.keys(series).length}/${list.length} symbols, benchmark ${benchmark.length} bars`);
  const base = (o: Partial<Rules>): Rules => ({ mode: 'invest', minScore: 7, riskPct: DEFAULT_LIMITS.riskPct, maxPositionPct: 25, maxPositions: DEFAULT_LIMITS.maxPositions, dailyLossPct: DEFAULT_LIMITS.dailyLossPct, allowShort: false, withTrendOnly: true, ...o });
  const trail = { startR: 1, distR: 1.5, keepTarget: false };
  // core = share of the money kept in the index all the time (bought on day one, never traded); the rest runs the swing engine.
  const variants: { name: string; rules: Rules; core: number }[] = market === 'US' ? [
    { name: 'Before: score ≥ 7, fixed targets', rules: base({}), core: 0 },
    { name: 'Score ≥ 8, fixed targets', rules: base({ minScore: 8 }), core: 0 },
    { name: 'Score ≥ 8 + trailing stop', rules: base({ minScore: 8, trail }), core: 0 },
    { name: 'Core 70% SPY + 30% swing (score ≥ 8, trailing, 1% risk)', rules: base({ minScore: 8, trail, riskPct: 1 }), core: 0.7 },
    { name: 'Core 50% SPY + 50% swing (score ≥ 8, trailing, 1% risk)', rules: base({ minScore: 8, trail, riskPct: 1 }), core: 0.5 },
  ] : [
    { name: 'Before: score ≥ 7, fixed targets', rules: base({}), core: 0 },
    { name: 'Fewer, bigger: 4 positions, 0.75% risk, trailing', rules: base({ maxPositions: 4, riskPct: 0.75, trail }), core: 0 },
    { name: 'Fewer, bigger + score ≥ 8', rules: base({ maxPositions: 4, riskPct: 0.75, trail, minScore: 8 }), core: 0 },
    { name: 'Core 70% Nifty + 30% swing (4 positions, 1% risk, trailing)', rules: base({ maxPositions: 4, riskPct: 1, trail }), core: 0.7 },
    { name: 'Core 50% Nifty + 50% swing (4 positions, 1% risk, trailing)', rules: base({ maxPositions: 4, riskPct: 1, trail }), core: 0.5 },
  ];
  const r1 = (x: number) => Math.round(x * 10) / 10;
  const out = variants.map((v) => {
    const swingCash = CASH[market] * (1 - v.core);
    const r = backtest({ series, benchmark, rules: v.rules, startCash: swingCash, costPct: COST[market], dateKey: market === 'IN' ? istDay : undefined });
    // Blend: the core grows with the benchmark (r.equity[].bench is the benchmark scaled to swingCash).
    const k = v.core > 0 ? v.core / (1 - v.core) : 0;
    const curve = r.equity.map((e) => ({ d: e.d, equity: Math.round((e.equity + k * e.bench) * 100) / 100, bench: Math.round((e.bench / (1 - v.core)) * 100) / 100 }));
    const end = curve.at(-1)?.equity ?? CASH[market];
    const span = curve.length ? (Date.parse(curve.at(-1)!.d) - Date.parse(curve[0].d)) / 864e5 : 0;
    const cagr = span > 0 ? (Math.pow(end / CASH[market], 365.25 / span) - 1) * 100 : 0;
    const row = { name: v.name, core: v.core, rules: v.rules, from: r.from, to: r.to, totalReturnPct: r1(((end - CASH[market]) / CASH[market]) * 100), cagrPct: r1(cagr), maxDrawdownPct: maxDrawdownPct(curve), benchReturnPct: r.benchReturnPct, benchCagrPct: r.benchCagrPct, benchMaxDrawdownPct: r.benchMaxDrawdownPct, exposurePct: r1(v.core * 100 + (1 - v.core) * r.exposurePct), costs: r.costs, stats: r.stats };
    console.log(`BACKTEST ${market} | ${JSON.stringify(row)}`);
    const thin = curve.filter((_, i) => i % 5 === 0 || i === curve.length - 1);
    return { ...row, equity: thin, trades: r.trades.slice(-60) };
  });
  const result = { market, generated: new Date().toISOString(), currency: market === 'US' ? 'USD' : 'INR', startCash: CASH[market], costPctPerSide: COST[market], benchmark: BENCH[market], symbols: Object.keys(series), note: 'Technical factors only; fills and exits on daily closes; costs as a flat % per side. Past results do not guarantee future results.', variants: out };
  writeFileSync(`backtest-${market}.json`, JSON.stringify(result));
}

main().catch((e) => { console.error(e); process.exit(1); });
