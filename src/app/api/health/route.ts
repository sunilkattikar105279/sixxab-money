import { NextResponse } from 'next/server';
import { checks } from '@/lib/health';

export const dynamic = 'force-dynamic';
export async function GET() {
  const list = await checks();
  return NextResponse.json({ ok: list.every((c) => c.ok !== false), checks: list });
}
