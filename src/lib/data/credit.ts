import { fredFetch, correlation, strength, yoy, type Obs } from '../macro';
import { CREDIT, HQM, UST, MATURITIES, buildCurve, slope, yoyQ, ratioPct, percentile, monthsAgo, lastOf, creditRegime, hyBand, igBand, type CurvePoint, type Maturity, type Regime } from '../credit';
import type { Relation, Tile } from './macro';
import { getSentiment } from './regime';

export interface CreditSnapshot {
  available: boolean;
  asOf: string | null;
  curve: CurvePoint[];
  corpSlope: number | null; ustSlope: number | null;
  spreads: Tile[]; profits: Tile[];
  ladder: { label: string; value: number | null; prev: number | null }[];
  relations: Relation[];
  regime: Regime;
  pulse: { score: number; mood: string; credit: string | null; asOf: string } | null;
}

const f2 = (x: number | null | undefined) => (x === null || x === undefined || !Number.isFinite(x) ? '—' : x.toFixed(2));
const sg = (x: number | null | undefined, d = 2) => (x === null || x === undefined ? '—' : `${x >= 0 ? '+' : ''}${x.toFixed(d)}`);
const chg = (s: Obs[], months: number) => { const l = lastOf(s), p = monthsAgo(s, months); return l && p ? Math.round((l.value - p.value) * 100) / 100 : null; };
const pctChg = (s: Obs[], months: number) => { const l = lastOf(s), p = monthsAgo(s, months); return l && p && p.value ? Math.round(((l.value - p.value) / p.value) * 1000) / 10 : null; };

