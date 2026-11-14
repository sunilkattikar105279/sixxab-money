import { NextResponse } from 'next/server';
import { z } from 'zod';
import { memberClient } from '@/lib/supabase/server';
import { ageOn, MIN_AGE } from '@/lib/sixs';

const Body = z.object({ fullName: z.string().max(120).optional(), dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), country: z.enum(['US', 'IN']) });

export async function GET() {
  const sb = await memberClient(); if (!sb) return NextResponse.json({ user: null });
  const { data: { user } } = await sb.auth.getUser(); if (!user) return NextResponse.json({ user: null });
  const { data: profile } = await sb.from('profiles').select('full_name, dob, country, stage, status, role').eq('id', user.id).maybeSingle();
  return NextResponse.json({ user: { email: user.email }, profile });
}

export async function POST(req: Request) {
  const b = Body.safeParse(await req.json().catch(() => ({})));
  if (!b.success) return NextResponse.json({ error: 'Enter your date of birth and country.' }, { status: 400 });
  if (ageOn(b.data.dob) < MIN_AGE) return NextResponse.json({ error: 'SIXXAB Money is for ages 11 and up.' }, { status: 400 });
  const sb = await memberClient(); if (!sb) return NextResponse.json({ error: 'Sign-in is not configured.' }, { status: 503 });
  const { data: { user } } = await sb.auth.getUser(); if (!user) return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 });
  const { error } = await sb.from('profiles').insert({ id: user.id, full_name: b.data.fullName ?? null, dob: b.data.dob, country: b.data.country });
  if (error && !error.message.includes('duplicate')) return NextResponse.json({ error: error.message }, { status: 400 });
  const { data: profile } = await sb.from('profiles').select('status').eq('id', user.id).single();
  return NextResponse.json({ ok: true, status: profile?.status });
}
