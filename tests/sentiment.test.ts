import { describe, it, expect } from 'vitest';
import { readSentiment, scale, moodOf, corrReturns, type Series } from '../src/lib/sentiment';
import { placeLabels } from '../src/components/RotationChart';
import type { Bar } from '../src/lib/ta/bars';

const day = 86_400_000, t0 = Date.UTC(2024, 0, 1);
const series = (n: number, f: (i: number) => number): Bar[] => Array.from({ length: n }, (_, i) => { const c = f(i); return { t: t0 + i * day, o: c, h: c * 1.01, l: c * 0.99, c, v: 1e6 }; });

describe('SIXXAB Sentiment', () => {
  it('maps values through the scale and names the mood', () => {
    expect(scale(20, [[11, 95], [20, 50], [45, 0]])).toBe(50);
    expect(scale(5, [[11, 95], [20, 50]])).toBe(95);
    expect(moodOf(10)).toBe('extreme fear'); expect(moodOf(50)).toBe('neutral'); expect(moodOf(80)).toBe('extreme greed');
  });
  it('reads greed in a calm uptrend and fear in a volatile downtrend', () => {
    const up: Series = { spx: series(400, (i) => 4000 + i * 5), vix: series(400, () => 12), nifty: series(400, (i) => 20000 + i * 20) };
    const down: Series = { spx: series(400, (i) => 6000 - i * 5), vix: series(400, (i) => 15 + i * 0.05), nifty: series(400, (i) => 26000 - i * 15) };
    const a = readSentiment(up, { US: 80 })!, b = readSentiment(down, { US: 20 })!;
    expect(a.score).toBeGreaterThan(70); expect(b.score).toBeLessThan(30);
    expect(a.regions.map((r) => r.region)).toEqual(['US', 'IN']);
    expect(a.history.length).toBeGreaterThan(100);
  });
  it('measures correlation of daily returns', () => {
    const a = series(100, (i) => 100 + Math.sin(i) * 5 + i), b = series(100, (i) => 200 + Math.sin(i) * 10 + 2 * i);
    expect(corrReturns(a, b)).toBeGreaterThan(0.9);
  });
});

describe('rotation chart labels', () => {
  it('places crowded labels without overlaps', () => {
    const pts = [['Real Estate', 461, 82], ['Discretionary', 477, 87], ['Industrials', 327, 154], ['Communication', 360, 156], ['Materials', 387, 163], ['Financials', 455, 118]]
      .map(([t, x, y]) => ({ key: String(t), x: Number(x), y: Number(y), r: 6, text: String(t) }));
    const L = placeLabels(pts, 760, 460);
    const box = (l: typeof L[number]) => { const w = l.text.length * 7.4, x0 = l.anchor === 'start' ? l.tx : l.anchor === 'end' ? l.tx - w : l.tx - w / 2; return [x0, l.ty - 12, x0 + w, l.ty + 4]; };
    for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
      const [a0, a1, a2, a3] = box(L[i]), [b0, b1, b2, b3] = box(L[j]);
      expect(a0 < b2 && a2 > b0 && a1 < b3 && a3 > b1).toBe(false);
    }
  });
});
