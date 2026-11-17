import { adminClient } from '../supabase/admin';
import type { RegimeRead } from '../regime';

/** Latest stored risk meter for a market, or null before the first run (or before migration 0009). */
export async function getRegime(market: 'US' | 'IN'): Promise<RegimeRead | null> {
  try {
    const db = adminClient();
    const { data, error } = await db.from('market_regime').select('data').eq('market', market).order('as_of', { ascending: false }).limit(1).maybeSingle();
    if (error || !data) return null;
    return data.data as RegimeRead;
  } catch { return null; }
}
