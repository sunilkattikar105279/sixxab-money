// Macro: M2 money supply and liquidity, housing, and the wider US economy from FRED, with the relationships
// investors watch (M2 vs inflation, M2 and Fed liquidity vs stocks, mortgage rates vs home sales).
// Monthly frequency throughout so series line up; FRED converts daily and weekly series to monthly averages.

export interface Obs { date: string; value: number }
export interface SeriesDef { id: string; label: string; units: string; freq?: 'm' | 'q'; agg?: 'avg' | 'eop' }

export const MACRO: Record<string, SeriesDef> = {
  // Money and liquidity
  m2: { id: 'M2SL', label: 'M2 money supply', units: '$B' },
  m2real: { id: 'M2REAL', label: 'Real M2 (inflation-adjusted)', units: '$B (1982–84 $)' },
  m2v: { id: 'M2V', label: 'Velocity of M2', units: 'ratio', freq: 'q' },
  walcl: { id: 'WALCL', label: 'Fed balance sheet', units: '$M', agg: 'avg' },
  rrp: { id: 'RRPONTSYD', label: 'Overnight reverse repo', units: '$B', agg: 'avg' },
  tga: { id: 'WTREGEN', label: 'Treasury General Account', units: '$M', agg: 'avg' },
  sp500: { id: 'SP500', label: 'S&P 500', units: 'index', agg: 'avg' },
  // Inflation, jobs, growth
  cpi: { id: 'CPIAUCSL', label: 'CPI', units: 'index' },
  corepce: { id: 'PCEPILFE', label: 'Core PCE (Fed’s preferred inflation)', units: 'index' },
  payems: { id: 'PAYEMS', label: 'Nonfarm payrolls', units: 'thousands' },
  unrate: { id: 'UNRATE', label: 'Unemployment rate', units: '%' },
  icsa: { id: 'ICSA', label: 'Initial jobless claims', units: 'claims', agg: 'avg' },
  rsafs: { id: 'RSAFS', label: 'Retail sales', units: '$M' },
  indpro: { id: 'INDPRO', label: 'Industrial production', units: 'index' },
  umcsent: { id: 'UMCSENT', label: 'Consumer sentiment (U. Michigan)', units: 'index' },
  fedfunds: { id: 'DFF', label: 'Fed funds rate', units: '%', agg: 'avg' },
  t10y2y: { id: 'T10Y2Y', label: 'Yield curve (10y − 2y)', units: '% pts', agg: 'avg' },
  hy: { id: 'BAMLH0A0HYM2', label: 'High-yield credit spread', units: '% pts', agg: 'avg' },
  // Housing
  mort: { id: 'MORTGAGE30US', label: '30-year mortgage rate', units: '%', agg: 'avg' },
  cs: { id: 'CSUSHPINSA', label: 'Case-Shiller US home prices', units: 'index' },
  mspus: { id: 'MSPUS', label: 'Median new-home sale price', units: '$', freq: 'q' },
  houst: { id: 'HOUST', label: 'Housing starts', units: 'thousands, annual rate' },
  permit: { id: 'PERMIT', label: 'Building permits', units: 'thousands, annual rate' },
  exist: { id: 'EXHOSLUSM495S', label: 'Existing-home sales', units: 'homes, annual rate' },
  newhome: { id: 'HSN1F', label: 'New-home sales', units: 'thousands, annual rate' },
  msacsr: { id: 'MSACSR', label: 'Months of new-home supply', units: 'months' },
};

export async function fredSeries(key: string, years = 12): Promise<Obs[]> {
  const d = MACRO[key];
  return d ? fredFetch(d, years) : [];
}

