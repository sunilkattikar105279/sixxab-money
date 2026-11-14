import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getStocks } from '@/lib/data/stocks';
import { adminClient } from '@/lib/supabase/admin';
import { cronAuthorized } from '@/lib/cron';

const Market = z.enum(['US', 'IN', 'GLOBAL']);

export async function GET(req: Request) {
  const m = Market.safeParse(new URL(req.url).searchParams.get('market') ?? 'US');
  if (!m.success) return NextResponse.json({ error: 'market must be US, IN or GLOBAL' }, { status: 400 });
  return NextResponse.json(await getStocks(m.data));
}

// n8n posts the day's quotes from the licensed vendor.
const Body = z.object({
  market: Market,
  asOf: z.string(),
  source: z.string().min(2),
  quotes: z.array(z.object({ symbol: z.string(), name: z.string(), sector: z.string(), price: z.number().nullable(), changePct: z.number().nullable(), marketCap: z.number().nullable() })).min(1),
});

export async function POST(req: Request) {
  if (!cronAuthorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const b = Body.safeParse(await req.json().catch(() => ({})));
  if (!b.success) return NextResponse.json({ error: b.error.flatten() }, { status: 400 });
  const db = adminClient();
  if (!db) return NextResponse.json({ error: 'database not configured' }, { status: 503 });
  const rows = b.data.quotes.map((q) => ({ market: b.data.market, as_of: b.data.asOf, symbol: q.symbol, name: q.name, sector: q.sector, price: q.price, change_pct: q.changePct, market_cap: q.marketCap, source: b.data.source }));
  const { error } = await db.from('stock_quotes').upsert(rows, { onConflict: 'market,as_of,symbol' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, count: rows.length });
}
