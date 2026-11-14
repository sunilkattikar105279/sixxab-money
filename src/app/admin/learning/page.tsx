import { Header, Footer } from '@/components/Header';
import { adminClient } from '@/lib/supabase/admin';
import { memberClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const ORDER = ['proposed', 'evaluated', 'shadow', 'canary', 'approved', 'live'];

export default async function LearningAdmin() {
  const sb = await memberClient();
  const user = sb ? (await sb.auth.getUser()).data.user : null;
  const db = adminClient();
  const isAdmin = !!(user && db && (await db.from('profiles').select('role').eq('id', user.id).single()).data?.role === 'admin');
  const { data: rows } = isAdmin && db ? await db.from('learning_proposals').select('id, agent, summary, stage, touches, approvers, created_at').order('created_at', { ascending: false }).limit(50) : { data: null };

  return (
    <>
      <Header active="" />
      <main className="wrap">
        <section className="bar"><span className="tag gold">Learning governance</span><span style={{ flex: '1 1 480px' }}>Agents learn from feedback, but every change is a proposal: evaluated, then shadow, then canary, then human approval, then live. Rollback is one step.</span></section>
        <div className="grid">{ORDER.map((s, i) => <div key={s} className="card"><div className="tag teal">Gate {i + 1}</div><h2 style={{ textTransform: 'capitalize' }}>{s}</h2></div>)}</div>
        <section className="card scroll">
          {!isAdmin ? <p className="muted" style={{ margin: 0 }}>Admins only. Sign in with an admin account to review proposals.</p> : (
            <table>
              <thead><tr><th>Agent</th><th>Change</th><th>Stage</th><th>Touches</th><th>Approvers</th></tr></thead>
              <tbody>{(rows ?? []).map((r) => <tr key={r.id}><td>{r.agent}</td><td>{r.summary}</td><td className="gold">{r.stage}</td><td>{(r.touches ?? []).join(', ')}</td><td>{(r.approvers ?? []).join(', ')}</td></tr>)}</tbody>
            </table>
          )}
        </section>
        <Footer note="Changes touching minors, advice limits, politics or emotions need two human approvers" />
      </main>
    </>
  );
}
