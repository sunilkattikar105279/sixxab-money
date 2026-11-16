// Manage money: budget, emergency fund, debts and net worth. Pure functions shared by the UI, API and agents.

export interface Debt { name: string; balance: number; ratePct: number; minPayment: number }
export interface Asset { name: string; value: number; kind: 'cash' | 'savings' | 'investments' | 'retirement' | 'property' | 'other' }
export interface Budget { income: number; needs: number; wants: number; save: number; invest: number }
export interface MoneyData {
  budget: Budget;
  /** Target split in % (needs, wants, save, invest); defaults to 50/25/15/10. */
  split: [number, number, number, number];
  emergency: { monthsGoal: number; saved: number };
  debts: Debt[];
  assets: Asset[];
}

export const EMPTY_MONEY: MoneyData = {
  budget: { income: 0, needs: 0, wants: 0, save: 0, invest: 0 },
  split: [50, 25, 15, 10],
  emergency: { monthsGoal: 6, saved: 0 },
  debts: [],
  assets: [],
};

const num = (v: unknown, min = 0, max = 1e12) => { const n = Number(v); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : 0; };

/** Accepts anything (stored JSON, a form post) and returns clean, bounded data. */
export function normalizeMoney(raw: unknown): MoneyData {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<MoneyData>;
  const b = (r.budget ?? {}) as Partial<Budget>;
  const split = Array.isArray(r.split) && r.split.length === 4 ? (r.split.map((x) => num(x, 0, 100)) as MoneyData['split']) : EMPTY_MONEY.split;
  return {
    budget: { income: num(b.income), needs: num(b.needs), wants: num(b.wants), save: num(b.save), invest: num(b.invest) },
    split,
    emergency: { monthsGoal: num(r.emergency?.monthsGoal ?? 6, 1, 24), saved: num(r.emergency?.saved) },
    debts: (Array.isArray(r.debts) ? r.debts : []).slice(0, 20).map((d) => ({ name: String(d?.name ?? 'Debt').slice(0, 60), balance: num(d?.balance), ratePct: num(d?.ratePct, 0, 100), minPayment: num(d?.minPayment) })),
    assets: (Array.isArray(r.assets) ? r.assets : []).slice(0, 30).map((a) => ({ name: String(a?.name ?? 'Account').slice(0, 60), value: num(a?.value), kind: (['cash', 'savings', 'investments', 'retirement', 'property', 'other'] as const).includes(a?.kind as Asset['kind']) ? (a.kind as Asset['kind']) : 'other' })),
  };
}

export function budgetView(d: MoneyData) {
  const { income, needs, wants, save, invest } = d.budget;
  const spent = needs + wants + save + invest;
  const rows = (['needs', 'wants', 'save', 'invest'] as const).map((k, i) => {
    const target = (income * d.split[i]) / 100;
    const actual = d.budget[k];
    // Over target is bad for needs/wants, good for save/invest.
    const good = i < 2 ? actual <= target : actual >= target;
    return { key: k, label: ['Needs', 'Wants', 'Save', 'Invest'][i], targetPct: d.split[i], target, actual, good };
  });
  return { income, spent, left: income - spent, savingsRatePct: income > 0 ? ((save + invest) / income) * 100 : 0, rows };
}

export function emergencyView(d: MoneyData) {
  const monthly = d.budget.needs || 0;
  const goal = monthly * d.emergency.monthsGoal;
  const months = monthly > 0 ? d.emergency.saved / monthly : 0;
  return { monthly, goal, saved: d.emergency.saved, months, pct: goal > 0 ? Math.min(1, d.emergency.saved / goal) : 0 };
}

export function netWorth(d: MoneyData) {
  const assets = d.assets.reduce((s, a) => s + a.value, 0) + d.emergency.saved;
  const debts = d.debts.reduce((s, x) => s + x.balance, 0);
  return { assets, debts, netWorth: assets - debts };
}

/**
 * Debt avalanche: pay minimums on everything and put `extra` on the highest-rate debt, rolling freed payments forward.
 * Returns payoff order with months to clear each, total months and total interest. Capped at 600 months.
 */
export function avalanche(debts: Debt[], extra: number) {
  const ds = debts.filter((d) => d.balance > 0).map((d) => ({ ...d })).sort((a, b) => b.ratePct - a.ratePct);
  const order: { name: string; month: number }[] = [];
  let month = 0, interest = 0;
  const budget = ds.reduce((s, d) => s + d.minPayment, 0) + Math.max(0, extra);
  if (!ds.length) return { order, months: 0, interest: 0, feasible: true };
  while (ds.some((d) => d.balance > 0.005) && month < 600) {
    month++;
    // Interest first.
    for (const d of ds) if (d.balance > 0) { const i = (d.balance * d.ratePct) / 1200; d.balance += i; interest += i; }
    let pool = budget;
    // Minimums.
    for (const d of ds) if (d.balance > 0) { const p = Math.min(d.minPayment, d.balance); d.balance -= p; pool -= p; }
    // Extra to the highest rate first.
    for (const d of ds) { if (pool <= 0) break; if (d.balance > 0) { const p = Math.min(pool, d.balance); d.balance -= p; pool -= p; } }
    for (const d of ds) if (d.balance <= 0.005 && !order.find((o) => o.name === d.name)) { d.balance = 0; order.push({ name: d.name, month }); }
  }
  const feasible = month < 600;
  return { order, months: feasible ? month : Infinity, interest: Math.round(interest), feasible };
}
