// Nightly: SIXXAB Sentiment (US + India + rest of the world), stored with the latest US risk-meter row.
// Runs after the market ingest; non-blocking. Daily bars come from Yahoo Finance (free, delayed, end-of-day only).
import { createClient } from '@supabase/supabase-js';
import { yahooBars } from '../src/lib/providers/yahoo';
import { readSentiment, SENTIMENT_SYMBOLS, type Series, type SymKey } from '../src/lib/sentiment';

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env missing');
  const db = createClient(url, key, { auth: { persistSession: false } });
  const from = new Date(Date.now() - 800 * 86_400_000).toISOString();
  const s: Series = {};
  for (const [k, sym] of Object.entries(SENTIMENT_SYMBOLS) as [SymKey, string][]) {
    const bars = await yahooBars(sym.startsWith('^') || sym.includes('=') ? sym : `US:${sym}`, '1d', from);
    if (bars.length) s[k] = bars; else console.warn(`sentiment: no data for ${sym}`);
  }
  const latest = async (m: 'US' | 'IN') => (await db.from('market_regime').select('as_of, data').eq('market', m).order('as_of', { ascending: false }).limit(1).maybeSingle()).data;
  const [us, ind] = await Promise.all([latest('US'), latest('IN')]);
  const b = (row: { data: unknown } | null) => (row?.data as { breadth?: { pctAbove200?: number } } | undefined)?.breadth?.pctAbove200 ?? null;
  const read = readSentiment(s, { US: b(us), IN: b(ind) });
  if (!read) { console.log('sentiment: not enough data, skipped'); return; }
  if (!us) { console.log('sentiment: no US risk-meter row yet, skipped'); return; }
  const { error } = await db.from('market_regime').update({ data: { ...(us.data as object), sentiment: read } }).eq('market', 'US').eq('as_of', us.as_of);
  console.log(`${read.summary}${error ? ` (not stored: ${error.message})` : ''}`);
  for (const r of read.regions) console.log(`  ${r.name}: ${r.components.map((c) => `${c.label} ${c.score}`).join(' · ')} · phase ${r.phase.map((p) => `${p.index} ${p.phase}`).join(', ')}`);
  for (const n of read.flows.notes) console.log(`  flow: ${n}`);
  console.log(`  corr60: ${read.flows.corr60.map((x) => `${x.pair} ${x.value}`).join(' · ')}`);
  console.log(`  3-month gaps: ${read.flows.relative.map((x) => `${x.label} ${x.pct}`).join(' · ')}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
