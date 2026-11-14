// End-to-end analysis for one market: fetch → analyse every timeframe → score 1-10 → screen 3 modes.
// Used by the nightly ingest job (writes to Supabase) and live by /api/screener for intraday modes.
import type { Market } from './data/market';
import { UNIVERSE } from './data/universe';
import { getBars, providerName } from './providers';
import { analyze, type TechReport } from './ta/analyze';
import { scoreStock, headlineTone, type Score } from './score';
import { screen, type Mode, type Setup } from './screener';
import { edgarFundamentals } from './providers/edgar';
import { finnhubHeadlines } from './providers/finnhub';

export interface Analysed { symbol: string; name: string; sector: string; tech: TechReport; score: Score; setups: Partial<Record<Mode, Setup>> }

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const monthReturn = (t: TechReport, closes: number[]) => (closes.length > 22 ? ((t.price - closes.at(-22)!) / closes.at(-22)!) * 100 : 0);

export async function runMarket(market: Market, opts: { intraday?: boolean; symbols?: string[]; paceMs?: number } = {}): Promise<{ source: string; rows: Analysed[] }> {
  const list = UNIVERSE[market].filter((l) => !opts.symbols || opts.symbols.includes(l.symbol));
  const pace = opts.paceMs ?? (market === 'GLOBAL' ? 8_000 : 0); // Twelve Data free: 8 calls/minute
  const raw: { l: (typeof list)[number]; tech: TechReport; m1: number }[] = [];

  for (const l of list) {
    const daily = await getBars(market, l.symbol, '1d', 365 * 6); if (pace) await sleep(pace);
    if (daily.length < 30) continue;
    const hourly = await getBars(market, l.symbol, '1h', 59); if (pace) await sleep(pace);
    const minute = opts.intraday ? await getBars(market, l.symbol, '1m', 1) : [];
    const today = minute.length ? minute.filter((b) => new Date(b.t).toDateString() === new Date(minute.at(-1)!.t).toDateString()) : [];
    const tech = analyze(l.symbol, daily, hourly, today);
    raw.push({ l, tech, m1: monthReturn(tech, daily.map((b) => b.c)) });
  }

  // Industry strength: sector's 1-month return minus the market's.
  const mkt = raw.length ? raw.reduce((a, r) => a + r.m1, 0) / raw.length : 0;
  const sectorRet = new Map<string, number[]>();
  raw.forEach((r) => sectorRet.set(r.l.sector, [...(sectorRet.get(r.l.sector) ?? []), r.m1]));

  const rows: Analysed[] = [];
  for (const r of raw) {
    const sec = sectorRet.get(r.l.sector)!; const industryRel = sec.reduce((a, b) => a + b, 0) / sec.length - mkt;
    const [fundamentals, headlines] = market === 'US' ? await Promise.all([edgarFundamentals(r.l.symbol).catch(() => null), finnhubHeadlines(r.l.symbol).catch(() => [])]) : [null, [] as string[]];
    const score = scoreStock(r.tech, { fundamentals, news: headlines.length ? headlineTone(headlines) : null, industryRel });
    const setups: Partial<Record<Mode, Setup>> = {};
    (['invest', 'day', 'quick'] as Mode[]).forEach((m) => { const s = screen(r.tech, score, m); if (s) setups[m] = s; });
    rows.push({ symbol: r.l.symbol, name: r.l.name, sector: r.l.sector, tech: r.tech, score, setups });
  }
  return { source: providerName(market), rows };
}
