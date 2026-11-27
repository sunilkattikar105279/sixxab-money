import { unstable_cache } from 'next/cache';
import { fredSeries, fredFetch, yoy, correlation, netLiquidity, last, ago, type Obs } from '../macro';
import { tideScore, moodOf, m2Regime, REGIME_TEXT, impacts, tideHeadline, isFresh, type Impact, type TideMood, type M2Regime } from '../liquidity';
import type { Relation } from './macro';

export interface TideRead {
  available: boolean;
  asOf: string | null;          // month of the latest M2 observation (YYYY-MM-DD, first of month)
  released: string | null;      // FRED "last updated" timestamp for M2SL
  isNew: boolean;               // new M2 print in the last 10 days: show the notice
  level: number | null;         // $B
  yoy: number | null; mom: number | null; yoyChg3: number | null; realYoy: number | null;
  netLiq: number | null; netLiq3mPct: number | null;
  cpiYoy: number | null; fedFunds: number | null; inrYoy: number | null;
  score: number | null; mood: TideMood | null; parts: { label: string; score: number }[];
  regime: M2Regime | null; regimeText: string;
  headline: string;
  impacts: Impact[];
  m2YoyLong: Obs[];             // ~25 years of M2 growth for the long chart
  netLiqSeries: Obs[];
  relations: Relation[];
}

const r1 = (x: number) => Math.round(x * 10) / 10;

function bestLag(a: Obs[], b: Obs[], lags: number[]) {
  let best: { lag: number; r: number } | null = null;
  for (const lag of lags) { const c = correlation(a, b, lag); if (c && (!best || Math.abs(c.r) > Math.abs(best.r))) best = { lag, r: c.r }; }
  return best;
}

async function m2LastUpdated(): Promise<string | null> {
  const key = process.env.FRED_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(`https://api.stlouisfed.org/fred/series?series_id=M2SL&api_key=${key}&file_type=json`, { next: { revalidate: 6 * 3600 } });
    if (!res.ok) return null;
    const j = (await res.json()) as { seriess?: { last_updated?: string }[] };
    return j.seriess?.[0]?.last_updated ?? null;
  } catch { return null; }
}

