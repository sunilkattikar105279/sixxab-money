import type { Metadata } from 'next';
import { Header, Footer } from '@/components/Header';
import { adminClient } from '@/lib/supabase/admin';
import { memberClient } from '@/lib/supabase/server';
import { GOALS, FOUNDING_SPOTS } from '@/lib/growth';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Growth', robots: { index: false } };

interface P { id: string; country: string; goal: string | null; status: string; created_at: string; founding_number: number | null; referred_by: string | null; email_updates: boolean | null }

export default async function Growth() {
  const sb = await memberClient();
  const user = sb ? (await sb.auth.getUser()).data.user : null;
  const db = adminClient();
  const isAdmin = !!(user && db && (await db.from('profiles').select('role').eq('id', user.id).single()).data?.role === 'admin');

  if (!isAdmin || !db) {
    return (<><Header active="" /><main className="wrap" id="main"><section className="card"><p className="muted" style={{ margin: 0 }}>Admins only.</p></section></main></>);
  }

  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const [{ data: profiles }, { data: asked }, { data: moods }] = await Promise.all([
    db.from('profiles').select('id, country, goal, status, created_at, founding_number, referred_by, email_updates').order('created_at', { ascending: true }),
    db.from('agent_ledger').select('member_id').not('member_id', 'is', null).gte('created_at', since),
    db.from('mood_checkins').select('member_id').gte('created_at', since),
  ]);
  const ps = (profiles ?? []) as P[];
  const engaged = new Set([...(asked ?? []).map((r) => r.member_id), ...(moods ?? []).map((r) => r.member_id)]);
  const members = ps.filter((p) => p.status !== 'closed');
  const founding = ps.filter((p) => p.founding_number).length;
  const active = members.filter((p) => engaged.has(p.id)).length;
  const pending = ps.filter((p) => p.status === 'pending_parent_consent').length;
  const referred = ps.filter((p) => p.referred_by).length;
  const optIn = ps.filter((p) => p.email_updates).length;

  // Sign-ups per day for the last 14 days.
  const days = Array.from({ length: 14 }, (_, i) => new Date(Date.now() - (13 - i) * 86_400_000).toISOString().slice(0, 10));
  const perDay = days.map((d) => ({ d, n: ps.filter((p) => p.created_at.slice(0, 10) === d).length }));
  const maxDay = Math.max(1, ...perDay.map((x) => x.n));

  const count = (f: (p: P) => boolean) => members.filter(f).length;
  const topReferrers = Object.entries(ps.reduce<Record<string, number>>((m, p) => { if (p.referred_by) m[p.referred_by] = (m[p.referred_by] ?? 0) + 1; return m; }, {}))
    .sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([id, n]) => ({ n, num: ps.find((p) => p.id === id)?.founding_number }));

  const Stat = ({ label, value, note }: { label: string; value: string | number; note?: string }) => (
    <div className="card"><div className="tag dim">{label}</div><div className="big">{value}</div>{note && <div className="muted" style={{ fontSize: 12 }}>{note}</div>}</div>
  );

  return (
    <>
      <Header active="" />
      <main className="wrap" id="main">
        <section className="bar"><span className="tag gold">Founding launch</span><span style={{ flex: '1 1 420px' }}>Goal: {FOUNDING_SPOTS} free founding members who use SIXXAB Money every month.</span></section>
        <div className="prog" aria-label={`${founding} of ${FOUNDING_SPOTS} founding spots`}><div style={{ width: `${Math.min(100, founding)}%`, background: 'var(--gold)' }} /></div>
        <div className="grid">
          <Stat label="Members" value={members.length} note={`${founding} of ${FOUNDING_SPOTS} founding spots taken`} />
          <Stat label="Active (30 days)" value={members.length ? `${Math.round((active / members.length) * 100)}%` : '—'} note={`${active} asked the coach or checked in`} />
          <Stat label="From referrals" value={referred} note={`${members.length ? Math.round((referred / members.length) * 100) : 0}% of members`} />
          <Stat label="Weekly email opt-in" value={optIn} />
          <Stat label="Waiting for a parent" value={pending} note="Under-18 sign-ups not yet linked" />
        </div>
        <div className="cols">
          <section className="card main" aria-label="Sign-ups per day">
            <h2 style={{ marginBottom: 12 }}>Sign-ups, last 14 days</h2>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 140 }}>
              {perDay.map((x) => (
                <div key={x.d} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }} title={`${x.d}: ${x.n}`}>
                  <span className="mono dim" style={{ fontSize: 11 }}>{x.n || ''}</span>
                  <div style={{ width: '100%', height: `${(x.n / maxDay) * 100}px`, minHeight: 2, background: 'var(--teal)', borderRadius: 4 }} />
                  <span className="dim" style={{ fontSize: 10 }}>{x.d.slice(8)}</span>
                </div>
              ))}
            </div>
          </section>
          <aside className="side">
            <section className="card"><h2 style={{ marginBottom: 8 }}>By country</h2>
              <table><tbody><tr><td>United States</td><td className="mono">{count((p) => p.country === 'US')}</td></tr><tr><td>India</td><td className="mono">{count((p) => p.country === 'IN')}</td></tr></tbody></table>
            </section>
            <section className="card"><h2 style={{ marginBottom: 8 }}>By first goal</h2>
              <table><tbody>{GOALS.map((g) => <tr key={g.id}><td>{g.label}</td><td className="mono">{count((p) => p.goal === g.id)}</td></tr>)}<tr><td className="dim">Not chosen</td><td className="mono">{count((p) => !p.goal)}</td></tr></tbody></table>
            </section>
            <section className="card"><h2 style={{ marginBottom: 8 }}>Top referrers</h2>
              {topReferrers.length ? <table><tbody>{topReferrers.map((r, i) => <tr key={i}><td>{r.num ? `Founding #${r.num}` : 'Member'}</td><td className="mono">{r.n}</td></tr>)}</tbody></table> : <p className="muted" style={{ margin: 0 }}>No referrals yet.</p>}
            </section>
          </aside>
        </div>
        <Footer note="Totals only · no personal details shown" />
      </main>
    </>
  );
}
