import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ask } from '@/lib/agents/orchestrator';
import { record } from '@/lib/ledger';
import { memberClient } from '@/lib/supabase/server';
import { isMinor } from '@/lib/sixs';

const Body = z.object({ question: z.string().min(2).max(1000), country: z.enum(['US', 'IN']).default('US'), mood: z.number().int().min(1).max(5).optional() });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Ask a question of 2 to 1000 characters.' }, { status: 400 });

  // Who is asking: signed-in member (RLS client) or an anonymous visitor treated as a minor-safe adult with no advice rights.
  let memberId: string | undefined;
  let minor = false;
  let country = parsed.data.country;
  const sb = await memberClient();
  if (sb) {
    const { data: { user } } = await sb.auth.getUser();
    if (user) {
      memberId = user.id;
      const { data: p } = await sb.from('profiles').select('dob, country').eq('id', user.id).single();
      if (p?.dob) minor = isMinor(p.dob);
      if (p?.country === 'US' || p?.country === 'IN') country = p.country;
    }
  }

  try {
    const result = await ask({ question: parsed.data.question, memberId, ctx: { isMinor: minor, country, adviceRegistered: false }, mood: parsed.data.mood as 1 | 2 | 3 | 4 | 5 | undefined });
    const ledgerId = await record(parsed.data.question, memberId, result);
    return NextResponse.json({ ...result, ledgerId });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Agent error';
    return NextResponse.json({ error: msg.includes('ANTHROPIC_API_KEY') ? 'The agent is not configured yet.' : 'The agent could not answer right now.' }, { status: 503 });
  }
}
