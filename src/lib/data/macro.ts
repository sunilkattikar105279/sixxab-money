import { MACRO, fredSeries, yoy, diff, correlation, netLiquidity, mortgagePayment, last, ago, strength, recessionWatch, sahmGap, type Obs } from '../macro';

export interface Tile { key: string; label: string; value: string; sub: string; date: string | null; series: Obs[]; means: string; tone?: 'good' | 'bad' | 'neutral' }
export interface Relation { title: string; a: { label: string; series: Obs[] }; b: { label: string; series: Obs[] }; lag: number; r: number | null; read: string }
export interface MacroSnapshot { money: Tile[]; housing: Tile[]; economy: Tile[]; relations: Relation[]; housingRelation: Relation | null; watch: { flags: string[]; read: string }; housingRead: string; available: boolean }

const f1 = (x: number | null | undefined, d = 1) => (x === null || x === undefined || !Number.isFinite(x) ? '—' : x.toFixed(d));
const sign = (x: number | null | undefined, d = 1) => (x === null || x === undefined ? '—' : `${x >= 0 ? '+' : ''}${x.toFixed(d)}`);
const tn = (b: number) => `$${(b / 1000).toFixed(2)}T`;

function bestLag(a: Obs[], b: Obs[], lags: number[]) {
  let best: { lag: number; r: number } | null = null;
  for (const lag of lags) { const c = correlation(a, b, lag); if (c && (!best || Math.abs(c.r) > Math.abs(best.r))) best = { lag, r: c.r }; }
  return best;
}

