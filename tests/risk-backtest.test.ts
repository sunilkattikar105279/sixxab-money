import { describe, expect, it } from 'vitest';
import { gate, sizeOrder, goLiveCheck, DEFAULT_LIMITS } from '@/lib/risk';
import { backtest } from '@/lib/backtest';
import type { Bar } from '@/lib/ta/bars';

const base = { limits: DEFAULT_LIMITS, killSwitch: false, equity: 5000, peakEquity: 5000, dayStartEquity: 5000, ordersToday: 0, openPositions: 0, committed: 0, orderValue: 1000 };

describe('live guardrails', () => {
  it('allows a normal order', () => expect(gate(base).allow).toBe(true));
  it('blocks on kill switch, drawdown, daily loss, order count, positions and capital cap', () => {
    expect(gate({ ...base, killSwitch: true }).allow).toBe(false);
    expect(gate({ ...base, equity: 4590 }).reasons.join()).toMatch(/drawdown/);
    expect(gate({ ...base, equity: 4890, peakEquity: 4990, dayStartEquity: 4990 }).reasons.join()).toMatch(/daily/);
    expect(gate({ ...base, ordersToday: 5 }).allow).toBe(false);
    expect(gate({ ...base, openPositions: 6 }).allow).toBe(false);
    expect(gate({ ...base, committed: 4500 }).reasons.join()).toMatch(/cap/);
  });
  it('sizes by risk, cap and cash', () => {
    expect(sizeOrder({ equity: 5000, entry: 100, stop: 95, riskPct: 0.5, capitalLeft: 5000, cash: 5000 })).toBe(5);
    expect(sizeOrder({ equity: 5000, entry: 100, stop: 99.9, riskPct: 0.5, capitalLeft: 1000, cash: 5000 })).toBe(10);
    expect(sizeOrder({ equity: 5000, entry: 100, stop: 100, riskPct: 0.5, capitalLeft: 5000, cash: 5000 })).toBe(0);
  });
  it('go-live check needs clean plumbing', () => {
    expect(goLiveCheck({ days: 10, trades: 4, brokerErrors: 0, reconcileMismatches: 0, maxDrawdownPct: 2 }).ready).toBe(true);
    const bad = goLiveCheck({ days: 6, trades: 1, brokerErrors: 1, reconcileMismatches: 2, maxDrawdownPct: 9 });
    expect(bad.ready).toBe(false); expect(bad.failed).toHaveLength(5);
  });
});

describe('backtest', () => {
  const D = 86_400_000, T0 = Date.UTC(2020, 0, 1);
  const mk = (n: number, f: (i: number) => number): Bar[] => Array.from({ length: n }, (_, i) => { const c = f(i); return { t: T0 + i * D, o: c, h: c * 1.01, l: c * 0.99, c, v: 1e6 }; });
  it('runs end to end without look-ahead and tracks the benchmark', () => {
    const bench = mk(400, (i) => 100 + i * 0.1);
    const series = { AAA: mk(400, (i) => 50 + i * 0.05 + Math.sin(i / 6) * 2), BBB: mk(400, (i) => 80 - i * 0.02 + Math.cos(i / 9)) };
    const r = backtest({ series, benchmark: bench, startCash: 5000, costPct: 0.05, warmup: 260, rules: { mode: 'invest', minScore: 1, riskPct: 0.5, maxPositionPct: 25, maxPositions: 4, dailyLossPct: 2, allowShort: false, withTrendOnly: false } });
    expect(r.days).toBe(140);
    expect(r.equity[0].bench).toBeCloseTo(5000, 0);
    expect(r.benchReturnPct).toBeGreaterThan(0);
    expect(Number.isFinite(r.cagrPct)).toBe(true);
    expect(r.equity.every((e) => e.equity > 0)).toBe(true);
  });
});
