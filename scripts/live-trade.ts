// Owner live trading run: npx tsx scripts/live-trade.ts US|IN
// 1) sync order and position status from the broker, 2) check our records against the broker,
// 3) turn tonight's screener setups into new swing orders inside the guardrails, 4) log the run.
// Off unless SIXXAB_LIVE_TRADING=true. US uses Alpaca (paper unless ALPACA_TRADING_URL is the live URL).
// India uses Zerodha Kite; until KITE_LIVE=true it runs as paper (orders simulated on daily closes, account read-only).
// India real orders must come from a static IP registered with Zerodha (SEBI), so run IN live only on that machine.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { alpacaBroker, alpacaConfigured } from '../src/lib/brokers/alpaca';
import { kiteBroker, kiteConfigured } from '../src/lib/brokers/kite';
import type { Broker } from '../src/lib/brokers/types';
import { planEntries, reconcile, equityMarks } from '../src/lib/live';
import { DEFAULT_LIMITS, type LiveLimits } from '../src/lib/risk';
import { getBars } from '../src/lib/providers';
import type { Setup } from '../src/lib/screener';

const market = (process.argv[2] ?? 'US') as 'US' | 'IN';
const num = (v: string | undefined, d: number) => (v && Number.isFinite(Number(v)) ? Number(v) : d);
const limits: LiveLimits = {
  capitalCap: num(process.env.LIVE_CAPITAL_CAP, market === 'US' ? 5000 : 400000),
  riskPct: num(process.env.LIVE_RISK_PCT, DEFAULT_LIMITS.riskPct),
  dailyLossPct: num(process.env.LIVE_DAILY_LOSS_PCT, DEFAULT_LIMITS.dailyLossPct),
  maxDrawdownPct: num(process.env.LIVE_MAX_DRAWDOWN_PCT, DEFAULT_LIMITS.maxDrawdownPct),
  maxPositions: num(process.env.LIVE_MAX_POSITIONS, DEFAULT_LIMITS.maxPositions),
  maxOrdersPerDay: num(process.env.LIVE_MAX_ORDERS_PER_DAY, DEFAULT_LIMITS.maxOrdersPerDay),
  paperDays: DEFAULT_LIMITS.paperDays,
};
const MIN_SCORE = num(process.env.LIVE_MIN_SCORE, 7);
const today = new Intl.DateTimeFormat('en-CA', { timeZone: market === 'IN' ? 'Asia/Kolkata' : 'America/New_York' }).format(new Date());

interface Row { id: number; symbol: string; status: string; qty: number; entry: number; stop: number; target: number; fill_price: number | null; broker_order_id: string | null; broker_exit_id: string | null; created_on: string }

