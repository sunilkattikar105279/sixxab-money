import Link from 'next/link';
import type { TideRead } from '@/lib/data/liquidity';
import { TIDE_COL, type TideMood } from '@/lib/liquidity';
import { Spark } from '@/components/MacroCharts';

const BANDS: [number, number, TideMood][] = [[0, 20, 'draining'], [20, 40, 'tight'], [40, 60, 'neutral'], [60, 80, 'flowing'], [80, 100, 'flooding']];
const TONE = { good: 'var(--green)', bad: 'var(--red)', neutral: 'var(--gold)' } as const;

export const monthName = (d: string | null) => (d ? new Date(`${d}T12:00:00Z`).toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }) : '—');
export const releasedDay = (ts: string | null) => {
  if (!ts) return null;
  const t = Date.parse(ts.replace(' ', 'T').replace(/([+-]\d\d)$/, '$1:00'));
  return Number.isFinite(t) ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'America/Chicago' }).format(new Date(t)) : null;
};
const sgn = (x: number | null, d = 1, u = '%') => (x === null ? '—' : `${x >= 0 ? '+' : ''}${x.toFixed(d)}${u}`);

/** Half-circle gauge from draining (0, left) to flooding (100, right). */
export function TideDial({ score, size = 200 }: { score: number; size?: number }) {
  const r = size / 2 - 14, cx = size / 2, cy = size / 2 + 4;
  const pt = (v: number, rr = r) => { const a = Math.PI * (1 - v / 100); return [cx + rr * Math.cos(a), cy - rr * Math.sin(a)]; };
  const arc = (a: number, b: number) => { const [x0, y0] = pt(a), [x1, y1] = pt(b); return `M ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1}`; };
  const [nx, ny] = pt(score, r - 18);
  return (
    <svg viewBox={`0 0 ${size} ${size / 2 + 26}`} width={size} role="img" aria-label={`Tide score ${score} of 100`}>
      {BANDS.map(([a, b, m]) => <path key={m} d={arc(a, b)} stroke={TIDE_COL[m]} strokeWidth={12} fill="none" opacity={0.85} />)}
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#fff" strokeWidth={3} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={6} fill="#fff" />
      <text x={cx} y={cy - 22} textAnchor="middle" fontSize={size / 6} fontWeight={800} fill="#fff">{score}</text>
      <text x={14} y={cy + 20} fontSize={10} fill="var(--dim)">Draining</text>
      <text x={size - 14} y={cy + 20} fontSize={10} fill="var(--dim)" textAnchor="end">Flooding</text>
    </svg>
  );
}

/** "New M2 print" notice: shows for 10 days after FRED updates M2. */
export function M2Notice({ t }: { t: TideRead }) {
  if (!t.isNew || t.yoy === null) return null;
  const day = releasedDay(t.released);
  return (
    <div className="tide-notice" role="status">
      <span className="tide-dot" aria-hidden="true" /> <b>New M2 data</b> · {monthName(t.asOf)} money supply {sgn(t.yoy)} on a year ago{t.mom !== null ? `, ${sgn(t.mom, 2)} on the month` : ''}{day ? ` · released ${day}` : ''}
    </div>
  );
}

/** Landing-page card for Tide, the liquidity and M2 agent. */
export function TideCard({ t }: { t: TideRead | null }) {
  if (!t?.available || t.score === null || !t.mood) return null;
  return (
    <section className="card sentiment-card tide-card" id="liquidity" aria-label="Tide · Liquidity and M2">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <div className="tag gold">Tide · Liquidity &amp; M2 · {monthName(t.asOf)}</div>
        <Link href="/liquidity" className="dim" style={{ fontSize: 12 }}>What is Tide? →</Link>
      </div>
      <M2Notice t={t} />
      <h2 style={{ margin: '2px 0 0' }}>{t.headline}</h2>
      <div className="sentiment-row">
        <div style={{ textAlign: 'center', minWidth: 180 }}>
          <TideDial score={t.score} />
          <div style={{ color: TIDE_COL[t.mood], fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>{t.mood}</div>
          <div className="dim" style={{ fontSize: 11 }}>Tide score · money flow</div>
        </div>
        <div className="sentiment-regions">
          <div className="inset">
            <div className="muted" style={{ fontSize: 12 }}>M2 money supply</div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>{t.level !== null ? `$${(t.level / 1000).toFixed(2)}T` : '—'}<span className={t.yoy !== null && t.yoy < 0 ? 'red' : 'green'} style={{ fontSize: 13, marginLeft: 8, fontWeight: 700 }}>{sgn(t.yoy)} y/y</span></div>
            <div className="dim" style={{ fontSize: 12 }}>{t.regimeText}</div>
          </div>
          <div className="inset">
            <div className="muted" style={{ fontSize: 12 }}>Real M2 · after inflation</div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>{sgn(t.realYoy)}</div>
            <div className="dim" style={{ fontSize: 12 }}>{t.realYoy !== null && t.realYoy < 0 ? 'money shrinking in real terms' : 'money growing in real terms'}</div>
          </div>
          <div className="inset">
            <div className="muted" style={{ fontSize: 12 }}>Fed net liquidity · 3 months</div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>{sgn(t.netLiq3mPct)}</div>
            <div className="dim" style={{ fontSize: 12 }}>{t.netLiq !== null ? `$${(t.netLiq / 1000).toFixed(2)}T available to markets` : ''}</div>
          </div>
          <div style={{ gridColumn: '1 / -1' }}><Spark s={t.m2YoyLong.slice(-120)} label="M2 growth, % on a year ago, last 10 years" /><div className="dim" style={{ fontSize: 11 }}>M2 growth, % on a year ago · last 10 years</div></div>
        </div>
      </div>
      <ul className="tide-impacts">
        {t.impacts.slice(0, 4).map((i) => <li key={i.area}><b style={{ color: TONE[i.tone] }}>{i.area}:</b> {i.read.split('. ')[0].replace(/\.$/, '')}.</li>)}
      </ul>
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>Past relationships, not a forecast. Source: FRED (M2SL, M2REAL, WALCL, RRPONTSYD, WTREGEN). <Link href="/liquidity">See the full M2 tracker →</Link> · <Link href="/ask?q=What%20does%20M2%20money%20supply%20mean%20for%20my%20money%20right%20now%3F">Ask Tide →</Link></p>
    </section>
  );
}
