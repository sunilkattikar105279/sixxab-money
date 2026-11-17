import { memberClient } from './supabase/server';

/** True when the visitor is signed in (member content unlocked). Cheap: no profile read. */
export async function signedIn(): Promise<boolean> {
  try {
    const sb = await memberClient(); if (!sb) return false;
    const { data: { user } } = await sb.auth.getUser();
    return !!user;
  } catch { return false; }
}

export const FREE_SCREENER_ROWS = 10;
