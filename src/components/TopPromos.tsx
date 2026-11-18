import Link from 'next/link';
import { getMember } from '@/lib/member';
import { stageOf } from '@/lib/sixs';
import { foundingStats } from '@/lib/growth-server';
import { FOUNDING_SPOTS } from '@/lib/growth';
import { getRotation } from '@/lib/data/rotation';
import { PROMOS, type Video, type Promo } from '@/lib/media';
import { JoinButton } from './JoinButton';

function Card({ tag, title, points, children, actions, video, gold }: { tag: string; title: string; points: string[]; children?: React.ReactNode; actions: React.ReactNode; video?: Promo; gold?: boolean }) {
  return (
    <article className={`card promo-card${gold ? ' promo-gold' : ''}`}>
      <div className={`tag ${gold ? 'gold' : 'teal'} promo-tag`}>{tag}</div>
      <h2 className="promo-title">{title}</h2>
      <ul className="hero-points" style={{ fontSize: 14 }}>{points.map((p) => <li key={p}>{p}</li>)}</ul>
      <div className="promo-body">
        {video && <video className="promo-video" src={video.url} poster={video.poster} controls autoPlay muted loop playsInline preload="metadata" aria-label={video.title} />}
        {children && <div className="promo-preview">{children}</div>}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 'auto' }}>{actions}</div>
    </article>
  );
}

/** The three headline promos: personal money coach, Quant screener, Delta money-move manager. */
export async function TopPromos() {
  const [m, stats, rot] = await Promise.all([getMember(), foundingStats(), getRotation('US')]);
  const promo = (id: Promo['id']) => PROMOS.find((p) => p.id === id);
  const member = m?.member ?? null;
  const left = stats?.left ?? FOUNDING_SPOTS;
  const leaders = (rot?.sectors ?? []).filter((s) => s.quadrant === 'leading').slice(0, 2);
  const improving = (rot?.sectors ?? []).filter((s) => s.quadrant === 'improving').slice(0, 1);

  return (
    <section className="promo-grid promo-top" aria-label="SIXXAB Money agents">
      {member ? (
        <Card gold tag="Mentor · Money coach" title={`Welcome back${member.name ? `, ${member.name.split(' ')[0]}` : ''}`}
          points={[`Stage ${member.stage} · ${stageOf(member.stage).name}: ${stageOf(member.stage).focus}`, 'This week’s lesson and your next money move', 'Ask your coach anything, with sources']}
          actions={<><Link href="/my-money/journey" className="btn btn-gold">Continue my journey</Link><Link href="/ask" className="btn btn-line">Ask Mentor</Link></>} video={promo('coach')}>
        <div className="mini-rows">{['Startup', 'Struggle', 'Scale', 'Success', 'Significance', 'SIXXAB'].map((n, i) => <div key={n}><span>{i + 1} · {n}</span><span className="mono dim" style={{ fontSize: 11 }}>{member && member.stage === i + 1 ? 'You are here' : ''}</span></div>)}</div>
      </Card>
      ) : (
        <Card gold tag="Mentor · Money coach" title="Your personal money coach"
          points={['A 90-day plan built around your goal', 'A 6-stage journey from age 11 to legacy', left > 0 ? `${left} of ${FOUNDING_SPOTS} free founding spots left` : 'Private: no ads, data never sold']}
          actions={<><JoinButton label={left > 0 ? 'Claim my free spot' : 'Join free'} /><Link href="/ask?q=How%20do%20I%20start%20an%20emergency%20fund%3F" className="btn btn-line">Try Mentor</Link></>} video={promo('coach')}>
        <div className="mini-rows">{['Startup', 'Struggle', 'Scale', 'Success', 'Significance', 'SIXXAB'].map((n, i) => <div key={n}><span>{i + 1} · {n}</span><span className="mono dim" style={{ fontSize: 11 }}>{member && member.stage === i + 1 ? 'You are here' : ''}</span></div>)}</div>
      </Card>
      )}
      <Card tag="Quant · Screener" title="Stocks worth a closer look"
        points={['Scores US and India stocks every night', 'Plain-English reasons, with sources', 'Earnings and insider-trade alerts']}
        actions={<Link href="/screener" className="btn">Open the screener</Link>} video={promo('quant')}>
        <div className="mini-rows">{['Trend', 'Business strength', 'Market regime'].map((f, i) => <div key={f}><span>{f}</span><span className="bar-mini"><span style={{ width: `${[78, 64, 46][i]}%` }} /></span></div>)}</div>
      </Card>
      <Card tag="Delta · Money-move manager" title="Where the money is moving"
        points={['11 US and 10 Nifty sectors vs the index', 'Leading, improving or lagging', 'Market cycle: Wyckoff and Elliott']}
        actions={<Link href="/sectors" className="btn">See sector rotation</Link>} video={promo('delta')}>
        <div className="mini-rows">{rot ? <>
          <div className="dim" style={{ fontSize: 11 }}>US cycle: {rot.indexPhase}</div>
          {leaders.map((s) => <div key={s.key}><span>{s.name}</span><span className="green mono">Leading</span></div>)}
          {improving.map((s) => <div key={s.key}><span>{s.name}</span><span className="mono" style={{ color: 'var(--teal)' }}>Improving</span></div>)}
        </> : <div className="dim">Sector read appears after tonight’s update.</div>}</div>
      </Card>
    </section>
  );
}

/** Today's daily brief as one small card that links to the reel (no embed). */
export function BriefMini({ brief }: { brief?: Video }) {
  if (!brief) return null;
  return (
    <a href={brief.url} target="_blank" rel="noopener noreferrer" className="card brief-mini" aria-label={`Watch today's daily brief: ${brief.title}`}>
      <div className="brief-thumb" aria-hidden="true"><span className="play">▶</span><span className="thumb-tag">DAILY BRIEF</span></div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
        <div className="tag teal">Today’s daily brief · {brief.date} · about 1 min</div>
        <div style={{ font: '700 16px var(--head)', color: '#fff' }}>{brief.title.replace(/^Daily brief:\s*/, '')}</div>
        <div className="muted" style={{ fontSize: 13 }}>Watch on Instagram →</div>
      </div>
    </a>
  );
}
