import Link from 'next/link';
import type { Metadata } from 'next';
import { Header, Footer } from '@/components/Header';
import { PortfolioChart } from '@/components/PortfolioChart';
import data from '@/data/portfolios-US.json';
import type { PortfolioFile } from './types';

export const metadata: Metadata = { title: 'Strategy portfolios', description: 'Rules-based model portfolios from the SIXXAB Money agents: momentum, defensive, trend, all-weather, liquidity and quality. Backtested against the S&P 500 and rebalanced monthly.' };

const RISK = { Low: 'var(--green)', Medium: 'var(--gold)', High: 'var(--red)' } as const;

export default function Portfolios() {
  const f = data as unknown as PortfolioFile;
  return (
    <>
      <Header active="Portfolios" />
      <main className="wrap" id="main">
        <section className="bar"><span className="tag gold">Strategy portfolios</span><span style={{ flex: '1 1 480px' }}>Rules-based model portfolios run by the SIXXAB agents. Each one shows its rules, its backtest against the S&amp;P 500 and this month’s holdings, rebalanced on the first trading day of each month.</span></section>
        {!f.portfolios.length ? <section className="card"><p className="muted" style={{ margin: 0 }}>The first monthly update is running. Check back shortly.</p></section> :
        <section className="grid" aria-label="Portfolios">
          {f.portfolios.map((p) => (
            <Link key={p.id} href={`/portfolios/${p.id}`} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 6, color: 'var(--text)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><span className="tag teal">{p.agent} · {p.style}</span><span className="mono" style={{ fontSize: 12, color: RISK[p.risk] }}>{p.risk} risk</span></div>
              <h2 style={{ margin: 0 }}>{p.name}</h2>
              <p className="muted" style={{ margin: 0, fontSize: 13 }}>{p.tagline}</p>
              {p.result ? <>
                <PortfolioChart curve={p.result.curve} mini />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, fontSize: 13 }}>
                  <div><div className="dim" style={{ fontSize: 11 }}>Yearly return</div><b className={p.result.cagrPct >= p.result.benchCagrPct ? 'green' : ''}>{p.result.cagrPct}%</b></div>
                  <div><div className="dim" style={{ fontSize: 11 }}>S&amp;P 500</div><b>{p.result.benchCagrPct}%</b></div>
                  <div><div className="dim" style={{ fontSize: 11 }}>Worst fall</div><b>−{p.result.maxDrawdownPct}%</b></div>
                </div>
              </> : <p className="dim" style={{ margin: 0, fontSize: 12 }}>Tracked live from {p.live?.since}: no backtest (see why inside).</p>}
              <span style={{ fontWeight: 600, color: 'var(--teal)', marginTop: 'auto' }}>See rules and holdings →</span>
            </Link>
          ))}
        </section>}
        <p className="dim" style={{ margin: 0, fontSize: 12 }}>Model portfolios for education: the same rules for every reader, not personal advice and not a recommendation to buy or sell. {f.note} {f.generated ? `Updated ${f.generated.slice(0, 10)}.` : ''}</p>
        <Footer note="Prices: Alpaca (IEX feed)" />
      </main>
    </>
  );
}
