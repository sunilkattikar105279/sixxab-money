import { NextResponse } from 'next/server';
import { z } from 'zod';
import { checkLimits, visitorKey, WRITE_RULE } from '@/lib/ratelimit';
import { adminClient } from '@/lib/supabase/admin';

// Feedback is the raw material for self-learning: it never changes an agent directly.
// The learner job turns patterns in feedback into proposals that must pass the learning gates.
const Body = z.object({ ledgerId: z.string().uuid(), rating: z.enum(['up', 'down']), correction: z.string().max(2000).optional() });

export async function POST(req: Request) {
  if (await checkLimits(visitorKey(req), [WRITE_RULE])) return NextResponse.json({ error: 'Too many requests. Please wait a minute.' }, { status: 429 });
  const b = Body.safeParse(await req.json().catch(() => ({})));
  if (!b.success) return NextResponse.json({ error: 'invalid feedback' }, { status: 400 });
  const db = adminClient();
  if (!db) return NextResponse.json({ ok: true, stored: false });
  const { error } = await db.from('feedback').insert({ ledger_id: b.data.ledgerId, rating: b.data.rating, correction: b.data.correction ?? null });
  return NextResponse.json({ ok: !error, stored: !error });
}
