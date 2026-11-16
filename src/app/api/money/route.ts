import { NextResponse } from 'next/server';
import { getMember } from '@/lib/member';
import { normalizeMoney, netWorth } from '@/lib/money';
import { checkLimits, visitorKey, WRITE_RULE } from '@/lib/ratelimit';

export async function GET() {
  const m = await getMember();
  if (!m?.member) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
  const { data } = await m.sb.from('member_money').select('data, updated_at').eq('member_id', m.member.id).maybeSingle();
  return NextResponse.json({ data: normalizeMoney(data?.data), updatedAt: data?.updated_at ?? null });
}

export async function PUT(req: Request) {
  if (await checkLimits(visitorKey(req), [WRITE_RULE])) return NextResponse.json({ error: 'Too many requests. Please wait a minute.' }, { status: 429 });
  const m = await getMember();
  if (!m?.member) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
  const data = normalizeMoney(await req.json().catch(() => ({})));
  const { error } = await m.sb.from('member_money').upsert({ member_id: m.member.id, data, updated_at: new Date().toISOString() });
  if (error) return NextResponse.json({ error: 'Could not save. Please try again.' }, { status: 400 });
  return NextResponse.json({ ok: true, data, netWorth: netWorth(data).netWorth });
}
