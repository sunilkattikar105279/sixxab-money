import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSnapshot } from '@/lib/data/market';
import { adminClient } from '@/lib/supabase/admin';
import { cronAuthorized } from '@/lib/cron';

const Market = z.enum(['US', 'IN', 'GLOBAL']);

export async function GET(req: Request) {
  const m = Market.safeParse(new URL(req.url).searchParams.get('market') ?? 'US');
  if (!m.success) return NextResponse.json({ error: 'market must be US, IN or GLOBAL' }, { status: 400 });
  return NextResponse.json(await getSnapshot(m.data));
}

// n8n posts a snapshot from the licensed data vendor after each close.
const Snapshot = z.object({
  market: Market,
  asOf: z.string(),
  source: z.string().min(2),
  indices: z.array(z.object({ name: z.string(), value: z.number(), change: z.number(), changePct: z.number(), why: z.string().optional() })),
});

export async function POST(req: Request) {
  if (!cronAuthorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const s = Snapshot.safeParse(await req.json().catch(() => ({})));
  if (!s.success) return NextResponse.json({ error: s.error.flatten() }, { status: 400 });
  const db = adminClient();
  if (!db) return NextResponse.json({ error: 'database not configured' }, { status: 503 });
  const { error } = await db.from('market_snapshots').upsert({ market: s.data.market, as_of: s.data.asOf, source: s.data.source, indices: s.data.indices }, { onConflict: 'market,as_of' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
