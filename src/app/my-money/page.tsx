import Link from 'next/link';
import { getMember } from '@/lib/member';
import { adminClient } from '@/lib/supabase/admin';
import { stageOf, netWorthProgress, formatMoney } from '@/lib/sixs';
import { normalizeMoney, netWorth, budgetView, emergencyView } from '@/lib/money';
import { StageIcon } from '@/components/StageIcon';
import { MoodCheckin } from '@/components/MoodCheckin';
import { AgentAsk } from '@/components/AgentAsk';
import { GetStarted } from '@/components/GetStarted';
import { Sparkline } from '@/components/Sparkline';
import { ageOn } from '@/lib/sixs';

export default async function Dashboard() {
  const m = (await getMember())!;
  const me = m.member!;
  const sb = m.sb;
  const [{ data: checks }, { data: plan }, { count: asked }, { count: checkins }, { data: money }, { data: acct }, { count: open }, { data: links }] = await Promise.all([
    sb.from('monthly_checks').select('month, habit_gate_met, net_worth').eq('member_id', me.id).order('month', { ascending: false }).limit(3),
    sb.from('plans').select('goals').eq('member_id', me.id).eq('active', true).maybeSingle(),
    sb.from('agent_ledger').select('id', { count: 'exact', head: true }).eq('member_id', me.id),
    sb.from('mood_checkins').select('id', { count: 'exact', head: true }).eq('member_id', me.id),
    sb.from('member_money').select('data').eq('member_id', me.id).maybeSingle(),
    sb.from('paper_accounts').select('equity, starting_cash, currency, equity_history, paused_until').eq('member_id', me.id).maybeSingle(),
    sb.from('paper_trades').select('id', { count: 'exact', head: true }).eq('member_id', me.id).eq('status', 'open'),
    sb.from('family_links').select('child_id').eq('parent_id', me.id),
  ]);
  const db = adminClient();
  const invited = db ? (await db.from('profiles').select('id', { count: 'exact', head: true }).eq('referred_by', me.id)).count ?? 0 : 0;
  const kids = links?.length ? (await sb.from('profiles').select('full_name, dob, stage').in('id', links.map((l) => l.child_id))).data ?? [] : [];

  const goals = (plan?.goals as { goal: string; how: string; done: boolean }[] | null) ?? [];
  const s = stageOf(me.stage);
  const d = normalizeMoney(money?.data);
  const nw = netWorth(d), bv = budgetView(d), ev = emergencyView(d);
  const hasMoney = d.budget.income > 0 || d.assets.length > 0 || d.debts.length > 0;
  const lastCheck = checks?.[0];
  const habitMonths = (checks ?? []).filter((c) => c.habit_gate_met).length;
  const checkedThisMonth = lastCheck?.month?.slice(0, 7) === new Date().toISOString().slice(0, 7);
  const fmt = (v: number) => formatMoney(v, me.country);
  const ret = acct ? ((Number(acct.equity) - Number(acct.starting_cash)) / Number(acct.starting_cash)) * 100 : 0;
  const nextGoal = goals.find((g) => !g.done);

  return (
    <main className="wrap" id="main">
      <section className="bar" aria-label="Welcome">
        <span className="tag gold">{me.foundingNumber ? `Founding member #${me.foundingNumber}` : 'Member'}</span>
        <span style={{ flex: '1 1 420px' }}>
          Welcome back{me.name ? `, ${me.name.split(' ')[0]}` : ''}. {nextGoal ? <>Your next step: <b>{nextGoal.goal}</b>.</> : 'Pick your next goal in your Journey.'}
        </span>
        {!checkedThisMonth && <Link href="/my-money/journey#checkin" className="btn btn-gold">Do this month’s check-in</Link>}
      </section>

      <GetStarted me={{ founding: me.foundingNumber, code: me.referralCode ?? '', asked: asked ?? 0, checkins: checkins ?? 0, goalsDone: goals.filter((g) => g.done).length, goals: goals.length, invited }} />

      <section className="grid hub" aria-label="Your money at a glance">
        <Link href="/my-money/journey" className="card hub-card">
          <div className="hub-head"><StageIcon n={s.n} size={36} /><span className="tag gold">Journey · Stage {s.n} of 6</span></div>
          <h2>{s.name}</h2>
          <p className="muted">{s.focus}</p>
          <Meter label="Habit gate" value={`${habitMonths} of 3 months`} pct={habitMonths / 3} />
          {s.netWorthGate && <Meter label="Net-worth gate" value={`${fmt(Number(lastCheck?.net_worth ?? nw.netWorth))} of ${fmt(s.netWorthGate[me.country])}`} pct={netWorthProgress(s, Number(lastCheck?.net_worth ?? nw.netWorth), me.country)} />}
          <span className="hub-go">Open journey →</span>
        </Link>

        <Link href="/my-money/manage" className="card hub-card">
          <div className="hub-head"><span className="tag teal">Manage money</span></div>
          {hasMoney ? (
            <>
              <div className="big">{fmt(nw.netWorth)}</div>
              <p className="muted">Net worth · {fmt(nw.assets)} assets, {fmt(nw.debts)} debts</p>
              <div className="hub-stats">
                <div><div className="tag dim">Savings rate</div><div className="mono">{bv.savingsRatePct.toFixed(0)}%</div></div>
                <div><div className="tag dim">Emergency fund</div><div className="mono">{ev.months.toFixed(1)} mo</div></div>
                <div><div className="tag dim">Left this month</div><div className={`mono ${bv.left < 0 ? 'red' : ''}`}>{fmt(bv.left)}</div></div>
              </div>
            </>
          ) : <p className="muted">Add your income, spending, savings and debts once. You get your net worth, savings rate, emergency-fund months and a debt payoff plan.</p>}
          <span className="hub-go">{hasMoney ? 'Update my numbers →' : 'Set up in 3 minutes →'}</span>
        </Link>

        <Link href="/my-money/grow" className="card hub-card">
          <div className="hub-head"><span className="tag green">Grow money</span>{acct && <span className="tag dim">Paper account</span>}</div>
          {!me.adult ? <p className="muted">Investing practice unlocks at 18. Until then, Learn has lessons on saving, compounding and how markets work.</p>
            : acct ? (
              <>
                <div className="big">{formatMoney(Number(acct.equity), acct.currency === 'INR' ? 'IN' : 'US')}</div>
                <p className={ret >= 0 ? 'green' : 'red'} style={{ margin: 0 }}>{ret >= 0 ? '+' : ''}{ret.toFixed(2)}% since start · {open ?? 0} open positions</p>
                <Sparkline points={((acct.equity_history as { equity: number }[]) ?? []).map((h) => h.equity)} />
                {acct.paused_until && <p className="gold" style={{ margin: 0, fontSize: 12 }}>Paused by the daily loss limit until {acct.paused_until}</p>}
              </>
            ) : <p className="muted">Set your rules once and the engine places practice trades from the nightly signals and levels, with a stop and target on every trade.</p>}
          <span className="hub-go">{me.adult ? (acct ? 'See trades and signals →' : 'Start auto-trading on paper →') : 'Explore Learn →'}</span>
        </Link>
      </section>

      <div className="cols">
        <div className="main">
          <AgentAsk title="Ask your coach" suggestions={[me.adult ? 'Should I pay off my card or invest first?' : 'How can I start saving with pocket money?', 'How do I start an emergency fund?']} />
        </div>
        <aside className="side">
          <MoodCheckin />
          <section className="card" aria-label="Family">
            <h2 style={{ marginBottom: 8 }}>Family</h2>
            {kids.length ? kids.map((k) => <div key={k.full_name + k.dob} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderTop: '1px solid var(--line)' }}><span>{k.full_name || 'Child account'} · age {ageOn(k.dob)}</span><span className="teal">Stage {k.stage}</span></div>) : <p className="muted" style={{ margin: 0 }}>No linked children yet. Ages 11–17 join through a parent: lessons and savings goals only, no trading, no ads.</p>}
          </section>
        </aside>
      </div>
    </main>
  );
}

function Meter({ label, value, pct }: { label: string; value: string; pct: number }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4, gap: 8 }}><span className="muted">{label}</span><span className="mono">{value}</span></div>
      <div className="prog"><div style={{ width: `${Math.round(Math.min(1, pct) * 100)}%`, background: pct >= 1 ? 'var(--teal)' : 'var(--gold)' }} /></div>
    </div>
  );
}
