import { NextResponse } from 'next/server';
import { memberClient } from '@/lib/supabase/server';

// Email confirmation and magic links land here.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const sb = await memberClient();
  if (code && sb) await sb.auth.exchangeCodeForSession(code);
  return NextResponse.redirect(new URL('/onboarding', url.origin));
}
