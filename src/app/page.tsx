import Link from 'next/link';
import { Header, Footer } from '@/components/Header';
import { getSnapshot, type IndexQuote } from '@/lib/data/market';
import { videos, PROMOS } from '@/lib/media';
import { JoinHero } from '@/components/JoinHero';
import { getRegime } from '@/lib/data/regime';
import { getRotation } from '@/lib/data/rotation';
import { getMember } from '@/lib/member';
import { stageOf } from '@/lib/sixs';
import type { RegimeRead } from '@/lib/regime';

export const revalidate = 300;

const fmt = (v: number | null, d = 2) => (v === null ? '—' : v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }));
const ZONE_COLOR: Record<string, string> = { calm: 'var(--green)', normal: 'var(--teal)', elevated: 'var(--gold)', panic: 'var(--red)' };

/** Signed-in members get a short "continue" card instead of the founding-member offer. */
async function CoachCard() {
  const m = await getMember();
  if (!m?.member) return <JoinHero />;
  const s = stageOf(m.member.stage);
  return (
    <section className="card hero" aria-label="Your coach">
      <div className="hero-copy">
        <div className="tag gold">Mentor · Your personal money coach</div>
        <h1>Welcome back{m.member.name ? `, ${m.member.name.split(' ')[0]}` : ''}</h1>
        <p className="muted">You’re at Stage {s.n} · {s.name}: {s.focus}. Your next step and this week’s lesson are waiting.</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <Link href="/my-money/journey" className="btn">Continue my journey</Link>
          <Link href="/ask" className="btn btn-line">Ask Mentor</Link>
        </div>
      </div>
    </section>
  );
}

function PromoCard({ agent, role, title, points, href, cta, preview, video }: { agent: string; role: string; title: string; points: string[]; href: string; cta: string; preview: React.ReactNode; video?: string }) {
  return (
    <article className="card promo-card">
      <div className="tag teal">{agent} · {role}</div>
      <h2 style={{ margin: 0 }}>{title}</h2>
      <ul className="hero-points" style={{ fontSize: 14 }}>{points.map((p) => <li key={p}>{p}</li>)}</ul>
      <div className="promo-preview">{preview}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 'auto' }}>
        <Link href={href} className="btn">{cta}</Link>
        {video && <a href={video} target="_blank" rel="noopener noreferrer" className="btn btn-line">▶ Watch the 30-second tour</a>}
      </div>
    </article>
  );
}

function IndexRow({ q }: { q: IndexQuote }) {
  const up = (q.changePct ?? 0) >= 0;
  return (
    <div className="idx-row">
      <span>{q.name}</span>
      <span className="mono">{fmt(q.value)}</span>
      <span className={`mono ${q.changePct === null ? 'dim' : up ? 'green' : 'red'}`}>{q.changePct === null ? '—' : `${up ? '+' : '−'}${fmt(Math.abs(q.changePct))}%`}</span>
    </div>
  );
}

function Gauge({ r, label }: { r: RegimeRead | null; label: string }) {
  if (!r) return <div className="gauge"><div className="dim" style={{ fontSize: 12 }}>{label}</div><div className="dim">After tonight’s update</div></div>;
  return (
    <div className="gauge">
      <div className="dim" style={{ fontSize: 12 }}>{label}</div>
      <div><span style={{ font: '700 26px var(--head)', color: ZONE_COLOR[r.zone] }}>{r.level.toFixed(1)}</span> <span style={{ color: ZONE_COLOR[r.zone], fontWeight: 600, textTransform: 'capitalize' }}>{r.zone}</span></div>
      <div className="dim" style={{ fontSize: 12 }}>{r.change5dPct >= 0 ? '+' : ''}{r.change5dPct}% in 5 days{r.breadth ? ` · ${r.breadth.pctAbove200}% of stocks above 200-day` : ''}</div>
    </div>
  );
}

