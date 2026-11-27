import { NextResponse } from 'next/server';
import { getMember } from '@/lib/member';
import { kiteConfigured, kiteLoginUrl } from '@/lib/brokers/kite';

// Owner-only: start the daily Zerodha Kite login. Kite sends the owner back to /api/broker/kite/callback.
export async function GET(req: Request) {
  const m = await getMember();
  if (m?.member?.role !== 'admin') return NextResponse.redirect(new URL('/login', req.url));
  if (!kiteConfigured()) return NextResponse.json({ error: 'KITE_API_KEY and KITE_API_SECRET are not set' }, { status: 503 });
  return NextResponse.redirect(kiteLoginUrl());
}
