// SIXXAB Sentiment: one 0-100 read of investor mood across the US, India and the rest of the world.
// 0 = extreme fear, 100 = extreme greed. Built only from public prices, volatility and breadth, so anyone can check it.
// It describes the mood; it does not predict tomorrow. Extremes matter most: extreme fear has often come near lows,
// extreme greed near tops, but either can last for weeks.
import type { Bar } from './ta/bars';
import { wyckoff, type Phase } from './ta/wyckoff';
import { elliott } from './ta/elliott';

export type Mood = 'extreme fear' | 'fear' | 'neutral' | 'greed' | 'extreme greed';
export type Region = 'US' | 'IN' | 'GLOBAL';
export interface Component { key: string; label: string; region: Region; score: number; value: string; read: string }
export interface RegionRead { region: Region; name: string; score: number; mood: Mood; components: Component[]; phase: { index: string; phase: Phase; wave: string | null }[] }
export interface FlowRead {
  corr60: { pair: string; value: number }[];           // 60-day correlation of daily returns
  relative: { label: string; pct: number; read: string }[]; // 3-month performance gaps that show where money is going
  notes: string[];
}
export interface SentimentRead {
  asOf: string;
  score: number;
  mood: Mood;
  weights: Record<Region, number>;
  regions: RegionRead[];
  flows: FlowRead;
  history: { date: string; score: number; us: number; in: number; global: number }[]; // price-based history (no breadth)
  summary: string;
}

/** Symbols the nightly job loads (Yahoo Finance daily bars). */
export const SENTIMENT_SYMBOLS = {
  spx: '^GSPC', vix: '^VIX', hyg: 'HYG', ief: 'IEF', gold: 'GC=F', dxy: 'DX-Y.NYB',
  nifty: '^NSEI', indiaVix: '^INDIAVIX', inr: 'INR=X', inda: 'INDA', spy: 'SPY',
  ftse: '^FTSE', dax: '^GDAXI', nikkei: '^N225', hsi: '^HSI', eem: 'EEM',
} as const;
export type SymKey = keyof typeof SENTIMENT_SYMBOLS;
export type Series = Partial<Record<SymKey, Bar[]>>;

export const WEIGHTS: Record<Region, number> = { US: 0.5, GLOBAL: 0.3, IN: 0.2 };

export const moodOf = (s: number): Mood => (s < 25 ? 'extreme fear' : s < 45 ? 'fear' : s <= 55 ? 'neutral' : s <= 75 ? 'greed' : 'extreme greed');

/** Piecewise-linear map through [x, y] points (x ascending), clamped to the ends. */
export function scale(v: number, pts: [number, number][]): number {
  if (v <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    if (v <= x1) return y0 + ((v - x0) / (x1 - x0)) * (y1 - y0);
  }
  return pts[pts.length - 1][1];
}

const closes = (b: Bar[] = []) => b.map((x) => x.c);
const dayKey = (t: number) => new Date(t).toISOString().slice(0, 10);
const sma = (v: number[], n: number, end = v.length) => (end >= n ? v.slice(end - n, end).reduce((a, b) => a + b, 0) / n : NaN);
const ret = (v: number[], n: number, end = v.length) => (end > n ? (v[end - 1] / v[end - 1 - n] - 1) * 100 : NaN);
const pct = (x: number) => `${x >= 0 ? '+' : '−'}${Math.abs(x).toFixed(1)}%`;
const round = (x: number) => Math.round(Math.max(0, Math.min(100, x)));

/** Aligns several daily series on shared dates (only dates every series has). */
export function align(series: Bar[][]): { dates: string[]; cols: number[][] } {
  const maps = series.map((s) => new Map(s.map((b) => [dayKey(b.t), b.c])));
  const dates = [...maps[0].keys()].filter((d) => maps.every((m) => m.has(d))).sort();
  return { dates, cols: maps.map((m) => dates.map((d) => m.get(d)!)) };
}

/** Pearson correlation of daily % returns over the last n shared days. */
export function corrReturns(a: Bar[], b: Bar[], n = 60): number {
  const { cols } = align([a, b]);
  const r = (v: number[]) => v.slice(1).map((x, i) => x / v[i] - 1);
  const x = r(cols[0]).slice(-n), y = r(cols[1]).slice(-n);
  if (x.length < 20) return NaN;
  const mx = x.reduce((s, v) => s + v, 0) / x.length, my = y.reduce((s, v) => s + v, 0) / y.length;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < x.length; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; syy += (y[i] - my) ** 2; }
  return sxx && syy ? sxy / Math.sqrt(sxx * syy) : NaN;
}

