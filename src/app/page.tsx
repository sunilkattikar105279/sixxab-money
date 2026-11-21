import { Header, Footer } from '@/components/Header';
import { getSnapshot, type Market } from '@/lib/data/market';
import { adminClient } from '@/lib/supabase/admin';
import Link from 'next/link';
import { getStocks } from '@/lib/data/stocks';
import { IndustryMap } from '@/components/IndustryMap';
import { StockTable } from '@/components/StockTable';
import { videos, briefThumb } from '@/lib/media';
import { getBreadth } from '@/lib/data/breadth';
import { Breadth } from '@/components/Breadth';
import { TopMovers } from '@/components/TopMovers';
import { policyBriefs } from '@/lib/data/policy';
import { RiskMeter } from '@/components/RiskMeter';
import { getRegime, getSentiment } from '@/lib/data/regime';
import { SentimentCard } from '@/components/SentimentGauge';
import { JourneyPath, type JourneyProgress } from '@/components/JourneyPath';
import { getMember } from '@/lib/member';
import { TopPromos, BriefMini, fmtDay } from '@/components/TopPromos';

export const revalidate = 300;

async function latestBrief(market: 'US' | 'IN' | 'GLOBAL'): Promise<string | null> {
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

/** Says which close the numbers are from, and when the next one arrives (US after 4 PM ET, India after 3:30 PM IST). */
function lastCloseNote(market: Market, asOf: string): string | null {
  if (!asOf || market === 'GLOBAL') return null;
  const tz = market === 'IN' ? 'Asia/Kolkata' : 'America/New_York';
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date());
  const dow = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' }).format(new Date());
  const name = market === 'IN' ? 'India' : 'US';
  if (asOf >= today) return `${name} numbers are from today’s close (${fmtDay(asOf)}).`;
  const weekend = dow === 'Sat' || dow === 'Sun';
  return `${name} numbers are from the last close, ${fmtDay(asOf)}.${weekend ? '' : ` Today’s close loads after ${market === 'IN' ? '3:30 PM IST' : '4 PM ET (about 4:30 PM CT)'}.`}`;
}

const fmt = (v: number | null, d = 2) => (v === null ? '—' : v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }));
const sign = (v: number | null) => (v === null ? '' : v > 0 ? '+' : v < 0 ? '−' : '');

export default async function Home({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { m } = await searchParams;
  const market: Market = m === 'IN' || m === 'GLOBAL' ? m : 'US';
  const [snap, brief, board, briefs, briefIN, briefGL] = await Promise.all([getSnapshot(market), latestBrief('US'), getStocks(market), videos({ topic: 'daily-brief', limit: 1 }), latestBrief('IN'), latestBrief('GLOBAL')]);
  const [breadth, briefsList, regime, sentiment] = await Promise.all([getBreadth(market, board), policyBriefs(undefined, 3), market === 'GLOBAL' ? Promise.resolve(null) : getRegime(market), getSentiment()]);
  const journey = await memberJourney();
  const [today] = briefs;
  const thumb = today ? await briefThumb(today.id) : null;
  const closeNote = lastCloseNote(market, snap.asOf);
  const mapTitle = market === 'US' ? 'US industry map' : market === 'IN' ? 'India industry map (NSE)' : 'Global industry map';
  const fallbackBrief = market === 'US' && snap.sample
    ? 'Chip stocks pulled the Nasdaq down 0.9% after Nvidia’s CEO exit, while the Dow edged up. More stocks fell than rose.'
    : '[The agent brief appears here once this market’s data feed is connected.]';

  return (
    <>
      <Header active="Home" market={market} />
      <main className="wrap" id="main">
        <TopPromos />
        <section className="split" aria-label="Daily brief and agent brief">
          <BriefMini brief={today} thumb={thumb} />
          <section className="card tape-brief" aria-label="Tape agent brief">
            <div className="tag teal">Tape · agent brief</div>
            <p style={{ margin: 0 }}>{brief ?? fallbackBrief}</p>
            {briefIN && <p className="muted" style={{ margin: 0 }}>{briefIN}</p>}
            {briefGL && <p className="muted" style={{ margin: 0 }}>{briefGL}</p>}
            <Link href="/ask?q=Why%20did%20the%20market%20move%20today%3F" style={{ fontWeight: 600, marginTop: 'auto' }}>Why? Ask the agent →</Link>
          </section>
        </section>

        {closeNote && <p className="close-note">{closeNote}</p>}
        <section className="grid" aria-label="Indexes">
          {snap.indices.map((q) => (
            <article key={q.name} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><h2>{q.name}</h2><span className="mono dim" style={{ fontSize: 12 }}>{snap.asOf ? `close ${fmtDay(snap.asOf)}` : '—'}</span></div>
              <div className="big">{fmt(q.value)}</div>
              <div className={`mono ${q.change === null ? 'dim' : q.change >= 0 ? 'green' : 'red'}`} style={{ fontWeight: 600 }}>
                {q.change === null ? 'awaiting feed' : `${sign(q.change)}${fmt(Math.abs(q.change))} (${sign(q.changePct)}${fmt(Math.abs(q.changePct ?? 0))}%)`}
              </div>
              {q.why && <p className="muted" style={{ margin: 0, fontSize: 13 }}>{q.why}</p>}
            </article>
          ))}
        </section>

        <SentimentCard s={sentiment} />
        {market !== 'GLOBAL' && <RiskMeter r={regime} />}

        <Breadth bars={breadth} />

        <IndustryMap board={board} title={mapTitle} />

        <div className="cols">
          <div className="main">
            <StockTable board={board} currency={market === 'US' ? 'USD' : market === 'IN' ? 'INR' : 'local'} />
          </div>
          <aside className="side">
            <TopMovers board={board} />
            <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }} aria-label="World and policy">
              <h2>World &amp; policy</h2>
              {briefsList.map((b) => <Link key={b.id} href="/world" className="inset" style={{ display: 'block', color: 'var(--text)' }}><div className="tag gold">{b.tag}</div><div style={{ fontWeight: 600, margin: '4px 0' }}>{b.title}</div><div className="muted" style={{ fontSize: 12 }}>{b.money.slice(0, 110)}{b.money.length > 110 ? '…' : ''}</div></Link>)}
            </section>
          </aside>
        </div>
        <JourneyPath progress={journey} />

        <section className="fineprint" aria-label="Sources and explore">
          <div><b>Where the numbers come from:</b> {snap.source}{snap.sample ? ' (sample until the licensed feed is connected)' : ''}. Every agent answer is saved with its sources, model and confidence, and you can open the trail.</div>
          <div><b>Explore:</b> <Link href="/economy">Economy: what this week’s data means for your loans</Link> · <Link href="/world">World &amp; Policy: both sides, with sources</Link> · <Link href="/learn">Learn: lessons by age and stage</Link></div>
        </section>
        <Footer note={`Index data: ${snap.source} · Stocks: ${board.source}`} />
      </main>
    </>
  );
}
