import { createHash } from 'node:crypto';
import { adminClient } from './supabase/admin';

export type Rule = { name: string; limit: number; windowSeconds: number };

/** Agent questions cost money: visitors get a small daily allowance, members more, with a per-minute burst cap for everyone. */
export const AGENT_RULES = {
  anonymous: [{ name: 'agent-min', limit: 3, windowSeconds: 60 }, { name: 'agent-day', limit: 5, windowSeconds: 86_400 }],
  member: [{ name: 'agent-min', limit: 6, windowSeconds: 60 }, { name: 'agent-day', limit: 40, windowSeconds: 86_400 }],
  global: { name: 'agent-all-day', limit: Number(process.env.SIXXAB_AGENT_DAILY_CAP ?? 2000), windowSeconds: 86_400 },
} satisfies Record<string, Rule[] | Rule>;

export const WRITE_RULE: Rule = { name: 'write-min', limit: 30, windowSeconds: 60 };

/** Salted hash so raw IP addresses are never stored. */
export function visitorKey(req: Request): string {
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || req.headers.get('x-real-ip') || 'unknown';
  const salt = process.env.SIXXAB_CRON_SECRET ?? 'sixxab';
  return 'ip:' + createHash('sha256').update(salt + ip).digest('hex').slice(0, 32);
}

// Fallback when Supabase isn't configured (local demo): per-instance memory.
const mem = new Map<string, number>();

async function hit(key: string, rule: Rule): Promise<boolean> {
  const db = adminClient();
  if (db) {
    const { data, error } = await db.rpc('hit_rate_limit', { p_key: `${rule.name}:${key}`, p_limit: rule.limit, p_window_seconds: rule.windowSeconds });
    if (!error) return data === true;
    // If the limiter table is missing (migration not run), fail open rather than block everyone.
  }
  const w = Math.floor(Date.now() / 1000 / rule.windowSeconds);
  const k = `${rule.name}:${key}:${w}`;
  const n = (mem.get(k) ?? 0) + 1;
  mem.set(k, n);
  if (mem.size > 5000) mem.clear();
  return n <= rule.limit;
}

/** Returns null when allowed, or a message describing which limit was hit. */
export async function checkLimits(key: string, rules: Rule[]): Promise<string | null> {
  for (const r of rules) {
    if (!(await hit(key, r))) {
      return r.windowSeconds >= 86_400 ? 'daily' : 'minute';
    }
  }
  return null;
}
