// Market breadth from the stocks we scan: is a move broad (most stocks joining) or narrow (a few leaders)?
import type { TechReport } from './ta/analyze';

export interface Breadth { n: number; pctAbove50: number | null; pctAbove200: number | null; pctDailyUp: number; advancers: number; decliners: number; newHighs: number; newLows: number; read: string }

export function computeBreadth(techs: TechReport[]): Breadth | null {
  if (techs.length < 5) return null;
  const pct = (xs: (boolean | null)[]) => { const v = xs.filter((x): x is boolean => x !== null); return v.length ? Math.round((v.filter(Boolean).length / v.length) * 100) : null; };
  const pctAbove50 = pct(techs.map((t) => t.breadth.aboveSma50)), pctAbove200 = pct(techs.map((t) => t.breadth.aboveSma200));
  const pctDailyUp = Math.round((techs.filter((t) => t.trends.d === 'UP').length / techs.length) * 100);
  const advancers = techs.filter((t) => (t.changePct ?? 0) > 0).length, decliners = techs.filter((t) => (t.changePct ?? 0) < 0).length;
  const newHighs = techs.filter((t) => t.breadth.newHigh52).length, newLows = techs.filter((t) => t.breadth.newLow52).length;
  const p = pctAbove200 ?? 50;
  const read = p >= 70 ? 'Broad strength: most stocks are in long-term uptrends'
    : p >= 50 ? 'Healthy but mixed: just over half of stocks are in long-term uptrends'
    : p >= 30 ? 'Narrow market: fewer than half of stocks are in long-term uptrends'
    : 'Weak breadth: most stocks are below their 200-day average';
  return { n: techs.length, pctAbove50, pctAbove200, pctDailyUp, advancers, decliners, newHighs, newLows, read };
}
