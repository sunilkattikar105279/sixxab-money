import { describe, expect, it } from 'vitest';
import { buildCurve, slope, yoyQ, ratioPct, percentile, monthsAgo, creditRegime, hyBand, igBand, MATURITIES, type Maturity } from '@/lib/credit';
import type { Obs } from '@/lib/macro';

const monthly = (start: string, vals: number[]): Obs[] => vals.map((v, i) => { const d = new Date(`${start}T00:00:00Z`); d.setUTCMonth(d.getUTCMonth() + i); return { date: d.toISOString().slice(0, 10), value: v }; });

describe('Spread credit math', () => {
  it('builds the corporate vs Treasury curve with spreads and a year-ago point', () => {
    const corp = Object.fromEntries(MATURITIES.map((m) => [m, monthly('2025-01-01', Array.from({ length: 13 }, (_, i) => 4 + m / 30 + i * 0.01))])) as Record<Maturity, Obs[]>;
    const ust = Object.fromEntries(MATURITIES.map((m) => [m, monthly('2025-01-01', Array.from({ length: 13 }, () => 3.5 + m / 60))])) as Record<Maturity, Obs[]>;
    const c = buildCurve(corp, ust);
    expect(c).toHaveLength(6);
    const ten = c.find((p) => p.m === 10)!;
    expect(ten.spread).toBeCloseTo(4 + 10 / 30 + 0.12 - (3.5 + 10 / 60), 2);
    expect(ten.corpYearAgo).toBeCloseTo(4 + 10 / 30, 2);
    expect(slope(c, 'corp')).toBeGreaterThan(0);
  });
  it('computes quarterly growth, ratios, percentiles and lookbacks', () => {
    const q: Obs[] = [{ date: '2024-01-01', value: 100 }, { date: '2024-04-01', value: 105 }, { date: '2025-01-01', value: 110 }, { date: '2025-04-01', value: 105 }];
    expect(yoyQ(q)).toEqual([{ date: '2025-01-01', value: 10 }, { date: '2025-04-01', value: 0 }]);
    expect(ratioPct(q, q.map((o) => ({ ...o, value: o.value * 10 })))[0].value).toBe(10);
    const s = monthly('2024-01-01', Array.from({ length: 24 }, (_, i) => i));
    expect(percentile(s)).toBe(100);
    expect(monthsAgo(s, 3)?.value).toBe(20);
    expect(hyBand(3)).toBe('tight'); expect(hyBand(8)).toBe('stress'); expect(igBand(1.2)).toBe('normal');
  });
  it('flags credit stress, late-cycle squeeze and stock/bond divergence', () => {
    const base = { hy: 3.2, hy3m: -0.1, ig: 0.9, ig3m: 0, profitsYoy: 6, spx3m: 4, corpSlope: 0.6, sentiment: 60 };
    expect(creditRegime(base).name).toBe('Late-cycle calm');
    expect(creditRegime({ ...base, hy: 8.5 }).name).toBe('Credit stress');
    expect(creditRegime({ ...base, hy3m: 0.8, profitsYoy: -3 }).name).toBe('Late-cycle squeeze');
    const d = creditRegime({ ...base, hy3m: 0.7 });
    expect(d.divergence).toMatch(/Stocks are rising while credit spreads widen/);
    expect(d.scenarios.map((s) => s.odds)).toEqual(['base', 'downside', 'upside']);
    expect(creditRegime({ ...base, hy: 4.2, hy3m: -0.5 }).name).toBe('Healing');
  });
});