export async function creditSnapshot(): Promise<CreditSnapshot> {
  const keys = Object.keys(CREDIT);
  const [series, corp, ust, pulse] = await Promise.all([
    Promise.all(keys.map(async (k) => [k, await fredFetch(CREDIT[k], k === 'baa10' ? 30 : 12)] as const)).then(Object.fromEntries) as Promise<Record<string, Obs[]>>,
    Promise.all(MATURITIES.map(async (m) => [m, await fredFetch(HQM[m], 3)] as const)).then(Object.fromEntries) as Promise<Record<Maturity, Obs[]>>,
    Promise.all(MATURITIES.map(async (m) => [m, await fredFetch(UST[m], 3)] as const)).then(Object.fromEntries) as Promise<Record<Maturity, Obs[]>>,
    getSentiment().catch(() => null),
  ]);
  const s = series;
  const available = keys.some((k) => s[k].length > 0) || MATURITIES.some((m) => corp[m].length > 0);

  const curve = buildCurve(corp, ust);
  const corpSlope = slope(curve, 'corp'), ustSlope = slope(curve, 'ust');

  const hy = lastOf(s.hy)?.value ?? null, ig = lastOf(s.ig)?.value ?? null, baa = lastOf(s.baa10)?.value ?? null;
  const hy3 = chg(s.hy, 3), ig3 = chg(s.ig, 3);
  const spreads: Tile[] = [
    { key: 'ig', label: 'Investment-grade spread', value: `${f2(ig)} pts`, sub: ig !== null ? `${igBand(ig)} · ${sg(ig3)} in 3 months` : '', date: lastOf(s.ig)?.date ?? null, series: s.ig.slice(-60), means: 'Extra yield high-quality companies pay over Treasuries. Under 1 point is tight; above 2 is stress.', tone: ig !== null ? (igBand(ig) === 'stress' ? 'bad' : igBand(ig) === 'elevated' ? 'bad' : 'neutral') : 'neutral' },
    { key: 'hy', label: 'High-yield spread', value: `${f2(hy)} pts`, sub: hy !== null ? `${hyBand(hy)} · ${sg(hy3)} in 3 months` : '', date: lastOf(s.hy)?.date ?? null, series: s.hy.slice(-60), means: 'Extra yield riskier companies pay. Widening spreads have often come before stock sell-offs and slowdowns.', tone: hy !== null ? (hyBand(hy) === 'stress' || hyBand(hy) === 'elevated' ? 'bad' : hy3 !== null && hy3 < 0 ? 'good' : 'neutral') : 'neutral' },
    { key: 'baa10', label: 'Baa minus 10-year Treasury', value: `${f2(baa)} pts`, sub: percentile(s.baa10) !== null ? `higher than ${percentile(s.baa10)}% of months since ${s.baa10[0]?.date.slice(0, 4)}` : '', date: lastOf(s.baa10)?.date ?? null, series: s.baa10.slice(-120), means: 'Moody’s long-running spread for lower investment-grade companies: the longest history for judging today’s level.' },
    { key: 'igy', label: 'Investment-grade yield', value: `${f2(lastOf(s.igy)?.value)}%`, sub: `${sg(chg(s.igy, 12))} pts vs a year ago`, date: lastOf(s.igy)?.date ?? null, series: s.igy.slice(-60), means: 'What a quality company pays to borrow. Higher yields raise interest costs as old debt is refinanced.' },
    { key: 'hyy', label: 'High-yield yield', value: `${f2(lastOf(s.hyy)?.value)}%`, sub: `${sg(chg(s.hyy, 12))} pts vs a year ago`, date: lastOf(s.hyy)?.date ?? null, series: s.hyy.slice(-60), means: 'Borrowing cost for riskier companies; very high yields squeeze small and indebted firms first.' },
  ];
  const ladder = [
    { label: 'AAA', s: s.aaa }, { label: 'BBB', s: s.bbb }, { label: 'High yield', s: s.hy }, { label: 'CCC & lower', s: s.ccc },
  ].map((r) => ({ label: r.label, value: lastOf(r.s)?.value ?? null, prev: monthsAgo(r.s, 3)?.value ?? null }));

  const profY = yoyQ(s.profits), share = ratioPct(s.profits, s.gdp), debtY = yoyQ(s.debt);
  const lp = lastOf(s.profits), py = lastOf(profY)?.value ?? null;
  const profits: Tile[] = [
    { key: 'cp', label: 'Corporate profits after tax', value: lp ? `$${(lp.value / 1000).toFixed(2)}T` : '—', sub: py !== null ? `${sg(py, 1)}% on a year ago (annual rate)` : '', date: lp?.date ?? null, series: s.profits.slice(-40), means: 'Profits pay for wages, investment, dividends and buybacks, and in the end support share prices.', tone: py !== null ? (py >= 0 ? 'good' : 'bad') : 'neutral' },
    { key: 'share', label: 'Profits as a share of GDP', value: `${f2(lastOf(share)?.value)}%`, sub: lastOf(share) && monthsAgo(share, 12) ? `${sg(lastOf(share)!.value - monthsAgo(share, 12)!.value)} pts vs a year ago` : '', date: lastOf(share)?.date ?? null, series: share.slice(-40), means: 'A rough gauge of profit margins across the economy. High shares have tended to drift back toward the average over time.' },
    { key: 'debt', label: 'Nonfinancial corporate debt', value: lastOf(s.debt) ? `$${(lastOf(s.debt)!.value / 1e6).toFixed(1)}T` : '—', sub: lastOf(debtY) ? `${sg(lastOf(debtY)!.value, 1)}% on a year ago` : '', date: lastOf(s.debt)?.date ?? null, series: s.debt.slice(-40).map((o) => ({ date: o.date, value: Math.round(o.value / 1000) })), means: 'Debt growing faster than profits makes companies more sensitive to higher rates.' },
  ];

  // Relationships with stocks (past correlations, not forecasts).
  const spy = yoy(s.sp500), spyQ = spy.filter((o) => ['01', '04', '07', '10'].includes(o.date.slice(5, 7)));
  const relations: Relation[] = [];
  const pr = correlation(profY, spyQ, 0);
  if (pr) relations.push({ title: 'Corporate profits and stocks', a: { label: 'Profits, % y/y', series: profY.slice(-40) }, b: { label: 'S&P 500, % y/y', series: spy.slice(-120) }, lag: 0, r: pr.r, read: `Year-on-year profit growth and S&P 500 returns show a ${strength(pr.r)} (r = ${pr.r}) over ${Math.round(pr.n / 4)} years.` });
  const hr = correlation(s.hy, spy, 0);
  if (hr) relations.push({ title: 'High-yield spreads and stocks', a: { label: 'High-yield spread, pts', series: s.hy.slice(-120) }, b: { label: 'S&P 500, % y/y', series: spy.slice(-120) }, lag: 0, r: hr.r, read: `The high-yield spread and S&P 500 returns show a ${strength(hr.r)} (r = ${hr.r}): when lenders demand more, stocks have usually been weaker.` });
  const br = correlation(s.baa10, spy, 0);
  if (br && !hr) relations.push({ title: 'Baa spread and stocks', a: { label: 'Baa − 10y, pts', series: s.baa10.slice(-120) }, b: { label: 'S&P 500, % y/y', series: spy.slice(-120) }, lag: 0, r: br.r, read: `Moody’s Baa spread and S&P 500 returns show a ${strength(br.r)} (r = ${br.r}).` });

  const credComp = pulse?.regions.flatMap((r) => r.components).find((c) => c.key === 'credit');
  const regime = creditRegime({ hy, hy3m: hy3, ig, ig3m: ig3, profitsYoy: py, spx3m: pctChg(s.sp500, 3), corpSlope, sentiment: pulse?.score ?? null });
  const asOf = [lastOf(s.hy)?.date, lastOf(s.ig)?.date, lastOf(corp[10])?.date].filter(Boolean).sort().at(-1) ?? null;
  return {
    available, asOf, curve, corpSlope, ustSlope, spreads, profits, ladder, relations, regime,
    pulse: pulse ? { score: pulse.score, mood: pulse.mood, credit: credComp ? `${credComp.label} ${credComp.value}: ${credComp.read} (score ${Math.round(credComp.score)}/100)` : null, asOf: pulse.asOf } : null,
  };
}

/** Compact data for the Spread agent. */
export function creditBrief(c: CreditSnapshot): Record<string, unknown> {
  const tiles = (t: Tile[]) => t.map((x) => ({ label: x.label, value: x.value, change: x.sub, asOf: x.date }));
  return {
    asOf: c.asOf,
    regime: { name: c.regime.name, read: c.regime.read, signals: c.regime.signals, divergence: c.regime.divergence },
    corporateCurve: c.curve.map((p) => ({ years: p.m, corporate: p.corp, treasury: p.ust, spread: p.spread, corporateYearAgo: p.corpYearAgo })),
    slopes: { corporate30yMinus2y: c.corpSlope, treasury30yMinus2y: c.ustSlope },
    spreads: tiles(c.spreads), ratingLadder: c.ladder, profits: tiles(c.profits),
    relationsWithStocks: c.relations.map((r) => ({ title: r.title, r: r.r, read: r.read })),
    scenarios: c.regime.scenarios,
    pulse: c.pulse,
  };
}
