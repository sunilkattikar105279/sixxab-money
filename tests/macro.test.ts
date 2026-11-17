import { describe, expect, it } from 'vitest';
import { yoy, diff, correlation, netLiquidity, mortgagePayment, sahmGap, recessionWatch, type Obs } from '@/lib/macro';
import { search } from '@/lib/search';

const monthly = (vals: number[], start = '2015-01-01'): Obs[] => vals.map((value, i) => { const d = new Date(`${start}T00:00:00Z`); d.setUTCMonth(d.getUTCMonth() + i); return { date: d.toISOString().slice(0, 10), value }; });

describe('macro maths', () => {
  it('computes year-over-year change and monthly differences', () => {
    const s = monthly(Array.from({ length: 24 }, (_, i) => 100 + i));
    expect(yoy(s)[0]).toEqual({ date: s[12].date, value: 12 });
    expect(diff(monthly([100, 103, 101]))).toEqual([{ date: monthly([0, 0])[1].date, value: 3 }, { date: monthly([0, 0, 0])[2].date, value: -2 }]);
  });
  it('finds a lagged relationship', () => {
    const a = monthly(Array.from({ length: 60 }, (_, i) => Math.sin(i / 4)));
    const b = monthly(Array.from({ length: 60 }, (_, i) => Math.sin((i - 6) / 4)));
    expect(correlation(a, b, 6)!.r).toBeGreaterThan(0.99);
    expect(correlation(a.slice(0, 10), b.slice(0, 10))).toBeNull();
  });
  it('computes Fed net liquidity in billions', () => {
    const nl = netLiquidity(monthly([7_000_000]), monthly([500]), monthly([800_000]));
    expect(nl[0].value).toBe(5700);
  });
  it('computes a mortgage payment', () => {
    expect(mortgagePayment(400_000, 7)).toBe(2129);
  });
  it('flags recession signals', () => {
    const u = monthly([3.5, 3.5, 3.5, 3.5, 3.5, 3.5, 3.5, 3.5, 3.5, 3.6, 3.8, 4.0, 4.2, 4.3, 4.4]);
    expect(sahmGap(u)!).toBeGreaterThanOrEqual(0.5);
    expect(recessionWatch({ curve: -0.3, claimsYoy: 20, sahm: 0.6, hy: 4 }).flags).toHaveLength(3);
    expect(recessionWatch({ curve: 0.5, claimsYoy: 2, sahm: 0.1, hy: 3 }).read).toMatch(/No major/);
  });
  it('routes M2 and housing searches to the Economy page sections', () => {
    expect(search('M2 money supply')[0].href).toBe('/economy?c=US#money');
    expect(search('mortgage rates')[0].href).toBe('/economy?c=US#housing');
  });
});
