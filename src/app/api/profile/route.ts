import { NextResponse } from 'next/server';
import { z } from 'zod';
import { checkLimits, visitorKey, WRITE_RULE } from '@/lib/ratelimit';
import { memberClient } from '@/lib/supabase/server';
import { ageOn, MIN_AGE } from '@/lib/sixs';
import { GOALS, STARTER_PLANS, type GoalId } from '@/lib/growth';

const Body = z.object({
  fullName: z.string().max(120).optional(),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  country: z.enum(['US', 'IN']),
  goal: z.enum(GOALS.map((g) => g.id) as [GoalId, ...GoalId[]]).optional(),
  acceptTerms: z.literal(true),
  emailUpdates: z.boolean().default(false),
  ref: z.string().regex(/^[a-z0-9]{4,16}$/i).optional(),
});

export async function GET() {
  const sb = await memberClient(); if (!sb) return NextResponse.json({ user: null });
  const { data: { user } } = await sb.auth.getUser(); if (!user) return NextResponse.json({ user: null });
  const { data: profile } = await sb.from('profiles').select('full_name, dob, country, stage, status, role, goal, founding_number, referral_code').eq('id', user.id).maybeSingle();
  return NextResponse.json({ user: { email: user.email }, profile });
}

export async function POST(req: Request) {
  if (await checkLimits(visitorKey(req), [WRITE_RULE])) return NextResponse.json({ error: 'Too many requests. Please wait a minute.' }, { status: 429 });
  const b = Body.safeParse(await req.json().catch(() => ({})));
  if (!b.success) {
    const terms = b.error.issues.some((i) => i.path[0] === 'acceptTerms');
    return NextResponse.json({ error: terms ? 'Please agree to the Terms and Privacy policy to continue.' : 'Enter your date of birth and country.' }, { status: 400 });
  }
  if (ageOn(b.data.dob) < MIN_AGE) return NextResponse.json({ error: 'SIXXAB Money is for ages 11 and up.' }, { status: 400 });
  const sb = await memberClient(); if (!sb) return NextResponse.json({ error: 'Sign-in is not configured.' }, { status: 503 });
  const { data: { user } } = await sb.auth.getUser(); if (!user) return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 });
  const referredBy = b.data.ref ? ((await sb.rpc('referrer_id', { p_code: b.data.ref })).data as string | null) : null;
  const { error } = await sb.from('profiles').insert({
    id: user.id, full_name: b.data.fullName ?? null, dob: b.data.dob, country: b.data.country,
    goal: b.data.goal ?? null, accepted_terms_at: new Date().toISOString(), email_updates: b.data.emailUpdates,
    referred_by: referredBy && referredBy !== user.id ? referredBy : null,
  });
  if (error && !error.message.includes('duplicate')) return NextResponse.json({ error: error.message }, { status: 400 });
  // A new member never lands on an empty page: start a 90-day plan from their goal.
  if (!error && b.data.goal) await sb.from('plans').insert({ member_id: user.id, goals: STARTER_PLANS[b.data.goal] });
  const { data: profile } = await sb.from('profiles').select('status, founding_number').eq('id', user.id).single();
  return NextResponse.json({ ok: true, status: profile?.status, foundingNumber: profile?.founding_number ?? null });
}
