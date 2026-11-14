// SEC EDGAR XBRL "company facts" (US companies): official, free, no key. SEC asks for a User-Agent with contact details.
import type { Fundamentals } from '../score';

let ciks: Map<string, number> | null = null;
const UA = () => process.env.SEC_USER_AGENT || 'SIXXAB Money research contact@example.com';

async function cik(ticker: string): Promise<number | null> {
  if (!ciks) {
    ciks = new Map();
    const res = await fetch('https://www.sec.gov/files/company_tickers.json', { headers: { 'User-Agent': UA() }, signal: AbortSignal.timeout(20_000) });
    if (res.ok) Object.values((await res.json()) as Record<string, { cik_str: number; ticker: string }>).forEach((r) => ciks!.set(r.ticker.toUpperCase(), r.cik_str));
  }
  return ciks.get(ticker.toUpperCase().replace('.', '-')) ?? null;
}

type Fact = { units?: Record<string, { fy: number; fp: string; form: string; val: number; end: string }[]> };
function annual(f: Fact | undefined): { fy: number; val: number }[] {
  const rows = Object.values(f?.units ?? {})[0] ?? [];
  const byFy = new Map<number, number>();
  rows.filter((r) => r.form === '10-K' && r.fp === 'FY').forEach((r) => byFy.set(r.fy, r.val));
  return [...byFy.entries()].map(([fy, val]) => ({ fy, val })).sort((a, b) => a.fy - b.fy);
}

export async function edgarFundamentals(ticker: string): Promise<Fundamentals | null> {
  const c = await cik(ticker); if (!c) return null;
  const res = await fetch(`https://data.sec.gov/api/xbrl/companyfacts/CIK${String(c).padStart(10, '0')}.json`, { headers: { 'User-Agent': UA() }, signal: AbortSignal.timeout(20_000) });
  if (!res.ok) return null;
  const g = ((await res.json()) as { facts?: { 'us-gaap'?: Record<string, Fact> } }).facts?.['us-gaap'] ?? {};
  const rev = annual(g.RevenueFromContractWithCustomerExcludingAssessedTax ?? g.Revenues ?? g.SalesRevenueNet);
  const ni = annual(g.NetIncomeLoss), ocf = annual(g.NetCashProvidedByUsedInOperatingActivities);
  const liab = annual(g.Liabilities), eq = annual(g.StockholdersEquity);
  const r1 = rev.at(-1), r0 = rev.at(-2), n1 = ni.find((x) => x.fy === r1?.fy), o1 = ocf.at(-1), l1 = liab.at(-1), e1 = eq.at(-1);
  if (!r1) return null;
  return {
    revenueGrowthPct: r0 && r0.val ? ((r1.val - r0.val) / Math.abs(r0.val)) * 100 : null,
    netMarginPct: n1 && r1.val ? (n1.val / r1.val) * 100 : null,
    opCashFlowPositive: o1 ? o1.val > 0 : null,
    debtToEquity: l1 && e1 && e1.val > 0 ? l1.val / e1.val : null,
    period: `FY${r1.fy} 10-K`,
  };
}
