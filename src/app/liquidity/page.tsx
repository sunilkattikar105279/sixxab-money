import Link from 'next/link';
import type { Metadata } from 'next';
import { Header, Footer } from '@/components/Header';
import { AgentAsk } from '@/components/AgentAsk';
import { RelationChart, Spark } from '@/components/MacroCharts';
import { TideDial, M2Notice, monthName, releasedDay } from '@/components/TideCard';
import { getTide } from '@/lib/data/liquidity';
import { TIDE_COL } from '@/lib/liquidity';
import type { Obs } from '@/lib/macro';

export const revalidate = 3600;
export const metadata: Metadata = {
  title: 'Tide · M2 money supply tracker',
  description: 'Tide, the SIXXAB Money liquidity agent: US M2 money supply, real M2 and Fed net liquidity, with what the money tide means for stocks, inflation, loans, cash and India.',
};

const TONE = { good: 'var(--green)', bad: 'var(--red)', neutral: 'var(--gold)' } as const;
const sgn = (x: number | null, d = 1) => (x === null ? '—' : `${x >= 0 ? '+' : ''}${x.toFixed(d)}%`);

/** 25 years of M2 growth with the zero line and the ~6.5% long-run pace. */
function LongM2({ s }: { s: Obs[] }) {
  if (s.length < 24) return null;
  const W = 760, H = 240, pad = 22, v = s.map((o) => o.value), lo = Math.min(-4, ...v), hi = Math.max(12, ...v);
  const t0 = Date.parse(s[0].date), t1 = Date.parse(s.at(-1)!.date);
  const x = (d: string) => 44 + ((Date.parse(d) - t0) / Math.max(1, t1 - t0)) * (W - 60);
  const y = (val: number) => H - pad - ((val - lo) / (hi - lo)) * (H - 2 * pad);
  const d = s.map((o, i) => `${i ? 'L' : 'M'}${x(o.date).toFixed(1)} ${y(o.value).toFixed(1)}`).join(' ');
  const years = [...new Set(s.map((o) => o.date.slice(0, 4)))].filter((yr) => Number(yr) % 5 === 0);
  const lastO = s.at(-1)!;
  return (
    <figure style={{ margin: 0 }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`M2 growth from ${s[0].date.slice(0, 4)} to ${lastO.date.slice(0, 7)}: now ${lastO.value}% on a year ago`}>
        {[lo, 0, 6.5, hi].map((g) => <g key={g}><line x1={44} x2={W - 16} y1={y(g)} y2={y(g)} stroke={g === 0 ? 'var(--line2)' : g === 6.5 ? 'var(--gold)' : 'transparent'} strokeDasharray={g === 6.5 ? '5 4' : '3 3'} /><text x={38} y={y(g) + 4} fontSize={10} fill="var(--dim)" textAnchor="end">{g.toFixed(g % 1 ? 1 : 0)}%</text></g>)}
        <path d={d} fill="none" stroke="var(--teal)" strokeWidth={2} />
        <circle cx={x(lastO.date)} cy={y(lastO.value)} r={4} fill="var(--teal)" />
        {years.map((yr) => <text key={yr} x={x(`${yr}-01-01`)} y={H - 4} fontSize={10} fill="var(--dim)" textAnchor="middle">{yr}</text>)}
      </svg>
      <figcaption className="dim" style={{ fontSize: 12 }}><span style={{ color: 'var(--teal)' }}>━ M2 growth, % on a year ago</span> · <span style={{ color: 'var(--gold)' }}>┅ about 6.5%, the long-run average pace</span></figcaption>
    </figure>
  );
}

