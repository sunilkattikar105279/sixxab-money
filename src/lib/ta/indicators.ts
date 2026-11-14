import type { Bar } from './bars';

export function ema(values: number[], n: number): number[] {
  const k = 2 / (n + 1); const out: number[] = [];
  values.forEach((v, i) => out.push(i === 0 ? v : v * k + out[i - 1] * (1 - k)));
  return out;
}
export const sma = (values: number[], n: number) => values.map((_, i) => (i + 1 < n ? NaN : values.slice(i + 1 - n, i + 1).reduce((a, b) => a + b, 0) / n));

export function atr(bars: Bar[], n = 14): number {
  if (bars.length < 2) return 0;
  const trs = bars.slice(1).map((b, i) => Math.max(b.h - b.l, Math.abs(b.h - bars[i].c), Math.abs(b.l - bars[i].c)));
  const last = trs.slice(-n);
  return last.reduce((a, b) => a + b, 0) / last.length;
}

/** On-balance volume. */
export function obv(bars: Bar[]): number[] {
  const out: number[] = [0];
  for (let i = 1; i < bars.length; i++) out.push(out[i - 1] + (bars[i].c > bars[i - 1].c ? bars[i].v : bars[i].c < bars[i - 1].c ? -bars[i].v : 0));
  return out;
}

const mfm = (b: Bar) => (b.h === b.l ? 0 : ((b.c - b.l) - (b.h - b.c)) / (b.h - b.l));

/** Chaikin accumulation/distribution line. */
export function adLine(bars: Bar[]): number[] {
  const out: number[] = [];
  bars.forEach((b, i) => out.push((i ? out[i - 1] : 0) + mfm(b) * b.v));
  return out;
}

/** Chaikin money flow over n bars: > 0 buying pressure (accumulation), < 0 selling pressure (distribution). */
export function cmf(bars: Bar[], n = 20): number {
  const last = bars.slice(-n);
  const vol = last.reduce((a, b) => a + b.v, 0);
  return vol ? last.reduce((a, b) => a + mfm(b) * b.v, 0) / vol : 0;
}

/** Relative volume: last bar's volume vs the average of the previous n. */
export function rvol(bars: Bar[], n = 20): number {
  if (bars.length < 2) return 1;
  const prev = bars.slice(-n - 1, -1);
  const avg = prev.reduce((a, b) => a + b.v, 0) / prev.length;
  return avg ? bars.at(-1)!.v / avg : 1;
}

/** Session VWAP over the given bars (pass today's intraday bars). */
export function vwap(bars: Bar[]): number {
  const pv = bars.reduce((a, b) => a + ((b.h + b.l + b.c) / 3) * b.v, 0), v = bars.reduce((a, b) => a + b.v, 0);
  return v ? pv / v : bars.at(-1)?.c ?? 0;
}

/** Linear-regression slope of the last n values, as % of the last value per bar. */
export function slopePct(values: number[], n: number): number {
  const ys = values.slice(-n); const m = ys.length; if (m < 3) return 0;
  const xm = (m - 1) / 2, ym = ys.reduce((a, b) => a + b, 0) / m;
  let num = 0, den = 0; ys.forEach((y, x) => { num += (x - xm) * (y - ym); den += (x - xm) ** 2; });
  return den && ym ? (num / den / ym) * 100 : 0;
}
