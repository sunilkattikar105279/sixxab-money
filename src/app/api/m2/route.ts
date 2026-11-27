import { NextResponse } from 'next/server';
import { getTide, tideBrief } from '@/lib/data/liquidity';

export const revalidate = 3600;

// Tide's M2 reading as JSON: used by the daily and weekend briefs (caption_line) and anyone who wants the numbers.
export async function GET() {
  const t = await getTide();
  if (!t.available) return NextResponse.json({ error: 'M2 data unavailable' }, { status: 503 });
  return NextResponse.json(tideBrief(t), { headers: { 'cache-control': 'public, s-maxage=3600, stale-while-revalidate=86400' } });
}
