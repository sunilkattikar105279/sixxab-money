import type { Metadata } from 'next';
import Link from 'next/link';
import { Header, Footer } from '@/components/Header';
import { AgentAsk } from '@/components/AgentAsk';
import { TileGrid, RelationChart } from '@/components/MacroCharts';
import { CurveChart, Ladder } from '@/components/CreditCharts';
import { creditSnapshot } from '@/lib/data/credit';
import { HQM, UST, CREDIT, MATURITIES } from '@/lib/credit';

export const metadata: Metadata = { title: 'Spread · Credit and corporate profits', description: 'The corporate bond yield curve, credit spreads and corporate profits, and how they line up with stocks and today’s market mood.' };
export const revalidate = 21600;

const TONE = { good: 'var(--green)', neutral: 'var(--gold)', bad: 'var(--red)' } as const;

export default async function Credit() {
  const c = await creditSnapshot();
  const ids = [...MATURITIES.map((m) => HQM[m].id), ...MATURITIES.map((m) => UST[m].id), ...Object.values(CREDIT).map((d) => d.id)].join(', ');
  return (
    <>
      <Header active="Credit" />
      <main className="wrap" id="main">
        <section className="bar">
          <span className="tag gold">Spread · Credit &amp; profits{c.asOf ? ` · data to ${c.asOf.slice(0, 7)}` : ''}</span>
          <span style={{ flex: '1 1 480px' }}>Spread, the SIXXAB Money credit agent, follows what companies pay to borrow, how much they earn, and whether bond investors and stock investors agree. Credit markets often notice trouble first. Educational, not financial advice.</span>
        </section>

        {!c.available ? (
          <section className="card"><p className="muted" style={{ margin: 0 }}>Credit data loads from FRED. It will appear here once the FRED connection responds.</p></section>
        ) : <>
          <section className="card" aria-label="Today's credit backdrop" style={{ borderColor: TONE[c.regime.tone] }}>
            <div className="tag teal">Spread · Today’s credit backdrop</div>
            <h1 style={{ margin: '6px 0 4px', fontSize: 30, color: TONE[c.regime.tone] }}>{c.regime.name}</h1>
            <p style={{ margin: '0 0 10px', fontSize: 16 }}>{c.regime.read}</p>
            <ul style={{ margin: 0, paddingLeft: 18, columns: '2 300px' }}>{c.regime.signals.map((s) => <li key={s} style={{ marginBottom: 4 }}>{s}</li>)}</ul>
            {c.regime.divergence && <div className="inset" style={{ marginTop: 12, borderLeft: '3px solid var(--gold)' }}><div className="tag gold">Stocks vs bonds</div><div>{c.regime.divergence}</div></div>}
            {c.pulse && <p className="muted" style={{ margin: '10px 0 0', fontSize: 13 }}>Market mood: <Link href="/sentiment">Pulse SIXXAB Sentiment {c.pulse.score} ({c.pulse.mood})</Link>{c.pulse.credit ? ` · ${c.pulse.credit}` : ''} · {c.pulse.asOf}</p>}
          </section>

          <h2 id="curve">The corporate yield curve</h2>
          <section className="card" aria-label="Corporate and Treasury yield curves">
            <p className="muted" style={{ margin: '0 0 8px', fontSize: 14 }}>What high-quality companies pay to borrow for 1 to 30 years, against the US government. The gap is the credit spread. Corporate curve slope (30-year minus 2-year): <b style={{ color: '#fff' }}>{c.corpSlope === null ? '—' : `${c.corpSlope >= 0 ? '+' : ''}${c.corpSlope.toFixed(2)} pts`}</b>; Treasury: <b style={{ color: '#fff' }}>{c.ustSlope === null ? '—' : `${c.ustSlope >= 0 ? '+' : ''}${c.ustSlope.toFixed(2)} pts`}</b>.</p>
            <CurveChart pts={c.curve} />
            <div className="scroll" style={{ marginTop: 10 }}>
              <table className="compact"><thead><tr><th>Maturity</th>{c.curve.map((p) => <th key={p.m}>{p.m}y</th>)}</tr></thead>
                <tbody>
                  <tr><td>Corporate</td>{c.curve.map((p) => <td key={p.m} className="mono">{p.corp?.toFixed(2) ?? '—'}%</td>)}</tr>
                  <tr><td>Treasury</td>{c.curve.map((p) => <td key={p.m} className="mono">{p.ust?.toFixed(2) ?? '—'}%</td>)}</tr>
                  <tr><td>Spread</td>{c.curve.map((p) => <td key={p.m} className="mono" style={{ color: 'var(--gold)' }}>{p.spread?.toFixed(2) ?? '—'}</td>)}</tr>
                  <tr><td className="dim">Corporate a year ago</td>{c.curve.map((p) => <td key={p.m} className="mono dim">{p.corpYearAgo?.toFixed(2) ?? '—'}%</td>)}</tr>
                </tbody></table>
            </div>
          </section>

          <h2 id="spreads">Credit spreads</h2>
          <TileGrid tiles={c.spreads} />
          <section className="card" aria-label="Spreads by credit rating">
            <h3 style={{ margin: '0 0 4px' }}>Risk priced by rating</h3>
            <p className="muted" style={{ margin: '0 0 10px', fontSize: 14 }}>Extra yield over Treasuries for each rating, with a marker for three months ago. When the riskiest rungs widen fastest, lenders are turning cautious on weaker companies.</p>
            <Ladder rows={c.ladder} />
          </section>

          <h2 id="profits">Corporate profits</h2>
          <TileGrid tiles={c.profits} />

          {c.relations.length > 0 && <section className="card" aria-label="How credit and profits relate to stocks">
            <h2 style={{ marginBottom: 4 }}>How bonds, profits and stocks move together</h2>
            <p className="muted" style={{ margin: '0 0 8px', fontSize: 14 }}>Correlation (r) runs from −1 to +1: past relationships, not a forecast. Lines are on their own scales.</p>
            <div style={{ display: 'grid', gap: 18 }}>{c.relations.map((r) => <div key={r.title}><h3 style={{ margin: '0 0 4px' }}>{r.title}</h3><RelationChart rel={r} /><p style={{ margin: '4px 0 0', fontSize: 14 }}>{r.read}</p></div>)}</div>
          </section>}

          <h2 id="scenarios">Scenarios and signposts</h2>
          <section className="grid" aria-label="Scenarios">
            {c.regime.scenarios.map((s) => (
              <article key={s.name} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div className={`tag ${s.odds === 'base' ? 'teal' : s.odds === 'upside' ? 'gold' : 'dim'}`}>{s.odds === 'base' ? 'Base case' : s.odds === 'upside' ? 'Upside' : 'Downside'}</div>
                <h3 style={{ margin: 0 }}>{s.name}</h3>
                <p style={{ margin: 0, fontSize: 14 }}>{s.story}</p>
                <div className="dim" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '.1em' }}>Signposts to watch</div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14 }}>{s.signposts.map((x) => <li key={x}>{x}</li>)}</ul>
                <div className="inset" style={{ fontSize: 14 }}><div className="tag gold">Your money</div>{s.money}</div>
              </article>
            ))}
          </section>
          <p className="dim" style={{ margin: 0, fontSize: 12 }}>Scenarios are illustrations to help you plan, not predictions. Source: FRED, Federal Reserve Bank of St. Louis ({ids}). HQM corporate curve from the US Treasury; ICE BofA spreads and yields; Moody’s; BEA corporate profits; Federal Reserve Z.1 debt.</p>
        </>}

        <AgentAsk title="Ask Spread" suggestions={['Are credit spreads warning about stocks right now?', 'What does the corporate yield curve tell us?', 'Are corporate profits still growing?', 'Why do junk bond spreads matter for my portfolio?', 'Are stocks and bonds telling the same story?']} />
        <Footer note="Data: FRED (US Treasury HQM curve, ICE BofA, Moody’s, BEA, Federal Reserve) · Spread agent · Educational, not financial advice" />
      </main>
    </>
  );
}
