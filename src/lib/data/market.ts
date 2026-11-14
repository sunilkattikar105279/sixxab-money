import { adminClient } from '../supabase/admin';

export type Market = 'US' | 'IN' | 'GLOBAL';

export interface IndexQuote { name: string; value: number | null; change: number | null; changePct: number | null; why?: string }
export interface Snapshot { market: Market; asOf: string; source: string; sample: boolean; indices: IndexQuote[] }

// Fallback when no licensed feed has written a snapshot yet. US values are the Nov 13, 2026 close
// (Finviz, as captured for the prototype); India and Global are empty until feeds are licensed.
const FALLBACK: Record<Market, Snapshot> = {
  US: {
    market: 'US', asOf: '2026-11-13', source: 'Finviz (Nov 13, 2026 close, captured)', sample: true,
    indices: [
      { name: 'S&P 500', value: 7561.67, change: -30.73, changePct: -0.40, why: 'Chip weakness outweighed gains elsewhere.' },
      { name: 'Nasdaq', value: 25136.3, change: -229.82, changePct: -0.91, why: 'Heaviest in chips, so it fell the most.' },
      { name: 'Dow', value: 52347.6, change: 50.46, changePct: 0.10, why: 'Fewer chip names, so it held up.' },
      { name: 'Russell 2000 ETF', value: 277.54, change: -0.9, changePct: -0.32, why: 'Small companies slipped with the market.' },
    ],
  },
  IN: { market: 'IN', asOf: '', source: 'Awaiting licensed NSE/BSE feed', sample: true, indices: ['Nifty 50', 'Sensex', 'Bank Nifty', 'USD/INR'].map((name) => ({ name, value: null, change: null, changePct: null })) },
  GLOBAL: { market: 'GLOBAL', asOf: '', source: 'Awaiting licensed global feed', sample: true, indices: ['FTSE 100', 'Nikkei 225', 'Brent crude', 'Gold'].map((name) => ({ name, value: null, change: null, changePct: null })) },
};

export async function getSnapshot(market: Market): Promise<Snapshot> {
  const db = adminClient();
  if (db) {
    const { data } = await db.from('market_snapshots').select('as_of, source, indices').eq('market', market).order('as_of', { ascending: false }).limit(1).maybeSingle();
    if (data) return { market, asOf: data.as_of, source: data.source, sample: false, indices: data.indices as IndexQuote[] };
  }
  return FALLBACK[market];
}
