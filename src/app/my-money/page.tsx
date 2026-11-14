export const dynamic = 'force-dynamic';
import { Header, Footer } from '@/components/Header';
import { AgentAsk } from '@/components/AgentAsk';
import { MoodCheckin } from '@/components/MoodCheckin';
import { STAGES, stageOf, netWorthProgress, formatMoney, type Country } from '@/lib/sixs';
import { memberClient } from '@/lib/supabase/server';
import { VideoRail } from '@/components/VideoRail';
import { StageIcon } from '@/components/StageIcon';
import { videos } from '@/lib/media';

interface View { sample: boolean; stage: number; country: Country; netWorth: number; habitMonths: number; goals: { goal: string; how: string; done: boolean }[] }

const SAMPLE: View = {
  sample: true, stage: 3, country: 'US', netWorth: 6200, habitMonths: 2,
  goals: [
    { goal: 'Reach 6 months of costs saved', how: 'Auto-move a set amount to savings on payday', done: true },
    { goal: 'Clear the credit-card balance', how: 'Pay the highest-interest card first', done: false },
    { goal: 'Invest every month for 3 months', how: 'A broad index fund, a fixed date each month', done: false },
  ],
};

async function load(): Promise<View> {
  const sb = await memberClient();
  if (!sb) return SAMPLE;
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return SAMPLE;
  const [{ data: p }, { data: checks }, { data: plan }] = await Promise.all([
    sb.from('profiles').select('stage, country').eq('id', user.id).single(),
    sb.from('monthly_checks').select('month, habit_gate_met, net_worth').eq('member_id', user.id).order('month', { ascending: false }).limit(3),
    sb.from('plans').select('goals').eq('member_id', user.id).eq('active', true).maybeSingle(),
  ]);
  if (!p) return SAMPLE;
  return {
    sample: false, stage: p.stage, country: p.country === 'IN' ? 'IN' : 'US',
    netWorth: Number(checks?.[0]?.net_worth ?? 0), habitMonths: (checks ?? []).filter((c) => c.habit_gate_met).length,
    goals: (plan?.goals as View['goals']) ?? [],
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
      <main className="wrap">
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
              {v.goals.length ? (
                <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {v.goals.map((g) => (
                    <li key={g.goal} className="inset" style={{ display: 'flex', gap: 12 }}>
                      <span aria-hidden="true" className={g.done ? 'teal' : 'dim'} style={{ fontWeight: 800 }}>{g.done ? '✓' : '○'}</span>
                      <div><div style={{ fontWeight: 600, color: '#fff' }}>{g.goal}</div><div className="muted" style={{ fontSize: 13 }}>{g.how}</div></div>
                    </li>
                  ))}
                </ol>
              ) : <p className="muted">Your coach drafts a plan after your first check-in.</p>}
            </section>
            <VideoRail title={`Videos for the ${s.name} stage`} items={clips} />
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
            <section className="card"><h2 style={{ marginBottom: 8 }}>Family</h2><p className="muted" style={{ margin: 0 }}>Parent-linked accounts for ages 11 to 17: lessons and savings goals only, no trading, no ads.</p></section>
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
