// SIXXAB Strategy Portfolios: rules-based model portfolios rebalanced on the first trading day of each month,
// each with a backtest against the S&P 500 and its current holdings. Pure functions; data in scripts/portfolios.ts.
// Model portfolios are education: rules applied to public data, the same for every reader, never personal advice.

export type Weights = Record<string, number>;
export interface PriceBook { dates: string[]; close: Record<string, (number | null)[]> } // aligned to the benchmark calendar

export interface StrategyDef {
  id: string; name: string; tagline: string; style: string; risk: 'Low' | 'Medium' | 'High';
  agent: string;            // which SIXXAB agent runs it
  method: string[];         // plain-English rules
  backtest: boolean;        // false = tracked live from launch only (needs point-in-time company data)
}

export const STRATEGIES: StrategyDef[] = [
  { id: 'momentum-leaders', name: 'Momentum Leaders', tagline: 'The strongest large US stocks of the past year, refreshed monthly', style: 'Growth · momentum', risk: 'High', agent: 'Quant',
    method: ['Universe: about 100 of the largest US companies.', 'Rank by 12-month return, skipping the latest month (the classic 12-1 momentum measure).', 'Keep the top 10 that also trade above their 200-day average.', 'Equal weight, rebalanced on the first trading day of each month.', 'If fewer than 5 qualify, the empty slots sit in cash.'], backtest: true },
  { id: 'defensive-steady', name: 'Defensive Steady', tagline: 'Calm, lower-volatility large caps that are still trending up', style: 'Defensive · low volatility', risk: 'Low', agent: 'Sigma',
    method: ['Universe: about 100 of the largest US companies.', 'Keep stocks with a positive 12-month return.', 'Pick the 10 with the lowest daily price swings (volatility) over the past year.', 'Equal weight, rebalanced monthly.'], backtest: true },
  { id: 'trend-guard', name: 'Trend Guard', tagline: 'The S&P 500 when it is above its 200-day average, cash-like Treasuries when it is not', style: 'Index · risk control', risk: 'Medium', agent: 'Pivot',
    method: ['Holds SPY (S&P 500 ETF) while SPY closed the month above its 200-day average.', 'Moves to BIL (1–3 month Treasury bills) when it closed below.', 'Checked on the first trading day of each month.', 'Aims to sit out long bear markets; it can lag in sharp V-shaped recoveries.'], backtest: true },
  { id: 'all-weather', name: 'All-Weather Mix', tagline: 'Stocks, long and medium bonds, gold and commodities for every season', style: 'Balanced · diversified', risk: 'Low', agent: 'Macro',
    method: ['30% VTI (US stocks), 40% TLT (long Treasuries), 15% IEF (medium Treasuries), 7.5% GLD (gold), 7.5% DBC (commodities).', 'A widely published "all-weather" style mix: some part of it tends to hold up in growth, recession, inflation and deflation.', 'Rebalanced back to target weights monthly.'], backtest: true },
  { id: 'tide-tilt', name: 'Tide Tilt', tagline: 'More stocks when the money tide is rising, more bonds when it ebbs', style: 'Macro · liquidity', risk: 'Medium', agent: 'Tide',
    method: ['80% SPY / 20% IEF when the SPY 200-day trend is up and 6-month momentum is positive.', '50% / 50% when only one of those is true.', '20% / 80% when both are negative.', 'Live version adds the Tide liquidity score from M2 and Fed net liquidity (money.sixxab.com/liquidity) as a tiebreaker.', 'Rebalanced monthly.'], backtest: true },
  { id: 'quality-moats', name: 'Quality Moats', tagline: 'Growing revenue, solid margins, cash coming in, little debt', style: 'Quality · business strength', risk: 'Medium', agent: 'Moat',
    method: ['Universe: the SIXXAB US screener list.', 'Reads the latest SEC filings: revenue growth, net margin, operating cash flow and debt to equity.', 'Keeps the 8 strongest business scores that are not in a weekly downtrend.', 'Equal weight, rebalanced monthly.', 'Tracked live from launch: past company results as they were known at the time are not stored, so there is no honest backtest.'], backtest: false },
];

/** Broad US large-cap list for the stock strategies (current members, so backtests carry survivorship bias). */
export const US_LARGE = ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL', 'META', 'BRK.B', 'AVGO', 'TSLA', 'LLY', 'JPM', 'V', 'UNH', 'XOM', 'MA', 'JNJ', 'PG', 'HD', 'COST', 'ABBV', 'MRK', 'CVX', 'KO', 'PEP', 'ADBE', 'CRM', 'WMT', 'BAC', 'MCD', 'CSCO', 'ACN', 'TMO', 'ABT', 'LIN', 'NFLX', 'AMD', 'ORCL', 'DHR', 'WFC', 'TXN', 'DIS', 'PM', 'INTU', 'CAT', 'VZ', 'AMGN', 'QCOM', 'IBM', 'GE', 'NOW', 'UNP', 'HON', 'SPGI', 'LOW', 'GS', 'BA', 'RTX', 'AMAT', 'ISRG', 'BKNG', 'ELV', 'PLD', 'SBUX', 'MDT', 'BLK', 'DE', 'T', 'AXP', 'GILD', 'LMT', 'SYK', 'ADI', 'MDLZ', 'TJX', 'CVS', 'MMC', 'C', 'ADP', 'VRTX', 'REGN', 'CB', 'MO', 'SO', 'DUK', 'BMY', 'ZTS', 'PGR', 'CI', 'SCHW', 'MU', 'LRCX', 'EQIX', 'NEE', 'PANW', 'KLAC', 'COP', 'UPS', 'NKE', 'MS', 'FI'];
export const ETF_SET = ['SPY', 'BIL', 'VTI', 'TLT', 'IEF', 'GLD', 'DBC'];

