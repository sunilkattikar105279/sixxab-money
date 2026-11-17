import { memberClient } from './supabase/server';
import { ageOn } from './sixs';
import type { Country } from './sixs';

export interface Member {
  id: string; email: string | null; name: string | null; dob: string; age: number; adult: boolean;
  country: Country; stage: number; role: string; status: string; foundingNumber: number | null; referralCode: string | null; goal: string | null; joinedAt: string;
}

/** The signed-in member with their profile, or null. `sb` is the member's own RLS-scoped client. */
export async function getMember() {
  const sb = await memberClient();
  if (!sb) return null;
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;
  const { data: p } = await sb.from('profiles').select('*').eq('id', user.id).maybeSingle();
  if (!p) return { sb, user, member: null as Member | null };
  const age = ageOn(p.dob);
  const member: Member = {
    id: user.id, email: user.email ?? null, name: p.full_name ?? null, dob: p.dob, age, adult: age >= 18,
    country: p.country === 'IN' ? 'IN' : 'US', stage: p.stage, role: p.role, status: p.status, joinedAt: p.created_at,
    foundingNumber: p.founding_number ?? null, referralCode: p.referral_code ?? null, goal: p.goal ?? null,
  };
  return { sb, user, member };
}

export const currency = (c: Country) => (c === 'IN' ? 'INR' : 'USD');
export const thisMonth = () => new Date().toISOString().slice(0, 7) + '-01';
