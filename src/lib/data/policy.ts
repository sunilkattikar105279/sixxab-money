import { adminClient } from '../supabase/admin';

export interface Brief { id: string; tag: string; title: string; facts: string[]; view_a: string; view_b: string; money: string; sources: string; published_on: string }

export const SAMPLE_BRIEF: Brief = {
  id: 'sample', tag: 'Corporate governance · US', published_on: '2026-11-12',
  title: 'Nvidia’s CEO resigns; CFO named interim chief',
  facts: [
    'Jensen Huang resigned as president, CEO and board member, effective immediately (Nvidia 8-K).',
    'CFO Colette Kress is interim CEO; the board is searching internal and external candidates.',
    'Reports said U.S. officials tied a woman he admitted an affair with to Chinese intelligence; China denies it.',
  ],
  view_a: '[Strongest case from those who say the board acted correctly, quoting named people, with sources.]',
  view_b: '[Strongest case from those who disagree, quoting named people, with sources.]',
  money: 'If you own an S&P 500 or Nasdaq index fund, you own Nvidia. One company’s news can move your whole fund, which is why spreading money across many holdings matters.',
  sources: 'Nvidia 8-K (Nov 12, 2026), Reuters, NYT, CNBC',
};

export const TOPICS = ['All', 'Trade & tariffs', 'Elections', 'Central banks', 'Sanctions', 'Corporate'] as const;

export async function policyBriefs(topic?: string, limit = 10): Promise<Brief[]> {
  const db = adminClient();
  if (!db) return [SAMPLE_BRIEF];
  let q = db.from('policy_briefs').select('*').eq('status', 'published').order('published_on', { ascending: false }).limit(limit);
  if (topic && topic !== 'All') q = q.ilike('tag', `%${topic.split(' ')[0]}%`);
  const { data } = await q;
  return data && data.length ? (data as Brief[]) : topic && topic !== 'All' && !/corporate/i.test(topic) ? [] : [SAMPLE_BRIEF];
}
