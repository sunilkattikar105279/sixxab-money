import { describe, expect, it } from 'vitest';
import { resample, type Bar } from '@/lib/ta/bars';
import { cmf, ema, rvol, vwap } from '@/lib/ta/indicators';
import { trend, breaks, zones, pivots } from '@/lib/ta/structure';
import { wyckoff } from '@/lib/ta/wyckoff';
import { elliott, zigzag } from '@/lib/ta/elliott';
import { analyze } from '@/lib/ta/analyze';
import { scoreStock, headlineTone } from '@/lib/score';
import { screen } from '@/lib/screener';

const DAY = 86_400_000;
const t0 = Date.UTC(2020, 0, 1);
function series(closes: number[], vol = (i: number) => 1_000_000, step = DAY): Bar[] {
  return closes.map((c, i) => { const o = i ? closes[i - 1] : c; return { t: t0 + i * step, o, h: Math.max(o, c) * 1.005, l: Math.min(o, c) * 0.995, c, v: vol(i) }; });
}
const rising = (n: number, start = 100, g = 0.004, amp = 0.01) => Array.from({ length: n }, (_, i) => start * Math.pow(1 + g, i) * (1 + amp * Math.sin(i / 3)));
const falling = (n: number, start = 100, g = 0.004) => Array.from({ length: n }, (_, i) => start * Math.pow(1 - g, i) * (1 + 0.01 * Math.sin(i / 3)));

describe('bars and indicators', () => {
  it('resamples daily into weekly and monthly', () => {
    const d = series(rising(60));
    expect(resample(d, '1w').length).toBeGreaterThan(7);
    expect(resample(d, '1M').length).toBe(2);
    const m = resample(d, '1M')[0];
    expect(m.v).toBe(31 * 1_000_000);
  });
  it('computes EMA, CMF, RVOL and VWAP', () => {
    expect(ema([1, 1, 1, 1], 3).at(-1)).toBeCloseTo(1);
    const up = series(rising(40));
    expect(cmf(up)).toBeGreaterThan(-1);
    const spike = series(rising(25), (i) => (i === 24 ? 5_000_000 : 1_000_000));
    expect(rvol(spike)).toBeCloseTo(5, 1);
    expect(vwap(up)).toBeGreaterThan(0);
  });
});

describe('structure', () => {
  it('reads trends', () => {
    expect(trend(series(rising(80)))).toBe('UP');
    expect(trend(series(falling(80)))).toBe('DOWN');
  });
  it('finds pivots, breaks and zones', () => {
    const d = series(rising(120, 100, 0.004, 0.03));
    expect(pivots(d).length).toBeGreaterThan(3);
    const b = breaks(d);
    expect(b.down).not.toBeNull();
    const jumpy = series([...rising(30), ...rising(30, 140, 0.002)]);
    expect(zones(jumpy).every((z) => z.low <= z.high)).toBe(true);
  });
});

describe('cycle and waves', () => {
  it('labels a strong advance as markup', () => {
    expect(wyckoff(series(rising(200))).phase).toBe('markup');
  });
  it('labels a range after a decline as accumulation', () => {
    const closes = [...falling(120, 200, 0.006), ...Array.from({ length: 60 }, (_, i) => 97 + 2 * Math.sin(i / 2))];
    expect(wyckoff(series(closes, (i) => (i > 120 ? 1_400_000 : 1_000_000))).phase).toBe('accumulation');
  });
  const legsToBars = (legs: number[]) => {
    const closes: number[] = [];
    legs.slice(1).forEach((to, k) => { const from = legs[k]; for (let i = 0; i < 10; i++) closes.push(from + ((to - from) * (i + 1)) / 10); });
    return series([legs[0], ...closes]);
  };
  it('builds zigzag swings and counts wave 5 in progress', () => {
    const d = legsToBars([100, 120, 110, 150, 135, 170]);
    expect(zigzag(d, 5).length).toBeGreaterThanOrEqual(5);
    const w = elliott(d);
    expect(w.pattern).toBe('impulse-up');
    expect(w.wave).toBe('5');
    expect(w.invalidation).toBeLessThan(140);
    expect(w.targets?.length).toBeGreaterThan(0);
    expect(w.summary).toMatch(/wave 5/);
  });
  it('reads a pullback after five waves', () => {
    const w = elliott(legsToBars([100, 120, 110, 150, 135, 170, 155]));
    expect(['A', '4']).toContain(w.wave);
    expect(w.points?.at(-1)?.label).toBe('now');
  });
  it('mirrors the count for a downtrend', () => {
    const w = elliott(legsToBars([200, 180, 190, 150, 165, 130]));
    expect(w.pattern).toBe('impulse-down');
  });
  it('returns no count for flat data', () => {
    const w = elliott(series(Array.from({ length: 80 }, () => 100)));
    expect(w.pattern).toBe('none');
    expect(w.summary).toBeTruthy();
  });
});

describe('analysis, score and screener', () => {
  const daily = series(rising(1500, 50, 0.0012, 0.002));
  const hourly = series(rising(400, 150, 0.0005, 0.001), () => 100_000, 3_600_000);
  const t = analyze('TEST', daily, hourly);
  it('produces a full multi-timeframe report', () => {
    expect(t.trends.d).toBe('UP');
    expect(t.trends.M).not.toBeNull();
    expect(t.trends.h4).not.toBeNull();
    expect(t.zones).toHaveProperty('h1');
  });
  it('scores 1 to 10 and leaves missing factors out', () => {
    const s = scoreStock(t, {});
    expect(s.composite).toBeGreaterThanOrEqual(1);
    expect(s.composite).toBeLessThanOrEqual(10);
    expect(s.factors.map((f) => f.key)).not.toContain('fundamentals');
    const s2 = scoreStock(t, { fundamentals: { revenueGrowthPct: 20, netMarginPct: 25, opCashFlowPositive: true, debtToEquity: 0.5, period: 'FY2025 10-K' }, news: headlineTone(['Company beats estimates', 'Record growth']), industryRel: 3 });
    expect(s2.factors).toHaveLength(6);
    expect(s2.composite).toBeGreaterThan(s.composite - 1);
  });
  it('applies 1:2 with trend and 1:1 against it', () => {
    const s = scoreStock(t, {});
    for (const m of ['invest', 'day', 'quick'] as const) {
      const setup = screen(t, s, m);
      if (setup && setup.side !== 'avoid') expect(setup.rr).toBe(setup.withTrend ? 2 : 1);
    }
  });
  it('reads headline tone', () => {
    expect(headlineTone(['CEO resigns amid probe']).sentiment).toBeLessThan(0);
    expect(headlineTone([]).headlines).toBe(0);
  });
});
