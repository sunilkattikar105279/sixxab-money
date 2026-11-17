import Link from 'next/link';
import { memberClient } from '@/lib/supabase/server';
import { foundingStats } from '@/lib/growth-server';
import { FOUNDING_SPOTS } from '@/lib/growth';
import { JoinButton } from './JoinButton';

/** Founding-member offer for visitors who are not signed in. Hidden for members. */
export async function JoinHero() {
  const sb = await memberClient();
  const user = sb ? (await sb.auth.getUser()).data.user : null;
  if (user) return null;
  const stats = await foundingStats();
  const left = stats?.left ?? FOUNDING_SPOTS;
  const taken = FOUNDING_SPOTS - left;

  return (
    <section className="card hero" aria-labelledby="join-title">
      <div className="hero-copy">
        <div className="tag gold">{left > 0 ? `Founding members · ${left} of ${FOUNDING_SPOTS} free spots left` : 'Now open to everyone'}</div>
        <h1 id="join-title">Your personal money coach for the US and India</h1>
        <p className="muted">Plain-English market briefs, a 90-day plan built around your goal, and a coach that helps when money feels stressful. For ages 11 and up, with parents in the loop.</p>
        <ul className="hero-points">
          <li>Ask anything about money and get an answer with sources</li>
          <li>A 6-stage journey from first savings to financial independence</li>
          <li>Private by design: your data is never sold and there are no ads</li>
        </ul>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <JoinButton label={left > 0 ? 'Claim my free founding spot' : 'Join free'} />
          <Link href="/ask?q=How%20do%20I%20start%20an%20emergency%20fund%3F" className="btn btn-line">Try Mentor first</Link>
        </div>
        <p className="dim" style={{ margin: 0, fontSize: 12 }}>Free, no card. Founding members keep free access for good. Education, not investment advice.</p>
      </div>
      {left > 0 && (
        <div className="hero-meter" aria-label={`${taken} of ${FOUNDING_SPOTS} founding spots taken`}>
          <div className="big">{taken}<span className="dim" style={{ fontSize: 16 }}> / {FOUNDING_SPOTS}</span></div>
          <div className="dim">founding members joined</div>
          <div className="prog" style={{ marginTop: 8 }}><div style={{ width: `${Math.max(3, taken)}%`, background: 'var(--gold)' }} /></div>
        </div>
      )}
    </section>
  );
}