async function build(): Promise<TideRead> {
  const [m2, m2real, walcl, rrp, tga, cpi, sp500, fedfunds, inr, released] = await Promise.all([
    fredSeries('m2', 26), fredSeries('m2real', 12), fredSeries('walcl', 12), fredSeries('rrp', 12), fredSeries('tga', 12),
    fredSeries('cpi', 12), fredSeries('sp500', 12), fredSeries('fedfunds', 3),
    fredFetch({ id: 'DEXINUS', label: 'USD/INR', units: '₹ per $', agg: 'avg' }, 3), m2LastUpdated(),
  ]);
  const m2y = yoy(m2), m2ry = yoy(m2real), cpiy = yoy(cpi), spy = yoy(sp500), inry = yoy(inr);
  const nl = netLiquidity(walcl, rrp, tga);
  const lm2 = last(m2), pm2 = ago(m2, 1), y = last(m2y)?.value ?? null, y3 = ago(m2y, 3)?.value ?? null;
  const lnl = last(nl), nl3 = ago(nl, 3);
  const netLiq3mPct = lnl && nl3 && nl3.value ? r1(((lnl.value - nl3.value) / Math.abs(nl3.value)) * 100) : null;
  const yoyChg3 = y !== null && y3 !== null ? r1(y - y3) : null;
  const realYoy = last(m2ry)?.value ?? null;
  const { score, parts } = tideScore({ m2Yoy: y, m2YoyChg3: yoyChg3, realYoy, netLiq3mPct });
  const mood = score === null ? null : moodOf(score);
  const regime = y === null ? null : m2Regime(y);
  const ff = last(fedfunds)?.value ?? null, ff12 = ago(fedfunds, 12)?.value ?? null;
  const cpiYoy = last(cpiy)?.value ?? null, inrYoy = last(inry)?.value ?? null;
  const m2Recent = m2y.slice(-132);
  const stocksLink = bestLag(m2Recent, spy, [0, 3, 6, 12]);
  const inflLink = bestLag(m2Recent, cpiy, [6, 12, 18, 24]);

  const relations: Relation[] = [];
  if (inflLink) relations.push({ title: 'M2 growth and inflation', a: { label: 'M2 growth %', series: m2y.slice(-120) }, b: { label: 'CPI inflation %', series: cpiy.slice(-120) }, lag: inflLink.lag, r: inflLink.r, read: `M2 growth lined up best with CPI inflation ${inflLink.lag} months later (correlation ${inflLink.r.toFixed(2)}). A past relationship, not a forecast.` });
  if (stocksLink) relations.push({ title: 'M2 growth and stocks', a: { label: 'M2 growth %', series: m2y.slice(-120) }, b: { label: 'S&P 500, % y/y', series: spy.slice(-120) }, lag: stocksLink.lag, r: stocksLink.r, read: `M2 growth and S&P 500 returns ${stocksLink.lag ? `${stocksLink.lag} months later` : 'in the same months'} had a correlation of ${stocksLink.r.toFixed(2)}. Liquidity is one driver among many.` });
  const nly = yoy(nl);
  const nlStocks = correlation(nly, spy, 0);
  if (nlStocks) relations.push({ title: 'Fed net liquidity and stocks', a: { label: 'Net liquidity, % y/y', series: nly.slice(-120) }, b: { label: 'S&P 500, % y/y', series: spy.slice(-120) }, lag: 0, r: nlStocks.r, read: `Year-on-year changes in Fed net liquidity and the S&P 500 had a correlation of ${nlStocks.r.toFixed(2)}.` });

  return {
    available: m2.length > 0,
    asOf: lm2?.date ?? null, released, isNew: isFresh(released),
    level: lm2?.value ?? null, yoy: y, mom: lm2 && pm2 && pm2.value ? r1(((lm2.value - pm2.value) / pm2.value) * 100) : null,
    yoyChg3, realYoy, netLiq: lnl?.value ?? null, netLiq3mPct, cpiYoy, fedFunds: ff, inrYoy,
    score, mood, parts, regime, regimeText: regime ? REGIME_TEXT[regime] : '',
    headline: tideHeadline(mood, y, netLiq3mPct),
    impacts: impacts({ score, m2Yoy: y, cpiYoy, fedFunds: ff, fedFunds12m: ff !== null && ff12 !== null ? Math.round((ff - ff12) * 100) / 100 : null, inrYoy, stocksLink, inflLink }),
    m2YoyLong: m2y, netLiqSeries: nl.slice(-60), relations,
  };
}

export const getTide = unstable_cache(build, ['tide-v1'], { revalidate: 6 * 3600 });

/** Compact read for the Tide agent and the daily brief (/api/m2). */
export function tideBrief(t: TideRead) {
  const month = t.asOf ? new Date(`${t.asOf}T12:00:00Z`).toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }) : null;
  return {
    agent: 'Tide · Liquidity & M2', month, released: t.released, new_print: t.isNew,
    level: t.level !== null ? `$${(t.level / 1000).toFixed(2)}T` : null, yoy: t.yoy, mom: t.mom, yoy_change_3m: t.yoyChg3, real_m2_yoy: t.realYoy,
    net_liquidity: t.netLiq !== null ? `$${(t.netLiq / 1000).toFixed(2)}T` : null, net_liquidity_3m_pct: t.netLiq3mPct,
    score: t.score, mood: t.mood, score_parts: t.parts, regime: t.regime, regime_text: t.regimeText, headline: t.headline,
    impacts: t.impacts, relationships: t.relations.map((r) => r.read),
    caption_line: t.level !== null && t.yoy !== null && month ? `M2: US money supply $${(t.level / 1000).toFixed(1)}T, ${t.yoy >= 0 ? '+' : ''}${t.yoy.toFixed(1)}% y/y (FRED M2SL, ${month}) · Tide ${t.score ?? '—'}/100 ${t.mood ?? ''}` : null,
    source: 'FRED, Federal Reserve Bank of St. Louis (M2SL, M2REAL, WALCL, RRPONTSYD, WTREGEN, CPIAUCSL, SP500, DFF, DEXINUS)',
    note: 'Readings of past data and past relationships, not a forecast. Educational, not financial advice.',
  };
}
