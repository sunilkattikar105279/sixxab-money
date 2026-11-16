export const dynamic = 'force-dynamic';
import { Header, Footer } from '@/components/Header';
import { AgentAsk } from '@/components/AgentAsk';
import { MoodCheckin } from '@/components/MoodCheckin';
import { STAGES, stageOf, netWorthProgress, formatMoney, type Country } from '@/lib/sixs';
import { memberClient } from '@/lib/supabase/server';
import { VideoRail } from '@/components/VideoRail';
import { StageIcon } from '@/components/StageIcon';
import { videos } from '@/lib/media';
import { PlanList } from '@/components/PlanList';
import { ageOn } from '@/lib/sixs';
import { redirect } from 'next/navigation';
import { adminClient } from '@/lib/supabase/admin';
import { GetStarted, type Starter } from '@/components/GetStarted';
import { JoinButton } from '@/components/JoinButton';

interface View { sample: boolean; stage: number; country: Country; netWorth: number; habitMonths: number; goals: { goal: string; how: string; done: boolean }[]; children: { name: string; age: number; stage: number }[]; me?: Starter }

const SAMPLE: View = {
  sample: true, stage: 3, country: 'US', netWorth: 6200, habitMonths: 2,
  goals: [
    { goal: 'Reach 6 months of costs saved', how: 'Auto-move a set amount to savings on payday', done: true },
    { goal: 'Clear the credit-card balance', how: 'Pay the highest-interest card first', done: false },
    { goal: 'Invest every month for 3 months', how: 'A broad index fund, a fixed date each month', done: false },
  ],
  children: [{ name: 'Teen account', age: 14, stage: 1 }, { name: 'Child account', age: 11, stage: 1 }],
};

async function load(): Promise<View> {
  const sb = await memberClient();
  if (!sb) return SAMPLE;
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return SAMPLE;
  const [{ data: p }, { data: checks }, { data: plan }, { count: asked }, { count: checkins }] = await Promise.all([
    sb.from('profiles').select('*').eq('id', user.id).maybeSingle(), // '*' keeps working before migration 0007 adds the founding columns
    sb.from('monthly_checks').select('month, habit_gate_met, net_worth').eq('member_id', user.id).order('month', { ascending: false }).limit(3),
    sb.from('plans').select('goals').eq('member_id', user.id).eq('active', true).maybeSingle(),
    sb.from('agent_ledger').select('id', { count: 'exact', head: true }).eq('member_id', user.id),
    sb.from('mood_checkins').select('id', { count: 'exact', head: true }).eq('member_id', user.id),
  ]);
  if (!p) redirect('/onboarding');
  const db = adminClient();
  const invited = db ? (await db.from('profiles').select('id', { count: 'exact', head: true }).eq('referred_by', user.id)).count ?? 0 : 0;
  const goals = (plan?.goals as View['goals']) ?? [];
  const { data: links } = await sb.from('family_links').select('child_id').eq('parent_id', user.id);
  const kids = links?.length ? (await sb.from('profiles').select('full_name, dob, stage').in('id', links.map((l) => l.child_id))).data ?? [] : [];
  return {
    children: kids.map((k) => ({ name: k.full_name || 'Child account', age: ageOn(k.dob), stage: k.stage })),
    sample: false, stage: p.stage, country: p.country === 'IN' ? 'IN' : 'US',
    netWorth: Number(checks?.[0]?.net_worth ?? 0), habitMonths: (checks ?? []).filter((c) => c.habit_gate_met).length,
    goals,
    me: { founding: p.founding_number ?? null, code: p.referral_code ?? '', asked: asked ?? 0, checkins: checkins ?? 0, goalsDone: goals.filter((g) => g.done).length, goals: goals.length, invited },
  };
}

