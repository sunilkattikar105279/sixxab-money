import { NextResponse } from 'next/server';
import { ask } from '@/lib/agents/orchestrator';
import { record } from '@/lib/ledger';
import { adminClient } from '@/lib/supabase/admin';
import { cronAuthorized } from '@/lib/cron';

// Called by n8n each weekday at 7:30 AM CST: writes the agent brief that the home page and the daily reel use.
export async function POST(req: Request) {
  if (!cronAuthorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const question = 'In 3 short sentences, what happened in US markets at the last close and why? Use get_market_snapshot for US. Then one line on what it means for a long-term index investor.';
  const r = await ask({ question, ctx: { isMinor: false, country: 'US', adviceRegistered: false } });
  const ledgerId = await record(question, undefined, r);
  const db = adminClient();
  if (db) await db.from('briefs').insert({ market: 'US', text: r.answer, sources: r.sources, ledger_id: ledgerId });
  return NextResponse.json({ ok: true, brief: r.answer, ledgerId });
}

export async function GET() {
  const db = adminClient();
  if (!db) return NextResponse.json({ brief: null });
  const { data } = await db.from('briefs').select('text, sources, created_at').eq('market', 'US').order('created_at', { ascending: false }).limit(1).maybeSingle();
  return NextResponse.json({ brief: data });
}
