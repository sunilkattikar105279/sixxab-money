import { Header, Footer } from '@/components/Header';
import { getSnapshot, type Market } from '@/lib/data/market';
import { adminClient } from '@/lib/supabase/admin';
import Link from 'next/link';
import { getStocks } from '@/lib/data/stocks';
import { IndustryMap } from '@/components/IndustryMap';
import { StockTable } from '@/components/StockTable';
import { videos } from '@/lib/media';
import { getBreadth } from '@/lib/data/breadth';
import { Breadth } from '@/components/Breadth';
import { TopMovers } from '@/components/TopMovers';
import { policyBriefs } from '@/lib/data/policy';
import { RiskMeter } from '@/components/RiskMeter';
import { getRegime } from '@/lib/data/regime';
import { JourneyPath, type JourneyProgress } from '@/components/JourneyPath';
import { getMember } from '@/lib/member';
import { TopPromos, BriefMini } from '@/components/TopPromos';

export const revalidate = 300;

async function latestBrief(market: 'US' | 'IN'): Promise<string | null> {
  const db = adminClient();
  if (!db) return null;
  const { data } = await db.from('briefs').select('text').eq('market', market).order('created_at', { ascending: false }).limit(1).maybeSingle();
  return data?.text ?? null;
}

async function memberJourney(): Promise<JourneyProgress | null> {
  const m = await getMember();
  if (!m?.member) return null;
  const { data } = await m.sb.from('monthly_checks').select('month, habit_gate_met, net_worth').eq('member_id', m.member.id).order('month', { ascending: false }).limit(3);
  let habitMonths = 0; for (const c of data ?? []) { if (c.habit_gate_met) habitMonths++; else break; }
  return { stage: m.member.stage, country: m.member.country, habitMonths, netWorth: data?.[0]?.net_worth ?? null };
}

const fmt = (v: number | null, d = 2) => (v === null ? '—' : v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }));
const sign = (v: number | null) => (v === null ? '' : v > 0 ? '+' : v < 0 ? '−' : '');

export default async function Home({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { m } = await searchParams;
  const market: Market = m === 'IN' || m === 'GLOBAL' ? m : 'US';
  const [snap, brief, board, briefs, briefIN] = await Promise.all([getSnapshot(market), latestBrief('US'), getStocks(market), videos({ topic: 'daily-brief', limit: 1 }), latestBrief('IN')]);
  const [breadth, briefsList, regime] = await Promise.all([getBreadth(market, board), policyBriefs(undefined, 3), market === 'GLOBAL' ? Promise.resolve(null) : getRegime(market)]);
  const journey = await memberJourney();
  const [today] = briefs;
  const mapTitle = market === 'US' ? 'US industry map' : market === 'IN' ? 'India industry map (NSE)' : 'Global industry map';
  const fallbackBrief = market === 'US' && snap.sample
    ? 'Chip stocks pulled the Nasdaq down 0.9% after Nvidia’s CEO exit, while the Dow edged up. More stocks fell than rose.'
    : '[The agent brief appears here once this market’s data feed is connected.]';

  return (
    <>
      <Header active="Home" market={market} />
      <main className="wrap" id="main">
        <TopPromos />
        <BriefMini brief={today} />

        <section className="bar" aria-label="Agent brief">
          <span className="tag teal">Tape · agent brief</span>
          <span style={{ flex: '1 1 480px', display: 'grid', gap: 4 }}>
            <span>{brief ?? fallbackBrief}</span>
            {briefIN && <span className="muted">{briefIN}</span>}
          </span>
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

        {market !== 'GLOBAL' && <RiskMeter r={regime} />}

        <Breadth bars={breadth} />

        <IndustryMap board={board} title={mapTitle} />

        <div className="cols">
          <div className="main">
            <StockTable board={board} currency={market === 'US' ? 'USD' : market === 'IN' ? 'INR' : 'local'} />
            <JourneyPath progress={journey} />
          </div>
          <aside className="side">
            <TopMovers board={board} />
            <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }} aria-label="World and policy">
              <h2>World &amp; policy</h2>
              {briefsList.map((b) => <Link key={b.id} href="/world" className="inset" style={{ display: 'block', color: 'var(--text)' }}><div className="tag gold">{b.tag}</div><div style={{ fontWeight: 600, margin: '4px 0' }}>{b.title}</div><div className="muted" style={{ fontSize: 12 }}>{b.money.slice(0, 110)}{b.money.length > 110 ? '…' : ''}</div></Link>)}
            </section>
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