export default async function MyMoney() {
  const v = await load();
  const s = stageOf(v.stage);
  const nw = netWorthProgress(s, v.netWorth, v.country);
  const clips = await videos({ stage: s.n, limit: 6 });
  return (
    <>
      <Header active="My Money" />
      <main className="wrap" id="main">
        {v.sample && (
          <section className="bar" aria-label="Join">
            <span className="tag gold">Sample dashboard</span>
            <span style={{ flex: '1 1 420px' }}>This is what your dashboard looks like. Join free to get your own stage, 90-day plan and coach.</span>
            <JoinButton label="Join free" from="my_money_sample" />
          </section>
        )}
        {v.me && <GetStarted me={v.me} />}
        <section className="card" style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'center' }}>
          <div style={{ flex: '1 1 320px' }}>
            <StageIcon n={s.n} size={48} />
            <div className="tag gold">{v.sample ? 'Sample member · ' : ''}Stage {s.n} of 6</div>
            <h1 style={{ fontSize: 32, margin: '6px 0' }}>{s.name}</h1>
            <p className="muted" style={{ margin: 0 }}>{s.focus}</p>
          </div>
          <div style={{ flex: '1 1 420px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Gate name="Habit gate" label={`${v.habitMonths} of 3 months · ${s.habitGate}`} pct={v.habitMonths / 3} />
            {s.netWorthGate && <Gate name="Net-worth gate" label={`${formatMoney(v.netWorth, v.country)} of ${formatMoney(s.netWorthGate[v.country], v.country)}`} pct={nw} />}
          </div>
        </section>
        <div className="cols">
          <div className="main">
            <section className="card">
              <h2 style={{ marginBottom: 12 }}>90-day plan</h2>
              <PlanList initial={v.goals} canSave={!v.sample} />
            </section>
            <VideoRail title={`Videos for the ${s.name} stage`} items={clips} />
            <section className="card" aria-label="Monthly budget">
              <h2 style={{ marginBottom: 12 }}>A starting budget split</h2>
              <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
                {[['Needs', '50%', 'rent, food, bills'], ['Wants', '25%', 'fun, eating out'], ['Save', '15%', 'emergency fund'], ['Invest', '10%', 'index fund']].map(([n, p, d]) => <div key={n} className="inset"><div className="tag dim">{n}</div><div style={{ font: '600 20px var(--mono)', color: '#fff' }}>{p}</div><div className="muted" style={{ fontSize: 12 }}>{d}</div></div>)}
              </div>
              <p className="dim" style={{ margin: '8px 0 0', fontSize: 12 }}>A common starting point; your coach adjusts it to your stage and income.</p>
            </section>
            <section className="card">
              <h2 style={{ marginBottom: 12 }}>All six stages</h2>
              <ol className="stages">
                {STAGES.map((x) => <li key={x.key} className={x.n === s.n ? 'now' : ''}><div className="tag gold">Stage {x.n}</div><div style={{ font: '700 15px var(--head)', color: '#fff', margin: '4px 0' }}>{x.name}</div><div className="muted" style={{ fontSize: 12 }}>{x.habitGate}</div></li>)}
              </ol>
            </section>
          </div>
          <aside className="side">
            <MoodCheckin />
            <AgentAsk title="Your coach" suggestions={['Should I pay off my card or invest first?', 'How do I start an emergency fund?']} />
            <section className="card" aria-label="Family">
              <h2 style={{ marginBottom: 8 }}>Family</h2>
              {v.children.length ? v.children.map((k) => <div key={k.name + k.age} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderTop: '1px solid var(--line)' }}><span>{k.name} · age {k.age}</span><span className="teal">Stage {k.stage}</span></div>) : <p className="muted" style={{ margin: 0 }}>No linked children yet.</p>}
              <p className="dim" style={{ margin: '8px 0 0', fontSize: 12 }}>Parent-linked accounts for ages 11 to 17: lessons and savings goals only, no trading, no ads.</p>
            </section>
            <section className="card" aria-label="Linked accounts"><h2 style={{ marginBottom: 8 }}>Linked accounts</h2><p className="muted" style={{ margin: 0 }}>Read-only links to your bank and investment accounts are coming in release 2. SIXXAB Money never holds or moves money.</p></section>
          </aside>
        </div>
        <Footer note={v.sample ? 'Sample member data · sign in to see your own plan' : 'Your data is private, exportable and never sold'} />
      </main>
    </>
  );
}

function Gate({ name, label, pct }: { name: string; label: string; pct: number }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6, gap: 8 }}><span>{name}</span><span className="mono muted">{label}</span></div>
      <div className="prog"><div style={{ width: `${Math.round(pct * 100)}%`, background: pct >= 1 ? 'var(--teal)' : 'var(--gold)' }} /></div>
    </div>
  );
}
