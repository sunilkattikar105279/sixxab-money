import type { Metadata } from 'next';
import { getMember } from '@/lib/member';
import { STAGES, stageOf, canPromote, gatesMet, netWorthProgress, formatMoney, HOLD_MONTHS, type MonthlyCheck } from '@/lib/sixs';
import { normalizeMoney, netWorth } from '@/lib/money';
import { StageIcon } from '@/components/StageIcon';
import { PlanList } from '@/components/PlanList';
import { VideoRail } from '@/components/VideoRail';
import { videos } from '@/lib/media';
import { CheckinForm, PromoteButton } from '@/components/JourneyActions';

export const metadata: Metadata = { title: 'Journey' };

export default async function Journey() {
  const m = (await getMember())!;
  const me = m.member!;
  const [{ data: checks }, { data: plan }, { data: hist }, { data: money }] = await Promise.all([
    m.sb.from('monthly_checks').select('month, habit_gate_met, net_worth').eq('member_id', me.id).order('month', { ascending: false }).limit(12),
    m.sb.from('plans').select('goals').eq('member_id', me.id).eq('active', true).maybeSingle(),
    m.sb.from('stage_history').select('from_stage, to_stage, changed_at').eq('member_id', me.id).order('changed_at', { ascending: false }).limit(10),
    m.sb.from('member_money').select('data').eq('member_id', me.id).maybeSingle(),
  ]);
  const s = stageOf(me.stage);
  const list: MonthlyCheck[] = (checks ?? []).map((c) => ({ month: c.month.slice(0, 7), habitGateMet: c.habit_gate_met, netWorth: Number(c.net_worth) }));
  const ready = canPromote(s, list, me.country);
  const thisMonth = new Date().toISOString().slice(0, 7);
  const current = list.find((c) => c.month === thisMonth);
  const suggestedNw = current?.netWorth ?? netWorth(normalizeMoney(money?.data)).netWorth;
  const streak = streakOf(list, s, me.country);
  const fmt = (v: number) => formatMoney(v, me.country);
  const clips = await videos({ stage: s.n, limit: 6 });

  return (
    <main className="wrap" id="main">
      <section className="card journey-hero">
        <div style={{ flex: '1 1 320px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <StageIcon n={s.n} size={52} />
          <div className="tag gold">Stage {s.n} of 6</div>
          <h1 style={{ fontSize: 32 }}>{s.name}</h1>
          <p className="muted" style={{ margin: 0 }}>{s.focus}</p>
        </div>
        <div style={{ flex: '1 1 420px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2>To reach Stage {Math.min(6, s.n + 1)}{s.n < 6 ? ` · ${stageOf(s.n + 1).name}` : ''}</h2>
          {s.netWorthGate ? (
            <>
              <Gate n={1} title="Habit gate" detail={s.habitGate} />
              <Gate n={2} title="Net-worth gate" detail={`Reach ${fmt(s.netWorthGate[me.country])}`} pct={netWorthProgress(s, suggestedNw, me.country)} value={fmt(suggestedNw)} />
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}><span>Both gates held</span><span className="mono muted">{streak} of {HOLD_MONTHS} months in a row</span></div>
                <div className="steps" aria-hidden="true">{Array.from({ length: HOLD_MONTHS }, (_, i) => <span key={i} className={i < streak ? 'on' : ''} />)}</div>
              </div>
              <PromoteButton ready={ready} nextName={stageOf(s.n + 1).name} />
            </>
          ) : <p className="muted" style={{ margin: 0 }}>You are at the top stage. Keep your estate plan and community fund current, and mentor others.</p>}
        </div>
      </section>

      <div className="cols">
        <div className="main">
          <section className="card" id="checkin" aria-labelledby="checkin-title">
            <h2 id="checkin-title" style={{ marginBottom: 4 }}>Monthly check-in · {new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })}</h2>
            <p className="muted" style={{ margin: '0 0 12px' }}>Two questions, once a month. Your coach uses them to track your gates. {current ? 'You have checked in this month; you can update it.' : ''}</p>
            <CheckinForm habit={s.habitGate} currency={me.country === 'IN' ? '₹' : '$'} initialNetWorth={Math.round(suggestedNw)} initialHabit={current?.habitGateMet ?? null} fromManage={!current && suggestedNw !== 0} />
          </section>

          <section className="card">
            <h2 style={{ marginBottom: 12 }}>Your 90-day plan</h2>
            <PlanList initial={(plan?.goals as { goal: string; how: string; done: boolean }[]) ?? []} canSave />
          </section>

          <VideoRail title={`Videos for the ${s.name} stage`} items={clips} />
        </div>

        <aside className="side">
          <section className="card">
            <h2 style={{ marginBottom: 8 }}>Check-in history</h2>
            {list.length ? (
              <table className="compact">
                <thead><tr><th>Month</th><th>Habit</th><th style={{ textAlign: 'right' }}>Net worth</th></tr></thead>
                <tbody>{list.slice(0, 6).map((c) => <tr key={c.month}><td className="mono">{c.month}</td><td className={c.habitGateMet ? 'teal' : 'dim'}>{c.habitGateMet ? '✓ kept' : '— missed'}</td><td className={`mono ${gatesMet(s, c, me.country) ? 'teal' : ''}`} style={{ textAlign: 'right' }}>{fmt(c.netWorth)}</td></tr>)}</tbody>
              </table>
            ) : <p className="muted" style={{ margin: 0 }}>No check-ins yet. Your first one starts the 3-month count.</p>}
          </section>

          <section className="card">
            <h2 style={{ marginBottom: 10 }}>All six stages</h2>
            <ol className="ladder">
              {STAGES.map((x) => (
                <li key={x.key} className={x.n === s.n ? 'now' : x.n < s.n ? 'done' : ''}>
                  <span className="ladder-n">{x.n < s.n ? '✓' : x.n}</span>
                  <div><b>{x.name}</b><div className="muted" style={{ fontSize: 12 }}>{x.focus}</div>{x.netWorthGate && <div className="dim" style={{ fontSize: 11 }}>Leave at {fmt(x.netWorthGate[me.country])} · {x.habitGate}</div>}</div>
                </li>
              ))}
            </ol>
          </section>

          {!!hist?.length && (
            <section className="card">
              <h2 style={{ marginBottom: 8 }}>Milestones</h2>
              {hist.map((h) => <div key={h.changed_at} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid var(--line)' }}><span>{h.to_stage > h.from_stage ? 'Moved up to' : 'Stepped back to'} {stageOf(h.to_stage).name}</span><span className="dim mono" style={{ fontSize: 12 }}>{h.changed_at.slice(0, 10)}</span></div>)}
            </section>
          )}
        </aside>
      </div>
    </main>
  );
}

/** Consecutive most-recent months in which both gates held. */
function streakOf(list: MonthlyCheck[], s: ReturnType<typeof stageOf>, c: 'US' | 'IN') {
  const sorted = [...list].sort((a, b) => b.month.localeCompare(a.month));
  let n = 0, prev: string | null = null;
  for (const x of sorted) {
    if (prev && monthDiff(x.month, prev) !== 1) break;
    if (!gatesMet(s, x, c)) break;
    n++; prev = x.month;
    if (n >= HOLD_MONTHS) break;
  }
  return n;
}
const monthDiff = (a: string, b: string) => (Number(b.slice(0, 4)) * 12 + Number(b.slice(5, 7))) - (Number(a.slice(0, 4)) * 12 + Number(a.slice(5, 7)));

function Gate({ n, title, detail, pct, value }: { n: number; title: string; detail: string; pct?: number; value?: string }) {
  return (
    <div className="inset" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><span><span className="tag teal">Gate {n}</span> <b>{title}</b></span>{value && <span className="mono muted">{value}</span>}</div>
      <span className="muted" style={{ fontSize: 13 }}>{detail}</span>
      {pct !== undefined && <div className="prog"><div style={{ width: `${Math.round(pct * 100)}%`, background: pct >= 1 ? 'var(--teal)' : 'var(--gold)' }} /></div>}
    </div>
  );
}
