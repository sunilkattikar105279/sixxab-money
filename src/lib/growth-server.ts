import { adminClient } from './supabase/admin';

/** Founding-member totals for the home page and admin view. */
export async function foundingStats(): Promise<{ members: number; left: number } | null> {
  const db = adminClient();
  if (!db) return null;
  const { data, error } = await db.rpc('founding_stats');
  if (error || !data?.[0]) return null;
  return { members: data[0].members, left: data[0].founding_left };
}
