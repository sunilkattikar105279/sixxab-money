import { NextResponse } from 'next/server';
import { getMember } from '@/lib/member';

/** Ask to move up a stage. The database trigger checks both gates over the last 3 consecutive months. */
export async function POST() {
  const m = await getMember();
  if (!m?.member) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
  if (m.member.stage >= 6) return NextResponse.json({ error: 'You are at the top stage.' }, { status: 400 });
  const { error } = await m.sb.from('profiles').update({ stage: m.member.stage + 1 }).eq('id', m.member.id);
  if (error) return NextResponse.json({ error: 'Not yet: both gates need to hold for 3 months in a row. Keep checking in each month.' }, { status: 400 });
  return NextResponse.json({ ok: true, stage: m.member.stage + 1 });
}
