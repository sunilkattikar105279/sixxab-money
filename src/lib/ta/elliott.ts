import { resample, type Bar } from './bars';

// Elliott wave read, rule-based. Wave counts are subjective: this module scores candidate counts against the three
// hard rules and the common Fibonacci guidelines, at several swing sizes on daily and weekly bars, and reports the
// best count plus an alternate. Every read carries an invalidation price so a reader knows when the count is wrong.

export type WavePattern = 'impulse-up' | 'impulse-down' | 'correction-up' | 'correction-down' | 'correction' | 'none';
export interface WavePoint { label: string; price: number; t: number }
export interface WaveTarget { label: string; price: number }
export interface WaveRead {
  pattern: WavePattern;
  wave: string | null;
  confidence: 'low' | 'medium' | 'high';
  notes: string[];
  /** Fields below were added in v2; older stored rows may not have them. */
  degree?: 'daily' | 'weekly';
  score?: number; // 0-100 fit to rules and guidelines
  summary?: string;
  points?: WavePoint[];
  targets?: WaveTarget[];
  invalidation?: number | null;
  alternate?: { summary: string; score: number } | null;
}

export interface Swing { i: number; t: number; price: number; kind: 'H' | 'L' }

/** Zigzag swings: alternating highs and lows where each move is at least `pct` %. The last swing is the running extreme. */
export function zigzag(bars: Bar[], pct = 5): Swing[] {
  const out: Swing[] = [];
  if (bars.length < 2) return out;
  const p = pct / 100;
  const at = (i: number, price: number, kind: 'H' | 'L'): Swing => ({ i, t: bars[i].t, price, kind });
  let dir = 0;
  let hi = at(0, bars[0].h, 'H'), lo = at(0, bars[0].l, 'L');
  for (let i = 1; i < bars.length; i++) {
    const b = bars[i];
    if (dir === 0) {
      if (b.h > hi.price) hi = at(i, b.h, 'H');
      if (b.l < lo.price) lo = at(i, b.l, 'L');
      if (lo.i < hi.i && hi.price >= lo.price * (1 + p)) { out.push(lo); dir = 1; }
      else if (hi.i < lo.i && lo.price <= hi.price * (1 - p)) { out.push(hi); dir = -1; }
    } else if (dir === 1) {
      if (b.h > hi.price) hi = at(i, b.h, 'H');
      else if (b.l <= hi.price * (1 - p)) { out.push(hi); dir = -1; lo = at(i, b.l, 'L'); }
    } else {
      if (b.l < lo.price) lo = at(i, b.l, 'L');
      else if (b.h >= lo.price * (1 + p)) { out.push(lo); dir = 1; hi = at(i, b.h, 'H'); }
    }
  }
  if (dir === 1) out.push(hi);
  else if (dir === -1) out.push(lo);
  return out;
}

interface Candidate { pattern: WavePattern; wave: string; score: number; notes: string[]; points: WavePoint[]; targets: WaveTarget[]; invalidation: number; degree: 'daily' | 'weekly'; up: boolean }

const near = (x: number, lo: number, hi: number) => x >= lo && x <= hi;
const r2 = (x: number) => Math.round(x * 100) / 100;

const IMPULSE = ['0', '1', '2', '3', '4', '5', 'A', 'B', 'C'];

/**
 * Scores one count: pivots q[0..m-1] starting at q[0] (wave 0), live = latest close moving toward the next pivot.
 * m = 3 means wave 3 in progress, 4 = wave 4, 5 = wave 5, 6 = wave A after a complete 5, 7 = B, 8 = C.
 */
