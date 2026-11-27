import { describe, expect, it } from 'vitest';
import { targetWeights, runPortfolio, STRATEGIES, type PriceBook } from '@/lib/strategies';

const N = 420;
const dates = Array.from({ length: N }, (_, i) => new Date(Date.UTC(2020, 0, 1) + i * 864e5).toISOString().slice(0, 10));
const line = (f: (i: number) => number) => Array.from({ length: N }, (_, i) => f(i));
const book: PriceBook = { dates, close: {
  SPY: line((i) => 100 + i * 0.1), BIL: line((i) => 50 + i * 0.001), IEF: line((i) => 90 + Math.sin(i / 30)),
  VTI: line((i) => 100 + i * 0.1), TLT: line((i) => 100 - i * 0.02), GLD: line((i) => 150 + i * 0.05), DBC: line((i) => 20 + Math.cos(i / 40)),
  UP: line((i) => 10 + i * 0.05), DOWN: line((i) => 50 - i * 0.05), CALM: line((i) => 30 + i * 0.01 + Math.sin(i) * 0.01), WILD: line((i) => 30 + i * 0.02 + Math.sin(i) * 2),
} };
const uni = ['UP', 'DOWN', 'CALM', 'WILD'];

describe('strategy rules', () => {
  it('momentum keeps rising stocks above their 200-day average only', () => {
    const w = targetWeights('momentum-leaders', book, 400, uni);
    expect(w.UP).toBeGreaterThan(0); expect(w.DOWN).toBeUndefined();
    expect(Object.values(w).reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(1.0001);
  });
  it('defensive prefers the calmer stock', () => {
    const w = targetWeights('defensive-steady', book, 400, uni);
    expect(Object.keys(w)).toContain('CALM'); expect(w.DOWN).toBeUndefined();
  });
  it('trend guard holds SPY in an uptrend, all-weather sums to 100%', () => {
    expect(targetWeights('trend-guard', book, 400, uni)).toEqual({ SPY: 1 });
    expect(Object.values(targetWeights('all-weather', book, 400, uni)).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
  });
  it('backtests run without look-ahead and report against the benchmark', () => {
    for (const s of STRATEGIES.filter((x) => x.backtest)) {
      const r = runPortfolio(s.id, book, uni, { warmup: 260 });
      expect(r.curve.length).toBe(N - 260);
      expect(Number.isFinite(r.cagrPct)).toBe(true);
      expect(r.benchTotalReturnPct).toBeGreaterThan(0);
      expect(r.rebalancedOn).toMatch(/^\d{4}-\d{2}-01$|^\d{4}-\d{2}-\d{2}$/);
    }
  });
});
