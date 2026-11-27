// Grow money: rule-based auto-trading on a paper (simulated) account.
// Runs after each nightly scan on daily closing prices. Every order comes from a screener setup (entry, stop, target)
// and is sized by fixed risk rules, so the member can see exactly why each trade happened.

import type { Setup } from './screener';

export interface Rules {
  mode: 'invest' | 'day';
  minScore: number;
  riskPct: number;          // % of equity risked between entry and stop
  maxPositionPct: number;   // largest position as % of equity
  maxPositions: number;
  dailyLossPct: number;     // pause new orders for a day after this drop
  allowShort: boolean;
  withTrendOnly: boolean;
  // Optional trailing stop: once price is startR × the initial risk in profit, the stop follows the best close at distR × risk.
  // keepTarget false lets winners run past the fixed target.
  trail?: { startR: number; distR: number; keepTarget: boolean };
}

export interface Account { cash: number; equity: number; startingCash: number; pausedUntil: string | null; history: { d: string; equity: number }[] }

export interface Trade {
  id?: number;
  symbol: string;
  side: 'long' | 'short';
  status: 'pending' | 'open' | 'closed' | 'expired' | 'cancelled';
  qty: number;
  entry: number; stop: number; target: number;
  fillPrice?: number | null; exitPrice?: number | null; exitReason?: string | null; pnl?: number | null;
  setupScore: number; reasons: string[];
  risk?: number;  // entry minus the initial stop, per share (set when the order is created)
  best?: number;  // best close since the fill (for the trailing stop)
  createdOn: string; openedOn?: string | null; closedOn?: string | null;
}

export const PENDING_DAYS = 5;
const FILL_TOLERANCE = 0.005; // fill when price is within 0.5% of the entry level
const r2 = (x: number) => Math.round(x * 100) / 100;
const days = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);

export function pnlOf(t: Trade, price: number): number {
  if (t.fillPrice == null) return 0;
  return t.side === 'long' ? t.qty * (price - t.fillPrice) : t.qty * (t.fillPrice - price);
}

export interface StepResult { account: Account; changed: Trade[]; created: Trade[]; log: string[] }

