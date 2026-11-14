// Three screener modes. Output is a SETUP (conditions, levels, reward-to-risk), shown as an educational scenario.
// Reward:risk rule: 1:2 when trading with the higher-timeframe trend, 1:1 against it.
import type { TechReport } from './ta/analyze';
import type { Score } from './score';
import type { Zone } from './ta/structure';

export type Mode = 'invest' | 'day' | 'quick';
export interface Setup { symbol: string; mode: Mode; side: 'long' | 'short' | 'avoid'; entry: number; stop: number; target: number; rr: number; withTrend: boolean; timeframe: string; reasons: string[]; score: number }

const nearest = (zs: Zone[], kind: Zone['kind']) => zs.filter((z) => z.kind === kind)[0];
const round = (x: number) => Math.round(x * 100) / 100;

function levels(side: 'long' | 'short', entry: number, stop: number, withTrend: boolean) {
  const risk = Math.abs(entry - stop); const rr = withTrend ? 2 : 1;
  return { entry: round(entry), stop: round(stop), target: round(side === 'long' ? entry + risk * rr : entry - risk * rr), rr };
}

export function screen(t: TechReport, s: Score, mode: Mode): Setup | null {
  const reasons: string[] = [];
  if (mode === 'invest') {
    const { M, w, d } = t.trends; const ph = t.cycle.weekly.phase;
    if ((ph === 'distribution' || ph === 'markdown') && w === 'DOWN') {
      return { symbol: t.symbol, mode, side: 'avoid', ...levels('short', t.price, t.price + t.atrD, true), withTrend: true, timeframe: 'W/M', reasons: [`weekly cycle ${ph}`, 'weekly trend down: avoid or reduce'], score: s.composite };
    }
    if ((M === 'UP' || w === 'UP') && d !== 'DOWN' && (ph === 'accumulation' || ph === 'markup')) {
      const dz = nearest(t.zones.d, 'demand');
      const nearZone = dz && t.price - dz.high <= t.atrD * 1.5;
      if (!nearZone && !t.breaks.d.brokeUp && !t.breaks.w.brokeUp) return null;
      reasons.push(`monthly ${M}, weekly ${w}, daily ${d}`, `weekly cycle ${ph}`);
      if (nearZone) reasons.push(`near daily demand ${round(dz.low)}–${round(dz.high)}`);
      if (t.breaks.w.brokeUp) reasons.push('weekly break up'); else if (t.breaks.d.brokeUp) reasons.push('daily break up');
      const stop = nearZone ? dz.low - t.atrD * 0.25 : (t.breaks.d.down ?? t.price - 2 * t.atrD);
      return { symbol: t.symbol, mode, side: 'long', ...levels('long', t.price, stop, true), withTrend: true, timeframe: 'W/D', reasons, score: s.composite };
    }
    return null;
  }

  if (mode === 'day') {
    if (!t.trends.h1 || !t.trends.h4) return null;
    const bias = t.trends.d;
    const side: 'long' | 'short' | null = t.trends.h1 === 'UP' && t.trends.h4 !== 'DOWN' ? 'long' : t.trends.h1 === 'DOWN' && t.trends.h4 !== 'UP' ? 'short' : null;
    if (!side) return null;
    const withTrend = (side === 'long' && bias === 'UP') || (side === 'short' && bias === 'DOWN');
    const z = nearest(t.zones.h1, side === 'long' ? 'demand' : 'supply') ?? nearest(t.zones.h4, side === 'long' ? 'demand' : 'supply');
    if (!z) return null;
    const dist = side === 'long' ? t.price - z.high : z.low - t.price;
    if (dist > t.atrD * 0.6) return null;
    if (t.trends.m15 && ((side === 'long' && t.trends.m15 === 'DOWN') || (side === 'short' && t.trends.m15 === 'UP'))) return null;
    reasons.push(`daily ${bias}, 4H ${t.trends.h4}, 1H ${t.trends.h1}${t.trends.m15 ? `, 15m ${t.trends.m15}` : ''}`, `${side === 'long' ? 'demand' : 'supply'} zone ${round(z.low)}–${round(z.high)}`, withTrend ? 'with the daily trend (1:2)' : 'against the daily trend (1:1)');
    const stop = side === 'long' ? z.low - t.atrD * 0.1 : z.high + t.atrD * 0.1;
    return { symbol: t.symbol, mode, side, ...levels(side, side === 'long' ? Math.max(t.price, z.high) : Math.min(t.price, z.low), stop, withTrend), withTrend, timeframe: '1H/15m', reasons, score: s.composite };
  }

  // quick: volume-led, 15m/5m/1m
  const i = t.intraday; if (!i) return null;
  if (Math.max(i.rvol15, i.rvol5) < 2) return null;
  const side: 'long' | 'short' | null = t.price > i.vwap && i.m1Break.brokeUp ? 'long' : t.price < i.vwap && i.m1Break.brokeDown ? 'short' : null;
  if (!side) return null;
  const withTrend = (side === 'long' && i.m15 === 'UP') || (side === 'short' && i.m15 === 'DOWN');
  const stop = side === 'long' ? (i.m5Breaks.down ?? t.price - t.atrD * 0.15) : (i.m5Breaks.up ?? t.price + t.atrD * 0.15);
  reasons.push(`volume ${Math.max(i.rvol15, i.rvol5).toFixed(1)}x on ${i.rvol15 >= i.rvol5 ? '15m' : '5m'}`, `${side === 'long' ? 'above' : 'below'} VWAP ${round(i.vwap)}`, `1m break ${side === 'long' ? 'up' : 'down'}`, `15m ${i.m15}`);
  return { symbol: t.symbol, mode, side, ...levels(side, t.price, stop, withTrend), withTrend, timeframe: '5m/1m', reasons, score: s.composite };
}
