import { resample, type Bar } from './bars';
import { atr, cmf, adLine, obv, rvol, slopePct, vwap, sma } from './indicators';
import { breaks, trend, zones, type Breaks, type Trend, type Zone } from './structure';
import { wyckoff, type PhaseRead } from './wyckoff';
import { elliott, type WaveRead } from './elliott';

export interface TechReport {
  symbol: string;
  price: number;
  changePct: number | null;
  atrD: number;
  trends: { y: Trend; M: Trend; w: Trend; d: Trend; h4: Trend | null; h1: Trend | null; m15: Trend | null };
  breaks: { M: Breaks; w: Breaks; d: Breaks };
  zones: { d: Zone[]; h4: Zone[]; h1: Zone[] };
  volume: { cmf20: number; rvolD: number; obvSlope: number; adSlope: number };
  cycle: { weekly: PhaseRead; daily: PhaseRead };
  waves: WaveRead;
  breadth: { aboveSma50: boolean | null; aboveSma200: boolean | null; newHigh52: boolean; newLow52: boolean };
  intraday?: { vwap: number; rvol15: number; rvol5: number; m1Break: Breaks; m5Breaks: Breaks; m15: Trend };
}

/** Yearly trend from few bars: up if the last close is above the prior two yearly closes and rising. */
function coarseTrend(bars: Bar[]): Trend {
  if (bars.length >= 12) return trend(bars);
  if (bars.length < 3) return 'RANGE';
  const c = bars.map((b) => b.c);
  const [a, b, z] = c.slice(-3);
  if (z > b && b > a) return 'UP';
  if (z < b && b < a) return 'DOWN';
  return 'RANGE';
}

/**
 * The Wyckoff read uses the slope of the 50-bar average; the trend table uses swing structure (higher highs and lows).
 * When they disagree, say so instead of showing two conflicting labels.
 */
function reconcile(read: PhaseRead, structure: Trend): PhaseRead {
  if (read.phase === 'markup' && structure !== 'UP') {
    return { ...read, confidence: 'low', notes: [`average still rising, but price structure is ${structure === 'DOWN' ? 'falling' : 'sideways'}: markup is losing momentum`, ...read.notes.filter((x) => x !== 'rising trend')] };
  }
  if (read.phase === 'markdown' && structure !== 'DOWN') {
    return { ...read, confidence: 'low', notes: [`average still falling, but price structure is ${structure === 'UP' ? 'rising' : 'sideways'}: markdown is losing momentum`, ...read.notes.filter((x) => x !== 'falling trend')] };
  }
  return read;
}

/**
 * Full multi-timeframe read.
 * daily: several years of daily bars (5+ preferred). hourly: ~60 days of 1h bars (optional).
 * minute: today's 1m bars (optional, for quick trades).
 */
export function analyze(symbol: string, daily: Bar[], hourly: Bar[] = [], minute: Bar[] = []): TechReport {
  const w = resample(daily, '1w'), M = resample(daily, '1M'), y = resample(daily, '1y');
  const h4 = hourly.length ? resample(hourly, '4h') : [];
  const m15 = minute.length ? resample(minute, '15m') : [];
  const m5 = minute.length ? resample(minute, '5m') : [];
  const last = daily.at(-1)!, prev = daily.at(-2);
  const report: TechReport = {
    symbol,
    price: last.c,
    changePct: prev ? ((last.c - prev.c) / prev.c) * 100 : null,
    atrD: atr(daily, 14),
    trends: {
      y: coarseTrend(y), M: trend(M), w: trend(w), d: trend(daily),
      h4: h4.length ? trend(h4) : null, h1: hourly.length ? trend(hourly) : null, m15: m15.length ? trend(m15) : null,
    },
    breaks: { M: breaks(M, 2), w: breaks(w, 3), d: breaks(daily, 3) },
    zones: { d: zones(daily), h4: h4.length ? zones(h4) : [], h1: hourly.length ? zones(hourly) : [] },
    volume: { cmf20: cmf(daily, 20), rvolD: rvol(daily, 20), obvSlope: slopePct(obv(daily).map((v) => v + 1e12), 20), adSlope: slopePct(adLine(daily).map((v) => v + 1e12), 20) },
    cycle: { weekly: reconcile(wyckoff(w), trend(w)), daily: reconcile(wyckoff(daily), trend(daily)) },
    waves: elliott(daily),
    breadth: (() => {
      const closes = daily.map((b) => b.c);
      const s50 = sma(closes, 50).at(-1), s200 = sma(closes, 200).at(-1);
      const yr = daily.slice(-252, -1);
      return {
        aboveSma50: s50 === undefined || Number.isNaN(s50) ? null : last.c > s50,
        aboveSma200: s200 === undefined || Number.isNaN(s200) ? null : last.c > s200,
        newHigh52: yr.length > 50 && last.h >= Math.max(...yr.map((b) => b.h)),
        newLow52: yr.length > 50 && last.l <= Math.min(...yr.map((b) => b.l)),
      };
    })(),
  };
  if (minute.length) {
    report.intraday = { vwap: vwap(minute), rvol15: rvol(m15, 20), rvol5: rvol(m5, 20), m1Break: breaks(minute, 3), m5Breaks: breaks(m5, 3), m15: trend(m15) };
  }
  return report;
}
