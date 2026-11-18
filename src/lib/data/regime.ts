import { adminClient } from '../supabase/admin';
import type { RegimeRead } from '../regime';

/** Latest stored risk meter for a market, or null before the first run (or before migration 0009). */
export async function getRegime(market: 'US' | 'IN'): Promise<RegimeRead | null> {
  try {
    const db = adminClient();
    if (!db) return null;
    const { data, error } = await db.from('market_regime').select('data').eq('market', market).order('as_of', { ascending: false }).limit(1).maybeSingle();
    if (error || !data) return null;
    return data.data as RegimeRead;
  } catch { return null; }
}

/** Pivot's latest nightly levels board (stored with the US risk meter row), or null before the first run. */
export async function getPivot(): Promise<import('../pivot').PivotBoard | null> {
  try {
    const db = adminClient();
    if (!db) return null;
    const { data } = await db.from('market_regime').select('data').eq('market', 'US').order('as_of', { ascending: false }).limit(5);
    for (const row of data ?? []) { const p = (row.data as { pivot?: import('../pivot').PivotBoard }).pivot; if (p?.reads?.length) return p; }
    return null;
  } catch { return null; }
}
