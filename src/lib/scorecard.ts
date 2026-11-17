// Scenario scorecard: every published long/short setup is tracked until its target or stop is reached on a daily
// close, or it expires after 30 days. A visible, honest hit rate is the trust signal.
export type Outcome = 'open' | 'target' | 'stop' | 'expired';
export interface Tracked { side: 'long' | 'short'; entry: number; stop: number; target: number; as_of: string }

export function resolve(t: Tracked, close: number, today: string, maxDays = 30): { outcome: Outcome; exit: number | null; r: number | null } {
  const risk = Math.abs(t.entry - t.stop) || 1e-9;
  const s = t.side === 'long' ? 1 : -1;
  const r = Math.round((((close - t.entry) * s) / risk) * 100) / 100;
  if ((close - t.target) * s >= 0) return { outcome: 'target', exit: close, r };
  if ((close - t.stop) * s <= 0) return { outcome: 'stop', exit: close, r };
  if ((Date.parse(today) - Date.parse(t.as_of)) / 864e5 >= maxDays) return { outcome: 'expired', exit: close, r };
  return { outcome: 'open', exit: null, r: null };
}

export interface ScoreStats { resolved: number; hits: number; stops: number; expired: number; hitRate: number | null; avgR: number | null; open: number }
export function stats(rows: { outcome: Outcome; r_multiple: number | null }[]): ScoreStats {
  const res = rows.filter((x) => x.outcome !== 'open');
  const hits = res.filter((x) => x.outcome === 'target').length, stops = res.filter((x) => x.outcome === 'stop').length;
  const rs = res.map((x) => Number(x.r_multiple)).filter((x) => Number.isFinite(x));
  return { resolved: res.length, hits, stops, expired: res.length - hits - stops, open: rows.length - res.length, hitRate: res.length ? Math.round((hits / res.length) * 100) : null, avgR: rs.length ? Math.round((rs.reduce((a, b) => a + b, 0) / rs.length) * 100) / 100 : null };
}