function scoreCount(q: Swing[], live: number, lastT: number, degree: 'daily' | 'weekly'): Candidate | null {
  const m = q.length;
  if (m < 3 || m > 8) return null;
  const up = q[1].price > q[0].price;
  const s = up ? 1 : -1;
  const P = q.map((x) => x.price);
  const beyond = (a: number, b: number) => (a - b) * s > 0; // a is further in the trend direction than b
  const w = (a: number, b: number) => Math.abs(P[b] - P[a]);
  const w1 = w(0, 1);
  const notes: string[] = [];
  let score = [0, 0, 0, 30, 40, 50, 55, 50, 50][m];

  // Hard rules
  if (!beyond(P[2], P[0])) return null; // wave 2 never retraces all of wave 1
  const retr2 = w(1, 2) / w1;
  if (near(retr2, 0.5, 0.618)) { score += 15; notes.push(`wave 2 retraced ${(retr2 * 100).toFixed(0)}% of wave 1 (classic 50-61.8%)`); }
  else if (near(retr2, 0.382, 0.786)) { score += 8; notes.push(`wave 2 retraced ${(retr2 * 100).toFixed(0)}% of wave 1`); }

  if (m >= 4) {
    if (!beyond(P[3], P[1])) return null; // wave 3 ends beyond wave 1
    const ext3 = w(2, 3) / w1;
    if (near(ext3, 1.5, 1.8)) { score += 15; notes.push(`wave 3 is ${ext3.toFixed(2)}x wave 1 (near 1.618)`); }
    else if (ext3 >= 1.2) { score += 8; notes.push(`wave 3 is ${ext3.toFixed(2)}x wave 1`); }
  }
  if (m >= 5) {
    if (!beyond(P[4], P[1])) return null; // wave 4 does not overlap wave 1
    const retr4 = w(3, 4) / w(2, 3);
    if (near(retr4, 0.236, 0.5)) { score += 10; notes.push(`wave 4 retraced ${(retr4 * 100).toFixed(0)}% of wave 3`); }
    const alt = (retr2 > 0.5) !== (retr4 > 0.5); // sharp vs flat alternation, approximated by depth
    if (alt) { score += 4; notes.push('waves 2 and 4 alternate in depth'); }
  }
  if (m >= 6) {
    if (!beyond(P[5], P[3])) return null;
    const w3 = w(2, 3), w5 = w(4, 5);
    if (w3 < w1 && w3 < w5) return null; // wave 3 is never the shortest
  }
  if (m >= 7) { // A ended at P[6], must not overshoot below wave 0 for a plain correction read
    if (!beyond(P[6], P[0])) return null;
    const a = w(5, 6) / w(0, 5);
    if (near(a, 0.236, 0.618)) { score += 8; notes.push(`wave A retraced ${(a * 100).toFixed(0)}% of the impulse`); }
  }
  if (m >= 8) {
    if (beyond(P[7], P[5])) return null; // B beyond the impulse end = expanded flat or wrong count; keep it simple
    const b = w(6, 7) / w(5, 6);
    if (near(b, 0.382, 0.886)) { score += 6; notes.push(`wave B retraced ${(b * 100).toFixed(0)}% of A`); }
  }
  // wave 0 should be the extreme of the whole count (a real start, not a mid-swing)
  if (P.every((x) => !beyond(P[0], x) || x === P[0])) { score += 5; }

  // Live price must respect the count so far
  const last = P[m - 1];
  let wave = '', invalidation = 0;
  const targets: WaveTarget[] = [];
  const t = (label: string, price: number) => targets.push({ label, price: r2(price) });
  switch (m) {
    case 3:
      if (!beyond(live, P[0])) return null;
      wave = '3'; invalidation = P[0];
      t('wave 3 at 1.618x wave 1', P[2] + s * 1.618 * w1); t('wave 3 at 2.618x wave 1', P[2] + s * 2.618 * w1);
      break;
    case 4:
      if (!beyond(live, P[1])) return null; // wave 4 would overlap wave 1
      wave = '4'; invalidation = P[1];
      t('wave 4 zone (38.2%)', P[3] - s * 0.382 * w(2, 3)); t('wave 4 zone (50%)', P[3] - s * 0.5 * w(2, 3));
      break;
    case 5:
      if (!beyond(live, P[1])) return null;
      wave = '5'; invalidation = P[4];
      t('wave 5 = wave 1', P[4] + s * w1); t('wave 5 = 0.618 x waves 1-3', P[4] + s * 0.618 * Math.abs(P[3] - P[0]));
      break;
    case 6:
      if (beyond(live, P[5])) return null; // still extending: wave 5 not over
      wave = 'A'; invalidation = P[5];
      t('38.2% pullback of the 5-wave move', P[5] - s * 0.382 * w(0, 5)); t('50% pullback of the 5-wave move', P[5] - s * 0.5 * w(0, 5));
      break;
    case 7:
      if (beyond(live, P[5])) return null;
      wave = 'B'; invalidation = P[5];
      t('B at 50% of A', P[6] + s * 0.5 * w(5, 6)); t('B at 61.8% of A', P[6] + s * 0.618 * w(5, 6));
      break;
    case 8:
      if (beyond(live, P[5])) return null;
      wave = 'C'; invalidation = P[5];
      t('C = A', P[7] - s * w(5, 6)); t('C = 1.618 x A', P[7] - s * 1.618 * w(5, 6));
      break;
  }
  const isCorrection = m >= 6;
  const pattern: WavePattern = isCorrection ? (up ? 'correction-down' : 'correction-up') : up ? 'impulse-up' : 'impulse-down';
  const points: WavePoint[] = q.map((x, k) => ({ label: IMPULSE[k], price: r2(x.price), t: x.t }));
  points.push({ label: 'now', price: r2(live), t: lastT });
  return { pattern, wave, score: Math.min(100, score), notes, points, targets, invalidation: r2(invalidation), degree, up };
}

