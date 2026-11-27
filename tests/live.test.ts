import { describe, expect, it } from 'vitest';
import { planEntries, reconcile, equityMarks } from '@/lib/live';
import { DEFAULT_LIMITS } from '@/lib/risk';
import type { Setup } from '@/lib/screener';

const S = (symbol: string, score: number, entry = 100, stop = 95, extra: Partial<Setup> = {}): Setup => ({ symbol, mode: 'invest', side: 'long', entry, stop, target: entry + (entry - stop) * 2, rr: 2, withTrend: true, timeframe: 'D', reasons: ['r'], score, ...extra });
const base = { minScore: 7, withTrendOnly: true, limits: DEFAULT_LIMITS, killSwitch: false, equity: 5000, cash: 5000, peakEquity: 5000, dayStartEquity: 5000, busySymbols: new Set<string>(), committed: 0, ordersToday: 0, openPositions: 0 };

describe('live planner', () => {
  it('takes the best long setups in score order, sized at 0.5% risk', () => {
    const p = planEntries({ ...base, setups: [S('LOW', 6), S('B', 8), S('A', 9), S('SHORT', 9, 100, 105, { side: 'short' })] });
    expect(p.orders.map((o) => o.symbol)).toEqual(['A', 'B']);
    expect(p.orders[0].qty).toBe(5); // 25 risk / 5 per share
  });
  it('skips held symbols and respects the daily order limit and capital cap', () => {
    const many = Array.from({ length: 9 }, (_, i) => S(`S${i}`, 9, 20, 19.5));
    const p = planEntries({ ...base, setups: many, busySymbols: new Set(['S0']) });
    expect(p.orders.find((o) => o.symbol === 'S0')).toBeUndefined();
    expect(p.orders.length).toBeLessThanOrEqual(DEFAULT_LIMITS.maxOrdersPerDay);
    expect(p.orders.reduce((s, o) => s + o.qty * o.entry, 0)).toBeLessThanOrEqual(DEFAULT_LIMITS.capitalCap);
  });
  it('blocks everything when the kill switch is on', () => {
    const p = planEntries({ ...base, killSwitch: true, setups: [S('A', 9)] });
    expect(p.orders).toHaveLength(0); expect(p.blocked[0].reasons.join()).toMatch(/kill/);
  });
});

describe('reconcile and marks', () => {
  it('flags shares we record but the broker does not hold, ignoring other holdings', () => {
    expect(reconcile([{ symbol: 'AAPL', qty: 5 }], [{ symbol: 'AAPL', qty: 5, avgPrice: 1, lastPrice: 1 }, { symbol: 'TSLA', qty: 3, avgPrice: 1, lastPrice: 1 }])).toEqual([]);
    expect(reconcile([{ symbol: 'INFY.NS', qty: 10 }], [{ symbol: 'INFY', qty: 4, avgPrice: 1, lastPrice: 1 }])).toHaveLength(1);
  });
  it('finds peak and today’s starting equity', () => {
    const runs = [{ run_on: '2026-11-24', equity: 5100 }, { run_on: '2026-11-25', equity: 5050 }, { run_on: '2026-11-26', equity: 5000 }];
    expect(equityMarks(runs, '2026-11-26', 4950)).toEqual({ peak: 5100, dayStart: 5000 });
    expect(equityMarks(runs, '2026-11-27', 4990)).toEqual({ peak: 5100, dayStart: 5000 });
  });
});
