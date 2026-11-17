// SIXXAB score: 1-10 per factor and a weighted composite. Every factor explains itself.
// Missing factors (no data) are left out and the weights re-normalised, so a score never rests on invented inputs.
import type { TechReport } from './ta/analyze';

export interface Fundamentals { revenueGrowthPct: number | null; netMarginPct: number | null; opCashFlowPositive: boolean | null; debtToEquity: number | null; period: string; stale?: boolean }
export interface NewsRead { headlines: number; sentiment: number } // sentiment -1..1
export interface FactorScore { key: 'trend' | 'momentum' | 'accumulation' | 'fundamentals' | 'news' | 'industry' | 'regime'; label: string; score: number; why: string }
export interface Score { composite: number; factors: FactorScore[]; bias: 'bullish' | 'bearish' | 'neutral' }

const clamp = (x: number) => Math.max(1, Math.min(10, Math.round(x * 10) / 10));
const WEIGHTS: Record<FactorScore['key'], number> = { trend: 0.25, momentum: 0.15, accumulation: 0.2, fundamentals: 0.2, news: 0.1, industry: 0.1, regime: 0.1 };

export function scoreStock(t: TechReport, opts: { fundamentals?: Fundamentals | null; news?: NewsRead | null; industryRel?: number | null; regime?: { zone: 'calm' | 'normal' | 'elevated' | 'panic'; level: number; gauge: string; spikeFade: boolean } | null } = {}): Score {
  const factors: FactorScore[] = [];

  const tf = [t.trends.y, t.trends.M, t.trends.w, t.trends.d];
  const ups = tf.filter((x) => x === 'UP').length, downs = tf.filter((x) => x === 'DOWN').length;
  factors.push({ key: 'trend', label: 'Trend alignment', score: clamp(5.5 + (ups - downs) * 1.1), why: `Yearly ${t.trends.y}, monthly ${t.trends.M}, weekly ${t.trends.w}, daily ${t.trends.d}` });

  let mom = 5.5; const mw: string[] = [];
  if (t.breaks.d.brokeUp) { mom += 2; mw.push('daily break up'); } if (t.breaks.d.brokeDown) { mom -= 2; mw.push('daily break down'); }
  if (t.breaks.w.brokeUp) { mom += 1.5; mw.push('weekly break up'); } if (t.breaks.w.brokeDown) { mom -= 1.5; mw.push('weekly break down'); }
  if (t.volume.rvolD > 1.5) { mom += t.changePct && t.changePct > 0 ? 1 : -1; mw.push(`volume ${t.volume.rvolD.toFixed(1)}x average`); }
  factors.push({ key: 'momentum', label: 'Breaks and momentum', score: clamp(mom), why: mw.length ? mw.join(', ') : 'no fresh breaks' });

  let acc = 5.5 + t.volume.cmf20 * 12 + Math.sign(t.volume.adSlope) * 0.8;
  const ph = t.cycle.weekly.phase;
  acc += ph === 'accumulation' ? 1.2 : ph === 'markup' ? 0.8 : ph === 'distribution' ? -1.2 : ph === 'markdown' ? -0.8 : 0;
  factors.push({ key: 'accumulation', label: 'Accumulation / distribution', score: clamp(acc), why: `Weekly cycle: ${ph} (${t.cycle.weekly.confidence}); money flow ${t.volume.cmf20.toFixed(2)}` });

  const f = opts.fundamentals;
  // Old filings would mislead: leave the factor out (its weight is redistributed) rather than score on stale data
  if (f && !f.stale) {
    let fs = 5; const fw: string[] = [];
    if (f.revenueGrowthPct !== null) { fs += Math.max(-2.5, Math.min(2.5, f.revenueGrowthPct / 8)); fw.push(`revenue ${f.revenueGrowthPct >= 0 ? '+' : ''}${f.revenueGrowthPct.toFixed(0)}% YoY`); }
    if (f.netMarginPct !== null) { fs += Math.max(-2, Math.min(2, f.netMarginPct / 10)); fw.push(`net margin ${f.netMarginPct.toFixed(0)}%`); }
    if (f.opCashFlowPositive !== null) { fs += f.opCashFlowPositive ? 0.8 : -1; fw.push(f.opCashFlowPositive ? 'cash flow positive' : 'cash flow negative'); }
    if (f.debtToEquity !== null) { fs += f.debtToEquity < 1 ? 0.5 : f.debtToEquity > 3 ? -1 : 0; fw.push(`liabilities/equity ${f.debtToEquity.toFixed(1)}`); }
    factors.push({ key: 'fundamentals', label: 'Moat · Business performance', score: clamp(fs), why: `${fw.join(', ')} (${f.period})` });
  }
  const n = opts.news;
  if (n && n.headlines > 0) factors.push({ key: 'news', label: 'News tone', score: clamp(5.5 + n.sentiment * 4), why: `${n.headlines} headlines this week, tone ${n.sentiment >= 0 ? '+' : ''}${n.sentiment.toFixed(2)}` });
  if (opts.industryRel !== undefined && opts.industryRel !== null) factors.push({ key: 'industry', label: 'Industry strength', score: clamp(5.5 + opts.industryRel / 2), why: `industry ${opts.industryRel >= 0 ? 'beat' : 'lagged'} the market by ${Math.abs(opts.industryRel).toFixed(1)} pts over a month` });

  const rg = opts.regime;
  if (rg) {
    const base = { calm: 6.5, normal: 6, elevated: 4, panic: 2.5 }[rg.zone] + (rg.spikeFade ? 1 : 0);
    factors.push({ key: 'regime', label: 'Sigma · Market regime', score: clamp(base), why: `${rg.gauge} ${rg.level.toFixed(1)}, ${rg.zone}${rg.spikeFade ? '; fear spiked and is fading' : ''}` });
  }
  const wsum = factors.reduce((a, x) => a + WEIGHTS[x.key], 0);
  const composite = clamp(factors.reduce((a, x) => a + x.score * WEIGHTS[x.key], 0) / wsum);
  return { composite, factors, bias: composite >= 6.5 ? 'bullish' : composite <= 4.5 ? 'bearish' : 'neutral' };
}

/** Simple, transparent headline tone: count of positive vs negative finance words. */
const POS = /\b(beat|beats|record|surge|soar|upgrade|raises?|growth|profit|strong|wins?|approval|buyback|expands?)\b/i;
const NEG = /\b(miss|misses|plunge|drop|falls?|downgrade|cuts?|loss|weak|probe|lawsuit|recall|resigns?|fraud|layoffs?|warns?)\b/i;
export function headlineTone(titles: string[]): NewsRead {
  if (!titles.length) return { headlines: 0, sentiment: 0 };
  const s = titles.reduce((a, t) => a + (POS.test(t) ? 1 : 0) - (NEG.test(t) ? 1 : 0), 0);
  return { headlines: titles.length, sentiment: Math.max(-1, Math.min(1, s / titles.length)) };
}
