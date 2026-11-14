import type { Bar } from './bars';
import { atr, ema, slopePct } from './indicators';

export type Trend = 'UP' | 'DOWN' | 'RANGE';
export interface Pivot { i: number; t: number; price: number; kind: 'H' | 'L' }

/** Fractal swing points: a high (low) higher (lower) than k bars each side. */
export function pivots(bars: Bar[], k = 3): Pivot[] {
  const out: Pivot[] = [];
  for (let i = k; i < bars.length - k; i++) {
    const win = bars.slice(i - k, i + k + 1);
    if (bars[i].h === Math.max(...win.map((b) => b.h))) out.push({ i, t: bars[i].t, price: bars[i].h, kind: 'H' });
    if (bars[i].l === Math.min(...win.map((b) => b.l))) out.push({ i, t: bars[i].t, price: bars[i].l, kind: 'L' });
  }
  return out;
}

/**
 * Trend: price vs 10/20 EMA plus swing structure.
 * UP = close above both EMAs, fast EMA above slow, rising, and the last swing low above the one before.
 */
export function trend(bars: Bar[]): Trend {
  if (bars.length < 12) return 'RANGE';
  const closes = bars.map((b) => b.c);
  const f = ema(closes, 10), s = ema(closes, 20);
  const c = closes.at(-1)!, ef = f.at(-1)!, es = s.at(-1)!;
  const sl = slopePct(s, 5);
  const piv = pivots(bars, 2);
  const lows = piv.filter((p) => p.kind === 'L').slice(-2), highs = piv.filter((p) => p.kind === 'H').slice(-2);
  const hl = lows.length === 2 ? lows[1].price > lows[0].price : true;
  const lh = highs.length === 2 ? highs[1].price < highs[0].price : true;
  if (c > ef && ef > es && sl > 0 && hl) return 'UP';
  if (c < ef && ef < es && sl < 0 && lh) return 'DOWN';
  return 'RANGE';
}

export interface Breaks { up: number | null; down: number | null; brokeUp: boolean; brokeDown: boolean }

/** Break levels: last swing high above price (break up) and last swing low below price (break down). */
export function breaks(bars: Bar[], k = 3): Breaks {
  if (bars.length < 2 * k + 2) return { up: null, down: null, brokeUp: false, brokeDown: false };
  const piv = pivots(bars.slice(0, -1), k);
  const c = bars.at(-1)!.c, prevC = bars.at(-2)!.c;
  const highs = piv.filter((p) => p.kind === 'H'), lows = piv.filter((p) => p.kind === 'L');
  const up = [...highs].reverse().find((p) => p.price > c)?.price ?? null;
  const down = [...lows].reverse().find((p) => p.price < c)?.price ?? null;
  const lastH = highs.at(-1)?.price, lastL = lows.at(-1)?.price;
  return { up, down, brokeUp: !!lastH && c > lastH && prevC <= lastH, brokeDown: !!lastL && c < lastL && prevC >= lastL };
}

export interface Zone { kind: 'demand' | 'supply'; low: number; high: number; t: number; fresh: boolean }

/**
 * Supply/demand zones: the base candle before a strong move away (range > 1.5 ATR).
 * Demand = base before a rally, supply = base before a drop. Fresh = price has not returned into it since.
 */
export function zones(bars: Bar[], maxZones = 3): Zone[] {
  if (bars.length < 20) return [];
  const a = atr(bars, 14);
  const out: Zone[] = [];
  for (let i = 1; i < bars.length - 1; i++) {
    const base = bars[i], move = bars[i + 1];
    const body = Math.abs(move.c - move.o);
    if (body < 1.5 * a) continue;
    const kind = move.c > move.o ? 'demand' : 'supply';
    const low = base.l, high = Math.max(base.o, base.c, base.l + (base.h - base.l) * 0.5);
    const zone: Zone = { kind, low: kind === 'demand' ? low : Math.min(base.o, base.c), high: kind === 'demand' ? high : base.h, t: base.t, fresh: true };
    zone.fresh = !bars.slice(i + 2).some((b) => (kind === 'demand' ? b.l <= zone.high : b.h >= zone.low));
    out.push(zone);
  }
  const c = bars.at(-1)!.c;
  const demand = out.filter((z) => z.kind === 'demand' && z.high < c).sort((x, y) => y.high - x.high);
  const supply = out.filter((z) => z.kind === 'supply' && z.low > c).sort((x, y) => x.low - y.low);
  return [...demand.slice(0, maxZones), ...supply.slice(0, maxZones)];
}
