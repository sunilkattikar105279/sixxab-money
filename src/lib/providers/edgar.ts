// SEC EDGAR XBRL "company facts" (US companies): official, free, no key. SEC asks for a User-Agent with contact details.
import type { Fundamentals } from '../score';

let ciks: Map<string, number> | null = null;
const UA = () => process.env.SEC_USER_AGENT || 'SIXXAB Money support@sunilkattikar.com';

// SEC allows about 10 requests a second per client: run calls one at a time with a short gap, and retry on 429/5xx.
let chain: Promise<unknown> = Promise.resolve();
function secFetch(url: string): Promise<Response | null> {
  const run = async () => {
    for (let attempt = 0; attempt < 3; attempt++) {
      await new Promise((r) => setTimeout(r, 150 + attempt * 1500));
      try {
        const res = await fetch(url, { headers: { 'User-Agent': UA(), 'Accept-Encoding': 'gzip, deflate' }, signal: AbortSignal.timeout(25_000) });
        if (res.ok) return res;
        console.warn(`SEC ${res.status} for ${url}`);
        if (res.status !== 429 && res.status < 500) return null;
      } catch (e) { console.warn(`SEC fetch failed for ${url}: ${e instanceof Error ? e.message : e}`); }
    }
    return null;
  };
  const p = chain.then(run, run);
  chain = p.catch(() => null);
  return p;
}

async function cik(ticker: string): Promise<number | null> {
  if (!ciks) {
    const res = await secFetch('https://www.sec.gov/files/company_tickers.json');
    if (!res) return null; // try again for the next ticker instead of caching an empty map
    ciks = new Map();
    Object.values((await res.json()) as Record<string, { cik_str: number; ticker: string }>).forEach((r) => ciks!.set(r.ticker.toUpperCase(), r.cik_str));
  }
  return ciks.get(ticker.toUpperCase().replace('.', '-')) ?? null;
}

type Row = { fy: number; fp: string; form: string; val: number; end: string; start?: string; filed?: string };
type Fact = { units?: Record<string, Row[]> };

/**
 * Annual values keyed by the period END date (not the filing's fiscal year: every 10-K repeats prior years under the
 * same fy, which made us pick stale comparatives). Duration facts must span about a year.
 */
function annual(f: Fact | undefined): { end: string; val: number; filed: string }[] {
  const rows = Object.values(f?.units ?? {})[0] ?? [];
  const byEnd = new Map<string, { end: string; val: number; filed: string }>();
  rows
    .filter((r) => (r.form === '10-K' || r.form === '10-K/A' || r.form === '20-F') && (!r.start || (Date.parse(r.end) - Date.parse(r.start)) / 864e5 > 330))
    .forEach((r) => { const prev = byEnd.get(r.end); if (!prev || (r.filed ?? '') >= prev.filed) byEnd.set(r.end, { end: r.end, val: r.val, filed: r.filed ?? '' }); });
  return [...byEnd.values()].sort((a, b) => a.end.localeCompare(b.end));
}

/** Companies switch XBRL tags over the years (NVDA moved off one revenue tag after FY2022): use the freshest one. */
function freshest(g: Record<string, Fact>, tags: string[]) {
  return tags.map((k) => annual(g[k])).filter((x) => x.length).sort((a, b) => b.at(-1)!.end.localeCompare(a.at(-1)!.end))[0] ?? [];
}

export async function edgarFundamentals(ticker: string): Promise<Fundamentals | null> {
  const c = await cik(ticker); if (!c) return null;
  const res = await secFetch(`https://data.sec.gov/api/xbrl/companyfacts/CIK${String(c).padStart(10, '0')}.json`);
  if (!res) return null;
  const g = ((await res.json()) as { facts?: { 'us-gaap'?: Record<string, Fact> } }).facts?.['us-gaap'] ?? {};
  const rev = freshest(g, ['Revenues', 'RevenueFromContractWithCustomerExcludingAssessedTax', 'RevenueFromContractWithCustomerIncludingAssessedTax', 'SalesRevenueNet']);
  const ni = freshest(g, ['NetIncomeLoss', 'ProfitLoss']), ocf = freshest(g, ['NetCashProvidedByUsedInOperatingActivities', 'NetCashProvidedByUsedInOperatingActivitiesContinuingOperations']);
  const liab = freshest(g, ['Liabilities']), eq = freshest(g, ['StockholdersEquity', 'StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest']);
  const r1 = rev.at(-1), r0 = rev.at(-2);
  if (!r1) { console.warn(`SEC: no annual revenue found for ${ticker}`); return null; }
  const sameEnd = (xs: { end: string; val: number }[]) => xs.find((x) => x.end === r1.end) ?? null;
  const n1 = sameEnd(ni), o1 = sameEnd(ocf) ?? ocf.at(-1), l1 = sameEnd(liab) ?? liab.at(-1), e1 = sameEnd(eq) ?? eq.at(-1);
  const ageDays = (Date.now() - Date.parse(r1.end)) / 864e5;
  return {
    revenueGrowthPct: r0 && r0.val ? ((r1.val - r0.val) / Math.abs(r0.val)) * 100 : null,
    netMarginPct: n1 && r1.val ? (n1.val / r1.val) * 100 : null,
    opCashFlowPositive: o1 ? o1.val > 0 : null,
    debtToEquity: l1 && e1 && e1.val > 0 ? l1.val / e1.val : null,
    period: `year to ${r1.end} (10-K filed ${r1.filed || 'n/a'})${ageDays > 460 ? ', older than 15 months' : ''}`,
    stale: ageDays > 460,
  };
}