export function step(input: { rules: Rules; account: Account; trades: Trade[]; setups: Setup[]; prices: Record<string, number>; today: string }): StepResult {
  const { rules, prices, today } = input;
  const acc: Account = { ...input.account, history: [...input.account.history] };
  const trades = input.trades.map((t) => ({ ...t }));
  const changed = new Set<Trade>();
  const log: string[] = [];

  // 1. Exits for open positions: stop first (conservative), then target.
  for (const t of trades.filter((x) => x.status === 'open')) {
    const p = prices[t.symbol]; if (p == null) continue;
    if (rules.trail && t.risk && t.fillPrice != null) {
      const long = t.side === 'long';
      t.best = t.best == null ? p : long ? Math.max(t.best, p) : Math.min(t.best, p);
      const gain = long ? t.best - t.fillPrice : t.fillPrice - t.best;
      if (gain >= rules.trail.startR * t.risk) {
        const ns = r2(long ? t.best - rules.trail.distR * t.risk : t.best + rules.trail.distR * t.risk);
        if (long ? ns > t.stop : ns < t.stop) { t.stop = ns; changed.add(t); }
      }
    }
    const useTarget = !rules.trail || rules.trail.keepTarget;
    const hitStop = t.side === 'long' ? p <= t.stop : p >= t.stop;
    const hitTarget = useTarget && (t.side === 'long' ? p >= t.target : p <= t.target);
    if (!hitStop && !hitTarget) continue;
    // Stops exit at the close (it may have gapped past the stop); targets exit at the target level.
    const exit = hitStop ? p : t.target;
    t.exitPrice = r2(exit); t.exitReason = hitStop ? (t.fillPrice != null && (t.side === 'long' ? t.stop > t.fillPrice : t.stop < t.fillPrice) ? 'trailing stop' : 'stop') : 'target'; t.pnl = r2(pnlOf(t, exit));
    t.status = 'closed'; t.closedOn = today;
    acc.cash += t.qty * (t.fillPrice ?? t.entry) + t.pnl;
    changed.add(t); log.push(`${t.symbol}: closed at ${t.exitReason} ${t.exitPrice} (${t.pnl >= 0 ? '+' : ''}${t.pnl})`);
  }

  // 2. Pending orders: fill, cancel if the setup broke, or expire.
  for (const t of trades.filter((x) => x.status === 'pending')) {
    const p = prices[t.symbol];
    if (days(t.createdOn, today) > PENDING_DAYS) { t.status = 'expired'; t.closedOn = today; acc.cash += t.qty * t.entry; changed.add(t); log.push(`${t.symbol}: order expired`); continue; }
    if (p == null) continue;
    const broken = t.side === 'long' ? p <= t.stop : p >= t.stop;
    if (broken) { t.status = 'cancelled'; t.closedOn = today; t.exitReason = 'setup broke before fill'; acc.cash += t.qty * t.entry; changed.add(t); log.push(`${t.symbol}: order cancelled, price passed the stop`); continue; }
    const fills = t.side === 'long' ? p <= t.entry * (1 + FILL_TOLERANCE) : p >= t.entry * (1 - FILL_TOLERANCE);
    if (fills) fill(t, p, acc, today, changed, log);
  }

  // 3. Mark to market.
  acc.equity = r2(acc.cash + trades.filter((t) => t.status === 'open').reduce((s, t) => s + t.qty * (t.fillPrice ?? t.entry) + pnlOf(t, prices[t.symbol] ?? t.fillPrice ?? t.entry), 0)
    + trades.filter((t) => t.status === 'pending').reduce((s, t) => s + t.qty * t.entry, 0));

  // 4. Daily loss limit.
  const prev = [...acc.history].reverse().find((h) => h.d < today);
  if (prev && prev.equity > 0 && ((prev.equity - acc.equity) / prev.equity) * 100 >= rules.dailyLossPct) {
    acc.pausedUntil = nextDay(today);
    log.push(`Daily loss limit hit (${rules.dailyLossPct}%): no new orders until ${acc.pausedUntil}`);
  }
  const paused = acc.pausedUntil != null && acc.pausedUntil > today;

  // 5. New orders from today's setups.
  const created: Trade[] = [];
  if (!paused) {
    const busy = new Set(trades.filter((t) => t.status === 'open' || t.status === 'pending').map((t) => t.symbol));
    let slots = rules.maxPositions - busy.size;
    const picks = input.setups
      .filter((s) => s.mode === rules.mode && (s.side === 'long' || (s.side === 'short' && rules.allowShort)))
      .filter((s) => s.score >= rules.minScore && (!rules.withTrendOnly || s.withTrend) && !busy.has(s.symbol))
      .filter((s) => Math.abs(s.entry - s.stop) > 0 && s.rr >= 1)
      .sort((a, b) => b.score - a.score || b.rr - a.rr);
    for (const s of picks) {
      if (slots <= 0) break;
      const riskPerShare = Math.abs(s.entry - s.stop);
      const byRisk = (acc.equity * rules.riskPct) / 100 / riskPerShare;
      const bySize = (acc.equity * rules.maxPositionPct) / 100 / s.entry;
      const byCash = acc.cash / s.entry;
      const qty = Math.floor(Math.min(byRisk, bySize, byCash));
      if (qty < 1) { log.push(`${s.symbol}: skipped, position too small for the account`); continue; }
      const t: Trade = { symbol: s.symbol, side: s.side as 'long' | 'short', status: 'pending', qty, entry: s.entry, stop: s.stop, target: s.target, setupScore: s.score, reasons: s.reasons.slice(0, 4), createdOn: today, risk: riskPerShare };
      acc.cash -= qty * s.entry; // reserve cash for the order
      const p = prices[s.symbol];
      if (p != null && (t.side === 'long' ? p <= t.entry * (1 + FILL_TOLERANCE) && p > t.stop : p >= t.entry * (1 - FILL_TOLERANCE) && p < t.stop)) fill(t, p, acc, today, null, log);
      else log.push(`${s.symbol}: ${t.side} order placed at ${t.entry} (stop ${t.stop}, target ${t.target}), score ${s.score}`);
      created.push(t); slots--;
    }
  }

  acc.cash = r2(acc.cash);
  acc.history = [...acc.history.filter((h) => h.d !== today), { d: today, equity: acc.equity }].slice(-400);
  return { account: acc, changed: [...changed], created, log };
}

function fill(t: Trade, p: number, acc: Account, today: string, changed: Set<Trade> | null, log: string[]) {
  // Reserved cash was qty * entry; settle the difference at the actual fill price.
  const price = t.side === 'long' ? Math.min(p, t.entry) : Math.max(p, t.entry);
  acc.cash += t.qty * (t.entry - price);
  t.fillPrice = r2(price); t.status = 'open'; t.openedOn = today;
  changed?.add(t);
  log.push(`${t.symbol}: ${t.side} filled ${t.qty} at ${t.fillPrice}`);
}

function nextDay(d: string) { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + 1); return x.toISOString().slice(0, 10); }

export function stats(trades: Trade[]) {
  const closed = trades.filter((t) => t.status === 'closed' && t.pnl != null);
  const wins = closed.filter((t) => (t.pnl ?? 0) > 0);
  const gross = (xs: Trade[]) => xs.reduce((s, t) => s + (t.pnl ?? 0), 0);
  const losses = closed.filter((t) => (t.pnl ?? 0) <= 0);
  return {
    closed: closed.length,
    winRate: closed.length ? (wins.length / closed.length) * 100 : 0,
    realized: r2(gross(closed)),
    avgWin: wins.length ? r2(gross(wins) / wins.length) : 0,
    avgLoss: losses.length ? r2(gross(losses) / losses.length) : 0,
    profitFactor: losses.length && gross(losses) !== 0 ? r2(gross(wins) / Math.abs(gross(losses))) : null,
  };
}

export function maxDrawdownPct(history: { equity: number }[]) {
  let peak = -Infinity, dd = 0;
  for (const h of history) { peak = Math.max(peak, h.equity); if (peak > 0) dd = Math.max(dd, ((peak - h.equity) / peak) * 100); }
  return Math.round(dd * 10) / 10;
}
