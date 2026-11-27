// Backtest of the swing engine: replays the exact screener (analyze → scoreStock → screen, 'invest' mode)
// and the exact paper-trading step() over past daily bars, one trading day at a time, with no look-ahead.
// Limits: technical factors only (point-in-time company results and news are not stored historically),
// daily closes only (fills and exits on the close, like the live paper engine), trading costs as a flat % per side.

import { analyze } from './ta/analyze';
import { scoreStock } from './score';
import { screen, type Setup } from './screener';
import { step, stats, maxDrawdownPct, type Rules, type Trade, type Account } from './autotrade';
import type { Bar } from './ta/bars';

export interface BacktestInput {
  series: Record<string, Bar[]>;   // daily bars per symbol, oldest first
  benchmark: Bar[];                // index or ETF bars for the same market (sets the trading calendar)
  rules: Rules;
  startCash: number;
  costPct: number;                 // per side, e.g. 0.05 for US, 0.15 for India delivery (STT, charges, slippage)
  warmup?: number;                 // bars needed before the first signal (default 260, about a year)
  dateKey?: (t: number) => string; // calendar day of a bar (India bars need the IST date)
  every?: number;                  // re-scan every N days (1 = daily)
}

export interface BacktestResult {
  from: string; to: string; days: number;
  equity: { d: string; equity: number; bench: number }[];
  trades: Trade[];
  totalReturnPct: number; cagrPct: number; maxDrawdownPct: number;
  benchReturnPct: number; benchCagrPct: number; benchMaxDrawdownPct: number;
  exposurePct: number;             // average share of equity in open positions
  costs: number;
  stats: ReturnType<typeof stats>;
  log: string[];
}

const utcDay = (t: number) => new Date(t).toISOString().slice(0, 10);
const r2 = (x: number) => Math.round(x * 100) / 100;
const r1 = (x: number) => Math.round(x * 10) / 10;
const cagr = (start: number, end: number, days: number) => (start > 0 && days > 0 ? (Math.pow(end / start, 365.25 / days) - 1) * 100 : 0);

export function backtest(input: BacktestInput): BacktestResult {
  const key = input.dateKey ?? utcDay;
  const warmup = input.warmup ?? 260;
  const every = Math.max(1, input.every ?? 1);
  const dates = input.benchmark.map((b) => key(b.t));
  const benchClose = new Map(input.benchmark.map((b) => [key(b.t), b.c]));
  // For each symbol: index of its last bar on or before each calendar date.
  const idx: Record<string, Map<string, number>> = {};
  for (const [sym, bars] of Object.entries(input.series)) {
    const m = new Map<string, number>(); let j = -1;
    const keys = bars.map((b) => key(b.t));
    for (const d of dates) { while (j + 1 < bars.length && keys[j + 1] <= d) j++; if (j >= 0 && keys[j] === d) m.set(d, j); }
    idx[sym] = m;
  }

  let account: Account = { cash: input.startCash, equity: input.startCash, startingCash: input.startCash, pausedUntil: null, history: [] };
  let open: Trade[] = [];
  const done: Trade[] = [];
  const log: string[] = [];
  const curve: BacktestResult['equity'] = [];
  let costs = 0, exposureSum = 0, exposureDays = 0;
  const first = Math.min(warmup, Math.max(0, dates.length - 1));
  const bench0 = benchClose.get(dates[first]) ?? 1;

  for (let i = first; i < dates.length; i++) {
    const d = dates[i];
    const prices: Record<string, number> = {};
    const setups: Setup[] = [];
    const scan = (i - first) % every === 0;
    for (const [sym, bars] of Object.entries(input.series)) {
      const j = idx[sym].get(d); if (j === undefined) continue;
      prices[sym] = bars[j].c;
      if (!scan || j < warmup) continue;
      try {
        const t = analyze(sym, bars.slice(0, j + 1));
        const s = screen(t, scoreStock(t), input.rules.mode);
        if (s) setups.push(s);
      } catch { /* not enough history for this symbol yet */ }
    }
    const res = step({ rules: input.rules, account, trades: open, setups, prices, today: d });
    account = res.account;
    // Merge: changed versions replace the originals; created trades join.
    const changed = new Map(res.changed.map((t) => [`${t.symbol}|${t.createdOn}`, t]));
    open = open.map((t) => changed.get(`${t.symbol}|${t.createdOn}`) ?? t).concat(res.created);
    for (const t of open.filter((x) => x.status === 'closed' && x.closedOn === d && x.fillPrice != null && x.exitPrice != null)) {
      const c = r2(((t.fillPrice! + t.exitPrice!) * t.qty * input.costPct) / 100);
      t.pnl = r2((t.pnl ?? 0) - c); account.cash = r2(account.cash - c); account.equity = r2(account.equity - c); costs += c;
    }
    for (const t of open) if (t.status !== 'open' && t.status !== 'pending') done.push(t);
    open = open.filter((t) => t.status === 'open' || t.status === 'pending');
    if (account.history.length) account.history[account.history.length - 1] = { d, equity: account.equity };
    if (res.log.length) log.push(...res.log.map((l) => `${d} ${l}`));
    const inPos = open.filter((t) => t.status === 'open').reduce((s, t) => s + t.qty * (prices[t.symbol] ?? t.fillPrice ?? t.entry), 0);
    if (account.equity > 0) { exposureSum += inPos / account.equity; exposureDays++; }
    curve.push({ d, equity: account.equity, bench: r2((input.startCash * (benchClose.get(d) ?? bench0)) / bench0) });
  }

  const from = curve[0]?.d ?? '', to = curve.at(-1)?.d ?? '';
  const span = from && to ? (Date.parse(to) - Date.parse(from)) / 864e5 : 0;
  const end = curve.at(-1)?.equity ?? input.startCash, benchEnd = curve.at(-1)?.bench ?? input.startCash;
  const all = done.concat(open);
  return {
    from, to, days: curve.length, equity: curve, trades: all,
    totalReturnPct: r1(((end - input.startCash) / input.startCash) * 100), cagrPct: r1(cagr(input.startCash, end, span)),
    maxDrawdownPct: maxDrawdownPct(curve), benchReturnPct: r1(((benchEnd - input.startCash) / input.startCash) * 100),
    benchCagrPct: r1(cagr(input.startCash, benchEnd, span)), benchMaxDrawdownPct: maxDrawdownPct(curve.map((c) => ({ equity: c.bench }))),
    exposurePct: exposureDays ? r1((exposureSum / exposureDays) * 100) : 0, costs: r2(costs), stats: stats(all), log: log.slice(-200),
  };
}
