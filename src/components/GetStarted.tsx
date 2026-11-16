import { InviteLink } from './InviteLink';

export interface Starter { founding: number | null; code: string; asked: number; checkins: number; goalsDone: number; goals: number; invited: number }

/** Activation checklist: the first actions that make SIXXAB Money useful. Hidden once everything is done, except the invite card. */
export function GetStarted({ me }: { me: Starter }) {
  const steps = [
    { done: true, label: 'Create your account', hint: 'Done' },
    { done: me.goals > 0, label: 'Get your 90-day plan', hint: 'Pick a goal in your plan below' },
    { done: me.asked > 0, label: 'Ask your coach one question', hint: 'Try: “How do I start an emergency fund?”' },
    { done: me.checkins > 0, label: 'Do a 5-second mood check-in', hint: 'How does money feel today?' },
    { done: me.goalsDone > 0, label: 'Tick off your first goal', hint: 'Small wins count' },
  ];
  const done = steps.filter((s) => s.done).length;
  const complete = done === steps.length;

  return (
    <section className="cols" aria-label="Getting started">
      {!complete && (
        <div className="card main">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            <h2>Get started</h2>
            <span className="mono muted">{done} of {steps.length} done</span>
          </div>
          <div className="prog" style={{ marginBottom: 12 }}><div style={{ width: `${(done / steps.length) * 100}%`, background: 'var(--teal)' }} /></div>
          <ol className="checklist">
            {steps.map((s) => (
              <li key={s.label} className={s.done ? 'done' : ''}>
                <span aria-hidden="true" className={s.done ? 'teal' : 'dim'}>{s.done ? '✓' : '○'}</span>
                <span><b>{s.label}</b>{!s.done && <span className="muted"> · {s.hint}</span>}</span>
                <span className="sr">{s.done ? 'done' : 'not done yet'}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
      <div className="card side" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {me.founding ? <div className="tag gold">Founding member #{me.founding} of 100 · free for good</div> : <div className="tag teal">Member</div>}
        <h2>Invite a friend</h2>
        <p className="muted" style={{ margin: 0 }}>Know someone who wants to get better with money? Share your link. {me.invited > 0 ? `You have invited ${me.invited} ${me.invited === 1 ? 'person' : 'people'} so far.` : ''}</p>
        {me.code && <InviteLink code={me.code} />}
      </div>
    </section>
  );
}
