// End-to-end analysis for one market: fetch → analyse every timeframe → score 1-10 → screen 3 modes.
// Used by the nightly ingest job (writes to Supabase) and live by /api/screener for intraday modes.
import type { Market } from './data/market';
import { UNIVERSE } from './data/universe';
import { getBars, providerName } from './providers';
import { analyze, type TechReport } from './ta/analyze';
import { scoreStock, headlineTone, type Score } from './score';
import { screen, type Mode, type Setup } from './screener';
import { edgarFundamentals } from './providers/edgar';
import { finnhubHeadlines, finnhubEvents } from './providers/finnhub';
import { daysUntil } from './events';

export interface Analysed { symbol: string; name: string; sector: string; tech: TechReport; score: Score; setups: Partial<Record<Mode, Setup>> }

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const monthReturn = (t: TechReport, closes: number[]) => (closes.length > 22 ? ((t.price - closes.at(-22)!) / closes.at(-22)!) * 100 : 0);

/** Runs async jobs with a fixed number in flight. */
async function pool<T, R>(items: T[], limit: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length); let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) { const i = next++; out[i] = await fn(items[i]); }
  }));
  return out;
}

export async function runMarket(market: Market, opts: { intraday?: boolean; symbols?: string[]; paceMs?: number; enrich?: boolean; regime?: import('./regime').RegimeRead | null } = {}): Promise<{ source: string; rows: Analysed[] }> {
  const list = UNIVERSE[market].filter((l) => !opts.symbols || opts.symbols.includes(l.symbol));
  const pace = opts.paceMs ?? (market === 'GLOBAL' ? 8_000 : 0); // Twelve Data free: 8 calls/minute
  const one = async (l: (typeof list)[number]) => {
    try {
      const daily = await getBars(market, l.symbol, '1d', 365 * 6); if (pace) await sleep(pace);
      if (daily.length < 30) return null;
      const hourly = await getBars(market, l.symbol, '1h', 59); if (pace) await sleep(pace);
      const minute = opts.intraday ? await getBars(market, l.symbol, '1m', 1) : [];
      const today = minute.length ? minute.filter((b) => new Date(b.t).toDateString() === new Date(minute.at(-1)!.t).toDateString()) : [];
      const tech = analyze(l.symbol, daily, hourly, today);
      return { l, tech, m1: monthReturn(tech, daily.map((b) => b.c)) };
    } catch { return null; }
  };
  // Twelve Data's free plan allows 8 calls a minute, so Global runs one at a time; US and India run 6 at once.
  const raw = (await pool(list, market === 'GLOBAL' ? 1 : 6, one)).filter((x): x is NonNullable<typeof x> => !!x);

  // Industry strength: sector's 1-month return minus the market's.
  const mkt = raw.length ? raw.reduce((a, r) => a + r.m1, 0) / raw.length : 0;
  const sectorRet = new Map<string, number[]>();
  raw.forEach((r) => sectorRet.set(r.l.sector, [...(sectorRet.get(r.l.sector) ?? []), r.m1]));

  // Company results (SEC) and news (Finnhub) are slow and change slowly: only the nightly job fetches them.
  const enrich = opts.enrich ?? false;
  const rows = await pool(raw, 4, async (r) => {
    const sec = sectorRet.get(r.l.sector)!; const industryRel = sec.reduce((a, b) => a + b, 0) / sec.length - mkt;
    const [fundamentals, headlines, events] = enrich && market === 'US' ? await Promise.all([edgarFundamentals(r.l.symbol).catch((e) => { console.warn(`fundamentals ${r.l.symbol}: ${e instanceof Error ? e.message : e}`); return null; }), finnhubHeadlines(r.l.symbol).catch(() => []), finnhubEvents(r.l.symbol).catch(() => null)]) : [null, [] as string[], null];
    if (events) r.tech.events = events;
    const score = scoreStock(r.tech, { fundamentals, news: headlines.length ? headlineTone(headlines) : null, industryRel, regime: opts.regime ?? null });
    const setups: Partial<Record<Mode, Setup>> = {};
    // Earnings within 5 days: results can gap price past the stop, so every setup carries the warning first
    const dE = daysUntil(r.tech.events?.nextEarnings ?? null);
    (['invest', 'day', 'quick'] as Mode[]).forEach((m) => {
      const s = screen(r.tech, score, m); if (!s) return;
      if (dE !== null && dE >= 0 && dE <= 5 && s.side !== 'avoid') s.reasons = [`earnings in ${dE} day${dE === 1 ? '' : 's'}: results can gap past the stop`, ...s.reasons];
      setups[m] = s;
    });
    return { symbol: r.l.symbol, name: r.l.name, sector: r.l.sector, tech: r.tech, score, setups } as Analysed;
  });
  return { source: providerName(market), rows };
}
