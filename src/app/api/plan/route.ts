import { NextResponse } from 'next/server';
import { z } from 'zod';
import { memberClient } from '@/lib/supabase/server';

const Body = z.object({ goals: z.array(z.object({ goal: z.string().max(200), how: z.string().max(400), done: z.boolean() })).max(10) });

export async function PATCH(req: Request) {
  const b = Body.safeParse(await req.json().catch(() => ({})));
  if (!b.success) return NextResponse.json({ error: 'invalid plan' }, { status: 400 });
  const sb = await memberClient(); if (!sb) return NextResponse.json({ error: 'not configured' }, { status: 503 });
  const { data: { user } } = await sb.auth.getUser(); if (!user) return NextResponse.json({ error: 'sign in' }, { status: 401 });
  const { data: plan } = await sb.from('plans').select('id').eq('member_id', user.id).eq('active', true).maybeSingle();
  const { error } = plan
    ? await sb.from('plans').update({ goals: b.data.goals }).eq('id', plan.id)
    : await sb.from('plans').insert({ member_id: user.id, goals: b.data.goals });
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ ok: true });
}
