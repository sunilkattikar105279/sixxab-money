import { adminClient } from '../supabase/admin';
import type { Market } from './market';
import type { StockBoard } from './stocks';

export interface BreadthBar { title: string; leftLabel: string; rightLabel: string; left: number; right: number }

/** Market breadth for the home page, from the nightly analysis (falls back to advancers/decliners from the board). */
export async function getBreadth(market: Market, board: StockBoard): Promise<BreadthBar[]> {
  const known = board.rows.filter((r) => r.changePct !== null);
  const bars: BreadthBar[] = [];
  if (known.length) {
    const up = known.filter((r) => (r.changePct ?? 0) > 0).length;
    bars.push({ title: 'Advancing / Declining', leftLabel: 'Advancing', rightLabel: 'Declining', left: up, right: known.length - up });
  }
  const db = adminClient();
  if (!db) return bars;
  const { data: latest } = await db.from('stock_analysis').select('as_of').eq('market', market).order('as_of', { ascending: false }).limit(1).maybeSingle();
  if (!latest) return bars;
  const { data } = await db.from('stock_analysis').select('tech').eq('market', market).eq('as_of', latest.as_of);
  const b = (data ?? []).map((d) => (d.tech as { breadth?: { aboveSma50: boolean | null; aboveSma200: boolean | null; newHigh52: boolean; newLow52: boolean } }).breadth).filter(Boolean) as NonNullable<unknown>[] as { aboveSma50: boolean | null; aboveSma200: boolean | null; newHigh52: boolean; newLow52: boolean }[];
  if (!b.length) return bars;
  const hi = b.filter((x) => x.newHigh52).length, lo = b.filter((x) => x.newLow52).length;
  bars.push({ title: 'New 52-week high / low', leftLabel: 'New high', rightLabel: 'New low', left: hi, right: lo });
  const a50 = b.filter((x) => x.aboveSma50 !== null), a200 = b.filter((x) => x.aboveSma200 !== null);
  bars.push({ title: 'Above / Below 50-day average', leftLabel: 'Above', rightLabel: 'Below', left: a50.filter((x) => x.aboveSma50).length, right: a50.filter((x) => !x.aboveSma50).length });
  bars.push({ title: 'Above / Below 200-day average', leftLabel: 'Above', rightLabel: 'Below', left: a200.filter((x) => x.aboveSma200).length, right: a200.filter((x) => !x.aboveSma200).length });
  return bars;
}
