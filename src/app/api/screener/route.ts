import { NextResponse } from 'next/server';
import { z } from 'zod';
import { adminClient } from '@/lib/supabase/admin';
import { runMarket } from '@/lib/pipeline';
import { providerConfigured } from '@/lib/providers';
import { levelsAllowed } from '@/lib/compliance';
import { FREE_SCREENER_ROWS, signedIn } from '@/lib/viewer';

const Q = z.object({ market: z.enum(['US', 'IN', 'GLOBAL']).default('US'), mode: z.enum(['invest', 'day', 'quick']).default('invest') });

export const maxDuration = 60;

const cache = new Map<string, { at: number; body: unknown }>();

interface Row { symbol: string; name: string; sector: string; composite: number; bias: string; factors: unknown; trends: unknown; setup: Record<string, unknown> | null }

// Free visitors see the top setups with levels hidden; members see every row with entry, stop and target.
function gate<T extends { rows: Row[] }>(body: T, member: boolean) {
  if (member) return { ...body, gated: false };
  const rows = body.rows.slice(0, FREE_SCREENER_ROWS).map((r) => ({ ...r, setup: r.setup ? { side: r.setup.side, timeframe: r.setup.timeframe, reasons: r.setup.reasons, levelsHidden: true, joinToSee: true } : null }));
  return { ...body, rows, gated: true, total: body.rows.length };
}

export async function GET(req: Request) {
  const member = await signedIn();
  const q = Q.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!q.success) return NextResponse.json({ error: 'bad query' }, { status: 400 });
  const { market, mode } = q.data;
  const allowLevels = levelsAllowed(market);
  const strip = (s: Record<string, unknown> | null) => (s && !allowLevels ? { side: s.side, timeframe: s.timeframe, reasons: s.reasons, levelsHidden: true } : s);

  // Investment/swing and day modes: nightly analysis from the database.
  const db = adminClient();
  if (db && mode !== 'quick') {
    const { data: latest } = await db.from('stock_analysis').select('as_of').eq('market', market).order('as_of', { ascending: false }).limit(1).maybeSingle();
    if (latest) {
      const [{ data: an }, { data: su }] = await Promise.all([
        db.from('stock_analysis').select('symbol, name, sector, composite, bias, factors, tech').eq('market', market).eq('as_of', latest.as_of),
        db.from('screener_setups').select('*').eq('market', market).eq('as_of', latest.as_of).eq('mode', mode),
      ]);
      const setups = new Map((su ?? []).map((s) => [s.symbol, s]));
      const rows: Row[] = (an ?? []).map((a) => ({ symbol: a.symbol, name: a.name, sector: a.sector, composite: Number(a.composite), bias: a.bias, factors: a.factors, trends: (a.tech as { trends: unknown }).trends, setup: strip(setups.get(a.symbol) ?? null) }));
      return NextResponse.json(gate({ market, mode, asOf: latest.as_of, live: false, allowLevels, rows: rows.sort((x, y) => Number(!!y.setup) - Number(!!x.setup) || y.composite - x.composite) }, member));
    }
  }

  // Quick trades (and first run before any nightly job): compute live from the provider.
  const ck = `${market}:${mode}`; const hit = cache.get(ck);
  if (hit && Date.now() - hit.at < (mode === 'quick' ? 60_000 : 15 * 60_000)) return NextResponse.json(gate(hit.body as { rows: Row[] }, member));
  // Twelve Data's free plan allows 8 calls a minute, so a live Global scan would take ~3 minutes: Global only reads the nightly scan.
  if (market === 'GLOBAL') return NextResponse.json({ market, mode, asOf: null, live: false, allowLevels, rows: [], note: mode === 'invest' ? 'Global results come from the nightly scan. Run: node --env-file=.env.local --import tsx scripts/ingest.ts GLOBAL (about 4 minutes), or wait for the nightly job.' : 'Global day and quick trades need a paid data plan; Global is covered by the nightly investment scan.' });
  if (!providerConfigured(market)) return NextResponse.json({ market, mode, asOf: null, live: true, allowLevels, rows: [], note: 'Add this market’s data provider key to run the screener.' });
  const { rows } = await runMarket(market, { intraday: mode === 'quick' });
  const out: Row[] = rows.map((r) => ({ symbol: r.symbol, name: r.name, sector: r.sector, composite: r.score.composite, bias: r.score.bias, factors: r.score.factors, trends: r.tech.trends, setup: strip((r.setups[mode] as unknown as Record<string, unknown>) ?? null) }));
  const body = { market, mode, asOf: new Date().toISOString(), live: true, allowLevels, rows: out.sort((x, y) => Number(!!y.setup) - Number(!!x.setup) || y.composite - x.composite) };
  cache.set(ck, { at: Date.now(), body });
  return NextResponse.json(gate(body, member));
}
