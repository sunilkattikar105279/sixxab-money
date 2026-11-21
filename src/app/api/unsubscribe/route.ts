import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { adminClient } from '@/lib/supabase/admin';
import { unsubscribeToken } from '@/lib/email';
import { SITE } from '@/lib/site';

// One-click unsubscribe from welcome and update emails (link in every email, plus the List-Unsubscribe header).
async function optOut(req: Request): Promise<boolean> {
  const url = new URL(req.url);
  const u = url.searchParams.get('u') ?? '', t = url.searchParams.get('t') ?? '';
  if (!/^[0-9a-f-]{36}$/i.test(u) || t.length !== 32) return false;
  const want = Buffer.from(unsubscribeToken(u)), got = Buffer.from(t);
  if (!timingSafeEqual(want, got)) return false;
  const db = adminClient(); if (!db) return false;
  return !(await db.from('profiles').update({ email_updates: false }).eq('id', u)).error;
}

const page = (ok: boolean) => new NextResponse(`<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${SITE.name}</title><body style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:60px auto;padding:0 20px;color:#0b1b33"><h1 style="font-size:22px">${ok ? 'You are unsubscribed' : 'That link did not work'}</h1><p>${ok ? 'You will not get any more update emails from SIXXAB Money. Account emails, like sign-in links, still arrive when you ask for them.' : `Email <a href="mailto:${SITE.contactEmail}">${SITE.contactEmail}</a> and we will remove you right away.`}</p><p><a href="${SITE.url}">Back to ${SITE.name}</a></p></body></html>`, { status: ok ? 200 : 400, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });

export async function GET(req: Request) { return page(await optOut(req)); }
// Mail apps send a POST for one-click unsubscribe (RFC 8058).
export async function POST(req: Request) { const ok = await optOut(req); return new NextResponse(null, { status: ok ? 200 : 400 }); }
