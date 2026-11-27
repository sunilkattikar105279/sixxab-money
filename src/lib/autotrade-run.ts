import type { SupabaseClient } from '@supabase/supabase-js';
import type { Setup } from './screener';
import { step, type Rules, type Trade } from './autotrade';
import { submitBracket, liveTradingEnabled } from './providers/alpaca-trading';

interface StrategyRow { id: string; member_id: string; market: string; mode: 'invest' | 'day'; min_score: number; risk_pct: number; max_position_pct: number; max_positions: number; daily_loss_pct: number; allow_short: boolean; with_trend_only: boolean; broker: 'paper' | 'alpaca' }
interface TradeRow { id: number; symbol: string; side: 'long' | 'short'; status: Trade['status']; qty: number; entry: number; stop: number; target: number; fill_price: number | null; exit_price: number | null; exit_reason: string | null; pnl: number | null; setup_score: number | null; reasons: string[]; created_on: string; opened_on: string | null; closed_on: string | null }

const toTrade = (r: TradeRow): Trade => ({ id: r.id, symbol: r.symbol, side: r.side, status: r.status, qty: Number(r.qty), entry: Number(r.entry), stop: Number(r.stop), target: Number(r.target), fillPrice: r.fill_price == null ? null : Number(r.fill_price), exitPrice: r.exit_price, exitReason: r.exit_reason, pnl: r.pnl, setupScore: Number(r.setup_score ?? 0), reasons: r.reasons ?? [], createdOn: r.created_on, openedOn: r.opened_on, closedOn: r.closed_on });

/** Runs every active strategy for a market after the nightly scan. Returns a short log per strategy. */
export async function runStrategies(db: SupabaseClient, market: string, setups: Setup[], prices: Record<string, number>, today: string, zone?: 'calm' | 'normal' | 'elevated' | 'panic') {
  const { data: strategies, error } = await db.from('strategies').select('*').eq('market', market).eq('active', true);
  if (error || !strategies?.length) return [];
  const out: string[] = [];
  for (const s of strategies as StrategyRow[]) {
    const [{ data: acc }, { data: rows }] = await Promise.all([
      db.from('paper_accounts').select('*').eq('strategy_id', s.id).single(),
      db.from('paper_trades').select('*').eq('strategy_id', s.id).in('status', ['open', 'pending']),
    ]);
    if (!acc) continue;
    const rules: Rules = { mode: s.mode, minScore: Number(s.min_score), riskPct: Number(s.risk_pct), maxPositionPct: Number(s.max_position_pct), maxPositions: s.max_positions, dailyLossPct: Number(s.daily_loss_pct), allowShort: s.allow_short, withTrendOnly: s.with_trend_only };
    // Market regime rule: half size when fear is elevated, no new entries in panic (open trades still managed)
    if (zone === 'elevated') rules.riskPct = rules.riskPct / 2;
    if (zone === 'panic') rules.minScore = 11;
    const res = step({
      rules, setups, prices, today,
      account: { cash: Number(acc.cash), equity: Number(acc.equity), startingCash: Number(acc.starting_cash), pausedUntil: acc.paused_until, history: acc.equity_history ?? [] },
      trades: ((rows ?? []) as TradeRow[]).map(toTrade),
    });

    for (const t of res.changed) {
      await db.from('paper_trades').update({ status: t.status, fill_price: t.fillPrice ?? null, exit_price: t.exitPrice ?? null, exit_reason: t.exitReason ?? null, pnl: t.pnl ?? null, opened_on: t.openedOn ?? null, closed_on: t.closedOn ?? null }).eq('id', t.id!);
    }
    for (const t of res.created) {
      // Owner-only: mirror new orders to the connected Alpaca account as bracket orders (entry, take-profit, stop-loss).
      let brokerOrderId: string | null = null;
      // Replaced by scripts/live-trade.ts (guardrails, reconciliation, Kite). Kept only behind an explicit legacy flag.
      if (s.broker === 'alpaca' && market === 'US' && liveTradingEnabled() && process.env.SIXXAB_LEGACY_MIRROR === 'true') {
        brokerOrderId = await submitBracket({ symbol: t.symbol, qty: t.qty, side: t.side, entry: t.entry, stop: t.stop, target: t.target }).catch((e) => { res.log.push(`${t.symbol}: broker order failed (${e instanceof Error ? e.message : 'error'})`); return null; });
      }
      await db.from('paper_trades').insert({ strategy_id: s.id, member_id: s.member_id, market, symbol: t.symbol, side: t.side, status: t.status, qty: t.qty, entry: t.entry, stop: t.stop, target: t.target, fill_price: t.fillPrice ?? null, setup_score: t.setupScore, reasons: t.reasons, opened_on: t.openedOn ?? null, created_on: t.createdOn, broker_order_id: brokerOrderId });
    }
    await db.from('paper_accounts').update({ cash: res.account.cash, equity: res.account.equity, equity_history: res.account.history, paused_until: res.account.pausedUntil, updated_at: new Date().toISOString() }).eq('strategy_id', s.id);
    out.push(`strategy ${s.id.slice(0, 8)}: ${res.log.length ? res.log.join('; ') : 'no changes'}`);
  }
  return out;
}
