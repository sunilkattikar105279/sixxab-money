import { describe, expect, it } from 'vitest';
import { MODEL_SETS, align, buyMix, drift, lrsHeadroom, monthlyNeeded, needsRebalance, rebalancedCurve, stats, stockShare, valueOf } from '@/lib/models';

const D = 86_400_000, T0 = Date.UTC(2021, 0, 4);
const days = (n: number) => Array.from({ length: n }, (_, i) => T0 + i * D);

describe('model sets', () => {
  it('every model adds up to 100 and only uses its market assets', () => {
    for (const set of Object.values(MODEL_SETS)) {
      const keys = new Set(set.assets.map((a) => a.key));
      for (const m of set.models) {
        expect(Object.values(m.weights).reduce((s, x) => s + x, 0)).toBe(100);
        Object.keys(m.weights).forEach((k) => expect(keys.has(k)).toBe(true));
      }
    }
  });
  it('stock share rises from preserve to aggressive', () => {
    for (const set of Object.values(MODEL_SETS)) {
      const s = set.models.map((m) => stockShare(set, m));
      expect([...s].sort((a, b) => a - b)).toEqual(s);
    }
  });
});

describe('history math', () => {
  it('aligns on shared days only', () => {
    const a = align({ x: { t: days(5), c: [1, 2, 3, 4, 5] }, y: { t: days(5).slice(1), c: [2, 3, 4, 5] } });
    expect(a.t).toHaveLength(4);
    expect(a.c.x).toEqual([2, 3, 4, 5]);
  });
  it('a flat asset keeps the curve at 100; a doubling asset at 50% weight gives 150 with no rebalance in the month', () => {
    const t = days(20);
    const aligned = { t, c: { flat: t.map(() => 10), up: t.map((_, i) => 10 * (1 + i / 19)) } };
    expect(rebalancedCurve({ flat: 100 }, aligned).at(-1)!.v).toBeCloseTo(100);
    expect(rebalancedCurve({ flat: 50, up: 50 }, aligned).at(-1)!.v).toBeCloseTo(150);
  });
  it('finds the max drawdown and recovery', () => {
    const v = [100, 110, 120, 90, 60, 80, 121, 125];
    const curve = Array.from({ length: 40 }, (_, i) => ({ t: T0 + i * D, v: v[Math.min(i, v.length - 1)] }));
    const s = stats(curve)!;
    expect(s.maxDrawdown).toBeCloseTo(-0.5);
    expect(s.recoveredOn).not.toBeNull();
  });
});

describe('paper portfolio', () => {
  const prices = { a: 10, b: 20 };
  it('buys the mix and values it', () => {
    const h = buyMix({ a: 60, b: 40 }, 1000, prices);
    expect(valueOf(h, prices)).toBeCloseTo(1000);
    expect(drift({ target: { a: 60, b: 40 }, holdings: h }, prices).every((x) => Math.abs(x.gap) < 1e-9)).toBe(true);
  });
  it('flags drift of 5 points or more', () => {
    const h = buyMix({ a: 50, b: 50 }, 1000, prices);
    const d = drift({ target: { a: 50, b: 50 }, holdings: h }, { a: 15, b: 20 });
    expect(needsRebalance(d)).toBe(true);
  });
});

describe('goals and LRS', () => {
  it('zero return needs the plain gap divided by months', () => {
    const r = monthlyNeeded({ target: 12_000, years: 1, saved: 0, annualReturn: 0, inflation: 0 });
    expect(r.monthly).toBeCloseTo(1000);
  });
  it('higher returns need less each month', () => {
    const lo = monthlyNeeded({ target: 100_000, years: 10, saved: 0, annualReturn: 0.04, inflation: 0.03 }).monthly;
    const hi = monthlyNeeded({ target: 100_000, years: 10, saved: 0, annualReturn: 0.08, inflation: 0.03 }).monthly;
    expect(hi).toBeLessThan(lo);
  });
  it('LRS headroom never goes negative', () => {
    expect(lrsHeadroom(100_000)).toBe(150_000);
    expect(lrsHeadroom(300_000)).toBe(0);
  });
});
