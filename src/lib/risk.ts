// Owner live-trading guardrails. These sit in front of every real broker order, on top of the per-trade rules
// in autotrade.ts. Defaults match Sunil's choice on Nov 26, 2026: start with $2–5k, 0.5% risk per trade,
// 2% daily loss stop, 8% total drawdown stop, two weeks of paper trading before real money.

export interface LiveLimits {
  capitalCap: number;        // most money the system may have at work, in the account's currency
  riskPct: number;           // % of equity risked per trade (entry to stop)
  dailyLossPct: number;      // no new orders for the day after this drop
  maxDrawdownPct: number;    // kill switch: stop all new orders after this fall from the peak
  maxPositions: number;
  maxOrdersPerDay: number;   // also keeps India well under SEBI's 10-orders-a-second retail algo threshold
  paperDays: number;         // trading days on paper before real money is allowed
}

export const DEFAULT_LIMITS: LiveLimits = { capitalCap: 5000, riskPct: 0.5, dailyLossPct: 2, maxDrawdownPct: 8, maxPositions: 6, maxOrdersPerDay: 5, paperDays: 10 };

export interface GateInput {
  limits: LiveLimits;
  killSwitch: boolean;       // manual stop (env SIXXAB_KILL_SWITCH=true or the dashboard)
  equity: number;
  peakEquity: number;
  dayStartEquity: number;
  ordersToday: number;
  openPositions: number;
  committed: number;         // money already in open positions and pending orders
  orderValue: number;        // value of the order being considered
}

export interface GateResult { allow: boolean; reasons: string[] }

/** Decide whether one new order may go to the broker. Exits and stop changes are never blocked. */
export function gate(x: GateInput): GateResult {
  const reasons: string[] = [];
  if (x.killSwitch) reasons.push('kill switch is on');
  const dd = x.peakEquity > 0 ? ((x.peakEquity - x.equity) / x.peakEquity) * 100 : 0;
  if (dd >= x.limits.maxDrawdownPct) reasons.push(`drawdown ${dd.toFixed(1)}% reached the ${x.limits.maxDrawdownPct}% stop`);
  const day = x.dayStartEquity > 0 ? ((x.dayStartEquity - x.equity) / x.dayStartEquity) * 100 : 0;
  if (day >= x.limits.dailyLossPct) reasons.push(`down ${day.toFixed(1)}% today, past the ${x.limits.dailyLossPct}% daily stop`);
  if (x.ordersToday >= x.limits.maxOrdersPerDay) reasons.push(`daily order limit (${x.limits.maxOrdersPerDay}) reached`);
  if (x.openPositions >= x.limits.maxPositions) reasons.push(`position limit (${x.limits.maxPositions}) reached`);
  if (x.committed + x.orderValue > x.limits.capitalCap) reasons.push(`order would take money at work past the ${x.limits.capitalCap} cap`);
  return { allow: reasons.length === 0, reasons };
}

/** Quantity for one order: risk-based, then capped by the capital cap and the cash on hand. */
export function sizeOrder(o: { equity: number; entry: number; stop: number; riskPct: number; capitalLeft: number; cash: number }): number {
  const perShare = Math.abs(o.entry - o.stop);
  if (perShare <= 0 || o.entry <= 0) return 0;
  const byRisk = (o.equity * o.riskPct) / 100 / perShare;
  return Math.max(0, Math.floor(Math.min(byRisk, o.capitalLeft / o.entry, o.cash / o.entry)));
}

export interface PaperCheck { days: number; trades: number; brokerErrors: number; reconcileMismatches: number; maxDrawdownPct: number }
export interface GoLive { ready: boolean; passed: string[]; failed: string[] }

/**
 * The bar for switching from paper to real money. Two weeks of paper results say little about returns
 * (that is what the backtest is for); this checks that the plumbing works end to end.
 */
export function goLiveCheck(p: PaperCheck, limits: LiveLimits = DEFAULT_LIMITS): GoLive {
  const checks: [boolean, string][] = [
    [p.days >= limits.paperDays, `${p.days}/${limits.paperDays} paper trading days`],
    [p.trades >= 3, `${p.trades} paper orders placed (need 3+)`],
    [p.brokerErrors === 0, `${p.brokerErrors} broker errors (need 0)`],
    [p.reconcileMismatches === 0, `${p.reconcileMismatches} mismatches between our records and the broker (need 0)`],
    [p.maxDrawdownPct < limits.maxDrawdownPct, `paper drawdown ${p.maxDrawdownPct}% (must stay under ${limits.maxDrawdownPct}%)`],
  ];
  return { ready: checks.every(([ok]) => ok), passed: checks.filter(([ok]) => ok).map(([, s]) => s), failed: checks.filter(([ok]) => !ok).map(([, s]) => s) };
}