export async function macroSnapshot(): Promise<MacroSnapshot> {
  const keys = Object.keys(MACRO);
  const all = Object.fromEntries(await Promise.all(keys.map(async (k) => [k, await fredSeries(k)] as const))) as Record<string, Obs[]>;
  const available = keys.some((k) => all[k].length > 0);

  // Money and liquidity
  const m2y = yoy(all.m2), m2ry = yoy(all.m2real), cpiy = yoy(all.cpi), spy = yoy(all.sp500), walcly = yoy(all.walcl);
  const nl = netLiquidity(all.walcl, all.rrp, all.tga), nly = yoy(nl);
  const lm2 = last(all.m2), lnl = last(nl), nl3 = ago(nl, 3);
  const money: Tile[] = [
    { key: 'm2', label: 'M2 money supply', value: lm2 ? tn(lm2.value) : '—', sub: `${sign(last(m2y)?.value)}% on a year ago`, date: lm2?.date ?? null, series: all.m2.slice(-60), means: 'Cash, checking, savings and money-market funds. Faster growth has tended to lift prices of goods and assets later.', tone: (last(m2y)?.value ?? 0) > 8 ? 'bad' : 'neutral' },
    { key: 'm2real', label: 'Real M2', value: `${sign(last(m2ry)?.value)}%`, sub: 'growth after inflation, year on year', date: last(all.m2real)?.date ?? null, series: m2ry.slice(-60), means: 'Money growth minus inflation: negative means money is getting tighter in real terms.' },
    { key: 'm2v', label: 'Velocity of M2', value: f1(last(all.m2v)?.value, 2), sub: `${sign((last(all.m2v)?.value ?? 0) - (ago(all.m2v, 4)?.value ?? 0), 2)} vs a year ago`, date: last(all.m2v)?.date ?? null, series: all.m2v.slice(-40), means: 'How often each dollar is spent. Rising velocity with rising M2 adds inflation pressure.' },
    { key: 'walcl', label: 'Fed balance sheet', value: last(all.walcl) ? tn(last(all.walcl)!.value / 1000) : '—', sub: `${sign(last(walcly)?.value)}% on a year ago`, date: last(all.walcl)?.date ?? null, series: all.walcl.slice(-60).map((o) => ({ date: o.date, value: Math.round(o.value / 1000) })), means: 'Shrinking (quantitative tightening) drains money from markets; growing adds it.' },
    { key: 'netliq', label: 'Fed net liquidity', value: lnl ? tn(lnl.value) : '—', sub: lnl && nl3 ? `${sign((lnl.value - nl3.value) / 1000, 2)}T in 3 months` : '', date: lnl?.date ?? null, series: nl.slice(-60), means: 'Balance sheet minus reverse repo and the Treasury account. Markets have often moved with it.', tone: lnl && nl3 ? (lnl.value >= nl3.value ? 'good' : 'bad') : 'neutral' },
  ];
  const relations: Relation[] = [];
  const infl = bestLag(m2y, cpiy, [6, 12, 18, 24]);
  if (infl) relations.push({ title: 'M2 growth and inflation', a: { label: 'M2 growth %', series: m2y.slice(-120) }, b: { label: 'CPI inflation %', series: cpiy.slice(-120) }, lag: infl.lag, r: infl.r, read: `Over the past 12 years, M2 growth showed a ${strength(infl.r)} with inflation about ${infl.lag} months later (r = ${infl.r}).` });
  const stx = correlation(nly, spy, 0);
  if (stx) relations.push({ title: 'Fed net liquidity and stocks', a: { label: 'Net liquidity, % y/y', series: nly.slice(-120) }, b: { label: 'S&P 500, % y/y', series: spy.slice(-120) }, lag: 0, r: stx.r, read: `Year-on-year changes in Fed net liquidity and the S&P 500 show a ${strength(stx.r)} (r = ${stx.r}) over ${Math.round(stx.n / 12)} years.` });
  const m2s = bestLag(m2y, spy, [0, 3, 6, 12]);
  if (m2s) relations.push({ title: 'M2 growth and stocks', a: { label: 'M2 growth %', series: m2y.slice(-120) }, b: { label: 'S&P 500, % y/y', series: spy.slice(-120) }, lag: m2s.lag, r: m2s.r, read: `M2 growth and S&P 500 returns ${m2s.lag ? `${m2s.lag} months later ` : ''}show a ${strength(m2s.r)} (r = ${m2s.r}). Liquidity is one driver among many: earnings and rates matter too.` });

  // Housing
  const csy = yoy(all.cs), exy = yoy(all.exist), hsy = yoy(all.houst), pmy = yoy(all.permit);
  const price = last(all.mspus)?.value ?? null, priceYa = ago(all.mspus, 4)?.value ?? null, rate = last(all.mort)?.value ?? null, rateYa = ago(all.mort, 12)?.value ?? null;
  const pay = price && rate ? mortgagePayment(price, rate) : null, payYa = priceYa && rateYa ? mortgagePayment(priceYa, rateYa) : null;
  const ms = last(all.msacsr)?.value ?? null;
  const housing: Tile[] = [
    { key: 'mort', label: '30-year mortgage rate', value: `${f1(rate, 2)}%`, sub: rate && rateYa ? `${sign(rate - rateYa, 2)} pts vs a year ago` : '', date: last(all.mort)?.date ?? null, series: all.mort.slice(-60), means: 'Each 1-point rise adds roughly 10–12% to the monthly payment on the same loan.' },
    { key: 'pay', label: 'Payment on a median new home', value: pay ? `$${pay.toLocaleString('en-US')}/mo` : '—', sub: pay && payYa ? `${sign(((pay - payYa) / payYa) * 100)}% vs a year ago (20% down, principal and interest)` : '20% down, principal and interest', date: last(all.mspus)?.date ?? null, series: [], means: 'Affordability in one number: the median price at today’s mortgage rate.', tone: pay && payYa ? (pay > payYa ? 'bad' : 'good') : 'neutral' },
    { key: 'cs', label: 'Home prices (Case-Shiller)', value: `${sign(last(csy)?.value)}%`, sub: 'year on year, national', date: last(all.cs)?.date ?? null, series: csy.slice(-60), means: 'Rising prices build owners’ equity but push first-time buyers further away.' },
    { key: 'exist', label: 'Existing-home sales', value: last(all.exist) ? `${(last(all.exist)!.value / 1e6).toFixed(2)}M` : '—', sub: `${sign(last(exy)?.value)}% on a year ago, annual rate`, date: last(all.exist)?.date ?? null, series: all.exist.slice(-60).map((o) => ({ date: o.date, value: Math.round(o.value / 1000) })), means: 'Sales slow when rates rise and owners stay put with old low-rate loans.' },
    { key: 'houst', label: 'Housing starts', value: last(all.houst) ? `${Math.round(last(all.houst)!.value)}K` : '—', sub: `${sign(last(hsy)?.value)}% on a year ago · permits ${sign(last(pmy)?.value)}%`, date: last(all.houst)?.date ?? null, series: all.houst.slice(-60), means: 'New building: permits lead starts by a few months and signal builders’ confidence.' },
    { key: 'msacsr', label: 'Months of new-home supply', value: f1(ms), sub: ms === null ? '' : ms > 6 ? 'buyers’ market (above 6)' : ms < 4 ? 'sellers’ market (below 4)' : 'balanced (4–6)', date: last(all.msacsr)?.date ?? null, series: all.msacsr.slice(-60), means: 'How long current listings would last at today’s sales pace.' },
  ];
  const hr = correlation(all.mort.slice(-150), exy, 6);
  const housingRelation: Relation | null = hr ? { title: 'Mortgage rates and home sales', a: { label: 'Mortgage rate %', series: all.mort.slice(-120) }, b: { label: 'Existing-home sales, % y/y', series: exy.slice(-120) }, lag: 6, r: hr.r, read: `Mortgage rates and home sales about 6 months later show a ${strength(hr.r)} (r = ${hr.r}).` } : null;
  const housingRead = rate === null ? '' : `${rate >= 6.5 ? 'Mortgage rates are high, so affordability is stretched' : rate >= 5 ? 'Mortgage rates are moderate' : 'Mortgage rates are low'}${ms !== null ? `, and new-home supply is ${ms > 6 ? 'ample (a buyers’ market)' : ms < 4 ? 'tight (a sellers’ market)' : 'balanced'}` : ''}.`;

  // Economy
  const corey = yoy(all.corepce), pay1 = diff(all.payems), rsy = yoy(all.rsafs), ipy = yoy(all.indpro), claimsy = yoy(all.icsa);
  const p3 = pay1.slice(-3), pAvg = p3.length ? Math.round(p3.reduce((s, o) => s + o.value, 0) / p3.length) : null;
  const sahm = sahmGap(all.unrate), curve = last(all.t10y2y)?.value ?? null, hy = last(all.hy)?.value ?? null;
  const economy: Tile[] = [
    { key: 'cpi', label: 'CPI inflation', value: `${f1(last(cpiy)?.value)}%`, sub: 'year on year', date: last(all.cpi)?.date ?? null, series: cpiy.slice(-60), means: 'If prices rise faster than your pay or savings yield, you lose buying power.', tone: (last(cpiy)?.value ?? 0) > 3 ? 'bad' : 'neutral' },
    { key: 'corepce', label: 'Core PCE inflation', value: `${f1(last(corey)?.value)}%`, sub: 'the Fed targets 2%', date: last(all.corepce)?.date ?? null, series: corey.slice(-60), means: 'The gauge the Fed watches most when deciding rates.' },
    { key: 'fedfunds', label: 'Fed funds rate', value: `${f1(last(all.fedfunds)?.value, 2)}%`, sub: `${sign((last(all.fedfunds)?.value ?? 0) - (ago(all.fedfunds, 12)?.value ?? 0), 2)} pts in a year`, date: last(all.fedfunds)?.date ?? null, series: all.fedfunds.slice(-60), means: 'Sets the cost of cards, loans and the yield on savings.' },
    { key: 'payems', label: 'Jobs added (payrolls)', value: last(pay1) ? `${sign(last(pay1)!.value, 0)}K` : '—', sub: pAvg !== null ? `3-month average ${sign(pAvg, 0)}K` : '', date: last(all.payems)?.date ?? null, series: pay1.slice(-36), means: 'Steady job growth supports spending; a run of weak months is a slowdown signal.', tone: pAvg !== null ? (pAvg > 100 ? 'good' : pAvg < 0 ? 'bad' : 'neutral') : 'neutral' },
    { key: 'unrate', label: 'Unemployment rate', value: `${f1(last(all.unrate)?.value)}%`, sub: sahm !== null ? `${sign(sahm, 2)} pts vs 12-month low (0.5 = Sahm rule)` : '', date: last(all.unrate)?.date ?? null, series: all.unrate.slice(-60), means: 'A rising rate is your cue to check your emergency fund.', tone: sahm !== null && sahm >= 0.5 ? 'bad' : 'neutral' },
    { key: 'icsa', label: 'Weekly jobless claims', value: last(all.icsa) ? `${Math.round(last(all.icsa)!.value / 1000)}K` : '—', sub: `${sign(last(claimsy)?.value)}% on a year ago (monthly average)`, date: last(all.icsa)?.date ?? null, series: all.icsa.slice(-60).map((o) => ({ date: o.date, value: Math.round(o.value / 1000) })), means: 'The fastest read on layoffs.' },
    { key: 'rsafs', label: 'Retail sales', value: `${sign(last(rsy)?.value)}%`, sub: 'year on year', date: last(all.rsafs)?.date ?? null, series: rsy.slice(-60), means: 'Consumer spending drives about two-thirds of the US economy.' },
    { key: 'indpro', label: 'Industrial production', value: `${sign(last(ipy)?.value)}%`, sub: 'year on year', date: last(all.indpro)?.date ?? null, series: ipy.slice(-60), means: 'Factory, mining and utility output.' },
    { key: 'umcsent', label: 'Consumer sentiment', value: f1(last(all.umcsent)?.value), sub: `${sign((last(all.umcsent)?.value ?? 0) - (ago(all.umcsent, 12)?.value ?? 0))} vs a year ago`, date: last(all.umcsent)?.date ?? null, series: all.umcsent.slice(-60), means: 'How confident households feel about money and jobs.' },
    { key: 't10y2y', label: 'Yield curve (10y − 2y)', value: `${sign(curve, 2)} pts`, sub: curve !== null && curve < 0 ? 'inverted: an old recession warning' : 'positive slope', date: last(all.t10y2y)?.date ?? null, series: all.t10y2y.slice(-60), means: 'Inverted curves have preceded most US recessions, often by a year or more.', tone: curve !== null && curve < 0 ? 'bad' : 'neutral' },
    { key: 'hy', label: 'High-yield credit spread', value: `${f1(hy, 2)} pts`, sub: hy !== null && hy > 5 ? 'wide: lenders are nervous' : 'calm', date: last(all.hy)?.date ?? null, series: all.hy.slice(-60), means: 'Extra interest risky companies pay; widening spreads signal stress.', tone: hy !== null && hy > 5 ? 'bad' : 'neutral' },
  ];
  const watch = recessionWatch({ curve, claimsYoy: last(claimsy)?.value ?? null, sahm, hy });
  return { money, housing, economy, relations, housingRelation, watch, housingRead, available };
}

/** Compact text for the Macro agent. */
export function macroBrief(s: MacroSnapshot): Record<string, unknown> {
  const pick = (ts: Tile[]) => Object.fromEntries(ts.map((t) => [t.label, `${t.value}${t.sub ? ` (${t.sub})` : ''}${t.date ? ` as of ${t.date}` : ''}`]));
  return { money: pick(s.money), housing: pick(s.housing), economy: pick(s.economy), relationships: s.relations.concat(s.housingRelation ?? []).map((r) => r.read), recessionWatch: s.watch, housing_read: s.housingRead };
}
