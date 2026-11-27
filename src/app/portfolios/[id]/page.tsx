import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Header, Footer } from '@/components/Header';
import { PortfolioChart } from '@/components/PortfolioChart';
import { AgentAsk } from '@/components/AgentAsk';
import data from '@/data/portfolios-US.json';
import type { PortfolioFile } from '../types';

const file = data as unknown as PortfolioFile;
export const dynamicParams = true;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params; const p = file.portfolios.find((x) => x.id === id);
  return { title: p ? `${p.name} · Strategy portfolio` : 'Strategy portfolio', description: p?.tagline };
}

export default async function Portfolio({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = file.portfolios.find((x) => x.id === id);
  if (!p) notFound();
  const r = p.result, holdings = r?.holdings ?? p.live?.holdings ?? [];
  return (
    <>
      <Header active="Portfolios" />
      <main className="wrap" id="main">
        <section className="bar"><span className="tag gold">{p.agent} · {p.style}</span><span style={{ flex: '1 1 480px' }}>{p.tagline}. {p.risk} risk.</span></section>
        <h1 style={{ margin: 0, font: '700 28px var(--head)' }}>{p.name}</h1>

        {r && <>
          <section className="grid" aria-label="Backtest results">
            {[
              ['Yearly return (CAGR)', `${r.cagrPct}%`, `S&P 500 ${r.benchCagrPct}%`],
              ['Total return', `${r.totalReturnPct}%`, `S&P 500 ${r.benchTotalReturnPct}%`],
              ['Worst fall', `−${r.maxDrawdownPct}%`, `S&P 500 −${r.benchMaxDrawdownPct}%`],
              ['Volatility', `${r.volPct}% a year`, `best year ${r.bestYearPct ?? '—'}% · worst ${r.worstYearPct ?? '—'}%`],
            ].map(([a, b, c]) => <article key={a} className="card"><div className="tag dim">{a}</div><div style={{ font: '700 26px var(--head)', color: '#fff' }}>{b}</div><div className="muted" style={{ fontSize: 13 }}>{c}</div></article>)}
          </section>
          <section className="card" aria-label="Growth chart"><h2 style={{ marginBottom: 6 }}>Backtest: {r.curve[0]?.d} to {r.curve.at(-1)?.d}</h2><PortfolioChart curve={r.curve} /></section>
          <section className="card" aria-label="Year by year">
            <h2 style={{ marginBottom: 6 }}>Year by year</h2>
            <table className="compact"><thead><tr><th>Year</th><th>Portfolio</th><th>S&amp;P 500</th><th>Difference</th></tr></thead>
              <tbody>{r.yearly.map((y) => <tr key={y.year}><td>{y.year}</td><td className={y.pct >= 0 ? 'green' : 'red'}>{y.pct}%</td><td>{y.bench}%</td><td className={y.pct - y.bench >= 0 ? 'green' : 'red'}>{(y.pct - y.bench).toFixed(1)} pts</td></tr>)}</tbody></table>
            <p className="dim" style={{ margin: '6px 0 0', fontSize: 12 }}>First and last years are partial. Average monthly turnover {r.turnoverPct}%.</p>
          </section>
        </>}

        <section className="card" aria-label="Holdings">
          <h2 style={{ marginBottom: 4 }}>Holdings{r?.rebalancedOn ? ` · rebalanced ${r.rebalancedOn}` : p.live ? ` · live since ${p.live.since}` : ''}</h2>
          {holdings.length ? <table className="compact"><thead><tr><th>Symbol</th><th>Weight</th></tr></thead><tbody>{holdings.map((h) => <tr key={h.symbol}><td><Link href={`/stock/US/${encodeURIComponent(h.symbol)}`}>{h.symbol}</Link></td><td>{h.weight}%</td></tr>)}</tbody></table> : <p className="muted" style={{ margin: 0 }}>No holdings this month: the rules point to cash.</p>}
          {r && (r.changes.added.length > 0 || r.changes.removed.length > 0) && <p style={{ margin: '8px 0 0', fontSize: 14 }}>This month: {r.changes.added.length ? <>in <b className="green">{r.changes.added.join(', ')}</b></> : null}{r.changes.added.length && r.changes.removed.length ? ' · ' : ''}{r.changes.removed.length ? <>out <b className="red">{r.changes.removed.join(', ')}</b></> : null}</p>}
          {holdings.reduce((s, h) => s + h.weight, 0) < 99 && holdings.length > 0 && <p className="dim" style={{ margin: '6px 0 0', fontSize: 12 }}>The rest is in cash this month.</p>}
        </section>

        <section className="card" aria-label="Rules">
          <h2 style={{ marginBottom: 4 }}>The rules</h2>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14 }}>{p.method.map((m) => <li key={m}>{m}</li>)}</ul>
        </section>

        <AgentAsk title={`Ask ${p.agent}`} suggestions={[`How does the ${p.name} portfolio work?`, `When does a strategy like ${p.name} tend to struggle?`, 'How should I compare a model portfolio with just holding the S&P 500?']} />
        <p className="dim" style={{ margin: 0, fontSize: 12 }}>A model portfolio for education: the same rules for every reader, not personal advice and not a recommendation to buy or sell. {file.note} <Link href="/portfolios">All portfolios →</Link></p>
        <Footer note="Prices: Alpaca (IEX feed)" />
      </main>
    </>
  );
}
