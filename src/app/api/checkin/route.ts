import { NextResponse } from 'next/server';
import { z } from 'zod';
import { checkLimits, visitorKey, WRITE_RULE } from '@/lib/ratelimit';
import { memberClient } from '@/lib/supabase/server';
import { plan } from '@/lib/emotion';

const Body = z.object({ mood: z.number().int().min(1).max(5) });

export async function POST(req: Request) {
  if (await checkLimits(visitorKey(req), [WRITE_RULE])) return NextResponse.json({ error: 'Too many requests. Please wait a minute.' }, { status: 429 });
  const b = Body.safeParse(await req.json().catch(() => ({})));
  if (!b.success) return NextResponse.json({ error: 'mood must be 1 to 5' }, { status: 400 });
  const p = plan([], b.data.mood as 1 | 2 | 3 | 4 | 5);
  const sb = await memberClient();
  if (sb) {
    const { data: { user } } = await sb.auth.getUser();
    if (user) await sb.from('mood_checkins').insert({ member_id: user.id, mood: b.data.mood });
  }
  const message = p.tone === 'reassure' ? 'Thanks for telling me. We’ll take it one small step at a time today.' : p.tone === 'celebrate' ? 'Love that. Let’s keep the momentum steady.' : 'Thanks for checking in.';
  return NextResponse.json({ tone: p.tone, message });
}
