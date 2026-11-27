// Strategy portfolios: npx tsx scripts/portfolios.ts
// Backtests every rules-based portfolio on ~7 years of daily closes, records this month's holdings and changes,
// and writes src/data/portfolios-US.json (committed by the monthly workflow so the site updates).
import { writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { getBars } from '../src/lib/providers';
import { STRATEGIES, US_LARGE, ETF_SET, runPortfolio, type PriceBook } from '../src/lib/strategies';

const day = (t: number) => new Date(t).toISOString().slice(0, 10);

async function main() {
  const days = 365 * 7;
  const spy = await getBars('US', 'SPY', '1d', days);
  const dates = spy.map((b) => day(b.t));
  const close: PriceBook['close'] = {};
  const syms = [...new Set([...ETF_SET, ...US_LARGE])];
  let ok = 0;
  for (let k = 0; k < syms.length; k += 6) {
    await Promise.all(syms.slice(k, k + 6).map(async (s) => {
      try {
        const bars = await getBars('US', s, '1d', days);
        const m = new Map(bars.map((b) => [day(b.t), b.c]));
        close[s] = dates.map((d) => m.get(d) ?? null); if (bars.length > 300) ok++;
      } catch (e) { console.warn(`${s}: ${e instanceof Error ? e.message : e}`); }
    }));
  }
  console.log(`prices: ${ok}/${syms.length} symbols, ${dates.length} days (${dates[0]} to ${dates.at(-1)})`);
  const book: PriceBook = { dates, close };
  const universe = US_LARGE.filter((s) => close[s]);

  // Quality Moats: live selection from tonight's screener analysis (business factor), no backtest.
  let moats: { symbol: string; weight: number }[] = [];
  try {
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
    const { data: latest } = await db.from('stock_analysis').select('as_of').eq('market', 'US').order('as_of', { ascending: false }).limit(1).maybeSingle();
    if (latest) {
      const { data } = await db.from('stock_analysis').select('symbol, factors, tech').eq('market', 'US').eq('as_of', latest.as_of);
      const scored = (data ?? []).map((r) => ({ s: r.symbol as string, f: ((r.factors ?? []) as { key: string; score: number }[]).find((x) => x.key === 'fundamentals')?.score ?? 0, w: (r.tech as { trends?: { w?: string } })?.trends?.w }))
        .filter((x) => x.f >= 6 && x.w !== 'DOWN').sort((a, b) => b.f - a.f).slice(0, 8);
      moats = scored.map((x) => ({ symbol: x.s, weight: Math.round((1000 / scored.length)) / 10 }));
    }
  } catch (e) { console.warn(`quality moats: ${e instanceof Error ? e.message : e}`); }

  const out = STRATEGIES.map((st) => {
    if (!st.backtest) return { ...st, live: { since: new Date().toISOString().slice(0, 10), holdings: moats } };
    const r = runPortfolio(st.id, book, universe, { costPct: 0.05 });
    console.log(`PORTFOLIO ${st.id}: CAGR ${r.cagrPct}% (SPY ${r.benchCagrPct}%), max DD ${r.maxDrawdownPct}% (SPY ${r.benchMaxDrawdownPct}%), holdings ${r.holdings.map((h) => h.symbol).join(' ')}`);
    return { ...st, result: { ...r, curve: r.curve.filter((_, i) => i % 5 === 0 || i === r.curve.length - 1) } };
  });
  writeFileSync('src/data/portfolios-US.json', JSON.stringify({ generated: new Date().toISOString(), benchmark: 'SPY', costPctPerSide: 0.05, universeSize: universe.length, note: 'Backtests use today’s large-cap list (survivorship bias), daily closes and a 0.05% cost on each trade. Past results do not guarantee future results.', portfolios: out }));
}

main().catch((e) => { console.error(e); process.exit(1); });
