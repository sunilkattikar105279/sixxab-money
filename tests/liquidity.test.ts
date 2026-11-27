import { describe, expect, it } from 'vitest';
import { scale, tideScore, moodOf, m2Regime, impacts, tideHeadline, isFresh } from '@/lib/liquidity';

describe('Tide score', () => {
  it('scales linearly and clamps to 0-100', () => {
    expect(scale(-4, -4, 10)).toBe(0);
    expect(scale(10, -4, 10)).toBe(100);
    expect(scale(3, -4, 10)).toBe(50);
    expect(scale(40, -4, 10)).toBe(100);
    expect(scale(-40, -4, 10)).toBe(0);
  });
  it('averages the available parts', () => {
    const t = tideScore({ m2Yoy: 3, m2YoyChg3: 0, realYoy: 0, netLiq3mPct: 0 });
    expect(t.parts).toHaveLength(4);
    expect(t.score).toBe(50);
    const partial = tideScore({ m2Yoy: 10, m2YoyChg3: null, realYoy: null, netLiq3mPct: null });
    expect(partial.score).toBe(100);
    expect(tideScore({ m2Yoy: null, m2YoyChg3: null, realYoy: null, netLiq3mPct: null }).score).toBeNull();
  });
  it('maps scores and growth to moods and regimes', () => {
    expect(moodOf(10)).toBe('draining');
    expect(moodOf(35)).toBe('tight');
    expect(moodOf(50)).toBe('neutral');
    expect(moodOf(70)).toBe('flowing');
    expect(moodOf(90)).toBe('flooding');
    expect(m2Regime(-1)).toBe('contracting');
    expect(m2Regime(2)).toBe('slow');
    expect(m2Regime(5)).toBe('normal');
    expect(m2Regime(12)).toBe('fast');
  });
});

describe('Tide impacts', () => {
  const base = { score: 70, m2Yoy: 8, cpiYoy: 3.4, fedFunds: 4.1, fedFunds12m: -0.5, inrYoy: 3, stocksLink: { lag: 6, r: 0.42 }, inflLink: { lag: 18, r: 0.61 } };
  it('covers every area with a tone and never gives buy or sell calls', () => {
    const out = impacts(base);
    expect(out.map((i) => i.area)).toEqual(['Stocks', 'Inflation', 'Loans and rates', 'Your cash', 'India and the rupee']);
    expect(out[0].tone).toBe('good');
    expect(out[1].tone).toBe('bad');
    expect(out[2].tone).toBe('good');
    expect(out[4].tone).toBe('bad');
    for (const i of out) expect(i.read).not.toMatch(/\b(buy|sell)\b/i);
  });
  it('skips areas without data', () => {
    expect(impacts({ ...base, fedFunds: null, inrYoy: null }).map((i) => i.area)).toEqual(['Stocks', 'Inflation', 'Your cash']);
  });
});

describe('Tide headline and release notice', () => {
  it('writes a plain headline', () => {
    expect(tideHeadline('flowing', 4.6, -1.2)).toBe('Money is flowing: M2 +4.6% on a year ago, Fed net liquidity down 1.2% in 3 months');
    expect(tideHeadline(null, null, null)).toMatch(/appears/);
  });
  it('flags a FRED update within 10 days', () => {
    const now = Date.parse('2026-11-26T12:00:00Z');
    expect(isFresh('2026-11-24 12:03:02-06', now)).toBe(true);
    expect(isFresh('2026-10-28 12:03:02-05', now)).toBe(false);
    expect(isFresh(null, now)).toBe(false);
  });
});