export default async function Home() {
  const [us, ind, rUS, rIN, rot, [brief]] = await Promise.all([
    getSnapshot('US'), getSnapshot('IN'), getRegime('US'), getRegime('IN'), getRotation('US'), videos({ topic: 'daily-brief', limit: 1 }),
  ]);
  const promo = (id: string) => PROMOS.find((p) => p.id === id)?.url;
  const leaders = (rot?.sectors ?? []).filter((s) => s.quadrant === 'leading').slice(0, 3);
  const improving = (rot?.sectors ?? []).filter((s) => s.quadrant === 'improving').slice(0, 2);

  return (
    <>
      <Header active="Home" />
      <main className="wrap" id="main">
        {/* 1. Personal finance coach */}
        <CoachCard />

        {/* 2 + 3. Agent promos */}
        <section className="promo-grid" aria-label="Meet the agents">
          <PromoCard
            agent="Quant" role="Screener" title="Find stocks worth a closer look, every night"
            points={['Scores US and India stocks on trend, business strength and risk', 'Plain-English reasons for every pick, with sources', 'Earnings and insider-trade alerts built in']}
            href="/screener" cta="Open the Quant screener" video={promo('quant')}
            preview={<div className="mini-rows">{['Trend', 'Business strength', 'Market regime'].map((f, i) => <div key={f}><span>{f}</span><span className="bar-mini"><span style={{ width: `${[78, 64, 46][i]}%` }} /></span></div>)}<div className="dim" style={{ fontSize: 11 }}>How each stock is scored</div></div>}
          />
          <PromoCard
            agent="Delta" role="Money-move manager" title="See where the money is moving"
            points={['Tracks 11 US sectors and 10 Nifty sectors against the index', 'Shows which are leading, improving, weakening or lagging', 'Reads the market cycle with Wyckoff and Elliott']}
            href="/sectors" cta="See sector rotation" video={promo('delta')}
            preview={<div className="mini-rows">{rot ? <>
              <div className="dim" style={{ fontSize: 11 }}>US cycle: {rot.indexPhase}</div>
              {leaders.map((s) => <div key={s.key}><span>{s.name}</span><span className="green mono">Leading</span></div>)}
              {improving.map((s) => <div key={s.key}><span>{s.name}</span><span className="mono" style={{ color: 'var(--teal)' }}>Improving</span></div>)}
            </> : <div className="dim">Sector read appears after tonight’s update.</div>}</div>}
          />
        </section>

        {/* 4. All-market summary + VIX */}
        <section className="card" aria-label="Market summary">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            <h2 style={{ margin: 0 }}>Markets today</h2>
            <span className="dim" style={{ fontSize: 12 }}>Tape · Sigma{us.asOf ? ` · US ${us.asOf}` : ''}{ind.asOf ? ` · India ${ind.asOf}` : ''}</span>
          </div>
          <div className="market-grid">
            <div><div className="tag gold" style={{ marginBottom: 6 }}>United States</div>{us.indices.map((q) => <IndexRow key={q.name} q={q} />)}</div>
            <div><div className="tag gold" style={{ marginBottom: 6 }}>India</div>{ind.indices.filter((q) => q.name !== 'India VIX').map((q) => <IndexRow key={q.name} q={q} />)}</div>
            <div style={{ display: 'grid', gap: 10 }}><Gauge r={rUS} label="US fear gauge (VIX)" /><Gauge r={rIN} label="India VIX" /></div>
          </div>
          <div style={{ marginTop: 10, display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 13 }}>
            <Link href="/maps">Industry maps →</Link><Link href="/levels">Pivot levels →</Link><Link href="/economy">Economy →</Link>
          </div>
        </section>

        {/* 5. Daily brief: small card + link only */}
        {brief && (
          <a href={brief.url} target="_blank" rel="noopener noreferrer" className="card brief-mini" aria-label={`Watch today's daily brief: ${brief.title}`}>
            <div className="brief-thumb" aria-hidden="true"><span className="play">▶</span><span className="thumb-tag">DAILY BRIEF</span></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
              <div className="tag teal">Today’s daily brief · {brief.date} · about 1 min</div>
              <div style={{ font: '700 17px var(--head)', color: '#fff' }}>{brief.title.replace(/^Daily brief:\s*/, '')}</div>
              <div className="muted" style={{ fontSize: 13 }}>Watch on Instagram →</div>
            </div>
          </a>
        )}

        <Footer note="Education, not investment advice · US index data: Alpaca (IEX) · India: delayed NSE data" />
      </main>
    </>
  );
}
