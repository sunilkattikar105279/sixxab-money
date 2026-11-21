import { NextResponse } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { memberClient } from '@/lib/supabase/server';

// Email confirmation and magic links land here, in either Supabase link style (?code= or ?token_hash=&type=).
// A failed or expired link goes back to sign-in with a clear message instead of a silent loop.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type') as EmailOtpType | null;
  const nextParam = url.searchParams.get('next');
  const next = nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/my-money';
  const sb = await memberClient();
  let ok = false;
  if (sb && code) ok = !(await sb.auth.exchangeCodeForSession(code)).error;
  else if (sb && tokenHash && type) ok = !(await sb.auth.verifyOtp({ token_hash: tokenHash, type })).error;
  if (!ok) return NextResponse.redirect(new URL('/login?error=link', url.origin));
  return NextResponse.redirect(new URL(`/onboarding?next=${encodeURIComponent(next)}`, url.origin));
}
