// Market risk meter: the fear gauge (VIX for the S&P 500, India VIX for the Nifty) plus index volume.
// Volatility does not predict direction on its own; it tells you how much risk to take and when turns are more likely.
import type { Bar } from './ta/bars';

export type Zone = 'calm' | 'normal' | 'elevated' | 'panic';
export interface Point { date: string; value: number }
export interface RegimeRead {
  market: 'US' | 'IN';
  gauge: 'VIX' | 'India VIX';
  asOf: string;
  level: number;
  zone: Zone;
  avg20: number;
  pct1y: number;            // 0-100: where today sits in the last year's range of closes
  change5dPct: number;
  spikeFade: boolean;       // jumped 20%+ within 5 days, now back below its 10-day average
  termStress: boolean | null; // US only: VIX above VIX3M (near-term stress)
  divergence: 'warning' | 'fear-fading' | null;
  volume: { ratio: number; upDownRatio: number; read: string } | null;
  summary: string;
  signals: string[];
  history: Point[];         // last ~250 closes for the chart
  breadth?: import('./breadth').Breadth | null; // added after the nightly scan
}

export const THRESHOLDS: Record<'US' | 'IN', [number, number, number]> = { US: [15, 20, 30], IN: [12, 16, 22] }; // calm < a <= normal < b <= elevated < c <= panic

export function zoneOf(market: 'US' | 'IN', v: number): Zone {
  const [a, b, c] = THRESHOLDS[market];
  return v < a ? 'calm' : v < b ? 'normal' : v < c ? 'elevated' : 'panic';
}

const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / Math.max(1, xs.length);

/** Position sizing multiplier the engine applies in each zone. */
export const SIZE_FACTOR: Record<Zone, number> = { calm: 1, normal: 1, elevated: 0.5, panic: 0 };

export const ZONE_WORDS: Record<Zone, string> = {
  calm: 'Calm: trend-friendly, but complacency can build',
  normal: 'Normal: a typical two-way market',
  elevated: 'Elevated: fear is rising and daily swings are bigger',
  panic: 'Panic: capitulation risk; bottoms often form in this zone',
};

export function readRegime(input: { market: 'US' | 'IN'; gauge: Point[]; gauge3m?: Point[]; index?: Bar[] }): RegimeRead | null {
  const g = input.gauge.filter((p) => Number.isFinite(p.value) && p.value > 0);
  if (g.length < 25) return null;
  const vals = g.map((p) => p.value);
  const level = vals.at(-1)!;
  const year = vals.slice(-252);
  const lo = Math.min(...year), hi = Math.max(...year);
  const avg20 = mean(vals.slice(-20)), avg10 = mean(vals.slice(-10));
  const prev5 = vals.at(-6) ?? vals[0];
  const change5dPct = ((level - prev5) / prev5) * 100;
  const zone = zoneOf(input.market, level);
  const signals: string[] = [];

  // Spike and fade: a 20%+ jump inside the last 10 sessions that has since closed back below the 10-day average
  const recent = vals.slice(-12);
  let spiked = false;
  for (let i = 5; i < recent.length - 1; i++) if (recent[i] / recent[i - 5] >= 1.2) spiked = true;
  const spikeFade = spiked && level < avg10;
  if (spikeFade) signals.push('Fear spiked and is fading: in the past this often marked short-term lows');
  if (level > avg20 * 1.15) signals.push('Fear gauge is well above its 20-day average');
  else if (level < avg20 * 0.9) signals.push('Fear gauge is easing below its 20-day average');

  let termStress: boolean | null = null;
  if (input.gauge3m?.length) {
    const v3 = input.gauge3m.at(-1)!.value;
    termStress = level > v3;
    if (termStress) signals.push('Near-term fear is above 3-month fear (backwardation): stress is now, not later');
  }

  let divergence: RegimeRead['divergence'] = null;
  let volume: RegimeRead['volume'] = null;
  const ix = input.index ?? [];
  if (ix.length >= 30) {
    const closes = ix.map((b) => b.c);
    const last = ix.at(-1)!;
    const yr = closes.slice(-252, -1);
    const newHigh = last.c >= Math.max(...yr.slice(-60)), newLow = last.c <= Math.min(...yr.slice(-60));
    if (newHigh && level > avg20) { divergence = 'warning'; signals.push('Index near a 3-month high while fear rises: a warning sign'); }
    if (newLow && level < Math.max(...vals.slice(-20))) { divergence = 'fear-fading'; signals.push('Index near a 3-month low but fear is below its recent peak: selling may be tiring'); }
    const v20 = mean(ix.slice(-21, -1).map((b) => b.v));
    const ratio = v20 > 0 ? last.v / v20 : 1;
    const last20 = ix.slice(-20);
    const upV = last20.filter((b) => b.c >= b.o).reduce((s, b) => s + b.v, 0);
    const dnV = last20.filter((b) => b.c < b.o).reduce((s, b) => s + b.v, 0) || 1;
    const udr = upV / dnV;
    const dayUp = last.c >= (ix.at(-2)?.c ?? last.o);
    const read = dayUp
      ? ratio >= 1.2 ? (level <= avg20 ? 'Up day on heavy volume with fear easing: healthy buying' : 'Up day on heavy volume, but fear is not easing yet') : 'Up day on light volume: buyers not committed'
      : ratio >= 1.2 ? 'Down day on heavy volume: real selling pressure' : 'Down day on light volume: no rush to sell';
    volume = { ratio: Math.round(ratio * 100) / 100, upDownRatio: Math.round(udr * 100) / 100, read };
  }

  const gaugeName = input.market === 'US' ? 'VIX' : 'India VIX';
  const pct1y = hi > lo ? Math.round(((level - lo) / (hi - lo)) * 100) : 50;
  const sizeWord = SIZE_FACTOR[zone] === 1 ? 'normal position sizes' : SIZE_FACTOR[zone] === 0 ? 'no new paper-trade entries' : 'half position sizes';
  const summary = `${gaugeName} ${level.toFixed(1)}: ${zone} (${pct1y}th percentile of the past year, ${change5dPct >= 0 ? '+' : ''}${change5dPct.toFixed(0)}% in 5 days). The engine uses ${sizeWord}.`;
  return {
    market: input.market, gauge: gaugeName, asOf: g.at(-1)!.date, level: Math.round(level * 100) / 100, zone,
    avg20: Math.round(avg20 * 100) / 100, pct1y, change5dPct: Math.round(change5dPct * 10) / 10, spikeFade, termStress, divergence, volume,
    summary, signals, history: g.slice(-250).map((p) => ({ date: p.date, value: Math.round(p.value * 100) / 100 })),
  };
}

/** CBOE publishes free daily history: DATE,OPEN,HIGH,LOW,CLOSE (dates as MM/DD/YYYY). */
export function parseCboeCsv(csv: string): Point[] {
  return csv.trim().split(/\r?\n/).slice(1).map((line) => {
    const cols = line.split(',');
    const [m, d, y] = (cols[0] ?? '').split('/');
    return { date: `${y}-${m?.padStart(2, '0')}-${d?.padStart(2, '0')}`, value: Number(cols.at(-1)) };
  }).filter((p) => /^\d{4}-\d{2}-\d{2}$/.test(p.date) && Number.isFinite(p.value));
}
