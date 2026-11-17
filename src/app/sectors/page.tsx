import type { Metadata } from 'next';
import Link from 'next/link';
import { Header, Footer } from '@/components/Header';
import { RotationChart } from '@/components/RotationChart';
import { JoinPrompt } from '@/components/JoinPrompt';
import { getRotation } from '@/lib/data/rotation';
import { signedIn } from '@/lib/viewer';
import { LEADERS } from '@/lib/rotation';

export const metadata: Metadata = { title: 'Sector rotation: where money is moving · SIXXAB Money', description: 'US and India sectors mapped by relative strength, Wyckoff phase and Elliott wave, updated every night.' };

export default async function Sectors({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { m } = await searchParams;
  const market = m === 'IN' ? 'IN' : 'US';
  const [rot, member] = await Promise.all([getRotation(market), signedIn()]);
  return (
    <>
      <Header active="Sectors" />
      <main className="wrap" id="main">
        <section className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <div><div className="tag teal">Delta · Sector rotation agent</div><h1 style={{ fontSize: 26, margin: '6px 0' }}>Where money is moving</h1></div>
            <nav aria-label="Market" style={{ display: 'flex', gap: 8 }}>{(['US', 'IN'] as const).map((x) => <Link key={x} href={x === 'US' ? '/sectors' : '/sectors?m=IN'} className={`btn ${x === market ? 'btn-gold' : 'btn-line'}`} aria-current={x === market ? 'true' : undefined}>{x === 'US' ? 'US sectors' : 'India (Nifty) sectors'}</Link>)}</nav>
          </div>
          {rot ? <>
            <p style={{ margin: '4px 0' }}>{rot.summary}</p>
            <p className="dim" style={{ margin: 0, fontSize: 13 }}>Usual leaders in {rot.indexPhase}: circled in white. Sectors tend to move clockwise: improving → leading → weakening → lagging. As of {rot.asOf}.</p>
            <RotationChart sectors={rot.sectors} />
          </> : <p className="muted">{market === 'IN' ? 'India sector rotation appears once the India data feed (Upstox) is connected.' : 'Sector rotation appears after the next nightly market update.'}</p>}
        </section>
        {rot && (member ? (
          <section className="card scroll">
            <h2 style={{ marginBottom: 8 }}>Sector by sector</h2>
            <table className="compact">
              <thead><tr><th>Sector</th><th>Quadrant</th><th style={{ textAlign: 'right' }}>vs index 13 wk</th><th style={{ textAlign: 'right' }}>4 wk</th><th>Wyckoff (weekly)</th><th>Elliott</th><th style={{ textAlign: 'right' }}>Fit 0–10</th><th>Why</th></tr></thead>
              <tbody>{rot.sectors.map((s) => (
                <tr key={s.key}>
                  <td style={{ fontWeight: 600 }}>{s.name} <span className="dim mono" style={{ fontSize: 11 }}>{s.symbol.replace('NSE_INDEX|', '')}</span></td>
                  <td><span className={`chip ${s.quadrant === 'leading' ? 'up' : s.quadrant === 'lagging' ? 'down' : 'flat'}`}>{s.quadrant}</span></td>
                  <td className={`mono ${s.level >= 0 ? 'green' : 'red'}`} style={{ textAlign: 'right' }}>{s.level >= 0 ? '+' : ''}{s.level}</td>
                  <td className={`mono ${s.momentum >= 0 ? 'green' : 'red'}`} style={{ textAlign: 'right' }}>{s.momentum >= 0 ? '+' : ''}{s.momentum}</td>
                  <td>{s.phase}</td><td>{s.wave ? `wave ${s.wave}` : '—'}</td>
                  <td className="mono" style={{ textAlign: 'right' }}>{s.agreement}</td>
                  <td className="muted" style={{ fontSize: 13 }}>{s.why}</td>
                </tr>
              ))}</tbody>
            </table>
          </section>
        ) : <JoinPrompt what="Each sector's Wyckoff phase, Elliott wave, fit score and the reason behind it" from="/sectors" />)}
        <section className="card">
          <h2 style={{ marginBottom: 8 }}>How the cycle usually rotates</h2>
          <table className="compact"><thead><tr><th>Index phase</th><th>Sectors that have tended to lead</th></tr></thead>
            <tbody>{(Object.keys(LEADERS) as (keyof typeof LEADERS)[]).map((p) => <tr key={p} style={{ fontWeight: rot?.indexPhase === p ? 700 : 400 }}><td>{p}{rot?.indexPhase === p ? ' ← now' : ''}</td><td className="muted">{({ 'early recovery': 'Financials, consumer discretionary, real estate · Nifty Bank, Auto, Realty', expansion: 'Technology, industrials, communication · Nifty IT, PSU Bank, Media', 'late cycle': 'Energy, materials · Nifty Metal, Energy', slowdown: 'Health care, staples, utilities · Nifty Pharma, FMCG', contraction: 'Staples, utilities, health care, cash and gold · Nifty FMCG, Pharma' } as Record<string, string>)[p]}</td></tr>)}</tbody></table>
          <p className="dim" style={{ margin: '6px 0 0', fontSize: 12 }}>Tendencies from past cycles, not rules. Every cycle is different. Educational, not a recommendation.</p>
        </section>
        <Footer note="Relative strength vs SPY (US) or Nifty 50 (India) · Wyckoff and Elliott reads are rule-based and can be wrong" />
      </main>
    </>
  );
}