// ---- component scorers (each returns 0-100, higher = greedier) ----
const trendScore = (v: number[], end = v.length) => scale((v[end - 1] / sma(v, 200, end) - 1) * 100, [[-12, 0], [0, 50], [12, 100]]);
const momentumScore = (v: number[], end = v.length) => scale((v[end - 1] / sma(v, 125, end) - 1) * 100, [[-8, 0], [0, 50], [8, 100]]);
const vixScore = (x: number) => scale(x, [[11, 95], [15, 72], [20, 50], [30, 18], [45, 0]]);
const indiaVixScore = (x: number) => scale(x, [[10, 92], [13, 68], [16, 50], [22, 18], [30, 0]]);
const havenScore = (eq: number[], gold: number[], end?: number) => scale(ret(eq, 20, end) - ret(gold, 20, end), [[-10, 0], [0, 50], [10, 100]]);
const dollarScore = (d: number[], end?: number) => scale(ret(d, 20, end), [[-3, 85], [0, 50], [3, 15]]);
const rupeeScore = (inr: number[], end?: number) => scale(ret(inr, 20, end), [[-2, 85], [0, 50], [2, 15]]); // INR=X up = rupee weaker
const creditScore = (hyg: number[], ief: number[], end?: number) => scale(ret(hyg, 20, end) - ret(ief, 20, end), [[-4, 0], [0, 50], [4, 100]]);
const vixTrendScore = (vix: number[], end = vix.length) => scale(vix[end - 1] / sma(vix, 50, end), [[0.75, 85], [1, 50], [1.5, 5]]);

/** True when a volatility feed repeats the same close (a stale free feed), so it is left out. */
const stale = (v: number[]) => v.length >= 3 && v.slice(-3).every((x) => x === v[v.length - 1]);

const avg = (xs: number[]) => { const ok = xs.filter((x) => Number.isFinite(x)); return ok.length ? ok.reduce((a, b) => a + b, 0) / ok.length : NaN; };

function phaseOf(name: string, bars?: Bar[]) {
  if (!bars || bars.length < 220) return null;
  let wave: string | null = null;
  try { const e = elliott(bars); wave = e.pattern === 'none' ? null : e.summary ?? e.wave; } catch { wave = null; }
  return { index: name, phase: wyckoff(bars).phase, wave };
}

