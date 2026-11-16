import { describe, expect, it } from 'vitest';
import { avalanche, budgetView, emergencyView, netWorth, normalizeMoney } from '../src/lib/money';
import { step, stats, maxDrawdownPct, type Account, type Rules, type Trade } from '../src/lib/autotrade';
import type { Setup } from '../src/lib/screener';

describe('manage money', () => {
  const d = normalizeMoney({ budget: { income: 5000, needs: 2600, wants: 1000, save: 900, invest: 500 }, emergency: { monthsGoal: 6, saved: 5200 }, debts: [{ name: 'Card', balance: 3000, ratePct: 24, minPayment: 90 }, { name: 'Car', balance: 8000, ratePct: 7, minPayment: 250 }], assets: [{ name: 'Brokerage', value: 4000, kind: 'investments' }] });

  it('cleans bad input', () => {
    const n = normalizeMoney({ budget: { income: -5, needs: 'abc' }, split: [1, 2], debts: 'x' });
    expect(n.budget.income).toBe(0); expect(n.budget.needs).toBe(0); expect(n.split).toEqual([50, 25, 15, 10]); expect(n.debts).toEqual([]);
  });
  it('compares the budget with the target split', () => {
    const b = budgetView(d);
    expect(b.left).toBe(0); expect(Math.round(b.savingsRatePct)).toBe(28);
    expect(b.rows[0]).toMatchObject({ key: 'needs', target: 2500, good: false });
    expect(b.rows[2]).toMatchObject({ key: 'save', target: 750, good: true });
  });
  it('measures the emergency fund in months of needs', () => {
    const e = emergencyView(d); expect(e.months).toBe(2); expect(e.goal).toBe(15600);
  });
  it('computes net worth', () => { expect(netWorth(d).netWorth).toBe(4000 + 5200 - 11000); });
  it('pays the highest rate first with the avalanche method', () => {
    const a = avalanche(d.debts, 300);
    expect(a.feasible).toBe(true); expect(a.order[0].name).toBe('Card'); expect(a.order[1].name).toBe('Car'); expect(a.months).toBeGreaterThan(12);
    expect(avalanche([{ name: 'X', balance: 1000, ratePct: 30, minPayment: 10 }], 0).feasible).toBe(false);
  });
});

describe('auto-trade engine (paper)', () => {
  const rules: Rules = { mode: 'invest', minScore: 7, riskPct: 1, maxPositionPct: 20, maxPositions: 3, dailyLossPct: 3, allowShort: false, withTrendOnly: true };
  const acc: Account = { cash: 10_000, equity: 10_000, startingCash: 10_000, pausedUntil: null, history: [] };
  const setup = (symbol: string, score: number, entry = 100, stop = 95): Setup => ({ symbol, mode: 'invest', side: 'long', entry, stop, target: entry + 2 * (entry - stop), rr: 2, withTrend: true, timeframe: 'W', reasons: ['weekly up'], score });

  it('opens sized positions from qualifying setups only', () => {
    const r = step({ rules, account: acc, trades: [], setups: [setup('AAA', 8), setup('BBB', 6), setup('CCC', 9, 50, 48)], prices: { AAA: 100, BBB: 100, CCC: 51 }, today: '2026-11-16' });
    expect(r.created.map((t) => t.symbol)).toEqual(['CCC', 'AAA']); // BBB below min score; highest score first
    const aaa = r.created.find((t) => t.symbol === 'AAA')!;
    expect(aaa.qty).toBe(20);            // risk $100 / $5 = 20 shares; 20% cap = 20 shares
    expect(aaa.status).toBe('open');     // price at entry, fills immediately
    const ccc = r.created.find((t) => t.symbol === 'CCC')!;
    expect(ccc.status).toBe('pending');  // price 51 is above entry 50 (beyond 0.5%)
    expect(r.account.equity).toBeCloseTo(10_000, 0);
  });

  it('closes at the target and stop, and books P&L', () => {
    const open = (symbol: string): Trade => ({ id: 1, symbol, side: 'long', status: 'open', qty: 10, entry: 100, stop: 95, target: 110, fillPrice: 100, setupScore: 8, reasons: [], createdOn: '2026-11-10', openedOn: '2026-11-10' });
    const start: Account = { ...acc, cash: 8000, equity: 10_000 };
    const r = step({ rules, account: start, trades: [open('WIN'), { ...open('LOSE'), id: 2 }], setups: [], prices: { WIN: 112, LOSE: 94 }, today: '2026-11-16' });
    const win = r.changed.find((t) => t.symbol === 'WIN')!, lose = r.changed.find((t) => t.symbol === 'LOSE')!;
    expect(win).toMatchObject({ status: 'closed', exitReason: 'target', exitPrice: 110, pnl: 100 });
    expect(lose).toMatchObject({ status: 'closed', exitReason: 'stop', exitPrice: 94, pnl: -60 });
    expect(r.account.cash).toBe(8000 + 1000 + 100 + 1000 - 60);
    expect(stats([win, lose])).toMatchObject({ closed: 2, winRate: 50, realized: 40 });
  });

  it('expires stale orders and pauses after the daily loss limit', () => {
    const pending: Trade = { id: 3, symbol: 'OLD', side: 'long', status: 'pending', qty: 10, entry: 100, stop: 95, target: 110, setupScore: 8, reasons: [], createdOn: '2026-11-01' };
    const r = step({ rules, account: { ...acc, cash: 9000, equity: 10_000, history: [{ d: '2026-11-13', equity: 10_500 }] }, trades: [pending], setups: [setup('NEW', 9)], prices: { NEW: 100 }, today: '2026-11-16' });
    expect(r.changed[0].status).toBe('expired');
    expect(r.account.pausedUntil).toBe('2026-11-17'); // 10,000 vs 10,500 = -4.8%
    expect(r.created).toHaveLength(0);
  });

  it('reports drawdown', () => { expect(maxDrawdownPct([{ equity: 100 }, { equity: 120 }, { equity: 90 }, { equity: 130 }])).toBe(25); });
});
