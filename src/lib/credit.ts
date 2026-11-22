// Spread: the credit and corporate-profits agent. Reads the corporate bond yield curve, credit spreads and
// corporate profits from FRED, and how they line up with stocks and today's market mood.
// Everything here is pure (no fetching) so it can be tested; src/lib/data/credit.ts loads the series.
import type { Obs, SeriesDef } from './macro';

export const MATURITIES = [1, 2, 5, 10, 20, 30] as const;
export type Maturity = (typeof MATURITIES)[number];

/** HQM corporate yield curve (high-quality, AAA–A US corporate bonds) and the matching Treasury constant maturities. */
export const HQM: Record<Maturity, SeriesDef> = {
  1: { id: 'HQMCB1YR', label: 'Corporate 1-year', units: '%' },
  2: { id: 'HQMCB2YR', label: 'Corporate 2-year', units: '%' },
  5: { id: 'HQMCB5YR', label: 'Corporate 5-year', units: '%' },
  10: { id: 'HQMCB10YR', label: 'Corporate 10-year', units: '%' },
  20: { id: 'HQMCB20YR', label: 'Corporate 20-year', units: '%' },
  30: { id: 'HQMCB30YR', label: 'Corporate 30-year', units: '%' },
};
export const UST: Record<Maturity, SeriesDef> = {
  1: { id: 'GS1', label: 'Treasury 1-year', units: '%' },
  2: { id: 'GS2', label: 'Treasury 2-year', units: '%' },
  5: { id: 'GS5', label: 'Treasury 5-year', units: '%' },
  10: { id: 'GS10', label: 'Treasury 10-year', units: '%' },
  20: { id: 'GS20', label: 'Treasury 20-year', units: '%' },
  30: { id: 'GS30', label: 'Treasury 30-year', units: '%' },
};

/** Spreads, yields, profits and debt. Daily series are converted to monthly averages by FRED. */
export const CREDIT: Record<string, SeriesDef> = {
  ig: { id: 'BAMLC0A0CM', label: 'Investment-grade spread (ICE BofA US Corporate)', units: '% pts', agg: 'avg' },
  hy: { id: 'BAMLH0A0HYM2', label: 'High-yield spread (ICE BofA US High Yield)', units: '% pts', agg: 'avg' },
  aaa: { id: 'BAMLC0A1CAAA', label: 'AAA spread', units: '% pts', agg: 'avg' },
  bbb: { id: 'BAMLC0A4CBBB', label: 'BBB spread', units: '% pts', agg: 'avg' },
  ccc: { id: 'BAMLH0A3HYC', label: 'CCC and lower spread', units: '% pts', agg: 'avg' },
  igy: { id: 'BAMLC0A0CMEY', label: 'Investment-grade yield', units: '%', agg: 'avg' },
  hyy: { id: 'BAMLH0A0HYM2EY', label: 'High-yield yield', units: '%', agg: 'avg' },
  baa10: { id: 'BAA10YM', label: 'Moody’s Baa minus 10-year Treasury', units: '% pts' },
  baa: { id: 'BAA', label: 'Moody’s Baa corporate yield', units: '%' },
  aaam: { id: 'AAA', label: 'Moody’s Aaa corporate yield', units: '%' },
  profits: { id: 'CP', label: 'Corporate profits after tax', units: '$B, annual rate' },
  gdp: { id: 'GDP', label: 'GDP', units: '$B, annual rate' },
  debt: { id: 'BCNSDODNS', label: 'Nonfinancial corporate debt', units: '$B' },
  sp500: { id: 'SP500', label: 'S&P 500', units: 'index', agg: 'avg' },
};

const r2 = (x: number) => Math.round(x * 100) / 100;
const ym = (d: string) => d.slice(0, 7);
export const lastOf = (s: Obs[]) => s.at(-1) ?? null;

/** Value `months` before the last observation, matched by calendar month (works for monthly and quarterly series). */
export function monthsAgo(s: Obs[], months: number): Obs | null {
  const l = lastOf(s); if (!l) return null;
  const d = new Date(`${l.date}T00:00:00Z`); d.setUTCMonth(d.getUTCMonth() - months);
  const target = d.toISOString().slice(0, 7);
  for (let i = s.length - 1; i >= 0; i--) if (ym(s[i].date) <= target) return s[i];
  return null;
}

