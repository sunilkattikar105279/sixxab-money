// Model portfolios for learning (SIXXAB Money, education-only Level 0).
// These are teaching examples of how asset mixes behave, not recommendations for any person. Nothing here looks at
// a user's situation, and nothing maps a user to a model: people compare all five and practise on paper.

export type ModelMarket = 'US' | 'IN' | 'GLOBAL';
export type ModelKey = 'preserve' | 'conservative' | 'balanced' | 'growth' | 'aggressive';

export interface AssetClass { key: string; label: string; proxy: string; color: string; kind: 'stocks' | 'bonds' | 'gold' | 'cash' }
export interface Model { key: ModelKey; name: string; teaches: string; weights: Record<string, number> }
export interface MarketModels { market: ModelMarket; label: string; currency: 'USD' | 'INR'; fetchMarket: 'US' | 'IN'; assets: AssetClass[]; models: Model[]; note: string }

const C = { us: '#2BB3A3', intl: '#5B8DEF', mid: '#8E6CEF', bonds: '#C9A227', ibonds: '#E0B84A', gold: '#E8C766', cash: '#7C8BA1' };

const NAMES: Record<ModelKey, [string, string]> = {
  preserve: ['Preserve', 'Most of the money sits in bonds and cash. Teaches how little a safe mix moves, and how slowly it grows.'],
  conservative: ['Conservative', 'About a third in stocks. Teaches how bonds cushion a stock fall without stopping growth.'],
  balanced: ['Balanced', 'Roughly 60/40 stocks and bonds, the classic starting point. Teaches the trade between growth and calm.'],
  growth: ['Growth', 'About 80% stocks. Teaches what a long horizon buys you and what a bad year feels like.'],
  aggressive: ['Aggressive', 'Almost all stocks. Teaches the full size of market falls, and why time and patience matter most here.'],
};
const ORDER: ModelKey[] = ['preserve', 'conservative', 'balanced', 'growth', 'aggressive'];
const build = (w: Record<ModelKey, Record<string, number>>): Model[] => ORDER.map((k) => ({ key: k, name: NAMES[k][0], teaches: NAMES[k][1], weights: w[k] }));

export const MODEL_SETS: Record<ModelMarket, MarketModels> = {
  US: {
    market: 'US', label: 'US', currency: 'USD', fetchMarket: 'US',
    note: 'History uses US-listed index funds as stand-ins for each asset class (named for transparency, not as a recommendation). Prices are adjusted for dividends and splits.',
    assets: [
      { key: 'us', label: 'US stocks', proxy: 'VTI', color: C.us, kind: 'stocks' },
      { key: 'intl', label: 'International stocks', proxy: 'VXUS', color: C.intl, kind: 'stocks' },
      { key: 'bonds', label: 'US bonds', proxy: 'BND', color: C.bonds, kind: 'bonds' },
      { key: 'cash', label: 'Cash (T-bills)', proxy: 'SGOV', color: C.cash, kind: 'cash' },
      { key: 'gold', label: 'Gold', proxy: 'GLD', color: C.gold, kind: 'gold' },
    ],
    models: build({
      preserve: { us: 10, intl: 5, bonds: 50, cash: 35 },
      conservative: { us: 25, intl: 10, bonds: 50, cash: 10, gold: 5 },
      balanced: { us: 40, intl: 20, bonds: 30, cash: 5, gold: 5 },
      growth: { us: 55, intl: 25, bonds: 15, gold: 5 },
      aggressive: { us: 65, intl: 30, gold: 5 },
    }),
  },
  IN: {
    market: 'IN', label: 'India', currency: 'INR', fetchMarket: 'IN',
    note: 'History uses NSE-listed index ETFs as stand-ins for each asset class (named for transparency, not as a recommendation). Prices are delayed and not adjusted for small ETF dividends.',
    assets: [
      { key: 'large', label: 'India large caps (Nifty 50)', proxy: 'NIFTYBEES', color: C.us, kind: 'stocks' },
      { key: 'mid', label: 'India next 50 (Nifty Next 50)', proxy: 'JUNIORBEES', color: C.mid, kind: 'stocks' },
      { key: 'global', label: 'US stocks via an Indian fund', proxy: 'MON100', color: C.intl, kind: 'stocks' },
      { key: 'bonds', label: 'Government bonds', proxy: 'GILT5YBEES', color: C.bonds, kind: 'bonds' },
      { key: 'gold', label: 'Gold', proxy: 'GOLDBEES', color: C.gold, kind: 'gold' },
    ],
    models: build({
      preserve: { large: 15, bonds: 75, gold: 10 },
      conservative: { large: 25, mid: 5, global: 5, bonds: 55, gold: 10 },
      balanced: { large: 35, mid: 15, global: 10, bonds: 30, gold: 10 },
      growth: { large: 45, mid: 20, global: 15, bonds: 12, gold: 8 },
      aggressive: { large: 50, mid: 30, global: 15, gold: 5 },
    }),
  },
  GLOBAL: {
    market: 'GLOBAL', label: 'Global', currency: 'USD', fetchMarket: 'US',
    note: 'A worldwide mix in US dollars, for NRIs and global users. History uses US-listed index funds as stand-ins (named for transparency, not as a recommendation).',
    assets: [
      { key: 'us', label: 'US stocks', proxy: 'VTI', color: C.us, kind: 'stocks' },
      { key: 'intl', label: 'Stocks outside the US', proxy: 'VXUS', color: C.intl, kind: 'stocks' },
      { key: 'bonds', label: 'US bonds', proxy: 'BND', color: C.bonds, kind: 'bonds' },
      { key: 'ibonds', label: 'International bonds', proxy: 'BNDX', color: C.ibonds, kind: 'bonds' },
      { key: 'gold', label: 'Gold', proxy: 'GLD', color: C.gold, kind: 'gold' },
    ],
    models: build({
      preserve: { us: 8, intl: 7, bonds: 40, ibonds: 35, gold: 10 },
      conservative: { us: 18, intl: 17, bonds: 30, ibonds: 25, gold: 10 },
      balanced: { us: 30, intl: 30, bonds: 15, ibonds: 15, gold: 10 },
      growth: { us: 40, intl: 40, bonds: 7, ibonds: 5, gold: 8 },
      aggressive: { us: 48, intl: 47, gold: 5 },
    }),
  },
};

