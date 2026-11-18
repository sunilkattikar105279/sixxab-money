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
import { analyze } from '../src/lib/ta/analyze';
import { pivotRead, PIVOT_SYMBOLS, type PivotBoard } from '../src/lib/pivot';
import { providerConfigured } from '../src/lib/providers';
import { readRotation, US_SECTORS, IN_SECTORS } from '../src/lib/rotation';
import { resolve } from '../src/lib/scorecard';
import { computeBreadth } from '../src/lib/breadth';

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
  let lastBar = 0;
  for (const p of INDEX_PROXIES[market]) {
    const b = await getBars(market, p.symbol, '1d', 10);
    if (b.length >= 2) { const l = b.at(-1)!, pr = b.at(-2)!; lastBar = Math.max(lastBar, l.t); indices.push({ name: p.name, value: l.c, change: l.c - pr.c, changePct: ((l.c - pr.c) / pr.c) * 100 }); }
    if (market === 'GLOBAL') await new Promise((r) => setTimeout(r, 8000));
  }
  // Date the run by the latest session it covers (market-local), not the clock: a run GitHub starts late
  // (after midnight UTC) must still file yesterday's close under yesterday's date.
  const tz = market === 'IN' ? 'Asia/Kolkata' : 'America/New_York';
  const asOf = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(lastBar ? new Date(lastBar) : new Date());
  console.log(`${market}: session ${asOf} via ${source}, ${indices.length} indexes: ${indices.map((q) => `${q.name} ${q.value.toFixed(2)} (${q.changePct >= 0 ? '+' : ''}${q.changePct.toFixed(2)}%)`).join(' · ')}`);
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
      const lastG = gauge.at(-1)?.date ?? '';
      // The free feed sometimes lags on India VIX: never file an old reading under today's session
      if (lastG && (Date.parse(asOf) - Date.parse(lastG)) / 86_400_000 > 1) console.warn(`IN risk meter skipped: India VIX feed is stale (last ${lastG}, session ${asOf})`);
      else regime = readRegime({ market: 'IN', gauge, index: nifty });
    }
    if (regime) {
      const { error } = await db.from('market_regime').upsert({ market, as_of: regime.asOf, zone: regime.zone, level: regime.level, data: regime }, { onConflict: 'market,as_of' });
      console.log(`${market} risk meter: ${regime.summary}${error ? ` (not stored: ${error.message}; run migration 0009)` : ''}`);
    }
  } catch (e) { console.warn(`risk meter skipped: ${e instanceof Error ? e.message : e}`); }

  const { rows } = await runMarket(market, { enrich: true, regime });
  if (!rows.length) { console.log(`No data for ${market}: check provider keys.`); return; }
  // Breadth from today's scan joins Sigma's risk read
  const breadth = market === 'GLOBAL' ? null : computeBreadth(rows.map((r) => r.tech));
  if (regime && breadth) {
    regime.breadth = breadth;
    const { error } = await db.from('market_regime').upsert({ market, as_of: regime.asOf, zone: regime.zone, level: regime.level, data: regime }, { onConflict: 'market,as_of' });
    console.log(`${market} breadth: ${breadth.read} (${breadth.pctAbove200}% above 200-day, ${breadth.advancers} up / ${breadth.decliners} down)${error ? ` (not stored: ${error.message})` : ''}`);
  }
  // Pivot · Levels: nightly multi-timeframe read of the index ETFs (US only; India levels stay hidden for SEBI)
  if (market === 'US' && regime) {
    try {
      const reads = [];
      for (const p of PIVOT_SYMBOLS) {
        const [daily, hourly] = await Promise.all([getBars('US', p.symbol, '1d', 365 * 6), getBars('US', p.symbol, '1h', 59)]);
        if (daily.length >= 80) reads.push(pivotRead(analyze(p.symbol, daily, hourly), p.name, asOf));
      }
      const pivot: PivotBoard = { asOf, reads };
      const data = { ...regime, pivot } as typeof regime & { pivot: PivotBoard };
      const { error } = await db.from('market_regime').upsert({ market, as_of: regime.asOf, zone: regime.zone, level: regime.level, data }, { onConflict: 'market,as_of' });
      for (const r of reads) console.log(`Pivot ${r.symbol}: ${r.bias} · ${r.scenarios.map((s) => `${s.side} ${s.trigger}`).join(' / ')}`);
      if (error) console.warn(`pivot not stored: ${error.message}`);
    } catch (e) { console.warn(`pivot skipped: ${e instanceof Error ? e.message : e}`); }
  }
  const withEvents = rows.filter((r) => r.tech.events).length;
  if (market === 'US') console.log(`US events: earnings and insider data for ${withEvents} of ${rows.length} stocks`);
  await db.from('stock_quotes').upsert(rows.map((r) => ({ market, as_of: asOf, symbol: r.symbol, name: r.name, sector: r.sector, price: r.tech.price, change_pct: r.tech.changePct, market_cap: null, source })), { onConflict: 'market,as_of,symbol' });
  await db.from('stock_analysis').upsert(rows.map((r) => ({ market, as_of: asOf, symbol: r.symbol, name: r.name, sector: r.sector, composite: r.score.composite, bias: r.score.bias, factors: r.score.factors, tech: r.tech, source })), { onConflict: 'market,as_of,symbol' });
  const setups = rows.flatMap((r) => Object.values(r.setups).map((s) => ({ market, as_of: asOf, symbol: s!.symbol, mode: s!.mode, side: s!.side, entry: s!.entry, stop: s!.stop, target: s!.target, rr: s!.rr, with_trend: s!.withTrend, timeframe: s!.timeframe, reasons: s!.reasons, score: s!.score })));
  if (setups.length) await db.from('screener_setups').upsert(setups, { onConflict: 'market,as_of,symbol,mode' });

  // Scenario scorecard: track today's long/short setups, then resolve open ones against today's close
  try {
    const track = setups.filter((x) => x.side === 'long' || x.side === 'short')
      .map((x) => ({ market: x.market, as_of: x.as_of, symbol: x.symbol, mode: x.mode, side: x.side, entry: x.entry, stop: x.stop, target: x.target, score: x.score }));
    if (track.length) await db.from('setup_outcomes').upsert(track, { onConflict: 'market,as_of,symbol,mode', ignoreDuplicates: true });
    const closes = new Map(rows.map((r) => [r.symbol, r.tech.price]));
    const { data: open, error } = await db.from('setup_outcomes').select('*').eq('market', market).eq('outcome', 'open').lt('as_of', asOf);
    if (error) throw new Error(error.message);
    let resolved = 0;
    for (const o of open ?? []) {
      const c = closes.get(o.symbol); if (c == null) continue;
      const r = resolve({ side: o.side, entry: Number(o.entry), stop: Number(o.stop), target: Number(o.target), as_of: o.as_of }, c, asOf);
      if (r.outcome !== 'open') { resolved++; await db.from('setup_outcomes').update({ outcome: r.outcome, exit_price: r.exit, r_multiple: r.r, resolved_on: asOf }).eq('market', o.market).eq('as_of', o.as_of).eq('symbol', o.symbol).eq('mode', o.mode); }
    }
    console.log(`${market} scorecard: ${track.length} new tracked, ${resolved} resolved, ${(open ?? []).length - resolved} still open`);
  } catch (e) { console.warn(`scorecard skipped: ${e instanceof Error ? e.message : e} (run migration 0010)`); }

  // Sector rotation (US sector ETFs vs SPY; Nifty sector indices vs Nifty 50 when the India feed is connected)
  try {
    const defs = market === 'US' ? US_SECTORS : market === 'IN' && providerConfigured('IN') ? IN_SECTORS : [];
    if (defs.length) {
      const indexSym = market === 'US' ? 'SPY' : 'NSE_INDEX|Nifty 50';
      const index = await getBars(market, indexSym, '1d', 900);
      const sectors = [];
      for (const def of defs) sectors.push({ def, bars: await getBars(market, def.symbol, '1d', 900) });
      const rot = readRotation(market as 'US' | 'IN', index, sectors);
      if (rot) {
        const { error } = await db.from('sector_rotation').upsert({ market, as_of: rot.asOf, data: rot }, { onConflict: 'market,as_of' });
        console.log(`${market} rotation: ${rot.summary}${error ? ` (not stored: ${error.message}; run migration 0010)` : ''}`);
      }
    }
  } catch (e) { console.warn(`rotation skipped: ${e instanceof Error ? e.message : e}`); }
  // Tape · nightly agent brief for the home page (plain facts from this run, no model call needed)
  if (market !== 'GLOBAL' && indices.length) {
    try {
      const pct = (v: number) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(2)}%`;
      const day = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(asOf + 'T12:00:00Z'));
      const idx = indices.filter((q) => q.name !== 'India VIX').map((q) => `${q.name.replace(/ \(.*\)$/, '')} ${pct(q.changePct)}`).join(', ');
      const { data: rotRow } = await db.from('sector_rotation').select('data').eq('market', market).order('as_of', { ascending: false }).limit(1).maybeSingle();
      const lead = ((rotRow?.data as { sectors?: { name: string; quadrant: string }[] } | null)?.sectors ?? []).filter((x) => x.quadrant === 'leading').slice(0, 2).map((x) => x.name);
      const parts = [`${market === 'US' ? 'US' : 'India'} close, ${day}: ${idx}.`];
      if (regime) parts.push(`Sigma: ${regime.gauge} ${regime.level.toFixed(1)} (${regime.zone})${regime.breadth ? `; ${regime.breadth.pctAbove200}% of tracked stocks are above their 200-day average` : ''}.`);
      if (lead.length) parts.push(`Delta: ${lead.join(' and ')} lead.`);
      const text = parts.join(' ');
      await db.from('briefs').delete().eq('market', market).gte('created_at', new Date(Date.now() - 20 * 3_600_000).toISOString()).like('text', `${market === 'US' ? 'US' : 'India'} close, %`);
      const { error } = await db.from('briefs').insert({ market, text, sources: [{ title: source }] });
      console.log(`${market} agent brief: ${text}${error ? ` (not stored: ${error.message})` : ''}`);
    } catch (e) { console.warn(`agent brief skipped: ${e instanceof Error ? e.message : e}`); }
  }
  console.log(`${market}: ${rows.length} stocks analysed, ${setups.length} setups, ${indices.length} index proxies.`);

  // Grow money: run members' auto-trade strategies on today's setups and closing prices (paper accounts).
  const prices = Object.fromEntries(rows.map((r) => [r.symbol, r.tech.price]));
  const allSetups = rows.flatMap((r) => Object.values(r.setups).filter((x): x is NonNullable<typeof x> => !!x));
  const log = await runStrategies(db, market, allSetups, prices, asOf, regime?.zone).catch((e) => [`auto-trade error: ${e instanceof Error ? e.message : e}`]);
  for (const line of log) console.log(`  ${line}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