function candidates(bars: Bar[], pcts: number[], degree: 'daily' | 'weekly'): Candidate[] {
  if (bars.length < 30) return [];
  const live = bars.at(-1)!.c, lastT = bars.at(-1)!.t;
  const out: Candidate[] = [];
  for (const pct of pcts) {
    let z = zigzag(bars, pct);
    // The running extreme on the latest bar is the live point, not a finished pivot
    if (z.length && z.at(-1)!.i === bars.length - 1) z = z.slice(0, -1);
    for (let m = 3; m <= 8; m++) {
      if (z.length < m) break;
      const q = z.slice(-m);
      const c = scoreCount(q, live, lastT, degree);
      if (c) { c.notes.push(`${pct}% swings on ${degree} bars`); out.push(c); }
    }
  }
  return out;
}

const n = (x: number) => (x >= 1000 ? x.toFixed(0) : x >= 100 ? x.toFixed(1) : x.toFixed(2));

function describe(c: Candidate): string {
  const deg = c.degree === 'weekly' ? 'Weekly' : 'Daily';
  const trendWord = c.up ? 'uptrend' : 'downtrend';
  const where = c.wave === 'A' || c.wave === 'B' || c.wave === 'C'
    ? `likely in wave ${c.wave} of a pullback after a 5-wave ${trendWord}`
    : `likely in wave ${c.wave} of an ${trendWord}`;
  const side = c.up ? 'above' : 'below';
  const keep = c.wave === 'A' || c.wave === 'B' || c.wave === 'C'
    ? `A move back ${c.up ? 'above' : 'below'} ${n(c.invalidation)} would end this count`
    : `Holding ${side} ${n(c.invalidation)} keeps the count`;
  const tg = c.targets.map((x) => n(x.price));
  return `${deg}: ${where}. ${keep}; next reference ${tg.join(' to ')}.`;
}

/** Best Elliott count across swing sizes on daily and weekly bars, with an alternate. */
export function elliott(daily: Bar[]): WaveRead {
  const weekly = resample(daily, '1w');
  const all = [...candidates(daily, [5, 8], 'daily'), ...candidates(weekly, [10, 15], 'weekly')];
  // Weekly counts describe the bigger picture; nudge them up so they win ties
  all.forEach((c) => { if (c.degree === 'weekly') c.score = Math.min(100, c.score + 3); });
  all.sort((a, b) => b.score - a.score);
  const best = all[0];
  if (!best) {
    return { pattern: 'none', wave: null, confidence: 'low', notes: ['no swing sequence fits the impulse rules at any swing size'], summary: 'No clean wave count: price is choppy or sideways at every swing size tested.', points: [], targets: [], invalidation: null, alternate: null };
  }
  const alt = all.find((c) => c !== best && (c.wave !== best.wave || c.up !== best.up));
  return {
    pattern: best.pattern,
    wave: best.wave,
    confidence: best.score >= 75 ? 'high' : best.score >= 55 ? 'medium' : 'low',
    notes: best.notes,
    degree: best.degree,
    score: best.score,
    summary: describe(best),
    points: best.points,
    targets: best.targets,
    invalidation: best.invalidation,
    alternate: alt ? { summary: describe(alt), score: alt.score } : null,
  };
}
