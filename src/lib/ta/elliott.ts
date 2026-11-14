import type { Bar } from './bars';

export interface WaveRead { pattern: 'impulse-up' | 'impulse-down' | 'correction' | 'none'; wave: string | null; confidence: 'low' | 'medium'; notes: string[] }

/** Zigzag swings: alternate highs/lows where each move is at least `pct` %. */
export function zigzag(bars: Bar[], pct = 5): { i: number; price: number; kind: 'H' | 'L' }[] {
  const out: { i: number; price: number; kind: 'H' | 'L' }[] = [];
  if (!bars.length) return out;
  let dir: 'up' | 'down' | null = null; let ext = { i: 0, price: bars[0].c };
  for (let i = 1; i < bars.length; i++) {
    const b = bars[i];
    if (dir !== 'down' && b.h > ext.price && (dir === 'up' || dir === null)) { if (dir === null) dir = 'up'; ext = { i, price: b.h }; }
    if (dir !== 'up' && b.l < ext.price && (dir === 'down' || dir === null)) { if (dir === null) dir = 'down'; ext = { i, price: b.l }; }
    if (dir === 'up' && b.l <= ext.price * (1 - pct / 100)) { out.push({ ...ext, kind: 'H' }); dir = 'down'; ext = { i, price: b.l }; }
    else if (dir === 'down' && b.h >= ext.price * (1 + pct / 100)) { out.push({ ...ext, kind: 'L' }); dir = 'up'; ext = { i, price: b.h }; }
  }
  out.push({ ...ext, kind: dir === 'down' ? 'L' : 'H' });
  return out;
}

/**
 * Checks whether the last swings fit a 5-wave impulse under the three hard Elliott rules:
 * wave 2 never retraces all of wave 1; wave 3 is not the shortest of 1, 3, 5; wave 4 does not overlap wave 1.
 * Wave counts are subjective; we report "possible" counts at low/medium confidence only.
 */
export function elliott(bars: Bar[], pct = 5): WaveRead {
  const z = zigzag(bars, pct);
  if (z.length < 6) return { pattern: 'none', wave: null, confidence: 'low', notes: ['not enough swings'] };
  const p = z.slice(-6).map((s) => s.price); // p0..p5 = start, end of waves 1..5
  const up = p[1] > p[0];
  const len = (a: number, b: number) => Math.abs(p[b] - p[a]);
  const w1 = len(0, 1), w3 = len(2, 3), w5 = len(4, 5);
  const rule2 = up ? p[2] > p[0] : p[2] < p[0];
  const rule3 = w3 >= Math.min(w1, w5);
  const rule4 = up ? p[4] > p[1] : p[4] < p[1];
  const trending = up ? p[5] > p[3] && p[3] > p[1] : p[5] < p[3] && p[3] < p[1];
  if (rule2 && rule3 && rule4 && trending) {
    return { pattern: up ? 'impulse-up' : 'impulse-down', wave: '5 (possible end)', confidence: w3 > w1 && w3 > w5 ? 'medium' : 'low', notes: ['5 swings fit the impulse rules', 'after a wave 5, a correction (A-B-C) often follows'] };
  }
  // Partial: last 4 swings as waves 1-3 in progress
  const q = z.slice(-4).map((s) => s.price);
  const up3 = q[1] > q[0];
  if ((up3 ? q[2] > q[0] && q[3] > q[1] : q[2] < q[0] && q[3] < q[1]) && Math.abs(q[3] - q[2]) > Math.abs(q[1] - q[0])) {
    return { pattern: up3 ? 'impulse-up' : 'impulse-down', wave: '3 (possible)', confidence: 'low', notes: ['wave 3 longer than wave 1 so far'] };
  }
  return { pattern: 'correction', wave: null, confidence: 'low', notes: ['swings do not fit an impulse'] };
}
