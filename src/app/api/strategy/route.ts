import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getMember } from '@/lib/member';
import { adminClient } from '@/lib/supabase/admin';
import { levelsAllowed } from '@/lib/compliance';
import { liveTradingEnabled } from '@/lib/providers/alpaca-trading';
import { checkLimits, visitorKey, WRITE_RULE } from '@/lib/ratelimit';

const Rules = z.object({
  name: z.string().min(1).max(60).default('My swing strategy'),
  market: z.enum(['US', 'IN']).default('US'),
  minScore: z.number().min(5).max(10),
  riskPct: z.number().min(0.25).max(2),
  maxPositionPct: z.number().min(5).max(25),
  maxPositions: z.number().int().min(1).max(10),
  dailyLossPct: z.number().min(1).max(10),
  allowShort: z.boolean(),
  withTrendOnly: z.boolean(),
  startingCash: z.number().min(1000).max(10_000_000).optional(),
  acknowledge: z.literal(true),
  broker: z.enum(['paper', 'alpaca']).default('paper'),
});

async function guard(req: Request) {
  if (await checkLimits(visitorKey(req), [WRITE_RULE])) return { error: NextResponse.json({ error: 'Too many requests. Please wait a minute.' }, { status: 429 }) };
  const m = await getMember();
  if (!m?.member) return { error: NextResponse.json({ error: 'Please sign in.' }, { status: 401 }) };
  if (!m.member.adult || m.member.status !== 'active') return { error: NextResponse.json({ error: 'Grow money is for members aged 18 and over.' }, { status: 403 }) };
  const db = adminClient();
  if (!db) return { error: NextResponse.json({ error: 'Not configured.' }, { status: 503 }) };
  return { error: null, m: m.member, db };
}

/** Create or update the member's auto-trade rules. A new strategy starts a fresh paper account. */
export async function POST(req: Request) {
  const g = await guard(req); if (g.error) return g.error;
  const b = Rules.safeParse(await req.json().catch(() => ({})));
  if (!b.success) return NextResponse.json({ error: b.error.issues.some((i) => i.path[0] === 'acknowledge') ? 'Please confirm you understand these are simulated trades for learning.' : 'Check the rule values and try again.' }, { status: 400 });
  const r = b.data;
  if (!levelsAllowed(r.market)) return NextResponse.json({ error: 'India auto-trading needs SEBI research-analyst registration, so it is not available yet. Choose US.' }, { status: 400 });
  // Broker link is owner-only and off unless SIXXAB_LIVE_TRADING=true. Everyone else trades on paper.
  const broker = r.broker === 'alpaca' && g.m.role === 'admin' && liveTradingEnabled() && r.market === 'US' ? 'alpaca' : 'paper';

  const row = { member_id: g.m.id, name: r.name, market: r.market, mode: 'invest', min_score: r.minScore, risk_pct: r.riskPct, max_position_pct: r.maxPositionPct, max_positions: r.maxPositions, daily_loss_pct: r.dailyLossPct, allow_short: r.allowShort, with_trend_only: r.withTrendOnly, broker };
  const { data: existing } = await g.db.from('strategies').select('id, market').eq('member_id', g.m.id).maybeSingle();
  if (existing && existing.market !== r.market) return NextResponse.json({ error: 'Reset your paper account before switching markets.' }, { status: 400 });
  const { data: s, error } = existing
    ? await g.db.from('strategies').update(row).eq('id', existing.id).select('id').single()
    : await g.db.from('strategies').insert(row).select('id').single();
  if (error || !s) return NextResponse.json({ error: error?.message.includes('18') ? 'Grow money is for members aged 18 and over.' : 'Could not save your rules.' }, { status: 400 });
  if (!existing) {
    const cash = r.startingCash ?? (r.market === 'IN' ? 1_000_000 : 10_000);
    await g.db.from('paper_accounts').insert({ strategy_id: s.id, member_id: g.m.id, currency: r.market === 'IN' ? 'INR' : 'USD', starting_cash: cash, cash, equity: cash, equity_history: [{ d: new Date().toISOString().slice(0, 10), equity: cash }] });
  }
  return NextResponse.json({ ok: true, id: s.id, broker });
}

/** Pause or resume auto-trading. */
export async function PATCH(req: Request) {
  const g = await guard(req); if (g.error) return g.error;
  const b = z.object({ active: z.boolean() }).safeParse(await req.json().catch(() => ({})));
  if (!b.success) return NextResponse.json({ error: 'Bad request.' }, { status: 400 });
  await g.db.from('strategies').update({ active: b.data.active }).eq('member_id', g.m.id);
  return NextResponse.json({ ok: true, active: b.data.active });
}

/** Reset: cancel orders, close the paper account and start over. Trade history is deleted with it. */
export async function DELETE(req: Request) {
  const g = await guard(req); if (g.error) return g.error;
  await g.db.from('strategies').delete().eq('member_id', g.m.id);
  return NextResponse.json({ ok: true });
}
