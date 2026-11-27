// Tide, the SIXXAB Money liquidity agent: M2 money supply, Fed net liquidity and what the money tide means
// for stocks, inflation, loans, cash and India. Pure functions here; data fetching lives in lib/data/liquidity.ts.
// Everything is a reading of past data and past relationships, never a forecast or a buy/sell call.

export type TideMood = 'draining' | 'tight' | 'neutral' | 'flowing' | 'flooding';
export type M2Regime = 'contracting' | 'slow' | 'normal' | 'fast';
export type Tone = 'good' | 'bad' | 'neutral';

export const TIDE_COL: Record<TideMood, string> = { draining: '#FF5C7A', tight: '#F59E5B', neutral: '#C9B26B', flowing: '#7ED957', flooding: '#2EE59D' };
export const TIDE_NAME = 'Tide';
export const TIDE_ROLE = 'Liquidity & M2';

export interface TideInputs {
  m2Yoy: number | null;      // M2, % change on a year ago
  m2YoyChg3: number | null;  // change in that growth rate over 3 months, % points (acceleration)
  realYoy: number | null;    // real (inflation-adjusted) M2, % on a year ago
  netLiq3mPct: number | null; // Fed net liquidity, % change over 3 months
}

const clamp = (x: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, x));
/** Map x linearly so `lo` scores 0 and `hi` scores 100. */
export const scale = (x: number, lo: number, hi: number) => clamp(((x - lo) / (hi - lo)) * 100);

/** Tide score, 0 (money draining) to 100 (money flooding in): equal-weight average of whichever parts are available. */
export function tideScore(x: TideInputs): { score: number | null; parts: { label: string; score: number }[] } {
  const parts: { label: string; score: number }[] = [];
  if (x.m2Yoy !== null) parts.push({ label: 'M2 growth', score: Math.round(scale(x.m2Yoy, -4, 10)) });
  if (x.m2YoyChg3 !== null) parts.push({ label: 'M2 growth speeding up or slowing', score: Math.round(scale(x.m2YoyChg3, -2, 2)) });
  if (x.realYoy !== null) parts.push({ label: 'Real M2 (after inflation)', score: Math.round(scale(x.realYoy, -6, 6)) });
  if (x.netLiq3mPct !== null) parts.push({ label: 'Fed net liquidity, 3 months', score: Math.round(scale(x.netLiq3mPct, -5, 5)) });
  if (!parts.length) return { score: null, parts };
  return { score: Math.round(parts.reduce((s, p) => s + p.score, 0) / parts.length), parts };
}

export function moodOf(score: number): TideMood {
  return score < 20 ? 'draining' : score < 40 ? 'tight' : score < 60 ? 'neutral' : score < 80 ? 'flowing' : 'flooding';
}

/** M2 growth regime. Long-run US M2 growth has averaged roughly 6–7% a year. */
export function m2Regime(yoy: number): M2Regime {
  return yoy < 0 ? 'contracting' : yoy < 4 ? 'slow' : yoy < 7 ? 'normal' : 'fast';
}

export const REGIME_TEXT: Record<M2Regime, string> = {
  contracting: 'shrinking: rare, last seen in 2022–23',
  slow: 'growing slower than its long-run pace',
  normal: 'growing near its long-run pace',
  fast: 'growing faster than its long-run pace',
};

export interface ImpactInputs {
  score: number | null;
  m2Yoy: number | null;
  cpiYoy: number | null;
  fedFunds: number | null;
  fedFunds12m: number | null; // change over 12 months, % points
  inrYoy: number | null;      // USD/INR, % on a year ago (positive = weaker rupee)
  stocksLink: { lag: number; r: number } | null;
  inflLink: { lag: number; r: number } | null;
}

export interface Impact { area: string; tone: Tone; read: string }

const pct = (x: number, d = 1) => `${x >= 0 ? '+' : ''}${x.toFixed(d)}%`;
const lagText = (lag: number) => (lag ? `${lag} months later` : 'in the same months');