export const isModelMarket = (m: string | undefined): m is ModelMarket => m === 'US' || m === 'IN' || m === 'GLOBAL';
export const stockShare = (set: MarketModels, m: Model) => set.assets.filter((a) => a.kind === 'stocks').reduce((s, a) => s + (m.weights[a.key] ?? 0), 0);

// ---------- history math ----------

export interface Series { t: number[]; c: number[] }             // daily closes, t = UTC day (ms)
export interface Point { t: number; v: number }
export interface HistoryStats { start: string; end: string; years: number; growthOf100: number; cagr: number; maxDrawdown: number; drawdownFrom: string; drawdownTo: string; recoveredOn: string | null; worstYear: { year: number; ret: number } | null; bestYear: { year: number; ret: number } | null; curve: Point[] }

const day = (t: number, offsetMs = 0) => { const d = new Date(t + offsetMs); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()); };
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);

/** Keeps only days every series has, so the mix is priced on the same dates. `offsetMs` turns bar times into the
 *  exchange's local date (India +5:30), since feeds stamp daily bars at midnight local or at the session open. */
export function align(series: Record<string, Series>, offsetMs = 0): { t: number[]; c: Record<string, number[]> } {
  const keys = Object.keys(series);
  if (!keys.length) return { t: [], c: {} };
  const maps = keys.map((k) => { const m = new Map<number, number>(); series[k].t.forEach((t, i) => { const v = series[k].c[i]; if (Number.isFinite(v) && v > 0) m.set(day(t, offsetMs), v); }); return m; });
  const t = [...maps[0].keys()].filter((d) => maps.every((m) => m.has(d))).sort((a, b) => a - b);
  const c: Record<string, number[]> = {};
  keys.forEach((k, i) => { c[k] = t.map((d) => maps[i].get(d)!); });
  return { t, c };
}

/** Value of 100 invested in the mix, rebalanced to target weights on the first trading day of each month. */
export function rebalancedCurve(weights: Record<string, number>, aligned: { t: number[]; c: Record<string, number[]> }): Point[] {
  const keys = Object.keys(weights).filter((k) => (weights[k] ?? 0) > 0 && aligned.c[k]);
  const total = keys.reduce((s, k) => s + weights[k], 0);
  if (!keys.length || !total || aligned.t.length < 2) return [];
  let units: Record<string, number> = {};
  const set = (i: number, value: number) => { units = {}; keys.forEach((k) => { units[k] = (value * weights[k] / total) / aligned.c[k][i]; }); };
  set(0, 100);
  const out: Point[] = [{ t: aligned.t[0], v: 100 }];
  for (let i = 1; i < aligned.t.length; i++) {
    const v = keys.reduce((s, k) => s + units[k] * aligned.c[k][i], 0);
    out.push({ t: aligned.t[i], v });
    if (new Date(aligned.t[i]).getUTCMonth() !== new Date(aligned.t[i - 1]).getUTCMonth()) set(i, v);
  }
  return out;
}