export default async function Liquidity() {
  const t = await getTide();
  const ok = t.available && t.score !== null && t.mood;
  return (
    <>
      <Header active="Liquidity" />
      <main className="wrap" id="main">
        <section className="bar"><span className="tag gold">Tide · Liquidity &amp; M2</span><span style={{ flex: '1 1 480px' }}>Tide follows the money tide: how fast the US money supply (M2) and Fed liquidity are growing, and what that has meant for stocks, inflation, loans, your cash and India. A rising tide lifts most boats; a falling one exposes the weak ones.</span></section>
        {!ok ? <section className="card"><h2>Tide is loading</h2><p className="muted">The M2 reading appears once FRED data is available.</p></section> : <>
          <M2Notice t={t} />
          <section className="card sentiment-card tide-card" aria-label="Tide score">
            <div className="tag dim">M2 data for {monthName(t.asOf)}{releasedDay(t.released) ? ` · FRED updated ${releasedDay(t.released)}` : ''}</div>
            <h1 style={{ margin: 0, font: '700 26px var(--head)' }}>{t.headline}</h1>
            <div className="sentiment-row">
              <div style={{ textAlign: 'center', minWidth: 200 }}>
                <TideDial score={t.score!} size={220} />
                <div style={{ color: TIDE_COL[t.mood!], fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>{t.mood}</div>
              </div>
              <div className="tide-parts" style={{ flex: 1, minWidth: 280 }}>
                <div className="muted" style={{ fontSize: 13, display: 'block' }}>The Tide score (0 = draining, 100 = flooding) averages four parts:</div>
                {t.parts.map((p) => <div key={p.label}><span>{p.label}</span><span className="bar-mini"><span style={{ width: `${p.score}%` }} /></span><span className="mono">{p.score}</span></div>)}
              </div>
            </div>
          </section>

          <section className="grid" aria-label="Money supply readings">
            {[
              ['M2 money supply', t.level !== null ? `$${(t.level / 1000).toFixed(2)}T` : '—', `${sgn(t.yoy)} on a year ago · ${sgn(t.mom, 2)} on the month`, 'Cash, checking, savings and money-market funds held by the public.'],
              ['M2 growth trend', t.yoyChg3 === null ? '—' : `${t.yoyChg3 >= 0 ? '+' : ''}${t.yoyChg3.toFixed(1)} pts`, 'change in the growth rate over 3 months', t.regimeText ? `Money supply is ${t.regimeText}.` : ''],
              ['Real M2', sgn(t.realYoy), 'growth after inflation, year on year', 'Negative means money is shrinking in real terms: tighter conditions.'],
              ['Fed net liquidity', t.netLiq !== null ? `$${(t.netLiq / 1000).toFixed(2)}T` : '—', `${sgn(t.netLiq3mPct)} in 3 months`, 'Fed balance sheet minus reverse repo and the Treasury account: money available to markets.'],
            ].map(([label, value, sub, means]) => (
              <article key={label} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div className="tag dim">{label}</div>
                <div style={{ font: '700 26px var(--head)', color: '#fff' }}>{value}</div>
                <div className="muted" style={{ fontSize: 13 }}>{sub}</div>
                <p className="dim" style={{ margin: 0, fontSize: 12 }}>{means}</p>
              </article>
            ))}
          </section>

          <section className="card" aria-label="What the money tide means for you">
            <h2 style={{ marginBottom: 6 }}>What it means for your money</h2>
            <div style={{ display: 'grid', gap: 10 }}>
              {t.impacts.map((i) => <div key={i.area} className="inset" style={{ borderLeft: `3px solid ${TONE[i.tone]}` }}><b>{i.area}</b><p style={{ margin: '4px 0 0', fontSize: 14 }}>{i.read}</p></div>)}
            </div>
          </section>

          <section className="card" aria-label="M2 growth since 2000">
            <h2 style={{ marginBottom: 6 }}>M2 growth over 25 years</h2>
            <LongM2 s={t.m2YoyLong} />
            <p className="muted" style={{ margin: '6px 0 0', fontSize: 13 }}>2020–21 saw the fastest money growth on record (about 27%), followed in 2022–23 by the first year-on-year fall in M2 since FRED’s data begins in 1959. Inflation rose and then cooled in the same order, with a delay.</p>
          </section>

          {t.relations.length > 0 && <section className="card" aria-label="How money supply relates to inflation and stocks">
            <h2 style={{ marginBottom: 4 }}>How the money tide has related to inflation and stocks</h2>
            <p className="muted" style={{ margin: '0 0 8px', fontSize: 14 }}>Correlation (r) runs from −1 to +1: past relationships over about 10 years, not a forecast.</p>
            <div style={{ display: 'grid', gap: 18 }}>{t.relations.map((r) => <div key={r.title}><h3 style={{ margin: '0 0 4px' }}>{r.title}</h3><RelationChart rel={r} /><p style={{ margin: '4px 0 0', fontSize: 14 }}>{r.read}</p></div>)}</div>
          </section>}

          <section className="card" aria-label="Fed net liquidity">
            <h2 style={{ marginBottom: 4 }}>Fed net liquidity, last 5 years</h2>
            <Spark s={t.netLiqSeries} label="Fed net liquidity, $B" />
          </section>

          <section className="card" aria-label="How to read Tide">
            <h2 style={{ marginBottom: 4 }}>How to read Tide</h2>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14 }}>
              <li><b>M2</b> is the broad money supply: cash, checking and savings deposits, and retail money-market funds. FRED publishes it monthly, about four weeks after the month ends.</li>
              <li><b>Real M2</b> takes inflation out. <b>Fed net liquidity</b> is a popular market gauge built from the Fed’s weekly balance sheet.</li>
              <li>Money growth acts with a delay and alongside rates, earnings and confidence. Tide describes the backdrop; it does not time markets, and it never tells you to buy or sell.</li>
              <li>India: the RBI publishes broad money (M3) separately; Tide shows how US dollar liquidity reaches India through the rupee and foreign flows.</li>
            </ul>
          </section>
        </>}
        <AgentAsk title="Ask Tide" suggestions={['What does M2 money supply mean for my money right now?', 'Is money growth pushing inflation up or down?', 'How does US liquidity affect Indian stocks and the rupee?', 'What happened to stocks the last time M2 shrank?']} />
        <p className="dim" style={{ margin: 0, fontSize: 12 }}>Source: FRED, Federal Reserve Bank of St. Louis (M2SL, M2REAL, WALCL, RRPONTSYD, WTREGEN, CPIAUCSL, SP500, DFF, DEXINUS). Past data and relationships, not a forecast. Educational, not financial advice. <Link href="/economy">More on the economy →</Link></p>
        <Footer note="M2 and liquidity: FRED" />
      </main>
    </>
  );
}
