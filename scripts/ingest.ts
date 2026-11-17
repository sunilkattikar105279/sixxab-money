// Nightly ingest: npx tsx scripts/ingest.ts US|IN|GLOBAL
// Pulls bars from the market's free provider, analyses, scores and screens, then writes Supabase tables
// (stock_quotes for the home map, stock_analysis, screener_setups, market_snapshots).
import { runStrategies } from '../src/lib/autotrade-run';
import { createClient } from '@supabase/supabase-js';
import { runMarket } from '../src/lib/pipeline';
import { getBars, providerName } from '../src/lib/providers';
import type { Market } from '../src/lib/data/market';
import { readRegime, type Point, type RegimeRead } from '../src/lib/regime';
import { cboeHistory } from '../src/lib/providers/cboe';
import { providerConfigured } from '../src/lib/providers';

const INDEX_PROXIES: Record<Market, { symbol: string; name: string }[]> = {
  US: [{ symbol: 'SPY', name: 'S&P 500 (SPY)' }, { symbol: 'QQQ', name: 'Nasdaq 100 (QQQ)' }, { symbol: 'DIA', name: 'Dow (DIA)' }, { symbol: 'IWM', name: 'Russell 2000 (IWM)' }],
  IN: [{ symbol: 'NSE_INDEX|Nifty 50', name: 'Nifty 50' }, { symbol: 'NSE_INDEX|Nifty Bank', name: 'Bank Nifty' }, { symbol: 'BSE_INDEX|SENSEX', name: 'Sensex' }, { symbol: 'NSE_INDEX|India VIX', name: 'India VIX' }],
  GLOBAL: [{ symbol: 'EFA', name: 'Developed markets (EFA)' }, { symbol: 'EEM', name: 'Emerging markets (EEM)' }, { symbol: 'GLD', name: 'Gold (GLD)' }, { symbol: 'USO', name: 'Oil (USO)' }],
};

async function main() {
  const market = (process.argv[2] || 'US') as Market;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env missing');
  const db = createClient(url, key, { auth: { persistSession: false } });
  const source = providerName(market);
  await db.rpc('prune_rate_limits'); // housekeeping; ignored if migration 0006 isn't run yet

  // Index snapshot
  const indices = [];
  for (const p of INDEX_PROXIES[market]) {
    const b = await getBars(market, p.symbol, '1d', 10);
    if (b.length >= 2) { const l = b.at(-1)!, pr = b.at(-2)!; indices.push({ name: p.name, value: l.c, change: l.c - pr.c, changePct: ((l.c - pr.c) / pr.c) * 100 }); }
    if (market === 'GLOBAL') await new Promise((r) => setTimeout(r, 8000));
  }
  const asOf = new Date().toISOString().slice(0, 10);
  if (indices.length) await db.from('market_snapshots').upsert({ market, as_of: asOf, source, indices }, { onConflict: 'market,as_of' });

  // Market risk meter: VIX (CBOE) with SPY volume for the US; India VIX with Nifty for India (needs the Upstox feed)
  let regime: RegimeRead | null = null;
  try {
    if (market === 'US') {
      const [vix, vix3m, spy] = await Promise.all([cboeHistory('VIX'), cboeHistory('VIX3M'), getBars('US', 'SPY', '1d', 400)]);
      regime = readRegime({ market: 'US', gauge: vix, gauge3m: vix3m, index: spy });
    } else if (market === 'IN' && providerConfigured('IN')) {
      const [iv, nifty] = await Promise.all([getBars('IN', 'NSE_INDEX|India VIX', '1d', 400), getBars('IN', 'NSE_INDEX|Nifty 50', '1d', 400)]);
      const gauge: Point[] = iv.map((b) => ({ date: new Date(b.t).toISOString().slice(0, 10), value: b.c }));
      regime = readRegime({ market: 'IN', gauge, index: nifty });
    }
    if (regime) {
      const { error } = await db.from('market_regime').upsert({ market, as_of: regime.asOf, zone: regime.zone, level: regime.level, data: regime }, { onConflict: 'market,as_of' });
      console.log(`${market} risk meter: ${regime.summary}${error ? ` (not stored: ${error.message}; run migration 0009)` : ''}`);
    }
  } catch (e) { console.warn(`risk meter skipped: ${e instanceof Error ? e.message : e}`); }

  const { rows } = await runMarket(market, { enrich: true, regime });
  if (!rows.length) { console.log(`No data for ${market}: check provider keys.`); return; }
  await db.from('stock_quotes').upsert(rows.map((r) => ({ market, as_of: asOf, symbol: r.symbol, name: r.name, sector: r.sector, price: r.tech.price, change_pct: r.tech.changePct, market_cap: null, source })), { onConflict: 'market,as_of,symbol' });
  await db.from('stock_analysis').upsert(rows.map((r) => ({ market, as_of: asOf, symbol: r.symbol, name: r.name, sector: r.sector, composite: r.score.composite, bias: r.score.bias, factors: r.score.factors, tech: r.tech, source })), { onConflict: 'market,as_of,symbol' });
  const setups = rows.flatMap((r) => Object.values(r.setups).map((s) => ({ market, as_of: asOf, symbol: s!.symbol, mode: s!.mode, side: s!.side, entry: s!.entry, stop: s!.stop, target: s!.target, rr: s!.rr, with_trend: s!.withTrend, timeframe: s!.timeframe, reasons: s!.reasons, score: s!.score })));
  if (setups.length) await db.from('screener_setups').upsert(setups, { onConflict: 'market,as_of,symbol,mode' });
  console.log(`${market}: ${rows.length} stocks analysed, ${setups.length} setups, ${indices.length} index proxies.`);

  // Grow money: run members' auto-trade strategies on today's setups and closing prices (paper accounts).
  const prices = Object.fromEntries(rows.map((r) => [r.symbol, r.tech.price]));
  const allSetups = rows.flatMap((r) => Object.values(r.setups).filter((x): x is NonNullable<typeof x> => !!x));
  const log = await runStrategies(db, market, allSetups, prices, asOf, regime?.zone).catch((e) => [`auto-trade error: ${e instanceof Error ? e.message : e}`]);
  for (const line of log) console.log(`  ${line}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
