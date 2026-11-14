import type { Bar } from './bars';
import { cmf, ema, slopePct } from './indicators';

export type Phase = 'accumulation' | 'markup' | 'distribution' | 'markdown' | 'unclear';
export interface PhaseRead { phase: Phase; confidence: 'low' | 'medium' | 'high'; notes: string[] }

/**
 * Wyckoff-style market cycle read on one timeframe (use weekly or daily):
 * - trend of the prior leg (50-bar EMA slope), whether price is ranging now (last 30 bars within ~1.8x ATR-ish band),
 * - money flow (CMF) inside the range, and springs (dip below range low that closes back inside) or upthrusts.
 * This is a heuristic read for education, not a certainty.
 */
export function wyckoff(bars: Bar[]): PhaseRead {
  if (bars.length < 80) return { phase: 'unclear', confidence: 'low', notes: ['not enough history'] };
  const closes = bars.map((b) => b.c);
  const e50 = ema(closes, 50);
  const prior = slopePct(e50.slice(0, -30), 30);
  const recent = bars.slice(-30);
  const hi = Math.max(...recent.map((b) => b.h)), lo = Math.min(...recent.map((b) => b.l));
  const width = (hi - lo) / ((hi + lo) / 2);
  const ranging = width < 0.15 && Math.abs(slopePct(e50, 15)) < 0.15;
  const flow = cmf(bars, 20);
  const notes: string[] = [`money flow ${flow >= 0 ? '+' : ''}${flow.toFixed(2)}`];
  const rangeLow = Math.min(...recent.slice(0, -5).map((b) => b.l)), rangeHigh = Math.max(...recent.slice(0, -5).map((b) => b.h));
  const spring = recent.slice(-5).some((b) => b.l < rangeLow && b.c > rangeLow);
  const upthrust = recent.slice(-5).some((b) => b.h > rangeHigh && b.c < rangeHigh);
  if (spring) notes.push('spring: dipped below the range and closed back inside');
  if (upthrust) notes.push('upthrust: pushed above the range and closed back inside');

  if (ranging && prior < 0) {
    const conf = flow > 0.05 && spring ? 'high' : flow > 0 ? 'medium' : 'low';
    return { phase: 'accumulation', confidence: conf, notes: ['range after a decline', ...notes] };
  }
  if (ranging && prior > 0) {
    const conf = flow < -0.05 && upthrust ? 'high' : flow < 0 ? 'medium' : 'low';
    return { phase: 'distribution', confidence: conf, notes: ['range after an advance', ...notes] };
  }
  const now = slopePct(e50, 15);
  if (now > 0.1) return { phase: 'markup', confidence: flow > 0 ? 'high' : 'medium', notes: ['rising trend', ...notes] };
  if (now < -0.1) return { phase: 'markdown', confidence: flow < 0 ? 'high' : 'medium', notes: ['falling trend', ...notes] };
  return { phase: 'unclear', confidence: 'low', notes };
}
