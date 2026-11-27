import { NextResponse } from 'next/server';
import { getMember } from '@/lib/member';
import { adminClient } from '@/lib/supabase/admin';
import { kiteConfigured, kiteSession } from '@/lib/brokers/kite';

// Owner-only: Kite redirects here after login with ?request_token=...&status=success.
// Set this URL as the redirect URL of the Kite Connect app: https://money.sixxab.com/api/broker/kite/callback
export async function GET(req: Request) {
  const url = new URL(req.url);
  const back = (q: string) => NextResponse.redirect(new URL(`/my-money/live?kite=${q}`, req.url));
  const m = await getMember();
  if (m?.member?.role !== 'admin') return NextResponse.redirect(new URL('/login', req.url));
  const token = url.searchParams.get('request_token');
  if (!kiteConfigured() || !token || url.searchParams.get('status') !== 'success') return back('failed');
  try {
    const s = await kiteSession(token);
    const db = adminClient(); if (!db) return back('nodb');
    const { error } = await db.from('broker_tokens').upsert({ broker: 'kite', access_token: s.accessToken, user_id: s.userId, created_at: new Date().toISOString() });
    return back(error ? 'nodb' : 'ok');
  } catch { return back('failed'); }
}