/** Where the latest value sits in the series' own history, 0–100. */
export function percentile(s: Obs[]): number | null {
  const l = lastOf(s); if (!l || s.length < 12) return null;
  return Math.round((s.filter((o) => o.value <= l.value).length / s.length) * 100);
}

export interface CurvePoint { m: Maturity; corp: number | null; ust: number | null; spread: number | null; corpYearAgo: number | null }

/** The corporate and Treasury curves side by side at each maturity, now and a year ago. */
export function buildCurve(corp: Record<Maturity, Obs[]>, ust: Record<Maturity, Obs[]>): CurvePoint[] {
  return MATURITIES.map((m) => {
    const c = lastOf(corp[m])?.value ?? null, t = lastOf(ust[m])?.value ?? null;
    return { m, corp: c, ust: t, spread: c !== null && t !== null ? r2(c - t) : null, corpYearAgo: monthsAgo(corp[m], 12)?.value ?? null };
  });
}

/** Slope of a curve: long end minus short end, in percentage points. */
export function slope(points: CurvePoint[], key: 'corp' | 'ust', short: Maturity = 2, long: Maturity = 30): number | null {
  const a = points.find((p) => p.m === short)?.[key], b = points.find((p) => p.m === long)?.[key];
  return a === null || a === undefined || b === null || b === undefined ? null : r2(b - a);
}

/** Year-over-year % change of a quarterly series. */
export function yoyQ(s: Obs[]): Obs[] {
  const m = new Map(s.map((o) => [ym(o.date), o.value]));
  return s.flatMap((o) => {
    const d = new Date(`${o.date}T00:00:00Z`); d.setUTCFullYear(d.getUTCFullYear() - 1);
    const p = m.get(d.toISOString().slice(0, 7));
    return p ? [{ date: o.date, value: Math.round(((o.value - p) / p) * 1000) / 10 }] : [];
  });
}

/** A ratio of two series matched by month, in percent (e.g. profits as a share of GDP). */
export function ratioPct(a: Obs[], b: Obs[]): Obs[] {
  const m = new Map(b.map((o) => [ym(o.date), o.value]));
  return a.flatMap((o) => { const v = m.get(ym(o.date)); return v ? [{ date: o.date, value: r2((o.value / v) * 100) }] : []; });
}

export type Band = 'tight' | 'normal' | 'elevated' | 'stress';

/** Spread bands used by credit desks (percentage points over Treasuries). */
export function hyBand(v: number): Band { return v < 3.5 ? 'tight' : v < 5 ? 'normal' : v < 7 ? 'elevated' : 'stress'; }
export function igBand(v: number): Band { return v < 1 ? 'tight' : v < 1.5 ? 'normal' : v < 2 ? 'elevated' : 'stress'; }

export interface RegimeInput {
  hy: number | null; hy3m: number | null;           // level and 3-month change, % pts
  ig: number | null; ig3m: number | null;
  profitsYoy: number | null;                         // % change on a year ago
  spx3m: number | null;                              // S&P 500 % change over 3 months
  corpSlope: number | null;                          // corporate 30y − 2y, % pts
  sentiment: number | null;                          // Pulse SIXXAB Sentiment 0–100
}

export interface Scenario { name: string; odds: 'base' | 'upside' | 'downside'; story: string; signposts: string[]; money: string }
export interface Regime { name: string; tone: 'good' | 'neutral' | 'bad'; read: string; signals: string[]; divergence: string | null; scenarios: Scenario[] }

/**
 * Classify today's credit backdrop and line it up with stocks. Credit usually moves first:
 * when stocks rise while spreads widen, bond investors are seeing risk that stock investors are not (yet).
 */