/** Builds the full read from daily bars plus the latest breadth (% of tracked stocks above their 200-day average). */
export function readSentiment(s: Series, breadth: { US?: number | null; IN?: number | null } = {}): SentimentRead | null {
  const c = Object.fromEntries(Object.entries(s).map(([k, v]) => [k, closes(v)])) as Partial<Record<SymKey, number[]>>;
  if (!c.spx || c.spx.length < 220 || !c.vix) return null;
  const last = (k: SymKey) => c[k]?.[c[k]!.length - 1] ?? NaN;
  const comp = (region: Region, key: string, label: string, score: number, value: string, read: string): Component | null =>
    Number.isFinite(score) ? { key, label, region, score: round(score), value, read } : null;

  // US
  const us = [
    comp('US', 'vix', 'Fear gauge (VIX)', vixScore(last('vix')), last('vix').toFixed(1), last('vix') >= 30 ? 'panic-level volatility' : last('vix') >= 20 ? 'elevated volatility' : last('vix') >= 15 ? 'normal volatility' : 'calm'),
    comp('US', 'vixTrend', 'VIX vs its 50-day average', vixTrendScore(c.vix), `${(last('vix') / sma(c.vix, 50)).toFixed(2)}×`, last('vix') > sma(c.vix, 50) ? 'fear is rising' : 'fear is fading'),
    comp('US', 'trend', 'S&P 500 vs 200-day average', trendScore(c.spx), pct((last('spx') / sma(c.spx, 200) - 1) * 100), last('spx') > sma(c.spx, 200) ? 'long-term uptrend intact' : 'below the long-term trend'),
    comp('US', 'momentum', 'S&P 500 vs 125-day average', momentumScore(c.spx), pct((last('spx') / sma(c.spx, 125) - 1) * 100), 'six-month momentum'),
    breadth.US != null ? comp('US', 'breadth', 'Breadth (tracked stocks above 200-day)', breadth.US, `${breadth.US}%`, breadth.US >= 60 ? 'broad participation' : breadth.US >= 40 ? 'mixed participation' : 'narrow, most stocks weak') : null,
    c.hyg && c.ief ? comp('US', 'credit', 'Junk bonds vs Treasuries (20 days)', creditScore(c.hyg, c.ief), pct(ret(c.hyg, 20) - ret(c.ief, 20)), ret(c.hyg, 20) > ret(c.ief, 20) ? 'investors still reach for yield' : 'money hiding in safe bonds') : null,
    c.gold ? comp('US', 'haven', 'Stocks vs gold (20 days)', havenScore(c.spx, c.gold), pct(ret(c.spx, 20) - ret(c.gold, 20)), ret(c.spx, 20) > ret(c.gold, 20) ? 'stocks beating gold' : 'gold beating stocks') : null,
  ].filter(Boolean) as Component[];

  // India
  const inC = [
    c.indiaVix && !stale(c.indiaVix) ? comp('IN', 'vix', 'India VIX', indiaVixScore(last('indiaVix')), last('indiaVix').toFixed(1), last('indiaVix') >= 22 ? 'panic-level volatility' : last('indiaVix') >= 16 ? 'elevated volatility' : last('indiaVix') >= 12 ? 'normal volatility' : 'calm') : null,
    c.nifty && c.nifty.length >= 200 ? comp('IN', 'trend', 'Nifty 50 vs 200-day average', trendScore(c.nifty), pct((last('nifty') / sma(c.nifty, 200) - 1) * 100), last('nifty') > sma(c.nifty, 200) ? 'long-term uptrend intact' : 'below the long-term trend') : null,
    c.nifty && c.nifty.length >= 125 ? comp('IN', 'momentum', 'Nifty 50 vs 125-day average', momentumScore(c.nifty), pct((last('nifty') / sma(c.nifty, 125) - 1) * 100), 'six-month momentum') : null,
    breadth.IN != null ? comp('IN', 'breadth', 'Breadth (tracked stocks above 200-day)', breadth.IN, `${breadth.IN}%`, breadth.IN >= 60 ? 'broad participation' : breadth.IN >= 40 ? 'mixed participation' : 'narrow, most stocks weak') : null,
    c.inr ? comp('IN', 'rupee', 'Rupee vs dollar (20 days)', rupeeScore(c.inr), pct(-ret(c.inr, 20)), ret(c.inr, 20) > 0 ? 'rupee weakening, foreign money cautious' : 'rupee firm, foreign money welcome') : null,
  ].filter(Boolean) as Component[];

  // Rest of the world
  const world: [SymKey, string][] = [['ftse', 'FTSE 100'], ['dax', 'DAX'], ['nikkei', 'Nikkei 225'], ['hsi', 'Hang Seng']];
  const have = world.filter(([k]) => (c[k]?.length ?? 0) >= 200);
  const gl = [
    have.length ? comp('GLOBAL', 'trend', 'World indexes vs 200-day average', avg(have.map(([k]) => trendScore(c[k]!))), have.map(([k, n]) => `${n.split(' ')[0]} ${pct((last(k) / sma(c[k]!, 200) - 1) * 100)}`).join(' · '), `${have.filter(([k]) => last(k) > sma(c[k]!, 200)).length} of ${have.length} above their long-term trend`) : null,
    have.length ? comp('GLOBAL', 'momentum', 'World indexes vs 125-day average', avg(have.map(([k]) => momentumScore(c[k]!))), `${have.filter(([k]) => last(k) > sma(c[k]!, 125)).length} of ${have.length} above`, 'six-month momentum') : null,
    c.dxy ? comp('GLOBAL', 'dollar', 'US dollar (20 days)', dollarScore(c.dxy), pct(ret(c.dxy, 20)), ret(c.dxy, 20) > 0 ? 'dollar rising, risk-off' : 'dollar easing, risk-on') : null,
    c.gold && have.length ? comp('GLOBAL', 'haven', 'World stocks vs gold (20 days)', avg(have.map(([k]) => havenScore(c[k]!, c.gold!))), pct(avg(have.map(([k]) => ret(c[k]!, 20))) - ret(c.gold, 20)), 'safe-haven demand') : null,
  ].filter(Boolean) as Component[];

  const region = (r: Region, name: string, cs: Component[], ph: (ReturnType<typeof phaseOf>)[]): RegionRead => {
    const score = round(avg(cs.map((x) => x.score)));
    return { region: r, name, score, mood: moodOf(score), components: cs, phase: ph.filter(Boolean) as RegionRead['phase'] };
  };
  const regions = [
    region('US', 'United States', us, [phaseOf('S&P 500', s.spx)]),
    region('IN', 'India', inC, [phaseOf('Nifty 50', s.nifty)]),
    region('GLOBAL', 'Rest of the world', gl, world.map(([k, n]) => phaseOf(n, s[k]))),
  ].filter((r) => r.components.length);
  const wsum = regions.reduce((a, r) => a + WEIGHTS[r.region], 0);
  const score = round(regions.reduce((a, r) => a + r.score * WEIGHTS[r.region], 0) / wsum);

  // Money movement: correlations and 3-month gaps
  const corr60 = ([['S&P 500 · Nifty 50', s.spx, s.nifty], ['S&P 500 · Nikkei', s.spx, s.nikkei], ['S&P 500 · DAX', s.spx, s.dax], ['Nifty 50 · gold', s.nifty, s.gold]] as [string, Bar[] | undefined, Bar[] | undefined][])
    .filter(([, a, b]) => a && b).map(([pair, a, b]) => ({ pair, value: Math.round(corrReturns(a!, b!) * 100) / 100 })).filter((x) => Number.isFinite(x.value));
  const r63 = (k: SymKey) => (c[k] && c[k]!.length > 64 ? ret(c[k]!, 63) : NaN);
  const relative = [
    { label: 'India (INDA, in dollars) vs US (SPY)', pct: r63('inda') - r63('spy') },
    { label: 'Emerging markets (EEM) vs US (SPY)', pct: r63('eem') - r63('spy') },
    { label: 'Gold vs S&P 500', pct: r63('gold') - r63('spx') },
    { label: 'Nifty 50 (in rupees) vs S&P 500', pct: r63('nifty') - r63('spx') },
  ].filter((x) => Number.isFinite(x.pct)).map((x) => ({ ...x, pct: Math.round(x.pct * 10) / 10, read: x.pct > 2 ? 'money favouring the first' : x.pct < -2 ? 'money favouring the second' : 'about even' }));
  const notes: string[] = [];
  const cIn = corr60.find((x) => x.pair.startsWith('S&P 500 · Nifty'));
  if (cIn) notes.push(cIn.value < 0.3 ? `India and the US have moved largely independently over 60 days (correlation ${cIn.value.toFixed(2)}): India is following its own drivers, not Wall Street.` : `India and the US have moved together over 60 days (correlation ${cIn.value.toFixed(2)}): a US sell-off tends to reach India.`);
  const g = relative.find((x) => x.label.startsWith('Gold'));
  if (g && g.pct > 5) notes.push(`Gold has beaten the S&P 500 by ${g.pct.toFixed(1)} points over 3 months: big money is paying up for safety.`);

  // Price-based history (breadth left out so every day is comparable)
  const keys = (['spx', 'vix', 'nifty', 'ftse', 'dax', 'nikkei', 'hsi'] as SymKey[]).filter((k) => s[k]?.length);
  const { dates, cols } = align(keys.map((k) => s[k]!));
  const col = (k: SymKey) => cols[keys.indexOf(k)];
  const history: SentimentRead['history'] = [];
  for (let end = Math.max(201, dates.length - 260); end <= dates.length; end++) {
    const u = avg([vixScore(col('vix')[end - 1]), vixTrendScore(col('vix'), end), trendScore(col('spx'), end), momentumScore(col('spx'), end)]);
    const i = keys.includes('nifty') ? avg([trendScore(col('nifty'), end), momentumScore(col('nifty'), end)]) : NaN;
    const w = avg((['ftse', 'dax', 'nikkei', 'hsi'] as SymKey[]).filter((k) => keys.includes(k)).flatMap((k) => [trendScore(col(k), end), momentumScore(col(k), end)]));
    const parts: [number, number][] = [[u, WEIGHTS.US], [i, WEIGHTS.IN], [w, WEIGHTS.GLOBAL]].filter(([v]) => Number.isFinite(v)) as [number, number][];
    const sc = parts.reduce((a, [v, wt]) => a + v * wt, 0) / parts.reduce((a, [, wt]) => a + wt, 0);
    history.push({ date: dates[end - 1], score: round(sc), us: round(u), in: round(i), global: round(w) });
  }

  const asOf = dayKey(s.spx!.at(-1)!.t);
  const byR = Object.fromEntries(regions.map((r) => [r.region, r]));
  const summary = `SIXXAB Sentiment ${score} (${moodOf(score)}). US ${byR.US?.score ?? '—'} (${byR.US?.mood ?? '—'}), India ${byR.IN?.score ?? '—'} (${byR.IN?.mood ?? '—'}), rest of the world ${byR.GLOBAL?.score ?? '—'} (${byR.GLOBAL?.mood ?? '—'}).`;
  return { asOf, score, mood: moodOf(score), weights: WEIGHTS, regions, flows: { corr60, relative, notes }, history, summary };
}