const at = (b: PriceBook, s: string, i: number) => { const v = b.close[s]?.[i]; return v == null || !Number.isFinite(v) ? null : v; };
const sma = (b: PriceBook, s: string, i: number, n: number) => {
  if (i < n - 1) return null; let sum = 0;
  for (let k = i - n + 1; k <= i; k++) { const v = at(b, s, k); if (v === null) return null; sum += v; }
  return sum / n;
};
const ret = (b: PriceBook, s: string, i: number, from: number, to = 0) => { const a = at(b, s, i - from), c = at(b, s, i - to); return a && c ? c / a - 1 : null; };
function vol(b: PriceBook, s: string, i: number, n = 252) {
  if (i < n) return null; const r: number[] = [];
  for (let k = i - n + 1; k <= i; k++) { const a = at(b, s, k - 1), c = at(b, s, k); if (a === null || c === null) return null; r.push(Math.log(c / a)); }
  const m = r.reduce((x, y) => x + y, 0) / r.length; return Math.sqrt(r.reduce((x, y) => x + (y - m) ** 2, 0) / r.length);
}
const equal = (syms: string[], slots: number): Weights => Object.fromEntries(syms.map((s) => [s, 1 / Math.max(slots, syms.length)]));

/** Target weights for a strategy on trading day i (uses data up to and including day i only). Missing weight = cash. */
export function targetWeights(id: string, b: PriceBook, i: number, universe: string[]): Weights {
  if (id === 'momentum-leaders') {
    const ranked = universe.map((s) => ({ s, r: ret(b, s, i, 252, 21), px: at(b, s, i), ma: sma(b, s, i, 200) }))
      .filter((x) => x.r !== null && x.px !== null && x.ma !== null && x.px > x.ma).sort((a, c) => c.r! - a.r!);
    const top = ranked.slice(0, 10).map((x) => x.s);
    return equal(top, 10);
  }
  if (id === 'defensive-steady') {
    const ok = universe.map((s) => ({ s, r: ret(b, s, i, 252), v: vol(b, s, i) })).filter((x) => x.r !== null && x.r > 0 && x.v !== null).sort((a, c) => a.v! - c.v!);
    return equal(ok.slice(0, 10).map((x) => x.s), 10);
  }
  if (id === 'trend-guard') {
    const px = at(b, 'SPY', i), ma = sma(b, 'SPY', i, 200);
    return px !== null && ma !== null && px < ma ? { BIL: 1 } : { SPY: 1 };
  }
  if (id === 'all-weather') return { VTI: 0.3, TLT: 0.4, IEF: 0.15, GLD: 0.075, DBC: 0.075 };
  if (id === 'tide-tilt') {
    const px = at(b, 'SPY', i), ma = sma(b, 'SPY', i, 200), m6 = ret(b, 'SPY', i, 126);
    const n = (px !== null && ma !== null && px > ma ? 1 : 0) + (m6 !== null && m6 > 0 ? 1 : 0);
    const eq = n === 2 ? 0.8 : n === 1 ? 0.5 : 0.2;
    return { SPY: eq, IEF: 1 - eq };
  }
  return {};
}

export interface PortfolioResult {
  curve: { d: string; v: number; bench: number }[];
  totalReturnPct: number; cagrPct: number; maxDrawdownPct: number; volPct: number; bestYearPct: number | null; worstYearPct: number | null;
  benchTotalReturnPct: number; benchCagrPct: number; benchMaxDrawdownPct: number;
  yearly: { year: string; pct: number; bench: number }[];
  holdings: { symbol: string; weight: number }[];
  changes: { added: string[]; removed: string[] };
  turnoverPct: number; // average monthly turnover
  rebalancedOn: string;
}

const r1 = (x: number) => Math.round(x * 10) / 10;
function dd(vs: number[]) { let peak = -Infinity, m = 0; for (const v of vs) { peak = Math.max(peak, v); m = Math.max(m, (peak - v) / peak); } return r1(m * 100); }