/** Plain-English "what it means" for each part of your money. Readings of past data, not forecasts. */
export function impacts(x: ImpactInputs): Impact[] {
  const out: Impact[] = [];
  if (x.score !== null) {
    const link = x.stocksLink ? ` Over the past decade, M2 growth and S&P 500 returns ${lagText(x.stocksLink.lag)} had a correlation of ${x.stocksLink.r.toFixed(2)}.` : '';
    out.push(x.score >= 60
      ? { area: 'Stocks', tone: 'good', read: `More money in the system has tended to support stock prices and valuations, a tailwind rather than a guarantee.${link}` }
      : x.score <= 40
        ? { area: 'Stocks', tone: 'bad', read: `Tighter money has tended to weigh on stock valuations, especially expensive growth stocks.${link}` }
        : { area: 'Stocks', tone: 'neutral', read: `Liquidity is neither a strong tailwind nor a headwind right now; earnings and rates matter more.${link}` });
  }
  if (x.m2Yoy !== null) {
    const link = x.inflLink ? ` M2 growth has lined up best with CPI inflation about ${x.inflLink.lag} months later (correlation ${x.inflLink.r.toFixed(2)}).` : '';
    const cpi = x.cpiYoy !== null ? ` Inflation is ${x.cpiYoy.toFixed(1)}% today.` : '';
    out.push(x.m2Yoy >= 7
      ? { area: 'Inflation', tone: 'bad', read: `Fast money growth has in the past fed higher inflation later.${cpi}${link}` }
      : x.m2Yoy <= 2
        ? { area: 'Inflation', tone: 'good', read: `Slow money growth has in the past helped inflation cool later.${cpi}${link}` }
        : { area: 'Inflation', tone: 'neutral', read: `Money growth near its normal pace adds little extra inflation pressure on its own.${cpi}${link}` });
  }
  if (x.fedFunds !== null) {
    const ch = x.fedFunds12m;
    out.push(ch !== null && ch <= -0.25
      ? { area: 'Loans and rates', tone: 'good', read: `The Fed funds rate is ${x.fedFunds.toFixed(2)}%, down ${Math.abs(ch).toFixed(2)} points in a year: card, auto and variable loan rates tend to ease with it.` }
      : ch !== null && ch >= 0.25
        ? { area: 'Loans and rates', tone: 'bad', read: `The Fed funds rate is ${x.fedFunds.toFixed(2)}%, up ${ch.toFixed(2)} points in a year: borrowing is getting dearer.` }
        : { area: 'Loans and rates', tone: 'neutral', read: `The Fed funds rate is ${x.fedFunds.toFixed(2)}%, little changed over a year.` });
  }
  if (x.cpiYoy !== null) {
    out.push({ area: 'Your cash', tone: x.cpiYoy > 3 ? 'bad' : 'neutral', read: `Savings earning less than ${x.cpiYoy.toFixed(1)}% a year lose buying power to inflation. Compare your savings, CD or money-market rate with that number.` });
  }
  if (x.inrYoy !== null) {
    out.push(x.inrYoy > 2
      ? { area: 'India and the rupee', tone: 'bad', read: `The rupee is ${pct(x.inrYoy)} weaker against the dollar than a year ago. Tight dollar liquidity has tended to pull foreign money out of India; a weaker rupee makes fuel, imports and US tuition dearer.` }
      : x.inrYoy < -2
        ? { area: 'India and the rupee', tone: 'good', read: `The rupee is ${Math.abs(x.inrYoy).toFixed(1)}% stronger against the dollar than a year ago, easing import, fuel and overseas-study costs.` }
        : { area: 'India and the rupee', tone: 'neutral', read: `The rupee is roughly steady against the dollar over a year (${pct(x.inrYoy)}).` });
  }
  return out;
}

/** One-line headline for cards, briefs and notifications. */
export function tideHeadline(mood: TideMood | null, m2Yoy: number | null, netLiq3mPct: number | null): string {
  if (mood === null || m2Yoy === null) return 'Tide reading appears once FRED data loads.';
  const label = { draining: 'Money is draining', tight: 'Money is tight', neutral: 'Money flow is steady', flowing: 'Money is flowing', flooding: 'Money is flooding in' }[mood];
  const nl = netLiq3mPct === null ? '' : `, Fed net liquidity ${netLiq3mPct >= 0 ? 'up' : 'down'} ${Math.abs(netLiq3mPct).toFixed(1)}% in 3 months`;
  return `${label}: M2 ${pct(m2Yoy)} on a year ago${nl}`;
}

/** True when a FRED "last updated" timestamp is within `days` of now: drives the "new M2 print" notice. */
export function isFresh(lastUpdated: string | null, now = Date.now(), days = 10): boolean {
  if (!lastUpdated) return false;
  const t = Date.parse(lastUpdated.replace(' ', 'T').replace(/([+-]\d\d)$/, '$1:00'));
  return Number.isFinite(t) && now - t >= 0 && now - t <= days * 864e5;
}
