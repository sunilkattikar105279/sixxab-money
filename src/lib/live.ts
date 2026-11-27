// Planning and checking for owner live trading: which screener setups become real orders, and whether our
// records match the broker. Pure functions; the runner (scripts/live-trade.ts) does the I/O.

import type { Setup } from './screener';
import { gate, sizeOrder, type LiveLimits } from './risk';
import type { BrokerPosition, SwingOrder } from './brokers/types';

export interface PlanInput {
  setups: Setup[];
  minScore: number;
  withTrendOnly: boolean;
  limits: LiveLimits;
  killSwitch: boolean;
  equity: number; cash: number; peakEquity: number; dayStartEquity: number;
  busySymbols: Set<string>;     // symbols we already hold or have an order on
  committed: number;            // money in our open positions and pending orders
  ordersToday: number;
  openPositions: number;
}

export interface PlannedOrder extends SwingOrder { score: number; reasons: string[] }
export interface Plan { orders: PlannedOrder[]; blocked: { symbol: string; reasons: string[] }[] }

export function planEntries(x: PlanInput): Plan {
  const orders: PlannedOrder[] = [], blocked: Plan['blocked'] = [];
  let committed = x.committed, ordersToday = x.ordersToday, openPositions = x.openPositions, cash = x.cash;
  const picks = x.setups
    .filter((s) => s.mode === 'invest' && s.side === 'long' && s.score >= x.minScore && (!x.withTrendOnly || s.withTrend))
    .filter((s) => !x.busySymbols.has(s.symbol) && s.entry > s.stop && s.target > s.entry && s.rr >= 1)
    .sort((a, b) => b.score - a.score || b.rr - a.rr);
  for (const s of picks) {
    const qty = sizeOrder({ equity: x.equity, entry: s.entry, stop: s.stop, riskPct: x.limits.riskPct, capitalLeft: Math.max(0, x.limits.capitalCap - committed), cash });
    if (qty < 1) { blocked.push({ symbol: s.symbol, reasons: ['position would be under 1 share within the limits'] }); continue; }
    const g = gate({ limits: x.limits, killSwitch: x.killSwitch, equity: x.equity, peakEquity: x.peakEquity, dayStartEquity: x.dayStartEquity, ordersToday, openPositions, committed, orderValue: qty * s.entry });
    if (!g.allow) { blocked.push({ symbol: s.symbol, reasons: g.reasons }); continue; }
    orders.push({ symbol: s.symbol, qty, entry: s.entry, stop: s.stop, target: s.target, score: s.score, reasons: s.reasons.slice(0, 4) });
    committed += qty * s.entry; cash -= qty * s.entry; ordersToday++; openPositions++;
  }
  return { orders, blocked };
}

/** Our open trades vs the broker's positions, for the symbols we manage. Other holdings in the account are ignored. */
export function reconcile(ours: { symbol: string; qty: number }[], broker: BrokerPosition[]): string[] {
  const held = new Map<string, number>();
  for (const p of broker) { const k = p.symbol.replace(/\.NS$/i, '').toUpperCase(); held.set(k, (held.get(k) ?? 0) + p.qty); }
  const want = new Map<string, number>();
  for (const t of ours) { const k = t.symbol.replace(/\.NS$/i, '').toUpperCase(); want.set(k, (want.get(k) ?? 0) + t.qty); }
  const out: string[] = [];
  for (const [s, q] of want) { const h = held.get(s) ?? 0; if (h < q) out.push(`${s}: we record ${q} shares, broker shows ${h}`); }
  return out;
}

/** Peak equity and today's starting equity from the run history (oldest first). */
export function equityMarks(runs: { run_on: string; equity: number | null }[], today: string, now: number): { peak: number; dayStart: number } {
  const eq = runs.filter((r) => r.equity !== null) as { run_on: string; equity: number }[];
  const peak = Math.max(now, ...eq.map((r) => r.equity));
  const firstToday = eq.find((r) => r.run_on === today);
  const before = [...eq].reverse().find((r) => r.run_on < today);
  return { peak, dayStart: firstToday?.equity ?? before?.equity ?? now };
}
