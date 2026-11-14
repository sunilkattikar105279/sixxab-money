import { Header, Footer } from '@/components/Header';
import { getSnapshot, type Market } from '@/lib/data/market';
import { adminClient } from '@/lib/supabase/admin';
import { STAGES } from '@/lib/sixs';
import Link from 'next/link';
import { getStocks } from '@/lib/data/stocks';
import { IndustryMap } from '@/components/IndustryMap';
import { StockTable } from '@/components/StockTable';

export const revalidate = 300;

async function latestBrief(): Promise<string | null> {
  const db = adminClient();
  if (!db) return null;
  const { data } = await db.from('briefs').select('text').eq('market', 'US').order('created_at', { ascending: false }).limit(1).maybeSingle();
  return data?.text ?? null;
}

const fmt = (v: number | null, d = 2) => (v === null ? '—' : v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }));
const sign = (v: number | null) => (v === null ? '' : v > 0 ? '+' : v < 0 ? '−' : '');

export default async function Home({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { m } = await searchParams;
  const market: Market = m === 'IN' || m === 'GLOBAL' ? m : 'US';
  const [snap, brief, board] = await Promise.all([getSnapshot(market), market === 'US' ? latestBrief() : Promise.resolve(null), getStocks(market)]);
  const mapTitle = market === 'US' ? 'US industry map' : market === 'IN' ? 'India industry map (NSE)' : 'Global industry map';
  const fallbackBrief = market === 'US' && snap.sample
    ? 'Chip stocks pulled the Nasdaq down 0.9% after Nvidia’s CEO exit, while the Dow edged up. More stocks fell than rose.'
    : '[The agent brief appears here once this market’s data feed is connected.]';

  return (
    <>
      <Header active="Home" market={market} />
      <main className="wrap">
        <section className="bar" aria-label="Agent brief">
          <span className="tag teal">Agent brief{snap.asOf ? ` · ${snap.asOf}` : ''}</span>
          <span style={{ flex: '1 1 480px' }}>{brief ?? fallbackBrief}</span>
          <Link href="/ask?q=Why%20did%20the%20market%20move%20today%3F" style={{ fontWeight: 600 }}>Why? Ask the agent</Link>
        </section>

        <section className="grid" aria-label="Indexes">
          {snap.indices.map((q) => (
            <article key={q.name} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><h2>{q.name}</h2><span className="mono dim" style={{ fontSize: 12 }}>{snap.asOf || '—'}</span></div>
              <div className="big">{fmt(q.value)}</div>
              <div className={`mono ${q.change === null ? 'dim' : q.change >= 0 ? 'green' : 'red'}`} style={{ fontWeight: 600 }}>
                {q.change === null ? 'awaiting feed' : `${sign(q.change)}${fmt(Math.abs(q.change))} (${sign(q.changePct)}${fmt(Math.abs(q.changePct ?? 0))}%)`}
              </div>
              {q.why && <p className="muted" style={{ margin: 0, fontSize: 13 }}>{q.why}</p>}
            </article>
          ))}
        </section>

        <IndustryMap board={board} title={mapTitle} />

        <div className="cols">
          <div className="main">
            <StockTable board={board} currency={market === 'US' ? 'USD' : market === 'IN' ? 'INR' : 'local'} />
            <section className="card" aria-label="Your SIXXAB journey">
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8, marginBottom: 14 }}>
                <h2>The SIXXAB journey</h2><span className="dim" style={{ fontSize: 12 }}>Six money stages, from age 11 to legacy</span>
              </div>
              <ol className="stages">
                {STAGES.map((s) => (
                  <li key={s.key}><div className="tag gold">Stage {s.n}</div><div style={{ font: '700 15px var(--head)', color: '#fff', margin: '4px 0' }}>{s.name}</div><div className="muted" style={{ fontSize: 12 }}>{s.focus}</div></li>
                ))}
              </ol>
              <div style={{ marginTop: 14 }}><Link href="/my-money" className="btn btn-line">Find my stage</Link></div>
            </section>
          </div>
          <aside className="side">
            <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <h2>Where the numbers come from</h2>
              <p className="muted" style={{ margin: 0 }}>Source: {snap.source}{snap.sample ? ' (sample until the licensed feed is connected)' : ''}.</p>
              <p className="muted" style={{ margin: 0 }}>Every agent answer is saved with its sources, model and confidence, and you can open the trail.</p>
            </section>
            <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <h2>Explore</h2>
              <Link href="/economy">Economy: what this week’s data means for your loans</Link>
              <Link href="/world">World &amp; Policy: both sides, with sources</Link>
              <Link href="/learn">Learn: lessons by age and stage</Link>
            </section>
          </aside>
        </div>
        <Footer note={`Index data: ${snap.source} · Stocks: ${board.source}`} />
      </main>
    </>
  );
}
