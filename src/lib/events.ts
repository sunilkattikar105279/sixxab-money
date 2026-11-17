// Company events that change the risk of a setup: the next earnings date, recent earnings surprises, and insider
// open-market buying or selling (SEC Form 4 codes P and S). Other insider codes (grants, option exercises) are ignored.

export interface InsiderTx { name: string; change: number; price: number | null; code: string; date: string }
export interface Events {
  nextEarnings: string | null;     // YYYY-MM-DD
  earningsHour: string | null;     // bmo (before open) | amc (after close) | dmh
  surprises: { period: string; actual: number | null; estimate: number | null; surprisePct: number | null }[];
  insider: { buys: number; sells: number; buyValue: number; sellValue: number; buyers: number; latest: InsiderTx[] } | null;
  asOf: string;
}

export const daysUntil = (iso: string | null, from: Date = new Date()) => (iso ? Math.ceil((Date.parse(`${iso}T21:00:00Z`) - from.getTime()) / 864e5) : null);

export function summarizeInsider(txs: InsiderTx[]): Events['insider'] {
  const open = txs.filter((t) => t.code === 'P' || t.code === 'S');
  if (!open.length) return { buys: 0, sells: 0, buyValue: 0, sellValue: 0, buyers: 0, latest: [] };
  const val = (t: InsiderTx) => Math.abs(t.change) * (t.price ?? 0);
  const buys = open.filter((t) => t.code === 'P'), sells = open.filter((t) => t.code === 'S');
  return {
    buys: buys.length, sells: sells.length,
    buyValue: Math.round(buys.reduce((s, t) => s + val(t), 0)), sellValue: Math.round(sells.reduce((s, t) => s + val(t), 0)),
    buyers: new Set(buys.map((t) => t.name)).size,
    latest: [...open].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5),
  };
}

/** One line for cards and the coach: "Earnings Thu Nov 20 (after close), 3 days away · insiders: 2 buyers, $1.2M bought in 90 days". */
export function eventsLine(e: Events, now: Date = new Date()): string {
  const parts: string[] = [];
  const d = daysUntil(e.nextEarnings, now);
  if (e.nextEarnings && d !== null && d >= 0) parts.push(`Earnings ${e.nextEarnings}${e.earningsHour === 'amc' ? ' after close' : e.earningsHour === 'bmo' ? ' before open' : ''}${d <= 14 ? `, ${d} day${d === 1 ? '' : 's'} away` : ''}`);
  const s = e.surprises[0];
  if (s?.surprisePct != null) parts.push(`last quarter ${s.surprisePct >= 0 ? 'beat' : 'missed'} estimates by ${Math.abs(s.surprisePct).toFixed(1)}%`);
  if (e.insider && (e.insider.buys || e.insider.sells)) parts.push(e.insider.buys ? `insiders bought $${fmt(e.insider.buyValue)} (${e.insider.buyers} buyer${e.insider.buyers === 1 ? '' : 's'}) in 90 days` : `insiders sold $${fmt(e.insider.sellValue)} in 90 days, no open-market buys`);
  return parts.join(' · ');
}

export function fmt(v: number): string {
  return v >= 1e9 ? `${(v / 1e9).toFixed(1)}B` : v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}K` : String(Math.round(v));
}
