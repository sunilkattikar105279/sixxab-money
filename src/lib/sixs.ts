// Personal 6S journey: six stages, each passed by a habit gate AND a net-worth gate.
// A member moves up only when both gates have held for 3 consecutive monthly check-ins.
// The same rule is enforced in the database (supabase/migrations/0001_init.sql, promote_stage trigger);
// this module mirrors it so the UI and the agents can explain progress.

export type Country = 'US' | 'IN';

export interface Stage {
  n: 1 | 2 | 3 | 4 | 5 | 6;
  key: 'startup' | 'struggle' | 'scale' | 'success' | 'significance' | 'sixxab';
  name: string;
  focus: string;
  habitGate: string;
  /** Net worth needed to leave this stage, by country (USD for US, INR for India). null = top stage. */
  netWorthGate: Record<Country, number> | null;
}

// India gates are set by purchasing power, not the exchange rate (open question in the blueprint).
export const STAGES: Stage[] = [
  { n: 1, key: 'startup', name: 'Startup', focus: 'Learn money basics: earning, saving, needs vs wants', habitGate: 'Tracks money for 30 days and sets one savings goal', netWorthGate: { US: 100, IN: 2_000 } },
  { n: 2, key: 'struggle', name: 'Struggle', focus: 'First income: budget, bank account, avoid bad debt', habitGate: '3 months on budget and 1 month of costs saved', netWorthGate: { US: 1_000, IN: 25_000 } },
  { n: 3, key: 'scale', name: 'Scale', focus: 'Emergency fund, clear high-interest debt, start investing', habitGate: '6-month emergency fund and invests every month', netWorthGate: { US: 10_000, IN: 250_000 } },
  { n: 4, key: 'success', name: 'Success', focus: 'Financial independence path, insurance, tax plan', habitGate: 'Savings rate of 20% or more for 12 months', netWorthGate: { US: 100_000, IN: 2_500_000 } },
  { n: 5, key: 'significance', name: 'Significance', focus: 'Wealth, giving back, mentoring others', habitGate: 'Written giving plan and mentors at least one person', netWorthGate: { US: 1_000_000, IN: 25_000_000 } },
  { n: 6, key: 'sixxab', name: 'SIXXAB', focus: 'Legacy, estate, leadership, community capital', habitGate: 'Estate plan and a foundation or community fund', netWorthGate: null },
];

export const HOLD_MONTHS = 3;

export interface MonthlyCheck {
  month: string; // YYYY-MM
  habitGateMet: boolean;
  netWorth: number; // in the member's own currency
}

export function stageOf(n: number): Stage {
  const s = STAGES.find((x) => x.n === n);
  if (!s) throw new Error(`Unknown stage ${n}`);
  return s;
}

/** Both gates met in one monthly check. */
export function gatesMet(stage: Stage, check: MonthlyCheck, country: Country): boolean {
  if (!stage.netWorthGate) return false;
  return check.habitGateMet && check.netWorth >= stage.netWorthGate[country];
}

/**
 * True when the last HOLD_MONTHS checks are consecutive months and each met both gates.
 * `checks` may be in any order.
 */
export function canPromote(stage: Stage, checks: MonthlyCheck[], country: Country): boolean {
  if (!stage.netWorthGate) return false;
  const sorted = [...checks].sort((a, b) => a.month.localeCompare(b.month));
  const last = sorted.slice(-HOLD_MONTHS);
  if (last.length < HOLD_MONTHS) return false;
  for (let i = 1; i < last.length; i++) {
    if (monthIndex(last[i].month) - monthIndex(last[i - 1].month) !== 1) return false;
  }
  return last.every((c) => gatesMet(stage, c, country));
}

/** 0..1 progress toward the net-worth gate, for progress bars. */
export function netWorthProgress(stage: Stage, netWorth: number, country: Country): number {
  if (!stage.netWorthGate) return 1;
  return Math.max(0, Math.min(1, netWorth / stage.netWorthGate[country]));
}

/** Age in whole years on a given date (default today). */
export function ageOn(dob: string, on: Date = new Date()): number {
  const d = new Date(dob + 'T00:00:00Z');
  let age = on.getUTCFullYear() - d.getUTCFullYear();
  const m = on.getUTCMonth() - d.getUTCMonth();
  if (m < 0 || (m === 0 && on.getUTCDate() < d.getUTCDate())) age--;
  return age;
}

export const MIN_AGE = 11;
export const isMinor = (dob: string, on?: Date) => ageOn(dob, on) < 18;

function monthIndex(ym: string): number {
  const [y, m] = ym.split('-').map(Number);
  return y * 12 + (m - 1);
}

export function formatMoney(v: number, country: Country): string {
  return country === 'IN'
    ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v)
    : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);
}
