import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getMember, thisMonth } from '@/lib/member';
import { checkLimits, visitorKey, WRITE_RULE } from '@/lib/ratelimit';

const Body = z.object({ habitMet: z.boolean(), netWorth: z.number().min(-1e10).max(1e12) });

/** Monthly check-in: did you keep this stage's habit, and what is your net worth? One per month, editable. */
export async function POST(req: Request) {
  if (await checkLimits(visitorKey(req), [WRITE_RULE])) return NextResponse.json({ error: 'Too many requests. Please wait a minute.' }, { status: 429 });
  const m = await getMember();
  if (!m?.member) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
  const b = Body.safeParse(await req.json().catch(() => ({})));
  if (!b.success) return NextResponse.json({ error: 'Enter your net worth and whether you kept the habit.' }, { status: 400 });
  const { error } = await m.sb.from('monthly_checks').upsert({ member_id: m.member.id, month: thisMonth(), habit_gate_met: b.data.habitMet, net_worth: b.data.netWorth }, { onConflict: 'member_id,month' });
  if (error) return NextResponse.json({ error: 'Could not save your check-in.' }, { status: 400 });
  return NextResponse.json({ ok: true });
}
