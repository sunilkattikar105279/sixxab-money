// Backtest the swing engine: npx tsx scripts/backtest.ts US|IN [years]
// Uses the live screener universe, the owner limits (0.5% risk per trade, 2% daily stop, 6 positions) and
// writes backtest-<market>.json (summary + equity curve + trades) for the owner dashboard.
import { writeFileSync } from 'node:fs';
import { getBars } from '../src/lib/providers';
import { UNIVERSE } from '../src/lib/data/universe';
import { backtest } from '../src/lib/backtest';
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
  const variants: { name: string; rules: Rules }[] = [
    { name: 'Owner limits: score ≥ 7, with trend', rules: { mode: 'invest', minScore: 7, riskPct: DEFAULT_LIMITS.riskPct, maxPositionPct: 25, maxPositions: DEFAULT_LIMITS.maxPositions, dailyLossPct: DEFAULT_LIMITS.dailyLossPct, allowShort: false, withTrendOnly: true } },
    { name: 'Stricter: score ≥ 8', rules: { mode: 'invest', minScore: 8, riskPct: DEFAULT_LIMITS.riskPct, maxPositionPct: 25, maxPositions: DEFAULT_LIMITS.maxPositions, dailyLossPct: DEFAULT_LIMITS.dailyLossPct, allowShort: false, withTrendOnly: true } },
    { name: 'Bigger risk: 1% per trade', rules: { mode: 'invest', minScore: 7, riskPct: 1, maxPositionPct: 25, maxPositions: DEFAULT_LIMITS.maxPositions, dailyLossPct: DEFAULT_LIMITS.dailyLossPct, allowShort: false, withTrendOnly: true } },
  ];
  const out = variants.map((v) => {
    const r = backtest({ series, benchmark, rules: v.rules, startCash: CASH[market], costPct: COST[market], dateKey: market === 'IN' ? istDay : undefined });
    const thin = r.equity.filter((_, i) => i % 5 === 0 || i === r.equity.length - 1);
    const row = { name: v.name, rules: v.rules, from: r.from, to: r.to, totalReturnPct: r.totalReturnPct, cagrPct: r.cagrPct, maxDrawdownPct: r.maxDrawdownPct, benchReturnPct: r.benchReturnPct, benchCagrPct: r.benchCagrPct, benchMaxDrawdownPct: r.benchMaxDrawdownPct, exposurePct: r.exposurePct, costs: r.costs, stats: r.stats };
    console.log(`BACKTEST ${market} | ${JSON.stringify(row)}`);
    return { ...row, equity: thin, trades: r.trades.slice(-60) };
  });
  const result = { market, generated: new Date().toISOString(), currency: market === 'US' ? 'USD' : 'INR', startCash: CASH[market], costPctPerSide: COST[market], benchmark: BENCH[market], symbols: Object.keys(series), note: 'Technical factors only; fills and exits on daily closes; costs as a flat % per side. Past results do not guarantee future results.', variants: out };
  writeFileSync(`backtest-${market}.json`, JSON.stringify(result));
}

main().catch((e) => { console.error(e); process.exit(1); });