export function creditRegime(x: RegimeInput): Regime {
  const signals: string[] = [];
  const hb = x.hy !== null ? hyBand(x.hy) : null, ib = x.ig !== null ? igBand(x.ig) : null;
  if (x.hy !== null) signals.push(`High-yield spread ${x.hy.toFixed(2)} pts (${hb})${x.hy3m !== null ? `, ${x.hy3m >= 0 ? 'up' : 'down'} ${Math.abs(x.hy3m).toFixed(2)} in 3 months` : ''}`);
  if (x.ig !== null) signals.push(`Investment-grade spread ${x.ig.toFixed(2)} pts (${ib})${x.ig3m !== null ? `, ${x.ig3m >= 0 ? 'up' : 'down'} ${Math.abs(x.ig3m).toFixed(2)} in 3 months` : ''}`);
  if (x.profitsYoy !== null) signals.push(`Corporate profits ${x.profitsYoy >= 0 ? 'up' : 'down'} ${Math.abs(x.profitsYoy).toFixed(1)}% on a year ago`);
  if (x.corpSlope !== null) signals.push(`Corporate curve ${x.corpSlope >= 0 ? 'upward' : 'inverted'} (30-year minus 2-year ${x.corpSlope >= 0 ? '+' : ''}${x.corpSlope.toFixed(2)} pts)`);
  if (x.spx3m !== null) signals.push(`S&P 500 ${x.spx3m >= 0 ? 'up' : 'down'} ${Math.abs(x.spx3m).toFixed(1)}% over 3 months`);
  if (x.sentiment !== null) signals.push(`Pulse sentiment ${Math.round(x.sentiment)}/100`);

  const widening = (x.hy3m ?? 0) >= 0.5 || (x.ig3m ?? 0) >= 0.2;
  const narrowing = (x.hy3m ?? 0) <= -0.3;
  const profitsUp = (x.profitsYoy ?? 0) > 0;
  const stocksUp = (x.spx3m ?? 0) > 0;

  let divergence: string | null = null;
  if (stocksUp && widening) divergence = 'Stocks are rising while credit spreads widen. Bond investors are asking for more pay to lend to companies even as share prices climb; in the past this gap has often closed with stocks catching down, but not always.';
  else if (!stocksUp && narrowing && x.spx3m !== null) divergence = 'Stocks have fallen while credit spreads narrowed. Bond investors are calmer than stock investors, which has often meant the stock sell-off was about valuations or rates rather than company health.';

  let name: string, tone: Regime['tone'], read: string;
  if (hb === 'stress' || ib === 'stress') { name = 'Credit stress'; tone = 'bad'; read = 'Spreads are at stress levels: lenders are pricing a real risk of defaults. Weaker companies may struggle to refinance.'; }
  else if (widening && !profitsUp) { name = 'Late-cycle squeeze'; tone = 'bad'; read = 'Spreads are widening while profits shrink: the classic late-cycle mix that has come before many slowdowns.'; }
  else if (widening) { name = 'Credit caution'; tone = 'neutral'; read = 'Spreads are widening from their lows even though profits are still growing. Worth watching, not yet a warning.'; }
  else if ((hb === 'tight' || ib === 'tight') && profitsUp) { name = 'Late-cycle calm'; tone = 'neutral'; read = 'Spreads are tight and profits are growing: credit markets are relaxed. Tight spreads leave little cushion if the news turns.'; }
  else if (narrowing && profitsUp) { name = 'Healing'; tone = 'good'; read = 'Spreads are narrowing and profits are growing: lenders are getting more comfortable with corporate risk.'; }
  else if (profitsUp) { name = 'Steady expansion'; tone = 'good'; read = 'Spreads are in their normal range and profits are growing.'; }
  else { name = 'Profit slowdown'; tone = 'neutral'; read = 'Spreads are calm but profits are falling: watch whether lenders start to react.'; }

  const hyNow = x.hy ?? 4;
  const scenarios: Scenario[] = [
    { name: 'Spreads hold, profits grow', odds: 'base', story: 'The current pattern continues: companies refinance without trouble and earnings carry stocks.', signposts: [`High-yield spread stays below ${Math.max(4, Math.ceil(hyNow + 0.5))} pts`, 'Next quarter’s profits rise again on a year ago', 'Investment-grade spread stays under 1.5 pts'], money: 'Steady conditions: keep regular investing and your emergency fund on plan.' },
    { name: 'Soft patch', odds: 'downside', story: 'Growth slows, spreads widen by 1 to 2 points, weaker borrowers pay more and stocks wobble.', signposts: ['High-yield spread rises above 5 pts', 'CCC spread jumps faster than BB and BBB', 'Profits fall on a year ago for a second quarter'], money: 'Check that any variable-rate debt is affordable at higher rates and that your emergency fund covers 6 months.' },
    { name: 'Reflation run', odds: 'upside', story: 'Profits beat, spreads narrow further and companies borrow to expand.', signposts: ['Profits grow faster than 10% a year', 'High-yield spread falls toward 3 pts', 'Corporate curve steepens as long yields rise'], money: 'Good times are when to rebalance and avoid stretching for yield in the riskiest bonds.' },
  ];
  return { name, tone, read, signals, divergence, scenarios };
}
