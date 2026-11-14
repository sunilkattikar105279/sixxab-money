import { NextResponse } from 'next/server';
import { z } from 'zod';
import { adminClient } from '@/lib/supabase/admin';
import { runMarket } from '@/lib/pipeline';
import { providerConfigured } from '@/lib/providers';
import { levelsAllowed } from '@/lib/compliance';

const Q = z.object({ market: z.enum(['US', 'IN', 'GLOBAL']).default('US'), mode: z.enum(['invest', 'day', 'quick']).default('invest') });

export const maxDuration = 60;

const cache = new Map<string, { at: number; body: unknown }>();

interface Row { symbol: string; name: string; sector: string; composite: number; bias: string; factors: unknown; trends: unknown; setup: Record<string, unknown> | null }

export async function GET(req: Request) {
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
      return NextResponse.json({ market, mode, asOf: latest.as_of, live: false, allowLevels, rows: rows.sort((x, y) => Number(!!y.setup) - Number(!!x.setup) || y.composite - x.composite) });
    }
  }

  // Quick trades (and first run before any nightly job): compute live from the provider.
  const ck = `${market}:${mode}`; const hit = cache.get(ck);
  if (hit && Date.now() - hit.at < (mode === 'quick' ? 60_000 : 15 * 60_000)) return NextResponse.json(hit.body);
  if (market === 'GLOBAL' && mode !== 'invest') return NextResponse.json({ market, mode, asOf: null, live: true, allowLevels, rows: [], note: 'Global intraday scans need a paid data plan; Global runs in the nightly investment scan.' });
  if (!providerConfigured(market)) return NextResponse.json({ market, mode, asOf: null, live: true, allowLevels, rows: [], note: 'Add this market’s data provider key to run the screener.' });
  const { rows } = await runMarket(market, { intraday: mode === 'quick' });
  const out: Row[] = rows.map((r) => ({ symbol: r.symbol, name: r.name, sector: r.sector, composite: r.score.composite, bias: r.score.bias, factors: r.score.factors, trends: r.tech.trends, setup: strip((r.setups[mode] as unknown as Record<string, unknown>) ?? null) }));
  const body = { market, mode, asOf: new Date().toISOString(), live: true, allowLevels, rows: out.sort((x, y) => Number(!!y.setup) - Number(!!x.setup) || y.composite - x.composite) };
  cache.set(ck, { at: Date.now(), body });
  return NextResponse.json(body);
}