async function main() {
  if (process.env.SIXXAB_LIVE_TRADING !== 'true') { console.log('Live trading is off (SIXXAB_LIVE_TRADING is not true).'); return; }
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const log: string[] = []; let brokerErrors = 0;
  const say = (s: string) => { log.push(s); console.log(s); };

  let broker: Broker;
  if (market === 'US') {
    if (!alpacaConfigured()) throw new Error('Alpaca keys missing');
    broker = alpacaBroker();
  } else {
    if (!kiteConfigured()) throw new Error('KITE_API_KEY / KITE_API_SECRET missing');
    const { data: tok } = await db.from('broker_tokens').select('access_token, created_at').eq('broker', 'kite').maybeSingle();
    const fresh = tok && new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date(tok.created_at)) === today;
    if (!tok || !fresh) { say('Kite token missing or from an earlier day: open money.sixxab.com/api/broker/kite/login to sign in for today.'); await logRun(db, 'kite-paper', true, null, null, 0, 1, 0, [], log); return; }
    broker = kiteBroker(tok.access_token, { paper: process.env.KITE_LIVE !== 'true' });
  }
  say(`${broker.name} · ${broker.paper ? 'PAPER' : 'REAL MONEY'} · cap ${limits.capitalCap} · risk ${limits.riskPct}%/trade`);

  const [acct, positions, rowsRes, runsRes] = await Promise.all([
    broker.account().catch((e) => { brokerErrors++; say(`account: ${e.message}`); return null; }),
    broker.positions().catch((e) => { brokerErrors++; say(`positions: ${e.message}`); return []; }),
    db.from('live_trades').select('*').eq('broker', broker.name).in('status', ['pending', 'open']),
    db.from('live_runs').select('run_on, equity').eq('broker', broker.name).order('run_at', { ascending: true }).limit(500),
  ]);
  const rows = (rowsRes.data ?? []) as Row[];
  const simulated = broker.name === 'kite-paper';

  // Prices for simulated fills (India paper) and for marking exits.
  const closes: Record<string, number> = {};
  const need = new Set(rows.map((r) => r.symbol));

  // 1) Sync status.
  for (const r of rows) {
    if (simulated) continue;
    const held = positions.find((p) => p.symbol.toUpperCase() === r.symbol.replace(/\.NS$/i, '').toUpperCase());
    if (r.status === 'pending' && r.broker_order_id) {
      const o = await broker.order(r.broker_order_id);
      if (!o) { brokerErrors++; continue; }
      const filled = o.status === 'filled' || (o.status === 'gtt-triggered' && held);
      if (filled) {
        const fill = o.filledAvg ?? held?.avgPrice ?? r.entry;
        let exitId: string | null = null;
        if (broker.protect && held) exitId = await broker.protect({ symbol: r.symbol, qty: r.qty, entry: r.entry, stop: r.stop, target: r.target, lastPrice: held.lastPrice ?? fill }).catch((e) => { brokerErrors++; say(`${r.symbol}: stop/target GTT failed: ${e.message}`); return null; });
        await db.from('live_trades').update({ status: 'open', fill_price: fill, opened_on: today, broker_exit_id: exitId, updated_at: new Date().toISOString() }).eq('id', r.id);
        r.status = 'open'; r.fill_price = fill; say(`${r.symbol}: filled ${r.qty} at ${fill}`);
      } else if (['canceled', 'expired', 'rejected', 'gtt-cancelled', 'gtt-expired', 'gtt-rejected', 'gtt-deleted'].includes(o.status)) {
        await db.from('live_trades').update({ status: o.status.includes('reject') ? 'rejected' : o.status.includes('expir') ? 'expired' : 'cancelled', closed_on: today, updated_at: new Date().toISOString() }).eq('id', r.id);
        r.status = 'cancelled'; say(`${r.symbol}: entry ${o.status}`);
      }
    } else if (r.status === 'open' && !held) {
      // Stop or target executed at the broker: mark closed at the last known price.
      let px = r.fill_price ?? r.entry;
      try { const b = await getBars(market, r.symbol, '1d', 5); px = b.at(-1)?.c ?? px; } catch { /* keep fill */ }
      const exit = px <= r.stop ? r.stop : px >= r.target ? r.target : px;
      const pnl = Math.round(r.qty * (exit - (r.fill_price ?? r.entry)) * 100) / 100;
      await db.from('live_trades').update({ status: 'closed', exit_price: exit, exit_reason: exit === r.stop ? 'stop' : exit === r.target ? 'target' : 'closed at broker', pnl, closed_on: today, updated_at: new Date().toISOString() }).eq('id', r.id);
      r.status = 'closed'; say(`${r.symbol}: closed at ${exit} (${pnl >= 0 ? '+' : ''}${pnl})`);
    }
  }

  // India paper: simulate fills and exits on today's close, like the member paper engine.
  if (simulated) {
    for (const s of need) { try { const b = await getBars('IN', s, '1d', 5); if (b.length) closes[s] = b.at(-1)!.c; } catch { /* skip */ } }
    for (const r of rows) {
      const p = closes[r.symbol]; if (p == null) continue;
      if (r.status === 'pending') {
        if (p <= r.stop) { await db.from('live_trades').update({ status: 'cancelled', closed_on: today, exit_reason: 'setup broke before fill' }).eq('id', r.id); r.status = 'cancelled'; }
        else if (p <= r.entry * 1.005) { await db.from('live_trades').update({ status: 'open', fill_price: Math.min(p, r.entry), opened_on: today }).eq('id', r.id); r.status = 'open'; r.fill_price = Math.min(p, r.entry); say(`${r.symbol}: paper fill ${r.qty} at ${r.fill_price}`); }
        else if ((Date.parse(today) - Date.parse(r.created_on)) / 864e5 > 30) { await db.from('live_trades').update({ status: 'expired', closed_on: today }).eq('id', r.id); r.status = 'expired'; }
      } else if (r.status === 'open' && (p <= r.stop || p >= r.target)) {
        const exit = p <= r.stop ? p : r.target, pnl = Math.round(r.qty * (exit - (r.fill_price ?? r.entry)) * 0.997 * 100) / 100; // ~0.15% per side costs
        await db.from('live_trades').update({ status: 'closed', exit_price: exit, exit_reason: p <= r.stop ? 'stop' : 'target', pnl, closed_on: today }).eq('id', r.id);
        r.status = 'closed'; say(`${r.symbol}: paper exit at ${exit} (${pnl >= 0 ? '+' : ''}${pnl})`);
      }
    }
  }

  const live = rows.filter((r) => r.status === 'open' || r.status === 'pending');
  const mismatches = simulated ? [] : reconcile(live.filter((r) => r.status === 'open'), positions);
  mismatches.forEach((m) => say(`RECONCILE: ${m}`));

  // Equity: the broker's, or for India paper the starting cap plus realised and open P&L.
  let equity = acct?.equity ?? 0, cash = acct?.cash ?? 0;
  if (simulated) {
    const { data: closed } = await db.from('live_trades').select('pnl').eq('broker', 'kite-paper').eq('status', 'closed');
    const realised = (closed ?? []).reduce((s, x) => s + Number(x.pnl ?? 0), 0);
    const openPnl = live.filter((r) => r.status === 'open').reduce((s, r) => s + r.qty * ((closes[r.symbol] ?? r.fill_price ?? r.entry) - (r.fill_price ?? r.entry)), 0);
    equity = limits.capitalCap + realised + openPnl;
    cash = equity - live.reduce((s, r) => s + r.qty * (r.fill_price ?? r.entry), 0);
  }
  // The guardrails work on the money this system manages, never more than the cap.
  const managed = Math.min(equity, limits.capitalCap);
  const marks = equityMarks((runsRes.data ?? []) as { run_on: string; equity: number | null }[], today, managed);
  const committed = live.reduce((s, r) => s + r.qty * (r.fill_price ?? r.entry), 0);
  const { count: ordersToday } = await db.from('live_trades').select('id', { count: 'exact', head: true }).eq('broker', broker.name).eq('created_on', today);

  // 3) New orders from tonight's setups.
  const { data: latest } = await db.from('screener_setups').select('as_of').eq('market', market).eq('mode', 'invest').order('as_of', { ascending: false }).limit(1).maybeSingle();
  let setups: Setup[] = [];
  if (latest) {
    const { data } = await db.from('screener_setups').select('*').eq('market', market).eq('mode', 'invest').eq('as_of', latest.as_of);
    setups = (data ?? []).map((s) => ({ symbol: s.symbol, mode: s.mode, side: s.side, entry: Number(s.entry), stop: Number(s.stop), target: Number(s.target), rr: Number(s.rr), withTrend: s.with_trend, timeframe: s.timeframe, reasons: s.reasons ?? [], score: Number(s.score) }));
    say(`setups ${latest.as_of}: ${setups.length}`);
  }
  const busy = new Set([...live.map((r) => r.symbol), ...positions.map((p) => p.symbol)]);
  const plan = planEntries({ setups, minScore: MIN_SCORE, withTrendOnly: true, limits, killSwitch: process.env.SIXXAB_KILL_SWITCH === 'true', equity: managed, cash: Math.min(cash, limits.capitalCap - committed), peakEquity: marks.peak, dayStartEquity: marks.dayStart, busySymbols: busy, committed, ordersToday: ordersToday ?? 0, openPositions: live.length });
  plan.blocked.forEach((b) => say(`blocked ${b.symbol}: ${b.reasons.join('; ')}`));
  let placed = 0;
  for (const o of plan.orders) {
    let id: string | null = null;
    if (!simulated) id = await broker.placeSwing(o).catch((e) => { brokerErrors++; say(`${o.symbol}: order failed: ${e.message}`); return null; });
    if (!simulated && !id) continue;
    await db.from('live_trades').insert({ broker: broker.name, market, symbol: o.symbol, side: 'long', status: 'pending', qty: o.qty, entry: o.entry, stop: o.stop, target: o.target, setup_score: o.score, reasons: o.reasons, broker_order_id: id, created_on: today });
    placed++; say(`${o.symbol}: ${simulated ? 'paper ' : ''}buy ${o.qty} at ${o.entry} · stop ${o.stop} · target ${o.target} · score ${o.score}`);
  }
  await logRun(db, broker.name, broker.paper, equity, cash, placed, brokerErrors, mismatches.length, plan.blocked, log, marks);
}

async function logRun(db: SupabaseClient, name: string, paper: boolean, equity: number | null, cash: number | null, placed: number, errors: number, mismatches: number, blocked: unknown[], log: string[], marks?: { peak: number; dayStart: number }) {
  const { error } = await db.from('live_runs').insert({ broker: name, market, paper, run_on: today, equity, cash, peak_equity: marks?.peak ?? null, day_start_equity: marks?.dayStart ?? null, orders_placed: placed, broker_errors: errors, reconcile_mismatches: mismatches, blocked, log: log.slice(-100) });
  if (error) console.warn(`run not logged: ${error.message}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
