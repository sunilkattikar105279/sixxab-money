import { describe, expect, it } from 'vitest';
import { daysUntil, eventsLine, summarizeInsider, type Events } from '@/lib/events';
import { computeBreadth } from '@/lib/breadth';
import { analyze } from '@/lib/ta/analyze';

describe('earnings and insider events', () => {
  it('counts only open-market insider buys and sells', () => {
    const s = summarizeInsider([
      { name: 'CEO', change: 1000, price: 50, code: 'P', date: '2026-11-01' },
      { name: 'CFO', change: 500, price: 52, code: 'P', date: '2026-11-03' },
      { name: 'Director', change: -2000, price: 55, code: 'S', date: '2026-11-05' },
      { name: 'VP', change: 10000, price: null, code: 'A', date: '2026-11-06' },
    ])!;
    expect(s).toMatchObject({ buys: 2, sells: 1, buyers: 2, buyValue: 76000, sellValue: 110000 });
    expect(s.latest[0].name).toBe('Director');
  });
  it('counts days to earnings', () => {
    expect(daysUntil('2026-11-20', new Date('2026-11-17T15:00:00Z'))).toBe(4);
    expect(daysUntil(null)).toBeNull();
  });
  it('writes a plain one-line summary', () => {
    const e: Events = { nextEarnings: '2026-11-19', earningsHour: 'amc', surprises: [{ period: '2026-09-30', actual: 1.2, estimate: 1.1, surprisePct: 9.1 }], insider: { buys: 2, sells: 0, buyValue: 1_200_000, sellValue: 0, buyers: 2, latest: [] }, asOf: '2026-11-17' };
    const line = eventsLine(e, new Date('2026-11-17T15:00:00Z'));
    expect(line).toMatch(/Earnings 2026-11-19 after close, 3 days away/);
    expect(line).toMatch(/beat estimates by 9.1%/);
    expect(line).toMatch(/insiders bought \$1.2M \(2 buyers\)/);
  });
});

describe('market breadth', () => {
  it('reads broad strength from rising stocks', () => {
    const mk = (g: number) => analyze('X', Array.from({ length: 400 }, (_, i) => { const c = 100 * Math.pow(1 + g, i); return { t: Date.UTC(2025, 0, 1) + i * 864e5, o: c * 0.999, h: c * 1.005, l: c * 0.995, c, v: 1e6 }; }));
    const b = computeBreadth([mk(0.002), mk(0.002), mk(0.001), mk(0.001), mk(-0.001)])!;
    expect(b.n).toBe(5);
    expect(b.pctAbove200).toBe(80);
    expect(b.read).toMatch(/Broad strength/);
  });
  it('needs at least five stocks', () => {
    expect(computeBreadth([])).toBeNull();
  });
});