export function stats(curve: Point[]): HistoryStats | null {
  if (curve.length < 30) return null;
  const first = curve[0], last = curve[curve.length - 1];
  const years = (last.t - first.t) / (365.25 * 86_400_000);
  let peak = first, maxDd = 0, ddFrom = first.t, ddTo = first.t;
  for (const p of curve) {
    if (p.v > peak.v) peak = p;
    const dd = p.v / peak.v - 1;
    if (dd < maxDd) { maxDd = dd; ddFrom = peak.t; ddTo = p.t; }
  }
  const peakValue = curve.find((p) => p.t === ddFrom)!.v;
  const rec = curve.find((p) => p.t > ddTo && p.v >= peakValue);
  // calendar-year returns, full years only (first and last partial years skipped)
  const yearEnd = new Map<number, number>();
  curve.forEach((p) => yearEnd.set(new Date(p.t).getUTCFullYear(), p.v));
  const yrs = [...yearEnd.keys()].sort();
  const rets: { year: number; ret: number }[] = [];
  for (let i = 1; i < yrs.length; i++) {
    const y = yrs[i];
    if (y === new Date(last.t).getUTCFullYear()) continue;
    rets.push({ year: y, ret: yearEnd.get(y)! / yearEnd.get(yrs[i - 1])! - 1 });
  }
  const sorted = [...rets].sort((a, b) => a.ret - b.ret);
  // thin the curve to about one point a week for the page
  const step = Math.max(1, Math.floor(curve.length / 260));
  const thin = curve.filter((_, i) => i % step === 0 || i === curve.length - 1);
  return {
    start: iso(first.t), end: iso(last.t), years,
    growthOf100: last.v, cagr: years > 0 ? Math.pow(last.v / 100, 1 / years) - 1 : 0,
    maxDrawdown: maxDd, drawdownFrom: iso(ddFrom), drawdownTo: iso(ddTo), recoveredOn: rec ? iso(rec.t) : null,
    worstYear: sorted[0] ?? null, bestYear: sorted[sorted.length - 1] ?? null, curve: thin,
  };
}

// ---------- paper portfolios ----------

export interface Holding { key: string; units: number }
export interface PaperEvent { d: string; what: string; value: number }
export interface PaperPortfolio { id: string; name: string; market: ModelMarket; created: string; invested: number; target: Record<string, number>; holdings: Holding[]; events: PaperEvent[] }

export const valueOf = (h: Holding[], prices: Record<string, number>) => h.reduce((s, x) => s + x.units * (prices[x.key] ?? 0), 0);

/** Buys the target mix with `value` at today's prices. */
export function buyMix(target: Record<string, number>, value: number, prices: Record<string, number>): Holding[] {
  const keys = Object.keys(target).filter((k) => target[k] > 0 && prices[k] > 0);
  const total = keys.reduce((s, k) => s + target[k], 0);
  return keys.map((k) => ({ key: k, units: (value * target[k] / total) / prices[k] }));
}

/** Current weights (%) and drift from target, in percentage points. */
export function drift(p: Pick<PaperPortfolio, 'target' | 'holdings'>, prices: Record<string, number>): { key: string; now: number; target: number; gap: number }[] {
  const v = valueOf(p.holdings, prices) || 1;
  const keys = [...new Set([...Object.keys(p.target).filter((k) => p.target[k] > 0), ...p.holdings.map((h) => h.key)])];
  const tTotal = Object.values(p.target).reduce((s, x) => s + x, 0) || 1;
  return keys.map((k) => {
    const now = 100 * (p.holdings.find((h) => h.key === k)?.units ?? 0) * (prices[k] ?? 0) / v;
    const target = 100 * (p.target[k] ?? 0) / tTotal;
    return { key: k, now, target, gap: now - target };
  });
}

/** Common teaching rule: rebalance when any asset is 5+ points off its target. */
export const needsRebalance = (d: { gap: number }[], band = 5) => d.some((x) => Math.abs(x.gap) >= band);

// ---------- goal planning ----------

export interface GoalInput { target: number; years: number; saved: number; annualReturn: number; inflation: number }
/** Monthly amount needed to reach the target (grown by inflation) given an assumed annual return. */
export function monthlyNeeded(g: GoalInput): { futureTarget: number; monthly: number; fromSaved: number } {
  const n = Math.max(1, Math.round(g.years * 12));
  const futureTarget = g.target * Math.pow(1 + g.inflation, g.years);
  const r = Math.pow(1 + g.annualReturn, 1 / 12) - 1;
  const fromSaved = g.saved * Math.pow(1 + r, n);
  const gap = Math.max(0, futureTarget - fromSaved);
  const monthly = r === 0 ? gap / n : gap * r / (Math.pow(1 + r, n) - 1);
  return { futureTarget, monthly, fromSaved };
}

// ---------- India LRS ----------
export const LRS_LIMIT_USD = 250_000;
export const lrsHeadroom = (remittedUsd: number) => Math.max(0, LRS_LIMIT_USD - Math.max(0, remittedUsd));
