import { adminClient } from '../supabase/admin';
import type { RotationRead } from '../rotation';

export async function getRotation(market: 'US' | 'IN'): Promise<RotationRead | null> {
  try {
    const db = adminClient(); if (!db) return null;
    const { data, error } = await db.from('sector_rotation').select('data').eq('market', market).order('as_of', { ascending: false }).limit(1).maybeSingle();
    return error || !data ? null : (data.data as RotationRead);
  } catch { return null; }
}
