import { describe, expect, it } from 'vitest';
import { parseCboeCsv, readRegime, zoneOf } from '@/lib/regime';
import { scoreStock } from '@/lib/score';
import { analyze } from '@/lib/ta/analyze';

const pts = (vals: number[]) => vals.map((value, i) => ({ date: new Date(Date.UTC(2026, 0, 1) + i * 864e5).toISOString().slice(0, 10), value }));

describe('market risk meter', () => {
  it('maps levels to zones per market', () => {
    expect(zoneOf('US', 13)).toBe('calm');
    expect(zoneOf('US', 18)).toBe('normal');
    expect(zoneOf('US', 25)).toBe('elevated');
    expect(zoneOf('US', 35)).toBe('panic');
    expect(zoneOf('IN', 13)).toBe('normal');
    expect(zoneOf('IN', 23)).toBe('panic');
  });
  it('reads a calm market', () => {
    const r = readRegime({ market: 'US', gauge: pts(Array.from({ length: 60 }, (_, i) => 14 + Math.sin(i / 4))) })!;
    expect(r.zone).toBe('calm');
    expect(r.summary).toMatch(/VIX/);
    expect(r.history.length).toBe(60);
  });
  it('flags a spike that is fading', () => {
    const base = Array.from({ length: 40 }, () => 16);
    const r = readRegime({ market: 'US', gauge: pts([...base, 17, 19, 22, 26, 28, 24, 21, 19, 18, 17]) })!;
    expect(r.spikeFade).toBe(true);
  });
  it('needs enough history', () => {
    expect(readRegime({ market: 'US', gauge: pts([15, 16, 17]) })).toBeNull();
  });
  it('parses the CBOE csv', () => {
    const p = parseCboeCsv('DATE,OPEN,HIGH,LOW,CLOSE\n11/13/2026,17.1,18.0,16.9,17.5\n11/16/2026,17.5,19.2,17.0,18.9\n');
    expect(p).toEqual([{ date: '2026-11-13', value: 17.5 }, { date: '2026-11-16', value: 18.9 }]);
  });
  it('adds a market regime factor to the score', () => {
    const closes = Array.from({ length: 1500 }, (_, i) => 50 * Math.pow(1.0012, i));
    const bars = closes.map((c, i) => ({ t: Date.UTC(2020, 0, 1) + i * 864e5, o: c, h: c * 1.01, l: c * 0.99, c, v: 1e6 }));
    const t = analyze('X', bars);
    const calm = scoreStock(t, { regime: { zone: 'calm', level: 13, gauge: 'VIX', spikeFade: false } });
    const panic = scoreStock(t, { regime: { zone: 'panic', level: 40, gauge: 'VIX', spikeFade: false } });
    expect(calm.factors.some((f) => f.key === 'regime')).toBe(true);
    expect(panic.composite).toBeLessThan(calm.composite);
  });
});