/** Monthly-rebalanced backtest with trading costs on turnover. Starts once `warmup` bars exist. */
export function runPortfolio(id: string, b: PriceBook, universe: string[], opts: { warmup?: number; costPct?: number; bench?: string } = {}): PortfolioResult {
  const warmup = opts.warmup ?? 260, cost = (opts.costPct ?? 0.05) / 100, bench = opts.bench ?? 'SPY';
  let value = 1, w: Weights = {}, prevW: Weights = {}, turnover = 0, rebalances = 0, lastReb = '';
  const curve: PortfolioResult['curve'] = [];
  const b0 = at(b, bench, warmup) ?? 1;
  for (let i = warmup; i < b.dates.length; i++) {
    if (i > warmup) {
      // Daily return of yesterday's weights; missing prices count as flat.
      let r = 0;
      for (const [s, wt] of Object.entries(w)) { const a = at(b, s, i - 1), c = at(b, s, i); if (a && c) r += wt * (c / a - 1); }
      value *= 1 + r;
      // Weights drift with prices.
      const tot = Object.entries(w).reduce((x, [s, wt]) => { const a = at(b, s, i - 1), c = at(b, s, i); return x + wt * (a && c ? c / a : 1); }, 0) + (1 - Object.values(w).reduce((x, y) => x + y, 0));
      w = Object.fromEntries(Object.entries(w).map(([s, wt]) => { const a = at(b, s, i - 1), c = at(b, s, i); return [s, (wt * (a && c ? c / a : 1)) / tot]; }));
    }
    const newMonth = i === warmup || b.dates[i].slice(0, 7) !== b.dates[i - 1].slice(0, 7);
    if (newMonth) {
      const t = targetWeights(id, b, i, universe);
      const keys = new Set([...Object.keys(w), ...Object.keys(t)]);
      const tv = [...keys].reduce((x, s) => x + Math.abs((t[s] ?? 0) - (w[s] ?? 0)), 0);
      value *= 1 - tv * cost; if (i > warmup) { turnover += tv / 2; rebalances++; }
      prevW = w; w = t; lastReb = b.dates[i];
    }
    curve.push({ d: b.dates[i], v: value, bench: (at(b, bench, i) ?? b0) / b0 });
  }
  const end = curve.at(-1)?.v ?? 1, bend = curve.at(-1)?.bench ?? 1;
  const span = curve.length > 1 ? (Date.parse(curve.at(-1)!.d) - Date.parse(curve[0].d)) / 864e5 : 0;
  const cagr = (x: number) => (span > 0 ? (Math.pow(x, 365.25 / span) - 1) * 100 : 0);
  const years = new Map<string, { a: number; z: number; ba: number; bz: number }>();
  for (const c of curve) { const y = c.d.slice(0, 4); const e = years.get(y); if (!e) years.set(y, { a: c.v, z: c.v, ba: c.bench, bz: c.bench }); else { e.z = c.v; e.bz = c.bench; } }
  // Year return measured from the previous year's close.
  const ys = [...years.entries()]; const yearly: PortfolioResult['yearly'] = [];
  ys.forEach(([y, e], k) => { const pa = k ? ys[k - 1][1].z : e.a, pb = k ? ys[k - 1][1].bz : e.ba; yearly.push({ year: y, pct: r1((e.z / pa - 1) * 100), bench: r1((e.bz / pb - 1) * 100) }); });
  const full = yearly.slice(1, -1).length ? yearly.slice(1, -1) : yearly;
  const dr: number[] = []; for (let k = 1; k < curve.length; k++) dr.push(curve[k].v / curve[k - 1].v - 1);
  const mean = dr.reduce((x, y) => x + y, 0) / Math.max(1, dr.length);
  const sd = Math.sqrt(dr.reduce((x, y) => x + (y - mean) ** 2, 0) / Math.max(1, dr.length));
  const held = Object.entries(w).filter(([, x]) => x > 0.0001).map(([symbol, weight]) => ({ symbol, weight: r1(weight * 100) })).sort((a, c) => c.weight - a.weight);
  const prevKeys = new Set(Object.keys(prevW).filter((s) => (prevW[s] ?? 0) > 0)), nowKeys = new Set(held.map((h) => h.symbol));
  return {
    curve: curve.map((c) => ({ d: c.d, v: Math.round(c.v * 10000) / 100, bench: Math.round(c.bench * 10000) / 100 })),
    totalReturnPct: r1((end - 1) * 100), cagrPct: r1(cagr(end)), maxDrawdownPct: dd(curve.map((c) => c.v)), volPct: r1(sd * Math.sqrt(252) * 100),
    bestYearPct: full.length ? Math.max(...full.map((y) => y.pct)) : null, worstYearPct: full.length ? Math.min(...full.map((y) => y.pct)) : null,
    benchTotalReturnPct: r1((bend - 1) * 100), benchCagrPct: r1(cagr(bend)), benchMaxDrawdownPct: dd(curve.map((c) => c.bench)), yearly,
    holdings: held, changes: { added: [...nowKeys].filter((s) => !prevKeys.has(s)), removed: [...prevKeys].filter((s) => !nowKeys.has(s)) },
    turnoverPct: rebalances ? r1((turnover / rebalances) * 100) : 0, rebalancedOn: lastReb,
  };
}
