// Nightly: pull the daily-brief manifest the brief agent appends to after each post, and upsert it into `videos`.
// Manifest: [{ id, url, title, date, account, topics? }] at BRIEFS_MANIFEST_URL (default: sixxab-ai reel-media/briefs.json).
import { createClient } from '@supabase/supabase-js';

const MANIFEST = process.env.BRIEFS_MANIFEST_URL || 'https://raw.githubusercontent.com/sunilkattikar105279/sixxab-ai/reel-media/briefs.json';

type Entry = { id: string; url: string; title: string; date: string; account?: string; topics?: string[]; stages?: number[] };

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env missing');
  const res = await fetch(MANIFEST, { cache: 'no-store', signal: AbortSignal.timeout(20_000) });
  if (!res.ok) { console.log(`video sync: manifest ${res.status}, skipped`); return; }
  const list = ((await res.json()) as Entry[]).filter((e) => e.id && /^https:\/\/www\.instagram\.com\/reel\//.test(e.url) && /^\d{4}-\d{2}-\d{2}$/.test(e.date));
  if (!list.length) { console.log('video sync: manifest empty'); return; }
  const db = createClient(url, key, { auth: { persistSession: false } });
  const rows = list.map((e) => ({ id: e.id, url: e.url, title: e.title.slice(0, 160), date: e.date, topics: e.topics ?? ['daily-brief', 'markets'], stages: e.stages ?? [], account: e.account === 'sunil.kattikar' ? 'sunil.kattikar' : 'sixxab_money', published: true }));
  const { error } = await db.from('videos').upsert(rows, { onConflict: 'id' });
  console.log(`video sync: ${rows.length} briefs${error ? ` (error: ${error.message})` : ' upserted'}; latest ${rows.map((r) => r.date).sort().at(-1)}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