/** Fetch any FRED series definition, converted to monthly (or quarterly) when `agg` is set. */
export async function fredFetch(d: SeriesDef, years = 12): Promise<Obs[]> {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) return [];
  const start = new Date(Date.now() - years * 365.25 * 864e5).toISOString().slice(0, 10);
  const conv = d.agg ? `&frequency=${d.freq ?? 'm'}&aggregation_method=${d.agg}` : '';
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${d.id}&api_key=${apiKey}&file_type=json&observation_start=${start}${conv}`;
  try {
    const res = await fetch(url, { next: { revalidate: 6 * 3600 } });
    if (!res.ok) return [];
    const j = (await res.json()) as { observations?: { date: string; value: string }[] };
    return (j.observations ?? []).filter((o) => o.value !== '.').map((o) => ({ date: o.date, value: Number(o.value) }));
  } catch { return []; }
}

const r1 = (x: number) => Math.round(x * 10) / 10;

/** Year-over-year % change; `periods` = 12 for monthly, 4 for quarterly. */
export function yoy(s: Obs[], periods = 12): Obs[] {
  const out: Obs[] = [];
  for (let i = periods; i < s.length; i++) if (s[i - periods].value) out.push({ date: s[i].date, value: r1(((s[i].value - s[i - periods].value) / s[i - periods].value) * 100) });
  return out;
}

/** Month-over-month change in level units (e.g. payrolls added). */
export const diff = (s: Obs[]): Obs[] => s.slice(1).map((o, i) => ({ date: o.date, value: Math.round(o.value - s[i].value) }));

const ym = (d: string) => d.slice(0, 7);

/** Pearson correlation of two monthly series, with `b` shifted `lagMonths` later (does `a` lead `b`?). */
export function correlation(a: Obs[], b: Obs[], lagMonths = 0): { r: number; n: number } | null {
  const bm = new Map(b.map((o) => [ym(o.date), o.value]));
  const pairs: [number, number][] = [];
  for (const o of a) {
    const d = new Date(`${o.date}T00:00:00Z`); d.setUTCMonth(d.getUTCMonth() + lagMonths);
    const v = bm.get(d.toISOString().slice(0, 7)); if (v !== undefined) pairs.push([o.value, v]);
  }
  if (pairs.length < 24) return null;
  const n = pairs.length, mx = pairs.reduce((s, p) => s + p[0], 0) / n, my = pairs.reduce((s, p) => s + p[1], 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (const [x, y] of pairs) { sxy += (x - mx) * (y - my); sxx += (x - mx) ** 2; syy += (y - my) ** 2; }
  return sxx && syy ? { r: Math.round((sxy / Math.sqrt(sxx * syy)) * 100) / 100, n } : null;
}

/** Fed net liquidity ($B) = balance sheet − reverse repo − Treasury account: a popular gauge of money available to markets. */
export function netLiquidity(walcl: Obs[], rrp: Obs[], tga: Obs[]): Obs[] {
  const r = new Map(rrp.map((o) => [ym(o.date), o.value])), t = new Map(tga.map((o) => [ym(o.date), o.value]));
  return walcl.flatMap((o) => { const a = r.get(ym(o.date)), b = t.get(ym(o.date)); return a === undefined || b === undefined ? [] : [{ date: o.date, value: Math.round(o.value / 1000 - a - b / 1000) }]; });
}

/** Monthly principal and interest on a 30-year loan with 20% down. */
export function mortgagePayment(price: number, ratePct: number): number {
  const p = price * 0.8, i = ratePct / 100 / 12, n = 360;
  return Math.round(i ? (p * i) / (1 - Math.pow(1 + i, -n)) : p / n);
}

export const last = (s: Obs[]) => s.at(-1) ?? null;
export const ago = (s: Obs[], months: number) => s.at(-1 - months) ?? null;

export function strength(r: number): string {
  const a = Math.abs(r);
  return `${a >= 0.7 ? 'strong' : a >= 0.4 ? 'moderate' : a >= 0.2 ? 'weak' : 'no clear'} ${r >= 0 ? 'positive' : 'negative'} link`;
}

/** Plain-English read of the economy's main gauges. */
export function recessionWatch(x: { curve: number | null; claimsYoy: number | null; sahm: number | null; hy: number | null }): { flags: string[]; read: string } {
  const flags: string[] = [];
  if (x.curve !== null && x.curve < 0) flags.push('yield curve inverted (short rates above long rates)');
  if (x.claimsYoy !== null && x.claimsYoy > 15) flags.push(`jobless claims up ${x.claimsYoy}% on a year ago`);
  if (x.sahm !== null && x.sahm >= 0.5) flags.push(`unemployment ${x.sahm} pts above its 12-month low (Sahm-rule level)`);
  if (x.hy !== null && x.hy > 5) flags.push(`credit spreads wide at ${x.hy} pts`);
  const read = flags.length === 0 ? 'No major recession warning signs right now' : flags.length === 1 ? 'One warning sign to watch' : `${flags.length} warning signs: the economy may be slowing`;
  return { flags, read };
}

/** Sahm-rule style gap: 3-month average unemployment minus its low over the prior 12 months. */
export function sahmGap(unrate: Obs[]): number | null {
  if (unrate.length < 15) return null;
  const avg3 = (i: number) => (unrate[i].value + unrate[i - 1].value + unrate[i - 2].value) / 3;
  const now = avg3(unrate.length - 1);
  let low = Infinity; for (let i = unrate.length - 13; i < unrate.length - 1; i++) if (i >= 2) low = Math.min(low, avg3(i));
  return Number.isFinite(low) ? Math.round((now - low) * 100) / 100 : null;
}
