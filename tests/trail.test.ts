import { describe, expect, it } from 'vitest';
import { step, type Rules, type Trade, type Account } from '@/lib/autotrade';

const rules: Rules = { mode: 'invest', minScore: 7, riskPct: 0.5, maxPositionPct: 25, maxPositions: 6, dailyLossPct: 50, allowShort: false, withTrendOnly: true, trail: { startR: 1, distR: 1.5, keepTarget: false } };
const acct: Account = { cash: 4000, equity: 5000, startingCash: 5000, pausedUntil: null, history: [] };
const open: Trade = { symbol: 'AAA', side: 'long', status: 'open', qty: 10, entry: 100, stop: 95, target: 110, fillPrice: 100, setupScore: 8, reasons: [], createdOn: '2026-01-02', openedOn: '2026-01-02', risk: 5 };

describe('trailing stop', () => {
  it('lets a winner run past the target and exits on the trailed stop', () => {
    let a = acct, ts = [open];
    for (const [d, p] of [['2026-01-05', 112], ['2026-01-06', 120], ['2026-01-07', 118]] as const) {
      const r = step({ rules, account: a, trades: ts, setups: [], prices: { AAA: p }, today: d });
      a = r.account; ts = ts.map((t) => r.changed.find((c) => c.symbol === t.symbol) ?? t);
      expect(ts[0].status).toBe('open'); // no exit at the 110 target
    }
    expect(ts[0].stop).toBe(112.5); // best close 120 − 1.5 × 5
    const r = step({ rules, account: a, trades: ts, setups: [], prices: { AAA: 112 }, today: '2026-01-08' });
    const t = r.changed.find((c) => c.symbol === 'AAA')!;
    expect(t.status).toBe('closed'); expect(t.exitReason).toBe('trailing stop'); expect(t.pnl).toBe(120);
  });
  it('keeps the old behaviour without the trail rule', () => {
    const { trail: _t, ...plain } = rules;
    const r = step({ rules: plain, account: acct, trades: [open], setups: [], prices: { AAA: 112 }, today: '2026-01-05' });
    expect(r.changed[0].exitReason).toBe('target');
  });
});
